import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  SERVICE_NAME,
} from "../apps/api/src/network/operations/scenarios";
import { execute, configure } from "../apps/api/src/network/operations/engine";
import { validateMission } from "../apps/api/src/network/operations/validation";
import type { DeviceId, ConsoleContext } from "../packages/network-contracts";
import { repairs } from "./network-repairs";
for (const [id, steps] of Object.entries(repairs))
  test(`${id}: operar los equipos resuelve la incidencia sin flags`, () => {
    const state = initialState(id);
    assert.equal(validateMission(id, state).correct, false);
    for (const [device, commands] of steps) {
      let context: ConsoleContext = { mode: "user" };
      for (const command of commands) {
        const result = execute(state, device, command, context);
        assert.ok(!result.output.startsWith("%"), result.output);
        context = result.context;
      }
    }
    const result = validateMission(id, state);
    assert.equal(result.correct, true, JSON.stringify(result.checks));
    assert.ok(state.capture.length > 0);
    assert.ok(state.journal.length > 0);
  });
test("VLAN, enlace, filtro y DNS producen efectos observables en las pruebas", () => {
  const state = initialState("free");
  const run = (command: string) =>
    execute(state, "pc1", command, { mode: "user" });
  assert.match(
    run(`curl http://${SERVICE_NAME}/entregas/actual`).output,
    /200 OK/,
  );
  configure(state, "sw1", {
    kind: "port",
    number: 4,
    up: false,
    vlan: 9,
    mode: "access",
    trusted: false,
  });
  assert.match(run("ping 10.44.9.80").output, /desactivado/);
  configure(state, "sw1", {
    kind: "port",
    number: 4,
    up: true,
    vlan: 8,
    mode: "access",
    trusted: false,
  });
  assert.match(run("ping 10.44.9.80").output, /VLAN/);
  configure(state, "sw1", {
    kind: "port",
    number: 4,
    up: true,
    vlan: 9,
    mode: "access",
    trusted: false,
  });
  configure(state, "r1", { kind: "delete-acl", id: 10 });
  assert.match(
    run(`curl http://${SERVICE_NAME}/entregas/actual`).output,
    /filtro/,
  );
  configure(state, "dns1", {
    kind: "dns",
    name: SERVICE_NAME,
    ip: "10.44.9.18",
  });
  assert.match(run(`dig ${SERVICE_NAME}`).output, /10.44.9.18/);
});
test("reiniciar descarta running sin guardar, conserva startup y exige repetir las pruebas", () => {
  const state = initialState("network-01");
  execute(state, "dns1", `dns set ${SERVICE_NAME} 10.44.9.80`, {
    mode: "user",
  });
  execute(state, "dns1", "reload", { mode: "user" });
  assert.equal(state.running.dns1.records[SERVICE_NAME], "10.44.9.18");
  execute(state, "dns1", `dns set ${SERVICE_NAME} 10.44.9.80`, {
    mode: "user",
  });
  execute(state, "dns1", "copy running-config startup-config", {
    mode: "user",
  });
  execute(state, "pc1", `dig ${SERVICE_NAME}`, { mode: "user" });
  execute(state, "pc1", `curl http://${SERVICE_NAME}/entregas/actual`, {
    mode: "user",
  });
  assert.equal(validateMission("network-01", state).correct, true);
  execute(state, "dns1", "reload", { mode: "user" });
  assert.equal(state.running.dns1.records[SERVICE_NAME], "10.44.9.80");
  assert.equal(validateMission("network-01", state).correct, false);
});
test("un permiso global no supera la política específica del caso de filtrado", () => {
  const state = initialState("network-04");
  configure(state, "r1", {
    kind: "acl",
    rule: {
      id: 1,
      action: "permit",
      protocol: "any",
      source: "any",
      destination: "any",
      port: null,
    },
  });
  execute(state, "pc1", `curl http://${SERVICE_NAME}/entregas/actual`, {
    mode: "user",
  });
  assert.equal(state.tests.at(-1)?.ok, true);
  assert.equal(validateMission("network-04", state).correct, false);
});
test("órdenes ajenas y destinos externos no ejecutan acciones fuera del modelo", () => {
  const state = initialState("free"),
    before = structuredClone(state.running);
  for (const command of [
    "rm -rf /",
    "cat /etc/passwd",
    "curl https://example.com",
    "show running-config; id",
  ]) {
    const result = execute(state, "pc1", command, { mode: "user" });
    assert.ok(result.output.startsWith("%") || /NXDOMAIN/.test(result.output));
  }
  assert.deepEqual(state.running, before);
  assert.equal(state.capture.length, 0);
});
test("las capturas representan DHCP sin dirección, MTU desde router y FTP por su canal de datos", () => {
  const state = initialState("network-02");
  execute(state, "pc1", "dhcp discover", { mode: "user" });
  assert.equal(state.capture[0].source, "0.0.0.0");
  assert.equal(state.capture[0].sourcePort, 68);
  assert.ok(
    state.capture
      .filter((p) => p.info === "DHCP Offer")
      .every((p) => p.destination === "255.255.255.255"),
  );
  const mtu = initialState("network-06");
  execute(mtu, "pc1", "ping 10.44.9.80 size 1400 df", { mode: "user" });
  assert.equal(mtu.capture.at(-1)?.source, "10.44.8.1");
  assert.equal(mtu.capture.at(-1)?.details.Code, "4");
  const files = initialState("free");
  execute(files, "pc1", "ftp get remesas.interno.example/cierre.txt", {
    mode: "user",
  });
  assert.ok(
    files.capture.some(
      (p) => p.protocol === "FTP-DATA" && p.sourcePort === 50000,
    ),
  );
  assert.notEqual(
    files.capture.find((p) => p.protocol === "FTP-DATA")?.stream,
    files.capture.find((p) => p.protocol === "FTP")?.stream,
  );
  assert.ok(
    files.capture.every((p, i) => !i || p.time >= files.capture[i - 1].time),
  );
});
