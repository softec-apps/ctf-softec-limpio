import { useEffect, useState } from "react";
import { Check, FileText, Mail, Monitor, X } from "lucide-react";
import { api, ApiError, type Challenge, type Game } from "./api";
import ChallengeSubmission from "./challenges/ChallengeSubmission";
import type {
  ArtifactDocument,
  ArtifactPick,
  DocumentMetadata,
} from "./artifactTypes";
import "./osint-board.css";

type Props = {
  pick?: ArtifactPick;
  onInvestigate: (id: string) => void;
  onComputer: () => void;
  onProgress: (solved: string[], available: string[]) => void;
};

export default function OsintInvestigationBoard({
  pick,
  onInvestigate,
  onComputer,
  onProgress,
}: Props) {
  const [cases, setCases] = useState<Challenge[]>([]);
  const [solved, setSolved] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selected, setSelected] = useState<string>();
  const [document, setDocument] = useState<ArtifactDocument>();
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      api<Game>("/game", { signal: controller.signal }),
      api<{ documents: DocumentMetadata[] }>("/scene/objects/osint-board", {
        signal: controller.signal,
      }),
    ])
      .then(([game, board]) => {
        if (controller.signal.aborted) return;
        const available = game.challenges.filter((entry) =>
          board.documents.some((doc) => doc.id === entry.id),
        );
        const completed = game.solves.map((entry) => entry.challengeId);
        setCases(available);
        setDocuments(board.documents);
        setSolved(completed);
        onProgress(
          completed,
          available.map((entry) => entry.id),
        );
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setAuth(failure instanceof ApiError && failure.status === 401);
        setError(
          failure instanceof Error
            ? failure.message
            : "No se pudo abrir el panel.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [onProgress]);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      void api<Game>("/game", { signal: controller.signal })
        .then((game) => {
          if (controller.signal.aborted) return;
          const completed = game.solves.map((entry) => entry.challengeId);
          setSolved(completed);
          setProgressError("");
          onProgress(
            completed,
            cases.map((entry) => entry.id),
          );
        })
        .catch((failure) => {
          if (!controller.signal.aborted)
            setProgressError(
              failure instanceof Error
                ? failure.message
                : "No se pudo actualizar el progreso del panel.",
            );
        });
    };
    window.addEventListener("ctf-progress-changed", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("ctf-progress-changed", refresh);
    };
  }, [cases, onProgress]);
  useEffect(() => {
    if (pick?.documentId && cases.some((entry) => entry.id === pick.documentId))
      setSelected(pick.documentId);
  }, [pick?.sequence, cases]);
  useEffect(() => {
    if (!selected) {
      setDocument(undefined);
      return;
    }
    const controller = new AbortController();
    setReading(true);
    setDocument(undefined);
    setError("");
    void api<ArtifactDocument>(
      `/scene/objects/osint-board/documents/${selected}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setDocument(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo leer el expediente.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReading(false);
      });
    return () => controller.abort();
  }, [selected]);
  return (
    <section
      className="osint-investigation-board"
      aria-label="Panel de investigaciones OSINT"
    >
      {progressError && (
        <p className="osint-board-error" role="alert">
          {progressError}
          <button
            onClick={() =>
              window.dispatchEvent(new Event("ctf-progress-changed"))
            }
          >
            Reintentar actualización
          </button>
        </p>
      )}
      {selected ? (
        <article className="osint-case-paper" aria-busy={reading}>
          <button
            className="osint-paper-close"
            aria-label="Guardar expediente"
            onClick={() => setSelected(undefined)}
          >
            <X size={18} />
          </button>
          {reading ? (
            <p role="status">Abriendo el sobre…</p>
          ) : document ? (
            <>
              <span className="osint-paper-label">
                Archivo de Puerto Lumbre · {selected.slice(-2)}
              </span>
              <h1>{document.title}</h1>
              <div className="osint-paper-content">{document.body}</div>
              <button
                className="osint-investigate"
                onClick={() => onInvestigate(document.id)}
              >
                <Monitor size={17} />
                Investigar en el computador
              </button>
              <ChallengeSubmission
                key={document.id}
                challengeId={document.id}
                title={document.title}
                noun="expediente"
              />
            </>
          ) : null}
          {error && <p role="alert">{error}</p>}
        </article>
      ) : (
        <>
          <header>
            <span>Puerto Lumbre / Archivo de investigaciones</span>
            <h1>Diez sobres, diez historias</h1>
            <p>
              Selecciona un sobre para examinar el recorte que inició el
              expediente.
            </p>
          </header>
          {error && (
            <p className="osint-board-error" role="alert">
              {auth
                ? "Inicia sesión en el computador para abrir los expedientes."
                : error}
              {auth && (
                <button onClick={onComputer}>
                  <Monitor size={16} />
                  Ir al computador
                </button>
              )}
            </p>
          )}
          {loading ? (
            <p role="status">Revisando el archivo…</p>
          ) : (
            !error &&
            [0, 1].map((group) => (
              <section
                className="osint-envelope-group"
                key={group}
                aria-label={`Sobres ${group * 5 + 1} a ${group * 5 + 5}`}
              >
                {documents
                  .filter(
                    (entry) =>
                      Math.floor((Number(entry.id.slice(-2)) - 1) / 5) ===
                      group,
                  )
                  .map((entry) => {
                    const challenge = cases.find(
                      (item) => item.id === entry.id,
                    );
                    if (!challenge) return null;
                    const complete = solved.includes(entry.id);
                    return (
                      <button
                        className={`osint-envelope${complete ? " is-solved" : ""}`}
                        key={entry.id}
                        onClick={() => setSelected(entry.id)}
                        aria-label={`Abrir expediente ${entry.id.slice(-2)}: ${entry.title}${complete ? ", resuelto" : ""}`}
                      >
                        <Mail size={23} />
                        <span className="osint-envelope-number">
                          {entry.id.slice(-2)}
                        </span>
                        <strong>{entry.title}</strong>
                        <span className="osint-envelope-seal">
                          {complete ? (
                            <>
                              <Check size={13} />
                              Resuelto
                            </>
                          ) : (
                            <>
                              <FileText size={13} />
                              Por investigar
                            </>
                          )}
                        </span>
                      </button>
                    );
                  })}
              </section>
            ))
          )}
        </>
      )}
    </section>
  );
}
