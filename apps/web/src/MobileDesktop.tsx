import MobileWorkspace from "./mobile/MobileWorkspace";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BatteryFull,
  Bluetooth,
  Calculator,
  ChevronRight,
  FileText,
  Folder,
  Grid2X2,
  Image,
  LockKeyhole,
  MessageCircle,
  Phone,
  Plane,
  Search,
  Settings,
  Signal,
  Sun,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import "./mobile-desktop.css";
type App =
  | "cases"
  | "records"
  | "messages"
  | "notes"
  | "files"
  | "calculator"
  | "settings"
  | "gallery"
  | "dialer";
const apps = [
  { id: "cases" as App, name: "Expedientes", icon: Folder, color: "blue" },
  {
    id: "messages" as App,
    name: "Mensajes",
    icon: MessageCircle,
    color: "green",
  },
  { id: "gallery" as App, name: "Fotos", icon: Image, color: "pink" },
  { id: "notes" as App, name: "Notas", icon: FileText, color: "yellow" },
  { id: "files" as App, name: "Archivos", icon: Folder, color: "blue" },
  {
    id: "calculator" as App,
    name: "Calculadora",
    icon: Calculator,
    color: "dark",
  },
  { id: "settings" as App, name: "Ajustes", icon: Settings, color: "gray" },
  { id: "dialer" as App, name: "Teléfono", icon: Phone, color: "green" },
];
export default function MobileDesktop({
  active,
  onLeave,
}: {
  active: boolean;
  onLeave: () => void;
}) {
  const [app, setApp] = useState<App | null>(null);
  const [quick, setQuick] = useState(false);
  const [locked, setLocked] = useState(false);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(new Date());
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  const [airplane, setAirplane] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [volume, setVolume] = useState(65);
  const [dial, setDial] = useState("");
  const [number, setNumber] = useState("0");
  const [operand, setOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const gesture = useRef(0);
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, [active]);
  const time = now.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = now.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  function home() {
    setApp(null);
    setQuick(false);
    setQuery("");
  }
  function open(next: App) {
    setApp(next);
    setQuick(false);
  }
  function calculate(key: string) {
    if (key === "AC") {
      setNumber("0");
      setOperand(null);
      setOperator(null);
      setReplace(false);
      return;
    }
    if (key === "±") {
      setNumber(String(-Number(number)));
      return;
    }
    if (key === "%") {
      setNumber(String(Number(number) / 100));
      return;
    }
    if (["+", "−", "×", "÷", "="].includes(key)) {
      const right = Number(number);
      let result = right;
      if (operand !== null && operator && !replace) {
        result =
          operator === "+"
            ? operand + right
            : operator === "−"
              ? operand - right
              : operator === "×"
                ? operand * right
                : right === 0
                  ? NaN
                  : operand / right;
        setNumber(
          Number.isFinite(result)
            ? String(Number(result.toPrecision(10)))
            : "Error",
        );
      }
      setOperand(key === "=" ? null : result);
      setOperator(key === "=" ? null : key);
      setReplace(true);
      return;
    }
    setNumber((current) => {
      if (replace || current === "Error") {
        setReplace(false);
        return key === "." ? "0." : key;
      }
      if (key === "." && current.includes(".")) return current;
      if (current.length > 13) return current;
      return current === "0" && key !== "." ? key : current + key;
    });
  }
  function appButton(item: (typeof apps)[number], dock = false) {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        className={`mobile-app-icon ${dock ? "in-dock" : ""}`}
        onClick={() => open(item.id)}
        aria-label={item.name}
      >
        <span className={`mobile-icon-tile ${item.color}`}>
          <Icon size={27} />
        </span>
        {!dock && <span>{item.name}</span>}
      </button>
    );
  }
  return (
    <section className="mobile-experience" aria-label="Interfaz del móvil">
      <button className="mobile-leave" onClick={onLeave}>
        <ArrowLeft size={16} />
        Volver al escenario <kbd>Esc</kbd>
      </button>
      <div className="mobile-device">
        <div
          className="mobile-screen"
          style={{ filter: `brightness(${brightness}%)` }}
        >
          <div className="mobile-wallpaper" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <header
            className="mobile-status"
            onPointerDown={(e) => {
              gesture.current = e.clientY;
            }}
            onPointerUp={(e) => {
              if (e.clientY - gesture.current > 25) setQuick(true);
            }}
          >
            <span>{time}</span>
            <button
              className="mobile-island"
              aria-label={locked ? "Desbloquear móvil" : "Bloquear móvil"}
              onClick={() => {
                setLocked(!locked);
                setQuick(false);
              }}
            >
              {locked ? <LockKeyhole size={11} /> : <span />}
              <i />
            </button>
            <button
              aria-label="Abrir controles rápidos"
              aria-expanded={quick}
              onClick={() => setQuick(!quick)}
            >
              <Signal size={14} />
              {wifi && !airplane && <Wifi size={14} />}
              <BatteryFull size={20} />
            </button>
          </header>
          {locked ? (
            <div className="mobile-lock">
              <LockKeyhole size={21} />
              <p>{date}</p>
              <strong>{time}</strong>
              <button onClick={() => setLocked(false)}>
                Desliza o pulsa para desbloquear <ChevronRight size={16} />
              </button>
            </div>
          ) : !app ? (
            <div className="mobile-home">
              <div className="mobile-clock">
                <span>{date}</span>
                <strong>{time}</strong>
                <small>Seventech</small>
              </div>
              <div className="mobile-widget">
                <div>
                  <span>MIÉ / LABORATORIO</span>
                  <strong>Tu espacio de trabajo</strong>
                  <small>Sin eventos programados</small>
                </div>
                <Grid2X2 size={25} />
              </div>
              <label className="mobile-search">
                <Search size={16} />
                <input
                  aria-label="Buscar aplicaciones"
                  placeholder="Buscar"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="mobile-apps">
                {apps
                  .filter(
                    (a) =>
                      a.id !== "dialer" &&
                      a.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((a) => appButton(a))}
              </div>
              <div className="mobile-page-dots" aria-hidden="true">
                <i />
                <i />
              </div>
              <nav className="mobile-dock" aria-label="Aplicaciones favoritas">
                {["dialer", "messages", "files", "settings"].map((id) =>
                  appButton(
                    apps.find((a) => a.id === id)!,
                    true,
                  ),
                )}
              </nav>
            </div>
          ) : (
            <div className={`mobile-app-page app-${app}`}>
              <header>
                <button aria-label="Volver al inicio" onClick={home}>
                  <ArrowLeft size={21} />
                </button>
                <h1>{apps.find((a) => a.id === app)?.name}</h1>
              </header>
              {app === "notes" && (
                <div className="mobile-notes">
                  <span>{notes.length} caracteres</span>
                  <textarea
                    aria-label="Escribir una nota"
                    placeholder="Escribe una nota…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}
              {app === "calculator" && (
                <div className="mobile-calculator">
                  <output aria-live="polite">{number}</output>
                  <div>
                    {[
                      "AC",
                      "±",
                      "%",
                      "÷",
                      "7",
                      "8",
                      "9",
                      "×",
                      "4",
                      "5",
                      "6",
                      "−",
                      "1",
                      "2",
                      "3",
                      "+",
                      "0",
                      ".",
                      "=",
                    ].map((key) => (
                      <button
                        key={key}
                        className={`${["÷", "×", "−", "+", "="].includes(key) ? "operation" : ""} ${key === "0" ? "zero" : ""}`}
                        onClick={() => calculate(key)}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {app === "settings" && (
                <div className="mobile-settings">
                  <button onClick={() => open("records")}>
                    Registros de aplicaciones y actividad
                  </button>
                  <div className="mobile-profile">
                    <span>7</span>
                    <div>
                      <strong>Seventech</strong>
                      <small>Móvil del laboratorio</small>
                    </div>
                  </div>
                  <button onClick={() => setQuick(true)}>
                    <span>
                      <Wifi size={20} />
                      Conexiones y controles
                    </span>
                    <ChevronRight size={17} />
                  </button>
                  <label>
                    <Sun size={20} />
                    Brillo
                    <input
                      aria-label="Brillo de la pantalla"
                      type="range"
                      min="45"
                      max="110"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    <Volume2 size={20} />
                    Volumen
                    <input
                      aria-label="Volumen"
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                  </label>
                  <button onClick={() => setLocked(true)}>
                    <span>
                      <LockKeyhole size={20} />
                      Bloquear pantalla
                    </span>
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}
              {app === "dialer" && (
                <div className="mobile-dialer">
                  <output>{dial || " "}</output>
                  <div>
                    {[
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      "*",
                      "0",
                      "#",
                    ].map((n) => (
                      <button
                        key={n}
                        onClick={() =>
                          setDial((current) => (current + n).slice(0, 22))
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    className="mobile-delete"
                    onClick={() => setDial((current) => current.slice(0, -1))}
                  >
                    Borrar
                  </button>
                </div>
              )}
            </div>
          )}
          <MobileWorkspace
            app={app}
            active={active}
            visible={
              !locked &&
              ["cases", "files", "messages", "gallery", "records"].includes(
                app || "",
              )
            }
            onHome={home}
            onOpen={open}
          />
          {quick && (
            <div className="mobile-controls">
              <header>
                <span>Controles rápidos</span>
                <button
                  aria-label="Cerrar controles"
                  onClick={() => setQuick(false)}
                >
                  <X size={22} />
                </button>
              </header>
              <div className="mobile-toggles">
                <button
                  className={wifi && !airplane ? "enabled" : ""}
                  onClick={() => {
                    setWifi(!wifi);
                    setAirplane(false);
                  }}
                >
                  <Wifi size={25} />
                  <span>Wi-Fi</span>
                  <small>
                    {wifi && !airplane ? "Activado" : "Desactivado"}
                  </small>
                </button>
                <button
                  className={bluetooth ? "enabled" : ""}
                  onClick={() => setBluetooth(!bluetooth)}
                >
                  <Bluetooth size={25} />
                  <span>Bluetooth</span>
                  <small>{bluetooth ? "Activado" : "Desactivado"}</small>
                </button>
                <button
                  className={airplane ? "enabled" : ""}
                  onClick={() => setAirplane(!airplane)}
                >
                  <Plane size={25} />
                  <span>Modo avión</span>
                  <small>{airplane ? "Activado" : "Desactivado"}</small>
                </button>
                <button onClick={() => open("settings")}>
                  <Settings size={25} />
                  <span>Ajustes</span>
                  <small>Dispositivo</small>
                </button>
              </div>
              <label>
                <Sun size={22} />
                <input
                  aria-label="Brillo"
                  type="range"
                  min="45"
                  max="110"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                />
              </label>
              <label>
                <Volume2 size={22} />
                <input
                  aria-label="Volumen"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
              </label>
              <div className="mobile-battery">
                <BatteryFull size={23} />
                <span>100 % · Batería</span>
              </div>
            </div>
          )}
          <button
            className="mobile-home-gesture"
            aria-label={locked ? "Desbloquear" : "Ir al inicio"}
            onPointerDown={(e) => {
              gesture.current = e.clientY;
            }}
            onPointerUp={(e) => {
              if (locked) setLocked(false);
              else home();
            }}
            onClick={() => {
              if (locked) setLocked(false);
              else home();
            }}
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  );
}
