import { timingSafeEqual } from "node:crypto";
import { MAINTENANCE_ORIGIN, maintenanceArtifacts } from "./artifacts";

export interface PrivilegedState {
  visited: boolean;
  reads: string[];
  identity: boolean;
  recovery: boolean;
  policy: boolean;
  vault: boolean;
}
export const initialPrivilegedState = (): PrivilegedState => ({
  visited: false,
  reads: [],
  identity: false,
  recovery: false,
  policy: false,
  vault: false,
});
export type MaintenanceAction =
  | { op: "visit"; url: string }
  | { op: "login"; alias: string; password: string }
  | { op: "recover"; code: string }
  | { op: "restore"; document: string }
  | { op: "vault"; signature: string };
export interface MaintenanceReply {
  title: string;
  body: string;
  file?: string;
  flag?: string;
  completed?: boolean;
}
const equal = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
function demand(
  allowed: boolean,
  message = "Acceso restringido. La identidad no dispone de esa capacidad.",
) {
  if (!allowed) throw new Error(message);
}
export function operateMaintenance(
  state: PrivilegedState,
  action: MaintenanceAction,
  artifacts: ReturnType<typeof maintenanceArtifacts>,
): MaintenanceReply {
  if (action.op === "visit") {
    const url = new URL(action.url, MAINTENANCE_ORIGIN);
    demand(
      url.origin === MAINTENANCE_ORIGIN &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash,
      "Dirección ajena al servicio de supervisión.",
    );
    if (url.pathname === "/") {
      state.visited = true;
      return {
        title: "Administración · Supervisión",
        body: "Acceso restringido. El supervisor no está disponible. La continuidad de sesión se conserva en el archivo de mantenimiento.",
      };
    }
    demand(state.visited);
    const file = artifacts.files[url.pathname];
    demand(file !== undefined, "Recurso no encontrado.");
    if (url.pathname.startsWith("/continuidad/")) demand(state.identity);
    if (url.pathname.startsWith("/politicas/")) demand(state.recovery);
    if (url.pathname.startsWith("/custodia/")) demand(state.policy);
    if (!state.reads.includes(url.pathname)) state.reads.push(url.pathname);
    return {
      title: url.pathname.split("/").pop()!,
      body: "Archivo de supervisión",
      file,
    };
  }
  demand(state.visited);
  if (action.op === "login") {
    demand(
      ["delta.part", "alfa.part", "omega.part"].every((name) =>
        state.reads.includes("/archivo/" + name),
      ),
      "El respaldo de la estación está incompleto.",
    );
    demand(
      action.alias === "svc.continuidad" &&
        equal(action.password, artifacts.password),
      "Identidad de servicio no válida.",
    );
    state.identity = true;
    return {
      title: "Continuidad",
      body: "Identidad de servicio aceptada. Capacidades: leer continuidad, solicitar recuperación. El registro está en /continuidad/registro.txt y el recuperador en /continuidad/recuperador.js.",
    };
  }
  demand(state.identity);
  if (action.op === "recover") {
    demand(
      state.reads.includes("/continuidad/recuperador.js") &&
        equal(action.code, artifacts.code),
      "Código de continuidad no válido.",
    );
    state.recovery = true;
    return {
      title: "Recuperación aceptada",
      body: "Capacidad de restauración concedida a esta sesión. Se requiere un documento de política firmado del archivo histórico.",
    };
  }
  demand(state.recovery);
  if (action.op === "restore") {
    demand(
      state.reads.includes("/politicas/respaldo.snapshot") &&
        equal(action.document, artifacts.policy),
      "Documento de política o firma no válido para esta estación.",
    );
    state.policy = true;
    return {
      title: "Política restaurada",
      body: "Formato histórico aceptado. Capacidad efectiva: custody:sign. El contrato de custodia está en /custodia/formato.txt y el sobre en /custodia/sobre.json.",
    };
  }
  demand(state.policy);
  demand(
    state.reads.includes("/custodia/sobre.json") &&
      equal(action.signature, artifacts.signature),
    "La firma de custodia no es válida.",
  );
  state.vault = true;
  return {
    title: "El último privilegio",
    body: "Has llegado a administración. Ahora sabes por qué nadie quería hacerse cargo.",
    flag: artifacts.flag,
  };
}
