import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { Competition, Prisma } from "@prisma/client";
import type { CompetitionStatus } from "../../../../packages/competition-contracts";
import { db } from "../db";

export const CLOSED_MESSAGE =
  "La competencia está cerrada. Puedes explorar el laboratorio, pero no se aceptan nuevas entregas ni se suman puntos.";

async function ensureCompetition(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`INSERT INTO "Competition" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING`;
}

// Every scoring transaction takes this lock before locking participant state.
// Closing waits for accepted deliveries to commit, then blocks later deliveries.
export async function lockCompetition(tx: Prisma.TransactionClient) {
  await ensureCompetition(tx);
  const [state] = await tx.$queryRaw<
    Competition[]
  >`SELECT * FROM "Competition" WHERE "id"=1 FOR SHARE`;
  return state;
}

export function requireOpen(state: Pick<Competition, "open">) {
  if (!state.open) throw new ForbiddenException(CLOSED_MESSAGE);
}

function present(state: Competition): CompetitionStatus {
  return {
    open: state.open,
    closedAt: state.closedAt?.toISOString() ?? null,
    revision: state.revision,
    updatedAt: state.updatedAt.toISOString(),
  };
}

export async function competitionStatus() {
  return db.$transaction(async (tx) => present(await lockCompetition(tx)));
}

export async function changeCompetition(
  adminId: string,
  change: { open: boolean; revision: number },
) {
  return db.$transaction(async (tx) => {
    await ensureCompetition(tx);
    const [current] = await tx.$queryRaw<
      Competition[]
    >`SELECT * FROM "Competition" WHERE "id"=1 FOR UPDATE`;
    if (current.revision !== change.revision)
      throw new ConflictException(
        "El estado cambió en otra ventana. Actualiza el panel antes de continuar.",
      );
    if (current.open === change.open) return present(current);
    const state = await tx.competition.update({
      where: { id: 1 },
      data: {
        open: change.open,
        closedAt: change.open ? null : new Date(),
        revision: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: change.open ? "competition.opened" : "competition.closed",
        target: "competition",
      },
    });
    return present(state);
  });
}
