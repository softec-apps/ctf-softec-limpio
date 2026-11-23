import { REVERSE_CASES, reverseFlag, reverseKey } from "./catalog";
import {
  wasmProgram,
  constant as c,
  local as l,
  assign as set,
  call,
  loadByte,
  loadWord,
  storeByte,
} from "./wasm-encoder";
const TARGET = 256,
  ENCRYPTED = 512,
  OUTPUT = 768,
  TABLE = 1024;
const rejectIf = [0x04, 0x40, ...c(0), 0x0f, 0x0b];
const advance = (step = 1) => [...l(2), ...c(step), 0x6a, ...set(2)];
const input = (index: number[]) => [...l(0), ...index, 0x6a, ...loadByte()];
const target = (index: number[]) => [
  ...c(TARGET),
  ...index,
  0x6a,
  ...loadByte(),
];
const loop = (body: number[], length: number) => [
  ...c(0),
  ...set(2),
  0x02,
  0x40,
  0x03,
  0x40,
  ...l(2),
  ...c(length),
  0x4f,
  0x0d,
  1,
  ...body,
  ...advance(),
  0x0c,
  0,
  0x0b,
  0x0b,
];
const rotl = (value: number, bits: number) =>
  (value << bits) | (value >>> (32 - bits));
function expectedBytes(index: number, key: Buffer) {
  let previous = 55,
    state = 0x13579bdf;
  const out: number[] = [];
  for (let i = 0; i < key.length; i++) {
    const byte = key[i];
    switch (index) {
      case 1:
        out.push(byte ^ 90);
        break;
      case 2:
        out.push((byte + 13) & 255);
        break;
      case 3:
        out.push(key[key.length - 1 - i]);
        break;
      case 4:
        out.push(((byte << 3) | (byte >>> 5)) & 255);
        break;
      case 5:
        out.push((byte * 197 + 101) & 255);
        break;
      case 6:
        out.push(byte ^ previous);
        previous = byte;
        break;
      case 7:
        out.push(i % 2 === 0 ? byte ^ 90 : (byte + 13) & 255);
        break;
      case 8:
        out.push((byte * 5 + i * 7 + 11) & 255);
        break;
      case 9:
        state = rotl(state, 5) ^ byte;
        out.push(
          state & 255,
          (state >>> 8) & 255,
          (state >>> 16) & 255,
          (state >>> 24) & 255,
        );
        break;
      default:
        out.push(byte);
    }
  }
  return Buffer.from(out);
}
function checkBody(index: number, length: number) {
  const byte = input(l(2));
  let actual = byte,
    expected = target(l(2));
  switch (index) {
    case 1:
      actual = [...byte, ...c(90), 0x73];
      break;
    case 2:
      actual = [...byte, ...c(13), 0x6a, ...c(255), 0x71];
      break;
    case 3:
      actual = input([...c(length - 1), ...l(2), 0x6b]);
      break;
    case 4:
      actual = [
        ...byte,
        ...c(3),
        0x74,
        ...byte,
        ...c(5),
        0x76,
        0x72,
        ...c(255),
        0x71,
      ];
      break;
    case 5:
      actual = [...c(TABLE), ...byte, 0x6a, ...loadByte()];
      break;
    case 6:
      actual = [...byte, ...l(3), 0x73];
      break;
    case 8:
      actual = [
        ...byte,
        ...c(5),
        0x6c,
        ...l(2),
        ...c(7),
        0x6c,
        0x6a,
        ...c(11),
        0x6a,
        ...c(255),
        0x71,
      ];
      break;
    case 9:
      actual = [...l(3), ...c(5), 0x77, ...byte, 0x73, 0x22, 3];
      expected = [...c(TARGET), ...l(2), ...c(4), 0x6c, 0x6a, ...loadWord()];
      break;
  }
  return [
    ...actual,
    ...expected,
    0x47,
    ...rejectIf,
    ...(index === 6 ? [...byte, ...set(3)] : []),
  ];
}
function decodeOutput(length: number, keyLength: number) {
  return loop(
    [
      ...c(OUTPUT),
      ...l(2),
      0x6a,
      ...c(ENCRYPTED),
      ...l(2),
      0x6a,
      ...loadByte(),
      ...input([...l(2), ...c(keyLength), 0x70]),
      0x73,
      ...storeByte(),
    ],
    length,
  );
}
export function buildReverseProgram(index: number) {
  const entry = REVERSE_CASES[index],
    key = Buffer.from(reverseKey(entry.id)),
    flag = Buffer.from(reverseFlag(entry.id));
  const segments = [
    { offset: TARGET, bytes: expectedBytes(index, key) },
    {
      offset: ENCRYPTED,
      bytes: Buffer.from(flag.map((byte, i) => byte ^ key[i % key.length])),
    },
  ];
  if (index === 5)
    segments.push({
      offset: TABLE,
      bytes: Buffer.from(
        Array.from({ length: 256 }, (_, i) => (i * 197 + 101) & 255),
      ),
    });
  if (index === 7)
    segments.push({
      offset: TABLE,
      bytes: Buffer.from("guest\0Invitado: consulta sin autorizacion\0"),
    });
  const checks =
    index === 7
      ? [
          ...l(0),
          ...l(1),
          ...call(1),
          0x45,
          ...rejectIf,
          ...l(0),
          ...l(1),
          ...call(2),
          0x45,
          ...rejectIf,
        ]
      : [
          ...(index === 6
            ? [...c(55), ...set(3)]
            : index === 9
              ? [...c(0x13579bdf), ...set(3)]
              : []),
          ...loop(checkBody(index, key.length), key.length),
        ];
  const verify = {
    params: 2,
    locals: 2,
    code: [
      ...l(1),
      ...c(key.length),
      0x47,
      ...rejectIf,
      ...checks,
      ...decodeOutput(flag.length, key.length),
      ...c(1),
    ],
  };
  const functions = [verify];
  if (index === 7) {
    for (let parity = 0; parity < 2; parity++)
      functions.push({
        params: 2,
        locals: 2,
        code: [
          ...c(parity),
          ...set(2),
          0x02,
          0x40,
          0x03,
          0x40,
          ...l(2),
          ...c(key.length),
          0x4f,
          0x0d,
          1,
          ...checkBody(parity + 1, key.length),
          ...advance(2),
          0x0c,
          0,
          0x0b,
          0x0b,
          ...c(1),
        ],
      });
  }
  return wasmProgram(functions, segments, flag.length);
}
