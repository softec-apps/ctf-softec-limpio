import { useEffect, useState } from "react";
import { api, post, type Game, type Challenge } from "../api";
import CopyButton from "../web-lab/toolkit/CopyButton";
import "./service-console.css";
type Reply = { body: string; form?: { fields: { value?: string }[] } };
export default function ServiceConsole({
  kind,
  challengeId,
}: {
  kind: "sql" | "contracts";
  challengeId?: string;
}) {
  const prefix = kind === "sql" ? "database-" : "contract-",
    title = kind === "sql" ? "Consola SQL" : "Banco de contratos";
  const [cases, setCases] = useState<Challenge[]>([]),
    [selected, setSelected] = useState(""),
    [input, setInput] = useState(""),
    [output, setOutput] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<Game>("/game")
      .then((game) => {
        if (!active) return;
        const entries = game.challenges.filter((c) => c.id.startsWith(prefix));
        setCases(entries);
        setSelected(
          entries.find((c) => c.id === challengeId)?.id ?? entries[0]?.id ?? "",
        );
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [prefix, challengeId]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    setOutput("");
    setError("");
    setInput("");
    post(`/challenges/${selected}/web`, { url: "/" })
      .then((reply: Reply) => {
        if (!active) return;
        const value = reply.form?.fields[0]?.value ?? "{}";
        setInput(
          kind === "sql"
            ? String(JSON.parse(value).query ?? "")
            : JSON.stringify(JSON.parse(value), null, 2),
        );
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [selected, kind]);
  async function run() {
    setBusy(true);
    setError("");
    setOutput("");
    try {
      const payload = kind === "sql" ? { query: input } : JSON.parse(input);
      const reply: Reply = await post(`/challenges/${selected}/web`, {
        url: "/operate?payload=" + encodeURIComponent(JSON.stringify(payload)),
      });
      setOutput(reply.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo ejecutar.");
    } finally {
      setBusy(false);
    }
  }
  const proof = output.match(/CTF\{[a-f0-9]{32}\}/)?.[0];
  return (
    <section className="service-console" aria-label={title}>
      <h2>{title}</h2>
      <label>
        Expediente
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={busy}
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <p>{cases.find((c) => c.id === selected)?.description}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label>
          {kind === "sql" ? "Consulta SQL" : "Operación JSON"}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={kind === "sql" ? 800 : 2200}
            spellCheck={false}
          />
        </label>
        <nav aria-label="Acciones de consola">
          <button disabled={busy || !selected || !input}>
            {busy ? "Ejecutando…" : "Ejecutar"}
          </button>
          <CopyButton text={input} label="Copiar entrada" />
        </nav>
      </form>
      {error && <p role="alert">{error}</p>}
      <pre aria-label="Resultado">
        {output || "Los resultados aparecerán aquí."}
      </pre>
      {output && <CopyButton text={output} label="Copiar resultado" />}
      {proof && <CopyButton text={proof} label="Copiar comprobante" />}
      <p className="service-console-hint">
        Consulta schema.sql, contract.sol y state.json en Archivos → servicios.
        Las operaciones se reinician en cada ejecución.
      </p>
    </section>
  );
}
