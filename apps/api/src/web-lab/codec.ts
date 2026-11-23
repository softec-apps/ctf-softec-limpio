import { BadRequestException } from "@nestjs/common";
export function xorHex(hex: string, key: string) {
  if (
    !/^(?:[a-f0-9]{2})+$/i.test(hex) ||
    hex.length > 400 ||
    !key ||
    key.length > 64
  )
    throw new BadRequestException("Hexadecimal o clave no válidos.");
  const bytes = Buffer.from(hex, "hex");
  const secret = Buffer.from(key, "utf8");
  return Buffer.from(
    bytes.map((byte, index) => byte ^ secret[index % secret.length]),
  ).toString("utf8");
}
export function codecCommand(args: string[]) {
  if (!args.length || args[0] === "-h")
    return "codec / laboratorio\n\ncodec b64-encode <texto>\ncodec b64-decode <base64>\ncodec url-encode <texto>\ncodec url-decode <texto>\ncodec b64url-encode <texto>\ncodec b64url-decode <base64url>\ncodec xor <hexadecimal> <clave>\n\nSolo transforma texto local; no ejecuta código.";
  const [mode, ...rest] = args;
  const text = rest.join(" ");
  try {
    if (mode === "xor" && rest.length === 2) return xorHex(rest[0], rest[1]);
    if (mode === "b64-encode" || mode === "b64url-encode")
      return Buffer.from(text).toString(
        mode === "b64-encode" ? "base64" : "base64url",
      );
    if (
      (mode === "b64-decode" || mode === "b64url-decode") &&
      /^[A-Za-z0-9+/_=-]+$/.test(text)
    )
      return Buffer.from(
        text,
        mode === "b64-decode" ? "base64" : "base64url",
      ).toString("utf8");
    if (mode === "url-encode") return encodeURIComponent(text);
    if (mode === "url-decode") return decodeURIComponent(text);
  } catch (error) {
    if (error instanceof BadRequestException || error instanceof URIError)
      return "codec: " + error.message;
    throw error;
  }
  return "codec: argumentos inválidos. Consulta codec -h.";
}
