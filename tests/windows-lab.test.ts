import { test } from "node:test";
import assert from "node:assert/strict";
import {
  executeWindows,
  initialWindowsState,
  presentWindows,
  type WindowsAccess,
} from "../apps/api/src/windows-lab/engine";
import { WINDOWS_HOSTS } from "../apps/api/src/windows-lab/catalog";
import { completeWindowsFixture } from "./windows-lab-fixtures";

const access: WindowsAccess = {
  connected: true,
  enabled: WINDOWS_HOSTS.map((host) => host.id),
  flag: (index) => `CTF{fixture_${index}}`,
  password: (account) => `Fixture-${account}!`,
};

test("ten independent Windows fixtures require authorized file operations", async () => {
  for (let index = 0; index < 10; index++) {
    const state = initialWindowsState();
    const run = async (command: string) =>
      executeWindows(state, command, access, "local");
    await run(`connect ${WINDOWS_HOSTS[index].ip}`);
    if (index > 0)
      assert.throws(
        () =>
          executeWindows(
            state,
            "type C:\\Evidence\\proof.txt",
            access,
            "local",
          ),
        /denegado/i,
      );
    assert.equal(await completeWindowsFixture(run, index), access.flag(index));
    assert.deepEqual(state.proofs, [WINDOWS_HOSTS[index].id]);
    const persisted = JSON.parse(JSON.stringify(state));
    assert.equal(
      presentWindows(persisted, access).principal,
      state.session?.principal,
    );
    await run("reset --confirm");
    assert.deepEqual(state.proofs, []);
  }
});

test("user text cannot become server evidence or credential templates", () => {
  const state = initialWindowsState();
  const run = (command: string) =>
    executeWindows(state, command, access, "local");
  for (const host of WINDOWS_HOSTS) {
    run(`connect ${host.ip}`);
    run("echo {{flag}} > C:\\Temp\\custom.txt");
    assert.equal(run("type C:\\Temp\\custom.txt"), "{{flag}}");
    run("echo {{password:mantenimiento}} > C:\\Temp\\custom.txt");
    assert.equal(
      run("type C:\\Temp\\custom.txt"),
      "{{password:mantenimiento}}",
    );
    assert.deepEqual(state.proofs, []);
  }
});

test("local console does not authorize remote operations and VPN loss revokes access", () => {
  const state = initialWindowsState();
  executeWindows(state, "connect WIN01", access, "local");
  assert.throws(
    () => executeWindows(state, "whoami", access, "remote"),
    /sesión/i,
  );
  executeWindows(
    state,
    `winrm -i 10.77.0.60 -u analista -p ${access.password("analista")}`,
    access,
    "remote",
  );
  assert.match(executeWindows(state, "whoami", access, "remote"), /analista/);
  assert.match(
    executeWindows(state, "whoami", { ...access, connected: false }, "remote"),
    /VPN/,
  );
  assert.equal(state.session, null);
  assert.throws(
    () => executeWindows(state, "whoami", access, "remote"),
    /sesión/i,
  );
});

test("permissions, host boundaries, unsupported commands and audit retain their limits", () => {
  const state = initialWindowsState();
  const run = (command: string) =>
    executeWindows(state, command, access, "local");
  run("connect WIN05");
  assert.throws(
    () => run("copy C:\\Tools\\shell.exe C:\\Windows\\System32\\x.exe"),
    /denegado/i,
  );
  assert.throws(
    () => run("icacls C:\\Evidence\\proof.txt /grant analista:F"),
    /WRITE_DAC/i,
  );
  assert.throws(
    () => run("sc config BackupAgent binPath= C:\\Tools\\shell.exe"),
    /denegado|CHANGE_CONFIG/i,
  );
  assert.throws(() => run("whoami; hostname"), /compuestos/);
  assert.throws(() => run("type C:\\..\\outside.txt"), /sale/);
  assert.throws(
    () => executeWindows(state, "whoami", { ...access, enabled: [] }, "local"),
    /disponible/,
  );
  for (let i = 0; i < 80; i++) run("connect WIN01");
  assert.ok(state.events.length <= 64);
  assert.ok(!JSON.stringify(state.events).includes("Fixture-"));
  assert.throws(() => run("nmap 192.0.2.1"), /laboratorio/);
});
