import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import { solveFileCase } from "./file-forensics-fixtures";
import { sha256Hex } from "../apps/web/src/web-lab/toolkit/textTransforms";
import { cryptoTool } from "../apps/api/src/privileged/crypto-tools";
import { FILE_ROOT } from "../apps/api/src/file-forensics/catalog";
test("Archivos: diez expedientes independientes en cajones, evidencias y puntuación", async () => {
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  const user = await db.user.create({
    data: {
      alias: "qa_files_" + randomBytes(5).toString("hex"),
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
  const call = async (
    url: string,
    body?: unknown,
    cookie = "ctf_session=" + token,
  ) => {
    const response = await fetch(base + "/api/v1" + url, {
      method: body ? "POST" : "GET",
      headers: {
        cookie,
        origin: process.env.APP_ORIGIN!,
        "content-type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    assert.equal(
      (await call("/scene/objects/archive", undefined, "")).status,
      401,
    );
    const game = (await call("/game")).data;
    assert.equal(game.challenges.length, 250);
    const cases = game.challenges.filter((c: { id: string }) =>
      c.id.startsWith("files-"),
    );
    assert.equal(cases.length, 10);
    assert.deepEqual(
      [1, 2, 3].map(
        (p) => cases.filter((c: { points: number }) => c.points === p).length,
      ),
      [4, 3, 3],
    );
    const listing = (await call("/scene/objects/archive")).data.documents;
    assert.equal(listing.length, 16);
    assert.equal(
      listing.filter((d: { challengeId?: string }) => d.challengeId).length,
      10,
    );
    assert(listing.every((d: { body?: string }) => d.body === undefined));
    assert.deepEqual(
      [0, 1, 2].map(
        (drawer) =>
          listing.filter(
            (d: { drawer: number; challengeId?: string }) =>
              d.drawer === drawer && d.challengeId,
          ).length,
      ),
      [4, 4, 2],
    );
    const answers = new Map<string, string>();
    // Reverse order proves there is no prerequisite chain.
    for (let index = 10; index >= 1; index--) {
      const id = "files-" + String(index).padStart(2, "0"),
        root = FILE_ROOT + "/caso-" + id.slice(-2);
      const doc = await call("/scene/objects/archive/documents/" + id);
      assert.equal(doc.status, 200);
      assert(doc.data.body.includes(root));
      assert.equal(doc.data.challengeId, id);
      const read = async (name: string) => {
        const result = await call(
          "/workstation/files?path=" +
            encodeURIComponent(root + "/evidencia/" + name),
        );
        assert.equal(result.status, 200);
        return String(result.data.content);
      };
      const answer = await solveFileCase(index, read);
      answers.set(id, answer);
      const result = await call("/challenges/" + id + "/submissions", {
        flag: "CTF{" + answer + "}",
      });
      assert.equal(result.status, 201);
      assert.equal(result.data.correct, true);
    }
    const complete = (await call("/game")).data;
    assert.equal(complete.score, 19);
    assert.equal(complete.solves.length, 10);
    await call("/challenges/files-10/submissions", {
      flag: "CTF{" + answers.get("files-10") + "}",
    });
    assert.equal((await call("/game")).data.score, 19);
    assert.equal(
      (
        await call("/challenges/files-09/submissions", {
          flag: "CTF{incorrecta}",
        })
      ).data.correct,
      false,
    );
    const terminal = await call("/workstation/commands", {
      command: "cat " + FILE_ROOT + "/caso-03/evidencia/.custodia",
      cwd: "/home/analista",
      challengeId: "files-03",
    });
    assert.equal(terminal.status, 201);
    assert(terminal.data.output.includes("identificador="));
    await db.challenge.update({
      where: { id: "files-10" },
      data: { enabled: false },
    });
    assert(
      !(await call("/scene/objects/archive")).data.documents.some(
        (d: { id: string }) => d.id === "files-10",
      ),
    );
    assert.equal(
      (await call("/scene/objects/archive/documents/files-10")).status,
      404,
    );
    assert.equal(
      (
        await call(
          "/workstation/files?path=" +
            encodeURIComponent(FILE_ROOT + "/caso-10/evidencia/raiz.sha256"),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call("/challenges/files-10/submissions", {
          flag: "CTF{" + answers.get("files-10") + "}",
        })
      ).status,
      404,
    );
    assert.equal(
      (await call("/scene/objects/archive/documents/file-3")).status,
      200,
    );
  } finally {
    await db.challenge.update({
      where: { id: "files-10" },
      data: { enabled: true },
    });
    await db.solve.deleteMany({ where: { userId: user.id } });
    await db.submission.deleteMany({ where: { userId: user.id } });
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await app.close();
    await db.$disconnect();
  }
});
test("SHA256 sobre bytes conserva ceros y no resume la representación hexadecimal", async () => {
  const bytes = Buffer.from("4143544100000000000000002d373321", "hex"),
    expected = createHash("sha256").update(bytes).digest("hex");
  assert.equal(await sha256Hex(bytes.toString("hex")), expected);
  assert.equal(
    cryptoTool("crypto sha256-hex " + bytes.toString("hex")),
    expected,
  );
  assert.notEqual(await sha256Hex("00"), await sha256Hex("30"));
  await assert.rejects(() => sha256Hex("0xz1"));
  assert.throws(() => cryptoTool("crypto sha256-hex 0xz1"));
});
