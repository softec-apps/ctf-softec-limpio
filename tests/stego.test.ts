import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  STEGO_CASES,
  STEGO_CHALLENGES,
  stegoFlag,
} from "../apps/api/src/stego/catalog";
import { readStegoBytes, readStegoFile } from "../apps/api/src/stego/artifacts";
import { workstationFileCommand } from "../apps/api/src/workstation-file-commands";
import {
  identify,
  printableStrings,
  imageMetadata,
  imagePayload,
  bitPlane,
  xorImages,
  decodeWave,
  audioPayload,
  decodeFsk,
  invisiblePayload,
  zipEntries,
  extractZip,
  readPacket,
} from "../apps/web/src/evidence-media/binaryFormats";
const enabled = STEGO_CASES.map((c) => c.id);
const file = (n: number, name = STEGO_CASES[n - 1].files[0]) =>
  readStegoBytes(enabled, STEGO_CASES[n - 1].folder + "/" + name).bytes;
const pixels = (n: number, name?: string) => {
  const p = PNG.sync.read(file(n, name));
  return {
    data: Uint8ClampedArray.from(p.data),
    width: p.width,
    height: p.height,
  };
};
const qr = (data: Uint8ClampedArray, w: number, h: number) =>
  jsQR(data, w, h)?.data;
test("diez casos y catálogo sin soluciones", () => {
  assert.equal(STEGO_CHALLENGES.length, 10);
  assert.equal(
    STEGO_CHALLENGES.reduce((s, c) => s + c.points, 0),
    19,
  );
  assert.ok(!JSON.stringify(STEGO_CHALLENGES).includes("CTF{"));
});
test("JPEG válido con mensaje después del cierre y comentario real", () => {
  const a = file(1);
  assert.equal(identify(a), "JPEG");
  assert.ok(printableStrings(a).some((s) => s.includes(stegoFlag("stego-01"))));
  assert.ok(
    a.lastIndexOf(Buffer.from([255, 217])) < a.indexOf(stegoFlag("stego-01")),
  );
  assert.ok(
    imageMetadata(file(2)).some((row) =>
      row.value.includes(stegoFlag("stego-02")),
    ),
  );
  assert.ok(
    workstationFileCommand(
      enabled,
      "strings postal.jpg",
      STEGO_CASES[0].folder,
    ).output.includes(stegoFlag("stego-01")),
  );
});
test("mensaje en bits RGB de píxeles PNG reales", () => {
  const p = pixels(3);
  assert.equal(imagePayload(p.data, "rgb", 0), stegoFlag("stego-03"));
  assert.ok(!file(3).includes(Buffer.from(stegoFlag("stego-03"))));
});
test("plano azul de bits descubre QR", () => {
  const p = pixels(4);
  assert.equal(qr(p.data, p.width, p.height), undefined);
  assert.equal(
    qr(bitPlane(p.data, 2, 0), p.width, p.height),
    stegoFlag("stego-04"),
  );
});
test("dos láminas opacas revelan QR solamente al combinar XOR", () => {
  const a = pixels(5, "lamina_a.png"),
    b = pixels(5, "lamina_b.png");
  assert.equal(qr(a.data, a.width, a.height), undefined);
  assert.equal(qr(b.data, b.width, b.height), undefined);
  assert.equal(
    qr(xorImages(a.data, b.data), a.width, a.height),
    stegoFlag("stego-05"),
  );
  assert.throws(() => xorImages(a.data, b.data.slice(4)));
});
test("PCM mono contiene mensaje en muestras LSB", () => {
  assert.equal(audioPayload(decodeWave(file(6)), 0, 0), stegoFlag("stego-06"));
});
test("FSK balanceada requiere diferencia de canales", () => {
  const wave = decodeWave(file(7));
  assert.equal(decodeFsk(wave, "mix", 600, 1200, 25), null);
  assert.equal(
    decodeFsk(wave, "difference", 600, 1200, 25),
    stegoFlag("stego-07"),
  );
  assert.throws(() => decodeFsk(wave, "difference", 0, 1200, 25));
});
test("SVG real conserva texto con color del fondo", () => {
  assert.equal(identify(file(8)), "SVG");
  const text = file(8).toString();
  assert.ok(
    text.includes(
      `fill="#f2f1eb" font-family="monospace" font-size="15">${stegoFlag("stego-08")}`,
    ),
  );
});
test("caracteres Unicode invisibles contienen trama binaria", () => {
  const decoded = invisiblePayload(file(9));
  assert.equal(decoded.text, stegoFlag("stego-09"));
  assert.ok(decoded.zero > 0 && decoded.one > 0);
  assert.equal(invisiblePayload(Buffer.from("carta visible")).text, null);
});
test("ZIP disfrazado usa DEFLATE real y valida CRC", async () => {
  const bytes = file(10);
  assert.equal(identify(bytes), "ZIP");
  const entries = zipEntries(bytes);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].method, 8);
  assert.ok(!bytes.includes(Buffer.from(stegoFlag("stego-10"))));
  assert.ok(
    new TextDecoder()
      .decode(await extractZip(bytes, entries[0]))
      .includes(stegoFlag("stego-10")),
  );
  await assert.rejects(extractZip(bytes, { ...entries[0], crc: 0 }));
  assert.throws(() => zipEntries(Buffer.from("ZIP inválido")));
});
test("montajes bloquean casos inactivos incluso después de generar caché", () => {
  file(1);
  assert.throws(() =>
    readStegoBytes([], STEGO_CASES[0].folder + "/postal.jpg"),
  );
  assert.throws(() => readStegoFile([], STEGO_CASES[0].folder));
  assert.throws(() =>
    readStegoBytes(enabled, STEGO_CASES[0].folder + "/../../.env"),
  );
  const listing = readStegoFile(
    enabled,
    STEGO_CASES[2].folder + "/pasillo.png",
  );
  assert.equal("content" in listing, false);
});
test("parsers rechazan truncamientos y tramas incompletas", () => {
  assert.throws(() => decodeWave(file(6).subarray(0, 50)));
  assert.equal(readPacket(Buffer.from("STEG\x00\x20texto")), null);
  assert.deepEqual(
    imageMetadata(Buffer.from([255, 216, 255, 254, 255, 255])),
    [],
  );
});
