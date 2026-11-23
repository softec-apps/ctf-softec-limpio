import { useEffect, useMemo, useRef, useState } from "react";
import { useEvidenceFile } from "../evidence-media/useEvidenceFile";
import EvidenceFileControl from "../evidence-media/EvidenceFileControl";
import AnalysisResult from "../evidence-media/AnalysisResult";
import CopyButton from "../web-lab/toolkit/CopyButton";
import { printableStrings } from "../evidence-media/binaryFormats";
import { parseWasm, disassemble, initialMemory } from "./wasm";
import "../evidence-media/media-tools.css";
import "./reversing.css";
type Execution = { result: number; output: string; memory: Uint8Array };
export default function Disassembler({
  request,
}: {
  request?: { path: string; sequence: number };
}) {
  const source = useEvidenceFile(request),
    [tab, setTab] = useState("code"),
    [functionIndex, setFunctionIndex] = useState(0),
    [input, setInput] = useState(""),
    [running, setRunning] = useState(false),
    [error, setError] = useState(""),
    [execution, setExecution] = useState<Execution | null>(null),
    [address, setAddress] = useState("256");
  const panel = useRef<HTMLElement>(null);
  const pending = useRef<{
    worker: Worker;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  function stop() {
    if (pending.current) {
      pending.current.worker.terminate();
      clearTimeout(pending.current.timer);
      pending.current = null;
    }
  }
  useEffect(() => () => stop(), []);
  useEffect(() => {
    stop();
    setExecution(null);
    setRunning(false);
    setError("");
    setFunctionIndex(0);
    setInput("");
  }, [source.file]);
  const parsed = useMemo(() => {
    if (!source.file) return { module: null, error: "" };
    try {
      return { module: parseWasm(source.file.data), error: "" };
    } catch (error) {
      return {
        module: null,
        error:
          error instanceof Error ? error.message : "No se pudo leer el módulo.",
      };
    }
  }, [source.file]);
  const original = useMemo(
    () => (parsed.module ? initialMemory(parsed.module) : null),
    [parsed.module],
  );
  const memory = execution?.memory ?? original,
    offset = Number(address),
    validOffset = Number.isInteger(offset) && offset >= 0 && offset < 65536;
  const selected = parsed.module?.functions[functionIndex],
    code =
      parsed.module && selected ? disassemble(parsed.module, selected) : "";
  const strings = useMemo(
    () => (source.file ? printableStrings(source.file.data) : []),
    [source.file],
  );
  function run() {
    if (!source.file || !parsed.module) return;
    stop();
    setError("");
    setExecution(null);
    if (new TextEncoder().encode(input).length > 128) {
      setError("La entrada admite hasta 128 bytes UTF-8.");
      return;
    }
    try {
      const worker = new Worker(
        new URL("./runner.worker.ts", import.meta.url),
        { type: "module" },
      );
      setRunning(true);
      const timer = setTimeout(() => {
        stop();
        setRunning(false);
        setError("Ejecución detenida: se alcanzó el límite de 2 segundos.");
      }, 2000);
      pending.current = { worker, timer };
      worker.onmessage = (
        event: MessageEvent<Execution & { error?: string }>,
      ) => {
        if (pending.current?.worker !== worker) return;
        stop();
        setRunning(false);
        if (event.data.error) setError(event.data.error);
        else setExecution(event.data);
      };
      worker.onerror = () => {
        if (pending.current?.worker !== worker) return;
        stop();
        setRunning(false);
        setError("No se pudo iniciar la ejecución aislada.");
      };
      worker.postMessage({ bytes: source.file.data, input });
    } catch (error) {
      stop();
      setRunning(false);
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo crear el banco de pruebas.",
      );
    }
  }
  return (
    <section
      ref={panel}
      className="media-tool reverse-tool"
      aria-label="Desensamblador"
    >
      <header>
        <h2>Desensamblador</h2>
        <p>WebAssembly · código, datos y banco de pruebas</p>
      </header>
      <EvidenceFileControl
        label="Abrir programa"
        name={source.file?.name}
        loading={source.loading}
        onOpen={source.open}
      />
      {(source.error || parsed.error || error) && (
        <p role="alert">{source.error || parsed.error || error}</p>
      )}
      {parsed.module && (
        <>
          <p className="media-file-info">
            WebAssembly 1 · {source.file?.data.length} bytes ·{" "}
            {parsed.module.functions.length} función(es) · memoria fija de 64
            KiB · sin imports
          </p>
          <nav className="reverse-tabs" aria-label="Vistas del desensamblador">
            {[
              ["code", "Código"],
              ["data", "Datos"],
              ["run", "Ejecución"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => {
                  setTab(id);
                  panel.current?.scrollTo({ top: 0 });
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === "code" && (
            <>
              <div className="media-controls">
                <label>
                  Función
                  <select
                    aria-label="Función del programa"
                    value={functionIndex}
                    onChange={(e) => setFunctionIndex(Number(e.target.value))}
                  >
                    {parsed.module.functions.map((fn) => (
                      <option key={fn.index} value={fn.index}>
                        $f{fn.index}{" "}
                        {parsed
                          .module!.exports.filter(
                            (e) => e.kind === 0 && e.index === fn.index,
                          )
                          .map((e) => e.name)
                          .join(", ")}{" "}
                        · {fn.instructions.length} instrucciones
                      </option>
                    ))}
                  </select>
                </label>
                <CopyButton text={code} label="Copiar desensamblado" />
              </div>
              <pre
                className="reverse-code"
                tabIndex={0}
                aria-label="Código desensamblado"
              >
                {code}
              </pre>
              <details>
                <summary>Secciones y exportaciones</summary>
                <ul>
                  {parsed.module.sections.map((s) => (
                    <li key={s.offset}>
                      {s.name} · offset 0x{s.offset.toString(16)} · {s.size}{" "}
                      bytes
                    </li>
                  ))}
                </ul>
                <ul>
                  {parsed.module.exports.map((e) => (
                    <li key={e.name}>
                      {e.name} →{" "}
                      {e.kind === 0
                        ? "función"
                        : e.kind === 2
                          ? "memoria"
                          : "global"}{" "}
                      {e.index}
                      {e.kind === 3
                        ? ` = ${parsed.module!.globals[e.index]}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
          {tab === "data" && (
            <>
              <div className="reverse-segments">
                {parsed.module.segments.map((segment, i) => (
                  <button
                    key={i}
                    onClick={() => setAddress(String(segment.offset))}
                  >
                    Segmento 0x{segment.offset.toString(16)} ·{" "}
                    {segment.bytes.length} bytes
                  </button>
                ))}
              </div>
              <label>
                Dirección de memoria
                <input
                  aria-label="Dirección de memoria"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="256 o 0x100"
                />
              </label>
              <p className="media-file-info">
                {execution
                  ? "Memoria después de la última ejecución. Las celdas marcadas cambiaron."
                  : "Memoria inicial del módulo."}
              </p>
              {!validOffset && (
                <p role="alert">
                  Introduce una dirección entre 0 y 65535, decimal o
                  hexadecimal.
                </p>
              )}
              {memory && validOffset && (
                <div className="media-hex-scroll">
                  <table className="reverse-memory">
                    <thead>
                      <tr>
                        <th>Dirección</th>
                        <th>Bytes</th>
                        <th>ASCII</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        {
                          length: Math.ceil(Math.min(512, 65536 - offset) / 16),
                        },
                        (_, row) => {
                          const start = offset + row * 16,
                            bytes = memory.subarray(
                              start,
                              Math.min(start + 16, 65536),
                            );
                          return (
                            <tr key={start}>
                              <th>{start.toString(16).padStart(6, "0")}</th>
                              <td>
                                {Array.from(bytes, (byte, i) => (
                                  <span
                                    key={i}
                                    className={
                                      execution &&
                                      original?.[start + i] !== byte
                                        ? "is-changed"
                                        : ""
                                    }
                                  >
                                    {byte.toString(16).padStart(2, "0")}{" "}
                                  </span>
                                ))}
                              </td>
                              <td>
                                {Array.from(bytes, (byte) =>
                                  byte >= 32 && byte < 127
                                    ? String.fromCharCode(byte)
                                    : ".",
                                ).join("")}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <details>
                <summary>Cadenas del archivo ({strings.length})</summary>
                {strings.map((value, i) => (
                  <div key={i}>
                    <pre>{value}</pre>
                    <CopyButton text={value} label="Copiar cadena" />
                  </div>
                ))}
              </details>
            </>
          )}
          {tab === "run" && (
            <>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  run();
                }}
              >
                <label>
                  Clave de prueba
                  <input
                    aria-label="Clave de prueba"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={128}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
                <div className="media-controls">
                  <button disabled={running || source.loading}>
                    {running ? "Ejecutando…" : "Ejecutar programa"}
                  </button>
                  {running && (
                    <button
                      type="button"
                      onClick={() => {
                        stop();
                        setRunning(false);
                        setError("Ejecución detenida.");
                      }}
                    >
                      Detener
                    </button>
                  )}
                </div>
              </form>
              <p>
                La entrada UTF-8 se escribe en memoria desde 0. Se llama a
                verify(0, longitud), con memoria nueva en cada intento.
              </p>
              {execution && (
                <p role="status" className="reverse-run-status">
                  verify devolvió {execution.result}.{" "}
                  {execution.result === 1
                    ? "El programa autorizó la entrega."
                    : "La entrada no fue autorizada."}
                </p>
              )}
              <AnalysisResult value={execution?.output ?? ""} />
            </>
          )}
        </>
      )}
      <details className="reverse-help">
        <summary>Ayuda de instrucciones</summary>
        <p>
          WebAssembly es una máquina de pila. Los operandos se apilan y cada
          operación consume los valores superiores. Las direcciones a la
          izquierda son offsets reales dentro del archivo. Los enteros i32
          tienen 32 bits; las operaciones aritméticas conservan los 32 bits
          inferiores.
        </p>
        <dl>
          <dt>local.get / local.set / local.tee</dt>
          <dd>
            Leer una variable, guardar el valor superior, o guardarlo
            conservándolo en la pila. Los parámetros ocupan las primeras
            posiciones; las variables adicionales comienzan después.
          </dd>
          <dt>i32.const / load8_u / load</dt>
          <dd>
            Apilar una constante. Cargar un byte sin signo o cuatro bytes
            little-endian desde la dirección superior, sumando el offset
            inmediato. Los argumentos de las cargas son alineación y offset.
          </dd>
          <dt>i32.store8 / store</dt>
          <dd>
            Guardar el valor superior en la dirección situada debajo: un byte o
            cuatro bytes little-endian.
          </dd>
          <dt>add / sub / mul / rem_u</dt>
          <dd>
            Para operandos a, b: a+b, a−b, a×b, resto sin signo de a/b. El
            operando b está encima de a.
          </dd>
          <dt>xor / and / or / shl / shr_u / rotl / rotr</dt>
          <dd>
            XOR, AND, OR; desplazamiento a izquierda o derecha sin signo;
            rotación de 32 bits a izquierda o derecha. La cantidad se toma
            módulo 32. AND 255 conserva un byte.
          </dd>
          <dt>eq / ne / eqz / lt_u / ge_u</dt>
          <dd>
            Comparaciones: igual, distinto, igual a cero, menor sin signo, mayor
            o igual sin signo. Producen 1 si se cumplen, 0 en caso contrario.
          </dd>
          <dt>block / loop / if / else / br / br_if / end</dt>
          <dd>
            Bloques estructurados. br N salta a la etiqueta N, contando desde el
            bloque interior (0). En loop vuelve al comienzo; en block sale.
            br_if consume una condición. if también consume una condición.
          </dd>
          <dt>call / return</dt>
          <dd>
            call N ejecuta la función N con sus argumentos de pila. return
            termina la función usando su resultado superior.
          </dd>
        </dl>
        <p>
          El banco ejecuta el módulo real en un Worker independiente, sin
          imports ni acceso a archivos o red desde el módulo. Se admite este
          subconjunto de WebAssembly, con una memoria fija de 64 KiB y un límite
          de dos segundos por ejecución. No se modifica el archivo original.
        </p>
      </details>
    </section>
  );
}
