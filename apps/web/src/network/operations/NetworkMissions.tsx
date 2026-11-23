import { useEffect, useState } from "react";
import type { Game } from "../../api";
export default function NetworkMissions({
  game,
  active,
  busy,
  onLoad,
  onFree,
  initialMission,
  sequence,
}: {
  initialMission?: string;
  sequence?: number;
  game: Game | null;
  active: string;
  busy: boolean;
  onLoad: (id: string) => void;
  onFree: () => void;
}) {
  const [selected, setSelected] = useState("");
  useEffect(() => {
    if (initialMission)
      setSelected(initialMission === "all" ? "" : initialMission);
  }, [initialMission, sequence]);
  const [page, setPage] = useState(1);
  const cases =
    game?.challenges.filter((c) => c.id.startsWith("network-")) ?? [];
  const solved = new Set(game?.solves.map((s) => s.challengeId));
  const choice = cases.find((c) => c.id === selected);
  const pages = Math.max(1, Math.ceil(cases.length / 5));
  const current = Math.min(page, pages);
  return (
    <section className="nos-missions">
      <header>
        <div>
          <h2>Incidencias de la red</h2>
          <p>
            Investiga, configura y comprueba el funcionamiento de los equipos.
          </p>
        </div>
        <button onClick={onFree} disabled={busy}>
          Laboratorio libre
        </button>
      </header>
      {choice ? (
        <>
          <button onClick={() => setSelected("")}>
            ← Todas las incidencias
          </button>
          <h3>{choice.title}</h3>
          <p>{choice.description}</p>
          <p>
            {choice.points} puntos {solved.has(choice.id) && "· Resuelta"}
          </p>
          <button
            className="nos-primary"
            disabled={busy}
            onClick={() => onLoad(choice.id)}
          >
            {active === choice.id
              ? "Continuar incidencia"
              : "Preparar incidencia en el rack"}
          </button>
          <p className="nos-subtle">
            Cada incidencia conserva su configuración. Prepararla recupera el
            estado de trabajo de esa incidencia.
          </p>
        </>
      ) : (
        <>
          <div className="nos-mission-list">
            {cases.slice((current - 1) * 5, current * 5).map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)}>
                <span>
                  {c.title}
                  <small>
                    {c.points} puntos ·{" "}
                    {solved.has(c.id)
                      ? "Resuelta"
                      : active === c.id
                        ? "En el rack"
                        : "Pendiente"}
                  </small>
                </span>
                <span>Consultar</span>
              </button>
            ))}
          </div>
          <nav aria-label="Paginación de incidencias">
            <button
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </button>
            <span>
              {current} / {pages}
            </span>
            <button
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
