import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import type { PublicCompetition } from "../packages/competition-contracts";

test("el auditorio es público, conserva la clasificación oficial y transmite cambios sin exponer datos internos", async () => {
  const app = await createApp();
  const ids: string[] = [];
  const controller = new AbortController();
  try {
    await app.listen(0, "127.0.0.1");
    const base = `${await app.getUrl()}/api/v1`;
    const read = async () => {
      const response = await fetch(`${base}/public/competition`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("set-cookie"), null);
      return (await response.json()) as PublicCompetition;
    };
    const original = await read();
    const prefix = `qa_stage_${randomBytes(4).toString("hex")}`;
    const secret = randomBytes(20).toString("hex");
    for (let index = 0; index < 4; index++) {
      const user = await db.user.create({
        data: {
          alias: `${prefix}_${index}`,
          passwordHash: passwordHash(secret),
          role: index === 3 ? "ADMIN" : "PARTICIPANT",
        },
      });
      ids.push(user.id);
    }
    const challenges = await db.challenge.findMany({
      where: { points: 3 },
      orderBy: { id: "asc" },
      take: 2,
    });
    assert.equal(challenges.length, 2);
    const now = Date.now();
    await db.solve.createMany({
      data: [0, 1, 3].map((index) => ({
        userId: ids[index],
        challengeId: challenges[0].id,
        points: 3,
        createdAt: new Date(now + index * 100),
      })),
    });
    const token = randomBytes(32).toString("hex");
    await db.session.create({
      data: {
        userId: ids[0],
        tokenHash: digest(token),
        scope: "game",
        expiresAt: new Date(now + 60000),
      },
    });
    const stream = await fetch(`${base}/public/competition/stream`, {
      signal: controller.signal,
    });
    assert.equal(stream.status, 200);
    assert.match(
      stream.headers.get("content-type") ?? "",
      /text\/event-stream/,
    );
    assert.equal(stream.headers.get("x-accel-buffering"), "no");
    const reader = stream.body!.getReader();
    let buffered = "";
    const decoder = new TextDecoder();
    const nextMatching = async (
      matches: (snapshot: PublicCompetition) => boolean,
    ) => {
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        while (true) {
          const chunk = await reader.read();
          assert.equal(chunk.done, false);
          buffered += decoder.decode(chunk.value, { stream: true });
          let boundary: number;
          while ((boundary = buffered.indexOf("\n\n")) !== -1) {
            const frame = buffered.slice(0, boundary);
            buffered = buffered.slice(boundary + 2);
            const payload = frame
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");
            if (!payload) continue;
            const snapshot = JSON.parse(payload) as PublicCompetition;
            if (matches(snapshot)) return snapshot;
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    };
    const first = await nextMatching((snapshot) =>
      snapshot.entries.some((entry) => entry.alias === `${prefix}_1`),
    );
    assert.equal(first.stats.participants, original.stats.participants + 3);
    assert.equal(first.stats.resolutions, original.stats.resolutions + 2);
    const own = first.entries.filter((entry) => entry.alias.startsWith(prefix));
    assert.deepEqual(
      own.map((entry) => entry.alias),
      [`${prefix}_0`, `${prefix}_1`, `${prefix}_2`],
    );
    assert.equal(
      first.entries.some((entry) => entry.alias === `${prefix}_3`),
      false,
    );
    assert.equal(
      first.activity.some((event) => event.alias === `${prefix}_3`),
      false,
    );
    const official = await fetch(`${base}/ranking`, {
      headers: { cookie: `ctf_session=${token}` },
    }).then((response) => response.json());
    assert.deepEqual(
      first.entries,
      official.entries.map(
        ({
          position,
          alias,
          score,
          solved,
          incorrectAttempts,
        }: PublicCompetition["entries"][number]) => ({
          position,
          alias,
          score,
          solved,
          incorrectAttempts,
        }),
      ),
    );
    assert.equal((await fetch(`${base}/ranking`)).status, 401);
    assert.equal((await fetch(`${base}/admin/overview`)).status, 401);
    await db.privilegedLab.create({
      data: {
        userId: ids[1],
        state: {},
        awardedPoints: 100,
        completedAt: new Date(now + 500),
      },
    });
    await db.solve.create({
      data: {
        userId: ids[2],
        challengeId: challenges[1].id,
        points: 3,
        createdAt: new Date(now + 1000),
      },
    });
    const updated = await nextMatching((snapshot) =>
      snapshot.entries.some(
        (entry) => entry.alias === `${prefix}_1` && entry.score === 103,
      ),
    );
    assert.equal(updated.stats.resolutions, original.stats.resolutions + 4);
    assert.equal(
      updated.entries.find((entry) => entry.alias === `${prefix}_1`)?.solved,
      2,
    );
    assert.ok(
      updated.activity.some(
        (event) =>
          event.alias === `${prefix}_1` &&
          event.title === "Reto final" &&
          event.points === 100,
      ),
    );
    assert.ok(
      updated.activity.some(
        (event) => event.alias === `${prefix}_2` && event.points === 3,
      ),
    );
    assert.equal(updated.stats.maxScore, 575);
    assert.equal(updated.categories.length, 25);
    assert.equal(updated.stats.challenges, 250);
    assert.ok(
      updated.categories.every(
        (category) => category.solved <= category.challenges,
      ),
    );
    const json = JSON.stringify(updated);
    for (const forbidden of [
      secret,
      ...ids,
      "passwordHash",
      "flagVerifier",
      "tokenHash",
      "audit",
      "description",
      '"state"',
      '"role"',
    ])
      assert.equal(json.includes(forbidden), false, forbidden);
    assert.deepEqual(Object.keys(updated).sort(), [
      "activity",
      "categories",
      "competition",
      "entries",
      "stats",
      "updatedAt",
    ]);
    assert.deepEqual(Object.keys(updated.entries[0]).sort(), [
      "alias",
      "incorrectAttempts",
      "position",
      "score",
      "solved",
    ]);
    controller.abort();
    await reader.cancel().catch(() => {});
  } finally {
    controller.abort();
    if (ids.length) {
      await db.solve.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
    await db.$disconnect();
  }
});
