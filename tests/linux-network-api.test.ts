import { registrationFixture } from "./registration-fixtures";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { LINUX_SERVERS } from "../apps/api/src/linux-network/catalog";

test("VPN, SSH, persistencia, aislamiento y puntuación de la red Linux por API", async (t) => {
  const registration = registrationFixture();
  let app = await createApp();
  await app.listen(0, "127.0.0.1");
  let base = await app.getUrl();
  const userIds: string[] = [];
  let cookie = "";
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    session = cookie,
  ) {
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
        ...(body ? { "content-type": "application/json" } : {}),
        ...(session ? { cookie: session } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { response, data };
  }
  async function register() {
    const result = await request(
      "/auth/register",
      "POST",
      {
        alias: "qa_lnx_" + randomBytes(5).toString("hex"),
        password: randomBytes(18).toString("base64url"),
        code: process.env.REGISTRATION_CODE,
      },
      "",
    );
    assert.equal(result.response.status, 201);
    userIds.push(result.data.user.id);
    return result.response.headers.get("set-cookie")!.split(";")[0];
  }
  async function command(command: string, session = cookie) {
    const result = await request(
      "/linux-network/commands",
      "POST",
      { command },
      session,
    );
    assert.equal(result.response.status, 201, result.data.message);
    return result.data;
  }
  const material = [
    "cat relevo.txt",
    "cat .continuidad",
    'cat "documentos/acta final.txt"',
    "cat deposito/caja-23/entrega",
    "grep ENTREGA_TURNO eventos.log",
    "sort entregas.txt | uniq -u",
    "strings dispositivo.bin",
    "base64 -d correo/credencial.b64",
    "gzip -dc respaldo/continuidad.gz",
    "sudo -u custodio cat /srv/custodia/clave",
  ];
  let initial = "",
    previous = "",
    points = 0;
  try {
    await t.test("autenticación y validación estricta", async () => {
      assert.equal(
        (await request("/linux-network", "GET", undefined, "")).response.status,
        401,
      );
      cookie = await register();
      assert.equal(
        (
          await request("/linux-network/commands", "POST", {
            command: "vpn connect",
            userId: "otro",
          })
        ).response.status,
        400,
      );
      assert.equal(
        (
          await request("/linux-network/commands", "POST", {
            command: "x".repeat(1025),
          })
        ).response.status,
        400,
      );
      assert.equal(
        (
          await request("/challenges/linux-01/submissions", "POST", {
            flag: "inventada",
          })
        ).response.status,
        400,
      );
    });
    await t.test("VPN obligatoria y bloqueo de niveles futuros", async () => {
      assert.match((await command("ssh root@bastion")).output, /unreachable/);
      const connected = await command("vpn connect");
      initial = "toor";
      assert.equal("password" in connected.view.entry, false);
      assert.ok(!JSON.stringify(connected.view.entry).includes("CTF{"));
      assert.match(connected.view.entry.hint, /árbol/);
      assert.equal(
        connected.view.servers.filter((s: { ip: string | null }) => s.ip)
          .length,
        2,
      );
      assert.match((await command("ssh nivel09@custodia")).output, /No route/);
      assert.ok(
        (await command("nmap -sV 10.77.0.0/24")).output.includes("almacen"),
      );
    });
    await t.test(
      "VPN independiente y SSH desde la terminal normal conservando el directorio local",
      async () => {
        const work = async (command: string, cwd = "/home/analista") => {
          const result = await request("/workstation/commands", "POST", {
            command,
            cwd,
            challengeId: "primer-rastro",
          });
          assert.equal(result.response.status, 201, result.data.message);
          return result.data;
        };
        assert.equal(
          (await request("/linux-network/vpn", "POST", { connected: false }))
            .response.status,
          201,
        );
        assert.match((await work("ssh root@bastion")).output, /unreachable/);
        const local = await work("cd evidencia");
        assert.equal(local.cwd, "/home/analista/evidencia");
        const blocked = await work("vpn connect");
        assert.match(blocked.output, /Seventech VPN/);
        assert.equal(blocked.network.connected, false);
        const connected = await request("/linux-network/vpn", "POST", {
          connected: true,
        });
        assert.equal(connected.data.view.connected, true);
        await work("ssh root@bastion", "/home/analista/evidencia");
        const login = await work(initial, "/home/analista/evidencia");
        assert.equal(login.network.host, "bastion");
        assert.equal(
          (await work("pwd", "/home/analista/evidencia")).output.trim(),
          "/root",
        );
        assert.equal((await request("/admin/overview")).response.status, 403);
        assert.equal((await work("submit toor")).awardedPoints, 0);
        assert.match(
          (await work("cat relevo.txt", "/home/analista/evidencia")).output,
          /CTF\{/,
        );
        const exit = await work("exit", "/home/analista/evidencia");
        assert.equal(exit.network.host, null);
        assert.equal(exit.cwd, "/home/analista/evidencia");
        await work("ssh root@bastion");
        await work(initial);
        await request("/linux-network/vpn", "POST", { connected: false });
        const after = await work("pwd", "/home/analista/evidencia");
        assert.equal(after.network.host, null);
        assert.equal(after.output.trim(), "/home/analista/evidencia");
        assert.equal(
          (
            await request("/workstation/commands", "POST", {
              command: "pwd",
              challengeId: "primer-rastro",
              userId: "otro",
            })
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request("/linux-network/vpn", "POST", {
              connected: true,
              host: "otro",
            })
          ).response.status,
          400,
        );
        const restored = await request("/linux-network/vpn", "POST", {
          connected: true,
        });
        assert.equal(restored.data.view.connected, true);
      },
    );
    await t.test(
      "diez niveles, claves obtenidas de archivos y puntuación única bajo concurrencia",
      async () => {
        for (const server of LINUX_SERVERS) {
          await command(`ssh ${server.user}@${server.name}`);
          const login = await command(server.index ? previous : initial);
          assert.equal(login.view.host, server.name);
          const output = (await command(material[server.index])).output;
          const key = output.match(/CTF\{[a-f0-9]{32}\}/)?.[0];
          assert.ok(key, "La evidencia permite recuperar una clave");
          if (server.index === 0) {
            const results = await Promise.all([
              command(`submit ${key}`),
              command(`submit ${key}`),
            ]);
            assert.equal(results.filter((r) => r.awardedPoints > 0).length, 1);
            points += results.reduce((sum, r) => sum + r.awardedPoints, 0);
          } else {
            const completed = await command(`submit ${key}`);
            points += completed.awardedPoints;
            assert.equal(completed.view.servers[server.index].status, "solved");
          }
          previous = key;
        }
        assert.equal(points, 19);
        assert.equal(
          (await request("/game")).data.solves.filter(
            (s: { challengeId: string }) => s.challengeId.startsWith("linux-"),
          ).length,
          10,
        );
      },
    );
    await t.test(
      "archivos y sesión sobreviven a reiniciar la API",
      async () => {
        await command('echo "persistente" > nota.txt');
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        const state = (await request("/linux-network")).data;
        assert.equal(state.host, "custodia");
        assert.equal(state.score, points);
        assert.equal((await command("cat nota.txt")).output, "persistente\n");
        await command("vpn disconnect");
        assert.equal((await request("/linux-network")).data.host, null);
        assert.match((await command("cat nota.txt")).output, /sesión SSH/);
      },
    );
    await t.test(
      "root/toor inicia cualquier cuenta pero sus flags y archivos siguen aislados",
      async () => {
        const other = await register();
        const a = await command("vpn connect"),
          b = await command("vpn connect", other);
        assert.equal("password" in a.view.entry, false);
        assert.equal(b.view.score, 0);
        await command("ssh root@bastion");
        await command("toor");
        const aKey = (await command("cat relevo.txt")).output.trim();
        await command('echo "privado" > nota_privada.txt');
        await command("ssh root@bastion", other);
        await command("toor", other);
        const bKey = (await command("cat relevo.txt", other)).output.trim();
        assert.notEqual(aKey, bKey);
        assert.match(
          (await command("cat nota_privada.txt", other)).output,
          /No such file/,
        );
        await command("ssh nivel01@almacen", other);
        assert.match((await command(aKey, other)).output, /Permission denied/);
        assert.equal(
          (await request("/linux-network", "GET", undefined, other)).data.score,
          0,
        );
        assert.match(
          (await command("submit " + aKey, other)).output,
          /no coincide/,
        );
        await command("ssh nivel01@almacen", other);
        const valid = await command(bKey, other);
        assert.equal(valid.awardedPoints, 1);
        assert.equal(valid.view.host, "almacen");
        assert.equal((await request("/linux-network")).data.score, 19);
      },
    );
    await t.test(
      "cada flag autentica el siguiente servidor y puntúa sin submit previo",
      async () => {
        const participant = await register();
        const work = async (command: string) => {
          const result = await request(
            "/workstation/commands",
            "POST",
            { command, challengeId: "primer-rastro", cwd: "/home/analista" },
            participant,
          );
          assert.equal(result.response.status, 201, result.data.message);
          return result.data;
        };
        await request(
          "/linux-network/vpn",
          "POST",
          { connected: true },
          participant,
        );
        await work("ssh root@bastion");
        assert.equal((await work("toor")).network.host, "bastion");
        let earned = 0;
        for (const server of LINUX_SERVERS) {
          const key = (await work(material[server.index])).output.match(
            /CTF\{[a-f0-9]{32}\}/,
          )?.[0];
          assert.ok(key);
          const next = LINUX_SERVERS[server.index + 1];
          if (next) {
            assert.ok((await work("cat SIGUIENTE")).output.includes(next.name));
            await work(`ssh ${next.user}@${next.name}`);
            const results =
              server.index === 0
                ? await Promise.all([work(key), work(key)])
                : [await work(key)];
            if (server.index === 0)
              assert.equal(
                results.filter((r) => r.awardedPoints > 0).length,
                1,
              );
            earned += results.reduce((sum, r) => sum + r.awardedPoints, 0);
            assert.equal(results[0].network.host, next.name);
          } else {
            const final = await work(`submit ${key}`);
            earned += final.awardedPoints;
            assert.equal(final.network.score, 19);
          }
        }
        assert.equal(earned, 19);
      },
    );
    await t.test(
      "deshabilitar un requisito revoca acceso a servidores posteriores",
      async () => {
        const challenge = await db.challenge.findUniqueOrThrow({
          where: { id: "linux-02" },
        });
        try {
          await db.challenge.update({
            where: { id: challenge.id },
            data: { enabled: false },
          });
          assert.match(
            (await command("ssh nivel09@custodia")).output,
            /No route/,
          );
          assert.equal(
            (await request("/linux-network")).data.servers[1].status,
            "disabled",
          );
        } finally {
          await db.challenge.update({
            where: { id: challenge.id },
            data: { enabled: challenge.enabled },
          });
        }
      },
    );
  } finally {
    await app.close();
    await db.submission.deleteMany({ where: { userId: { in: userIds } } });
    await db.solve.deleteMany({ where: { userId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await registration.cleanup();
    await db.$disconnect();
  }
});
