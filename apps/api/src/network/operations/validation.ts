import type { LabState } from "../../../../../packages/network-contracts";
import { SERVICE_NAME } from "./scenarios";
export function validateMission(id: string, state: LabState) {
  const c = state.running;
  const current = (command: string, device = "pc1") =>
    state.tests.some(
      (t) =>
        t.device === device &&
        t.ok &&
        t.command === command &&
        t.configVersion === state.configVersion,
    );
  const http = current(`curl http://${SERVICE_NAME}/entregas/actual`),
    https = current(`curl https://${SERVICE_NAME}/entregas/actual`);
  const critical =
    c.sw1.ports.slice(0, 5).every((p) => p.up) &&
    c.sw1.ports[0].vlan === 8 &&
    c.sw1.ports[1].vlan === 8 &&
    c.sw1.ports[2].mode === "trunk" &&
    c.sw1.ports[3].vlan === 9 &&
    c.r1.lan.up &&
    c.r1.servers.up;
  const checks: { label: string; passed: boolean }[] = [];
  const add = (label: string, passed: boolean) =>
    checks.push({ label, passed });
  switch (id) {
    case "network-01":
      add(
        "Resolución del servicio coherente con el inventario",
        c.dns1.running && c.dns1.records[SERVICE_NAME] === "10.44.9.80",
      );
      add(
        "Consulta DNS reciente desde ST-ANALISTA",
        current(`dig ${SERVICE_NAME}`),
      );
      add("Entrega HTTP reciente desde ST-ANALISTA", http);
      break;
    case "network-02":
      add(
        "Oferta autorizada, sin ofertas del equipo ajeno",
        !c.sw1.ports[5].up ||
          c.sw1.ports[5].vlan !== 8 ||
          (c.sw1.snooping && !c.sw1.ports[5].trusted && c.sw1.ports[2].trusted),
      );
      add("Enlaces de trabajo conservados", critical);
      add(
        "Solicitud DHCP reciente desde ST-ANALISTA",
        current("dhcp discover"),
      );
      break;
    case "network-03":
      add(
        "Servidor enlazado en la VLAN inventariada",
        c.sw1.ports[3].up &&
          c.sw1.ports[3].vlan === 9 &&
          c.sw1.ports[3].mode === "access",
      );
      add(
        "Separación de invitados conservada",
        c.sw1.ports[5].vlan === 99 && c.sw1.ports[5].mode === "access",
      );
      add(
        "Conectividad reciente desde ST-ANALISTA",
        current("ping 10.44.9.80"),
      );
      break;
    case "network-04":
      add(
        "Permiso HTTP específico para la red de análisis",
        c.r1.acl.some(
          (r) =>
            r.action === "permit" &&
            r.protocol === "tcp" &&
            r.source === "10.44.8.0/24" &&
            r.destination === "10.44.9.80/32" &&
            r.port === 80,
        ),
      );
      add(
        "Sin permisos globales entre segmentos",
        !c.r1.acl.some(
          (r) =>
            r.action === "permit" &&
            (r.protocol === "any" ||
              r.source === "any" ||
              r.destination === "any" ||
              (r.protocol === "tcp" && r.port === null)),
        ),
      );
      add("Entrega HTTP reciente desde ST-ANALISTA", http);
      break;
    case "network-05":
      add("HTTP retirado y HTTPS activo", !c.files1.http && c.files1.https);
      add("TLS mínimo 1.2", c.files1.minTls !== "1.0");
      add("Entrega HTTPS reciente con identidad verificada", https);
      break;
    case "network-06":
      add(
        "MTU suficiente en el router",
        c.r1.lan.mtu >= 1428 && c.r1.servers.mtu >= 1428,
      );
      add(
        "Prueba reciente con 1400 bytes y DF",
        current("ping 10.44.9.80 size 1400 df"),
      );
      break;
    case "network-07":
      add("FTP disponible en modo pasivo", c.files1.ftp && c.files1.passive);
      add(
        "Transferencia reciente por el canal de datos",
        current(`ftp get ${SERVICE_NAME}/cierre.txt`),
      );
      break;
    case "network-08":
      add("Fuente de tiempo autorizada", c.r1.ntpServer === "10.44.8.123");
      add(
        "Reloj sincronizado mediante NTP",
        c.r1.clockOffset === 0 && current("ntp sync", "r1"),
      );
      break;
    case "network-09":
      add(
        "Identidad del servicio coherente con el nombre publicado",
        c.files1.certificateName === SERVICE_NAME,
      );
      add("TLS mínimo 1.2", c.files1.minTls !== "1.0");
      add("Entrega HTTPS reciente con identidad verificada", https);
      break;
    case "network-10":
      add(
        "Servicio recuperado por su nombre",
        c.dns1.records[SERVICE_NAME] === "10.44.9.80" && critical && http,
      );
      add(
        "Configuración guardada de los tres equipos",
        ["sw1", "r1", "dns1"].every(
          (d) =>
            JSON.stringify(c[d as "sw1" | "r1" | "dns1"]) ===
            JSON.stringify(state.startup[d as "sw1" | "r1" | "dns1"]),
        ),
      );
      add(
        "Tres equipos reiniciados y comprobados",
        ["sw1", "r1", "dns1"].every((d) =>
          state.reloaded.includes(d as "sw1" | "r1" | "dns1"),
        ) && http,
      );
      break;
  }
  return {
    correct: checks.length > 0 && checks.every((c) => c.passed),
    checks,
  };
}
