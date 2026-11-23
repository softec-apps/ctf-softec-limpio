import { useEffect, useRef, useState } from "react";
import { LockKeyhole, Play, ShieldCheck } from "lucide-react";
import { api, ApiError, type CompetitionStatus } from "../api";
import "./competition.css";

export default function CompetitionControl({
  competition,
  onChanged,
}: {
  competition: CompetitionStatus;
  onChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<{
    open: boolean;
    revision: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (pending) dialog.current?.showModal();
    else dialog.current?.close();
  }, [pending]);

  async function confirm() {
    if (!pending || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ competition: CompetitionStatus }>(
        "/admin/competition",
        {
          method: "PATCH",
          body: JSON.stringify(pending),
        },
      );
      setNotice(
        result.competition.open
          ? "Competencia reabierta. Las nuevas entregas vuelven a sumar puntos."
          : "Competencia cerrada. Los puntos y la clasificación se conservan.",
      );
      window.dispatchEvent(new Event("ctf-competition-changed"));
      onChanged();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo cambiar el estado de la competencia.",
      );
      if (e instanceof ApiError && e.status === 409) onChanged();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <section
      className="competition-control"
      aria-labelledby="competition-heading"
    >
      <div className="competition-control-heading">
        <div>
          <span className="section-tag">Control de la competencia</span>
          <h2 id="competition-heading">Tú decides cuándo termina</h2>
        </div>
        <span
          className={`competition-badge ${competition.open ? "is-open" : "is-closed"}`}
        >
          {competition.open ? (
            <ShieldCheck size={16} aria-hidden="true" />
          ) : (
            <LockKeyhole size={16} aria-hidden="true" />
          )}
          {competition.open ? "Competencia abierta" : "Competencia cerrada"}
        </span>
      </div>
      <p>
        {competition.open
          ? "Los participantes pueden entregar evidencias y sumar puntos."
          : "Las entregas están bloqueadas. El laboratorio y la clasificación siguen disponibles."}
      </p>
      {competition.closedAt && (
        <p className="muted">
          Cerrada el{" "}
          <time dateTime={competition.closedAt}>
            {new Date(competition.closedAt).toLocaleString("es-EC")}
          </time>
          .
        </p>
      )}
      <div className="competition-control-actions">
        <p className="muted">Cierre manual. Sin fecha de cierre automática.</p>
        <button
          className={competition.open ? "competition-close" : "secondary"}
          disabled={busy}
          onClick={() => {
            setNotice("");
            setError("");
            setPending({
              open: !competition.open,
              revision: competition.revision,
            });
          }}
        >
          {competition.open ? (
            <LockKeyhole size={17} aria-hidden="true" />
          ) : (
            <Play size={17} aria-hidden="true" />
          )}
          {competition.open ? "Cerrar competencia" : "Reabrir competencia"}
        </button>
      </div>
      {notice && (
        <p className="competition-feedback" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        className="competition-dialog"
        aria-labelledby="competition-dialog-title"
        aria-describedby="competition-dialog-description"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
        onCancel={(event) => {
          event.stopPropagation();
          if (busy) event.preventDefault();
          else setPending(null);
        }}
      >
        <h2 id="competition-dialog-title">
          {pending?.open ? "Reabrir la competencia" : "Cerrar la competencia"}
        </h2>
        <p id="competition-dialog-description">
          {pending?.open
            ? "Se volverán a aceptar entregas y a sumar puntos. Todos los resultados anteriores se conservan."
            : "Se dejarán de aceptar entregas en todas las categorías, incluida la terminal Linux y el rack. Se conservarán los puntos obtenidos y el acceso al laboratorio. Puedes reabrirla desde este panel."}
        </p>
        <div className="competition-dialog-actions">
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setPending(null)}
            autoFocus
          >
            Cancelar
          </button>
          <button
            className={pending?.open ? "secondary" : "competition-close"}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy
              ? "Guardando…"
              : pending?.open
                ? "Confirmar reapertura"
                : "Confirmar cierre"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
