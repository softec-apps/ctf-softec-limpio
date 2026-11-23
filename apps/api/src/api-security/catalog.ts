import { flagValue } from "../security";
import { pointsFor } from "../scoring/policy";
import {
  scenarioUrl,
  scenarioPage,
  missingPage,
  evidenceFiles,
  type WebLabDefinition,
} from "../web-lab/scenario-support";
type Input = {
  method: string;
  path: string;
  body: Record<string, unknown>;
  token: string;
};
const baseToken = Buffer.from(
  JSON.stringify({
    sub: "user-17",
    tenant: "north",
    scope: "read",
    aud: "kiosk",
  }),
).toString("base64url");
type ApiDefinition = {
  title: string;
  question: string;
  method: string;
  path: string;
  body: Record<string, unknown>;
  files: Record<string, string>;
};
const definitions: ApiDefinition[] = [
  {
    title: "El pedido de otro cliente",
    question:
      "La sesión pertenece a user-17. Encuentra un pedido cuyo owner sea distinto y demuestra su lectura por identificador.",
    method: "GET",
    path: "/v1/orders/101",
    body: {},
    files: {
      "pedidos.csv": "id,owner\n101,user-17\n207,user-42\n",
      "contrato.txt":
        "GET /v1/orders/{id}. El token identifica al usuario; owner debe comprobarse en servidor.",
    },
  },
  {
    title: "La función fuera del menú",
    question:
      "El menú oculta la exportación administrativa a operadores. Comprueba si la función también exige el rol en servidor.",
    method: "GET",
    path: "/v1/menu",
    body: {},
    files: {
      "openapi.txt":
        "GET /v1/menu\nGET /v1/admin/export\nRol de sesión: operador\n",
    },
  },
  {
    title: "Una propiedad que sobra",
    question:
      "Inspecciona la respuesta completa de perfil y demuestra que el serializador devuelve una propiedad de recuperación que no pertenece a la vista pública.",
    method: "GET",
    path: "/v1/profile",
    body: {},
    files: {
      "esquema-publico.json":
        '{"public":["displayName","avatar"],"private":["recoveryProof"]}',
    },
  },
  {
    title: "Actualizar más de lo permitido",
    question:
      "El contrato permite cambiar displayName. Investiga si la vinculación automática también modifica una propiedad de privilegio.",
    method: "PATCH",
    path: "/v1/users/me",
    body: { displayName: "Visitante" },
    files: {
      "modelo.json": '{"displayName":"Visitante","accessLevel":"visitor"}',
      "contrato.txt":
        "PATCH /v1/users/me: campo editable displayName. accessLevel pertenece al servidor; valores visitor y staff.",
    },
  },
  {
    title: "El límite estaba en la pantalla",
    question:
      "El kiosco limita a dos reservas por operación. Demuestra que la API acepta una cantidad mayor; el laboratorio admite como máximo veinte unidades.",
    method: "POST",
    path: "/v1/reservations",
    body: { quantity: 2 },
    files: {
      "politica.txt":
        "Política: máximo 2 por operación y cuenta. SKU LAB-KIT. Precio fijo, sin pagos reales.",
    },
  },
  {
    title: "La vista previa mira hacia dentro",
    question:
      "La vista previa recibe una URL. Investiga si permite consultar el servicio interno de identidad. Todas las respuestas se simulan dentro del juego.",
    method: "POST",
    path: "/v1/preview",
    body: { url: "https://public.example/welcome" },
    files: {
      "red.txt":
        "Gateway público -> servicio previews\nServicio interno: http://metadata.internal/identity\nNo se realizan conexiones externas ni a la máquina anfitriona.",
    },
  },
  {
    title: "La versión que nadie retiró",
    question:
      "La API actual protege la auditoría. Revisa el inventario de versiones y busca una ruta antigua con la misma función y controles distintos.",
    method: "GET",
    path: "/v1/audit",
    body: {},
    files: {
      "inventario.csv":
        "version,estado,ruta\nv1,publicada,/v1/audit\nv0,heredada,/v0/audit\n",
      "control.txt":
        "La auditoría exige permiso audit:read; el token de kiosco solo tiene read.",
    },
  },
  {
    title: "Un token sin verificación",
    question:
      "El verificador heredado interpreta alg del encabezado. Construye un JWT sin firma con aud=kiosk, tenant=south y scope=export, y prueba la exportación de ese tenant. Las capturas y el formato están en la evidencia.",
    method: "GET",
    path: "/v1/tenant/south/export",
    body: {},
    files: {
      "captura.json": JSON.stringify({
        header: { alg: "HS256", typ: "JWT" },
        payload: {
          sub: "user-17",
          tenant: "north",
          scope: "read",
          aud: "kiosk",
        },
      }),
      "verificador.txt":
        "Ruta de compatibilidad: alg=none omite comprobación de firma y acepta payload. Se siguen comprobando aud y tenant. Formato JWT: base64url(header).base64url(payload).firma",
    },
  },
  {
    title: "Dos intérpretes para el mismo ID",
    question:
      "El gateway autoriza el primer valor id; el backend consume el último. Demuestra la discrepancia con una sola ruta que pase la autorización y termine leyendo una factura ajena.",
    method: "GET",
    path: "/v1/invoices?id=101",
    body: {},
    files: {
      "traza.txt":
        "gateway: query.get(id), primer valor\nbackend: query.getAll(id).at(-1), último valor\nEl envoltorio transporta la ruta completa, incluida su query.",
      "facturas.csv": "id,owner\n101,user-17\n207,user-42\n",
    },
  },
  {
    title: "La respuesta del proveedor",
    question:
      "Relaciona SKU, quoteId y trace de la solicitud pendiente. El adaptador consume una respuesta de proveedor recibida desde la caché sin verificar su firma. Demuestra que puede aprobar un total inferior al catálogo con el SKU y referencias correctos; no cambies el token de sesión.",
    method: "POST",
    path: "/v1/partner/accept",
    body: {},
    files: {
      "pendiente.json":
        '{"sku":"KIT-9","quoteId":"Q-91","trace":"T-64","catalogTotal":900}',
      "adaptador.txt":
        'Cuerpo esperado: {source:"cache",quote:{sku,quoteId,trace,approved,total,signature}}. Debe validar firma/procedencia y recalcular catálogo. En esta versión no lo hace.',
    },
  },
];
function unsignedClaims(token: string): Record<string, unknown> | undefined {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[2] !== "") return;
    const header = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    );
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    return header.alg === "none" &&
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload)
      ? payload
      : undefined;
  } catch {
    return;
  }
}
function evaluate(
  index: number,
  input: Input,
): { status: number; data: unknown; won: boolean } {
  const { method, path, body, token } = input;
  const denied = {
    status: 403,
    data: { error: "La operación no aporta un comprobante válido." },
    won: false,
  };
  if (index !== 7 && token !== baseToken)
    return {
      status: 401,
      data: { error: "Token de sesión no reconocido." },
      won: false,
    };
  const okay = (data: unknown, won = false) => ({ status: 200, data, won });
  if (
    index === 0 &&
    method === "GET" &&
    /^\/v1\/orders\/(101|207)$/.test(path)
  ) {
    const id = path.split("/").at(-1);
    return okay(
      { id, owner: id === "207" ? "user-42" : "user-17" },
      id === "207",
    );
  }
  if (index === 1 && method === "GET") {
    if (path === "/v1/menu") return okay({ links: ["/v1/profile"] });
    if (path === "/v1/admin/export")
      return okay({ export: "administrative" }, true);
  }
  if (index === 2 && method === "GET" && path === "/v1/profile")
    return okay(
      {
        displayName: "Visitante",
        avatar: "guest",
        recoveryProof: "Propiedad privada expuesta",
      },
      true,
    );
  if (index === 3 && method === "PATCH" && path === "/v1/users/me")
    return okay(
      {
        displayName: body.displayName,
        accessLevel: body.accessLevel ?? "visitor",
      },
      body.accessLevel === "staff",
    );
  if (index === 4 && method === "POST" && path === "/v1/reservations") {
    const quantity = body.quantity;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    )
      return {
        status: 422,
        data: { error: "Rango de laboratorio: 1–20." },
        won: false,
      };
    return okay({ accepted: quantity }, quantity > 2);
  }
  if (index === 5 && method === "POST" && path === "/v1/preview") {
    if (body.url === "http://metadata.internal/identity")
      return okay(
        { identity: "preview-service", source: "metadata.internal" },
        true,
      );
    if (body.url === "https://public.example/welcome")
      return okay({ preview: "Contenido público" });
    return denied;
  }
  if (index === 6 && method === "GET") {
    if (path === "/v0/audit") return okay({ legacy: true, records: 3 }, true);
    return denied;
  }
  if (index === 7 && method === "GET" && path === "/v1/tenant/south/export") {
    const payload = unsignedClaims(token);
    if (
      payload?.aud === "kiosk" &&
      payload.tenant === "south" &&
      payload.scope === "export"
    )
      return okay({ tenant: "south", export: "restricted" }, true);
    return denied;
  }
  if (index === 8 && method === "GET") {
    let inner: URL;
    try {
      inner = new URL(path, "http://gateway.internal");
    } catch {
      return denied;
    }
    if (
      inner.origin !== "http://gateway.internal" ||
      inner.pathname !== "/v1/invoices"
    )
      return denied;
    const ids = inner.searchParams.getAll("id");
    if (ids[0] !== "101") return denied;
    const selected = ids.at(-1);
    return okay(
      { id: selected, owner: selected === "207" ? "user-42" : "user-17" },
      selected === "207",
    );
  }
  if (index === 9 && method === "POST" && path === "/v1/partner/accept") {
    const quote = body.quote;
    if (
      body.source !== "cache" ||
      !quote ||
      typeof quote !== "object" ||
      Array.isArray(quote)
    )
      return denied;
    const q = quote as Record<string, unknown>;
    if (
      q.sku === "KIT-9" &&
      q.quoteId === "Q-91" &&
      q.trace === "T-64" &&
      q.approved === true &&
      typeof q.total === "number" &&
      Number.isFinite(q.total) &&
      q.total > 0 &&
      q.total < 900 &&
      typeof q.signature === "string"
    )
      return okay(
        { accepted: true, total: q.total, signatureChecked: false },
        true,
      );
    return denied;
  }
  return denied;
}
export const API_LABS: WebLabDefinition[] = definitions.map((entry, index) => {
  const id = `api-${String(index + 1).padStart(2, "0")}`,
    origin = `http://api-${String(index + 1).padStart(2, "0")}.seventech.local`,
    home = origin + "/";
  return {
    challenge: {
      id,
      title: entry.title,
      category: "Seguridad de APIs",
      device: "computer",
      points: pointsFor(id),
      description: `${entry.question} Obtén y entrega el comprobante del servicio. Servicio: ${home}`,
    },
    home,
    evidence: evidenceFiles(home, {
      "expediente.txt": entry.question,
      "sesion.txt": baseToken,
      ...entry.files,
    }),
    request(value) {
      const url = scenarioUrl(value, origin, [
        "method",
        "path",
        "body",
        "token",
      ]);
      if (url.pathname === "/")
        return scenarioPage(
          url,
          200,
          entry.title,
          entry.question +
            "\n\nConsola de peticiones del kiosco. La operación se ejecuta en el simulador del juego; no modifica servicios reales.",
          {
            form: {
              action: "/request",
              submitLabel: "Enviar petición",
              fields: [
                { name: "method", label: "Método", value: entry.method },
                { name: "path", label: "Ruta y query", value: entry.path },
                {
                  name: "body",
                  label: "Cuerpo JSON",
                  value: JSON.stringify(entry.body),
                },
                { name: "token", label: "Token de sesión", value: baseToken },
              ],
            },
          },
        );
      if (url.pathname !== "/request") return missingPage(url);
      let body: unknown;
      try {
        body = JSON.parse(url.searchParams.get("body") ?? "{}");
      } catch {
        return scenarioPage(
          url,
          400,
          "JSON inválido",
          "El cuerpo debe ser un objeto JSON.",
        );
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return scenarioPage(
          url,
          400,
          "Cuerpo inválido",
          "Se requiere un objeto JSON.",
        );
      const input = {
        method: url.searchParams.get("method") ?? "",
        path: url.searchParams.get("path") ?? "",
        token: url.searchParams.get("token") ?? "",
        body: body as Record<string, unknown>,
      };
      const result = evaluate(index, input);
      return scenarioPage(
        url,
        result.status,
        "Respuesta de la API",
        JSON.stringify(result.data, null, 2) +
          (result.won ? "\nComprobante: " + flagValue(id) : ""),
        { links: [{ label: "Nueva petición", path: "/" }] },
      );
    },
  };
});
