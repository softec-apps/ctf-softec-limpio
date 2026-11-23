import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  runEnigma,
  parsePlugboard,
  type EnigmaSettings,
} from "../packages/enigma-machine";
import {
  cryptoFiles,
  cryptoFlag,
  CRYPTO_CHALLENGES,
  cryptoFolder,
} from "../apps/api/src/crypto/catalog";
const standard: EnigmaSettings = {
  rotors: ["I", "II", "III"],
  rings: [1, 1, 1],
  positions: "AAA",
  reflector: "B",
  plugboard: "",
};
test("Enigma coincide con vectores públicos y avanza antes de cifrar", () => {
  assert.equal(runEnigma("AAAAA", standard).text, "BDZGO");
  assert.equal(runEnigma("HELLOWORLD", standard).text, "ILBDAAMTAZ");
  assert.equal(runEnigma("BDZGO", standard).text, "AAAAA");
  assert.equal(runEnigma("A A\nA A A", standard).positions, "AAF");
  assert.equal(standard.positions, "AAA");
});
test("el rotor central da doble paso y los anillos no desplazan la muesca de la ventana", () => {
  const config = { ...standard, positions: "ADU" };
  assert.equal(runEnigma("A", config).positions, "ADV");
  assert.equal(runEnigma("AA", config).positions, "AEW");
  assert.equal(runEnigma("AAA", config).positions, "BFX");
  assert.equal(
    runEnigma("AAA", { ...config, rings: [4, 11, 19] }).positions,
    "BFX",
  );
});
test("reciprocidad, reflector C, anillos y panel no permiten autocifrado", () => {
  const source = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(8);
  const settings: EnigmaSettings = {
    rotors: ["V", "III", "II"],
    rings: [26, 8, 19],
    positions: "ZQX",
    reflector: "C",
    plugboard: "AV BS CG DL FU HZ IN KM EO RT",
  };
  const cipher = runEnigma(source, settings).text;
  // Independent py-enigma reference, nonzero rings and reflector C.
  assert.equal(cipher.slice(0, 26), "KVQMCMYMQNHPXZEFDMMSSGBJHK");
  assert.equal(runEnigma(cipher, settings).text, source);
  assert.ok([...source].every((letter, index) => letter !== cipher[index]));
  assert.deepEqual(parsePlugboard("AB CD"), parsePlugboard("DC BA"));
});
test("rechaza conexiones, rotores, anillos, posiciones y entradas inválidas", () => {
  for (const plugboard of [
    "AA",
    "AB AC",
    "ABC",
    "AB C1",
    "AB CD EF GH IJ KL MN OP QR ST UV",
  ])
    assert.throws(() => runEnigma("A", { ...standard, plugboard }));
  assert.throws(() =>
    runEnigma("A", { ...standard, rotors: ["I", "I", "III"] }),
  );
  for (const rings of [
    [0, 1, 1],
    [27, 1, 1],
    [1.5, 1, 1],
  ])
    assert.throws(() =>
      runEnigma("A", { ...standard, rings: rings as [number, number, number] }),
    );
  for (const positions of ["AA", "aAA", "A1C"])
    assert.throws(() => runEnigma("A", { ...standard, positions }));
  for (const input of ["Ñ", "A1", "!", "A".repeat(12001)])
    assert.throws(() => runEnigma(input, standard));
});

test("las evidencias permiten recuperar de forma única los dos cables y la contraseña final", () => {
  const files = cryptoFiles("crypto-capas")!;
  const root = "/home/analista/evidencia/";
  assert.equal(
    CRYPTO_CHALLENGES.find((c) => c.id === "crypto-capas")?.title,
    "Enigma",
  );
  assert.equal(cryptoFolder("crypto-capas"), "caso-10");
  const fragments = [
    ...files[root + "lote.txt"].matchAll(
      /Fragmento recibido (\d\d:\d\d:\d\d)\n([A-Z \n]+?)(?=\n\n|$)/g,
    ),
  ];
  assert.equal(fragments.length, 3);
  const cipher = fragments
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map((match) => match[2].replace(/\s/g, ""))
    .join("");
  const known = "AV BS CG DL FU HZ IN KM";
  const free = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter(
    (c) => !known.includes(c),
  );
  const matches: { plugboard: string; text: string }[] = [];
  let candidates = 0;
  // Exhaust the 630 distinct ways of choosing two disjoint pairs among ten free letters.
  for (let a = 0; a < free.length; a++)
    for (let b = a + 1; b < free.length; b++)
      for (let c = a + 1; c < free.length; c++)
        for (let d = c + 1; d < free.length; d++) {
          if (c === b || d === b) continue;
          candidates++;
          const plugboard = `${known} ${free[a]}${free[b]} ${free[c]}${free[d]}`;
          const settings: EnigmaSettings = {
            rotors: ["III", "I", "V"],
            rings: [4, 11, 19],
            positions: "NOX",
            reflector: "B",
            plugboard,
          };
          if (
            runEnigma(cipher.slice(0, "PARALACOORDINADORA".length), settings)
              .text !== "PARALACOORDINADORA"
          )
            continue;
          const text = runEnigma(cipher, settings).text;
          matches.push({ plugboard, text });
        }
  assert.equal(candidates, 630);
  assert.equal(matches.length, 1);
  const text = matches[0].text;
  const answer = text.match(/LACONTRASENAFINALES([A-Z]+)FINDELTRANSMITIDO/)![1];
  assert.equal(answer, "SEVENTECHGDA");
  assert.ok(text.length >= 2 * 83);
  assert.ok(!/[^A-Z]/.test(text));
  assert.equal(cryptoFlag("crypto-capas"), `CTF{${answer}}`);
  assert.ok(
    files[root + "protocolo.txt"].includes(
      createHash("sha256").update(text).digest("hex"),
    ),
  );
  for (const file of Object.values(files))
    assert.ok(!file.includes("SEVENTECH"));
});
