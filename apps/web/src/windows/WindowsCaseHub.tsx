import FlagInput from "../challenges/FlagInput";
import { completeFlag } from "../challenges/flag-format";
import { useState } from "react";
import { Check, TerminalSquare } from "lucide-react";
import { post } from "../api";
import type { LabSession } from "../useLabSession";
export default function WindowsCaseHub({
  session,
  onTerminal,
}: {
  session: LabSession;
  onTerminal: (challengeId: string) => void;
}) {
  const [selected, setSelected] = useState<string>();
  const [flag, setFlag] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const cases =
    session.game?.challenges.filter((entry) => entry.device === "laptop") ?? [];
  const challenge = cases.find((entry) => entry.id === selected);
  const solved = new Set(
    session.game?.solves.map((entry) => entry.challengeId),
  );
  const pages = Math.max(1, Math.ceil(cases.length / 5));
  const current = Math.min(page, pages);
  return (
    <div className="win-case-hub">
      <header>
        <h1>Laboratorio Windows</h1>
        <span>
          {cases.filter((entry) => solved.has(entry.id)).length} /{" "}
          {cases.length} resueltos
        </span>
      </header>
      {challenge ? (
        <section className="win-case-detail">
          <button
            onClick={() => {
              setSelected(undefined);
              setNotice("");
            }}
          >
            ← Todos los expedientes
          </button>
          <h2>{challenge.title}</h2>
          <p>{challenge.description}</p>
          <p>
            {challenge.points} puntos{" "}
            {solved.has(challenge.id) ? "· Resuelto" : ""}
          </p>
          <button
            className="win-lab-primary"
            onClick={() => onTerminal(challenge.id)}
          >
            <TerminalSquare size={17} aria-hidden="true" />
            Abrir terminal Windows
          </button>
          <p>
            Opera el equipo indicado desde la terminal del portátil o desde
            Linux con Seventech VPN. La entrega comprueba también la operación
            realizada en tu entorno.
          </p>
          {solved.has(challenge.id) ? (
            <p role="status">
              <Check size={17} aria-hidden="true" /> Este reto ya está resuelto.
            </p>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy || !flag.trim()) return;
                setBusy(true);
                setNotice("");
                try {
                  const result = await post(
                    `/challenges/${challenge.id}/submissions`,
                    { flag: completeFlag(flag) },
                  );
                  setNotice(result.message);
                  if (result.correct) {
                    setFlag("");
                    await session.refresh();
                    window.dispatchEvent(new Event("ctf-progress-changed"));
                  }
                } catch (failure) {
                  setNotice(
                    failure instanceof Error
                      ? failure.message
                      : "No se pudo validar la respuesta.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Entregar respuesta
                <FlagInput value={flag} onChange={setFlag} disabled={busy} />
              </label>
              <button
                disabled={
                  busy || !flag.trim() || session.user?.role !== "PARTICIPANT"
                }
              >
                {busy ? "Validando…" : "Validar respuesta"}
              </button>
            </form>
          )}
          {notice && <p role="status">{notice}</p>}
        </section>
      ) : (
        <>
          <div className="win-case-list">
            {cases.slice((current - 1) * 5, current * 5).map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  setSelected(entry.id);
                  setFlag("");
                  setNotice("");
                }}
              >
                <span>{entry.title}</span>
                <small>{entry.points} puntos</small>
                {solved.has(entry.id) && (
                  <Check size={17} aria-label="Resuelto" />
                )}
              </button>
            ))}
          </div>
          <nav aria-label="Paginación de expedientes Windows">
            <button
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </button>
            <span>
              Página {current} de {pages}
            </span>
            <button
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Siguiente
            </button>
          </nav>
          {cases.length === 0 && <p>No hay expedientes publicados.</p>}
        </>
      )}
    </div>
  );
}
