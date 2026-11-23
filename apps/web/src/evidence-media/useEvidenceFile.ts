import { useEffect, useRef, useState } from "react";
import { api } from "../api";
export type EvidenceFile = {
  path: string;
  name: string;
  mime: string;
  data: Uint8Array;
};
export function useEvidenceFile(request?: { path: string; sequence: number }) {
  const [file, setFile] = useState<EvidenceFile | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const version = useRef(0),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      version.current++;
    };
  }, []);
  async function open(path: string) {
    const current = ++version.current;
    setError("");
    setLoading(true);
    try {
      const info = await api<{
        type: string;
        path: string;
        name: string;
        content?: string;
        mime?: string;
        assetUrl?: string;
      }>(`/workstation/files?path=${encodeURIComponent(path)}`);
      if (info.type !== "file") throw new Error("Selecciona un archivo.");
      let data: Uint8Array;
      if (info.assetUrl) {
        if (!info.assetUrl.startsWith("/api/v1/workstation/binary?"))
          throw new Error("Origen de archivo no admitido.");
        const response = await fetch(info.assetUrl, {
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("El archivo no está disponible.");
        if (Number(response.headers.get("Content-Length")) > 1048576)
          throw new Error("Archivo demasiado grande.");
        data = new Uint8Array(await response.arrayBuffer());
      } else if (typeof info.content === "string")
        data = new TextEncoder().encode(info.content);
      else throw new Error("No se pudo leer el archivo.");
      if (data.length > 1048576)
        throw new Error("El analizador admite archivos de hasta 1 MB.");
      if (active.current && current === version.current)
        setFile({
          path: info.path,
          name: info.name,
          mime: info.mime ?? "text/plain",
          data,
        });
    } catch (error) {
      if (active.current && current === version.current)
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo abrir el archivo.",
        );
    } finally {
      if (active.current && current === version.current) setLoading(false);
    }
  }
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (request) void openRef.current(request.path);
  }, [request?.sequence]);
  return { file, error, loading, open };
}
