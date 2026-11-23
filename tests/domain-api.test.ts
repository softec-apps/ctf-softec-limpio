import { registrationFixture } from "./registration-fixtures";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { DOMAIN_ROOT } from "../apps/api/src/domain/catalog";
import { solveDomain } from "./domain-fixtures";
test("PC Linux contra portátil Windows: aislamiento, VPN y diez entregas de dominio", async (t) => {
  const registration = registrationFixture();
  let app = await createApp();
  await app.listen(0, "127.0.0.1");
  let base = await app.getUrl();
  const users: string[] = [];
  let cookie = "",
    other = "",
    credentials: Record<string, string> = {};
  const flags = new Map<string, string>();
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
    const response = await fetch(base + "/api/v1" + path, {
      method,
      headers: {
        origin: process.env.APP_ORIGIN!,
        ...(session ? { cookie: session } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { response, data: await response.json() };
  };
  const register = async () => {
    const r = await request(
      "/auth/register",
      "POST",
      {
        alias: "qa_ad_" + randomBytes(4).toString("hex"),
        password: randomBytes(20).toString("hex"),
        code: process.env.REGISTRATION_CODE,
      },
      "",
    );
    assert.equal(r.response.status, 201);
    users.push(r.data.user.id);
    return r.response.headers.get("set-cookie")!.split(";")[0];
  };
  const run = async (command: string, session = cookie) => {
    const r = await request("/domain/commands", "POST", { command }, session);
    assert.equal(r.response.status, 201);
    return r.data.output as string;
  };
  try {
    await t.test(
      "autenticación, esquema estricto y publicación sin secretos",
      async () => {
        assert.equal((await request("/domain")).response.status, 401);
        cookie = await register();
        other = await register();
        assert.equal(
          (
            await request("/domain/commands", "POST", {
              command: "domain scan",
              userId: "otro",
            })
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request("/domain/commands", "POST", {
              command: "x".repeat(2049),
            })
          ).response.status,
          400,
        );
        const game = (await request("/game")).data;
        assert.equal(
          game.challenges.filter((c: { id: string }) => c.id.startsWith("ad-"))
            .length,
          10,
        );
        assert.ok(!JSON.stringify(game.challenges).includes("CTF{"));
        assert.equal((await request("/domain")).data.target.os, "Windows 11");
        assert.equal((await request("/domain")).data.connected, false);
      },
    );
    await t.test(
      "VPN obligatoria y herramientas de dominio en la Terminal normal",
      async () => {
        assert.match(await run("domain scan"), /VPN/);
        assert.match(await run("domain smb Publico relevo.txt"), /VPN/);
        assert.equal(
          (await request("/linux-network/vpn", "POST", { connected: true }))
            .response.status,
          201,
        );
        const r = await request("/workstation/commands", "POST", {
          command: "domain scan",
          challengeId: "ad-01",
          cwd: "/home/analista",
        });
        assert.equal(r.response.status, 201);
        assert.match(r.data.output, /WS01/);
        assert.equal(r.data.cwd, "/home/analista");
        assert.equal((await request("/domain")).data.connected, true);
        const dir = await request(
          "/workstation/files?path=" + encodeURIComponent(DOMAIN_ROOT),
        );
        assert.equal(dir.data.type, "directory");
        assert.ok(
          dir.data.entries.some(
            (e: { name: string }) => e.name === "diccionario.txt",
          ),
        );
      },
    );
    await t.test(
      "operar los diez casos y entregar evidencia por la ruta normal",
      async () => {
        credentials = await solveDomain(run, async (id, flag) => {
          flags.set(id, flag);
          const r = await request(
            "/challenges/" + id + "/submissions",
            "POST",
            { flag },
          );
          assert.equal(r.response.status, 201);
          assert.equal(r.data.correct, true);
          assert.ok(r.data.awardedPoints > 0);
        });
        const game = (await request("/game")).data;
        assert.equal(game.solves.length, 10);
        assert.equal(game.score, 19);
        const view = (await request("/domain")).data;
        assert.equal(
          view.events.some((e: { actor: string }) => e.actor === "SYSTEM"),
          true,
        );
        assert.equal(view.groups.Despliegue.includes("practicas"), true);
        assert.equal(view.target.name, "WS01");
        const responses = await Promise.all(
          [1, 2, 3].map(() =>
            request("/challenges/ad-10/submissions", "POST", {
              flag: flags.get("ad-10"),
            }),
          ),
        );
        assert.ok(responses.every((r) => r.data.awardedPoints === 0));
      },
    );
    await t.test(
      "otra cuenta no hereda capturas, efectos ni flags",
      async () => {
        assert.equal(
          (await request("/domain", "GET", undefined, other)).data.events
            .length,
          0,
        );
        assert.equal(
          (await request("/domain", "GET", undefined, other)).data.proofs
            .length,
          0,
        );
        const r = await request(
          "/challenges/ad-01/submissions",
          "POST",
          { flag: flags.get("ad-01") },
          other,
        );
        assert.equal(r.data.correct, false);
        assert.equal(
          (
            await request(
              "/workstation/files?path=" +
                encodeURIComponent(DOMAIN_ROOT + "/Groups.xml"),
              "GET",
              undefined,
              other,
            )
          ).response.status,
          404,
        );
        assert.equal(
          (await request("/game", "GET", undefined, other)).data.score,
          0,
        );
        assert.ok(
          !JSON.stringify((await request("/domain")).data.events).includes(
            credentials.practicas,
          ),
        );
      },
    );
    await t.test(
      "deshabilitar una plantilla revoca credenciales ya emitidas",
      async () => {
        const c = await db.challenge.findUniqueOrThrow({
          where: { id: "ad-09" },
        });
        try {
          await db.challenge.update({
            where: { id: c.id },
            data: { enabled: false },
          });
          assert.match(
            await run(
              "domain smb Direccion control.txt --ticket cert-responsable.json",
            ),
            /no permite/,
          );
          assert.equal(
            (
              await request("/challenges/ad-09/submissions", "POST", {
                flag: flags.get("ad-09"),
              })
            ).response.status,
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
    await t.test(
      "desconectar impide operaciones remotas y permite analizar evidencias offline",
      async () => {
        await request("/linux-network/vpn", "POST", { connected: false });
        assert.match(await run("domain ldap users"), /VPN/);
        assert.match(
          await run(
            "domain winrm C:/ProgramData/Mantenimiento/control.txt -u mantenimiento -p " +
              credentials.mantenimiento,
          ),
          /VPN/,
        );
        assert.ok(
          (
            await run("domain crack asrep-archivo.json diccionario.txt")
          ).includes(credentials.archivo),
        );
        assert.equal((await request("/game")).data.score, 19);
        await request("/linux-network/vpn", "POST", { connected: true });
      },
    );
    await t.test(
      "restauración conserva puntos, revoca archivos y nuevas pruebas no se fabrican",
      async () => {
        await run("domain reset --confirm");
        const view = (await request("/domain")).data;
        assert.equal(view.events.length, 0);
        assert.equal(view.proofs.length, 0);
        assert.deepEqual(view.groups.Despliegue, []);
        assert.equal((await request("/game")).data.score, 19);
        assert.equal(
          (
            await request("/challenges/ad-10/submissions", "POST", {
              flag: flags.get("ad-10"),
            })
          ).data.correct,
          false,
        );
        assert.match(await run("domain local ../../.env"), /disponible/);
        assert.match(
          await run(
            "domain smb C$ Lab/Pruebas/custodia.txt --ticket ticket-ws01.json",
          ),
          /emitida/,
        );
        assert.equal(await db.solve.count({ where: { userId: users[0] } }), 10);
      },
    );
    await t.test(
      "ADMIN no compite y el estado persiste al reconstruir la aplicación",
      async () => {
        await db.user.update({
          where: { id: users[1] },
          data: { role: "ADMIN" },
        });
        assert.equal(
          (
            await request(
              "/challenges/ad-01/submissions",
              "POST",
              { flag: flags.get("ad-01") },
              other,
            )
          ).response.status,
          403,
        );
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.equal((await request("/domain")).data.score, 19);
        assert.equal((await request("/domain")).data.connected, true);
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
