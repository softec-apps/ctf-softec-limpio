import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  timingSafeEqual,
} from "node:crypto";
// MS-GPPREF fixed key, intentionally public: historical GPP behavior, not a new cipher.
const GPP_KEY = Buffer.from(
  "4e9906e8fcb66cc9faf49310620ffee8f496e806cc057990209b09a433b66c1b",
  "hex",
);
export function encryptPreference(password: string) {
  const cipher = createCipheriv("aes-256-cbc", GPP_KEY, Buffer.alloc(16));
  return Buffer.concat([
    cipher.update(Buffer.from(password, "utf16le")),
    cipher.final(),
  ])
    .toString("base64")
    .replace(/=+$/, "");
}
export function decryptPreference(value: string) {
  if (!/^[a-zA-Z0-9+/]{1,512}={0,2}$/.test(value))
    throw new Error("cpassword inválido.");
  const decipher = createDecipheriv("aes-256-cbc", GPP_KEY, Buffer.alloc(16));
  return Buffer.concat([
    decipher.update(Buffer.from(value, "base64")),
    decipher.final(),
  ]).toString("utf16le");
}
export type OfflineCapture = {
  format: "seventech-offline-v1";
  kind: "AS-REP" | "TGS";
  account: string;
  salt: string;
  iterations: 2000;
  verifier: string;
};
export function offlineVerifier(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 2000, 16, "sha256").toString("hex");
}
export function crackCapture(capture: OfflineCapture, candidates: string[]) {
  if (
    capture.format !== "seventech-offline-v1" ||
    capture.iterations !== 2000 ||
    capture.salt.length > 128 ||
    !/^[a-f0-9]{32}$/.test(capture.verifier) ||
    candidates.length > 256
  )
    throw new Error("Captura o diccionario no compatible.");
  for (const candidate of candidates) {
    const actual = Buffer.from(offlineVerifier(candidate, capture.salt), "hex"),
      expected = Buffer.from(capture.verifier, "hex");
    if (timingSafeEqual(actual, expected)) return candidate;
  }
  return null;
}
