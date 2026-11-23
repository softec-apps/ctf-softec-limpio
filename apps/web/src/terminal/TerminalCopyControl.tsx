import { useCallback, useEffect, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import "./terminal-clipboard.css";
export default function TerminalCopyControl({
  terminal,
}: {
  terminal: Terminal | null;
}) {
  const [selection, setSelection] = useState("");
  const [message, setMessage] = useState("");
  const copy = useCallback(async () => {
    const text = terminal?.getSelection() ?? "";
    if (!text) {
      setMessage("Selecciona el texto de la terminal.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copiado al portapapeles.");
    } catch {
      setMessage(
        "No se pudo acceder al portapapeles. Permite la copia en el navegador.",
      );
    }
  }, [terminal]);
  useEffect(() => {
    setSelection(terminal?.getSelection() ?? "");
    setMessage("");
    if (!terminal?.element) return;
    const element = terminal.element;
    const listener = terminal.onSelectionChange(() => {
      setSelection(terminal.getSelection());
      setMessage("");
    });
    const keyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "c" &&
        (terminal.hasSelection() || event.shiftKey || event.metaKey)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void copy();
      }
    };
    element.addEventListener("keydown", keyDown, true);
    return () => {
      listener.dispose();
      element.removeEventListener("keydown", keyDown, true);
    };
  }, [terminal, copy]);
  return (
    <span className="terminal-copy-control">
      <button
        type="button"
        disabled={!selection}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          void copy();
        }}
        aria-label="Copiar selección de la terminal"
        title="Selecciona texto; Ctrl+C o Ctrl+Mayús+C para copiar"
      >
        Copiar selección
      </button>
      <span role="status">{message}</span>
    </span>
  );
}
