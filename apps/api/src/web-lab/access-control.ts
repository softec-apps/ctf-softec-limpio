import { pointsFor } from "../scoring/policy";
import { BadRequestException } from "@nestjs/common";
import { flagValue } from "../security";

export const WEB_CHALLENGE_ID = "archivo-sin-fronteras";
export const WEB_CHALLENGE_VERSION = "archivo-sin-fronteras:v2";
export const WEB_LAB_ORIGIN = "http://archivo.seventech.local";
export const WEB_CHALLENGE = {
  id: WEB_CHALLENGE_ID,
  title: "Archivo sin fronteras",
  description:
    "El portal de archivo muestra los documentos de Operaciones, pero una descarga del cierre de turno no coincide con ese ámbito. Investiga el portal desde el computador Linux y recupera el sello de custodia del acta de Dirección expuesta. Portal: http://archivo.seventech.local/.",
  category: "Web · OWASP A01:2025 · Control de acceso roto",
  device: "computer",
  points: pointsFor("archivo-sin-fronteras"),
};

const visibleDocuments = [
  { id: "4101", title: "Inventario de estaciones" },
  { id: "4104", title: "Entrega de materiales" },
  { id: "4107", title: "Calendario de mantenimiento" },
];

const archiveDocuments = [
  {
    id: "4108",
    title: "Circular de Dirección",
    area: "Dirección",
    note: "Comunicado general de distribución interna. Sin sello de custodia.",
  },
  {
    id: "4116",
    title: "Acta de cierre provisional",
    area: "Dirección",
    note: "BORRADOR / documento sin firma. Esta versión no acredita el cierre de la revisión.",
  },
  {
    id: "4127",
    title: "Acta de cierre de Dirección",
    area: "Dirección",
    note: "COPIA ANULADA / sello revocado. No utilizar como evidencia de custodia.",
  },
  {
    id: "4133",
    title: "Cierre de inventario",
    area: "Operaciones",
    note: "Revisión de materiales completa. Acta ordinaria, sin sello de custodia de Dirección.",
  },
];

export function webLabRequest(value: string) {
  let url: URL;
  try {
    url = new URL(value, WEB_LAB_ORIGIN);
  } catch {
    throw new BadRequestException("La dirección no es válida.");
  }
  if (
    url.origin !== WEB_LAB_ORIGIN ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new BadRequestException(
      "Esta estación solo consulta el portal de archivo del laboratorio.",
    );
  const address = url.href;
  if (url.pathname === "/")
    return {
      status: 200,
      url: address,
      kind: "index" as const,
      title: "Archivo de Operaciones",
      body: "Sesión: op.archivo · Área: Operaciones\nDocumentos disponibles para tu área.",
      documents: visibleDocuments,
    };
  const match = /^\/expedientes\/(\d{4})$/.exec(url.pathname);
  const record = visibleDocuments.find(
    (document) => document.id === match?.[1],
  );
  if (record)
    return {
      status: 200,
      url: address,
      kind: "document" as const,
      title: record.title,
      body: `Expediente ST-${record.id}\nÁrea: Operaciones\nEstado: archivado\n\nDocumento de trabajo de la unidad. Sin incidencias registradas en el cierre de turno.`,
    };
  const archived = archiveDocuments.find(
    (document) => document.id === match?.[1],
  );
  if (archived)
    return {
      status: 200,
      url: address,
      kind: "document" as const,
      title: archived.title,
      body: `Expediente ST-${archived.id}\nÁrea: ${archived.area}\n\n${archived.note}`,
    };
  // Only this fictional dataset omits ownership checks; CTF authorization stays enforced.
  const targetId = String(
    4140 +
      (Number.parseInt(flagValue(WEB_CHALLENGE_VERSION).slice(4, 12), 16) % 60),
  );
  if (match?.[1] === targetId)
    return {
      status: 200,
      url: address,
      kind: "document" as const,
      title: "Acta de cierre de Dirección",
      body: `Expediente ST-${targetId}\nÁrea: Dirección\nClasificación: reservada\nEstado: firmado y vigente\n\nSe aprueba el cierre de la revisión de accesos. El archivo debe quedar bajo custodia exclusiva de Dirección. Este original sustituye todas las copias provisionales y anuladas.\n\nSello de custodia: ${flagValue(WEB_CHALLENGE_VERSION)}`,
    };
  return {
    status: 404,
    url: address,
    kind: "error" as const,
    title: "Documento no encontrado",
    body: "No existe un documento archivado en esta dirección.",
  };
}
