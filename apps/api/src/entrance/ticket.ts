import { createHmac, timingSafeEqual } from "node:crypto";
const LIFETIME = 12 * 60 * 60 * 1000;
export const entranceCookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-ctf_entrance"
    : "ctf_entrance";
function signature(expires: string) {
  if (!process.env.FLAG_SECRET) throw new Error("Falta FLAG_SECRET");
  return createHmac("sha256", process.env.FLAG_SECRET)
    .update(`entrance:v1:${expires}`)
    .digest("hex");
}
export function entranceTicket(now = Date.now()) {
  const expiresAt = new Date(now + LIFETIME),
    expires = String(expiresAt.getTime());
  return { token: `${expires}.${signature(expires)}`, expiresAt };
}
export function hasEntranceTicket(value: unknown, now = Date.now()) {
  if (typeof value !== "string" || value.length > 100) return false;
  const parts = value.split(".");
  if (
    parts.length !== 2 ||
    !/^\d{13}$/.test(parts[0]) ||
    !/^[a-f0-9]{64}$/.test(parts[1])
  )
    return false;
  const expires = Number(parts[0]);
  if (expires <= now || expires > now + LIFETIME) return false;
  const expected = Buffer.from(signature(parts[0])),
    actual = Buffer.from(parts[1]);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
