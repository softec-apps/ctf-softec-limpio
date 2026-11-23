import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const LIFETIME = 12 * 60 * 60 * 1000;
const MAX_ACTIVE_PINS = 8;
export const entrancePinCookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-ctf_entrance_pin"
    : "ctf_entrance_pin";
function mac(value: string) {
  if (!process.env.FLAG_SECRET) throw new Error("Falta FLAG_SECRET");
  return createHmac("sha256", process.env.FLAG_SECRET).update(value).digest();
}
function decode(value: unknown, now: number) {
  if (typeof value !== "string" || value.length > 128) return null;
  const [nonce, expires, signature, extra] = value.split(".");
  if (
    extra !== undefined ||
    !/^[a-f0-9]{32}$/.test(nonce ?? "") ||
    !/^\d{13}$/.test(expires ?? "") ||
    !/^[a-f0-9]{64}$/.test(signature ?? "")
  )
    return null;
  const expected = mac(`entrance-pin:v1:${nonce}:${expires}`);
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return null;
  const deadline = Number(expires);
  if (deadline <= now || deadline > now + LIFETIME) return null;
  return String(
    mac(`entrance-pin-code:v1:${nonce}`).readUInt32BE(0) % 10000,
  ).padStart(4, "0");
}
function recentTokens(value: unknown, now: number): string[] {
  if (typeof value !== "string" || value.length > 1024) return [];
  if (!value.startsWith("v2~")) return decode(value, now) ? [value] : [];
  const parts = value.split("~");
  const signature = parts.pop()!;
  if (
    parts.length < 3 ||
    parts.length > MAX_ACTIVE_PINS + 1 ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    !timingSafeEqual(
      mac(`entrance-pin-history:${parts.join("~")}`),
      Buffer.from(signature, "hex"),
    )
  )
    return [];
  return parts.slice(1).filter((token) => decode(token, now) !== null);
}
export function entrancePin(previous?: unknown, now = Date.now()) {
  const previousTokens = recentTokens(previous, now);
  const oldCodes = previousTokens.map((token) => decode(token, now));
  const expiresAt = new Date(now + LIFETIME);
  let token: string, code: string;
  do {
    const nonce = randomBytes(16).toString("hex");
    const expires = String(expiresAt.getTime());
    token = `${nonce}.${expires}.${mac(`entrance-pin:v1:${nonce}:${expires}`).toString("hex")}`;
    code = decode(token, now)!;
  } while (oldCodes.includes(code));
  if (previousTokens.length) {
    const history = [
      "v2",
      token,
      ...previousTokens.slice(0, MAX_ACTIVE_PINS - 1),
    ].join("~");
    token = `${history}~${mac(`entrance-pin-history:${history}`).toString("hex")}`;
  }
  return { code, token, expiresAt };
}
export function matchesEntrancePin(
  code: string,
  token: unknown,
  now = Date.now(),
) {
  if (!/^[0-9]{4}$/.test(code)) return false;
  return recentTokens(token, now).some((entry) => {
    const expected = decode(entry, now);
    return (
      expected !== null &&
      timingSafeEqual(Buffer.from(code), Buffer.from(expected))
    );
  });
}
