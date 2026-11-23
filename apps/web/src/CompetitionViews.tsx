import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, type CompetitionStatus } from "./api";
import CompetitionNotice from "./competition/CompetitionNotice";
const message = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operacion.";
export function Ranking() {
  const [rows, setRows] = useState<
    {
      alias: string;
      position: number;
      solved: number;
      score: number;
      incorrectAttempts: number;
    }[]
  >([]);
  const [competition, setCompetition] = useState<CompetitionStatus>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const result = await api("/ranking");
      setRows(result.entries);
      setCompetition(result.competition);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="content-view">
      <div className="view-heading">
        <div>
          <span className="section-tag">El avance de la investigación</span>
          <h1>Clasificación</h1>
        </div>
        <button
          className="secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <CompetitionNotice competition={competition} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Participante</th>
              <th>Misiones resueltas</th>
              <th>Puntos</th>
              <th>Errores</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.alias}>
                <td className="rank-position">
                  {String(r.position).padStart(2, "0")}
                </td>
                <td>{r.alias}</td>
                <td>{r.solved}</td>
                <td className="points-cell">{r.score}</td>
                <td>{r.incorrectAttempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="empty">
            {loading
              ? "Consultando clasificación…"
              : "La clasificación comienza con el primer participante."}
          </p>
        )}
      </div>
      <p className="muted">
        A igualdad de puntos, queda delante quien tenga menos intentos
        incorrectos. Si también coinciden los errores, comparten puesto.
      </p>
    </section>
  );
}
