import { gunzipSync } from "node:zlib";
import { z } from "zod";
import { words } from "../command-words";
import { PRINTER_MODEL, PRINTER_SERIAL, printerFlag } from "./catalog";
import {
  firmwarePackage,
  printerHash,
  printerSignature,
  scannerTicket,
} from "./artifacts";

export type PrinterReply = {
  output: string;
  printed?: boolean;
  title?: string;
};
const HELP = `FLOW M740 / servicios disponibles
printer status [--print]
printer queue | printer job IDENTIFICADOR
printer fetch RUTA
printer login USUARIO CONTRASEÑA
printer scans | printer scan ARCHIVO
printer pjl 'PETICIÓN PJL'
printer mqtt TEMA
printer ipp 'TICKET_JSON'
printer update 'PAQUETE_JSON'
printer scan-to 'URL'
printer dispatch 'SOBRE_JSON'
Evidencias del PC: /home/analista/iot. JSON compacto y comillas simples conservan sus argumentos. crypto help ofrece cálculo de huellas y descompresión.`;
export function operatePrinter(
  command: string,
  enabled: string[],
): PrinterReply {
  const [program, op, ...args] = words(command);
  if (program !== "printer")
    throw new Error("La petición debe comenzar por printer.");
  const access = (id: string) => {
    if (!enabled.includes(id))
      throw new Error("Servicio retirado por mantenimiento.");
  };
  const report = (id: string, title: string, printed = false): PrinterReply => {
    access(id);
    return { title, printed, output: `${title}\n${printerFlag(id)}` };
  };
  if (!op || op === "help") return { output: HELP };
  if (
    op === "status" &&
    (args.length === 0 || (args.length === 1 && args[0] === "--print"))
  )
    return {
      output: `SEVENTECH ${PRINTER_MODEL}\nSerie ${PRINTER_SERIAL}\nLista · Red 10.77.0.60 · Impresión dúplex · Escáner ADF\nPapel A4: 82% · Tóner: 76%\nSin trabajos en ejecución.`,
      printed: args.length === 1,
      title: "Estado del equipo",
    };
  if (op === "queue" && args.length === 0) {
    access("iot-01");
    return {
      output: "J-821 · recepción · impreso\nJ-824 · custodia · retenido",
    };
  }
  if (op === "job" && args.length === 1) {
    access("iot-01");
    if (args[0] === "J-824")
      return report("iot-01", "Documento retenido / custodia");
    if (args[0] === "J-821")
      return { output: "Acuse de recepción. Sin anexos." };
    throw new Error("Trabajo no encontrado.");
  }
  if (op === "fetch" && args.length === 1) {
    access("iot-02");
    if (args[0] === "/support/manifest.txt")
      return {
        output: `Equipo ${PRINTER_SERIAL}\nRespaldo /support/export-0317.cfg`,
      };
    if (args[0] === "/support/export-0317.cfg")
      return report(
        "iot-02",
        "[backup]\nremote_support=enabled\ncustody_record",
      );
    throw new Error("Recurso de soporte no encontrado.");
  }
  if (op === "login" && args.length === 2) {
    access("iot-03");
    if (args[0] !== "service" || args[1] !== "Flow!0317")
      throw new Error("Credenciales de servicio rechazadas.");
    return report("iot-03", "Informe de mantenimiento / sesión de servicio");
  }
  if (op === "scans" && args.length === 0) {
    access("iot-04");
    return {
      output: "scan-027.txt · calibración\nscan-031.txt · acta de custodia OCR",
    };
  }
  if (op === "scan" && args.length === 1) {
    access("iot-04");
    if (args[0] === "scan-031.txt")
      return report("iot-04", "Acta de custodia / transcripción del escaneo");
    if (args[0] === "scan-027.txt")
      return { output: "Patrón de calibración A4. Prueba correcta." };
    throw new Error("Escaneo no encontrado.");
  }
  if (op === "pjl" && args.length === 1) {
    access("iot-05");
    if (/^@PJL FSQUERY NAME="0:\/service\/custodia\.txt"$/.test(args[0]))
      return { output: "TYPE=FILE SIZE=192" };
    const read = args[0].match(
      /^@PJL FSUPLOAD NAME="0:\/service\/custodia\.txt" OFFSET=0 SIZE=(\d+)$/,
    );
    if (!read || Number(read[1]) < 192 || Number(read[1]) > 512)
      throw new Error("PJL: ruta, desplazamiento o tamaño no válido.");
    return report("iot-05", "PJL FSUPLOAD / informe de servicio");
  }
  if (op === "mqtt" && args.length === 1) {
    access("iot-06");
    if (args[0] !== `flow/laboratorio/${PRINTER_SERIAL}/reports/last`)
      throw new Error("No hay publicación retenida para ese tema.");
    return {
      output: JSON.stringify(
        {
          retained: true,
          encoding: "base64",
          payload: Buffer.from(
            "Informe de dispositivo\n" + printerFlag("iot-06"),
          ).toString("base64"),
        },
        null,
        2,
      ),
    };
  }
  if (op === "ipp" && args.length === 1) {
    access("iot-07");
    const ticket = z
      .object({
        operation: z.literal("release-job"),
        job: z.literal("J-932"),
        "requesting-user-name": z.string(),
        "document-format": z.literal("application/pdf"),
      })
      .strict()
      .parse(JSON.parse(args[0]));
    if (ticket["requesting-user-name"] !== "archivo")
      throw new Error("IPP: el solicitante no es el propietario del trabajo.");
    return report("iot-07", "Trabajo J-932 / impresión confidencial", true);
  }
  if (op === "update" && args.length === 1) {
    access("iot-08");
    const pack = z
      .object({
        manifest: z
          .object({
            model: z.literal(PRINTER_MODEL),
            version: z.literal("7.4.0"),
            imageSha256: z.string().regex(/^[a-f0-9]{64}$/),
            signature: z.string(),
          })
          .strict(),
        image: z
          .object({
            mode: z.enum(["production", "maintenance"]),
            report: z.enum(["status", "custody"]),
          })
          .strict(),
      })
      .strict()
      .parse(JSON.parse(args[0]));
    if (
      pack.manifest.signature !== firmwarePackage().manifest.signature ||
      pack.manifest.imageSha256 !== printerHash(JSON.stringify(pack.image))
    )
      throw new Error("Firmware: firma o resumen de imagen rechazado.");
    if (pack.image.mode === "maintenance" && pack.image.report === "custody")
      return report("iot-08", "Informe de custodia / firmware aceptado", true);
    return {
      output:
        "Firmware aceptado. Modo producción; informe protegido sin acceso.",
    };
  }
  if (op === "scan-to" && args.length === 1) {
    access("iot-09");
    if (!args[0].startsWith("https://scan.seventech.local"))
      throw new Error("Destino fuera del prefijo permitido.");
    const url = new URL(args[0]);
    if (url.protocol !== "https:" || url.port || url.hash)
      throw new Error("Destino de escáner no válido.");
    if (url.hostname === "scan.seventech.local")
      return { output: "Copia entregada al repositorio habitual." };
    if (
      url.hostname !== "vault.printer.internal" ||
      url.pathname !== "/export" ||
      url.searchParams.get("ticket") !== scannerTicket()
    )
      throw new Error("El destino interno no admite esta transferencia.");
    return report("iot-09", "Exportación interna / archivo de custodia");
  }
  if (op === "dispatch" && args.length === 1) {
    access("iot-10");
    const envelope = z
      .object({
        topic: z.string(),
        payload: z.string().max(1024),
        signature: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .parse(JSON.parse(args[0]));
    const text = gunzipSync(Buffer.from(envelope.payload, "base64"), {
      maxOutputLength: 1024,
    }).toString("utf8");
    if (printerSignature(text) !== envelope.signature)
      throw new Error("Mensaje: firma rechazada.");
    const body = z
      .object({
        serial: z.literal(PRINTER_SERIAL),
        epoch: z.literal("K-29"),
        counter: z.literal(41),
        operation: z.literal("snapshot"),
      })
      .strict()
      .parse(JSON.parse(text));
    if (body.serial && envelope.topic === "flow/vault/snapshot")
      return report(
        "iot-10",
        "Instantánea de custodia / mensaje autenticado",
        true,
      );
    if (envelope.topic === "flow/telemetry/snapshot")
      return { output: "Instantánea de telemetría: equipo operativo." };
    throw new Error("Ruta de publicación desconocida.");
  }
  throw new Error("Petición no reconocida. Consulta printer help.");
}
