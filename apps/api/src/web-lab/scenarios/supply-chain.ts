import { pointsFor } from "../../scoring/policy";
import { flagValue } from "../../security";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../scenario-support";

const ID = "dependencia-fantasma";
const ORIGIN = "http://build.seventech.local";
function request(value: string) {
  const url = scenarioUrl(value, ORIGIN, ["package", "registry"]);
  if (url.pathname === "/")
    return scenarioPage(
      url,
      200,
      "Resolución de dependencias",
      "Proyecto: informes-web\nÚltima compilación aprobada: st-reportkit 1.7.0 / registro interno.",
      {
        form: {
          action: "/resolve",
          submitLabel: "Resolver dependencia",
          fields: [
            { name: "package", label: "Paquete", value: "st-reportkit" },
            {
              name: "registry",
              label: "Registro de resolución",
              value: "internal",
            },
          ],
        },
      },
    );
  if (url.pathname !== "/resolve") return missingPage(url);
  const name = url.searchParams.get("package");
  const registry = url.searchParams.get("registry");
  if (
    name !== "st-reportkit" ||
    !["internal", "public", "auto"].includes(registry ?? "")
  )
    return scenarioPage(
      url,
      400,
      "Resolución inválida",
      "Paquete o registro desconocido.",
    );
  if (registry === "internal")
    return scenarioPage(
      url,
      200,
      "Dependencia resuelta",
      "st-reportkit@1.7.0\nOrigen: interno\nEstado: verificado",
    );
  return scenarioPage(
    url,
    200,
    "Dependencia resuelta",
    `st-reportkit@9.9.0\nOrigen: público / publicador ajeno\nEl resolvedor seleccionó la versión superior sin vincular el paquete al registro interno. La compilación incorporó el paquete de terceros.\nMarcador de la dependencia intrusa: ${flagValue(ID)}`,
  );
}
export const scenario: WebLabDefinition = {
  challenge: {
    id: "dependencia-fantasma",
    title: "Dependencia fantasma",
    category: "Web · OWASP A03:2025 · Fallos en la cadena de suministro",
    device: "computer",
    points: pointsFor("dependencia-fantasma"),
    description:
      "La misma dependencia aparece en dos registros con versiones diferentes. Reproduce la resolución del paquete y demuestra cómo una fuente ajena entra en la compilación. Servicio: http://build.seventech.local/.",
  },
  home: ORIGIN + "/",
  request,
  evidence: evidenceFiles(ORIGIN + "/", {
    "package-lock.txt":
      "st-reportkit / versión aprobada 1.7.0 / registry=internal\nEl nombre del paquete carece de namespace privado.",
    "registries.txt":
      "internal: st-reportkit 1.7.0 / equipo de plataforma\npublic: st-reportkit 9.9.0 / publicador no reconocido",
    "build.log":
      "20:18 install policy: highest-version\n20:19 fallback de registro habilitado\n20:20 namespace binding: ausente",
  }),
};
