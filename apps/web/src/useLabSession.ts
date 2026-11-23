import { useEffect, useState } from "react";
import { api, post, ApiError, type User, type Game } from "./api";
export function useLabSession(active: boolean) {
  const [user, setUser] = useState<User | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [identity, progress] = await Promise.all([
        api<{ user: User }>("/me"),
        api<Game>("/game"),
      ]);
      setUser(identity.user);
      setGame(progress);
    } catch (failure) {
      setUser(null);
      setGame(null);
      if (!(failure instanceof ApiError && failure.status === 401))
        setError(
          failure instanceof Error
            ? failure.message
            : "No se pudo abrir la sesión.",
        );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (active) void refresh();
  }, [active]);
  async function login(alias: string, password: string) {
    await post("/auth/login", { alias, password });
    await refresh();
    window.dispatchEvent(new Event("ctf-session-changed"));
  }
  return { user, game, loading, error, refresh, login };
}
export type LabSession = ReturnType<typeof useLabSession>;
