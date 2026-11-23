import { useEffect, useRef, useState } from "react";
import { Power, PowerOff } from "lucide-react";
import { api } from "../api";

export default function CategoryAvailability({
  category,
  total,
  available,
  busy,
  onBusy,
  onSave,
}: {
  category: string;
  total: number;
  available: number;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onSave: () => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<{
    category: string;
    enabled: boolean;
    total: number;
  } | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (pending) dialog.current?.showModal();
    else dialog.current?.close();
  }, [pending]);
  useEffect(() => {
    setStatus("");
    setError("");
  }, [category]);
  async function confirm() {
    if (!pending || busy) return;
    onBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await api<{
        category: string;
        total: number;
        enabled: boolean;
        changed: number;
      }>("/admin/categories/availability", {
        method: "PATCH",
        body: JSON.stringify({
          category: pending.category,
          enabled: pending.enabled,
        }),
      });
      await onSave();
      setStatus(
        `${result.category}: ${result.total} retos ${result.enabled ? "activados" : "desactivados"}.`,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la categoría.",
      );
    } finally {
      onBusy(false);
      setPending(null);
    }
  }
  return (
    <div className="admin-category-availability">
      {!category ? (
        <p className="muted">
          Selecciona una categoría para activar o desactivar todos sus retos a
          la vez.
        </p>
      ) : (
        <>
          <div>
            <strong>{category}</strong>
            <span>
              {available} de {total} retos disponibles
            </span>
          </div>
          <div className="admin-category-actions">
            <button
              className="secondary"
              disabled={busy || available === total}
              onClick={() => setPending({ category, enabled: true, total })}
            >
              <Power size={16} aria-hidden="true" />
              Activar categoría
            </button>
            <button
              className="secondary"
              disabled={busy || available === 0}
              onClick={() => setPending({ category, enabled: false, total })}
            >
              <PowerOff size={16} aria-hidden="true" />
              Desactivar categoría
            </button>
          </div>
        </>
      )}
      {status && (
        <p className="competition-feedback" role="status">
          {status}
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
        aria-labelledby="category-dialog-title"
        aria-describedby="category-dialog-description"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setPending(null);
        }}
      >
        <h2 id="category-dialog-title">
          {pending?.enabled ? "Activar" : "Desactivar"} categoría
        </h2>
        <p id="category-dialog-description">
          Se {pending?.enabled ? "activarán" : "desactivarán"} los{" "}
          {pending?.total} retos de <strong>{pending?.category}</strong>,
          incluidos los que no aparecen en esta página. Los puntos y las
          resoluciones obtenidas se conservan.
        </p>
        <div className="competition-dialog-actions">
          <button
            className="secondary"
            disabled={busy}
            autoFocus
            onClick={() => setPending(null)}
          >
            Cancelar
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy
              ? "Guardando…"
              : pending?.enabled
                ? "Confirmar activación"
                : "Confirmar desactivación"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
