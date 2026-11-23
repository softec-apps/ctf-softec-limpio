import type {
  DeviceId,
  LabState,
  Mission,
  NetworkConfig,
} from "../../../../../packages/network-contracts";
const titles = [
  "La dirección del recado",
  "Dos voces en el pasillo",
  "La bienvenida inesperada",
  "El timbre que no respondió",
  "La carta sin sobre",
  "Las sílabas del viento",
  "La entrega del tercer turno",
  "El eco del corredor",
  "El nombre bajo el sello",
  "La estación sin firma",
];
const objectives = [
  "El puesto de análisis no consigue abrir el servicio de remesas por su nombre. Revisa el DNS y restablece la resolución sin cambiar la dirección del servidor. Comprueba después el acceso HTTP.",
  "Un equipo ajeno está ofreciendo parámetros de red a los clientes. Investiga las ofertas DHCP y evita que lleguen desde el puerto no autorizado, manteniendo los enlaces de trabajo.",
  "El servidor de remesas está encendido pero su enlace no pertenece al segmento previsto. Corrige la configuración del switch y demuestra conectividad desde el puesto de análisis. Conserva la separación del segmento de invitados.",
  "El servicio HTTP está activo y el enrutamiento funciona, pero una regla de acceso impide las entregas. Autoriza HTTP desde la red de análisis hacia el servidor, sin abrir todo el tráfico entre segmentos.",
  "Las remesas aún se sirven mediante HTTP. Retira ese servicio, habilita HTTPS y exige TLS 1.2 o superior. Comprueba una entrega por el canal cifrado.",
  "Las solicitudes pequeñas funcionan, pero una prueba con 1400 bytes y DF falla. Localiza la limitación de MTU y restablece el transporte de ese tamaño sin deshabilitar la comprobación DF.",
  "El control FTP responde pero la entrega no termina: se intenta abrir el canal de datos en modo activo. Configura el servidor para trabajar en pasivo y completa una transferencia de prueba.",
  "El reloj del router se aparta del del laboratorio. Configura la fuente NTP autorizada y sincronízalo. Comprueba que el estado indica sincronización sin desactivar los enlaces.",
  "HTTPS responde con una identidad que no coincide con el nombre del servicio y permite una versión antigua de TLS. Corrige ambos ajustes y verifica el acceso sin omitir la comprobación de identidad.",
  "Después de un reinicio desaparecieron varios ajustes. Recupera la resolución y la entrega HTTP, guarda la configuración del switch, router y DNS, reinicia esos tres dispositivos y comprueba que el servicio sigue funcionando.",
];
const acceptance = [
  [
    "Resolución del nombre hacia el servidor inventariado",
    "Entrega HTTP verificada desde el puesto de análisis",
  ],
  [
    "Solo ofertas DHCP autorizadas",
    "Puertos de trabajo y enlace del router disponibles",
  ],
  [
    "Servidor en su VLAN de inventario",
    "Invitados separados y prueba de conectividad satisfactoria",
  ],
  [
    "Permiso específico entre redes y servicio",
    "Política de denegación conservada",
    "Entrega HTTP verificada",
  ],
  [
    "HTTP retirado y HTTPS disponible",
    "TLS mínimo 1.2",
    "Prueba HTTPS satisfactoria",
  ],
  [
    "MTU suficiente en el recorrido",
    "Prueba de 1400 bytes con DF satisfactoria",
  ],
  [
    "Servicio FTP en modo pasivo",
    "Transferencia completada por el canal de datos",
  ],
  ["Fuente NTP autorizada", "Reloj sincronizado"],
  [
    "Identidad TLS coherente con el servicio",
    "TLS mínimo 1.2",
    "Prueba HTTPS sin omitir verificación",
  ],
  [
    "Servicio recuperado",
    "Configuraciones guardadas",
    "Switch, router y DNS reiniciados",
    "Entrega posterior al reinicio satisfactoria",
  ],
];
export const MISSIONS: Mission[] = titles.map((title, i) => ({
  id: `network-${String(i + 1).padStart(2, "0")}`,
  title,
  objective: objectives[i],
  acceptance: acceptance[i],
}));
export const DEVICES: {
  id: DeviceId;
  name: string;
  role: string;
  ip: string;
}[] = [
  {
    id: "pc1",
    name: "ST-ANALISTA",
    role: "Puesto de pruebas de conectividad",
    ip: "10.44.8.41",
  },
  { id: "sw1", name: "ST-SW01", role: "Switch de acceso", ip: "10.44.8.2" },
  {
    id: "r1",
    name: "ST-RTR01",
    role: "Router y filtro entre redes",
    ip: "10.44.8.1",
  },
  { id: "dns1", name: "ST-SRV01", role: "Servidor DNS", ip: "10.44.8.53" },
  {
    id: "files1",
    name: "ST-SRV02",
    role: "Servidor de remesas",
    ip: "10.44.9.80",
  },
];
export const SERVICE_NAME = "remesas.interno.example";
export function healthyConfig(): NetworkConfig {
  const descriptions = [
    "Puesto de análisis",
    "Servidor DNS",
    "Router / enlace troncal",
    "Servidor de remesas",
    "Monitor y fuente NTP",
    "Puesto de invitados",
    "Almacenamiento",
    "Reserva",
  ];
  return {
    sw1: {
      snooping: true,
      ports: descriptions.map((description, i) => ({
        number: i + 1,
        description,
        up: i !== 7,
        vlan: i === 3 || i === 6 ? 9 : i === 5 ? 99 : 8,
        mode: i === 2 ? "trunk" : "access",
        trusted: i === 2,
      })),
    },
    r1: {
      lan: { ip: "10.44.8.1/24", up: true, mtu: 1500 },
      servers: { ip: "10.44.9.1/24", up: true, mtu: 1500 },
      acl: [
        {
          id: 10,
          action: "permit",
          protocol: "tcp",
          source: "10.44.8.0/24",
          destination: "10.44.9.80/32",
          port: 80,
        },
        {
          id: 20,
          action: "permit",
          protocol: "tcp",
          source: "10.44.8.0/24",
          destination: "10.44.9.80/32",
          port: 443,
        },
        {
          id: 30,
          action: "permit",
          protocol: "tcp",
          source: "10.44.8.0/24",
          destination: "10.44.9.80/32",
          port: 21,
        },
        {
          id: 40,
          action: "permit",
          protocol: "tcp",
          source: "10.44.8.0/24",
          destination: "10.44.9.80/32",
          port: 50000,
        },
        {
          id: 50,
          action: "permit",
          protocol: "icmp",
          source: "10.44.8.0/24",
          destination: "10.44.9.0/24",
          port: null,
        },
      ],
      ntpServer: "10.44.8.123",
      clockOffset: 0,
    },
    dns1: {
      running: true,
      records: {
        [SERVICE_NAME]: "10.44.9.80",
        "tiempo.interno.example": "10.44.8.123",
      },
    },
    files1: {
      http: true,
      https: true,
      certificateName: SERVICE_NAME,
      minTls: "1.2",
      ftp: true,
      passive: true,
    },
  };
}
export function initialState(id: string): LabState {
  const running = healthyConfig();
  switch (id) {
    case "network-01":
      running.dns1.records[SERVICE_NAME] = "10.44.9.18";
      break;
    case "network-02":
      running.sw1.snooping = false;
      running.sw1.ports[5].vlan = 8;
      break;
    case "network-03":
      running.sw1.ports[3].vlan = 8;
      break;
    case "network-04":
      running.r1.acl = running.r1.acl.filter((r) => r.port !== 80);
      break;
    case "network-05":
      running.files1.https = false;
      running.files1.minTls = "1.0";
      break;
    case "network-06":
      running.r1.servers.mtu = 600;
      break;
    case "network-07":
      running.files1.passive = false;
      break;
    case "network-08":
      running.r1.ntpServer = "10.44.8.90";
      running.r1.clockOffset = 180;
      break;
    case "network-09":
      running.files1.certificateName = "archivo.interno.example";
      running.files1.minTls = "1.0";
      break;
    case "network-10":
      running.dns1.records[SERVICE_NAME] = "10.44.9.18";
      running.sw1.ports[3].up = false;
      running.r1.acl = running.r1.acl.filter((r) => r.port !== 80);
      break;
  }
  return {
    running,
    startup: structuredClone(running),
    tests: [],
    journal: [],
    capture: [],
    configVersion: 0,
    reloaded: [],
  };
}
