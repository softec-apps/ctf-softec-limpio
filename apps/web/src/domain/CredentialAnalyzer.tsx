import { useState } from "react";
import VirtualFilePicker from "../web-lab/toolkit/VirtualFilePicker";
import CopyButton from "../web-lab/toolkit/CopyButton";
import { useDomainLab, domainCommandText } from "./useDomainLab";
import "./domain.css";
export default function CredentialAnalyzer() {
  const lab = useDomainLab(),
    [file, setFile] = useState<{ path: string; content: string } | null>(null),
    [dictionary, setDictionary] = useState(
      "/home/analista/dominio/diccionario.txt",
    ),
    [picker, setPicker] = useState<"capture" | "dictionary" | null>(null),
    [mode, setMode] = useState("dictionary"),
    [output, setOutput] = useState("");
  async function analyse() {
    if (!file) return;
    const reply = await lab.send(
      domainCommandText(
        mode === "gpp"
          ? ["decrypt", file.path]
          : ["crack", file.path, dictionary],
      ),
    );
    if (reply) setOutput(reply.output);
  }
  const recovered =
    output.match(/^[^:\n]+:([^\n]+)\n?(?:Comprobación|$)/)?.[1] ?? "";
  return (
    <section className="domain-tool" aria-label="Analizador de credenciales">
      <header>
        <div>
          <h2>Analizador de credenciales</h2>
          <p>Verificadores y preferencias preservadas</p>
        </div>
      </header>
      <div className="domain-actions">
        <button onClick={() => setPicker("capture")}>Abrir evidencia</button>
        <span className="domain-file-name">
          {file?.path ?? "Sin evidencia abierta"}
        </span>
      </div>
      {picker && (
        <div className="domain-picker">
          <button onClick={() => setPicker(null)}>Cancelar</button>
          <VirtualFilePicker
            onOpen={(path, content) => {
              if (picker === "dictionary") setDictionary(path);
              else {
                setFile({ path, content });
                setMode(path.endsWith(".xml") ? "gpp" : "dictionary");
                setOutput("");
              }
              setPicker(null);
            }}
          />
        </div>
      )}
      <label>
        Análisis
        <select
          aria-label="Tipo de análisis"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="dictionary">Comprobar diccionario</option>
          <option value="gpp">Descifrar preferencia de grupo</option>
        </select>
      </label>
      {mode === "dictionary" && (
        <div className="domain-actions">
          <button onClick={() => setPicker("dictionary")}>
            Elegir diccionario virtual
          </button>
          <span className="domain-file-name">{dictionary}</span>
        </div>
      )}
      <button disabled={!file || lab.busy} onClick={() => void analyse()}>
        {lab.busy ? "Analizando…" : "Analizar evidencia"}
      </button>
      {lab.error && <p role="alert">{lab.error}</p>}
      {file && (
        <details>
          <summary>Contenido preservado</summary>
          <pre>{file.content}</pre>
        </details>
      )}
      {output && (
        <section className="domain-results">
          <h3>Resultado</h3>
          <textarea
            aria-label="Resultado del análisis de credenciales"
            value={output}
            readOnly
          />
          <CopyButton text={output} label="Copiar análisis de credenciales" />
          {recovered && (
            <CopyButton text={recovered} label="Copiar contraseña recuperada" />
          )}
        </section>
      )}
      <p className="domain-footnote">
        Solo archivos virtuales del laboratorio. El análisis offline no necesita
        mantener la VPN conectada.
      </p>
    </section>
  );
}
