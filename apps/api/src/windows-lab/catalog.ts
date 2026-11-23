import { pointsFor } from "../scoring/policy";

const scenarios = [
  [
    "El respaldo abierto",
    "Un respaldo de recepción quedó con permisos más amplios que el original. Enumera archivos y permisos del equipo y demuestra la lectura que permiten sus ACL.",
  ],
  [
    "La instalación que recordaba",
    "Una instalación desatendida dejó material sensible en el equipo. Investiga qué identidad local permite recuperar y demuestra su acceso a la evidencia.",
  ],
  [
    "La sesión automática",
    "La configuración de inicio automático conserva una identidad y un secreto locales. Investiga su alcance y accede con esa identidad al archivo protegido.",
  ],
  [
    "Lo que guardó la consola",
    "Una sesión de mantenimiento dejó historial de PowerShell en el perfil del analista. Investiga qué acceso local permite recuperar y compruébalo en el equipo.",
  ],
  [
    "El servicio de respaldo",
    "El servicio de respaldo se ejecuta con más privilegios que su directorio de instalación. Examina su configuración y permisos y demuestra el efecto de sustituir su ejecutable.",
  ],
  [
    "Una ruta sin comillas",
    "Un servicio utiliza una ruta con espacios sin protegerla con comillas. Enumera sus permisos y las ubicaciones candidatas de Windows; demuestra cuál puede ejecutar un usuario sin privilegios.",
  ],
  [
    "La tarea de cierre",
    "Una tarea programada ejecuta un archivo que otros usuarios pueden modificar. Investiga la cuenta de ejecución, el disparador y los permisos del archivo antes de operar la tarea.",
  ],
  [
    "El permiso sobre el servicio",
    "Un operador recibió derechos excesivos sobre un servicio cuyo ejecutable está protegido. Investiga la DACL del servicio y demuestra el alcance de cambiar su configuración.",
  ],
  [
    "La copia con privilegios",
    "La cuenta de copias tiene un privilegio de respaldo, pero el acceso ordinario al archivo sigue denegado. Investiga cómo efectuar una copia en modo de respaldo y recuperar la evidencia sin modificar la ACL original.",
  ],
  [
    "El trabajador y la tubería",
    "Un trabajador de aplicaciones y el servicio de impresión exponen dos límites de confianza distintos. Investiga sus identidades, permisos y privilegios y demuestra una elevación mediante su interacción.",
  ],
] as const;

export const WINDOWS_HOSTS = scenarios.map(([title, description], index) => ({
  id: `windows-${String(index + 1).padStart(2, "0")}`,
  name: `WIN${String(index + 1).padStart(2, "0")}`,
  ip: `10.77.0.${60 + index}`,
  os: "Windows 11 · simulación interactiva",
  title,
  description,
  difficulty:
    index < 4
      ? ("easy" as const)
      : index < 7
        ? ("medium" as const)
        : ("hard" as const),
  points: pointsFor(`windows-${String(index + 1).padStart(2, "0")}`),
}));
export const WINDOWS_TARGET = WINDOWS_HOSTS[0];
export const WINDOWS_INTERACTIVE_CHALLENGES = WINDOWS_HOSTS.map((host) => ({
  id: host.id,
  title: host.title,
  description: `${host.description} Objetivo independiente: ${host.name} (${host.ip}). Puedes usar la consola del portátil o el PC Linux mediante VPN y WinRM. Enumera con help y recupera C:\\Evidence\\proof.txt al obtener el acceso necesario. Las herramientas y ejecutables operan solo sobre esta simulación.`,
  category: "Windows",
  device: "laptop",
  points: host.points,
}));
