import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { db } from "../../db";
import { lockCompetition, requireOpen } from "../../competition/service";
import { DEVICES, MISSIONS, initialState } from "./scenarios";
import { configure, execute, type Change } from "./engine";
import { validateMission } from "./validation";
import type {
  ConsoleContext,
  DeviceId,
  LabState,
} from "../../../../../packages/network-contracts";
const json = (state: LabState) => state as unknown as Prisma.InputJsonValue;
async function available(id: string) {
  if (id === "free") return;
  if (!MISSIONS.some((m) => m.id === id))
    throw new NotFoundException("Incidencia no disponible.");
  if (!(await db.challenge.findFirst({ where: { id, enabled: true } })))
    throw new NotFoundException("Incidencia no disponible.");
}
export async function getLab(userId: string, id: string) {
  await available(id);
  const row = await db.networkLab.upsert({
    where: { userId_scenarioId: { userId, scenarioId: id } },
    create: { userId, scenarioId: id, state: json(initialState(id)) },
    update: {},
  });
  return {
    id,
    revision: row.revision,
    state: row.state as unknown as LabState,
    mission: MISSIONS.find((m) => m.id === id) || null,
    devices: DEVICES,
  };
}
export async function operateLab(
  userId: string,
  id: string,
  revision: number,
  action:
    | {
        kind: "command";
        device: DeviceId;
        command: string;
        context: ConsoleContext;
      }
    | { kind: "configure"; device: DeviceId; change: Change }
    | { kind: "reset" },
) {
  await available(id);
  return db.$transaction(async (tx) => {
    const row = await tx.networkLab.findUnique({
      where: { userId_scenarioId: { userId, scenarioId: id } },
    });
    if (!row) throw new NotFoundException("Abre primero el laboratorio.");
    if (row.revision !== revision)
      throw new ConflictException(
        "La configuración cambió en otra ventana. Actualiza el estado antes de continuar.",
      );
    const state =
      action.kind === "reset"
        ? initialState(id)
        : (structuredClone(row.state) as unknown as LabState);
    let result: { output?: string; context?: ConsoleContext; prompt?: string } =
      {};
    try {
      if (action.kind === "command")
        result = execute(state, action.device, action.command, action.context);
      else if (action.kind === "configure")
        configure(state, action.device, action.change);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "Configuración no válida.",
      );
    }
    const update = await tx.networkLab.updateMany({
      where: { userId, scenarioId: id, revision },
      data: { state: json(state), revision: { increment: 1 } },
    });
    if (update.count !== 1)
      throw new ConflictException(
        "Otro cambio se guardó antes. Actualiza el laboratorio.",
      );
    return {
      id,
      revision: revision + 1,
      state,
      mission: MISSIONS.find((m) => m.id === id) || null,
      devices: DEVICES,
      ...result,
    };
  });
}
export async function completeLab(
  user: { id: string; role: string },
  id: string,
  revision: number,
) {
  if (user.role !== "PARTICIPANT")
    throw new ForbiddenException(
      "Utiliza una cuenta participante para competir.",
    );
  if (id === "free")
    throw new BadRequestException("El laboratorio libre no concede puntos.");
  await available(id);
  return db.$transaction(async (tx) => {
    requireOpen(await lockCompetition(tx));
    const row = await tx.networkLab.findUnique({
      where: { userId_scenarioId: { userId: user.id, scenarioId: id } },
    });
    if (!row || row.revision !== revision)
      throw new ConflictException("Actualiza el laboratorio antes de validar.");
    const challenge = await tx.challenge.findFirst({
      where: { id, enabled: true },
    });
    if (!challenge) throw new NotFoundException("Incidencia no disponible.");
    const locked = await tx.networkLab.updateMany({
      where: { userId: user.id, scenarioId: id, revision },
      data: { revision: { increment: 1 } },
    });
    if (locked.count !== 1)
      throw new ConflictException(
        "La configuración cambió durante la validación.",
      );
    const validation = validateMission(id, row.state as unknown as LabState);
    await tx.submission.create({
      data: { userId: user.id, challengeId: id, correct: validation.correct },
    });
    let awardedPoints = 0;
    if (validation.correct) {
      const inserted = await tx.solve.createMany({
        data: [{ userId: user.id, challengeId: id, points: challenge.points }],
        skipDuplicates: true,
      });
      if (inserted.count) awardedPoints = challenge.points;
    }
    return {
      ...validation,
      revision: revision + 1,
      awardedPoints,
      message: validation.correct
        ? "Incidencia resuelta. La red supera las comprobaciones."
        : "La red aún no supera todas las comprobaciones.",
    };
  });
}
