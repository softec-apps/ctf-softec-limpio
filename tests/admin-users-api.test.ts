import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import type { AdminUserResults } from "../packages/competition-contracts";

test("el detalle administrativo muestra resoluciones y el desempate oficial", async (t) => {
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  const prefix = "qa_results_" + randomBytes(6).toString("hex");
  const ids: string[] = [];
  const joined = new Date("2026-10-01T10:00:00.000Z");
  const firstSolve = new Date("2026-10-02T10:00:00.000Z");
  const finalSolve = new Date("2026-10-02T12:00:00.123Z");
  async function account(
    suffix: string,
    role: "ADMIN" | "PARTICIPANT",
    createdAt = joined,
  ) {
    const user = await db.user.create({
      data: {
        alias: prefix + suffix,
        passwordHash: passwordHash(randomBytes(20).toString("hex")),
        role,
        createdAt,
      },
    });
    ids.push(user.id);
    return user;
  }
  async function session(userId: string, scope: string) {
    const token = randomBytes(32).toString("hex");
    await db.session.create({
      data: {
        userId,
        scope,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return (scope === "admin" ? "ctf_admin_session=" : "ctf_session=") + token;
  }
  async function request(path: string, cookie = "", body?: object) {
    const response = await fetch(base + "/api/v1" + path, {
      method: body ? "POST" : "GET",
      headers: {
        cookie,
        origin: process.env.APP_ORIGIN!,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  }
  try {
    const admin = await account("_admin", "ADMIN");
    const selected = await account("_b", "PARTICIPANT");
    const alphabeticalWinner = await account("_a", "PARTICIPANT");
    const laterSignup = await account(
      "_c",
      "PARTICIPANT",
      new Date(joined.getTime() + 1),
    );
    const laterSolve = await account(
      "_d",
      "PARTICIPANT",
      new Date(joined.getTime() - 1),
    );
    const empty = await account("_empty", "PARTICIPANT");
    const adminCookie = await session(admin.id, "admin");
    const participantCookie = await session(selected.id, "game");
    const adminGameCookie = await session(admin.id, "game");
    for (const user of [
      selected,
      alphabeticalWinner,
      laterSignup,
      laterSolve,
    ]) {
      await db.solve.create({
        data: {
          userId: user.id,
          challengeId: "crypto-cesar",
          points: 1,
          createdAt: firstSolve,
        },
      });
      await db.privilegedLab.create({
        data: {
          userId: user.id,
          state: { privateEvidence: "must-not-be-returned" },
          awardedPoints: 100,
          completedAt:
            user.id === laterSolve.id
              ? new Date(finalSolve.getTime() + 1)
              : finalSolve,
        },
      });
    }
    await t.test(
      "solo una sesión administrativa puede consultar otro usuario",
      async () => {
        const path = `/admin/users/${selected.id}`;
        assert.equal((await request(path)).status, 401);
        assert.equal((await request(path, participantCookie)).status, 403);
        assert.equal((await request(path, adminGameCookie)).status, 403);
        assert.equal(
          (await request("/admin/users/no-existe", adminCookie)).status,
          404,
        );
      },
    );
    await t.test(
      "incluye cada resolución, sus puntos y el premio final sin exponer secretos",
      async () => {
        const result = await request(
          `/admin/users/${selected.id}`,
          adminCookie,
        );
        assert.equal(result.status, 200);
        const detail: AdminUserResults = result.data;
        assert.equal(detail.user.id, selected.id);
        assert.equal(detail.score, 101);
        assert.equal(detail.solved, 2);
        assert.deepEqual(
          detail.results.map((row) => [row.id, row.points, row.createdAt]),
          [
            ["crypto-cesar", 1, firstSolve.toISOString()],
            ["hidden-final", 100, finalSolve.toISOString()],
          ],
        );
        assert.equal(detail.results[0].title, "Cuando la oficina duerme");
        assert.equal(detail.results[1].category, "Reto oculto");
        assert.equal(detail.ranking?.lastSolve, finalSolve.getTime());
        const serialized = JSON.stringify(detail);
        for (const secret of [
          "passwordHash",
          "flagVerifier",
          "tokenHash",
          "privateEvidence",
          "must-not-be-returned",
        ])
          assert(!serialized.includes(secret));
      },
    );
    await t.test(
      "cuenta fallos de retos no resueltos y del oculto, sin penalizar envíos correctos",
      async () => {
        for (const [user, count] of [
          [alphabeticalWinner, 4],
          [selected, 1],
          [laterSignup, 2],
        ] as const)
          await db.submission.createMany({
            data: Array.from({ length: count }, () => ({
              userId: user.id,
              challengeId: "crypto-atbash",
              correct: false,
            })),
          });
        await db.submission.createMany({
          data: Array.from({ length: 3 }, () => ({
            userId: selected.id,
            challengeId: "crypto-cesar",
            correct: true,
          })),
        });
        assert.equal(
          (
            await request("/intranet/maintenance", participantCookie, {
              op: "submit",
              flag: "incorrecta",
            })
          ).status,
          400,
        );
        const detail: AdminUserResults = (
          await request(`/admin/users/${selected.id}`, adminCookie)
        ).data;
        assert.equal(detail.incorrectAttempts, 2);
        assert.equal(detail.score, 101);
        assert.equal(
          (
            await db.privilegedLab.findUniqueOrThrow({
              where: { userId: selected.id },
            })
          ).incorrectSubmissions,
          1,
        );
      },
    );
    await t.test(
      "el desempate usa menos errores y comparte puesto sin usar fechas ni alias",
      async () => {
        const detail: AdminUserResults = (
          await request(`/admin/users/${selected.id}`, adminCookie)
        ).data;
        const expected = [
          laterSolve.alias,
          selected.alias,
          laterSignup.alias,
          alphabeticalWinner.alias,
        ];
        const peers = detail.ranking!.peers.filter((peer) =>
          peer.alias.startsWith(prefix),
        );
        assert.deepEqual(
          peers.map((peer) => peer.alias),
          expected,
        );
        assert.deepEqual(
          peers.map((peer) => peer.incorrectAttempts),
          [0, 2, 2, 4],
        );
        assert.equal(peers[1].position, peers[2].position);
        assert(peers[0].position < peers[1].position);
        assert(peers[2].position < peers[3].position);
        assert.equal(peers[0].lastSolve, finalSolve.getTime() + 1);
        const publicRanking = (await request("/ranking", participantCookie))
          .data.entries;
        for (const peer of peers) {
          const official = publicRanking.find(
            (row: { alias: string }) => row.alias === peer.alias,
          );
          assert.equal(peer.position, official.position);
          assert.equal(peer.score, official.score);
          assert.equal(peer.lastSolve, official.lastSolve);
          assert.equal(peer.incorrectAttempts, official.incorrectAttempts);
          assert(!("joinedAt" in official));
        }
        assert(
          !publicRanking.some(
            (row: { alias: string }) => row.alias === admin.alias,
          ),
        );
      },
    );
    await t.test(
      "los fallos concurrentes del oculto se guardan aunque la entrega se rechace",
      async () => {
        const cookie = await session(empty.id, "game");
        const replies = await Promise.all(
          Array.from({ length: 3 }, () =>
            request("/intranet/maintenance", cookie, {
              op: "submit",
              flag: "incorrecta",
            }),
          ),
        );
        assert(replies.every((reply) => reply.status === 400));
        const detail: AdminUserResults = (
          await request(`/admin/users/${empty.id}`, adminCookie)
        ).data;
        assert.equal(detail.incorrectAttempts, 3);
        assert.equal(detail.score, 0);
        assert.equal(detail.solved, 0);
      },
    );
    await t.test(
      "presenta correctamente usuarios sin aciertos y administradores",
      async () => {
        const detail: AdminUserResults = (
          await request(`/admin/users/${empty.id}`, adminCookie)
        ).data;
        assert.equal(detail.score, 0);
        assert.equal(detail.solved, 0);
        assert.deepEqual(detail.results, []);
        assert.equal(detail.ranking?.lastSolve, null);
        const administrative: AdminUserResults = (
          await request(`/admin/users/${admin.id}`, adminCookie)
        ).data;
        assert.equal(administrative.ranking, null);
        assert.deepEqual(administrative.results, []);
      },
    );
  } finally {
    await db.submission.deleteMany({ where: { userId: { in: ids } } });
    await db.privilegedLab.deleteMany({ where: { userId: { in: ids } } });
    await db.solve.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await db.$disconnect();
  }
});
