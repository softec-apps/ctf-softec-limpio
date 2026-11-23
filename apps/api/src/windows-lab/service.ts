import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { linuxNetwork } from "../linux-network/service";
import { lockCompetition, requireOpen } from "../competition/service";
import { flagValue, flagVerifier, matchesFlag } from "../security";
import { WINDOWS_INTERACTIVE_CHALLENGES } from "./catalog";
import {
  initialWindowsState,
  executeWindows,
  presentWindows,
  type WindowsState,
  type WindowsAccess,
} from "./engine";

const json = (state: WindowsState) => state as unknown as Prisma.InputJsonValue;
const flag = (userId: string, index: number) =>
  flagValue(`windows-lab:v1:${userId}:${index}`);

async function ensureWindows(userId: string) {
  await linuxNetwork(userId);
  await db.windowsLab.upsert({
    where: { userId },
    create: { userId, state: json(initialWindowsState()) },
    update: {},
  });
}

async function windowsContext(tx: Prisma.TransactionClient, userId: string) {
  const ids = WINDOWS_INTERACTIVE_CHALLENGES.map((challenge) => challenge.id);
  await tx.$queryRaw`SELECT "id" FROM "Challenge" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR SHARE`;
  const [network, challenges, solves] = await Promise.all([
    tx.linuxNetwork.findUniqueOrThrow({ where: { userId } }),
    tx.challenge.findMany({
      where: { id: { in: WINDOWS_INTERACTIVE_CHALLENGES.map((c) => c.id) } },
      select: { id: true, enabled: true, points: true },
    }),
    tx.solve.findMany({
      where: {
        userId,
        challengeId: { in: WINDOWS_INTERACTIVE_CHALLENGES.map((c) => c.id) },
      },
      select: { challengeId: true, points: true },
    }),
  ]);
  const access: WindowsAccess = {
    connected: (network.state as { connected?: boolean }).connected === true,
    enabled: challenges.filter((c) => c.enabled).map((c) => c.id),
    flag: (index) => flag(userId, index),
    password: (account) =>
      `Lab-${flagValue(`windows-password:v1:${userId}:${account}`).slice(4, 16)}!`,
  };
  return { access, challenges, solves };
}

function windowsPresentation(
  state: WindowsState,
  context: Awaited<ReturnType<typeof windowsContext>>,
) {
  const view = presentWindows(state, context.access);
  return {
    ...view,
    hosts: view.hosts.map((host) => ({
      ...host,
      points:
        context.challenges.find((c) => c.id === host.id)?.points ?? host.points,
    })),
    solved: context.solves.map((s) => s.challengeId),
    score: context.solves.reduce((total, solve) => total + solve.points, 0),
  };
}

export async function windowsView(userId: string) {
  await ensureWindows(userId);
  return db.$transaction(async (tx) => {
    const row = await tx.windowsLab.findUniqueOrThrow({ where: { userId } });
    return windowsPresentation(
      row.state as unknown as WindowsState,
      await windowsContext(tx, userId),
    );
  });
}

export async function windowsCommand(
  user: { id: string; role: string },
  command: string,
  source: "local" | "remote",
) {
  if (!command.trim() || command.length > 2048)
    throw new BadRequestException(
      "Escribe un comando de hasta 2048 caracteres.",
    );
  await ensureWindows(user.id);
  return db.$transaction(async (tx) => {
    // VPN precedes Windows state, matching the shared network's lock order.
    await tx.$queryRaw`SELECT "userId" FROM "LinuxNetwork" WHERE "userId"=${user.id} FOR SHARE`;
    await tx.$queryRaw`SELECT "userId" FROM "WindowsLab" WHERE "userId"=${user.id} FOR UPDATE`;
    const row = await tx.windowsLab.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const context = await windowsContext(tx, user.id);
    let state = structuredClone(row.state as unknown as WindowsState);
    let output: string;
    try {
      output = executeWindows(state, command, context.access, source);
      if (Buffer.byteLength(JSON.stringify(state)) > 131072)
        throw new Error(
          "Cuota del laboratorio Windows alcanzada. Restaura el objetivo para liberar espacio.",
        );
    } catch (error) {
      state = row.state as unknown as WindowsState;
      output =
        error instanceof Error ? error.message : "No se pudo operar Windows.";
    }
    await tx.windowsLab.update({
      where: { userId: user.id },
      data: { state: json(state) },
    });
    return { output, view: windowsPresentation(state, context) };
  });
}

export async function submitWindowsFlag(
  user: { id: string; role: string },
  id: string,
  value: string,
) {
  if (user.role !== "PARTICIPANT")
    throw new ForbiddenException("Usa una cuenta participante para competir.");
  await ensureWindows(user.id);
  return db.$transaction(async (tx) => {
    requireOpen(await lockCompetition(tx));
    await tx.$queryRaw`SELECT "userId" FROM "WindowsLab" WHERE "userId"=${user.id} FOR UPDATE`;
    const index = WINDOWS_INTERACTIVE_CHALLENGES.findIndex((c) => c.id === id);
    await tx.$queryRaw`SELECT "id" FROM "Challenge" WHERE "id"=${id} FOR SHARE`;
    const challenge = await tx.challenge.findFirst({
      where: { id, enabled: true },
    });
    if (index < 0 || !challenge)
      throw new NotFoundException("El reto no está disponible.");
    const row = await tx.windowsLab.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const state = row.state as unknown as WindowsState;
    const correct =
      state.proofs.includes(id) &&
      matchesFlag(value, flagVerifier(flag(user.id, index)));
    await tx.submission.create({
      data: { userId: user.id, challengeId: id, correct },
    });
    let awardedPoints = 0;
    if (correct) {
      const result = await tx.solve.createMany({
        data: [{ userId: user.id, challengeId: id, points: challenge.points }],
        skipDuplicates: true,
      });
      if (result.count) awardedPoints = challenge.points;
    }
    return {
      correct,
      awardedPoints,
      message: correct
        ? "Operación y evidencia validadas. Tu progreso está guardado."
        : "Realiza la operación en tu laboratorio y recupera su evidencia antes de entregar la flag.",
    };
  });
}

export const windowsSeedVerifier = (id: string) =>
  flagVerifier(flagValue(`windows-lab:reserved:${id}`));
