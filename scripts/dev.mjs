import "dotenv/config";
import { spawn } from "node:child_process";
import { writeFileSync, existsSync, unlinkSync, readFileSync } from "node:fs";
import { startDatabase } from "./database.mjs";
if (!process.env.DATABASE_URL)
  throw new Error("Ejecuta primero npm run setup.");
if (existsSync(".local/dev.pid")) {
  const pid = Number(readFileSync(".local/dev.pid", "utf8"));
  let running = false;
  if (Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0);
      running = true;
    } catch {}
  }
  if (running) {
    console.log("Seventech CTF ya está iniciada: http://127.0.0.1:5173");
    process.exit(0);
  }
  unlinkSync(".local/dev.pid");
}
const children = [];
let pg;
let closing = false;
let stopWatcher;
function launch(args, persistent = false) {
  if (!process.env.npm_execpath)
    throw new Error("Inicia el entorno mediante npm run dev.");
  const child = spawn(process.execPath, [process.env.npm_execpath, ...args], {
    stdio: "inherit",
  });
  children.push(child);
  if (persistent)
    child.on("exit", () => {
      if (!closing) void stop(1);
    });
  return child;
}
async function run(args) {
  const c = launch(args);
  await new Promise((resolve, reject) =>
    c.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(args.join(" ") + " falló")),
    ),
  );
}
async function stop(code = 0) {
  if (closing) return;
  closing = true;
  if (stopWatcher) clearInterval(stopWatcher);
  for (const c of children) {
    if (c.exitCode !== null) continue;
    if (process.platform === "win32")
      await new Promise((resolve) => {
        const killer = spawn("taskkill", ["/pid", String(c.pid), "/t", "/f"], {
          stdio: "ignore",
        });
        killer.on("exit", resolve);
      });
    else c.kill("SIGTERM");
  }
  if (pg) await pg.stop();
  if (existsSync(".local/dev.pid")) unlinkSync(".local/dev.pid");
  process.exitCode = code;
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
try {
  pg = await startDatabase();
  writeFileSync(".local/dev.pid", String(process.pid));
  await run(["run", "db:migrate"]);
  await run(["run", "db:seed"]);
  launch(["run", "dev", "--workspace", "apps/api"], true);
  launch(["run", "dev", "--workspace", "apps/web"], true);
  console.log("\nSeventech CTF: http://127.0.0.1:5173\n");
  stopWatcher = setInterval(() => {
    if (existsSync(".local/stop.request")) {
      unlinkSync(".local/stop.request");
      void stop();
    }
  }, 500);
} catch (e) {
  console.error(e);
  await stop(1);
}
