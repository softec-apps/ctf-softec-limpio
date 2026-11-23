import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialWirelessState,
  executeWireless,
  readyWireless,
  presentWireless,
} from "../apps/api/src/wireless/engine";
import { testNames, ticket } from "../apps/api/src/wireless/scenarios";
import {
  certificateHash,
  validateServerCertificate,
} from "../apps/api/src/wireless/certificates";
import {
  wirelessRepairs,
  wirelessAssessmentCommand,
  wirelessTransferRepairs,
} from "./wireless-fixtures";
import type { WirelessId } from "../packages/wireless-contracts";

const ids: WirelessId[] = ["wireless-08", "wireless-09", "wireless-10"];
for (const id of ids)
  test(`${id}: diagnosticar, aplicar, probar y verificar un cambio de servicio`, () => {
    const seed = "fixture-campus-17",
      state = initialWirelessState(id, seed);
    const run = (line: string) =>
      executeWireless(
        id,
        state,
        line,
        seed,
        () => "CTF{comprobante_de_prueba}",
      );
    assert(!run("verify").includes("CTF{"));
    assert.match(run("test all"), /^[\w-]+: FAIL$/m);
    const original = JSON.stringify(state.running);
    const view = () => presentWireless(id, 0, state, seed);
    if (state.learning) {
      run(
        "configure gateway " +
          (id === "wireless-08"
            ? "guestToStaff deny"
            : "allowUnbonded disabled"),
      );
      assert.throws(() => run("commit"), /diagnóstico/);
      run(wirelessAssessmentCommand(id, view()));
    }
    for (const command of wirelessRepairs(id, ticket(id, seed))) run(command);
    assert.equal(JSON.stringify(state.running), original);
    assert(!run("verify").includes("CTF{"));
    run("commit");
    assert.equal(state.checks.length, 0);
    assert(!run("verify").includes("CTF{"));
    assert.doesNotMatch(run("test all"), /^[\w-]+: FAIL$/m);
    assert.equal(state.checks.length, testNames(id).length);
    if (state.learning) {
      assert(!readyWireless(id, state, seed));
      assert(!run("verify").includes("CTF{"));
      assert.equal(state.learning.stage, "transfer");
      assert.equal(state.learning.accepted, false);
      const transferRepairs = wirelessTransferRepairs(id, view());
      run(id === "wireless-08" ? transferRepairs.at(-1)! : transferRepairs[0]);
      assert.throws(() => run("commit"), /diagnóstico/);
      run(wirelessAssessmentCommand(id, view()));
      for (const command of wirelessTransferRepairs(id, view())) run(command);
      run("commit");
      assert.doesNotMatch(run("test all"), /^[\w-]+: FAIL$/m);
    }
    assert(readyWireless(id, state, seed));
    assert(run("verify").includes("CTF{"));
    assert.equal(state.verified, state.generation);
    assert(state.packets.length > 10);
    const first = wirelessRepairs(id, ticket(id, seed))[0];
    run(first);
    assert.equal(state.verified, null);
    run("reset --confirm");
    assert.equal(state.generation, 0);
    assert.equal(state.checks.length, 0);
    assert.equal(state.verified, null);
    assert(!run("verify").includes("CTF{"));
  });

test("EAP: firmas y cadena reales rechazan raíz externa, nombre erróneo y certificado caducado", () => {
  const anchors = [certificateHash("campus-ca")],
    names = ["radius-a.campus.example", "radius-b.campus.example"];
  assert.equal(
    validateServerCertificate("primary", anchors, names).accepted,
    true,
  );
  assert.equal(
    validateServerCertificate("secondary", anchors, names).accepted,
    true,
  );
  assert.equal(
    validateServerCertificate("foreign", anchors, names).reason,
    "unknown_ca",
  );
  assert.equal(
    validateServerCertificate("wrong-name", anchors, names).reason,
    "server_name_mismatch",
  );
  assert.equal(
    validateServerCertificate("expired", anchors, names).reason,
    "certificate_expired_or_not_yet_valid",
  );
});

for (const id of ["wireless-08", "wireless-09"] as const) {
  for (const variant of [0, 1])
    test(`${id}: evidencias, predicción y segunda avería variante ${variant}`, () => {
      let seed = "",
        state = initialWirelessState(id, "search");
      for (let index = 0; index < 100; index++) {
        seed = `variant-${index}`;
        state = initialWirelessState(id, seed);
        if (state.learning!.variant === variant) break;
      }
      assert.equal(state.learning!.variant, variant);
      const run = (line: string) =>
        executeWireless(id, state, line, seed, () => "CTF{checked}");
      const view = () => presentWireless(id, 0, state, seed);
      const answer = wirelessAssessmentCommand(id, view());
      const [, cause, prediction, refs] = answer.split(" ");
      run(`assess wrong ${prediction} ${refs}`);
      assert.equal(state.learning!.accepted, false);
      run(`assess ${cause} wrong ${refs}`);
      assert.equal(state.learning!.accepted, false);
      const first = refs.split(",")[0];
      run(`assess ${cause} ${prediction} ${first},${first}`);
      assert.equal(state.learning!.accepted, false);
      run(answer);
      for (const command of wirelessRepairs(id, ticket(id, seed))) run(command);
      run("commit");
      run("test all");
      assert(!run("verify").includes("CTF{"));
      assert.equal(state.learning!.stage, "transfer");
      run(wirelessAssessmentCommand(id, view()));
      for (const command of wirelessRepairs(id, ticket(id, seed))) run(command);
      run("commit");
      run("test all");
      assert(!run("verify").includes("CTF{"));
      for (const command of wirelessTransferRepairs(id, view())) run(command);
      run("commit");
      run("test all");
      assert(run("verify").includes("CTF{"));
      assert.equal(state.learning!.records.length, 2);
    });
}

test("la configuración rechaza propiedades ajenas, metacaracteres y cambios sin commit", () => {
  const id = "wireless-08",
    state = initialWirelessState(id, "campus");
  const run = (line: string) =>
    executeWireless(id, state, line, "campus", () => "NO");
  for (const line of [
    "configure __proto__ x y",
    "configure gateway __proto__ deny",
    "configure gateway dhcpRelay 999.1.1.1",
    "configure ap-west allowedVlans 4096",
    "configure gateway guestToStaff deny;exit",
    "bash",
    "reset",
  ])
    assert.throws(() => run(line));
  run("configure gateway guestToStaff deny");
  assert.equal(state.running.gateway.guestToStaff, "allow");
  run("rollback");
  assert.equal(state.candidate.gateway.guestToStaff, "allow");
});

test("no se acepta silenciar radios, retirar invitados o desconectar la telemetría", () => {
  for (const id of ids) {
    const seed = "continuidad",
      state = initialWirelessState(id, seed);
    const run = (line: string) =>
      executeWireless(id, state, line, seed, () => "CTF{NO}");
    if (state.learning)
      run(wirelessAssessmentCommand(id, presentWireless(id, 0, state, seed)));
    for (const command of wirelessRepairs(id, ticket(id, seed))) run(command);
    run("commit");
    run(
      id === "wireless-08"
        ? "configure ap-west rf disabled"
        : id === "wireless-09"
          ? "configure telemetry notifications disabled"
          : "configure radius secondary disabled",
    );
    run("commit");
    run("test all");
    assert(!run("verify").includes("CTF{"));
  }
});
