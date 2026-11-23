import { useEffect, useState } from "react";
import { api } from "../api";
import type { FileRequest, WindowsFile, WindowsEvent } from "./types";
export default function WindowsEventViewer({
  request,
}: {
  request?: FileRequest;
}) {
  const [logs, setLogs] = useState<{ path: string; name: string }[]>([]);
  const [path, setPath] = useState("");
  const [events, setEvents] = useState<WindowsEvent[]>([]);
  const [id, setId] = useState("");
  const [query, setQuery] = useState("");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [selected, setSelected] = useState<number>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ entries: { path: string; name: string }[] }>(
      "/windows/event-logs",
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setLogs(result.entries);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudieron listar las exportaciones.",
          );
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (request) setPath(request.path);
  }, [request?.sequence]);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setEvents([]);
    setSelected(undefined);
    void api<WindowsFile>(`/windows/files?path=${encodeURIComponent(path)}`, {
      signal: controller.signal,
    })
      .then((file) => {
        if (controller.signal.aborted) return;
        if (file.format !== "events")
          throw Error("El archivo no es una exportación de eventos.");
        const rows = JSON.parse(file.content) as WindowsEvent[];
        setEvents(rows);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo abrir la exportación.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [path]);
  const filtered = events.filter(
    (entry) =>
      (!id || String(entry.eventId) === id) &&
      (!query ||
        JSON.stringify(entry).toLowerCase().includes(query.toLowerCase())) &&
      (!after || entry.time.slice(0, 16) >= after) &&
      (!before || entry.time.slice(0, 16) <= before),
  );
  const detail = filtered.find((entry) => entry.recordId === selected);
  return (
    <div className="win-event-viewer">
      <header>
        <h2>Visor de eventos</h2>
        <p>Exportaciones preservadas del laboratorio · horas UTC</p>
      </header>
      <label>
        Archivo de eventos
        <select
          aria-label="Archivo de eventos"
          value={path}
          onChange={(event) => {
            setPath(event.target.value);
            setId("");
            setQuery("");
            setAfter("");
            setBefore("");
          }}
        >
          <option value="">Abrir una exportación</option>
          {logs.map((entry) => (
            <option key={entry.path} value={entry.path}>
              {entry.path}
            </option>
          ))}
        </select>
      </label>
      <div className="win-event-filters">
        <label>
          ID de evento
          <input
            value={id}
            onChange={(event) => setId(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          Buscar en eventos
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Desde UTC
          <input
            type="datetime-local"
            value={after}
            onChange={(event) => setAfter(event.target.value)}
          />
        </label>
        <label>
          Hasta UTC
          <input
            type="datetime-local"
            value={before}
            onChange={(event) => setBefore(event.target.value)}
          />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {busy ? (
        <p role="status">Leyendo eventos…</p>
      ) : (
        <>
          <p role="status">
            {filtered.length} {filtered.length === 1 ? "evento" : "eventos"}
          </p>
          <div className="win-event-table">
            <table>
              <thead>
                <tr>
                  <th>Fecha UTC</th>
                  <th>ID</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.recordId}
                    aria-selected={selected === entry.recordId}
                  >
                    <td>
                      <button onClick={() => setSelected(entry.recordId)}>
                        {entry.time}
                      </button>
                    </td>
                    <td>{entry.eventId}</td>
                    <td>{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail && (
            <pre tabIndex={0} aria-label="Detalles del evento">
              {JSON.stringify(detail, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
