import type { Prisma } from "@prisma/client";
import { db } from "../db";

export async function readRanking(
  client: Pick<Prisma.TransactionClient, "user"> = db,
) {
  const rows = await client.user.findMany({
    where: { role: "PARTICIPANT" },
    select: {
      alias: true,
      solves: { select: { points: true, createdAt: true } },
      _count: { select: { submissions: { where: { correct: false } } } },
      privilegedLab: {
        select: {
          awardedPoints: true,
          completedAt: true,
          incorrectSubmissions: true,
        },
      },
    },
  });
  const ordered = rows
    .map((u) => ({
      alias: u.alias,
      score:
        u.solves.reduce((n, s) => n + s.points, 0) +
        (u.privilegedLab?.awardedPoints ?? 0),
      solved: u.solves.length + (u.privilegedLab?.awardedPoints ? 1 : 0),
      lastSolve:
        u.solves.length || u.privilegedLab?.awardedPoints
          ? Math.max(
              ...u.solves.map((s) => s.createdAt.getTime()),
              u.privilegedLab?.awardedPoints && u.privilegedLab.completedAt
                ? u.privilegedLab.completedAt.getTime()
                : 0,
            )
          : null,
      incorrectAttempts:
        u._count.submissions + (u.privilegedLab?.incorrectSubmissions ?? 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.incorrectAttempts - b.incorrectAttempts ||
        a.alias.localeCompare(b.alias),
    );
  let position = 0;
  return ordered.map((entry, index) => {
    const previous = ordered[index - 1];
    if (
      !previous ||
      previous.score !== entry.score ||
      previous.incorrectAttempts !== entry.incorrectAttempts
    )
      position = index + 1;
    return { ...entry, position };
  });
}
