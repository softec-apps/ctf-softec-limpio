import { useState } from "react";
import { FileText, Table2, Link, FolderTree } from "lucide-react";
import { parseCsv } from "./csv";
import CopyButton from "../web-lab/toolkit/CopyButton";
import "./document-viewer.css";
export default function DocumentViewer({
  name,
  content,
}: {
  name: string;
  content: string;
}) {
  const [raw, setRaw] = useState(false);
  const [query, setQuery] = useState("");
  const csv = name.toLowerCase().endsWith(".csv");
  const text = name.toLowerCase().endsWith(".txt");
  const shortcut = name.includes(".lnk.");
  const xml = name.toLowerCase().endsWith(".xml");
  const registry = name.toLowerCase().endsWith(".reg");
  let rows: string[][] = [];
  let parseError = "";
  if (csv)
    try {
      rows = parseCsv(content);
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Archivo no válido";
    }
  const properties = shortcut
    ? content
        .split("\n")
        .filter((line) => line.includes(":"))
        .map((line) => {
          const i = line.indexOf(":");
          return [line.slice(0, i), line.slice(i + 1).trim()];
        })
    : [];
  const task = xml
    ? new DOMParser().parseFromString(content, "application/xml")
    : null;
  return (
    <section className="document-reader">
      <header>
        {csv ? (
          <Table2 size={21} />
        ) : shortcut ? (
          <Link size={21} />
        ) : registry ? (
          <FolderTree size={21} />
        ) : (
          <FileText size={21} />
        )}
        <div>
          <strong>{name}</strong>
          <small>
            {csv
              ? "Tabla de datos"
              : shortcut
                ? "Propiedades de acceso directo"
                : xml
                  ? "Definición de tarea"
                  : registry
                    ? "Exportación del Registro"
                    : "Documento de texto"}{" "}
            · Solo lectura
          </small>
        </div>
        <CopyButton text={content} label="Copiar texto" />
        {!text && (
          <button type="button" onClick={() => setRaw((v) => !v)}>
            {raw ? "Vista de documento" : "Ver contenido original"}
          </button>
        )}
      </header>
      {text ? (
        <textarea
          className="document-text-content"
          aria-label={`Contenido de ${name}`}
          value={content}
          readOnly
          spellCheck={false}
        />
      ) : raw ? (
        <pre tabIndex={0}>{content}</pre>
      ) : csv ? (
        <>
          <label className="document-table-search">
            Buscar en la tabla
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {parseError ? (
            <p role="alert">{parseError}</p>
          ) : (
            <div className="document-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th aria-label="Fila" />
                    {rows[0]?.map((c, i) => (
                      <th key={i}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice(1)
                    .map((r, index) => ({ r, index }))
                    .filter(({ r }) =>
                      r
                        .join(" ")
                        .toLocaleLowerCase()
                        .includes(query.toLocaleLowerCase()),
                    )
                    .map(({ r, index }) => (
                      <tr key={index}>
                        <th>{index + 1}</th>
                        {r.map((c, i) => (
                          <td key={i}>{c}</td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <footer>
            {rows.length - 1} registros · {rows[0]?.length ?? 0} columnas
          </footer>
        </>
      ) : shortcut ? (
        <div className="document-property-sheet">
          <h2>Acceso directo</h2>
          <dl>
            {properties.map(([k, v], i) => (
              <div key={i}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p>Inspección del destino preservado. No se ejecuta el acceso.</p>
        </div>
      ) : task && !task.querySelector("parsererror") ? (
        <div className="document-property-sheet">
          <h2>Tarea programada</h2>
          <dl>
            {["URI", "Command", "Arguments", "WorkingDirectory"].map((tag) => {
              const value = task.querySelector(tag)?.textContent;
              return value ? (
                <div key={tag}>
                  <dt>{tag}</dt>
                  <dd>{value}</dd>
                </div>
              ) : null;
            })}
          </dl>
          <h3>Desencadenadores</h3>
          <p>
            {Array.from(task.querySelector("Triggers")?.children || [])
              .map((el) => el.tagName)
              .join(", ") || "No preservados"}
          </p>
        </div>
      ) : registry ? (
        <div className="document-registry">
          <aside>
            <FolderTree size={18} /> Registro preservado
          </aside>
          <pre>{content}</pre>
        </div>
      ) : (
        <article className="document-paper">
          <p>{content}</p>
        </article>
      )}
    </section>
  );
}
