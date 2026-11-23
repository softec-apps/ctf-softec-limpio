import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import QRCode from "qrcode";
import { NotFoundException } from "@nestjs/common";
import { STEGO_CASES, STEGO_ROOT, stegoFlag } from "./catalog";
import { png, packetBits, wav, jpegComment, zipDocument } from "./encoders";
const WIDTH = 480,
  HEIGHT = 320;
const cache = new Map<string, Buffer>();
function photo() {
  return readFileSync(
    resolve(__dirname, "../../assets/mobile/corridor-base.jpg"),
  );
}
function pixels() {
  return new Uint8Array(
    inflateSync(
      readFileSync(resolve(__dirname, "../../assets/stego/corridor-rgba.zlib")),
    ),
  );
}
function qrMask(text: string) {
  const code = QRCode.create(text, { errorCorrectionLevel: "M" }),
    size = code.modules.size,
    scale = Math.floor(Math.min(WIDTH, HEIGHT) / (size + 8));
  const left = Math.floor((WIDTH - (size + 8) * scale) / 2),
    top = Math.floor((HEIGHT - (size + 8) * scale) / 2);
  return (x: number, y: number) => {
    const row = Math.floor((y - top) / scale) - 4,
      col = Math.floor((x - left) / scale) - 4;
    return (
      row >= 0 &&
      col >= 0 &&
      row < size &&
      col < size &&
      Boolean(code.modules.data[row * size + col])
    );
  };
}
function xorLayer(text: string, second: boolean) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4),
    mask = qrMask(text);
  let random = 71359;
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const hidden = mask(x, y) ? 0 : 255;
      for (let channel = 0; channel < 3; channel++) {
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
        data[(y * WIDTH + x) * 4 + channel] =
          (random >>> 24) ^ (second ? hidden : 0);
      }
      data[(y * WIDTH + x) * 4 + 3] = 255;
    }
  return png(WIDTH, HEIGHT, data);
}
function build(index: number, name: string): Buffer {
  const entry = STEGO_CASES[index],
    flag = stegoFlag(entry.id);
  if (name === "LEEME.txt")
    return Buffer.from(
      `${entry.title}\n\n${entry.description}\n\nArchivos preservados: ${entry.files.join(", ")}\nConserva el original. Las herramientas del escritorio abren estos mismos bytes.\n`,
    );
  if (index === 0)
    return Buffer.concat([
      photo(),
      Buffer.from(`\nRegistro de entrega reservado\n${flag}\n`),
    ]);
  if (index === 1)
    return jpegComment(
      photo(),
      `Copia de recepción / comentario del autor\n${flag}`,
    );
  if (index === 2) {
    const data = pixels(),
      bits = packetBits(flag);
    bits.forEach((bit, i) => {
      const pos = Math.floor(i / 3) * 4 + (i % 3);
      data[pos] = (data[pos] & 254) | bit;
    });
    return png(WIDTH, HEIGHT, data);
  }
  if (index === 3) {
    const data = pixels(),
      mask = qrMask(flag);
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const pos = (y * WIDTH + x) * 4 + 2;
        data[pos] = (data[pos] & 254) | (mask(x, y) ? 0 : 1);
      }
    return png(WIDTH, HEIGHT, data);
  }
  if (index === 4) return xorLayer(flag, name === "lamina_b.png");
  if (index === 5) {
    const bits = packetBits(flag);
    return wav(1, 24000, (frame) => {
      const sample = Math.round(
        6500 * Math.sin((2 * Math.PI * 440 * frame) / 8000),
      );
      return frame < bits.length ? (sample & ~1) | bits[frame] : sample;
    });
  }
  if (index === 6) {
    if (name === "parte_de_turno.txt")
      return Buffer.from(
        "CENTRAL / Parte de turno\n\nEnlace de dos líneas balanceadas. La escucha de sala suma las dos señales.\nPortadora de control: 440 Hz.\nEstado de reposo: 600 Hz. Estado de servicio: 1200 Hz.\nReloj: 40 símbolos por segundo. Trama binaria, bit mayor primero.\nLa entrega está en el registro digital, no en una conversación hablada.\n",
      );
    const bits = packetBits(flag);
    return wav(
      2,
      bits.length * 200,
      (frame, ch) =>
        6500 * Math.sin((2 * Math.PI * 440 * frame) / 8000) +
        (ch === 0 ? 1 : -1) *
          1800 *
          Math.sin(
            (2 *
              Math.PI *
              (bits[Math.floor(frame / 200)] ? 1200 : 600) *
              frame) /
              8000,
          ),
    );
  }
  if (index === 7)
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#f2f1eb"/><text x="30" y="48" fill="#243b48" font-family="sans-serif" font-size="22">SEVENTECH / Circular de servicio</text><text x="30" y="104" fill="#354955" font-family="sans-serif" font-size="15">El lunes se recibe la documentación de cierre.</text><text x="30" y="136" fill="#354955" font-family="sans-serif" font-size="15">Conservar la copia digital enviada a imprenta.</text><text x="30" y="245" fill="#f2f1eb" font-family="monospace" font-size="15">${flag}</text><text x="30" y="288" fill="#76828a" font-size="12">Secretaría / distribución interna</text></svg>`,
    );
  if (index === 8) {
    const hidden = packetBits(flag)
      .map((bit) => (bit ? "\u200c" : "\u200b"))
      .join("");
    return Buffer.from(
      `Equipo de guardia:\n\n${hidden}La reunión terminó sin correcciones sobre el acta.\nLa copia impresa coincide a simple vista con el original digital.\nConservad el archivo recibido para la entrega de cierre.\n\nSecretaría\n`,
    );
  }
  return zipDocument(
    "acta_recepcion.txt",
    `Acta de recepción / sobre recuperado\n\n${flag}\n`,
  );
}
export function stegoEntry(path: string) {
  for (const entry of STEGO_CASES) {
    if (path.startsWith(entry.folder + "/")) {
      const name = path.slice(entry.folder.length + 1);
      if (name === "LEEME.txt" || entry.files.includes(name))
        return { entry, name };
    }
  }
  return null;
}
export function readStegoBytes(enabled: string[], path: string) {
  const found = stegoEntry(path);
  if (!found || !enabled.includes(found.entry.id))
    throw new NotFoundException("Archivo no disponible.");
  let bytes = cache.get(path);
  if (!bytes) {
    bytes = build(found.entry.index, found.name);
    cache.set(path, bytes);
  }
  return {
    bytes,
    name: found.name,
    mime: stegoMime(found.entry.index, found.name),
  };
}
export function stegoMime(index: number, name: string) {
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".wav")) return "audio/wav";
  return index === 9 ? "application/octet-stream" : "image/jpeg";
}
export function readStegoFile(enabled: string[], path: string) {
  const cases = STEGO_CASES.filter((c) => enabled.includes(c.id));
  if (path === STEGO_ROOT)
    return {
      type: "directory" as const,
      path,
      entries: cases.map((c) => ({
        name: c.folder.slice(STEGO_ROOT.length + 1),
        type: "directory" as const,
      })),
    };
  const directory = cases.find((c) => c.folder === path);
  if (directory)
    return {
      type: "directory" as const,
      path,
      entries: ["LEEME.txt", ...directory.files].map((name) => ({
        name,
        type: "file" as const,
      })),
    };
  const found = stegoEntry(path);
  if (!found || !enabled.includes(found.entry.id))
    throw new NotFoundException("Archivo no disponible.");
  const mime = stegoMime(found.entry.index, found.name),
    text = mime.startsWith("text/");
  return {
    type: "file" as const,
    path,
    name: found.name,
    mime,
    assetUrl: `/api/v1/workstation/binary?path=${encodeURIComponent(path)}`,
    ...(text
      ? { content: readStegoBytes(enabled, path).bytes.toString("utf8") }
      : {}),
  };
}
