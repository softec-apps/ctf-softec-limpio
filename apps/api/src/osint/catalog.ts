import { OSINT_CASES } from "./sources";
import {
  evidenceFiles,
  missingPage,
  scenarioPage,
  scenarioUrl,
  type WebLabDefinition,
} from "../web-lab/scenario-support";

export const OSINT_LABS: WebLabDefinition[] = OSINT_CASES.map(
  (entry, index) => {
    const home = `http://fuentes-${String(index + 1).padStart(2, "0")}.seventech.local/`;
    const origin = new URL(home).origin;
    const sourceIndex = entry.pages.map((page) => ({
      label: page.title,
      path: page.path,
    }));
    return {
      challenge: {
        id: entry.id,
        title: entry.title,
        category: "OSINT · Fuentes abiertas",
        device: "computer",
        points: entry.points,
        description: `${entry.question.split(" Entrega")[0]} Consulta el expediente y las fuentes preservadas en el navegador del equipo.`,
      },
      home,
      request(value) {
        const url = scenarioUrl(value, origin, ["q"]);
        if (url.pathname === "/")
          return scenarioPage(
            url,
            200,
            entry.title,
            `Puerto Lumbre / expediente de investigación\n\n${entry.question}\n\nLas personas, instituciones y sitios de esta colección son ficticios. El archivo conserva publicaciones con sus fechas y procedencias.`,
            {
              links: sourceIndex,
              form: {
                action: "/buscar",
                submitLabel: "Buscar en las fuentes",
                fields: [{ name: "q", label: "Texto de búsqueda", value: "" }],
              },
            },
          );
        if (url.pathname === "/buscar") {
          const query = (url.searchParams.get("q") ?? "").trim();
          const matches = entry.pages.filter((page) =>
            `${page.title} ${page.publisher} ${page.body}`
              .toLocaleLowerCase("es")
              .includes(query.toLocaleLowerCase("es")),
          );
          return scenarioPage(
            url,
            200,
            "Resultados del archivo",
            `${matches.length} fuentes para «${query}». Se busca en las copias conservadas de este expediente.`,
            {
              links: matches.map((page) => ({
                label: page.title,
                path: page.path,
              })),
              form: {
                action: "/buscar",
                submitLabel: "Buscar en las fuentes",
                fields: [
                  { name: "q", label: "Texto de búsqueda", value: query },
                ],
              },
            },
          );
        }
        const page = entry.pages.find((page) => page.path === url.pathname);
        if (!page) return missingPage(url);
        return scenarioPage(
          url,
          200,
          page.title,
          `Fuente: ${page.publisher}\nFecha de la ficha: ${page.date}\n\n${page.body}`,
          {
            links: [{ label: "Volver al expediente", path: "/" }],
            media: page.media,
            source: { publisher: page.publisher, date: page.date },
          },
        );
      },
      evidence: evidenceFiles(home, {
        "expediente.txt": `${entry.title}\n\n${entry.question}\n\nEntrada del archivo: ${home}\nFuentes ficticias conservadas:\n${entry.pages.map((page) => `${page.publisher} · ${home.slice(0, -1)}${page.path}`).join("\n")}`,
      }),
    };
  },
);

export function osintFlag(id: string) {
  const entry = OSINT_CASES.find((entry) => entry.id === id);
  if (!entry) throw new Error("Expediente OSINT desconocido.");
  return `CTF{${entry.answer}}`;
}
