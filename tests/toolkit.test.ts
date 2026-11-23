import {
  transformText,
  sha256Text,
} from "../apps/web/src/web-lab/toolkit/textTransforms";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareLines,
  comparisonText,
} from "../apps/web/src/web-lab/toolkit/lineComparison";
import {
  formatJson,
  validateJson,
} from "../apps/web/src/web-lab/toolkit/jsonTools";

test("el comparador alinea una inserción sin marcar las líneas posteriores", () => {
  const rows = compareLines("inicio\nfin", "inicio\nnueva\nfin");
  assert.deepEqual(
    rows.map((row) => row.kind),
    ["equal", "added", "equal"],
  );
  assert.equal(rows[2].leftNumber, 2);
  assert.equal(rows[2].rightNumber, 3);
  assert.equal(rows[1].left, null);
  assert.equal(rows[1].right, "nueva");
});
test("el comparador distingue reemplazos y eliminaciones", () => {
  const rows = compareLines("estado=viejo\nextra\nfin", "estado=nuevo\nfin");
  assert.deepEqual(
    rows.map((row) => row.kind),
    ["changed", "removed", "equal"],
  );
  assert.match(
    comparisonText(rows),
    /- estado=viejo\n\+ estado=nuevo\n- extra/,
  );
});
test("el comparador conserva líneas vacías y repetidas y normaliza finales de línea", () => {
  assert.ok(
    compareLines("a\r\n\r\na", "a\n\na").every((row) => row.kind === "equal"),
  );
  const rows = compareLines("a\na\nb", "a\nb");
  assert.equal(rows.filter((row) => row.kind === "removed").length, 1);
  assert.equal(rows.filter((row) => row.kind === "equal").length, 2);
  assert.deepEqual(compareLines("", ""), []);
  assert.equal(compareLines("", "contenido")[0].kind, "added");
  assert.equal(compareLines("contenido", "")[0].kind, "removed");
});
test("el comparador detecta espacios y limita el trabajo sin truncar resultados", () => {
  assert.equal(compareLines("texto ", "texto")[0].kind, "changed");
  assert.throws(() => compareLines("x".repeat(20001), ""), /20.000/);
  assert.throws(() => compareLines(Array(401).fill("x").join("\n"), ""), /400/);
  assert.equal(compareLines(Array(400).fill("x").join("\n"), "").length, 400);
});
test("dar formato y compactar conserva objetos, listas, Unicode y primitivas JSON", () => {
  for (const source of [
    '{"mensaje":"Guaranda 🏔️","lista":[false,null,1.25]}',
    "null",
    "0",
    "false",
    '"texto"',
    "[]",
  ]) {
    validateJson(source);
    const pretty = formatJson(source, "pretty");
    assert.deepEqual(JSON.parse(pretty), JSON.parse(source));
    assert.equal(
      formatJson(pretty, "compact"),
      JSON.stringify(JSON.parse(source)),
    );
  }
  assert.match(formatJson('{"a":1}', "pretty"), /\n  "a": 1\n/);
});
test("el editor distingue sintaxis inválida y límites de formato sin alterar números", () => {
  for (const source of ["", "{", '{"a":1,}', "undefined"]) {
    assert.throws(() => validateJson(source));
    assert.throws(() => formatJson(source, "pretty"));
  }
  for (const source of ['{"valor":9007199254740993}', '{"valor":1e309}']) {
    assert.doesNotThrow(() => validateJson(source));
    assert.throws(() => formatJson(source, "pretty"), /rango seguro/);
  }
  assert.throws(() => validateJson('"' + "x".repeat(50000) + '"'), /50.000/);
});
test("el editor trata el contenido como datos y conserva claves especiales", () => {
  const source =
    '{"__proto__":{"kit_test":true},"texto":"<script>alert(1)</script>"}';
  const formatted = formatJson(source, "pretty");
  assert.ok(formatted.includes('"__proto__"'));
  assert.ok(formatted.includes("<script>"));
  assert.equal(
    Object.prototype.hasOwnProperty.call(Object.prototype, "kit_test"),
    false,
  );
});

test("el inspector resuelve servicios por URL sin seleccionar un reto", async () => {
  const { resolveLabTarget } =
    await import("../apps/web/src/web-lab/toolkit/labTarget");
  const { WEB_LABS } = await import("../apps/web/src/web-lab/catalog");
  for (const [id, profile] of Object.entries(WEB_LABS))
    assert.equal(resolveLabTarget(profile.home).id, id);
  assert.equal(
    resolveLabTarget("/robots.txt", "http://estado.seventech.local/").url,
    "http://estado.seventech.local/robots.txt",
  );
  for (const address of [
    "http://example.com/",
    "http://127.0.0.1/",
    "file:///etc/passwd",
    "http://user:pass@estado.seventech.local/",
    "http://estado.seventech.local/#fragmento",
    "no-es-direccion",
  ])
    assert.throws(() => resolveLabTarget(address));
});
test("el transformador local conserva Unicode y múltiples líneas", async () => {
  const { transformText } =
    await import("../apps/web/src/web-lab/toolkit/textTransforms");
  const text = "Guaranda 🏔️\n" + "Texto de trabajo ".repeat(40);
  for (const [encode, decode] of [
    ["b64-encode", "b64-decode"],
    ["b64url-encode", "b64url-decode"],
    ["url-encode", "url-decode"],
  ])
    assert.equal(transformText(decode, transformText(encode, text)), text);
  assert.match(transformText("b64url-encode", text), /^[A-Za-z0-9_-]+$/);
});
test("XOR usa los bytes de la clave y no depende del reto activo", async () => {
  const { transformText } =
    await import("../apps/web/src/web-lab/toolkit/textTransforms");
  const text = "Texto privado de prueba";
  const key = "clave";
  const secret = Buffer.from(key);
  const hex = Buffer.from(
    Buffer.from(text).map(
      (byte, index) => byte ^ secret[index % secret.length],
    ),
  ).toString("hex");
  assert.equal(transformText("xor", hex, key), text);
});
test("el transformador rechaza entradas inválidas y limita el tamaño", async () => {
  const { transformText } =
    await import("../apps/web/src/web-lab/toolkit/textTransforms");
  assert.throws(() => transformText("xor", "zz", "clave"));
  assert.throws(() => transformText("xor", "01", ""));
  assert.throws(() => transformText("b64-decode", "<no valido>"));
  assert.throws(() => transformText("url-decode", "%zz"));
  assert.throws(() => transformText("desconocida", "texto"));
  assert.throws(() => transformText("b64-encode", "x".repeat(20001)), /20.000/);
});

test("hexadecimal y binario respetan bytes UTF-8 y rechazan entradas incompletas", () => {
  const text = "Oficina: ñ\n";
  const bytes = new TextEncoder().encode(text);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    " ",
  );
  const binary = Array.from(bytes, (b) => b.toString(2).padStart(8, "0")).join(
    "\n",
  );
  assert.equal(transformText("hex-decode", hex), text);
  assert.equal(transformText("binary-decode", binary), text);
  for (const value of ["f", "zz", "ff"])
    assert.throws(() => transformText("hex-decode", value));
  for (const value of ["0101", "abcdefgh", "11111111"])
    assert.throws(() => transformText("binary-decode", value));
});

test("Vigenère conserva símbolos y solo avanza la clave con letras", () => {
  assert.equal(
    transformText("vigenere-decode", "Lxfopv ef rnhr! 123", "LEMON"),
    "Attack at dawn! 123",
  );
  assert.equal(transformText("vigenere-decode", "B-2b", "B"), "A-2a");
  assert.throws(() => transformText("vigenere-decode", "text", ""));
  assert.throws(() => transformText("vigenere-decode", "text", "niño"));
});

test("el inspector resuelve los diez archivos OSINT sin mezclarlos con OWASP", async () => {
  const { resolveLabTarget } =
    await import("../apps/web/src/web-lab/toolkit/labTarget");
  const { WEB_LABS } = await import("../apps/web/src/web-lab/catalog");
  assert.equal(Object.keys(WEB_LABS).length, 10);
  for (let n = 1; n <= 10; n++) {
    const code = String(n).padStart(2, "0");
    assert.equal(
      resolveLabTarget(`http://fuentes-${code}.seventech.local/`).id,
      `osint-${code}`,
    );
  }
});

import { parseCsv } from "../apps/web/src/evidence/csv";
test("CSV conserva campos entre comillas, comas y saltos de línea", () => {
  assert.deepEqual(
    parseCsv('nombre,nota\r\n"A, B","dos\nlineas"\r\nC,"dice ""hola"""\r\n'),
    [
      ["nombre", "nota"],
      ["A, B", "dos\nlineas"],
      ["C", 'dice "hola"'],
    ],
  );
  assert.deepEqual(parseCsv("a,b\n1,"), [
    ["a", "b"],
    ["1", ""],
  ]);
  assert.throws(() => parseCsv('a,"sin cierre'), /sin cerrar/);
});

test("SHA256 conserva bytes UTF8 y saltos de línea del programa", async () => {
  const { createHash } = await import("node:crypto");
  const source = "LD ENABLE\nST FAN_RUN";
  assert.equal(
    await sha256Text(source),
    createHash("sha256").update(source).digest("hex"),
  );
  assert.notEqual(await sha256Text(source + "\n"), await sha256Text(source));
  await assert.rejects(sha256Text("x".repeat(20001)), /20.000/);
});
