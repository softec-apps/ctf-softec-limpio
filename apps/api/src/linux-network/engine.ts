import { LINUX_MANUALS } from "./manuals";
import { LINUX_SERVERS, LINUX_ENTRY_HINT } from "./catalog";
import { serverFiles, type LinuxFile } from "./filesystem";
import { runShell, words } from "./shell";
export type LinuxState = {
  connected: boolean;
  shell: { level: number; cwd: string } | null;
  pending: number | null;
  changes: Record<string, Record<string, LinuxFile | null>>;
};
export type LinuxAccess = {
  solved: string[];
  enabled: string[];
  key: (level: number) => string;
};
export const initialLinuxState = (): LinuxState => ({
  connected: false,
  shell: null,
  pending: null,
  changes: {},
});
export function unlocked(level: number, access: LinuxAccess) {
  return (
    access.enabled.includes(LINUX_SERVERS[level].id) &&
    LINUX_SERVERS.slice(0, level).every(
      (s) => access.enabled.includes(s.id) && access.solved.includes(s.id),
    )
  );
}
export function canAttempt(level: number, access: LinuxAccess) {
  return (
    access.enabled.includes(LINUX_SERVERS[level].id) &&
    LINUX_SERVERS.slice(0, level).every(
      (s, index) =>
        access.enabled.includes(s.id) &&
        (index === level - 1 || access.solved.includes(s.id)),
    )
  );
}
function normalizeFirstServer(state: LinuxState) {
  const oldHome = "/home/nivel00";
  if (
    state.shell?.level === 0 &&
    (state.shell.cwd === oldHome || state.shell.cwd.startsWith(oldHome + "/"))
  )
    state.shell.cwd = "/root" + state.shell.cwd.slice(oldHome.length);
  const changes = state.changes["linux-01"];
  if (!changes) return;
  for (const [path, file] of Object.entries(changes)) {
    if (path !== oldHome && !path.startsWith(oldHome + "/")) continue;
    const target = "/root" + path.slice(oldHome.length);
    if (!Object.hasOwn(changes, target))
      changes[target] = file
        ? { ...file, owner: file.owner === "nivel00" ? "root" : file.owner }
        : null;
    delete changes[path];
  }
}
export function refreshAccess(state: LinuxState, access: LinuxAccess) {
  normalizeFirstServer(state);
  if (!state.connected || (state.shell && !unlocked(state.shell.level, access)))
    state.shell = null;
  if (
    !state.connected ||
    (state.pending !== null && !canAttempt(state.pending, access))
  )
    state.pending = null;
}
export function linuxPrompt(state: LinuxState) {
  if (state.pending !== null)
    return `${LINUX_SERVERS[state.pending].user}@${LINUX_SERVERS[state.pending].name}'s password: `;
  if (!state.shell) return "analista@seventech:~$ ";
  const s = LINUX_SERVERS[state.shell.level];
  return `${s.user}@${s.name}:${state.shell.cwd.replace(s.home, "~")}${s.user === "root" ? "#" : "$"} `;
}
export function executeLinux(
  state: LinuxState,
  raw: string,
  access: LinuxAccess,
): { output: string; clear?: boolean; completed?: number } {
  refreshAccess(state, access);
  if (raw === "\u0003") {
    state.pending = null;
    return { output: "^C" };
  }
  if (raw.trim() === "vpn disconnect") {
    state.connected = false;
    state.shell = null;
    state.pending = null;
    return {
      output:
        "Túnel cerrado. Rutas 10.77.0.0/24 retiradas. Sesiones SSH terminadas.",
    };
  }
  if (state.pending !== null) {
    const level = state.pending;
    state.pending = null;
    if (raw !== (level === 0 ? "toor" : access.key(level - 1)))
      return { output: "Permission denied (password)." };
    state.shell = { level, cwd: LINUX_SERVERS[level].home };
    return {
      completed:
        level > 0 && !access.solved.includes(LINUX_SERVERS[level - 1].id)
          ? level - 1
          : undefined,
      output: `Linux ${LINUX_SERVERS[level].name} — Red Seventech\n${LINUX_SERVERS[level].description}\nConsulta cat /etc/motd, cat SIGUIENTE y help.\n`,
    };
  }
  const tokens = words(raw),
    [command, ...args] = tokens;
  if (!command) return { output: "" };
  if (raw.trim() === "clear") return { output: "", clear: true };
  if (command === "man" && Object.hasOwn(LINUX_MANUALS, args[0] ?? ""))
    return { output: LINUX_MANUALS[args[0]] };
  if (command === "reset") {
    if (!state.shell || args.join(" ") !== "--confirm")
      return {
        output:
          "Uso: reset --confirm dentro de una sesión SSH. Restaura tus archivos de ese servidor; conserva puntos y niveles.",
      };
    delete state.changes[LINUX_SERVERS[state.shell.level].id];
    state.shell.cwd = LINUX_SERVERS[state.shell.level].home;
    return {
      output:
        "Archivos del servidor restaurados. Progreso y puntos conservados.",
    };
  }
  if (command === "vpn") {
    if (args.length !== 1 || !["connect", "status"].includes(args[0]))
      return { output: "Uso: vpn connect | vpn disconnect | vpn status" };
    if (args[0] === "connect") {
      state.connected = true;
      return {
        output: `Seventech VPN: túnel tun0 establecido\nDirección: 10.77.0.2/32\nRuta: 10.77.0.0/24 dev tun0\nDestino inicial: ${LINUX_SERVERS[0].name} (${LINUX_SERVERS[0].ip})\nNota del antiguo administrador: ${LINUX_ENTRY_HINT}`,
      };
    }
    return {
      output: state.connected
        ? "tun0 conectado · 10.77.0.2 · 10.77.0.0/24"
        : "VPN desconectada. No hay ruta a la red corporativa.",
    };
  }
  if (command === "exit" || command === "logout") {
    state.shell = null;
    return { output: "Connection closed." };
  }
  if (command === "ssh") {
    if (!state.connected)
      return {
        output: "ssh: Network is unreachable. Conecta la VPN del juego.",
      };
    const match = args
      .join(" ")
      .match(/^(root|nivel\d{2})@([a-z0-9.-]+)(?:\s+-p\s+22)?$/);
    const level = LINUX_SERVERS.findIndex(
      (s) =>
        s.user === match?.[1] &&
        [s.name, s.ip, `${s.name}.linux.seventech.local`].includes(
          match?.[2] ?? "",
        ),
    );
    if (level < 0 || !canAttempt(level, access))
      return {
        output:
          "ssh: No route to host. Servidor no disponible en tu segmento actual.",
      };
    state.pending = level;
    return { output: "" };
  }
  if (command === "ip" || command === "route") {
    const remote = state.shell ? LINUX_SERVERS[state.shell.level] : null;
    return {
      output: remote
        ? args.includes("a") || args.includes("addr")
          ? `1: lo: 127.0.0.1/8\n2: eth0: UP ${remote.ip}/24`
          : `10.77.0.0/24 dev eth0 src ${remote.ip}`
        : state.connected
          ? args.includes("a") || args.includes("addr")
            ? "1: lo: 127.0.0.1/8\n2: eth0: 192.0.2.10/24\n3: tun0: UP 10.77.0.2/32"
            : "10.77.0.0/24 dev tun0 src 10.77.0.2"
          : "1: lo: 127.0.0.1/8\n2: eth0: 192.0.2.10/24\nSin ruta a 10.77.0.0/24.",
    };
  }
  if (command === "ping") {
    const target = args[args.length - 1],
      host = LINUX_SERVERS.find((s) => [s.name, s.ip].includes(target));
    return {
      output:
        state.connected && host && canAttempt(host.index, access)
          ? `PING ${host.name} (${host.ip}): 64 bytes, ttl=64 time=2.0 ms\n1 packets transmitted, 1 received, 0% packet loss`
          : "ping: Network is unreachable",
    };
  }
  if (command === "nmap") {
    if (!state.connected)
      return { output: "nmap: No route to the Linux network. Conecta la VPN." };
    const target = args.filter((a) => !a.startsWith("-"));
    if (
      target.length !== 1 ||
      !(
        target[0] === "10.77.0.0/24" ||
        LINUX_SERVERS.some((s) => [s.name, s.ip].includes(target[0]))
      )
    )
      return { output: "Uso: nmap [-sV] 10.77.0.0/24 | nombre del servidor" };
    return {
      output:
        LINUX_SERVERS.filter(
          (s) =>
            canAttempt(s.index, access) &&
            (target[0] === "10.77.0.0/24" ||
              [s.name, s.ip].includes(target[0])),
        )
          .map(
            (s) =>
              `${s.name} (${s.ip})\nPORT   STATE SERVICE\n22/tcp open  ssh`,
          )
          .join("\n\n") || "No hosts available.",
    };
  }
  if (command === "submit") {
    if (!state.connected || !state.shell)
      return { output: "Abre una sesión SSH antes de entregar una clave." };
    const level = state.shell.level;
    if (args.length !== 1 || args[0] !== access.key(level))
      return { output: "La clave no coincide con la de este servidor." };
    return {
      output: `Nivel resuelto. ${level < 9 ? `La misma clave permite iniciar sesión como ${LINUX_SERVERS[level + 1].user} en ${LINUX_SERVERS[level + 1].name}.` : "Has completado la red corporativa."}`,
      completed: level,
    };
  }
  if (!state.shell) {
    if (command === "help" || command === "man")
      return {
        output:
          "Red corporativa Seventech\nvpn connect | disconnect | status\nip addr | ip route\nping host\nnmap -sV 10.77.0.0/24\nssh usuario@servidor (contraseña en el siguiente prompt)\nUna vez dentro: help, man, ls, cat, find, grep y herramientas de archivos.\nsubmit <clave> guarda el nivel y abre el siguiente servidor. exit vuelve a tu estación.",
      };
    if (command === "whoami") return { output: "analista" };
    if (command === "pwd") return { output: "/home/analista" };
    return {
      output: `${command}: abre primero una sesión SSH. Consulta help.`,
    };
  }
  const { level, cwd } = state.shell,
    server = LINUX_SERVERS[level];
  const files = serverFiles(level, access.key(level));
  const changes = state.changes[server.id] ?? {};
  for (const [path, file] of Object.entries(changes)) {
    if (file) files[path] = structuredClone(file);
    else delete files[path];
  }
  const context = {
    cwd,
    home: server.home,
    user: server.user,
    level,
    files,
    changes,
  };
  const output = runShell(context, raw);
  state.shell.cwd = context.cwd;
  state.changes[server.id] = changes;
  return { output };
}
