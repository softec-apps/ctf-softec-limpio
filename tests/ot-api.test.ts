import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import {
  prepareOtCommands,
  otJsonCommand,
  legacyProof,
  otReplyFlag,
} from "./ot-fixtures";

test("OT: protocolos, cambios físicos, aislamiento y resultados persistentes", async (t) => {
  let app = await createApp();
  await app.listen(0, "127.0.0.1");
  let base = await app.getUrl();
  const ids: string[] = [];
  async function account() {
    const user = await db.user.create({
      data: {
        alias: "qa_ot_" + randomBytes(5).toString("hex"),
        passwordHash: passwordHash(randomBytes(24).toString("hex")),
      },
    });
    ids.push(user.id);
    const token = randomBytes(32).toString("hex");
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return { ...user, cookie: "ctf_session=" + token };
  }
  const a = await account(),
    b = await account();
  async function request(
    path: string,
    body?: unknown,
    cookie = a.cookie,
    origin = process.env.APP_ORIGIN!,
  ) {
    const response = await fetch(base + "/api/v1" + path, {
      method: body ? "POST" : "GET",
      headers: { cookie, origin, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { response, data: await response.json() };
  }
  async function run(command: string) {
    const r = await request("/ot/commands", { command });
    assert.equal(r.response.status, 201, r.data.message);
    return r.data;
  }
  const filePath = (n: number, name: string) =>
    "/workstation/files?path=" +
    encodeURIComponent(
      "/home/analista/ot/caso-" +
        String(n).padStart(2, "0") +
        "/evidencia/" +
        name,
    );
  async function read(n: number, name: string) {
    const r = await request(filePath(n, name));
    assert.equal(r.response.status, 200);
    return r.data.content as string;
  }
  let fixtures: Awaited<ReturnType<typeof prepareOtCommands>>;
  try {
    await t.test(
      "autenticación, origen y estructura estrictos; catálogo230 y distribución4/3/3",
      async () => {
        assert.equal(
          (await request("/ot", undefined, "")).response.status,
          401,
        );
        assert.equal(
          (
            await request(
              "/ot/commands",
              { command: "ot status" },
              a.cookie,
              "https://otro.example",
            )
          ).response.status,
          403,
        );
        assert.equal(
          (
            await request("/ot/commands", {
              command: "ot status",
              userId: b.id,
            })
          ).response.status,
          400,
        );
        assert.equal(
          (await request("/ot/commands", { command: "x".repeat(4097) }))
            .response.status,
          400,
        );
        const game = (await request("/game")).data;
        assert.equal(game.challenges.length, 250);
        const cases = game.challenges.filter((c: { id: string }) =>
          c.id.startsWith("ot-"),
        );
        assert.equal(cases.length, 10);
        assert.equal(
          cases.reduce((n: number, c: { points: number }) => n + c.points, 0),
          19,
        );
        assert.ok(!JSON.stringify(cases).includes("CTF{"));
        assert.deepEqual(
          cases.reduce(
            (sum: Record<string, number>, c: { difficulty: string }) => {
              sum[c.difficulty] = (sum[c.difficulty] ?? 0) + 1;
              return sum;
            },
            {},
          ),
          { easy: 4, medium: 3, hard: 3 },
        );
        assert.equal(
          (await request("/challenges/ot-08/debrief")).response.status,
          403,
        );
        assert.equal(
          (await request("/challenges/otro/debrief")).response.status,
          404,
        );
        fixtures = await prepareOtCommands(read);
        assert.equal((await request("/ot")).data.view.revision, 0);
        assert.equal(await db.solve.count({ where: { userId: a.id } }), 0);
      },
    );
    await t.test(
      "peticiones y pruebas inválidas no modifican el banco ni conceden evidencia",
      async () => {
        const brokenProgram = {
          ...fixtures.baseProgram,
          source: "LD TRUE\nST FAN_RUN",
        };
        const tamperedFirmware = structuredClone(fixtures.modern);
        tamperedFirmware.image.securityVersion = 1;
        const tamperedOrder = structuredClone(fixtures.captured);
        tamperedOrder.body.value = !tamperedOrder.body.value;
        for (const command of [
          "ot login operator mala",
          "ot panel light off",
          "ot http GET /engineering/diagnostics",
          'ot hmi \'{"action":"engineering-tune","role":"observer","setpointRpm":1450}\'',
          "ot modbus 000100000005010500c8ff00",
          "ot modbus 000100000006020500c8ff00",
          otJsonCommand("program", brokenProgram),
          otJsonCommand("firmware", tamperedFirmware),
          otJsonCommand("replay", tamperedOrder),
          "ot diagnostic read-custody " + "0".repeat(64),
        ])
          assert.equal(
            (await request("/ot/commands", { command })).response.status,
            400,
          );
        const exception = await run("ot modbus 000100000006010500c80001");
        assert.equal(Buffer.from(exception.output.slice(3), "hex")[7], 0x85);
        assert.equal(exception.view.revision, 0);
        assert.equal((await request("/ot")).data.view.revision, 0);
      },
    );
    await t.test(
      "diez retos independientes se resuelven en orden inverso por sus evidencias",
      async () => {
        for (let n = 10; n >= 1; n--) {
          const id = "ot-" + String(n).padStart(2, "0");
          let reply;
          for (const command of fixtures.commands[id])
            reply = await run(command);
          if (n === 9) {
            assert.equal(
              (
                await request("/ot/commands", {
                  command: "ot diagnostic read-custody " + "0".repeat(64),
                })
              ).response.status,
              400,
            );
            reply = await run(legacyProof(fixtures.legacyKey, reply.output));
            assert.equal(reply.view.securityVersion, 3);
            assert.ok(!JSON.stringify(reply.view).includes(fixtures.legacyKey));
          }
          if (n === 10) {
            assert.equal(reply.view.lightOn, false);
            assert.equal((await request("/game")).data.score, 0);
          }
          if (n === 8) assert.equal(reply.view.fanRunning, true);
          if (n === 7) assert.equal(reply.view.alarmActive, false);
          if (n === 5) assert.equal(reply.view.fanRpm, 1450);
          if (n === 1) assert.equal(reply.view.beacon, "blue");
          const flag = otReplyFlag(id, reply.output);
          const result = await request("/challenges/" + id + "/submissions", {
            flag,
          });
          assert.equal(result.data.correct, true);
          assert.equal(result.data.awardedPoints, n <= 4 ? 1 : n <= 7 ? 2 : 3);
          assert.equal(
            (await request("/challenges/" + id + "/submissions", { flag })).data
              .awardedPoints,
            0,
          );
          const debrief = await request("/challenges/" + id + "/debrief");
          assert.equal(debrief.response.status, 200);
          assert.match(debrief.data.reference, /^https:\/\/cwe\.mitre\.org/);
          assert.ok(debrief.data.defense.length > 30);
        }
        const game = (await request("/game")).data;
        assert.equal(game.score, 19);
        assert.equal(game.solves.length, 10);
        assert.equal(
          (await request("/ranking")).data.entries.find(
            (u: { alias: string }) => u.alias === a.alias,
          ).score,
          19,
        );
      },
    );
    await t.test(
      "cada servicio y sus archivos respetan disponibilidad",
      async () => {
        for (let n = 1; n <= 10; n++) {
          const id = "ot-" + String(n).padStart(2, "0"),
            original = await db.challenge.findUniqueOrThrow({ where: { id } });
          try {
            await db.challenge.update({
              where: { id },
              data: { enabled: false },
            });
            assert.equal(
              (
                await request("/ot/commands", {
                  command: fixtures.commands[id][0],
                })
              ).response.status,
              400,
            );
            assert.equal(
              (await request(filePath(n, "inexistente.txt"))).response.status,
              404,
            );
          } finally {
            await db.challenge.update({
              where: { id },
              data: { enabled: original.enabled },
            });
          }
        }
      },
    );
    await t.test(
      "identidades y estado de otros participantes permanecen aislados",
      async () => {
        const other = (await request("/ot", undefined, b.cookie)).data.view;
        assert.equal(other.revision, 0);
        assert.equal(other.lightOn, true);
        assert.equal(other.fanRpm, 900);
        assert.equal(other.role, "observer");
        assert.equal(other.legacyDiagnostic, false);
        assert.equal(
          (await request("/challenges/ot-08/debrief", undefined, b.cookie))
            .response.status,
          403,
        );
        assert.equal(
          (await request("/game", undefined, b.cookie)).data.score,
          0,
        );
      },
    );
    await t.test(
      "persistencia, terminal normal y escrituras concurrentes no pierden cambios",
      async () => {
        const before = (await request("/ot")).data.view;
        const results = await Promise.all(
          ["off", "on", "off", "on"].map((value) =>
            run("ot panel light " + value),
          ),
        );
        assert.equal(
          (await request("/ot")).data.view.revision,
          before.revision + 4,
        );
        assert.equal(new Set(results.map((r) => r.view.revision)).size, 4);
        const snapshot = (await request("/ot")).data.view;
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.deepEqual((await request("/ot")).data.view, snapshot);
        const terminal = await request("/workstation/commands", {
          command: "ot status",
          challengeId: "primer-rastro",
          cwd: "/home/analista",
        });
        assert.equal(terminal.response.status, 201);
        assert.equal(terminal.data.ot.fanRpm, 1450);
        const file = await request("/workstation/commands", {
          command: "cat /home/analista/ot/caso-08/evidencia/interprete.txt",
          challengeId: "primer-rastro",
          cwd: "/home/analista",
        });
        assert.match(file.data.output, /IEC/);
        const reset = await run("ot reset --confirm");
        assert.equal(reset.view.fanRpm, 900);
        assert.equal(reset.view.legacyDiagnostic, false);
        assert.equal((await request("/game")).data.score, 19);
        assert.ok(reset.view.history.length <= 20);
      },
    );
  } finally {
    await db.solve.deleteMany({ where: { userId: { in: ids } } });
    await db.submission.deleteMany({ where: { userId: { in: ids } } });
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await db.$disconnect();
  }
});
