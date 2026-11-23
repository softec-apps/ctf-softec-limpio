import { test } from "node:test";
import assert from "node:assert/strict";
import {
  paintMainScreen,
  paintSideScreen,
  paintPodium,
} from "../apps/web/src/auditorium/paintAuditorium";
import type { PublicCompetition } from "../packages/competition-contracts";
function surface(width = 2048, height = 1152) {
  const words: string[] = [];
  const ctx = {
    canvas: { width, height },
    fillRect() {},
    fillText(value: string) {
      words.push(value);
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, words };
}
const snapshot: PublicCompetition = {
  updatedAt: "2026-11-03T15:00:00Z",
  competition: { open: true, closedAt: null },
  stats: {
    participants: 9,
    resolutions: 20,
    attempts: 40,
    challenges: 250,
    available: 250,
    maxScore: 575,
  },
  entries: Array.from({ length: 9 }, (_, index) => ({
    position: index + 1,
    alias: `equipo_${index + 1}`,
    score: 103 - index,
    solved: 7 - Math.min(6, index),
    incorrectAttempts: 0,
  })),
  categories: [
    { name: "Bases de datos", challenges: 10, solved: 2, resolutions: 3 },
  ],
  activity: [
    {
      alias: "equipo_1",
      title: "Reto final",
      points: 100,
      createdAt: "2026-11-03T15:00:00Z",
    },
  ],
};
test("la pantalla3D conserva clasificación y puntos oficiales, pagina de siete en siete y usa Seventech CTF", () => {
  const { ctx, words } = surface();
  paintMainScreen(ctx, { snapshot, connected: true, page: 0, categoryPage: 0 });
  assert.ok(words.includes("Seventech CTF"));
  assert.ok(words.includes("equipo_1"));
  assert.ok(words.includes("equipo_7"));
  assert.ok(!words.includes("equipo_8"));
  assert.ok(words.includes("103"));
  assert.ok(words.some((word) => word.includes("Máximo 575 puntos")));
  words.length = 0;
  paintMainScreen(ctx, { snapshot, connected: true, page: 1, categoryPage: 0 });
  assert.ok(words.includes("equipo_8"));
  assert.ok(words.includes("equipo_9"));
  assert.ok(!words.includes("equipo_1"));
  assert.ok(words.some((word) => word.includes("Página 2/2")));
});
test("las pantallas distinguen carga, vacío, conexión caída y competencia cerrada", () => {
  const { ctx, words } = surface();
  paintMainScreen(ctx, {
    snapshot: null,
    connected: false,
    page: 0,
    categoryPage: 0,
  });
  assert.ok(words.includes("Conectando…"));
  words.length = 0;
  paintMainScreen(ctx, {
    snapshot,
    connected: false,
    page: 0,
    categoryPage: 0,
  });
  assert.ok(words.includes("Sin conexión · últimos resultados"));
  assert.ok(words.includes("equipo_1"));
  words.length = 0;
  paintMainScreen(ctx, {
    snapshot: {
      ...snapshot,
      entries: [],
      competition: { open: false, closedAt: snapshot.updatedAt },
    },
    connected: true,
    page: 0,
    categoryPage: 0,
  });
  assert.ok(words.includes("Competencia cerrada"));
  assert.ok(words.some((word) => word.includes("primeros participantes")));
  assert.ok(!words.includes("equipo_1"));
});
test("pantallas laterales y podio presentan la evidencia pública sin inventar ganadores", () => {
  const { ctx, words } = surface(768, 1280);
  paintSideScreen(
    ctx,
    { snapshot, connected: true, page: 0, categoryPage: 0 },
    "activity",
  );
  assert.ok(words.includes("equipo_1"));
  assert.ok(words.includes("Reto final"));
  assert.ok(words.includes("+100"));
  words.length = 0;
  paintSideScreen(
    ctx,
    { snapshot, connected: true, page: 0, categoryPage: 0 },
    "stats",
  );
  assert.ok(words.includes("9"));
  assert.ok(words.includes("20"));
  assert.ok(words.includes("2"));
  words.length = 0;
  paintPodium(ctx, snapshot.entries[0], 1);
  assert.ok(words.includes("equipo_1"));
  assert.ok(words.includes("103 puntos · 7 retos"));
  words.length = 0;
  paintPodium(ctx, undefined, 3);
  assert.ok(words.includes("Por conquistar"));
  assert.ok(!words.includes("equipo_1"));
});
