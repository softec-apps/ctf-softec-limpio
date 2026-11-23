import { pointsFor } from "../../scoring/policy";
import { flagValue } from "../../security";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../scenario-support";
import { jsonObject } from "../scenario-support";

const ID = "aprobacion-importada";
const ORIGIN = "http://informes.seventech.local";
const draft = () =>
  Buffer.from(
    JSON.stringify({ report: "ST-42", approved: false, reviewer: "pendiente" }),
  ).toString("base64");
function request(value: string) {
  const url = scenarioUrl(value, ORIGIN, ["data"]);
  if (url.pathname === "/")
    return scenarioPage(
      url,
      200,
      "Importador de informes",
      "Informe ST-42 / estado original: borrador. Paquete de intercambio codificado en base64.",
      {
        form: {
          action: "/importar",
          submitLabel: "Importar informe",
          fields: [
            {
              name: "data",
              label: "Paquete del informe (base64)",
              value: draft(),
            },
          ],
        },
      },
    );
  if (url.pathname !== "/importar") return missingPage(url);
  const raw = url.searchParams.get("data") ?? "";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))
    return scenarioPage(
      url,
      400,
      "Paquete inválido",
      "Se esperaba un paquete base64.",
    );
  const report = jsonObject(Buffer.from(raw, "base64").toString());
  if (
    report.report !== "ST-42" ||
    typeof report.approved !== "boolean" ||
    typeof report.reviewer !== "string"
  )
    return scenarioPage(
      url,
      400,
      "Informe inválido",
      "Los campos del informe no cumplen el formato.",
    );
  if (report.approved && report.reviewer === "direccion")
    return scenarioPage(
      url,
      200,
      "Informe aprobado",
      `La aprobación importada fue aceptada sin verificar una firma ni el origen de los datos.\nEvidencia de alteración: ${flagValue(ID)}`,
    );
  return scenarioPage(
    url,
    200,
    "Informe importado",
    "Estado: pendiente de aprobación.",
  );
}
export const scenario: WebLabDefinition = {
  challenge: {
    id: "aprobacion-importada",
    title: "Aprobación importada",
    category:
      "Web · OWASP A08:2025 · Fallos de integridad del software o los datos",
    device: "computer",
    points: pointsFor("aprobacion-importada"),
    description:
      "Una aplicación importa informes codificados desde el navegador. Averigua si comprueba la integridad de la aprobación antes de darla por válida. Servicio: http://informes.seventech.local/.",
  },
  home: ORIGIN + "/",
  request,
  evidence: evidenceFiles(ORIGIN + "/", {
    "intercambio.txt":
      "El servicio importa JSON codificado en base64. Campos: report, approved, reviewer. No consta firma en el contrato de intercambio.",
    "revision.log":
      "ST-42 aprobado=false reviewer=pendiente\nLa aprobación legítima requiere revisión de direccion.",
  }),
};
