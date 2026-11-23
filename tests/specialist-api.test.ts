import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import { SPECIALIST_STATIONS as ALL_STATIONS } from "../packages/specialist-contracts";
import { solveAnalysisCase, apiExploit } from "./specialist-fixtures";
const SPECIALIST_STATIONS = ALL_STATIONS.filter((s) =>
  ["api-kiosk", "quarantine", "soc", "badge-reader"].includes(s.id),
);
test("cuatro estaciones: cuarenta retos operables, aislados, independientes y con premio único", async (t) => {
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  const users = [];
  async function account() {
    const user = await db.user.create({
      data: {
        alias: "qa_specialist_" + randomBytes(6).toString("hex"),
        passwordHash: passwordHash(randomBytes(24).toString("hex")),
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
    return { id: user.id, cookie: "ctf_session=" + token };
  }
  const a = await account(),
    b = await account();
  users.push(a.id, b.id);
  async function call(
    path: string,
    body?: unknown,
    cookie = a.cookie,
    origin = process.env.APP_ORIGIN!,
  ) {
    const response = await fetch(base + "/api/v1" + path, {
      method: body ? "POST" : "GET",
      headers: { cookie, origin, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  try {
    await t.test(
      "catálogo y documentos sin soluciones públicas; autenticación y alcance",
      async () => {
        const game = (await call("/game")).data;
        assert.equal(game.challenges.length, 250);
        for (const station of SPECIALIST_STATIONS) {
          const cases = game.challenges.filter((c: { id: string }) =>
            c.id.startsWith(station.prefix),
          );
          assert.equal(cases.length, 10);
          assert.deepEqual(
            [1, 2, 3].map(
              (p) =>
                cases.filter((c: { points: number }) => c.points === p).length,
            ),
            [4, 3, 3],
          );
          assert.equal(
            (await call("/scene/objects/" + station.id, undefined, "")).status,
            401,
          );
          const listing = (await call("/scene/objects/" + station.id)).data
            .documents;
          assert.equal(listing.length, 10);
          assert(listing.every((d: { body?: string }) => d.body === undefined));
        }
        const publicObjects = await call("/scene/objects", undefined, "");
        assert(!JSON.stringify(publicObjects.data).includes("CTF{"));
        assert.equal(
          (
            await call("/challenges/api-01/web", {
              url: "http://external.example/",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              "/challenges/api-01/web",
              { url: "/" },
              a.cookie,
              "https://other.invalid",
            )
          ).status,
          403,
        );
      },
    );
    for (const station of [...SPECIALIST_STATIONS].reverse())
      await t.test(
        station.category +
          ": diez soluciones desde evidencia pública en orden inverso",
        async () => {
          for (let index = 10; index >= 1; index--) {
            const suffix = String(index).padStart(2, "0"),
              id = station.prefix + suffix;
            const doc = await call(
              `/scene/objects/${station.id}/documents/${id}`,
            );
            assert.equal(doc.status, 200);
            const root =
              station.id === "api-kiosk"
                ? `/home/analista/servicios/api-${suffix}.seventech.local`
                : `${station.root}/caso-${suffix}`;
            const read = async (name: string) => {
              const result = await call(
                "/workstation/files?path=" +
                  encodeURIComponent(root + "/evidencia/" + name),
              );
              assert.equal(result.status, 200);
              return String(result.data.content);
            };
            let flag: string;
            if (station.id === "api-kiosk") {
              const home = (await call(`/challenges/${id}/web`, { url: "/" }))
                .data;
              assert(!home.body.includes("CTF{"));
              assert.equal(home.form.fields.length, 4);
              const params = await apiExploit(index, home.form.fields, read);
              const target = "/request?" + params.toString();
              assert(
                target.length < 512,
                "La petición debe caber en el contrato HTTP existente",
              );
              const reply = await call(`/challenges/${id}/web`, {
                url: target,
              });
              assert.equal(reply.status, 201);
              assert.equal(reply.data.status, 200);
              const match = reply.data.body.match(/CTF\{[a-f0-9]{32}\}/);
              assert(match);
              flag = match[0];
              // Every endpoint also rejects a mismatched session, except the intentionally broken JWT verifier.
              params.set("token", "invalid");
              const invalid = await call(`/challenges/${id}/web`, {
                url: "/request?" + params.toString(),
              });
              assert(!invalid.data.body.includes("CTF{"));
              if (index === 1) {
                const homeB = (
                  await call(`/challenges/${id}/web`, { url: "/" }, b.cookie)
                ).data;
                assert.equal(
                  homeB.form.fields.find(
                    (f: { name: string }) => f.name === "path",
                  ).value,
                  "/v1/orders/101",
                );
              }
            } else flag = "CTF{" + (await solveAnalysisCase(id, read)) + "}";
            const submission = await call(`/challenges/${id}/submissions`, {
              flag,
            });
            assert.equal(submission.status, 201);
            assert.equal(submission.data.correct, true, id);
            if (index === 10) {
              const again = await call(`/challenges/${id}/submissions`, {
                flag,
              });
              assert.equal(again.data.correct, true);
            }
          }
        },
      );
    await t.test(
      "76 puntos, aislamiento y disponibilidad coherente",
      async () => {
        assert.equal((await call("/game")).data.score, 76);
        assert.equal((await call("/game", undefined, b.cookie)).data.score, 0);
        for (const station of SPECIALIST_STATIONS) {
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
            const path =
              station.id === "api-kiosk"
                ? "/challenges/" + id + "/web"
                : "/workstation/files?path=" +
                  encodeURIComponent(station.root + "/caso-10/LEEME.txt");
            assert.equal(
              (
                await call(
                  path,
                  station.id === "api-kiosk" ? { url: "/" } : undefined,
                )
              ).status,
              404,
            );
          } finally {
            await db.challenge.update({
              where: { id },
              data: { enabled: true },
            });
          }
        }
        const terminal = await call("/workstation/commands", {
          command: "cat " + SPECIALIST_STATIONS[1].root + "/caso-01/LEEME.txt",
          cwd: "/home/analista",
          challengeId: "malware-01",
        });
        assert.equal(terminal.status, 201);
        assert(terminal.data.output.includes("dominio"));
      },
    );
  } finally {
    await db.solve.deleteMany({ where: { userId: { in: users } } });
    await db.submission.deleteMany({ where: { userId: { in: users } } });
    await db.auditLog.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
    await db.$disconnect();
  }
});
