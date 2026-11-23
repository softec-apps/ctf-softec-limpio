import { DATABASE_LABS } from "./database-lab/catalog";
import { CONTRACT_LABS } from "./smart-contracts/catalog";
import { CLOUD_LABS } from "./cloud/catalog";
import { AI_LABS } from "./ai-security/catalog";
import { SPECIALIST_STATIONS } from "../../../packages/specialist-contracts";
import { API_LABS } from "./api-security/catalog";
import { ANALYSIS_CHALLENGES } from "./casework/catalog";
import { FILE_CHALLENGES } from "./file-forensics/catalog";
import { OT_CHALLENGES } from "./ot/catalog";
import { PRINTER_CHALLENGES } from "./printer/catalog";
import { DOMAIN_CHALLENGES } from "./domain/catalog";
import { MOBILE_CHALLENGES } from "./mobile/catalog";
import { NotFoundException } from "@nestjs/common";
import { NETWORK_CHALLENGES } from "./network/catalog";
import { WINDOWS_CHALLENGES } from "./windows/catalog";
import { OSINT_LABS } from "./osint/catalog";
import { CRYPTO_CHALLENGES } from "./crypto/catalog";
import { WEB_LABS } from "./web-lab/catalog";
import { documentMetadata } from "./scene-documents";

const SCENE_OBJECT_ORDER = [
  "computer",
  "laptop",
  "phone",
  "printer",
  "ot",
  "rack",
  "library",
  "crypto-book",
  "noticeboard",
  "osint-board",
  ...SPECIALIST_STATIONS.map((station) => station.id),
  "archive",
  "notebook",
  "television",
  "door",
];

// Scene objects are a catalogue, independent from the competition and its flags.
// New visual kinds need a scene renderer; new instances and evidence use this registry.
export const sceneObjects = [
  ...SPECIALIST_STATIONS.map((station) => ({
    id: station.id,
    name: station.title,
    kind: "specialist-station",
    eye: [...station.eye],
    look: [...station.look],
    description: station.description,
    challengeIds: [
      ...[
        ...API_LABS,
        ...CLOUD_LABS,
        ...AI_LABS,
        ...DATABASE_LABS,
        ...CONTRACT_LABS,
      ].map((lab) => lab.challenge),
      ...ANALYSIS_CHALLENGES,
    ]
      .filter((c) => c.id.startsWith(station.prefix))
      .map((c) => c.id),
  })),
  {
    id: "television",
    name: "Televisor · Top 10",
    kind: "ranking-television",
    eye: [-2.1, 2.85, 1.2],
    look: [-2.1, 2.85, 5.8],
    description:
      "Los diez participantes con mayor puntuación de la competencia.",
    challengeIds: [],
  },
  {
    id: "ot",
    name: "Control industrial",
    kind: "industrial-control",
    eye: [3.8, 2.2, -2.7],
    look: [6.65, 1.75, -2.7],
    description:
      "Armario AXON C24:PLC,HMI,ventilación,iluminación y baliza del laboratorio.",
    challengeIds: OT_CHALLENGES.map((c) => c.id),
  },
  {
    id: "printer",
    name: "Impresora multifunción",
    kind: "printer",
    eye: [3.9, 2.1, 0],
    look: [6.35, 1.3, 0],
    description:
      "Seventech FLOW M740. Impresión dúplex, escáner ADF, pantalla táctil y servicios de red.",
    challengeIds: PRINTER_CHALLENGES.map((c) => c.id),
  },
  {
    id: "laptop",
    name: "Portátil",
    kind: "laptop",
    eye: [2, 2.15, -1.28],
    look: [2, 1.6, -3.58],
    description:
      "Portátil Windows del dominio corporativo, con estado de seguridad, expedientes y visor de eventos.",
    challengeIds: [...WINDOWS_CHALLENGES, ...DOMAIN_CHALLENGES].map(
      (entry) => entry.id,
    ),
  },
  {
    id: "door",
    name: "Puerta",
    kind: "door",
    eye: [3.8, 1.65, 4.25],
    look: [3.8, 1.4, 5.98],
    description: "Acceso al laboratorio.",
    challengeIds: [],
  },
  {
    id: "rack",
    name: "Rack de comunicaciones",
    kind: "rack",
    eye: [0.2, 3.8, -2.8],
    look: [-4.8, 1.78, -2.8],
    description:
      "Gabinete de comunicaciones, panel de parcheo y archivo de capturas de red.",
    challengeIds: NETWORK_CHALLENGES.map((entry) => entry.id),
  },
  {
    id: "computer",
    name: "Computador",
    kind: "workstation",
    eye: [0, 2.06, -0.9],
    look: [0, 2.06, -3.66],
    description:
      "Estación del participante. Acceso, herramientas y sistema CTF.",
    challengeIds: [
      "primer-rastro",
      ...WEB_LABS.map((lab) => lab.challenge.id),
      ...OSINT_LABS.map((lab) => lab.challenge.id),
    ],
  },
  {
    id: "library",
    name: "Biblioteca técnica",
    kind: "reference-library",
    eye: [-2.3, 2.4, -0.15],
    look: [-5.55, 2.1, -0.15],
    description:
      "Un libro de teoría por categoría, con varias páginas de consulta. Relatos en clave permanece separado.",
    challengeIds: [],
  },
  {
    id: "crypto-book",
    name: "Relatos en clave",
    kind: "story-book",
    eye: [-3.1, 2.4, -0.15],
    look: [-5.55, 2.07, -0.15],
    description:
      "Un libro de relatos y mensajes cifrados en la repisa junto al rack.",
    challengeIds: CRYPTO_CHALLENGES.map((entry) => entry.id),
  },
  {
    id: "phone",
    name: "Teléfono",
    kind: "phone",
    eye: [4.05, 2.55, 0.33],
    look: [2.65, 1.22, -2.35],
    description:
      "Diez expedientes móviles con mensajes, fotografías, archivos y registros ficticios.",
    challengeIds: MOBILE_CHALLENGES.map((entry) => entry.id),
  },
  {
    id: "osint-board",
    name: "Panel OSINT",
    kind: "investigation-board",
    eye: [3.9, 3.2, 0],
    look: [6.84, 3.2, 0],
    description:
      "Diez sobres de investigaciones abiertas, junto al tablón del turno nocturno.",
    challengeIds: OSINT_LABS.map((lab) => lab.challenge.id),
  },
  {
    id: "noticeboard",
    name: "Tablón de notas",
    kind: "evidence-board",
    eye: [4, 3.1, 3.3],
    look: [6.84, 3.1, 3.3],
    description: "Notas y referencias del turno nocturno. Examina sus pistas.",
    challengeIds: ["turno-nocturno"],
  },
  {
    id: "notebook",
    name: "Cuaderno del analista",
    kind: "notebook",
    eye: [-1.7, 2.27, -2.2],
    look: [-1.7, 1.2, -2.7],
    description: "Un cuaderno abierto sobre la mesa de trabajo.",
    challengeIds: ["turno-nocturno"],
  },
  {
    id: "archive",
    name: "Archivador",
    kind: "filing-cabinet",
    eye: [3.7, 2.1, 3.3],
    look: [6.3, 0.95, 3.3],
    description:
      "Diez expedientes de análisis forense de archivos y documentos de la investigación.",
    challengeIds: ["turno-nocturno", ...FILE_CHALLENGES.map((c) => c.id)],
  },
].sort(
  (a, b) => SCENE_OBJECT_ORDER.indexOf(a.id) - SCENE_OBJECT_ORDER.indexOf(b.id),
);

export function inspectSceneObject(id: string) {
  const object = sceneObjects.find((o) => o.id === id);
  if (!object) throw new NotFoundException("Objeto no encontrado.");
  return {
    object: { id: object.id, name: object.name, kind: object.kind },
    documents: documentMetadata(id),
    challengeId: object.challengeIds[0] ?? null,
  };
}
