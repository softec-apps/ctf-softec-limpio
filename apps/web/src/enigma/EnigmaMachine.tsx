import { useMemo, useState } from "react";
import { RotateCcw, Radio } from "lucide-react";
import {
  ROTOR_NAMES,
  runEnigma,
  type EnigmaSettings,
  type RotorName,
} from "../../../../packages/enigma-machine";
import CopyButton from "../web-lab/toolkit/CopyButton";
import "./enigma.css";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const initialSettings = (): EnigmaSettings => ({
  rotors: ["I", "II", "III"],
  rings: [1, 1, 1],
  positions: "AAA",
  reflector: "B",
  plugboard: "",
});
export default function EnigmaMachine() {
  const [settings, setSettings] = useState(initialSettings);
  const [input, setInput] = useState("");
  const [crib, setCrib] = useState("");
  const result = useMemo(() => {
    try {
      return { ok: true as const, ...runEnigma(input, settings) };
    } catch (error) {
      return {
        ok: false as const,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el mensaje.",
      };
    }
  }, [input, settings]);
  const output = result.ok ? result.text : "";
  const positions = result.ok ? result.positions : settings.positions;
  const lastLetter = output.at(-1);
  const expected = crib.toUpperCase().replace(/\s/g, "");
  function changeRotor(index: number, rotor: RotorName) {
    setSettings((current) => {
      const rotors: EnigmaSettings["rotors"] = [...current.rotors];
      rotors[index] = rotor;
      return { ...current, rotors };
    });
  }
  function changeRing(index: number, ring: number) {
    setSettings((current) => {
      const rings: EnigmaSettings["rings"] = [...current.rings];
      rings[index] = ring;
      return { ...current, rings };
    });
  }
  return (
    <section className="enigma-app" aria-label="Máquina Enigma">
      <header className="enigma-heading">
        <div>
          <span className="enigma-maker">
            <Radio size={16} /> Estación de comunicaciones
          </span>
          <h1>
            Enigma <span>I</span>
          </h1>
          <p>
            Reconstruye la configuración. Escucha lo que esconden las letras.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setInput("");
            setCrib("");
            setSettings(initialSettings());
          }}
        >
          <RotateCcw size={15} /> Restablecer máquina
        </button>
      </header>
      <div className="enigma-body">
        <div className="enigma-instrument">
          <div
            className="enigma-rotors"
            aria-label="Configuración de rotores de izquierda a derecha"
          >
            {(["Izquierdo", "Central", "Derecho"] as const).map(
              (name, index) => (
                <fieldset key={name} className="enigma-rotor">
                  <legend>{name}</legend>
                  <label>
                    Rotor
                    <select
                      aria-label={`Rotor ${name.toLowerCase()}`}
                      value={settings.rotors[index]}
                      onChange={(e) =>
                        changeRotor(index, e.target.value as RotorName)
                      }
                    >
                      {ROTOR_NAMES.map((rotor) => (
                        <option key={rotor}>{rotor}</option>
                      ))}
                    </select>
                  </label>
                  <output
                    className="enigma-window"
                    aria-label={`Ventana ${["izquierda", "central", "derecha"][index]}`}
                  >
                    {positions[index] || "—"}
                  </output>
                  <label>
                    Anillo
                    <input
                      aria-label={`Anillo ${name.toLowerCase()}`}
                      type="number"
                      min={1}
                      max={26}
                      value={settings.rings[index]}
                      onChange={(e) =>
                        changeRing(index, Number(e.target.value))
                      }
                    />
                  </label>
                </fieldset>
              ),
            )}
          </div>
          <div className="enigma-start">
            <label>
              Posición inicial
              <input
                value={settings.positions}
                maxLength={3}
                autoCapitalize="characters"
                spellCheck={false}
                aria-describedby="enigma-start-help"
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    positions: e.target.value.toUpperCase(),
                  })
                }
              />
            </label>
            <label>
              Reflector
              <select
                value={settings.reflector}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reflector: e.target.value as "B" | "C",
                  })
                }
              >
                <option>B</option>
                <option>C</option>
              </select>
            </label>
          </div>
          <p id="enigma-start-help" className="enigma-caption">
            Posiciones antes de la primera letra. Cada entrada se procesa desde
            este inicio; los espacios no avanzan los rotores.
          </p>
          <div className="enigma-lamps" aria-label="Panel de lámparas">
            {[...alphabet].map((letter) => (
              <span
                key={letter}
                className={lastLetter === letter ? "is-lit" : ""}
                aria-label={
                  lastLetter === letter
                    ? `Lámpara ${letter} encendida`
                    : undefined
                }
              >
                {letter}
              </span>
            ))}
          </div>
          <div className="enigma-keyboard" aria-label="Teclado Enigma">
            {[..."QWERTZUIOASDFGHJKPYXCVBNML"].map((letter) => (
              <button
                type="button"
                key={letter}
                disabled={input.length >= 12000}
                aria-label={`Pulsar ${letter}`}
                onClick={() => setInput((current) => current + letter)}
              >
                {letter}
              </button>
            ))}
          </div>
          <label className="enigma-plugs">
            Panel de conexiones
            <input
              value={settings.plugboard}
              maxLength={100}
              placeholder="AB CD EF…"
              spellCheck={false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  plugboard: e.target.value.toUpperCase(),
                })
              }
            />
          </label>
          <p className="enigma-caption">
            Hasta diez parejas separadas por espacios. Cada letra puede
            conectarse una sola vez.
          </p>
        </div>
        <div className="enigma-transmission">
          <div className="enigma-paper-heading">
            <h2>Transmisión</h2>
            <span>{output.length} letras</span>
          </div>
          <div className="enigma-entry">
            <label htmlFor="enigma-input">Entrada</label>
            <textarea
              id="enigma-input"
              value={input}
              maxLength={12000}
              placeholder="Reúne los fragmentos y pega aquí solo las letras del mensaje…"
              spellCheck={false}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          {!result.ok && (
            <p className="enigma-error" role="alert">
              {result.error}
            </p>
          )}
          <div className="enigma-output-heading">
            <label htmlFor="enigma-output">Salida</label>
            <CopyButton text={output} label="Copiar salida" />
          </div>
          <textarea
            id="enigma-output"
            className="enigma-output"
            readOnly
            value={output.match(/.{1,5}/g)?.join(" ") ?? ""}
            placeholder="Las lámparas aún guardan silencio."
            spellCheck={false}
          />
          <label>
            Encabezamiento probable
            <input
              value={crib}
              maxLength={80}
              placeholder="Tu hipótesis, sin signos"
              spellCheck={false}
              onChange={(e) => setCrib(e.target.value)}
            />
          </label>
          {expected && (
            <p className="enigma-crib" role="status">
              {output.startsWith(expected)
                ? "El encabezamiento coincide. Comprueba también el mensaje completo."
                : "El encabezamiento todavía no coincide."}
            </p>
          )}
          <button
            type="button"
            className="enigma-clear"
            onClick={() => setInput("")}
          >
            Vaciar transmisión
          </button>
          <details>
            <summary>Cómo operar la máquina</summary>
            <p>
              Configura rotores y anillos de izquierda a derecha. Introduce la
              posición inicial y las conexiones recuperadas. Pega el mensaje o
              usa el teclado: las ventanas muestran el avance y la última letra
              enciende su lámpara.
            </p>
            <p>
              Cifrar y descifrar usan la misma operación. Al cambiar una
              configuración se vuelve a procesar toda la entrada desde la
              posición inicial. La copia de salida omite los espacios visuales,
              para poder calcular su SHA-256 en el Transformador.
            </p>
            <p>
              Los anexos están en Archivos:
              /home/analista/criptografia/caso-10/evidencia.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
