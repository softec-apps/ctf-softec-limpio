import { useState } from "react";
import { Info, ScanLine, ZoomIn, ZoomOut } from "lucide-react";
export type MobileImage = {
  name: string;
  title?: string;
  mediaUrl: string;
  mediaType: string;
  captured?: string;
};
export default function MobilePhotoViewer({ file }: { file: MobileImage }) {
  const [zoom, setZoom] = useState(1);
  const [info, setInfo] = useState<Record<string, unknown>>();
  const [decoded, setDecoded] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function inspect() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(file.mediaUrl, {
        credentials: "same-origin",
      });
      if (!response.ok) throw Error("No se pudo leer el archivo de imagen.");
      const bytes = await response.arrayBuffer();
      if (file.mediaType === "image/jpeg") {
        const { parse } = await import("exifr");
        const tags = await parse(bytes, { reviveValues: false });
        setInfo({
          Archivo: file.name,
          Tamaño: `${bytes.byteLength.toLocaleString("es")} bytes`,
          Formato: "JPEG",
          Cámara: tags?.Model ?? "No disponible",
          Fabricante: tags?.Make ?? "No disponible",
          "Fecha de captura (EXIF)": tags?.DateTimeOriginal ?? "No disponible",
          Software: tags?.Software ?? "No disponible",
          Descripción: tags?.ImageDescription ?? "—",
        });
      } else {
        const { default: jsQR } = await import("jsqr");
        const blob = new Blob([bytes], { type: file.mediaType });
        const url = URL.createObjectURL(blob);
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d")!;
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const result = jsQR(pixels.data, canvas.width, canvas.height);
          if (!result) throw Error("No se encontró un código legible.");
          setDecoded(result.data);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo examinar la imagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mobile-photo-viewer">
      <div
        className="mobile-photo-stage"
        onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
      >
        <img
          src={file.mediaUrl}
          alt={file.title || file.name}
          style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
          onError={() =>
            setError("La imagen no está disponible. Vuelve a abrir el álbum.")
          }
        />
      </div>
      <div className="mobile-photo-caption">
        <strong>{file.title || file.name}</strong>
        <small>{file.name}</small>
      </div>
      <div className="mobile-photo-actions">
        <button
          aria-label="Alejar imagen"
          disabled={zoom === 1}
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
        >
          <ZoomOut size={20} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Acercar imagen"
          disabled={zoom === 3}
          onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
        >
          <ZoomIn size={20} />
        </button>
        <button disabled={busy} onClick={() => void inspect()}>
          {file.mediaType === "image/jpeg" ? (
            <Info size={19} />
          ) : (
            <ScanLine size={19} />
          )}{" "}
          {busy
            ? "Leyendo…"
            : file.mediaType === "image/jpeg"
              ? "Información EXIF"
              : "Leer código QR"}
        </button>
      </div>
      {info && (
        <section
          className="mobile-photo-metadata"
          aria-label="Metadatos del archivo"
        >
          <h2>Información del archivo</h2>
          <dl>
            {Object.entries(info).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {decoded && (
        <section className="mobile-qr-result" aria-label="Contenido del QR">
          <h2>Contenido del código</h2>
          <p>{decoded}</p>
          <small>Destino leído de la imagen. No se ha abierto el enlace.</small>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
