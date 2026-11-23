import { useEffect, useMemo, useRef, useState } from "react";
import { useEvidenceFile } from "./useEvidenceFile";
import EvidenceFileControl from "./EvidenceFileControl";
import AnalysisResult from "./AnalysisResult";
import {
  decodeWave,
  audioSamples,
  audioPayload,
  decodeFsk,
  goertzel,
} from "./binaryFormats";
import "./media-tools.css";
export default function AudioInspector({
  request,
}: {
  request?: { path: string; sequence: number };
}) {
  const source = useEvidenceFile(request),
    [mode, setMode] = useState("mix"),
    [bit, setBit] = useState(0),
    [channel, setChannel] = useState(0),
    [zero, setZero] = useState(600),
    [one, setOne] = useState(1200),
    [duration, setDuration] = useState(25),
    [result, setResult] = useState(""),
    [failure, setFailure] = useState(""),
    [url, setUrl] = useState("");
  const waveCanvas = useRef<HTMLCanvasElement>(null),
    spectrumCanvas = useRef<HTMLCanvasElement>(null);
  const parsed = useMemo(() => {
    if (!source.file) return { wave: null, error: "" };
    try {
      return { wave: decodeWave(source.file.data), error: "" };
    } catch (e) {
      return {
        wave: null,
        error: e instanceof Error ? e.message : "No se pudo leer WAV.",
      };
    }
  }, [source.file]);
  const data = useMemo(() => {
    if (!parsed.wave) return null;
    try {
      return audioSamples(parsed.wave, mode);
    } catch {
      return null;
    }
  }, [parsed.wave, mode]);
  useEffect(() => {
    setResult("");
    setFailure("");
    if (!source.file) return;
    const value = URL.createObjectURL(
      new Blob([source.file.data.slice().buffer], { type: "audio/wav" }),
    );
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [source.file]);
  useEffect(() => {
    if (!data || !parsed.wave || !waveCanvas.current || !spectrumCanvas.current)
      return;
    const draw = (canvas: HTMLCanvasElement) => {
      canvas.width = 720;
      canvas.height = 160;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#142330";
      ctx.fillRect(0, 0, 720, 160);
      return ctx;
    };
    const ctx = draw(waveCanvas.current);
    ctx.strokeStyle = "#8ad4b3";
    ctx.beginPath();
    let peak = 1;
    for (const value of data) peak = Math.max(peak, Math.abs(value));
    for (let x = 0; x < 720; x++) {
      const start = Math.floor((x * data.length) / 720),
        end = Math.max(start + 1, Math.floor(((x + 1) * data.length) / 720));
      let lo = 0,
        hi = 0;
      for (let i = start; i < Math.min(end, data.length); i++) {
        lo = Math.min(lo, data[i]);
        hi = Math.max(hi, data[i]);
      }
      ctx.moveTo(x, 80 + (lo / peak) * 70);
      ctx.lineTo(x, 80 + (hi / peak) * 70);
    }
    ctx.stroke();
    const spectrum = draw(spectrumCanvas.current),
      frequencies = Array.from({ length: 100 }, (_, i) => (i + 1) * 20).filter(
        (f) => f < parsed.wave!.sampleRate / 2,
      ),
      values = frequencies.map((f) =>
        goertzel(
          data,
          0,
          Math.min(8000, data.length),
          parsed.wave!.sampleRate,
          f,
        ),
      ),
      max = Math.max(1, ...values);
    spectrum.fillStyle = "#77abc8";
    values.forEach((v, i) => {
      const h = Math.sqrt(v / max) * 130;
      spectrum.fillRect(
        (i * 720) / values.length,
        145 - h,
        Math.max(1, 720 / values.length - 2),
        h,
      );
    });
    spectrum.fillStyle = "#d1e1ed";
    spectrum.font = "12px monospace";
    spectrum.fillText("0 Hz", 5, 158);
    spectrum.fillText("2000 Hz", 650, 158);
  }, [data, parsed.wave]);
  function analyse(action: () => string | null) {
    setFailure("");
    try {
      setResult(
        action() ?? "No se encontró una trama de texto con estos parámetros.",
      );
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "No se pudo analizar la señal.",
      );
    }
  }
  return (
    <section className="media-tool" aria-label="Analizador de audio">
      <header>
        <h2>Analizador de audio</h2>
        <p>Reproduce WAV, examina sus muestras y compara canales.</p>
      </header>
      <EvidenceFileControl
        label="Abrir audio"
        name={source.file?.name}
        loading={source.loading}
        onOpen={source.open}
      />
      {(source.error || parsed.error || failure) && (
        <p role="alert">{source.error || parsed.error || failure}</p>
      )}
      {parsed.wave && (
        <>
          <p className="media-file-info">
            PCM 16 bits · {parsed.wave.sampleRate} Hz · {parsed.wave.channels}{" "}
            canal(es) ·{" "}
            {(parsed.wave.frames / parsed.wave.sampleRate).toFixed(2)} s
          </p>
          <audio
            controls
            src={url}
            preload="metadata"
            aria-label="Reproductor de audio"
          />
          <label className="media-inline-label">
            Señal
            <select
              aria-label="Señal de audio"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="mix">Mezcla</option>
              <option value="left">Izquierdo / mono</option>
              <option value="right" disabled={parsed.wave.channels < 2}>
                Derecho
              </option>
              <option value="difference" disabled={parsed.wave.channels < 2}>
                Diferencia L−R
              </option>
            </select>
          </label>
          <h3>Forma de onda</h3>
          <canvas
            className="media-audio-plot"
            ref={waveCanvas}
            aria-label="Forma de onda"
          />
          <h3>Espectro de la señal</h3>
          <canvas
            className="media-audio-plot"
            ref={spectrumCanvas}
            aria-label="Espectro de frecuencias"
          />
          <div className="media-controls">
            <label>
              Canal de muestras
              <select
                aria-label="Canal de muestras"
                value={channel}
                onChange={(e) => setChannel(Number(e.target.value))}
              >
                {Array.from({ length: parsed.wave.channels }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? "Izquierdo / mono" : "Derecho"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bit
              <select
                aria-label="Bit de audio"
                value={bit}
                onChange={(e) => setBit(Number(e.target.value))}
              >
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() =>
                analyse(() => audioPayload(parsed.wave!, channel, bit))
              }
            >
              Extraer bits de muestras
            </button>
          </div>
          <fieldset>
            <legend>Demodulación FSK</legend>
            <div className="media-controls">
              <label>
                Frecuencia 0 (Hz)
                <input
                  aria-label="Frecuencia cero"
                  type="number"
                  value={zero}
                  onChange={(e) => setZero(Number(e.target.value))}
                />
              </label>
              <label>
                Frecuencia 1 (Hz)
                <input
                  aria-label="Frecuencia uno"
                  type="number"
                  value={one}
                  onChange={(e) => setOne(Number(e.target.value))}
                />
              </label>
              <label>
                Símbolo (ms)
                <input
                  aria-label="Duración de símbolo"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </label>
              <button
                onClick={() =>
                  analyse(() =>
                    decodeFsk(parsed.wave!, mode, zero, one, duration),
                  )
                }
              >
                Demodular señal
              </button>
            </div>
          </fieldset>
        </>
      )}
      <AnalysisResult value={result} />
      <details>
        <summary>Ayuda de la herramienta</summary>
        <p>
          Las muestras se leen como PCM firmado de 16 bits. Mezcla promedia
          ambos canales; Diferencia resta el derecho al izquierdo. La extracción
          forma bytes de izquierda a derecha. FSK compara la energía de las dos
          frecuencias por símbolo mediante Goertzel y reconoce tramas STEG. No
          transcribe voz.
        </p>
      </details>
    </section>
  );
}
