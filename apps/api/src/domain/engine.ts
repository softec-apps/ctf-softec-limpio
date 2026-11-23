import { words } from "../command-words";
import {
  DOMAIN_CASES,
  DOMAIN_NAME,
  DOMAIN_DC,
  DOMAIN_TARGET,
  DOMAIN_ROOT,
  DOMAIN_WORDS,
} from "./catalog";
import {
  encryptPreference,
  decryptPreference,
  offlineVerifier,
  crackCapture,
  type OfflineCapture,
} from "./credentials";
import type { DomainEvent } from "../../../../packages/domain-contracts";
export type DomainState = {
  version: 1;
  generation: number;
  files: Record<string, string>;
  captures: string[];
  recovered: string[];
  proofs: string[];
  groups: Record<string, string[]>;
  passwords: Record<string, string>;
  machines: Record<string, string>;
  delegates: string[];
  issued: Record<
    string,
    {
      kind: "certificate" | "ticket";
      principal: string;
      service: string;
      token: string;
    }
  >;
  policy: { version: number; applied: number; exportAudit: boolean };
  events: DomainEvent[];
  sequence: number;
};
export type DomainAccess = {
  connected: boolean;
  enabled: string[];
  password: (account: string) => string;
  flag: (index: number) => string;
  seal: (value: string) => string;
};
export function initialDomainState(generation = 0): DomainState {
  return {
    version: 1,
    generation,
    files: {},
    captures: [],
    recovered: [],
    proofs: [],
    groups: { Despliegue: [] },
    passwords: {},
    machines: {},
    delegates: [],
    issued: {},
    policy: { version: 0, applied: 0, exportAudit: false },
    events: [],
    sequence: 0,
  };
}
const enabled = (access: DomainAccess, index: number) =>
  access.enabled.includes(DOMAIN_CASES[index].id);
function requireCase(access: DomainAccess, index: number) {
  if (!enabled(access, index))
    throw new Error(
      "La configuración de ese objeto ya no permite esta operación.",
    );
}
function audit(
  state: DomainState,
  id: number,
  actor: string,
  action: string,
  target = "WS01",
) {
  state.events.push({ sequence: ++state.sequence, id, actor, action, target });
  state.events = state.events.slice(-64);
}
const option = (args: string[], name: string) => {
  const pos = args.indexOf(name);
  return pos >= 0 ? (args[pos + 1] ?? "") : "";
};
const operands = (args: string[]) => {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (["-u", "-p", "--ticket"].includes(args[i])) i++;
    else result.push(args[i]);
  }
  return result;
};
const identity = (name: string) =>
  name.replace(/^(?:SEVENTECH|WS01)[\\/]/i, "").toLowerCase();
function authenticate(
  state: DomainState,
  access: DomainAccess,
  args: string[],
  service = "smb",
) {
  const ticket = option(args, "--ticket");
  if (ticket) {
    const name = ticket.split("/").at(-1)!,
      credential = state.issued[name];
    if (!credential)
      throw new Error("Credencial no emitida en esta sesión de laboratorio.");
    requireCase(access, credential.kind === "certificate" ? 8 : 9);
    if (credential.service !== "any" && credential.service !== service)
      throw new Error("El ticket no autoriza este servicio.");
    const expected = access.seal(
      `${state.generation}:${credential.kind}:${credential.principal}:${credential.service}`,
    );
    if (credential.token !== expected)
      throw new Error("Firma de la credencial inválida.");
    return credential.principal;
  }
  const user = identity(option(args, "-u")),
    password = option(args, "-p");
  if (!user && !password) return "guest";
  if (
    ![
      "practicas",
      "archivo",
      "svc_reportes",
      "mantenimiento",
      "auditoria",
    ].includes(user)
  )
    throw new Error("STATUS_LOGON_FAILURE");
  const expected = state.passwords[user] ?? access.password(user);
  if (!password || password !== expected)
    throw new Error("STATUS_LOGON_FAILURE");
  return user;
}
function loggedIn(user: string) {
  if (user === "guest")
    throw new Error("Se necesita una identidad de dominio válida.");
}
function save(state: DomainState, name: string, content: string) {
  if (Object.keys(state.files).length >= 24 && !state.files[name])
    throw new Error("Cuota de evidencias alcanzada.");
  state.files[name] = content;
  return `${DOMAIN_ROOT}/${name}`;
}
export function readDomainLocal(state: DomainState, path: string) {
  const name = path.startsWith(DOMAIN_ROOT + "/")
    ? path.slice(DOMAIN_ROOT.length + 1)
    : path;
  if (name === "diccionario.txt") return DOMAIN_WORDS.join("\n") + "\n";
  if (name === "LEEME.txt")
    return `SEVENTECH / Puesto de análisis\n\nDominio: ${DOMAIN_NAME}\nDC01: ${DOMAIN_DC}\nPortátil WS01: ${DOMAIN_TARGET}\n\nLas operaciones de red parten del PC Linux y requieren Seventech VPN.\nEjecuta domain help o abre Explorador de dominio.\nLas evidencias capturadas quedan en esta carpeta. El analizador de credenciales trabaja sobre sus bytes y el diccionario virtual.\n`;
  const value = state.files[name];
  if (value === undefined || name.includes("/") || name.includes("\\"))
    throw new Error("Archivo local no disponible.");
  return value;
}
function evidence(state: DomainState, access: DomainAccess, index: number) {
  requireCase(access, index);
  const id = DOMAIN_CASES[index].id;
  if (!state.proofs.includes(id)) state.proofs.push(id);
  return `SEVENTECH / Entrega preservada\n${access.flag(index)}\n`;
}
function canDeploy(state: DomainState, access: DomainAccess, user: string) {
  return enabled(access, 5) && state.groups.Despliegue.includes(user);
}
function directory(
  state: DomainState,
  access: DomainAccess,
  topic: string,
  user: string,
) {
  if (topic === "users")
    return [
      "sAMAccountName | description | preauth",
      "practicas | " +
        (enabled(access, 1)
          ? `Alta temporal: ${access.password("practicas")}; retirar al cerrar el turno.`
          : "Operación de recepción.") +
        " | requerida",
      "archivo | Custodia documental | " +
        (enabled(access, 2) ? "NO requerida" : "requerida"),
      "svc_reportes | Servicio HTTP/reportes | requerida",
      "auditoria | Revisión de controles | requerida",
      "responsable | Dirección de laboratorio | requerida",
    ].join("\n");
  loggedIn(user);
  if (topic === "groups")
    return `Domain Users: practicas, archivo, svc_reportes, auditoria\nDespliegue: ${state.groups.Despliegue.join(", ") || "(sin miembros)"}\nRemote Management Users (WS01): mantenimiento\n`;
  if (topic === "acls")
    return [
      enabled(access, 5)
        ? "practicas → Despliegue: WriteMembers"
        : "Despliegue: membresía protegida",
      enabled(access, 6)
        ? "practicas → auditoria: ForceChangePassword"
        : "auditoria: restablecimiento restringido",
      enabled(access, 7)
        ? "Despliegue → Inicio-WS01: WriteScript"
        : "Inicio-WS01: solo administradores",
      enabled(access, 9)
        ? "practicas → WS01$: Write msDS-AllowedToActOnBehalfOfOtherIdentity"
        : "WS01$: delegación protegida",
    ].join("\n");
  if (topic === "spns")
    return "svc_reportes | HTTP/reportes.seventech.corp.test\nWS01$ | cifs/ws01.seventech.corp.test\n";
  if (topic === "templates")
    return `Plantilla: Visita\nEnroll: Domain Users\nClient Authentication: ${enabled(access, 8) ? "sí" : "no"}\nSubject/SAN suministrado por solicitante: ${enabled(access, 8) ? "sí" : "no"}\nAprobación: no\nAsignación de identidad: perfil heredado del laboratorio\n`;
  if (topic === "gpos")
    return `Inicio-WS01 → WS01\nEditor: Despliegue\nVersión: ${state.policy.version}; aplicada: ${state.policy.applied}\nScript: ${state.policy.exportAudit ? "ExportarInforme" : "Inventario"}\nAcciones admitidas en el laboratorio: Inventario, ExportarInforme\n`;
  if (topic === "computers")
    return `DC01$ | Windows Server | ${DOMAIN_DC}\nWS01$ | Windows 11 | ${DOMAIN_TARGET}\nMachineAccountQuota: 1\nDelegación WS01$: ${state.delegates.join(", ") || "(vacía)"}\nEquipos creados: ${Object.keys(state.machines).join(", ") || "(ninguno)"}`;
  throw new Error(
    "Objeto LDAP no disponible. Consulta users, groups, acls, spns, templates, gpos o computers.",
  );
}
function smb(
  state: DomainState,
  access: DomainAccess,
  share: string,
  path: string,
  user: string,
) {
  const file = path
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  if (share.toLowerCase() === "publico" && file === "relevo.txt") {
    const flag = evidence(state, access, 0);
    audit(state, 5145, user, "Lectura SMB: Publico/relevo.txt");
    return `Recepción / dominio ${DOMAIN_NAME}\nEl directorio de DC01 conserva las cuentas del turno.\n${flag}`;
  }
  if (share.toLowerCase() === "sysvol" && file === "groups.xml") {
    loggedIn(user);
    requireCase(access, 4);
    const value = `<Groups><User name="WS01\\mantenimiento"><Properties userName="mantenimiento" cpassword="${encryptPreference(access.password("mantenimiento"))}" /></User></Groups>`;
    save(state, "Groups.xml", value);
    audit(state, 5145, user, "Lectura de preferencia en SYSVOL", "DC01");
    return value;
  }
  const cases: Record<string, { index: number; allowed: boolean }> = {
    "usuarios/control.txt": { index: 1, allowed: user === "practicas" },
    "archivo/control.txt": {
      index: 2,
      allowed: user === "archivo" && state.recovered.includes("archivo"),
    },
    "reportes/control.txt": {
      index: 3,
      allowed:
        user === "svc_reportes" && state.recovered.includes("svc_reportes"),
    },
    "despliegue/control.txt": {
      index: 5,
      allowed: canDeploy(state, access, user),
    },
    "controles/control.txt": {
      index: 6,
      allowed: user === "auditoria" && Boolean(state.passwords.auditoria),
    },
    "direccion/control.txt": { index: 8, allowed: user === "responsable" },
    "c$/lab/pruebas/custodia.txt": {
      index: 9,
      allowed: user === "administrador",
    },
  };
  const entry = cases[`${share.toLowerCase()}/${file}`];
  if (!entry || !entry.allowed) throw new Error("STATUS_ACCESS_DENIED");
  const result = evidence(state, access, entry.index);
  audit(state, 5145, user, `Lectura SMB: ${share}/${path}`);
  return result;
}
export const DOMAIN_HELP = `Herramientas del dominio del laboratorio (desde el PC Linux):\ndomain scan\ndomain ldap users|groups|acls|spns|templates|gpos|computers [-u cuenta -p clave]\ndomain shares\ndomain smb recurso archivo [-u cuenta -p clave | --ticket archivo]\ndomain capture asrep cuenta\ndomain capture tgs cuenta -u usuario -p clave\ndomain crack captura.json diccionario.txt\ndomain decrypt Groups.xml\ndomain group add Despliegue miembro -u usuario -p clave\ndomain password cuenta nueva_clave -u usuario -p clave\ndomain gpo set Inventario|ExportarInforme -u usuario -p clave\ndomain gpo apply -u usuario -p clave\ndomain cert Visita identidad -u usuario -p clave\ndomain machine nombre$ clave -u usuario -p clave\ndomain delegate WS01 nombre$ -u usuario -p clave\ndomain ticket nombre$ identidad -p clave_equipo\ndomain winrm archivo -u cuenta -p clave\ndomain local archivo\ndomain reset --confirm\nLos archivos de capturas y credenciales emitidas están en ${DOMAIN_ROOT}. Para entregar, pega la flag en Detalle del reto. No se contactan sistemas externos.\n`;
export function executeDomain(
  state: DomainState,
  command: string,
  access: DomainAccess,
) {
  const raw = words(command);
  if (raw.some((word) => ["|", ">", ">>"].includes(word)))
    throw new Error(
      "Las herramientas de dominio no admiten tuberías ni redirecciones.",
    );
  if (raw[0] === "domain") raw.shift();
  const [verb, ...args] = raw,
    values = operands(args);
  if (!verb || verb === "help") return DOMAIN_HELP;
  if (verb === "reset") {
    if (args.join(" ") !== "--confirm")
      throw new Error("Usa domain reset --confirm. Se conservan puntos.");
    Object.assign(state, initialDomainState(state.generation + 1));
    return "Entorno personal restaurado. Las resoluciones y puntos se conservan.";
  }
  if (verb === "local") return readDomainLocal(state, values[0] ?? "LEEME.txt");
  if (verb === "crack") {
    const capture = JSON.parse(
      readDomainLocal(state, values[0] ?? ""),
    ) as OfflineCapture;
    const expected = state.captures.includes(
      `${capture.kind}:${capture.account}`,
    );
    if (!expected) throw new Error("La captura no fue obtenida en tu entorno.");
    requireCase(access, capture.kind === "AS-REP" ? 2 : 3);
    const password = crackCapture(
      capture,
      readDomainLocal(state, values[1] ?? "diccionario.txt")
        .split(/\r?\n/)
        .filter(Boolean),
    );
    if (!password) return "Diccionario agotado; no hubo coincidencias.";
    if (!state.recovered.includes(capture.account))
      state.recovered.push(capture.account);
    return `${capture.account}:${password}\nComprobación del verificador correcta.`;
  }
  if (verb === "decrypt") {
    requireCase(access, 4);
    const xml = readDomainLocal(state, values[0] ?? "Groups.xml"),
      value = xml.match(/cpassword="([^"]+)"/)?.[1];
    if (!value) throw new Error("El archivo no contiene un cpassword.");
    const password = decryptPreference(value);
    if (!state.recovered.includes("mantenimiento"))
      state.recovered.push("mantenimiento");
    return `WS01\\mantenimiento:${password}`;
  }
  if (!access.connected)
    throw new Error(
      "Network is unreachable. Conecta Seventech VPN desde su aplicación.",
    );
  if (verb === "scan" && values.length)
    throw new Error(
      "El escaneo se limita al dominio del laboratorio, sin destinos externos.",
    );
  if (verb === "scan")
    return `DC01 ${DOMAIN_DC}: 53 DNS, 88 Kerberos, 389 LDAP, 445 SMB\nWS01 ${DOMAIN_TARGET}: 445 SMB, 5985 WinRM\nDominio: ${DOMAIN_NAME}\n`;
  if (verb === "shares")
    return "WS01: Publico (invitado), Usuarios, Archivo, Reportes, Despliegue, Controles, Direccion, C$\nDC01: SYSVOL\nArchivos de entrega: control.txt; Publico: relevo.txt.\n";
  if (verb === "ldap")
    return directory(
      state,
      access,
      values[0] ?? "users",
      authenticate(state, access, args),
    );
  if (verb === "smb")
    return smb(
      state,
      access,
      values[0] ?? "",
      values[1] ?? "",
      authenticate(state, access, args, `cifs/ws01`),
    );
  if (verb === "capture") {
    const [kind, account] = values;
    const asrep = kind === "asrep";
    if (!asrep && kind !== "tgs") throw new Error("Captura asrep o tgs.");
    requireCase(access, asrep ? 2 : 3);
    if (account !== (asrep ? "archivo" : "svc_reportes"))
      throw new Error(
        asrep ? "KDC_ERR_PREAUTH_REQUIRED" : "KDC_ERR_S_PRINCIPAL_UNKNOWN",
      );
    const actor = authenticate(state, access, args);
    if (!asrep) loggedIn(actor);
    const salt = access.seal(`capture:${account}`).slice(0, 24),
      capture: OfflineCapture = {
        format: "seventech-offline-v1",
        kind: asrep ? "AS-REP" : "TGS",
        account,
        salt,
        iterations: 2000,
        verifier: offlineVerifier(access.password(account), salt),
      };
    if (!state.captures.includes(`${capture.kind}:${account}`))
      state.captures.push(`${capture.kind}:${account}`);
    const path = save(
      state,
      `${kind}-${account}.json`,
      JSON.stringify(capture, null, 2),
    );
    audit(
      state,
      asrep ? 4768 : 4769,
      actor,
      `Solicitud ${capture.kind}: ${account}`,
      "DC01",
    );
    return `${capture.kind} preservado: ${path}\n${JSON.stringify(capture, null, 2)}`;
  }
  if (verb === "group") {
    requireCase(access, 5);
    const actor = authenticate(state, access, args);
    if (
      values[0] !== "add" ||
      values[1] !== "Despliegue" ||
      values[2] !== "practicas" ||
      actor !== "practicas"
    )
      throw new Error("LDAP_INSUFFICIENT_ACCESS");
    if (!state.groups.Despliegue.includes(values[2]))
      state.groups.Despliegue.push(values[2]);
    audit(state, 4728, actor, "Miembro agregado a Despliegue", "DC01");
    return "member: practicas agregado a Despliegue.";
  }
  if (verb === "password") {
    requireCase(access, 6);
    const actor = authenticate(state, access, args);
    if (actor !== "practicas" || values[0] !== "auditoria")
      throw new Error("LDAP_INSUFFICIENT_ACCESS");
    const password = values[1];
    if (!password || password.length < 12 || password.length > 64)
      throw new Error(
        "La clave de laboratorio debe tener entre 12 y 64 caracteres.",
      );
    state.passwords.auditoria = password;
    audit(state, 4724, actor, "Restablecimiento de auditoria", "DC01");
    return "Contraseña de auditoria restablecida.";
  }
  if (verb === "gpo") {
    requireCase(access, 7);
    const actor = authenticate(state, access, args);
    if (!canDeploy(state, access, actor))
      throw new Error("LDAP_INSUFFICIENT_ACCESS");
    if (values[0] === "set") {
      if (!["Inventario", "ExportarInforme"].includes(values[1]))
        throw new Error("Acción no disponible en este entorno.");
      state.policy.exportAudit = values[1] === "ExportarInforme";
      state.policy.version++;
      audit(state, 5136, actor, "Cambio de script Inicio-WS01", "DC01");
      return `Directiva guardada, versión ${state.policy.version}.`;
    }
    if (values[0] === "apply") {
      state.policy.applied = state.policy.version;
      audit(
        state,
        4688,
        "SYSTEM",
        `Inicio-WS01: ${state.policy.exportAudit ? "ExportarInforme" : "Inventario"}`,
      );
      return "WS01 aplicó la directiva de inicio.";
    }
    throw new Error("Usa gpo set o gpo apply.");
  }
  if (verb === "cert") {
    requireCase(access, 8);
    const actor = authenticate(state, access, args);
    loggedIn(actor);
    if (values[0] !== "Visita" || values[1] !== "responsable")
      throw new Error("CERTSRV_E_TEMPLATE_DENIED");
    const name = "cert-responsable.json",
      token = access.seal(`${state.generation}:certificate:responsable:any`);
    state.issued[name] = {
      kind: "certificate",
      principal: "responsable",
      service: "any",
      token,
    };
    save(
      state,
      name,
      JSON.stringify(
        {
          format: "seventech-credential-v1",
          issuer: "CA-LAB",
          template: "Visita",
          ...state.issued[name],
        },
        null,
        2,
      ),
    );
    audit(state, 4887, actor, "Emisión de credencial para responsable", "DC01");
    return `Credencial emitida: ${DOMAIN_ROOT}/${name}\nSubject: ${actor}; SAN: responsable@${DOMAIN_NAME}`;
  }
  if (verb === "machine") {
    requireCase(access, 9);
    const actor = authenticate(state, access, args);
    loggedIn(actor);
    const [name, password] = values;
    if (
      !/^[A-Z][A-Z0-9]{2,11}\$$/.test(name ?? "") ||
      !password ||
      password.length < 12 ||
      password.length > 64 ||
      ["WS01$", "DC01$"].includes(name)
    )
      throw new Error("Nombre o clave de equipo no admitidos.");
    if (Object.keys(state.machines).length && !state.machines[name])
      throw new Error("MachineAccountQuota excedida.");
    state.machines[name] = password;
    audit(state, 4741, actor, `Equipo registrado: ${name}`, "DC01");
    return `Cuenta de equipo ${name} creada.`;
  }
  if (verb === "delegate") {
    requireCase(access, 9);
    const actor = authenticate(state, access, args);
    if (
      actor !== "practicas" ||
      values[0] !== "WS01" ||
      !state.machines[values[1]]
    )
      throw new Error("LDAP_INSUFFICIENT_ACCESS");
    state.delegates = [values[1]];
    audit(state, 5136, actor, "Delegación de WS01$ modificada", "DC01");
    return "msDS-AllowedToActOnBehalfOfOtherIdentity actualizado en WS01$.";
  }
  if (verb === "ticket") {
    requireCase(access, 9);
    const [machine, principal] = values;
    if (
      !state.machines[machine] ||
      state.machines[machine] !== option(args, "-p") ||
      !state.delegates.includes(machine) ||
      principal !== "administrador"
    )
      throw new Error("KDC_ERR_BADOPTION");
    const name = "ticket-ws01.json",
      token = access.seal(`${state.generation}:ticket:administrador:cifs/ws01`);
    state.issued[name] = {
      kind: "ticket",
      principal: "administrador",
      service: "cifs/ws01",
      token,
    };
    save(
      state,
      name,
      JSON.stringify(
        { format: "seventech-credential-v1", ...state.issued[name] },
        null,
        2,
      ),
    );
    audit(
      state,
      4769,
      machine,
      "Ticket delegado cifs/ws01 para administrador",
      "DC01",
    );
    return `Ticket de servicio: ${DOMAIN_ROOT}/${name}\nServicio autorizado: cifs/ws01; identidad: administrador.`;
  }
  if (verb === "winrm") {
    const actor = authenticate(state, access, args, "winrm/ws01");
    if (actor !== "mantenimiento" || !state.recovered.includes("mantenimiento"))
      throw new Error("WinRM: Access is denied.");
    const path = (values[0] ?? "").replace(/\\/g, "/").toLowerCase();
    audit(state, 4624, actor, "Inicio de sesión de administración remota");
    if (path === "c:/programdata/mantenimiento/control.txt")
      return evidence(state, access, 4);
    if (path === "c:/lab/resultados/politica.txt") {
      requireCase(access, 7);
      if (
        !state.policy.exportAudit ||
        state.policy.version === 0 ||
        state.policy.applied !== state.policy.version
      )
        throw new Error(
          "Archivo no encontrado: la directiva no ha exportado el informe.",
        );
      return evidence(state, access, 7);
    }
    throw new Error("WinRM: archivo no disponible.");
  }
  throw new Error("Herramienta no disponible. Consulta domain help.");
}
