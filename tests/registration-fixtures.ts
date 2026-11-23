import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../apps/api/src/db";

export function registrationFixture() {
  const namespace = `qa_registration_${randomBytes(8).toString("hex")}`;
  const previous = process.env.REGISTRATION_QUOTA_NAMESPACE;
  process.env.REGISTRATION_QUOTA_NAMESPACE = namespace;
  const tokens: string[] = [];
  return {
    namespace,
    async prepare(
      base: string,
      path: string,
      method: string,
      body: unknown,
      cookie = "",
    ) {
      if (
        path !== "/auth/register" ||
        method !== "POST" ||
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body)
      )
        return { body, cookie };
      const response = await fetch(
        base + "/api/v1/auth/registration-challenge",
        {
          method: "POST",
          headers: {
            origin: process.env.APP_ORIGIN!,
            "content-type": "application/json",
            ...(cookie ? { cookie } : {}),
          },
          body: "{}",
        },
      );
      assert.equal(response.status, 201);
      const { nonce, difficulty } = await response.json();
      assert.equal(difficulty, 17);
      tokens.push(createHash("sha256").update(nonce).digest("hex"));
      let solution = 0;
      while (true) {
        const hash = createHash("sha256")
          .update(`${nonce}:${solution}`)
          .digest();
        if (hash[0] === 0 && hash[1] === 0 && hash[2] < 128) break;
        solution++;
      }
      const browser = response.headers
        .getSetCookie()
        .find((value) => value.startsWith("ctf_registration_device="))!
        .split(";")[0];
      const other = cookie
        .split("; ")
        .filter(
          (value) => value && !value.startsWith("ctf_registration_device="),
        );
      return {
        body: { ...body, proof: { nonce, solution: String(solution) } },
        cookie: [...other, browser].join("; "),
      };
    },
    async cleanup() {
      await db.registrationProof.deleteMany({
        where: { tokenHash: { in: tokens } },
      });
      await db.registrationQuota.deleteMany({
        where: { key: { startsWith: namespace + ":" } },
      });
      if (previous === undefined)
        delete process.env.REGISTRATION_QUOTA_NAMESPACE;
      else process.env.REGISTRATION_QUOTA_NAMESPACE = previous;
    },
  };
}
