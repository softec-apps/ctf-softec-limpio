import { pointsFor } from "../scoring/policy";
export const LINUX_ENTRY_HINT =
  "El viejo administrador dibujó un árbol y, bajo la tierra, escribió cuatro letras en inglés. «Aquí está quien manda», dejó anotado. En el reverso del papel añadió: «Para abrir la puerta, míralo en el espejo».";
export const LINUX_SERVERS = [
  {
    name: "bastion",
    title: "La primera guardia",
    description:
      "El relevo dejó un mensaje en tu carpeta personal. Encuentra la clave de continuidad.",
    points: pointsFor("linux-01"),
  },
  {
    name: "almacen",
    title: "Lo que no se ve",
    description:
      "El inventario visible no cuenta toda la historia. Recupera la credencial que quedó fuera de la lista.",
    points: pointsFor("linux-02"),
  },
  {
    name: "documentos",
    title: "Un nombre incómodo",
    description:
      "El acta definitiva está entre los documentos de entrega. Su nombre debe conservarse completo.",
    points: pointsFor("linux-03"),
  },
  {
    name: "archivo",
    title: "Entre muchas cajas",
    description:
      "El depósito contiene copias de distintos propietarios. El relevo dejó un archivo legible, de tu propiedad y del tamaño indicado en el aviso.",
    points: pointsFor("linux-04"),
  },
  {
    name: "bitacora",
    title: "La línea del relevo",
    description:
      "El registro conserva cientos de eventos. Solo la entrega de turno contiene la credencial vigente.",
    points: pointsFor("linux-05"),
  },
  {
    name: "conciliacion",
    title: "Una entrega sin pareja",
    description:
      "Las entregas se registraron por duplicado, salvo una. Identifica el registro que no tiene pareja.",
    points: pointsFor("linux-06"),
  },
  {
    name: "telemetria",
    title: "Entre el ruido",
    description:
      "Un dispositivo exportó datos binarios. Conservó una cadena legible que permite continuar.",
    points: pointsFor("linux-07"),
  },
  {
    name: "correo",
    title: "El sobre de transporte",
    description:
      "El correo recibió una credencial en una representación de transporte. Recupera su texto original.",
    points: pointsFor("linux-08"),
  },
  {
    name: "respaldos",
    title: "El paquete sellado",
    description:
      "El último respaldo contiene la credencial de custodia. Inspecciona el paquete y recupera su contenido.",
    points: pointsFor("linux-09"),
  },
  {
    name: "custodia",
    title: "La última autorización",
    description:
      "La clave final está bajo otra identidad. Revisa tus autorizaciones y accede con los permisos previstos.",
    points: pointsFor("linux-10"),
  },
].map((server, index) => ({
  ...server,
  index,
  id: `linux-${String(index + 1).padStart(2, "0")}`,
  ip: `10.77.0.${10 + index}`,
  user: index === 0 ? "root" : `nivel${String(index).padStart(2, "0")}`,
  home: index === 0 ? "/root" : `/home/nivel${String(index).padStart(2, "0")}`,
}));
export const LINUX_CHALLENGES = LINUX_SERVERS.map((s) => ({
  id: s.id,
  title: s.title,
  description: `${s.description} ${s.index === 9 ? "Entrega la flag final con submit desde la Terminal." : "Usa su flag como contraseña SSH del siguiente servidor; el acceso valida este relevo automáticamente."}`,
  category: "Linux · Red de servidores",
  device: "computer",
  points: s.points,
}));

export const LINUX_LEGACY_DESCRIPTIONS = Object.fromEntries(
  LINUX_SERVERS.map((s) => [
    s.id,
    ["red corporativa", "red Linux"].map(
      (network) =>
        `${s.description} Accede mediante la VPN del juego y entrega la clave desde la ${network} para abrir el siguiente servidor.`,
    ),
  ]),
);
