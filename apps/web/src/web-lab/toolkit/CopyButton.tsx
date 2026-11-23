import { useState } from "react";
import { Check, Copy } from "lucide-react";
export default function CopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [result, setResult] = useState<{
    text: string;
    copied: boolean;
  } | null>(null);
  const current = result?.text === text ? result : null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setResult({ text, copied: true });
    } catch {
      setResult({ text, copied: false });
    }
  }
  return (
    <span className="kit-copy-control">
      <button
        type="button"
        aria-label={label}
        disabled={!text}
        onClick={() => {
          void copy();
        }}
      >
        {current?.copied ? <Check size={15} /> : <Copy size={15} />}
        {current?.copied ? "Copiado" : label}
      </button>
      <span className="kit-copy-status" role="status">
        {current
          ? current.copied
            ? "Copiado al portapapeles."
            : "No se pudo copiar. Selecciona y copia el texto manualmente."
          : ""}
      </span>
    </span>
  );
}
