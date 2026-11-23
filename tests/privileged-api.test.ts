import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import { solveMaintenance } from "./privileged-fixtures";

test("reto oculto aislado de catálogo, permisos administrativos y puntos", async (t) => {
  let app = await createApp();
  await app.listen(0, "127.0.0.1");
  let base = await app.getUrl();
  const ids: string[] = [];
  async function account() {
    const user = await db.user.create({
      data: {
        alias: "qa_hidden_" + randomBytes(5).toString("hex"),
        passwordHash: passwordHash(randomBytes(18).toString("hex")),
      },
    });
    ids.push(user.id);
    const token = randomBytes(32).toString("base64url");
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return { id: user.id, cookie: "ctf_session=" + token };
  }
  const a = await account(),
    b = await account();
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    cookie = a.cookie,
  ) {
    const response = await fetch(base + "/api/v1" + path, {
      method,
      headers: {
        cookie,
        origin: process.env.APP_ORIGIN!,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { response, data: await response.json() };
  }
  let flag = "";
  try {
    await t.test(
      "autenticación y cuerpos estrictos; pista en archivos, nunca en catálogo",
      async () => {
        assert.equal(
          (
            await request(
              "/intranet/maintenance",
              "POST",
              { op: "visit", url: "/" },
              "",
            )
          ).response.status,
          401,
        );
        assert.equal(
          (
            await request("/intranet/maintenance", "POST", {
              op: "visit",
              url: "/",
              userId: b.id,
            })
          ).response.status,
          400,
        );
        const game = (await request("/game")).data;
        assert.equal(game.challenges.length, 250);
        assert.ok(!JSON.stringify(game).includes("último privilegio"));
        const note = (
          await request(
            "/workstation/files?path=" +
              encodeURIComponent(
                "/home/analista/.continuidad/sesion-anterior.log",
              ),
          )
        ).data;
        assert.match(note.content, /gestion.seventech.local/);
        assert.ok(!note.content.includes("CTF{"));
        assert.equal(
          (
            await request("/intranet/maintenance", "POST", {
              op: "vault",
              signature: "0".repeat(64),
            })
          ).response.status,
          400,
        );
      },
    );
    await t.test(
      "resolver cinco etapas con las herramientas del PC conserva permisos reales",
      async () => {
        flag = await solveMaintenance(
          async (action) => {
            const result = await request(
              "/intranet/maintenance",
              "POST",
              action,
            );
            assert.equal(result.response.status, 201);
            return result.data;
          },
          async (command) => {
            const result = await request("/workstation/commands", "POST", {
              command,
              cwd: "/home/analista",
              challengeId: "primer-rastro",
            });
            assert.equal(result.response.status, 201);
            return result.data.output;
          },
        );
        assert.equal((await request("/me")).data.user.role, "PARTICIPANT");
        assert.equal((await request("/admin/overview")).response.status, 403);
        assert.equal((await request("/game")).data.score, 0);
      },
    );
    await t.test(
      "la evidencia es individual, persiste y se registra una vez con100puntos",
      async () => {
        assert.equal(
          (
            await request(
              "/intranet/maintenance",
              "POST",
              { op: "submit", flag },
              b.cookie,
            )
          ).response.status,
          400,
        );
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        const results = await Promise.all(
          Array.from({ length: 4 }, () =>
            request("/intranet/maintenance", "POST", { op: "submit", flag }),
          ),
        );
        assert.ok(results.every((result) => result.data.completed));
        assert.equal(
          results.reduce((sum, result) => sum + result.data.awardedPoints, 0),
          100,
        );
        assert.equal(
          results.filter((result) => result.data.awardedPoints === 100).length,
          1,
        );
        const completion = await db.privilegedLab.findUniqueOrThrow({
          where: { userId: a.id },
        });
        assert.ok(completion.completedAt);
        assert.equal(
          await db.solve.count({ where: { userId: { in: ids } } }),
          0,
        );
        assert.equal((await request("/game")).data.score, 100);
        const player = await db.user.findUniqueOrThrow({ where: { id: a.id } });
        const ranked = (await request("/ranking")).data.entries.find(
          (entry: { alias: string }) => entry.alias === player.alias,
        );
        assert.equal(ranked.score, 100);
        assert.equal(ranked.solved, 1);
        assert.equal(ranked.lastSolve, completion.completedAt!.getTime());
        assert.equal(
          (
            await request(
              "/admin/auth/me",
              "GET",
              undefined,
              a.cookie.replace("ctf_session=", "ctf_admin_session="),
            )
          ).response.status,
          401,
        );
      },
    );
  } finally {
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await db.$disconnect();
  }
});
