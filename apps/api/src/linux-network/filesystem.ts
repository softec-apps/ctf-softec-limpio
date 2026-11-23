import { posix } from "node:path";
import { gzipSync } from "node:zlib";
import { LINUX_SERVERS } from "./catalog";
export type LinuxFile = {
  data: string;
  mode: number;
  owner: string;
  directory?: boolean;
};
export type LinuxFiles = Record<string, LinuxFile>;
export const resolvePath = (cwd: string, path: string) =>
  posix.resolve(cwd, path);
export function serverFiles(level: number, token: string): LinuxFiles {
  const server = LINUX_SERVERS[level];
  const home = server.home;
  const files: LinuxFiles = {};
  const add = (
    path: string,
    text: string | Buffer,
    mode = 0o644,
    owner = server.user,
  ) => {
    files[path] = { data: Buffer.from(text).toString("base64"), mode, owner };
  };
  add("/etc/hostname", server.name + "\n", 0o644, "root");
  add(
    "/etc/passwd",
    `root:x:0:0:root:/root:/bin/bash\n${level === 0 ? "" : `${server.user}:x:${1100 + level}:${1100 + level}:Operador:${home}:/bin/bash\n`}custodio:x:1200:1200:Custodia:/srv/custodia:/bin/bash\n`,
    0o644,
    "root",
  );
  add(
    "/etc/motd",
    `${server.title}\n${server.description}\nConsulta SIGUIENTE para continuar. También puedes validar con submit <flag>. Consulta help o man <comando>.\n`,
    0o644,
    "root",
  );
  add(
    `${home}/LEEME`,
    `${server.description}\nLas claves son personales. El directorio /etc contiene la identificación de este servidor.\n`,
  );
  const next = LINUX_SERVERS[level + 1];
  add(
    `${home}/SIGUIENTE`,
    next
      ? `Próximo relevo: ${next.name} (${next.ip}), usuario ${next.user}.\nLa flag de este servidor es la contraseña SSH del siguiente. Al entrar, el relevo queda validado automáticamente.\n`
      : "Este es el último servidor. Entrega su flag con submit <flag> para cerrar el recorrido.\n",
  );
  if (level === 0) add(`${home}/relevo.txt`, `${token}\n`);
  if (level === 1) add(`${home}/.continuidad`, `${token}\n`, 0o600);
  if (level === 2) {
    add(
      `${home}/documentos/acta provisional.txt`,
      "Borrador sin firma. No contiene credenciales.\n",
    );
    add(`${home}/documentos/acta final.txt`, `${token}\n`);
  }
  if (level === 3) {
    add(
      `${home}/AVISO`,
      `El archivo de entrega ocupa ${Buffer.byteLength(token + "\n")} bytes; pertenece a ${server.user} y puedes leerlo.\n`,
    );
    for (let i = 0; i < 36; i++)
      add(
        `${home}/deposito/caja-${String(i).padStart(2, "0")}/entrega`,
        i === 23 ? token + "\n" : `Copia de control ${i}.\n`,
        i % 3 === 0 ? 0o600 : 0o644,
        i === 23 ? server.user : "root",
      );
  }
  if (level === 4)
    add(
      `${home}/eventos.log`,
      Array.from({ length: 180 }, (_, i) =>
        i === 127
          ? `2026-10-31T22:15:00Z ENTREGA_TURNO ${token}`
          : `2026-10-31T22:${String(i % 60).padStart(2, "0")}:00Z INFO servicio verificado ${i}`,
      ).join("\n") + "\n",
    );
  if (level === 5)
    add(
      `${home}/entregas.txt`,
      [
        "control-beta",
        "control-alfa",
        "control-gamma",
        token,
        "control-alfa",
        "control-gamma",
        "control-beta",
      ].join("\n") + "\n",
    );
  if (level === 6)
    add(
      `${home}/dispositivo.bin`,
      Buffer.concat([
        Buffer.from([0, 1, 255, 0, 17]),
        Buffer.from(token),
        Buffer.from([0, 255, 1]),
      ]),
    );
  if (level === 7)
    add(
      `${home}/correo/credencial.b64`,
      Buffer.from(token + "\n").toString("base64") + "\n",
    );
  if (level === 8)
    add(`${home}/respaldo/continuidad.gz`, gzipSync(Buffer.from(token + "\n")));
  if (level === 9) {
    add("/srv/custodia/clave", token + "\n", 0o600, "custodio");
    add(
      `${home}/LEEME`,
      "Custodia conserva la clave en /srv/custodia/clave. El administrador dejó una autorización limitada para tu usuario.\n",
    );
  }
  for (const path of [
    "/",
    "/home",
    home,
    "/tmp",
    "/etc",
    ...Object.keys(files),
  ]) {
    let directory = files[path] ? posix.dirname(path) : path;
    while (!files[directory]) {
      files[directory] = {
        data: "",
        mode: 0o755,
        owner: directory.startsWith(home) ? server.user : "root",
        directory: true,
      };
      if (directory === "/") break;
      directory = posix.dirname(directory);
    }
  }
  return files;
}
export const canRead = (file: LinuxFile, user: string) =>
  user === "root" || Boolean(file.mode & (file.owner === user ? 0o400 : 0o004));
export function readFile(files: LinuxFiles, path: string, user: string) {
  const file = files[path];
  if (!file) throw new Error(`${path}: No such file or directory`);
  if (file.directory) throw new Error(`${path}: Is a directory`);
  if (!canRead(file, user)) throw new Error(`${path}: Permission denied`);
  return Buffer.from(file.data, "base64");
}
