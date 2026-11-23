import { useEffect, useRef, useState } from "react";
import {
  X,
  Network,
  Monitor,
  Server,
  Router,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import { api, post, ApiError } from "../api";
import { useLabSession } from "../useLabSession";
import type {
  LabSnapshot,
  DeviceId,
  ConsoleContext,
} from "../../../../packages/network-contracts";
import NetworkConsole from "./operations/NetworkConsole";
import DeviceConfiguration, {
  type ConfigChange,
} from "./operations/DeviceConfiguration";
import NetworkMissions from "./operations/NetworkMissions";
import NetworkTopology from "./operations/NetworkTopology";
import "./operations/operations.css";
const initialContexts = () =>
  Object.fromEntries(
    ["pc1", "sw1", "r1", "dns1", "files1"].map((d) => [d, { mode: "user" }]),
  ) as Record<DeviceId, ConsoleContext>;
export default function RackNetworkPanel({
  active,
  onClose,
  onComputer,
  initialDevice,
  initialMission,
  initialPort,
  sequence = 0,
  onPorts,
}: {
  active: boolean;
  onClose: () => void;
  onComputer: () => void;
  initialMission?: string;
  initialDevice?: DeviceId;
  initialPort?: number;
  sequence?: number;
  onPorts?: (ports: boolean[]) => void;
}) {
  const session = useLabSession(active);
  const labOwner = useRef<string | undefined>(undefined);
  const [lab, setLab] = useState<LabSnapshot>();
  const [labId, setLabId] = useState("free");
  const [device, setDevice] = useState<DeviceId>(initialDevice || "sw1");
  const [port, setPort] = useState<number | undefined>(initialPort);
  const [page, setPage] = useState<"topology" | "device" | "missions">(
    initialDevice ? "device" : "topology",
  );
  const [tab, setTab] = useState<"config" | "console" | "tests">("config");
  const [contexts, setContexts] = useState(initialContexts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checks, setChecks] = useState<{ label: string; passed: boolean }[]>(
    [],
  );
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    setLab(undefined);
    setLabId("free");
    setContexts(initialContexts());
    setError("");
    setNotice("");
    setChecks([]);
  }, [session.user?.id]);
  useEffect(() => {
    if (initialMission) {
      setPage("missions");
    } else if (initialDevice) {
      setDevice(initialDevice);
      setPort(initialPort);
      setPage("device");
      setTab("config");
    }
  }, [sequence]);
  useEffect(() => {
    if (active && session.user) {
      const controller = new AbortController();
      const target = labOwner.current === session.user.id ? labId : "free";
      labOwner.current = session.user.id;
      api<LabSnapshot>(`/network/labs/${target}`, { signal: controller.signal })
        .then((s) => {
          if (!controller.signal.aborted) setLab(s);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
      return () => controller.abort();
    }
  }, [active, session.user?.id]);
  async function load(id: string) {
    setBusy(true);
    setError("");
    try {
      const s = await api<LabSnapshot>(`/network/labs/${id}`);
      setLab(s);
      setLabId(id);
      setContexts(initialContexts());
      setChecks([]);
      setNotice(
        id === "free"
          ? "Laboratorio libre preparado."
          : "Incidencia preparada. Los equipos conservan su estado de trabajo.",
      );
      setPage("topology");
      setConfirmReset(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo preparar la red.");
    } finally {
      setBusy(false);
    }
  }
  async function operate(
    action: "command" | "configure" | "reset",
    values: Record<string, unknown>,
  ) {
    if (!lab || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const s = await post(`/network/labs/${lab.id}/${action}`, {
        revision: lab.revision,
        ...values,
      });
      setLab(s);
      setChecks([]);
      if (s.context) setContexts((c) => ({ ...c, [device]: s.context }));
      if (s.output) {
        if (tab !== "console") setNotice(s.output);
      } else
        setNotice(
          action === "reset"
            ? "Incidencia restablecida."
            : "Configuración aplicada.",
        );
      if (action === "reset") {
        setContexts(initialContexts());
        setConfirmReset(false);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo aplicar la operación.",
      );
      if (e instanceof ApiError && e.status === 409)
        try {
          setLab(await api<LabSnapshot>(`/network/labs/${lab.id}`));
        } catch {
          setError("No se pudo actualizar el estado. Usa Actualizar.");
        }
    } finally {
      setBusy(false);
    }
  }
  async function command(input: string) {
    await operate("command", {
      device,
      command: input,
      context: contexts[device],
    });
  }
  function select(id: DeviceId, number?: number) {
    setDevice(id);
    setPort(number);
    setPage("device");
    setTab("config");
    setNotice("");
    setError("");
  }
  async function validate() {
    if (!lab || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await post(`/network/labs/${lab.id}/validate`, {
        revision: lab.revision,
      });
      setLab((l) => (l ? { ...l, revision: result.revision } : l));
      setChecks(result.checks);
      setNotice(
        result.message +
          (result.awardedPoints ? ` +${result.awardedPoints} puntos.` : ""),
      );
      if (result.correct) {
        await session.refresh();
        window.dispatchEvent(new Event("ctf-progress-changed"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo validar la red.");
      if (e instanceof ApiError && e.status === 409)
        setLab(await api<LabSnapshot>(`/network/labs/${lab.id}`));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    onPorts?.(
      lab?.state.running.sw1.ports.map((p) => p.up) || [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
      ],
    );
  }, [lab?.state.running.sw1.ports]);
  const selected = lab?.devices.find((d) => d.id === device);
  return (
    <section
      className="rack-operations"
      hidden={!active}
      aria-label="Administración de dispositivos de red"
    >
      <header className="nos-titlebar">
        <Network size={23} />
        <div>
          <strong>Centro de administración del rack</strong>
          <small>
            Seventech NOS · {lab?.mission?.title || "Laboratorio libre"}
          </small>
        </div>
        <button aria-label="Cerrar administración del rack" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {!session.user ? (
        <div className="nos-login">
          <h2>Acceso a los dispositivos</h2>
          <p>
            Inicia sesión con tu cuenta del laboratorio en el computador para
            administrar tu red.
          </p>
          <button onClick={onComputer}>Ir al computador</button>
        </div>
      ) : !lab ? (
        <div className="nos-login">
          <p role="status">Conectando con los dispositivos…</p>
          {error && <p role="alert">{error}</p>}
          <button onClick={() => void load(labId)}>Volver a conectar</button>
        </div>
      ) : (
        <>
          <div className="nos-workspace">
            <aside className="nos-sidebar">
              <button
                className={page === "topology" ? "selected" : ""}
                onClick={() => setPage("topology")}
              >
                <Network size={17} />
                Topología
              </button>
              <button
                className={page === "missions" ? "selected" : ""}
                onClick={() => setPage("missions")}
              >
                <ClipboardList size={17} />
                Incidencias
              </button>
              <h2>Dispositivos</h2>
              {lab.devices.map((d) => (
                <button
                  key={d.id}
                  className={
                    page === "device" && device === d.id ? "selected" : ""
                  }
                  onClick={() => select(d.id)}
                >
                  {d.id === "pc1" ? (
                    <Monitor size={17} />
                  ) : d.id === "r1" ? (
                    <Router size={17} />
                  ) : (
                    <Server size={17} />
                  )}
                  <span>
                    {d.name}
                    <small>{d.ip}</small>
                  </span>
                </button>
              ))}
              <div className="nos-sidebar-status">
                <span>Estado personal</span>
                <strong>Revisión {lab.revision}</strong>
                <small>Persistente entre sesiones</small>
                <small>
                  {session.game?.solves.filter((s) =>
                    s.challengeId.startsWith("network-"),
                  ).length || 0}{" "}
                  /{" "}
                  {session.game?.challenges.filter((c) =>
                    c.id.startsWith("network-"),
                  ).length || 0}{" "}
                  incidencias resueltas
                </small>
              </div>
            </aside>
            <main className="nos-main">
              <div className="nos-lab-toolbar">
                <span>
                  {lab.mission ? "Incidencia operativa" : "Exploración libre"}
                </span>
                <button disabled={busy} onClick={() => void load(lab.id)}>
                  <RefreshCw size={14} />
                  Actualizar
                </button>
                {lab.mission && (
                  <button
                    className="nos-primary"
                    disabled={busy}
                    onClick={() => void validate()}
                  >
                    Validar red
                  </button>
                )}
              </div>
              {error && (
                <p className="nos-alert" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="nos-notice" role="status">
                  {notice}
                </p>
              )}
              {checks.length > 0 && (
                <section
                  className="nos-check-results"
                  aria-label="Comprobaciones de la incidencia"
                >
                  {checks.map((c) => (
                    <p
                      key={c.label}
                      className={c.passed ? "passed" : "pending"}
                    >
                      {c.passed ? "✓" : "○"} {c.label}
                    </p>
                  ))}
                </section>
              )}
              <div hidden={page !== "topology"}>
                <NetworkTopology lab={lab} onSelect={select} />
              </div>
              <div hidden={page !== "missions"}>
                <NetworkMissions
                  initialMission={initialMission}
                  sequence={sequence}
                  game={session.game}
                  active={lab.id}
                  busy={busy}
                  onLoad={(id) => void load(id)}
                  onFree={() => void load("free")}
                />
              </div>
              <div hidden={page !== "device"} className="nos-device-view">
                <header>
                  <div>
                    <h2>{selected?.name}</h2>
                    <p>
                      {selected?.role} · {selected?.ip}
                    </p>
                  </div>
                  <span className="nos-state-badge">Running</span>
                </header>
                <nav aria-label="Vistas del dispositivo">
                  {(["config", "console", "tests"] as const).map((key) => (
                    <button
                      key={key}
                      className={tab === key ? "selected" : ""}
                      onClick={() => setTab(key)}
                    >
                      {key === "config"
                        ? "Configuración"
                        : key === "console"
                          ? "Consola"
                          : "Pruebas y registro"}
                    </button>
                  ))}
                </nav>
                <div hidden={tab !== "config"}>
                  <DeviceConfiguration
                    key={`${lab.id}:${device}:${port || 0}`}
                    lab={lab}
                    device={device}
                    initialPort={port}
                    busy={busy}
                    onChange={(change: ConfigChange) =>
                      operate("configure", { device, change })
                    }
                    onCommand={command}
                  />
                </div>
                {lab.devices.map((d) => (
                  <div key={d.id} hidden={tab !== "console" || device !== d.id}>
                    <NetworkConsole
                      lab={lab}
                      device={d.id}
                      context={contexts[d.id]}
                      busy={busy}
                      onCommand={command}
                    />
                  </div>
                ))}
                <div hidden={tab !== "tests"} className="nos-test-history">
                  <h3>Pruebas de conectividad</h3>
                  <p>
                    Los resultados anteriores a un cambio de configuración o
                    reinicio se conservan como historial y deben repetirse para
                    validar.
                  </p>
                  {lab.state.tests.length === 0 ? (
                    <p>No se han ejecutado pruebas en este laboratorio.</p>
                  ) : (
                    lab.state.tests
                      .slice()
                      .reverse()
                      .map((t, i) => (
                        <article key={i}>
                          <strong>
                            {t.device} · {t.command}
                          </strong>
                          <span>
                            {t.ok ? "Correcta" : "Fallida"} ·{" "}
                            {t.configVersion === lab.state.configVersion
                              ? "Estado actual"
                              : "Estado anterior"}
                          </span>
                          <pre>{t.output}</pre>
                        </article>
                      ))
                  )}
                </div>
              </div>
              <footer className="nos-footer">
                <span>
                  {lab.state.capture.length} paquetes · Captura disponible en
                  Analizador de paquetes
                </span>
                <button disabled={busy} onClick={() => setConfirmReset(true)}>
                  Restablecer laboratorio activo
                </button>
              </footer>
              {confirmReset && (
                <div className="nos-reset">
                  <p>
                    Se recuperará la configuración inicial de este laboratorio.
                    Las resoluciones y los puntos se conservan.
                  </p>
                  <button
                    onClick={() => void operate("reset", {})}
                    disabled={busy}
                  >
                    Restablecer configuración
                  </button>
                  <button onClick={() => setConfirmReset(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </main>
          </div>
        </>
      )}
    </section>
  );
}
