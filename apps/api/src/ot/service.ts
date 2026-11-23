import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { initialOtState, otView, type OtState } from "./state";
import { operateOt } from "./engine";
import { getOtCase } from "./catalog";

export async function readOtDebrief(
  user: { id: string; role: string },
  id: string,
) {
  const entry = getOtCase(id);
  if (!entry) throw new NotFoundException("No hay análisis para este reto.");
  if (
    user.role !== "ADMIN" &&
    !(await db.solve.findUnique({
      where: { userId_challengeId: { userId: user.id, challengeId: id } },
      select: { id: true },
    }))
  )
    throw new ForbiddenException(
      "Resuelve el reto para consultar su análisis.",
    );
  return {
    reference: entry.reference,
    weakness: "CWE-" + entry.cwe,
    defense: entry.defense,
  };
}

async function ensureOtLab(userId: string) {
  return db.otLab.upsert({
    where: { userId },
    create: {
      userId,
      state: initialOtState() as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });
}
export async function readOtLab(userId: string) {
  const row = await ensureOtLab(userId);
  return { view: otView(row.state as OtState, row.revision) };
}
export async function otCommand(userId: string, command: string) {
  await ensureOtLab(userId);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "OtLab" WHERE "userId"=${userId} FOR UPDATE`;
    const row = await tx.otLab.findUniqueOrThrow({ where: { userId } });
    const enabled = await tx.challenge.findMany({
      where: { enabled: true, id: { startsWith: "ot-" } },
      select: { id: true },
    });
    let result;
    try {
      result = operateOt(
        row.state as OtState,
        command,
        enabled.map((c) => c.id),
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error && error.name !== "ZodError"
          ? error.message
          : "Estructura de petición no válida. Revisa los campos y sus tipos.",
      );
    }
    const revision = row.revision + (result.changed ? 1 : 0);
    if (result.changed) {
      result.state.history = [
        ...result.state.history,
        { sequence: revision, event: result.event! },
      ].slice(-20);
      await tx.otLab.update({
        where: { userId },
        data: {
          state: result.state as unknown as Prisma.InputJsonValue,
          revision,
        },
      });
    }
    return { output: result.output, view: otView(result.state, revision) };
  });
}
