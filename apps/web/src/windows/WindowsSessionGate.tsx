import { useState, type ReactNode } from "react";
import type { LabSession } from "../useLabSession";
export default function LabSessionGate({
  session,
  children,
}: {
  session: LabSession;
  children: ReactNode;
}) {
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (session.loading && !session.user)
    return (
      <p className="win-lab-message" role="status">
        Abriendo sesión del laboratorio…
      </p>
    );
  if (session.user) return <>{children}</>;
  return (
    <form
      className="win-lab-login"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          await session.login(alias, password);
          setPassword("");
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudo iniciar sesión.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Laboratorio Windows</h2>
      <p>
        Usa tu cuenta del laboratorio. Para crear una cuenta, abre el computador
        principal de la sala.
      </p>
      <label>
        Alias
        <input
          value={alias}
          autoComplete="username"
          onChange={(event) => setAlias(event.target.value)}
          required
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {(error || session.error) && <p role="alert">{error || session.error}</p>}
      <button disabled={busy}>Iniciar sesión</button>
    </form>
  );
}
