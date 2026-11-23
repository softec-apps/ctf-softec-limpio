import { useState } from "react";
import CopyButton from "./CopyButton";
import type { ComparisonDocument, ComparisonSide } from "./lineComparison";

export default function EvidenceDesk({
  name,
  content,
  onChange,
  onClose,
  onCompare,
}: {
  name: string;
  content: string;
  onChange: (name: string, content: string) => void;
  onClose: () => void;
  onCompare: (side: ComparisonSide, document: ComparisonDocument) => void;
}) {
  const [filter, setFilter] = useState("");
  const lines = content
    .split(/\r?\n/)
    .map((text, index) => ({ text, number: index + 1 }))
    .filter(
      (line) =>
        !filter || line.text.toLowerCase().includes(filter.toLowerCase()),
    );
  const filteredText = lines.map((line) => line.text).join("\n");
  return (
    <section className="kit-module" aria-label="Visor de evidencias">
      <h2>Visor de evidencias</h2>
      <div className="kit-form">
        <label>
          Nombre del documento
          <input
            value={name}
            onChange={(event) => onChange(event.target.value, content)}
          />
        </label>
        <label>
          Contenido del documento
          <textarea
            aria-label="Contenido del documento"
            rows={6}
            value={content}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(event) => onChange(name, event.target.value)}
            placeholder="Pega aquí el texto que quieras analizar"
          />
        </label>
        <label>
          Filtrar líneas
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Texto o identificador de petición"
          />
        </label>
      </div>
      <div className="kit-actions">
        <CopyButton text={filteredText} label="Copiar evidencia" />
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            disabled={!content}
            onClick={() =>
              onCompare(side, {
                label: `${name || "Sin título"}${filter ? " (filtrado)" : ""}`,
                text: filteredText,
              })
            }
          >
            Archivo a {side === "left" ? "A" : "B"}
          </button>
        ))}
        <button onClick={onClose}>Cerrar documento</button>
      </div>
      <pre
        className="kit-output"
        tabIndex={0}
        aria-label="Contenido de evidencia"
      >
        {lines
          .map((line) => `${String(line.number).padStart(3)}  ${line.text}`)
          .join("\n") || "Sin líneas coincidentes."}
      </pre>
    </section>
  );
}

const MAX_TEXT_LENGTH = 1_000_000;
