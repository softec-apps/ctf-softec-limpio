import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { registrationFixture } from "./registration-fixtures";

test("el registro libre frena automatización sin invitaciones ni CAPTCHA", async (t) => {
  let app = await createApp();
  await app.listen(0, "127.0.0.1");
  let base = await app.getUrl();
  const prefix = `qa_guard_${randomBytes(4).toString("hex")}`,
    password = randomBytes(20).toString("hex");
  let sequence = 0;
  const account = () => ({
    alias: `${prefix}_${sequence++}`,
    password,
    code: process.env.REGISTRATION_CODE,
  });
  const send = (body: unknown, cookie = "", origin = process.env.APP_ORIGIN!) =>
    fetch(base + "/api/v1/auth/register", {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const fixture = registrationFixture();
  const prepare = (body = account(), cookie = "") =>
    fixture.prepare(base, "/auth/register", "POST", body, cookie);
  try {
    await t.test(
      "POST directo y código público sin prueba no crean cuentas",
      async () => {
        assert.equal((await send(account())).status, 400);
        assert.equal(
          (
            await send({
              ...account(),
              proof: { nonce: "0".repeat(48), solution: "0" },
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "la contraseña admite seis caracteres simples y rechaza cinco",
      async () => {
        const prepared = await prepare({ ...account(), password: "12345" });
        const rejected = await send(prepared.body, prepared.cookie);
        assert.equal(rejected.status, 400);
        assert.match(JSON.stringify(await rejected.json()), /6 caracteres/);
        const response = await send(
          { ...(prepared.body as object), password: "123456" },
          prepared.cookie,
        );
        assert.equal(response.status, 201);
        const body = prepared.body as { alias: string };
        const login = await fetch(base + "/api/v1/auth/login", {
          method: "POST",
          headers: {
            origin: process.env.APP_ORIGIN!,
            "content-type": "application/json",
          },
          body: JSON.stringify({ alias: body.alias, password: "123456" }),
        });
        assert.equal(login.status, 201);
      },
    );
    await t.test(
      "una prueba válida permite un alta y nueve solicitudes concurrentes no la reutilizan",
      async () => {
        const prepared = await prepare();
        const responses = await Promise.all(
          Array.from({ length: 9 }, (_, index) =>
            send(
              { ...(prepared.body as object), alias: `${prefix}_race${index}` },
              prepared.cookie,
            ),
          ),
        );
        assert.equal(
          responses.filter((response) => response.status === 201).length,
          1,
        );
        assert.ok(
          responses.every((response) => [201, 400].includes(response.status)),
        );
      },
    );
    await t.test(
      "el token queda ligado al navegador, caduca y rechaza el campo trampa",
      async () => {
        const prepared = await prepare();
        assert.equal((await send(prepared.body)).status, 400);
        const differentBrowser = await prepare();
        assert.equal(
          (await send(prepared.body, differentBrowser.cookie)).status,
          400,
        );
        assert.equal(
          (
            await send(
              { ...(prepared.body as object), website: "https://spam.invalid" },
              prepared.cookie,
            )
          ).status,
          400,
        );
        const body = prepared.body as { proof: { nonce: string } };
        await db.registrationProof.update({
          where: {
            tokenHash: createHash("sha256")
              .update(body.proof.nonce)
              .digest("hex"),
          },
          data: {
            createdAt: new Date(Date.now() - 120000),
            expiresAt: new Date(Date.now() - 60000),
          },
        });
        assert.equal((await send(prepared.body, prepared.cookie)).status, 400);
      },
    );
    await t.test(
      "reiniciar la aplicación conserva el consumo de una prueba",
      async () => {
        const prepared = await prepare();
        assert.equal((await send(prepared.body, prepared.cookie)).status, 201);
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.equal(
          (
            await send(
              { ...(prepared.body as object), alias: account().alias },
              prepared.cookie,
            )
          ).status,
          400,
        );
      },
    );
    await t.test(
      "cada navegador tiene un máximo diario aunque cambie el alias",
      async () => {
        let cookie = "";
        for (let index = 0; index < 4; index++) {
          const prepared = await prepare(account(), cookie);
          cookie = prepared.cookie;
          assert.equal(
            (await send(prepared.body, cookie)).status,
            index < 3 ? 201 : 429,
          );
        }
      },
    );
    await t.test(
      "los límites por conexión persisten y no se eluden borrando la cookie",
      async () => {
        const scope = registrationFixture();
        const previous = process.env.REGISTRATION_IP_PER_MINUTE;
        process.env.REGISTRATION_IP_PER_MINUTE = "2";
        try {
          for (let index = 0; index < 2; index++)
            assert.equal((await send(account())).status, 400);
          await app.close();
          app = await createApp();
          await app.listen(0, "127.0.0.1");
          base = await app.getUrl();
          assert.equal((await send(account())).status, 429);
        } finally {
          if (previous === undefined)
            delete process.env.REGISTRATION_IP_PER_MINUTE;
          else process.env.REGISTRATION_IP_PER_MINUTE = previous;
          await scope.cleanup();
        }
      },
    );
    await t.test(
      "un alias duplicado no consume la prueba ni el cupo de altas",
      async () => {
        const existing = await db.user.findFirstOrThrow({
          where: { alias: { startsWith: prefix } },
          select: { alias: true },
        });
        const prepared = await prepare({ ...account(), alias: existing.alias });
        assert.equal((await send(prepared.body, prepared.cookie)).status, 409);
        assert.equal(
          (
            await send(
              { ...(prepared.body as object), alias: account().alias },
              prepared.cookie,
            )
          ).status,
          201,
        );
      },
    );
    await t.test(
      "el límite diario por conexión se mantiene al cambiar de navegador",
      async () => {
        const scope = registrationFixture();
        const previous = process.env.REGISTRATION_IP_PER_DAY;
        process.env.REGISTRATION_IP_PER_DAY = "2";
        try {
          for (let index = 0; index < 3; index++) {
            const prepared = await scope.prepare(
              base,
              "/auth/register",
              "POST",
              account(),
            );
            assert.equal(
              (await send(prepared.body, prepared.cookie)).status,
              index < 2 ? 201 : 429,
            );
          }
        } finally {
          if (previous === undefined)
            delete process.env.REGISTRATION_IP_PER_DAY;
          else process.env.REGISTRATION_IP_PER_DAY = previous;
          await scope.cleanup();
        }
      },
    );
    await t.test(
      "el origen ajeno sigue bloqueado y los usuarios existentes siguen accediendo",
      async () => {
        const prepared = await prepare();
        assert.equal(
          (await send(prepared.body, prepared.cookie, "https://ajeno.invalid"))
            .status,
          403,
        );
        const response = await send(prepared.body, prepared.cookie);
        assert.equal(response.status, 201);
        const user = (await response.json()).user;
        assert.equal(user.role, "PARTICIPANT");
        const login = await fetch(base + "/api/v1/auth/login", {
          method: "POST",
          headers: {
            origin: process.env.APP_ORIGIN!,
            "content-type": "application/json",
          },
          body: JSON.stringify({ alias: user.alias, password }),
        });
        assert.equal(login.status, 201);
      },
    );
  } finally {
    await fixture.cleanup();
    const users = await db.user.findMany({
      where: { alias: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    await db.submission.deleteMany({ where: { userId: { in: ids } } });
    await db.solve.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await db.$disconnect();
  }
});
