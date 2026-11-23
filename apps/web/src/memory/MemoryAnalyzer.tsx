import { useEffect, useState } from "react";
import {
  MEMORY_OPERATIONS,
  parseMemorySnapshot,
  memoryRows,
  type MemorySnapshot,
} from "../../../../packages/memory-tools";
import { api } from "../api";
import CopyButton from "../web-lab/toolkit/CopyButton";
import VirtualFilePicker from "../web-lab/toolkit/VirtualFilePicker";
import "./memory.css";
export default function MemoryAnalyzer({
  request,
}: {
  request?: { path: string; sequence: number };
}) {
  const [path, setPath] = useState("/home/analista/memoria"),
    [snapshot, setSnapshot] = useState<MemorySnapshot>(),
    [operation, setOperation] = useState("pslist"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function accept(filePath: string, content: string) {
    setError("");
    try {
      setSnapshot(parseMemorySnapshot(content));
      setPath(filePath);
    } catch (e) {
      setSnapshot(undefined);
      setError(e instanceof Error ? e.message : "No se pudo leer el snapshot.");
    }
  }
  async function open(filePath: string) {
    setBusy(true);
    setError("");
    setSnapshot(undefined);
    try {
      const file = await api<{ type: string; content?: string }>(
        `/workstation/files?path=${encodeURIComponent(filePath)}`,
      );
      if (file.type !== "file" || typeof file.content !== "string")
        throw Error("Selecciona un archivo .memory.json.");
      accept(filePath, file.content);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo abrir la evidencia.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (request) void open(request.path);
  }, [request?.sequence]);
  const rows = snapshot ? memoryRows(snapshot, operation) : [],
    columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    <section className="memory-analyzer" aria-label="Analizador de memoria">
      <h2>RAMLab · Memoria adquirida</h2>
      <p>
        Examina procesos, conexiones y regiones de un snapshot preservado del
        laboratorio.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void open(path);
        }}
      >
        <label>
          Snapshot
          <input
            aria-label="Ruta del snapshot"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
        </label>
        <button disabled={busy}>{busy ? "Abriendo…" : "Abrir snapshot"}</button>
      </form>
      <details>
        <summary>Explorar archivos del PC</summary>
        <VirtualFilePicker onOpen={accept} />
      </details>
      <nav aria-label="Operaciones de memoria">
        {MEMORY_OPERATIONS.map((name) => (
          <button
            key={name}
            disabled={!snapshot}
            aria-pressed={operation === name}
            onClick={() => setOperation(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      {error && <p role="alert">{error}</p>}
      {snapshot && (
        <>
          <p role="status">
            {operation}: {rows.length} registros ·{" "}
            {snapshot.acquiredAt ?? "Fecha no indicada"}
          </p>
          <CopyButton
            text={JSON.stringify(rows, null, 2)}
            label="Copiar registros"
          />
          <div className="memory-output">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    {columns.map((column) => (
                      <td key={column}>
                        {typeof row[column] === "object"
                          ? JSON.stringify(row[column])
                          : String(row[column] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <p>No hay registros para esta operación.</p>}
        </>
      )}
    </section>
  );
}
