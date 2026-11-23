import { useEffect, useId, useState } from "react";
import {
  Activity,
  Fan,
  Lightbulb,
  Shield,
  TerminalSquare,
  History,
  Monitor,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import type { OtReply, OtView } from "../../../../packages/ot-contracts";
import { api } from "../api";
import CopyButton from "../web-lab/toolkit/CopyButton";
import "./ot.css";
type Tab = "process" | "operation" | "engineering" | "history";
export default function OtApplication({
  active,
  onComputer,
  onClose,
  context = "device",
}: {
  active: boolean;
  onComputer: () => void;
  onClose: () => void;
  context?: "device" | "web";
}) {
  const requestId = useId();
  const [view, setView] = useState<OtView>(),
    [tab, setTab] = useState<Tab>("process"),
    [output, setOutput] = useState(""),
    [command, setCommand] = useState("ot help"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [login, setLogin] = useState(""),
    [password, setPassword] = useState("");
  const publish = (next: OtView) => {
    setView(next);
    window.dispatchEvent(new CustomEvent("ctf-ot-state", { detail: next }));
  };
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void api<{ view: OtView }>("/ot", { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) publish(result.view);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "No se pudo leer el controlador.",
          );
      });
    return () => controller.abort();
  }, [active]);
  useEffect(() => {
    const sync = (event: Event) =>
      setView((event as CustomEvent<OtView>).detail);
    window.addEventListener("ctf-ot-state", sync);
    return () => window.removeEventListener("ctf-ot-state", sync);
  }, []);
  async function run(value: string) {
    setBusy(true);
    setError("");
    try {
      const reply = await api<OtReply>("/ot/commands", {
        method: "POST",
        body: JSON.stringify({ command: value }),
      });
      setOutput(reply.output);
      publish(reply.view);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Petición industrial rechazada.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  const flag = output.match(/CTF\{[^}]+\}/)?.[0];
  return (
    <section
      className={`ot-experience${context === "web" ? " is-web" : ""}${active ? "" : " is-inactive"}`}
      aria-label="HMI de control industrial AXON C24"
    >
      <div className="ot-caption">
        <span>
          {context === "web"
            ? "http://control.seventech.local"
            : "SEVENTECH / AUTOMATIZACIÓN"}
        </span>
        <button onClick={onClose}>
          <ArrowLeft size={15} />
          {context === "web" ? "Intranet" : "Ver armario"}
        </button>
      </div>
      <div className="ot-hmi-shell">
        <header>
          <div>
            <span className="ot-manufacturer">AXON</span>
            <strong>C24</strong>
          </div>
          <p>
            UNIDAD 01<small>BANCO DE ENSAYO</small>
          </p>
        </header>
        <div className="ot-status-bar">
          <span>
            <span className="ot-connection" />
            {view ? "CONTROLADOR EN LÍNEA" : "CONECTANDO"}
          </span>
          <span>
            {view?.role ?? "—"} · {view?.firmware ?? "—"}
          </span>
        </div>
        <nav aria-label="Secciones del HMI">
          {(
            [
              { id: "process", title: "Proceso", icon: Activity },
              { id: "operation", title: "Operación", icon: Shield },
              { id: "engineering", title: "Ingeniería", icon: TerminalSquare },
              { id: "history", title: "Registro", icon: History },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={18} />
              {item.title}
            </button>
          ))}
        </nav>
        <div className="ot-hmi-body" aria-busy={busy}>
          {tab === "process" && view && (
            <>
              <div className="ot-process-title">
                <h1>Ventilación del laboratorio</h1>
                <span>PLC / MONITORIZACIÓN</span>
              </div>
              <div className="ot-flow-diagram">
                <div>
                  <span>ENTRADA</span>
                  <i />
                </div>
                <div
                  className={`ot-fan-symbol${view.fanRunning ? " is-running" : ""}`}
                >
                  <Fan size={54} />
                  <small>M-01</small>
                </div>
                <div>
                  <i />
                  <span>SALIDA</span>
                </div>
              </div>
              <div className="ot-measurements">
                <div>
                  <span>Velocidad</span>
                  <strong>
                    {view.fanRunning ? view.fanRpm : 0}
                    <small>rpm</small>
                  </strong>
                </div>
                <div>
                  <span>Sonda de ensayo</span>
                  <strong>
                    {view.temperatureC.toFixed(1)}
                    <small>°C</small>
                  </strong>
                </div>
              </div>
              <div
                className={`ot-alarm ${view.alarmActive ? "is-active" : ""}`}
              >
                <span className={`ot-beacon is-${view.beacon}`} />
                <div>
                  <strong>
                    {view.alarmActive
                      ? "Alarma térmica activa"
                      : "Proceso sin alarma térmica"}
                  </strong>
                  <small>
                    Umbral {view.alarmThresholdC.toFixed(1)}°C · Baliza{" "}
                    {view.beacon === "blue"
                      ? "azul"
                      : view.beacon === "red"
                        ? "roja"
                        : "verde"}
                  </small>
                </div>
              </div>
              <div className="ot-circuit">
                <Lightbulb size={20} />
                <span>Circuito de iluminación</span>
                <strong>{view.lightOn ? "ENCENDIDO" : "APAGADO"}</strong>
              </div>
            </>
          )}
          {tab === "operation" && (
            <>
              <h2>Acceso de operación</h2>
              <p>
                La identidad industrial es independiente de la cuenta del CTF.
                Consulta las evidencias de entrega desde el PC.
              </p>
              {view?.role === "operator" ? (
                <>
                  <p className="ot-access-note">Sesión de operación activa.</p>
                  <div className="ot-control-buttons">
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(
                          "ot panel light " + (view.lightOn ? "off" : "on"),
                        )
                      }
                    >
                      <Lightbulb size={18} />
                      {view.lightOn ? "Apagar" : "Encender"} iluminación
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(
                          "ot panel fan " + (view.fanRunning ? "off" : "on"),
                        )
                      }
                    >
                      <Fan size={18} />
                      {view.fanRunning ? "Detener" : "Arrancar"} ventilador
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void run("ot logout")}
                    >
                      Cerrar sesión industrial
                    </button>
                  </div>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      "ot login " +
                        JSON.stringify(login) +
                        " " +
                        JSON.stringify(password),
                    ).then((ok) => {
                      if (ok) setPassword("");
                    });
                  }}
                >
                  <label>
                    Cuenta industrial
                    <input
                      autoComplete="username"
                      value={login}
                      maxLength={64}
                      onChange={(e) => setLogin(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Clave industrial
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      maxLength={128}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </label>
                  <button disabled={busy}>Acceder al HMI</button>
                </form>
              )}
            </>
          )}
          {tab === "engineering" && (
            <>
              <h2>Herramientas de ingeniería</h2>
              <p>
                Envía tramas y peticiones al banco. Los mismos clientes están
                disponibles con <code>ot help</code> en la terminal normal del
                PC.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(command);
                }}
              >
                <label htmlFor={requestId}>Petición al controlador</label>
                <textarea
                  id={requestId}
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  rows={5}
                  maxLength={4096}
                  spellCheck={false}
                />
                <div className="ot-request-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run("ot help")}
                  >
                    Consultar protocolos
                  </button>
                  <button disabled={busy || !command.trim()}>
                    {busy ? "Procesando…" : "Enviar petición"}
                  </button>
                </div>
              </form>
              <button
                className="ot-reset"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Restaurar el banco de ensayo? Tus resoluciones y puntos se conservan.",
                    )
                  )
                    void run("ot reset --confirm");
                }}
              >
                <RotateCcw size={15} />
                Restaurar banco
              </button>
            </>
          )}
          {tab === "history" && (
            <>
              <h2>Registro del controlador</h2>
              <p>
                Últimas veinte operaciones que cambiaron el estado de tu banco.
              </p>
              {view?.history.length ? (
                <ol className="ot-history">
                  {view.history.map((event) => (
                    <li key={event.sequence}>
                      <span>#{event.sequence}</span>
                      {event.event}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No hay cambios registrados.</p>
              )}
            </>
          )}
          {error && (
            <p className="ot-error" role="alert">
              {error}
            </p>
          )}
          {output && (
            <div className="ot-response" aria-live="polite">
              <h3>Respuesta del controlador</h3>
              <pre>{output}</pre>
              <CopyButton
                text={flag ?? output}
                label={flag ? "Copiar flag" : "Copiar respuesta"}
              />
            </div>
          )}
        </div>
        <footer>
          <span>10.77.0.70</span>
          <span>MODBUS / HMI</span>
          <span>Rev. {view?.revision ?? 0}</span>
        </footer>
      </div>
      {context === "device" && (
        <button className="ot-open-computer" onClick={onComputer}>
          <Monitor size={17} />
          Investigar desde el computador
        </button>
      )}
    </section>
  );
}
