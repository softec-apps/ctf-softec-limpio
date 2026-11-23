import { pointsFor } from "../../scoring/policy";
import { flagValue } from "../../security";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../scenario-support";

const ID = "alarma-ausente";
const ORIGIN = "http://auditoria.seventech.local";
function request(value: string) {
  const url = scenarioUrl(value, ORIGIN, ["trace"]);
  if (url.pathname === "/")
    return scenarioPage(
      url,
      200,
      "Panel de auditoría",
      "Alertas del turno: 0\nLa auditoría registrada y el tráfico del proxy están preservados en la estación.",
      {
        form: {
          action: "/correlacionar",
          submitLabel: "Validar hallazgo",
          fields: [
            {
              name: "trace",
              label: "Identificador de petición omitida",
              value: "",
            },
          ],
        },
      },
    );
  if (url.pathname !== "/correlacionar") return missingPage(url);
  if (url.searchParams.get("trace") === "req-7c31")
    return scenarioPage(
      url,
      200,
      "Hallazgo confirmado",
      `La descarga exitosa del documento reservado no produjo un evento de auditoría ni una alerta.\nEvidencia de cobertura ausente: ${flagValue(ID)}`,
    );
  return scenarioPage(
    url,
    422,
    "Hallazgo no confirmado",
    "Ese identificador no demuestra una operación sensible exitosa omitida.",
  );
}
export const scenario: WebLabDefinition = {
  challenge: {
    id: "alarma-ausente",
    title: "Alarma ausente",
    category:
      "Web · OWASP A09:2025 · Fallos de registro y alertas de seguridad",
    device: "computer",
    points: pointsFor("alarma-ausente"),
    description:
      "El panel no muestra alertas, pero el proxy registró actividad sobre documentos restringidos. Correlaciona las fuentes e identifica una operación sensible que quedó fuera de la auditoría. Servicio: http://auditoria.seventech.local/.",
  },
  home: ORIGIN + "/",
  request,
  evidence: evidenceFiles(ORIGIN + "/", {
    "proxy.log":
      "req-a102 GET /login status=200\nreq-7b21 GET /documentos/restringidos/8 status=403\nreq-7c31 GET /documentos/restringidos/8 status=200 actor=visitante\nreq-c512 GET /salud status=200\nreq-8d10 GET /documentos/restringidos/9 status=403",
    "auditoria.log":
      "req-a102 auth.login_view\nreq-7b21 authorization.denied alert=true\nreq-8d10 authorization.denied alert=true\nNo se registraron descargas exitosas.",
    "panel.txt":
      "El contador de alertas solo procesa eventos enviados por la aplicación. La ruta legacy de descarga se sirve mediante un controlador distinto.",
  }),
};
