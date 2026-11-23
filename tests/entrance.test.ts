import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENTRANCE_CHALLENGE } from "../apps/api/src/entrance/catalog";
import { entrancePin, matchesEntrancePin } from "../apps/api/src/entrance/pin";
import {
  entranceTicket,
  hasEntranceTicket,
} from "../apps/api/src/entrance/ticket";
test("la pista del HTML se genera al servir la página y el panel usa cuatro dígitos", () => {
  const html = readFileSync("apps/web/index.html", "utf8");
  assert.ok(html.includes("Código de acceso: __ENTRANCE_PIN__"));
  assert.ok(!/Código de acceso: [0-9]+/.test(html));
  assert.equal(ENTRANCE_CHALLENGE.id, "primer-rastro");
  assert.equal(ENTRANCE_CHALLENGE.points, 1);
  assert.equal(ENTRANCE_CHALLENGE.device, "entrance");
});
test("el PIN anónimo rota y conserva las pistas recientes del mismo navegador", () => {
  const now = Date.now();
  let pin = entrancePin(undefined, now);
  for (let index = 0; index < 20; index++) {
    assert.match(pin.code, /^[0-9]{4}$/);
    assert.ok(matchesEntrancePin(pin.code, pin.token, now));
    const next = entrancePin(pin.token, now);
    assert.notEqual(next.code, pin.code);
    assert.equal(matchesEntrancePin(pin.code, next.token, now), true);
    pin = next;
  }
  assert.equal(
    matchesEntrancePin(pin.code, pin.token, pin.expiresAt.getTime()),
    false,
  );
  assert.equal(matchesEntrancePin(pin.code, pin.token, now - 1), false);
  assert.equal(
    matchesEntrancePin(
      pin.code,
      pin.token.replace(/.$/, pin.token.endsWith("0") ? "1" : "0"),
      now,
    ),
    false,
  );
  assert.equal(matchesEntrancePin(pin.code, undefined, now), false);
  assert.equal(matchesEntrancePin("12345678", pin.token, now), false);
  assert.equal(matchesEntrancePin("abcd", pin.token, now), false);
});
test("abrir el código fuente y otras pestañas no invalida el PIN visible", () => {
  const now = Date.now();
  const page = entrancePin(undefined, now);
  const source = entrancePin(page.token, now + 1000);
  const tab = entrancePin(source.token, now + 2000);
  for (const pin of [page, source, tab]) {
    assert.ok(matchesEntrancePin(pin.code, tab.token, now + 2000));
    assert.equal(matchesEntrancePin(pin.code, undefined, now + 2000), false);
  }
  let otherBrowser = entrancePin(undefined, now);
  while ([page.code, source.code, tab.code].includes(otherBrowser.code))
    otherBrowser = entrancePin(undefined, now);
  assert.equal(
    matchesEntrancePin(otherBrowser.code, tab.token, now + 2000),
    false,
  );
  assert.equal(
    matchesEntrancePin(page.code, tab.token, now + 12 * 3600000),
    false,
  );
  assert.ok(matchesEntrancePin(tab.code, tab.token, now + 12 * 3600000));
});
test("el historial firmado está acotado y rechaza manipulación, exceso y caducidad", () => {
  const now = Date.now();
  const first = entrancePin(undefined, now);
  let latest = first;
  for (let index = 1; index <= 8; index++)
    latest = entrancePin(latest.token, now);
  assert.equal(matchesEntrancePin(first.code, latest.token, now), false);
  assert.ok(latest.token.length < 1024);
  assert.equal(
    matchesEntrancePin(latest.code, latest.token + "~extra", now),
    false,
  );
  assert.equal(matchesEntrancePin(latest.code, "x".repeat(1025), now), false);
  assert.equal(
    matchesEntrancePin(latest.code, latest.token, now + 12 * 3600000),
    false,
  );
  const refreshed = entrancePin(latest.token, now + 12 * 3600000);
  assert.ok(
    matchesEntrancePin(refreshed.code, refreshed.token, now + 12 * 3600000),
  );
});
test("el pase firmado expira y rechaza valores inventados o manipulados", () => {
  const now = Date.now(),
    ticket = entranceTicket(now);
  assert.ok(hasEntranceTicket(ticket.token, now));
  assert.ok(hasEntranceTicket(ticket.token, now + 3600000));
  assert.equal(
    hasEntranceTicket(ticket.token, ticket.expiresAt.getTime()),
    false,
  );
  assert.equal(hasEntranceTicket(ticket.token, now - 1), false);
  assert.equal(
    hasEntranceTicket(
      ticket.token.replace(/.$/, ticket.token.endsWith("0") ? "1" : "0"),
      now,
    ),
    false,
  );
  assert.equal(hasEntranceTicket("true", now), false);
  assert.equal(hasEntranceTicket("1234", now), false);
  assert.equal(hasEntranceTicket(undefined, now), false);
  assert.equal(hasEntranceTicket("x".repeat(101), now), false);
});
