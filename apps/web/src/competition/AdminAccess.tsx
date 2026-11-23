import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { post, type User } from "../api";
import "./competition.css";

export default function AdminAccess({
  onUser,
}: {
  onUser: (user: User) => void;
}) {
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await post("/admin/auth/login", {
        alias,
        password,
        adminOnly: true,
      });
      onUser(result.user);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="content-view admin-access"
      aria-labelledby="admin-access-title"
    >
      <span className="section-tag">
        <ShieldCheck size={18} aria-hidden="true" /> Administración
      </span>
      <h1 id="admin-access-title">Acceso a Administración</h1>
      <p className="muted">
        Inicia sesión para controlar la competencia, gestionar los retos y
        consultar los resultados.
      </p>
      <form onSubmit={login}>
        <label>
          Alias de administrador
          <input
            required
            minLength={3}
            maxLength={24}
            autoComplete="username"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
          />
        </label>
        <label>
          Contraseña de administrador
          <input
            type="password"
            required
            maxLength={128}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="secondary" disabled={busy}>
          {busy ? "Verificando…" : "Entrar a Administración"}
        </button>
      </form>
    </section>
  );
}
