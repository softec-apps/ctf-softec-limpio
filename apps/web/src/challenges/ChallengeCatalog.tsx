import { stationForChallenge } from "../../../../packages/specialist-contracts";
import { useRef, useState } from "react";
import {
  Check,
  Compass,
  Flag,
  Folder,
  Globe,
  Layers,
  Printer,
  Activity,
  KeyRound,
  Monitor,
  Network,
  Search,
} from "lucide-react";
import type { Challenge } from "../api";
import { isWebChallenge, hasBrowserLab } from "../web-lab/catalog";
import "./catalog.css";
import ChallengePagination from "./ChallengePagination";

const PAGE_SIZE = 6;
const categories = [
  { id: "all", label: "Todos los retos", icon: Layers },
  { id: "web", label: "Web · OWASP", icon: Globe },
  { id: "osint", label: "OSINT", icon: Search },
  { id: "reverse", label: "Ingeniería inversa", icon: Layers },
  { id: "stego", label: "Esteganografía", icon: Layers },
  { id: "crypto", label: "Criptografía", icon: KeyRound },
  { id: "linux", label: "Infraestructura", icon: Monitor },
  { id: "ot", label: "OT", icon: Activity },
  { id: "iot", label: "IoT", icon: Printer },
  { id: "network", label: "Redes", icon: Network },
  { id: "phone", label: "Móvil", icon: Monitor },
  { id: "domain", label: "Active Directory", icon: Network },
  { id: "windows", label: "Windows", icon: Monitor },
  { id: "api", label: "Seguridad de APIs", icon: Globe },
  { id: "malware", label: "Análisis de malware", icon: Search },
  { id: "incident", label: "Respuesta a incidentes", icon: Activity },
  { id: "access", label: "Identidad y acceso físico", icon: KeyRound },
  { id: "cloud", label: "Cloud", icon: Globe },
  { id: "devops", label: "Contenedores y DevOps", icon: Layers },
  { id: "ai", label: "Seguridad de IA", icon: Monitor },
  { id: "wireless", label: "Redes inalámbricas", icon: Network },
  { id: "database", label: "Bases de datos", icon: Search },
  { id: "contract", label: "Contratos inteligentes", icon: Search },
  { id: "memory", label: "Forense de memoria", icon: Search },
  { id: "files", label: "Archivos", icon: Folder },
  { id: "scene", label: "Investigación", icon: Compass },
] as const;
type Category = (typeof categories)[number]["id"];

function categoryOf(challenge: Challenge): Category {
  const station = stationForChallenge(challenge.id);
  if (station)
    return station.prefix.slice(0, -1) as
      | "api"
      | "malware"
      | "incident"
      | "access"
      | "cloud"
      | "devops"
      | "ai"
      | "wireless"
      | "memory"
      | "database"
      | "contract";
  if (challenge.category.startsWith("Archivos")) return "files";
  if (challenge.device === "ot") return "ot";
  if (challenge.device === "printer") return "iot";
  if (challenge.category.startsWith("Investigación")) return "scene";
  if (challenge.category.startsWith("Active Directory")) return "domain";
  if (challenge.category.startsWith("Ingeniería inversa")) return "reverse";
  if (challenge.category.startsWith("Esteganografía")) return "stego";
  if (challenge.category.startsWith("Linux")) return "linux";
  if (challenge.id.startsWith("network-")) return "network";
  if (challenge.device === "phone") return "phone";
  if (challenge.device === "laptop") return "windows";
  if (challenge.category.startsWith("OSINT")) return "osint";
  if (challenge.category.startsWith("Criptografía")) return "crypto";
  if (isWebChallenge(challenge.id)) return "web";
  if (challenge.device === "scene" || challenge.device === "entrance")
    return "scene";
  return "files";
}

function categoryOrder(challenge: Challenge) {
  if (challenge.device === "entrance") return 0;
  return Number(challenge.category.match(/OWASP A(\d{2}):2025/)?.[1] ?? 100);
}

export default function ChallengeCatalog({
  challenges,
  solvedIds,
  loading,
  onLaunch,
}: {
  challenges: Challenge[];
  solvedIds: string[];
  loading: boolean;
  onLaunch: (
    challenge: Challenge,
    app: "mission" | "browser" | "terminal" | "files" | "archive" | "station",
  ) => void;
}) {
  const [category, setCategory] = useState<Category>("all");
  const [subcategory, setSubcategory] = useState("");
  const [page, setPage] = useState(1);
  const results = useRef<HTMLDivElement>(null);
  const ordered = [...challenges].sort(
    (a, b) => categoryOrder(a) - categoryOrder(b),
  );
  const categoryChallenges = ordered.filter(
    (challenge) => category === "all" || categoryOf(challenge) === category,
  );
  const subcategories = [
    ...new Set(categoryChallenges.map((challenge) => challenge.category)),
  ];
  // A refresh can remove a category or shrink the current page.
  const activeSubcategory = subcategories.includes(subcategory)
    ? subcategory
    : "";
  const filtered = categoryChallenges.filter(
    (challenge) =>
      !activeSubcategory || challenge.category === activeSubcategory,
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const solved = new Set(solvedIds);

  function changePage(next: number) {
    setPage(next);
    results.current?.scrollIntoView({ block: "start", behavior: "instant" });
    results.current?.focus({ preventScroll: true });
  }

  return (
    <section className="challenge-catalog" aria-label="Catálogo de retos">
      <header className="catalog-heading">
        <div>
          <h1>Retos</h1>
          <p>
            Elige cualquier reto. Solo los niveles de Infraestructura por VPN
            siguen una cadena de claves.
          </p>
        </div>
        <span>
          {
            solvedIds.filter((id) =>
              challenges.some((challenge) => challenge.id === id),
            ).length
          }{" "}
          / {challenges.length} resueltos
        </span>
      </header>
      <div className="catalog-layout">
        <nav className="catalog-categories" aria-label="Categorías de retos">
          {categories.map((entry) => {
            const Icon = entry.icon;
            const count = challenges.filter(
              (challenge) =>
                entry.id === "all" || categoryOf(challenge) === entry.id,
            ).length;
            return (
              <button
                key={entry.id}
                aria-pressed={category === entry.id}
                onClick={() => {
                  setCategory(entry.id);
                  setSubcategory("");
                  setPage(1);
                }}
              >
                <Icon size={18} />
                <span>{entry.label}</span>
                <span className="catalog-count">{count}</span>
              </button>
            );
          })}
        </nav>
        <div className="catalog-results" ref={results} tabIndex={-1}>
          <div className="catalog-toolbar">
            <h2>{categories.find((entry) => entry.id === category)!.label}</h2>
            <label>
              Categoría específica
              <select
                value={activeSubcategory}
                onChange={(event) => {
                  setSubcategory(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas las categorías</option>
                {subcategories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry.startsWith("Linux")
                      ? "Infraestructura · Servidores"
                      : entry}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="catalog-range" role="status">
            {loading
              ? "Cargando retos…"
              : filtered.length
                ? `${start + 1}–${start + visible.length} de ${filtered.length} retos`
                : "No hay retos publicados en esta categoría."}
          </p>
          <div className="catalog-grid">
            {visible.map((challenge) => {
              const complete = solved.has(challenge.id);
              return (
                <article className="catalog-card" key={challenge.id}>
                  <div className="catalog-card-meta">
                    <span>
                      {stationForChallenge(challenge.id)?.category ??
                        (categoryOf(challenge) === "ot"
                          ? "OT"
                          : categoryOf(challenge) === "iot"
                            ? "IoT"
                            : categoryOf(challenge) === "web"
                              ? (challenge.category.match(/A\d{2}/)?.[0] ??
                                "Web")
                              : categoryOf(challenge) === "linux"
                                ? "Infraestructura"
                                : categoryOf(challenge) === "network"
                                  ? "Redes"
                                  : categoryOf(challenge) === "phone"
                                    ? "Móvil"
                                    : categoryOf(challenge) === "windows"
                                      ? "Windows"
                                      : categoryOf(challenge) === "osint"
                                        ? "OSINT"
                                        : categoryOf(challenge) === "crypto"
                                          ? "Criptografía"
                                          : categoryOf(challenge) === "scene"
                                            ? "Investigación"
                                            : categoryOf(challenge) === "stego"
                                              ? "Esteganografía"
                                              : categoryOf(challenge) ===
                                                  "reverse"
                                                ? "Ingeniería inversa"
                                                : categoryOf(challenge) ===
                                                    "domain"
                                                  ? "Active Directory"
                                                  : "Archivos")}
                    </span>
                    <span
                      className={`catalog-difficulty is-${challenge.difficulty}`}
                    >
                      {
                        { easy: "Fácil", medium: "Medio", hard: "Difícil" }[
                          challenge.difficulty
                        ]
                      }{" "}
                      · {challenge.points}{" "}
                      {challenge.points === 1 ? "punto" : "puntos"}
                    </span>
                  </div>
                  <h3>{challenge.title}</h3>
                  <p className="catalog-card-category">
                    {categoryOf(challenge) === "linux"
                      ? "Infraestructura · Servidores"
                      : challenge.category}
                  </p>
                  <p className="catalog-card-description">
                    {challenge.description}
                  </p>
                  <span
                    className={`catalog-state${complete ? " is-solved" : ""}`}
                  >
                    {complete ? (
                      <>
                        <Check size={14} />
                        Resuelto
                      </>
                    ) : (
                      "Pendiente"
                    )}
                  </span>
                  <div className="catalog-card-actions">
                    <button onClick={() => onLaunch(challenge, "mission")}>
                      <Flag size={14} />
                      Ver reto
                    </button>
                    {(challenge.category.startsWith("Esteganografía") ||
                      challenge.category.startsWith("Ingeniería inversa") ||
                      stationForChallenge(challenge.id) ||
                      challenge.id.startsWith("files-") ||
                      challenge.id.startsWith("investigation-") ||
                      challenge.device === "printer" ||
                      challenge.device === "ot") && (
                      <button onClick={() => onLaunch(challenge, "files")}>
                        <Folder size={14} />
                        Abrir evidencias
                      </button>
                    )}
                    {stationForChallenge(challenge.id) && (
                      <button onClick={() => onLaunch(challenge, "station")}>
                        <Monitor size={14} />
                        Ver dispositivo
                      </button>
                    )}
                    {challenge.id.startsWith("files-") && (
                      <button onClick={() => onLaunch(challenge, "archive")}>
                        <Folder size={14} />
                        Abrir archivador
                      </button>
                    )}
                    {challenge.device === "ot" && (
                      <>
                        <button onClick={() => onLaunch(challenge, "browser")}>
                          <Globe size={14} />
                          Visitar HMI
                        </button>
                        <button
                          onClick={() =>
                            window.dispatchEvent(new Event("ctf-ot-open"))
                          }
                        >
                          <Activity size={14} />
                          Usar control industrial
                        </button>
                      </>
                    )}
                    {challenge.device === "printer" && (
                      <button onClick={() => onLaunch(challenge, "browser")}>
                        <Globe size={14} />
                        Visitar servicio
                      </button>
                    )}
                    {challenge.device === "printer" && (
                      <button
                        onClick={() =>
                          window.dispatchEvent(new Event("ctf-printer-open"))
                        }
                      >
                        <Printer size={14} />
                        Usar impresora
                      </button>
                    )}
                    {challenge.device === "domain" && (
                      <button onClick={() => onLaunch(challenge, "terminal")}>
                        <Network size={14} />
                        Abrir Terminal del PC
                      </button>
                    )}
                    {challenge.category.startsWith("Linux") && (
                      <button onClick={() => onLaunch(challenge, "terminal")}>
                        <Network size={14} />
                        Abrir Terminal
                      </button>
                    )}
                    {challenge.id.startsWith("network-") && (
                      <button onClick={() => onLaunch(challenge, "terminal")}>
                        <Network size={14} />
                        Explorar rack
                      </button>
                    )}
                    {challenge.device === "phone" && (
                      <button onClick={() => onLaunch(challenge, "terminal")}>
                        <Monitor size={14} />
                        Abrir teléfono
                      </button>
                    )}
                    {challenge.device === "laptop" && (
                      <button onClick={() => onLaunch(challenge, "terminal")}>
                        <Monitor size={14} />
                        Abrir portátil
                      </button>
                    )}
                    {hasBrowserLab(challenge.id) && (
                      <button onClick={() => onLaunch(challenge, "browser")}>
                        <Monitor size={14} />
                        Visitar servicio
                      </button>
                    )}
                    {challenge.device === "entrance" && (
                      <button onClick={() => onLaunch(challenge, "terminal")}>
                        <Compass size={14} />
                        Ir al pasillo
                      </button>
                    )}
                    {challenge.device === "scene" && (
                      <button onClick={() => onLaunch(challenge, "terminal")}>
                        <Compass size={14} />
                        Explorar sala
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {filtered.length > 0 && (
            <ChallengePagination
              page={currentPage}
              pages={pageCount}
              onPage={changePage}
            />
          )}
        </div>
      </div>
    </section>
  );
}
