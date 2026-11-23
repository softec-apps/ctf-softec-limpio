import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { lockCompetition, requireOpen } from "../competition/service";
import { flagValue, flagVerifier, digest, matchesFlag } from "../security";
import { linuxNetwork } from "../linux-network/service";
import {
  DOMAIN_CASES,
  DOMAIN_NAME,
  DOMAIN_DC,
  DOMAIN_TARGET,
  DOMAIN_ROOT,
  DOMAIN_WORDS,
} from "./catalog";
import {
  executeDomain,
  initialDomainState,
  readDomainLocal,
  type DomainState,
  type DomainAccess,
} from "./engine";
import type { DomainView } from "../../../../packages/domain-contracts";
const json = (state: DomainState) => state as unknown as Prisma.InputJsonValue;
const flag = (userId: string, index: number) =>
  flagValue(`domain:v1:${userId}:${index}`);
async function ensure(userId: string) {
  await linuxNetwork(userId);
  await db.domainLab.upsert({
    where: { userId },
    create: { userId, state: json(initialDomainState()) },
    update: {},
  });
}
async function context(tx: Prisma.TransactionClient, userId: string) {
  const [network, challenges, solves] = await Promise.all([
    tx.linuxNetwork.findUniqueOrThrow({ where: { userId } }),
    tx.challenge.findMany({
      where: { id: { in: DOMAIN_CASES.map((c) => c.id) } },
      select: { id: true, enabled: true, points: true },
    }),
    tx.solve.findMany({
      where: { userId, challengeId: { in: DOMAIN_CASES.map((c) => c.id) } },
      select: { challengeId: true, points: true },
    }),
  ]);
  const access: DomainAccess = {
    connected: (network.state as { connected?: boolean }).connected === true,
    enabled: challenges.filter((c) => c.enabled).map((c) => c.id),
    password: (account) => {
      const key = flagValue(`domain-password:v1:${userId}:${account}`).slice(
        4,
        36,
      );
      return ["archivo", "svc_reportes"].includes(account)
        ? DOMAIN_WORDS[parseInt(key.slice(0, 4), 16) % DOMAIN_WORDS.length]
        : `Turno-${key.slice(0, 10)}!`;
    },
    flag: (index) => flag(userId, index),
    seal: (payload) => digest(flagValue(`domain-seal:v1:${userId}:${payload}`)),
  };
  return { access, challenges, solves };
}
function present(
  state: DomainState,
  data: Awaited<ReturnType<typeof context>>,
): DomainView {
  return {
    connected: data.access.connected,
    domain: DOMAIN_NAME,
    controller: { name: "DC01", ip: DOMAIN_DC },
    target: { name: "WS01", ip: DOMAIN_TARGET, os: "Windows 11" },
    groups: state.groups,
    computers: Object.keys(state.machines),
    delegates: state.delegates,
    policy: { version: state.policy.version, applied: state.policy.applied },
    events: state.events,
    evidence: Object.keys(state.files).map((name) => ({
      name,
      kind: name.endsWith(".xml") ? "XML" : "JSON",
    })),
    proofs: state.proofs.filter((id) => data.access.enabled.includes(id)),
    solved: data.solves
      .filter((s) => data.access.enabled.includes(s.challengeId))
      .map((s) => s.challengeId),
    score: data.solves.reduce((s, c) => s + c.points, 0),
  };
}
export async function domainView(userId: string) {
  await ensure(userId);
  return db.$transaction(async (tx) => {
    const row = await tx.domainLab.findUniqueOrThrow({ where: { userId } });
    return present(
      row.state as unknown as DomainState,
      await context(tx, userId),
    );
  });
}
export async function domainCommand(
  user: { id: string; role: string },
  command: string,
) {
  await ensure(user.id);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "LinuxNetwork" WHERE "userId"=${user.id} FOR SHARE`;
    await tx.$queryRaw`SELECT "userId" FROM "DomainLab" WHERE "userId"=${user.id} FOR UPDATE`;
    const row = await tx.domainLab.findUniqueOrThrow({
        where: { userId: user.id },
      }),
      original = row.state as unknown as DomainState,
      data = await context(tx, user.id);
    let state = structuredClone(original),
      output: string;
    try {
      output = executeDomain(state, command, data.access);
      if (Buffer.byteLength(JSON.stringify(state)) > 65536)
        throw new Error("Cuota del laboratorio de dominio alcanzada.");
    } catch (error) {
      state = original;
      output =
        error instanceof Error
          ? error.message
          : "No se pudo operar el dominio.";
    }
    await tx.domainLab.update({
      where: { userId: user.id },
      data: { state: json(state) },
    });
    return { output, view: present(state, data) };
  });
}
export async function submitDomainFlag(
  user: { id: string; role: string },
  id: string,
  value: string,
) {
  if (user.role !== "PARTICIPANT")
    throw new ForbiddenException("Usa una cuenta participante para competir.");
  await ensure(user.id);
  return db.$transaction(async (tx) => {
    requireOpen(await lockCompetition(tx));
    await tx.$queryRaw`SELECT "userId" FROM "DomainLab" WHERE "userId"=${user.id} FOR UPDATE`;
    const row = await tx.domainLab.findUniqueOrThrow({
        where: { userId: user.id },
      }),
      state = row.state as unknown as DomainState,
      index = DOMAIN_CASES.findIndex((c) => c.id === id),
      challenge = await tx.challenge.findFirst({
        where: { id, enabled: true },
      });
    if (index < 0 || !challenge)
      throw new NotFoundException("El reto no está disponible.");
    const correct =
      state.proofs.includes(id) &&
      matchesFlag(value, flagVerifier(flag(user.id, index)));
    await tx.submission.create({
      data: { userId: user.id, challengeId: id, correct },
    });
    let awardedPoints = 0;
    if (correct) {
      const inserted = await tx.solve.createMany({
        data: [{ userId: user.id, challengeId: id, points: challenge.points }],
        skipDuplicates: true,
      });
      if (inserted.count) awardedPoints = challenge.points;
    }
    return {
      correct,
      awardedPoints,
      message: correct
        ? "Evidencia validada. Tu progreso está guardado."
        : "No hay una evidencia válida para esta entrega.",
    };
  });
}
export const domainSeedVerifier = (id: string) =>
  flagVerifier(flagValue(`domain:reserved:${id}`));
export async function domainFiles(userId: string, path: string) {
  await ensure(userId);
  const row = await db.domainLab.findUniqueOrThrow({ where: { userId } }),
    state = row.state as unknown as DomainState;
  if (path === DOMAIN_ROOT)
    return {
      type: "directory" as const,
      path,
      entries: [
        "LEEME.txt",
        "diccionario.txt",
        ...Object.keys(state.files),
      ].map((name) => ({ name, type: "file" as const })),
    };
  if (!path.startsWith(DOMAIN_ROOT + "/"))
    throw new NotFoundException("Archivo no disponible.");
  try {
    return {
      type: "file" as const,
      path,
      name: path.slice(DOMAIN_ROOT.length + 1),
      content: readDomainLocal(state, path),
    };
  } catch {
    throw new NotFoundException("Archivo no disponible.");
  }
}
