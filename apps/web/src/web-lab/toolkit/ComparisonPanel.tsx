import { useState } from "react";
import CopyButton from "./CopyButton";
import {
  compareLines,
  comparisonText,
  type ComparisonDraft,
  type ComparisonRow,
  type ComparisonSide,
} from "./lineComparison";
export default function ComparisonPanel({
  draft,
  onChange,
}: {
  draft: ComparisonDraft;
  onChange: (side: ComparisonSide, text: string) => void;
}) {
  const [checked, setChecked] = useState<{
    left: string;
    right: string;
    rows: ComparisonRow[];
  } | null>(null);
  const [error, setError] = useState<{
    left: string;
    right: string;
    message: string;
  } | null>(null);
  const rows =
    checked?.left === draft.left.text && checked?.right === draft.right.text
      ? checked.rows
      : null;
  function compare() {
    try {
      setChecked({
        left: draft.left.text,
        right: draft.right.text,
        rows: compareLines(draft.left.text, draft.right.text),
      });
      setError(null);
    } catch (failure) {
      setChecked(null);
      setError({
        left: draft.left.text,
        right: draft.right.text,
        message:
          failure instanceof Error ? failure.message : "No se pudo comparar.",
      });
    }
  }
  return (
    <section className="kit-module" aria-label="Comparador de textos">
      <h2>Comparador</h2>
      <p>
        Pega dos textos o envía respuestas y archivos desde las otras
        herramientas. Se alinean las líneas para distinguir cambios, inserciones
        y eliminaciones.
      </p>
      <div className="kit-compare-inputs">
        {(["left", "right"] as const).map((side) => (
          <div key={side}>
            <label>
              Texto {side === "left" ? "A" : "B"}
              <textarea
                value={draft[side].text}
                onChange={(event) => {
                  setError(null);
                  onChange(side, event.target.value);
                }}
                rows={6}
                maxLength={20000}
                spellCheck={false}
              />
            </label>
            <small>{draft[side].label || "Texto pegado"}</small>
            <CopyButton
              text={draft[side].text}
              label={`Copiar texto ${side === "left" ? "A" : "B"}`}
            />
          </div>
        ))}
      </div>
      <div className="kit-actions">
        <button onClick={compare}>Comparar textos</button>
        {rows && (
          <CopyButton text={comparisonText(rows)} label="Copiar comparación" />
        )}
      </div>
      {error &&
        error.left === draft.left.text &&
        error.right === draft.right.text && (
          <p role="alert" className="kit-error">
            {error.message}
          </p>
        )}
      {rows && (
        <>
          <p role="status">
            {rows.every((row) => row.kind === "equal")
              ? "Sin diferencias."
              : `Líneas cambiadas: ${rows.filter((row) => row.kind === "changed").length} · añadidas: ${rows.filter((row) => row.kind === "added").length} · eliminadas: ${rows.filter((row) => row.kind === "removed").length}`}
          </p>
          <div className="kit-diff-scroll">
            <table className="kit-diff" aria-label="Comparación por líneas">
              <thead>
                <tr>
                  <th scope="col">Texto A</th>
                  <th scope="col">Texto B</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className={`diff-${row.kind}`}>
                    <td>
                      <span className="kit-line-number">
                        {row.leftNumber ?? ""}
                      </span>
                      <code>
                        {row.left === null
                          ? ""
                          : (row.kind === "equal" ? "  " : "− ") + row.left}
                      </code>
                    </td>
                    <td>
                      <span className="kit-line-number">
                        {row.rightNumber ?? ""}
                      </span>
                      <code>
                        {row.right === null
                          ? ""
                          : (row.kind === "equal" ? "  " : "+ ") + row.right}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
