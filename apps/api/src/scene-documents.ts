import { DATABASE_LABS } from "./database-lab/catalog";
import { CONTRACT_LABS } from "./smart-contracts/catalog";
import { CLOUD_LABS } from "./cloud/catalog";
import { AI_LABS } from "./ai-security/catalog";
import { SPECIALIST_STATIONS } from "../../../packages/specialist-contracts";
import { API_LABS } from "./api-security/catalog";
import { ANALYSIS_CASES } from "./casework/catalog";
import { FILE_CASES, FILE_ROOT } from "./file-forensics/catalog";
import { NotFoundException } from "@nestjs/common";
import { NETWORK_CASES, networkFiles } from "./network/catalog";
import { REFERENCE_BOOKS } from "./library/catalog";
import { OSINT_CASES } from "./osint/sources";
import { OSINT_LABS } from "./osint/catalog";
import { CRYPTO_CHALLENGES, cryptoFiles } from "./crypto/catalog";
import { flagValue } from "./security";
export const NIGHT_CASE_VERSION = "turno-nocturno:v2";
export const NIGHT_CASE_DESCRIPTION =
  "El cierre del incidente ST-041 no coincide con el informe de guardia. Reconstruye su identificador de integridad a partir de los registros conservados en la sala.";
type Document = {
  challengeId?: string;
  category?: string;
  pageCount?: number;
  id: string;
  title: string;
  style: "handwriting" | "typed" | "sticky";
  body: string;
  page?: number;
  drawer?: number;
  folder?: number;
};
export function sceneDocuments(objectId: string): Document[] {
  const station = SPECIALIST_STATIONS.find((entry) => entry.id === objectId);
  if (station)
    return !!station.serviceHost
      ? [
          ...API_LABS,
          ...CLOUD_LABS,
          ...AI_LABS,
          ...DATABASE_LABS,
          ...CONTRACT_LABS,
        ]
          .filter((lab) => lab.challenge.id.startsWith(station.prefix))
          .map((lab) => ({
            id: lab.challenge.id,
            challengeId: lab.challenge.id,
            title: lab.challenge.title,
            style: "typed" as const,
            body: lab.challenge.description,
          }))
      : ANALYSIS_CASES.filter((entry) => entry.station.id === objectId).map(
          (entry) => ({
            id: entry.id,
            challengeId: entry.id,
            title: entry.title,
            style: "typed" as const,
            body:
              entry.question +
              "\n\nEvidencias: " +
              station.root +
              "/caso-" +
              entry.id.slice(-2),
          }),
        );
  if (objectId === "rack")
    return NETWORK_CASES.map((entry, page) => ({
      id: entry.id,
      title: entry.title,
      style: "typed" as const,
      page,
      body: networkFiles(entry.id)!["/home/analista/evidencia/expediente.txt"],
    }));
  if (objectId === "library")
    return REFERENCE_BOOKS.map((book) => ({
      id: book.id,
      title: book.title,
      category: book.category,
      pageCount: book.pages.length,
      style: "typed" as const,
      body: book.pages
        .map((page) => `${page.title}\n${page.body}`)
        .join("\n\n§\n\n"),
    }));
  if (objectId === "osint-board")
    return OSINT_CASES.map((entry, page) => ({
      id: entry.id,
      title: entry.title,
      style: "typed" as const,
      page,
      body: `${entry.question}\n\nRecorte encontrado\nFuente: ${entry.pages[0].publisher}\nFecha: ${entry.pages[0].date}\n\n${entry.pages[0].body}\n\nArchivo de consulta: ${OSINT_LABS[page].home}`,
    }));
  if (objectId === "crypto-book")
    return CRYPTO_CHALLENGES.map((entry, page) => ({
      id: entry.id,
      title: entry.title,
      style: "typed" as const,
      page,
      body: cryptoFiles(entry.id)!["/home/analista/evidencia/enunciado.txt"],
    }));
  const token = flagValue(NIGHT_CASE_VERSION).slice(4, -1);
  const a = token.slice(0, 10),
    b = token.slice(10, 20),
    c = token.slice(20);
  const documents: Record<string, Document[]> = {
    notebook: [
      {
        id: "book-1",
        title: "Página 1",
        style: "handwriting",
        page: 0,
        body: "14 de octubre\n\nCambiar la batería del lector.\nOtra vez marcó mal la hora.\n\nST-014 / 22:08\nlectura: 8c 31 2a 7f 09\n\nLa impresora sigue dejando rayas.\nPedir tóner antes del viernes.",
      },
      {
        id: "book-2",
        title: "Página 2",
        style: "handwriting",
        page: 1,
        body: "Notas de la guardia\n\nEl cierre de un incidente conserva las lecturas en el orden en que fueron tomadas.\n\nNo confundir el número de expediente con la fecha del informe.\n\nLas hojas se mezclan siempre cuando cambia el turno.\n\nM.",
      },
      {
        id: "book-3",
        title: "Página 3",
        style: "handwriting",
        page: 2,
        body: `15 de octubre\n\n23:14 / ST-041\n\nSe apagó el lector antes de imprimir el cierre.\nAnoté la lectura que alcanzó a mostrar:\n\n${a.match(/.{2}/g)!.join(" ")}\n\nNo voy a volver a copiar todo el informe.\nM.`,
      },
      {
        id: "book-4",
        title: "Página 4",
        style: "handwriting",
        page: 3,
        body: "Pendientes\n\nST-042 / revisar mañana\n\nComprar carpetas sin color. Las verdes se confunden con el inventario.\n\nRecordar: copia del inventario = 77 14 ab 90 3c\n\nLlamar al proveedor a las nueve.",
      },
    ],
    archive: [
      {
        id: "file-1",
        title: "Compras",
        style: "typed",
        drawer: 0,
        folder: 0,
        body: "SEVENTECH / ADMINISTRACIÓN\nORDEN DE COMPRA 208\n\n12 de octubre\n\n6 carpetas de archivo\n2 cajas de guantes\n1 batería para lector\n\nEstado: pendiente de recepción.\n\nRecibido por: M. R.",
      },
      {
        id: "file-2",
        title: "Inventario",
        style: "typed",
        drawer: 0,
        folder: 1,
        body: "CONTROL DE INVENTARIO\nST-014 / copia de seguridad\n\nEquipo 01: operativo\nEquipo 02: mantenimiento\nLectura de control: 8173aa029b\n\nEl equipo de repuesto no se utilizó durante la guardia.",
      },
      {
        id: "file-3",
        title: "Incidencias",
        style: "typed",
        drawer: 1,
        folder: 0,
        body: `SEVENTECH / REGISTRO DE INCIDENCIAS\n\nExpediente: ST-041\nAdquisición: 15 de octubre / 23:27\nOperador: M. R.\n\nLectura conservada:\n${b}\n\nEl informe de cierre se imprimió al terminar la guardia.\n\nFirma: __________________`,
      },
      {
        id: "file-4",
        title: "Entregas",
        style: "typed",
        drawer: 1,
        folder: 1,
        body: "ENTREGA DE TURNO\n15 de octubre / 23:50\n\nEl analista dejó un cuaderno sobre la mesa.\nNo se registraron daños físicos en los equipos.\n\nExpedientes abiertos: ST-014, ST-041, ST-042.\n\nSe conservan las hojas originales.",
      },
      {
        id: "file-5",
        title: "Mantenimiento",
        style: "typed",
        drawer: 2,
        folder: 0,
        body: "SERVICIO TÉCNICO\n\nST-042 / 16 de octubre / 09:10\n\nLectura posterior al reemplazo:\n3fa7819401\n\nLa pieza retirada debe permanecer en almacén hasta el cierre de mes.",
      },
      {
        id: "file-6",
        title: "Procedimientos",
        style: "typed",
        drawer: 2,
        folder: 1,
        body: "PROCEDIMIENTO / INTEGRIDAD\n\nCuando el lector no genera un cierre completo, el identificador se reconstruye con sus lecturas parciales.\n\nSe respeta la secuencia de adquisición. Las marcas de transcripción no forman parte del valor.\n\nNo mezclar expedientes.\n\nRevisión 02 / Archivo de guardia",
      },
      ...FILE_CASES.map((entry, index) => ({
        id: entry.id,
        challengeId: entry.id,
        title: `Expediente ${index + 1} · ${entry.title}`,
        style: "typed" as const,
        drawer: Math.min(2, Math.floor(index / 4)),
        folder: index % 2,
        body: `SEVENTECH / ARCHIVOS\n\n${entry.title}\n\n${entry.question}\n\nEvidencias preservadas en el computador:\n${FILE_ROOT}/caso-${entry.id.slice(-2)}\n\n${Object.keys(entry.files).join("\n")}\n\nNo se necesita completar otros expedientes. Entrega la flag desde Retos.`,
      })),
    ],
    noticeboard: [
      {
        id: "note-1",
        title: "Nota 1",
        style: "sticky",
        page: 0,
        body: "Viernes\n\nViene el técnico por la impresora.\nNo tirar el rodillo viejo.\n\nM.",
      },
      {
        id: "note-2",
        title: "Nota 2",
        style: "sticky",
        page: 1,
        body: "ST-014\n22:31\n\nf9d0a7b2314c\n\nYa quedó cerrado.",
      },
      {
        id: "note-3",
        title: "Nota 3",
        style: "sticky",
        page: 2,
        body: "Antes de irme:\n\n— apagar lámpara\n— dejar la llave\n— sacar la basura",
      },
      {
        id: "note-4",
        title: "Nota 4",
        style: "sticky",
        page: 3,
        body: `23:41 / ST-041\n\nÚltima lectura antes del cierre:\n\n${c}\n\nM. R.`,
      },
      {
        id: "note-5",
        title: "Nota 5",
        style: "sticky",
        page: 4,
        body: "El reloj del lector quedó bien desde las 22:40.\n\nNo corregir a mano las horas de esta guardia.",
      },
      {
        id: "note-6",
        title: "Nota 6",
        style: "sticky",
        page: 5,
        body: "ST-042\n\nSin atención nocturna.\nLo toma el turno de mañana.\n\n09:00",
      },
    ],
  };
  return documents[objectId] ?? [];
}
export function documentMetadata(objectId: string) {
  return sceneDocuments(objectId).map(({ body, ...metadata }) => metadata);
}
export function readSceneDocument(objectId: string, documentId: string) {
  const document = sceneDocuments(objectId).find((d) => d.id === documentId);
  if (!document)
    throw new NotFoundException("Documento no encontrado en este objeto.");
  return { ...document, objectId };
}
