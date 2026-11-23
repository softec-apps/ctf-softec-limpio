import { useEffect, useRef, useState } from "react";
import type { PublicCompetition } from "../../../../packages/competition-contracts";

export function usePublicCompetition() {
  const [snapshot, setSnapshot] = useState<PublicCompetition | null>(null);
  const [connected, setConnected] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const receivedAt = useRef(0);
  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      source?.close();
      clearTimeout(retry);
      if (document.hidden) return;
      source = new EventSource("/api/v1/public/competition/stream");
      source.onmessage = (event) => {
        try {
          const next: PublicCompetition = JSON.parse(event.data);
          if (
            !Array.isArray(next.entries) ||
            !Array.isArray(next.activity) ||
            !Array.isArray(next.categories) ||
            !next.stats ||
            typeof next.competition?.open !== "boolean"
          )
            throw new Error("Respuesta no válida");
          receivedAt.current = Date.now();
          setSnapshot(next);
          setConnected(true);
        } catch {
          setConnected(false);
        }
      };
      source.onerror = () => {
        setConnected(false);
        source?.close();
        clearTimeout(retry);
        if (!document.hidden) retry = setTimeout(connect, 3000);
      };
    };
    const visibility = () => {
      source?.close();
      clearTimeout(retry);
      setConnected(false);
      if (!document.hidden) connect();
    };
    connect();
    const watchdog = setInterval(() => {
      if (Date.now() - receivedAt.current > 10000) setConnected(false);
    }, 2000);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      source?.close();
      clearTimeout(retry);
      clearInterval(watchdog);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [attempt]);
  return {
    snapshot,
    connected,
    reconnect: () => setAttempt((value) => value + 1),
  };
}
