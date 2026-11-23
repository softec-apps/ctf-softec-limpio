import { createHash } from "node:crypto";
import { pointsFor } from "../scoring/policy";
export const INVESTIGATION_ROOT = "/home/analista/investigacion";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
type Case = {
  id: string;
  title: string;
  question: string;
  answer: string;
  files: Record<string, string>;
};
const cases: Omit<Case, "id">[] = [
  {
    title: "La copia fiel",
    question:
      "Identifica la copia cuyo contenido coincide con el resumen preservado. Entrega CTF{nombre_del_archivo}, con extensión.",
    answer: "comprobante-b.txt",
    files: {
      "recibo.txt":
        "Transferencia preservada: lote L-814; recibido completo.\n",
      "comprobante-a.txt": "lote=L-814;estado=pendiente",
      "comprobante-b.txt": "lote=L-814;estado=recibido",
      "integridad.txt": `SHA256 del contenido, sin añadir salto de línea: ${sha("lote=L-814;estado=recibido")}`,
    },
  },
  {
    title: "El minuto correcto",
    question:
      "El registro de acceso está en hora local y el servidor usa UTC. Identifica la hora UTC de la entrada correcta y entrega CTF{HHMM}.",
    answer: "0715",
    files: {
      "reloj.txt":
        "Puesto: UTC-05:00. Servidor: UTC. Ambos relojes sincronizados.\n",
      "accesos.csv":
        "evento,hora_local,resultado\nE-16,02:09,denegado\nE-17,02:15,autorizado\nE-18,02:22,denegado\n",
    },
  },
  {
    title: "La sesión que permaneció",
    question:
      "El cierre del turno revocó dos sesiones. Identifica la sesión que todavía admite acceso y entrega CTF{id_de_sesion}.",
    answer: "session-R7",
    files: {
      "sesiones.csv":
        "id,activa,revocada,expira\nsession-R5,true,true,mañana\nsession-R6,false,false,mañana\nsession-R7,true,false,mañana\n",
      "criterio.txt":
        "El servicio exige activa=true, revocada=false y una fecha de expiración futura.\n",
    },
  },
  {
    title: "La revisión preservada",
    question:
      "Relaciona la entrega aceptada con su copia íntegra y su revisión. Forma entrega|copia|revision, sin espacios, calcula su SHA256 y entrega CTF{resumen_hexadecimal}.",
    answer: sha("D-28|copia-c|revision-4"),
    files: {
      "entregas.csv":
        "entrega,estado,resumen\nD-27,rechazada," +
        sha("revision-3;cerrado") +
        "\nD-28,aceptada," +
        sha("revision-4;cerrado") +
        "\n",
      "copias.txt":
        "copia-a: revision-3;cerrado\ncopia-b: revision-4;abierto\ncopia-c: revision-4;cerrado\n",
      "lectura.txt":
        "Los resúmenes corresponden únicamente al texto posterior a los dos puntos y un espacio, sin salto final.\n",
    },
  },
  {
    title: "Un alias prestado",
    question:
      "El mismo alias fue reutilizado. Cruza el identificador de la sesión que ejecutó la exportación con el inventario y entrega CTF{id_de_cuenta}.",
    answer: "acct-29",
    files: {
      "cuentas.csv":
        "id,alias,alta\nacct-12,turno,2025-08-01\nacct-29,turno,2026-08-01\nacct-31,archivo,2026-08-02\n",
      "sesiones.csv":
        "sesion,cuenta\nS-71,acct-12\nS-72,acct-29\nS-73,acct-31\n",
      "acciones.csv":
        "operacion,sesion,recurso\nlectura,S-71,inventario\nexportacion,S-72,resumen\nlectura,S-73,resumen\n",
    },
  },
  {
    title: "El destino del acceso directo",
    question:
      "El enlace visible no es la descarga final. Decodifica el destino, sigue los registros por el identificador de la petición e identifica el archivo recibido. Entrega CTF{nombre_con_extension}.",
    answer: "paquete-c.zip",
    files: {
      "acceso.txt":
        "Etiqueta: Documentación\nDestino codificado: https%3A%2F%2Fdocumentos.interno.example%2Fsalida%3Fref%3DR-62\n",
      "proxy.csv":
        "peticion,estado,archivo\nR-61,200,paquete-a.zip\nR-62,302,-\nR-62,200,paquete-c.zip\nR-63,200,paquete-b.zip\n",
      "recepcion.csv":
        "archivo,bytes,resultado\npaquete-a.zip,8192,completo\npaquete-b.zip,0,cancelado\npaquete-c.zip,16384,completo\n",
    },
  },
  {
    title: "Tres relojes para una secuencia",
    question:
      "Normaliza todas las horas a UTC. El reloj del colector adelanta tres minutos. Ordena los cinco eventos reales de más antiguo a más reciente; une sus IDs con |, calcula SHA256 y entrega CTF{resumen_hexadecimal}.",
    answer: sha("E-B|E-D|E-A|E-E|E-C"),
    files: {
      "fuentes.txt":
        "puesto: UTC-05:00, sin desfase\nservidor: UTC, sin desfase\ncolector: UTC, adelanto de 3 minutos respecto a la hora real\n",
      "eventos.csv":
        "id,fuente,hora\nE-A,puesto,03:04:00\nE-B,servidor,08:01:00\nE-C,colector,08:10:00\nE-D,puesto,03:03:00\nE-E,colector,08:08:00\n",
      "fecha.txt":
        "Todos los eventos pertenecen al mismo día. El orden físico de las filas no representa su orden temporal.\n",
    },
  },
  {
    title: "La cadena interrumpida",
    question:
      "Verifica desde el ancla la cadena SHA256 y encuentra el primer registro cuyo resumen no corresponde a su contenido. Forma id|operacion|anterior con los campos originales de esa fila; calcula SHA256 y entrega CTF{resumen_hexadecimal}.",
    answer: "",
    files: {},
  },
];
const anchor = sha("acta-preservada");
let previous = anchor;
const rows = [
  "recibir",
  "inventariar",
  "duplicar",
  "transferir",
  "archivar",
].map((operation, index) => {
  const id = `C-${index + 1}`;
  const payload = `${id}|${operation}|${previous}`;
  const digest = index === 2 ? sha(payload + "-alterado") : sha(payload);
  const row = `${id},${operation},${previous},${digest}`;
  if (index === 2) cases[7].answer = sha(payload);
  previous = digest;
  return row;
});
cases[7].files = {
  "ancla.txt": anchor,
  "cadena.csv": "id,operacion,anterior,resumen\n" + rows.join("\n"),
  "formato.txt":
    "Cada resumen es SHA256 de id|operacion|anterior, UTF-8, sin espacios añadidos ni salto final. El campo anterior debe coincidir con el resumen de la fila precedente; la primera fila usa el ancla.\n",
};
export const INVESTIGATION_CASES: Case[] = cases.map((entry, index) => ({
  ...entry,
  id: `investigation-${String(index + 1).padStart(2, "0")}`,
}));
export const INVESTIGATION_CHALLENGES = INVESTIGATION_CASES.map((entry) => ({
  id: entry.id,
  title: entry.title,
  description: `${entry.question.replace(/CTF\{([^}]+)\}/g, "una flag con $1")} Material: ${INVESTIGATION_ROOT}/caso-${entry.id.slice(-2)}. Puedes resolver este expediente sin completar otros.`,
  category: "Investigación en el escenario",
  device: "computer",
  points: pointsFor(entry.id),
}));
export const getInvestigation = (id: string) =>
  INVESTIGATION_CASES.find((c) => c.id === id);
export function investigationFlag(id: string) {
  const entry = getInvestigation(id);
  if (!entry) throw new Error("Expediente de investigación desconocido.");
  return `CTF{${entry.answer}}`;
}
export function investigationFiles(id: string) {
  const entry = getInvestigation(id);
  if (!entry) return undefined;
  return {
    "/home/analista/LEEME.txt": entry.question,
    ...Object.fromEntries(
      Object.entries(entry.files).map(([name, content]) => [
        "/home/analista/evidencia/" + name,
        content,
      ]),
    ),
  };
}
