import FlagInput from "./challenges/FlagInput";
import { completeFlag } from "./challenges/flag-format";
import { stationEvidenceRoot } from "../../../packages/specialist-contracts";
import DocumentViewer from "./evidence/DocumentViewer";
import WirelessWorkbench from "./wireless/WirelessWorkbench";
import {
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowUp,
  BatteryFull,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Flag,
  Folder,
  FolderOpen,
  Globe,
  Home,
  Maximize2,
  Minus,
  Monitor,
  Power,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Square,
  TerminalSquare,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import { api, post, type Challenge } from "./api";
import "./workstation.css";
import WebLabBrowser from "./web-lab/WebLabBrowser";
import { WEB_CHALLENGE_ID, hasBrowserLab } from "./web-lab/catalog";
import {
  applications,
  applicationGroups,
  isToolApp,
  type AppId,
} from "./desktop/applications";
import BrowserHome from "./desktop/BrowserHome";
import ApplicationsMenu from "./desktop/ApplicationsMenu";
import type {
  ComparisonDocument,
  ComparisonDraft,
  ComparisonSide,
} from "./web-lab/toolkit/lineComparison";
const VpnApplication = lazy(() => import("./linux-network/VpnApplication"));
const OtApplication = lazy(() => import("./ot/OtApplication"));
const PrinterApplication = lazy(() => import("./printer/PrinterApplication"));
const PrivilegedConsole = lazy(() => import("./privileged/PrivilegedConsole"));
const Terminal = lazy(() => import("./Terminal"));
const ToolApplication = lazy(() => import("./desktop/ToolApplication"));
type WindowId = AppId | `editor:${number}`;
const windowApplication = (id: WindowId): AppId =>
  id.startsWith("editor:") ? "editor" : (id as AppId);
type WindowState = {
  x: number;
  y: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  challengeId?: string;
  document?: { path: string; name: string; content: string };
};
type Entry = { name: string; type: "file" | "directory" };
type FileResult =
  | { type: "directory"; path: string; entries: Entry[] }
  | {
      type: "file";
      path: string;
      name: string;
      content?: string;
      mime?: string;
      assetUrl?: string;
    };
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operación.";

function FileManager({
  onFile,
  onMediaFile,
  request,
}: {
  onFile: (name: string, content: string, path: string) => void;
  onMediaFile: (path: string, mime: string) => void;
  request?: { path?: string; sequence: number };
}) {
  function receive(r: Extract<FileResult, { type: "file" }>) {
    if (r.assetUrl && r.mime !== "text/plain")
      onMediaFile(r.path, r.mime ?? "application/octet-stream");
    else if (typeof r.content === "string") onFile(r.name, r.content, r.path);
  }
  const [path, setPath] = useState("/home/analista");
  const [input, setInput] = useState(path);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (request?.path) {
      setPath(request.path);
      setInput(request.path);
      setRefresh((n) => n + 1);
    }
  }, [request?.sequence]);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    void api<FileResult>(`/workstation/files?path=${encodeURIComponent(path)}`)
      .then((r) => {
        if (!active) return;
        if (r.type === "directory") {
          setEntries(r.entries);
          setPath(r.path);
          setInput(r.path);
        } else {
          receive(r);
          setPath(r.path.slice(0, r.path.lastIndexOf("/")) || "/");
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [path, refresh]);
  async function open(entry: Entry) {
    if (entry.type === "directory") {
      setPath(path + "/" + entry.name);
      return;
    }
    setError("");
    try {
      const r = await api<FileResult>(
        `/workstation/files?path=${encodeURIComponent(path + "/" + entry.name)}`,
      );
      if (r.type === "file") receive(r);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <div className="file-manager">
      <div className="file-toolbar">
        <button
          title="Carpeta superior"
          aria-label="Ir a la carpeta superior"
          disabled={path === "/"}
          onClick={() => setPath(path.slice(0, path.lastIndexOf("/")) || "/")}
        >
          <ArrowUp size={17} />
        </button>
        <button
          title="Carpeta personal"
          aria-label="Ir a la carpeta personal"
          onClick={() => setPath("/home/analista")}
        >
          <Home size={17} />
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPath(input);
            setRefresh((n) => n + 1);
          }}
        >
          <Folder size={15} />
          <input
            aria-label="Ruta del explorador"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={256}
          />
        </form>
        <button
          title="Actualizar carpeta"
          aria-label="Actualizar carpeta"
          onClick={() => setRefresh((n) => n + 1)}
          disabled={busy}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="file-manager-main">
        <aside className="file-places">
          <span>Lugares</span>
          <button
            className={path === "/home/analista" ? "selected" : ""}
            onClick={() => setPath("/home/analista")}
          >
            <Home size={16} />
            Carpeta personal
          </button>
          <button
            className={
              path.startsWith("/home/analista/criptografia") ? "selected" : ""
            }
            onClick={() => setPath("/home/analista/criptografia")}
          >
            <FolderOpen size={16} />
            Criptografía
          </button>
          <button
            className={
              path.startsWith("/home/analista/servicios") ? "selected" : ""
            }
            onClick={() => setPath("/home/analista/servicios")}
          >
            <FolderOpen size={16} />
            Servicios
          </button>
          <button
            className={
              path.startsWith("/home/analista/documentos") ? "selected" : ""
            }
            onClick={() => setPath("/home/analista/documentos")}
          >
            <FolderOpen size={16} />
            Documentos
          </button>
          <span className="file-device-label">Dispositivos</span>
          <button
            className={path === "/" ? "selected" : ""}
            onClick={() => setPath("/")}
          >
            <Monitor size={16} />
            Equipo virtual
          </button>
        </aside>
        <section
          className="file-grid"
          aria-label="Archivos de la carpeta"
          aria-busy={busy}
        >
          {error ? (
            <p className="file-error" role="alert">
              {error}
              <button onClick={() => setPath("/home/analista")}>
                Volver a la carpeta personal
              </button>
            </p>
          ) : busy ? (
            <p className="file-loading">Leyendo archivos…</p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.name}
                className="file-entry"
                onClick={() => void open(entry)}
                title={`Abrir ${entry.name}`}
              >
                {entry.type === "directory" ? (
                  <Folder className="folder-icon" size={49} strokeWidth={1.2} />
                ) : (
                  <FileText
                    className="document-icon"
                    size={44}
                    strokeWidth={1.3}
                  />
                )}
                <span>{entry.name}</span>
              </button>
            ))
          )}
        </section>
      </div>
      <footer className="file-status">
        <span>{busy ? "Leyendo…" : `${entries.length} elementos`}</span>
        <span>{path}</span>
      </footer>
    </div>
  );
}

function Mission({
  challenge,
  initialSolved,
  onSolved,
  onOpen,
}: {
  challenge: Challenge;
  initialSolved: boolean;
  onSolved: () => void;
  onOpen: (id: AppId) => void;
}) {
  const [flag, setFlag] = useState("");
  const [notice, setNotice] = useState("");
  const [correct, setCorrect] = useState(initialSolved);
  const [debrief, setDebrief] = useState<{
      reference: string;
      weakness: string;
      defense: string;
    }>(),
    [debriefError, setDebriefError] = useState("");
  useEffect(() => {
    if (!correct || challenge.device !== "ot") return;
    const controller = new AbortController();
    void api<{ reference: string; weakness: string; defense: string }>(
      `/challenges/${challenge.id}/debrief`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setDebrief(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setDebriefError(errorMessage(e));
      });
    return () => controller.abort();
  }, [correct, challenge.id]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (initialSolved) setCorrect(true);
  }, [initialSolved]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || correct || initialSolved) return;
    setBusy(true);
    try {
      const r = await post(`/challenges/${challenge.id}/submissions`, {
        flag: completeFlag(flag),
      });
      setNotice(r.message);
      if (r.correct) {
        setCorrect(true);
        onSolved();
      }
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="desktop-mission">
      <div className="mission-app-header">
        <span className="mission-app-badge">
          <ShieldCheck size={16} />
          Seventech CTF
        </span>
        <span className={correct ? "mission-chip complete" : "mission-chip"}>
          {correct ? "Resuelta" : "En investigación"}
        </span>
      </div>
      <h2>{challenge.title}</h2>
      <p>{challenge.description}</p>
      {/^wireless-(08|09|10)$/.test(challenge.id) && (
        <WirelessWorkbench key={challenge.id} challengeId={challenge.id} />
      )}
      <div className="mission-brief">
        <div>
          <span>Categoría</span>
          <strong>{challenge.category}</strong>
        </div>
        <div>
          <span>Recompensa</span>
          <strong>{challenge.points} puntos</strong>
        </div>
      </div>
      {(hasBrowserLab(challenge.id) ||
        challenge.device === "printer" ||
        challenge.device === "ot") && (
        <div className="mission-app-actions">
          <button onClick={() => onOpen("browser")}>
            <Globe size={17} /> Visitar servicio <ChevronRight size={15} />
          </button>
        </div>
      )}
      {correct || initialSolved ? (
        <div className="mission-solved" role="status">
          <Check size={22} aria-hidden="true" />
          <div>
            <strong>Este reto ya está resuelto.</strong>
            <p>
              {challenge.points}{" "}
              {challenge.points === 1 ? "punto obtenido" : "puntos obtenidos"}
            </p>
          </div>
        </div>
      ) : challenge.device === "entrance" ? (
        <div className="mission-brief">
          <p>
            {correct
              ? "La puerta del laboratorio ya está abierta. Continúa con los demás retos desde este computador."
              : "Este reto se completa abriendo la puerta del pasillo. Sus puntos se guardan automáticamente en tu cuenta; no requiere entregar una flag."}
          </p>
        </div>
      ) : challenge.id.startsWith("network-") ? (
        <div className="mission-brief">
          <p>
            Esta incidencia se resuelve desde Rack → Administrar red. Configura
            los dispositivos y usa Validar red. Las capturas históricas quedan
            disponibles para consulta.
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="desktop-flag">
            Entregar evidencia
            <FlagInput
              id="desktop-flag"
              value={flag}
              onChange={setFlag}
              disabled={busy}
            />
          </label>
          <button className="desktop-submit" disabled={busy}>
            {busy ? (
              "Verificando…"
            ) : (
              <>
                <span>Validar flag</span>
                <Flag size={16} />
              </>
            )}
          </button>
        </form>
      )}
      {debrief && (
        <aside className="mission-brief" aria-label="Análisis del reto OT">
          <h3>Vulnerabilidad y defensa</h3>
          <p>
            <a href={debrief.reference} target="_blank" rel="noreferrer">
              {debrief.weakness} · Referencia técnica
            </a>
          </p>
          <p>{debrief.defense}</p>
        </aside>
      )}
      {debriefError && <p role="alert">{debriefError}</p>}
      {notice && !correct && (
        <p
          className={correct ? "desktop-feedback success" : "desktop-feedback"}
          role="status"
        >
          {notice}
        </p>
      )}
    </div>
  );
}

function DesktopClock() {
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      setClock(new Date());
      timer = setTimeout(update, 60000 - (Date.now() % 60000));
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <time dateTime={clock.toISOString()}>
      {clock.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}
    </time>
  );
}

export default function Workstation({
  challenge: assignedChallenge,
  challenges,
  solvedChallengeIds,
  alias,
  onClose,
  onSolved,
  embedded = false,
  portal,
  launchRequest,
}: {
  challenge?: Challenge;
  challenges: Challenge[];
  solvedChallengeIds: string[];
  alias: string;
  onClose: () => void;
  onSolved: () => void;
  embedded?: boolean;
  portal?: ReactNode;
  launchRequest?: {
    id:
      "terminal" | "mission" | "files" | "browser" | "ffuf" | "packets" | "ctf";
    sequence: number;
    path?: string;
  };
}) {
  const challenge = assignedChallenge ?? {
    id: "unassigned",
    difficulty: "easy" as const,
    title: "Sin misión asignada",
    description: "Consulta los retos disponibles en Seventech CTF.",
    category: "",
    device: "computer",
    points: 0,
    enabled: false,
  };
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const zIndex = useRef(20);
  const drag = useRef<{
    id: WindowId;
    px: number;
    py: number;
    x: number;
    y: number;
  } | null>(null);
  const [windows, setWindows] = useState<
    Partial<Record<WindowId, WindowState>>
  >(
    embedded
      ? {}
      : {
          terminal: {
            x: 110,
            y: 45,
            z: 20,
            minimized: false,
            maximized: false,
            challengeId: challenge.id,
          },
        },
  );
  const [maintenanceUrl, setMaintenanceUrl] = useState<string>();
  const [printerWebOpen, setPrinterWebOpen] = useState(false);
  const [otWebOpen, setOtWebOpen] = useState(false);
  const mediaSequence = useRef(0);
  const [mediaRequests, setMediaRequests] = useState<
    Partial<Record<AppId, { path: string; sequence: number }>>
  >({});
  function mediaOpened(path: string, mime: string) {
    const id: AppId =
      mime === "application/wasm"
        ? "reverse"
        : mime.startsWith("image/")
          ? "image"
          : mime.startsWith("audio/")
            ? "audio"
            : "hex";
    setMediaRequests((current) => ({
      ...current,
      [id]: { path, sequence: ++mediaSequence.current },
    }));
    open(id);
  }
  const [comparison, setComparison] = useState<ComparisonDraft>({
    left: { label: "", text: "" },
    right: { label: "", text: "" },
  });
  const ffufAvailable = challenges.some(
    (entry) => entry.id === WEB_CHALLENGE_ID,
  );
  const visibleApplication = (id: AppId) =>
    id === "ctf" ? !!portal : id === "ffuf" ? ffufAvailable : true;
  function receiveComparison(
    side: ComparisonSide,
    document: ComparisonDocument,
  ) {
    setComparison((current) => ({ ...current, [side]: document }));
    open("compare");
  }
  const [menu, setMenu] = useState(false);
  const dismissApplications = useCallback(() => setMenu(false), []);
  const documentSequence = useRef(0);
  useEffect(() => {
    if (launchRequest) open(launchRequest.id, challenge.id);
  }, [launchRequest?.sequence]);
  useEffect(() => {
    const d = dialog.current;
    if (!embedded) d?.showModal();
    const before = document.body.style.overflow;
    if (!embedded) document.body.style.overflow = "hidden";
    return () => {
      if (!embedded) document.body.style.overflow = before;
      d?.close();
    };
  }, []);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setWindows((current) => {
        let changed = false;
        const result = { ...current };
        for (const id of Object.keys(current) as WindowId[]) {
          const state = current[id]!;
          if (state.maximized || state.minimized) continue;
          const windowElement = element.querySelector<HTMLElement>(
            `[data-window="${id}"]`,
          );
          const x = Math.max(
            0,
            Math.min(
              state.x,
              element.clientWidth - (windowElement?.offsetWidth ?? 740),
            ),
          );
          const y = Math.max(
            0,
            Math.min(
              state.y,
              element.clientHeight - (windowElement?.offsetHeight ?? 450),
            ),
          );
          if (x !== state.x || y !== state.y) {
            result[id] = { ...state, x, y };
            changed = true;
          }
        }
        return changed ? result : current;
      }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function centerWindow(id: WindowId) {
    const bounds = stage.current;
    const el = bounds?.querySelector<HTMLElement>(`[data-window="${id}"]`);
    if (!bounds || !el) return;
    setWindows((w) => ({
      ...w,
      [id]: {
        ...w[id]!,
        x: Math.max(0, (bounds.clientWidth - el.offsetWidth) / 2),
        y: Math.max(0, (bounds.clientHeight - el.offsetHeight) / 2),
        maximized: false,
        z: ++zIndex.current,
      },
    }));
  }
  function focus(id: WindowId) {
    setWindows((w) =>
      w[id] ? { ...w, [id]: { ...w[id]!, z: ++zIndex.current } } : w,
    );
  }
  function open(id: WindowId, requestedChallengeId?: string) {
    if (id === "browser" && requestedChallengeId) {
      setMaintenanceUrl(undefined);
      setPrinterWebOpen(requestedChallengeId.startsWith("iot-"));
      setOtWebOpen(requestedChallengeId.startsWith("ot-"));
    }
    const context =
      challenges.find((entry) => entry.id === requestedChallengeId) ??
      challenge;
    if (id === "memory" && context.id.startsWith("memory-")) {
      setMediaRequests((previous) => ({
        ...previous,
        memory: {
          path:
            stationEvidenceRoot(context.id) + "/evidencia/snapshot.memory.json",
          sequence: ++mediaSequence.current,
        },
      }));
    }
    if (!context.enabled && id === "mission") id = "ctf";
    if (id === "ffuf" && !ffufAvailable) return;
    setMenu(false);
    const application = applications[windowApplication(id)];
    const size = [application.width, application.height];
    setWindows((w) => ({
      ...w,
      [id]: w[id]
        ? {
            ...w[id]!,
            minimized: false,
            z: ++zIndex.current,
            ...(requestedChallengeId
              ? { challengeId: requestedChallengeId }
              : {}),
          }
        : {
            x: Math.min(
              190 + Object.keys(w).length * 28,
              Math.max(10, (stage.current?.clientWidth ?? 900) - size[0] - 10),
            ),
            y: Math.min(
              45 + Object.keys(w).length * 25,
              120,
              Math.max(10, (stage.current?.clientHeight ?? 700) - size[1] - 10),
            ),
            z: ++zIndex.current,
            minimized: false,
            maximized: false,
            challengeId:
              id === "ffuf"
                ? WEB_CHALLENGE_ID
                : (requestedChallengeId ?? challenge.id),
          },
    }));
  }
  function openVpnTerminal() {
    open("terminal", windows.terminal ? undefined : "primer-rastro");
  }
  function close(id: WindowId) {
    setWindows((w) => {
      const next = { ...w };
      delete next[id];
      return next;
    });
  }
  function toggleMinimize(id: WindowId) {
    setWindows((w) => ({
      ...w,
      [id]: { ...w[id]!, minimized: !w[id]!.minimized, z: ++zIndex.current },
    }));
  }
  function maximize(id: WindowId) {
    setWindows((w) => ({
      ...w,
      [id]: { ...w[id]!, maximized: !w[id]!.maximized, z: ++zIndex.current },
    }));
  }
  function startDrag(e: ReactPointerEvent<HTMLDivElement>, id: WindowId) {
    if (
      (e.target as HTMLElement).closest("button") ||
      windows[id]?.maximized ||
      window.matchMedia("(max-width: 700px)").matches
    )
      return;
    const state = windows[id]!;
    drag.current = { id, px: e.clientX, py: e.clientY, x: state.x, y: state.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    focus(id);
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || !stage.current) return;
    const d = drag.current;
    const element = stage.current.querySelector<HTMLElement>(
      `[data-window="${d.id}"]`,
    );
    const x = Math.max(
      0,
      Math.min(
        stage.current.clientWidth - (element?.offsetWidth ?? 300),
        d.x + e.clientX - d.px,
      ),
    );
    const y = Math.max(
      0,
      Math.min(stage.current.clientHeight - 80, d.y + e.clientY - d.py),
    );
    setWindows((w) => ({ ...w, [d.id]: { ...w[d.id]!, x, y } }));
  }
  const fileOpened = (name: string, content: string, path: string) => {
    const newId: WindowId = `editor:${++documentSequence.current}`;
    const z = ++zIndex.current;
    setWindows((current) => {
      const existingId = (Object.keys(current) as WindowId[]).find(
        (id) => current[id]?.document?.path === path,
      );
      if (existingId)
        return {
          ...current,
          [existingId]: { ...current[existingId]!, minimized: false, z },
        };
      const count = Object.keys(current).length;
      return {
        ...current,
        [newId]: {
          x: Math.min(
            40 + (count % 6) * 35,
            Math.max(
              0,
              (stage.current?.clientWidth ?? 900) - applications.editor.width,
            ),
          ),
          y: Math.min(
            25 + (count % 6) * 30,
            Math.max(
              0,
              (stage.current?.clientHeight ?? 700) - applications.editor.height,
            ),
          ),
          z,
          minimized: false,
          maximized: false,
          document: { path, name, content },
        },
      };
    });
  };
  const ordered = Object.keys(windows) as WindowId[];
  const visible = ordered.filter((id) => !windows[id]!.minimized);
  const active = visible.sort((a, b) => windows[b]!.z - windows[a]!.z)[0];
  return (
    <dialog
      ref={dialog}
      open={embedded || undefined}
      className={
        embedded
          ? "workstation-dialog workstation-embedded"
          : "workstation-dialog"
      }
      aria-label="Escritorio del laboratorio CTF Seventech"
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        if (menu) setMenu(false);
        else onClose();
      }}
    >
      <div className="linux-desktop">
        <header className="linux-panel">
          <div className="panel-apps">
            <button
              className={
                menu ? "applications-button is-open" : "applications-button"
              }
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-controls="applications-menu"
            >
              <span className="seven-mark">7</span>
              <span>Aplicaciones</span>
              <ChevronDown size={12} />
            </button>
            <span className="panel-divider" />
            <button
              className="panel-launcher"
              title="Abrir terminal"
              aria-label="Abrir terminal"
              onClick={() => open("terminal")}
            >
              <TerminalSquare size={18} />
            </button>
            <button
              className="panel-launcher"
              title="Abrir archivos"
              aria-label="Abrir archivos"
              onClick={() => open("files")}
            >
              <FolderOpen size={18} />
            </button>
            <button
              className="panel-launcher"
              title="Abrir intranet"
              aria-label="Abrir intranet"
              onClick={() => open("browser")}
            >
              <Globe size={18} />
            </button>
            <button
              className="panel-launcher panel-labeled"
              title="Abrir retos"
              aria-label="Abrir retos"
              onClick={() => open("ctf")}
            >
              <Flag size={18} />
              <span>Retos</span>
            </button>
            <button
              className="panel-launcher"
              title="Abrir inspector HTTP"
              aria-label="Abrir inspector HTTP"
              onClick={() => open("http")}
            >
              <Globe size={18} />
            </button>
            {ffufAvailable && (
              <button
                className="panel-launcher panel-labeled"
                title="Abrir ffuf"
                aria-label="Abrir ffuf"
                onClick={() => open("ffuf")}
              >
                <ScanSearch size={18} />
                <span>ffuf</span>
              </button>
            )}
            <span className="workspace-index">1</span>
            <span className="desktop-panel-title">Seventech CTF</span>
          </div>
          <div className="panel-indicators">
            <Wifi size={15} aria-label="Conexión con el laboratorio" />
            <Volume2 size={15} aria-hidden="true" />
            <BatteryFull size={18} aria-hidden="true" />
            <DesktopClock />
            <button
              className="panel-exit"
              title="Volver al escenario"
              onClick={onClose}
            >
              <Power size={16} />
              <span>Salir del equipo</span>
            </button>
          </div>
        </header>
        <div
          ref={stage}
          className="desktop-stage"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setMenu(false);
          }}
        >
          <div className="desktop-wallpaper" aria-hidden="true">
            <svg viewBox="0 0 1100 700" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient
                  id="wall-blue"
                  x1="0%"
                  y1="100%"
                  x2="100%"
                  y2="0%"
                >
                  <stop stopColor="#071424" />
                  <stop offset=".55" stopColor="#163e70" />
                  <stop offset="1" stopColor="#0b1d37" />
                </linearGradient>
                <linearGradient id="seven-blue">
                  <stop stopColor="#4296e5" />
                  <stop offset="1" stopColor="#8fd3ff" />
                </linearGradient>
              </defs>
              <path fill="url(#wall-blue)" d="M0 0H1100V700H0Z" />
              <g fill="none" stroke="#83bdf2" strokeWidth="1" opacity=".13">
                <path d="M-150 650 800-60M-80 710 950-60M100 750 1100-40M260 750 1220 10M-60 550 640-40M-80 420 480-40" />
                <path d="M0 520 650 700M0 430 970 700M250 0 1100 235" />
              </g>
              <g
                transform="translate(580 145)"
                fill="none"
                stroke="url(#seven-blue)"
                strokeWidth="3"
                strokeLinejoin="miter"
                opacity=".82"
              >
                <path d="m-125 42 300 0-55 72-56-10-155 175 43-130-122 0 94-85 117 0-83 54" />
                <path d="m175 42 49-36-54 104-43 22-98 195-83 42 74-147 100-108" />
                <path d="m-91 279-42 43 41-92-83 53 87-134" />
                <path d="m83 104 37 10 38-50-26 0" />
              </g>
            </svg>
            <div className="desktop-wordmark">
              <strong>SEVENTECH</strong>
              <span>Capture the flag / Event lab</span>
            </div>
            <div className="desktop-watermark">
              Investiga. Conecta. Resuelve.
            </div>
          </div>
          <div className="desktop-shortcuts">
            {applicationGroups
              .flatMap((group) => group.ids)
              .filter(visibleApplication)
              .map((id) => {
                const Icon = applications[id].icon;
                return (
                  <button
                    key={id}
                    className={`desktop-shortcut shortcut-${id}`}
                    onClick={() => open(id)}
                  >
                    <span>
                      <Icon size={34} strokeWidth={1.5} />
                    </span>
                    <span>
                      {id === "files"
                        ? "Carpeta personal"
                        : id === "browser"
                          ? "Intranet Seventech"
                          : applications[id].title}
                    </span>
                  </button>
                );
              })}
          </div>
          {menu && (
            <ApplicationsMenu
              alias={alias}
              visibleApplication={visibleApplication}
              onOpen={open}
              onDismiss={dismissApplications}
              onExit={onClose}
            />
          )}
          {ordered.map((id) => {
            const state = windows[id]!;
            const appId = windowApplication(id);
            const application = applications[appId];
            const windowLabel = state.document?.name ?? application.title;
            const windowChallenge = state.challengeId
              ? (challenges.find((entry) => entry.id === state.challengeId) ?? {
                  ...challenge,
                  id: state.challengeId,
                  title: "Reto no disponible",
                  enabled: false,
                })
              : challenge;
            const Icon = application.icon;
            return (
              <section
                key={id}
                data-window={id}
                className={`linux-window window-${appId}${state.maximized ? " is-maximized" : ""}${state.minimized ? " is-minimized" : ""}${active === id ? " is-focused" : ""}`}
                style={
                  {
                    "--window-x": `${state.x}px`,
                    "--window-y": `${state.y}px`,
                    zIndex: state.z,
                  } as CSSProperties
                }
                aria-label={windowLabel}
                title={state.document?.path}
                onPointerDown={() => focus(id)}
              >
                <div
                  className="linux-titlebar"
                  onPointerDown={(e) => startDrag(e, id)}
                  onPointerMove={move}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                  onDoubleClick={(e) => {
                    if (!(e.target as HTMLElement).closest("button"))
                      maximize(id);
                  }}
                >
                  <div className="window-title">
                    <Icon size={14} />
                    <span>
                      {id === "terminal"
                        ? "analista@seventech: ~"
                        : appId === "editor"
                          ? `${windowLabel} — Editor de texto`
                          : id === "files"
                            ? "Carpeta personal — Archivos"
                            : application.title + " — Seventech"}
                    </span>
                  </div>
                  <div className="window-buttons">
                    <button
                      title="Centrar ventana"
                      aria-label={`Centrar ${windowLabel}`}
                      disabled={state.maximized}
                      onClick={() => centerWindow(id)}
                    >
                      <Maximize2 size={12} />
                    </button>
                    <button
                      aria-label={`Minimizar ${windowLabel}`}
                      title="Minimizar"
                      onClick={() => toggleMinimize(id)}
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      aria-label={`${state.maximized ? "Restaurar" : "Maximizar"} ${windowLabel}`}
                      title={state.maximized ? "Restaurar" : "Maximizar"}
                      onClick={() => maximize(id)}
                    >
                      <Square size={12} />
                    </button>
                    <button
                      className="window-close"
                      aria-label={`Cerrar ${windowLabel}`}
                      title="Cerrar ventana"
                      onClick={() => close(id)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                {id === "ctf" ? (
                  <div className="ctf-app-window">{portal}</div>
                ) : isToolApp(appId) ? (
                  <Suspense
                    fallback={
                      <p className="window-loading">Abriendo aplicación…</p>
                    }
                  >
                    <ToolApplication
                      challengeId={windowChallenge.id}
                      id={appId}
                      fileRequest={mediaRequests[appId]}
                      comparison={comparison}
                      onCompare={receiveComparison}
                      onChangeComparison={(side, text) =>
                        setComparison((current) => ({
                          ...current,
                          [side]: { label: "Texto editado", text },
                        }))
                      }
                    />
                  </Suspense>
                ) : id === "vpn" ? (
                  <Suspense
                    fallback={
                      <p className="window-loading">Abriendo Seventech VPN…</p>
                    }
                  >
                    <VpnApplication onTerminal={openVpnTerminal} />
                  </Suspense>
                ) : id === "terminal" || id === "ffuf" ? (
                  <>
                    <div className="terminal-menubar">
                      <span>Terminal de investigación</span>
                      <button onClick={() => open("files", windowChallenge.id)}>
                        <FolderOpen size={13} />
                        Archivos
                      </button>
                    </div>
                    <Suspense
                      fallback={
                        <p className="window-loading">Abriendo terminal…</p>
                      }
                    >
                      <Terminal
                        workstation={id === "terminal"}
                        challengeId={
                          id === "ffuf" ? WEB_CHALLENGE_ID : windowChallenge.id
                        }
                        initialCommand={id === "ffuf" ? "ffuf -h" : undefined}
                      />
                    </Suspense>
                  </>
                ) : id === "files" ? (
                  <FileManager
                    onFile={fileOpened}
                    onMediaFile={mediaOpened}
                    request={
                      launchRequest?.id === "files" ? launchRequest : undefined
                    }
                  />
                ) : appId === "editor" ? (
                  <DocumentViewer
                    name={state.document?.name ?? "Documento sin abrir"}
                    content={
                      state.document?.content ??
                      "Abre un archivo desde Archivos para leer su contenido."
                    }
                  />
                ) : id === "browser" ? (
                  otWebOpen ? (
                    <Suspense fallback={<p>Conectando HMI…</p>}>
                      <OtApplication
                        context="web"
                        active={!state.minimized}
                        onComputer={() => open("terminal")}
                        onClose={() => setOtWebOpen(false)}
                      />
                    </Suspense>
                  ) : printerWebOpen ? (
                    <Suspense fallback={<p>Conectando con la impresora…</p>}>
                      <PrinterApplication
                        context="web"
                        active={!state.minimized}
                        onComputer={() => open("terminal")}
                        onClose={() => setPrinterWebOpen(false)}
                      />
                    </Suspense>
                  ) : maintenanceUrl ? (
                    <Suspense fallback={<p>Abriendo servicio interno…</p>}>
                      <PrivilegedConsole
                        initialUrl={maintenanceUrl}
                        onHome={() => setMaintenanceUrl(undefined)}
                      />
                    </Suspense>
                  ) : hasBrowserLab(windowChallenge.id) ? (
                    <WebLabBrowser
                      key={windowChallenge.id}
                      challengeId={windowChallenge.id}
                    />
                  ) : (
                    <BrowserHome
                      serviceIds={challenges.map((entry) => entry.id)}
                      onVisit={(target) => open("browser", target)}
                      onMaintenance={setMaintenanceUrl}
                      onPrinter={() => setPrinterWebOpen(true)}
                      onOt={() => setOtWebOpen(true)}
                    />
                  )
                ) : (
                  <Mission
                    key={windowChallenge.id}
                    challenge={windowChallenge}
                    initialSolved={solvedChallengeIds.includes(
                      windowChallenge.id,
                    )}
                    onSolved={onSolved}
                    onOpen={(next) => open(next, windowChallenge.id)}
                  />
                )}
              </section>
            );
          })}
          <div className="desktop-lab-badge">
            <ShieldCheck size={15} />
            <span>Laboratorio Seventech</span>
          </div>
        </div>
        <footer className="linux-taskbar">
          <button
            className="show-desktop"
            title="Mostrar escritorio"
            aria-label="Mostrar escritorio"
            onClick={() =>
              setWindows((w) =>
                Object.fromEntries(
                  (Object.keys(w) as WindowId[]).map((id) => [
                    id,
                    { ...w[id]!, minimized: true },
                  ]),
                ),
              )
            }
          >
            <Monitor size={18} />
          </button>
          <div className="taskbar-windows">
            {ordered.map((id) => {
              const application = applications[windowApplication(id)];
              const Icon = application.icon;
              const windowLabel =
                windows[id]!.document?.name ?? application.title;
              return (
                <button
                  key={id}
                  className={
                    !windows[id]!.minimized && active === id ? "active" : ""
                  }
                  onClick={() =>
                    windows[id]!.minimized || active !== id
                      ? open(id)
                      : toggleMinimize(id)
                  }
                  aria-label={`${windows[id]!.minimized ? "Restaurar" : "Mostrar"} ${windowLabel}`}
                  title={windows[id]!.document?.path ?? windowLabel}
                >
                  <Icon size={16} />
                  <span>{windowLabel}</span>
                </button>
              );
            })}
          </div>
          <button className="taskbar-mission" onClick={() => open("ctf")}>
            <Flag size={16} />
            <span>Retos</span>
          </button>
          <span className="session-user">{alias}@seventech</span>
        </footer>
      </div>
    </dialog>
  );
}
