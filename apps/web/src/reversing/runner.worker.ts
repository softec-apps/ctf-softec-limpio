import { parseWasm } from "./wasm";
type RunRequest = { bytes: Uint8Array; input: string };
self.onmessage = async (event: MessageEvent<RunRequest>) => {
  try {
    const { bytes, input } = event.data,
      module = parseWasm(bytes),
      encoded = new TextEncoder().encode(input);
    if (encoded.length > 128)
      throw new Error("La entrada admite hasta 128 bytes UTF-8.");
    const verify = module.exports.find(
        (e) => e.name === "verify" && e.kind === 0,
      ),
      memoryExport = module.exports.find(
        (e) => e.name === "memory" && e.kind === 2 && e.index === 0,
      );
    if (!verify || !memoryExport)
      throw new Error("El módulo no cumple el contrato verify/memory.");
    const signature = module.functions[verify.index];
    if (!signature || signature.params !== 2 || signature.results !== 1)
      throw new Error("verify debe recibir dos i32 y devolver un i32.");
    const source = Uint8Array.from(bytes),
      compiled = await WebAssembly.compile(source.buffer),
      instance = await WebAssembly.instantiate(compiled, {});
    const exported = instance.exports;
    if (
      !(exported.memory instanceof WebAssembly.Memory) ||
      typeof exported.verify !== "function"
    )
      throw new Error("Exportaciones inválidas.");
    const memory = new Uint8Array(exported.memory.buffer);
    memory.set(encoded, 0);
    const result = exported.verify(0, encoded.length);
    let output = "";
    if (
      result === 1 &&
      exported.result_ptr instanceof WebAssembly.Global &&
      exported.result_len instanceof WebAssembly.Global
    ) {
      const pointer = Number(exported.result_ptr.value),
        length = Number(exported.result_len.value);
      if (
        !Number.isInteger(pointer) ||
        !Number.isInteger(length) ||
        pointer < 0 ||
        length < 0 ||
        length > 4096 ||
        pointer + length > memory.length
      )
        throw new Error("El rango del resultado está fuera de memoria.");
      output = new TextDecoder().decode(
        memory.subarray(pointer, pointer + length),
      );
    }
    self.postMessage({ result, output, memory: memory.slice() });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : "No se pudo ejecutar el módulo.",
    });
  }
};
