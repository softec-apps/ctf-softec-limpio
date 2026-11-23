import { useEffect, useState } from "react";
import type {
  DeviceId,
  LabSnapshot,
  Port,
  NetworkConfig,
  AclRule,
} from "../../../../../packages/network-contracts";
// The server validates this DTO and applies it through the same domain rules as the console.
export type ConfigChange = { kind: string; [key: string]: unknown };
export default function DeviceConfiguration({
  lab,
  device,
  busy,
  onChange,
  onCommand,
  initialPort,
}: {
  lab: LabSnapshot;
  device: DeviceId;
  busy: boolean;
  onChange: (change: ConfigChange) => Promise<void>;
  onCommand: (command: string) => Promise<void>;
  initialPort?: number;
}) {
  const c = lab.state.running;
  const [port, setPort] = useState<Port>(
    structuredClone(c.sw1.ports[(initialPort || 1) - 1]),
  );
  const [snooping, setSnooping] = useState(c.sw1.snooping);
  const [iface, setIface] = useState<"lan" | "servers">("lan");
  const [routed, setRouted] = useState(structuredClone(c.r1.lan));
  const [rule, setRule] = useState<AclRule>({
    id: 60,
    action: "permit",
    protocol: "tcp",
    source: "",
    destination: "",
    port: 80,
  });
  const [ntp, setNtp] = useState(c.r1.ntpServer);
  const [record, setRecord] = useState({
    name: "",
    ip: "",
  });
  const [services, setServices] = useState<NetworkConfig["files1"]>(
    structuredClone(c.files1),
  );
  useEffect(() => {
    setPort((previous) => structuredClone(c.sw1.ports[previous.number - 1]));
    setSnooping(c.sw1.snooping);
    setRouted(structuredClone(c.r1[iface]));
    setNtp(c.r1.ntpServer);
    setServices(structuredClone(c.files1));
    setRecord((previous) =>
      Object.hasOwn(c.dns1.records, previous.name)
        ? { ...previous, ip: c.dns1.records[previous.name] }
        : previous,
    );
  }, [lab.revision]);
  return (
    <fieldset disabled={busy} className="nos-config">
      {device === "pc1" ? (
        <section>
          <h3>Configuración del puesto de pruebas</h3>
          <dl>
            <div>
              <dt>Dirección</dt>
              <dd>10.44.8.41/24</dd>
            </div>
            <div>
              <dt>Puerta de enlace</dt>
              <dd>10.44.8.1</dd>
            </div>
            <div>
              <dt>Servidor DNS</dt>
              <dd>10.44.8.53</dd>
            </div>
          </dl>
          <p>
            Utiliza la consola para generar tráfico y comprobar el recorrido.
            Las interfaces de este puesto se conservan según el inventario.
          </p>
          <button onClick={() => void onCommand("help")} disabled={busy}>
            Consultar comandos de pruebas
          </button>
        </section>
      ) : device === "sw1" ? (
        <>
          <section>
            <h3>Interfaces Ethernet</h3>
            <div className="nos-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Puerto</th>
                    <th>Equipo conectado</th>
                    <th>Estado</th>
                    <th>Modo</th>
                    <th>VLAN</th>
                    <th>DHCP</th>
                  </tr>
                </thead>
                <tbody>
                  {c.sw1.ports.map((p) => (
                    <tr key={p.number}>
                      <td>
                        <button
                          aria-label={`Editar Ethernet1/${p.number}`}
                          onClick={() => setPort(structuredClone(p))}
                        >
                          Eth1/{p.number}
                        </button>
                      </td>
                      <td>{p.description}</td>
                      <td>{p.up ? "Conectado" : "Desactivado"}</td>
                      <td>{p.mode}</td>
                      <td>{p.vlan}</td>
                      <td>{p.trusted ? "Trusted" : "Untrusted"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form
              className="nos-config-form"
              onSubmit={(e) => {
                e.preventDefault();
                const { description, ...values } = port;
                void onChange({ kind: "port", ...values });
              }}
            >
              <h4>Ethernet1/{port.number}</h4>
              <label className="nos-check">
                <input
                  type="checkbox"
                  checked={port.up}
                  onChange={(e) =>
                    setPort((p) => ({ ...p, up: e.target.checked }))
                  }
                />
                Interfaz habilitada
              </label>
              <label>
                Modo
                <select
                  aria-label="Modo de Ethernet"
                  value={port.mode}
                  onChange={(e) =>
                    setPort((p) => ({
                      ...p,
                      mode: e.target.value as Port["mode"],
                    }))
                  }
                >
                  <option value="access">Access</option>
                  <option value="trunk">Trunk</option>
                </select>
              </label>
              <label>
                VLAN de acceso
                <select
                  aria-label="VLAN de acceso"
                  value={port.vlan}
                  onChange={(e) =>
                    setPort((p) => ({ ...p, vlan: Number(e.target.value) }))
                  }
                >
                  {[8, 9, 99].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="nos-check">
                <input
                  type="checkbox"
                  checked={port.trusted}
                  onChange={(e) =>
                    setPort((p) => ({ ...p, trusted: e.target.checked }))
                  }
                />
                Origen DHCP de confianza
              </label>
              <button disabled={busy}>Aplicar interfaz</button>
            </form>
          </section>
          <section>
            <h3>Protección DHCP</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onChange({ kind: "snooping", enabled: snooping });
              }}
            >
              <label className="nos-check">
                <input
                  type="checkbox"
                  checked={snooping}
                  onChange={(e) => setSnooping(e.target.checked)}
                />
                DHCP snooping habilitado
              </label>
              <button disabled={busy}>Aplicar protección DHCP</button>
            </form>
          </section>
        </>
      ) : device === "r1" ? (
        <>
          <section>
            <h3>Interfaces enrutadas</h3>
            <form
              className="nos-config-form"
              onSubmit={(e) => {
                e.preventDefault();
                void onChange({ kind: "interface", name: iface, ...routed });
              }}
            >
              <label>
                Interfaz
                <select
                  aria-label="Interfaz del router"
                  value={iface}
                  onChange={(e) => {
                    const key = e.target.value as typeof iface;
                    setIface(key);
                    setRouted(structuredClone(c.r1[key]));
                  }}
                >
                  <option value="lan">lan</option>
                  <option value="servers">servers</option>
                </select>
              </label>
              <label>
                Dirección / prefijo
                <input
                  value={routed.ip}
                  onChange={(e) =>
                    setRouted((r) => ({ ...r, ip: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                MTU
                <input
                  type="number"
                  min={576}
                  max={9000}
                  value={routed.mtu}
                  onChange={(e) =>
                    setRouted((r) => ({ ...r, mtu: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="nos-check">
                <input
                  type="checkbox"
                  checked={routed.up}
                  onChange={(e) =>
                    setRouted((r) => ({ ...r, up: e.target.checked }))
                  }
                />
                Interfaz habilitada
              </label>
              <button disabled={busy}>Aplicar interfaz enrutada</button>
            </form>
          </section>
          <section>
            <h3>Reglas de acceso entre segmentos</h3>
            <p>
              Se evalúan por número, de menor a mayor. El tráfico sin
              coincidencia se deniega.
            </p>
            <div className="nos-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>N.º</th>
                    <th>Acción</th>
                    <th>Protocolo</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Puerto</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {c.r1.acl.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.action}</td>
                      <td>{r.protocol}</td>
                      <td>{r.source}</td>
                      <td>{r.destination}</td>
                      <td>{r.port ?? "any"}</td>
                      <td>
                        <button
                          aria-label={`Eliminar regla ${r.id}`}
                          disabled={busy}
                          onClick={() =>
                            void onChange({ kind: "delete-acl", id: r.id })
                          }
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form
              className="nos-config-form"
              onSubmit={(e) => {
                e.preventDefault();
                void onChange({ kind: "acl", rule });
              }}
            >
              <label>
                Número de regla
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={rule.id}
                  onChange={(e) =>
                    setRule((r) => ({ ...r, id: Number(e.target.value) }))
                  }
                />
              </label>
              <label>
                Acción
                <select
                  aria-label="Acción de regla"
                  value={rule.action}
                  onChange={(e) =>
                    setRule((r) => ({
                      ...r,
                      action: e.target.value as AclRule["action"],
                    }))
                  }
                >
                  <option>permit</option>
                  <option>deny</option>
                </select>
              </label>
              <label>
                Protocolo
                <select
                  aria-label="Protocolo de regla"
                  value={rule.protocol}
                  onChange={(e) =>
                    setRule((r) => ({
                      ...r,
                      protocol: e.target.value as AclRule["protocol"],
                    }))
                  }
                >
                  {["tcp", "udp", "icmp", "any"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Red de origen
                <input
                  placeholder="IPv4/prefijo o any"
                  value={rule.source}
                  onChange={(e) =>
                    setRule((r) => ({ ...r, source: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Red de destino
                <input
                  placeholder="IPv4/prefijo o any"
                  value={rule.destination}
                  onChange={(e) =>
                    setRule((r) => ({ ...r, destination: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Puerto destino
                <input
                  placeholder="any"
                  type="number"
                  min={1}
                  max={65535}
                  value={rule.port ?? ""}
                  onChange={(e) =>
                    setRule((r) => ({
                      ...r,
                      port: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </label>
              <button disabled={busy}>Guardar regla</button>
            </form>
          </section>
          <section>
            <h3>Sincronización del reloj</h3>
            <p>Desfase actual: {c.r1.clockOffset} s</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onChange({ kind: "ntp", server: ntp });
              }}
            >
              <label>
                Servidor NTP
                <input
                  value={ntp}
                  onChange={(e) => setNtp(e.target.value)}
                  required
                />
              </label>
              <button disabled={busy}>Aplicar fuente NTP</button>
            </form>
            <button disabled={busy} onClick={() => void onCommand("ntp sync")}>
              Sincronizar reloj
            </button>
          </section>
        </>
      ) : device === "dns1" ? (
        <>
          <section>
            <h3>Servicio de nombres</h3>
            <p>named: {c.dns1.running ? "En ejecución" : "Detenido"}</p>
            <button
              disabled={busy}
              onClick={() =>
                void onChange({ kind: "dns-service", running: !c.dns1.running })
              }
            >
              {c.dns1.running ? "Detener DNS" : "Iniciar DNS"}
            </button>
          </section>
          <section>
            <h3>Zona interno.example</h3>
            <div className="nos-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Dirección</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(c.dns1.records).map(([name, ip]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>A</td>
                      <td>{ip}</td>
                      <td>
                        <button
                          onClick={() => setRecord({ name, ip })}
                          aria-label={`Editar registro ${name}`}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form
              className="nos-config-form"
              onSubmit={(e) => {
                e.preventDefault();
                void onChange({ kind: "dns", ...record });
              }}
            >
              <label>
                Nombre DNS
                <input
                  value={record.name}
                  onChange={(e) =>
                    setRecord((r) => ({ ...r, name: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Dirección IPv4
                <input
                  value={record.ip}
                  onChange={(e) =>
                    setRecord((r) => ({ ...r, ip: e.target.value }))
                  }
                  required
                />
              </label>
              <button disabled={busy}>Guardar registro DNS</button>
            </form>
          </section>
        </>
      ) : (
        <section>
          <h3>Servicios de remesas</h3>
          <form
            className="nos-config-form"
            onSubmit={(e) => {
              e.preventDefault();
              void onChange({ kind: "services", value: services });
            }}
          >
            {(["http", "https", "ftp", "passive"] as const).map((key) => (
              <label className="nos-check" key={key}>
                <input
                  type="checkbox"
                  checked={services[key]}
                  onChange={(e) =>
                    setServices((s) => ({ ...s, [key]: e.target.checked }))
                  }
                />
                {
                  {
                    http: "HTTP",
                    https: "HTTPS",
                    ftp: "FTP",
                    passive: "Canal de datos FTP pasivo",
                  }[key]
                }
              </label>
            ))}
            <label>
              Nombre del certificado TLS
              <input
                value={services.certificateName}
                onChange={(e) =>
                  setServices((s) => ({
                    ...s,
                    certificateName: e.target.value,
                  }))
                }
              />
            </label>
            <label>
              Versión mínima de TLS
              <select
                value={services.minTls}
                onChange={(e) =>
                  setServices((s) => ({
                    ...s,
                    minTls: e.target.value as typeof services.minTls,
                  }))
                }
              >
                {["1.0", "1.2", "1.3"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <button disabled={busy}>Aplicar servicios</button>
          </form>
        </section>
      )}
      {device !== "pc1" && (
        <section className="nos-persistence">
          <h3>Memoria de configuración</h3>
          <p>
            Aplicar modifica running-config. Guardar conserva los ajustes al
            reiniciar el dispositivo.
          </p>
          <button
            disabled={busy}
            onClick={() => void onCommand("copy running-config startup-config")}
          >
            Guardar configuración de inicio
          </button>
          <button disabled={busy} onClick={() => void onCommand("reload")}>
            Reiniciar dispositivo
          </button>
        </section>
      )}
    </fieldset>
  );
}
