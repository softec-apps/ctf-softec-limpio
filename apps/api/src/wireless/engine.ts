import { createHash } from "node:crypto";
import type {
  WirelessId,
  WirelessState,
  WirelessView,
} from "../../../../packages/wireless-contracts";
import {
  COMMAND_HELP,
  FIELD_VALUES,
  initialConfig,
  testNames,
  ticket,
  validSetting,
} from "./scenarios";
import { inspectCertificate } from "./certificates";
import { runWirelessTrial, type Trial } from "./validation";
import {
  assessWireless,
  hasWirelessAssessment,
  initialWirelessLearning,
  startWirelessTransfer,
  transferBrief,
  wirelessAssessment,
  wirelessTests,
} from "./learning";

function recordTrial(
  state: WirelessState,
  name: string,
  trial: Trial,
  origin: "imported" | "test",
) {
  for (const info of trial.trace) {
    const sequence = (state.packets.at(-1)?.number ?? 0) + 1;
    state.packets.push({
      number: sequence,
      time: (sequence * 0.021).toFixed(3),
      source: "client-lab",
      destination: "service-lab",
      protocol: trial.protocol,
      length: 128,
      info,
      details: {
        test: name,
        configRevision: String(state.generation),
        result: trial.passed ? "passed" : "failed",
        event: info,
        origin,
      },
    });
  }
  state.packets = state.packets.slice(-128);
}

export function initialWirelessState(
  id: WirelessId,
  seed: string,
): WirelessState {
  const running = initialConfig(id, seed);
  const state: WirelessState = {
    version: 2,
    running,
    candidate: structuredClone(running),
    generation: 0,
    checks: [],
    verified: null,
    packets: [],
    journal: ["INCIDENT OPEN / running imported; candidate synchronized"],
    ...(hasWirelessAssessment(id)
      ? { learning: initialWirelessLearning(seed) }
      : {}),
  };
  for (const name of testNames(id))
    recordTrial(
      state,
      name,
      runWirelessTrial(id, running, name, seed),
      "imported",
    );
  return state;
}
export const configDigest = (state: WirelessState) =>
  createHash("sha256").update(JSON.stringify(state.running)).digest("hex");
export const dirtyWireless = (state: WirelessState) =>
  JSON.stringify(state.running) !== JSON.stringify(state.candidate);
export function serviceReadyWireless(
  id: WirelessId,
  state: WirelessState,
  seed: string,
) {
  return (
    !dirtyWireless(state) &&
    wirelessTests(id, state).every(
      (name) =>
        state.checks.some(
          (check) =>
            check.name === name &&
            check.passed &&
            check.revision === state.generation,
        ) &&
        runWirelessTrial(id, state.running, name, seed, {
          transfer: state.learning?.stage === "transfer",
        }).passed,
    )
  );
}
export function readyWireless(
  id: WirelessId,
  state: WirelessState,
  seed: string,
) {
  return (
    serviceReadyWireless(id, state, seed) &&
    (!hasWirelessAssessment(id) ||
      (state.learning?.stage === "transfer" && state.learning.accepted))
  );
}
export function presentWireless(
  id: WirelessId,
  revision: number,
  state: WirelessState,
  seed: string,
): WirelessView {
  return {
    id,
    revision,
    generation: state.generation,
    dirty: dirtyWireless(state),
    ticket:
      ticket(id, seed) +
      (state.learning?.stage === "transfer"
        ? "\n\n" + transferBrief(id, seed)
        : ""),
    devices: Object.keys(state.running),
    tests: wirelessTests(id, state),
    checks: state.checks,
    journal: state.journal,
    ...(hasWirelessAssessment(id)
      ? { assessment: wirelessAssessment(id, state, seed) }
      : {}),
  };
}

export function executeWireless(
  id: WirelessId,
  state: WirelessState,
  command: string,
  seed: string,
  proof: () => string,
) {
  const [verb, ...args] = command.trim().split(/\s+/);
  let output: string;
  if (verb === "help")
    output =
      args[0] === "fields"
        ? Object.entries(FIELD_VALUES)
            .filter(([key]) =>
              Object.values(state.running).some((device) =>
                Object.hasOwn(device, key),
              ),
            )
            .map(
              ([key, values]) =>
                `${key}: ${Array.isArray(values) ? values.join(" | ") : values + " (lista separada por comas, sin espacios)"}`,
            )
            .join("\n")
        : COMMAND_HELP +
          (hasWirelessAssessment(id)
            ? "\nAntes de commit: assess <diagnóstico> <predicción> <número1>,<número2>. Las opciones y evidencias están en el formulario Diagnóstico y predicción; assessment las muestra en la Terminal. La primera verificación abre una segunda incidencia."
            : "");
  else if (verb === "assessment" && !args.length)
    output = JSON.stringify(
      wirelessAssessment(id, state, seed) ?? {
        message: "Este expediente no incluye evaluación previa.",
      },
      null,
      2,
    );
  else if (verb === "assess") {
    if (args.length !== 3)
      throw new Error(
        "Usa assess <diagnóstico> <predicción> <número1>,<número2>. Consulta assessment.",
      );
    output = assessWireless(id, state, args[0], args[1], args[2]);
  } else if (verb === "ticket" && !args.length)
    output =
      ticket(id, seed) +
      (state.learning?.stage === "transfer"
        ? "\n\n" + transferBrief(id, seed)
        : "");
  else if (verb === "devices" && !args.length)
    output = Object.keys(state.running).join("\n");
  else if (verb === "show") {
    const [kind, target, ...extra] = args;
    if (extra.length)
      throw new Error(
        "Usa show running|candidate [equipo], show events o show cert <nombre>.",
      );
    if (kind === "events" && !target)
      output =
        state.journal.join("\n") +
        "\n" +
        (state.packets.length
          ? state.packets
              .map((p) => p.info)
              .slice(-32)
              .join("\n")
          : "Última alarma: servicio degradado después del cambio. Ejecuta pruebas para capturar la sesión actual.");
    else if (kind === "cert" && target && id === "wireless-10")
      output = inspectCertificate(target);
    else if (["running", "candidate"].includes(kind)) {
      const config = kind === "running" ? state.running : state.candidate;
      if (target && !Object.hasOwn(config, target))
        throw new Error("Equipo no encontrado. Consulta devices.");
      output = JSON.stringify(target ? config[target] : config, null, 2);
    } else
      throw new Error(
        "Usa show running|candidate [equipo], show events o show cert <nombre>.",
      );
  } else if (verb === "configure") {
    const [device, key, value, ...extra] = args;
    if (
      extra.length ||
      !device ||
      !key ||
      !value ||
      !Object.hasOwn(state.candidate, device) ||
      !Object.hasOwn(state.candidate[device], key)
    )
      throw new Error(
        "Usa configure <equipo> <propiedad existente> <valor>. Consulta devices, show candidate y help fields.",
      );
    if (value.length > 256 || !validSetting(key, value))
      throw new Error("Valor no admitido. Consulta help fields.");
    state.candidate[device][key] = value;
    state.verified = null;
    output = "Candidato actualizado. Revisa diff antes de aplicar commit.";
  } else if (verb === "diff" && !args.length) {
    output =
      Object.entries(state.running)
        .flatMap(([device, fields]) =>
          Object.entries(fields)
            .filter(([key, value]) => state.candidate[device][key] !== value)
            .map(
              ([key, value]) =>
                `${device}.${key}: ${value} → ${state.candidate[device][key]}`,
            ),
        )
        .join("\n") || "Sin cambios pendientes.";
  } else if (verb === "commit" && !args.length) {
    if (dirtyWireless(state)) {
      if (hasWirelessAssessment(id) && !state.learning?.accepted)
        throw new Error(
          "Antes de aplicar el cambio, registra un diagnóstico, una predicción y dos evidencias válidas en Diagnóstico y predicción o con assess.",
        );
      state.running = structuredClone(state.candidate);
      state.generation++;
      state.checks = [];
      state.verified = null;
    }
    output = `Running aplicado / revisión de configuración ${state.generation}. Las pruebas deben corresponder a esta configuración.`;
  } else if (verb === "rollback" && !args.length) {
    state.candidate = structuredClone(state.running);
    state.verified = null;
    output = "Candidato descartado. Running permanece vigente.";
  } else if (verb === "test") {
    const names = wirelessTests(id, state);
    if (args.length !== 1 || (args[0] !== "all" && !names.includes(args[0])))
      throw new Error(
        "Pruebas: " + names.join(", ") + ". Usa test <nombre> o test all.",
      );
    output = (args[0] === "all" ? names : [args[0]])
      .map((name) => {
        const trial = runWirelessTrial(id, state.running, name, seed, {
          transfer: state.learning?.stage === "transfer",
        });
        state.checks = state.checks.filter((check) => check.name !== name);
        state.checks.push({
          name,
          passed: trial.passed,
          revision: state.generation,
        });
        state.verified = null;
        recordTrial(state, name, trial, "test");
        return `${name}: ${trial.passed ? "PASS" : "FAIL"}\n${trial.trace.join("\n")}`;
      })
      .join("\n\n");
    state.packets = state.packets.slice(-128);
  } else if (verb === "capture" && !args.length) {
    output = JSON.stringify(
      {
        format: "seventech-capture-v1",
        scope:
          "Trazas de pruebas operativas del modelo de red; no es tráfico de una interfaz física.",
        packets: state.packets,
      },
      null,
      2,
    );
  } else if (verb === "verify" && !args.length) {
    if (hasWirelessAssessment(id) && !state.learning?.accepted)
      output =
        "Antes de verificar, registra el diagnóstico, la predicción y dos evidencias de esta fase. No se emite comprobante.";
    else if (!serviceReadyWireless(id, state, seed))
      output =
        "Cambio no aceptado: ejecuta las pruebas de servicio y rechazo sobre el running actual y resuelve los cambios pendientes del candidato. No se emite comprobante.";
    else if (
      hasWirelessAssessment(id) &&
      state.learning?.stage === "diagnosis"
    ) {
      output =
        "Primera reparación aceptada. Continúa con la segunda incidencia; todavía no se emite comprobante.\n\n" +
        startWirelessTransfer(id, state, seed);
      for (const name of wirelessTests(id, state))
        recordTrial(
          state,
          name,
          runWirelessTrial(id, state.running, name, seed, { transfer: true }),
          "imported",
        );
    } else {
      state.verified = state.generation;
      output =
        "Cambio aceptado; pruebas de servicio y de seguridad vigentes. Comprobante personal:\n" +
        proof();
    }
  } else if (verb === "reset" && args.join(" ") === "--confirm") {
    Object.assign(state, initialWirelessState(id, seed));
    output = "Laboratorio restaurado. Se conserva la puntuación ya obtenida.";
  } else
    throw new Error(
      "Comando no disponible. Consulta help; no se ejecutan programas del sistema anfitrión.",
    );
  state.journal = [...state.journal, `r${state.generation}> ${command}`].slice(
    -40,
  );
  return output;
}
