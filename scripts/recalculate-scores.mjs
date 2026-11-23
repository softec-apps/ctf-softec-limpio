import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "../apps/api/dist/db.js";
import {
  scoringEntries,
  FINAL_POINTS,
} from "../apps/api/dist/scoring/policy.js";

try {
  await db.competition.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  const result = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Competition" WHERE "id"=1 FOR UPDATE`;
      const [challenges, solves, finals] = await Promise.all([
        tx.challenge.findMany({
          select: { id: true, points: true, enabled: true },
        }),
        tx.solve.findMany({
          select: {
            id: true,
            userId: true,
            challengeId: true,
            points: true,
            createdAt: true,
          },
        }),
        tx.privilegedLab.findMany({
          where: { completedAt: { not: null } },
          select: { userId: true, awardedPoints: true, completedAt: true },
        }),
      ]);
      const entries = scoringEntries();
      if (entries.some((entry) => !challenges.some((c) => c.id === entry.id)))
        throw new Error("Faltan retos. Ejecuta primero npm run db:seed.");
      mkdirSync(".local/scoring-backups", { recursive: true });
      writeFileSync(
        `.local/scoring-backups/recalculate-${Date.now()}.json`,
        JSON.stringify({ challenges, solves, finals }),
        { mode: 0o600, flag: "wx" },
      );
      let changed = 0;
      for (const entry of entries) {
        await tx.challenge.updateMany({
          where: { id: entry.id, points: { not: entry.points } },
          data: { points: entry.points },
        });
        changed += (
          await tx.solve.updateMany({
            where: { challengeId: entry.id, points: { not: entry.points } },
            data: { points: entry.points },
          })
        ).count;
      }
      await tx.privilegedLab.updateMany({
        where: {
          completedAt: { not: null },
          awardedPoints: { not: FINAL_POINTS },
        },
        data: { awardedPoints: FINAL_POINTS },
      });
      return {
        categories: new Set(entries.map((entry) => entry.category)).size,
        challenges: entries.length,
        repricedSolves: changed,
        finalPoints: FINAL_POINTS,
      };
    },
    { timeout: 30000 },
  );
  console.log(JSON.stringify(result));
} finally {
  await db.$disconnect();
}
