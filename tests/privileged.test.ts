import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { maintenanceArtifacts } from "../apps/api/src/privileged/artifacts";
import {
  initialPrivilegedState,
  operateMaintenance,
  type MaintenanceAction,
} from "../apps/api/src/privileged/engine";
import { cryptoTool } from "../apps/api/src/privileged/crypto-tools";
import { solveMaintenance } from "./privileged-fixtures";

test("la cadena oculta se resuelve desde artefactos y criptografía reales, sin evaluar código", async () => {
  const state = initialPrivilegedState();
  const artifacts = maintenanceArtifacts("qa-uno");
  const flag = await solveMaintenance(
    async (action) =>
      operateMaintenance(state, action as MaintenanceAction, artifacts),
    async (command) => cryptoTool(command),
  );
  assert.equal(flag, artifacts.flag);
  assert.equal(state.vault, true);
  assert.equal(state.policy, true);
  assert.equal(state.reads.length, 10);
});
test("no se omiten pasos ni se aceptan artefactos o firmas de otra estación", () => {
  const state = initialPrivilegedState(),
    own = maintenanceArtifacts("qa-uno"),
    other = maintenanceArtifacts("qa-dos");
  assert.throws(
    () =>
      operateMaintenance(state, { op: "vault", signature: own.signature }, own),
    /restringido/,
  );
  operateMaintenance(state, { op: "visit", url: "/" }, own);
  assert.throws(
    () =>
      operateMaintenance(
        state,
        { op: "login", alias: "svc.continuidad", password: own.password },
        own,
      ),
    /incompleto/,
  );
  assert.throws(
    () =>
      operateMaintenance(
        state,
        { op: "visit", url: "https://example.com/" },
        own,
      ),
    /ajena/,
  );
  assert.throws(
    () =>
      operateMaintenance(
        state,
        { op: "visit", url: "/custodia/sobre.json" },
        own,
      ),
    /restringido/,
  );
  state.identity = true;
  state.recovery = true;
  state.reads.push("/politicas/respaldo.snapshot");
  assert.throws(
    () =>
      operateMaintenance(state, { op: "restore", document: other.policy }, own),
    /no válido/,
  );
  assert.throws(
    () =>
      operateMaintenance(
        state,
        {
          op: "restore",
          document: own.policy.replace("custody:sign", "admin:real"),
        },
        own,
      ),
    /no válido/,
  );
  operateMaintenance(state, { op: "restore", document: own.policy }, own);
  state.reads.push("/custodia/sobre.json");
  assert.throws(
    () =>
      operateMaintenance(
        state,
        { op: "vault", signature: other.signature },
        own,
      ),
    /no es válida/,
  );
});
test("las herramientas criptográficas limitan argumentos y rechazan material manipulado", () => {
  assert.throws(
    () => cryptoTool("crypto pbkdf2 prueba 0011 99999999"),
    /Iteraciones/,
  );
  assert.throws(() => cryptoTool("crypto decrypt-gcm 00 00 00 00"), /Longitud/);
  assert.throws(() => cryptoTool("crypto hmac clave mensaje"), /hexadecimal/);
  assert.match(cryptoTool("crypto help"), /decrypt-gcm/);
});
