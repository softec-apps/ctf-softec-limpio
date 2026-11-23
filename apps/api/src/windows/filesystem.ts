import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  WINDOWS_CASES,
  WINDOWS_ROOT,
  windowsFolder,
  type WindowsArtifact,
} from "./catalog";

export function normalizeWindowsPath(value: string) {
  const source = value.trim().replace(/\//g, "\\");
  if (!/^c:\\?/i.test(source) || /[\0<>"|?*]/.test(source))
    throw new BadRequestException("Ruta virtual de Windows no válida.");
  const rest = source.slice(2);
  if (rest && !rest.startsWith("\\"))
    throw new BadRequestException("Usa una ruta absoluta del disco C:.");
  const parts: string[] = [];
  for (const part of rest.split("\\")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length)
        throw new BadRequestException("La ruta sale del disco virtual.");
      parts.pop();
    } else {
      if (part.includes(":"))
        throw new BadRequestException("No se admiten rutas de dispositivos.");
      parts.push(part);
    }
  }
  return "C:\\" + parts.join("\\");
}
function artifacts(enabledIds: string[]) {
  return WINDOWS_CASES.filter((entry) => enabledIds.includes(entry.id)).flatMap(
    (entry) => [
      {
        path: `${windowsFolder(entry.id)}\\expediente.txt`,
        file: {
          name: "expediente.txt",
          content: `${entry.title}\n\n${entry.description}\n\nArchivo histórico de ejercicios de lectura. Sus respuestas no acreditan los retos Windows actuales. Abre Terminal Windows en el portátil para operar las máquinas del laboratorio.`,
          format: "text" as const,
          attributes: ["Archive"],
          created: "2025-11-01T08:00:00Z",
          modified: "2025-11-01T08:00:00Z",
        },
      },
      ...entry.files.map((file) => ({
        path: `${windowsFolder(entry.id)}\\${file.name}`,
        file,
      })),
    ],
  );
}
export function windowsEventLogs(enabledIds: string[]) {
  return artifacts(enabledIds)
    .filter((entry) => entry.file.format === "events")
    .map((entry) => ({ path: entry.path, name: entry.file.name }));
}
function fileReply(path: string, file: WindowsArtifact) {
  return {
    type: "file" as const,
    path,
    name: path.split("\\").at(-1)!,
    content: file.content,
    format: file.format,
    properties: {
      attributes: file.attributes,
      created: file.created,
      modified: file.modified,
      bytes: Buffer.byteLength(file.content, "utf8"),
    },
  };
}
export function readWindowsFile(
  enabledIds: string[],
  value: string,
  showHidden = false,
) {
  const requested = normalizeWindowsPath(value);
  const key = requested.toLowerCase();
  const files = artifacts(enabledIds);
  const match = files.find((entry) => entry.path.toLowerCase() === key);
  if (match) return fileReply(match.path, match.file);
  const dirs = new Set<string>([
    "C:\\",
    "C:\\Users",
    "C:\\Users\\Analista",
    "C:\\Users\\Analista\\Documents",
    "C:\\Users\\Analista\\Downloads",
    "C:\\Users\\Analista\\Desktop",
    WINDOWS_ROOT,
  ]);
  for (const entry of files) {
    const pieces = entry.path.split("\\");
    for (let i = 2; i < pieces.length; i++)
      dirs.add(pieces.slice(0, i).join("\\"));
  }
  const directory = [...dirs].find((path) => path.toLowerCase() === key);
  if (!directory)
    throw new NotFoundException("No existe esa ruta en el portátil virtual.");
  const prefix = directory.endsWith("\\") ? directory : directory + "\\";
  const entries: {
    name: string;
    type: "file" | "directory";
    hidden?: boolean;
  }[] = [];
  for (const dir of dirs)
    if (
      dir.startsWith(prefix) &&
      !dir.slice(prefix.length).includes("\\") &&
      dir !== directory
    )
      entries.push({ name: dir.slice(prefix.length), type: "directory" });
  for (const entry of files) {
    if (
      !entry.path.startsWith(prefix) ||
      entry.path.slice(prefix.length).includes("\\")
    )
      continue;
    const hidden = entry.file.attributes.includes("Hidden");
    if (hidden && !showHidden) continue;
    entries.push({
      name: entry.path.slice(prefix.length),
      type: "file",
      hidden,
    });
  }
  return { type: "directory" as const, path: directory, entries };
}
