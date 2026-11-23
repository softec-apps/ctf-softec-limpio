import type { PublicCompetition } from "../../../../packages/competition-contracts";

export type AuditoriumDisplay = {
  snapshot: PublicCompetition | null;
  connected: boolean;
  page: number;
  categoryPage: number;
};
const colors = {
  bg: "#102735",
  surface: "#193443",
  text: "#e6eeec",
  muted: "#b0c5cd",
  mint: "#9ac8b6",
  gold: "#e5ba73",
  line: "#35515f",
};
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color = colors.text,
  maxWidth = 1800,
) {
  ctx.fillStyle = color;
  ctx.font = `500 ${size}px Arial, sans-serif`;
  ctx.fillText(value, x, y, maxWidth);
}
function base(ctx: CanvasRenderingContext2D, title: string) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, width, 140);
  ctx.textAlign = "left";
  text(ctx, title, 56, 92, 52, colors.mint, width - 100);
}
export function paintMainScreen(
  ctx: CanvasRenderingContext2D,
  display: AuditoriumDisplay,
) {
  base(ctx, "Seventech CTF");
  const { snapshot, connected, page, categoryPage } = display;
  ctx.textAlign = "right";
  text(
    ctx,
    !snapshot
      ? "Conectando…"
      : !connected
        ? "Sin conexión · últimos resultados"
        : snapshot.competition.open
          ? "Competencia abierta · En directo"
          : "Competencia cerrada",
    1990,
    88,
    32,
    connected ? colors.mint : colors.gold,
    960,
  );
  ctx.textAlign = "left";
  text(ctx, "Clasificación general", 56, 222, 66);
  if (!snapshot) {
    text(
      ctx,
      "Preparando los resultados de la competencia…",
      56,
      430,
      44,
      colors.muted,
    );
    return;
  }
  if (!snapshot.entries.length)
    text(
      ctx,
      "El marcador espera a los primeros participantes.",
      56,
      430,
      44,
      colors.muted,
    );
  else {
    text(ctx, "Pos.", 68, 293, 30, colors.muted);
    text(ctx, "Participante", 230, 293, 30, colors.muted);
    text(ctx, "Retos", 1390, 293, 30, colors.muted);
    text(ctx, "Errores", 1580, 293, 30, colors.muted);
    text(ctx, "Puntos", 1820, 293, 30, colors.muted);
    snapshot.entries.slice(page * 7, page * 7 + 7).forEach((entry, index) => {
      const y = 367 + index * 78;
      if (index % 2 === 0) {
        ctx.fillStyle = colors.surface;
        ctx.fillRect(48, y - 52, 1952, 76);
      }
      text(
        ctx,
        String(entry.position).padStart(2, "0"),
        68,
        y,
        42,
        entry.position <= 3 ? colors.gold : colors.muted,
      );
      text(ctx, entry.alias, 230, y, 48, colors.text, 1080);
      ctx.textAlign = "right";
      text(ctx, String(entry.solved), 1470, y, 42, colors.muted, 160);
      text(
        ctx,
        String(entry.incorrectAttempts),
        1690,
        y,
        42,
        colors.muted,
        180,
      );
      text(
        ctx,
        entry.score.toLocaleString("es-EC"),
        1940,
        y,
        52,
        colors.gold,
        270,
      );
      ctx.textAlign = "left";
    });
  }
  ctx.fillStyle = colors.line;
  ctx.fillRect(56, 895, 1936, 2);
  snapshot.categories
    .slice(categoryPage * 4, categoryPage * 4 + 4)
    .forEach((category, index) => {
      const x = 56 + index * 490;
      text(ctx, category.name, x, 951, 27, colors.text, 445);
      ctx.fillStyle = colors.line;
      ctx.fillRect(x, 979, 442, 8);
      ctx.fillStyle = colors.mint;
      ctx.fillRect(
        x,
        979,
        (442 * category.solved) / Math.max(1, category.challenges),
        8,
      );
      text(
        ctx,
        `${category.solved}/${category.challenges} retos · ${category.resolutions} resoluciones`,
        x,
        1029,
        24,
        colors.muted,
        445,
      );
    });
  text(
    ctx,
    `Página ${page + 1}/${Math.max(1, Math.ceil(snapshot.entries.length / 7))} · Máximo ${snapshot.stats.maxScore} puntos`,
    56,
    1110,
    26,
    colors.muted,
  );
  ctx.textAlign = "right";
  text(
    ctx,
    `Actualizado ${new Date(snapshot.updatedAt).toLocaleTimeString("es-EC", { hour12: false })}`,
    1990,
    1110,
    26,
    colors.muted,
    800,
  );
  ctx.textAlign = "left";
}
export function paintSideScreen(
  ctx: CanvasRenderingContext2D,
  display: AuditoriumDisplay,
  content: "stats" | "activity",
) {
  base(ctx, content === "stats" ? "La competencia" : "Últimas conquistas");
  const snapshot = display.snapshot;
  if (!snapshot) {
    text(ctx, "Sincronizando…", 56, 240, 40, colors.muted);
    return;
  }
  if (content === "stats") {
    const distinct = snapshot.categories.reduce(
      (sum, category) => sum + category.solved,
      0,
    );
    [
      [snapshot.stats.participants, "Participantes"],
      [snapshot.stats.resolutions, "Resoluciones"],
      [snapshot.stats.attempts, "Entregas recibidas"],
      [distinct, `Retos conquistados de ${snapshot.stats.challenges}`],
    ].forEach(([value, label], index) => {
      const y = 300 + index * 245;
      text(
        ctx,
        Number(value).toLocaleString("es-EC"),
        56,
        y,
        100,
        colors.gold,
        650,
      );
      text(ctx, String(label), 60, y + 65, 34, colors.muted, 650);
      ctx.fillStyle = colors.line;
      ctx.fillRect(56, y + 110, 650, 2);
    });
  } else if (!snapshot.activity.length)
    text(ctx, "Esperando resoluciones", 56, 250, 34, colors.muted, 650);
  else
    snapshot.activity.slice(0, 5).forEach((event, index) => {
      const y = 220 + index * 212;
      text(ctx, event.alias, 56, y, 38, colors.text, 550);
      text(ctx, `+${event.points}`, 620, y, 40, colors.mint, 100);
      text(ctx, event.title, 56, y + 57, 29, colors.muted, 650);
      text(
        ctx,
        new Date(event.createdAt).toLocaleTimeString("es-EC", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        56,
        y + 105,
        26,
        colors.muted,
        650,
      );
      ctx.fillStyle = colors.line;
      ctx.fillRect(56, y + 145, 650, 2);
    });
}
export function paintPodium(
  ctx: CanvasRenderingContext2D,
  entry: PublicCompetition["entries"][number] | undefined,
  position: number,
) {
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, 1024, 384);
  ctx.textAlign = "center";
  text(
    ctx,
    String(entry?.position ?? position),
    512,
    100,
    74,
    colors.gold,
    950,
  );
  text(ctx, entry?.alias ?? "Por conquistar", 512, 209, 56, colors.text, 950);
  text(
    ctx,
    entry
      ? `${entry.score} ${entry.score === 1 ? "punto" : "puntos"} · ${entry.solved} ${entry.solved === 1 ? "reto" : "retos"}`
      : "Seventech CTF",
    512,
    300,
    40,
    colors.mint,
    950,
  );
  ctx.textAlign = "left";
}
