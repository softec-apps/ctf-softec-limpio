import { useEffect, useRef, useState } from "react";
import { ArrowRight, Delete, KeyRound, RotateCcw, X } from "lucide-react";
import { post, ApiError } from "../api";
import "./entrance.css";
export default function EntranceHall({ onOpened }: { onOpened: () => void }) {
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [opened, setOpened] = useState(false),
    [inspecting, setInspecting] = useState(false);
  const panelDialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    const dialog = panelDialog.current;
    if (!dialog) return;
    if (inspecting && !dialog.open) dialog.showModal();
    else if (!inspecting && dialog.open) dialog.close();
  }, [inspecting]);
  function change(value: string) {
    setCode(value.replace(/[^0-9]/g, "").slice(0, 4));
    setError("");
  }
  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy || code.length !== 4) return;
    setBusy(true);
    setError("");
    try {
      const result = await post("/entrance/unlock", { code });
      if (!active.current) return;
      if (!result.opened) throw new Error("No se pudo abrir la puerta.");
      setOpened(true);
      setInspecting(false);
      timer.current = setTimeout(
        onOpened,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650,
      );
    } catch (error) {
      if (active.current) {
        setError(
          error instanceof ApiError
            ? error.status === 400
              ? "CÓDIGO INCORRECTO"
              : error.status === 429
                ? "ESPERE UN MOMENTO"
                : "ERROR DE ACCESO"
            : "SIN CONEXIÓN",
        );
        setBusy(false);
      }
    }
  }
  return (
    <main
      className={`entrance-hall${opened ? " is-opening" : ""}`}
      aria-label="Pasillo de entrada"
    >
      <header className="hall-heading">
        <div className="hall-brand">
          <span>7</span>
          <div>
            Seventech<small>Laboratorio de investigación</small>
          </div>
        </div>
        <span className="hall-location">Acceso al laboratorio</span>
      </header>
      <div className="hall-space" aria-hidden="true">
        <div className="hall-ceiling" />
        <div className="hall-back-wall" />
        <div className="hall-wall hall-wall-left" />
        <div className="hall-wall hall-wall-right" />
        <div className="hall-floor" />
        <div className="hall-light" />
      </div>
      <section className="hall-stage" aria-label="Puerta del laboratorio">
        <div className="hall-assembly">
          <div className="hall-doorway" aria-hidden="true">
            <div className="hall-room-glow" />
            <div className="hall-door">
              <div className="hall-door-window">
                <span>Laboratorio</span>
                <small>Seventech</small>
              </div>
              <div className="hall-door-handle" />
              <div className="hall-door-kickplate" />
            </div>
            <span className="hall-threshold" />
          </div>
          <button
            className="hall-wall-panel"
            type="button"
            aria-label="Usar panel de acceso"
            aria-haspopup="dialog"
            aria-expanded={inspecting}
            aria-controls="door-panel-dialog"
            onClick={() => setInspecting(true)}
            disabled={busy}
          >
            <span className="hall-panel-preview" aria-hidden="true">
              <i className={error ? "is-error" : opened ? "is-open" : ""} />
              <span className={`hall-mini-display${error ? " is-error" : ""}`}>
                {error
                  ? "ERROR"
                  : opened
                    ? "ABIERTO"
                    : busy
                      ? "ESPERE"
                      : code || "────"}
              </span>
              <span className="hall-mini-keypad">
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
                  "C",
                  "0",
                  "↵",
                ].map((key) => (
                  <span key={key}>{key}</span>
                ))}
              </span>
            </span>
          </button>
        </div>
      </section>
      <dialog
        id="door-panel-dialog"
        ref={panelDialog}
        className="hall-panel-dialog"
        aria-label="Panel digital de cuatro dígitos"
        onCancel={(event) => {
          event.preventDefault();
          setInspecting(false);
        }}
        onClose={() => setInspecting(false)}
      >
        <form
          className="hall-panel"
          onSubmit={unlock}
          aria-label="Panel digital de cuatro dígitos"
        >
          <div className="hall-panel-heading">
            <KeyRound size={17} />
            <span>Control de acceso</span>
            <i className={error ? "is-error" : opened ? "is-open" : ""} />
            <button
              className="hall-panel-close"
              type="button"
              aria-label="Cerrar panel de acceso"
              onClick={() => setInspecting(false)}
            >
              <X size={18} />
            </button>
          </div>
          <label htmlFor="door-code">Código de cuatro dígitos</label>
          <div
            className={`hall-display${error ? " is-error" : ""}${error || busy || opened ? " has-message" : ""}`}
          >
            <input
              id="door-code"
              className="hall-code"
              value={code}
              onChange={(event) => change(event.target.value)}
              onKeyDown={(event) => {
                if (error && /^[0-9]$/.test(event.key)) {
                  event.preventDefault();
                  change(event.key);
                }
              }}
              onPaste={(event) => {
                if (error) {
                  event.preventDefault();
                  change(event.clipboardData.getData("text"));
                }
              }}
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="────"
              disabled={busy}
              aria-describedby={error ? "door-error" : undefined}
              aria-invalid={Boolean(error)}
            />
            {error ? (
              <output
                id="door-error"
                className="hall-display-message"
                role="alert"
              >
                {error}
              </output>
            ) : (
              (busy || opened) && (
                <output className="hall-display-message" role="status">
                  {opened ? "ACCESO AUTORIZADO" : "VERIFICANDO"}
                </output>
              )
            )}
          </div>
          <div className="hall-keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={busy || (!error && code.length === 4)}
                onClick={() => change(error ? String(digit) : code + digit)}
                aria-label={`Dígito ${digit}`}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              disabled={busy || !code}
              onClick={() => change("")}
              aria-label="Borrar código"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              disabled={busy || (!error && code.length === 4)}
              onClick={() => change(error ? "0" : code + "0")}
              aria-label="Dígito 0"
            >
              0
            </button>
            <button
              type="button"
              disabled={busy || !code}
              onClick={() => change(code.slice(0, -1))}
              aria-label="Borrar último dígito"
            >
              <Delete size={18} />
            </button>
          </div>
          <button className="hall-unlock" disabled={busy || code.length !== 4}>
            {opened ? "Puerta abierta" : busy ? "Comprobando…" : "Abrir puerta"}
            <ArrowRight size={17} />
          </button>
        </form>
      </dialog>
    </main>
  );
}
