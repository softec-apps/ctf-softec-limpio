import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REVERSE_CASES,
  REVERSE_ROOT,
  REVERSE_CHALLENGES,
  reverseFlag,
  reverseKey,
} from "../apps/api/src/reversing/catalog";
import {
  readReverseBytes,
  readReverseFile,
} from "../apps/api/src/reversing/artifacts";
import { readWorkstationFile } from "../apps/api/src/workstation-files";
import { readWorkstationBytes } from "../apps/api/src/workstation-binary";
import { workstationFileCommand } from "../apps/api/src/workstation-file-commands";
import {
  parseWasm,
  disassemble,
  initialMemory,
} from "../apps/web/src/reversing/wasm";
import { recoverReverseLicense, runReverseProgram } from "./reversing-fixtures";
const enabled = REVERSE_CASES.map((c) => c.id);
test("diez escenarios independientes, 19 puntos y catálogo sin claves", () => {
  assert.equal(REVERSE_CASES.length, 10);
  assert.equal(
    REVERSE_CHALLENGES.reduce((s, c) => s + c.points, 0),
    19,
  );
  for (const c of REVERSE_CASES) {
    assert.ok(!JSON.stringify(REVERSE_CHALLENGES).includes(reverseKey(c.id)));
    assert.ok(!JSON.stringify(REVERSE_CHALLENGES).includes(reverseFlag(c.id)));
  }
});
for (const c of REVERSE_CASES)
  test(`${c.id}: desensamblar, reconstruir licencia y ejecutar WebAssembly real`, async () => {
    const bytes = readReverseBytes(enabled, c.folder + "/" + c.file).bytes;
    assert.ok(WebAssembly.validate(Uint8Array.from(bytes).buffer));
    const module = parseWasm(bytes),
      code = module.functions.map((fn) => disassemble(module, fn)).join("\n");
    assert.match(code, /i32.load8_u/);
    assert.match(code, /loop/);
    for (const fn of module.functions)
      for (const ins of fn.instructions)
        if (ins.name === "i32.const") assert.equal(bytes[ins.offset], 0x41);
    assert.equal(initialMemory(module).length, 65536);
    assert.ok(!bytes.includes(Buffer.from(reverseFlag(c.id))));
    const key = recoverReverseLicense(c.index, bytes);
    assert.equal(key, reverseKey(c.id));
    assert.equal((await runReverseProgram(bytes, "")).result, 0);
    assert.equal((await runReverseProgram(bytes, "x".repeat(12))).result, 0);
    for (let i = 0; i < key.length; i++) {
      const mutated =
        key.slice(0, i) + (key[i] === "0" ? "1" : "0") + key.slice(i + 1);
      assert.equal((await runReverseProgram(bytes, mutated)).result, 0);
    }
    const result = await runReverseProgram(bytes, key);
    assert.equal(result.result, 1);
    assert.equal(result.output, reverseFlag(c.id));
    if (c.index === 7) {
      assert.equal(module.functions.length, 3);
      assert.equal((await runReverseProgram(bytes, "guest")).result, 0);
      assert.match(code, /call 1/);
      assert.match(code, /call 2/);
    }
  });
test("archivos y caché respetan enabled; rutas del sistema nunca se montan", () => {
  const c = REVERSE_CASES[0],
    path = c.folder + "/" + c.file;
  assert.equal(readReverseBytes(enabled, path).mime, "application/wasm");
  assert.throws(() => readReverseBytes([], path));
  assert.throws(() => readReverseFile([], c.folder));
  assert.throws(() => readWorkstationFile(enabled, c.folder + "/../../.env"));
  assert.ok(!("content" in readReverseFile(enabled, path)));
  assert.equal(readWorkstationFile(enabled, REVERSE_ROOT).type, "directory");
  assert.equal(
    readWorkstationBytes(enabled, path).bytes,
    readReverseBytes(enabled, path).bytes,
  );
  assert.match(
    workstationFileCommand(enabled, `file ${path}`, "/home/analista").output,
    /WebAssembly/,
  );
});
test("ls conserva el listado simple y aplica el formato largo y las entradas especiales", () => {
  const current = REVERSE_CASES[0];
  const cwd = current.folder;
  const run = (command: string) =>
    workstationFileCommand(enabled, command, cwd);
  const names = ["LEEME.txt", "ABI.txt", current.file];
  assert.deepEqual(run("ls"), { output: names.join("\n"), cwd });
  assert.deepEqual(run("ls -a"), {
    output: [".", "..", ...names].join("\n"),
    cwd,
  });
  const longFiles = names.map(
    (name) => `-rw-r--r--  analista analista  ${name}`,
  );
  assert.deepEqual(run("ls -l"), { output: longFiles.join("\n"), cwd });
  const longAll = [
    "drwxr-xr-x  analista analista  .",
    "drwxr-xr-x  analista analista  ..",
    ...longFiles,
  ].join("\n");
  for (const command of ["ls -la", "ls -al .", "ls -l -a"]) {
    assert.deepEqual(run(command), { output: longAll, cwd });
  }
  assert.deepEqual(run("ls -l LEEME.txt"), { output: longFiles[0], cwd });
});

test("ls rechaza opciones desconocidas antes de consultar la ruta", () => {
  const cwd = REVERSE_CASES[0].folder;
  assert.deepEqual(workstationFileCommand(enabled, "ls -x inexistente", cwd), {
    output: "ls: opción no disponible. Usa ls [-l] [-a] [ruta].",
    cwd,
  });
});

test("el lector rechaza código externo, memoria ilimitada, truncamientos y versiones desconocidas", () => {
  const header = [0, 97, 115, 109, 1, 0, 0, 0];
  assert.throws(() => parseWasm(new Uint8Array()));
  assert.throws(
    () => parseWasm(Uint8Array.from([...header, 2, 1, 0])),
    /imports/,
  );
  assert.throws(
    () => parseWasm(Uint8Array.from([...header, 8, 1, 0])),
    /start/,
  );
  assert.throws(
    () => parseWasm(Uint8Array.from([...header, 5, 3, 1, 0, 1])),
    /memoria fija/,
  );
  assert.throws(
    () =>
      parseWasm(Uint8Array.from([...header, 1, 0xff, 0xff, 0xff, 0xff, 0xff])),
    /rango/i,
  );
  assert.throws(() => parseWasm(new Uint8Array(65537)), /64 KiB/);
  const c = REVERSE_CASES[0],
    bytes = readReverseBytes(enabled, c.folder + "/" + c.file).bytes;
  assert.throws(() => parseWasm(bytes.subarray(0, bytes.length - 1)), /rango/i);
});
