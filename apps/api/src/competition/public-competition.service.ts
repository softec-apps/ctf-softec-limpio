import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { PublicCompetition } from "../../../../packages/competition-contracts";
import { db } from "../db";
import { FINAL_POINTS, SCORING_CATEGORIES, scoreFor } from "../scoring/policy";
import { readRanking } from "./ranking";

@Injectable()
export class PublicCompetitionService {
  private cached: PublicCompetition | null = null;
  private pending: Promise<PublicCompetition> | null = null;
  private expiresAt = 0;

  snapshot(): Promise<PublicCompetition> {
    if (this.cached && Date.now() < this.expiresAt)
      return Promise.resolve(this.cached);
    if (this.pending) return this.pending;
    this.pending = this.readSnapshot()
      .then((snapshot) => {
        this.cached = snapshot;
        this.expiresAt = Date.now() + 1500;
        return snapshot;
      })
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  }

  private async readSnapshot(): Promise<PublicCompetition> {
    return db.$transaction(
      async (tx) => {
        const entries = await readRanking(tx);
        const competition = await tx.competition.findUnique({
          where: { id: 1 },
          select: { open: true, closedAt: true },
        });
        const challenges = await tx.challenge.findMany({
          select: { id: true, points: true, enabled: true },
        });
        const grouped = await tx.solve.groupBy({
          by: ["challengeId"],
          where: { user: { role: "PARTICIPANT" } },
          _count: { _all: true },
        });
        const latest = await tx.solve.findMany({
          where: { user: { role: "PARTICIPANT" } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 6,
          select: {
            points: true,
            createdAt: true,
            user: { select: { alias: true } },
            challenge: { select: { title: true } },
          },
        });
        const finals = await tx.privilegedLab.findMany({
          where: {
            user: { role: "PARTICIPANT" },
            awardedPoints: { gt: 0 },
            completedAt: { not: null },
          },
          orderBy: { completedAt: "desc" },
          take: 6,
          select: {
            awardedPoints: true,
            completedAt: true,
            user: { select: { alias: true } },
          },
        });
        const attempts = await tx.submission.count({
          where: { user: { role: "PARTICIPANT" } },
        });
        const counts = new Map(
          grouped.map((group) => [group.challengeId, group._count._all]),
        );
        return {
          updatedAt: new Date().toISOString(),
          competition: {
            open: competition?.open ?? true,
            closedAt: competition?.closedAt?.toISOString() ?? null,
          },
          stats: {
            participants: entries.length,
            resolutions: entries.reduce((sum, entry) => sum + entry.solved, 0),
            attempts,
            challenges: challenges.length,
            available: challenges.filter((challenge) => challenge.enabled)
              .length,
            maxScore:
              challenges.reduce((sum, challenge) => sum + challenge.points, 0) +
              FINAL_POINTS,
          },
          entries: entries.map(
            ({ position, alias, score, solved, incorrectAttempts }) => ({
              position,
              alias,
              score,
              solved,
              incorrectAttempts,
            }),
          ),
          categories: SCORING_CATEGORIES.map((group) => {
            const cases = challenges.filter(
              (challenge) => scoreFor(challenge.id).category === group.category,
            );
            return {
              name: group.category,
              challenges: cases.length,
              solved: cases.filter((challenge) => counts.has(challenge.id))
                .length,
              resolutions: cases.reduce(
                (sum, challenge) => sum + (counts.get(challenge.id) ?? 0),
                0,
              ),
            };
          }),
          activity: [
            ...latest.map((solve) => ({
              alias: solve.user.alias,
              title: solve.challenge.title,
              points: solve.points,
              createdAt: solve.createdAt.toISOString(),
            })),
            ...finals.map((final) => ({
              alias: final.user.alias,
              title: "Reto final",
              points: final.awardedPoints,
              createdAt: final.completedAt!.toISOString(),
            })),
          ]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 6),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
