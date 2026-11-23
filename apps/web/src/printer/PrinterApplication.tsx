import { useEffect, useId, useState } from "react";
import {
  Printer,
  ScanLine,
  Settings2,
  Files,
  Wifi,
  ChevronRight,
  Monitor,
  ArrowLeft,
} from "lucide-react";
import { api } from "../api";
import CopyButton from "../web-lab/toolkit/CopyButton";
import "./printer.css";
type Reply = { output: string; title?: string; printed?: boolean };
type Tab = "home" | "queue" | "scans" | "support";
export default function PrinterApplication({
  active,
  onComputer,
  onClose,
  context = "device",
}: {
  context?: "device" | "web";
  active: boolean;
  onComputer: () => void;
  onClose: () => void;
}) {
  const requestId = useId();
  const [tab, setTab] = useState<Tab>("home"),
    [reply, setReply] = useState<Reply>(),
    [sheet, setSheet] = useState<Reply>(),
    [command, setCommand] = useState("printer help"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void api<Reply>("/printer", { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted)
          setReply((previous) => previous ?? result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo conectar con el equipo.",
          );
      });
    return () => controller.abort();
  }, [active]);
  async function run(value: string) {
    setBusy(true);
    setError("");
    try {
      const result = await api<Reply>("/printer/commands", {
        method: "POST",
        body: JSON.stringify({ command: value }),
      });
      setReply(result);
      if (result.printed) {
        setSheet(result);
        window.dispatchEvent(
          new CustomEvent("ctf-printer-paper", { detail: { printed: true } }),
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la petición.",
      );
    } finally {
      setBusy(false);
    }
  }
  const flag = reply?.output.match(/CTF\{[^}]+\}/)?.[0];
  const select = (next: Tab) => {
    setTab(next);
    if (next === "queue") void run("printer queue");
    if (next === "scans") void run("printer scans");
  };
  return (
    <section
      className={`printer-experience${context === "web" ? " is-web" : ""}`}
      aria-label="Impresora multifunción FLOW M740"
    >
      <div className="printer-device-caption">
        <span>
          {context === "web"
            ? "http://printer.seventech.local"
            : "SEVENTECH / MULTIFUNCIÓN"}
        </span>
        <button onClick={onClose}>
          <ArrowLeft size={15} />
          {context === "web" ? "Intranet" : "Ver equipo"}
        </button>
      </div>
      <div className="printer-touchscreen">
        <header className="printer-screen-header">
          <div>
            <strong>
              FLOW <span>M740</span>
            </strong>
            <small>
              <span className="printer-ready-light" />
              {busy ? "Procesando…" : "Lista para trabajar"}
            </small>
          </div>
          <Wifi size={20} aria-label="Conexión de red" />
        </header>
        <nav aria-label="Aplicaciones de la impresora">
          {(
            [
              { id: "home", name: "Inicio", icon: Printer },
              { id: "queue", name: "Trabajos", icon: Files },
              { id: "scans", name: "Escáner", icon: ScanLine },
              { id: "support", name: "Soporte", icon: Settings2 },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              aria-pressed={tab === item.id}
              onClick={() => select(item.id)}
              disabled={busy}
            >
              <item.icon size={22} />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="printer-screen-body" aria-busy={busy}>
          {tab === "home" && (
            <>
              <p className="printer-eyebrow">DOCUMENTOS QUE SIGUEN SU CURSO</p>
              <h1>
                Todo listo.
                <br />
                Continúa tu trabajo.
              </h1>
              <p>
                Impresión dúplex, escaneo y documentos compartidos en un solo
                lugar.
              </p>
              <div className="printer-home-actions">
                <button
                  disabled={busy}
                  onClick={() => void run("printer status --print")}
                >
                  <Printer size={20} />
                  Imprimir estado
                  <ChevronRight size={17} />
                </button>
                <button disabled={busy} onClick={() => select("scans")}>
                  <ScanLine size={20} />
                  Abrir escáner
                  <ChevronRight size={17} />
                </button>
              </div>
              <dl className="printer-supplies">
                <div>
                  <dt>Papel A4</dt>
                  <dd>
                    <meter
                      value={82}
                      min={0}
                      max={100}
                      aria-label="Papel disponible"
                    />
                    82%
                  </dd>
                </div>
                <div>
                  <dt>Tóner</dt>
                  <dd>
                    <meter
                      value={76}
                      min={0}
                      max={100}
                      aria-label="Tóner disponible"
                    />
                    76%
                  </dd>
                </div>
              </dl>
            </>
          )}
          {tab === "queue" && (
            <>
              <h2>Cola de impresión</h2>
              <p>Consulta un trabajo por su identificador.</p>
              {["J-821", "J-824"].map((job) => (
                <button
                  className="printer-document"
                  key={job}
                  disabled={busy}
                  onClick={() => void run("printer job " + job)}
                >
                  <Files size={20} />
                  <span>
                    {job}
                    <small>
                      {job === "J-824"
                        ? "Custodia · Retenido"
                        : "Recepción · Impreso"}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </>
          )}
          {tab === "scans" && (
            <>
              <h2>Bandeja de escaneos</h2>
              <p>Documentos conservados en el almacenamiento del equipo.</p>
              {["scan-027.txt", "scan-031.txt"].map((name) => (
                <button
                  className="printer-document"
                  key={name}
                  disabled={busy}
                  onClick={() => void run("printer scan " + name)}
                >
                  <ScanLine size={20} />
                  <span>
                    {name}
                    <small>Transcripción OCR</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </>
          )}
          {tab === "support" && (
            <>
              <h2>Servicio y diagnóstico</h2>
              <p>
                Consulta protocolos o envía una petición al dispositivo. Las
                mismas operaciones están disponibles con <code>printer</code> en
                la terminal del PC.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(command);
                }}
              >
                <label htmlFor={requestId}>Petición al equipo</label>
                <textarea
                  id={requestId}
                  value={command}
                  maxLength={4096}
                  rows={4}
                  onChange={(e) => setCommand(e.target.value)}
                  spellCheck={false}
                />
                <div className="printer-request-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run("printer help")}
                  >
                    Consultar ayuda
                  </button>
                  <button type="submit" disabled={busy || !command.trim()}>
                    {busy ? "Procesando…" : "Enviar petición"}
                  </button>
                </div>
              </form>
            </>
          )}
          {error && (
            <p className="printer-error" role="alert">
              {error}
            </p>
          )}
          {reply && (
            <div className="printer-response" aria-live="polite">
              <h3>{reply.title ?? "Respuesta del equipo"}</h3>
              <pre>{reply.output}</pre>
              <CopyButton
                text={flag ?? reply.output}
                label={flag ? "Copiar flag" : "Copiar respuesta"}
              />
            </div>
          )}
        </div>
        <footer>
          <span>ST740-0317</span>
          <span>10.77.0.60</span>
          <span>Ethernet · Lista</span>
        </footer>
      </div>
      {sheet && (
        <aside className="printer-output-tray" aria-label="Bandeja de salida">
          <div>
            <strong>{sheet.title ?? "Documento impreso"}</strong>
            <button
              onClick={() => {
                setSheet(undefined);
                window.dispatchEvent(
                  new CustomEvent("ctf-printer-paper", {
                    detail: { printed: false },
                  }),
                );
              }}
            >
              Retirar hoja
            </button>
          </div>
          <pre>{sheet.output}</pre>
        </aside>
      )}
      {context === "device" && (
        <button className="printer-return-computer" onClick={onComputer}>
          <Monitor size={17} />
          Investigar desde el computador
          <ChevronRight size={16} />
        </button>
      )}
    </section>
  );
}
