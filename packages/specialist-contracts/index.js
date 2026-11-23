export const SPECIALIST_STATIONS = [
  {
    id: "database-nas",
    prefix: "database-",
    serviceHost: "database",
    category: "Bases de datos",
    title: "NAS de datos",
    root: "/home/analista/bases",
    description: "DataLab · Consultas y evidencias",
    position: [-4.79, 1.4, -2.8],
    yaw: Math.PI / 2,
    eye: [-2.15, 1.6, -2.8],
    look: [-4.79, 1.4, -2.8],
  },
  {
    id: "contract-wallet",
    prefix: "contract-",
    serviceHost: "contracts",
    category: "Contratos inteligentes",
    title: "Cartera hardware",
    root: "/home/analista/contratos",
    description: "ChainLab · Contratos y firmas",
    position: [1.85, 1.15, -2.08],
    yaw: -Math.PI / 12,
    eye: [1.85, 2.3, -0.6],
    look: [1.85, 1.25, -2.08],
  },
  {
    id: "api-kiosk",
    serviceHost: "api",
    prefix: "api-",
    category: "Seguridad de APIs",
    title: "Terminal de servicios API",
    root: "/home/analista/apis",
    description: "Kiosco de autoservicio · Gateway de servicios",
    position: [-5.45, 0, 2.15],
    yaw: Math.PI / 2,
    eye: [-2.6, 2.1, 2.15],
    look: [-5.45, 1.6, 2.15],
  },
  {
    id: "quarantine",
    prefix: "malware-",
    category: "Análisis de malware",
    title: "Estación de cuarentena",
    root: "/home/analista/cuarentena",
    description: "Q-LAB · Muestras inertes y análisis estático",
    position: [-5.45, 0, 4.4],
    yaw: Math.PI / 2,
    eye: [-2.6, 2.2, 4.4],
    look: [-5.45, 1.65, 4.4],
  },
  {
    id: "soc",
    prefix: "incident-",
    category: "Respuesta a incidentes",
    title: "Pantalla SOC",
    root: "/home/analista/incidentes",
    description: "SOC · Evidencias, alcance y respuesta",
    position: [-5.8, 4.1, -2.2],
    yaw: Math.PI / 2,
    eye: [-2.7, 4.1, -2.2],
    look: [-5.8, 4.1, -2.2],
  },
  {
    id: "badge-reader",
    prefix: "access-",
    category: "Identidad y acceso físico",
    title: "Lector de credenciales",
    root: "/home/analista/acceso-fisico",
    description: "PACS · Identidad, puertas y sensores",
    position: [4.95, 1.85, 5.88],
    yaw: Math.PI,
    eye: [4.95, 2.0, 3.8],
    look: [4.95, 1.85, 5.88],
  },
  {
    id: "cloud-tablet",
    prefix: "cloud-",
    serviceHost: "cloud",
    category: "Cloud",
    title: "Tablet de nube",
    root: "/home/analista/cloud",
    description: "Nube de laboratorio · Identidades y recursos",
    position: [6.83, 3.35, -2.7],
    yaw: -Math.PI / 2,
    eye: [4.45, 3.35, -2.7],
    look: [6.83, 3.35, -2.7],
  },
  {
    id: "devops-node",
    prefix: "devops-",
    category: "Contenedores y DevOps",
    title: "Miniservidor DevOps",
    root: "/home/analista/devops",
    description: "BuildLab · Imágenes, pipelines y procedencia",
    position: [-4.79, 1.005, -2.8],
    yaw: Math.PI / 2,
    eye: [-2.15, 1.3, -2.8],
    look: [-4.79, 1.005, -2.8],
  },
  {
    id: "ai-assistant",
    prefix: "ai-",
    serviceHost: "assistant",
    category: "Seguridad de IA",
    title: "Asistente de sobremesa",
    root: "/home/analista/ia",
    description: "Asistente de laboratorio · Contexto y herramientas",
    position: [-2.65, 1.15, -3.65],
    yaw: Math.PI / 12,
    eye: [-2.65, 2.3, -2],
    look: [-2.65, 1.38, -3.65],
  },
  {
    id: "wireless-ap",
    prefix: "wireless-",
    category: "Redes inalámbricas",
    title: "Punto de acceso inalámbrico",
    root: "/home/analista/inalambricas",
    description: "RadioLab · Wi-Fi y Bluetooth preservados",
    position: [4.4, 4.72, -3.8],
    yaw: 0,
    eye: [4.4, 3.3, -1.4],
    look: [4.4, 4.72, -3.8],
  },
  {
    id: "memory-unit",
    prefix: "memory-",
    category: "Forense de memoria",
    title: "Unidad de adquisición de memoria",
    root: "/home/analista/memoria",
    description: "RAMLab · Procesos, regiones y conexiones",
    position: [-2.65, 1.15, -2.45],
    yaw: Math.PI / 12,
    eye: [-2.65, 2.3, -0.65],
    look: [-2.65, 1.29, -2.45],
  },
];
export function stationForChallenge(id) {
  return SPECIALIST_STATIONS.find((station) => id.startsWith(station.prefix));
}

export function stationServiceHome(id) {
  const station = stationForChallenge(id);
  return station?.serviceHost
    ? `http://${station.serviceHost}-${id.slice(-2)}.seventech.local/`
    : undefined;
}
export function stationEvidenceRoot(id) {
  const station = stationForChallenge(id);
  if (!station) return undefined;
  const home = stationServiceHome(id);
  return home
    ? "/home/analista/servicios/" + new URL(home).hostname
    : station.root + "/caso-" + id.slice(-2);
}
