export function unsigned(value: number): number[] {
  const bytes: number[] = [];
  do {
    let byte = value & 127;
    value >>>= 7;
    if (value) byte |= 128;
    bytes.push(byte);
  } while (value);
  return bytes;
}
function signed(value: number): number[] {
  const bytes: number[] = [];
  let more = true;
  while (more) {
    let byte = value & 127;
    value >>= 7;
    more = !(
      (value === 0 && !(byte & 64)) ||
      (value === -1 && Boolean(byte & 64))
    );
    if (more) byte |= 128;
    bytes.push(byte);
  }
  return bytes;
}
export const constant = (value: number) => [0x41, ...signed(value)];
export const local = (index: number) => [0x20, ...unsigned(index)];
export const assign = (index: number) => [0x21, ...unsigned(index)];
export const call = (index: number) => [0x10, ...unsigned(index)];
export const loadByte = (offset = 0) => [0x2d, 0, ...unsigned(offset)];
export const loadWord = (offset = 0) => [0x28, 2, ...unsigned(offset)];
export const storeByte = (offset = 0) => [0x3a, 0, ...unsigned(offset)];
const vector = (entries: number[][]) => [
  ...unsigned(entries.length),
  ...entries.flat(),
];
const text = (value: string) => {
  const bytes = Array.from(Buffer.from(value));
  return [...unsigned(bytes.length), ...bytes];
};
const section = (id: number, bytes: number[]) => [
  id,
  ...unsigned(bytes.length),
  ...bytes,
];
export function wasmProgram(
  functions: { params: number; locals: number; code: number[] }[],
  segments: { offset: number; bytes: Uint8Array }[],
  outputLength: number,
) {
  const types = vector(
    functions.map((fn) => [
      0x60,
      ...vector(Array.from({ length: fn.params }, () => [0x7f])),
      1,
      0x7f,
    ]),
  );
  const bodies = vector(
    functions.map((fn) => {
      const body = [
        ...(fn.locals ? [1, ...unsigned(fn.locals), 0x7f] : [0]),
        ...fn.code,
        0x0b,
      ];
      return [...unsigned(body.length), ...body];
    }),
  );
  const exports = vector([
    [...text("verify"), 0, 0],
    [...text("memory"), 2, 0],
    [...text("result_ptr"), 3, 0],
    [...text("result_len"), 3, 1],
  ]);
  const data = vector(
    segments.map((segment) => [
      0,
      ...constant(segment.offset),
      0x0b,
      ...unsigned(segment.bytes.length),
      ...segment.bytes,
    ]),
  );
  return Buffer.from([
    0,
    97,
    115,
    109,
    1,
    0,
    0,
    0,
    ...section(1, types),
    ...section(3, vector(functions.map((_, i) => unsigned(i)))),
    ...section(5, [1, 1, 1, 1]),
    ...section(
      6,
      vector([
        [0x7f, 0, ...constant(768), 0x0b],
        [0x7f, 0, ...constant(outputLength), 0x0b],
      ]),
    ),
    ...section(7, exports),
    ...section(10, bodies),
    ...section(11, data),
  ]);
}
