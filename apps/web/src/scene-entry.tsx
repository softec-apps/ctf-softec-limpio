import { prepareRegistration } from "./registration/prepareRegistration";
import {
  stationForChallenge,
  stationEvidenceRoot,
} from "../../../packages/specialist-contracts";
import { StrictMode, Suspense, lazy, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import CompetitionNotice from "./competition/CompetitionNotice";
import {
  ArrowRight,
  ArrowLeft,
  Flag,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  Trophy,
} from "lucide-react";
import {
  api,
  post,
  ApiError,
  type User,
  type Game,
  type Challenge,
} from "./api";
import ChallengeCatalog from "./challenges/ChallengeCatalog";
import { Ranking } from "./CompetitionViews";
import "./style.css";
import "./world.css";
import "./entrance/entrance.css";
import type { WorldView } from "./LabWorld";
const EntranceHall = lazy(() => import("./entrance/EntranceHall"));
const LabWorld = lazy(() => import("./LabWorld"));
const Workstation = lazy(() => import("./Workstation"));
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operación.";

function ComputerGate({
  onUser,
  onLeave,
}: {
  onUser: (u: User) => void;
  onLeave: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [alias, setAlias] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pendingRegistration = useRef<AbortController | null>(null);
  const [website, setWebsite] = useState("");
  useEffect(() => () => pendingRegistration.current?.abort(), []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const controller = new AbortController();
      pendingRegistration.current = controller;
      const proof =
        mode === "register"
          ? await prepareRegistration(controller.signal)
          : undefined;
      const response = await post(
        mode === "login" ? "/auth/login" : "/auth/register",
        mode === "register"
          ? { alias, password, proof, website }
          : { alias, password },
      );
      onUser(response.user);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="monitor-gate">
      <div className="gate-brand">
        <div className="gate-monogram">7</div>
        <span>
          SEVENTECH<small>Capture the flag</small>
        </span>
        <button className="gate-leave" onClick={onLeave}>
          <ArrowLeft size={14} />
          Salir del laboratorio
        </button>
      </div>
      <div className="gate-presentation">
        <span className="gate-kicker">
          Estación 01 / Laboratorio de investigación
        </span>
        <h1>
          La puerta está abierta.
          <br />
          Tu investigación empieza aquí.
        </h1>
        <p>
          Usa este computador para explorar las misiones, analizar la evidencia
          y conservar tu progreso.
        </p>
        <div className="gate-code-art" aria-hidden="true">
          <span>seventech@lab:~$</span>
          <span>./iniciar_investigacion</span>
          <i />
          <span>Un escenario por investigar</span>
          <strong>objetos · documentos · pistas</strong>
        </div>
        <span className="gate-footnote">
          <ShieldCheck size={15} />
          Entorno de entrenamiento autorizado
        </span>
      </div>
      <section className="monitor-access" aria-label="Acceso al computador">
        <>
          <span className="gate-section">
            <LockKeyhole size={15} />
            Computador del laboratorio
          </span>
          <h2 id="gate-title">
            {mode === "login" ? "Identifica tu acceso" : "Crea tu identidad"}
          </h2>
          <p>
            {mode === "login"
              ? "Tu cuenta abre las misiones y conserva tu progreso."
              : "El alias identificará tus resultados. El acceso de la puerta se guardará en tu cuenta."}
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <div hidden aria-hidden="true">
                <label>
                  Sitio web
                  <input
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </label>
              </div>
            )}
            <label>
              Alias
              <input
                required
                value={alias}
                minLength={3}
                maxLength={24}
                pattern="[a-z0-9_-]+"
                onChange={(event) => setAlias(event.target.value)}
                autoComplete="username"
                placeholder="Tu alias"
              />
            </label>
            <label>
              Contraseña
              <input
                required
                type="password"
                value={password}
                minLength={mode === "register" ? 6 : 1}
                maxLength={128}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                placeholder={
                  mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"
                }
              />
            </label>
            {error && (
              <p className="gate-error" role="alert">
                {error}
              </p>
            )}
            <button className="gate-submit" disabled={busy}>
              {busy
                ? "Verificando…"
                : mode === "login"
                  ? "Iniciar sesión"
                  : "Crear cuenta"}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>
          <button
            className="gate-switch"
            disabled={busy}
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setPassword("");
            }}
          >
            {mode === "login" ? "Crear una cuenta" : "Ya tengo una cuenta"}
            <ArrowRight size={14} />
          </button>
        </>
      </section>
      <footer className="gate-systembar">
        <span>
          <span />
          Seventech CTF
        </span>
        <span>Estación del participante</span>
      </footer>
    </div>
  );
}

function ComputerSystem({
  onLeave,
  onExplore,
  investigation,
}: {
  onLeave: () => void;
  onExplore: (id: string) => void;
  investigation?: { id: string; sequence: number };
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<"missions" | "ranking">("missions");
  const [request, setRequest] = useState<{
    id: "terminal" | "mission" | "files" | "browser" | "ffuf" | "ctf";
    sequence: number;
    path?: string;
  }>();
  const handledInvestigation = useRef(0);
  useEffect(() => {
    if (
      !investigation ||
      !game ||
      !user ||
      handledInvestigation.current === investigation.sequence
    )
      return;
    handledInvestigation.current = investigation.sequence;
    const target = game.challenges.find(
      (entry) => entry.id === investigation.id,
    );
    if (target)
      launch(
        target,
        target.id.startsWith("files-") ||
          (stationForChallenge(target.id) &&
            !stationForChallenge(target.id)?.serviceHost)
          ? "files"
          : target.id.startsWith("network-")
            ? "mission"
            : "browser",
      );
    else setError("Este expediente ya no está disponible.");
  }, [investigation, game, user]);
  async function session() {
    setLoading(true);
    setError("");
    try {
      const r = await api("/me");
      setUser(r.user);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401))
        setError("No se pudo conectar con el servidor del CTF.");
    } finally {
      setLoading(false);
    }
  }
  async function refresh() {
    try {
      setGame(await api<Game>("/game"));
      window.dispatchEvent(new Event("ctf-ranking-changed"));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    const syncSession = () => {
      void session();
    };
    syncSession();
    window.addEventListener("ctf-session-changed", syncSession);
    const syncProgress = () => {
      void refresh();
    };
    window.addEventListener("ctf-progress-changed", syncProgress);
    window.addEventListener("ctf-competition-changed", syncProgress);
    return () => {
      window.removeEventListener("ctf-session-changed", syncSession);
      window.removeEventListener("ctf-progress-changed", syncProgress);
      window.removeEventListener("ctf-competition-changed", syncProgress);
    };
  }, []);
  useEffect(() => {
    if (user) void refresh();
    else setGame(null);
  }, [user?.id]);
  const challenge =
    game?.challenges.find((c) => c.id === selected) ?? game?.challenges[0];
  function launch(
    c: Challenge,
    id:
      | "terminal"
      | "mission"
      | "files"
      | "browser"
      | "ffuf"
      | "archive"
      | "station",
  ) {
    const station = stationForChallenge(c.id);
    if (
      /^wireless-(08|09|10)$/.test(c.id) &&
      ["files", "terminal"].includes(id)
    )
      id = "mission";
    if (id === "station") {
      if (station) onExplore(station.id);
      return;
    }
    if (id === "archive") {
      onExplore("archive");
      return;
    }
    if (c.device === "entrance" && id !== "mission") {
      onExplore("entrance");
      return;
    }
    if (c.id.startsWith("network-")) {
      onExplore("rack");
      window.dispatchEvent(
        new CustomEvent("ctf-network-open", { detail: { id: c.id } }),
      );
      return;
    }
    if (c.device === "phone") {
      onExplore("phone");
      return;
    }
    if (c.device === "laptop") {
      onExplore("laptop");
      return;
    }
    if (c.device === "scene" && id !== "mission") {
      onExplore("room");
      return;
    }
    setSelected(c.id);
    setRequest((r) => ({
      id: c.category.startsWith("Linux") ? "terminal" : id,
      path:
        id === "files" && station
          ? stationEvidenceRoot(c.id)
          : (c.id.startsWith("stego-") ||
                c.id.startsWith("reverse-") ||
                c.id.startsWith("files-") ||
                c.id.startsWith("investigation-") ||
                c.id.startsWith("iot-") ||
                c.id.startsWith("ot-")) &&
              id === "files"
            ? `/home/analista/${c.id.startsWith("files-") ? "archivos" : c.id.startsWith("ot-") ? "ot" : c.id.startsWith("iot-") ? "iot" : c.id.startsWith("reverse-") ? "ingenieria-inversa" : c.id.startsWith("investigation-") ? "investigacion" : "esteganografia"}/caso-${c.id.slice(-2)}`
            : undefined,
      sequence: (r?.sequence ?? 0) + 1,
    }));
  }
  async function logout() {
    try {
      await post("/auth/logout");
      setUser(null);
      setGame(null);
      setSelected("");
      setRequest(undefined);
      setTab("missions");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (loading)
    return (
      <div className="monitor-loading">
        <TerminalSquare size={38} />
        <h1>Seventech</h1>
        <p>Conectando con el laboratorio…</p>
        <button onClick={() => onExplore("entrance")}>
          Salir del laboratorio
        </button>
      </div>
    );
  if (!user)
    return error ? (
      <div className="monitor-loading">
        <p role="alert">{error}</p>
        <button onClick={() => void session()}>Volver a intentar</button>
        <button onClick={() => onExplore("entrance")}>
          Salir del laboratorio
        </button>
      </div>
    ) : (
      <ComputerGate
        onLeave={() => onExplore("entrance")}
        onUser={(u) => {
          setUser(u);
          setTab("missions");
        }}
      />
    );
  const portal = (
    <div className="ctf-portal">
      <header className="ctf-portal-header">
        <div>
          <ShieldCheck size={23} />
          <span>
            <strong>Seventech</strong>
            <small>Capture the flag</small>
          </span>
        </div>
        <span className="portal-score">
          <Flag size={14} />
          {game?.score ?? 0} puntos
        </span>
        <div className="portal-identity">
          <span>
            {user.alias}
            <small>
              {user.role === "ADMIN" ? "Administrador" : "Participante"}
            </small>
          </span>
          <button
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            onClick={() => void logout()}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <nav className="portal-nav" aria-label="Secciones del sistema CTF">
        <button
          className={tab === "missions" ? "active" : ""}
          onClick={() => {
            setTab("missions");
            void refresh();
          }}
        >
          <Flag size={15} />
          Retos
        </button>
        <button
          className={tab === "ranking" ? "active" : ""}
          onClick={() => setTab("ranking")}
        >
          <Trophy size={15} />
          Clasificación
        </button>
        <button
          className="portal-refresh"
          onClick={() => void refresh()}
          aria-label="Actualizar progreso"
        >
          <RefreshCw size={14} />
        </button>
      </nav>
      <div className="portal-content">
        {tab === "missions" && (
          <CompetitionNotice competition={game?.competition} />
        )}
        {error && (
          <p className="gate-error" role="alert">
            {error}
          </p>
        )}
        {tab === "ranking" ? (
          <Ranking />
        ) : (
          <ChallengeCatalog
            challenges={game?.challenges ?? []}
            solvedIds={game?.solves.map((solve) => solve.challengeId) ?? []}
            loading={!game}
            onLaunch={launch}
          />
        )}
      </div>
      <footer className="portal-footer">
        <span>El progreso se valida y guarda en el servidor.</span>
        <button onClick={onLeave}>
          <ArrowLeft size={13} />
          Volver a la sala
        </button>
      </footer>
    </div>
  );
  return (
    <Suspense
      fallback={<div className="monitor-loading">Abriendo escritorio…</div>}
    >
      <Workstation
        key={user.id}
        embedded
        alias={user.alias}
        challenge={challenge}
        challenges={game?.challenges ?? []}
        solvedChallengeIds={
          game?.solves.map((solve) => solve.challengeId) ?? []
        }
        onClose={onLeave}
        onSolved={() => void refresh()}
        portal={portal}
        launchRequest={request}
      />
    </Suspense>
  );
}

function SceneApp() {
  const [phase, setPhase] = useState<"checking" | "hall" | "office">(
    "checking",
  );
  const [welcome, setWelcome] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exitError, setExitError] = useState("");
  const exitPending = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    void api<{ opened: boolean }>("/entrance", { signal: abort.signal })
      .then((result) => {
        if (!abort.signal.aborted) setPhase(result.opened ? "office" : "hall");
      })
      .catch(() => {
        if (!abort.signal.aborted) setPhase("hall");
      });
    return () => abort.abort();
  }, []);

  const [investigation, setInvestigation] = useState<{
    id: string;
    sequence: number;
  }>();
  const [view, setView] = useState<WorldView>("room");
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !e.defaultPrevented &&
        !document.querySelector("dialog:modal")
      )
        setView("room");
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  async function leaveOffice() {
    if (exitPending.current) return;
    exitPending.current = true;
    setExiting(true);
    setExitError("");
    try {
      await api("/entrance/leave", {
        method: "POST",
        body: "{}",
        signal: AbortSignal.timeout(5000),
      });
      setPhase("hall");
      setWelcome(false);
      setView("room");
    } catch (error) {
      setExitError(errorMessage(error));
    } finally {
      exitPending.current = false;
      setExiting(false);
    }
  }
  function explore(next: WorldView) {
    if (next === "entrance") {
      void leaveOffice();
      return;
    }
    if (next === "computer") setWelcome(false);
    setView(next);
  }
  if (phase === "checking")
    return (
      <div className="entrance-loading">
        <p>Preparando el acceso…</p>
      </div>
    );
  if (phase === "hall")
    return (
      <Suspense
        fallback={
          <div className="entrance-loading">
            <p>Preparando el pasillo…</p>
          </div>
        }
      >
        <EntranceHall
          onOpened={() => {
            setPhase("office");
            setView("room");
            setWelcome(true);
          }}
        />
      </Suspense>
    );
  return (
    <>
      {view === "room" && (
        <button
          className="office-exit-control"
          onClick={() => void leaveOffice()}
          disabled={exiting}
        >
          <ArrowLeft size={16} />
          {exiting ? "Volviendo al pasillo…" : "Salir del laboratorio"}
        </button>
      )}
      {exitError && (
        <p className="office-exit-error" role="alert">
          {exitError}
          <button onClick={() => void leaveOffice()} disabled={exiting}>
            Volver a intentar salir
          </button>
        </p>
      )}
      {welcome && view === "room" && (
        <aside
          className="office-entry-notice"
          aria-label="Acceso al laboratorio"
          role="status"
        >
          <strong>Puerta abierta.</strong>
          <p>Usa el computador del laboratorio para continuar.</p>
          <button onClick={() => explore("computer")}>Usar computador</button>
        </aside>
      )}
      <Suspense
        fallback={
          <div className="world-loading">
            <TerminalSquare size={36} />
            <h1>Seventech</h1>
            <p>Preparando el escenario…</p>
          </div>
        }
      >
        <LabWorld
          view={view}
          onView={explore}
          onInvestigate={(id) => {
            setInvestigation((current) => ({
              id,
              sequence: (current?.sequence ?? 0) + 1,
            }));
            setView("computer");
          }}
          screen={
            <ComputerSystem
              onLeave={() => setView("room")}
              onExplore={explore}
              investigation={investigation}
            />
          }
        />
      </Suspense>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SceneApp />
  </StrictMode>,
);
