import { pointsFor } from "../scoring/policy";
import { flagValue } from "../security";
export const STEGO_ROOT = "/home/analista/esteganografia";
export const STEGO_CASES = [
  {
    title: "La postal que volvió",
    group: "Imágenes",
    points: pointsFor("stego-01"),
    description:
      "Una postal regresó del archivo con el mismo aspecto y un tamaño distinto. Recupera el mensaje que viajó con ella.",
    files: ["postal.jpg"],
  },
  {
    title: "El retrato del vestíbulo",
    group: "Imágenes",
    points: pointsFor("stego-02"),
    description:
      "El fotógrafo aseguró que dejó una anotación en la entrega. La imagen del vestíbulo parece completamente normal.",
    files: ["vestibulo.jpg"],
  },
  {
    title: "Una tarde sin novedades",
    group: "Imágenes",
    points: pointsFor("stego-03"),
    description:
      "El informe sostiene que el pasillo estaba vacío. La copia preservada conserva un mensaje que no se aprecia a simple vista.",
    files: ["pasillo.png"],
  },
  {
    title: "La luz de guardia",
    group: "Imágenes",
    points: pointsFor("stego-04"),
    description:
      "La cámara de guardia entregó una imagen casi idéntica a la habitual. El remitente insiste en que también dejó una invitación legible.",
    files: ["guardia.png"],
  },
  {
    title: "Dos copias del mismo turno",
    group: "Imágenes",
    points: pointsFor("stego-05"),
    description:
      "Llegaron dos láminas que parecen dañadas. El mensajero indicó que ninguna de las dos debía examinarse por separado.",
    files: ["lamina_a.png", "lamina_b.png"],
  },
  {
    title: "La llamada entrecortada",
    group: "Audio",
    points: pointsFor("stego-06"),
    description:
      "La grabación de una llamada corta conserva una entrega que no se entiende al escucharla. Trabaja sobre la copia digital original.",
    files: ["llamada.wav"],
  },
  {
    title: "El relevo de las dos líneas",
    group: "Audio",
    points: pointsFor("stego-07"),
    description:
      "La central archivó las dos líneas de una comunicación. El operador dejó su parte de turno junto a la grabación.",
    files: ["intercom.wav", "parte_de_turno.txt"],
  },
  {
    title: "La circular del lunes",
    group: "Documentos",
    points: pointsFor("stego-08"),
    description:
      "La circular aprobada parece una hoja de cortesía. La revisión de imprenta encontró una frase que no aparece en la lectura habitual.",
    files: ["circular.svg"],
  },
  {
    title: "Una carta sin correcciones",
    group: "Documentos",
    points: pointsFor("stego-09"),
    description:
      "Dos copias de una carta tienen el mismo texto visible. El original digital conserva marcas que la impresión perdió.",
    files: ["carta.txt"],
  },
  {
    title: "El comprobante extraviado",
    group: "Contenedores",
    points: pointsFor("stego-10"),
    description:
      "Contabilidad recibió un comprobante que el visor no reconoce como fotografía. Recupera el documento que contiene.",
    files: ["comprobante.jpg"],
  },
].map((entry, index) => ({
  ...entry,
  index,
  id: `stego-${String(index + 1).padStart(2, "0")}`,
  folder: `${STEGO_ROOT}/caso-${String(index + 1).padStart(2, "0")}`,
}));
export const STEGO_CHALLENGES = STEGO_CASES.map((c) => ({
  id: c.id,
  title: c.title,
  description: `${c.description} Evidencias: ${c.folder}. Entrega la flag recuperada desde Detalle del reto.`,
  category: `Esteganografía · ${c.group}`,
  device: "computer",
  points: c.points,
}));
export const stegoFlag = (id: string) => flagValue(`${id}:v1`);
