import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import ChallengePagination from "../challenges/ChallengePagination";
import type { AdminOverview } from "./AdminDashboard";
import AdminUserDetail from "./AdminUserDetail";

function auditDescription(audit: AdminOverview["audits"][number]) {
  if (audit.action === "competition.closed")
    return `${audit.user.alias} cerró la competencia`;
  if (audit.action === "competition.opened")
    return `${audit.user.alias} reabrió la competencia`;
  if (audit.action === "category.enabled")
    return `${audit.user.alias} activó la categoría ${audit.target}`;
  if (audit.action === "category.disabled")
    return `${audit.user.alias} desactivó la categoría ${audit.target}`;
  return `${audit.user.alias} actualizó ${audit.target}`;
}

const pageSize = 8;
function selectedUserFromLocation() {
  const match = window.location.hash.match(/^#usuarios\/([^/]+)$/);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}
export default function AdminRecords({
  section,
  data,
}: {
  section: string;
  data: AdminOverview;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(selectedUserFromLocation);
  const previousId = useRef(selectedId);
  useEffect(() => {
    const navigate = () => setSelectedId(selectedUserFromLocation());
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    if (!selectedId && previousId.current)
      document.getElementById(`user-results-${previousId.current}`)?.focus();
    previousId.current = selectedId;
  }, [selectedId]);
  const results = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLocaleLowerCase("es");
  const users = data.users.filter((user) =>
    user.alias.toLocaleLowerCase("es").includes(needle),
  );
  const scoring = data.scoring.filter((group) =>
    group.category.toLocaleLowerCase("es").includes(needle),
  );
  const audits = data.audits.filter((audit) =>
    auditDescription(audit).toLocaleLowerCase("es").includes(needle),
  );
  const count =
    section === "usuarios"
      ? users.length
      : section === "puntuacion"
        ? scoring.length
        : audits.length;
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const label =
    section === "usuarios"
      ? "usuarios"
      : section === "puntuacion"
        ? "categorías"
        : "eventos";
  return (
    <>
      <div
        className="admin-records"
        ref={results}
        tabIndex={-1}
        hidden={section === "usuarios" && !!selectedId}
      >
        {section === "puntuacion" && (
          <div className="admin-scoring-note">
            <p>
              <strong>
                {data.scoring.reduce(
                  (total, group) => total + group.points,
                  0,
                ) + data.finalPoints}{" "}
                puntos máximos
              </strong>{" "}
              · Incluye {data.finalPoints} del reto oculto.
            </p>
            <span className="muted">
              Fácil: 1 punto · Medio: 2 puntos · Difícil: 3 puntos
            </span>
          </div>
        )}
        <div className="admin-record-toolbar">
          <label className="admin-search">
            Buscar {label}
            <span>
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={query}
                placeholder={
                  section === "usuarios"
                    ? "Alias del usuario"
                    : section === "puntuacion"
                      ? "Nombre de la categoría"
                      : "Administrador o cambio"
                }
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </span>
          </label>
          <p className="muted" role="status">
            {count
              ? `${start + 1}–${Math.min(start + pageSize, count)} de ${count}`
              : "0"}{" "}
            {label}
          </p>
        </div>
        {section === "usuarios" && !!count && (
          <div className="table-wrap admin-record-table">
            <table>
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Rol</th>
                  <th>Resoluciones</th>
                  <th>Puntos</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(start, start + pageSize).map((user) => (
                  <tr key={user.id}>
                    <td data-label="Alias">
                      <strong>{user.alias}</strong>
                    </td>
                    <td data-label="Rol">
                      <span className="role-badge">
                        {user.role === "ADMIN"
                          ? "Administrador"
                          : "Participante"}
                      </span>
                    </td>
                    <td data-label="Resoluciones">{user._count.solves}</td>
                    <td data-label="Puntos">{user.score}</td>
                    <td data-label="Detalle">
                      <a
                        id={`user-results-${user.id}`}
                        href={`#usuarios/${encodeURIComponent(user.id)}`}
                        className="secondary admin-user-link"
                        aria-label={`Ver resultados de ${user.alias}`}
                      >
                        Ver resultados
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {section === "puntuacion" && !!count && (
          <div className="table-wrap admin-record-table">
            <table>
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Fáciles</th>
                  <th>Medios</th>
                  <th>Difíciles</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {scoring.slice(start, start + pageSize).map((group) => (
                  <tr key={group.category}>
                    <td data-label="Categoría">
                      <strong>{group.category}</strong>
                    </td>
                    <td data-label="Fáciles">{group.easy}</td>
                    <td data-label="Medios">{group.medium}</td>
                    <td data-label="Difíciles">{group.hard}</td>
                    <td data-label="Puntos">{group.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {section === "actividad" && !!count && (
          <ul className="audit-list">
            {audits.slice(start, start + pageSize).map((audit, index) => (
              <li key={`${audit.createdAt}-${index}`}>
                <span>{auditDescription(audit)}</span>
                <time dateTime={audit.createdAt}>
                  {new Date(audit.createdAt).toLocaleString("es-EC")}
                </time>
              </li>
            ))}
          </ul>
        )}
        {!count && (
          <p className="empty">
            {needle
              ? "No hay resultados para esta búsqueda."
              : section === "actividad"
                ? "Los cierres, reaperturas y cambios de retos aparecerán aquí."
                : "No hay registros disponibles."}
          </p>
        )}
        {pages > 1 && (
          <ChallengePagination
            page={current}
            pages={pages}
            label={`Páginas de ${label}`}
            onPage={(next) => {
              setPage(next);
              results.current?.focus({ preventScroll: true });
              results.current?.scrollIntoView({ block: "nearest" });
            }}
          />
        )}
      </div>
      {section === "usuarios" && selectedId && (
        <AdminUserDetail
          key={selectedId}
          userId={selectedId}
          alias={
            data.users.find((user) => user.id === selectedId)?.alias ??
            "Usuario"
          }
          onBack={() => {
            window.location.hash = "usuarios";
          }}
        />
      )}
    </>
  );
}
