import { rankingMessage, rankingPoints, type RankingDisplay } from "./display";
export const TV_CANVAS_WIDTH = 1280,
  TV_CANVAS_HEIGHT = 720;
function fitAlias(ctx: CanvasRenderingContext2D, text: string) {
  const chars = Array.from(text);
  while (
    chars.length &&
    ctx.measureText(
      chars.join("") + (chars.length < Array.from(text).length ? "…" : ""),
    ).width > 650
  )
    chars.pop();
  return chars.join("") + (chars.length < Array.from(text).length ? "…" : "");
}
export function paintTelevision(
  ctx: CanvasRenderingContext2D,
  display: RankingDisplay,
) {
  ctx.fillStyle = "#0c181d";
  ctx.fillRect(0, 0, TV_CANVAS_WIDTH, TV_CANVAS_HEIGHT);
  ctx.fillStyle = "#14282d";
  ctx.fillRect(0, 0, TV_CANVAS_WIDTH, 120);
  ctx.fillStyle = "#92d2bf";
  ctx.fillRect(64, 34, 52, 52);
  ctx.fillStyle = "#102027";
  ctx.font = "600 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText("7", 90, 76);
  ctx.textAlign = "left";
  ctx.fillStyle = "#d8e6e8";
  ctx.font = "600 25px Arial";
  ctx.fillText("SEVENTECH", 142, 62);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#9bb4ba";
  ctx.fillText("LABORATORIO / CAPTURE THE FLAG", 142, 91);
  ctx.textAlign = "right";
  ctx.font = "19px Arial";
  ctx.fillStyle = display.competitionOpen === false ? "#e2bd85" : "#9bcebc";
  ctx.fillText(
    display.phase === "ready"
      ? display.competitionOpen === false
        ? "Competencia cerrada"
        : "Competencia abierta"
      : display.phase === "signin"
        ? "Acceso del participante"
        : display.phase === "loading"
          ? "Sincronizando…"
          : "Sin sincronizar",
    1216,
    69,
  );
  ctx.textAlign = "left";
  ctx.fillStyle = "#edf3f1";
  ctx.font = "500 40px Arial";
  ctx.fillText("Los diez mejores", 64, 178);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#91aab2";
  ctx.fillText("PUESTO", 78, 221);
  ctx.fillText("PARTICIPANTE", 190, 221);
  ctx.textAlign = "right";
  ctx.fillText("ERRORES", 1035, 221);
  ctx.fillText("PUNTOS", 1194, 221);
  for (let index = 0; index < 10; index++) {
    const entry = display.entries[index],
      y = 260 + index * 38;
    if (index % 2 === 0) {
      ctx.fillStyle = "#15262c";
      ctx.fillRect(64, y - 27, 1152, 36);
    }
    ctx.textAlign = "left";
    ctx.font = "22px Arial";
    ctx.fillStyle = entry?.position === 1 ? "#e5c692" : "#8ba4ad";
    ctx.fillText(String(entry?.position ?? index + 1).padStart(2, "0"), 86, y);
    ctx.font = "25px Arial";
    ctx.fillStyle = entry ? "#e3ecec" : "#4b626b";
    ctx.fillText(entry ? fitAlias(ctx, entry.alias) : "—", 190, y);
    ctx.textAlign = "right";
    ctx.font = "22px Arial";
    ctx.fillText(entry ? String(entry.incorrectAttempts) : "—", 1035, y);
    ctx.font = "600 26px Arial";
    ctx.fillStyle = entry ? "#a9d6c7" : "#4b626b";
    ctx.fillText(entry ? rankingPoints(entry.score) : "—", 1194, y);
  }
  ctx.fillStyle = "#30464e";
  ctx.fillRect(64, 654, 1152, 1);
  ctx.textAlign = "left";
  ctx.fillStyle = "#91aab2";
  ctx.font = "18px Arial";
  ctx.fillText(rankingMessage(display), 64, 691);
}
