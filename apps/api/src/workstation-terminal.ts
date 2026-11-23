import {
  parseMemorySnapshot,
  memoryRows,
  MEMORY_OPERATIONS,
} from "../../../packages/memory-tools";
import { readWorkstationFile } from "./workstation-files";
import { getAnalysisCase } from "./casework/catalog";
import { SPECIALIST_STATIONS } from "../../../packages/specialist-contracts";
import { getFileCase, FILE_ROOT } from "./file-forensics/catalog";
import { otCommand } from "./ot/service";
import { getOtCase, OT_ROOT } from "./ot/catalog";
import { printerCommand } from "./printer/service";
import { getPrinterCase, PRINTER_ROOT } from "./printer/catalog";
import { domainCommand, domainFiles } from "./domain/service";
import { windowsCommand } from "./windows-lab/service";
import { wirelessCommand } from "./wireless/service";
import { cryptoTool } from "./privileged/crypto-tools";
import { PRIVILEGED_ROOT } from "./privileged/artifacts";
import { getInvestigation, INVESTIGATION_ROOT } from "./investigation/catalog";
import { DOMAIN_ROOT } from "./domain/catalog";
import { virtualPath } from "./virtual-filesystem";
import { words } from "./command-words";
import { STEGO_ROOT, STEGO_CASES } from "./stego/catalog";
import { workstationFileCommand } from "./workstation-file-commands";
import { REVERSE_ROOT, REVERSE_CASES } from "./reversing/catalog";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { db } from "./db";
import { virtualCommand } from "./virtual-filesystem";
import { getWebLab } from "./web-lab/catalog";
import { getCryptoChallenge } from "./crypto/catalog";
import { getNetworkChallenge } from "./network/catalog";
import { linuxNetwork, linuxCommand } from "./linux-network/service";
const localContext = (id: string) =>
  getOtCase(id) ||
  getPrinterCase(id) ||
  getInvestigation(id) ||
  getFileCase(id) ||
  getAnalysisCase(id) ||
  id === "primer-rastro" ||
  getWebLab(id) ||
  getCryptoChallenge(id) ||
  getNetworkChallenge(id);
export async function workstationCommand(
  user: { id: string; role: string },
  input: { command: string; cwd: string; challengeId: string },
) {
  const network = await linuxNetwork(user.id);
  const command = input.command.trim();
  if (/^wlan(?:\s|$)/.test(command)) {
    if (network.host || network.password)
      return {
        output: "Sal de SSH con exit para usar la consola inalámbrica del PC.",
        cwd: input.cwd,
        network,
      };
    const [, id, ...operation] = words(command);
    if (!id || !operation.length)
      return {
        output:
          "wlan wireless-08|wireless-09|wireless-10 <comando> · empieza con help o ticket",
        cwd: input.cwd,
        network,
      };
    const result = await wirelessCommand(user.id, id, operation.join(" "));
    return { output: result.output, cwd: input.cwd, network };
  }
  const windowsPrefix = /^win(?:\s|$)/.test(command);
  const windowsTool =
    /^(?:evil-winrm|winrm)(?:\s|$)/.test(command) ||
    (/^(?:nmap|ping)(?:\s|$)/.test(command) &&
      /\b10\.77\.0\.6\d\b/.test(command));
  if (windowsPrefix || windowsTool) {
    if (network.host || network.password)
      return {
        output: "Sal de SSH con exit para operar Windows desde el PC Linux.",
        cwd: input.cwd,
        network,
      };
    const result = await windowsCommand(
      user,
      windowsPrefix ? command.slice(3).trim() || "help" : command,
      "remote",
    );
    return {
      output: result.output,
      windows: result.view,
      cwd: input.cwd,
      network,
    };
  }
  if (/^mem(?:\s|$)/.test(command)) {
    if (network.host || network.password)
      return {
        output: "Sal de SSH con exit para usar RAMLab en el PC.",
        cwd: input.cwd,
        network,
      };
    const [, operation, value, ...extra] = words(command);
    if (!operation || operation === "help")
      return {
        output:
          "mem <" +
          MEMORY_OPERATIONS.join("|") +
          "> [ruta del snapshot.memory.json]",
        cwd: input.cwd,
        network,
      };
    try {
      if (extra.length)
        throw Error("Usa una operación y una ruta de snapshot.");
      const context = getAnalysisCase(input.challengeId);
      const target = value
        ? virtualPath(value, input.cwd)
        : context?.id.startsWith("memory-")
          ? context.station.root +
            "/caso-" +
            context.id.slice(-2) +
            "/evidencia/snapshot.memory.json"
          : undefined;
      if (!target) throw Error("Indica la ruta de un snapshot.");
      const enabled = await db.challenge.findMany({
        where: { enabled: true },
        select: { id: true },
      });
      const file = readWorkstationFile(
        enabled.map((c) => c.id),
        target,
      );
      if (
        file.type !== "file" ||
        !("content" in file) ||
        typeof file.content !== "string"
      )
        throw Error("La ruta debe contener un snapshot de memoria.");
      return {
        output: JSON.stringify(
          memoryRows(parseMemorySnapshot(file.content), operation),
          null,
          2,
        ),
        cwd: input.cwd,
        network,
      };
    } catch (e) {
      return {
        output: e instanceof Error ? e.message : "No se pudo leer memoria.",
        cwd: input.cwd,
        network,
      };
    }
  }
  if (/^ot(?:\s|$)/.test(command)) {
    if (network.host || network.password)
      return {
        output: "Sal de SSH con exit para usar el cliente industrial del PC.",
        cwd: input.cwd,
        network,
      };
    try {
      const reply = await otCommand(user.id, command);
      return { output: reply.output, ot: reply.view, cwd: input.cwd, network };
    } catch (error) {
      return {
        output:
          error instanceof Error
            ? error.message
            : "No se pudo consultar el controlador.",
        cwd: input.cwd,
        network,
      };
    }
  }
  if (/^printer(?:\s|$)/.test(command)) {
    if (network.host || network.password)
      return {
        output:
          "Sal de SSH con exit para usar los servicios de impresión del PC.",
        cwd: input.cwd,
        network,
      };
    try {
      return { ...(await printerCommand(command)), cwd: input.cwd, network };
    } catch (error) {
      return {
        output:
          error instanceof Error
            ? error.message
            : "No se pudo consultar el equipo.",
        cwd: input.cwd,
        network,
      };
    }
  }
  if (!network.host && !network.password && /^crypto(?:\s|$)/.test(command)) {
    try {
      return { output: cryptoTool(command), cwd: input.cwd, network };
    } catch (error) {
      return {
        output:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el dato.",
        cwd: input.cwd,
        network,
      };
    }
  }
  if (
    !network.host &&
    !network.password &&
    (input.cwd.startsWith(PRIVILEGED_ROOT) || command.includes(".continuidad"))
  ) {
    const enabled = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    try {
      return {
        ...workstationFileCommand(
          enabled.map((c) => c.id),
          command,
          input.cwd,
        ),
        network,
      };
    } catch (error) {
      return {
        output:
          error instanceof Error ? error.message : "Archivo no disponible.",
        cwd: input.cwd,
        network,
      };
    }
  }
  if (
    command === "vpn" ||
    command === "man vpn" ||
    /^vpn\s+(connect|disconnect)(?:\s|$)/.test(command)
  )
    return {
      output:
        "Gestiona la conexión desde la aplicación Seventech VPN. Usa vpn status para consultar el túnel.",
      cwd: input.cwd,
      network,
    };
  if (/^domain(?:\s|$)/.test(command)) {
    if (network.host || network.password)
      return {
        output: "Sal de SSH con exit para usar las herramientas del PC Linux.",
        cwd: input.cwd,
        network,
      };
    return { ...(await domainCommand(user, command)), cwd: input.cwd, network };
  }
  if (
    !network.host &&
    !network.password &&
    (input.cwd.startsWith(DOMAIN_ROOT) ||
      command.includes(DOMAIN_ROOT) ||
      /^(?:cd|ls)\s+dominio(?:\s|$)/.test(command))
  ) {
    try {
      const [verb, ...args] = words(command),
        path = virtualPath(args[0] ?? input.cwd, input.cwd);
      if (verb === "pwd") return { output: input.cwd, cwd: input.cwd, network };
      if (
        verb === "cd" &&
        path !== DOMAIN_ROOT &&
        !path.startsWith(DOMAIN_ROOT + "/")
      )
        return { output: "", cwd: path, network };
      const result = await domainFiles(user.id, path);
      if (verb === "cd" && result.type === "directory")
        return { output: "", cwd: result.path, network };
      if (verb === "ls" && result.type === "directory")
        return {
          output: result.entries.map((e) => e.name).join("\n"),
          cwd: input.cwd,
          network,
        };
      if (verb === "cat" && result.type === "file")
        return { output: result.content, cwd: input.cwd, network };
      return {
        output: "Usa ls, cd, pwd o cat en el archivo de evidencias de dominio.",
        cwd: input.cwd,
        network,
      };
    } catch (error) {
      return {
        output:
          error instanceof Error ? error.message : "Archivo no disponible.",
        cwd: input.cwd,
        network,
      };
    }
  }
  const corporate =
    Boolean(network.host || network.password) ||
    /^(ssh|ip|route|ping|nmap|vpn|submit)(?:\s|$)/.test(command) ||
    /^man\s+(ssh|vpn|submit)(?:\s|$)/.test(command);
  if (corporate) {
    const result = await linuxCommand(user, input.command);
    return {
      output: result.output,
      clear: result.clear,
      awardedPoints: result.awardedPoints,
      cwd: input.cwd,
      network: result.view,
    };
  }
  if (command === "which ssh")
    return { output: "/usr/bin/ssh", cwd: input.cwd, network };
  if (
    getOtCase(input.challengeId) ||
    input.cwd.startsWith(OT_ROOT) ||
    command.includes(OT_ROOT + "/") ||
    getPrinterCase(input.challengeId) ||
    input.cwd.startsWith(PRINTER_ROOT) ||
    command.includes(PRINTER_ROOT) ||
    getAnalysisCase(input.challengeId) ||
    SPECIALIST_STATIONS.slice(1).some(
      (station) =>
        input.cwd.startsWith(station.root) ||
        command.includes(station.root + "/"),
    ) ||
    getFileCase(input.challengeId) ||
    input.cwd.startsWith(FILE_ROOT) ||
    command.includes(FILE_ROOT + "/") ||
    getInvestigation(input.challengeId) ||
    input.cwd.startsWith(INVESTIGATION_ROOT) ||
    command.includes("investigacion/") ||
    REVERSE_CASES.some((c) => c.id === input.challengeId) ||
    input.cwd === REVERSE_ROOT ||
    input.cwd.startsWith(REVERSE_ROOT + "/") ||
    /(^|[\s/])ingenieria-inversa([/\s]|$)/.test(command) ||
    STEGO_CASES.some((c) => c.id === input.challengeId) ||
    input.cwd === STEGO_ROOT ||
    input.cwd.startsWith(STEGO_ROOT + "/") ||
    /(^|[\s/])esteganografia([/\s]|$)/.test(command)
  ) {
    const enabled = await db.challenge.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    return {
      ...workstationFileCommand(
        enabled.map((c) => c.id),
        input.command,
        input.cwd,
      ),
      network,
    };
  }
  const id = localContext(input.challengeId)
    ? input.challengeId
    : "primer-rastro";
  if (
    !(await db.challenge.findFirst({
      where: { id, enabled: true },
      select: { id: true },
    }))
  )
    throw new NotFoundException(
      "El contexto local no está disponible. Puedes usar SSH para acceder a la red corporativa.",
    );
  if (input.command.length > 256)
    throw new BadRequestException(
      "El comando local admite hasta 256 caracteres.",
    );
  const result = virtualCommand(id, input.command, input.cwd);
  if (/^ls\s+-(?:a|la|al)$/.test(command) && input.cwd === "/home/analista")
    result.output += "\n.continuidad/";
  if (command === "help")
    result.output +=
      "\n\nRed corporativa: ssh usuario@servidor · ip addr · ip route · ping · nmap · vpn status\nConecta o desconecta desde la aplicación Seventech VPN.";
  if (command === "help")
    result.output +=
      "\nAnálisis local: crypto help.\nLaboratorio Windows: win help · win hosts (operaciones remotas mediante Seventech VPN).";
  return { ...result, network };
}
