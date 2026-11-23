export async function solveMaintenance(
  run: (
    action: Record<string, string>,
  ) => Promise<{ file?: string; flag?: string }>,
  tool: (command: string) => Promise<string>,
) {
  const file = async (path: string) =>
    (await run({ op: "visit", url: path })).file!;
  const quote = (value: string) => JSON.stringify(value);
  await run({ op: "visit", url: "http://gestion.seventech.local/" });
  await file("/robots.txt");
  const index = JSON.parse(await file("/archivo/indice.json"));
  let archive = "";
  for (const part of index.parts.sort(
    (a: { offset: number }, b: { offset: number }) => a.offset - b.offset,
  ))
    archive += await file(part.path);
  const identity = JSON.parse(await tool("crypto gunzip " + archive));
  await run({
    op: "login",
    alias: identity.account,
    password: identity.password,
  });
  const program = await file("/continuidad/recuperador.js");
  const mask = Number(program.match(/\^ (\d+)/)![1]);
  const record = await file("/continuidad/registro.txt");
  const nonce = Number(record.match(/nonce=(\d+)/)![1]);
  const value = (nonce ^ mask) >>> 0;
  const code = String(
    (((value << 7) | (value >>> 25)) >>> 0) % 100000000,
  ).padStart(8, "0");
  await run({ op: "recover", code });
  const document = await tool(
    "crypto gunzip " + (await file("/politicas/respaldo.snapshot")),
  );
  await run({ op: "restore", document });
  await file("/custodia/formato.txt");
  const envelope = JSON.parse(await file("/custodia/sobre.json"));
  const checksum = await tool("crypto sha256 " + quote(document));
  const key = await tool(
    `crypto pbkdf2 ${quote([identity.password, code, checksum].join("|"))} ${envelope.salt} ${envelope.iterations}`,
  );
  const inner = JSON.parse(
    await tool(
      `crypto decrypt-gcm ${key} ${envelope.iv} ${envelope.tag} ${envelope.ciphertext}`,
    ),
  );
  const signature = await tool(
    `crypto hmac ${inner.signing_key} ${quote(envelope.challenge)}`,
  );
  const result = await run({ op: "vault", signature });
  if (!result.flag) throw new Error("No se abrió la custodia.");
  return result.flag;
}
