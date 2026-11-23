import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
export async function startDatabase() {
  if (process.env.NODE_ENV === "production")
    throw new Error("PostgreSQL integrado es solo para desarrollo.");
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== "127.0.0.1")
    throw new Error("La base local debe escuchar en loopback.");
  const databaseDir = resolve(".local/postgres");
  mkdirSync(databaseDir, { recursive: true });
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    port: Number(url.port),
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: (e) => console.error(String(e)),
  });
  if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  // embedded-postgres uses taskkill on Windows. Prefer PostgreSQL's clean shutdown.
  if (process.platform === "win32") {
    let stopped = false;
    pg.stop = async () => {
      if (stopped || !pg.process) return;
      stopped = true;
      await new Promise((resolveStop, reject) => {
        const ctl = spawn(
          resolve(
            "node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe",
          ),
          ["-D", databaseDir, "-m", "fast", "-w", "stop"],
          { stdio: "ignore", windowsHide: true },
        );
        ctl.on("error", reject);
        ctl.on("exit", (code) =>
          code === 0
            ? resolveStop()
            : reject(new Error("No se pudo detener PostgreSQL limpiamente.")),
        );
      });
      pg.process = undefined;
    };
  }
  const client = pg.getPgClient();
  await client.connect();
  const found = await client.query(
    "SELECT 1 FROM pg_database WHERE datname=$1",
    [url.pathname.slice(1)],
  );
  await client.end();
  if (!found.rowCount) await pg.createDatabase(url.pathname.slice(1));
  return pg;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const pg = await startDatabase();
  console.log("PostgreSQL local disponible en 127.0.0.1:55432.");
  const stop = async () => {
    await pg.stop();
    process.exit();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 60000);
}
