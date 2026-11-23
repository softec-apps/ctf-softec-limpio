import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { completeWindowsFixture } from "./windows-lab-fixtures";

test("Windows interactivo: API aislada, estado por cuenta y acreditación de operaciones", async (t) => {
  if (!process.env.DATABASE_URL)
    throw new Error("Falta PostgreSQL local para las pruebas.");
  const originalUrl = process.env.DATABASE_URL;
  const url = new URL(originalUrl);
  const databaseName = "qa_windows_" + randomBytes(6).toString("hex");
  const control = new pg.Client({ connectionString: originalUrl });
  await control.connect();
  await control.query(`CREATE DATABASE "${databaseName}"`);
  url.pathname = "/" + databaseName;
  process.env.DATABASE_URL = url.toString();
  process.env.APP_ORIGIN = "http://windows-api.test";
  process.env.FLAG_SECRET = randomBytes(32).toString("hex");
  let disconnect: (() => Promise<void>) | undefined;
  let closeApp: (() => Promise<void>) | undefined;
  try {
    const migrate = spawnSync(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--schema",
        "apps/api/prisma/schema.prisma",
      ],
      { encoding: "utf8", env: process.env },
    );
    assert.equal(migrate.status, 0, migrate.stderr);
    const { createApp } = await import("../apps/api/src/app");
    const { db } = await import("../apps/api/src/db");
    const { digest, passwordHash } = await import("../apps/api/src/security");
    const { WINDOWS_INTERACTIVE_CHALLENGES } =
      await import("../apps/api/src/windows-lab/catalog");
    const { windowsSeedVerifier } =
      await import("../apps/api/src/windows-lab/service");
    disconnect = () => db.$disconnect();
    for (const challenge of WINDOWS_INTERACTIVE_CHALLENGES)
      await db.challenge.create({
        data: { ...challenge, flagVerifier: windowsSeedVerifier(challenge.id) },
      });
    const user = await db.user.create({
      data: {
        alias: "windows_one",
        passwordHash: passwordHash(randomBytes(16).toString("hex")),
      },
    });
    const other = await db.user.create({
      data: {
        alias: "windows_two",
        passwordHash: passwordHash(randomBytes(16).toString("hex")),
      },
    });
    const admin = await db.user.create({
      data: {
        alias: "windows_admin",
        role: "ADMIN",
        passwordHash: passwordHash(randomBytes(16).toString("hex")),
      },
    });
    const sessions = new Map<string, string>();
    for (const account of [user, other, admin]) {
      const token = randomBytes(24).toString("hex");
      await db.session.create({
        data: {
          userId: account.id,
          scope: "game",
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      sessions.set(account.id, "ctf_session=" + token);
    }
    let app = await createApp();
    await app.listen(0, "127.0.0.1");
    closeApp = () => app.close();
    let base = await app.getUrl();
    const request = async <T = Record<string, unknown>>(
      path: string,
      method = "GET",
      body?: unknown,
      account = user.id,
    ) => {
      const response = await fetch(base + "/api/v1" + path, {
        method,
        headers: {
          origin: process.env.APP_ORIGIN!,
          "content-type": "application/json",
          ...(sessions.has(account) ? { cookie: sessions.get(account)! } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, data: (await response.json()) as T };
    };
    const run = async (command: string, account = user.id) => {
      const reply = await request<{ output: string }>(
        "/windows/lab/commands",
        "POST",
        { command },
        account,
      );
      assert.equal(reply.status, 201);
      return reply.data.output;
    };
    await t.test("sesión, esquema estricto y catálogo sin flags", async () => {
      assert.equal(
        (await request("/windows/lab", "GET", undefined, "")).status,
        401,
      );
      for (const body of [
        { command: "help", userId: other.id },
        { command: "help", source: "local" },
        { command: "x".repeat(2049) },
        { command: " " },
      ])
        assert.equal(
          (await request("/windows/lab/commands", "POST", body)).status,
          400,
        );
      const view = await request<{ hosts: { id: string }[] }>("/windows/lab");
      assert.equal(view.status, 200);
      assert.equal(view.data.hosts.length, 10);
      assert.ok(!JSON.stringify(view.data).includes("CTF{"));
      assert.ok(!("state" in view.data));
      assert.match(await run("help"), /whoami|Windows|smbclient/i);
    });
    await t.test("VPN para remoto y fuente fijada por endpoint", async () => {
      assert.equal(
        (
          await request("/workstation/commands", "POST", {
            command: "win help",
            cwd: "/home/analista",
            challengeId: "windows-01",
            source: "local",
          })
        ).status,
        400,
      );
      const reply = await request<{ output: string }>(
        "/workstation/commands",
        "POST",
        {
          command: "win nmap -sV 10.77.0.60",
          cwd: "/home/analista",
          challengeId: "windows-01",
        },
      );
      assert.equal(reply.status, 201);
      assert.match(reply.data.output, /VPN/i);
      assert.equal(
        (await request("/linux-network/vpn", "POST", { connected: true }))
          .status,
        201,
      );
      const scan = await request<{ output: string }>(
        "/workstation/commands",
        "POST",
        {
          command: "win nmap -sV 10.77.0.60",
          cwd: "/home/analista",
          challengeId: "windows-01",
        },
      );
      assert.equal(scan.status, 201);
      assert.match(scan.data.output, /445|5985|WIN01/);
    });
    await t.test("flags antiguas o sin operación nunca acreditan", async () => {
      for (const id of ["windows-01", "windows-02", "windows-10"]) {
        const r = await request<{ correct: boolean; awardedPoints: number }>(
          `/challenges/${id}/submissions`,
          "POST",
          { flag: "CTF{mvalle}" },
        );
        assert.equal(r.status, 201);
        assert.equal(r.data.correct, false);
        assert.equal(r.data.awardedPoints, 0);
      }
      assert.equal(await db.solve.count(), 0);
    });
    await t.test(
      "diez operaciones verificadas, 19 puntos y entrega única concurrente",
      async () => {
        for (let index = 0; index < 10; index++) {
          const flag = await completeWindowsFixture(run, index);
          assert.match(flag, /^CTF\{[^}]+\}$/);
          const id = WINDOWS_INTERACTIVE_CHALLENGES[index].id;
          const responses = await Promise.all([
            request<{ correct: boolean; awardedPoints: number }>(
              `/challenges/${id}/submissions`,
              "POST",
              { flag },
            ),
            request<{ correct: boolean; awardedPoints: number }>(
              `/challenges/${id}/submissions`,
              "POST",
              { flag },
            ),
          ]);
          assert.ok(responses.every((r) => r.status === 201 && r.data.correct));
          assert.equal(
            responses.reduce((sum, r) => sum + r.data.awardedPoints, 0),
            WINDOWS_INTERACTIVE_CHALLENGES[index].points,
          );
          const copied = await request<{ correct: boolean }>(
            `/challenges/${id}/submissions`,
            "POST",
            { flag },
            other.id,
          );
          assert.equal(copied.data.correct, false);
        }
        assert.equal(await db.solve.count({ where: { userId: user.id } }), 10);
        assert.equal(
          (await request<{ score: number }>("/game")).data.score,
          19,
        );
      },
    );
    await t.test(
      "texto arbitrario no genera evidencias del servidor",
      async () => {
        await run("connect WIN02", other.id);
        await run("echo {{flag}} > C:\\Temp\\custom.txt", other.id);
        assert.equal(
          await run("type C:\\Temp\\custom.txt", other.id),
          "{{flag}}",
        );
        const view = await request<{ proofs: string[] }>(
          "/windows/lab",
          "GET",
          undefined,
          other.id,
        );
        assert.deepEqual(view.data.proofs, []);
      },
    );
    await t.test(
      "persistencia, aislamiento y disponibilidad en cada operación",
      async () => {
        await run("help", other.id);
        const first = await db.windowsLab.findUniqueOrThrow({
          where: { userId: user.id },
        });
        const second = await db.windowsLab.findUniqueOrThrow({
          where: { userId: other.id },
        });
        assert.notEqual(first.userId, second.userId);
        const original = first.state;
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.equal((await request("/windows/lab")).status, 200);
        assert.deepEqual(
          (
            await db.windowsLab.findUniqueOrThrow({
              where: { userId: user.id },
            })
          ).state,
          original,
        );
        await db.challenge.update({
          where: { id: "windows-01" },
          data: { enabled: false },
        });
        assert.equal(
          (
            await request("/challenges/windows-01/submissions", "POST", {
              flag: "CTF{mvalle}",
            })
          ).status,
          404,
        );
        const hidden = await request<{
          hosts: { id: string; enabled: boolean }[];
        }>("/windows/lab");
        assert.ok(
          !hidden.data.hosts.some(
            (host) => host.id === "windows-01" && host.enabled,
          ),
        );
        await db.challenge.update({
          where: { id: "windows-01" },
          data: { enabled: true },
        });
      },
    );
    await t.test(
      "ADMIN practica sin competir y cierre bloquea acreditaciones",
      async () => {
        assert.equal(
          (await request("/windows/lab", "GET", undefined, admin.id)).status,
          200,
        );
        assert.equal(
          (
            await request(
              "/challenges/windows-01/submissions",
              "POST",
              { flag: "CTF{mvalle}" },
              admin.id,
            )
          ).status,
          403,
        );
        await db.competition.upsert({
          where: { id: 1 },
          create: { id: 1, open: false, closedAt: new Date() },
          update: { open: false, closedAt: new Date() },
        });
        assert.equal(
          (
            await request("/challenges/windows-01/submissions", "POST", {
              flag: "CTF{mvalle}",
            })
          ).status,
          403,
        );
        assert.equal((await request("/windows/lab")).status, 200);
      },
    );
  } finally {
    await closeApp?.();
    await disconnect?.();
    process.env.DATABASE_URL = originalUrl;
    await control.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    await control.end();
  }
});
