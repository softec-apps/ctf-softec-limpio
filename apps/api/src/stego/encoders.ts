import { deflateSync, deflateRawSync, constants } from "node:zlib";
export function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const name = Buffer.from(type);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([header, name, data, crc]);
}
export function png(width: number, height: number, rgba: Uint8Array) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    rows.set(
      rgba.subarray(y * width * 4, (y + 1) * width * 4),
      y * (width * 4 + 1) + 1,
    );
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
export function packet(text: string) {
  const value = Buffer.from(text);
  const header = Buffer.alloc(6);
  header.write("STEG");
  header.writeUInt16BE(value.length, 4);
  return Buffer.concat([header, value]);
}
export function packetBits(text: string) {
  return Array.from(packet(text)).flatMap((byte) =>
    Array.from({ length: 8 }, (_, bit) => (byte >> (7 - bit)) & 1),
  );
}
export function wav(
  channels: number,
  frames: number,
  sample: (frame: number, channel: number) => number,
) {
  const header = Buffer.alloc(44);
  header.write("RIFF");
  header.writeUInt32LE(36 + frames * channels * 2, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000 * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(frames * channels * 2, 40);
  const data = Buffer.alloc(frames * channels * 2);
  for (let frame = 0; frame < frames; frame++)
    for (let ch = 0; ch < channels; ch++)
      data.writeInt16LE(
        Math.max(-32768, Math.min(32767, Math.round(sample(frame, ch)))),
        (frame * channels + ch) * 2,
      );
  return Buffer.concat([header, data]);
}
export function jpegComment(image: Buffer, text: string) {
  const data = Buffer.from(text);
  const marker = Buffer.alloc(4);
  marker[0] = 255;
  marker[1] = 254;
  marker.writeUInt16BE(data.length + 2, 2);
  return Buffer.concat([image.subarray(0, 2), marker, data, image.subarray(2)]);
}
export function zipDocument(name: string, text: string) {
  const filename = Buffer.from(name),
    data = Buffer.from(text),
    compressed = deflateRawSync(data, { strategy: constants.Z_FIXED }),
    crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(filename.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + filename.length, 12);
  end.writeUInt32LE(local.length + filename.length + compressed.length, 16);
  return Buffer.concat([local, filename, compressed, central, filename, end]);
}
