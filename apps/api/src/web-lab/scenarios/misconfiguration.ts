import { pointsFor } from "../../scoring/policy";
import { flagValue } from "../../security";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../scenario-support";

const ID = "modo-depuracion";
const ORIGIN = "http://estado.seventech.local";
function request(value: string) {
  const url = scenarioUrl(value, ORIGIN);
  if (url.pathname === "/")
    return scenarioPage(
      url,
      200,
      "Estado del servicio",
      "Sistema operativo. La portada no publica diagnósticos.",
      { links: [{ label: "Política para rastreadores", path: "/robots.txt" }] },
    );
  if (url.pathname === "/robots.txt")
    return scenarioPage(
      url,
      200,
      "robots.txt",
      "User-agent: *\nDisallow: /_diagnostics/",
    );
  if (url.pathname === "/_diagnostics/")
    return scenarioPage(
      url,
      200,
      "Diagnósticos",
      "Perfil: development\nConfiguración detallada: /_diagnostics/runtime.json",
    );
  if (url.pathname === "/_diagnostics/runtime.json")
    return scenarioPage(
      url,
      200,
      "Configuración de ejecución",
      `APP_ENV=development\nDEBUG=true\nDIAGNOSTICS_PUBLIC=true\nExposición confirmada: ${flagValue(ID)}`,
    );
  return missingPage(url);
}
export const scenario: WebLabDefinition = {
  challenge: {
    id: "modo-depuracion",
    title: "Modo depuración",
    category: "Web · OWASP A02:2025 · Configuración de seguridad incorrecta",
    device: "computer",
    points: pointsFor("modo-depuracion"),
    description:
      "Una instancia de diagnóstico quedó activa después del cambio de turno. Encuentra qué configuración se está publicando y recupera la evidencia de exposición. Servicio: http://estado.seventech.local/.",
  },
  home: ORIGIN + "/",
  request,
  evidence: evidenceFiles(ORIGIN + "/", {
    "cambio.log":
      "18:10 despliegue terminado\n18:12 smoke test de portada: 200\n18:13 comprobación de rutas de diagnóstico: omitida",
    "operacion.txt":
      "Los rastreadores consultan robots.txt. El perfil de desarrollo no debe quedar activo en instancias publicadas.",
  }),
};
