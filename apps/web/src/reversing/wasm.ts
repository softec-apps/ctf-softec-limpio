// WebAssembly MVP subset used by the laboratory; unsupported features fail explicitly.
class Reader {
  position = 0;
  constructor(
    readonly bytes: Uint8Array,
    readonly base = 0,
  ) {}
  byte() {
    if (this.position >= this.bytes.length) throw new Error("Módulo truncado.");
    return this.bytes[this.position++];
  }
  take(length: number) {
    if (length < 0 || this.position + length > this.bytes.length)
      throw new Error("Rango fuera del módulo.");
    const result = this.bytes.subarray(this.position, this.position + length);
    this.position += length;
    return result;
  }
  unsigned() {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = this.byte();
      if (i === 4 && byte & 0xf0) throw new Error("LEB128 fuera de rango.");
      value |= (byte & 127) << (7 * i);
      if (!(byte & 128)) return value >>> 0;
    }
    throw new Error("LEB128 demasiado largo.");
  }
  signed() {
    let value = 0,
      shift = 0;
    for (let i = 0; i < 5; i++) {
      const byte = this.byte();
      if (i === 4 && (byte & 0x70) !== 0 && (byte & 0x70) !== 0x70)
        throw new Error("i32 fuera de rango.");
      value |= (byte & 127) << shift;
      shift += 7;
      if (!(byte & 128)) {
        if (shift < 32 && byte & 64) value |= ~0 << shift;
        return value | 0;
      }
    }
    throw new Error("LEB128 demasiado largo.");
  }
  count(max = 20000) {
    const count = this.unsigned();
    if (count > max)
      throw new Error("El módulo supera los límites de análisis.");
    return count;
  }
  name() {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      this.take(this.count(256)),
    );
  }
  complete() {
    if (this.position !== this.bytes.length)
      throw new Error("Contenido inesperado en una sección.");
  }
}
export type Instruction = {
  offset: number;
  name: string;
  args: number[];
  depth: number;
};
export type WasmFunction = {
  index: number;
  params: number;
  results: number;
  locals: number;
  instructions: Instruction[];
};
export type WasmModule = {
  sections: { id: number; name: string; offset: number; size: number }[];
  functions: WasmFunction[];
  exports: { name: string; kind: number; index: number }[];
  segments: { offset: number; bytes: Uint8Array }[];
  globals: number[];
};
const sectionNames: Record<number, string> = {
  0: "Custom",
  1: "Type",
  3: "Function",
  5: "Memory",
  6: "Global",
  7: "Export",
  10: "Code",
  11: "Data",
};
const names: Record<number, string> = {
  0x01: "nop",
  0x02: "block",
  0x03: "loop",
  0x04: "if",
  0x05: "else",
  0x0b: "end",
  0x0c: "br",
  0x0d: "br_if",
  0x0f: "return",
  0x10: "call",
  0x1a: "drop",
  0x20: "local.get",
  0x21: "local.set",
  0x22: "local.tee",
  0x28: "i32.load",
  0x2d: "i32.load8_u",
  0x36: "i32.store",
  0x3a: "i32.store8",
  0x41: "i32.const",
  0x45: "i32.eqz",
  0x46: "i32.eq",
  0x47: "i32.ne",
  0x49: "i32.lt_u",
  0x4b: "i32.gt_u",
  0x4d: "i32.le_u",
  0x4f: "i32.ge_u",
  0x6a: "i32.add",
  0x6b: "i32.sub",
  0x6c: "i32.mul",
  0x70: "i32.rem_u",
  0x71: "i32.and",
  0x72: "i32.or",
  0x73: "i32.xor",
  0x74: "i32.shl",
  0x76: "i32.shr_u",
  0x77: "i32.rotl",
  0x78: "i32.rotr",
};
function i32(reader: Reader) {
  if (reader.byte() !== 0x7f) throw new Error("Solo se admiten valores i32.");
}
function expression(reader: Reader) {
  if (reader.byte() !== 0x41)
    throw new Error("Expresión inicial no compatible.");
  const value = reader.signed();
  if (reader.byte() !== 0x0b) throw new Error("Expresión sin cierre.");
  return value;
}
function instructions(reader: Reader) {
  const result: Instruction[] = [];
  let depth = 0,
    closed = false;
  while (reader.position < reader.bytes.length) {
    const offset = reader.base + reader.position,
      opcode = reader.byte(),
      name = names[opcode];
    if (!name)
      throw new Error(`Instrucción no compatible: 0x${opcode.toString(16)}.`);
    const args: number[] = [];
    if (opcode === 0x41) args.push(reader.signed());
    else if ([0x0c, 0x0d, 0x10, 0x20, 0x21, 0x22].includes(opcode))
      args.push(reader.unsigned());
    else if ([0x28, 0x2d, 0x36, 0x3a].includes(opcode))
      args.push(reader.unsigned(), reader.unsigned());
    else if ([2, 3, 4].includes(opcode)) {
      if (reader.byte() !== 0x40)
        throw new Error("Los bloques con resultado no están soportados.");
    }
    if (opcode === 0x0b) {
      if (depth === 0) closed = true;
      else depth--;
    } else if (opcode === 0x05) {
      if (depth < 1) throw new Error("else sin bloque.");
      depth--;
    }
    result.push({ offset, name, args, depth });
    if ([2, 3, 4, 5].includes(opcode)) depth++;
    if (depth > 32 || result.length > 20000)
      throw new Error("Programa demasiado complejo.");
    if (closed) {
      reader.complete();
      break;
    }
  }
  if (!closed || depth !== 0) throw new Error("Función sin cierre.");
  return result;
}
export function parseWasm(bytes: Uint8Array): WasmModule {
  if (bytes.length > 65536)
    throw new Error("El desensamblador admite módulos de hasta 64 KiB.");
  const reader = new Reader(bytes);
  if (Array.from(reader.take(8)).join(",") !== "0,97,115,109,1,0,0,0")
    throw new Error("Se necesita un módulo WebAssembly versión 1.");
  const module: WasmModule = {
      sections: [],
      functions: [],
      exports: [],
      segments: [],
      globals: [],
    },
    types: { params: number; results: number }[] = [],
    functionTypes: number[] = [];
  let last = 0,
    hasMemory = false;
  while (reader.position < bytes.length) {
    const id = reader.byte(),
      size = reader.unsigned(),
      offset = reader.position,
      section = new Reader(reader.take(size), offset);
    if (sectionNames[id] === undefined)
      throw new Error(
        "Sección no compatible: no se admiten imports, start, tablas ni código externo.",
      );
    if (id !== 0) {
      if (id <= last) throw new Error("Secciones duplicadas o desordenadas.");
      last = id;
    }
    module.sections.push({ id, name: sectionNames[id], offset, size });
    switch (id) {
      case 0:
        section.take(size);
        break;
      case 1: {
        const count = section.count(16);
        for (let i = 0; i < count; i++) {
          if (section.byte() !== 0x60) throw new Error("Tipo no compatible.");
          const params = section.count(8);
          for (let p = 0; p < params; p++) i32(section);
          const results = section.count(1);
          for (let p = 0; p < results; p++) i32(section);
          types.push({ params, results });
        }
        break;
      }
      case 3: {
        const count = section.count(16);
        for (let i = 0; i < count; i++) functionTypes.push(section.unsigned());
        break;
      }
      case 5:
        if (
          section.count(1) !== 1 ||
          section.byte() !== 1 ||
          section.unsigned() !== 1 ||
          section.unsigned() !== 1
        )
          throw new Error("Se requiere una memoria fija de 64 KiB.");
        hasMemory = true;
        break;
      case 6: {
        const count = section.count(16);
        for (let i = 0; i < count; i++) {
          i32(section);
          if (section.byte() !== 0)
            throw new Error("Globals mutables no soportados.");
          module.globals.push(expression(section));
        }
        break;
      }
      case 7: {
        const count = section.count(32);
        for (let i = 0; i < count; i++)
          module.exports.push({
            name: section.name(),
            kind: section.byte(),
            index: section.unsigned(),
          });
        break;
      }
      case 10: {
        const count = section.count(16);
        if (count !== functionTypes.length)
          throw new Error("Cantidad de funciones incoherente.");
        for (let i = 0; i < count; i++) {
          const length = section.unsigned(),
            start = section.base + section.position,
            body = new Reader(section.take(length), start),
            groups = body.count(16);
          let locals = 0;
          for (let g = 0; g < groups; g++) {
            locals += body.count(32);
            i32(body);
          }
          if (locals > 32) throw new Error("Demasiadas variables locales.");
          const type = types[functionTypes[i]];
          if (!type) throw new Error("Tipo de función inexistente.");
          module.functions.push({
            index: i,
            ...type,
            locals,
            instructions: instructions(body),
          });
        }
        break;
      }
      case 11: {
        const count = section.count(32);
        for (let i = 0; i < count; i++) {
          if (section.byte() !== 0)
            throw new Error("Segmento de datos no compatible.");
          const address = expression(section),
            data = section.take(section.count(65536));
          if (address < 0 || address + data.length > 65536)
            throw new Error("Datos fuera de memoria.");
          module.segments.push({ offset: address, bytes: data });
        }
        break;
      }
    }
    section.complete();
  }
  if (
    !hasMemory ||
    !module.functions.length ||
    module.functions.length !== functionTypes.length
  )
    throw new Error("Módulo incompleto.");
  return module;
}
export function disassemble(module: WasmModule, fn: WasmFunction) {
  const exports = module.exports
    .filter((e) => e.kind === 0 && e.index === fn.index)
    .map((e) => ` (export "${e.name}")`)
    .join("");
  return [
    `(func $f${fn.index}${exports}${fn.params ? " (param " + Array(fn.params).fill("i32").join(" ") + ")" : ""}${fn.results ? " (result i32)" : ""}`,
    fn.locals ? `  (local ${Array(fn.locals).fill("i32").join(" ")})` : "",
    ...fn.instructions.map(
      (ins) =>
        `${ins.offset.toString(16).padStart(6, "0")}  ${"  ".repeat(ins.depth)}${ins.name}${ins.args.length ? " " + ins.args.map((n) => `${n}`).join(" ") : ""}`,
    ),
    ")",
  ]
    .filter(Boolean)
    .join("\n");
}
export function initialMemory(module: WasmModule) {
  const bytes = new Uint8Array(65536);
  for (const segment of module.segments)
    bytes.set(segment.bytes, segment.offset);
  return bytes;
}
