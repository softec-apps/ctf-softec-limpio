import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { resolveLabTarget } from "./labTarget";
import CopyButton from "./CopyButton";
import type { ComparisonDocument, ComparisonSide } from "./lineComparison";
import LabActionForm, { type LabForm } from "../LabActionForm";

type Reply = {
  status: number;
  url: string;
  title: string;
  body: string;
  form?: LabForm;
};
type Entry = { url: string; status: number };
export default function HttpInspector({
  onCompare,
}: {
  onCompare: (side: ComparisonSide, document: ComparisonDocument) => void;
}) {
  const [url, setUrl] = useState("");
  const [response, setResponse] = useState<Reply | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function send(address: string) {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setUrl(address);
    setResponse(null);
    setError("");
    try {
      const target = resolveLabTarget(
        address,
        response?.url || url || undefined,
      );
      const reply = await api<Reply>(`/challenges/${target.id}/web`, {
        method: "POST",
        body: JSON.stringify({ url: target.url }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setUrl(reply.url);
      setResponse(reply);
      setHistory((entries) =>
        [{ url: reply.url, status: reply.status }, ...entries].slice(0, 15),
      );
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "No se pudo consultar el servicio.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="kit-module" aria-label="Inspector HTTP">
      <h2>Inspector HTTP</h2>
      <p>
        Edita una dirección, envía la consulta y compara las respuestas del
        servicio indicado.
      </p>
      <form
        className="kit-request"
        onSubmit={(event) => {
          event.preventDefault();
          void send(url);
        }}
      >
        <label>
          URL de la consulta
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            maxLength={512}
            placeholder="http://servicio.seventech.local/"
          />
        </label>
        <button disabled={busy}>
          {busy ? "Consultando…" : "Enviar consulta"}
        </button>
      </form>
      <div className="kit-actions">
        <CopyButton text={url} label="Copiar consulta" />
      </div>
      {error && (
        <p role="alert" className="kit-error">
          {error}
        </p>
      )}
      {response && (
        <>
          <div className="kit-response-label">
            <strong>HTTP {response.status}</strong>
            <span>{response.title}</span>
          </div>
          <pre className="kit-output" tabIndex={0} aria-label="Respuesta HTTP">
            {JSON.stringify(response, null, 2)}
          </pre>
          <div className="kit-actions">
            <CopyButton
              text={JSON.stringify(response, null, 2)}
              label="Copiar respuesta"
            />
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                onClick={() =>
                  onCompare(side, {
                    label: `${new URL(response.url).hostname} · HTTP ${response.status}`,
                    text: JSON.stringify(response, null, 2),
                  })
                }
              >
                Respuesta a {side === "left" ? "A" : "B"}
              </button>
            ))}
          </div>
          {response.form && (
            <details>
              <summary>Editar parámetros del formulario</summary>
              <LabActionForm
                key={response.url}
                form={response.form}
                onVisit={(path) => {
                  void send(path);
                }}
              />
            </details>
          )}
        </>
      )}
      {history.length > 0 && (
        <div className="kit-history">
          <h3>Historial · repetir consulta</h3>
          {history.map((entry, index) => (
            <button
              key={index}
              disabled={busy}
              onClick={() => {
                void send(entry.url);
              }}
            >
              <strong>{entry.status}</strong>
              <span>{entry.url}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
