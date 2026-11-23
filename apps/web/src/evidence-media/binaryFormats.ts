export function textOf(data: Uint8Array) {
  return new TextDecoder().decode(data);
}
export function identify(data: Uint8Array) {
  const head = Array.from(data.subarray(0, 4))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  if (head === "0061736d") return "WebAssembly";
  if (head === "89504e47") return "PNG";
  if (head === "52494646") return "WAV / RIFF";
  if (head === "504b0304") return "ZIP";
  if (data[0] === 255 && data[1] === 216) return "JPEG";
  if (textOf(data.subarray(0, 100)).trimStart().startsWith("<svg"))
    return "SVG";
  return data.includes(0) ? "Datos binarios" : "Texto UTF-8";
}
export function printableStrings(data: Uint8Array) {
  let text = "";
  for (const byte of data)
    text += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "\n";
  return (text.match(/[\x20-\x7e]{4,}/g) ?? []).slice(0, 4000);
}
export function bitsToBytes(bits: number[]) {
  const result = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < result.length; i++)
    for (let b = 0; b < 8; b++) result[i] = (result[i] << 1) | bits[i * 8 + b];
  return result;
}
export function readPacket(data: Uint8Array) {
  for (let i = 0; i + 6 <= data.length; i++)
    if (
      data[i] === 83 &&
      data[i + 1] === 84 &&
      data[i + 2] === 69 &&
      data[i + 3] === 71
    ) {
      const size = (data[i + 4] << 8) | data[i + 5];
      if (size > 0 && size <= 4096 && i + 6 + size <= data.length)
        return textOf(data.subarray(i + 6, i + 6 + size));
    }
  return null;
}
export function invisiblePayload(data: Uint8Array) {
  const text = textOf(data),
    bits = Array.from(text)
      .filter((c) => c === "\u200b" || c === "\u200c")
      .map((c) => (c === "\u200c" ? 1 : 0));
  return {
    zero: bits.filter((b) => !b).length,
    one: bits.filter(Boolean).length,
    text: readPacket(bitsToBytes(bits)),
  };
}
export function imagePayload(
  data: Uint8ClampedArray,
  channels: string,
  bit: number,
) {
  const offsets =
      channels === "rgb"
        ? [0, 1, 2]
        : [{ r: 0, g: 1, b: 2, a: 3 }[channels] ?? 0],
    bits: number[] = [];
  for (let i = 0; i < data.length; i += 4)
    for (const offset of offsets) bits.push((data[i + offset] >> bit) & 1);
  return readPacket(bitsToBytes(bits));
}
export function bitPlane(
  data: Uint8ClampedArray,
  channel: number,
  bit: number,
) {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const value = ((data[i + channel] >> bit) & 1) * 255;
    out[i] = out[i + 1] = out[i + 2] = value;
    out[i + 3] = 255;
  }
  return out;
}
export function xorImages(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length)
    throw new Error("Las dos imágenes deben tener las mismas dimensiones.");
  const out = new Uint8ClampedArray(a.length);
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) out[i + c] = a[i + c] ^ b[i + c];
    out[i + 3] = 255;
  }
  return out;
}
export function imageMetadata(data: Uint8Array) {
  const rows: { name: string; value: string }[] = [],
    view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (identify(data) === "JPEG") {
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 255) break;
      const marker = data[offset + 1];
      if (marker === 218 || marker === 217) break;
      const size = view.getUint16(offset + 2, false);
      if (size < 2 || offset + 2 + size > data.length) break;
      if (marker === 254)
        rows.push({
          name: "Comentario JPEG",
          value: textOf(data.subarray(offset + 4, offset + 2 + size)),
        });
      offset += size + 2;
    }
  }
  if (identify(data) === "PNG") {
    let offset = 8;
    while (offset + 12 <= data.length) {
      const size = view.getUint32(offset, false);
      if (offset + 12 + size > data.length) break;
      const name = textOf(data.subarray(offset + 4, offset + 8));
      rows.push({
        name,
        value:
          name === "tEXt"
            ? textOf(data.subarray(offset + 8, offset + 8 + size)).replace(
                "\0",
                ": ",
              )
            : `${size} bytes`,
      });
      offset += 12 + size;
      if (name === "IEND") break;
    }
  }
  return rows;
}
export type Wave = {
  sampleRate: number;
  channels: number;
  frames: number;
  samples: Int16Array[];
};
export function decodeWave(data: Uint8Array): Wave {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (
    data.length < 44 ||
    textOf(data.subarray(0, 4)) !== "RIFF" ||
    textOf(data.subarray(8, 12)) !== "WAVE"
  )
    throw new Error("Se necesita un archivo WAV PCM.");
  let rate = 0,
    channels = 0,
    align = 0,
    bits = 0,
    format = 0,
    start = 0,
    size = 0;
  for (let pos = 12; pos + 8 <= data.length;) {
    const name = textOf(data.subarray(pos, pos + 4)),
      length = view.getUint32(pos + 4, true);
    if (pos + 8 + length > data.length) throw new Error("Chunk WAV truncado.");
    if (name === "fmt " && length >= 16) {
      format = view.getUint16(pos + 8, true);
      channels = view.getUint16(pos + 10, true);
      rate = view.getUint32(pos + 12, true);
      align = view.getUint16(pos + 20, true);
      bits = view.getUint16(pos + 22, true);
    }
    if (name === "data") {
      start = pos + 8;
      size = length;
    }
    pos += 8 + length + (length % 2);
  }
  if (
    format !== 1 ||
    bits !== 16 ||
    !start ||
    channels < 1 ||
    channels > 2 ||
    align !== channels * 2 ||
    rate < 1000 ||
    rate > 96000 ||
    size % align !== 0
  )
    throw new Error("Formato admitido: WAV PCM de 16 bits, mono o estéreo.");
  const frames = size / align;
  if (frames > 960000)
    throw new Error("La grabación excede el límite del analizador.");
  const samples = Array.from(
    { length: channels },
    () => new Int16Array(frames),
  );
  for (let i = 0; i < frames; i++)
    for (let channel = 0; channel < channels; channel++)
      samples[channel][i] = view.getInt16(
        start + i * align + channel * 2,
        true,
      );
  return { sampleRate: rate, channels, frames, samples };
}
export function audioSamples(wave: Wave, mode: string) {
  if (mode === "left") return Float64Array.from(wave.samples[0]);
  if (mode === "right") {
    if (wave.channels < 2) throw new Error("La grabación es mono.");
    return Float64Array.from(wave.samples[1]);
  }
  if (wave.channels === 1) return Float64Array.from(wave.samples[0]);
  return Float64Array.from(wave.samples[0], (sample, i) =>
    mode === "difference"
      ? sample - wave.samples[1][i]
      : (sample + wave.samples[1][i]) / 2,
  );
}
export function audioPayload(wave: Wave, channel: number, bit: number) {
  const source = wave.samples[channel];
  if (!source) throw new Error("Canal no disponible.");
  return readPacket(bitsToBytes(Array.from(source, (n) => (n >> bit) & 1)));
}
export function goertzel(
  samples: ArrayLike<number>,
  start: number,
  count: number,
  rate: number,
  frequency: number,
) {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / rate);
  let a = 0,
    b = 0;
  for (let i = 0; i < count; i++) {
    const value = samples[start + i] + coefficient * a - b;
    b = a;
    a = value;
  }
  return Math.max(0, a * a + b * b - coefficient * a * b);
}
export function decodeFsk(
  wave: Wave,
  mode: string,
  zero: number,
  one: number,
  milliseconds: number,
) {
  if (
    !Number.isFinite(zero) ||
    !Number.isFinite(one) ||
    zero <= 0 ||
    one <= 0 ||
    zero >= wave.sampleRate / 2 ||
    one >= wave.sampleRate / 2 ||
    zero === one ||
    milliseconds < 5 ||
    milliseconds > 200
  )
    throw new Error("Frecuencias o duración fuera de rango.");
  const samples = audioSamples(wave, mode),
    window = Math.round((wave.sampleRate * milliseconds) / 1000);
  const bits: number[] = [];
  for (let pos = 0; pos + window <= samples.length; pos += window)
    bits.push(
      goertzel(samples, pos, window, wave.sampleRate, one) >
        goertzel(samples, pos, window, wave.sampleRate, zero)
        ? 1
        : 0,
    );
  return readPacket(bitsToBytes(bits));
}
export type ZipEntry = {
  name: string;
  size: number;
  compressed: number;
  method: number;
  offset: number;
  crc: number;
};
export function zipEntries(data: Uint8Array): ZipEntry[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let end = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("No se encontró el directorio de un ZIP.");
  const count = view.getUint16(end + 10, true),
    offset = view.getUint32(end + 16, true),
    size = view.getUint32(end + 12, true);
  if (count > 32 || offset + size > end)
    throw new Error("Directorio ZIP fuera de rango.");
  const entries: ZipEntry[] = [];
  let pos = offset;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > data.length || view.getUint32(pos, true) !== 0x02014b50)
      throw new Error("Entrada ZIP dañada.");
    const nameLength = view.getUint16(pos + 28, true),
      extra = view.getUint16(pos + 30, true),
      comment = view.getUint16(pos + 32, true);
    if (
      pos + 46 + nameLength + extra + comment > data.length ||
      nameLength > 256
    )
      throw new Error("Nombre ZIP fuera de rango.");
    if (view.getUint16(pos + 8, true) & 1)
      throw new Error("Este ZIP está cifrado.");
    entries.push({
      name: textOf(data.subarray(pos + 46, pos + 46 + nameLength)),
      size: view.getUint32(pos + 24, true),
      compressed: view.getUint32(pos + 20, true),
      method: view.getUint16(pos + 10, true),
      offset: view.getUint32(pos + 42, true),
      crc: view.getUint32(pos + 16, true),
    });
    pos += 46 + nameLength + extra + comment;
  }
  return entries;
}
function checksum(bytes: Uint8Array) {
  let v = 0xffffffff;
  for (const byte of bytes) {
    v ^= byte;
    for (let b = 0; b < 8; b++) v = (v >>> 1) ^ (v & 1 ? 0xedb88320 : 0);
  }
  return (v ^ 0xffffffff) >>> 0;
}
export async function extractZip(data: Uint8Array, entry: ZipEntry) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength),
    pos = entry.offset;
  if (pos + 30 > data.length || view.getUint32(pos, true) !== 0x04034b50)
    throw new Error("Cabecera local ZIP inválida.");
  const start =
    pos + 30 + view.getUint16(pos + 26, true) + view.getUint16(pos + 28, true);
  if (entry.size > 262144 || start + entry.compressed > data.length)
    throw new Error("Archivo ZIP excede los límites.");
  const source = Uint8Array.from(
    data.subarray(start, start + entry.compressed),
  );
  let result: Uint8Array;
  if (entry.method === 0) result = source;
  else if (entry.method === 8) {
    const stream = new Blob([source.buffer])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    const reader = stream.getReader(),
      chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 262144) {
        await reader.cancel();
        throw new Error("Salida ZIP demasiado grande.");
      }
      chunks.push(value);
    }
    result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
  } else throw new Error("Compresión ZIP no admitida.");
  if (result.length !== entry.size || checksum(result) !== entry.crc)
    throw new Error("La comprobación CRC del archivo falló.");
  return result;
}
