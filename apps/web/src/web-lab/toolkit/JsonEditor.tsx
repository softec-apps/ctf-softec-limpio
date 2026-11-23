import { useState } from "react";
import CopyButton from "./CopyButton";
import { formatJson, validateJson } from "./jsonTools";
export default function JsonEditor() {
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  function process(mode: "validate" | "pretty" | "compact") {
    try {
      if (mode === "validate") validateJson(source);
      else setSource(formatJson(source, mode));
      setStatus({
        valid: true,
        message:
          mode === "validate"
            ? "JSON válido."
            : mode === "pretty"
              ? "JSON válido. Formato aplicado."
              : "JSON válido. Texto compactado.",
      });
    } catch (failure) {
      setStatus({
        valid: false,
        message:
          "No se pudo procesar el JSON: " +
          (failure instanceof Error ? failure.message : "revisa la sintaxis."),
      });
    }
  }
  return (
    <section className="kit-module" aria-label="Editor JSON">
      <h2>Editor JSON</h2>
      <p>
        Valida la sintaxis y organiza los datos antes de utilizarlos en una
        consulta. El texto se procesa localmente.
      </p>
      <label>
        Documento JSON
        <textarea
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setStatus(null);
          }}
          rows={12}
          maxLength={50000}
          spellCheck={false}
        />
      </label>
      <div className="kit-actions">
        <button onClick={() => process("validate")}>Validar JSON</button>
        <button onClick={() => process("pretty")}>Dar formato</button>
        <button onClick={() => process("compact")}>Compactar JSON</button>
        <CopyButton text={source} label="Copiar JSON" />
      </div>
      {status && (
        <p
          role={status.valid ? "status" : "alert"}
          className={status.valid ? "kit-success" : "kit-error"}
        >
          {status.message}
        </p>
      )}
    </section>
  );
}
