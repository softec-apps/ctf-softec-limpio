import { db } from "../db";
import { lockCompetition } from "../competition/service";
import { ENTRANCE_CHALLENGE } from "./catalog";
export async function creditEntrance(user: { id: string; role: string }) {
  if (user.role !== "PARTICIPANT") return 0;
  return db.$transaction(async (tx) => {
    if (!(await lockCompetition(tx)).open) return 0;
    const challenge = await tx.challenge.findFirst({
      where: { id: ENTRANCE_CHALLENGE.id, enabled: true },
      select: { id: true, points: true },
    });
    if (!challenge) return 0;
    const result = await tx.solve.createMany({
      data: [
        {
          userId: user.id,
          challengeId: challenge.id,
          points: challenge.points,
        },
      ],
      skipDuplicates: true,
    });
    if (!result.count) return 0;
    await tx.submission.create({
      data: { userId: user.id, challengeId: challenge.id, correct: true },
    });
    return challenge.points;
  });
}
