import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, RefreshCw, TerminalSquare } from "lucide-react";
import { api, post } from "../api";
import type {
  WindowsLabReply,
  WindowsLabView,
} from "../../../../packages/windows-contracts";
import "./windows-terminal.css";

type TranscriptEntry = { prompt: string; command: string; output: string };

export default function WindowsLabTerminal({
  active,
  request,
}: {
  active: boolean;
  request?: { challengeId: string; sequence: number };
}) {
  const [view, setView] = useState<WindowsLabView>();
  const [command, setCommand] = useState("");
  const [selectedHost, setSelectedHost] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyPosition, setHistoryPosition] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const output = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const running = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const load = () => {
      if (running.current) return;
      const current = ++revision.current;
      void api<WindowsLabView>("/windows/lab", { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted || current !== revision.current) return;
          setView(result);
          setError("");
        })
        .catch((failure) => {
          if (controller.signal.aborted || current !== revision.current) return;
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo consultar el laboratorio Windows.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    };
    const visible = () => {
      if (!document.hidden) load();
    };
    load();
    window.addEventListener("ctf-windows-changed", load);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      window.removeEventListener("ctf-windows-changed", load);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [active, refresh]);
  useEffect(() => {
    setSelectedHost("");
  }, [request?.sequence]);
  useEffect(() => {
    if (active && !busy) input.current?.focus();
  }, [active, busy, request?.sequence]);
  useEffect(() => {
    if (output.current) output.current.scrollTop = output.current.scrollHeight;
  }, [transcript, busy]);

  const requestedHost = view?.hosts.find(
    (host) => host.id === request?.challengeId && host.enabled,
  );
  const target =
    selectedHost ||
    requestedHost?.ip ||
    view?.hosts.find((host) => host.enabled)?.ip ||
    "";

  async function execute(value: string) {
    const line = view?.password ? value : value.trim();
    if (running.current || !line || !view) return;
    if (!view.password && /^(?:cls|clear-host)$/i.test(line)) {
      setTranscript([]);
      setCommand("");
      return;
    }
    running.current = true;
    revision.current += 1;
    setBusy(true);
    setError("");
    setCommand("");
    const hasCredentials =
      view.password || /^(?:win\s+)?(?:winrm|evil-winrm|runas)\b/i.test(line);
    const displayedCommand = view.password
      ? "********"
      : hasCredentials
        ? `${line.split(/\s/, 1)[0]} [credenciales omitidas]`
        : line;
    if (!hasCredentials)
      setHistory((current) => [...current, line].slice(-100));
    setHistoryPosition(0);
    const prompt = view.prompt;
    try {
      const result: WindowsLabReply = await post("/windows/lab/commands", {
        command: line,
      });
      if (mounted.current) {
        setView(result.view);
        setTranscript((current) =>
          [
            ...current,
            { prompt, command: displayedCommand, output: result.output },
          ].slice(-150),
        );
      }
      window.dispatchEvent(new Event("ctf-windows-changed"));
    } catch (failure) {
      if (mounted.current) {
        const message =
          failure instanceof Error
            ? failure.message
            : "No se pudo ejecutar el comando.";
        setError(message);
        setTranscript((current) =>
          [
            ...current,
            { prompt, command: displayedCommand, output: message },
          ].slice(-150),
        );
        if (!hasCredentials) setCommand(line);
      }
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void execute(command);
  }
  return (
    <section className="win-terminal" aria-label="Terminal Windows">
      <header className="win-terminal-status">
        <div>
          <TerminalSquare size={18} aria-hidden="true" />
          <strong>{view?.host ?? "Laboratorio Windows"}</strong>
          {view?.host && <span>{view.principal}</span>}
        </div>
        <button
          type="button"
          aria-label="Actualizar estado de Windows"
          disabled={busy}
          onClick={() => setRefresh((current) => current + 1)}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualizar
        </button>
      </header>
      <div className="win-terminal-target">
        <label>
          Equipo del laboratorio
          <select
            value={target}
            onChange={(event) => setSelectedHost(event.target.value)}
            disabled={busy || !view || view.password}
          >
            {!target && <option value="">Selecciona un equipo</option>}
            {view?.hosts
              .filter((host) => host.enabled)
              .map((host) => (
                <option key={host.id} value={host.ip}>
                  {host.name} · {host.ip}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !target || !view || view.password}
          onClick={() => void execute(`connect ${target}`)}
        >
          Conectar equipo
        </button>
      </div>
      {requestedHost && (
        <p className="win-terminal-context">
          Objetivo: {requestedHost.title}. Selecciona y conecta el equipo para
          comenzar.
        </p>
      )}
      {view && (
        <details className="win-terminal-linux">
          <summary>Acceder desde la terminal Linux</summary>
          <p>
            Conecta Seventech VPN en el computador y usa <code>win help</code>.
            VPN: {view.connected ? "conectada" : "desconectada"}.
          </p>
          <p>
            Credencial inicial de este entorno: <code>{view.entry.user}</code>.
            Para abrir una sesión remota en el equipo elegido:
          </p>
          <code className="win-terminal-connection">
            win winrm -i {target || "IP"} -u {view.entry.user} -p{" "}
            {view.entry.password}
          </code>
          <p>
            La consola del portátil y la sesión remota operan sobre los mismos
            equipos. Conectar otro equipo requiere seleccionarlo expresamente.
          </p>
        </details>
      )}
      {error && (
        <p className="win-terminal-error" role="alert">
          {error}
          {!view && (
            <button onClick={() => setRefresh((current) => current + 1)}>
              Reintentar
            </button>
          )}
        </p>
      )}
      <div
        ref={output}
        className="win-terminal-output"
        role="log"
        aria-label="Salida de la terminal Windows"
        aria-live="polite"
        tabIndex={0}
      >
        <p className="win-terminal-welcome">
          Terminal del laboratorio. Usa help para consultar los comandos. Los
          equipos conservan sus archivos, permisos y servicios entre sesiones.
        </p>
        {loading && !view && (
          <p role="status">Conectando con el laboratorio…</p>
        )}
        {transcript.map((entry, index) => (
          <div className="win-terminal-entry" key={index}>
            <pre className="win-terminal-command">
              {entry.prompt} {entry.command}
            </pre>
            <pre>{entry.output}</pre>
          </div>
        ))}
        {busy && <p role="status">Ejecutando comando…</p>}
      </div>
      <form className="win-terminal-form" onSubmit={submit}>
        <label htmlFor="windows-lab-command">
          {view?.prompt ?? "Windows>"}
        </label>
        <input
          ref={input}
          id="windows-lab-command"
          aria-label="Comando de Windows"
          type={view?.password ? "password" : "text"}
          value={command}
          onChange={(event) => {
            setCommand(event.target.value);
            setHistoryPosition(0);
          }}
          onKeyDown={(event) => {
            if (view?.password) return;
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            const next = Math.max(
              0,
              Math.min(
                history.length,
                historyPosition + (event.key === "ArrowUp" ? 1 : -1),
              ),
            );
            setHistoryPosition(next);
            setCommand(next ? history[history.length - next] : "");
          }}
          disabled={busy || !view}
          maxLength={2048}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Escribe un comando"
        />
        <button type="submit" disabled={busy || !view || !command.trim()}>
          <ArrowRight size={17} aria-hidden="true" />
          Ejecutar
        </button>
      </form>
    </section>
  );
}
