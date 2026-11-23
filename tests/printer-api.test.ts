import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import {
  preparePrinterCommands,
  printerReplyFlag,
  printerJsonCommand,
} from "./printer-fixtures";

test("impresora moderna: protocolos, evidencias independientes y puntuación", async (t) => {
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  const user = await db.user.create({
    data: {
      alias: "qa_printer_" + randomBytes(5).toString("hex"),
      passwordHash: passwordHash(randomBytes(20).toString("hex")),
    },
  });
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  async function request(
    path: string,
    body?: unknown,
    cookie = "ctf_session=" + token,
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
    const r = await request("/printer/commands", { command });
    assert.equal(r.response.status, 201, r.data.message);
    return r.data.output as string;
  }
  const path = (n: number, name: string) =>
    "/workstation/files?path=" +
    encodeURIComponent(
      "/home/analista/iot/caso-" +
        String(n).padStart(2, "0") +
        "/evidencia/" +
        name,
    );
  async function read(n: number, name: string) {
    const r = await request(path(n, name));
    assert.equal(r.response.status, 200);
    return r.data.content as string;
  }
  let commands: Record<string, string> = {};
  try {
    await t.test(
      "sesión, origen, cuerpos estrictos y catálogos sin respuestas",
      async () => {
        assert.equal(
          (await request("/printer", undefined, "")).response.status,
          401,
        );
        assert.equal(
          (
            await request(
              "/printer/commands",
              { command: "printer help" },
              "ctf_session=" + token,
              "https://otro.example",
            )
          ).response.status,
          403,
        );
        assert.equal(
          (
            await request("/printer/commands", {
              command: "printer help",
              userId: user.id,
            })
          ).response.status,
          400,
        );
        assert.equal(
          (await request("/printer/commands", { command: "x".repeat(4097) }))
            .response.status,
          400,
        );
        const game = (await request("/game")).data;
        const iot = game.challenges.filter((c: { id: string }) =>
          c.id.startsWith("iot-"),
        );
        assert.equal(iot.length, 10);
        assert.equal(
          iot.reduce((n: number, c: { points: number }) => n + c.points, 0),
          19,
        );
        assert.ok(!JSON.stringify(iot).includes("CTF{"));
        assert.deepEqual(
          iot.reduce(
            (acc: Record<string, number>, c: { difficulty: string }) => {
              acc[c.difficulty] = (acc[c.difficulty] ?? 0) + 1;
              return acc;
            },
            {},
          ),
          { easy: 4, medium: 3, hard: 3 },
        );
        const objects = (await request("/scene/objects")).data.objects;
        assert.equal(
          objects.find((o: { id: string }) => o.id === "printer").challengeIds
            .length,
          10,
        );
        assert.equal((await request("/printer")).response.status, 200);
        assert.ok(!(await run("printer status")).includes("CTF{"));
        commands = await preparePrinterCommands(read, run);
        assert.equal(await db.solve.count({ where: { userId: user.id } }), 0);
      },
    );
    await t.test(
      "no hay premio por peticiones incorrectas ni firma válida de otro contexto",
      async () => {
        for (const command of [
          "printer login service incorrecta",
          "printer fetch /etc/passwd",
          "printer job J-932",
          "printer mqtt flow/otro/topic",
          "printer pjl '@PJL FSUPLOAD NAME=\"0:/service/custodia.txt\" OFFSET=0 SIZE=4'",
          "printer scan-to https://example.org/export",
          'printer dispatch \'{"topic":"flow/vault/snapshot","payload":"QQ==","signature":"' +
            "0".repeat(64) +
            "\"}'",
        ]) {
          assert.equal(
            (await request("/printer/commands", { command })).response.status,
            400,
          );
        }
        const pack = JSON.parse(await read(8, "firmware.json"));
        assert.ok(
          !(await run(printerJsonCommand("update", pack))).includes("CTF{"),
        );
        pack.image.mode = "maintenance";
        pack.image.report = "custody";
        assert.equal(
          (
            await request("/printer/commands", {
              command: printerJsonCommand("update", pack),
            })
          ).response.status,
          400,
        );
        const frames = JSON.parse(await read(10, "capturas.json"));
        for (const frame of frames.slice(0, 2))
          assert.equal(
            (
              await request("/printer/commands", {
                command: printerJsonCommand("dispatch", {
                  ...frame,
                  topic: "flow/vault/snapshot",
                }),
              })
            ).response.status,
            400,
          );
        assert.equal(await db.solve.count({ where: { userId: user.id } }), 0);
      },
    );
    await t.test(
      "cada servicio y su evidencia obedecen disponibilidad",
      async () => {
        for (let n = 1; n <= 10; n++) {
          const id = "iot-" + String(n).padStart(2, "0");
          const original = await db.challenge.findUniqueOrThrow({
            where: { id },
          });
          try {
            await db.challenge.update({
              where: { id },
              data: { enabled: false },
            });
            assert.equal(
              (await request("/printer/commands", { command: commands[id] }))
                .response.status,
              400,
            );
            assert.equal(
              (await request(path(n, "protocolos.txt"))).response.status,
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
      "diez retos en orden inverso suman19 una sola vez y la terminal comparte servicios",
      async () => {
        for (let n = 10; n >= 1; n--) {
          const id = "iot-" + String(n).padStart(2, "0");
          const reply = await request("/printer/commands", {
            command: commands[id],
          });
          assert.equal(reply.response.status, 201);
          if ([7, 8, 10].includes(n)) assert.equal(reply.data.printed, true);
          const flag = printerReplyFlag(id, reply.data.output);
          const submission = await request(
            "/challenges/" + id + "/submissions",
            { flag },
          );
          assert.equal(submission.data.correct, true);
          assert.equal(
            submission.data.awardedPoints,
            n <= 4 ? 1 : n <= 7 ? 2 : 3,
          );
          assert.equal(
            (await request("/challenges/" + id + "/submissions", { flag })).data
              .awardedPoints,
            0,
          );
          if (n === 10) assert.equal((await request("/game")).data.score, 3);
        }
        const terminal = await request("/workstation/commands", {
          command: "printer status --print",
          cwd: "/home/analista",
          challengeId: "primer-rastro",
        });
        assert.equal(terminal.data.printed, true);
        assert.match(terminal.data.output, /FLOW-M740/);
        const browse = await request("/workstation/commands", {
          command: "cat /home/analista/iot/caso-08/evidencia/verificador.txt",
          cwd: "/home/analista",
          challengeId: "primer-rastro",
        });
        assert.match(browse.data.output, /model\|version/);
        const game = (await request("/game")).data;
        assert.equal(game.score, 19);
        assert.equal(game.solves.length, 10);
        const ranking = (await request("/ranking")).data.entries.find(
          (e: { alias: string }) => e.alias === user.alias,
        );
        assert.equal(ranking.score, 19);
      },
    );
  } finally {
    await db.solve.deleteMany({ where: { userId: user.id } });
    await db.submission.deleteMany({ where: { userId: user.id } });
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await app.close();
    await db.$disconnect();
  }
});
