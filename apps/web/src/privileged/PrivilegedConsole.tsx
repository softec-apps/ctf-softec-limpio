import FlagInput from "../challenges/FlagInput";
import { completeFlag } from "../challenges/flag-format";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "../api";
import CopyButton from "../web-lab/toolkit/CopyButton";
import "./privileged.css";
type Reply = {
  title: string;
  body: string;
  file?: string;
  flag?: string;
  completed?: boolean;
  awardedPoints?: number;
};
type Operation = "login" | "recover" | "restore" | "vault" | "submit";
const labels: Record<Operation, string> = {
  login: "Identificación",
  recover: "Continuidad",
  restore: "Restaurar política",
  vault: "Firmar custodia",
  submit: "Registrar evidencia",
};
export default function PrivilegedConsole({
  initialUrl,
  onHome,
}: {
  initialUrl: string;
  onHome: () => void;
}) {
  const [address, setAddress] = useState(initialUrl);
  const [reply, setReply] = useState<Reply>();
  const [operation, setOperation] = useState<Operation>("login");
  const [alias, setAlias] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(body: unknown) {
    setBusy(true);
    setError("");
    try {
      setReply(
        await api<Reply>("/intranet/maintenance", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "El servicio no está disponible.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    void api<Reply>("/intranet/maintenance", {
      method: "POST",
      body: JSON.stringify({ op: "visit", url: initialUrl }),
      signal: controller.signal,
    })
      .then((reply) => {
        if (!controller.signal.aborted) setReply(reply);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo abrir el servicio.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [initialUrl]);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const fields =
      operation === "login"
        ? { alias, password: value }
        : operation === "recover"
          ? { code: value }
          : operation === "restore"
            ? { document: value }
            : operation === "vault"
              ? { signature: value }
              : { flag: completeFlag(value) };
    void send({ op: operation, ...fields });
  }
  return (
    <section
      className="maintenance-console"
      aria-label="Consola de supervisión"
    >
      <form
        className="maintenance-address"
        onSubmit={(event) => {
          event.preventDefault();
          void send({ op: "visit", url: address });
        }}
      >
        <button type="button" onClick={onHome} aria-label="Inicio de intranet">
          <ArrowLeft size={18} />
        </button>
        <label>
          Dirección interna
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
            maxLength={512}
          />
        </label>
        <button disabled={busy}>Ir</button>
      </form>
      <header>
        <ShieldCheck size={26} aria-hidden="true" />
        <div>
          <strong>Administración</strong>
          <small>Supervisión y continuidad operativa</small>
        </div>
      </header>
      <div className="maintenance-content">
        {error && (
          <p role="alert" className="maintenance-error">
            {error}
          </p>
        )}
        {reply && (
          <>
            <h2>{reply.title}</h2>
            <p className="maintenance-message" role="status">
              {reply.body}
            </p>
          </>
        )}
        {reply?.file !== undefined && (
          <div className="maintenance-evidence">
            <label>
              Contenido del archivo
              <textarea
                aria-label="Contenido del archivo"
                readOnly
                value={reply.file}
              />
            </label>
            <CopyButton
              text={reply.file}
              label="Copiar archivo de supervisión"
            />
          </div>
        )}
        {reply?.flag && (
          <div className="maintenance-evidence">
            <label>
              Evidencia de custodia
              <input readOnly value={reply.flag} />
            </label>
            <CopyButton
              text={reply.flag}
              label="Copiar evidencia de custodia"
            />
          </div>
        )}
        {!reply?.completed && (
          <form className="maintenance-operation" onSubmit={submit}>
            <label>
              Operación de supervisión
              <select
                value={operation}
                onChange={(event) => {
                  setOperation(event.target.value as Operation);
                  setValue("");
                }}
              >
                {Object.entries(labels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {operation === "login" && (
              <label>
                Cuenta de servicio
                <input
                  required
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  maxLength={64}
                  autoComplete="off"
                />
              </label>
            )}
            <label>
              {operation === "login"
                ? "Credencial del servicio"
                : operation === "recover"
                  ? "Código de continuidad"
                  : operation === "restore"
                    ? "Documento de política firmado"
                    : operation === "vault"
                      ? "Firma de custodia"
                      : "Flag de custodia"}
              {operation === "submit" ? (
                <FlagInput value={value} onChange={setValue} disabled={busy} />
              ) : (
                <textarea
                  required
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  maxLength={operation === "restore" ? 2048 : 256}
                  spellCheck={false}
                />
              )}
            </label>
            <button disabled={busy}>
              {busy ? "Procesando…" : "Ejecutar solicitud"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
