import { ArrowLeft, RefreshCw, Tv } from "lucide-react";
import { rankingMessage, rankingPoints, type RankingDisplay } from "./display";
import "./television.css";
export default function TelevisionScreen({
  display,
  refreshing,
  onRefresh,
  onClose,
}: {
  display: RankingDisplay;
  refreshing: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  return (
    <section
      className="television-reading"
      aria-label="Televisor de clasificación"
    >
      <div className="television-controls">
        <span>
          <Tv size={17} />
          Televisor del laboratorio
        </span>
        <button onClick={onClose}>
          <ArrowLeft size={15} />
          Ver televisor
        </button>
      </div>
      <div className="television-frame">
        <header>
          <div>
            <span>SEVENTECH / CTF</span>
            <h1>Los diez mejores</h1>
          </div>
          <button onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={16} />
            {refreshing ? "Actualizando…" : "Actualizar clasificación"}
          </button>
        </header>
        <p className="television-status" role="status">
          {rankingMessage(display)}
          {display.phase === "ready" && display.competitionOpen === false
            ? " Competencia cerrada."
            : ""}
        </p>
        {display.entries.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Puesto</th>
                <th>Participante</th>
                <th>Puntos</th>
                <th>Errores</th>
              </tr>
            </thead>
            <tbody>
              {display.entries.map((entry) => (
                <tr key={entry.alias}>
                  <td>{String(entry.position).padStart(2, "0")}</td>
                  <td title={entry.alias}>{entry.alias}</td>
                  <td>{rankingPoints(entry.score)}</td>
                  <td>{entry.incorrectAttempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
