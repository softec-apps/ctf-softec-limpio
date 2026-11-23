import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { lockCompetition, requireOpen } from "../competition/service";
import { flagVerifier, matchesFlag } from "../security";
import { maintenanceArtifacts } from "./artifacts";
import { FINAL_POINTS } from "../scoring/policy";
import {
  initialPrivilegedState,
  operateMaintenance,
  type MaintenanceAction,
  type PrivilegedState,
} from "./engine";
export async function maintenance(
  user: { id: string; role: string },
  action: MaintenanceAction | { op: "submit"; flag: string },
) {
  await db.privilegedLab.createMany({
    data: [
      {
        userId: user.id,
        state: initialPrivilegedState() as unknown as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });
  const outcome = await db.$transaction(async (tx) => {
    if (action.op === "submit") requireOpen(await lockCompetition(tx));
    await tx.$queryRaw`SELECT "userId" FROM "PrivilegedLab" WHERE "userId"=${user.id} FOR UPDATE`;
    const row = await tx.privilegedLab.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const state = row.state as unknown as PrivilegedState;
    const artifacts = maintenanceArtifacts(user.id);
    if (action.op === "submit") {
      if (user.role !== "PARTICIPANT")
        throw new ForbiddenException(
          "Las cuentas administrativas no compiten.",
        );
      if (
        !state.vault ||
        !matchesFlag(action.flag, flagVerifier(artifacts.flag))
      ) {
        await tx.privilegedLab.update({
          where: { userId: user.id },
          data: { incorrectSubmissions: { increment: 1 } },
        });
        return { incorrect: true as const };
      }
      await tx.privilegedLab.update({
        where: { userId: user.id },
        data: {
          completedAt: row.completedAt ?? new Date(),
          awardedPoints: FINAL_POINTS,
        },
      });
      return {
        title: "Resolución registrada",
        body: row.awardedPoints
          ? "El reto final ya estaba registrado. Conservas sus 100 puntos."
          : "El último privilegio ha quedado registrado en tu cuenta: 100 puntos.",
        completed: true,
        awardedPoints: row.awardedPoints ? 0 : FINAL_POINTS,
      };
    }
    let reply;
    try {
      reply = operateMaintenance(state, action, artifacts);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Operación de supervisión no válida.",
      );
    }
    await tx.privilegedLab.update({
      where: { userId: user.id },
      data: { state: state as unknown as Prisma.InputJsonValue },
    });
    return reply;
  });
  if ("incorrect" in outcome)
    throw new BadRequestException(
      "No hay una evidencia válida de custodia para esta entrega.",
    );
  return outcome;
}
