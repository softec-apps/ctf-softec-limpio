import { useEffect, useRef, useState } from "react";
import {
  Armchair,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Maximize,
  Minimize,
  Monitor,
  Pause,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import AuditoriumWorld from "./AuditoriumWorld";
import { usePublicCompetition } from "./usePublicCompetition";
import type { AuditoriumView } from "./createAuditorium";

export default function Auditorium() {
  const { snapshot, connected, reconnect } = usePublicCompetition();
  const [view, setView] = useState<AuditoriumView>("sala");
  const [rotation, setRotation] = useState(
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [rankingRound, setRankingRound] = useState(0);
  const [categoryRound, setCategoryRound] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");
  const results = useRef<HTMLDialogElement>(null);
  const pages = Math.max(1, Math.ceil((snapshot?.entries.length ?? 0) / 7));
  const categoryPages = Math.max(
    1,
    Math.ceil((snapshot?.categories.length ?? 0) / 4),
  );
  const page = rankingRound % pages,
    categoryPage = categoryRound % categoryPages;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (media.matches) setRotation(false);
    };
    const sync = () => setFullscreen(!!document.fullscreenElement);
    media.addEventListener("change", reduce);
    document.addEventListener("fullscreenchange", sync);
    return () => {
      media.removeEventListener("change", reduce);
      document.removeEventListener("fullscreenchange", sync);
    };
  }, []);
  useEffect(() => {
    if (!rotation) return;
    const timer = setInterval(() => {
      if (!document.hidden && !results.current?.open) {
        setRankingRound((value) => value + 1);
        setCategoryRound((value) => value + 1);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [rotation]);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setNotice("");
    } catch {
      setNotice("Puedes usar F11 para ver el auditorio en pantalla completa.");
    }
  }
  return (
    <main className="auditorium">
      <AuditoriumWorld
        display={{ snapshot, connected, page, categoryPage }}
        view={view}
      />
      <header className="auditorium-header">
        <div className="auditorium-brand">
          <ShieldCheck size={26} aria-hidden="true" />
          <h1>Seventech CTF</h1>
          <span>Auditorio en vivo</span>
        </div>
        <div className="auditorium-status">
          <span className={connected ? "is-live" : ""} role="status">
            <Radio size={15} aria-hidden="true" />
            {connected
              ? "En directo"
              : snapshot
                ? "Reconectando"
                : "Conectando"}
          </span>
          {snapshot && (
            <span className="auditorium-competition">
              {snapshot.competition.open
                ? "Competencia abierta"
                : "Competencia cerrada"}
            </span>
          )}
          {!connected && (
            <button aria-label="Reconectar marcador" onClick={reconnect}>
              <RefreshCw size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>
      <nav className="auditorium-views" aria-label="Vistas del auditorio">
        <button aria-pressed={view === "sala"} onClick={() => setView("sala")}>
          <Armchair size={19} aria-hidden="true" />
          <span>Auditorio</span>
        </button>
        <button
          aria-pressed={view === "pantalla"}
          onClick={() => setView("pantalla")}
        >
          <Monitor size={19} aria-hidden="true" />
          <span>Marcador</span>
        </button>
        <button
          aria-pressed={view === "podio"}
          onClick={() => setView("podio")}
        >
          <Trophy size={19} aria-hidden="true" />
          <span>Podio</span>
        </button>
      </nav>
      {notice && (
        <p className="auditorium-notice" role="status">
          {notice}
        </p>
      )}
      <footer className="auditorium-controls">
        <div className="auditorium-live-note">
          <strong>
            {snapshot
              ? `${snapshot.stats.participants} participantes · ${snapshot.stats.resolutions} resoluciones`
              : "Preparando el escenario…"}
          </strong>
          <span>
            {snapshot
              ? `${connected ? "Actualizado" : "Sin conexión · últimos resultados de"} ${new Date(snapshot.updatedAt).toLocaleTimeString("es-EC", { hour12: false })}`
              : "Los resultados aparecerán en las pantallas del escenario."}
          </span>
        </div>
        <div className="auditorium-actions">
          <div
            className="auditorium-pagination"
            aria-label="Páginas del marcador"
          >
            <button
              aria-label="Posiciones anteriores"
              disabled={pages <= 1}
              onClick={() => {
                setRankingRound((value) => value + pages - 1);
                setRotation(false);
              }}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span>
              {page + 1}/{pages}
            </span>
            <button
              aria-label="Posiciones siguientes"
              disabled={pages <= 1}
              onClick={() => {
                setRankingRound((value) => value + 1);
                setRotation(false);
              }}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <button
            aria-label={rotation ? "Pausar rotación" : "Reanudar rotación"}
            aria-pressed={!rotation}
            onClick={() => setRotation((value) => !value)}
          >
            {rotation ? (
              <Pause size={17} aria-hidden="true" />
            ) : (
              <Play size={17} aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => {
              setRotation(false);
              results.current?.showModal();
            }}
          >
            <ListOrdered size={18} aria-hidden="true" />
            <span>Resultados en texto</span>
          </button>
          <button
            aria-label={
              fullscreen ? "Salir de pantalla completa" : "Pantalla completa"
            }
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? (
              <Minimize size={18} aria-hidden="true" />
            ) : (
              <Maximize size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </footer>
      <p className="auditorium-hint">
        Arrastra para mirar alrededor · Acerca con la rueda o con dos dedos
      </p>
      <dialog
        ref={results}
        className="auditorium-results"
        aria-labelledby="auditorium-results-title"
      >
        <div className="auditorium-results-heading">
          <div>
            <span>Seventech CTF</span>
            <h2 id="auditorium-results-title">Resultados en vivo</h2>
          </div>
          <button
            aria-label="Cerrar resultados"
            onClick={() => results.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {!snapshot ? (
          <p>Conectando con el marcador…</p>
        ) : (
          <>
            <p>
              {snapshot.stats.participants} participantes ·{" "}
              {snapshot.stats.resolutions} resoluciones ·{" "}
              {snapshot.stats.attempts} entregas
            </p>
            <table>
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Participante</th>
                  <th>Retos</th>
                  <th>Puntos</th>
                  <th>Errores</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.entries.slice(page * 7, page * 7 + 7).map((entry) => (
                  <tr key={entry.alias}>
                    <td>{entry.position}</td>
                    <th scope="row">{entry.alias}</th>
                    <td>{entry.solved}</td>
                    <td>{entry.score}</td>
                    <td>{entry.incorrectAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!snapshot.entries.length && (
              <p>
                La clasificación aparecerá cuando se registren participantes.
              </p>
            )}
            <div className="auditorium-text-pages">
              <button
                disabled={pages <= 1}
                onClick={() => setRankingRound((value) => value + pages - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page + 1} de {pages}
              </span>
              <button
                disabled={pages <= 1}
                onClick={() => setRankingRound((value) => value + 1)}
              >
                Siguiente
              </button>
            </div>
            <h3>Últimas conquistas</h3>
            <ul>
              {snapshot.activity.map((event) => (
                <li key={`${event.alias}-${event.title}-${event.createdAt}`}>
                  <strong>{event.alias}</strong> · {event.title}{" "}
                  <span>+{event.points} puntos</span>
                </li>
              ))}
            </ul>
            <h3>Avance por categorías</h3>
            <div className="auditorium-text-categories">
              {snapshot.categories.map((category) => (
                <p key={category.name}>
                  {category.name}
                  <strong>
                    {category.solved}/{category.challenges}
                  </strong>
                </p>
              ))}
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
