import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import {
  scoringEntries,
  SCORING_CATEGORIES,
  FINAL_POINTS,
} from "../apps/api/src/scoring/policy";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
test("escala completa e investigación sin requisitos de progreso", async () => {
  const entries = scoringEntries();
  assert.equal(entries.length, 250);
  assert.equal(new Set(entries.map((e) => e.id)).size, 250);
  assert.equal(SCORING_CATEGORIES.length, 25);
  for (const group of SCORING_CATEGORIES) {
    assert.deepEqual(
      [group.easy.length, group.medium.length, group.hard.length],
      [4, 3, 3],
    );
    assert.equal(
      entries
        .filter((e) => e.category === group.category)
        .reduce((n, e) => n + e.points, 0),
      19,
    );
  }
  assert.equal(entries.reduce((n, e) => n + e.points, 0) + FINAL_POINTS, 575);
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  const user = await db.user.create({
    data: {
      alias: "qa_scale_" + randomBytes(5).toString("hex"),
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
  async function request(path: string, body?: unknown) {
    const r = await fetch(base + "/api/v1" + path, {
      method: body ? "POST" : "GET",
      headers: {
        cookie: "ctf_session=" + token,
        origin: process.env.APP_ORIGIN!,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.ok(r.ok, path + " HTTP " + r.status);
    return r.json();
  }
  const file = async (n: number, name: string) =>
    (
      await request(
        "/workstation/files?path=" +
          encodeURIComponent(
            "/home/analista/investigacion/caso-" +
              String(n).padStart(2, "0") +
              "/evidencia/" +
              name,
          ),
      )
    ).content as string;
  const csv = (text: string) =>
    text
      .trim()
      .split("\n")
      .slice(1)
      .map((row) => row.split(","));
  try {
    const game = await request("/game");
    assert.equal(game.score, 0);
    for (const entry of entries) {
      const challenge = game.challenges.find(
        (c: { id: string }) => c.id === entry.id,
      );
      assert.equal(challenge.points, entry.points);
      assert.equal(challenge.difficulty, entry.difficulty);
    }
    // Resolve from served evidence; no answer imports or preceding solves.
    const chain = csv(await file(8, "cadena.csv"));
    let previous = (await file(8, "ancla.txt")).trim();
    let broken = "";
    for (const [id, operation, prior, hash] of chain) {
      assert.equal(prior, previous);
      const actual = sha([id, operation, prior].join("|"));
      if (actual !== hash) {
        broken = actual;
        break;
      }
      previous = hash;
    }
    assert.ok(broken);
    const clocks = csv(await file(7, "eventos.csv")).map(
      ([id, source, time]) => {
        const [h, m, s] = time.split(":").map(Number);
        return {
          id,
          utc:
            h * 3600 +
            m * 60 +
            s +
            (source === "puesto" ? 18000 : source === "colector" ? -180 : 0),
        };
      },
    );
    const ref = new URL(
      decodeURIComponent(
        (await file(6, "acceso.txt")).split("Destino codificado: ")[1].trim(),
      ),
    ).searchParams.get("ref");
    const target = csv(await file(6, "proxy.csv")).find(
      (r) => r[0] === ref && r[1] === "200",
    )![2];
    assert.ok(
      csv(await file(6, "recepcion.csv")).some(
        (r) => r[0] === target && r[2] === "completo",
      ),
    );
    const action = csv(await file(5, "acciones.csv")).find(
      (r) => r[0] === "exportacion",
    )!;
    const account = csv(await file(5, "sesiones.csv")).find(
      (r) => r[0] === action[1],
    )![1];
    assert.ok(csv(await file(5, "cuentas.csv")).some((r) => r[0] === account));
    const delivery = csv(await file(4, "entregas.csv")).find(
      (r) => r[1] === "aceptada",
    )!;
    const copies = (await file(4, "copias.txt"))
      .trim()
      .split("\n")
      .map((row) => row.split(": "));
    const copy = copies.find((r) => sha(r[1]) === delivery[2])!;
    const session = csv(await file(3, "sesiones.csv")).find(
      (r) => r[1] === "true" && r[2] === "false",
    )![0];
    const access = csv(await file(2, "accesos.csv"))
      .find((r) => r[2] === "autorizado")![1]
      .split(":")
      .map(Number);
    assert.match(await file(2, "reloj.txt"), /UTC-05:00/);
    const integrity = (await file(1, "integridad.txt")).match(
      /[a-f0-9]{64}/,
    )![0];
    let intact = "";
    for (const name of ["comprobante-a.txt", "comprobante-b.txt"])
      if (sha(await file(1, name)) === integrity) intact = name;
    assert.ok(intact);
    const answers = [
      intact,
      String(access[0] + 5).padStart(2, "0") +
        String(access[1]).padStart(2, "0"),
      session,
      sha([delivery[0], copy[0], copy[1].split(";")[0]].join("|")),
      account,
      target,
      sha(
        clocks
          .sort((a, b) => a.utc - b.utc)
          .map((e) => e.id)
          .join("|"),
      ),
      broken,
    ];
    assert.equal(await db.solve.count({ where: { userId: user.id } }), 0);
    for (let n = 8; n >= 1; n--) {
      const path =
        "/challenges/investigation-" +
        String(n).padStart(2, "0") +
        "/submissions";
      const body = { flag: "CTF{" + answers[n - 1] + "}" };
      assert.equal((await request(path, body)).correct, true);
      await request(path, body);
    }
    assert.equal((await request("/game")).score, 15);
    assert.equal(await db.solve.count({ where: { userId: user.id } }), 8);
    const ranking = (await request("/ranking")).entries.find(
      (r: { alias: string }) => r.alias === user.alias,
    );
    assert.equal(ranking.score, 15);
    assert.equal(ranking.solved, 8);
  } finally {
    await db.solve.deleteMany({ where: { userId: user.id } });
    await db.submission.deleteMany({ where: { userId: user.id } });
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await app.close();
    await db.$disconnect();
  }
});
