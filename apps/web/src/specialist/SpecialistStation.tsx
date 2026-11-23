import { useEffect, useState } from "react";
import { Monitor, ArrowLeft, Folder, Check } from "lucide-react";
import { SPECIALIST_STATIONS } from "../../../../packages/specialist-contracts";
import { api } from "../api";
import type { ArtifactDocument, DocumentMetadata } from "../artifactTypes";
import "./station.css";
export default function SpecialistStation({
  id,
  onInvestigate,
  onComputer,
  onClose,
}: {
  id: string;
  onInvestigate: (id: string) => void;
  onComputer: () => void;
  onClose: () => void;
}) {
  const station = SPECIALIST_STATIONS.find((entry) => entry.id === id)!;
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]),
    [reading, setReading] = useState<ArtifactDocument>(),
    [solved, setSolved] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setReading(undefined);
    void Promise.all([
      api<{ documents: DocumentMetadata[] }>(
        `/scene/objects/${encodeURIComponent(id)}`,
      ),
      api<{ solves: { challengeId: string }[] }>("/game"),
    ])
      .then(([list, game]) => {
        if (active) {
          setDocuments(list.documents);
          setSolved(game.solves.map((s) => s.challengeId));
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron abrir los expedientes.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function read(documentId: string) {
    setBusy(true);
    setError("");
    try {
      setReading(
        await api<ArtifactDocument>(
          `/scene/objects/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo leer el expediente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="specialist-station" aria-label={station.title}>
      <header>
        <div>
          <span>{station.description}</span>
          <h1>{station.category}</h1>
        </div>
        <button onClick={onClose}>Ver dispositivo</button>
        {reading && (
          <button onClick={() => setReading(undefined)}>
            <ArrowLeft size={16} />
            Todos los expedientes
          </button>
        )}
      </header>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={onComputer}>
            <Monitor size={16} />
            Ir al computador
          </button>
        </div>
      ) : busy ? (
        <p role="status">Abriendo expediente…</p>
      ) : reading ? (
        <article>
          <h2>{reading.title}</h2>
          <p className="specialist-document">{reading.body}</p>
          <button onClick={() => onInvestigate(reading.id)}>
            <Monitor size={16} />
            {id === "api-kiosk"
              ? "Investigar API desde el PC"
              : id === "wireless-ap" && /^wireless-(08|09|10)$/.test(reading.id)
                ? "Operar laboratorio desde el PC"
                : station.serviceHost
                  ? "Usar consola desde el PC"
                  : "Abrir evidencias en el PC"}
          </button>
        </article>
      ) : (
        <>
          <p>
            Diez expedientes independientes. Selecciona uno para examinarlo y
            continuar desde el computador.
          </p>
          <div className="specialist-cases">
            {documents.map((document) => {
              const index = Number(document.id.slice(-2)),
                points = index <= 4 ? 1 : index <= 7 ? 2 : 3;
              return (
                <button
                  key={document.id}
                  onClick={() => void read(document.id)}
                >
                  <span>
                    {solved.includes(document.id) ? (
                      <Check size={18} />
                    ) : (
                      <Folder size={18} />
                    )}
                    Expediente {document.id.slice(-2)}
                  </span>
                  <strong>{document.title}</strong>
                  <small>
                    {points === 1
                      ? "Fácil"
                      : points === 2
                        ? "Medio"
                        : "Difícil"}{" "}
                    · {points} {points === 1 ? "punto" : "puntos"} ·{" "}
                    {solved.includes(document.id) ? "Resuelto" : "Pendiente"}
                  </small>
                </button>
              );
            })}
          </div>
          {!documents.length && (
            <p>No hay expedientes habilitados en este dispositivo.</p>
          )}
        </>
      )}
    </section>
  );
}
