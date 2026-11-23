import { LINUX_MANUALS } from "./manuals";
import { posix } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  canRead,
  readFile,
  resolvePath,
  type LinuxFiles,
  type LinuxFile,
} from "./filesystem";
export type ShellContext = {
  cwd: string;
  home: string;
  user: string;
  level: number;
  files: LinuxFiles;
  changes: Record<string, LinuxFile | null>;
};
export { words } from "../command-words";
import { words } from "../command-words";

function glob(pattern: string) {
  return new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$",
  );
}
function modeText(file: LinuxFile) {
  return (
    (file.directory ? "d" : "-") +
    Array.from({ length: 9 }, (_, i) =>
      file.mode & (1 << (8 - i)) ? "rwx"[i % 3] : "-",
    ).join("")
  );
}
function write(
  context: ShellContext,
  target: string,
  data: Buffer,
  append = false,
) {
  const path = resolvePath(context.cwd, target),
    file = context.files[path];
  const home = context.home;
  if (!(path.startsWith(home + "/") || path.startsWith("/tmp/")))
    throw new Error(`${path}: Permission denied`);
  const parent = context.files[posix.dirname(path)];
  if (!parent?.directory) throw new Error(`${target}: No such directory`);
  if (file?.directory) throw new Error(`${target}: Is a directory`);
  if (file && !(file.mode & (file.owner === context.user ? 0o200 : 0o002)))
    throw new Error(`${target}: Permission denied`);
  const content =
    append && file
      ? Buffer.concat([Buffer.from(file.data, "base64"), data])
      : data;
  if (content.length > 16384 || Object.keys(context.changes).length >= 80)
    throw new Error("Cuota del laboratorio alcanzada.");
  context.files[path] = {
    data: content.toString("base64"),
    owner: context.user,
    mode: file?.mode ?? 0o644,
  };
  context.changes[path] = context.files[path];
}
export const SHELL_HELP =
  "pwd, ls [-la], cd, cat, find [-name patrón -type f -user usuario -size Nc -readable], grep [-niv] texto archivo, sort, uniq [-u|-c], head, tail, wc, file, strings, base64 -d, xxd [-r -p], gzip -dc, stat, echo, touch, cp, mv, rm, chmod, sudo -l, whoami, id, hostname, uname, ps, ss, env, clear.\nSe admiten comillas, tuberías | y redirecciones > / >>. man <comando> muestra el uso.\nRed: submit <clave>, exit, vpn status. reset --confirm restaura los archivos del servidor actual sin borrar puntos.";
function command(
  context: ShellContext,
  args: string[],
  input?: Buffer,
): Buffer {
  const [name, ...rest] = args;
  const path = (value: string) => resolvePath(context.cwd, value);
  const file = (value: string, user = context.user) =>
    readFile(context.files, path(value), user);
  const source = (paths: string[]) =>
    paths.length
      ? Buffer.concat(paths.map((p) => file(p)))
      : (input ?? Buffer.alloc(0));
  const output = (value: string) => Buffer.from(value);
  if (!name) throw new Error("Falta un comando.");
  if (name === "help") return output(SHELL_HELP + "\n");
  if (name === "man")
    return output(
      ((Object.hasOwn(LINUX_MANUALS, rest[0] ?? "")
        ? LINUX_MANUALS[rest[0]]
        : undefined) ??
        `No manual entry for ${rest[0] ?? "(sin comando)"}. Usa help.`) + "\n",
    );
  if (name === "pwd") return output(context.cwd + "\n");
  if (name === "whoami") return output(context.user + "\n");
  if (name === "id")
    return output(
      `uid=${context.user === "root" ? 0 : 1100 + context.level}(${context.user}) gid=${context.user === "root" ? 0 : 1100 + context.level}(${context.user}) groups=${context.user === "root" ? 0 : 1100 + context.level}(${context.user})\n`,
    );
  if (name === "uname")
    return output("Linux seventech-lab 6.8.0 x86_64 GNU/Linux\n");
  if (name === "hostname") return file("/etc/hostname");
  if (name === "env")
    return output(
      `HOME=${context.home}\nUSER=${context.user}\nSHELL=/bin/bash\nPATH=/usr/bin:/bin\n`,
    );
  if (name === "ps")
    return output(
      `  PID TTY          TIME CMD\n    1 ?        00:00:01 init\n   42 ?        00:00:00 sshd\n  101 pts/0    00:00:00 bash\n`,
    );
  if (name === "ss")
    return output("State  Local Address:Port\nLISTEN 0.0.0.0:22\n");
  if (name === "echo") return output(rest.join(" ") + "\n");
  if (name === "cd") {
    const target = path(rest[0] === "~" || !rest[0] ? context.home : rest[0]);
    if (!context.files[target]?.directory)
      throw new Error(`${target}: No such directory`);
    if (
      !(
        context.files[target].mode &
        (context.files[target].owner === context.user ? 0o100 : 0o001)
      )
    )
      throw new Error(`${target}: Permission denied`);
    context.cwd = target;
    return output("");
  }
  if (name === "ls") {
    const flags = rest.filter((a) => a.startsWith("-")).join("");
    const targets = rest.filter((a) => !a.startsWith("-"));
    return output(
      (targets.length ? targets : ["."])
        .map((target) => {
          const root = path(target),
            entry = context.files[root];
          if (!entry) throw new Error(`${target}: No such file or directory`);
          if (!entry.directory)
            return flags.includes("l")
              ? `${modeText(entry)} ${entry.owner} ${Buffer.from(entry.data, "base64").length} ${posix.basename(root)}`
              : posix.basename(root);
          const entries = Object.keys(context.files)
            .filter((p) => p !== root && posix.dirname(p) === root)
            .sort()
            .filter(
              (p) => flags.includes("a") || !posix.basename(p).startsWith("."),
            );
          return entries
            .map((p) =>
              flags.includes("l")
                ? `${modeText(context.files[p])} ${context.files[p].owner.padEnd(10)} ${String(Buffer.from(context.files[p].data, "base64").length).padStart(5)} ${posix.basename(p)}`
                : posix.basename(p) + (context.files[p].directory ? "/" : ""),
            )
            .join("\n");
        })
        .join("\n") + "\n",
    );
  }
  if (name === "cat") return source(rest);
  if (name === "stat")
    return output(
      rest
        .map((p) => {
          const f = context.files[path(p)];
          if (!f) throw new Error(`${p}: No such file`);
          return `File: ${p}\nSize: ${Buffer.from(f.data, "base64").length}\nAccess: ${f.mode.toString(8)} (${modeText(f)}) Owner: ${f.owner}`;
        })
        .join("\n") + "\n",
    );
  if (name === "find") {
    const rootArg = rest[0] && !rest[0].startsWith("-") ? rest[0] : ".",
      root = path(rootArg);
    if (!context.files[root]) throw new Error(`${rootArg}: No such directory`);
    const filters = rest.slice(rootArg === rest[0] ? 1 : 0);
    for (let i = 0; i < filters.length; i++) {
      if (["-name", "-type", "-user", "-size"].includes(filters[i])) {
        if (!filters[++i]) throw new Error("find: falta argumento");
      } else if (filters[i] !== "-readable")
        throw new Error(`find: predicado no disponible: ${filters[i]}`);
    }
    return output(
      Object.entries(context.files)
        .filter(([p, f]) => {
          if (!(p === root || p.startsWith(root === "/" ? "/" : root + "/")))
            return false;
          for (let i = 0; i < filters.length; i++) {
            const flag = filters[i];
            if (flag === "-name" && !glob(filters[++i]).test(posix.basename(p)))
              return false;
            if (
              flag === "-type" &&
              (filters[++i] === "d") !== Boolean(f.directory)
            )
              return false;
            if (flag === "-user" && f.owner !== filters[++i]) return false;
            if (
              flag === "-size" &&
              Buffer.from(f.data, "base64").length !==
                Number(filters[++i].replace(/c$/, ""))
            )
              return false;
            if (flag === "-readable" && !canRead(f, context.user)) return false;
          }
          return true;
        })
        .map(([p]) =>
          rootArg.startsWith("/")
            ? p
            : (rootArg === "." ? "./" : rootArg + "/") +
              posix.relative(root, p),
        )
        .join("\n") + "\n",
    );
  }
  if (name === "grep") {
    const flags = rest.filter((a) => /^-[nivF]+$/.test(a)).join("");
    const operands = rest.filter((a) => !/^-[nivF]+$/.test(a));
    if (!operands.length) throw new Error("grep: falta texto de búsqueda");
    const needle = flags.includes("i")
      ? operands[0].toLowerCase()
      : operands[0];
    return output(
      source(operands.slice(1))
        .toString("utf8")
        .split("\n")
        .map((line, i) => ({ line, i }))
        .filter(
          ({ line }) =>
            (flags.includes("i") ? line.toLowerCase() : line).includes(
              needle,
            ) !== flags.includes("v"),
        )
        .map(({ line, i }) => (flags.includes("n") ? `${i + 1}:` : "") + line)
        .join("\n") + "\n",
    );
  }
  if (name === "sort")
    return output(
      source(rest.filter((a) => !a.startsWith("-")))
        .toString()
        .trimEnd()
        .split("\n")
        .sort()
        .join("\n") + "\n",
    );
  if (name === "uniq") {
    const text = source(rest.filter((a) => !a.startsWith("-")))
      .toString()
      .trimEnd()
      .split("\n");
    const groups: { line: string; count: number }[] = [];
    for (const line of text) {
      const last = groups[groups.length - 1];
      if (last?.line === line) last.count++;
      else groups.push({ line, count: 1 });
    }
    return output(
      groups
        .filter((g) => !rest.includes("-u") || g.count === 1)
        .map((g) => (rest.includes("-c") ? `${g.count} ` : "") + g.line)
        .join("\n") + "\n",
    );
  }
  if (name === "head" || name === "tail") {
    let count = 10;
    const files: string[] = [];
    for (let i = 0; i < rest.length; i++)
      if (rest[i] === "-n") count = Number(rest[++i]);
      else files.push(rest[i]);
    if (!Number.isInteger(count) || count < 0 || count > 1000)
      throw new Error("Número de líneas fuera de rango.");
    const lines = source(files).toString().trimEnd().split("\n");
    return output(
      (name === "head"
        ? lines.slice(0, count)
        : count
          ? lines.slice(-count)
          : []
      ).join("\n") + "\n",
    );
  }
  if (name === "wc") {
    const data = source(rest.filter((a) => !a.startsWith("-"))),
      text = data.toString();
    return output(
      `${rest.includes("-c") ? data.length : rest.includes("-w") ? text.trim().split(/\s+/).filter(Boolean).length : text.split("\n").length - 1}\n`,
    );
  }
  if (name === "strings")
    return output(
      (
        source(rest)
          .toString("latin1")
          .match(/[\x20-\x7e]{4,}/g) ?? []
      ).join("\n") + "\n",
    );
  if (name === "base64") {
    const data = source(rest.filter((a) => !a.startsWith("-")));
    return rest.includes("-d") || rest.includes("--decode")
      ? Buffer.from(data.toString().replace(/\s/g, ""), "base64")
      : output(data.toString("base64") + "\n");
  }
  if (name === "xxd") {
    const data = source(rest.filter((a) => !a.startsWith("-")));
    return rest.includes("-r")
      ? Buffer.from(data.toString().replace(/\s/g, ""), "hex")
      : output(data.toString("hex") + "\n");
  }
  if (name === "gzip" || name === "zcat") {
    if (name === "gzip" && !rest.some((a) => a.includes("d")))
      throw new Error("Uso disponible: gzip -dc archivo.gz");
    return gunzipSync(source(rest.filter((a) => !a.startsWith("-"))), {
      maxOutputLength: 32768,
    });
  }
  if (name === "file")
    return output(
      rest
        .map((p) => {
          const data = file(p);
          return `${p}: ${data[0] === 31 && data[1] === 139 ? "gzip compressed data" : data.includes(0) ? "data" : "ASCII text"}`;
        })
        .join("\n") + "\n",
    );
  if (name === "sudo") {
    if (rest.join(" ") === "-l")
      return output(
        context.level === 9
          ? `User ${context.user} may run:\n    (custodio) NOPASSWD: /bin/cat /srv/custodia/clave\n`
          : `${context.user} is not allowed to run sudo.\n`,
      );
    if (
      context.level === 9 &&
      rest[0] === "-u" &&
      rest[1] === "custodio" &&
      ["cat", "/bin/cat"].includes(rest[2]) &&
      rest.length === 4 &&
      path(rest[3]) === "/srv/custodia/clave"
    )
      return file(rest[3], "custodio");
    throw new Error("sudo: command not permitted");
  }
  if (name === "touch") {
    for (const p of rest) write(context, p, Buffer.alloc(0), true);
    return output("");
  }
  if (name === "cp" || name === "mv") {
    if (rest.length !== 2) throw new Error(`Uso: ${name} origen destino`);
    write(context, rest[1], file(rest[0]));
    if (name === "mv") {
      command(context, ["rm", rest[0]]);
    }
    return output("");
  }
  if (name === "rm" || name === "chmod") {
    const target = path(name === "rm" ? (rest[0] ?? "") : (rest[1] ?? "")),
      f = context.files[target];
    if (!f || f.directory) throw new Error("Archivo no disponible.");
    if (
      f.owner !== context.user ||
      !(target.startsWith(context.home + "/") || target.startsWith("/tmp/"))
    )
      throw new Error("Permission denied");
    if (name === "rm") {
      context.changes[target] = null;
      delete context.files[target];
    } else {
      if (!/^[0-7]{3}$/.test(rest[0]))
        throw new Error("Uso: chmod 600 archivo");
      f.mode = parseInt(rest[0], 8);
      context.changes[target] = f;
    }
    return output("");
  }
  throw new Error(`${name}: command not found. Consulta help.`);
}
export function runShell(context: ShellContext, text: string) {
  const tokens = words(text);
  if (!tokens.length) return "";
  const redirect = tokens.findIndex((t) => t === ">" || t === ">>");
  if (
    redirect >= 0 &&
    (redirect !== tokens.length - 2 ||
      tokens.slice(redirect + 1).some((t) => ["|", ">", ">>"].includes(t)))
  )
    throw new Error("Redirección no válida.");
  const commands: string[][] = [[]];
  for (const token of tokens.slice(
    0,
    redirect >= 0 ? redirect : tokens.length,
  )) {
    if (token === "|") commands.push([]);
    else commands[commands.length - 1].push(token);
  }
  if (commands.length > 6) throw new Error("Máximo seis comandos por tubería.");
  let data: Buffer | undefined;
  for (const args of commands) data = command(context, args, data);
  if (redirect >= 0) {
    write(
      context,
      tokens[redirect + 1],
      data ?? Buffer.alloc(0),
      tokens[redirect] === ">>",
    );
    return "";
  }
  return (data ?? Buffer.alloc(0))
    .toString("utf8")
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "")
    .slice(0, 32768);
}
