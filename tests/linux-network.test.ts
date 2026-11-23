import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialLinuxState,
  executeLinux,
  unlocked,
  canAttempt,
  type LinuxAccess,
} from "../apps/api/src/linux-network/engine";
import { LINUX_SERVERS } from "../apps/api/src/linux-network/catalog";
const setup = () => {
  const state = initialLinuxState();
  const access: LinuxAccess = {
    solved: [],
    enabled: LINUX_SERVERS.map((s) => s.id),
    key: (i) => `CTF{${String(i).padStart(32, "a")}}`,
  };
  const run = (command: string) => executeLinux(state, command, access);
  return { state, access, run };
};
const solutions = [
  "cat relevo.txt",
  "cat .continuidad",
  'cat "documentos/acta final.txt"',
  "find deposito -type f -user nivel03 -readable -size 38c",
  "grep ENTREGA_TURNO eventos.log",
  "sort entregas.txt | uniq -u",
  "strings dispositivo.bin",
  "base64 -d correo/credencial.b64",
  "gzip -dc respaldo/continuidad.gz",
  "sudo -u custodio cat /srv/custodia/clave",
];
test("VPN obligatoria y entrada root/toor sugerida sin entregar una flag inicial", () => {
  const { state, access, run } = setup();
  assert.match(run("ssh root@bastion").output, /unreachable/);
  const connected = run("vpn connect");
  assert.ok(!connected.output.includes("CTF{"));
  assert.ok(!connected.output.includes("toor"));
  assert.match(connected.output, /árbol/);
  assert.match(run("ssh nivel00@bastion").output, /No route/);
  run("ssh root@bastion");
  assert.equal(state.pending, 0);
  run(access.key(0));
  assert.equal(state.shell, null);
  run("ssh root@bastion");
  assert.equal(run("toor").completed, undefined);
  assert.equal(state.shell?.cwd, "/root");
  assert.equal(run("whoami").output.trim(), "root");
  assert.match(run("id").output, /uid=0\(root\)/);
  assert.match(run("env").output, /HOME=\/root/);
  assert.equal(run("submit toor").completed, undefined);
  assert.match(run("ip addr").output, /10.77.0.10/);
  assert.ok(!run("ip addr").output.includes("tun0"));
  assert.match(run("man constructor").output, /No manual entry/);
  run("vpn disconnect");
  assert.equal(state.shell, null);
  assert.match(run("nmap -sV 10.77.0.0/24").output, /No route/);
});
test("solo se puede intentar el siguiente salto y su flag correcta valida el anterior", () => {
  const { state, access, run } = setup();
  run("vpn connect");
  assert.equal(canAttempt(1, access), true);
  assert.equal(unlocked(1, access), false);
  assert.equal(canAttempt(2, access), false);
  assert.match(run("ssh nivel02@documentos").output, /No route/);
  run("ssh nivel01@almacen");
  run("incorrecta");
  assert.equal(state.shell, null);
  run("ssh nivel01@almacen");
  const login = run(access.key(0));
  assert.equal(login.completed, 0);
  assert.equal(state.shell?.level, 1);
  access.solved.push("linux-01");
  assert.equal(run("pwd").output.trim(), "/home/nivel01");
});
test("diez servidores resolubles con herramientas y entrega explícita compatible", () => {
  const { state, access, run } = setup();
  run("vpn connect");
  for (const server of LINUX_SERVERS) {
    run(`ssh ${server.user}@${server.name}`);
    run(server.index ? access.key(server.index - 1) : "toor");
    assert.equal(state.shell?.level, server.index);
    if (server.index === 1)
      assert.ok(!run("ls").output.includes(".continuidad"));
    if (server.index === 3) assert.match(run(solutions[3]).output, /caja-23/);
    else
      assert.ok(
        run(solutions[server.index]).output.includes(access.key(server.index)),
        server.name,
      );
    const next = run("cat SIGUIENTE").output;
    if (server.index < 9) {
      assert.ok(next.includes(LINUX_SERVERS[server.index + 1].name));
      assert.ok(next.includes(LINUX_SERVERS[server.index + 1].user));
    } else assert.match(next, /último/);
    if (server.index === 9) {
      assert.throws(() => run("cat /srv/custodia/clave"), /Permission denied/);
      assert.match(run("sudo -l").output, /custodio/);
    }
    assert.equal(
      run(`submit ${access.key(server.index)}`).completed,
      server.index,
    );
    access.solved.push(server.id);
  }
  assert.equal(access.solved.length, 10);
});
test("la cadena completa avanza autenticando con cada flag sin submit intermedio", () => {
  const { state, access, run } = setup();
  run("vpn connect");
  run("ssh root@bastion");
  run("toor");
  for (let level = 0; level < 9; level++) {
    const next = LINUX_SERVERS[level + 1];
    run(`ssh ${next.user}@${next.name}`);
    const login = run(access.key(level));
    assert.equal(login.completed, level);
    access.solved.push(LINUX_SERVERS[level].id);
    assert.equal(state.shell?.level, level + 1);
  }
  assert.equal(run(`submit ${access.key(9)}`).completed, 9);
});
test("archivos y permisos siguen aislados por servidor para cuentas sin privilegios", () => {
  const { state, access, run } = setup();
  access.solved.push("linux-01");
  run("vpn connect");
  run("ssh nivel01@almacen");
  run(access.key(0));
  run('echo "nota privada" > nota.txt');
  assert.equal(run("cat nota.txt").output, "nota privada\n");
  run("chmod 000 nota.txt");
  assert.throws(() => run("cat nota.txt"), /Permission denied/);
  run("chmod 600 nota.txt");
  run("cp nota.txt copia.txt");
  run("exit");
  run("ssh nivel01@almacen");
  run(access.key(0));
  assert.equal(run("cat copia.txt").output, "nota privada\n");
  assert.throws(() => run("echo cambio > /etc/passwd"), /Permission denied/);
  run("reset --confirm");
  assert.throws(() => run("cat copia.txt"), /No such file/);
  assert.ok(run("cat .continuidad").output.includes(access.key(1)));
  assert.deepEqual(structuredClone(state), state);
});
test("sesiones antiguas del primer servidor conservan sus archivos al pasar a /root", () => {
  const { state, run } = setup();
  state.connected = true;
  state.shell = { level: 0, cwd: "/home/nivel00" };
  state.changes["linux-01"] = {
    "/home/nivel00/nota.txt": {
      data: Buffer.from("conservada\n").toString("base64"),
      mode: 0o600,
      owner: "nivel00",
    },
  };
  assert.equal(run("pwd").output.trim(), "/root");
  assert.equal(run("cat nota.txt").output, "conservada\n");
  assert.equal(state.changes["linux-01"]["/root/nota.txt"]?.owner, "root");
  assert.ok(
    !Object.hasOwn(state.changes["linux-01"], "/home/nivel00/nota.txt"),
  );
});
test("deshabilitar un requisito revoca sesión y autenticaciones pendientes", () => {
  const { state, access, run } = setup();
  run("vpn connect");
  run("ssh root@bastion");
  run("toor");
  run("ssh nivel01@almacen");
  access.enabled = access.enabled.filter((id) => id !== "linux-01");
  assert.match(run("cat relevo.txt").output, /sesión SSH/);
  assert.equal(state.shell, null);
  assert.equal(state.pending, null);
  assert.ok(!run("nmap -sV 10.77.0.0/24").output.includes("22/tcp"));
});
test("contraseñas y cancelación no ejecutan comandos", () => {
  const { state, run } = setup();
  run("vpn connect");
  run("ssh root@bastion");
  assert.match(run("vpn connect").output, /Permission denied/);
  assert.equal(state.shell, null);
  run("ssh root@bastion");
  run("\u0003");
  assert.equal(state.pending, null);
});
test("el intérprete limita tuberías y usa solo archivos del juego", () => {
  const { run } = setup();
  run("vpn connect");
  run("ssh root@bastion");
  run("toor");
  assert.throws(() => run("cat /proc/self/environ"), /No such file/);
  assert.throws(
    () => run("echo a | cat | cat | cat | cat | cat | cat"),
    /Máximo/,
  );
  assert.throws(() => run('cat "sin cerrar'), /Comillas/);
  assert.throws(() => run("bash -c whoami"), /command not found/);
});
