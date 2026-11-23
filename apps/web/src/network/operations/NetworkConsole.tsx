import CopyButton from "../../web-lab/toolkit/CopyButton";
import { useEffect, useRef, useState } from "react";
import type {
  ConsoleContext,
  DeviceId,
  LabSnapshot,
} from "../../../../../packages/network-contracts";
export default function NetworkConsole({
  lab,
  device,
  context,
  busy,
  onCommand,
}: {
  lab: LabSnapshot;
  device: DeviceId;
  context: ConsoleContext;
  busy: boolean;
  onCommand: (command: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [position, setPosition] = useState(-1);
  const end = useRef<HTMLDivElement>(null);
  const lines = lab.state.journal.filter((entry) => entry.device === device);
  const name = lab.devices.find((d) => d.id === device)!.name;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [lines.length, lab.revision]);
  const prompt = `${name}${context.mode === "interface" ? "(config-if)" : context.mode === "config" ? "(config)" : ""}${context.mode === "user" ? ">" : "#"}`;
  return (
    <div className="nos-console">
      <header>
        <span className="nos-console-indicator" />
        Consola serial · {name}
        <span>Seventech NOS</span>
        <CopyButton
          label="Copiar salida"
          text={lines
            .map(
              (entry) =>
                `${entry.prompt || name + "#"} ${entry.command}\n${entry.output}`,
            )
            .join("\n\n")}
        />
      </header>
      <div
        className="nos-console-scroll"
        role="log"
        aria-label={`Salida de consola ${name}`}
      >
        <p>
          Seventech NOS / consola del dispositivo
          <br />
          Escribe help para consultar las órdenes disponibles.
        </p>
        {lines.map((entry, i) => (
          <div key={i}>
            <p className="nos-command-echo">
              {entry.prompt || name + "#"} {entry.command}
            </p>
            <pre>{entry.output}</pre>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          const command = input;
          setHistory((h) => [command, ...h].slice(0, 50));
          setInput("");
          setPosition(-1);
          await onCommand(command);
        }}
      >
        <label htmlFor={`nos-command-${device}`}>{prompt}</label>
        <input
          id={`nos-command-${device}`}
          aria-label={`Comando ${name}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const next = Math.min(history.length - 1, position + 1);
              if (next >= 0) {
                setPosition(next);
                setInput(history[next]);
              }
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = position - 1;
              setPosition(Math.max(-1, next));
              setInput(next < 0 ? "" : history[next]);
            }
          }}
          autoComplete="off"
          spellCheck={false}
          maxLength={240}
          disabled={busy}
        />
        <button disabled={busy || !input.trim()}>
          {busy ? "…" : "Ejecutar"}
        </button>
      </form>
    </div>
  );
}
