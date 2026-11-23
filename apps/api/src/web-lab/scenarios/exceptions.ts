import { pointsFor } from "../../scoring/policy";
import { flagValue } from "../../security";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../scenario-support";

const ID = "permiso-por-excepcion";
const ORIGIN = "http://exportaciones.seventech.local";
function request(value: string) {
  const url = scenarioUrl(value, ORIGIN, ["groups"]);
  if (url.pathname === "/")
    return scenarioPage(
      url,
      200,
      "Exportador de informes",
      "La cuenta de revisión no pertenece a grupos de exportación. Se recibe un contexto de grupos serializado.",
      {
        form: {
          action: "/exportar",
          submitLabel: "Solicitar exportación",
          fields: [
            { name: "groups", label: "Contexto de grupos (JSON)", value: "[]" },
          ],
        },
      },
    );
  if (url.pathname !== "/exportar") return missingPage(url);
  let groups: unknown;
  try {
    groups = JSON.parse(url.searchParams.get("groups") ?? "[]");
  } catch {
    return scenarioPage(
      url,
      400,
      "Contexto inválido",
      "No se pudo leer el JSON del contexto.",
    );
  }
  // Deliberate fail-open behavior belongs only to this simulated policy engine.
  if (groups === null)
    return scenarioPage(
      url,
      200,
      "Exportación entregada",
      `TypeError: contexto de grupos nulo. Política legacy: continuar tras excepción.\nEl exportador omitió la denegación al fallar la comprobación.\nEvidencia del fallo abierto: ${flagValue(ID)}`,
    );
  if (
    !Array.isArray(groups) ||
    groups.some((group) => typeof group !== "string")
  )
    return scenarioPage(
      url,
      400,
      "Contexto inválido",
      "El servicio rechazó ese contexto.",
    );
  return scenarioPage(
    url,
    403,
    "Exportación denegada",
    "La cuenta de revisión no tiene permiso de exportación. Un rol declarado por el cliente no altera esa cuenta.",
  );
}
export const scenario: WebLabDefinition = {
  challenge: {
    id: "permiso-por-excepcion",
    title: "Permiso por excepción",
    category:
      "Web · OWASP A10:2025 · Manejo incorrecto de condiciones excepcionales",
    device: "computer",
    points: pointsFor("permiso-por-excepcion"),
    description:
      "El exportador consulta un contexto de grupos antes de entregar informes. Examina cómo responde cuando ese contexto no tiene la forma esperada y demuestra si el error deja el acceso abierto. Servicio: http://exportaciones.seventech.local/.",
  },
  home: ORIGIN + "/",
  request,
  evidence: evidenceFiles(ORIGIN + "/", {
    "exportador.log":
      '19:40 contexto=[] export.denied\n19:42 contexto=["visitante"] export.denied\n19:47 proveedor de grupos devolvió valor nulo\n19:47 excepción en comprobación; export.continue',
    "politica.txt":
      "Las excepciones del proveedor de permisos se registran, pero el controlador legacy continúa la exportación si no obtiene una denegación explícita.",
  }),
};
