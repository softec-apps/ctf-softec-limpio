import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import { SCORING_CATEGORIES } from "../apps/api/src/scoring/policy";
import { changeCategoryAvailability } from "../apps/api/src/competition/category-availability";

test("categorías completas: permisos, atomicidad, alcance canónico y conservación de resultados", async () => {
  const app = await createApp();
  const ids: string[] = [];
  const original = await db.challenge.findMany({
    orderBy: { id: "asc" },
    select: { id: true, enabled: true, points: true },
  });
  const previousSolves = await db.solve.findMany({ orderBy: { id: "asc" } });
  const group = SCORING_CATEGORIES.find((entry) => entry.category === "Redes")!;
  const targets = [...group.easy, ...group.medium, ...group.hard];
  const password = randomBytes(20).toString("hex");
  async function account(role: "ADMIN" | "PARTICIPANT") {
    const user = await db.user.create({
      data: {
        alias: `qa_cat_${randomBytes(5).toString("hex")}`,
        role,
        passwordHash: passwordHash(password),
      },
    });
    ids.push(user.id);
    const token = randomBytes(24).toString("hex");
    await db.session.create({
      data: {
        userId: user.id,
        scope: role === "ADMIN" ? "admin" : "game",
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return {
      id: user.id,
      cookie: `${role === "ADMIN" ? "ctf_admin_session" : "ctf_session"}=${token}`,
    };
  }
  try {
    await app.listen(0, "127.0.0.1");
    const base = `${await app.getUrl()}/api/v1`;
    const admin = await account("ADMIN"),
      participant = await account("PARTICIPANT");
    const request = (
      body: unknown,
      cookie = admin.cookie,
      origin = process.env.APP_ORIGIN!,
    ) =>
      fetch(`${base}/admin/categories/availability`, {
        method: "PATCH",
        headers: { origin, cookie, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    const change = { category: "Redes", enabled: false };
    assert.equal((await request(change, "")).status, 401);
    assert.equal((await request(change, participant.cookie)).status, 403);
    assert.equal(
      (await request(change, admin.cookie, "https://ajeno.invalid")).status,
      403,
    );
    for (const bad of [
      { category: "Redes", enabled: "false" },
      { ...change, points: 100 },
      { ...change, ids: targets },
      { enabled: true },
    ])
      assert.equal((await request(bad)).status, 400);
    assert.equal(
      (await request({ category: "inexistente", enabled: true })).status,
      404,
    );
    await db.challenge.updateMany({
      where: { id: { in: targets } },
      data: { enabled: true },
    });
    await assert.rejects(
      changeCategoryAvailability("nonexistent-category-admin", "Redes", false),
    );
    assert.equal(
      await db.challenge.count({
        where: { id: { in: targets }, enabled: true },
      }),
      10,
    );
    await db.challenge.update({
      where: { id: targets[0] },
      data: { enabled: false },
    });
    const activated = await request({ category: "Redes", enabled: true });
    assert.equal(activated.status, 200);
    assert.deepEqual(await activated.json(), {
      category: "Redes",
      enabled: true,
      total: 10,
      changed: 1,
    });
    const overview = await fetch(`${base}/admin/overview`, {
      headers: { cookie: admin.cookie },
    }).then((response) => response.json());
    assert.equal(
      overview.challenges.filter(
        (challenge: { categoryGroup: string }) =>
          challenge.categoryGroup === "Redes",
      ).length,
      10,
    );
    assert.equal(
      overview.challenges.filter(
        (challenge: { categoryGroup: string }) =>
          challenge.categoryGroup === "Redes inalámbricas",
      ).length,
      10,
    );
    const disabled = await request(change);
    assert.equal(disabled.status, 200);
    assert.equal((await disabled.json()).changed, 10);
    const current = await db.challenge.findMany({
      orderBy: { id: "asc" },
      select: { id: true, enabled: true, points: true },
    });
    assert.deepEqual(
      current.filter((row) => !targets.includes(row.id)),
      original.filter((row) => !targets.includes(row.id)),
    );
    assert.ok(
      current
        .filter((row) => targets.includes(row.id))
        .every((row) => !row.enabled),
    );
    assert.deepEqual(
      current.map(({ id, points }) => ({ id, points })),
      original.map(({ id, points }) => ({ id, points })),
    );
    const game = await fetch(`${base}/game`, {
      headers: { cookie: participant.cookie },
    }).then((response) => response.json());
    assert.equal(
      game.challenges.some((challenge: { id: string }) =>
        targets.includes(challenge.id),
      ),
      false,
    );
    assert.equal(
      (
        await fetch(`${base}/network/labs/network-01`, {
          headers: { cookie: participant.cookie },
        })
      ).status,
      404,
    );
    const auditCount = await db.auditLog.count({ where: { userId: admin.id } });
    const repeated = await request(change);
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).changed, 0);
    assert.equal(
      await db.auditLog.count({ where: { userId: admin.id } }),
      auditCount,
    );
    assert.equal(
      (await request({ category: "Redes", enabled: true })).status,
      200,
    );
    assert.equal(
      await db.challenge.count({
        where: { id: { in: targets }, enabled: true },
      }),
      10,
    );
    assert.deepEqual(
      await db.solve.findMany({ orderBy: { id: "asc" } }),
      previousSolves,
    );
  } finally {
    for (const row of original.filter((row) => targets.includes(row.id)))
      await db.challenge.update({
        where: { id: row.id },
        data: { enabled: row.enabled },
      });
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await db.$disconnect();
  }
});
