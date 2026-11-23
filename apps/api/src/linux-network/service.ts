import { ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { lockCompetition, requireOpen } from "../competition/service";
import { flagValue, flagVerifier } from "../security";
import { LINUX_SERVERS, LINUX_ENTRY_HINT } from "./catalog";
import {
  executeLinux,
  initialLinuxState,
  linuxPrompt,
  refreshAccess,
  unlocked,
  canAttempt,
  type LinuxState,
  type LinuxAccess,
} from "./engine";
import type { LinuxNetworkView } from "../../../../packages/linux-contracts";
const json = (state: LinuxState) => state as unknown as Prisma.InputJsonValue;
const keyFor = (userId: string, level: number) =>
  flagValue(`linux-network:v1:${userId}:${level}`);
async function accessFor(tx: Prisma.TransactionClient, userId: string) {
  const [challenges, solves] = await Promise.all([
    tx.challenge.findMany({
      where: { id: { in: LINUX_SERVERS.map((s) => s.id) } },
      select: { id: true, enabled: true, points: true },
    }),
    tx.solve.findMany({
      where: { userId, challengeId: { in: LINUX_SERVERS.map((s) => s.id) } },
      select: { challengeId: true, points: true },
    }),
  ]);
  const access: LinuxAccess = {
    solved: solves.map((s) => s.challengeId),
    enabled: challenges.filter((c) => c.enabled).map((c) => c.id),
    key: (level) => keyFor(userId, level),
  };
  return { access, challenges, solves };
}
function present(
  state: LinuxState,
  data: Awaited<ReturnType<typeof accessFor>>,
): LinuxNetworkView {
  const { access, challenges, solves } = data;
  refreshAccess(state, access);
  return {
    connected: state.connected,
    address: state.connected ? "10.77.0.2/32" : null,
    route: state.connected ? "10.77.0.0/24" : null,
    host: state.shell ? LINUX_SERVERS[state.shell.level].name : null,
    cwd: state.shell?.cwd ?? "/home/analista",
    prompt: linuxPrompt(state),
    password: state.pending !== null,
    entry:
      state.connected && unlocked(0, access)
        ? {
            host: LINUX_SERVERS[0].name,
            ip: LINUX_SERVERS[0].ip,
            hint: LINUX_ENTRY_HINT,
          }
        : null,
    score: solves.reduce((sum, s) => sum + s.points, 0),
    servers: LINUX_SERVERS.map((s) => ({
      id: s.id,
      index: s.index,
      name: s.name,
      ip: state.connected && canAttempt(s.index, access) ? s.ip : null,
      user: state.connected && canAttempt(s.index, access) ? s.user : null,
      title: s.title,
      description: s.description,
      points: challenges.find((c) => c.id === s.id)?.points ?? s.points,
      status: !access.enabled.includes(s.id)
        ? "disabled"
        : access.solved.includes(s.id)
          ? "solved"
          : unlocked(s.index, access)
            ? "available"
            : "locked",
    })),
  };
}
async function ensureNetwork(userId: string) {
  await db.linuxNetwork.upsert({
    where: { userId },
    create: { userId, state: json(initialLinuxState()) },
    update: {},
  });
}
export async function linuxNetwork(userId: string) {
  await ensureNetwork(userId);
  return db.$transaction(async (tx) => {
    const row = await tx.linuxNetwork.findUniqueOrThrow({ where: { userId } });
    const state = row.state as unknown as LinuxState;
    return present(state, await accessFor(tx, userId));
  });
}
export async function linuxCommand(
  user: { id: string; role: string },
  command: string,
) {
  await ensureNetwork(user.id);
  return db.$transaction(async (tx) => {
    const competition = await lockCompetition(tx);
    await tx.$queryRaw`SELECT "userId" FROM "LinuxNetwork" WHERE "userId" = ${user.id} FOR UPDATE`;
    const row = await tx.linuxNetwork.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const original = row.state as unknown as LinuxState;
    let state = structuredClone(original);
    const data = await accessFor(tx, user.id);
    let result: ReturnType<typeof executeLinux>;
    try {
      result = executeLinux(state, command, data.access);
      if (Buffer.byteLength(JSON.stringify(state)) > 196608)
        throw new Error(
          "Cuota de archivos alcanzada. Usa reset --confirm en un servidor para liberar espacio.",
        );
    } catch (error) {
      state = original;
      result = {
        output:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar el comando.",
      };
    }
    let awardedPoints = 0;
    const submitting =
      command.trim().startsWith("submit ") && original.pending === null;
    if (submitting) {
      requireOpen(competition);
      if (user.role !== "PARTICIPANT")
        throw new ForbiddenException(
          "Usa una cuenta participante para entregar niveles.",
        );
      const level = original.shell?.level;
      if (
        level !== undefined &&
        data.access.enabled.includes(LINUX_SERVERS[level].id)
      )
        await tx.submission.create({
          data: {
            userId: user.id,
            challengeId: LINUX_SERVERS[level].id,
            correct: result.completed !== undefined,
          },
        });
    }
    if (result.completed !== undefined) {
      requireOpen(competition);
      if (user.role !== "PARTICIPANT")
        throw new ForbiddenException(
          "Usa una cuenta participante para competir.",
        );
      const challenge = data.challenges.find(
        (c) => c.id === LINUX_SERVERS[result.completed!].id,
      )!;
      if (!submitting)
        await tx.submission.create({
          data: { userId: user.id, challengeId: challenge.id, correct: true },
        });
      const inserted = await tx.solve.createMany({
        data: [
          {
            userId: user.id,
            challengeId: challenge.id,
            points: challenge.points,
          },
        ],
        skipDuplicates: true,
      });
      if (inserted.count) {
        awardedPoints = challenge.points;
        data.access.solved.push(challenge.id);
        data.solves.push({
          challengeId: challenge.id,
          points: challenge.points,
        });
      }
    }
    await tx.linuxNetwork.update({
      where: { userId: user.id },
      data: { state: json(state) },
    });
    return {
      output: result.output,
      clear: result.clear,
      awardedPoints,
      view: present(state, data),
    };
  });
}
export const linuxSeedVerifier = (id: string) =>
  flagVerifier(flagValue(`linux-network:reserved:${id}`));
