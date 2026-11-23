import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, BookOpen, Monitor } from "lucide-react";
import { api, ApiError } from "../api";
import type {
  ArtifactDocument,
  ArtifactPick,
  DocumentMetadata,
} from "../artifactTypes";
import "./reference-library.css";

type Page = { title: string; body: string };
export default function ReferenceLibrary({
  pick,
  onComputer,
  onCrypto,
}: {
  pick?: ArtifactPick;
  onComputer: () => void;
  onCrypto: () => void;
}) {
  const [books, setBooks] = useState<DocumentMetadata[]>([]);
  const [selected, setSelected] = useState<string>();
  const [book, setBook] = useState<ArtifactDocument>();
  const [spread, setSpread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState(false);
  const paper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ documents: DocumentMetadata[] }>("/scene/objects/library", {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setBooks(result.documents);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setAuth(failure instanceof ApiError && failure.status === 401);
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo abrir la biblioteca.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (pick?.documentId && books.some((entry) => entry.id === pick.documentId))
      setSelected(pick.documentId);
  }, [pick?.sequence, books]);
  useEffect(() => {
    setBook(undefined);
    setSpread(0);
    if (!selected) {
      setReading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    setReading(true);
    setError("");
    void api<ArtifactDocument>(`/scene/objects/library/documents/${selected}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setBook(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo leer el tomo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReading(false);
      });
    return () => controller.abort();
  }, [selected]);
  const pages: Page[] =
    book?.body.split("\n\n§\n\n").map((text) => {
      const breakAt = text.indexOf("\n");
      return { title: text.slice(0, breakAt), body: text.slice(breakAt + 1) };
    }) ?? [];
  const lastSpread = Math.max(0, Math.ceil(pages.length / 2) - 1);
  function turn(direction: number) {
    if (reading || window.getSelection()?.toString()) return;
    setSpread((current) =>
      Math.max(0, Math.min(lastSpread, current + direction)),
    );
  }
  function pageKey(event: KeyboardEvent<HTMLElement>, direction: number) {
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
    if (paper.current) paper.current.scrollTop = 0;
  }, [spread, book?.id]);
  return (
    <section
      className={`reference-library${selected ? " is-reading" : ""}`}
      aria-label="Biblioteca técnica"
    >
      {selected && (
        <button
          className="reference-return"
          onClick={() => setSelected(undefined)}
        >
          <ArrowLeft size={15} />
          Guardar tomo
        </button>
      )}
      {error ? (
        <div className="reference-message" role="alert">
          {auth
            ? "Inicia sesión en el computador para consultar los libros."
            : error}
          {auth && (
            <button onClick={onComputer}>
              <Monitor size={16} />
              Ir al computador
            </button>
          )}
        </div>
      ) : loading || reading ? (
        <p className="reference-message" role="status">
          Abriendo el libro…
        </p>
      ) : selected && book ? (
        <div className="reference-spread" ref={paper}>
          {[0, 1].map((side) => {
            const page = pages[spread * 2 + side];
            const direction = side === 0 ? -1 : 1;
            return (
              <article
                className="reference-page"
                key={side}
                role="button"
                tabIndex={0}
                aria-label={
                  side === 0
                    ? "Hoja izquierda: página anterior"
                    : "Hoja derecha: página siguiente"
                }
                aria-disabled={
                  side === 0 ? spread === 0 : spread === lastSpread
                }
                onClick={() => turn(direction)}
                onKeyDown={(event) => pageKey(event, direction)}
              >
                <span>{book.title}</span>
                <h1>{page?.title}</h1>
                {page?.body.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
                <small>{spread * 2 + side + 1}</small>
              </article>
            );
          })}
        </div>
      ) : (
        <>
          <header>
            <BookOpen size={25} />
            <h1>Biblioteca técnica</h1>
            <p>
              Un libro por categoría, con varias páginas de teoría y
              herramientas. Relatos en clave se consulta por separado en la
              repisa.
            </p>
          </header>
          <button className="reference-narrative" onClick={onCrypto}>
            <BookOpen size={22} aria-hidden="true" />
            <span>
              <strong>Relatos en clave</strong>
              <small>El libro de historias de los retos de criptografía</small>
            </span>
          </button>
          <div className="reference-volumes">
            {books.map((entry) => (
              <button key={entry.id} onClick={() => setSelected(entry.id)}>
                <span>
                  {entry.category} · {entry.pageCount} páginas de teoría
                </span>
                <strong>{entry.title}</strong>
                <BookOpen size={19} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
