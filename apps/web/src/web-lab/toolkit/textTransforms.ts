const decoder = new TextDecoder("utf-8", { fatal: true });
export async function sha256Text(input: string) {
  if (input.length > 20000)
    throw new Error("La entrada admite hasta 20.000 caracteres.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
function bytesFromBase64(source: string, url: boolean) {
  const pattern = url ? /^[A-Za-z0-9_-]*={0,2}$/ : /^[A-Za-z0-9+/]*={0,2}$/;
  if (!pattern.test(source))
    throw new Error("El texto no tiene un formato Base64 válido.");
  const binary = atob(
    url ? source.replace(/-/g, "+").replace(/_/g, "/") : source,
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
export function transformText(operation: string, input: string, key = "") {
  if (input.length > 20000)
    throw new Error("La entrada admite hasta 20.000 caracteres.");
  if (operation === "hex-decode") {
    const source = input.replace(/\s/g, "");
    if (!/^(?:[0-9a-f]{2})+$/i.test(source))
      throw new Error("Introduce parejas hexadecimales completas.");
    return decoder.decode(
      Uint8Array.from(source.match(/../g)!, (pair) => parseInt(pair, 16)),
    );
  }
  if (operation === "binary-decode") {
    const source = input.trim().replace(/\s/g, "");
    if (!/^(?:[01]{8})+$/.test(source))
      throw new Error("Introduce grupos completos de ocho bits.");
    return decoder.decode(
      Uint8Array.from(source.match(/.{8}/g)!, (byte) => parseInt(byte, 2)),
    );
  }
  if (operation === "vigenere-decode") {
    if (!/^[a-z]{1,64}$/i.test(key))
      throw new Error("La clave debe contener de 1 a 64 letras A–Z, sin Ñ.");
    let position = 0;
    const upperKey = key.toUpperCase();
    return input.replace(/[a-z]/gi, (letter) => {
      const base = letter === letter.toUpperCase() ? 65 : 97;
      const shift = upperKey.charCodeAt(position++ % key.length) - 65;
      return String.fromCharCode(
        base + ((letter.charCodeAt(0) - base - shift + 26) % 26),
      );
    });
  }
  if (operation === "b64-encode" || operation === "b64url-encode") {
    const encoded = btoa(
      Array.from(new TextEncoder().encode(input), (byte) =>
        String.fromCharCode(byte),
      ).join(""),
    );
    return operation === "b64url-encode"
      ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
      : encoded;
  }
  if (operation === "b64-decode" || operation === "b64url-decode")
    return decoder.decode(
      bytesFromBase64(input, operation === "b64url-decode"),
    );
  if (operation === "url-encode") return encodeURIComponent(input);
  if (operation === "reverse") return Array.from(input).reverse().join("");
  if (operation === "b64-utf16le") {
    const bytes = bytesFromBase64(input, false);
    if (bytes.length % 2) throw new Error("UTF-16LE requiere pares de bytes.");
    return new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
  }
  if (operation === "url-decode") return decodeURIComponent(input);
  if (operation === "xor") {
    if (!/^(?:[a-f0-9]{2})+$/i.test(input) || !key || key.length > 64)
      throw new Error(
        "Introduce un hexadecimal válido y una clave de 1 a 64 caracteres.",
      );
    const secret = new TextEncoder().encode(key);
    const bytes = Uint8Array.from(input.match(/../g) ?? [], (pair) =>
      Number.parseInt(pair, 16),
    );
    return decoder.decode(
      bytes.map((byte, index) => byte ^ secret[index % secret.length]),
    );
  }
  throw new Error("Operación de texto no disponible.");
}

export async function sha256Hex(input: string) {
  const hex = input.replace(/\s/g, "");
  if (hex.length > 20000 || !/^(?:[a-f0-9]{2})*$/i.test(hex))
    throw new Error(
      "Introduce bytes hexadecimales completos (máximo 10.000 bytes).",
    );
  const bytes = Uint8Array.from(hex.match(/../g) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
