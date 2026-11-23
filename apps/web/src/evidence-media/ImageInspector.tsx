import { useEffect, useMemo, useRef, useState } from "react";
import { useEvidenceFile, type EvidenceFile } from "./useEvidenceFile";
import EvidenceFileControl from "./EvidenceFileControl";
import AnalysisResult from "./AnalysisResult";
import CopyButton from "../web-lab/toolkit/CopyButton";
import {
  identify,
  imageMetadata,
  imagePayload,
  bitPlane,
  xorImages,
  textOf,
} from "./binaryFormats";
import "./media-tools.css";
function usePixels(file: EvidenceFile | null) {
  const [image, setImage] = useState<ImageData | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    setImage(null);
    setError("");
    if (!file) return;
    let active = true;
    const url = URL.createObjectURL(
      new Blob([file.data.slice().buffer], { type: file.mime }),
    );
    const img = new Image();
    img.src = url;
    void img
      .decode()
      .then(() => {
        if (!active) return;
        if (img.width * img.height > 4194304)
          throw new Error("La imagen supera los cuatro millones de píxeles.");
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        setImage(ctx.getImageData(0, 0, img.width, img.height));
      })
      .catch(() => {
        if (active)
          setError(
            "No se pudo decodificar la imagen. Revisa su firma en el Editor hexadecimal.",
          );
      });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return { image, error };
}
export default function ImageInspector({
  request,
}: {
  request?: { path: string; sequence: number };
}) {
  const source = useEvidenceFile(request),
    second = useEvidenceFile(),
    a = usePixels(source.file),
    b = usePixels(second.file);
  const [mode, setMode] = useState("original"),
    [channel, setChannel] = useState("b"),
    [bit, setBit] = useState(0),
    [lsbChannels, setLsbChannels] = useState("rgb"),
    [result, setResult] = useState(""),
    [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useMemo(() => {
    if (!a.image) return null;
    if (mode === "plane")
      return new ImageData(
        bitPlane(a.image.data, { r: 0, g: 1, b: 2, a: 3 }[channel] ?? 2, bit),
        a.image.width,
        a.image.height,
      );
    if (mode === "xor") {
      if (
        !b.image ||
        b.image.width !== a.image.width ||
        b.image.height !== a.image.height
      )
        return null;
      return new ImageData(
        xorImages(a.image.data, b.image.data),
        a.image.width,
        a.image.height,
      );
    }
    return a.image;
  }, [a.image, b.image, mode, channel, bit]);
  useEffect(() => {
    setResult("");
    setError("");
    if (view && canvas.current) {
      canvas.current.width = view.width;
      canvas.current.height = view.height;
      canvas.current.getContext("2d")!.putImageData(view, 0, 0);
    }
  }, [view]);
  const metadata = useMemo(
    () => (source.file ? imageMetadata(source.file.data) : []),
    [source.file],
  );
  const svg = useMemo(() => {
    if (!source.file || identify(source.file.data) !== "SVG") return [];
    const document = new DOMParser().parseFromString(
      textOf(source.file.data),
      "image/svg+xml",
    );
    return Array.from(document.querySelectorAll("text")).map((node) => ({
      text: node.textContent ?? "",
      fill: node.getAttribute("fill") ?? "heredado",
      opacity: node.getAttribute("opacity") ?? "1",
    }));
  }, [source.file]);
  async function readQr() {
    if (!view) return;
    setError("");
    const { default: jsQR } = await import("jsqr");
    const qr = jsQR(view.data, view.width, view.height, {
      inversionAttempts: "attemptBoth",
    });
    setResult(qr?.data ?? "No se encontró un QR legible en la vista actual.");
  }
  return (
    <section className="media-tool" aria-label="Visor de imágenes">
      <header>
        <h2>Visor de imágenes</h2>
        <p>
          Explora píxeles, canales, metadatos y capas de archivos virtuales.
        </p>
      </header>
      <EvidenceFileControl
        label="Abrir imagen"
        name={source.file?.name}
        loading={source.loading}
        onOpen={source.open}
      />
      {(source.error || a.error || error) && (
        <p role="alert">{source.error || a.error || error}</p>
      )}
      {source.file && (
        <p className="media-file-info">
          {identify(source.file.data)} ·{" "}
          {source.file.data.length.toLocaleString()} bytes{" "}
          {a.image && `· ${a.image.width} × ${a.image.height}`}
        </p>
      )}
      <div className="media-controls">
        <label>
          Vista
          <select
            aria-label="Vista de imagen"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="original">Original</option>
            <option value="plane">Plano de bits</option>
            <option value="xor">Combinar XOR</option>
          </select>
        </label>
        <label>
          Canal
          <select
            aria-label="Canal de imagen"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="r">Rojo</option>
            <option value="g">Verde</option>
            <option value="b">Azul</option>
            <option value="a">Alfa</option>
          </select>
        </label>
        <label>
          Bit
          <select
            aria-label="Bit de imagen"
            value={bit}
            onChange={(e) => setBit(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!view} onClick={() => void readQr()}>
          Leer QR de la vista
        </button>
      </div>
      {mode === "xor" && (
        <>
          <EvidenceFileControl
            label="Abrir segunda imagen"
            name={second.file?.name}
            loading={second.loading}
            onOpen={second.open}
          />
          {(second.error || b.error) && (
            <p role="alert">{second.error || b.error}</p>
          )}
          {!view && (
            <p>
              Abre dos imágenes con las mismas dimensiones para combinarlas.
            </p>
          )}
        </>
      )}
      <div className="media-image-stage">
        {view ? (
          <canvas ref={canvas} aria-label="Imagen analizada" />
        ) : (
          <p>Abre una imagen para examinarla.</p>
        )}
      </div>
      <div className="media-controls">
        <label>
          Secuencia de canales
          <select
            aria-label="Canales de extracción"
            value={lsbChannels}
            onChange={(e) => setLsbChannels(e.target.value)}
          >
            <option value="rgb">RGB</option>
            <option value="r">Rojo</option>
            <option value="g">Verde</option>
            <option value="b">Azul</option>
            <option value="a">Alfa</option>
          </select>
        </label>
        <button
          disabled={!a.image}
          onClick={() =>
            setResult(
              a.image
                ? (imagePayload(a.image.data, lsbChannels, bit) ??
                    "No se encontró una trama de texto en esta secuencia de bits.")
                : "",
            )
          }
        >
          Extraer secuencia LSB
        </button>
      </div>
      <AnalysisResult value={result} />
      <details>
        <summary>Metadatos y estructura</summary>
        {metadata.length ? (
          <dl>
            {metadata.map((row, i) => (
              <div key={i}>
                <dt>{row.name}</dt>
                <dd>
                  <pre>{row.value}</pre>
                  <CopyButton text={row.value} label={`Copiar ${row.name}`} />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>No se encontraron comentarios o bloques PNG compatibles.</p>
        )}
      </details>
      {svg.length > 0 && (
        <details>
          <summary>Capas de texto SVG</summary>
          {svg.map((row, i) => (
            <div className="media-svg-layer" key={i}>
              <small>
                Color {row.fill} · opacidad {row.opacity}
              </small>
              <pre>{row.text}</pre>
              <CopyButton text={row.text} label="Copiar texto de capa" />
            </div>
          ))}
        </details>
      )}
      <details>
        <summary>Ayuda de la herramienta</summary>
        <p>
          Original muestra los píxeles preservados. Un plano representa cada bit
          del canal elegido en blanco o negro. XOR combina los canales RGB de
          dos imágenes del mismo tamaño. La extracción recorre los píxeles de
          izquierda a derecha, con el bit mayor primero al formar bytes;
          reconoce tramas STEG. Leer QR analiza únicamente la vista dibujada.
        </p>
      </details>
    </section>
  );
}
