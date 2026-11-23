export type RankingEntry = {
  position: number;
  alias: string;
  score: number;
  solved: number;
  incorrectAttempts: number;
};
export type RankingDisplay = {
  entries: RankingEntry[];
  phase: "loading" | "ready" | "signin" | "error";
  competitionOpen?: boolean;
};
export const topTen = (entries: RankingEntry[]) =>
  entries
    .slice(0, 10)
    .map(({ position, alias, score, solved, incorrectAttempts }) => ({
      position,
      alias,
      score,
      solved,
      incorrectAttempts,
    }));
export const rankingPoints = (score: number) =>
  score.toLocaleString("es", { maximumFractionDigits: 0 });
export function rankingMessage(display: RankingDisplay) {
  if (display.phase === "signin")
    return "Inicia sesión en el computador para consultar la clasificación.";
  if (display.phase === "loading")
    return "Consultando los resultados de la competencia…";
  if (display.phase === "error")
    return "No se pudo actualizar. Puedes volver a intentarlo.";
  return display.entries.length
    ? "A igual puntuación, menos errores. Si también empatan, comparten puesto."
    : "Aún no hay participantes en la clasificación.";
}
