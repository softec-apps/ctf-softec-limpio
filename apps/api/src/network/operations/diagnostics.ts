import type {
  DeviceId,
  LabState,
  LivePacket,
  NetworkConfig,
} from "../../../../../packages/network-contracts";
import { DEVICES, SERVICE_NAME } from "./scenarios";
export function validIp(ip: string) {
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) &&
    ip.split(".").every((o) => Number(o) <= 255)
  );
}
export function validCidr(cidr: string) {
  if (cidr === "any") return true;
  const [ip, bits, ...rest] = cidr.split("/");
  return (
    !rest.length &&
    validIp(ip) &&
    /^\d+$/.test(bits || "") &&
    Number(bits) >= 0 &&
    Number(bits) <= 32
  );
}
function ipv4(ip: string) {
  return ip.split(".").reduce((acc, n) => (acc * 256 + Number(n)) >>> 0, 0);
}
export function networkAddress(cidr: string) {
  const [ip, bits] = cidr.split("/");
  const mask =
    Number(bits) === 0 ? 0 : (0xffffffff << (32 - Number(bits))) >>> 0;
  const n = (ipv4(ip) & mask) >>> 0;
  return `${[n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".")}/${bits}`;
}
export function inSubnet(ip: string, cidr: string) {
  if (cidr === "any") return true;
  const [network, bits] = cidr.split("/");
  const mask =
    Number(bits) === 0 ? 0 : (0xffffffff << (32 - Number(bits))) >>> 0;
  return (ipv4(ip) & mask) === (ipv4(network) & mask);
}
const endpoints: Record<string, { vlan: number; port?: number }> = {
  "10.44.8.41": { vlan: 8, port: 1 },
  "10.44.8.53": { vlan: 8, port: 2 },
  "10.44.8.1": { vlan: 8, port: 3 },
  "10.44.8.2": { vlan: 8 },
  "10.44.8.90": { vlan: 8, port: 5 },
  "10.44.8.123": { vlan: 8, port: 5 },
  "10.44.9.80": { vlan: 9, port: 4 },
  "10.44.9.70": { vlan: 9, port: 7 },
};
export function reachability(
  c: NetworkConfig,
  device: DeviceId,
  destination: string,
  protocol: string,
  port: number | null,
  size = 0,
) {
  const source = DEVICES.find((d) => d.id === device)!.ip;
  const from = endpoints[source],
    to = endpoints[destination];
  if (!to)
    return {
      ok: false,
      reason: "No responde ningún equipo inventariado en esa dirección.",
      mtu: 0,
    };
  for (const endpoint of [from, to])
    if (endpoint.port) {
      const link = c.sw1.ports[endpoint.port - 1];
      if (!link.up)
        return {
          ok: false,
          reason: `Ethernet1/${link.number} administrativamente desactivado.`,
          mtu: 0,
        };
      if (
        (endpoint.port !== 3 && link.mode !== "access") ||
        (link.mode !== "trunk" && link.vlan !== endpoint.vlan)
      )
        return {
          ok: false,
          reason: `Ethernet1/${link.number}: la VLAN no coincide con el segmento de su equipo.`,
          mtu: 0,
        };
    }
  let mtu = 1500;
  if (from.vlan !== to.vlan) {
    if (!c.sw1.ports[2].up || c.sw1.ports[2].mode !== "trunk")
      return {
        ok: false,
        reason: "El enlace troncal hacia el router no está operativo.",
        mtu: 0,
      };
    if (
      !c.r1.lan.up ||
      !c.r1.servers.up ||
      c.r1.lan.ip !== "10.44.8.1/24" ||
      c.r1.servers.ip !== "10.44.9.1/24"
    )
      return {
        ok: false,
        reason:
          "Las interfaces o las redes conectadas del router no permiten el recorrido.",
        mtu: 0,
      };
    mtu = Math.min(c.r1.lan.mtu, c.r1.servers.mtu);
  }
  if (
    from.vlan === to.vlan &&
    (device === "r1" || destination === "10.44.8.1")
  ) {
    if (!c.r1.lan.up || !c.sw1.ports[2].up || c.sw1.ports[2].mode !== "trunk")
      return {
        ok: false,
        reason: "El enlace local del router no está disponible.",
        mtu: 0,
      };
    mtu = c.r1.lan.mtu;
  }
  if (from.vlan !== to.vlan) {
    const rule = [...c.r1.acl]
      .sort((a, b) => a.id - b.id)
      .find(
        (r) =>
          (r.protocol === "any" || r.protocol === protocol) &&
          inSubnet(source, r.source) &&
          inSubnet(destination, r.destination) &&
          (r.port === null || r.port === port),
      );
    if (!rule || rule.action !== "permit")
      return {
        ok: false,
        reason: "El filtro entre segmentos no permite este tráfico.",
        mtu,
      };
  }
  if (size + 28 > mtu)
    return {
      ok: false,
      reason: `ICMP: fragmentation needed and DF set. MTU del recorrido: ${mtu}.`,
      mtu,
    };
  return { ok: true, reason: "Recorrido disponible.", mtu };
}
export type Probe = {
  ok: boolean;
  output: string;
  packets: Omit<LivePacket, "number">[];
};
export function diagnostic(
  state: LabState,
  device: DeviceId,
  command: string,
): Probe | undefined {
  const c = state.running,
    source = DEVICES.find((d) => d.id === device)!.ip,
    packets: Omit<LivePacket, "number">[] = [];
  const captureStart = Math.max(
    Date.now(),
    state.capture.length ? Date.parse(state.capture.at(-1)!.time) + 2 : 0,
  );
  const streamId = Math.max(0, ...state.capture.map((p) => p.stream ?? 0)) + 1;
  let activePort: number | undefined;
  const add = (
    protocol: string,
    destination: string,
    info: string,
    details: Record<string, string>,
    reply = false,
    payload?: string,
  ) => {
    const destinationPort =
      (
        {
          DNS: 53,
          DHCP: 67,
          NTP: 123,
          HTTP: 80,
          TLS: 443,
          FTP: 21,
          "FTP-DATA": 50000,
        } as Record<string, number>
      )[protocol] || activePort;
    packets.push({
      time: new Date(captureStart + packets.length * 2).toISOString(),
      ...(destinationPort
        ? {
            sourcePort: reply
              ? destinationPort
              : protocol === "DHCP"
                ? 68
                : 53000,
            destinationPort: reply
              ? protocol === "DHCP"
                ? 68
                : 53000
              : destinationPort,
          }
        : {}),
      source: reply ? destination : source,
      destination: reply ? source : destination,
      protocol,
      ...(["TCP", "HTTP", "TLS", "FTP", "FTP-DATA"].includes(protocol)
        ? { stream: streamId + (protocol === "FTP-DATA" ? 1 : 0) }
        : {}),
      info,
      details,
      length: 64 + Buffer.byteLength(payload ?? info, "utf8"),
      ...(payload === undefined ? {} : { payload }),
    });
  };
  const finish = (ok: boolean, output: string) => ({ ok, output, packets });
  if (command === "dhcp discover") {
    if (device !== "pc1")
      return finish(false, "Ejecuta la solicitud desde ST-ANALISTA.");
    const client = c.sw1.ports[0];
    if (!client.up || client.vlan !== 8)
      return finish(
        false,
        "El puesto de análisis no tiene enlace en su segmento.",
      );
    add("DHCP", "255.255.255.255", "DHCP Discover", {
      MessageType: "Discover",
    });
    packets.at(-1)!.source = "0.0.0.0";
    const authorized =
      c.sw1.ports[2].up &&
      c.sw1.ports[2].mode === "trunk" &&
      c.r1.lan.up &&
      (!c.sw1.snooping || c.sw1.ports[2].trusted);
    const rogue =
      c.sw1.ports[5].up &&
      c.sw1.ports[5].vlan === 8 &&
      (!c.sw1.snooping || c.sw1.ports[5].trusted);
    if (authorized)
      add(
        "DHCP",
        "10.44.8.1",
        "DHCP Offer",
        { ServerIdentifier: "10.44.8.1", Ingress: "Ethernet1/3" },
        true,
      );
    if (rogue)
      add(
        "DHCP",
        "10.44.8.254",
        "DHCP Offer",
        { ServerIdentifier: "10.44.8.254", Ingress: "Ethernet1/6" },
        true,
      );
    for (const packet of packets)
      if (packet.details.ServerIdentifier)
        packet.destination = "255.255.255.255";
    return finish(
      authorized && !rogue,
      `Ofertas recibidas:\n${authorized ? "10.44.8.1   Ethernet1/3\n" : ""}${rogue ? "10.44.8.254 Ethernet1/6\n" : ""}${!authorized && !rogue ? "Ninguna oferta recibida." : ""}`,
    );
  }
  if (command === "ntp sync") {
    if (device !== "r1")
      return finish(
        false,
        "La sincronización de este reloj se opera desde ST-RTR01.",
      );
    const route = reachability(c, device, c.r1.ntpServer, "udp", 123);
    const ok = route.ok && c.r1.ntpServer === "10.44.8.123";
    add("NTP", c.r1.ntpServer, "Solicitud de sincronización", {
      Mode: "client",
    });
    if (ok) {
      c.r1.clockOffset = 0;
      add(
        "NTP",
        c.r1.ntpServer,
        "Respuesta de fuente autorizada",
        { Mode: "server", Offset: "0 s" },
        true,
      );
    }
    return finish(
      ok,
      ok
        ? "Clock synchronized. Source 10.44.8.123; offset 0 s."
        : `No se recibió una referencia NTP válida. ${route.reason}`,
    );
  }
  const ping = command.match(
    /^(ping|traceroute) ([a-zA-Z0-9.-]+)(?: size (\d{1,4}) df)?$/,
  );
  const dig = command.match(/^dig ([a-zA-Z0-9.-]+)$/);
  const curl = command.match(/^curl (https?:\/\/[^\s]+)$/);
  const ftp = command.match(/^ftp get ([a-zA-Z0-9.-]+)\/([a-zA-Z0-9._-]+)$/);
  if (!ping && !dig && !curl && !ftp) return;
  let target = ping?.[2] || dig?.[1] || ftp?.[1] || "";
  let url: URL | undefined;
  if (curl) {
    try {
      url = new URL(curl[1]);
    } catch {
      return finish(false, "Dirección de servicio no válida.");
    }
    if (
      url.username ||
      url.password ||
      url.port ||
      !["http:", "https:"].includes(url.protocol)
    )
      return finish(
        false,
        "Dirección o puerto ajeno a los servicios del recinto.",
      );
    target = url.hostname;
  }
  let destination = target;
  if (!validIp(target) || dig) {
    if (!Object.hasOwn(c.dns1.records, target))
      return finish(
        false,
        "NXDOMAIN: el nombre no figura en la zona del recinto.",
      );
    const path = reachability(c, device, "10.44.8.53", "udp", 53);
    add("DNS", "10.44.8.53", `Query A ${target}`, { Query: target });
    if (!path.ok || !c.dns1.running)
      return finish(
        false,
        `DNS timeout. ${!c.dns1.running ? "El servicio DNS está detenido." : path.reason}`,
      );
    destination = c.dns1.records[target];
    add(
      "DNS",
      "10.44.8.53",
      `Answer ${destination}`,
      { Query: target, Answer: destination },
      true,
    );
  }
  if (dig)
    return finish(
      true,
      `${target}.  300 IN A ${destination}\nSERVER: 10.44.8.53#53`,
    );
  if (ping) {
    const size = Number(ping[3] || 56);
    if (size > 1472)
      return finish(
        false,
        "El generador de pruebas admite hasta 1472 bytes de carga.",
      );
    const path = reachability(c, device, destination, "icmp", null, size);
    add("ICMP", destination, "Echo request", {
      Size: String(size),
      DF: String(!!ping[3]),
    });
    if (path.ok)
      add(
        "ICMP",
        destination,
        "Echo reply",
        { Size: String(size), Time: "2 ms" },
        true,
      );
    else if (path.reason.startsWith("ICMP:")) {
      add(
        "ICMP",
        destination,
        "Destination unreachable / fragmentation needed",
        { Type: "3", Code: "4", MTU: String(path.mtu) },
        true,
      );
      packets.at(-1)!.source = "10.44.8.1";
    }
    return finish(
      path.ok,
      path.ok
        ? ping[1] === "traceroute"
          ? endpoints[source].vlan === endpoints[destination].vlan
            ? `1 ${destination} 2 ms`
            : `1 ${endpoints[source].vlan === 8 ? "10.44.8.1" : "10.44.9.1"}\n2 ${destination} 2 ms`
          : `64 bytes from ${destination}: seq=1 ttl=63 time=2 ms\n1 transmitted, 1 received, 0% packet loss${ping[3] ? " · DF, " + size + " bytes de carga" : ""}`
        : `Destination unreachable. ${path.reason}`,
    );
  }
  const port = ftp ? 21 : url!.protocol === "https:" ? 443 : 80;
  activePort = port;
  const path = reachability(c, device, destination, "tcp", port);
  add("TCP", destination, `SYN ${port}`, {
    Flags: "SYN",
    DestinationPort: String(port),
  });
  if (!path.ok) return finish(false, `Connection failed. ${path.reason}`);
  if (destination !== "10.44.9.80")
    return finish(
      false,
      "La dirección resuelta no alberga el servicio solicitado.",
    );
  add("TCP", destination, "SYN ACK", { Flags: "SYN ACK" }, true);
  if (ftp) {
    if (!c.files1.ftp) return finish(false, "421 FTP service unavailable");
    if (!["cierre.txt", "inventario.csv"].includes(ftp[2]))
      return finish(false, "550 File unavailable.");
    add("FTP", destination, `RETR ${ftp[2]}`, { Command: "RETR" });
    if (!c.files1.passive)
      return finish(false, "425 Cannot open active data connection.");
    const data = reachability(c, device, destination, "tcp", 50000);
    if (!data.ok) return finish(false, "425 Passive data channel blocked.");
    add(
      "FTP-DATA",
      destination,
      "Data transfer",
      { Mode: "EPSV", DataPort: "50000" },
      true,
      "Transferencia de cierre del turno completada.",
    );
    add("FTP", destination, "226 Transfer complete", { Status: "226" }, true);
    return finish(
      true,
      `229 Entering Extended Passive Mode (|||50000|)\n150 Data connection ready\n226 Transfer complete: ${ftp[2]}`,
    );
  }
  if (port === 443) {
    if (!c.files1.https)
      return finish(false, "Connection refused: HTTPS no está activo.");
    add("TLS", destination, "ClientHello", {
      ServerName: target,
      MinimumTLS: "1.2",
    });
    const identity = c.files1.certificateName === target;
    add(
      "TLS",
      destination,
      identity ? "ServerHello" : "Certificate name mismatch",
      {
        CertificateName: c.files1.certificateName,
        MinimumTLS: c.files1.minTls,
      },
      true,
    );
    if (!identity)
      return finish(
        false,
        "TLS error: el nombre del certificado no coincide con el servicio.",
      );
  } else if (!c.files1.http)
    return finish(false, "Connection refused: HTTP está deshabilitado.");
  if (url!.pathname !== "/" && url!.pathname !== "/entregas/actual")
    return finish(false, "HTTP/1.1 404 Not Found");
  if (port === 80) {
    add(
      "HTTP",
      destination,
      `GET ${url!.pathname}`,
      { Host: target },
      false,
      `GET ${url!.pathname} HTTP/1.1\r\nHost: ${target}\r\n\r\n`,
    );
    add(
      "HTTP",
      destination,
      "200 OK",
      { Status: "200" },
      true,
      "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nRemesas: entrega de turno disponible.",
    );
  }
  return finish(
    true,
    `HTTP/1.1 200 OK\nServidor: ST-SRV02\nServicio: ${port === 443 ? "HTTPS (identidad verificada)" : "HTTP"}\nRemesas: entrega de turno disponible.`,
  );
}
