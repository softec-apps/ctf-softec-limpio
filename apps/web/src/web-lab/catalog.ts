import {
  SPECIALIST_STATIONS,
  stationServiceHome,
} from "../../../../packages/specialist-contracts";
export const WEB_CHALLENGE_ID = "archivo-sin-fronteras";
export const INJECTION_CHALLENGE_ID = "consulta-sin-limites";
export const WEB_LAB_HOME = "http://archivo.seventech.local/";
export const WEB_LABS = {
  [WEB_CHALLENGE_ID]: {
    home: WEB_LAB_HOME,
    title: "Archivo institucional",
    section: "Archivo",
    identity: "op.archivo · Operaciones",
    addressLabel: "Dirección del portal de archivo",
    search: false,
    recordBase: "expedientes/",
  },
  [INJECTION_CHALLENGE_ID]: {
    home: "http://boletines.seventech.local/",
    title: "Boletines internos",
    section: "Boletines",
    identity: "Consulta pública · Laboratorio",
    addressLabel: "Dirección del buscador de boletines",
    search: true,
    recordBase: "",
  },
  "modo-depuracion": {
    home: "http://estado.seventech.local/",
    title: "Modo depuración",
    section: "Laboratorio web",
    identity: "Estación de investigación",
    addressLabel: "Dirección de Modo depuración",
    search: false,
    recordBase: "",
  },
  "dependencia-fantasma": {
    home: "http://build.seventech.local/",
    title: "Dependencia fantasma",
    section: "Laboratorio web",
    identity: "Estación de investigación",
    addressLabel: "Dirección de Dependencia fantasma",
    search: false,
    recordBase: "",
  },
  "cifrado-de-turno": {
    home: "http://custodia.seventech.local/",
    title: "Cifrado de turno",
    section: "Laboratorio web",
    identity: "Estación de investigación",
    addressLabel: "Dirección de Cifrado de turno",
    search: false,
    recordBase: "",
  },
  "carrito-de-confianza": {
    home: "http://reservas.seventech.local/",
    title: "Carrito de confianza",
    section: "Laboratorio web",
    identity: "Estación de investigación",
    addressLabel: "Dirección de Carrito de confianza",
    search: false,
    recordBase: "",
  },
  "sesion-sin-firma": {
    home: "http://identidad.seventech.local/",
    title: "Sesión sin firma",
    section: "Laboratorio web",
    identity: "Estación de investigación",
    addressLabel: "Dirección de Sesión sin firma",
    search: false,
    recordBase: "",
  },
  "aprobacion-importada": {
    home: "http://informes.seventech.local/",
    title: "Aprobación importada",
    section: "Laboratorio web",
    identity: "Estación de investigación",
    addressLabel: "Dirección de Aprobación importada",
    search: false,
    recordBase: "",
  },
  "alarma-ausente": {
    home: "http://auditoria.seventech.local/",
    title: "Alarma ausente",
    section: "Laboratorio web",
    identity: "Estación de investigación",
    addressLabel: "Dirección de Alarma ausente",
    search: false,
    recordBase: "",
  },
  "permiso-por-excepcion": {
    home: "http://exportaciones.seventech.local/",
    title: "Permiso por excepción",
    section: "Laboratorio web",
    identity: "Estación de investigación",
    addressLabel: "Dirección de Permiso por excepción",
    search: false,
    recordBase: "",
  },
} as const;
export type WebLabId = keyof typeof WEB_LABS;
export function isWebChallenge(id: string): id is WebLabId {
  return Object.hasOwn(WEB_LABS, id);
}

const OSINT_SERVICES = {
  "osint-01": {
    home: "http://fuentes-01.seventech.local/",
    title: "La firma al pie",
  },
  "osint-02": {
    home: "http://fuentes-02.seventech.local/",
    title: "Donde termina la lluvia",
  },
  "osint-03": {
    home: "http://fuentes-03.seventech.local/",
    title: "La noche del recibo azul",
  },
  "osint-04": {
    home: "http://fuentes-04.seventech.local/",
    title: "Un nombre bajo la pintura",
  },
  "osint-05": {
    home: "http://fuentes-05.seventech.local/",
    title: "La otra ventanilla",
  },
  "osint-06": {
    home: "http://fuentes-06.seventech.local/",
    title: "El último vagón",
  },
  "osint-07": {
    home: "http://fuentes-07.seventech.local/",
    title: "La invitación que desapareció",
  },
  "osint-08": {
    home: "http://fuentes-08.seventech.local/",
    title: "Antes de la primera foto",
  },
  "osint-09": {
    home: "http://fuentes-09.seventech.local/",
    title: "Dos iniciales en la libreta",
  },
  "osint-10": {
    home: "http://fuentes-10.seventech.local/",
    title: "El camino de regreso",
  },
} as const;
const osintBrowserServices = Object.fromEntries(
  Object.entries(OSINT_SERVICES).map(([id, service]) => [
    id,
    {
      ...service,
      section: "Archivo de fuentes",
      identity: "Consulta pública · Puerto Lumbre",
      addressLabel: "Dirección del archivo de fuentes",
      search: false,
      recordBase: "",
    },
  ]),
) as Record<
  keyof typeof OSINT_SERVICES,
  {
    home: string;
    title: string;
    section: string;
    identity: string;
    addressLabel: string;
    search: boolean;
    recordBase: string;
  }
>;
const apiBrowserServices = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => {
    const number = String(i + 1).padStart(2, "0");
    return [
      `api-${number}`,
      {
        home: `http://api-${number}.seventech.local/`,
        title: `Servicios API · ${number}`,
        section: "Consola API",
        identity: "user-17 · Kiosco",
        addressLabel: "Dirección del servicio API",
        search: false,
        recordBase: "",
      },
    ];
  }),
) as Record<
  `api-${string}`,
  (typeof osintBrowserServices)[keyof typeof osintBrowserServices]
>;
const nextBrowserServices = Object.fromEntries(
  SPECIALIST_STATIONS.filter(
    (s) => s.serviceHost && s.id !== "api-kiosk",
  ).flatMap((station) =>
    Array.from({ length: 10 }, (_, index) => {
      const id = station.prefix + String(index + 1).padStart(2, "0");
      return [
        id,
        {
          home: stationServiceHome(id)!,
          title: station.category + " · " + id.slice(-2),
          section: "Consola de laboratorio",
          identity: "Operador de laboratorio",
          addressLabel: "Dirección de la consola",
          search: false,
          recordBase: "",
        },
      ];
    }),
  ),
) as Record<
  `${"cloud" | "ai" | "database" | "contract"}-${string}`,
  (typeof osintBrowserServices)[keyof typeof osintBrowserServices]
>;
export const BROWSER_LABS = {
  ...nextBrowserServices,
  ...WEB_LABS,
  ...osintBrowserServices,
  ...apiBrowserServices,
};
export type BrowserLabId = keyof typeof BROWSER_LABS;
export function hasBrowserLab(id: string): id is BrowserLabId {
  return Object.hasOwn(BROWSER_LABS, id);
}
