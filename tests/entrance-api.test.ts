import { registrationFixture } from "./registration-fixtures";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import {
  entrancePin,
  entrancePinCookieName,
} from "../apps/api/src/entrance/pin";
import {
  entranceCookieName,
  entranceTicket,
} from "../apps/api/src/entrance/ticket";
test("pasillo, puerta, identidad y acreditación del primer reto", async (t) => {
  const registration = registrationFixture();
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl(),
    users: string[] = [];
  let pass = "",
    session = "",
    legacySession = "";
  let pin = "",
    pinCookie = "";
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    cookie = "",
    origin = process.env.APP_ORIGIN!,
  ) => {
    const prepared = await registration.prepare(
      base,
      path,
      method,
      body,
      cookie,
    );
    body = prepared.body;
    cookie = prepared.cookie;
    return fetch(base + "/api/v1" + path, {
      method,
      headers: {
        origin,
        ...(cookie || pinCookie
          ? { cookie: [cookie, pinCookie].filter(Boolean).join("; ") }
          : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };
  const readCookies = (response: Response) =>
    response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  const register = async (cookie = "", legacy = false) => {
    const alias = "qa_entry_" + randomBytes(4).toString("hex"),
      password = randomBytes(20).toString("hex");
    const response = await request(
      "/auth/register",
      "POST",
      {
        alias,
        password,
        ...(legacy ? { code: process.env.REGISTRATION_CODE } : {}),
      },
      cookie,
    );
    assert.equal(response.status, 201);
    const user = (await response.json()).user;
    users.push(user.id);
    return {
      user,
      cookie: readCookies(response).find((c) => c.startsWith("ctf_session="))!,
      alias,
      password,
    };
  };
  try {
    await t.test(
      "la página construida entrega una pista por carga y una cookie válida",
      async () => {
        const page = await request("/entrance/page");
        assert.equal(page.status, 200);
        assert.match(page.headers.get("content-type")!, /text\/html/);
        assert.equal(page.headers.get("cache-control"), "no-store");
        assert.match(
          page.headers.get("content-security-policy")!,
          /script-src 'self' 'wasm-unsafe-eval'/,
        );
        const html = await page.text();
        assert.ok(!html.includes("__ENTRANCE_PIN__"));
        const code = html.match(/Código de acceso: ([0-9]{4})/)?.[1];
        assert.ok(code);
        const cookie = readCookies(page).find((entry) =>
          entry.startsWith(entrancePinCookieName() + "="),
        );
        assert.ok(cookie);
        const opened = await request(
          "/entrance/unlock",
          "POST",
          { code },
          cookie,
        );
        assert.equal(opened.status, 201);
        assert.equal((await opened.json()).opened, true);
        const next = await request("/entrance/page", "GET", undefined, cookie);
        const nextCode = (await next.text()).match(
          /Código de acceso: ([0-9]{4})/,
        )?.[1];
        assert.ok(nextCode);
        assert.notEqual(nextCode, code);
      },
    );
    const challenge = await request("/entrance/challenge");
    pin = (await challenge.json()).code;
    pinCookie = readCookies(challenge)[0];
    assert.match(pin, /^[0-9]{4}$/);
    assert.match(challenge.headers.getSetCookie()[0], /HttpOnly/);
    assert.equal(challenge.headers.get("cache-control"), "no-store");
    await t.test(
      "una nueva carga cambia el PIN sin invalidar la pista que sigue visible",
      async () => {
        const previous = pin;
        const rotated = await request("/entrance/challenge");
        pin = (await rotated.json()).code;
        pinCookie = readCookies(rotated)[0];
        assert.notEqual(pin, previous);
        assert.equal(
          (await request("/entrance/unlock", "POST", { code: previous }))
            .status,
          201,
        );
        const expired = entrancePin(undefined, Date.now() - 13 * 3600000);
        const response = await fetch(base + "/api/v1/entrance/unlock", {
          method: "POST",
          headers: {
            origin: process.env.APP_ORIGIN!,
            cookie: entrancePinCookieName() + "=" + expired.token,
            "content-type": "application/json",
          },
          body: JSON.stringify({ code: expired.code }),
        });
        assert.equal(response.status, 400);
      },
    );
    await t.test(
      "comienza cerrada y valida longitud, código, origen y cuerpo estricto",
      async () => {
        assert.deepEqual(await (await request("/entrance")).json(), {
          opened: false,
        });
        for (const code of [
          "123",
          "12345",
          "abcd",
          String((Number(pin) + 1) % 10000).padStart(4, "0"),
        ]) {
          const r = await request("/entrance/unlock", "POST", { code });
          assert.equal(r.status, 400);
          assert.equal(r.headers.getSetCookie().length, 0);
        }
        assert.equal(
          (
            await request("/entrance/unlock", "POST", {
              code: pin,
              userId: "otro",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              "/entrance/unlock",
              "POST",
              { code: pin },
              "",
              "https://otro.invalid",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request("/auth/register", "POST", {
              alias: "qa_no_grant",
              password: "UnaClaveLarga123456",
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "abrir sin cuenta entrega un pase HttpOnly sin revelar el código",
      async () => {
        const r = await request("/entrance/unlock", "POST", {
          code: pin,
        });
        assert.equal(r.status, 201);
        const data = await r.json();
        assert.equal(data.opened, true);
        assert.equal(data.awardedPoints, 0);
        assert.match(data.message, /computador/);
        assert.ok(!JSON.stringify(data).includes(pin));
        assert.match(r.headers.getSetCookie()[0], /HttpOnly/);
        assert.match(r.headers.getSetCookie()[0], /SameSite=Strict/i);
        pass = readCookies(r)[0];
        assert.deepEqual(
          await (await request("/entrance", "GET", undefined, pass)).json(),
          { opened: true },
        );
        assert.deepEqual(
          await (
            await request(
              "/entrance",
              "GET",
              undefined,
              entranceCookieName() + "=true",
            )
          ).json(),
          { opened: false },
        );
        const expired = entranceTicket(Date.now() - 13 * 3600000);
        assert.deepEqual(
          await (
            await request(
              "/entrance",
              "GET",
              undefined,
              entranceCookieName() + "=" + expired.token,
            )
          ).json(),
          { opened: false },
        );
      },
    );
    await t.test(
      "el registro desde el computador conserva la apertura y suma una vez",
      async () => {
        const result = await register(pass);
        session = result.cookie;
        const game = await (
          await request("/game", "GET", undefined, session)
        ).json();
        assert.equal(game.score, 1);
        assert.equal(game.solves.length, 1);
        assert.equal(game.solves[0].challengeId, "primer-rastro");
        assert.equal(
          game.challenges.find((c: { id: string }) => c.id === "primer-rastro")
            .device,
          "entrance",
        );
        const r = await request(
          "/auth/login",
          "POST",
          { alias: result.alias, password: result.password },
          pass,
        );
        assert.equal(r.status, 201);
        const combined = session + "; " + pass;
        const opens = await Promise.all(
          [1, 2, 3].map(() =>
            request("/entrance/unlock", "POST", { code: pin }, combined),
          ),
        );
        for (const r of opens) assert.equal((await r.json()).awardedPoints, 0);
        assert.equal(
          await db.solve.count({ where: { userId: result.user.id } }),
          1,
        );
      },
    );
    await t.test(
      "participante anterior puede resolver la puerta con su sesión actual",
      async () => {
        const result = await register("", true);
        legacySession = result.cookie;
        assert.equal(
          await db.solve.count({ where: { userId: result.user.id } }),
          0,
        );
        const results = await Promise.all(
          [1, 2, 3].map(() =>
            request("/entrance/unlock", "POST", { code: pin }, legacySession),
          ),
        );
        const awarded = await Promise.all(results.map((r) => r.json()));
        assert.equal(
          awarded.reduce((sum, r) => sum + r.awardedPoints, 0),
          1,
        );
        assert.equal(
          await db.solve.count({ where: { userId: result.user.id } }),
          1,
        );
      },
    );
    await t.test(
      "deshabilitar el reto no bloquea la oficina y no acredita puntos",
      async () => {
        const c = await db.challenge.findUniqueOrThrow({
          where: { id: "primer-rastro" },
        });
        const result = await register("", true);
        try {
          await db.challenge.update({
            where: { id: c.id },
            data: { enabled: false },
          });
          const r = await request(
            "/entrance/unlock",
            "POST",
            { code: pin },
            result.cookie,
          );
          assert.equal(r.status, 201);
          assert.equal((await r.json()).awardedPoints, 0);
          assert.equal(
            await db.solve.count({ where: { userId: result.user.id } }),
            0,
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
      "un pase falso no acredita al iniciar sesión y ADMIN no compite",
      async () => {
        const result = await register("", true);
        const login = await request(
          "/auth/login",
          "POST",
          { alias: result.alias, password: result.password },
          entranceCookieName() + "=inventado",
        );
        assert.equal(login.status, 201);
        assert.equal(
          await db.solve.count({ where: { userId: result.user.id } }),
          0,
        );
        await db.user.update({
          where: { id: result.user.id },
          data: { role: "ADMIN" },
        });
        const r = await request(
          "/entrance/unlock",
          "POST",
          { code: pin },
          result.cookie,
        );
        assert.equal((await r.json()).awardedPoints, 0);
        assert.equal(
          await db.solve.count({ where: { userId: result.user.id } }),
          0,
        );
      },
    );
    await t.test(
      "salir al pasillo no requiere sesión y conserva una identidad activa",
      async () => {
        const r = await request("/entrance/leave", "POST", {}, pass);
        assert.equal(r.status, 201);
        const cleared = r.headers
          .getSetCookie()
          .find((cookie) => cookie.startsWith(entranceCookieName() + "="));
        assert.ok(cleared);
        assert.match(cleared, /Expires=Thu, 01 Jan 1970/i);
        assert.equal(
          (await request("/me", "GET", undefined, session)).status,
          200,
        );
      },
    );
    await t.test(
      "cerrar sesión conserva la oficina hasta una salida voluntaria",
      async () => {
        const r = await request(
          "/auth/logout",
          "POST",
          {},
          session + "; " + pass,
        );
        assert.equal(r.status, 201);
        assert.ok(
          !r.headers
            .getSetCookie()
            .some((cookie) => cookie.startsWith(entranceCookieName() + "=")),
        );
        assert.deepEqual(
          await (await request("/entrance", "GET", undefined, pass)).json(),
          { opened: true },
        );
        assert.equal(
          (await request("/me", "GET", undefined, session)).status,
          401,
        );
      },
    );
  } finally {
    await app.close();
    await db.submission.deleteMany({ where: { userId: { in: users } } });
    await db.solve.deleteMany({ where: { userId: { in: users } } });
    await db.auditLog.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await registration.cleanup();
    await db.$disconnect();
  }
});
