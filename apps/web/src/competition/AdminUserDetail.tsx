import { useEffect, useRef, useState } from "react";
import { RefreshCw, ArrowLeft } from "lucide-react";
import type { AdminUserResults } from "../../../../packages/competition-contracts";
import { api } from "../api";
import ChallengePagination from "../challenges/ChallengePagination";

const dateFormat = new Intl.DateTimeFormat("es-EC", {
  timeZone: "America/Guayaquil",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hourCycle: "h23",
});
function timestamp(value: string | number | null) {
  return value === null
    ? "Sin resoluciones"
    : dateFormat.format(new Date(value));
}
const pageSize = 10;

export default function AdminUserDetail({
  userId,
  alias,
  onBack,
}: {
  userId: string;
  alias: string;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [details, setDetails] = useState<AdminUserResults>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [peerPage, setPeerPage] = useState(1);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const peersHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<AdminUserResults>(`/admin/users/${encodeURIComponent(userId)}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setDetails(result);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo cargar el detalle.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, refresh]);
  const needle = query.trim().toLocaleLowerCase("es");
  const results =
    details?.results.filter((result) =>
      `${result.title} ${result.category}`
        .toLocaleLowerCase("es")
        .includes(needle),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(results.length / pageSize));
  const current = Math.min(page, pages);
  const peers = details?.ranking?.peers ?? [];
  const peerPages = Math.max(1, Math.ceil(peers.length / pageSize));
  const currentPeerPage = Math.min(peerPage, peerPages);
  return (
    <section className="admin-user-detail" aria-labelledby="user-detail-title">
      <header className="admin-detail-heading">
        <div>
          <span className="muted">Resultados del usuario</span>
          <h2 id="user-detail-title" ref={heading} tabIndex={-1}>
            {details?.user.alias ?? alias}
          </h2>
        </div>
        <button type="button" className="secondary" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> Volver a Usuarios
        </button>
      </header>
      <div className="admin-detail-toolbar">
        <p className="muted">
          Fechas en Ecuador continental (UTC−5), con milisegundos.
        </p>
        <div className="admin-detail-actions">
          {details?.ranking && (
            <button
              type="button"
              className="secondary"
              onClick={() => peersHeading.current?.focus()}
            >
              Ver desempate
            </button>
          )}
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw size={16} aria-hidden="true" /> Actualizar detalle
          </button>
        </div>
      </div>
      {loading && <p role="status">Consultando resultados…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {details && (
        <>
          <dl className="admin-detail-summary">
            <div>
              <dt>Puntos</dt>
              <dd>{details.score}</dd>
            </div>
            <div>
              <dt>Retos resueltos</dt>
              <dd>{details.solved}</dd>
            </div>
            <div>
              <dt>Puesto actual</dt>
              <dd>
                {details.ranking
                  ? `#${details.ranking.position}`
                  : "No compite"}
              </dd>
            </div>
            <div>
              <dt>Intentos incorrectos</dt>
              <dd>{details.incorrectAttempts}</dd>
            </div>
            <div>
              <dt>Última resolución</dt>
              <dd>{timestamp(details.ranking?.lastSolve ?? null)}</dd>
            </div>
          </dl>
          <section aria-labelledby="user-results-title">
            <h3 id="user-results-title" ref={resultsHeading} tabIndex={-1}>
              Retos resueltos
            </h3>
            <label className="admin-detail-search">
              Buscar reto o categoría
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            {!!results.length && (
              <div className="table-wrap admin-record-table">
                <table>
                  <thead>
                    <tr>
                      <th>Reto</th>
                      <th>Categoría</th>
                      <th>Puntos obtenidos</th>
                      <th>Fecha de resolución</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results
                      .slice((current - 1) * pageSize, current * pageSize)
                      .map((result) => (
                        <tr key={result.id}>
                          <td data-label="Reto">
                            <strong>{result.title}</strong>
                            {!result.enabled && (
                              <small className="muted"> · Desactivado</small>
                            )}
                          </td>
                          <td data-label="Categoría">{result.category}</td>
                          <td data-label="Puntos obtenidos">{result.points}</td>
                          <td data-label="Fecha de resolución">
                            {timestamp(result.createdAt)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            {!results.length && (
              <p className="empty">
                {needle
                  ? "No hay retos resueltos que coincidan con la búsqueda."
                  : "Este usuario todavía no tiene retos resueltos."}
              </p>
            )}
            {pages > 1 && (
              <ChallengePagination
                page={current}
                pages={pages}
                label="Páginas de retos resueltos"
                onPage={(next) => {
                  setPage(next);
                  resultsHeading.current?.focus();
                }}
              />
            )}
          </section>
          <section
            aria-labelledby="user-tiebreak-title"
            className="admin-detail-tiebreak"
          >
            <h3 id="user-tiebreak-title" ref={peersHeading} tabIndex={-1}>
              Desempate
            </h3>
            {details.ranking ? (
              <>
                <p>
                  Se ordena por mayor puntuación y, en caso de empate, por menos
                  intentos incorrectos. Si ambos valores coinciden, comparten
                  puesto.
                </p>
                <p className="muted">
                  Se cuentan las entregas incorrectas registradas de todos los
                  retos, también los no resueltos. Los errores del reto oculto
                  empiezan a registrarse desde esta actualización; sus errores
                  anteriores no se guardaban.
                </p>
                <p>
                  <strong>{peers.length}</strong>{" "}
                  {peers.length === 1
                    ? "participante con"
                    : "participantes con"}{" "}
                  {details.score} puntos
                  {peers.length === 1
                    ? ": no hay empate de puntuación."
                    : ", en el orden oficial:"}
                </p>
                {peers.length > 1 && (
                  <div className="table-wrap admin-record-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Puesto</th>
                          <th>Participante</th>
                          <th>Errores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {peers
                          .slice(
                            (currentPeerPage - 1) * pageSize,
                            currentPeerPage * pageSize,
                          )
                          .map((peer) => (
                            <tr
                              key={peer.alias}
                              className={
                                peer.alias === details.user.alias
                                  ? "is-selected-user"
                                  : undefined
                              }
                            >
                              <td data-label="Puesto">#{peer.position}</td>
                              <td data-label="Participante">
                                <strong>{peer.alias}</strong>
                                {peer.alias === details.user.alias &&
                                  " (este usuario)"}
                              </td>
                              <td data-label="Errores">
                                {peer.incorrectAttempts}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {peerPages > 1 && (
                  <ChallengePagination
                    page={currentPeerPage}
                    pages={peerPages}
                    label="Páginas del desempate"
                    onPage={(next) => {
                      setPeerPage(next);
                      peersHeading.current?.focus();
                    }}
                  />
                )}
              </>
            ) : (
              <p>
                Las cuentas administradoras no participan en la clasificación ni
                en los desempates.
              </p>
            )}
          </section>
          <p className="muted admin-detail-updated">
            Datos consultados: {timestamp(details.updatedAt)}.
          </p>
        </>
      )}
    </section>
  );
}
