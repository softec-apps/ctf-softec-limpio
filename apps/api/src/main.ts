import { createApp } from "./app";
import { db } from "./db";
async function main() {
  if (!process.env.FLAG_SECRET || !process.env.APP_ORIGIN)
    throw new Error("Ejecuta npm run setup para configurar el entorno.");
  await db.$connect();
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? 3001), "127.0.0.1");
  console.log(`API disponible en http://127.0.0.1:${process.env.PORT ?? 3001}`);
}
main().catch(() => {
  console.error(
    "No se pudo iniciar la API. Verifica PostgreSQL y la configuración local.",
  );
  process.exitCode = 1;
});
