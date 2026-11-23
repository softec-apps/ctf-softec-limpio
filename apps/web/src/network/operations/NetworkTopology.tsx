import { Monitor, Network, Router, Server } from "lucide-react";
import type {
  DeviceId,
  LabSnapshot,
} from "../../../../../packages/network-contracts";
export default function NetworkTopology({
  lab,
  onSelect,
}: {
  lab: LabSnapshot;
  onSelect: (id: DeviceId, port?: number) => void;
}) {
  const c = lab.state.running;
  return (
    <section className="nos-topology">
      <header>
        <h2>Red del laboratorio</h2>
        <p>Inventario y estado del laboratorio activo</p>
      </header>
      <div className="nos-device-grid">
        {lab.devices.map((d) => (
          <button key={d.id} onClick={() => onSelect(d.id)}>
            {d.id === "pc1" ? (
              <Monitor />
            ) : d.id === "sw1" ? (
              <Network />
            ) : d.id === "r1" ? (
              <Router />
            ) : (
              <Server />
            )}
            <strong>{d.name}</strong>
            <span>{d.role}</span>
            <code>{d.ip}</code>
            <small>
              {d.id === "dns1"
                ? c.dns1.running
                  ? "DNS en ejecución"
                  : "DNS detenido"
                : d.id === "files1"
                  ? `HTTP ${c.files1.http ? "on" : "off"} / HTTPS ${c.files1.https ? "on" : "off"}`
                  : d.id === "r1"
                    ? `lan ${c.r1.lan.up ? "up" : "down"} / servers ${c.r1.servers.up ? "up" : "down"}`
                    : d.id === "sw1"
                      ? `${c.sw1.ports.filter((p) => p.up).length} puertos habilitados`
                      : "Puesto de diagnóstico"}
            </small>
          </button>
        ))}
      </div>
      <section className="nos-switch-map">
        <h3>ST-SW01 · Panel de conexiones</h3>
        <div>
          {c.sw1.ports.map((p) => (
            <button
              key={p.number}
              onClick={() => onSelect("sw1", p.number)}
              className={p.up ? "port-up" : "port-down"}
              aria-label={`Administrar puerto ${p.number}`}
            >
              <span className="nos-port-socket" />
              <strong>{String(p.number).padStart(2, "0")}</strong>
              <small>
                {p.up ? "UP" : "DOWN"} ·{" "}
                {p.mode === "trunk" ? "TRUNK" : "VLAN " + p.vlan}
              </small>
              <span>{p.description}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="nos-inventory-notes">
        <section>
          <h3>Segmentos de trabajo</h3>
          <p>VLAN 8 · Análisis y DNS · 10.44.8.0/24</p>
          <p>VLAN 9 · Servidores y almacenamiento · 10.44.9.0/24</p>
          <p>VLAN 99 · Invitados</p>
        </section>
        <section>
          <h3>Servicios inventariados</h3>
          <p>Remesas: remesas.interno.example → 10.44.9.80</p>
          <p>DNS: 10.44.8.53 · NTP autorizado: 10.44.8.123</p>
          <p>Router: Ethernet1/3 troncal · Gateway 10.44.8.1</p>
        </section>
      </div>
    </section>
  );
}
