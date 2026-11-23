import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import {
  completeWirelessFixture,
  wirelessAssessmentCommand,
} from "./wireless-fixtures";
import type { WirelessId, WirelessView } from "../packages/wireless-contracts";

test("inalámbricas: operaciones persistentes, pruebas negativas, identidad y puntuación única", async (t) => {
  let app = await createApp();
  await app.listen(0, "127.0.0.1");
  let base = await app.getUrl();
  const users: string[] = [],
    sessions = new Map<string, string>();
  const targets: WirelessId[] = ["wireless-08", "wireless-09", "wireless-10"];
  const flags = new Map<string, string>();
  let user = "",
    other = "",
    admin = "";
  const request = async (path: string, body?: unknown, who = user) => {
    const response = await fetch(base + "/api/v1" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        origin: process.env.APP_ORIGIN!,
        "content-type": "application/json",
        ...(sessions.has(who) ? { cookie: sessions.get(who)! } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  const command = async (id: string, value: string, who = user) => {
    const view = await request(`/wireless/labs/${id}`, undefined, who);
    assert.equal(view.status, 200);
    return request(
      `/wireless/labs/${id}/commands`,
      { command: value, revision: view.data.revision },
      who,
    );
  };
  try {
    for (const role of ["PARTICIPANT", "PARTICIPANT", "ADMIN"] as const) {
      const account = await db.user.create({
        data: {
          alias: "qa_wlan_" + randomBytes(5).toString("hex"),
          role,
          passwordHash: passwordHash(randomBytes(16).toString("hex")),
        },
      });
      users.push(account.id);
      const token = randomBytes(24).toString("hex");
      await db.session.create({
        data: {
          userId: account.id,
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      sessions.set(account.id, "ctf_session=" + token);
    }
    [user, other, admin] = users;
    await t.test(
      "requiere sesión, escenario habilitado y un comando del intérprete",
      async () => {
        assert.equal(
          (await request("/wireless/labs/wireless-08", undefined, "")).status,
          401,
        );
        assert.equal((await request("/wireless/labs/wireless-01")).status, 404);
        const view = (await request("/wireless/labs/wireless-08")).data;
        for (const body of [
          { command: "help" },
          { command: "help", revision: view.revision, userId: other },
          {
            command: "configure gateway __proto__ allow",
            revision: view.revision,
          },
        ])
          assert.equal(
            (await request("/wireless/labs/wireless-08/commands", body)).status,
            400,
          );
        const initial = await command("wireless-08", "verify");
        assert(!initial.data.output.includes("CTF{"));
        assert.equal(initial.data.view.checks.length, 0);
      },
    );
    await t.test(
      "tres recorridos operativos generan comprobante solo después de las pruebas y suman nueve puntos",
      async () => {
        const oldAnswers = [
          "0988465c50725575fc4b29e6ebecd5d8a0a183da8e4c17519ea0c5d052ee66fa",
          "bcf5089286211e5632581489e3022257296486ca5f9b853cb73c1295d367553a",
          "2f0a376943e222a40acd0911b0d78f76a216bcc46ac71f4a6e50f4312d4b91ab",
        ];
        for (const [index, id] of targets.entries()) {
          assert.equal(
            (
              await request(`/challenges/${id}/submissions`, {
                flag: `CTF{${oldAnswers[index]}}`,
              })
            ).data.correct,
            false,
          );
          const flag = await completeWirelessFixture(id, request);
          flags.set(id, flag);
          const results = await Promise.all(
            [1, 2, 3].map(() =>
              request(`/challenges/${id}/submissions`, { flag }),
            ),
          );
          assert(results.every((r) => r.status === 201 && r.data.correct));
          assert.equal(
            results.reduce((sum, r) => sum + r.data.awardedPoints, 0),
            3,
          );
          const capture = await request(`/wireless/labs/${id}/capture`);
          assert.equal(capture.data.format, "seventech-capture-v1");
          assert(capture.data.packets.length > 10);
          assert(!JSON.stringify(capture.data).includes(flag));
        }
        assert.equal((await request("/game")).data.score, 9);
      },
    );
    await t.test(
      "otra cuenta no puede reutilizar el comprobante ni sobrescribir el estado ajeno",
      async () => {
        assert.equal(
          (
            await request(
              "/challenges/wireless-08/submissions",
              { flag: flags.get("wireless-08") },
              other,
            )
          ).data.correct,
          false,
        );
        const ownBefore = (await command("wireless-08", "show running")).data
          .output;
        const otherView = (
          await request("/wireless/labs/wireless-08", undefined, other)
        ).data as WirelessView;
        assert.equal(
          (
            await command(
              "wireless-08",
              wirelessAssessmentCommand("wireless-08", otherView),
              other,
            )
          ).status,
          201,
        );
        await command("wireless-08", "configure ap-east rf disabled", other);
        await command("wireless-08", "commit", other);
        assert.equal(
          (await command("wireless-08", "show running")).data.output,
          ownBefore,
        );
        assert.equal((await request("/game", undefined, other)).data.score, 0);
      },
    );
    await t.test(
      "los resultados y cambios sobreviven al reinicio de la API",
      async () => {
        const before = (await request("/wireless/labs/wireless-10"))
          .data as WirelessView;
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        const after = (await request("/wireless/labs/wireless-10")).data;
        assert.deepEqual(after, before);
        assert.equal((await request("/game")).data.score, 9);
      },
    );
    await t.test(
      "ediciones y reset revocan pruebas, conservan puntos y las revisiones evitan cambios perdidos",
      async () => {
        const view = (await request("/wireless/labs/wireless-08"))
          .data as WirelessView;
        const concurrent = await Promise.all(
          ["show running", "help"].map((line) =>
            request("/wireless/labs/wireless-08/commands", {
              command: line,
              revision: view.revision,
            }),
          ),
        );
        assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
        await command("wireless-08", "configure gateway guestToStaff allow");
        assert.equal(
          (
            await request("/challenges/wireless-08/submissions", {
              flag: flags.get("wireless-08"),
            })
          ).data.correct,
          false,
        );
        await command("wireless-08", "commit");
        assert.equal(
          (await request("/wireless/labs/wireless-08")).data.checks.length,
          0,
        );
        await command("wireless-08", "reset --confirm");
        assert.equal(
          (
            await request("/challenges/wireless-08/submissions", {
              flag: flags.get("wireless-08"),
            })
          ).data.correct,
          false,
        );
        assert.equal((await request("/game")).data.score, 9);
      },
    );
    await t.test(
      "terminal y consola usan el mismo laboratorio y las capturas apuntan a la ruta correcta",
      async () => {
        const line = await request("/workstation/commands", {
          command: "wlan wireless-09 show running",
          cwd: "/home/analista",
          challengeId: "wireless-09",
        });
        assert.equal(line.status, 201);
        assert.equal(
          line.data.output,
          (await command("wireless-09", "show running")).data.output,
        );
        const list = (await request("/network/captures")).data.entries;
        assert.equal(
          list.filter((c: { path: string }) =>
            c.path.startsWith("/wireless/labs/"),
          ).length,
          3,
        );
        assert(
          !list.some((c: { path: string }) =>
            c.path.startsWith("/network/labs/wireless-"),
          ),
        );
      },
    );
    await t.test(
      "ADMIN no puntúa y el cierre o deshabilitación bloquean acreditaciones",
      async () => {
        assert.equal(
          (
            await request(
              "/challenges/wireless-09/submissions",
              { flag: flags.get("wireless-09") },
              admin,
            )
          ).status,
          403,
        );
        const competition = await db.competition.findUniqueOrThrow({
          where: { id: 1 },
        });
        await db.competition.update({
          where: { id: 1 },
          data: { open: false, closedAt: new Date() },
        });
        try {
          assert.equal(
            (
              await request("/challenges/wireless-09/submissions", {
                flag: flags.get("wireless-09"),
              })
            ).status,
            403,
          );
        } finally {
          await db.competition.update({
            where: { id: 1 },
            data: { open: competition.open, closedAt: competition.closedAt },
          });
        }
        const challenge = await db.challenge.findUniqueOrThrow({
          where: { id: "wireless-10" },
        });
        await db.challenge.update({
          where: { id: challenge.id },
          data: { enabled: false },
        });
        try {
          assert.equal(
            (await request("/wireless/labs/wireless-10")).status,
            404,
          );
          assert.equal(
            (await request("/wireless/labs/wireless-10/capture")).status,
            404,
          );
          assert.equal(
            (
              await request("/challenges/wireless-10/submissions", {
                flag: flags.get("wireless-10"),
              })
            ).status,
            404,
          );
        } finally {
          await db.challenge.update({
            where: { id: challenge.id },
            data: { enabled: challenge.enabled },
          });
        }
      },
    );
    await t.test(
      "la ampliación reinicia solo el laboratorio antiguo de roaming y conserva RADIUS y puntajes",
      async () => {
        const key = {
          userId_scenarioId: { userId: user, scenarioId: "wireless-08" },
        };
        const oldRow = await db.networkLab.findUniqueOrThrow({ where: key });
        const legacy = JSON.parse(JSON.stringify(oldRow.state));
        delete legacy.learning;
        await db.networkLab.update({ where: key, data: { state: legacy } });
        const radiusKey = {
          userId_scenarioId: { userId: user, scenarioId: "wireless-10" },
        };
        const radiusBefore = await db.networkLab.findUniqueOrThrow({
          where: radiusKey,
        });
        const upgraded = await request("/wireless/labs/wireless-08");
        assert.equal(upgraded.status, 200);
        assert.equal(upgraded.data.assessment.stage, "diagnosis");
        assert.equal(upgraded.data.assessment.accepted, false);
        assert.equal(upgraded.data.revision, oldRow.revision + 1);
        await request("/wireless/labs/wireless-10");
        assert.deepEqual(
          await db.networkLab.findUniqueOrThrow({ where: radiusKey }),
          radiusBefore,
        );
        assert.equal((await request("/game")).data.score, 9);
        assert.equal(
          (
            await request("/challenges/wireless-08/submissions", {
              flag: flags.get("wireless-08"),
            })
          ).data.correct,
          false,
        );
      },
    );
  } finally {
    await app.close();
    await db.submission.deleteMany({ where: { userId: { in: users } } });
    await db.solve.deleteMany({ where: { userId: { in: users } } });
    await db.auditLog.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});
