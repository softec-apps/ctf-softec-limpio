import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, post } from "../api";
import CopyButton from "../web-lab/toolkit/CopyButton";
import WirelessAssessment from "./WirelessAssessment";
import type {
  WirelessReply,
  WirelessView,
} from "../../../../packages/wireless-contracts";
import "./wireless-workbench.css";

export default function WirelessWorkbench({
  challengeId,
}: {
  challengeId: string;
}) {
  const [view, setView] = useState<WirelessView>();
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const running = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const history = useRef<string[]>([]);
  const position = useRef(0);
  useEffect(() => {
    if (!busy) input.current?.focus();
  }, [busy]);
  useEffect(() => {
    const controller = new AbortController();
    setView(undefined);
    setError("");
    api<WirelessView>(`/wireless/labs/${challengeId}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setView(result);
          setOutput(
            "Consola conectada. Consulta ticket, devices y help.\nEl candidato se aplica con commit; las pruebas usan running.",
          );
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [challengeId, refresh]);
  async function execute(line: string) {
    if (running.current || !view || !line.trim()) return;
    running.current = true;
    setBusy(true);
    setError("");
    history.current = [...history.current, line].slice(-30);
    position.current = history.current.length;
    try {
      const result: WirelessReply = await post(
        `/wireless/labs/${challengeId}/commands`,
        { command: line.trim(), revision: view.revision },
      );
      setView(result.view);
      setOutput(`wlan:${challengeId}> ${line}\n\n${result.output}`);
      setCommand("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo ejecutar la operación. Actualiza la consola y vuelve a intentarlo.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void execute(command);
  }
  const proof = output.match(/CTF\{[a-f0-9]{32}\}/)?.[0];
  return (
    <section
      className="wireless-workbench"
      aria-label="Laboratorio inalámbrico operativo"
    >
      <header>
        <h3>Consola de operación</h3>
        <button
          type="button"
          disabled={busy}
          onClick={() => setRefresh((n) => n + 1)}
        >
          Actualizar consola
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {!view ? (
        <p role="status">
          {error
            ? "No se pudo abrir el laboratorio. Usa Actualizar consola para reintentar."
            : "Conectando con el laboratorio…"}
        </p>
      ) : (
        <>
          <p role="status">
            Running r{view.generation} ·{" "}
            {view.dirty
              ? "Candidato con cambios pendientes"
              : "Candidato sincronizado"}
          </p>
          <details>
            <summary>Parte de incidencia e inventario</summary>
            <pre>{view.ticket}</pre>
          </details>
          {view.assessment && (
            <WirelessAssessment
              key={`${challengeId}-${view.assessment.stage}`}
              assessment={view.assessment}
              busy={busy}
              onSubmit={execute}
            />
          )}
          <nav aria-label="Consultas de operación">
            {[
              ["ticket", "Incidencia"],
              ["show running", "Running"],
              ["diff", "Diferencias"],
              ["help", "Ayuda"],
              ["test all", "Ejecutar pruebas"],
              ["verify", "Verificar cambio"],
            ].map(([line, label]) => (
              <button
                key={line}
                type="button"
                disabled={busy}
                onClick={() => void execute(line)}
              >
                {label}
              </button>
            ))}
          </nav>
          <ul
            className="wireless-checks"
            aria-label="Pruebas de servicio y seguridad"
          >
            {view.tests.map((name) => {
              const result = view.checks.find(
                (check) =>
                  check.name === name && check.revision === view.generation,
              );
              return (
                <li key={name}>
                  <span>{name}</span>
                  <strong>
                    {!result ? "Pendiente" : result.passed ? "PASS" : "FAIL"}
                  </strong>
                </li>
              );
            })}
          </ul>
          <form onSubmit={submit}>
            <label htmlFor={`wireless-command-${challengeId}`}>
              Comando de operación
            </label>
            <div>
              <input
                id={`wireless-command-${challengeId}`}
                ref={input}
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                disabled={busy}
                maxLength={2048}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="help"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                    return;
                  event.preventDefault();
                  position.current = Math.max(
                    0,
                    Math.min(
                      history.current.length,
                      position.current + (event.key === "ArrowUp" ? -1 : 1),
                    ),
                  );
                  setCommand(history.current[position.current] ?? "");
                }}
              />
              <button disabled={busy || !command.trim()}>
                {busy ? "Ejecutando…" : "Ejecutar"}
              </button>
            </div>
          </form>
          <pre
            className="wireless-output"
            aria-label="Resultado de operación"
            tabIndex={0}
          >
            {output}
          </pre>
          <CopyButton text={output} label="Copiar resultado" />
          {proof && <CopyButton text={proof} label="Copiar comprobante" />}
          <p>
            También disponible desde Terminal: wlan {challengeId}{" "}
            &lt;comando&gt;. El analizador de paquetes abre las trazas generadas
            por las pruebas. El comprobante se entrega en el campo de evidencia
            del reto.
          </p>
        </>
      )}
    </section>
  );
}
