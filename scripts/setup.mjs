import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
const run = (args) => {
  if (!process.env.npm_execpath)
    throw new Error("Inicia la configuración mediante npm run setup.");
  const r = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
mkdirSync(".local", { recursive: true });
if (!existsSync(".env")) {
  const password = randomBytes(24).toString("hex");
  const admin = randomBytes(18).toString("base64url");
  writeFileSync(
    ".env",
    `DATABASE_URL=postgresql://ctf:${password}@127.0.0.1:55432/ctf\nAPP_ORIGIN=http://127.0.0.1:5173\nPORT=3001\nADMIN_ALIAS=admin\nADMIN_PASSWORD=${admin}\nREGISTRATION_CODE=OFICINA-ABIERTA\nFLAG_SECRET=${randomBytes(32).toString("hex")}\nNODE_ENV=development\n`,
  );
  writeFileSync(
    ".local/ACCESO-ADMIN.txt",
    `Acceso local de administración\nURL: http://127.0.0.1:5173\nUsuario: admin\nContraseña: ${admin}\n\nNo compartir este archivo ni incorporarlo a Git.\n`,
  );
  console.log(
    "Configuración privada creada. Acceso de administrador en .local/ACCESO-ADMIN.txt",
  );
} else console.log("Se conserva la configuración existente.");
run(["run", "db:generate"]);
console.log("Configuración lista. Ejecuta npm run dev.");
