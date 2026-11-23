import { pointsFor } from "../../scoring/policy";
import { flagValue } from "../../security";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../scenario-support";
import { xorHex } from "../codec";

const ID = "cifrado-de-turno";
const ORIGIN = "http://custodia.seventech.local";
const KEY = "st-archive-2025";
function ciphertext() {
  const key = Buffer.from(KEY);
  return Buffer.from(
    Buffer.from(flagValue(ID)).map(
      (byte, index) => byte ^ key[index % key.length],
    ),
  ).toString("hex");
}
function request(value: string) {
  const url = scenarioUrl(value, ORIGIN, ["cipher", "key"]);
  if (url.pathname === "/")
    return scenarioPage(
      url,
      200,
      "Sobre de custodia",
      `Formato: hexadecimal\nEsquema: XOR repetido\nContenido cifrado:\n${ciphertext()}`,
      {
        form: {
          action: "/descifrar",
          submitLabel: "Descifrar sobre",
          fields: [
            {
              name: "cipher",
              label: "Contenido hexadecimal",
              value: ciphertext(),
            },
            { name: "key", label: "Clave", value: "" },
          ],
        },
      },
    );
  if (url.pathname !== "/descifrar") return missingPage(url);
  const cipher = url.searchParams.get("cipher") ?? "";
  const key = url.searchParams.get("key") ?? "";
  return scenarioPage(url, 200, "Resultado de descifrado", xorHex(cipher, key));
}
export const scenario: WebLabDefinition = {
  challenge: {
    id: "cifrado-de-turno",
    title: "Cifrado de turno",
    category: "Web · OWASP A04:2025 · Fallos criptográficos",
    device: "computer",
    points: pointsFor("cifrado-de-turno"),
    description:
      "Un respaldo usa un cifrado casero y una clave reutilizada. Analiza la evidencia de mantenimiento y recupera el contenido del sobre de custodia. Servicio: http://custodia.seventech.local/.",
  },
  home: ORIGIN + "/",
  request,
  evidence: evidenceFiles(ORIGIN + "/", {
    "respaldo.txt":
      "El sobre de custodia usa XOR con clave repetida. El contenido se almacena como hexadecimal. La rotación de clave fue pospuesta.",
    "mantenimiento.ini":
      "backup.key=st-archive-2025\nbackup.rotate=false\nArchivo distribuido junto al respaldo.",
  }),
};
