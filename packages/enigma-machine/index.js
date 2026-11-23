// Enigma I wiring and turnover letters: Crypto Museum, /crypto/enigma/wiring.htm.
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const rotors = {
  I: ["EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q"],
  II: ["AJDKSIRUXBLHWTMCQGZNPYFVOE", "E"],
  III: ["BDFHJLCPRTXVZNYEIWGAKMUSQO", "V"],
  IV: ["ESOVPZJAYQUIRHXLNFTGKDCMWB", "J"],
  V: ["VZBRGITYUPSDNHLXAWMJQOFECK", "Z"],
};
const reflectors = {
  B: "YRUHQSLDPXNGOKMIEBFZCWVJAT",
  C: "FVPJIAOYEDRZXWGCTKUQSBNMHL",
};
export const ROTOR_NAMES = Object.freeze(Object.keys(rotors));
const mod = (value) => ((value % 26) + 26) % 26;

export function parsePlugboard(source = "") {
  if (typeof source !== "string" || source.length > 100)
    throw Error("El panel admite hasta diez parejas de letras.");
  const pairs = source.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (pairs.length > 10) throw Error("El panel admite hasta diez parejas.");
  const used = new Set();
  const mapping = Array.from({ length: 26 }, (_, i) => i);
  for (const pair of pairs) {
    if (!/^[A-Z]{2}$/.test(pair) || pair[0] === pair[1])
      throw Error("Usa parejas distintas de A a Z, separadas por espacios.");
    for (const letter of pair) {
      if (used.has(letter))
        throw Error(`La letra ${letter} ya tiene conexión.`);
      used.add(letter);
    }
    const [a, b] = [...pair].map((letter) => alphabet.indexOf(letter));
    mapping[a] = b;
    mapping[b] = a;
  }
  return mapping;
}

export function runEnigma(text, settings) {
  if (typeof text !== "string" || text.length > 12000)
    throw Error("La máquina admite hasta 12.000 caracteres.");
  if (!/^[a-z\s]*$/i.test(text))
    throw Error(
      "Enigma solo admite letras A–Z y espacios; retira números y signos.",
    );
  if (
    !settings ||
    !Array.isArray(settings.rotors) ||
    settings.rotors.length !== 3 ||
    settings.rotors.some((name) => !Object.hasOwn(rotors, name)) ||
    new Set(settings.rotors).size !== 3
  )
    throw Error("Elige tres rotores diferentes.");
  if (
    typeof settings.positions !== "string" ||
    !/^[A-Z]{3}$/.test(settings.positions)
  )
    throw Error("Indica tres posiciones iniciales, de A a Z.");
  if (
    !Array.isArray(settings.rings) ||
    settings.rings.length !== 3 ||
    settings.rings.some(
      (ring) => !Number.isInteger(ring) || ring < 1 || ring > 26,
    )
  )
    throw Error("Los anillos deben estar entre 1 y 26.");
  if (!Object.hasOwn(reflectors, settings.reflector))
    throw Error("Elige reflector B o C.");
  const plugs = parsePlugboard(settings.plugboard);
  const wheels = settings.rotors.map((name) => rotors[name]);
  const positions = [...settings.positions].map((letter) =>
    alphabet.indexOf(letter),
  );
  const rings = settings.rings.map((ring) => ring - 1);
  let output = "";
  for (const letter of text.toUpperCase().replace(/\s/g, "")) {
    // Pawls inspect the window letters BEFORE stepping, including the double step.
    const middleNotch = alphabet[positions[1]] === wheels[1][1];
    const rightNotch = alphabet[positions[2]] === wheels[2][1];
    if (middleNotch) positions[0] = mod(positions[0] + 1);
    if (middleNotch || rightNotch) positions[1] = mod(positions[1] + 1);
    positions[2] = mod(positions[2] + 1);
    let signal = plugs[alphabet.indexOf(letter)];
    for (let i = 2; i >= 0; i--) {
      const offset = positions[i] - rings[i];
      signal = mod(
        alphabet.indexOf(wheels[i][0][mod(signal + offset)]) - offset,
      );
    }
    signal = alphabet.indexOf(reflectors[settings.reflector][signal]);
    for (let i = 0; i < 3; i++) {
      const offset = positions[i] - rings[i];
      signal = mod(
        wheels[i][0].indexOf(alphabet[mod(signal + offset)]) - offset,
      );
    }
    output += alphabet[plugs[signal]];
  }
  return {
    text: output,
    positions: positions.map((position) => alphabet[position]).join(""),
  };
}
