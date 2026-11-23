import {
  Binary,
  Radio,
  Code2,
  Image,
  AudioLines,
  Network,
  Braces,
  FileSearch,
  FileText,
  Flag,
  Folder,
  GitCompareArrows,
  Globe,
  ScanSearch,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
export const applications = {
  enigma: {
    title: "Enigma",
    icon: Radio,
    subtitle: "Rotores, lámparas y transmisiones",
    width: 980,
    height: 720,
  },
  sql: {
    title: "Consola SQL",
    icon: Code2,
    subtitle: "Consultas SQLite y expedientes",
    width: 960,
    height: 650,
  },
  contracts: {
    title: "Banco de contratos",
    icon: Braces,
    subtitle: "Estados, llamadas y firmas",
    width: 960,
    height: 650,
  },
  memory: {
    title: "Analizador de memoria",
    icon: Binary,
    subtitle: "Procesos, conexiones y regiones adquiridas",
    width: 960,
    height: 650,
  },
  domain: {
    title: "Explorador de dominio",
    icon: Network,
    subtitle: "LDAP, SMB, Kerberos y acceso remoto",
    width: 960,
    height: 650,
  },
  credentials: {
    title: "Analizador de credenciales",
    icon: ShieldCheck,
    subtitle: "Capturas, diccionarios y preferencias",
    width: 880,
    height: 620,
  },
  reverse: {
    title: "Desensamblador",
    icon: Code2,
    subtitle: "WebAssembly, código y pruebas",
    width: 960,
    height: 650,
  },
  image: {
    title: "Visor de imágenes",
    icon: Image,
    subtitle: "Píxeles, metadatos y capas",
    width: 960,
    height: 650,
  },
  audio: {
    title: "Analizador de audio",
    icon: AudioLines,
    subtitle: "Muestras y señales WAV",
    width: 960,
    height: 650,
  },
  hex: {
    title: "Editor hexadecimal",
    icon: Binary,
    subtitle: "Bytes, texto y contenedores",
    width: 960,
    height: 650,
  },
  vpn: {
    title: "Seventech VPN",
    icon: ShieldCheck,
    subtitle: "Conexión a la red corporativa",
    width: 560,
    height: 680,
  },
  ctf: {
    title: "Retos",
    icon: ShieldCheck,
    subtitle: "Catálogo, progreso y clasificación",
    width: 1000,
    height: 620,
  },
  mission: {
    title: "Detalle del reto",
    icon: Flag,
    subtitle: "Objetivo y entrega de evidencia",
    width: 540,
    height: 580,
  },
  browser: {
    title: "Navegador",
    icon: Globe,
    subtitle: "Servicios del laboratorio",
    width: 800,
    height: 570,
  },
  packets: {
    title: "Analizador de paquetes",
    icon: Network,
    subtitle: "Capturas, filtros y flujos",
    width: 1020,
    height: 650,
  },
  http: {
    title: "Inspector HTTP",
    icon: Globe,
    subtitle: "Consultas, parámetros e historial",
    width: 880,
    height: 590,
  },
  transform: {
    title: "Transformador",
    icon: Binary,
    subtitle: "Codificaciones, cifrados y SHA-256",
    width: 750,
    height: 570,
  },
  evidence: {
    title: "Visor de evidencias",
    icon: FileSearch,
    subtitle: "Archivos, registros y filtros",
    width: 900,
    height: 590,
  },
  compare: {
    title: "Comparador",
    icon: GitCompareArrows,
    subtitle: "Dos textos o archivos en paralelo",
    width: 950,
    height: 610,
  },
  json: {
    title: "Editor JSON",
    icon: Braces,
    subtitle: "Validación, formato y compactación",
    width: 760,
    height: 570,
  },
  ffuf: {
    title: "ffuf",
    icon: ScanSearch,
    subtitle: "Consola de enumeración web",
    width: 740,
    height: 450,
  },
  terminal: {
    title: "Terminal",
    icon: TerminalSquare,
    subtitle: "Consola Linux",
    width: 740,
    height: 450,
  },
  files: {
    title: "Archivos",
    icon: Folder,
    subtitle: "Carpeta personal",
    width: 690,
    height: 430,
  },
  editor: {
    title: "Editor de texto",
    icon: FileText,
    subtitle: "Lectura de documentos",
    width: 630,
    height: 420,
  },
} as const;
export type AppId = keyof typeof applications;
export type ToolAppId =
  | "enigma"
  | "sql"
  | "contracts"
  | "memory"
  | "http"
  | "transform"
  | "evidence"
  | "compare"
  | "json"
  | "packets"
  | "image"
  | "audio"
  | "hex"
  | "reverse"
  | "domain"
  | "credentials";
export function isToolApp(id: AppId): id is ToolAppId {
  return [
    "enigma",
    "sql",
    "contracts",
    "memory",
    "domain",
    "credentials",
    "reverse",
    "image",
    "audio",
    "hex",
    "http",
    "transform",
    "evidence",
    "compare",
    "json",
    "packets",
  ].includes(id);
}
export const applicationGroups: { title: string; ids: AppId[] }[] = [
  { title: "Retos", ids: ["ctf"] },
  {
    title: "Herramientas",
    ids: [
      "sql",
      "contracts",
      "memory",
      "domain",
      "credentials",
      "reverse",
      "image",
      "audio",
      "hex",
      "http",
      "packets",
      "transform",
      "enigma",
      "evidence",
      "compare",
      "json",
      "ffuf",
    ],
  },
  {
    title: "Sistema",
    ids: ["browser", "terminal", "files", "vpn"],
  },
];
