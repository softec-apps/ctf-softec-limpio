import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import { cryptoFlag } from "../apps/api/src/crypto/catalog";
import { LINUX_SERVERS } from "../apps/api/src/linux-network/catalog";
import {
  competitionStatus,
  lockCompetition,
} from "../apps/api/src/competition/service";

test("el panel cierra y reabre todas las entregas conservando resultados", async (t) => {
  let app = await createApp();
  await app.listen(0, "127.0.0.1");
  let base = await app.getUrl();
  const original = await competitionStatus();
  let revision = original.revision;
  const ids: string[] = [];
  const password = randomBytes(20).toString("base64url");
  async function account(role: "ADMIN" | "PARTICIPANT") {
    const alias = "qa_close_" + randomBytes(5).toString("hex");
    const user = await db.user.create({
      data: { alias, role, passwordHash: passwordHash(password) },
    });
    ids.push(user.id);
    const token = randomBytes(32).toString("base64url");
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: digest(token),
        scope: role === "ADMIN" ? "admin" : "game",
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return {
      ...user,
      cookie:
        (role === "ADMIN" ? "ctf_admin_session=" : "ctf_session=") + token,
    };
  }
  const admin = await account("ADMIN");
  const participant = await account("PARTICIPANT");
  const newcomer = await account("PARTICIPANT");
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    cookie = participant.cookie,
    origin = process.env.APP_ORIGIN!,
  ) {
    const response = await fetch(base + "/api/v1" + path, {
      method,
      headers: { origin, cookie, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, data: await response.json() };
  }
  async function change(open: boolean) {
    const result = await request(
      "/admin/competition",
      "PATCH",
      { open, revision },
      admin.cookie,
    );
    assert.equal(result.response.status, 200);
    revision = result.data.competition.revision;
    return result.data.competition;
  }
  const linux = (command: string) =>
    request("/linux-network/commands", "POST", { command });
  let linuxFlag = "",
    adFlag = "",
    rackRevision = 0;
  let acceptedScore = 0;
  try {
    await t.test(
      "el acceso administrativo exige credenciales ADMIN y conserva la sesión si se rechaza",
      async () => {
        const denied = await request("/admin/auth/login", "POST", {
          alias: participant.alias,
          password,
          adminOnly: true,
        });
        assert.equal(denied.response.status, 403);
        assert.equal(denied.response.headers.get("set-cookie"), null);
        assert.equal((await request("/me")).data.user.id, participant.id);
        assert.equal((await request("/admin/overview")).response.status, 403);
        const invalid = await request("/admin/auth/login", "POST", {
          alias: admin.alias,
          password: "incorrecta",
          adminOnly: true,
        });
        assert.equal(invalid.response.status, 401);
        assert.equal(invalid.response.headers.get("set-cookie"), null);
        const accepted = await request("/admin/auth/login", "POST", {
          alias: admin.alias,
          password,
          adminOnly: true,
        });
        assert.equal(accepted.response.status, 201);
        assert.equal(accepted.data.user.role, "ADMIN");
        const session = accepted.response.headers
          .get("set-cookie")!
          .split(";")[0];
        assert.equal(
          (await request("/admin/overview", "GET", undefined, session)).response
            .status,
          200,
        );
        const combined = participant.cookie + "; " + session;
        assert.equal(
          (await request("/me", "GET", undefined, combined)).data.user.id,
          participant.id,
        );
        assert.equal(
          (await request("/me", "GET", undefined, session)).response.status,
          401,
        );
        assert.equal(
          (
            await request(
              "/admin/auth/me",
              "GET",
              undefined,
              session.replace("ctf_admin_session=", "ctf_session="),
            )
          ).response.status,
          403,
        );
        assert.equal(
          (
            await request(
              "/admin/auth/me",
              "GET",
              undefined,
              participant.cookie.replace("ctf_session=", "ctf_admin_session="),
            )
          ).response.status,
          401,
        );
        await request("/auth/logout", "POST", {}, session);
        assert.equal(
          (await request("/admin/auth/me", "GET", undefined, session)).response
            .status,
          200,
        );
        await request("/admin/auth/logout", "POST", {}, combined);
        assert.equal((await request("/me")).data.user.id, participant.id);
        assert.equal(
          (await request("/admin/auth/me", "GET", undefined, session)).response
            .status,
          401,
        );
      },
    );
    await t.test(
      "solo ADMIN puede cambiar el estado, con cuerpo y origen estrictos",
      async () => {
        assert.equal(
          (await request("/competition", "GET", undefined, "")).response.status,
          401,
        );
        assert.equal(
          (
            await request(
              "/admin/competition",
              "PATCH",
              { open: false, revision },
              "",
            )
          ).response.status,
          401,
        );
        assert.equal(
          (
            await request("/admin/competition", "PATCH", {
              open: false,
              revision,
            })
          ).response.status,
          403,
        );
        assert.equal(
          (
            await request(
              "/admin/competition",
              "PATCH",
              { open: false, revision, userId: admin.id },
              admin.cookie,
            )
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request(
              "/admin/competition",
              "PATCH",
              { open: false },
              admin.cookie,
            )
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request(
              "/admin/competition",
              "PATCH",
              { open: false, revision },
              admin.cookie,
              "https://otro.test",
            )
          ).response.status,
          403,
        );
        await change(true);
      },
    );
    await t.test(
      "la competencia abierta admite entregas y prepara evidencias de distintas categorías",
      async () => {
        const result = await request(
          "/challenges/crypto-cesar/submissions",
          "POST",
          { flag: cryptoFlag("crypto-cesar") },
        );
        assert.equal(result.data.correct, true);
        acceptedScore = result.data.awardedPoints;
        assert.ok(acceptedScore > 0);
        await linux("vpn connect");
        await linux("ssh root@bastion");
        await linux("toor");
        linuxFlag =
          (await linux("cat relevo.txt")).data.output.match(
            /CTF\{[a-f0-9]{32}\}/,
          )?.[0] ?? "";
        assert.ok(linuxFlag);
        const domain = await request("/domain/commands", "POST", {
          command: "domain smb Publico relevo.txt",
        });
        adFlag = domain.data.output.match(/CTF\{[a-f0-9]{32}\}/)?.[0] ?? "";
        assert.ok(adFlag);
        rackRevision = (await request("/network/labs/network-01")).data
          .revision;
      },
    );
    await t.test(
      "cerrar conserva puntuación, deja fecha y auditoría y rechaza un panel desactualizado",
      async () => {
        const before = revision;
        const state = await change(false);
        assert.equal(state.open, false);
        assert.ok(Date.parse(state.closedAt) > 0);
        assert.equal((await request("/game")).data.score, acceptedScore);
        const duplicate = await change(false);
        assert.equal(duplicate.revision, revision);
        assert.equal(duplicate.closedAt, state.closedAt);
        assert.equal(
          (
            await request(
              "/admin/competition",
              "PATCH",
              { open: true, revision: before },
              admin.cookie,
            )
          ).response.status,
          409,
        );
        const overview = (
          await request("/admin/overview", "GET", undefined, admin.cookie)
        ).data;
        assert.equal(overview.competition.open, false);
        assert.equal(
          overview.users.find((u: { id: string }) => u.id === participant.id)
            .score,
          acceptedScore,
        );
        assert.ok(
          overview.audits.some(
            (a: { action: string }) => a.action === "competition.closed",
          ),
        );
      },
    );
    await t.test(
      "flags, SSH, rack y dominio no pueden sumar ni registrar intentos después del cierre",
      async () => {
        const before = await db.submission.count({
          where: { userId: participant.id },
        });
        const results = await Promise.all([
          request("/challenges/crypto-atbash/submissions", "POST", {
            flag: cryptoFlag("crypto-atbash"),
          }),
          request("/challenges/crypto-atbash/submissions", "POST", {
            flag: "incorrecta",
          }),
          request("/challenges/ad-01/submissions", "POST", { flag: adFlag }),
          request("/intranet/maintenance", "POST", {
            op: "submit",
            flag: "pendiente",
          }),
          linux("submit " + linuxFlag),
          request("/workstation/commands", "POST", {
            command: "submit " + linuxFlag,
            cwd: "/home/analista",
            challengeId: "linux-01",
          }),
          request("/network/labs/network-01/validate", "POST", {
            revision: rackRevision,
          }),
        ]);
        for (const result of results) {
          assert.equal(result.response.status, 403);
          assert.match(result.data.message, /competencia está cerrada/);
        }
        assert.equal(
          await db.submission.count({ where: { userId: participant.id } }),
          before,
        );
        assert.equal((await request("/game")).data.score, acceptedScore);
        assert.equal((await request("/ranking")).data.competition.open, false);
        assert.equal(
          (await request("/network/labs/network-01")).data.revision,
          rackRevision,
        );
      },
    );
    await t.test(
      "se puede explorar, iniciar SSH y abrir la puerta sin acreditar puntos de forma indirecta",
      async () => {
        assert.equal((await linux("cat relevo.txt")).response.status, 201);
        await linux("exit");
        await linux(`ssh ${LINUX_SERVERS[1].user}@${LINUX_SERVERS[1].name}`);
        const login = await linux(linuxFlag);
        assert.equal(login.response.status, 403);
        assert.match(login.data.message, /competencia está cerrada/);
        await linux("\u0003");
        await linux("ssh root@bastion");
        assert.equal((await linux("toor")).data.view.host, "bastion");
        assert.equal((await request("/game")).data.score, acceptedScore);
        assert.equal(
          (
            await request("/domain/commands", "POST", {
              command: "domain scan",
            })
          ).response.status,
          201,
        );
        const challenge = await request(
          "/entrance/challenge",
          "GET",
          undefined,
          newcomer.cookie,
        );
        const pinCookie = challenge.response.headers
          .get("set-cookie")!
          .split(";")[0];
        const unlocked = await request(
          "/entrance/unlock",
          "POST",
          { code: challenge.data.code },
          newcomer.cookie + "; " + pinCookie,
        );
        assert.equal(unlocked.response.status, 201);
        assert.equal(unlocked.data.opened, true);
        assert.equal(unlocked.data.awardedPoints, 0);
        const door = unlocked.response.headers.get("set-cookie")!.split(";")[0];
        const signedIn = await request(
          "/auth/login",
          "POST",
          { alias: newcomer.alias, password },
          door,
        );
        assert.equal(signedIn.response.status, 201);
        assert.equal(
          (await request("/game", "GET", undefined, newcomer.cookie)).data
            .score,
          0,
        );
        assert.equal(
          (await request("/auth/logout", "POST", {}, newcomer.cookie)).response
            .status,
          201,
        );
        assert.equal(
          (await request("/entrance", "GET", undefined, door)).data.opened,
          true,
        );
      },
    );
    await t.test(
      "el cierre persiste al reiniciar la aplicación y una reapertura conserva las resoluciones",
      async () => {
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.equal(
          (await request("/competition")).data.competition.open,
          false,
        );
        assert.equal((await request("/game")).data.score, acceptedScore);
        await change(true);
        const duplicate = await request(
          "/challenges/crypto-cesar/submissions",
          "POST",
          { flag: cryptoFlag("crypto-cesar") },
        );
        assert.equal(duplicate.data.awardedPoints, 0);
        const next = await request(
          "/challenges/crypto-atbash/submissions",
          "POST",
          { flag: cryptoFlag("crypto-atbash") },
        );
        acceptedScore += next.data.awardedPoints;
        assert.equal((await request("/game")).data.score, acceptedScore);
      },
    );
    await t.test(
      "el cierre espera a entregas aceptadas y rechaza las posteriores, incluso concurrentes",
      async () => {
        let release!: () => void, acquired!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const ready = new Promise<void>((resolve) => {
          acquired = resolve;
        });
        const challenge = await db.challenge.findUniqueOrThrow({
          where: { id: "crypto-polibio" },
        });
        const inFlight = db.$transaction(async (tx) => {
          assert.equal((await lockCompetition(tx)).open, true);
          acquired();
          await gate;
          await tx.solve.create({
            data: {
              userId: participant.id,
              challengeId: challenge.id,
              points: challenge.points,
            },
          });
        });
        await ready;
        let finished = false;
        const closing = change(false).then((state) => {
          finished = true;
          return state;
        });
        try {
          await new Promise((resolve) => setTimeout(resolve, 60));
          assert.equal(finished, false);
        } finally {
          release();
        }
        await inFlight;
        await closing;
        acceptedScore += challenge.points;
        const results = await Promise.all(
          Array.from({ length: 12 }, () =>
            request("/challenges/crypto-hex/submissions", "POST", {
              flag: cryptoFlag("crypto-hex"),
            }),
          ),
        );
        assert.ok(results.every((r) => r.response.status === 403));
        assert.equal((await request("/game")).data.score, acceptedScore);
        const conflictRevision = revision;
        const changes = await Promise.all(
          Array.from({ length: 2 }, () =>
            request(
              "/admin/competition",
              "PATCH",
              { open: true, revision: conflictRevision },
              admin.cookie,
            ),
          ),
        );
        assert.deepEqual(
          changes.map((r) => r.response.status).sort(),
          [200, 409],
        );
        revision = (await competitionStatus()).revision;
      },
    );
  } finally {
    // Restore only the state last observed by this QA run; never overwrite another admin.
    await db.competition.updateMany({
      where: { id: 1, revision },
      data: {
        open: original.open,
        closedAt: original.closedAt ? new Date(original.closedAt) : null,
        revision: { increment: 1 },
      },
    });
    await db.submission.deleteMany({ where: { userId: { in: ids } } });
    await db.solve.deleteMany({ where: { userId: { in: ids } } });
    await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await db.$disconnect();
  }
});
