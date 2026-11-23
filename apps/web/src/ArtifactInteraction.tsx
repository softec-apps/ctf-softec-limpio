import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Folder,
  Monitor,
  X,
} from "lucide-react";
import { api, ApiError } from "./api";
import type { SceneObject } from "./sceneCatalog";
import type {
  ArtifactDocument,
  ArtifactPick,
  DocumentMetadata,
} from "./artifactTypes";
import "./artifacts.css";

type Props = {
  object: SceneObject;
  drawer: number | null;
  pick?: ArtifactPick;
  onDrawer: (drawer: number) => void;
  onDocument: (document: ArtifactDocument) => void;
  onClosePaper: () => void;
  onComputer: () => void;
  onInvestigate: (id: string) => void;
};
export default function ArtifactInteraction({
  object,
  drawer,
  pick,
  onDrawer,
  onDocument,
  onClosePaper,
  onComputer,
  onInvestigate,
}: Props) {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [spread, setSpread] = useState(0);
  const [reading, setReading] = useState<ArtifactDocument[]>([]);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const objectRef = useRef(object.id);
  objectRef.current = object.id;
  const request = useRef(0);
  const spreadRef = useRef(0);
  async function read(ids: string[], page?: number) {
    const sequence = ++request.current;
    setBusy(true);
    setError("");
    try {
      const result = await Promise.all(
        ids.map((id) =>
          api<ArtifactDocument>(
            `/scene/objects/${encodeURIComponent(object.id)}/documents/${encodeURIComponent(id)}`,
          ),
        ),
      );
      if (sequence !== request.current || objectRef.current !== object.id)
        return;
      setReading(result);
      result.forEach(onDocument);
      if (page !== undefined) {
        setSpread(page);
        spreadRef.current = page;
      }
    } catch (e) {
      if (sequence === request.current)
        setError(
          e instanceof Error ? e.message : "No se pudo leer el documento.",
        );
    } finally {
      if (sequence === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    setDocuments([]);
    setReading([]);
    setSpread(0);
    spreadRef.current = 0;
    setError("");
    setAuth(false);
    setBusy(true);
    void api<{ documents: DocumentMetadata[] }>(
      `/scene/objects/${encodeURIComponent(object.id)}`,
    )
      .then((r) => {
        if (!active) return;
        setDocuments(r.documents);
        if (object.id === "notebook")
          void read(
            r.documents.slice(0, 2).map((d) => d.id),
            0,
          );
        else setBusy(false);
      })
      .catch((e) => {
        if (!active) return;
        setBusy(false);
        setAuth(e instanceof ApiError && e.status === 401);
        setError(
          e instanceof ApiError && e.status === 401
            ? "Inicia sesión para investigar."
            : e instanceof Error
              ? e.message
              : "No se pudo examinar el objeto.",
        );
      });
    return () => {
      active = false;
      request.current++;
      onClosePaper();
    };
  }, [object.id]);
  function turn(direction: number) {
    if (busy) return;
    const next = Math.max(
      0,
      Math.min(
        Math.ceil(documents.length / 2) - 1,
        spreadRef.current + direction,
      ),
    );
    if (next !== spreadRef.current)
      void read(
        documents.slice(next * 2, next * 2 + 2).map((d) => d.id),
        next,
      );
  }
  useEffect(() => {
    if (!pick || !documents.length) return;
    if (pick.turn) {
      turn(pick.turn);
      return;
    }
    const doc = pick.documentId
      ? documents.find((d) => d.id === pick.documentId)
      : documents.find(
          (d) => d.drawer === pick.drawer && d.folder === pick.folder,
        );
    if (doc && (object.id !== "archive" || drawer === doc.drawer))
      void read([doc.id]);
  }, [pick?.sequence]);
  useEffect(() => {
    if (object.id === "archive") {
      setReading([]);
      onClosePaper();
    }
  }, [drawer]);
  if (!["notebook", "archive", "noticeboard"].includes(object.id)) return null;
  return (
    <>
      <div
        className="artifact-actions"
        role="group"
        aria-label={`Manipular ${object.name}`}
      >
        {error ? (
          <>
            <span className="artifact-status" role="alert">
              {error}
            </span>
            {auth && (
              <button onClick={onComputer}>
                <Monitor size={15} />
                Ir al equipo
              </button>
            )}
          </>
        ) : object.id === "notebook" ? (
          <>
            <button
              aria-label="Página anterior"
              onClick={() => turn(-1)}
              disabled={busy || spread === 0}
            >
              <ArrowLeft size={16} />
            </button>
            <span className="artifact-page-number">
              <BookOpen size={15} />
              {busy
                ? "…"
                : `${spread * 2 + 1} — ${Math.min(documents.length, spread * 2 + 2)}`}
            </span>
            <button
              aria-label="Pasar página"
              onClick={() => turn(1)}
              disabled={busy || (spread + 1) * 2 >= documents.length}
            >
              <ArrowRight size={16} />
            </button>
          </>
        ) : object.id === "archive" ? (
          reading.length ? (
            <>
              <span>Hoja del expediente</span>
              {reading[0]?.challengeId && (
                <button onClick={() => onInvestigate(reading[0].challengeId!)}>
                  <Monitor size={15} />
                  Abrir evidencias en el PC
                </button>
              )}
              <button
                onClick={() => {
                  setReading([]);
                  onClosePaper();
                }}
              >
                <X size={15} />
                Guardar hoja
              </button>
            </>
          ) : (
            <>
              {["Superior", "Central", "Inferior"].map((name, index) => (
                <button
                  key={name}
                  aria-pressed={drawer === index}
                  onClick={() => onDrawer(index)}
                >
                  {drawer === index ? "Cerrar" : "Abrir"} {name.toLowerCase()}
                </button>
              ))}
              {drawer !== null && (
                <div className="artifact-folder-actions">
                  {documents
                    .filter((d) => d.drawer === drawer)
                    .map((d) => (
                      <button
                        key={d.id}
                        onClick={() => void read([d.id])}
                        disabled={busy}
                      >
                        <Folder size={14} />
                        {d.title}
                      </button>
                    ))}
                </div>
              )}
            </>
          )
        ) : reading.length ? (
          <>
            <span>Nota retirada</span>
            <button
              onClick={() => {
                setReading([]);
                onClosePaper();
              }}
            >
              <X size={15} />
              Devolver nota
            </button>
          </>
        ) : (
          <div className="artifact-note-actions">
            {documents.map((d, i) => (
              <button
                key={d.id}
                onClick={() => void read([d.id])}
                disabled={busy}
                aria-label={`Examinar nota ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className={`artifact-accessible-text${reading[0]?.challengeId ? " artifact-case-text" : ""}`}
        aria-live="polite"
      >
        {reading.map((d) => (
          <article key={d.id}>
            <h2>{d.title}</h2>
            <p>{d.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}
