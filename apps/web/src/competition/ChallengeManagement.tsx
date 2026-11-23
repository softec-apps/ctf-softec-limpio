import { useEffect, useRef, useState } from "react";
import { api, type Challenge } from "../api";
import CategoryAvailability from "./CategoryAvailability";
import ChallengePagination from "../challenges/ChallengePagination";
const message = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo guardar el reto.";
function ChallengeEditor({
  challenge,
  onSave,
  disabled,
}: {
  disabled: boolean;
  challenge: Challenge;
  onSave: () => void | Promise<void>;
}) {
  const [enabled, setEnabled] = useState(challenge.enabled);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setEnabled(challenge.enabled);
  }, [challenge.enabled]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    setBusy(true);
    try {
      await api(`/admin/challenges/${challenge.id}`, {
        method: "PATCH",
        body: JSON.stringify({ points: challenge.points, enabled }),
      });
      setStatus("Cambios guardados.");
      await onSave();
    } catch (e) {
      setStatus(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="challenge-editor" onSubmit={save}>
      <div>
        <h3>{challenge.title}</h3>
        <p className="muted">
          {challenge.category} ·{" "}
          {
            { easy: "Fácil", medium: "Medio", hard: "Difícil" }[
              challenge.difficulty
            ]
          }
        </p>
      </div>
      <span
        className="admin-challenge-points"
        aria-label={`${challenge.points} puntos`}
      >
        {challenge.points} <small>pt{challenge.points === 1 ? "" : "s"}</small>
      </span>
      <label className="checkbox">
        <input
          type="checkbox"
          disabled={busy || disabled}
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />{" "}
        Reto disponible
      </label>
      <button className="secondary" disabled={busy || disabled}>
        {busy ? "Guardando…" : "Guardar cambios"}
      </button>
      {status && <p role="status">{status}</p>}
    </form>
  );
}

export default function ChallengeManagement({
  challenges,
  onSave,
}: {
  challenges: Challenge[];
  onSave: () => void | Promise<void>;
}) {
  const results = useRef<HTMLElement>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const categories = [
    ...new Set(
      challenges.map((c) => c.categoryGroup ?? c.category.split(" · ")[0]),
    ),
  ].sort();
  const categoryChallenges = challenges.filter(
    (c) => (c.categoryGroup ?? c.category.split(" · ")[0]) === category,
  );
  const needle = query.trim().toLocaleLowerCase("es");
  const filtered = challenges.filter(
    (c) =>
      (!category ||
        (c.categoryGroup ?? c.category.split(" · ")[0]) === category) &&
      (!needle ||
        `${c.title} ${c.id} ${c.category}`
          .toLocaleLowerCase("es")
          .includes(needle)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const current = Math.min(page, pages - 1);
  return (
    <section
      ref={results}
      tabIndex={-1}
      className="admin-challenges"
      aria-labelledby="admin-challenges-title"
    >
      <h2 id="admin-challenges-title" className="admin-visually-hidden">
        Gestión de retos
      </h2>
      <p className="muted">
        Escala fija: fácil 1 punto, medio 2 y difícil 3. Puedes activar o
        desactivar los retos.
      </p>
      <div className="admin-challenge-filters">
        <label>
          Buscar reto
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Título, categoría o identificador"
          />
        </label>
        <label>
          Categoría
          <select
            value={category}
            disabled={categoryBusy}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <CategoryAvailability
        category={category}
        total={categoryChallenges.length}
        available={categoryChallenges.filter((c) => c.enabled).length}
        busy={categoryBusy}
        onBusy={setCategoryBusy}
        onSave={onSave}
      />
      <p className="muted" role="status">
        {filtered.length} de {challenges.length} retos ·{" "}
        {challenges.filter((c) => c.enabled).length} disponibles
      </p>
      <div className="admin-challenge-list">
        {filtered.slice(current * 6, current * 6 + 6).map((c) => (
          <ChallengeEditor
            key={c.id}
            challenge={c}
            onSave={onSave}
            disabled={categoryBusy}
          />
        ))}
      </div>
      {!filtered.length && (
        <p className="empty">No hay retos que coincidan con la búsqueda.</p>
      )}
      {pages > 1 && (
        <ChallengePagination
          page={current + 1}
          pages={pages}
          label="Páginas de gestión de retos"
          onPage={(next) => {
            setPage(next - 1);
            results.current?.scrollIntoView({
              block: "start",
              behavior: "instant",
            });
            results.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </section>
  );
}
