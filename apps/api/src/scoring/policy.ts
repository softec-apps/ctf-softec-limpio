export type Difficulty = "easy" | "medium" | "hard";
export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};
export const FINAL_POINTS = 100;
export const SCORING_CATEGORIES: {
  category: string;
  easy: string[];
  medium: string[];
  hard: string[];
}[] = [
  {
    category: "Bases de datos",
    easy: ["database-01", "database-02", "database-03", "database-04"],
    medium: ["database-05", "database-06", "database-07"],
    hard: ["database-08", "database-09", "database-10"],
  },
  {
    category: "Contratos inteligentes",
    easy: ["contract-01", "contract-02", "contract-03", "contract-04"],
    medium: ["contract-05", "contract-06", "contract-07"],
    hard: ["contract-08", "contract-09", "contract-10"],
  },
  {
    category: "Web",
    easy: [
      "archivo-sin-fronteras",
      "modo-depuracion",
      "carrito-de-confianza",
      "sesion-sin-firma",
    ],
    medium: ["cifrado-de-turno", "aprobacion-importada", "alarma-ausente"],
    hard: [
      "dependencia-fantasma",
      "consulta-sin-limites",
      "permiso-por-excepcion",
    ],
  },
  {
    category: "Criptografía",
    easy: ["crypto-cesar", "crypto-atbash", "crypto-polibio", "crypto-rejilla"],
    medium: ["crypto-base64", "crypto-hex", "crypto-binario"],
    hard: ["crypto-xor", "crypto-vigenere", "crypto-capas"],
  },
  {
    category: "OSINT",
    easy: ["osint-01", "osint-02", "osint-03", "osint-04"],
    medium: ["osint-05", "osint-06", "osint-07"],
    hard: ["osint-08", "osint-09", "osint-10"],
  },
  {
    category: "Windows",
    easy: ["windows-01", "windows-02", "windows-03", "windows-04"],
    medium: ["windows-05", "windows-06", "windows-07"],
    hard: ["windows-08", "windows-09", "windows-10"],
  },
  {
    category: "Redes",
    easy: ["network-01", "network-03", "network-05", "network-08"],
    medium: ["network-02", "network-04", "network-06"],
    hard: ["network-07", "network-09", "network-10"],
  },
  {
    category: "Móvil",
    easy: ["mobile-01", "mobile-02", "mobile-03", "mobile-05"],
    medium: ["mobile-04", "mobile-06", "mobile-07"],
    hard: ["mobile-08", "mobile-09", "mobile-10"],
  },
  {
    category: "Infraestructura",
    easy: ["linux-01", "linux-02", "linux-03", "linux-08"],
    medium: ["linux-05", "linux-07", "linux-09"],
    hard: ["linux-04", "linux-06", "linux-10"],
  },
  {
    category: "Esteganografía",
    easy: ["stego-01", "stego-02", "stego-03", "stego-08"],
    medium: ["stego-04", "stego-06", "stego-09"],
    hard: ["stego-05", "stego-07", "stego-10"],
  },
  {
    category: "Ingeniería inversa",
    easy: ["reverse-01", "reverse-02", "reverse-03", "reverse-04"],
    medium: ["reverse-05", "reverse-06", "reverse-09"],
    hard: ["reverse-07", "reverse-08", "reverse-10"],
  },
  {
    category: "Active Directory",
    easy: ["ad-01", "ad-02", "ad-06", "ad-07"],
    medium: ["ad-03", "ad-04", "ad-05"],
    hard: ["ad-08", "ad-09", "ad-10"],
  },
  {
    category: "OT",
    easy: ["ot-01", "ot-02", "ot-03", "ot-04"],
    medium: ["ot-05", "ot-06", "ot-07"],
    hard: ["ot-08", "ot-09", "ot-10"],
  },
  {
    category: "IoT",
    easy: ["iot-01", "iot-02", "iot-03", "iot-04"],
    medium: ["iot-05", "iot-06", "iot-07"],
    hard: ["iot-08", "iot-09", "iot-10"],
  },
  {
    category: "Seguridad de APIs",
    easy: ["api-01", "api-02", "api-03", "api-04"],
    medium: ["api-05", "api-06", "api-07"],
    hard: ["api-08", "api-09", "api-10"],
  },
  {
    category: "Análisis de malware",
    easy: ["malware-01", "malware-02", "malware-03", "malware-04"],
    medium: ["malware-05", "malware-06", "malware-07"],
    hard: ["malware-08", "malware-09", "malware-10"],
  },
  {
    category: "Respuesta a incidentes",
    easy: ["incident-01", "incident-02", "incident-03", "incident-04"],
    medium: ["incident-05", "incident-06", "incident-07"],
    hard: ["incident-08", "incident-09", "incident-10"],
  },
  {
    category: "Identidad y acceso físico",
    easy: ["access-01", "access-02", "access-03", "access-04"],
    medium: ["access-05", "access-06", "access-07"],
    hard: ["access-08", "access-09", "access-10"],
  },
  {
    category: "Cloud",
    easy: ["cloud-01", "cloud-02", "cloud-03", "cloud-04"],
    medium: ["cloud-05", "cloud-06", "cloud-07"],
    hard: ["cloud-08", "cloud-09", "cloud-10"],
  },
  {
    category: "Contenedores y DevOps",
    easy: ["devops-01", "devops-02", "devops-03", "devops-04"],
    medium: ["devops-05", "devops-06", "devops-07"],
    hard: ["devops-08", "devops-09", "devops-10"],
  },
  {
    category: "Seguridad de IA",
    easy: ["ai-01", "ai-02", "ai-03", "ai-04"],
    medium: ["ai-05", "ai-06", "ai-07"],
    hard: ["ai-08", "ai-09", "ai-10"],
  },
  {
    category: "Redes inalámbricas",
    easy: ["wireless-01", "wireless-02", "wireless-03", "wireless-04"],
    medium: ["wireless-05", "wireless-06", "wireless-07"],
    hard: ["wireless-08", "wireless-09", "wireless-10"],
  },
  {
    category: "Forense de memoria",
    easy: ["memory-01", "memory-02", "memory-03", "memory-04"],
    medium: ["memory-05", "memory-06", "memory-07"],
    hard: ["memory-08", "memory-09", "memory-10"],
  },
  {
    category: "Archivos",
    easy: ["files-01", "files-02", "files-03", "files-04"],
    medium: ["files-05", "files-06", "files-07"],
    hard: ["files-08", "files-09", "files-10"],
  },
  {
    category: "Investigación",
    easy: [
      "primer-rastro",
      "investigation-01",
      "investigation-02",
      "investigation-03",
    ],
    medium: ["investigation-04", "investigation-05", "investigation-06"],
    hard: ["turno-nocturno", "investigation-07", "investigation-08"],
  },
];
const grades = new Map<
  string,
  { category: string; difficulty: Difficulty; points: number }
>();
for (const group of SCORING_CATEGORIES)
  for (const difficulty of ["easy", "medium", "hard"] as const)
    for (const id of group[difficulty]) {
      if (grades.has(id)) throw new Error("Reto duplicado en la escala: " + id);
      grades.set(id, {
        category: group.category,
        difficulty,
        points: DIFFICULTY_POINTS[difficulty],
      });
    }
export function scoreFor(id: string) {
  const score = grades.get(id);
  if (!score) throw new Error("Reto sin clasificación: " + id);
  return score;
}
export const pointsFor = (id: string) => scoreFor(id).points;
export const scoringEntries = () =>
  [...grades].map(([id, score]) => ({ id, ...score }));
