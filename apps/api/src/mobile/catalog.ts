import { pointsFor } from "../scoring/policy";
export type MobileArtifact = { name: string; app: string; content: string };
export type MobileCase = {
  id: string;
  title: string;
  category: string;
  description: string;
  points: number;
  answer: string;
  files: MobileArtifact[];
};
export const MOBILE_CASES: MobileCase[] = [
  {
    id: "mobile-01",
    title: "La última línea",
    category: "Mensajes",
    description:
      "Recupera la referencia del mensaje eliminado m42. Entrega la referencia en minúsculas.",
    points: pointsFor("mobile-01"),
    answer: "lirio-74",
    files: [
      {
        name: "conversacion.json",
        app: "messages",
        content:
          '{\n  "chat": "Guardia",\n  "messages": [\n    {\n      "id": "m41",\n      "text": "La entrega anterior usó cobre-12"\n    },\n    {\n      "id": "m42",\n      "deleted": true\n    },\n    {\n      "id": "m43",\n      "text": "Confirmado, guardo la referencia de tu último mensaje."\n    }\n  ]\n}',
      },
      {
        name: "diario.json",
        app: "messages",
        content:
          '{\n  "journal": [\n    {\n      "id": "m24",\n      "operation": "insert",\n      "text": "Entrega cobre-12"\n    },\n    {\n      "id": "m42",\n      "operation": "insert",\n      "text": "Entrega LIRIO-74"\n    },\n    {\n      "id": "m42",\n      "operation": "delete"\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-02",
    title: "Una mañana prestada",
    category: "Fotografías",
    description:
      "Identifica el dispositivo que capturó la imagen original de la puerta antes de las 08:00 UTC. Entrega su identificador.",
    points: pointsFor("mobile-02"),
    answer: "cam-17",
    files: [
      {
        name: "imagenes.json",
        app: "gallery",
        content:
          '{\n  "notice": "Exportación ficticia de metadatos; horas UTC. Las fotografías del álbum conservan los metadatos de esta adquisición.",\n  "assets": [\n    {\n      "id": "puerta-original",\n      "captured": "2026-02-12T07:45:00Z",\n      "imported": "2026-02-13T09:00:00Z",\n      "device": "cam-17",\n      "derivedFrom": null\n    },\n    {\n      "id": "puerta-copia",\n      "captured": "2026-02-13T06:30:00Z",\n      "imported": "2026-02-13T06:35:00Z",\n      "device": "editor-4",\n      "derivedFrom": "puerta-original"\n    },\n    {\n      "id": "pasillo",\n      "captured": "2026-02-12T07:10:00Z",\n      "device": "cam-03"\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-03",
    title: "La pausa del viajero",
    category: "Ubicación",
    description:
      "Determina la zona de la parada continua de al menos diez minutos posterior al aviso de las 09:10 UTC. Entrega el código de zona en minúsculas.",
    points: pointsFor("mobile-03"),
    answer: "z-c",
    files: [
      {
        name: "recorrido.json",
        app: "files",
        content:
          '{\n  "notice": "Coordenadas de cuadrícula ficticia, no geográficas. Horas UTC.",\n  "zones": {\n    "Z-A": [\n      0,\n      0\n    ],\n    "Z-B": [\n      5,\n      5\n    ],\n    "Z-C": [\n      9,\n      3\n    ]\n  },\n  "samples": [\n    {\n      "time": "09:05",\n      "position": [\n        5,\n        5\n      ]\n    },\n    {\n      "time": "09:12",\n      "position": [\n        9,\n        3\n      ]\n    },\n    {\n      "time": "09:19",\n      "position": [\n        9,\n        3\n      ]\n    },\n    {\n      "time": "09:25",\n      "position": [\n        9,\n        3\n      ]\n    },\n    {\n      "time": "09:28",\n      "position": [\n        0,\n        0\n      ]\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-04",
    title: "El invitado discreto",
    category: "Aplicaciones",
    description:
      "Según el inventario aprobado y la auditoría, ¿qué paquete conserva un permiso no aprobado? Entrega el nombre completo del paquete.",
    points: pointsFor("mobile-04"),
    answer: "lab.linterna",
    files: [
      {
        name: "permisos.json",
        app: "settings",
        content:
          '{\n  "approved": {\n    "lab.mapas": [\n      "location"\n    ],\n    "lab.linterna": [\n      "camera"\n    ],\n    "lab.chat": [\n      "contacts"\n    ]\n  },\n  "grants": [\n    {\n      "package": "lab.mapas",\n      "permission": "location",\n      "state": "granted"\n    },\n    {\n      "package": "lab.linterna",\n      "permission": "camera",\n      "state": "granted"\n    },\n    {\n      "package": "lab.linterna",\n      "permission": "contacts",\n      "state": "granted"\n    },\n    {\n      "package": "lab.chat",\n      "permission": "microphone",\n      "state": "revoked"\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-05",
    title: "El reloj del vestíbulo",
    category: "Cronología",
    description:
      "Ordena por instante de emisión las notificaciones de entrega efectivamente publicadas. Entrega el identificador de la primera. La recepción puede retrasarse.",
    points: pointsFor("mobile-05"),
    answer: "n-58",
    files: [
      {
        name: "avisos.json",
        app: "settings",
        content:
          '{\n  "notifications": [\n    {\n      "id": "n-54",\n      "kind": "delivery",\n      "state": "posted",\n      "emitted": "2026-02-12T08:20:00Z",\n      "received": "08:20:01Z"\n    },\n    {\n      "id": "n-58",\n      "kind": "delivery",\n      "state": "posted",\n      "emitted": "2026-02-12T03:15:00-05:00",\n      "received": "08:22:00Z"\n    },\n    {\n      "id": "n-49",\n      "kind": "delivery",\n      "state": "draft",\n      "emitted": "2026-02-12T08:01:00Z"\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-06",
    title: "La invitación del ascensor",
    category: "Enlaces",
    description:
      "Compara los destinos preservados con el directorio institucional. Entrega el hostname ajeno al directorio, sin protocolo ni ruta.",
    points: pointsFor("mobile-06"),
    answer: "acceso.oficina-ayuda.test",
    files: [
      {
        name: "directorio.txt",
        app: "files",
        content:
          "Dominios aprobados exactos: acceso.oficina.test, soporte.oficina.test. Todos los nombres .test son ficticios.",
      },
      {
        name: "codigos.json",
        app: "gallery",
        content:
          '{\n  "notice": "Exportación de los destinos decodificados; no se abre ningún enlace.",\n  "codes": [\n    {\n      "label": "Recepción",\n      "payload": "https://acceso.oficina.test/visita"\n    },\n    {\n      "label": "Ascensor",\n      "payload": "https://acceso.oficina-ayuda.test/visita"\n    },\n    {\n      "label": "Soporte",\n      "payload": "https://soporte.oficina.test/turnos"\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-07",
    title: "Dos sobres iguales",
    category: "Descargas",
    description:
      "Encuentra el identificador de contenido de informe.pdf descargado por completo desde el origen aprobado. Entrega ese identificador.",
    points: pointsFor("mobile-07"),
    answer: "blob-91",
    files: [
      {
        name: "descargas.json",
        app: "files",
        content:
          '{\n  "approvedOrigin": "https://archivo.oficina.test",\n  "downloads": [\n    {\n      "name": "informe.pdf",\n      "origin": "https://archivo.oficina.test",\n      "state": "interrupted",\n      "content": "blob-18"\n    },\n    {\n      "name": "informe.pdf",\n      "origin": "https://espejo.oficina.test",\n      "state": "complete",\n      "content": "blob-72"\n    },\n    {\n      "name": "informe.pdf",\n      "origin": "https://archivo.oficina.test",\n      "state": "complete",\n      "content": "blob-91"\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-08",
    title: "Lo que quedó atrás",
    category: "Respaldos",
    description:
      "Identifica la copia más reciente que conserva el registro r17 y fue capturada antes de su eliminación a las 11:00 UTC. Entrega el ID de copia.",
    points: pointsFor("mobile-08"),
    answer: "snap-32",
    files: [
      {
        name: "respaldos.json",
        app: "settings",
        content:
          '{\n  "notice": "Manifiestos ficticios; created es la captura, restored no modifica su contenido. Horas UTC.",\n  "snapshots": [\n    {\n      "id": "snap-31",\n      "created": "09:00",\n      "restored": "12:00",\n      "records": [\n        "r17",\n        "r18"\n      ]\n    },\n    {\n      "id": "snap-32",\n      "created": "10:45",\n      "restored": null,\n      "records": [\n        "r17",\n        "r18",\n        "r19"\n      ]\n    },\n    {\n      "id": "snap-33",\n      "created": "11:15",\n      "restored": null,\n      "records": [\n        "r18",\n        "r19"\n      ]\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-09",
    title: "La puerta entreabierta",
    category: "Sesiones",
    description:
      "El inventario autoriza únicamente móvil-azul y estación-2 para la cuenta iris. Identifica la sesión activa ajena a esos dispositivos. Entrega su ID.",
    points: pointsFor("mobile-09"),
    answer: "s-83",
    files: [
      {
        name: "sesiones.json",
        app: "settings",
        content:
          '{\n  "sessions": [\n    {\n      "id": "s-81",\n      "account": "iris",\n      "device": "móvil-azul",\n      "state": "active"\n    },\n    {\n      "id": "s-82",\n      "account": "iris",\n      "device": "invitado-9",\n      "state": "revoked"\n    },\n    {\n      "id": "s-83",\n      "account": "iris",\n      "device": "invitado-9",\n      "state": "active"\n    },\n    {\n      "id": "s-84",\n      "account": "nube",\n      "device": "invitado-9",\n      "state": "active"\n    }\n  ]\n}',
      },
    ],
  },
  {
    id: "mobile-10",
    title: "Cuando se apagó la luz",
    category: "Correlación",
    description:
      "Cruza el evento de apertura de las 18:42 UTC con su sesión y el mensaje emitido por ese dispositivo. Entrega la referencia de entrega, en minúsculas.",
    points: pointsFor("mobile-10"),
    answer: "bruma-63",
    files: [
      {
        name: "eventos.json",
        app: "settings",
        content:
          '{\n  "events": [\n    {\n      "time": "18:41Z",\n      "action": "preview",\n      "session": "s-90"\n    },\n    {\n      "time": "18:42Z",\n      "action": "open",\n      "session": "s-92"\n    }\n  ],\n  "sessions": [\n    {\n      "id": "s-90",\n      "device": "terminal-4"\n    },\n    {\n      "id": "s-92",\n      "device": "terminal-7"\n    }\n  ]\n}',
      },
      {
        name: "buzon.json",
        app: "messages",
        content:
          '{\n  "messages": [\n    {\n      "device": "terminal-4",\n      "time": "18:42Z",\n      "text": "Entrega NARDO-22"\n    },\n    {\n      "device": "terminal-7",\n      "time": "18:43Z",\n      "text": "Entrega BRUMA-63"\n    },\n    {\n      "device": "terminal-7",\n      "time": "18:40Z",\n      "text": "Borrador cancelado: JUNCO-18",\n      "state": "draft"\n    }\n  ]\n}',
      },
    ],
  },
];
export const MOBILE_ROOT = "/storage/emulated/0/Expedientes";
export const mobileFolder = (id: string) =>
  `${MOBILE_ROOT}/caso-${id.slice(-2)}`;
export const MOBILE_CHALLENGES = MOBILE_CASES.map(
  ({ id, title, category, description, points }) => ({
    id,
    title,
    category: `Móvil · ${category}`,
    description,
    points,
    device: "phone",
  }),
);
export function mobileFlag(id: string) {
  const entry = MOBILE_CASES.find((c) => c.id === id);
  if (!entry) throw new Error("Expediente desconocido");
  return `CTF{${entry.answer}}`;
}

// Preserve the source fields while supplying the conversation context shown by the handset.
for (const entry of MOBILE_CASES)
  for (const file of entry.files)
    if (file.name === "conversacion.json") {
      const data = JSON.parse(file.content);
      data.chat = "Guardia de recepción";
      data.messages = data.messages.map(
        (message: Record<string, unknown>, index: number) => ({
          ...message,
          sender: index === 1 ? "analista" : "guardia",
          time: ["17:34", "17:36", "17:37"][index],
        }),
      );
      file.content = JSON.stringify(data, null, 2);
    }
