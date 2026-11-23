import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import {
  SPECIALIST_STATIONS,
  stationEvidenceRoot,
} from "../packages/specialist-contracts";
import {
  MEMORY_OPERATIONS,
  parseMemorySnapshot,
  memoryRows,
} from "../packages/memory-tools";
import { analysisAnswer, consoleInput } from "./advanced-fixtures";
import { completeWirelessFixture } from "./wireless-fixtures";
import { isWirelessOperational } from "../apps/api/src/wireless/scenarios";
const stations = SPECIALIST_STATIONS.filter((s) =>
  [
    "cloud-tablet",
    "devops-node",
    "ai-assistant",
    "wireless-ap",
    "memory-unit",
  ].includes(s.id),
);
test("cinco categorías: cincuenta soluciones reproducibles, herramientas y disponibilidad", async (t) => {
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl(),
    ids: string[] = [];
  async function account() {
    const user = await db.user.create({
      data: {
        alias: "qa_advanced_" + randomBytes(6).toString("hex"),
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
    return "ctf_session=" + token;
  }
  const cookie = await account(),
    other = await account();
  const call = async (
    path: string,
    body?: unknown,
    session = cookie,
    origin = process.env.APP_ORIGIN!,
  ) => {
    const response = await fetch(base + "/api/v1" + path, {
      method: body ? "POST" : "GET",
      headers: { cookie: session, origin, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const game = (await call("/game")).data;
    assert.equal(game.challenges.length, 250);
    for (const station of stations) {
      const cases = game.challenges.filter((c: { id: string }) =>
        c.id.startsWith(station.prefix),
      );
      assert.equal(cases.length, 10);
      assert.deepEqual(
        [1, 2, 3].map(
          (p) => cases.filter((c: { points: number }) => c.points === p).length,
        ),
        [4, 3, 3],
      );
      assert.equal(
        (await call("/scene/objects/" + station.id, undefined, "")).status,
        401,
      );
      const docs = (await call("/scene/objects/" + station.id)).data.documents;
      assert.equal(docs.length, 10);
      assert(docs.every((d: { body?: string }) => d.body === undefined));
    }
    for (const station of [...stations].reverse())
      await t.test(
        station.category + ": diez casos en orden inverso",
        async () => {
          for (let index = 10; index >= 1; index--) {
            const id = station.prefix + String(index).padStart(2, "0"),
              root = stationEvidenceRoot(id)!;
            const read = async (name: string) => {
              const result = await call(
                "/workstation/files?path=" +
                  encodeURIComponent(root + "/evidencia/" + name),
              );
              assert.equal(result.status, 200);
              return String(result.data.content);
            };
            assert.equal(
              (await call(`/scene/objects/${station.id}/documents/${id}`))
                .status,
              200,
            );
            let flag: string;
            if (station.serviceHost) {
              const home = await call(`/challenges/${id}/web`, { url: "/" });
              assert.equal(home.status, 201);
              assert(!home.data.body.includes("CTF{"));
              const defaults = JSON.parse(home.data.form.fields[0].value),
                negative = await call(`/challenges/${id}/web`, {
                  url:
                    "/operate?payload=" +
                    encodeURIComponent(JSON.stringify(defaults)),
                });
              assert(!negative.data.body.includes("CTF{"));
              const payload = await consoleInput(id, read),
                url =
                  "/operate?payload=" +
                  encodeURIComponent(JSON.stringify(payload));
              const reply = await call(`/challenges/${id}/web`, { url });
              assert.equal(reply.status, 201);
              assert.equal(reply.data.status, 200);
              const match = reply.data.body.match(/CTF\{[a-f0-9]{32}\}/);
              assert(match, id);
              flag = match[0];
              assert.equal(
                (
                  await call(`/challenges/${id}/web`, {
                    url: "http://outside.invalid/",
                  })
                ).status,
                400,
              );
              assert.equal(
                (
                  await call(`/challenges/${id}/web`, {
                    url: "/operate?payload=[]",
                  })
                ).data.status,
                400,
              );
            } else if (isWirelessOperational(id))
              flag = await completeWirelessFixture(id, call);
            else flag = "CTF{" + (await analysisAnswer(id, read)) + "}";
            const submission = await call(`/challenges/${id}/submissions`, {
              flag,
            });
            assert.equal(submission.status, 201, id);
            assert.equal(submission.data.correct, true, id);
            if (index === 10) {
              const duplicate = await call(`/challenges/${id}/submissions`, {
                flag,
              });
              assert.equal(duplicate.data.correct, true);
            }
          }
        },
      );
    await t.test(
      "95 puntos, aislamiento, radio y RAMLab operables",
      async () => {
        assert.equal((await call("/game")).data.score, 95);
        assert.equal((await call("/game", undefined, other)).data.score, 0);
        const allCaptures = (await call("/network/captures")).data.entries;
        const captures = allCaptures.filter((c: { path: string }) =>
          c.path.includes("/inalambricas/"),
        );
        assert.equal(captures.length, 7);
        const operational = allCaptures.filter((c: { path: string }) =>
          c.path.startsWith("/wireless/labs/"),
        );
        assert.equal(operational.length, 3);
        for (const entry of operational) {
          const capture = await call(entry.path);
          assert.equal(capture.data.format, "seventech-capture-v1");
          assert(capture.data.packets.length > 0);
        }
        const command = await call("/workstation/commands", {
          command: "mem psscan",
          cwd: "/home/analista",
          challengeId: "memory-01",
        });
        assert.equal(command.status, 201);
        assert(
          JSON.parse(command.data.output).some(
            (p: { pid: number }) => p.pid === 417,
          ),
        );
        for (const station of stations) {
          const id = station.prefix + "10";
          await db.challenge.update({
            where: { id },
            data: { enabled: false },
          });
          try {
            assert.equal(
              (await call(`/scene/objects/${station.id}/documents/${id}`))
                .status,
              404,
            );
            assert(
              !(await call("/scene/objects/" + station.id)).data.documents.some(
                (d: { id: string }) => d.id === id,
              ),
            );
            assert.equal(
              (
                await call(
                  "/workstation/files?path=" +
                    encodeURIComponent(stationEvidenceRoot(id)! + "/LEEME.txt"),
                )
              ).status,
              404,
            );
            if (station.serviceHost)
              assert.equal(
                (await call(`/challenges/${id}/web`, { url: "/" })).status,
                404,
              );
          } finally {
            await db.challenge.update({
              where: { id },
              data: { enabled: true },
            });
          }
        }
        assert.equal(
          (
            await call(
              "/challenges/cloud-01/web",
              { url: "/" },
              cookie,
              "https://other.invalid",
            )
          ).status,
          403,
        );
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
test("RAMLab: formato, vistas y límites sin ejecutar instrucciones", () => {
  const snapshot = parseMemorySnapshot(
    JSON.stringify({
      format: "seventech-memory-v1",
      regions: [
        { type: "private", protection: "RX", bytes: "4d5a00" },
        { type: "image", protection: "RX", bytes: "4d5a00" },
      ],
    }),
  );
  assert.equal(memoryRows(snapshot, "malfind").length, 1);
  assert.equal(MEMORY_OPERATIONS.length, 8);
  assert.throws(() => parseMemorySnapshot("{"));
  assert.throws(() => parseMemorySnapshot('{"format":"native-ram"}'));
  assert.throws(() =>
    parseMemorySnapshot('{"format":"seventech-memory-v1","processes":[null]}'),
  );
  assert.throws(() => memoryRows(snapshot, "execute"));
});
