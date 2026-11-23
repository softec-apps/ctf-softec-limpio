import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  WirelessId,
  WirelessState,
} from "../../../../packages/wireless-contracts";
import { db } from "../db";
import { lockCompetition, requireOpen } from "../competition/service";
import { flagValue, flagVerifier, matchesFlag } from "../security";
import {
  configDigest,
  executeWireless,
  initialWirelessState,
  presentWireless,
  readyWireless,
} from "./engine";
import { isWirelessOperational } from "./scenarios";
import { hasWirelessAssessment } from "./learning";

const json = (state: WirelessState) =>
  state as unknown as Prisma.InputJsonValue;
const seedFor = (userId: string, id: WirelessId) =>
  flagValue(`wireless-layout:v2:${userId}:${id}`);
const proofFor = (userId: string, id: WirelessId, state: WirelessState) =>
  flagValue(
    `wireless-proof:${hasWirelessAssessment(id) ? "v3" : "v2"}:${userId}:${id}:${state.generation}:${configDigest(state)}`,
  );

async function context(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
) {
  if (!isWirelessOperational(id))
    throw new NotFoundException("Incidencia inalámbrica no disponible.");
  // All wireless operations lock Challenge before NetworkLab; scoring first locks Competition.
  await tx.$queryRaw`SELECT "id" FROM "Challenge" WHERE "id"=${id} FOR SHARE`;
  const challenge = await tx.challenge.findFirst({
    where: { id, enabled: true },
  });
  if (!challenge)
    throw new NotFoundException("Incidencia inalámbrica no disponible.");
  const seed = seedFor(userId, id);
  await tx.networkLab.upsert({
    where: { userId_scenarioId: { userId, scenarioId: id } },
    create: {
      userId,
      scenarioId: id,
      state: json(initialWirelessState(id, seed)),
    },
    update: {},
  });
  await tx.$queryRaw`SELECT "userId" FROM "NetworkLab" WHERE "userId"=${userId} AND "scenarioId"=${id} FOR UPDATE`;
  const row = await tx.networkLab.findUniqueOrThrow({
    where: { userId_scenarioId: { userId, scenarioId: id } },
  });
  let state = row.state as unknown as WirelessState;
  if (state.version !== 2)
    throw new ConflictException("Versión del laboratorio no compatible.");
  if (hasWirelessAssessment(id) && !state.learning) {
    // The expanded incidents start afresh; historical Solve rows are preserved.
    state = initialWirelessState(id, seed);
    await tx.networkLab.update({
      where: { userId_scenarioId: { userId, scenarioId: id } },
      data: { state: json(state), revision: { increment: 1 } },
    });
    row.revision++;
  }
  return { id, seed, row, state, challenge };
}

export async function wirelessView(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const labContext = await context(tx, userId, id);
    return presentWireless(
      labContext.id,
      labContext.row.revision,
      labContext.state,
      labContext.seed,
    );
  });
}

export async function wirelessCommand(
  userId: string,
  id: string,
  command: string,
  revision?: number,
) {
  if (!command.trim() || command.length > 2048)
    throw new BadRequestException("Usa un comando de hasta 2048 caracteres.");
  return db.$transaction(async (tx) => {
    const labContext = await context(tx, userId, id);
    if (revision !== undefined && revision !== labContext.row.revision)
      throw new ConflictException(
        "La consola cambió en otra ventana. Actualiza antes de continuar.",
      );
    const state = structuredClone(labContext.state);
    let output: string;
    try {
      output = executeWireless(
        labContext.id,
        state,
        command,
        labContext.seed,
        () => proofFor(userId, labContext.id, state),
      );
      if (Buffer.byteLength(JSON.stringify(state)) > 196608)
        throw new Error("Cuota de estado alcanzada. Usa reset --confirm.");
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "No se pudo operar la red.",
      );
    }
    await tx.networkLab.update({
      where: { userId_scenarioId: { userId, scenarioId: labContext.id } },
      data: { state: json(state), revision: { increment: 1 } },
    });
    return {
      output,
      view: presentWireless(
        labContext.id,
        labContext.row.revision + 1,
        state,
        labContext.seed,
      ),
    };
  });
}

export async function wirelessCapture(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const labContext = await context(tx, userId, id);
    return {
      format: "seventech-capture-v1",
      scope:
        "Trazas operativas del laboratorio inalámbrico; no es una captura de hardware.",
      packets: labContext.state.packets,
    };
  });
}

export async function submitWirelessFlag(
  user: { id: string; role: string },
  id: string,
  value: string,
) {
  if (user.role !== "PARTICIPANT")
    throw new ForbiddenException("Usa una cuenta participante para competir.");
  return db.$transaction(async (tx) => {
    requireOpen(await lockCompetition(tx));
    const labContext = await context(tx, user.id, id);
    const correct =
      labContext.state.verified === labContext.state.generation &&
      readyWireless(labContext.id, labContext.state, labContext.seed) &&
      matchesFlag(
        value,
        flagVerifier(proofFor(user.id, labContext.id, labContext.state)),
      );
    await tx.submission.create({
      data: { userId: user.id, challengeId: id, correct },
    });
    let awardedPoints = 0;
    if (correct) {
      const inserted = await tx.solve.createMany({
        data: [
          {
            userId: user.id,
            challengeId: id,
            points: labContext.challenge.points,
          },
        ],
        skipDuplicates: true,
      });
      if (inserted.count) awardedPoints = labContext.challenge.points;
    }
    return {
      correct,
      awardedPoints,
      message: correct
        ? "Cambio operativo y pruebas validados. Tu progreso está guardado."
        : "El comprobante debe proceder de tu laboratorio con todas las pruebas vigentes. Las respuestas del expediente anterior no acreditan esta incidencia.",
    };
  });
}
