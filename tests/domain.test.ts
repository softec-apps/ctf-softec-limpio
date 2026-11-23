import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  DOMAIN_CASES,
  DOMAIN_CHALLENGES,
  DOMAIN_WORDS,
} from "../apps/api/src/domain/catalog";
import {
  executeDomain,
  initialDomainState,
  type DomainAccess,
} from "../apps/api/src/domain/engine";
import {
  encryptPreference,
  decryptPreference,
  crackCapture,
  offlineVerifier,
} from "../apps/api/src/domain/credentials";
import { solveDomain } from "./domain-fixtures";
const access: DomainAccess = {
  connected: true,
  enabled: DOMAIN_CASES.map((c) => c.id),
  password: (account) =>
    account === "archivo"
      ? DOMAIN_WORDS[3]
      : account === "svc_reportes"
        ? DOMAIN_WORDS[7]
        : "Clave-de-prueba-2026!",
  flag: (index) => `CTF{${String(index).padStart(32, "0")}}`,
  seal: (value) =>
    createHmac("sha256", "clave-unitaria-no-produccion")
      .update(value)
      .digest("hex"),
};
test("diez casos de dominio, 19 puntos, objetivos en Windows desde Linux", () => {
  assert.equal(DOMAIN_CASES.length, 10);
  assert.equal(
    DOMAIN_CHALLENGES.reduce((s, c) => s + c.points, 0),
    19,
  );
  assert.ok(
    DOMAIN_CHALLENGES.every(
      (c) => c.device === "domain" && c.description.includes("PC Linux"),
    ),
  );
  assert.ok(!JSON.stringify(DOMAIN_CHALLENGES).includes("CTF{"));
});
test("diez evidencias requieren consulta, recuperación y modificaciones efectivas", async () => {
  const state = initialDomainState(),
    seen: string[] = [];
  await solveDomain(
    async (command) => executeDomain(state, command, access),
    async (id, flag) => {
      seen.push(id);
      assert.ok(state.proofs.includes(id));
      assert.equal(
        flag,
        access.flag(DOMAIN_CASES.findIndex((c) => c.id === id)),
      );
    },
  );
  assert.equal(seen.length, 10);
  assert.deepEqual(state.groups.Despliegue, ["practicas"]);
  assert.equal(state.policy.applied, state.policy.version);
  assert.deepEqual(state.delegates, ["ANALISTA$"]);
  assert.ok(state.events.some((e) => e.actor === "SYSTEM"));
  assert.ok(state.events.some((e) => e.id === 4724));
  assert.ok(state.events.some((e) => e.id === 4887));
  assert.ok(
    state.events.every(
      (e) => !JSON.stringify(e).includes("Clave-de-prueba-2026!"),
    ),
  );
});
test("VPN se exige para operar, el material capturado se analiza offline", () => {
  const state = initialDomainState();
  assert.throws(
    () => executeDomain(state, "domain scan", { ...access, connected: false }),
    /VPN/,
  );
  executeDomain(state, "domain capture asrep archivo", access);
  const result = executeDomain(
    state,
    "domain crack asrep-archivo.json diccionario.txt",
    { ...access, connected: false },
  );
  assert.ok(result.includes(DOMAIN_WORDS[3]));
  assert.ok(
    executeDomain(state, "domain local diccionario.txt", {
      ...access,
      connected: false,
    }).includes(DOMAIN_WORDS[0]),
  );
});
test("los permisos de grupo, cuenta, directiva y tickets se comprueban por objeto", () => {
  const state = initialDomainState(),
    auth = " -u practicas -p Clave-de-prueba-2026!";
  assert.throws(
    () =>
      executeDomain(state, "domain smb Despliegue control.txt" + auth, access),
    /DENIED/,
  );
  assert.throws(
    () =>
      executeDomain(
        state,
        "domain group add Administradores practicas" + auth,
        access,
      ),
    /INSUFFICIENT/,
  );
  assert.throws(
    () =>
      executeDomain(
        state,
        "domain password responsable una-clave-suficiente" + auth,
        access,
      ),
    /INSUFFICIENT/,
  );
  assert.throws(
    () => executeDomain(state, "domain gpo apply" + auth, access),
    /INSUFFICIENT/,
  );
  assert.throws(
    () =>
      executeDomain(
        state,
        "domain smb C$ Lab/Pruebas/custodia.txt --ticket inventado",
        access,
      ),
    /emitida/,
  );
  assert.throws(
    () => executeDomain(state, "domain local ../../.env", access),
    /disponible/,
  );
});
test("GPP se cifra y descifra con AES real; los candidatos se verifican por derivación", () => {
  const password = "Árbol y señal 2026!";
  assert.equal(decryptPreference(encryptPreference(password)), password);
  assert.throws(() => decryptPreference("inválido!"));
  const capture = {
    format: "seventech-offline-v1" as const,
    kind: "AS-REP" as const,
    account: "archivo",
    salt: "sal-unitaria",
    iterations: 2000 as const,
    verifier: offlineVerifier("secreto", "sal-unitaria"),
  };
  assert.equal(crackCapture(capture, ["otra", "secreto"]), "secreto");
  assert.equal(crackCapture(capture, ["otra"]), null);
  assert.throws(() =>
    crackCapture({ ...capture, verifier: "incorrecto" }, ["secreto"]),
  );
});
test("deshabilitar una vulnerabilidad revoca su efecto; reset revoca credenciales", async () => {
  const state = initialDomainState();
  await solveDomain(
    async (command) => executeDomain(state, command, access),
    async () => {},
  );
  const revoked = {
    ...access,
    enabled: access.enabled.filter((id) => id !== "ad-09"),
  };
  assert.throws(
    () =>
      executeDomain(
        state,
        "domain smb Direccion control.txt --ticket cert-responsable.json",
        revoked,
      ),
    /no permite/,
  );
  state.issued["ticket-ws01.json"].token = "manipulado";
  assert.throws(
    () =>
      executeDomain(
        state,
        "domain smb C$ Lab/Pruebas/custodia.txt --ticket ticket-ws01.json",
        access,
      ),
    /Firma/,
  );
  executeDomain(state, "domain reset --confirm", access);
  assert.equal(state.generation, 1);
  assert.equal(state.events.length, 0);
  assert.equal(state.proofs.length, 0);
  assert.throws(
    () =>
      executeDomain(
        state,
        "domain smb C$ Lab/Pruebas/custodia.txt --ticket ticket-ws01.json",
        access,
      ),
    /emitida/,
  );
});
