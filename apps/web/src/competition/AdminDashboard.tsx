import { useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Users,
  Flag,
  TerminalSquare,
  LayoutDashboard,
  ListChecks,
  ChartNoAxesCombined,
  History,
  ArrowUpRight,
  Trophy,
} from "lucide-react";
import { api, type Challenge, type User, type CompetitionStatus } from "../api";
import CompetitionControl from "./CompetitionControl";
import ChallengeManagement from "./ChallengeManagement";
import AdminRecords from "./AdminRecords";
type Audit = {
  action: string;
  target: string;
  createdAt: string;
  user: { alias: string };
};
export type AdminOverview = {
  hiddenCompletions: number;
  finalPoints: number;
  scoring: {
    category: string;
    easy: number;
    medium: number;
    hard: number;
    points: number;
  }[];
  competition: CompetitionStatus;
  users: (User & {
    createdAt: string;
    score: number;
    _count: { solves: number };
  })[];
  challenges: Challenge[];
  solves: number;
  attempts: number;
  audits: Audit[];
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo cargar el panel.";
const sections = [
  {
    id: "resumen",
    label: "Resumen",
    description: "El estado de tu competencia, de un vistazo.",
    icon: LayoutDashboard,
  },
  {
    id: "retos",
    label: "Retos",
    description: "Busca y administra la disponibilidad de cada reto.",
    icon: ListChecks,
  },
  {
    id: "puntuacion",
    label: "Puntuación",
    description: "Distribución por categoría y valor de los retos.",
    icon: ChartNoAxesCombined,
  },
  {
    id: "usuarios",
    label: "Usuarios",
    description:
      "Participantes, retos resueltos y desempates de la clasificación.",
    icon: Users,
  },
  {
    id: "actividad",
    label: "Actividad",
    description: "Historial de cambios de la administración.",
    icon: History,
  },
];
function currentSection() {
  return (
    sections.find(
      (section) => `#${section.id}` === window.location.hash.split("/")[0],
    ) ?? sections[0]
  );
}
export default function AdminDashboard() {
  const [section, setSection] = useState(currentSection);
  useEffect(() => {
    const navigate = () => setSection(currentSection());
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);
  const [error, setError] = useState("");
  async function load() {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const result = await api<AdminOverview>("/admin/overview");
      if (request !== sequence.current) return;
      setData(result);
      setError("");
    } catch (e) {
      if (request === sequence.current) setError(message(e));
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const participants =
    data?.users.filter((user) => user.role === "PARTICIPANT").length ?? 0;
  const available =
    data?.challenges.filter((challenge) => challenge.enabled).length ?? 0;
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">
          Seventech <span>CTF</span>
        </div>
        <nav aria-label="Secciones de administración">
          {sections.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={section.id === id ? "page" : undefined}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {data && id === "retos" && (
                <small>{data.challenges.length}</small>
              )}
              {data && id === "usuarios" && <small>{data.users.length}</small>}
            </a>
          ))}
        </nav>
        <div className="admin-sidebar-note">
          <span
            className={`admin-state ${data?.competition.open ? "is-open" : ""}`}
          >
            {data
              ? data.competition.open
                ? "Competencia abierta"
                : "Competencia cerrada"
              : "Conectando…"}
          </span>
          <p>El cierre de la competencia es manual.</p>
        </div>
      </aside>
      <section
        className="content-view admin-workspace"
        aria-labelledby="admin-page-title"
        aria-busy={loading}
      >
        <div className="view-heading">
          <div>
            <h1 id="admin-page-title">{section.label}</h1>
            <p className="muted">{section.description}</p>
          </div>
          <button
            className="secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={16} aria-hidden="true" />{" "}
            {loading ? "Actualizando…" : "Actualizar panel"}
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!data && !error && <p role="status">Cargando operaciones…</p>}
        {data && section.id === "resumen" && (
          <>
            <div className="stats-row">
              <div>
                <Users aria-hidden="true" />
                <strong>{participants}</strong>
                <span>Participantes</span>
              </div>
              <div>
                <Flag aria-hidden="true" />
                <strong>{data.solves}</strong>
                <span>Resoluciones</span>
              </div>
              <div>
                <TerminalSquare aria-hidden="true" />
                <strong>{data.attempts}</strong>
                <span>Flags enviadas</span>
              </div>
            </div>
            <CompetitionControl
              competition={data.competition}
              onChanged={() => void load()}
            />
            <div className="admin-summary-grid">
              <section className="admin-summary-card">
                <div className="admin-card-heading">
                  <ListChecks size={20} aria-hidden="true" />
                  <h2>Catálogo de retos</h2>
                </div>
                <p className="admin-summary-number">
                  {available}
                  <span> / {data.challenges.length} disponibles</span>
                </p>
                <p className="muted">
                  {data.scoring.length} categorías ·{" "}
                  {data.challenges.length - available} retos desactivados
                </p>
                <a href="#retos">
                  Gestionar retos <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </section>
              <section className="admin-summary-card">
                <div className="admin-card-heading">
                  <Trophy size={20} aria-hidden="true" />
                  <h2>Reto oculto</h2>
                </div>
                <p className="admin-summary-number">
                  {data.finalPoints}
                  <span> puntos adicionales</span>
                </p>
                <p className="muted">
                  El último privilegio · {data.hiddenCompletions} resoluciones
                  registradas. Cada participante puntúa una sola vez.
                </p>
                <a href="#puntuacion">
                  Consultar puntuación{" "}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </section>
            </div>
          </>
        )}
        {data && (
          <div hidden={section.id !== "retos"}>
            <ChallengeManagement challenges={data.challenges} onSave={load} />
          </div>
        )}
        {data &&
          ["puntuacion", "usuarios", "actividad"].includes(section.id) && (
            <AdminRecords key={section.id} section={section.id} data={data} />
          )}
      </section>
    </div>
  );
}
