import { analysisFiles } from "./casework/catalog";
import { fileEvidence, getFileCase } from "./file-forensics/catalog";
import { otFiles } from "./ot/artifacts";
import { getOtCase } from "./ot/catalog";
import { printerFiles } from "./printer/artifacts";
import { getPrinterCase } from "./printer/catalog";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { flagValue } from "./security";
import { investigationFiles, getInvestigation } from "./investigation/catalog";
import { getWebLab } from "./web-lab/catalog";
import { codecCommand } from "./web-lab/codec";
import { webLabFuzz } from "./web-lab/fuzzer";
import { webLabCurl } from "./web-lab/http-client";
import { WEB_CHALLENGE_ID } from "./web-lab/access-control";

import { cryptoFiles, getCryptoChallenge } from "./crypto/catalog";

import { networkFiles, getNetworkChallenge } from "./network/catalog";

export const HOME = "/home/analista";
export function virtualPath(value: string, cwd = HOME) {
  const parts: string[] = [];
  for (const segment of (value.startsWith("/")
    ? value
    : cwd + "/" + value
  ).split("/")) {
    if (segment === "..") parts.pop();
    else if (segment && segment !== ".") parts.push(segment);
  }
  return "/" + parts.join("/");
}
function files(id: string): Record<string, string> {
  const ot = otFiles(id);
  if (ot) return ot;
  const printer = printerFiles(id);
  if (printer) return printer;
  const analysis = analysisFiles(id);
  if (analysis) return analysis;
  const forensic = fileEvidence(id);
  if (forensic) return forensic;
  const investigation = investigationFiles(id);
  if (investigation) return investigation;
  const network = networkFiles(id);
  if (network) return network;
  const crypto = cryptoFiles(id);
  if (crypto) return crypto;
  const lab = getWebLab(id);
  if (lab) return lab.evidence;
  if (id !== "primer-rastro")
    throw new BadRequestException("Este reto no tiene un sistema de archivos.");
  return {
    [HOME + "/LEEME.txt"]:
      "SEVENTECH / Unidad de respuesta a incidentes\r\n\r\nTurno nocturno / 23:48\r\nLa puerta del pasillo acredita el acceso al laboratorio. Continúa con los retos desde la aplicación Retos. El subdirectorio evidencia conserva los registros anteriores del laboratorio.\r\nUsa ls para explorar y cat para leer los archivos.\r\n\r\nTambién puedes utilizar el explorador de archivos del escritorio.",
    [HOME + "/evidencia/acceso.log"]:
      "[23:41:02] estación-01: conexión autorizada\r\n[23:46:17] estación-01: sesión de análisis iniciada\r\n[23:48:09] evidencia: mensaje preservado en mensaje.txt\r\n[23:49:00] integridad: colección de evidencia completa",
    [HOME + "/evidencia/mensaje.txt"]:
      `Registro histórico de la estación. El primer reto actual se acredita al abrir la puerta del pasillo.\r\n\r\n${flagValue(id)}\r\n\r\nReferencia de la colección anterior de archivos. Consulta los retos actuales desde el computador.`,
  };
}
export function readVirtual(id: string, value: string) {
  const path = virtualPath(value);
  const fs = files(id);
  if (
    path === HOME ||
    (path.startsWith(HOME + "/") &&
      Object.keys(fs).some((filename) => filename.startsWith(path + "/")))
  ) {
    const entries = Object.keys(fs)
      .filter((p) => p.startsWith(path + "/"))
      .map((p) => p.slice(path.length + 1).split("/")[0]);
    return {
      type: "directory" as const,
      path,
      entries: [...new Set(entries)].map((name) => ({
        name,
        type:
          fs[path + "/" + name] === undefined
            ? ("directory" as const)
            : ("file" as const),
      })),
    };
  }
  if (fs[path] !== undefined)
    return {
      type: "file" as const,
      path,
      name: path.split("/").pop()!,
      content: fs[path],
    };
  throw new NotFoundException("No existe ese archivo o directorio.");
}
export function virtualCommand(id: string, command: string, cwd: string) {
  const [verb, ...args] = command.trim().split(/\s+/);
  const lab = getWebLab(id);
  const argument = args.join(" ");
  let output = "";
  let nextCwd = cwd;
  if (!verb) return { output, cwd, clear: false };
  if (verb === "help")
    output =
      "Seventech / Herramientas de la estación\r\n\r\nArchivos: ls [-la] [ruta], cd [directorio], cat <archivo>, pwd\r\nSistema: whoami, hostname, uname [-a], id, date, echo <texto>\r\nTerminal: clear, help\r\n\r\nHistorial: ↑ / ↓  ·  Completar archivos: Tab  ·  Limpiar: Ctrl+L\r\nEmpieza con: cat LEEME.txt";
  else if (verb === "curl" && lab) output = webLabCurl(args, lab.request);
  else if (
    verb === "codec" &&
    (lab ||
      getCryptoChallenge(id) ||
      getNetworkChallenge(id) ||
      getInvestigation(id) ||
      getFileCase(id) ||
      getPrinterCase(id) ||
      getOtCase(id))
  )
    output = codecCommand(args);
  else if (
    verb === "grep" &&
    (lab ||
      getCryptoChallenge(id) ||
      getNetworkChallenge(id) ||
      getInvestigation(id) ||
      getFileCase(id) ||
      getPrinterCase(id) ||
      getOtCase(id))
  ) {
    if (args.length !== 2) output = "Uso: grep <texto> <archivo>";
    else {
      try {
        const file = readVirtual(id, virtualPath(args[1], cwd));
        output =
          file.type === "file"
            ? file.content
                .split(/\r?\n/)
                .filter((line) => line.includes(args[0]))
                .join("\r\n")
            : "grep: la ruta no es un archivo.";
      } catch (error) {
        if (error instanceof NotFoundException)
          output = "grep: no existe ese archivo.";
        else throw error;
      }
    }
  } else if (verb === "ffuf" && id === WEB_CHALLENGE_ID)
    output = webLabFuzz(args, (path) => {
      const file = readVirtual(id, virtualPath(path, cwd));
      if (file.type !== "file")
        throw new BadRequestException("El diccionario no es un archivo.");
      return file.content;
    });
  else if (verb === "which" && id === WEB_CHALLENGE_ID)
    output = ["curl", "ffuf"].includes(argument)
      ? "/usr/bin/" + argument
      : "which: herramienta no disponible.";
  else if (verb === "pwd") output = cwd;
  else if (verb === "clear") return { output: "", cwd, clear: true };
  else if (verb === "whoami") output = "analista";
  else if (verb === "hostname") output = "seventech";
  else if (verb === "uname")
    output =
      argument === "-a"
        ? "Linux seventech 6.12.0-seventech #1 SMP x86_64 GNU/Linux (entorno de entrenamiento)"
        : "Linux";
  else if (verb === "id")
    output = "uid=1000(analista) gid=1000(analista) groups=1000(analista)";
  else if (verb === "date") output = new Date().toUTCString();
  else if (verb === "echo") output = argument;
  else if (verb === "ls") {
    const options = args.filter((a) => a.startsWith("-"));
    if (options.some((o) => !["-l", "-a", "-la", "-al"].includes(o)))
      return {
        output: "ls: opción no disponible. Usa ls, ls -la o ls <ruta>.",
        cwd,
        clear: false,
      };
    const target = virtualPath(
      args.filter((a) => !a.startsWith("-")).join(" ") || cwd,
      cwd,
    );
    try {
      const result = readVirtual(id, target);
      output =
        result.type === "file"
          ? result.name
          : result.entries
              .map((e) =>
                options.some((o) => o.includes("l"))
                  ? `${e.type === "directory" ? "drwxr-xr-x" : "-rw-r--r--"}  analista analista  ${e.name}${e.type === "directory" ? "/" : ""}`
                  : e.name + (e.type === "directory" ? "/" : ""),
              )
              .join(options.some((o) => o.includes("l")) ? "\r\n" : "    ");
    } catch {
      output = "ls: No existe ese directorio.";
    }
  } else if (verb === "cd") {
    const target = virtualPath(
      argument === "~" || !argument
        ? HOME
        : argument.startsWith("~/")
          ? HOME + argument.slice(1)
          : argument,
      cwd,
    );
    try {
      if (readVirtual(id, target).type === "directory") nextCwd = target;
      else output = "cd: no es un directorio.";
    } catch {
      output = "cd: No existe ese directorio.";
    }
  } else if (verb === "cat") {
    if (!argument) output = "Uso: cat <archivo>";
    else
      try {
        const result = readVirtual(id, virtualPath(argument, cwd));
        output =
          result.type === "file" ? result.content : "cat: es un directorio.";
      } catch {
        output = "cat: No existe ese archivo.";
      }
  } else
    output = `Comando no disponible: ${verb}. Escribe help para consultar las herramientas.`;
  if (verb === "help" && lab)
    output +=
      `\r\n\r\nWeb: curl [-i] <URL>, codec -h, grep <texto> <archivo>\r\nServicio: ${lab.home}` +
      (id === WEB_CHALLENGE_ID ? "\r\nEnumeración: ffuf -h, which ffuf" : "");
  return { output, cwd: nextCwd, clear: false };
}
