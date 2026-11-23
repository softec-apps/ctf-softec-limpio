import { useState } from "react";
import VirtualFilePicker from "../web-lab/toolkit/VirtualFilePicker";
export default function EvidenceFileControl({
  label,
  name,
  loading,
  onOpen,
}: {
  label: string;
  name?: string;
  loading: boolean;
  onOpen: (path: string) => Promise<void>;
}) {
  const [browsing, setBrowsing] = useState(false);
  const choose = (path: string) => {
    setBrowsing(false);
    void onOpen(path);
  };
  return (
    <div className="media-file-control">
      <div>
        <button disabled={loading} onClick={() => setBrowsing(true)}>
          {label}
        </button>
        <span>
          {loading ? "Abriendo…" : (name ?? "Ningún archivo abierto")}
        </span>
      </div>
      {browsing && (
        <section className="media-file-picker">
          <button
            className="media-picker-close"
            onClick={() => setBrowsing(false)}
          >
            Cancelar
          </button>
          <VirtualFilePicker
            onOpen={(path) => choose(path)}
            onBinaryOpen={choose}
          />
        </section>
      )}
    </div>
  );
}
