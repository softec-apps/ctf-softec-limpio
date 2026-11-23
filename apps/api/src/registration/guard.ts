import { BadRequestException, HttpException } from "@nestjs/common";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { db } from "../db";

const MINUTE = 60000,
  DAY = 86400000;
export const REGISTRATION_DIFFICULTY = 17;
export const registrationCookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-ctf_registration_device"
    : "ctf_registration_device";
function hash(value: string) {
  if (!process.env.FLAG_SECRET) throw new Error("Falta FLAG_SECRET");
  return createHmac("sha256", process.env.FLAG_SECRET)
    .update(`registration:v1:${value}`)
    .digest("hex");
}
function device(cookie: unknown) {
  if (
    typeof cookie !== "string" ||
    !/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(cookie)
  )
    return null;
  const [id, signature] = cookie.split(".");
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(hash(`device:${id}`), "hex"),
  )
    ? id
    : null;
}
function identity(req: Request) {
  const id = device(req.cookies?.[registrationCookieName()]);
  return {
    deviceHash: id ? hash(`browser:${id}`) : null,
    ipHash: hash(`ip:${req.ip ?? "unknown"}`),
  };
}
function limit(name: string, fallback: number) {
  const configured = Number(process.env[name] ?? fallback);
  if (
    !Number.isSafeInteger(configured) ||
    configured < 1 ||
    configured > 100000
  )
    throw new Error(`${name} inválido`);
  return configured;
}
async function quota(
  tx: Prisma.TransactionClient,
  kind: string,
  actor: string,
  windowMs: number,
  maximum: number,
  now: Date,
) {
  const end = (Math.floor(now.getTime() / windowMs) + 1) * windowMs;
  const key = `${process.env.REGISTRATION_QUOTA_NAMESPACE ?? "registration"}:${kind}:${actor}:${end}`;
  const [row] = await tx.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RegistrationQuota" ("key", "count", "expiresAt") VALUES (${key}, 1, ${new Date(end)}) ON CONFLICT ("key") DO UPDATE SET "count" = "RegistrationQuota"."count" + 1 RETURNING "count"`;
  if (row.count > maximum)
    throw new HttpException(
      {
        message:
          "Se alcanzó el límite temporal de registros. Vuelve a intentarlo más tarde.",
        retryAfter: Math.max(1, Math.ceil((end - now.getTime()) / 1000)),
      },
      429,
    );
}
export async function registrationChallenge(req: Request, res: Response) {
  let id = device(req.cookies?.[registrationCookieName()]);
  if (!id) id = randomBytes(16).toString("hex");
  const deviceHash = hash(`browser:${id}`),
    ipHash = hash(`ip:${req.ip ?? "unknown"}`);
  const nonce = randomBytes(24).toString("hex"),
    now = new Date(),
    expiresAt = new Date(now.getTime() + 10 * MINUTE);
  await db.$transaction(async (tx) => {
    await quota(tx, "challenge-ip", ipHash, MINUTE, 120, now);
    await quota(tx, "challenge-browser", deviceHash, MINUTE, 20, now);
    await tx.registrationProof.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    await tx.registrationQuota.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    await tx.registrationProof.create({
      data: {
        tokenHash: createHash("sha256").update(nonce).digest("hex"),
        deviceHash,
        ipHash,
        expiresAt,
      },
    });
  });
  res.cookie(registrationCookieName(), `${id}.${hash(`device:${id}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 30 * DAY,
  });
  return {
    nonce,
    difficulty: REGISTRATION_DIFFICULTY,
    expiresAt: expiresAt.toISOString(),
  };
}
export async function checkRegistrationRate(req: Request) {
  const { ipHash } = identity(req);
  await db.$transaction((tx) =>
    quota(
      tx,
      "submit-ip",
      ipHash,
      MINUTE,
      limit("REGISTRATION_IP_PER_MINUTE", 30),
      new Date(),
    ),
  );
}
export function verifyRegistrationProof(
  req: Request,
  proof: { nonce: string; solution: string },
) {
  const who = identity(req);
  const digest = createHash("sha256")
    .update(`${proof.nonce}:${proof.solution}`)
    .digest();
  if (!who.deviceHash || digest[0] !== 0 || digest[1] !== 0 || digest[2] >= 128)
    throw new BadRequestException(
      "No se pudo verificar el registro. Vuelve a intentarlo.",
    );
  return {
    ...who,
    deviceHash: who.deviceHash,
    tokenHash: createHash("sha256").update(proof.nonce).digest("hex"),
  };
}
export async function consumeRegistrationProof(
  tx: Prisma.TransactionClient,
  proof: ReturnType<typeof verifyRegistrationProof>,
) {
  const now = new Date();
  const claimed = await tx.registrationProof.updateMany({
    where: {
      tokenHash: proof.tokenHash,
      deviceHash: proof.deviceHash,
      ipHash: proof.ipHash,
      expiresAt: { gt: now },
      consumedAt: null,
    },
    data: { consumedAt: now },
  });
  if (claimed.count !== 1)
    throw new BadRequestException(
      "La verificación de registro caducó o ya se utilizó. Vuelve a intentarlo.",
    );
  await quota(
    tx,
    "success-ip",
    proof.ipHash,
    DAY,
    limit("REGISTRATION_IP_PER_DAY", 500),
    now,
  );
  await quota(
    tx,
    "success-browser",
    proof.deviceHash,
    DAY,
    limit("REGISTRATION_BROWSER_PER_DAY", 3),
    now,
  );
}
