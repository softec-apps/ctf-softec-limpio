import { pointsFor } from "../../scoring/policy";
import { flagValue } from "../../security";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../scenario-support";

const ID = "carrito-de-confianza";
const ORIGIN = "http://reservas.seventech.local";
function request(value: string) {
  const url = scenarioUrl(value, ORIGIN, ["items", "total"]);
  if (url.pathname === "/")
    return scenarioPage(
      url,
      200,
      "Reserva de kits",
      "Kit del participante: USD 60.00 por unidad. El cliente envía cantidad y total al cierre. Operación de laboratorio sin pagos reales.",
      {
        form: {
          action: "/confirmar",
          submitLabel: "Confirmar reserva",
          fields: [
            { name: "items", label: "Cantidad", value: "5" },
            { name: "total", label: "Total enviado (USD)", value: "300" },
          ],
        },
      },
    );
  if (url.pathname !== "/confirmar") return missingPage(url);
  const count = Number(url.searchParams.get("items"));
  const total = Number(url.searchParams.get("total"));
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 10 ||
    !Number.isFinite(total) ||
    total < 0.01 ||
    total > 600
  )
    return scenarioPage(
      url,
      400,
      "Reserva inválida",
      "Cantidad o total fuera de rango.",
    );
  const expected = count * 60;
  return scenarioPage(
    url,
    200,
    "Reserva confirmada",
    `Cantidad: ${count}\nTotal aceptado: USD ${total.toFixed(2)}\nValor de catálogo: USD ${expected.toFixed(2)}` +
      (total < expected
        ? `\nEl cierre confió en el total del cliente sin recalcularlo.\nComprobante de discrepancia: ${flagValue(ID)}`
        : "\nEl comprobante coincide con el catálogo."),
  );
}
export const scenario: WebLabDefinition = {
  challenge: {
    id: "carrito-de-confianza",
    title: "Carrito de confianza",
    category: "Web · OWASP A06:2025 · Diseño inseguro",
    device: "computer",
    points: pointsFor("carrito-de-confianza"),
    description:
      "El cierre de una reserva no concuerda con el precio del catálogo. Examina el diseño del cálculo y consigue un comprobante que demuestre la discrepancia. Servicio: http://reservas.seventech.local/.",
  },
  home: ORIGIN + "/",
  request,
  evidence: evidenceFiles(ORIGIN + "/", {
    "checkout.txt":
      "POST cierre legacy: items, total\nEl servicio de cierre confía en la cotización calculada en el navegador.",
    "catalogo.csv": "sku,unit_price,currency\nKIT-ST,60.00,USD",
  }),
};
