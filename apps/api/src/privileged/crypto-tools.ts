import {
  createDecipheriv,
  createHash,
  createHmac,
  pbkdf2Sync,
} from "node:crypto";
import { gunzipSync } from "node:zlib";
import { words } from "../command-words";
export function cryptoTool(command: string) {
  const [, operation, ...args] = words(command);
  const hex = (value: string, size?: number) => {
    if (
      !/^(?:[a-f0-9]{2})+$/i.test(value) ||
      (size !== undefined && value.length !== size * 2)
    )
      throw new Error("Longitud o formato hexadecimal no válido.");
    return Buffer.from(value, "hex");
  };
  if (!operation || operation === "help")
    return "crypto gunzip BASE64\ncrypto sha256 TEXTO\ncrypto sha256-hex BYTES_HEX\ncrypto pbkdf2 TEXTO SAL_HEX ITERACIONES\ncrypto decrypt-gcm CLAVE_HEX IV_HEX TAG_HEX CIFRADO_HEX\ncrypto hmac CLAVE_HEX TEXTO\nUsa comillas para conservar espacios y separadores. Las operaciones procesan datos virtuales; no ejecutan archivos.";
  if (operation === "gunzip" && args.length === 1)
    return gunzipSync(Buffer.from(args[0], "base64"), {
      maxOutputLength: 8192,
    }).toString("utf8");
  if (operation === "sha256-hex" && args.length === 1)
    return createHash("sha256").update(hex(args[0])).digest("hex");
  if (operation === "sha256" && args.length === 1)
    return createHash("sha256").update(args[0]).digest("hex");
  if (operation === "pbkdf2" && args.length === 3) {
    const iterations = Number(args[2]);
    if (
      !Number.isSafeInteger(iterations) ||
      iterations < 1 ||
      iterations > 10000
    )
      throw new Error("Iteraciones permitidas: 1 a 10000.");
    return pbkdf2Sync(args[0], hex(args[1]), iterations, 32, "sha256").toString(
      "hex",
    );
  }
  if (operation === "decrypt-gcm" && args.length === 4) {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      hex(args[0], 32),
      hex(args[1], 12),
    );
    decipher.setAuthTag(hex(args[2], 16));
    return Buffer.concat([
      decipher.update(hex(args[3])),
      decipher.final(),
    ]).toString("utf8");
  }
  if (operation === "hmac" && args.length === 2)
    return createHmac("sha256", hex(args[0])).update(args[1]).digest("hex");
  throw new Error("Argumentos no válidos. Consulta crypto help.");
}
