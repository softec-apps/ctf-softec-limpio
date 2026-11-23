import { readWorkstationFile } from "./workstation-files";
import { HOME, virtualPath } from "./virtual-filesystem";
import { readWorkstationBytes } from "./workstation-binary";
function listWorkstationFiles(enabled: string[], args: string[], cwd: string) {
  const options = args.filter((arg) => arg.startsWith("-"));
  if (options.some((option) => !["-l", "-a", "-la", "-al"].includes(option)))
    return {
      output: "ls: opción no disponible. Usa ls [-l] [-a] [ruta].",
      cwd,
    };

  const long = options.some((option) => option.includes("l"));
  const all = options.some((option) => option.includes("a"));
  const path = args.filter((arg) => !arg.startsWith("-")).join(" ");
  const result = readWorkstationFile(enabled, virtualPath(path || cwd, cwd));
  const entries =
    result.type === "file"
      ? [{ name: result.name, type: "file" as const }]
      : result.entries;

  return {
    output: [
      ...(all && result.type === "directory"
        ? [
            { name: ".", type: "directory" as const },
            { name: "..", type: "directory" as const },
          ]
        : []),
      ...entries,
    ]
      .map(({ name, type }) => {
        const directory = type === "directory";
        const label =
          directory && name !== "." && name !== ".." ? name + "/" : name;
        if (!long) return label;
        return `${directory ? "drwxr-xr-x" : "-rw-r--r--"}  analista analista  ${label}`;
      })
      .join("\n"),
    cwd,
  };
}

export function workstationFileCommand(
  enabled: string[],
  command: string,
  cwd: string,
) {
  const [verb, ...args] = command.trim().split(/\s+/);
  if (verb === "ls") return listWorkstationFiles(enabled, args, cwd);
  const target = virtualPath(
    args.filter((a) => !a.startsWith("-")).join(" ") || cwd,
    cwd,
  );
  if (!verb) return { output: "", cwd, clear: false };
  if (verb === "pwd") return { output: cwd, cwd };
  if (verb === "clear") return { output: "", cwd, clear: true };
  if (verb === "help")
    return {
      output:
        "Archivos virtuales: pwd, ls [-l] [-a] [ruta], cd ruta, cat archivo, file archivo, strings archivo, xxd archivo.\nLas herramientas de imágenes, audio, bytes y código abren los mismos archivos desde sus ventanas independientes.",
      cwd,
    };
  if (verb === "cd") {
    const path = virtualPath(!args[0] || args[0] === "~" ? HOME : args[0], cwd);
    const result = readWorkstationFile(enabled, path);
    return result.type === "directory"
      ? { output: "", cwd: path }
      : { output: "cd: no es un directorio.", cwd };
  }
  if (!["cat", "file", "strings", "xxd"].includes(verb))
    return {
      output: `Comando no disponible en este contexto: ${verb}. Consulta help.`,
      cwd,
    };
  const result = readWorkstationFile(enabled, target);
  if (result.type !== "file")
    return { output: `${verb}: la ruta es un directorio.`, cwd };
  const bytes =
    "assetUrl" in result
      ? readWorkstationBytes(enabled, target).bytes
      : Buffer.from(result.content);
  if (verb === "cat")
    return {
      output:
        "content" in result && typeof result.content === "string"
          ? result.content
          : "Archivo binario. Usa file, strings, xxd o las herramientas del escritorio.",
      cwd,
    };
  if (verb === "strings")
    return {
      output: (bytes.toString("latin1").match(/[\x20-\x7e]{4,}/g) ?? [])
        .join("\n")
        .slice(0, 32768),
      cwd,
    };
  if (verb === "file") {
    const kind = bytes.subarray(0, 4).toString("hex");
    return {
      output: `${result.name}: ${kind === "0061736d" ? "WebAssembly binary module" : kind === "89504e47" ? "PNG image" : kind === "52494646" ? "RIFF WAVE audio" : kind === "504b0304" ? "ZIP archive" : bytes[0] === 255 && bytes[1] === 216 ? "JPEG image" : "UTF-8 text"}`,
      cwd,
    };
  }
  return {
    output:
      Array.from(
        { length: Math.ceil(Math.min(bytes.length, 4096) / 16) },
        (_, row) => {
          const data = bytes.subarray(row * 16, row * 16 + 16);
          return `${(row * 16).toString(16).padStart(8, "0")}  ${Array.from(
            data,
          )
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")
            .padEnd(
              47,
            )}  ${data.toString("latin1").replace(/[^\x20-\x7e]/g, ".")}`;
        },
      ).join("\n") +
      (bytes.length > 4096
        ? "\nVista inicial; el Editor hexadecimal permite recorrer todo el archivo."
        : ""),
    cwd,
  };
}
