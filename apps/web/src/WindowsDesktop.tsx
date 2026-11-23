import { lazy, Suspense } from "react";
const WindowsDomainStatus = lazy(() => import("./domain/WindowsDomainStatus"));
const WindowsLabTerminal = lazy(() => import("./windows/WindowsLabTerminal"));
import DocumentViewer from "./evidence/DocumentViewer";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Folder,
  FileText,
  Settings,
  Search,
  Wifi,
  Volume2,
  BatteryFull,
  ChevronUp,
  Minus,
  Square,
  X,
  Monitor,
  UserRound,
  Power,
  Sun,
  Maximize2,
  ListFilter,
  ClipboardList,
  Info,
  TerminalSquare,
} from "lucide-react";
import { paintWindowsWallpaper } from "./Laptop";
import "./windows-desktop.css";
import { useLabSession } from "./useLabSession";
import WindowsSessionGate from "./windows/WindowsSessionGate";
import WindowsCaseHub from "./windows/WindowsCaseHub";
import WindowsFileExplorer from "./windows/WindowsFileExplorer";
import WindowsEventViewer from "./windows/WindowsEventViewer";
import WindowsProperties from "./windows/WindowsProperties";
import { CASE_ROOT, type FileRequest, type WindowsFile } from "./windows/types";
import "./windows/windows-lab.css";
type App =
  | "terminal"
  | "domain"
  | "document"
  | "files"
  | "notes"
  | "settings"
  | "cases"
  | "events"
  | "properties";
const applications = [
  { id: "terminal" as App, name: "Terminal Windows", icon: TerminalSquare },
  { id: "domain" as App, name: "Dominio y seguridad", icon: Wifi },
  { id: "document" as App, name: "Visor de documentos", icon: FileText },
  { id: "cases" as App, name: "Expedientes", icon: ClipboardList },
  { id: "events" as App, name: "Visor de eventos", icon: ListFilter },
  { id: "properties" as App, name: "Propiedades", icon: Info },
  { id: "files" as App, name: "Explorador de archivos", icon: Folder },
  { id: "notes" as App, name: "Bloc de notas", icon: FileText },
  { id: "settings" as App, name: "Configuración", icon: Settings },
];
type WindowState = {
  id: App;
  x: number;
  y: number;
  maximized: boolean;
  minimized: boolean;
};
export default function WindowsDesktop({
  active,
  onLeave,
}: {
  active: boolean;
  onLeave: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    id: App;
    x: number;
    y: number;
    px: number;
    py: number;
  } | null>(null);
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [start, setStart] = useState(false);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState("");
  const session = useLabSession(active);
  const [fileRequest, setFileRequest] = useState<FileRequest>({
    path: "C:\\",
    sequence: 0,
  });
  const [eventRequest, setEventRequest] = useState<FileRequest>();
  const [properties, setProperties] = useState<WindowsFile>();
  const [documentFile, setDocumentFile] = useState<WindowsFile>();
  const [terminalRequest, setTerminalRequest] = useState<{
    challengeId: string;
    sequence: number;
  }>();
  const [noteTitle, setNoteTitle] = useState("Sin título");
  const previousUser = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = session.user?.id;
    if (previousUser.current && previousUser.current !== id) {
      setWindows([]);
      setNotes("");
      setNoteTitle("Sin título");
      setProperties(undefined);
      setDocumentFile(undefined);
      setEventRequest(undefined);
      setTerminalRequest(undefined);
    }
    previousUser.current = id;
  }, [session.user?.id]);
  function openFolder(path: string) {
    setFileRequest((current) => ({ path, sequence: current.sequence + 1 }));
    open("files");
  }
  function openFile(file: WindowsFile) {
    if (file.format === "events") {
      setEventRequest((current) => ({
        path: file.path,
        sequence: (current?.sequence ?? 0) + 1,
      }));
      open("events");
    } else if (/\.(csv|reg|xml)$|\.lnk\.txt$/i.test(file.name)) {
      setDocumentFile(file);
      open("document");
    } else {
      setNotes(file.content);
      setNoteTitle(file.name);
      open("notes");
    }
  }
  function openProperties(file: WindowsFile) {
    setProperties(file);
    open("properties");
  }
  const [brightness, setBrightness] = useState(100);
  const [quick, setQuick] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) paintWindowsWallpaper(ctx);
  }, []);
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [active]);
  function open(id: App) {
    setStart(false);
    setQuick(false);
    setWindows((current) => {
      const existing = current.find((w) => w.id === id);
      return [
        ...current.filter((w) => w.id !== id),
        existing
          ? { ...existing, minimized: false }
          : {
              id,
              x: Math.max(
                12,
                Math.min(160 + current.length * 30, window.innerWidth - 760),
              ),
              y: 80 + current.length * 28,
              maximized: false,
              minimized: false,
            },
      ];
    });
  }
  function update(id: App, patch: Partial<WindowState>) {
    setWindows((current) =>
      current.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    );
  }
  const focused = windows.filter((w) => !w.minimized).at(-1)?.id;
  return (
    <section className="win11" aria-label="Escritorio Windows 11 del portátil">
      <canvas
        ref={canvas}
        width={1440}
        height={900}
        className="win-wallpaper"
        style={{ filter: `brightness(${brightness}%)` }}
        aria-hidden="true"
      />
      <button className="win-leave" onClick={onLeave}>
        <ArrowLeft size={15} />
        Volver al escenario <kbd>Esc</kbd>
      </button>
      <div className="win-shortcuts">
        {[
          {
            name: "Este equipo",
            icon: Monitor,
            action: () => openFolder("C:\\"),
          },
          {
            name: "Documentos",
            icon: Folder,
            action: () => openFolder("C:\\Users\\Analista\\Documents"),
          },
          {
            name: "Expedientes",
            icon: ClipboardList,
            action: () => open("cases"),
          },
          {
            name: "Terminal Windows",
            icon: TerminalSquare,
            action: () => open("terminal"),
          },
          {
            name: "Visor de eventos",
            icon: ListFilter,
            action: () => open("events"),
          },
          {
            name: "Bloc de notas",
            icon: FileText,
            action: () => open("notes"),
          },
        ].map((item) => (
          <button
            key={item.name}
            onDoubleClick={item.action}
            onKeyDown={(event) => {
              if (event.key === "Enter") item.action();
            }}
          >
            <item.icon />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      {windows.map((w) => {
        const app = applications.find((a) => a.id === w.id)!;
        const Icon = app.icon;
        return (
          <article
            key={w.id}
            hidden={w.minimized}
            data-win-app={w.id}
            aria-label={app.name}
            className={`win-window ${w.maximized ? "maximized" : ""} ${focused === w.id ? "focused" : ""}`}
            style={{
              left: w.maximized ? 0 : w.x,
              top: w.maximized ? 0 : w.y,
              zIndex: 10 + windows.indexOf(w),
            }}
            onPointerDown={() => {
              setWindows((current) => [
                ...current.filter((item) => item.id !== w.id),
                current.find((item) => item.id === w.id)!,
              ]);
            }}
          >
            <header
              className="win-titlebar"
              onDoubleClick={() => update(w.id, { maximized: !w.maximized })}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("button") || w.maximized)
                  return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  id: w.id,
                  x: w.x,
                  y: w.y,
                  px: e.clientX,
                  py: e.clientY,
                };
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (d?.id === w.id)
                  update(w.id, {
                    x: Math.max(
                      0,
                      Math.min(window.innerWidth - 160, d.x + e.clientX - d.px),
                    ),
                    y: Math.max(
                      0,
                      Math.min(
                        window.innerHeight - 120,
                        d.y + e.clientY - d.py,
                      ),
                    ),
                  });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <div>
                <Icon size={16} />
                <span>{app.name}</span>
              </div>
              <div className="win-window-controls">
                <button
                  aria-label="Minimizar"
                  onDoubleClick={(e) => e.stopPropagation()}
                  onClick={() => update(w.id, { minimized: true })}
                >
                  <Minus size={15} />
                </button>
                <button
                  aria-label={w.maximized ? "Restaurar" : "Maximizar"}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onClick={() => update(w.id, { maximized: !w.maximized })}
                >
                  {w.maximized ? <Maximize2 size={13} /> : <Square size={12} />}
                </button>
                <button
                  aria-label="Cerrar ventana"
                  onDoubleClick={(e) => e.stopPropagation()}
                  onClick={() =>
                    setWindows((current) =>
                      current.filter((item) => item.id !== w.id),
                    )
                  }
                >
                  <X size={17} />
                </button>
              </div>
            </header>
            {w.id === "domain" && (
              <WindowsSessionGate session={session}>
                <Suspense fallback={<p>Cargando estado…</p>}>
                  <WindowsDomainStatus active={active && !w.minimized} />
                </Suspense>
              </WindowsSessionGate>
            )}
            {w.id === "files" && (
              <WindowsSessionGate session={session}>
                <WindowsFileExplorer
                  request={fileRequest}
                  onOpen={openFile}
                  onProperties={openProperties}
                />
              </WindowsSessionGate>
            )}
            {w.id === "cases" && (
              <WindowsSessionGate session={session}>
                <WindowsCaseHub
                  session={session}
                  onTerminal={(challengeId) => {
                    setTerminalRequest((current) => ({
                      challengeId,
                      sequence: (current?.sequence ?? 0) + 1,
                    }));
                    open("terminal");
                  }}
                />
              </WindowsSessionGate>
            )}
            {w.id === "terminal" && (
              <WindowsSessionGate session={session}>
                <Suspense fallback={<p>Cargando terminal…</p>}>
                  <WindowsLabTerminal
                    key={session.user?.id}
                    active={active && !w.minimized && focused === "terminal"}
                    request={terminalRequest}
                  />
                </Suspense>
              </WindowsSessionGate>
            )}
            {w.id === "events" && (
              <WindowsSessionGate session={session}>
                <WindowsEventViewer request={eventRequest} />
              </WindowsSessionGate>
            )}
            {w.id === "properties" && (
              <WindowsSessionGate session={session}>
                <WindowsProperties file={properties} />
              </WindowsSessionGate>
            )}
            {w.id === "document" && (
              <WindowsSessionGate session={session}>
                {documentFile ? (
                  <DocumentViewer
                    key={documentFile.path}
                    name={documentFile.name}
                    content={documentFile.content}
                  />
                ) : (
                  <div className="win-lab-message">
                    Abre una tabla, acceso directo o definición desde el
                    explorador de archivos.
                  </div>
                )}
              </WindowsSessionGate>
            )}
            {w.id === "notes" && (
              <WindowsSessionGate session={session}>
                <div className="win-notes">
                  <div className="win-commandbar">
                    <span>{noteTitle}</span>
                  </div>
                  <textarea
                    aria-label="Contenido del Bloc de notas"
                    spellCheck={false}
                    placeholder=""
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <footer>
                    {notes.length} caracteres <span>UTF-8</span>
                  </footer>
                </div>
              </WindowsSessionGate>
            )}
            {w.id === "settings" && (
              <div className="win-settings">
                <h1>Sistema</h1>
                <div className="win-device">
                  <Monitor size={49} />
                  <div>
                    <h2>WS01</h2>
                    <p>Portátil del laboratorio</p>
                  </div>
                </div>
                <div className="win-setting-card">
                  <Sun size={24} />
                  <div>
                    <h3>Pantalla</h3>
                    <label>
                      Brillo del escritorio{" "}
                      <input
                        aria-label="Brillo del escritorio"
                        type="range"
                        min="40"
                        max="110"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </div>
                <div className="win-setting-card">
                  <Monitor size={24} />
                  <div>
                    <h3>Información</h3>
                    <p>Windows 11 · Escritorio del escenario Seventech</p>
                  </div>
                </div>
              </div>
            )}
          </article>
        );
      })}
      {start && (
        <div className="win-start">
          <label className="win-search">
            <Search size={18} />
            <input
              autoFocus
              aria-label="Buscar aplicaciones"
              placeholder="Buscar aplicaciones"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="win-start-heading">
            <strong>Anclado</strong>
            <span>Todas las aplicaciones</span>
          </div>
          <div className="win-pinned">
            {applications
              .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
              .map((app) => (
                <button key={app.id} onClick={() => open(app.id)}>
                  <app.icon
                    size={33}
                    className={app.id === "files" ? "win-folder-icon" : ""}
                  />
                  <span>{app.name}</span>
                </button>
              ))}
          </div>
          <strong className="win-recommended">Recomendaciones</strong>
          <p className="win-no-recent">No hay archivos recientes.</p>
          <footer>
            <span>
              <UserRound size={24} />
              {session.user?.alias ?? "Participante"}
            </span>
            <button
              aria-label="Salir del portátil"
              title="Volver al escenario"
              onClick={onLeave}
            >
              <Power size={21} />
            </button>
          </footer>
        </div>
      )}
      {quick && (
        <div className="win-quick">
          <div>
            <Wifi size={23} />
            <span>Red del laboratorio</span>
          </div>
          <label>
            <Sun size={21} />
            <input
              aria-label="Brillo"
              type="range"
              min="40"
              max="110"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />
          </label>
          <span>
            <BatteryFull size={21} /> Conectado a la corriente
          </span>
        </div>
      )}
      <footer className="win-taskbar">
        <div className="win-taskbar-center">
          <button
            aria-label="Inicio"
            aria-expanded={start}
            className={start ? "active" : ""}
            onClick={() => {
              setStart(!start);
              setQuick(false);
            }}
          >
            <span className="win-logo">
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>
          <button
            aria-label="Buscar"
            onClick={() => {
              setStart(true);
              setQuery("");
              setQuick(false);
            }}
          >
            <Search size={23} />
          </button>
          {applications.map((app) => (
            <button
              key={app.id}
              aria-label={app.name}
              title={app.name}
              className={`${windows.some((w) => w.id === app.id) ? "running" : ""} ${focused === app.id ? "active" : ""} ${["terminal", "cases", "files"].includes(app.id) ? "" : "win-taskbar-optional"}`}
              onClick={() =>
                focused === app.id
                  ? update(app.id, { minimized: true })
                  : open(app.id)
              }
            >
              <app.icon
                size={25}
                className={app.id === "files" ? "win-folder-icon" : ""}
              />
            </button>
          ))}
        </div>
        <div className="win-tray">
          <ChevronUp size={15} />
          <span>ESP</span>
          <button
            aria-label="Configuración rápida"
            aria-expanded={quick}
            onClick={() => {
              setQuick(!quick);
              setStart(false);
            }}
          >
            <Wifi size={17} />
            <Volume2 size={17} />
            <BatteryFull size={20} />
          </button>
          <time>
            <span>
              {now.toLocaleTimeString("es-EC", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
            <span>{now.toLocaleDateString("es-EC")}</span>
          </time>
        </div>
      </footer>
    </section>
  );
}
