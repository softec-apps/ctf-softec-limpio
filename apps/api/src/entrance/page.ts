import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function entrancePageTemplate() {
  const html = await readFile(resolve("apps/web/dist/index.html"), "utf8");
  if (!html.includes("__ENTRANCE_PIN__"))
    throw new Error("Falta la pista de entrada en la página construida.");
  return html;
}
