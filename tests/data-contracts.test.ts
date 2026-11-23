import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { DATABASE_LABS } from "../apps/api/src/database-lab/catalog";
import { CONTRACT_LABS } from "../apps/api/src/smart-contracts/catalog";
import { DATABASE_CASES } from "../apps/api/src/database-lab/cases";
import { executeReadQuery } from "../apps/api/src/database-lab/engine";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { digest, passwordHash } from "../apps/api/src/security";
import { REFERENCE_BOOKS } from "../apps/api/src/library/catalog";
const queries = [
  "SELECT value FROM backup_keys WHERE active=1",
  "SELECT value FROM settings WHERE name='export_token' AND public=0",
  "SELECT recovery_code FROM customers WHERE id=17 AND deleted_at IS NOT NULL",
  `SELECT id FROM backups WHERE sha256='${DATABASE_CASES[3].files["acquisition.sha256"]}' AND complete=1`,
  "SELECT u.alias FROM exports e JOIN sessions s ON s.id=e.session_id JOIN users u ON u.id=s.user_id WHERE e.record_id='payroll' AND e.allowed=1",
  "SELECT a.id AS actor_id,r.id AS resource_id FROM actors a JOIN grants g ON g.role=a.role JOIN resources r ON r.id=g.resource WHERE g.allowed=1 AND a.tenant<>r.tenant",
  "SELECT r.content FROM revisions r JOIN transactions t ON t.id=r.tx WHERE r.doc='AUDIT' AND t.state='committed' ORDER BY r.version DESC LIMIT 1",
  "SELECT l.id FROM line_items l LEFT JOIN orders o ON o.id=l.order_id AND o.tenant=l.tenant WHERE o.id IS NULL ORDER BY l.id",
  "SELECT b.opening+SUM(CASE WHEN f.to_acct='cash' AND f.from_acct<>'cash' THEN f.amount WHEN f.from_acct='cash' AND f.to_acct<>'cash' THEN -f.amount ELSE 0 END) AS closing FROM transfers f JOIN transactions t ON t.id=f.tx JOIN balances b ON b.account='cash' WHERE t.state='committed'",
  "SELECT DISTINCT e.object_id FROM events e JOIN sessions s ON s.id=e.session_id JOIN objects o ON o.id=e.object_id WHERE s.id='S-C' AND e.seq<=9 AND e.result=200 AND o.classification='confidential' AND s.tenant<>o.tenant ORDER BY e.object_id",
];
function initial(index: number) {
  return JSON.parse(CONTRACT_LABS[index].request("/").form!.fields[0].value);
}
function contractInput(index: number) {
  const state = JSON.parse(
    CONTRACT_LABS[index].evidence[
      Object.keys(CONTRACT_LABS[index].evidence).find((k) =>
        k.endsWith("/state.json"),
      )!
    ] as string,
  );
  switch (index) {
    case 0:
      return { method: "setOwner", owner: state.player };
    case 1:
      return { trace: [state.owner, state.offer], recipient: state.player };
    case 2:
      return { method: "initialize", owner: state.player };
    case 3:
      return { method: "play", guess: state.timestamp % 16 };
    case 4:
      return { method: "withdraw", reentries: 2 };
    case 5:
      return { method: "settle", recipientMode: "reject" };
    case 6:
      return { method: "spend", amount: 250 };
    case 7:
      return { ...initial(index), repeats: 2 };
    case 8:
      return { ...initial(index), ...state.target };
    case 9:
      return {
        calls: [
          { method: "initialize", owner: state.evil },
          { method: "withdraw", recipient: state.player },
        ],
      };
    default:
      throw Error("case");
  }
}
const operate = (input: unknown) =>
  "/operate?payload=" + encodeURIComponent(JSON.stringify(input));
test("diez consultas SQLite recuperan solo el resultado solicitado", () => {
  for (let i = 0; i < 10; i++) {
    assert.equal(
      executeReadQuery(DATABASE_CASES[i], queries[i]).correct,
      true,
      DATABASE_LABS[i].challenge.id,
    );
    assert.equal(
      executeReadQuery(
        DATABASE_CASES[i],
        "SELECT name FROM sqlite_master WHERE type='table'",
      ).correct,
      false,
    );
  }
});
test("SQLite rechaza modificaciones, extensiones, recursión y multiplicación ilimitada", () => {
  for (const query of [
    "DROP TABLE backup_keys",
    "SELECT 1; SELECT 2",
    "SELECT load_extension('/tmp/x')",
    "SELECT zeroblob(999999999)",
    "WITH RECURSIVE x AS (SELECT 1) SELECT * FROM x",
    "SELECT * FROM backup_keys a,backup_keys b",
    'SELECT "zeroblob"(9)',
    "SELECT 'zeroblob'(9)",
    "SELECT * FROM Solve",
  ])
    assert.throws(() => executeReadQuery(DATABASE_CASES[0], query), query);
  assert.equal(executeReadQuery(DATABASE_CASES[0], queries[0]).correct, true);
});
test("diez contratos exigen la transición vulnerable; el estado se reinicia", () => {
  for (let i = 0; i < 10; i++) {
    const lab = CONTRACT_LABS[i];
    assert.doesNotMatch(lab.request(operate(initial(i))).body, /CTF\{/);
    assert.match(
      lab.request(operate(contractInput(i))).body,
      /CTF\{[a-f0-9]{32}\}/,
      lab.challenge.id,
    );
    assert.doesNotMatch(lab.request(operate(initial(i))).body, /CTF\{/);
  }
});
test("firmas alteradas y datos de dominio cambiados no autorizan vales", () => {
  const replay = contractInput(7) as any,
    typed = contractInput(8) as any;
  assert.doesNotMatch(
    CONTRACT_LABS[7].request(
      operate({ ...replay, message: replay.message + "!" }),
    ).body,
    /CTF\{/,
  );
  assert.doesNotMatch(
    CONTRACT_LABS[7].request(operate({ ...replay, signature: "0x1234" })).body,
    /CTF\{/,
  );
  assert.doesNotMatch(
    CONTRACT_LABS[8].request(
      operate({ ...typed, voucher: { ...typed.voucher, amount: 11 } }),
    ).body,
    /CTF\{/,
  );
  assert.doesNotMatch(
    CONTRACT_LABS[8].request(
      operate({ ...typed, domain: { ...typed.domain, chainId: 31338 } }),
    ).body,
    /CTF\{/,
  );
});
test("dos manuales añaden veinte páginas de teoría sin comprobantes", () => {
  for (const category of ["Bases de datos", "Contratos inteligentes"]) {
    const book = REFERENCE_BOOKS.find((b) => b.category === category)!;
    assert.equal(book.pages.length, 10);
    for (const page of book.pages) {
      assert.ok(page.body.length > 250);
      assert.doesNotMatch(page.body, /CTF\{/);
    }
  }
});
test("servicios nuevos requieren sesión, conservan pruebas individuales y puntúan una vez", async () => {
  const app = await createApp();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  const user = await db.user.create({
    data: {
      alias: "qa_data_contract_" + randomBytes(6).toString("hex"),
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
    path: string,
    body?: unknown,
    cookie = "ctf_session=" + token,
  ) => {
    const response = await fetch(base + "/api/v1" + path, {
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
    for (const [labs, inputs] of [
      [DATABASE_LABS, queries.map((query) => ({ query }))],
      [CONTRACT_LABS, Array.from({ length: 10 }, (_, i) => contractInput(i))],
    ] as const) {
      for (let i = 0; i < 10; i++) {
        const id = labs[i].challenge.id;
        assert.equal(
          (await call(`/challenges/${id}/web`, { url: "/" }, "")).status,
          401,
        );
        const reply = await call(`/challenges/${id}/web`, {
          url: operate(inputs[i]),
        });
        assert.equal(reply.status, 201);
        const flag = reply.data.body.match(/CTF\{[a-f0-9]{32}\}/)?.[0];
        assert.ok(flag, id);
        const submission = await call(`/challenges/${id}/submissions`, {
          flag,
        });
        assert.equal(submission.data.correct, true);
        assert.equal(
          (await call(`/challenges/${id}/submissions`, { flag })).data.correct,
          true,
        );
      }
    }
    assert.equal((await call("/game")).data.score, 38);
    assert.equal(await db.solve.count({ where: { userId: user.id } }), 20);
  } finally {
    await db.submission.deleteMany({ where: { userId: user.id } });
    await db.solve.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await app.close();
    await db.$disconnect();
  }
});
