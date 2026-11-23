import { useEffect, useState } from "react";
import { api } from "../../api";

type Directory = {
  type: "directory";
  path: string;
  entries: { name: string; type: "file" | "directory" }[];
};
type FileContent = {
  type: "file";
  path: string;
  name: string;
  content?: string;
};

export default function VirtualFilePicker({
  onOpen,
  onBinaryOpen,
}: {
  onOpen: (path: string, content: string) => void;
  onBinaryOpen?: (path: string) => void;
}) {
  const [path, setPath] = useState("/home/analista");
  const [directory, setDirectory] = useState<Directory>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function open(target: string) {
    setError("");
    setLoading(true);
    try {
      const result = await api<Directory | FileContent>(
        `/workstation/files?path=${encodeURIComponent(target)}`,
      );
      if (result.type === "directory") {
        setDirectory(result);
        setPath(result.path);
      } else if (typeof result.content === "string")
        onOpen(result.path, result.content);
      else if (onBinaryOpen) onBinaryOpen(result.path);
      else
        setError(
          "Archivo binario: ábrelo con el Visor de imágenes, el Analizador de audio o el Editor hexadecimal.",
        );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo abrir la ruta virtual.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void open("/home/analista");
  }, []);
  return (
    <section className="kit-module" aria-label="Archivos del entorno simulado">
      <h2>Abrir archivo virtual</h2>
      <form
        className="kit-form"
        onSubmit={(event) => {
          event.preventDefault();
          void open(path);
        }}
      >
        <label>
          Ruta virtual
          <input
            disabled={loading}
            value={path}
            onChange={(event) => setPath(event.target.value)}
          />
        </label>
        <button disabled={loading}>Ir</button>
      </form>
      {error && (
        <p role="alert" className="kit-error">
          {error}
        </p>
      )}
      <div className="kit-actions">
        <button
          disabled={loading || !directory || directory.path === "/"}
          onClick={() =>
            void open(
              directory!.path.slice(0, directory!.path.lastIndexOf("/")) || "/",
            )
          }
        >
          Subir carpeta
        </button>
      </div>
      <ul className="virtual-file-list">
        {directory?.entries.map((entry) => (
          <li key={entry.name}>
            <button
              disabled={loading}
              onClick={() => void open(`${directory.path}/${entry.name}`)}
            >
              {entry.type === "directory" ? "📁" : "📄"} {entry.name}
            </button>
          </li>
        ))}
      </ul>
      {directory?.entries.length === 0 && <p>Carpeta vacía.</p>}
    </section>
  );
}
