import { pointsFor } from "../scoring/policy";
import { BadRequestException } from "@nestjs/common";
import { flagValue } from "../security";

export const INJECTION_CHALLENGE_ID = "consulta-sin-limites";
export const INJECTION_ORIGIN = "http://boletines.seventech.local";
export const INJECTION_CHALLENGE = {
  id: INJECTION_CHALLENGE_ID,
  title: "Consulta sin límites",
  description:
    "El buscador de boletines heredado responde de forma extraña a algunas consultas. Investiga cómo interpreta el texto y recupera la evidencia del informe interno de revisión. Servicio: http://boletines.seventech.local/.",
  category: "Web · OWASP A05:2025 · Inyección SQL",
  device: "computer",
  points: pointsFor("consulta-sin-limites"),
};
const bulletins = [
  {
    id: "B-201",
    title: "Mantenimiento de estaciones",
    body: "Mantenimiento preventivo programado para el siguiente turno.",
  },
  {
    id: "B-204",
    title: "Horarios del laboratorio",
    body: "El laboratorio permanecerá abierto durante las jornadas del evento.",
  },
  {
    id: "B-209",
    title: "Entrega de credenciales",
    body: "Las credenciales de participantes se entregan en recepción.",
  },
];

export function injectionRequest(value: string) {
  let url: URL;
  try {
    url = new URL(value, INJECTION_ORIGIN);
  } catch {
    throw new BadRequestException("La dirección no es válida.");
  }
  if (
    url.origin !== INJECTION_ORIGIN ||
    url.username ||
    url.password ||
    url.hash ||
    [...url.searchParams.keys()].some((key) => key !== "q") ||
    url.searchParams.getAll("q").length > 1
  )
    throw new BadRequestException(
      "Esta estación solo consulta el buscador de boletines del laboratorio.",
    );
  if (url.pathname !== "/")
    return {
      status: 404,
      url: url.href,
      kind: "error" as const,
      title: "Página no encontrada",
      body: "El buscador está disponible en la portada.",
    };
  const query = url.searchParams.get("q") ?? "";
  if (query.length > 160)
    throw new BadRequestException("La consulta admite hasta 160 caracteres.");
  // Bounded simulation of a concatenated LIKE clause; never executes SQL or eval.
  const expression =
    /^(.*?)'\s+or\s+(?:(\d+)\s*=\s*(\d+)|'([^']*)'\s*=\s*'([^']*)')\s*--(?:\s.*)?$/i.exec(
      query,
    );
  const truth =
    expression &&
    (expression[2] !== undefined
      ? Number(expression[2]) === Number(expression[3])
      : expression[4] === expression[5]);
  if (!expression && query.includes("'"))
    return {
      status: 500,
      url: url.href,
      kind: "error" as const,
      title: "La consulta no pudo completarse",
      body: "SQLSTATE[42601]: unterminated quoted string near the search term. Consulta: SELECT titulo, contenido FROM boletines WHERE publico = 1 AND titulo LIKE '%[consulta]%'",
      query,
    };
  const search = (expression?.[1] ?? query)
    .replace(/%/g, "")
    .toLocaleLowerCase("es");
  const results = truth
    ? [
        ...bulletins,
        {
          id: "B-INT",
          title: "Informe interno de revisión",
          body: `Clasificación: interna / no publicada\nEstado: firmado\n\nEl buscador heredado concatena el término de búsqueda con la consulta y permite alterar el filtro de publicación.\n\nEvidencia de revisión: ${flagValue(INJECTION_CHALLENGE_ID)}`,
        },
      ]
    : bulletins.filter((bulletin) =>
        bulletin.title.toLocaleLowerCase("es").includes(search),
      );
  return {
    status: 200,
    url: url.href,
    kind: "index" as const,
    title: "Buscador de boletines",
    body: `${results.length} boletines encontrados.`,
    query,
    results,
  };
}

export const INJECTION_EVIDENCE: Record<string, string> = {
  "/home/analista/LEEME.txt":
    "SEVENTECH / Revisión del buscador\r\n\r\nServicio: http://boletines.seventech.local/\r\nLa aplicación Intranet permite probar términos de búsqueda. curl está disponible en terminal.\r\nSe conservaron registros y una nota de mantenimiento en evidencia.",
  "/home/analista/evidencia/buscador.log":
    "22:12 búsqueda=horarios status=200 resultados=1\r\n22:14 búsqueda=credenciales status=200 resultados=1\r\n22:16 búsqueda=[término con apóstrofo] status=500 SQLSTATE=42601\r\n22:19 revisión: informe interno ausente del catálogo publicado",
  "/home/analista/evidencia/mantenimiento.txt":
    "Buscador legacy / pendiente de mantenimiento\r\n\r\nEl término se inserta dentro de una búsqueda LIKE. Los filtros de publicación comparten la misma consulta. Las consultas válidas conservan las palabras clave SQL del motor anterior.\r\nNo se habilitaron escrituras ni consultas múltiples en esta estación.",
};
