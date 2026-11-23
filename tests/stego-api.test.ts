import { registrationFixture } from "./registration-fixtures";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import {
  STEGO_CASES,
  STEGO_ROOT,
  stegoFlag,
} from "../apps/api/src/stego/catalog";
import { readStegoBytes } from "../apps/api/src/stego/artifacts";
test("archivos esteganográficos privados, terminal y puntuación", async (t) => {
  const registration = registrationFixture();
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  let cookie = "",
    userId = "";
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
        ...(body ? { "content-type": "application/json" } : {}),
        ...(session ? { cookie: session } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };
  const binary = (path: string) =>
    "/workstation/binary?path=" + encodeURIComponent(path);
  const files = (path: string) =>
    "/workstation/files?path=" + encodeURIComponent(path);
  try {
    await t.test(
      "requiere sesión y publica únicamente los casos habilitados",
      async () => {
        assert.equal(
          (await request(binary(STEGO_CASES[0].folder + "/postal.jpg"))).status,
          401,
        );
        const reg = await request("/auth/register", "POST", {
          alias: "qa_stego_" + randomBytes(4).toString("hex"),
          password: randomBytes(20).toString("hex"),
          code: process.env.REGISTRATION_CODE,
        });
        assert.equal(reg.status, 201);
        userId = (await reg.json()).user.id;
        cookie = reg.headers.get("set-cookie")!.split(";")[0];
        const listing = await (await request(files(STEGO_ROOT))).json();
        assert.equal(listing.entries.length, 10);
        const game = await (await request("/game")).json();
        assert.equal(
          game.challenges.filter((c: { id: string }) =>
            c.id.startsWith("stego-"),
          ).length,
          10,
        );
        assert.ok(!JSON.stringify(game.challenges).includes("CTF{"));
      },
    );
    await t.test(
      "bytes preservados con límites y metadatos separados",
      async () => {
        for (const c of STEGO_CASES) {
          for (const name of c.files) {
            const path = c.folder + "/" + name,
              meta = await (await request(files(path))).json();
            if (!name.endsWith(".txt")) assert.equal("content" in meta, false);
            const response = await request(binary(path));
            assert.equal(response.status, 200);
            assert.equal(
              response.headers.get("cache-control"),
              "private, no-store",
            );
            assert.equal(
              response.headers.get("x-content-type-options"),
              "nosniff",
            );
            assert.deepEqual(
              Buffer.from(await response.arrayBuffer()),
              readStegoBytes(
                STEGO_CASES.map((c) => c.id),
                path,
              ).bytes,
            );
          }
        }
        assert.equal(
          (await request(binary("/home/analista/../../.env"))).status,
          404,
        );
        assert.equal(
          (await request(binary(STEGO_ROOT + "/caso-01/noexiste"))).status,
          404,
        );
        assert.equal(
          (await request(binary(STEGO_ROOT) + "&extra=1")).status,
          400,
        );
      },
    );
    await t.test(
      "terminal normal navega carpetas y lee bytes reales",
      async () => {
        const work = async (command: string, cwd = "/home/analista") => {
          const r = await request("/workstation/commands", "POST", {
            command,
            cwd,
            challengeId: "stego-01",
          });
          assert.equal(r.status, 201);
          return r.json();
        };
        assert.equal(
          (await work("cd " + STEGO_CASES[0].folder)).cwd,
          STEGO_CASES[0].folder,
        );
        assert.ok(
          (
            await work("strings postal.jpg", STEGO_CASES[0].folder)
          ).output.includes(stegoFlag("stego-01")),
        );
        assert.match(
          (await work("file " + STEGO_CASES[9].folder + "/comprobante.jpg"))
            .output,
          /ZIP archive/,
        );
        assert.equal(
          (
            await request("/workstation/commands", "POST", {
              command: "ls",
              cwd: "/etc",
              challengeId: "stego-01",
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "deshabilitar revoca metadatos y binario aun con caché",
      async () => {
        const c = await db.challenge.findUniqueOrThrow({
          where: { id: "stego-03" },
        });
        try {
          await db.challenge.update({
            where: { id: c.id },
            data: { enabled: false },
          });
          assert.equal(
            (await request(files(STEGO_CASES[2].folder + "/pasillo.png")))
              .status,
            404,
          );
          assert.equal(
            (await request(binary(STEGO_CASES[2].folder + "/pasillo.png")))
              .status,
            404,
          );
        } finally {
          await db.challenge.update({
            where: { id: c.id },
            data: { enabled: c.enabled },
          });
        }
      },
    );
    await t.test("diez flags suman 19 puntos sin duplicar", async () => {
      for (const c of STEGO_CASES) {
        const wrong = await request(
          "/challenges/" + c.id + "/submissions",
          "POST",
          { flag: "inventada" },
        );
        assert.equal(wrong.status, 201);
        assert.equal((await wrong.json()).correct, false);
        const r = await request(
          "/challenges/" + c.id + "/submissions",
          "POST",
          { flag: stegoFlag(c.id) },
        );
        assert.equal(r.status, 201);
        assert.equal((await r.json()).correct, true);
        await request("/challenges/" + c.id + "/submissions", "POST", {
          flag: stegoFlag(c.id),
        });
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
    });
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
