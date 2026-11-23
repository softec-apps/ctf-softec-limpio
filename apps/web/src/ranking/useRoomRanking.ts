import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import { topTen, type RankingDisplay, type RankingEntry } from "./display";

export function useRoomRanking(active: boolean) {
  const [display, setDisplay] = useState<RankingDisplay>({
    entries: [],
    phase: "loading",
  });
  const [refreshing, setRefreshing] = useState(false);
  const pending = useRef<AbortController | null>(null),
    authenticated = useRef<boolean | null>(null);
  const commit = (next: RankingDisplay) =>
    setDisplay((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setRefreshing(true);
    try {
      const result = await api<{
        entries: RankingEntry[];
        competition: { open: boolean };
      }>("/ranking", { signal: controller.signal });
      if (controller.signal.aborted) return;
      authenticated.current = true;
      commit({
        entries: topTen(result.entries),
        phase: "ready",
        competitionOpen: result.competition.open,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        authenticated.current = false;
        commit({ entries: [], phase: "signin" });
      } else setDisplay((previous) => ({ ...previous, phase: "error" }));
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setInterval> | undefined,
      queued: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (document.hidden) return;
      clearTimeout(queued);
      queued = setTimeout(() => void refresh(), 120);
    };
    const syncVisibility = () => {
      clearInterval(timer);
      clearTimeout(queued);
      if (document.hidden) {
        pending.current?.abort();
        return;
      }
      schedule();
      timer = setInterval(() => {
        if (authenticated.current !== false) schedule();
      }, 30000);
    };
    const events = [
      "ctf-progress-changed",
      "ctf-session-changed",
      "ctf-competition-changed",
      "ctf-ranking-changed",
    ];
    events.forEach((name) => window.addEventListener(name, schedule));
    document.addEventListener("visibilitychange", syncVisibility);
    syncVisibility();
    return () => {
      clearInterval(timer);
      clearTimeout(queued);
      pending.current?.abort();
      events.forEach((name) => window.removeEventListener(name, schedule));
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [active, refresh]);
  return { display, refresh, refreshing };
}
