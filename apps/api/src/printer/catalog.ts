import { pointsFor } from "../scoring/policy";
import { flagValue } from "../security";

export const PRINTER_ROOT = "/home/analista/iot";
export const PRINTER_MODEL = "FLOW-M740";
export const PRINTER_SERIAL = "ST740-0317";
const cases = [
  [
    "Una hoja en espera",
    "Recupera el documento retenido en la cola de impresión. Revisa quién puede consultar los trabajos de otras personas.",
  ],
  [
    "El respaldo del técnico",
    "Localiza un respaldo de configuración que el servicio de soporte dejó disponible y recupera su registro de custodia.",
  ],
  [
    "La visita de mantenimiento",
    "Investiga la documentación entregada con el equipo y accede al informe de mantenimiento.",
  ],
  [
    "El escaneo olvidado",
    "Encuentra el escaneo conservado en el almacenamiento local del equipo. Comprueba los permisos de su bandeja compartida.",
  ],
  [
    "El otro lenguaje",
    "Investiga el lenguaje de trabajos del puerto de impresión y recupera el informe de servicio que no aparece en la pantalla principal.",
  ],
  [
    "Una conversación retenida",
    "Reconstruye la ruta de una publicación conservada por el intermediario de mensajes. Recupera el contenido del informe enviado por el equipo.",
  ],
  [
    "El nombre en el ticket",
    "Examina cómo el servicio de impresión identifica a quien libera un trabajo confidencial. Consigue que el equipo imprima el documento protegido.",
  ],
  [
    "Una actualización impecable",
    "Revisa qué protege realmente la firma del paquete de firmware. Consigue un informe de custodia mediante una actualización aceptada por el verificador.",
  ],
  [
    "El destinatario de la copia",
    "Estudia cómo se valida el destino del escáner y cómo se autoriza una exportación interna. Recupera el informe que el panel no permite seleccionar.",
  ],
  [
    "El mensaje que cambió de destino",
    "Reconstruye la publicación vigente entre los registros del dispositivo. Examina si su firma protege también el destino y obtén la instantánea del archivo protegido.",
  ],
];
export const PRINTER_CHALLENGES = cases.map(([title, description], index) => {
  const id = `iot-${String(index + 1).padStart(2, "0")}`;
  return {
    id,
    title,
    description: `${description} Material independiente: ${PRINTER_ROOT}/caso-${id.slice(-2)}. Usa la impresora o printer help en la terminal normal del PC. Entrega la flag recuperada en Retos.`,
    category: "IoT · Sistemas embebidos",
    device: "printer",
    points: pointsFor(id),
  };
});
export const printerFlag = (id: string) => flagValue("printer-v1:" + id);
export const getPrinterCase = (id: string) =>
  PRINTER_CHALLENGES.find((c) => c.id === id);
