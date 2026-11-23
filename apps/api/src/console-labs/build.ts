import {
  stationForChallenge,
  stationServiceHome,
} from "../../../../packages/specialist-contracts";
import { flagValue } from "../security";
import { pointsFor } from "../scoring/policy";
import {
  evidenceFiles,
  scenarioUrl,
  scenarioPage,
  missingPage,
  type WebLabDefinition,
} from "../web-lab/scenario-support";
export type ConsoleCase = {
  title: string;
  question: string;
  initial: Record<string, unknown>;
  files: Record<string, string>;
  run: (input: Record<string, unknown>) => {
    accepted: boolean;
    output: unknown;
  };
};
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export function consoleLabs(
  prefix: string,
  cases: ConsoleCase[],
): WebLabDefinition[] {
  return cases.map((entry, index) => {
    const id = prefix + String(index + 1).padStart(2, "0"),
      station = stationForChallenge(id)!;
    const home = stationServiceHome(id)!;
    return {
      challenge: {
        id,
        title: entry.title,
        category: station.category,
        device: "computer",
        points: pointsFor(id),
        description:
          entry.question +
          " Obtén y entrega el comprobante del servicio. Servicio: " +
          home,
      },
      home,
      evidence: evidenceFiles(home, {
        "expediente.txt": entry.question,
        "formato.txt":
          "Operaciones del simulador mediante objetos JSON. Se reutilizan navegador, cliente HTTP, terminal y archivos del PC.",
        ...entry.files,
      }),
      request(value) {
        const url = scenarioUrl(value, new URL(home).origin, ["payload"]);
        if (url.pathname === "/")
          return scenarioPage(url, 200, entry.title, entry.question, {
            form: {
              action: "/operate",
              submitLabel: "Ejecutar operación",
              fields: [
                {
                  name: "payload",
                  label: "Operación JSON",
                  value: JSON.stringify(entry.initial),
                  maxLength: 2200,
                },
              ],
            },
          });
        if (url.pathname !== "/operate") return missingPage(url);
        const text = url.searchParams.get("payload") ?? "";
        if (text.length > 2200)
          return scenarioPage(
            url,
            400,
            "Entrada demasiado extensa",
            "La operación admite 2.200 caracteres.",
          );
        let input: unknown;
        try {
          input = JSON.parse(text);
        } catch {
          return scenarioPage(
            url,
            400,
            "JSON inválido",
            "Se requiere un objeto JSON.",
          );
        }
        if (!input || typeof input !== "object" || Array.isArray(input))
          return scenarioPage(
            url,
            400,
            "Entrada inválida",
            "Se requiere un objeto JSON.",
          );
        const result = entry.run(input as Record<string, unknown>);
        return scenarioPage(
          url,
          200,
          "Resultado de la operación",
          JSON.stringify(result.output, null, 2) +
            (result.accepted ? "\nComprobante: " + flagValue(id) : ""),
          { links: [{ label: "Nueva operación", path: "/" }] },
        );
      },
    };
  });
}
