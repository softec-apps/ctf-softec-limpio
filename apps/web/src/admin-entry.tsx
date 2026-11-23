import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { LogOut, ShieldCheck } from "lucide-react";
import { api, ApiError, post, type User } from "./api";
import AdminAccess from "./competition/AdminAccess";
import AdminDashboard from "./competition/AdminDashboard";
import "./style.css";
import "./competition/admin.css";

function AdminApplication() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    try {
      setUser((await api<{ user: User }>("/admin/auth/me")).user);
      setError("");
    } catch (error) {
      if (!(error instanceof ApiError && [401, 403].includes(error.status)))
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo conectar con el servidor.",
        );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    document.title = "Administración · Seventech CTF";
    void load();
  }, []);
  async function logout() {
    try {
      await post("/admin/auth/logout");
      setUser(null);
      setError("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo cerrar la sesión.",
      );
    }
  }
  return (
    <div className="admin-site">
      <a className="admin-skip-link" href="#admin-main">
        Ir al contenido
      </a>
      <header className="admin-site-header">
        <span>
          <ShieldCheck size={24} aria-hidden="true" />
          <strong>Seventech</strong>
          <small>Administración de la competencia</small>
        </span>
        {user && (
          <div>
            <span>{user.alias}</span>
            <button className="secondary" onClick={() => void logout()}>
              <LogOut size={16} aria-hidden="true" /> Cerrar sesión
            </button>
          </div>
        )}
      </header>
      <main id="admin-main" tabIndex={-1}>
        {error && (
          <div className="admin-site-error">
            <p className="error" role="alert">
              {error}
            </p>
            <button className="secondary" onClick={() => void load()}>
              Volver a intentar
            </button>
          </div>
        )}
        {loading ? (
          <p role="status">Comprobando acceso…</p>
        ) : user ? (
          <AdminDashboard />
        ) : (
          <AdminAccess onUser={setUser} />
        )}
      </main>
      <footer className="admin-site-footer">
        Seventech · Panel de gestión · Cierre manual
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApplication />
  </StrictMode>,
);
