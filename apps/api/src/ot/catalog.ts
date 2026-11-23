import { pointsFor } from "../scoring/policy";
import { flagValue } from "../security";

export const OT_ROOT = "/home/analista/ot";
export const OT_CONTROLLER = "AXON-C24";
export const OT_SERIAL = "AX24-0871";
const definitions = [
  [
    "Una señal sin dueño",
    "Enciende la indicación azul desde el canal del controlador que la pantalla reserva a personal autorizado.",
    "306",
    "Autenticar y autorizar escrituras en el controlador, además de segmentar su acceso.",
  ],
  [
    "La entrega del integrador",
    "Revisa la documentación de entrega y consigue acceso de operación al panel.",
    "1392",
    "Rotar las credenciales iniciales y retirar accesos temporales antes de entregar el equipo.",
  ],
  [
    "El proyecto fuera del armario",
    "Recupera el registro de custodia incluido en una copia de configuración del servicio HMI.",
    "552",
    "Autorizar las descargas de respaldos y conservarlos fuera de rutas públicas.",
  ],
  [
    "Una memoria demasiado abierta",
    "Identifica el área reservada del controlador y recupera su contenido mediante el canal de lectura.",
    "862",
    "Separar datos operativos de secretos y comprobar permisos también en las lecturas.",
  ],
  [
    "El permiso que escribió el cliente",
    "Consigue aplicar la calibración de ventilación que la identidad de consulta no debería poder modificar.",
    "807",
    "Derivar el rol de la identidad autenticada y comprobarlo junto a la operación de ingeniería.",
  ],
  [
    "Una dirección de confianza",
    "Investiga cómo el puente HMI decide si una petición procede de ingeniería y recupera el diagnóstico restringido.",
    "290",
    "Aceptar cabeceras de origen solo de proxies confiables y autenticar al solicitante.",
  ],
  [
    "El umbral que dejó de avisar",
    "Demuestra que el controlador admite un umbral fuera del intervalo de ingeniería y consigue que la alarma deje de detectar la sonda caliente.",
    "20",
    "Validar unidades, rangos y coherencia de parámetros dentro del controlador.",
  ],
  [
    "La lógica detrás del enclavamiento",
    "Revisa la transferencia de programas y demuestra una modificación que permite arrancar el ventilador incluso con mantenimiento activo.",
    "306",
    "Autorizar la descarga de programas, autenticar su origen y verificar sus enclavamientos.",
  ],
  [
    "Una firma del pasado",
    "Examina qué ocurre al restaurar una imagen antigua del fabricante y comprueba si reaparece una función retirada de diagnóstico.",
    "1328",
    "Proteger un contador de versión de seguridad que impida volver a imágenes vulnerables.",
  ],
  [
    "La orden que ya había terminado",
    "Reconstruye una orden de iluminación conservada en las capturas y comprueba si su firma sigue siendo aceptada fuera de su ventana de mantenimiento.",
    "294",
    "Comprobar vigencia, destinatario y secuencia; conservar un estado que impida repeticiones.",
  ],
];
export const OT_CASES = definitions.map(
  ([title, description, cwe, defense], index) => ({
    id: `ot-${String(index + 1).padStart(2, "0")}`,
    title,
    description,
    cwe,
    defense,
    reference: `https://cwe.mitre.org/data/definitions/${cwe}.html`,
  }),
);
export const OT_CHALLENGES = OT_CASES.map((entry) => ({
  id: entry.id,
  title: entry.title,
  description: `${entry.description} Evidencias independientes: ${OT_ROOT}/caso-${entry.id.slice(-2)}. Usa el HMI, su portal web o las herramientas ot del PC. Entrega la flag recuperada en Retos.`,
  category: "OT · Automatización industrial",
  device: "ot",
  points: pointsFor(entry.id),
}));
export const getOtCase = (id: string) =>
  OT_CASES.find((entry) => entry.id === id);
export const otFlag = (id: string) => flagValue("ot-v1:" + id);
