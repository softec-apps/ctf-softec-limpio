import { useEffect, useRef, useState } from "react";
import { Monitor } from "lucide-react";
import { api, ApiError } from "./api";
import type { ArtifactDocument, DocumentMetadata } from "./artifactTypes";
import "./crypto-storybook.css";
import StorybookSubmission from "./StorybookSubmission";

export default function CryptoStorybook({
  onComputer,
}: {
  onComputer: () => void;
}) {
  const spread = useRef<HTMLDivElement>(null);
  const [chapters, setChapters] = useState<DocumentMetadata[]>([]);
  const [index, setIndex] = useState(0);
  const [chapter, setChapter] = useState<ArtifactDocument>();
  const [error, setError] = useState("");
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ documents: DocumentMetadata[] }>("/scene/objects/crypto-book", {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setChapters(result.documents);
          setBusy(false);
        }
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setAuth(failure instanceof ApiError && failure.status === 401);
        setError(
          failure instanceof Error
            ? failure.message
            : "No se pudo abrir el libro.",
        );
        setBusy(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!chapters[index]) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    void api<ArtifactDocument>(
      `/scene/objects/crypto-book/documents/${chapters[index].id}`,
      { signal: controller.signal },
    )
      .then((document) => {
        if (!controller.signal.aborted) setChapter(document);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo leer el capítulo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [chapters, index]);
  function turn(direction: number) {
    if (busy || submitting || (window.getSelection()?.toString() ?? "").length)
      return;
    setIndex((current) =>
      Math.max(0, Math.min(chapters.length - 1, current + direction)),
    );
  }
  function pageKey(event: React.KeyboardEvent<HTMLElement>, direction: number) {
    if (["Enter", " ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      turn(
        event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowRight"
            ? 1
            : direction,
      );
    }
  }
  useEffect(() => {
    if (spread.current) spread.current.scrollTop = 0;
  }, [chapter?.id]);
  const [story, evidence] =
    chapter?.body.split("\n\nEntre las hojas\n\n") ?? [];
  return (
    <section
      className="crypto-storybook"
      aria-label="Libro Relatos en clave"
      aria-busy={busy || submitting}
    >
      {error ? (
        <div className="storybook-message" role="alert">
          {auth ? "Inicia sesión en el computador para leer el libro." : error}
          {auth && (
            <button onClick={onComputer}>
              <Monitor size={16} />
              Ir al computador
            </button>
          )}
        </div>
      ) : busy && !chapter ? (
        <p className="storybook-message" role="status">
          Abriendo las páginas…
        </p>
      ) : chapter ? (
        <div className="storybook-spread" ref={spread}>
          <article
            className="storybook-page storybook-narrative"
            role="button"
            tabIndex={0}
            aria-label="Hoja izquierda: volver al relato anterior"
            aria-disabled={busy || submitting || index === 0}
            onClick={() => turn(-1)}
            onKeyDown={(event) => pageKey(event, -1)}
          >
            <span>Relato {index + 1}</span>
            <h1>{chapter.title}</h1>
            {story?.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
            <small>Relatos en clave · {index * 2 + 1}</small>
          </article>
          <article
            className="storybook-page storybook-evidence"
            role="button"
            tabIndex={0}
            aria-label="Hoja derecha: pasar al siguiente relato"
            aria-disabled={busy || submitting || index === chapters.length - 1}
            onClick={() => turn(1)}
            onKeyDown={(event) => pageKey(event, 1)}
          >
            <span>La hoja entre las páginas</span>
            <h2>Entre las hojas</h2>
            <div>{evidence}</div>

            <small>Relatos en clave · {index * 2 + 2}</small>
          </article>
        </div>
      ) : (
        <p className="storybook-message">No hay capítulos disponibles.</p>
      )}
      {chapter && !error && (
        <StorybookSubmission
          key={chapter.id}
          challengeId={chapter.id}
          title={chapter.title}
          disabled={busy}
          onBusy={setSubmitting}
        />
      )}
    </section>
  );
}
