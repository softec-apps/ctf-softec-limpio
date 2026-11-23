import { BadRequestException } from "@nestjs/common";

export type LabForm = {
  action: string;
  submitLabel: string;
  fields: { name: string; label: string; value: string; maxLength?: number }[];
};
export type LabReply = {
  status: number;
  url: string;
  kind: "index" | "document" | "error";
  title: string;
  body: string;
  media?: { src: string; alt: string; caption: string };
  source?: { publisher: string; date: string };
  form?: LabForm;
  links?: { label: string; path: string }[];
};
export type WebLabDefinition = {
  challenge: {
    id: string;
    title: string;
    description: string;
    category: string;
    device: string;
    points: number;
  };
  home: string;
  request: (value: string) => LabReply;
  evidence: Record<string, string>;
  flagVersion?: string;
};
export function scenarioUrl(
  value: string,
  origin: string,
  parameters: string[] = [],
) {
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    throw new BadRequestException("La dirección no es válida.");
  }
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.hash ||
    [...url.searchParams.keys()].some(
      (name) =>
        !parameters.includes(name) ||
        url.searchParams.getAll(name).length !== 1,
    )
  )
    throw new BadRequestException(
      "Dirección o parámetros ajenos al servicio del laboratorio.",
    );
  return url;
}
export function scenarioPage(
  url: URL,
  status: number,
  title: string,
  body: string,
  extra: Pick<LabReply, "form" | "links" | "media" | "source"> = {},
): LabReply {
  return {
    status,
    url: url.href,
    kind: status >= 400 ? "error" : "document",
    title,
    body,
    ...extra,
  };
}
export function missingPage(url: URL) {
  return scenarioPage(
    url,
    404,
    "Recurso no encontrado",
    "No existe un recurso en esa dirección.",
  );
}
export function evidenceFiles(
  home: string,
  files: Record<string, string>,
): Record<string, string> {
  return {
    "/home/analista/LEEME.txt": `SEVENTECH / Estación de investigación\n\nServicio: ${home}\nRevisa la evidencia del turno en la carpeta evidencia. Intranet y curl consultan el mismo servicio.\nHerramientas: codec -h, grep <texto> <archivo>.`,
    ...Object.fromEntries(
      Object.entries(files).map(([name, content]) => [
        "/home/analista/evidencia/" + name,
        content,
      ]),
    ),
  };
}
export function jsonObject(value: string): Record<string, unknown> {
  try {
    const decoded: unknown = JSON.parse(value);
    if (decoded && typeof decoded === "object" && !Array.isArray(decoded))
      return decoded as Record<string, unknown>;
  } catch {
    /* The scenario accepts JSON data only, never executable expressions. */
  }
  throw new BadRequestException("Se esperaba un objeto JSON válido.");
}
