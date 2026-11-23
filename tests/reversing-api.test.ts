import { registrationFixture } from "./registration-fixtures";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { REVERSE_CASES, REVERSE_ROOT } from "../apps/api/src/reversing/catalog";
import { recoverReverseLicense, runReverseProgram } from "./reversing-fixtures";
test("ingeniería inversa: archivos privados, programas reales y puntuación", async (t) => {
  const registration = registrationFixture();
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  let cookie = "",
    userId = "";
  const recovered = new Map<string, string>();
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    session = cookie,
  ) => {
    const prepared = await registration.prepare(
      base,
      path,
      method,
      body,
      session,
    );
    body = prepared.body;
    session = prepared.cookie;
    return fetch(base + "/api/v1" + path, {
      method,
      headers: {
        origin: process.env.APP_ORIGIN!,
        ...(session ? { cookie: session } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };
  const binary = (path: string) =>
      "/workstation/binary?path=" + encodeURIComponent(path),
    files = (path: string) =>
      "/workstation/files?path=" + encodeURIComponent(path);
  try {
    await t.test(
      "autenticación, registro y diez casos habilitados",
      async () => {
        assert.equal(
          (
            await request(
              binary(REVERSE_CASES[0].folder + "/" + REVERSE_CASES[0].file),
            )
          ).status,
          401,
        );
        const reg = await request("/auth/register", "POST", {
          alias: "qa_reverse_" + randomBytes(4).toString("hex"),
          password: randomBytes(18).toString("hex"),
          code: process.env.REGISTRATION_CODE,
        });
        assert.equal(reg.status, 201);
        userId = (await reg.json()).user.id;
        cookie = reg.headers.get("set-cookie")!.split(";")[0];
        const game = await (await request("/game")).json();
        assert.equal(
          game.challenges.filter((c: { id: string }) =>
            c.id.startsWith("reverse-"),
          ).length,
          10,
        );
        assert.ok(!JSON.stringify(game.challenges).includes("CTF{"));
        assert.equal(
          (await (await request(files(REVERSE_ROOT))).json()).entries.length,
          10,
        );
      },
    );
    await t.test(
      "recuperar las diez entregas descargando y analizando los bytes",
      async () => {
        for (const c of REVERSE_CASES) {
          const path = c.folder + "/" + c.file,
            meta = await (await request(files(path))).json();
          assert.equal(meta.mime, "application/wasm");
          assert.equal("content" in meta, false);
          const response = await request(binary(path));
          assert.equal(response.status, 200);
          assert.equal(
            response.headers.get("content-type"),
            "application/wasm",
          );
          assert.equal(
            response.headers.get("cache-control"),
            "private, no-store",
          );
          assert.equal(
            response.headers.get("x-content-type-options"),
            "nosniff",
          );
          const bytes = new Uint8Array(await response.arrayBuffer()),
            key = recoverReverseLicense(c.index, bytes),
            run = await runReverseProgram(bytes, key);
          assert.equal(run.result, 1);
          assert.match(run.output, /^CTF\{[a-f0-9]{32}\}$/);
          recovered.set(c.id, run.output);
          const note = await (
            await request(files(c.folder + "/ABI.txt"))
          ).json();
          assert.match(note.content, /verify/);
          assert.ok(!note.content.includes(key));
        }
        assert.equal(
          (await request(binary(REVERSE_ROOT + "/../../.env"))).status,
          404,
        );
        assert.equal(
          (await request(binary(REVERSE_CASES[0].folder + "/otro.wasm")))
            .status,
          404,
        );
        assert.equal(
          (
            await request(
              binary(REVERSE_CASES[0].folder + "/" + REVERSE_CASES[0].file) +
                "&userId=otro",
            )
          ).status,
          400,
        );
      },
    );
    await t.test(
      "la Terminal usa el mismo montaje con archivos y subdirectorios",
      async () => {
        let cwd = "/home/analista";
        const work = async (command: string) => {
          const response = await request("/workstation/commands", "POST", {
            command,
            challengeId: "reverse-01",
            cwd,
          });
          assert.equal(response.status, 201);
          const result = await response.json();
          cwd = result.cwd;
          return result;
        };
        assert.equal(
          (await work("cd " + REVERSE_CASES[0].folder)).cwd,
          REVERSE_CASES[0].folder,
        );
        assert.match((await work("ls")).output, /archivo.wasm/);
        assert.match((await work("file archivo.wasm")).output, /WebAssembly/);
        assert.match((await work("xxd archivo.wasm")).output, /00 61 73 6d/);
        assert.match((await work("cat ABI.txt")).output, /verify/);
        assert.equal((await work("cd ..")).cwd, REVERSE_ROOT);
      },
    );
    await t.test(
      "revocar un reto bloquea datos y binarios aunque estén cacheados",
      async () => {
        const c = await db.challenge.findUniqueOrThrow({
            where: { id: "reverse-05" },
          }),
          entry = REVERSE_CASES[4],
          path = entry.folder + "/" + entry.file;
        try {
          await db.challenge.update({
            where: { id: c.id },
            data: { enabled: false },
          });
          assert.equal((await request(files(path))).status, 404);
          assert.equal((await request(binary(path))).status, 404);
          assert.equal(
            (
              await request("/challenges/" + c.id + "/submissions", "POST", {
                flag: recovered.get(c.id),
              })
            ).status,
            404,
          );
          assert.equal(
            (await (await request(files(REVERSE_ROOT))).json()).entries.length,
            9,
          );
        } finally {
          await db.challenge.update({
            where: { id: c.id },
            data: { enabled: c.enabled },
          });
        }
      },
    );
    await t.test(
      "licencias no puntúan, flags sí: 19 puntos sin duplicados",
      async () => {
        for (const c of REVERSE_CASES) {
          const bytes = new Uint8Array(
              await (
                await request(binary(c.folder + "/" + c.file))
              ).arrayBuffer(),
            ),
            key = recoverReverseLicense(c.index, bytes);
          const wrong = await request(
            "/challenges/" + c.id + "/submissions",
            "POST",
            { flag: key },
          );
          assert.equal((await wrong.json()).correct, false);
          const results = await Promise.all(
            [0, 1, 2].map(() =>
              request("/challenges/" + c.id + "/submissions", "POST", {
                flag: recovered.get(c.id),
              }),
            ),
          );
          for (const r of results) {
            assert.equal(r.status, 201);
            assert.equal((await r.json()).correct, true);
          }
        }
        const solves = await db.solve.findMany({
          where: { userId },
          include: { challenge: true },
        });
        assert.equal(solves.length, 10);
        assert.equal(
          solves.reduce((s, c) => s + c.challenge.points, 0),
          19,
        );
      },
    );
  } finally {
    await app.close();
    if (userId) {
      await db.submission.deleteMany({ where: { userId } });
      await db.solve.deleteMany({ where: { userId } });
      await db.auditLog.deleteMany({ where: { userId } });
      await db.user.delete({ where: { id: userId } });
    }
    await registration.cleanup();
    await db.$disconnect();
  }
});
