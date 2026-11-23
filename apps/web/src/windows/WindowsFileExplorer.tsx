import { useEffect, useState } from "react";
import { ArrowUp, Folder, FileText, Home } from "lucide-react";
import { api } from "../api";
import {
  CASE_ROOT,
  type FileRequest,
  type WindowsFile,
  type WindowsDirectory,
} from "./types";
export default function WindowsFileExplorer({
  request,
  onOpen,
  onProperties,
}: {
  request: FileRequest;
  onOpen: (file: WindowsFile) => void;
  onProperties: (file: WindowsFile) => void;
}) {
  const [path, setPath] = useState("C:\\");
  const [input, setInput] = useState(path);
  const [folder, setFolder] = useState<WindowsDirectory>();
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [selection, setSelection] = useState<string>();
  useEffect(() => {
    setPath(request.path);
  }, [request.sequence]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setSelection(undefined);
    void api<WindowsDirectory | WindowsFile>(
      `/windows/files?path=${encodeURIComponent(path)}&hidden=${hidden}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.type === "directory") {
          setFolder(result);
          setInput(result.path);
        } else {
          onOpen(result);
          setPath(
            result.path.slice(0, result.path.lastIndexOf("\\")) || "C:\\",
          );
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo abrir la carpeta.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [path, hidden]);
  async function openFile(name: string, properties = false) {
    setError("");
    try {
      const result = await api<WindowsFile>(
        `/windows/files?path=${encodeURIComponent((folder?.path.endsWith("\\") ? folder.path : folder?.path + "\\") + name)}`,
      );
      if (result.type !== "file") return;
      if (properties) onProperties(result);
      else onOpen(result);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo leer el archivo.",
      );
    }
  }
  return (
    <div className="win-virtual-explorer">
      <form
        className="win-virtual-address"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) setPath(input);
        }}
      >
        <button
          type="button"
          aria-label="Subir carpeta Windows"
          disabled={busy || folder?.path === "C:\\"}
          onClick={() =>
            setPath(
              folder!.path.slice(0, folder!.path.lastIndexOf("\\")) || "C:\\",
            )
          }
        >
          <ArrowUp size={16} />
        </button>
        <label>
          Ruta de Windows
          <input
            value={input}
            disabled={busy}
            onChange={(event) => setInput(event.target.value)}
            maxLength={512}
          />
        </label>
        <button disabled={busy}>Ir</button>
      </form>
      <div className="win-virtual-layout">
        <nav aria-label="Lugares del portátil">
          {[
            ["C:\\", "Este equipo"],
            ["C:\\Users\\Analista\\Documents", "Documentos"],
            [CASE_ROOT, "Expedientes"],
            ["C:\\Users\\Analista\\Downloads", "Descargas"],
          ].map(([value, label]) => (
            <button key={value} onClick={() => setPath(value)}>
              <Home size={15} />
              {label}
            </button>
          ))}
        </nav>
        <div className="win-virtual-files">
          <div className="win-virtual-view">
            <label>
              <input
                type="checkbox"
                checked={hidden}
                onChange={(event) => setHidden(event.target.checked)}
              />
              Mostrar archivos ocultos
            </label>
            <button
              disabled={!selection}
              onClick={() => void openFile(selection!, true)}
            >
              Propiedades
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
          {busy ? (
            <p role="status">Leyendo carpeta…</p>
          ) : folder?.entries.length === 0 ? (
            <p>Esta carpeta está vacía.</p>
          ) : (
            <ul>
              {folder?.entries.map((entry) => (
                <li key={entry.name}>
                  <button
                    className={selection === entry.name ? "selected" : ""}
                    onClick={() =>
                      setSelection(
                        entry.type === "file" ? entry.name : undefined,
                      )
                    }
                    onDoubleClick={() =>
                      entry.type === "directory"
                        ? setPath(`${folder.path}\\${entry.name}`)
                        : void openFile(entry.name)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (entry.type === "directory")
                          setPath(`${folder.path}\\${entry.name}`);
                        else void openFile(entry.name);
                      }
                    }}
                  >
                    {entry.type === "directory" ? (
                      <Folder size={25} />
                    ) : (
                      <FileText size={22} />
                    )}
                    <span>{entry.name}</span>
                    {entry.hidden && <small>Oculto</small>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <footer>{folder?.path}</footer>
    </div>
  );
}
