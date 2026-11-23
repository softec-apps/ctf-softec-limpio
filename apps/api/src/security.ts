import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function passwordMatches(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function flagValue(challengeId: string) {
  if (!process.env.FLAG_SECRET) throw new Error("Falta FLAG_SECRET");
  return `CTF{${createHmac("sha256", process.env.FLAG_SECRET).update(challengeId).digest("hex").slice(0, 32)}}`;
}
export function flagVerifier(value: string) {
  return createHmac("sha256", process.env.FLAG_SECRET!)
    .update(value)
    .digest("hex");
}
export function matchesFlag(value: string, verifier: string) {
  const a = Buffer.from(flagVerifier(value), "hex");
  const b = Buffer.from(verifier, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
