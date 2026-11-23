import { createHmac } from "node:crypto";
import { z } from "zod";
import { words } from "../command-words";
import { otFlag, OT_CONTROLLER } from "./catalog";
import { otSignature } from "./artifacts";
import { initialOtState, programDigest, type OtState } from "./state";
import { executeModbus } from "./modbus";
import { evaluateOtProgram } from "./programming";

const HELP = `AXON C24 / herramientas del controlador
ot status | ot help
ot modbus HEX_ADU
ot login USUARIO CONTRASEÑA | ot logout
ot http GET RUTA ['CABECERAS_JSON']
ot hmi 'PETICIÓN_JSON'
ot program 'TRANSFERENCIA_JSON'
ot firmware 'PAQUETE_JSON'
ot diagnostic challenge | ot diagnostic read-custody FIRMA_HEX
ot replay 'SOBRE_JSON'
ot panel light on|off | ot panel fan on|off
ot reset --confirm
Evidencias: /home/analista/ot. Los argumentos JSON se conservan entre comillas simples.
crypto sha256 TEXTO calcula huellas. El Transformador del PC convierte texto y bytes hexadecimales.
Las tramas Modbus usan MBAP real; los sobres de ingeniería son representaciones didácticas del juego.`;
export type OtOperation = {
  state: OtState;
  output: string;
  changed: boolean;
  event?: string;
};
export function operateOt(
  current: OtState,
  command: string,
  enabled: string[],
): OtOperation {
  const state = structuredClone(current),
    [program, op, ...args] = words(command);
  if (program !== "ot") throw new Error("La petición debe comenzar por ot.");
  const access = (id: string) => {
    if (!enabled.includes(id))
      throw new Error("Práctica retirada por mantenimiento.");
  };
  const result = (output: string, event?: string): OtOperation => ({
    state,
    output,
    changed: Boolean(event),
    event,
  });
  const evidence = (id: string, title: string, event?: string) => {
    access(id);
    return result(title + "\n" + otFlag(id), event);
  };
  if (!op || op === "help") return result(HELP);
  if (op === "status" && args.length === 0)
    return result(
      `${OT_CONTROLLER} · 10.77.0.70\nRol HMI:${state.role}\nVentilador:${state.fanRunning ? state.fanRpm + "rpm" : "detenido"}\nIluminación:${state.lightOn ? "encendida" : "apagada"}\nSonda de ensayo:${state.temperatureDeciC / 10}°C · Umbral:${state.alarmThresholdDeciC / 10}°C\nFirmware:${state.firmware} · SVN:${state.securityVersion}`,
    );
  if (op === "reset" && args.length === 1 && args[0] === "--confirm")
    return {
      state: initialOtState(),
      output: "Banco restaurado. Se conservan tus resoluciones y puntos.",
      changed: true,
      event: "Restauración del banco de ensayo",
    };
  if (op === "modbus" && args.length === 1) {
    const response = executeModbus(state, args[0], otFlag("ot-04"));
    if (response.caseId) access(response.caseId);
    const output = "RX " + response.response;
    return response.exposed && response.caseId
      ? evidence(
          response.caseId,
          output + "\nEvidencia de la operación",
          response.event,
        )
      : result(output, response.event);
  }
  if (op === "login" && args.length === 2) {
    access("ot-02");
    if (args[0] !== "operator" || args[1] !== "Axon!0871")
      throw new Error("Identidad industrial rechazada.");
    state.role = "operator";
    return evidence(
      "ot-02",
      "Acceso de operación / credencial de entrega",
      "Acceso a la cuenta de operación",
    );
  }
  if (op === "logout" && args.length === 0) {
    state.role = "observer";
    return result(
      "Sesión industrial cerrada. La sesión del CTF continúa abierta.",
      "Cierre de la sesión industrial",
    );
  }
  if (op === "panel" && args.length === 2) {
    if (state.role !== "operator")
      throw new Error("El panel requiere una identidad de operación.");
    if (!["light", "fan"].includes(args[0]) || !["on", "off"].includes(args[1]))
      throw new Error("Control de panel no válido.");
    if (args[0] === "light") state.lightOn = args[1] === "on";
    else state.fanRunning = args[1] === "on";
    return result("Control local aplicado.", "Operación normal de " + args[0]);
  }
  if (
    op === "http" &&
    args[0] === "GET" &&
    args.length >= 2 &&
    args.length <= 3
  ) {
    const headers = args[2]
      ? z.record(z.string(), z.string().max(128)).parse(JSON.parse(args[2]))
      : {};
    const normalized = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );
    if (args[1] === "/support/index.txt") {
      access("ot-03");
      return result(
        "Exportación de puesta en marcha: /backup/commissioning-0871.cfg",
      );
    }
    if (args[1] === "/backup/commissioning-0871.cfg")
      return evidence(
        "ot-03",
        "[commissioning]\ncontroller=AXON-C24\nremote_support=enabled\ncustody_record",
      );
    if (args[1] === "/engineering/diagnostics") {
      access("ot-06");
      if (normalized["x-forwarded-for"] !== "127.0.0.1")
        throw new Error("Diagnóstico reservado a ingeniería local.");
      return evidence(
        "ot-06",
        "Diagnóstico de ingeniería / origen declarado aceptado",
      );
    }
    throw new Error("Recurso HMI no encontrado.");
  }
  if (op === "hmi" && args.length === 1) {
    access("ot-05");
    const request = z
      .object({
        action: z.literal("engineering-tune"),
        role: z.string(),
        setpointRpm: z.number().int().min(0).max(1800),
      })
      .strict()
      .parse(JSON.parse(args[0]));
    if (request.role !== "engineer")
      throw new Error("La calibración requiere ingeniería.");
    if (request.setpointRpm !== 1450)
      throw new Error("La calibración del ensayo requiere1450rpm.");
    state.fanRpm = request.setpointRpm;
    state.fanRunning = true;
    return evidence(
      "ot-05",
      "Calibración aceptada / rol declarado por el cliente",
      "Calibración remota de ventilación",
    );
  }
  if (op === "program" && args.length === 1) {
    access("ot-08");
    const transfer = z
      .object({
        controller: z.literal(OT_CONTROLLER),
        block: z.literal("VENT_MAIN"),
        source: z.string().min(1).max(512),
        digest: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .parse(JSON.parse(args[0]));
    if (programDigest(transfer.source) !== transfer.digest)
      throw new Error("La huella del programa no coincide.");
    const outputs = evaluateOtProgram(transfer.source, {
      ENABLE: true,
      MAINTENANCE: true,
      ALARM: state.temperatureDeciC > state.alarmThresholdDeciC,
    });
    state.program = transfer.source;
    state.fanRunning = outputs.FAN_RUN;
    if (outputs.LIGHT_RUN !== undefined) state.lightOn = outputs.LIGHT_RUN;
    if (outputs.BEACON !== undefined) state.beaconManual = outputs.BEACON;
    return outputs.FAN_RUN
      ? evidence(
          "ot-08",
          "Ensayo MAINTENANCE=true: ventilador activo / enclavamiento alterado",
          "Transferencia de lógica al controlador",
        )
      : result(
          "Programa transferido. El enclavamiento de mantenimiento impide FAN_RUN.",
          "Transferencia de lógica al controlador",
        );
  }
  if (op === "firmware" && args.length === 1) {
    access("ot-09");
    const pack = z
      .object({
        image: z
          .object({
            controller: z.literal(OT_CONTROLLER),
            version: z.string().max(20),
            securityVersion: z.number().int().min(0).max(99),
            legacyDiagnostic: z.boolean(),
            payloadHex: z
              .string()
              .regex(/^(?:[a-f0-9]{2})+$/)
              .max(2048),
          })
          .strict(),
        signature: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .parse(JSON.parse(args[0]));
    if (otSignature(JSON.stringify(pack.image)) !== pack.signature)
      throw new Error("El cargador rechaza la firma de la imagen.");
    state.firmware = pack.image.version;
    state.securityVersion = pack.image.securityVersion;
    state.legacyDiagnostic = pack.image.legacyDiagnostic;
    state.legacyKeyHex = state.legacyDiagnostic
      ? (Buffer.from(pack.image.payloadHex, "hex")
          .toString("utf8")
          .match(/UART_DIAG_KEY=([a-f0-9]{32})/)?.[1] ?? null)
      : null;
    return result(
      `Imagen auténtica instalada: ${state.firmware}. SVN=${state.securityVersion}. Diagnóstico heredado:${state.legacyDiagnostic ? "disponible" : "retirado"}.`,
      "Actualización de la imagen del controlador",
    );
  }
  if (op === "diagnostic" && args.length >= 1 && args.length <= 2) {
    access("ot-09");
    if (
      !state.legacyDiagnostic ||
      state.securityVersion >= 7 ||
      !state.legacyKeyHex
    )
      throw new Error("El firmware activo no ofrece recuperación heredada.");
    const challenge = otSignature("legacy-recovery-challenge").slice(0, 24);
    if (args[0] === "challenge" && args.length === 1)
      return result("Desafío ASCII: " + challenge);
    if (
      args[0] !== "read-custody" ||
      args.length !== 2 ||
      !/^[a-f0-9]{64}$/.test(args[1])
    )
      throw new Error("Petición de recuperación no válida.");
    const expected = createHmac(
      "sha256",
      Buffer.from(state.legacyKeyHex, "hex"),
    )
      .update(challenge)
      .digest("hex");
    if (args[1] !== expected)
      throw new Error("La prueba de recuperación fue rechazada.");
    return evidence(
      "ot-09",
      "Recuperación heredada / registro de custodia recuperado",
    );
  }
  if (op === "replay" && args.length === 1) {
    access("ot-10");
    const envelope = z
      .object({
        body: z
          .object({
            controller: z.string(),
            action: z.literal("light.set"),
            value: z.boolean(),
            counter: z.number().int().nonnegative(),
            expires: z.string().datetime(),
            window: z.string().max(30),
          })
          .strict(),
        signature: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .parse(JSON.parse(args[0]));
    if (
      envelope.body.controller !== OT_CONTROLLER ||
      otSignature(JSON.stringify(envelope.body)) !== envelope.signature
    )
      throw new Error("Orden ajena al controlador o firma inválida.");
    state.lightOn = envelope.body.value;
    const stale =
      envelope.body.counter < 900 &&
      Date.parse(envelope.body.expires) < Date.parse("2026-11-02T10:00:00Z");
    return stale
      ? evidence(
          "ot-10",
          "Orden firmada repetida: iluminación aceptada fuera de ventana",
          "Recepción de una orden firmada antigua",
        )
      : result("Orden firmada aplicada.", "Recepción de una orden firmada");
  }
  throw new Error("Operación no reconocida. Consulta ot help.");
}
