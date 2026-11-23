import { useMemo, useState, useEffect } from "react";
import { useEvidenceFile } from "./useEvidenceFile";
import EvidenceFileControl from "./EvidenceFileControl";
import AnalysisResult from "./AnalysisResult";
import CopyButton from "../web-lab/toolkit/CopyButton";
import {
  identify,
  textOf,
  printableStrings,
  invisiblePayload,
  zipEntries,
  extractZip,
  type ZipEntry,
} from "./binaryFormats";
import "./media-tools.css";
export default function HexEditor({
  request,
}: {
  request?: { path: string; sequence: number };
}) {
  const source = useEvidenceFile(request),
    [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [result, setResult] = useState(""),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setPage(0);
    setResult("");
    setFailure("");
  }, [source.file]);
  const strings = useMemo(
    () => (source.file ? printableStrings(source.file.data) : []),
    [source.file],
  );
  const entries = useMemo(() => {
    if (!source.file || identify(source.file.data) !== "ZIP") return [];
    try {
      return zipEntries(source.file.data);
    } catch {
      return [];
    }
  }, [source.file]);
  const bytes = source.file?.data,
    offset = page * 512,
    pageCount = Math.max(1, Math.ceil((bytes?.length ?? 0) / 512));
  function find() {
    if (!bytes || !search) return;
    const needle = new TextEncoder().encode(search);
    let match = -1;
    outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++)
        if (bytes[i + j] !== needle[j]) continue outer;
      match = i;
      break;
    }
    if (match < 0)
      setFailure("No se encontró el texto en los bytes del archivo.");
    else {
      setFailure("");
      setPage(Math.floor(match / 512));
    }
  }
  async function extract(entry: ZipEntry) {
    if (!bytes) return;
    setBusy(true);
    setFailure("");
    try {
      setResult(textOf(await extractZip(bytes, entry)));
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "No se pudo extraer.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="media-tool" aria-label="Editor hexadecimal">
      <header>
        <h2>Editor hexadecimal</h2>
        <p>
          Consulta bytes, texto y contenedores preservados. El archivo original
          se conserva.
        </p>
      </header>
      <EvidenceFileControl
        label="Abrir archivo"
        name={source.file?.name}
        loading={source.loading}
        onOpen={source.open}
      />
      {(source.error || failure) && (
        <p role="alert">{source.error || failure}</p>
      )}
      {bytes && (
        <>
          <p className="media-file-info">
            Firma: {identify(bytes)} · {bytes.length.toLocaleString()} bytes ·{" "}
            {source.file?.path}
          </p>
          <form
            className="media-controls"
            onSubmit={(e) => {
              e.preventDefault();
              find();
            }}
          >
            <label>
              Buscar texto
              <input
                aria-label="Buscar texto en bytes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button>Buscar en bytes</button>
          </form>
          <div className="media-hex-scroll">
            <table className="media-hex-table">
              <thead>
                <tr>
                  <th>Offset</th>
                  <th>Bytes hexadecimales</th>
                  <th>ASCII</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  {
                    length: Math.ceil(
                      Math.min(512, Math.max(0, bytes.length - offset)) / 16,
                    ),
                  },
                  (_, row) => {
                    const start = offset + row * 16,
                      data = bytes.subarray(start, start + 16);
                    return (
                      <tr key={start}>
                        <th>{start.toString(16).padStart(8, "0")}</th>
                        <td>
                          {Array.from(data)
                            .map((b) => b.toString(16).padStart(2, "0"))
                            .join(" ")}
                        </td>
                        <td>
                          {Array.from(data)
                            .map((b) =>
                              b >= 32 && b <= 126
                                ? String.fromCharCode(b)
                                : ".",
                            )
                            .join("")}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
          <div className="media-controls">
            <button disabled={!page} onClick={() => setPage((n) => n - 1)}>
              Página anterior
            </button>
            <span>
              {page + 1} / {pageCount}
            </span>
            <button
              disabled={page >= pageCount - 1}
              onClick={() => setPage((n) => n + 1)}
            >
              Página siguiente
            </button>
          </div>
          <details>
            <summary>Cadenas imprimibles ({strings.length})</summary>
            <div className="media-strings">
              {strings
                .filter((s) => !search || s.includes(search))
                .slice(0, 250)
                .map((value, i) => (
                  <div key={i}>
                    <pre>{value}</pre>
                    <CopyButton text={value} label="Copiar cadena" />
                  </div>
                ))}
            </div>
          </details>
          <details>
            <summary>Texto UTF-8</summary>
            <pre className="media-text-preview">
              {textOf(bytes).slice(0, 32768)}
            </pre>
          </details>
          <div className="media-controls">
            <button
              onClick={() => {
                const decoded = invisiblePayload(bytes);
                setResult(
                  `U+200B: ${decoded.zero} · U+200C: ${decoded.one}\n${decoded.text ?? "No se encontró una trama en los caracteres invisibles."}`,
                );
              }}
            >
              Analizar caracteres invisibles
            </button>
          </div>
          {identify(bytes) === "ZIP" && (
            <section>
              <h3>Directorio ZIP</h3>
              {entries.length ? (
                entries.map((entry) => (
                  <div className="media-zip-entry" key={entry.name}>
                    <span>
                      {entry.name} · {entry.size} bytes · método {entry.method}
                    </span>
                    <button disabled={busy} onClick={() => void extract(entry)}>
                      Extraer {entry.name}
                    </button>
                  </div>
                ))
              ) : (
                <p>El contenedor no tiene un directorio compatible.</p>
              )}
            </section>
          )}
        </>
      )}
      <AnalysisResult value={result} />
      <details>
        <summary>Ayuda de la herramienta</summary>
        <p>
          La firma se identifica por sus bytes, independientemente de la
          extensión. Cadenas muestra secuencias ASCII de al menos cuatro
          caracteres; el filtro no modifica el archivo. El análisis Unicode
          interpreta U+200B/U+200C como bits. La extracción ZIP admite entradas
          almacenadas o DEFLATE, comprueba tamaño y CRC y muestra el contenido
          sin escribir archivos del equipo físico.
        </p>
      </details>
    </section>
  );
}
