import { useState } from "react";
import CopyButton from "./CopyButton";
import { transformText, sha256Text, sha256Hex } from "./textTransforms";
const operations = [
  ["b64-encode", "Texto → Base64"],
  ["b64-decode", "Base64 → Texto"],
  ["b64-utf16le", "Base64 UTF-16LE → Texto"],
  ["b64url-encode", "Texto → Base64url"],
  ["b64url-decode", "Base64url → Texto"],
  ["url-encode", "Codificar URL"],
  ["url-decode", "Decodificar URL"],
  ["hex-decode", "Hexadecimal → Texto"],
  ["reverse", "Invertir texto"],
  ["binary-decode", "Binario → Texto"],
  ["vigenere-decode", "Descifrar Vigenère"],
  ["xor", "XOR hexadecimal"],
  ["sha256", "Calcular SHA-256"],
  ["sha256-hex", "SHA-256 de bytes hexadecimales"],
] as const;
export default function TextWorkbench() {
  const [operation, setOperation] = useState<string>("b64-decode");
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  async function transform() {
    setBusy(true);
    try {
      setOutput(
        operation === "sha256-hex"
          ? await sha256Hex(input)
          : operation === "sha256"
            ? await sha256Text(input)
            : transformText(operation, input, key),
      );
    } catch (failure) {
      setOutput(
        failure instanceof Error
          ? failure.message
          : "No se pudo transformar el texto.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="kit-module" aria-label="Transformador de texto">
      <h2>Transformador</h2>
      <p>
        Inspecciona paquetes codificados, segmentos de tokens y respaldos. La
        herramienta procesa únicamente el texto que introduzcas.
      </p>
      <form
        className="kit-form"
        onSubmit={(event) => {
          event.preventDefault();
          void transform();
        }}
      >
        <label>
          Operación
          <select
            aria-label="Operación"
            value={operation}
            onChange={(event) => setOperation(event.target.value)}
          >
            {operations.map(([value, title]) => (
              <option key={value} value={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Entrada
          <textarea
            aria-label="Entrada"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={20000}
            rows={4}
            spellCheck={false}
          />
        </label>
        {(operation === "xor" || operation === "vigenere-decode") && (
          <label>
            Clave
            <input
              aria-label="Clave"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              maxLength={64}
            />
          </label>
        )}
        <button disabled={busy}>
          {busy ? "Procesando…" : "Transformar texto"}
        </button>
      </form>
      <label className="kit-result">
        Salida
        <textarea
          aria-label="Resultado de transformación"
          value={output}
          readOnly
          rows={5}
          spellCheck={false}
        />
      </label>
      <div className="kit-actions">
        <button
          disabled={!output}
          onClick={() => {
            setInput(output);
            setOutput("");
          }}
        >
          Usar salida como entrada
        </button>
        <CopyButton text={output} label="Copiar resultado" />
      </div>
    </section>
  );
}
