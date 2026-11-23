import { BadRequestException, NotFoundException } from "@nestjs/common";
import { webLabRequest } from "./access-control";

const HELP =
  "ffuf / edición simulada del laboratorio\r\n\r\nUso: ffuf -u <URL-con-FUZZ> -w <diccionario> [-mc 200|404|all] [-fs bytes]\r\n\r\n-u  Dirección con una única palabra FUZZ\r\n-w  Archivo de palabras del sistema virtual\r\n-mc Códigos que mostrar (predeterminado: 200)\r\n-fs Excluir respuestas de este tamaño en bytes\r\n\r\nLos resultados no incluyen los cuerpos de los documentos.";

export function webLabFuzz(
  args: string[],
  readWordlist: (path: string) => string,
) {
  if (args.length === 1 && ["-h", "--help"].includes(args[0])) return HELP;
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (
      !["-u", "-w", "-mc", "-fs"].includes(option) ||
      !value ||
      options.has(option)
    )
      return "ffuf: argumentos inválidos. Consulta ffuf -h.";
    options.set(option, value.replace(/^(["'])(.*)\1$/, "$2"));
  }
  const template = options.get("-u");
  const wordlist = options.get("-w");
  const matcher = options.get("-mc") ?? "200";
  const sizeFilter = options.get("-fs");
  if (!template || !wordlist || template.split("FUZZ").length !== 2)
    return "ffuf: indica -u con una única palabra FUZZ y -w con un diccionario.";
  if (
    !/^(all|(?:200|404)(?:,(?:200|404))*)$/.test(matcher) ||
    (sizeFilter !== undefined && !/^\d{1,6}$/.test(sizeFilter))
  )
    return "ffuf: filtros inválidos. Consulta ffuf -h.";
  try {
    // Validate the destination before reading words or starting the bounded scan.
    webLabRequest(template.replace("FUZZ", "4100"));
    const words = readWordlist(wordlist).split(/\r?\n/).filter(Boolean);
    if (
      !words.length ||
      words.length > 200 ||
      words.some((word) => !/^\d{4}$/.test(word))
    )
      return "ffuf: el diccionario debe tener entre 1 y 200 identificadores de cuatro cifras.";
    const matches: string[] = [];
    for (const word of words) {
      const response = webLabRequest(template.replace("FUZZ", word));
      const size = Buffer.byteLength(response.body, "utf8");
      if (
        (matcher === "all" ||
          matcher.split(",").includes(String(response.status))) &&
        (sizeFilter === undefined || size !== Number(sizeFilter))
      )
        matches.push(`${word} [Status: ${response.status}, Size: ${size}]`);
    }
    return [
      "ffuf / laboratorio · enumeración por diccionario",
      ...matches,
      `Progreso: ${words.length}/${words.length} · Coincidencias: ${matches.length}`,
      "Revisa los candidatos con curl o desde Intranet.",
    ].join("\r\n");
  } catch (error) {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    )
      return `ffuf: ${error.message}`;
    throw error;
  }
}
