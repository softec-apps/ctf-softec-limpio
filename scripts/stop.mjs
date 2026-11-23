import { existsSync, writeFileSync } from "node:fs";
if (!existsSync(".local/dev.pid"))
  console.log(
    "No se encontró un entorno de desarrollo administrado en ejecución.",
  );
else {
  writeFileSync(".local/stop.request", "stop");
  console.log("Se solicitó detener la API, el frontend y PostgreSQL local.");
}
