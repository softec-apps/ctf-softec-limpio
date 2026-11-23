import { NotFoundException } from "@nestjs/common";
import type { AdminUserResults } from "../../../../packages/competition-contracts";
import { db } from "../db";
import { readRanking } from "./ranking";

export async function readAdminUserResults(
  id: string,
): Promise<AdminUserResults> {
  return db.$transaction(
    async (tx) => {
      const [user, ranking] = await Promise.all([
        tx.user.findUnique({
          where: { id },
          select: {
            id: true,
            alias: true,
            role: true,
            createdAt: true,
            _count: { select: { submissions: { where: { correct: false } } } },
            solves: {
              select: {
                points: true,
                createdAt: true,
                challenge: {
                  select: {
                    id: true,
                    title: true,
                    category: true,
                    enabled: true,
                  },
                },
              },
            },
            privilegedLab: {
              select: {
                awardedPoints: true,
                completedAt: true,
                incorrectSubmissions: true,
              },
            },
          },
        }),
        readRanking(tx),
      ]);
      if (!user) throw new NotFoundException("Usuario no encontrado.");
      const results: AdminUserResults["results"] = user.solves.map((solve) => ({
        ...solve.challenge,
        points: solve.points,
        createdAt: solve.createdAt.toISOString(),
        hidden: false,
      }));
      if (user.privilegedLab?.awardedPoints)
        results.push({
          id: "hidden-final",
          title: "El último privilegio",
          category: "Reto oculto",
          points: user.privilegedLab.awardedPoints,
          createdAt: user.privilegedLab.completedAt?.toISOString() ?? null,
          enabled: true,
          hidden: true,
        });
      results.sort(
        (a, b) =>
          (a.createdAt ?? "9999").localeCompare(b.createdAt ?? "9999") ||
          a.id.localeCompare(b.id),
      );
      const entry =
        user.role === "PARTICIPANT"
          ? ranking.find((row) => row.alias === user.alias)
          : undefined;
      return {
        user: {
          id: user.id,
          alias: user.alias,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
        score: results.reduce((total, result) => total + result.points, 0),
        incorrectAttempts:
          user._count.submissions +
          (user.privilegedLab?.incorrectSubmissions ?? 0),
        solved: results.length,
        results,
        ranking: entry
          ? {
              position: entry.position,
              lastSolve: entry.lastSolve,
              peers: ranking
                .filter((row) => row.score === entry.score)
                .map(
                  ({
                    alias,
                    position,
                    score,
                    lastSolve,
                    incorrectAttempts,
                  }) => ({
                    alias,
                    position,
                    score,
                    lastSolve,
                    incorrectAttempts,
                  }),
                ),
            }
          : null,
        updatedAt: new Date().toISOString(),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
