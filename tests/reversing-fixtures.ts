import { parseWasm, initialMemory } from "../apps/web/src/reversing/wasm";
export function recoverReverseLicense(index: number, bytes: Uint8Array) {
  const module = parseWasm(bytes),
    memory = initialMemory(module),
    key: number[] = [];
  let previous = 55,
    state = 0x13579bdf;
  for (let i = 0; i < 12; i++) {
    const expected = memory[256 + i];
    let byte = expected;
    switch (index) {
      case 1:
        byte = expected ^ 90;
        break;
      case 2:
        byte = (expected - 13) & 255;
        break;
      case 3:
        byte = memory[256 + 11 - i];
        break;
      case 4:
        byte = ((expected >>> 3) | (expected << 5)) & 255;
        break;
      case 5:
        byte = Array.from(memory.subarray(1024, 1280)).indexOf(expected);
        break;
      case 6:
        byte = expected ^ previous;
        previous = byte;
        break;
      case 7:
        byte = i % 2 === 0 ? expected ^ 90 : (expected - 13) & 255;
        break;
      case 8:
        byte = ((expected - i * 7 - 11) * 205) & 255;
        break;
      case 9: {
        const next = new DataView(memory.buffer).getInt32(256 + i * 4, true);
        byte = (next ^ ((state << 5) | (state >>> 27))) & 255;
        state = next;
        break;
      }
    }
    key.push(byte);
  }
  return String.fromCharCode(...key);
}
export async function runReverseProgram(bytes: Uint8Array, key: string) {
  const source = Uint8Array.from(bytes),
    module = await WebAssembly.compile(source.buffer),
    instance = await WebAssembly.instantiate(module, {}),
    exports = instance.exports;
  if (
    !(exports.memory instanceof WebAssembly.Memory) ||
    typeof exports.verify !== "function" ||
    !(exports.result_ptr instanceof WebAssembly.Global) ||
    !(exports.result_len instanceof WebAssembly.Global)
  )
    throw new Error("ABI inválido.");
  const memory = new Uint8Array(exports.memory.buffer),
    input = new TextEncoder().encode(key);
  memory.set(input);
  const result = exports.verify(0, input.length),
    start = Number(exports.result_ptr.value),
    length = Number(exports.result_len.value);
  return {
    result,
    output: new TextDecoder().decode(memory.subarray(start, start + length)),
    memory,
  };
}
