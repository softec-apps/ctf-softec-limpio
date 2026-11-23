import { pointsFor } from "../scoring/policy";
export const DOMAIN_ROOT = "/home/analista/dominio";
export const DOMAIN_NAME = "seventech.corp.test";
export const DOMAIN_DC = "10.77.0.40";
export const DOMAIN_TARGET = "10.77.0.50";
export const DOMAIN_CASES = [
  {
    title: "El recurso de recepción",
    group: "SMB",
    points: pointsFor("ad-01"),
    description:
      "La portátil del laboratorio publica un recurso de recepción. Investiga su acceso desde el PC Linux y recupera la entrega que quedó expuesta.",
  },
  {
    title: "La nota del directorio",
    group: "LDAP",
    points: pointsFor("ad-02"),
    description:
      "El directorio conserva una anotación que nunca debió usarse para guardar credenciales. Comprueba qué acceso concede en la portátil.",
  },
  {
    title: "La cuenta sin desafío",
    group: "Kerberos",
    points: pointsFor("ad-03"),
    description:
      "Una cuenta de archivo responde de una forma distinta al resto durante la autenticación. Investiga la diferencia y demuestra su impacto en Windows.",
  },
  {
    title: "El servicio de informes",
    group: "Kerberos",
    points: pointsFor("ad-04"),
    description:
      "El servicio de informes publica su identidad en el directorio. Examina la autenticación del servicio y recupera su entrega en la portátil.",
  },
  {
    title: "Preferencias de otra época",
    group: "Directivas",
    points: pointsFor("ad-05"),
    description:
      "La copia de una preferencia de grupo antigua sigue disponible. Determina si permite acceder al mantenimiento de la portátil.",
  },
  {
    title: "El grupo que podía cambiarse",
    group: "Permisos",
    points: pointsFor("ad-06"),
    description:
      "Una delegación de administración parece conceder más de lo previsto sobre un grupo. Demuestra el acceso resultante sin alterar otros grupos.",
  },
  {
    title: "La identidad de auditoría",
    group: "Permisos",
    points: pointsFor("ad-07"),
    description:
      "La revisión de permisos encontró un derecho excesivo sobre una cuenta de auditoría. Investiga su alcance y comprueba el acceso en Windows.",
  },
  {
    title: "Una directiva en tránsito",
    group: "Directivas",
    points: pointsFor("ad-08"),
    description:
      "La portátil recibe una directiva cuyo contenido puede cambiar un operador. Comprueba quién controla su ejecución y recupera la evidencia resultante.",
  },
  {
    title: "La firma prestada",
    group: "Certificados",
    points: pointsFor("ad-09"),
    description:
      "Una plantilla de certificados acepta una identidad suministrada por el solicitante. Investiga la política de emisión y demuestra a quién permite representar.",
  },
  {
    title: "El equipo que delegaba",
    group: "Delegación",
    points: pointsFor("ad-10"),
    description:
      "El objeto de la portátil delega servicios según una lista modificable. Investiga esa relación y demuestra el alcance exacto sobre el equipo Windows.",
  },
].map((c, index) => ({
  ...c,
  index,
  id: `ad-${String(index + 1).padStart(2, "0")}`,
}));
export const DOMAIN_CHALLENGES = DOMAIN_CASES.map((c) => ({
  id: c.id,
  title: c.title,
  description: `${c.description} Origen: PC Linux, mediante Seventech VPN. Objetivo: WS01 (${DOMAIN_TARGET}); directorio: DC01 (${DOMAIN_DC}). Analiza el dominio con las herramientas del PC y entrega la flag recuperada.`,
  category: `Active Directory · ${c.group}`,
  device: "domain",
  points: c.points,
}));
export const DOMAIN_WORDS = [
  "Brisa2026!",
  "Turno2026!",
  "Archivo2026!",
  "Informe2026!",
  "Cedro2026!",
  "Marea2026!",
  "Lumbre2026!",
  "Ronda2026!",
  "Ladera2026!",
  "Cobre2026!",
  "Cierre2026!",
  "Reserva2026!",
  "Viento2026!",
  "Niebla2026!",
  "Norte2026!",
  "Sur2026!",
];
