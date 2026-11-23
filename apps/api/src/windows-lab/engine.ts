import { WINDOWS_HOSTS } from "./catalog";
import type {
  WindowsLabEvent,
  WindowsLabView,
} from "../../../../packages/windows-contracts";

type VirtualFile = {
  content: string;
  readers: string[];
  writers: string[];
  template?: boolean;
  evidence?: boolean;
};
type WindowsService = {
  path: string;
  account: string;
  running: boolean;
  configurable: boolean;
  startable: boolean;
};
type HostState = {
  files: Record<string, VirtualFile>;
  writableDirectories: string[];
  services: Record<string, WindowsService>;
  taskScript: string | null;
  taskRunning: boolean;
};
export type WindowsState = {
  version: 1;
  host: string | null;
  session: {
    principal: string;
    cwd: string;
    source: "local" | "remote";
    transport: "console" | "winrm";
  } | null;
  pending: { account: string; host: string; source: "local" | "remote" } | null;
  hosts: Record<string, HostState>;
  proofs: string[];
  events: WindowsLabEvent[];
  sequence: number;
};
export type WindowsAccess = {
  connected: boolean;
  enabled: string[];
  flag: (index: number) => string;
  password: (account: string) => string;
};
const PROOF = "C:\\Evidence\\proof.txt";
const SYSTEM = "nt authority\\system";
const SHELL_MARKER = "SEVENTECH_LAB_SHELL_V1";
const SCRIPT_MARKER = "cmd.exe";
const key = (value: string) => value.toLowerCase();
const file = (
  content: string,
  readers = ["everyone"],
  writers: string[] = [],
): VirtualFile => ({ content, readers, writers });

function initialHost(index: number): HostState {
  const files: Record<string, VirtualFile> = {};
  const put = (path: string, entry: VirtualFile) => {
    files[key(path)] = {
      ...entry,
      template: true,
      evidence: key(path) === key(PROOF),
    };
  };
  const reader =
    index === 0
      ? "everyone"
      : index === 1
        ? "mantenimiento"
        : index === 2
          ? "operador"
          : index === 3
            ? "soporte"
            : SYSTEM;
  put(PROOF, file("{{flag}}", [reader, SYSTEM]));
  put("C:\\Tools\\shell.exe", file(SHELL_MARKER));
  put("C:\\Tools\\shell.ps1", file(SCRIPT_MARKER));
  put(
    "C:\\Tools\\LEEME.txt",
    file(
      "Herramientas inertes del laboratorio. shell.exe representa un programa que abre una consola con el token del proceso que lo ejecuta. shell.ps1 contiene cmd.exe. Se pueden copiar a ubicaciones cuyo ACL permita escritura. Solo se interpretan estos formatos didácticos; no se ejecuta código del anfitrión.",
    ),
  );
  put(
    "C:\\Users\\analista\\Desktop\\notas.txt",
    file(
      "Laboratorio Windows independiente. Enumera C:\\, servicios, tareas, ACL y privilegios. El acceso remoto inicial es una cuenta local de práctica, no pertenece a Active Directory. La evidencia está en C:\\Evidence\\proof.txt; solo una lectura autorizada acredita la operación.",
    ),
  );
  if (index === 1)
    put(
      "C:\\Windows\\Panther\\unattend.xml",
      file(
        "<unattend><LocalAccount><Name>mantenimiento</Name><Password><Value>{{password:mantenimiento}}</Value><PlainText>true</PlainText></Password></LocalAccount></unattend>",
      ),
    );
  if (index === 3)
    put(
      "C:\\Users\\analista\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt",
      file("winrm -i {{ip}} -u soporte -p {{password:soporte}}\nGet-Service"),
    );
  const services: Record<string, WindowsService> = {};
  const writableDirectories = [key("C:\\Temp"), key("C:\\Users\\analista")];
  const service = (
    name: string,
    path: string,
    account = SYSTEM,
    configurable = false,
  ) => {
    services[name] = {
      path,
      account,
      running: false,
      configurable,
      startable: true,
    };
  };
  if (index === 4) {
    service("BackupAgent", '"C:\\ProgramData\\BackupAgent\\agent.exe"');
    put(
      "C:\\ProgramData\\BackupAgent\\agent.exe",
      file("BACKUP_AGENT_ORIGINAL", ["everyone"], ["analista"]),
    );
  }
  if (index === 5) {
    service("Indexador", "C:\\Apps\\North Tools\\Index Agent\\agent.exe");
    put(
      "C:\\Apps\\North Tools\\Index Agent\\agent.exe",
      file("INDEXER_ORIGINAL"),
    );
    writableDirectories.push(key("C:\\Apps"));
  }
  let taskScript: string | null = null;
  if (index === 6) {
    taskScript = "C:\\ProgramData\\Cierre\\cierre.ps1";
    put(
      taskScript,
      file("Write-Output 'Cierre completado'", ["everyone"], ["analista"]),
    );
  }
  if (index === 7) {
    service(
      "Inventario",
      '"C:\\Program Files\\Inventario\\agent.exe"',
      SYSTEM,
      true,
    );
    put("C:\\Program Files\\Inventario\\agent.exe", file("INVENTORY_ORIGINAL"));
  }
  if (index === 9) {
    service("WebWorker", '"C:\\ProgramData\\WebWorker\\worker.exe"', "svc_web");
    put(
      "C:\\ProgramData\\WebWorker\\worker.exe",
      file("WEB_WORKER_ORIGINAL", ["everyone"], ["analista"]),
    );
    services.Spooler = {
      path: "C:\\Windows\\System32\\spoolsv.exe",
      account: SYSTEM,
      running: true,
      configurable: false,
      startable: false,
    };
    put("C:\\Tools\\PrintSpoofer.exe", file("SEVENTECH_LAB_IMPERSONATION_V1"));
  }
  return {
    files,
    writableDirectories,
    services,
    taskScript,
    taskRunning: false,
  };
}
export function initialWindowsState(): WindowsState {
  return {
    version: 1,
    host: null,
    session: null,
    pending: null,
    hosts: Object.fromEntries(
      WINDOWS_HOSTS.map((host, index) => [host.name, initialHost(index)]),
    ),
    proofs: [],
    events: [],
    sequence: 0,
  };
}
function target(state: WindowsState) {
  const host = WINDOWS_HOSTS.find((entry) => entry.name === state.host);
  if (!host)
    throw new Error("Selecciona un equipo con connect IP o target WIN01.");
  return host;
}
function requireEnabled(state: WindowsState, access: WindowsAccess) {
  const host = target(state);
  if (!access.enabled.includes(host.id))
    throw new Error("Ese equipo no está disponible en la competencia.");
  return host;
}
function audit(state: WindowsState, eventId: number, action: string) {
  state.events.push({
    sequence: ++state.sequence,
    id: eventId,
    actor: state.session?.principal ?? "anonymous",
    action,
    target: state.host ?? "Windows",
  });
  state.events = state.events.slice(-64);
}
function secret(access: WindowsAccess, host: string, account: string) {
  return access.password(
    account === "analista" ? "analista" : `${host}\\${account}`,
  );
}
function normalizeAccount(account: string) {
  return account.replace(/^(?:WIN\d\d|\.)[\\/]/i, "").toLowerCase();
}
function nativeTokens(command: string): string[] {
  const result: string[] = [];
  let value = "",
    quote = "",
    started = false;
  for (const char of command) {
    if (quote) {
      if (char === quote) quote = "";
      else value += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) result.push(value);
      value = "";
      started = false;
    } else if (char === ">") {
      if (started) result.push(value);
      result.push(char);
      value = "";
      started = false;
    } else {
      value += char;
      started = true;
    }
  }
  if (quote) throw new Error("Comillas sin cerrar.");
  if (started) result.push(value);
  return result;
}
function option(tokens: string[], name: string) {
  const pos = tokens.findIndex(
    (token) => token.toLowerCase() === name.toLowerCase(),
  );
  return pos < 0 ? "" : (tokens[pos + 1] ?? "");
}
function pathFor(state: WindowsState, raw: string): string {
  if (!raw || /[\0<>"|?*]/.test(raw) || /^(?:\\\\|\\\?)/.test(raw))
    throw new Error("Usa una ruta del disco virtual C:.");
  const value = raw.replace(/\//g, "\\");
  const cwd = state.session?.cwd ?? "C:\\";
  const combined = /^c:\\/i.test(value)
    ? value
    : value.startsWith("\\")
      ? `C:${value}`
      : `${cwd.replace(/\\$/, "")}\\${value}`;
  if (!/^c:\\/i.test(combined) || combined.slice(2).includes(":"))
    throw new Error("Solo se admite el disco virtual C:.");
  const parts: string[] = [];
  for (const part of combined.slice(3).split("\\")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) throw new Error("La ruta sale del disco C:.");
      parts.pop();
    } else parts.push(part);
  }
  return "C:\\" + parts.join("\\");
}
function hostState(state: WindowsState) {
  return state.hosts[target(state).name];
}
function principal(state: WindowsState) {
  if (!state.session)
    throw new Error(
      "Sin sesión autenticada. Usa winrm -i IP -u cuenta -p clave.",
    );
  return state.session.principal;
}
function privileged(state: WindowsState) {
  return principal(state) === SYSTEM;
}
function canRead(state: WindowsState, entry: VirtualFile) {
  return (
    privileged(state) ||
    entry.readers.includes("everyone") ||
    entry.readers.includes(principal(state))
  );
}
function canWrite(state: WindowsState, path: string) {
  const host = hostState(state),
    actor = principal(state),
    entry = host.files[key(path)];
  if (privileged(state)) return true;
  if (entry)
    return entry.writers.includes(actor) || entry.writers.includes("everyone");
  return host.writableDirectories.some((directory) =>
    key(path).startsWith(directory + "\\"),
  );
}
function replaceMarkers(
  state: WindowsState,
  content: string,
  access: WindowsAccess,
) {
  const host = target(state);
  return content
    .replace(/\{\{password:([^}]+)\}\}/g, (_, account: string) =>
      secret(access, host.name, account),
    )
    .replaceAll("{{ip}}", host.ip);
}
function readFile(
  state: WindowsState,
  rawPath: string,
  access: WindowsAccess,
): string {
  const path = pathFor(state, rawPath),
    entry = hostState(state).files[key(path)];
  if (!entry)
    throw new Error("El sistema no puede encontrar el archivo especificado.");
  if (!canRead(state, entry))
    throw new Error(
      "Acceso denegado: la identidad actual no tiene permiso de lectura.",
    );
  const host = requireEnabled(state, access);
  if (entry.evidence && entry.content.includes("{{flag}}")) {
    if (!state.proofs.includes(host.id)) state.proofs.push(host.id);
    audit(state, 4663, "Lectura autorizada de evidencia");
    return entry.content.replaceAll(
      "{{flag}}",
      access.flag(WINDOWS_HOSTS.indexOf(host)),
    );
  }
  return entry.template
    ? replaceMarkers(state, entry.content, access)
    : entry.content;
}
function writeFile(
  state: WindowsState,
  rawPath: string,
  content: string,
  origin?: VirtualFile,
) {
  const path = pathFor(state, rawPath),
    host = hostState(state);
  if (!canWrite(state, path))
    throw new Error(
      "Acceso denegado: el archivo o su directorio no permite escritura.",
    );
  const existing = host.files[key(path)];
  if (!existing && Object.keys(host.files).length >= 96)
    throw new Error(
      "Cuota de archivos alcanzada. Usa reset --confirm para restaurar este equipo.",
    );
  const written = existing
    ? { ...existing, content }
    : file(content, [principal(state), SYSTEM], [principal(state)]);
  host.files[key(path)] = {
    ...written,
    template: origin?.template === true,
    evidence: origin?.evidence === true,
  };
  audit(state, 4663, "Escritura de archivo virtual");
}
function directories(host: HostState) {
  const result = new Set([
    key("C:\\"),
    key("C:\\Temp"),
    key("C:\\Users\\analista"),
  ]);
  for (const path of Object.keys(host.files)) {
    const parts = path.split("\\");
    for (let i = 1; i < parts.length; i++)
      result.add(i === 1 ? "c:\\" : parts.slice(0, i).join("\\"));
  }
  return result;
}
function listDirectory(state: WindowsState, rawPath: string) {
  const path = pathFor(state, rawPath),
    host = hostState(state),
    location = key(path);
  if (host.files[location]) return location;
  if (!directories(host).has(location))
    throw new Error("El sistema no puede encontrar la ruta especificada.");
  const prefix = location.endsWith("\\") ? location : location + "\\";
  const entries = new Set<string>();
  for (const entry of [...directories(host), ...Object.keys(host.files)]) {
    if (!entry.startsWith(prefix) || entry === location) continue;
    const suffix = entry.slice(prefix.length),
      first = suffix.split("\\")[0];
    if (first)
      entries.add(
        (suffix.includes("\\") || directories(host).has(entry)
          ? "<DIR> "
          : "      ") + first,
      );
  }
  return `Directorio de ${path}\n` + [...entries].sort().join("\n");
}
function serviceByName(state: WindowsState, rawName: string) {
  const match = Object.entries(hostState(state).services).find(
    ([name]) => name.toLowerCase() === rawName.toLowerCase(),
  );
  if (!match)
    throw new Error("[SC] OpenService ERROR 1060: El servicio no existe.");
  return { name: match[0], service: match[1] };
}
function serviceExecutable(service: WindowsService, host: HostState) {
  if (service.path.startsWith('"')) return service.path.slice(1).split('"')[0];
  // CreateProcess tests the executable prefix at each space before the full path.
  for (let index = 0; index < service.path.length; index++) {
    if (service.path[index] !== " ") continue;
    const candidate = service.path.slice(0, index) + ".exe";
    if (host.files[key(candidate)]) return candidate;
  }
  return service.path;
}
function startService(state: WindowsState, name: string) {
  const found = serviceByName(state, name),
    service = found.service;
  if (!service.startable && !privileged(state))
    throw new Error("[SC] StartService ERROR 5: Acceso denegado.");
  if (service.running)
    throw new Error(
      "[SC] StartService ERROR 1056: Ya hay una instancia del servicio en ejecución.",
    );
  const executable = serviceExecutable(service, hostState(state));
  const binary = hostState(state).files[key(executable)];
  if (!binary)
    throw new Error(
      "[SC] StartService ERROR 2: No se encuentra el ejecutable.",
    );
  service.running = true;
  audit(state, 7036, `Inicio de servicio ${found.name}`);
  if (binary.content === SHELL_MARKER) {
    state.session!.principal = service.account;
    audit(state, 4688, "Consola iniciada con el token del servicio");
    return `SERVICE_NAME: ${found.name}\nSTATE: 4 RUNNING\nConsola del proceso: ${service.account}`;
  }
  return `SERVICE_NAME: ${found.name}\nSTATE: 4 RUNNING\nBinario ejecutado: ${executable}`;
}
const HELP = `Consola Windows del laboratorio (simulación con estado; no ejecuta programas del anfitrión).
Equipos independientes: hosts; connect IP; target WIN01; disconnect; reset --confirm.
Desde Linux usa VPN y winrm -i IP -u cuenta -p clave (evil-winrm es alias). La cuenta inicial aparece en el panel.
Reconocimiento: nmap -sV IP; ping IP; hostname; whoami [/all|/priv]; systeminfo; net user; net localgroup [grupo].
Archivos: dir [ruta]; cd ruta; type ruta; copy origen destino; echo texto > ruta; icacls ruta; icacls ruta /grant cuenta:R|M|F.
PowerShell soportado: Get-ChildItem, Get-Content, Copy-Item, Get-Acl, Get-Service, Get-ScheduledTask; no es un intérprete PowerShell completo.
Identidades: runas /user:cuenta powershell (la siguiente entrada es la contraseña); exit; cmd; powershell.
Registro: reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" [/v valor].
Servicios: sc query; sc qc nombre; sc sdshow nombre; sc config nombre binPath= "ruta"; sc start|stop nombre.
Tareas: schtasks /query /fo LIST /v; schtasks /run /tn Cierre.
Respaldo: robocopy origen destino archivo /b.
Las herramientas didácticas disponibles están en C:\\Tools. Explora sus permisos y la identidad del proceso que las ejecuta.
Lee la evidencia obtenida y entrega su contenido desde el reto del portátil o el computador. No hay un comando que complete un reto por su identificador.`;

export function executeWindows(
  state: WindowsState,
  raw: string,
  access: WindowsAccess,
  source: "local" | "remote",
): string {
  if (raw.length > 4096 || /[\0\r\n]/.test(raw))
    throw new Error("Comando inválido o demasiado largo.");
  if (source === "remote" && !access.connected) {
    if (state.session?.source === "remote") state.session = null;
    state.pending = null;
    return "Sin ruta al laboratorio Windows. Conecta Seventech VPN desde el PC Linux.";
  }
  if (state.pending) {
    const pending = state.pending;
    state.pending = null;
    if (pending.source !== source || pending.host !== state.host)
      return "La solicitud de credenciales ya no está activa.";
    requireEnabled(state, access);
    if (raw !== secret(access, pending.host, pending.account)) {
      audit(state, 4625, "Inicio de sesión rechazado");
      return "RUNAS ERROR 1326: Nombre de usuario o contraseña incorrectos.";
    }
    const old = state.session;
    state.session = {
      principal: pending.account,
      cwd: "C:\\",
      source,
      transport: old?.transport ?? "console",
    };
    audit(state, 4624, "Inicio de sesión local alternativo");
    return `Sesión iniciada como ${pending.host}\\${pending.account}.`;
  }
  let command = raw.trim();
  if (/^win\s/i.test(command)) command = command.replace(/^win\s+/i, "");
  if (!command) return "";
  if (
    /[;&|`]/.test(command) ||
    command.includes("$(") ||
    command.includes(">>") ||
    command.includes("<")
  )
    throw new Error(
      "No se admiten comandos compuestos, tuberías ni ejecución externa.",
    );
  const tokens = nativeTokens(command),
    verb = tokens[0]?.toLowerCase(),
    args = tokens.slice(1);
  if (["help", "?", "man"].includes(verb)) return HELP;
  if (verb === "hosts")
    return WINDOWS_HOSTS.filter((host) => access.enabled.includes(host.id))
      .map((host) => `${host.name}\t${host.ip}\t${host.title}`)
      .join("\n");
  if (["connect", "target"].includes(verb)) {
    const host = WINDOWS_HOSTS.find(
      (entry) =>
        entry.ip === args[0] ||
        entry.name.toLowerCase() === args[0]?.toLowerCase(),
    );
    if (!host || !access.enabled.includes(host.id))
      throw new Error(
        "Equipo no disponible. Usa hosts para consultar destinos del laboratorio.",
      );
    state.host = host.name;
    state.pending = null;
    state.session =
      source === "local"
        ? {
            principal: "analista",
            cwd: "C:\\Users\\analista",
            source,
            transport: "console",
          }
        : null;
    audit(
      state,
      4624,
      source === "local"
        ? "Consola local iniciada"
        : "Objetivo remoto seleccionado",
    );
    return `${host.name} (${host.ip})\n${host.title}\n${source === "local" ? "Consola local: analista" : "Objetivo seleccionado. Autentica con winrm -i IP -u cuenta -p clave."}`;
  }
  if (["disconnect", "exit"].includes(verb)) {
    state.session = null;
    state.pending = null;
    return "Sesión cerrada. Usa connect IP para seleccionar un equipo.";
  }
  if (["nmap", "ping"].includes(verb)) {
    const host = WINDOWS_HOSTS.find((entry) => args.includes(entry.ip));
    if (!host || !access.enabled.includes(host.id))
      throw new Error(
        "El destino no pertenece a un equipo disponible del laboratorio.",
      );
    return verb === "ping"
      ? `Respuesta de ${host.ip}: bytes=32 tiempo<1ms TTL=128`
      : `Nmap scan report for ${host.name} (${host.ip})\nPORT     STATE SERVICE       VERSION\n135/tcp  open  msrpc         Microsoft Windows RPC\n445/tcp  open  microsoft-ds  Windows SMB\n5985/tcp open  http          Microsoft HTTPAPI WinRM\nOS: Microsoft Windows 11 (laboratorio simulado)`;
  }
  if (["winrm", "evil-winrm"].includes(verb)) {
    const host = WINDOWS_HOSTS.find((entry) => entry.ip === option(args, "-i"));
    const account = normalizeAccount(option(args, "-u"));
    if (!host || !access.enabled.includes(host.id))
      throw new Error("Destino Windows no disponible.");
    const accounts = [
      "analista",
      ...(host.id === "windows-02"
        ? ["mantenimiento"]
        : host.id === "windows-03"
          ? ["operador"]
          : host.id === "windows-04"
            ? ["soporte"]
            : []),
    ];
    if (
      !accounts.includes(account) ||
      option(args, "-p") !== secret(access, host.name, account)
    )
      throw new Error("WinRM: autenticación rechazada.");
    state.host = host.name;
    state.pending = null;
    state.session = {
      principal: account,
      cwd: "C:\\Users\\" + account,
      source,
      transport: "winrm",
    };
    audit(state, 4624, "Sesión WinRM autenticada");
    return `WinRM ${host.name}\\${account}\nSesión remota del laboratorio establecida.`;
  }
  requireEnabled(state, access);
  if (state.session?.source !== source) state.session = null;
  const actor = principal(state),
    host = hostState(state);
  if (verb === "reset") {
    if (args[0] !== "--confirm")
      throw new Error(
        "Usa reset --confirm para restaurar únicamente el equipo seleccionado. Los puntos no se borran.",
      );
    const selected = target(state);
    hostState(state);
    state.hosts[selected.name] = initialHost(WINDOWS_HOSTS.indexOf(selected));
    state.proofs = state.proofs.filter((id) => id !== selected.id);
    state.session =
      source === "local"
        ? {
            principal: "analista",
            cwd: "C:\\Users\\analista",
            source,
            transport: "console",
          }
        : null;
    audit(state, 1100, "Equipo restaurado a su estado inicial");
    return "Equipo restaurado. Las acreditaciones y puntuaciones ya guardadas se conservan.";
  }
  if (verb === "hostname") return target(state).name;
  if (verb === "systeminfo")
    return `Host Name: ${target(state).name}\nOS Name: Microsoft Windows 11 (simulado)\nDomain: WORKGROUP\nLogon Server: ${target(state).name}`;
  if (verb === "whoami") {
    const identity = actor.includes("\\")
      ? actor
      : `${target(state).name.toLowerCase()}\\${actor}`;
    if (!args.length) return identity;
    const privileges =
      actor === SYSTEM
        ? [
            "SeDebugPrivilege",
            "SeBackupPrivilege",
            "SeRestorePrivilege",
            "SeImpersonatePrivilege",
          ]
        : target(state).id === "windows-09"
          ? ["SeBackupPrivilege"]
          : target(state).id === "windows-10" && actor === "svc_web"
            ? ["SeImpersonatePrivilege"]
            : ["SeChangeNotifyPrivilege"];
    return `${identity}\n${args[0]?.toLowerCase() === "/all" ? `GROUP INFORMATION\n${actor === SYSTEM ? "BUILTIN\\Administrators" : "BUILTIN\\Users"}\n` : ""}PRIVILEGES INFORMATION\n${privileges.map((entry) => `${entry}\tEnabled`).join("\n")}`;
  }
  if (["cmd", "cmd.exe", "powershell", "powershell.exe"].includes(verb)) {
    if (args.length)
      throw new Error(
        "Solo se admite abrir la consola actual, sin ejecutar cadenas externas.",
      );
    return `Consola del laboratorio: ${actor}. Usa help para consultar el subconjunto soportado.`;
  }
  if (verb === "runas") {
    const user = args.find((arg) => /^\/user:/i.test(arg))?.slice(6) ?? "";
    const account = normalizeAccount(user);
    const allowed =
      target(state).id === "windows-02"
        ? "mantenimiento"
        : target(state).id === "windows-03"
          ? "operador"
          : target(state).id === "windows-04"
            ? "soporte"
            : "analista";
    if (
      !["analista", allowed].includes(account) ||
      !args.some((arg) => ["powershell", "cmd"].includes(arg.toLowerCase()))
    )
      throw new Error(
        "Usa runas /user:cuenta powershell con una cuenta local existente.",
      );
    state.pending = { account, host: target(state).name, source };
    return `Escriba la contraseña de ${target(state).name}\\${account}:`;
  }
  if (verb === "net") {
    if (args[0]?.toLowerCase() === "user")
      return `Cuentas de ${target(state).name}\nanalista${target(state).id === "windows-02" ? "\nmantenimiento" : target(state).id === "windows-03" ? "\noperador" : target(state).id === "windows-04" ? "\nsoporte" : target(state).id === "windows-10" ? "\nsvc_web" : ""}`;
    if (args[0]?.toLowerCase() === "localgroup")
      return args.length === 1
        ? "Administrators\nUsers\nBackup Operators"
        : args[1].toLowerCase() === "backup operators" &&
            target(state).id === "windows-09"
          ? "analista"
          : args[1].toLowerCase() === "users"
            ? "analista"
            : "No se muestran miembros adicionales.";
    throw new Error(
      "Consulta net user o net localgroup [grupo]; no se admite cambiar grupos aquí.",
    );
  }
  if (["dir", "ls", "get-childitem"].includes(verb))
    return listDirectory(state, args[0] ?? state.session!.cwd);
  if (["cd", "set-location"].includes(verb)) {
    const next = pathFor(state, args[0] ?? "C:\\");
    if (!directories(host).has(key(next)))
      throw new Error("No existe ese directorio.");
    state.session!.cwd = next;
    return next;
  }
  if (["type", "cat", "get-content"].includes(verb))
    return readFile(state, args[0], access);
  if (["copy", "cp", "copy-item"].includes(verb)) {
    if (args.length !== 2) throw new Error("Usa copy origen destino.");
    const origin = host.files[key(pathFor(state, args[0]))];
    if (!origin || !canRead(state, origin))
      throw new Error("Acceso denegado o archivo de origen inexistente.");
    writeFile(state, args[1], origin.content, origin);
    return "        1 archivo(s) copiado(s).";
  }
  if (verb === "echo") {
    const redirect = args.indexOf(">");
    if (redirect < 0) return args.join(" ");
    if (
      redirect !== args.length - 2 ||
      args.filter((arg) => arg === ">").length !== 1
    )
      throw new Error("Usa echo texto > ruta.");
    writeFile(state, args[redirect + 1], args.slice(0, redirect).join(" "));
    return "";
  }
  if (["icacls", "get-acl"].includes(verb)) {
    const path = pathFor(state, args[0]),
      entry = host.files[key(path)],
      isDirectory = directories(host).has(key(path));
    if (!entry && !isDirectory)
      throw new Error("No se encuentra el archivo o directorio.");
    if (args.some((arg) => arg.toLowerCase() === "/grant")) {
      if (!privileged(state))
        throw new Error(
          "Acceso denegado: falta WRITE_DAC para modificar la ACL.",
        );
      const grant = option(args, "/grant").match(/^([^:]+):(R|M|F)$/i);
      if (!grant || !entry)
        throw new Error(
          "Formato soportado: icacls archivo /grant cuenta:R|M|F.",
        );
      const account = normalizeAccount(grant[1]);
      if (!entry.readers.includes(account)) entry.readers.push(account);
      if (grant[2].toUpperCase() !== "R" && !entry.writers.includes(account))
        entry.writers.push(account);
      audit(state, 4670, "ACL de archivo modificada");
    }
    return `${path}\nNT AUTHORITY\\SYSTEM:(F)\n${entry ? [...entry.readers.map((reader) => `${reader}:(R)`), ...entry.writers.map((writer) => `${writer}:(M)`)].join("\n") : host.writableDirectories.some((directory) => key(path) === directory || key(path).startsWith(directory + "\\")) ? "BUILTIN\\Users:(OI)(CI)(M)" : "BUILTIN\\Users:(RX)"}`;
  }
  if (verb === "reg") {
    if (
      args[0]?.toLowerCase() !== "query" ||
      target(state).id !== "windows-03" ||
      !/winlogon$/i.test(args[1] ?? "")
    )
      throw new Error("La clave consultada no está disponible en este equipo.");
    const values: Record<string, string> = {
      AutoAdminLogon: "1",
      DefaultUserName: "operador",
      DefaultPassword: secret(access, target(state).name, "operador"),
    };
    const wanted = option(args, "/v");
    return (
      `HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\n` +
      Object.entries(values)
        .filter(
          ([name]) => !wanted || name.toLowerCase() === wanted.toLowerCase(),
        )
        .map(([name, value]) => `    ${name}    REG_SZ    ${value}`)
        .join("\n")
    );
  }
  if (["sc", "sc.exe", "get-service"].includes(verb)) {
    if (
      verb === "get-service" ||
      (args[0]?.toLowerCase() === "query" && args.length === 1)
    )
      return (
        Object.entries(host.services)
          .map(
            ([name, service]) =>
              `SERVICE_NAME: ${name}\nSTATE: ${service.running ? "4 RUNNING" : "1 STOPPED"}`,
          )
          .join("\n") || "No hay servicios de práctica en este equipo."
      );
    const action = args[0]?.toLowerCase(),
      found = serviceByName(state, args[1]),
      service = found.service;
    if (action === "qc")
      return `SERVICE_NAME: ${found.name}\nBINARY_PATH_NAME: ${service.path}\nSERVICE_START_NAME: ${service.account}\nSTART_TYPE: DEMAND_START`;
    if (action === "query")
      return `SERVICE_NAME: ${found.name}\nSTATE: ${service.running ? "4 RUNNING" : "1 STOPPED"}`;
    if (action === "sdshow")
      return `D:(A;;GA;;;SY)(A;;${service.configurable ? "DC" : "LC"}RPWP;;;BU)\nBUILTIN\\Users: ${service.configurable ? "SERVICE_CHANGE_CONFIG, " : ""}${service.startable ? "SERVICE_START, SERVICE_STOP, " : ""}SERVICE_QUERY_CONFIG`;
    if (action === "config") {
      if (!service.configurable && !privileged(state))
        throw new Error(
          "[SC] ChangeServiceConfig ERROR 5: Falta SERVICE_CHANGE_CONFIG.",
        );
      const assignment = args
        .slice(2)
        .join(" ")
        .match(/^binpath=\s*(.+)$/i);
      if (!assignment) throw new Error("Usa sc config nombre binPath= ruta.");
      service.path = assignment[1];
      audit(state, 7040, `Configuración de servicio ${found.name} modificada`);
      return "[SC] ChangeServiceConfig SUCCESS";
    }
    if (action === "start") return startService(state, found.name);
    if (action === "stop") {
      if (!service.startable && !privileged(state))
        throw new Error("[SC] ControlService ERROR 5: Acceso denegado.");
      service.running = false;
      audit(state, 7036, `Servicio ${found.name} detenido`);
      return "STATE: 1 STOPPED";
    }
    throw new Error(
      "Operación SC no soportada. Usa query, qc, sdshow, config, start o stop.",
    );
  }
  if (["schtasks", "schtasks.exe", "get-scheduledtask"].includes(verb)) {
    if (!host.taskScript) return "No hay tareas de práctica en este equipo.";
    if (verb === "get-scheduledtask" || args[0]?.toLowerCase() === "/query")
      return `TaskName: Cierre\nTask To Run: powershell.exe -File ${host.taskScript}\nRun As User: ${SYSTEM}\nScheduled Task State: Ready\nUsers may run: yes`;
    if (
      args[0]?.toLowerCase() !== "/run" ||
      option(args, "/tn").replace(/^\\/, "").toLowerCase() !== "cierre"
    )
      throw new Error("Usa schtasks /run /tn Cierre.");
    const script = host.files[key(host.taskScript)];
    host.taskRunning = true;
    audit(state, 4698, "Tarea Cierre ejecutada");
    if (script.content.trim().toLowerCase() === SCRIPT_MARKER) {
      state.session!.principal = SYSTEM;
      audit(state, 4688, "Consola iniciada con el token de la tarea");
      return `SUCCESS: La tarea Cierre se ha ejecutado.\nConsola del proceso: ${SYSTEM}`;
    }
    return "SUCCESS: La tarea Cierre se ha ejecutado sin abrir otra consola.";
  }
  if (verb === "robocopy") {
    const [originDirectory, destinationDirectory, filename] = args;
    if (
      !originDirectory ||
      !destinationDirectory ||
      !filename ||
      !args.some((arg) => arg.toLowerCase() === "/b")
    )
      throw new Error(
        "Usa robocopy directorio_origen directorio_destino archivo /b.",
      );
    if (target(state).id !== "windows-09" && !privileged(state))
      throw new Error("ERROR 1314: No dispone de SeBackupPrivilege.");
    const origin =
      host.files[key(pathFor(state, `${originDirectory}\\${filename}`))];
    if (!origin) throw new Error("ERROR 2: No se encuentra el archivo.");
    writeFile(
      state,
      `${destinationDirectory}\\${filename}`,
      origin.content,
      origin,
    );
    audit(state, 4673, "Lectura en modo de respaldo con SeBackupPrivilege");
    return "ROBOCOPY /B\nArchivos: 1 copiado\nModo de respaldo: se conserva la ACL del archivo original.";
  }
  const executableName = verb.split("\\").at(-1);
  if (executableName === "printspoofer.exe") {
    const executable = host.files[key(pathFor(state, tokens[0]))];
    if (
      !executable ||
      executable.content !== "SEVENTECH_LAB_IMPERSONATION_V1" ||
      target(state).id !== "windows-10" ||
      actor !== "svc_web"
    )
      throw new Error(
        "Token no apto: falta SeImpersonatePrivilege en la identidad del proceso.",
      );
    if (!host.services.Spooler?.running)
      throw new Error(
        "La tubería de impresión no está disponible: Spooler detenido.",
      );
    if (
      !args.includes("-i") ||
      !["cmd", "cmd.exe"].includes(option(args, "-c").toLowerCase())
    )
      throw new Error(
        "Uso de la herramienta didáctica: PrintSpoofer.exe -i -c cmd.",
      );
    audit(
      state,
      4673,
      "Suplantación de token de impresión con SeImpersonatePrivilege",
    );
    state.session!.principal = SYSTEM;
    return `Token de impresión suplantado en la simulación.\nConsola del proceso: ${SYSTEM}`;
  }
  throw new Error(
    "Comando no soportado por esta consola del laboratorio. Usa help.",
  );
}
export function presentWindows(
  state: WindowsState,
  access: WindowsAccess,
): WindowsLabView {
  const session = state.session,
    host = WINDOWS_HOSTS.find((entry) => entry.name === state.host);
  const cwd = session?.cwd ?? "C:\\";
  return {
    connected: access.connected,
    hosts: WINDOWS_HOSTS.map((entry) => ({
      id: entry.id,
      name: entry.name,
      ip: entry.ip,
      title: entry.title,
      description: entry.description,
      points: entry.points,
      enabled: access.enabled.includes(entry.id),
    })),
    host: state.host,
    principal: session?.principal ?? "Sin sesión",
    cwd,
    prompt: state.pending
      ? `Contraseña de ${state.pending.account}: `
      : session
        ? `${host?.name ?? "Windows"} ${cwd}> `
        : "windows-lab> ",
    proofs: state.proofs.filter((id) => access.enabled.includes(id)),
    events: state.events,
    entry: { user: "analista", password: access.password("analista") },
    password: !!state.pending,
  };
}
