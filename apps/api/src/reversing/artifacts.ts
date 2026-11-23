import { NotFoundException } from "@nestjs/common";
import { REVERSE_CASES, REVERSE_ROOT } from "./catalog";
import { buildReverseProgram } from "./programs";
const cache = new Map<string, Buffer>();
function locate(path: string) {
  for (const entry of REVERSE_CASES) {
    const name = path.slice(entry.folder.length + 1);
    if (
      path.startsWith(entry.folder + "/") &&
      [entry.file, "LEEME.txt", "ABI.txt"].includes(name)
    )
      return { entry, name };
  }
  return null;
}
export function readReverseBytes(enabled: string[], path: string) {
  const found = locate(path);
  if (!found || !enabled.includes(found.entry.id))
    throw new NotFoundException("Archivo no disponible.");
  const { entry, name } = found;
  let bytes = cache.get(path);
  if (!bytes) {
    bytes =
      name === entry.file
        ? buildReverseProgram(entry.index)
        : Buffer.from(
            name === "LEEME.txt"
              ? `${entry.title}\n\n${entry.description}\n\nArchivo preservado: ${entry.file}\nContrato de uso: ABI.txt.\nAbre el módulo con Desensamblador, desde Aplicaciones → Herramientas.\nLa clave autoriza al programa a recuperar su mensaje; la entrega del reto es la flag que produzca.\n`
              : "SEVENTECH / Contrato WebAssembly\n\nMódulo WebAssembly 1, sin imports. Exporta memory y verify(ptr: i32, len: i32) -> i32.\nLa entrada es texto UTF-8, de hasta 128 bytes. El banco de pruebas la escribe desde la dirección 0.\nverify devuelve 0 si no autoriza y 1 si recupera el mensaje.\nLos globals result_ptr y result_len indican el rango de memoria del mensaje recuperado.\nCada ejecución comienza con una memoria nueva.\nEl Desensamblador permite examinar funciones, datos y cadenas, y probar cualquier clave.\nConsulta la ayuda de instrucciones de la herramienta para interpretar las operaciones de pila.\n",
          );
    cache.set(path, bytes);
  }
  return {
    bytes,
    name,
    mime: name.endsWith(".wasm") ? "application/wasm" : "text/plain",
  };
}
export function readReverseFile(enabled: string[], path: string) {
  const cases = REVERSE_CASES.filter((c) => enabled.includes(c.id));
  if (path === REVERSE_ROOT)
    return {
      type: "directory" as const,
      path,
      entries: cases.map((c) => ({
        name: c.folder.slice(REVERSE_ROOT.length + 1),
        type: "directory" as const,
      })),
    };
  const directory = cases.find((c) => c.folder === path);
  if (directory)
    return {
      type: "directory" as const,
      path,
      entries: ["LEEME.txt", "ABI.txt", directory.file].map((name) => ({
        name,
        type: "file" as const,
      })),
    };
  const file = readReverseBytes(enabled, path);
  return {
    type: "file" as const,
    path,
    name: file.name,
    mime: file.mime,
    assetUrl: `/api/v1/workstation/binary?path=${encodeURIComponent(path)}`,
    ...(file.mime === "text/plain"
      ? { content: file.bytes.toString("utf8") }
      : {}),
  };
}
