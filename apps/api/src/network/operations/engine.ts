import type {
  DeviceId,
  ConsoleContext,
  LabState,
  NetworkConfig,
  AclRule,
} from "../../../../../packages/network-contracts";
import { DEVICES, SERVICE_NAME } from "./scenarios";
import { diagnostic, validCidr, validIp, networkAddress } from "./diagnostics";
export type Change =
  | {
      kind: "port";
      number: number;
      up: boolean;
      vlan: number;
      mode: "access" | "trunk";
      trusted: boolean;
    }
  | { kind: "snooping"; enabled: boolean }
  | {
      kind: "interface";
      name: "lan" | "servers";
      ip: string;
      up: boolean;
      mtu: number;
    }
  | { kind: "acl"; rule: AclRule }
  | { kind: "delete-acl"; id: number }
  | { kind: "dns"; name: string; ip: string }
  | { kind: "dns-service"; running: boolean }
  | { kind: "services"; value: NetworkConfig["files1"] }
  | { kind: "ntp"; server: string };
const name = (device: DeviceId) => DEVICES.find((d) => d.id === device)!.name;
export function prompt(device: DeviceId, ctx: ConsoleContext) {
  return `${name(device)}${ctx.mode === "interface" ? "(config-if)" : ctx.mode === "config" ? "(config)" : ""}${ctx.mode === "user" ? ">" : "#"}`;
}
export function runningText(c: NetworkConfig, device: DeviceId) {
  if (device === "pc1")
    return "hostname ST-ANALISTA\nip address 10.44.8.41/24\ndefault-gateway 10.44.8.1\nnameserver 10.44.8.53";
  if (device === "sw1")
    return (
      `hostname ST-SW01\n${c.sw1.snooping ? "" : "no "}ip dhcp snooping\n` +
      c.sw1.ports
        .map(
          (p) =>
            `interface ethernet1/${p.number}\n description ${p.description}\n ${p.up ? "no shutdown" : "shutdown"}\n switchport mode ${p.mode}\n switchport access vlan ${p.vlan}\n ${p.trusted ? "" : "no "}ip dhcp snooping trust`,
        )
        .join("\n!\n")
    );
  if (device === "r1")
    return (
      `hostname ST-RTR01\n` +
      (["lan", "servers"] as const)
        .map((key) => {
          const i = c.r1[key];
          return `interface ${key}\n ip address ${i.ip}\n ${i.up ? "no shutdown" : "shutdown"}\n mtu ${i.mtu}`;
        })
        .join("\n!\n") +
      "\n" +
      c.r1.acl
        .map(
          (r) =>
            `acl ${r.id} ${r.action} ${r.protocol} ${r.source} ${r.destination} ${r.port ?? "any"}`,
        )
        .join("\n") +
      `\n! implicit deny\nntp server ${c.r1.ntpServer}`
    );
  if (device === "dns1")
    return (
      `# /etc/bind/db.interno.example\n# service named: ${c.dns1.running ? "running" : "stopped"}\n` +
      Object.entries(c.dns1.records)
        .map(([host, ip]) => `${host}. 300 IN A ${ip}`)
        .join("\n")
    );
  return `# /etc/seventech/remesas.conf\nhttp=${c.files1.http}\nhttps=${c.files1.https}\ncertificate_name=${c.files1.certificateName}\nminimum_tls=${c.files1.minTls}\nftp=${c.files1.ftp}\nftp_passive=${c.files1.passive}\nftp_passive_port=50000`;
}
export function applyChange(
  config: NetworkConfig,
  device: DeviceId,
  change: Change,
) {
  const expected =
    change.kind === "port" || change.kind === "snooping"
      ? "sw1"
      : ["interface", "acl", "delete-acl", "ntp"].includes(change.kind)
        ? "r1"
        : change.kind.startsWith("dns")
          ? "dns1"
          : "files1";
  if (device !== expected)
    throw Error("Este ajuste pertenece a otro dispositivo.");
  switch (change.kind) {
    case "port": {
      const p = config.sw1.ports.find((p) => p.number === change.number);
      if (!p || ![8, 9, 99].includes(change.vlan))
        throw Error("Puerto o VLAN fuera del inventario.");
      Object.assign(p, {
        up: change.up,
        vlan: change.vlan,
        mode: change.mode,
        trusted: change.trusted,
      });
      break;
    }
    case "snooping":
      config.sw1.snooping = change.enabled;
      break;
    case "interface":
      if (
        !validCidr(change.ip) ||
        change.ip === "any" ||
        change.mtu < 576 ||
        change.mtu > 9000
      )
        throw Error("Dirección CIDR o MTU no válida.");
      config.r1[change.name] = {
        ip: change.ip,
        up: change.up,
        mtu: change.mtu,
      };
      break;
    case "acl":
      if (!validCidr(change.rule.source) || !validCidr(change.rule.destination))
        throw Error("Usa CIDR IPv4 o any en las redes de la regla.");
      if (
        config.r1.acl.length >= 32 &&
        !config.r1.acl.some((r) => r.id === change.rule.id)
      )
        throw Error("Se admiten hasta 32 reglas.");
      config.r1.acl = config.r1.acl
        .filter((r) => r.id !== change.rule.id)
        .concat(change.rule)
        .sort((a, b) => a.id - b.id);
      break;
    case "delete-acl":
      config.r1.acl = config.r1.acl.filter((r) => r.id !== change.id);
      break;
    case "dns":
      if (
        !/^[a-z0-9-]+\.interno\.example$/.test(change.name) ||
        !validIp(change.ip)
      )
        throw Error("Registro ajeno a la zona o dirección no válida.");
      if (
        Object.keys(config.dns1.records).length >= 20 &&
        !Object.hasOwn(config.dns1.records, change.name)
      )
        throw Error("La zona admite hasta 20 registros.");
      config.dns1.records[change.name] = change.ip;
      break;
    case "dns-service":
      config.dns1.running = change.running;
      break;
    case "services":
      if (!/^[a-z0-9-]+\.interno\.example$/.test(change.value.certificateName))
        throw Error("Nombre de certificado ajeno a la zona.");
      config.files1 = structuredClone(change.value);
      break;
    case "ntp":
      if (!validIp(change.server)) throw Error("Dirección NTP no válida.");
      config.r1.ntpServer = change.server;
      config.r1.clockOffset = 180;
      break;
  }
}
export const COMMAND_HELP = `show running-config | show startup-config | show topology
show interfaces status | show vlan brief | show ip dhcp snooping (switch)
show ip interface brief | show ip route | show access-lists | show ntp status (router)
show dns records (DNS) | show services (remesas)
ping <IP/nombre> [size <bytes> df] | traceroute <IP/nombre>
dig <nombre> | curl http(s)://<nombre>/entregas/actual
ftp get <nombre>/<archivo> | dhcp discover (ST-ANALISTA)
ntp sync (router)
enable | configure terminal | interface ethernet1/<1-8> (switch)
interface lan | interface servers (router)
shutdown | no shutdown | switchport mode access|trunk | switchport access vlan 8|9|99
ip dhcp snooping | no ip dhcp snooping | ip dhcp snooping trust | no ip dhcp snooping trust
ip address <CIDR> | mtu <576-9000> (interfaz del router)
acl <id> permit|deny tcp|udp|icmp|any <CIDR/any> <CIDR/any> <puerto/any>
no acl <id> | ntp server <IP> (configuración del router)
dns set <nombre.interno.example> <IP> (DNS)
service named start|stop (DNS)
service http|https|ftp start|stop | ftp passive on|off (remesas)
tls name <nombre.interno.example> | tls minimum 1.0|1.2|1.3 (remesas)
copy running-config startup-config | reload | exit | end
Las órdenes son del sistema Seventech NOS; help describe el subconjunto implementado.`;
function markChange(state: LabState, device: DeviceId, before: string) {
  if (before !== JSON.stringify(state.running)) {
    state.configVersion++;
    state.reloaded = state.reloaded.filter((d) => d !== device);
  }
}
function append(
  state: LabState,
  device: DeviceId,
  command: string,
  output: string,
  enteredPrompt?: string,
) {
  state.journal.push({
    time: new Date().toISOString(),
    device,
    command,
    output,
    ...(enteredPrompt ? { prompt: enteredPrompt } : {}),
  });
  state.journal = state.journal.slice(-120);
}
export function configure(state: LabState, device: DeviceId, change: Change) {
  const before = JSON.stringify(state.running);
  applyChange(state.running, device, change);
  markChange(state, device, before);
  append(
    state,
    device,
    `GUI: ${change.kind}`,
    "Configuración aplicada a running-config.",
  );
}
export function execute(
  state: LabState,
  device: DeviceId,
  input: string,
  previous: ConsoleContext,
) {
  const context = structuredClone(previous);
  const command = input.trim().replace(/\s+/g, " ");
  const lower = command.toLowerCase();
  const before = JSON.stringify(state.running);
  let output = "";
  let diagnosticResult: ReturnType<typeof diagnostic> = undefined;
  const c = state.running;
  const port = () => {
    if (device !== "sw1" || context.mode !== "interface" || !context.port)
      throw Error("Selecciona una interfaz del switch.");
    return c.sw1.ports[context.port - 1];
  };
  const routerInterface = () => {
    if (device !== "r1" || context.mode !== "interface" || !context.interface)
      throw Error("Selecciona una interfaz del router.");
    return c.r1[context.interface];
  };
  try {
    if (lower === "help" || lower === "?") output = COMMAND_HELP;
    else if (lower === "enable") context.mode = "privileged";
    else if (lower === "configure terminal") {
      if (context.mode === "user")
        throw Error("Usa enable antes de entrar a configuración.");
      context.mode = "config";
      delete context.port;
      delete context.interface;
    } else if (lower === "end") {
      context.mode = "privileged";
      delete context.port;
      delete context.interface;
    } else if (lower === "exit") {
      context.mode =
        context.mode === "interface"
          ? "config"
          : context.mode === "config"
            ? "privileged"
            : "user";
      delete context.port;
      delete context.interface;
    } else if (lower === "show running-config") output = runningText(c, device);
    else if (lower === "show startup-config")
      output = runningText(state.startup, device);
    else if (lower === "show topology")
      output =
        "VLAN 8: análisis 10.44.8.41, DNS .53, fuente NTP .123\nVLAN 9: remesas 10.44.9.80, almacenamiento .70\nVLAN 99: invitados\nEthernet1/3: troncal al router\nConsulta la pestaña Topología para ver el inventario de puertos.";
    else if (device === "sw1" && lower === "show interfaces status")
      output =
        "Port           State       Mode    VLAN  Peer\n" +
        c.sw1.ports
          .map(
            (p) =>
              `Ethernet1/${p.number}  ${p.up ? "connected" : "disabled "}  ${p.mode.padEnd(7)} ${String(p.vlan).padEnd(5)} ${p.description}`,
          )
          .join("\n");
    else if (device === "sw1" && lower === "show vlan brief")
      output = [8, 9, 99]
        .map(
          (v) =>
            `${v}  ${v === 8 ? "ANALISIS" : v === 9 ? "SERVIDORES" : "INVITADOS"}  ${c.sw1.ports
              .filter((p) => p.vlan === v && p.mode === "access")
              .map((p) => "Eth1/" + p.number)
              .join(", ")}`,
        )
        .join("\n");
    else if (device === "sw1" && lower === "show ip dhcp snooping")
      output =
        `DHCP snooping ${c.sw1.snooping ? "enabled" : "disabled"}\n` +
        c.sw1.ports
          .map(
            (p) =>
              `Ethernet1/${p.number}  ${p.trusted ? "trusted" : "untrusted"}`,
          )
          .join("\n");
    else if (device === "r1" && lower === "show ip interface brief")
      output = `Interface Address          State MTU\nlan       ${c.r1.lan.ip} ${c.r1.lan.up ? "up" : "down"} ${c.r1.lan.mtu}\nservers   ${c.r1.servers.ip} ${c.r1.servers.up ? "up" : "down"} ${c.r1.servers.mtu}`;
    else if (device === "r1" && lower === "show ip route")
      output = [
        ["lan", c.r1.lan],
        ["servers", c.r1.servers],
      ]
        .map(([key, iface]) => {
          const i = iface as typeof c.r1.lan;
          return i.up
            ? `C ${networkAddress(i.ip)} directly connected, ${key}`
            : `${key}: interface down`;
        })
        .join("\n");
    else if (device === "r1" && lower === "show access-lists")
      output =
        c.r1.acl
          .map(
            (r) =>
              `${r.id} ${r.action} ${r.protocol} ${r.source} -> ${r.destination} port ${r.port ?? "any"}`,
          )
          .join("\n") + "\nimplicit deny";
    else if (device === "r1" && lower === "show ntp status")
      output = `Source ${c.r1.ntpServer}\n${c.r1.clockOffset === 0 ? "Clock synchronized" : "Clock not synchronized"}\nOffset ${c.r1.clockOffset} seconds`;
    else if (
      device === "dns1" &&
      (lower === "show dns records" ||
        lower === "cat /etc/bind/db.interno.example")
    )
      output = runningText(c, device);
    else if (
      device === "files1" &&
      (lower === "show services" || lower === "cat /etc/seventech/remesas.conf")
    )
      output = runningText(c, device);
    else if (lower === "copy running-config startup-config") {
      if (device === "pc1")
        throw Error(
          "El puesto de pruebas no tiene configuración de red editable.",
        );
      state.startup[device] = structuredClone(c[device]) as never;
      output = "Building configuration...\n[OK] Startup-config guardada.";
    } else if (lower === "reload") {
      if (device === "pc1")
        throw Error("El puesto de pruebas no se reinicia desde esta consola.");
      c[device] = structuredClone(state.startup[device]) as never;
      state.reloaded = state.reloaded.filter((d) => d !== device);
      markChange(state, device, before);
      state.reloaded.push(device);
      state.configVersion++;
      context.mode = "user";
      delete context.port;
      delete context.interface;
      output = `${name(device)} rebooted. Configuration loaded from startup-config.`;
    } else if (
      (diagnosticResult = diagnostic(state, device, command)) !== undefined
    )
      output = diagnosticResult.output;
    else {
      if (
        context.mode !== "config" &&
        context.mode !== "interface" &&
        !(device === "dns1" || device === "files1")
      )
        throw Error(
          "Usa enable y configure terminal para modificar este equipo.",
        );
      let match: RegExpMatchArray | null;
      if (
        device === "sw1" &&
        (match = lower.match(/^interface ethernet1\/([1-8])$/))
      ) {
        context.mode = "interface";
        context.port = Number(match[1]);
      } else if (
        device === "r1" &&
        (match = lower.match(/^interface (lan|servers)$/))
      ) {
        context.mode = "interface";
        context.interface = match[1] as "lan" | "servers";
      } else if (lower === "shutdown" || lower === "no shutdown") {
        if (device === "sw1") port().up = lower === "no shutdown";
        else routerInterface().up = lower === "no shutdown";
      } else if (
        device === "sw1" &&
        (lower === "ip dhcp snooping" || lower === "no ip dhcp snooping")
      )
        c.sw1.snooping = lower === "ip dhcp snooping";
      else if (
        device === "sw1" &&
        (lower === "ip dhcp snooping trust" ||
          lower === "no ip dhcp snooping trust")
      )
        port().trusted = lower === "ip dhcp snooping trust";
      else if (
        device === "sw1" &&
        (match = lower.match(/^switchport access vlan (8|9|99)$/))
      )
        port().vlan = Number(match[1]);
      else if (
        device === "sw1" &&
        (match = lower.match(/^switchport mode (access|trunk)$/))
      )
        port().mode = match[1] as "access" | "trunk";
      else if (device === "r1" && (match = lower.match(/^ip address (\S+)$/))) {
        if (!validCidr(match[1]) || match[1] === "any")
          throw Error("Dirección CIDR no válida.");
        routerInterface().ip = match[1];
      } else if (device === "r1" && (match = lower.match(/^mtu (\d+)$/))) {
        const mtu = Number(match[1]);
        if (mtu < 576 || mtu > 9000) throw Error("MTU entre 576 y 9000.");
        routerInterface().mtu = mtu;
      } else if (device === "r1" && (match = lower.match(/^ntp server (\S+)$/)))
        applyChange(c, device, { kind: "ntp", server: match[1] });
      else if (device === "r1" && (match = lower.match(/^no acl (\d{1,4})$/)))
        applyChange(c, device, { kind: "delete-acl", id: Number(match[1]) });
      else if (
        device === "r1" &&
        (match = lower.match(
          /^acl (\d{1,4}) (permit|deny) (tcp|udp|icmp|any) (\S+) (\S+) (any|\d{1,5})$/,
        ))
      ) {
        const p = match[6] === "any" ? null : Number(match[6]);
        if (p !== null && (p < 1 || p > 65535))
          throw Error("Puerto entre 1 y 65535.");
        applyChange(c, device, {
          kind: "acl",
          rule: {
            id: Number(match[1]),
            action: match[2] as "permit" | "deny",
            protocol: match[3] as AclRule["protocol"],
            source: match[4],
            destination: match[5],
            port: p,
          },
        });
      } else if (
        device === "dns1" &&
        (match = lower.match(/^dns set (\S+) (\S+)$/))
      )
        applyChange(c, device, { kind: "dns", name: match[1], ip: match[2] });
      else if (
        device === "dns1" &&
        (match = lower.match(/^service named (start|stop)$/))
      )
        c.dns1.running = match[1] === "start";
      else if (
        device === "files1" &&
        (match = lower.match(/^service (http|https|ftp) (start|stop)$/))
      )
        c.files1[match[1] as "http" | "https" | "ftp"] = match[2] === "start";
      else if (
        device === "files1" &&
        (match = lower.match(/^ftp passive (on|off)$/))
      )
        c.files1.passive = match[1] === "on";
      else if (
        device === "files1" &&
        (match = lower.match(/^tls minimum (1\.0|1\.2|1\.3)$/))
      )
        c.files1.minTls = match[1] as typeof c.files1.minTls;
      else if (
        device === "files1" &&
        (match = lower.match(/^tls name ([a-z0-9-]+\.interno\.example)$/))
      )
        c.files1.certificateName = match[1];
      else
        throw Error(
          "Orden no implementada en este equipo o contexto. Usa help.",
        );
      output = "Configuración aplicada.";
    }
    if (lower !== "reload") markChange(state, device, before);
    if (diagnosticResult) {
      state.tests.push({
        device,
        command,
        ok: diagnosticResult.ok,
        output,
        time: new Date().toISOString(),
        configVersion: state.configVersion,
      });
      state.tests = state.tests.slice(-80);
      for (const packet of diagnosticResult.packets)
        state.capture.push({
          ...packet,
          number: (state.capture.at(-1)?.number ?? 0) + 1,
        });
      state.capture = state.capture.slice(-300);
    }
  } catch (e) {
    output = "% " + (e instanceof Error ? e.message : "Orden no válida.");
  }
  append(state, device, command, output, prompt(device, previous));
  return { output, context, prompt: prompt(device, context) };
}
