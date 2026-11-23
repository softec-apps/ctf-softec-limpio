import FlagInput from "../challenges/FlagInput";
import { completeFlag } from "../challenges/flag-format";
import MobilePhotoViewer from "./MobilePhotoViewer";
import MobileArtifactView from "./MobileArtifactView";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api, post } from "../api";
import { useLabSession } from "../useLabSession";
import "./mobile-workspace.css";
const ROOT = "/storage/emulated/0/Expedientes";
type Entry = {
  mediaUrl?: string;
  mediaType?: string;
  title?: string;
  captured?: string;
  name: string;
  path: string;
  app: string;
};
type FileView = {
  name?: string;
  title?: string;
  mediaUrl?: string;
  mediaType?: string;
  type: string;
  path: string;
  content?: string;
  entries?: { name: string; path: string; type: string }[];
};
export default function MobileWorkspace({
  app,
  visible,
  active,
  onHome,
  onOpen,
}: {
  app: string | null;
  visible: boolean;
  active: boolean;
  onHome: () => void;
  onOpen: (app: "files") => void;
}) {
  const session = useLabSession(active);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [views, setViews] = useState<Record<string, FileView>>({});
  const [selected, setSelected] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    setEntries([]);
    setViews({});
    setSelected("");
    setDrafts({});
    setNotice("");
  }, [session.user?.id]);
  useEffect(() => {
    if (active && session.user) {
      let cancelled = false;
      api<{ entries: Entry[] }>("/mobile/artifacts")
        .then((r) => {
          if (!cancelled) setEntries(r.entries);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [active, session.user?.id]);
  async function open(path: string, target = app || "files") {
    setError("");
    try {
      const result = await api<FileView>(
        `/mobile/files?path=${encodeURIComponent(path)}`,
      );
      setViews((v) => ({ ...v, [target]: result }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo leer la evidencia.",
      );
    }
  }
  const cases =
    session.game?.challenges.filter((c) => c.device === "phone") ?? [];
  const filtered = cases.filter((c) => !category || c.category === category);
  const challenge = cases.find((c) => c.id === selected);
  const solved = new Set(session.game?.solves.map((s) => s.challengeId));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const current = Math.min(page, pages);
  const view = views[app || ""];
  return (
    <section
      className="mobile-app-page mobile-investigation"
      hidden={!visible}
      aria-label="Investigación móvil"
    >
      <header>
        <button aria-label="Volver al inicio" onClick={onHome}>
          <ArrowLeft size={21} />
        </button>
        <h1>
          {
            (
              {
                cases: "Expedientes",
                messages: "Mensajes",
                gallery: "Fotos",
                files: "Archivos",
                records: "Registros del equipo",
              } as Record<string, string>
            )[app || ""]
          }
        </h1>
      </header>
      <div className="mobile-investigation-content">
        {!session.user ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await session.login(alias, password);
                setPassword("");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "No se pudo iniciar sesión",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>Cuenta del laboratorio</h2>
            <p>
              Usa tu cuenta de analista para abrir las evidencias ficticias.
            </p>
            <label>
              Alias
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button disabled={busy || session.loading}>Entrar</button>
            {session.error && <p role="alert">{session.error}</p>}
          </form>
        ) : app === "cases" ? (
          <>
            <p>
              {cases.filter((c) => solved.has(c.id)).length} / {cases.length}{" "}
              resueltos · {session.game?.score} puntos globales
            </p>
            {challenge ? (
              <>
                <button
                  onClick={() => {
                    setSelected("");
                    setNotice("");
                  }}
                >
                  ← Expedientes
                </button>
                <h2>{challenge.title}</h2>
                <small>
                  {challenge.category} · {challenge.points} puntos{" "}
                  {solved.has(challenge.id) && "· Resuelto"}
                </small>
                <p>{challenge.description}</p>
                <button
                  onClick={() => {
                    void open(
                      `${ROOT}/caso-${challenge.id.slice(-2)}`,
                      "files",
                    );
                    onOpen("files");
                  }}
                >
                  Abrir carpeta
                </button>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setNotice("");
                    try {
                      const r = await post(
                        `/challenges/${challenge.id}/submissions`,
                        { flag: completeFlag(drafts[challenge.id] || "") },
                      );
                      setNotice(r.message);
                      if (r.correct) {
                        await session.refresh();
                        window.dispatchEvent(new Event("ctf-progress-changed"));
                      }
                    } catch (e) {
                      setNotice(
                        e instanceof Error ? e.message : "No se pudo validar",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Respuesta
                    <FlagInput
                      value={drafts[challenge.id] || ""}
                      onChange={(value) =>
                        setDrafts((drafts) => ({
                          ...drafts,
                          [challenge.id]: value,
                        }))
                      }
                      disabled={busy}
                    />
                  </label>
                  <button
                    disabled={busy || session.user.role !== "PARTICIPANT"}
                  >
                    Validar respuesta
                  </button>
                </form>
                <p role="status">{notice}</p>
              </>
            ) : (
              <>
                <label>
                  Categoría
                  <select
                    aria-label="Categoría móvil"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Todas</option>
                    {[...new Set(cases.map((c) => c.category))].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <div className="mobile-case-list">
                  {filtered.slice((current - 1) * 5, current * 5).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelected(c.id);
                        setNotice("");
                      }}
                    >
                      <strong>{c.title}</strong>
                      <small>
                        {c.category} · {c.points} puntos{" "}
                        {solved.has(c.id) && "✓"}
                      </small>
                    </button>
                  ))}
                </div>
                <nav aria-label="Paginación móvil">
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
          </>
        ) : (
          <>
            {app !== "gallery" && app !== "messages" && (
              <p className="mobile-evidence-note">
                Adquisición del dispositivo · Solo lectura
              </p>
            )}
            {view ? (
              <>
                <button
                  onClick={() =>
                    setViews((v) => {
                      const next = { ...v };
                      delete next[app || ""];
                      return next;
                    })
                  }
                >
                  {app === "gallery"
                    ? "← Biblioteca"
                    : app === "messages"
                      ? "← Conversaciones"
                      : app === "records"
                        ? "← Registros"
                        : "← Colección"}
                </button>
                {app === "files" && (
                  <p className="mobile-evidence-path">{view.path}</p>
                )}
                {view.type === "file" ? (
                  view.mediaUrl ? (
                    <MobilePhotoViewer
                      key={view.mediaUrl}
                      file={{
                        name: view.name || "Imagen",
                        title: view.title,
                        mediaUrl: view.mediaUrl,
                        mediaType: view.mediaType || "image/jpeg",
                      }}
                    />
                  ) : (
                    <MobileArtifactView
                      content={view.content || ""}
                      app={app}
                    />
                  )
                ) : (
                  <>
                    <button
                      disabled={view.path === ROOT}
                      onClick={() =>
                        void open(
                          view.path.slice(0, view.path.lastIndexOf("/")),
                        )
                      }
                    >
                      ↑ Carpeta superior
                    </button>
                    {view.entries?.map((e) => (
                      <button
                        className="mobile-evidence-row"
                        key={e.path}
                        onClick={() => void open(e.path)}
                      >
                        {e.type === "directory" ? "▸" : "▤"} {e.name}
                      </button>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                {app === "files" && (
                  <button onClick={() => void open(ROOT)}>
                    Explorar almacenamiento virtual
                  </button>
                )}
                {app === "gallery" && (
                  <>
                    <div className="mobile-camera-roll">
                      <h2>Biblioteca</h2>
                      <p>Febrero de 2026</p>
                      <div>
                        {entries
                          .filter((e) => e.mediaUrl)
                          .map((e) => (
                            <button
                              key={e.path}
                              aria-label={`Abrir foto ${e.title || e.name}`}
                              onClick={() => void open(e.path)}
                            >
                              <img
                                src={e.mediaUrl}
                                alt={e.title || e.name}
                                loading="lazy"
                              />
                              <span>{e.title || e.name}</span>
                            </button>
                          ))}
                      </div>
                      <small>
                        {entries.filter((e) => e.mediaUrl).length} imágenes
                      </small>
                    </div>
                    <h2 className="mobile-origin-heading">
                      Archivos de origen
                    </h2>
                  </>
                )}
                {entries
                  .filter(
                    (e) =>
                      (app === "files" ||
                        e.app === (app === "records" ? "settings" : app)) &&
                      !(app === "gallery" && e.mediaUrl),
                  )
                  .map((e) => (
                    <button
                      className="mobile-evidence-row"
                      key={e.path}
                      onClick={() => void open(e.path)}
                    >
                      <strong>{e.name}</strong>
                      <small>{e.path.slice(ROOT.length + 1)}</small>
                    </button>
                  ))}
                {entries.length === 0 && <p>No hay evidencias disponibles.</p>}
              </>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
