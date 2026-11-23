import {
  createCipheriv,
  createHash,
  createHmac,
  pbkdf2Sync,
} from "node:crypto";
import { gzipSync } from "node:zlib";
import { flagValue } from "../security";

export const MAINTENANCE_ORIGIN = "http://gestion.seventech.local";
export const PRIVILEGED_ROOT = "/home/analista/.continuidad";
export const DISCOVERY_NOTE =
  "[sesión anterior]\nLa consola de supervisión sigue en http://gestion.seventech.local/\nEl índice se retiró de portada; el robot de archivo aún conserva las exclusiones.\n";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function recoveryCode(nonce: number, mask: number) {
  const value = (nonce ^ mask) >>> 0;
  return String((((value << 7) | (value >>> 25)) >>> 0) % 100000000).padStart(
    8,
    "0",
  );
}
export function maintenanceArtifacts(userId: string) {
  const derive = (label: string) =>
    createHmac("sha256", process.env.FLAG_SECRET!)
      .update(`privileged:v1:${userId}:${label}`)
      .digest("hex");
  const password = derive("service").slice(0, 24);
  const nonce = parseInt(derive("nonce").slice(0, 8), 16);
  const mask = parseInt(derive("recovery-mask").slice(0, 8), 16);
  const code = recoveryCode(nonce, mask);
  const owner = derive("station").slice(0, 12);
  const payload = JSON.stringify({
    version: 1,
    station: owner,
    capabilities: ["custody:sign"],
    issued: "2019-06-01",
  });
  const policy = JSON.stringify({
    payload: JSON.parse(payload),
    seal: createHmac("sha256", derive("archive-key"))
      .update(payload)
      .digest("hex"),
  });
  const archive = gzipSync(
    JSON.stringify({ account: "svc.continuidad", password, station: owner }),
  ).toString("base64");
  const segment = Math.ceil(archive.length / 3);
  const parts = ["delta.part", "alfa.part", "omega.part"].map(
    (name, index) => ({
      name,
      offset: index * segment,
      content: archive.slice(index * segment, (index + 1) * segment),
    }),
  );
  const salt = derive("salt").slice(0, 32);
  const key = pbkdf2Sync(
    [password, code, hash(policy)].join("|"),
    Buffer.from(salt, "hex"),
    5000,
    32,
    "sha256",
  );
  const iv = Buffer.from(derive("vault-iv").slice(0, 24), "hex");
  const signer = derive("signer");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(
      JSON.stringify({ signing_key: signer, context: "custodia" }),
      "utf8",
    ),
    cipher.final(),
  ]);
  const challenge = `CUSTODIA|${nonce}|${owner}`;
  const envelope = JSON.stringify({
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 5000,
    salt,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    ciphertext: encrypted.toString("hex"),
    challenge,
  });
  const signature = createHmac("sha256", Buffer.from(signer, "hex"))
    .update(challenge)
    .digest("hex");
  const files: Record<string, string> = {
    "/robots.txt":
      "User-agent: *\nDisallow: /archivo/\nDisallow: /continuidad/\n",
    "/archivo/indice.json": JSON.stringify(
      {
        encoding: "gzip/base64",
        digest: hash(archive),
        parts: parts.map((p) => ({
          path: `/archivo/${p.name}`,
          offset: p.offset,
          length: p.content.length,
        })),
      },
      null,
      2,
    ),
    ...Object.fromEntries(parts.map((p) => [`/archivo/${p.name}`, p.content])),
    "/continuidad/recuperador.js": `// Continuidad de sesión, edición 2019. Entrada: nonce decimal de la estación.\nexport function recuperar(n) {\n  let v = (Number(n) ^ ${mask}) >>> 0;\n  v = ((v << 7) | (v >>> 25)) >>> 0;\n  return String(v % 100000000).padStart(8, '0');\n}\n`,
    "/continuidad/registro.txt": `nonce=${nonce}\nestacion=${owner}\nEl restaurador de políticas conserva su formato histórico. Archivo: /politicas/respaldo.snapshot\n`,
    "/politicas/respaldo.snapshot": gzipSync(policy).toString("base64"),
    "/custodia/sobre.json": envelope,
    "/custodia/formato.txt":
      "La llave del sobre se deriva con PBKDF2-SHA256. Entrada UTF-8: contraseña del servicio|código de continuidad|SHA256 del documento de política descomprimido, sin añadir saltos de línea. Separador literal: |. Sal y parámetros en sobre.json. El interior contiene una llave de firma hexadecimal; firma el challenge del sobre mediante HMAC-SHA256.\nHerramientas de estación: crypto help.\n",
  };
  return {
    password,
    code,
    policy,
    signature,
    files,
    flag: flagValue(`privileged:v1:${userId}:final`),
  };
}
