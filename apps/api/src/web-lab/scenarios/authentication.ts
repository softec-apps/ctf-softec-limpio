import { pointsFor } from "../../scoring/policy";
import { flagValue } from "../../security";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../scenario-support";
import { createHmac } from "node:crypto";
import { jsonObject } from "../scenario-support";

const ID = "sesion-sin-firma";
const ORIGIN = "http://identidad.seventech.local";
const encode = (claims: object) =>
  Buffer.from(JSON.stringify(claims)).toString("base64url");
function initialToken() {
  const head = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ sub: "auditor-demo", role: "viewer" });
  return (
    head +
    "." +
    payload +
    "." +
    createHmac("sha256", flagValue(ID))
      .update(head + "." + payload)
      .digest("base64url")
  );
}
function request(value: string) {
  const url = scenarioUrl(value, ORIGIN, ["token"]);
  if (url.pathname === "/")
    return scenarioPage(
      url,
      200,
      "Validador de identidad",
      "Identidad inicial: auditor-demo / viewer. Revisa el token del servicio heredado.",
      {
        form: {
          action: "/validar",
          submitLabel: "Validar token",
          fields: [
            { name: "token", label: "Token de sesión", value: initialToken() },
          ],
        },
      },
    );
  if (url.pathname !== "/validar") return missingPage(url);
  const parts = (url.searchParams.get("token") ?? "").split(".");
  if (
    parts.length !== 3 ||
    parts.some((part) => !/^[A-Za-z0-9_-]*$/.test(part))
  )
    return scenarioPage(
      url,
      400,
      "Token inválido",
      "Formato de token no reconocido.",
    );
  let header: Record<string, unknown>, payload: Record<string, unknown>;
  try {
    header = jsonObject(Buffer.from(parts[0], "base64url").toString());
    payload = jsonObject(Buffer.from(parts[1], "base64url").toString());
  } catch {
    return scenarioPage(
      url,
      400,
      "Token inválido",
      "Cabecera o carga no válidas.",
    );
  }
  if (
    header.alg === "none" &&
    parts[2] === "" &&
    payload.sub === "auditor-demo" &&
    payload.role === "admin"
  )
    return scenarioPage(
      url,
      200,
      "Identidad administrativa aceptada",
      `El validador aceptó una identidad sin verificar su firma.\nEvidencia de suplantación: ${flagValue(ID)}`,
    );
  return scenarioPage(
    url,
    403,
    "Acceso no autorizado",
    "La identidad presentada no supera la validación administrativa.",
  );
}
export const scenario: WebLabDefinition = {
  challenge: {
    id: "sesion-sin-firma",
    title: "Sesión sin firma",
    category: "Web · OWASP A07:2025 · Fallos de autenticación",
    device: "computer",
    points: pointsFor("sesion-sin-firma"),
    description:
      "Un validador heredado decide la identidad a partir de un token del navegador. Investiga su cabecera y demuestra la suplantación de una identidad con privilegios. Servicio: http://identidad.seventech.local/.",
  },
  home: ORIGIN + "/",
  request,
  evidence: evidenceFiles(ORIGIN + "/", {
    "token.txt":
      "Formato del token: cabecera.carga.firma\nCabecera y carga usan base64url. El sujeto es auditor-demo; su rol inicial es viewer.",
    "compatibilidad.log":
      "jwt legacy verifier / algorithms from header\nmodo de compatibilidad para tokens sin firma: habilitado",
  }),
};
