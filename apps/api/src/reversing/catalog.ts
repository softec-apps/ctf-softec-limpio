import { pointsFor } from "../scoring/policy";
import { flagValue } from "../security";
export const REVERSE_ROOT = "/home/analista/ingenieria-inversa";
export const REVERSE_CASES = [
  {
    title: "La licencia del archivo",
    group: "Cadenas",
    points: pointsFor("reverse-01"),
    description:
      "Un utilitario de archivo dejó de aceptar su licencia. Conservamos el módulo original, pero se perdió el documento con la clave.",
    file: "archivo.wasm",
  },
  {
    title: "El sello del proveedor",
    group: "Operaciones",
    points: pointsFor("reverse-02"),
    description:
      "El proveedor protegió las comparaciones de su verificador. Investiga qué transformación aplica antes de decidir si una licencia es válida.",
    file: "sello.wasm",
  },
  {
    title: "El lector desplazado",
    group: "Operaciones",
    points: pointsFor("reverse-03"),
    description:
      "El lector de credenciales cambió tras una actualización. La rutina sigue siendo breve; reconstruye la entrada que espera.",
    file: "lector.wasm",
  },
  {
    title: "El orden de recepción",
    group: "Memoria",
    points: pointsFor("reverse-04"),
    description:
      "Recepción conserva una tabla de control y un verificador. El orden en que se consulta la entrada parece distinto al de la tabla.",
    file: "recepcion.wasm",
  },
  {
    title: "El dial de mantenimiento",
    group: "Operaciones",
    points: pointsFor("reverse-05"),
    description:
      "Un equipo compara credenciales después de manipular sus bits. El técnico anotó que no se trata de un desplazamiento que pierda información.",
    file: "dial.wasm",
  },
  {
    title: "El alfabeto del fabricante",
    group: "Memoria",
    points: pointsFor("reverse-06"),
    description:
      "El firmware utiliza un alfabeto propio para validar el código de servicio. La tabla del fabricante quedó dentro del módulo.",
    file: "alfabeto.wasm",
  },
  {
    title: "El relevo encadenado",
    group: "Estado",
    points: pointsFor("reverse-07"),
    description:
      "Cada posición del código depende de la anterior. El módulo de relevos conserva el estado necesario para reconstruir la secuencia.",
    file: "relevo.wasm",
  },
  {
    title: "Dos firmas para una entrega",
    group: "Flujo de control",
    points: pointsFor("reverse-08"),
    description:
      "El sistema de recepción exige la aprobación de dos rutinas. Un código de invitado aparece en los datos, pero nunca autoriza la entrega.",
    file: "firmas.wasm",
  },
  {
    title: "La serie de inventario",
    group: "Operaciones",
    points: pointsFor("reverse-09"),
    description:
      "Inventario transforma cada carácter según su posición y luego reduce el resultado a un byte. Recupera la serie original.",
    file: "inventario.wasm",
  },
  {
    title: "El último estado",
    group: "Estado",
    points: pointsFor("reverse-10"),
    description:
      "El custodio dejó un verificador con memoria de cada paso. Reconstruye cómo evoluciona su registro hasta autorizar el cierre.",
    file: "custodio.wasm",
  },
].map((entry, index) => ({
  ...entry,
  index,
  id: `reverse-${String(index + 1).padStart(2, "0")}`,
  folder: `${REVERSE_ROOT}/caso-${String(index + 1).padStart(2, "0")}`,
}));
export const REVERSE_CHALLENGES = REVERSE_CASES.map((c) => ({
  id: c.id,
  title: c.title,
  category: `Ingeniería inversa · ${c.group}`,
  device: "computer",
  points: c.points,
  description: `${c.description} Archivos: ${c.folder}. Analiza el programa y recupera su mensaje de entrega. Entrega la flag en Detalle del reto.`,
}));
export const reverseFlag = (id: string) => flagValue(`${id}:v1`);
// Separate derivation: the license is never the submission flag.
export const reverseKey = (id: string) =>
  flagValue(`${id}:license:v1`).slice(4, 16);
