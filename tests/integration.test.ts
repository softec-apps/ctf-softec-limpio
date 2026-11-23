import { runEnigma } from "../packages/enigma-machine";
import { registrationFixture } from "./registration-fixtures";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import {
  CRYPTO_CHALLENGES,
  cryptoFlag,
  cryptoFolder,
} from "../apps/api/src/crypto/catalog";
import {
  WINDOWS_CHALLENGES,
  windowsFolder,
  windowsFlag,
} from "../apps/api/src/windows/catalog";
import { normalizeWindowsPath } from "../apps/api/src/windows/filesystem";
import {
  NETWORK_CHALLENGES,
  networkFolder,
  networkFlag,
} from "../apps/api/src/network/catalog";
import { REFERENCE_BOOKS } from "../apps/api/src/library/catalog";
import { OSINT_LABS, osintFlag } from "../apps/api/src/osint/catalog";
import { transformText } from "../apps/web/src/web-lab/toolkit/textTransforms";
import { flagValue } from "../apps/api/src/security";
import { readWorkstationFile } from "../apps/api/src/workstation-files";

test("Recorrido real de identidad, autorización y competición", async (t) => {
  const registration = registrationFixture();
  let app = await createApp();
  await app.listen(0, "127.0.0.1");
  let base = await app.getUrl();
  const prefix = "qa_" + randomBytes(4).toString("hex");
  const password = randomBytes(18).toString("base64url");
  let cookie = "";
  let adminCookie = "";
  let flag = "";
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    session = cookie,
    origin: string | undefined = process.env.APP_ORIGIN,
  ) {
    const prepared = await registration.prepare(
      base,
      path,
      method,
      body,
      session,
    );
    body = prepared.body;
    session = prepared.cookie;
    const response = await fetch(base + "/api/v1" + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(session ? { cookie: session } : {}),
        ...(origin ? { origin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { response, data };
  }
  try {
    await t.test("la API y PostgreSQL responden", async () => {
      assert.equal((await request("/health")).data.status, "ok");
    });
    await t.test("las rutas privadas rechazan invitados", async () => {
      assert.equal(
        (await request("/game", "GET", undefined, "")).response.status,
        401,
      );
      assert.equal(
        (await request("/admin/overview", "GET", undefined, "")).response
          .status,
        401,
      );
    });
    await t.test(
      "el servidor rechaza códigos inválidos y roles suministrados por el cliente",
      async () => {
        assert.equal(
          (
            await request(
              "/auth/register",
              "POST",
              { alias: prefix, password, code: "incorrecto" },
              "",
            )
          ).response.status,
          400,
        );
        assert.equal(
          (
            await request(
              "/auth/register",
              "POST",
              {
                alias: prefix,
                password,
                code: process.env.REGISTRATION_CODE,
                role: "ADMIN",
              },
              "",
            )
          ).response.status,
          400,
        );
      },
    );
    await t.test(
      "el registro crea un participante con cookie protegida",
      async () => {
        const r = await request(
          "/auth/register",
          "POST",
          { alias: prefix, password, code: process.env.REGISTRATION_CODE },
          "",
        );
        assert.equal(r.response.status, 201);
        assert.equal(r.data.user.role, "PARTICIPANT");
        const setCookie = r.response.headers.get("set-cookie")!;
        assert.match(setCookie, /HttpOnly/i);
        assert.match(setCookie, /SameSite=Strict/i);
        cookie = setCookie.split(";")[0];
        assert.equal((await request("/me")).data.user.alias, prefix);
      },
    );
    await t.test(
      "alias duplicados y contraseñas incorrectas se rechazan",
      async () => {
        assert.equal(
          (
            await request(
              "/auth/register",
              "POST",
              { alias: prefix, password, code: process.env.REGISTRATION_CODE },
              "",
            )
          ).response.status,
          409,
        );
        assert.equal(
          (
            await request(
              "/auth/login",
              "POST",
              { alias: prefix, password: "incorrecta" },
              "",
            )
          ).response.status,
          401,
        );
      },
    );
    await t.test(
      "el participante no puede leer ni modificar el dashboard",
      async () => {
        assert.equal((await request("/admin/overview")).response.status, 403);
        assert.equal(
          (
            await request("/admin/challenges/primer-rastro", "PATCH", {
              points: 999,
              enabled: false,
            })
          ).response.status,
          403,
        );
      },
    );
    await t.test(
      "las peticiones desde un origen ajeno se rechazan",
      async () => {
        assert.equal(
          (
            await request(
              "/auth/logout",
              "POST",
              {},
              cookie,
              "https://otro.example",
            )
          ).response.status,
          403,
        );
      },
    );
    await t.test(
      "el catálogo público autenticado no revela flags ni verificadores",
      async () => {
        const r = await request("/game");
        assert.equal(r.data.score, 0);
        assert.ok(r.data.challenges.length >= 1);
        const serialized = JSON.stringify(r.data);
        assert.ok(!serialized.includes("flagVerifier"));
        assert.ok(!serialized.includes("CTF{"));
      },
    );
    await t.test(
      "la terminal limita comandos y rutas al sistema de archivos virtual",
      async () => {
        const run = (command: string, cwd = "/home/analista") =>
          request("/challenges/primer-rastro/commands", "POST", {
            command,
            cwd,
          });
        assert.equal((await run("whoami")).data.output, "analista");
        assert.match((await run("nmap")).data.output, /no disponible/);
        assert.match((await run("ls -la")).data.output, /LEEME.txt/);
        assert.match((await run("cat /etc/passwd")).data.output, /No existe/);
        assert.equal((await run("pwd", "/etc")).response.status, 400);
        assert.match((await run("cat LEEME.txt")).data.output, /evidencia/);
        const r = await run("cat evidencia/mensaje.txt");
        flag = r.data.output.match(/CTF\{[a-f0-9]+\}/)?.[0];
        assert.ok(flag);
      },
    );
    await t.test(
      "el explorador consulta la misma evidencia y rechaza rutas externas e invitados",
      async () => {
        const root = await request(
          "/challenges/primer-rastro/files?path=%2Fhome%2Fanalista",
        );
        assert.equal(root.response.status, 200);
        assert.equal(root.data.type, "directory");
        assert.ok(
          root.data.entries.some(
            (e: any) => e.name === "evidencia" && e.type === "directory",
          ),
        );
        assert.ok(!JSON.stringify(root.data).includes("CTF{"));
        const evidence = await request(
          "/challenges/primer-rastro/files?path=%2Fhome%2Fanalista%2Fevidencia%2Fmensaje.txt",
        );
        assert.equal(evidence.data.type, "file");
        assert.ok(evidence.data.content.includes(flag));
        assert.equal(
          (
            await request(
              "/challenges/primer-rastro/files?path=%2Fetc%2Fpasswd",
            )
          ).response.status,
          404,
        );
        assert.equal(
          (
            await request(
              "/challenges/primer-rastro/files?path=%2Fhome%2Fanalista%2F..%2F..%2Fetc%2Fpasswd",
            )
          ).response.status,
          404,
        );
        assert.equal(
          (
            await request(
              "/challenges/primer-rastro/files",
              "GET",
              undefined,
              "",
            )
          ).response.status,
          401,
        );
      },
    );
    await t.test(
      "los puntos y la identidad del cliente no se aceptan",
      async () => {
        assert.equal(
          (
            await request("/challenges/primer-rastro/submissions", "POST", {
              flag,
              userId: "otro",
              points: 9000,
            })
          ).response.status,
          400,
        );
        const r = await request(
          "/challenges/primer-rastro/submissions",
          "POST",
          { flag: "CTF{incorrecta}" },
        );
        assert.equal(r.data.correct, false);
        assert.equal((await request("/game")).data.score, 0);
      },
    );
    await t.test(
      "doce envíos concurrentes conceden puntos una sola vez",
      async () => {
        const results = await Promise.all(
          Array.from({ length: 12 }, () =>
            request("/challenges/primer-rastro/submissions", "POST", { flag }),
          ),
        );
        assert.ok(results.every((r) => r.response.ok && r.data.correct));
        assert.equal(results.filter((r) => r.data.awardedPoints > 0).length, 1);
        const game = (await request("/game")).data;
        const challenge = game.challenges.find(
          (c: any) => c.id === "primer-rastro",
        );
        assert.equal(game.solves.length, 1);
        assert.equal(game.score, challenge.points);
      },
    );
    await t.test(
      "otro participante no hereda el progreso y el ranking usa resultados persistidos",
      async () => {
        const r = await request(
          "/auth/register",
          "POST",
          {
            alias: prefix + "_b",
            password,
            code: process.env.REGISTRATION_CODE,
          },
          "",
        );
        const other = r.response.headers.get("set-cookie")!.split(";")[0];
        assert.equal(
          (await request("/game", "GET", undefined, other)).data.score,
          0,
        );
        const entries = (await request("/ranking")).data.entries;
        assert.equal(entries.find((e: any) => e.alias === prefix).solved, 1);
        assert.equal(
          entries.find((e: any) => e.alias === prefix + "_b").score,
          0,
        );
      },
    );
    await t.test(
      "el administrador accede al dashboard y sus cambios quedan auditados",
      async () => {
        const r = await request(
          "/admin/auth/login",
          "POST",
          {
            alias: process.env.ADMIN_ALIAS,
            password: process.env.ADMIN_PASSWORD,
          },
          "",
        );
        assert.equal(r.data.user.role, "ADMIN");
        adminCookie = r.response.headers.get("set-cookie")!.split(";")[0];
        const overview = await request(
          "/admin/overview",
          "GET",
          undefined,
          adminCookie,
        );
        assert.equal(overview.response.status, 200);
        const current = overview.data.challenges.find(
          (c: any) => c.id === "primer-rastro",
        );
        try {
          assert.equal(
            (
              await request(
                "/admin/challenges/primer-rastro",
                "PATCH",
                { points: current.points + 1, enabled: false },
                adminCookie,
              )
            ).response.status,
            400,
          );
          assert.equal(
            (
              await request(
                "/admin/challenges/primer-rastro",
                "PATCH",
                { points: current.points, enabled: false },
                adminCookie,
              )
            ).response.status,
            200,
          );
          assert.equal(
            (
              await request("/challenges/primer-rastro/commands", "POST", {
                command: "help",
              })
            ).response.status,
            404,
          );
          const next = await request(
            "/admin/overview",
            "GET",
            undefined,
            adminCookie,
          );
          assert.ok(
            next.data.audits.some((a: any) => a.action === "challenge.updated"),
          );
        } finally {
          await request(
            "/admin/challenges/primer-rastro",
            "PATCH",
            { points: current.points, enabled: current.enabled },
            adminCookie,
          );
        }
      },
    );
    await t.test(
      "la sesión y el progreso sobreviven al reinicio de la aplicación",
      async () => {
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.equal((await request("/me")).data.user.alias, prefix);
        assert.equal((await request("/game")).data.solves.length, 1);
      },
    );
    await t.test(
      "las pistas del escenario están protegidas y se combinan para resolver un reto",
      async () => {
        const catalogue = await request("/scene/objects", "GET", undefined, "");
        assert.equal(catalogue.response.status, 200);
        assert.ok(catalogue.data.objects.length > 3);
        assert.ok(!JSON.stringify(catalogue.data).includes("CTF{"));
        assert.equal(
          (await request("/scene/objects/notebook", "GET", undefined, ""))
            .response.status,
          401,
        );
        assert.equal(
          (
            await request(
              "/scene/objects/notebook/documents/book-3",
              "GET",
              undefined,
              "",
            )
          ).response.status,
          401,
        );
        assert.equal(
          (await request("/scene/objects/archive/documents/book-3")).response
            .status,
          404,
        );
        const records: { time: string; value: string }[] = [];
        let documentCount = 0;
        for (const id of ["notebook", "archive", "noticeboard"]) {
          const listing = await request("/scene/objects/" + id);
          assert.equal(listing.response.status, 200);
          assert.ok(
            listing.data.documents.every((d: any) => d.body === undefined),
          );
          for (const metadata of listing.data.documents) {
            documentCount++;
            const result = await request(
              "/scene/objects/" + id + "/documents/" + metadata.id,
            );
            assert.equal(result.response.status, 200);
            const text = result.data.body;
            assert.ok(
              !/Fragmento [ABC]|siguiente registro|Combina los fragmentos/.test(
                text,
              ),
            );
            if (!text.includes("ST-041")) continue;
            const time = text.match(/23:\d{2}/)?.[0];
            const value = text.match(
              /(?:[a-f0-9]{2} ){4}[a-f0-9]{2}|\b[a-f0-9]{10,12}\b/i,
            )?.[0];
            if (time && value)
              records.push({ time, value: value.replace(/ /g, "") });
          }
        }
        assert.equal(documentCount, 26);
        assert.equal(records.length, 3);
        records.sort((a, b) => a.time.localeCompare(b.time));
        const wrong = await request(
          "/challenges/turno-nocturno/submissions",
          "POST",
          {
            flag:
              "CTF{" +
              [...records]
                .reverse()
                .map((r) => r.value)
                .join("") +
              "}",
          },
        );
        assert.equal(wrong.data.correct, false);
        const answer = await request(
          "/challenges/turno-nocturno/submissions",
          "POST",
          { flag: "CTF{" + records.map((r) => r.value).join("") + "}" },
        );
        assert.equal(answer.data.correct, true);
        assert.equal((await request("/game")).data.solves.length, 2);
      },
    );
    await t.test(
      "el laboratorio OWASP exige sesión, origen válido y un reto web disponible",
      async () => {
        const path = "/challenges/archivo-sin-fronteras/web";
        const body = { url: "http://archivo.seventech.local/" };
        assert.equal(
          (await request(path, "POST", body, "")).response.status,
          401,
        );
        assert.equal(
          (await request(path, "POST", body, cookie, "https://otro.invalid"))
            .response.status,
          403,
        );
        assert.equal(
          (await request("/challenges/primer-rastro/web", "POST", body))
            .response.status,
          404,
        );
        assert.equal(
          (await request(path, "POST", { ...body, role: "ADMIN" })).response
            .status,
          400,
        );
        const configuration = (await request("/game")).data.challenges.find(
          (challenge: any) => challenge.id === "archivo-sin-fronteras",
        );
        try {
          await request(
            "/admin/challenges/archivo-sin-fronteras",
            "PATCH",
            { enabled: false, points: configuration.points },
            adminCookie,
          );
          assert.equal(
            (await request(path, "POST", body)).response.status,
            404,
          );
          assert.equal(
            (
              await request(
                "/challenges/archivo-sin-fronteras/commands",
                "POST",
                { command: "curl http://archivo.seventech.local/" },
              )
            ).response.status,
            404,
          );
        } finally {
          await request(
            "/admin/challenges/archivo-sin-fronteras",
            "PATCH",
            { enabled: configuration.enabled, points: configuration.points },
            adminCookie,
          );
        }
      },
    );
    await t.test(
      "el portal limita su catálogo a Operaciones y permite investigar la exposición IDOR",
      async () => {
        const path = "/challenges/archivo-sin-fronteras/web";
        const visit = (url: string) => request(path, "POST", { url });
        const home = await visit("http://archivo.seventech.local/");
        assert.equal(home.data.status, 200);
        assert.equal(home.data.documents.length, 3);
        assert.ok(!JSON.stringify(home.data).includes("1042"));
        assert.ok(!JSON.stringify(home.data).includes("CTF{"));
        const ordinary = await visit("/expedientes/4101");
        assert.ok(ordinary.data.body.includes("Operaciones"));
        assert.ok(!ordinary.data.body.includes("CTF{"));
        const records = await request(
          "/challenges/archivo-sin-fronteras/files?path=%2Fhome%2Fanalista%2Fevidencia%2Farchivo-access.log",
        );
        assert.ok(!records.data.content.includes("/expedientes/1042"));
        assert.match(records.data.content, /lote=41xx/);
        assert.equal((await visit("/expedientes/1042")).data.status, 404);
        assert.ok(!records.data.content.includes("CTF{"));
        assert.equal((await visit("/expedientes/9999")).data.status, 404);
        for (const url of [
          "http://127.0.0.1:3001/",
          "https://example.com/",
          "file:///etc/passwd",
          "//169.254.169.254/",
          "http://archivo.seventech.local@evil.invalid/",
          "http://archivo.seventech.local/?redirect=otra",
        ]) {
          assert.equal((await visit(url)).response.status, 400);
        }
      },
    );
    await t.test(
      "navegador y curl recuperan la misma evidencia y solo conceden puntos una vez",
      async () => {
        const challengeId = "archivo-sin-fronteras";
        const before = (await request("/game")).data;
        const challenge = before.challenges.find(
          (entry: any) => entry.id === challengeId,
        );
        const scan = await request(
          `/challenges/${challengeId}/commands`,
          "POST",
          {
            command:
              "ffuf -u http://archivo.seventech.local/expedientes/FUZZ -w herramientas/archivo-ids.txt -mc 200",
          },
        );
        assert.equal(scan.response.status, 201);
        assert.match(scan.data.output, /Progreso: 100\/100/);
        assert.ok(!scan.data.output.includes("CTF{"));
        const candidates = [
          ...scan.data.output.matchAll(/^(\d{4}) \[Status: 200/gm),
        ].map((match) => match[1]);
        assert.equal(candidates.length, 8);
        let page: Awaited<ReturnType<typeof request>> | undefined;
        let recordId = "";
        for (const candidate of candidates) {
          const result = await request(
            `/challenges/${challengeId}/web`,
            "POST",
            { url: `/expedientes/${candidate}` },
          );
          if (result.data.body.includes("Sello de custodia: CTF{")) {
            page = result;
            recordId = candidate;
          }
        }
        assert.ok(page);
        assert.ok(
          !["4101", "4104", "4107", "4108", "4116", "4127", "4133"].includes(
            recordId,
          ),
        );
        assert.match(page.data.body, /Área: Dirección/);
        const answer = page.data.body.match(/CTF\{[a-f0-9]+\}/)?.[0];
        assert.ok(answer);
        const terminal = await request(
          `/challenges/${challengeId}/commands`,
          "POST",
          {
            command: `curl -i http://archivo.seventech.local/expedientes/${recordId}`,
          },
        );
        assert.ok(terminal.data.output.includes(answer));
        assert.match(terminal.data.output, /HTTP\/1.1 200 OK/);
        const rejected = await request(
          `/challenges/${challengeId}/commands`,
          "POST",
          { command: "curl http://127.0.0.1:3001/api/v1/admin/overview" },
        );
        assert.match(rejected.data.output, /solo consulta el portal/);
        const previousVersion = await request(
          `/challenges/${challengeId}/submissions`,
          "POST",
          { flag: flagValue(challengeId) },
        );
        assert.equal(previousVersion.data.correct, false);
        const wrong = await request(
          `/challenges/${challengeId}/submissions`,
          "POST",
          { flag: "CTF{incorrecta}" },
        );
        assert.equal(wrong.data.correct, false);
        assert.equal((await request("/game")).data.score, before.score);
        const submissions = await Promise.all(
          Array.from({ length: 3 }, () =>
            request(`/challenges/${challengeId}/submissions`, "POST", {
              flag: answer,
            }),
          ),
        );
        assert.ok(submissions.every((result) => result.data.correct));
        const after = (await request("/game")).data;
        assert.equal(after.score, before.score + challenge.points);
        assert.equal(
          after.solves.filter((solve: any) => solve.challengeId === challengeId)
            .length,
          1,
        );
      },
    );
    await t.test(
      "ffuf valida diccionario, destino y filtros sin revelar cuerpos",
      async () => {
        const run = (command: string) =>
          request("/challenges/archivo-sin-fronteras/commands", "POST", {
            command,
          });
        assert.match((await run("which ffuf")).data.output, /\/usr\/bin\/ffuf/);
        assert.match((await run("ffuf -h")).data.output, /edición simulada/);
        assert.match((await run("ffuf")).data.output, /indica -u/);
        assert.match(
          (
            await run(
              "ffuf -u http://example.com/FUZZ -w herramientas/archivo-ids.txt",
            )
          ).data.output,
          /solo consulta/,
        );
        assert.match(
          (
            await run(
              "ffuf -u http://archivo.seventech.local/expedientes/FUZZ -w no-existe.txt",
            )
          ).data.output,
          /No existe/,
        );
        assert.match(
          (
            await run(
              "ffuf -u http://archivo.seventech.local/expedientes/FUZZ -w evidencia/servicio.txt",
            )
          ).data.output,
          /identificadores/,
        );
        assert.match(
          (
            await run(
              "ffuf -u http://archivo.seventech.local/expedientes/FUZZ -w herramientas/archivo-ids.txt -mc 500",
            )
          ).data.output,
          /filtros inválidos/,
        );
        assert.match(
          (
            await run(
              "ffuf -u http://archivo.seventech.local/expedientes/FUZZ -w herramientas/archivo-ids.txt -w herramientas/archivo-ids.txt",
            )
          ).data.output,
          /argumentos inválidos/,
        );
        const command =
          "ffuf -u http://archivo.seventech.local/expedientes/FUZZ -w herramientas/archivo-ids.txt -mc all";
        const full = (await run(command)).data.output;
        const absent = /^\d{4} \[Status: 404, Size: (\d+)\]/m.exec(full);
        assert.ok(absent);
        const filtered = (await run(command + " -fs " + absent[1])).data.output;
        assert.ok(!filtered.includes("Status: 404"));
        assert.match(filtered, /Coincidencias: 8/);
        const directory = await request(
          "/challenges/archivo-sin-fronteras/files?path=%2Fhome%2Fanalista%2Fherramientas",
        );
        assert.ok(
          directory.data.entries.some(
            (entry: any) => entry.name === "archivo-ids.txt",
          ),
        );
        assert.ok(!JSON.stringify(directory.data).includes("CTF{"));
        const changed = await request(
          "/challenges/archivo-sin-fronteras/commands",
          "POST",
          { command: "cd herramientas" },
        );
        assert.equal(changed.data.cwd, "/home/analista/herramientas");
        const local = await request(
          "/challenges/archivo-sin-fronteras/commands",
          "POST",
          {
            command:
              "ffuf -u http://archivo.seventech.local/expedientes/FUZZ -w archivo-ids.txt",
            cwd: changed.data.cwd,
          },
        );
        assert.match(local.data.output, /Coincidencias: 8/);
      },
    );
    await t.test(
      "el buscador SQL protege el acceso y no revela el informe con consultas normales",
      async () => {
        const path = "/challenges/consulta-sin-limites/web";
        const body = { url: "http://boletines.seventech.local/" };
        assert.equal(
          (await request(path, "POST", body, "")).response.status,
          401,
        );
        assert.equal(
          (await request(path, "POST", body, cookie, "https://otro.invalid"))
            .response.status,
          403,
        );
        const catalogue = await request("/game");
        const current = catalogue.data.challenges.find(
          (challenge: any) => challenge.id === "consulta-sin-limites",
        );
        assert.ok(current);
        assert.ok(!JSON.stringify(catalogue.data).includes("CTF{"));
        for (const term of ["", "horarios", "interno", "informe", "%"]) {
          const result = await request(path, "POST", {
            url: "/?q=" + encodeURIComponent(term),
          });
          assert.equal(result.data.status, 200);
          assert.ok(!JSON.stringify(result.data).includes("CTF{"));
        }
        const normal = await request(path, "POST", { url: "/?q=horarios" });
        assert.equal(normal.data.results.length, 1);
        assert.match(normal.data.results[0].title, /Horarios/);
        for (const url of [
          "http://127.0.0.1/",
          "http://archivo.seventech.local/",
          "/?q=a&q=b",
          "/?admin=1",
          "/?q=" + "x".repeat(161),
        ])
          assert.equal(
            (await request(path, "POST", { url })).response.status,
            400,
          );
        try {
          const disabled = await request(
            "/admin/challenges/consulta-sin-limites",
            "PATCH",
            { enabled: false, points: current.points },
            adminCookie,
          );
          assert.equal(disabled.response.status, 200);
          assert.equal(
            (await request(path, "POST", body)).response.status,
            404,
          );
        } finally {
          await request(
            "/admin/challenges/consulta-sin-limites",
            "PATCH",
            { enabled: current.enabled, points: current.points },
            adminCookie,
          );
        }
      },
    );
    await t.test(
      "el buscador distingue errores, tautologías y condiciones falsas",
      async () => {
        const search = (term: string) =>
          request("/challenges/consulta-sin-limites/web", "POST", {
            url: "/?q=" + encodeURIComponent(term),
          });
        const broken = await search("'");
        assert.equal(broken.data.status, 500);
        assert.match(broken.data.body, /SQLSTATE/);
        const failedCurl = await request(
          "/challenges/consulta-sin-limites/commands",
          "POST",
          { command: "curl -i http://boletines.seventech.local/?q=%27" },
        );
        assert.match(
          failedCurl.data.output,
          /HTTP\/1.1 500 Internal Server Error/,
        );
        assert.ok(!broken.data.body.includes("CTF{"));
        for (const payload of [
          "' OR 1=2 --",
          "' OR 'a'='b' --",
          "union select",
          "<script>alert(1)</script>",
        ]) {
          assert.ok(
            !JSON.stringify((await search(payload)).data).includes("CTF{"),
          );
        }
        for (const payload of [
          "' OR 1=1 --",
          "' oR 'a'='a' -- ",
          "%' OR 2 = 2 --",
        ]) {
          const result = await search(payload);
          assert.equal(result.data.results.length, 4);
          const evidence = result.data.results.find(
            (record: any) => record.id === "B-INT",
          );
          assert.match(evidence.body, /CTF\{/);
        }
        const missing = await request(
          "/challenges/consulta-sin-limites/web",
          "POST",
          { url: "/boletines/B-INT" },
        );
        assert.equal(missing.data.status, 404);
      },
    );
    await t.test(
      "el reto SQL comparte evidencia con curl y concede sus puntos una sola vez",
      async () => {
        const id = "consulta-sin-limites";
        const before = (await request("/game")).data;
        const challenge = before.challenges.find(
          (entry: any) => entry.id === id,
        );
        const url =
          "http://boletines.seventech.local/?q=" +
          encodeURIComponent("' OR 1=1 --");
        const browser = await request(`/challenges/${id}/web`, "POST", { url });
        const flag = browser.data.results
          .find((record: any) => record.id === "B-INT")
          .body.match(/CTF\{[a-f0-9]+\}/)[0];
        const terminal = await request(`/challenges/${id}/commands`, "POST", {
          command: "curl -i " + url,
        });
        assert.ok(terminal.data.output.includes(flag));
        const files = await request(
          `/challenges/${id}/files?path=%2Fhome%2Fanalista%2Fevidencia%2Fbuscador.log`,
        );
        assert.match(files.data.content, /SQLSTATE/);
        assert.ok(!files.data.content.includes(flag));
        assert.equal(
          (
            await request(`/challenges/${id}/submissions`, "POST", {
              flag: "CTF{incorrecta}",
            })
          ).data.correct,
          false,
        );
        const results = await Promise.all(
          Array.from({ length: 3 }, () =>
            request(`/challenges/${id}/submissions`, "POST", { flag }),
          ),
        );
        assert.ok(results.every((result) => result.data.correct));
        const after = (await request("/game")).data;
        assert.equal(after.score, before.score + challenge.points);
        assert.equal(
          after.solves.filter((solve: any) => solve.challengeId === id).length,
          1,
        );
      },
    );
    await t.test(
      "existe exactamente un reto por categoría OWASP Web 2025",
      async () => {
        const game = (await request("/game")).data;
        const web = game.challenges.filter((entry: any) =>
          /OWASP A\d{2}:2025/.test(entry.category),
        );
        assert.equal(web.length, 10);
        const categories = web
          .map((entry: any) => entry.category.match(/OWASP (A\d{2}):2025/)[1])
          .sort();
        assert.deepEqual(
          categories,
          Array.from(
            { length: 10 },
            (_, index) => "A" + String(index + 1).padStart(2, "0"),
          ),
        );
        assert.ok(!JSON.stringify(web).includes("CTF{"));
        for (const challenge of web) {
          assert.equal(challenge.device, "computer");
          const catalogue = await request("/scene/objects/computer");
          assert.equal(catalogue.response.status, 200);
        }
      },
    );
    const expandedCases: {
      id: string;
      category: string;
      ordinary: string;
      wrong: string;
      solve: (
        id: string,
        visit: (url: string) => Promise<Awaited<ReturnType<typeof request>>>,
      ) => Promise<Awaited<ReturnType<typeof request>>>;
    }[] = [
      {
        id: "modo-depuracion",
        category: "A02",
        ordinary: "/robots.txt",
        wrong: "/admin/config",
        solve: async (_, visit) => {
          const robots = await visit("/robots.txt");
          assert.match(robots.data.body, /_diagnostics/);
          const listing = await visit("/_diagnostics/");
          assert.match(listing.data.body, /runtime.json/);
          return visit("/_diagnostics/runtime.json");
        },
      },
      {
        id: "dependencia-fantasma",
        category: "A03",
        ordinary: "/resolve?package=st-reportkit&registry=internal",
        wrong: "/resolve?package=otro&registry=public",
        solve: async (_, visit) =>
          visit("/resolve?package=st-reportkit&registry=auto"),
      },
      {
        id: "cifrado-de-turno",
        category: "A04",
        ordinary: "/",
        wrong: "/descifrar?cipher=zz&key=x",
        solve: async (id, visit) => {
          const home = await visit("/");
          const cipher = home.data.form.fields.find(
            (field: any) => field.name === "cipher",
          ).value;
          const config = await request(
            `/challenges/${id}/files?path=/home/analista/evidencia/mantenimiento.ini`,
          );
          const key = config.data.content.match(/backup.key=([^\n]+)/)[1];
          const cli = await request(`/challenges/${id}/commands`, "POST", {
            command: `codec xor ${cipher} ${key}`,
          });
          const response = await visit(
            `/descifrar?cipher=${cipher}&key=${encodeURIComponent(key)}`,
          );
          assert.equal(cli.data.output, response.data.body);
          return response;
        },
      },
      {
        id: "carrito-de-confianza",
        category: "A06",
        ordinary: "/confirmar?items=5&total=300",
        wrong: "/confirmar?items=-1&total=-1",
        solve: async (_, visit) => visit("/confirmar?items=5&total=1"),
      },
      {
        id: "sesion-sin-firma",
        category: "A07",
        ordinary:
          "/validar?token=eyJhbGciOiJub25lIn0.eyJzdWIiOiJhdWRpdG9yLWRlbW8iLCJyb2xlIjoidmlld2VyIn0.",
        wrong: "/validar?token=malformado",
        solve: async (_, visit) => {
          const home = await visit("/");
          const parts = home.data.form.fields[0].value.split(".");
          const header = JSON.parse(
            Buffer.from(parts[0], "base64url").toString(),
          );
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString(),
          );
          payload.role = "admin";
          // Changing only the payload while retaining a signed header must fail.
          const forgedSigned =
            parts[0] +
            "." +
            Buffer.from(JSON.stringify(payload)).toString("base64url") +
            "." +
            parts[2];
          assert.equal(
            (await visit("/validar?token=" + forgedSigned)).data.status,
            403,
          );
          header.alg = "none";
          const forged =
            Buffer.from(JSON.stringify(header)).toString("base64url") +
            "." +
            Buffer.from(JSON.stringify(payload)).toString("base64url") +
            ".";
          return visit("/validar?token=" + forged);
        },
      },
      {
        id: "aprobacion-importada",
        category: "A08",
        ordinary: "/",
        wrong: "/importar?data=invalid!",
        solve: async (_, visit) => {
          const home = await visit("/");
          const original = JSON.parse(
            Buffer.from(home.data.form.fields[0].value, "base64").toString(),
          );
          original.approved = true;
          original.reviewer = "direccion";
          return visit(
            "/importar?data=" +
              encodeURIComponent(
                Buffer.from(JSON.stringify(original)).toString("base64"),
              ),
          );
        },
      },
      {
        id: "alarma-ausente",
        category: "A09",
        ordinary: "/correlacionar?trace=req-7b21",
        wrong: "/correlacionar?trace=otra",
        solve: async (id, visit) => {
          const file = await request(
            `/challenges/${id}/files?path=/home/analista/evidencia/proxy.log`,
          );
          const audit = await request(
            `/challenges/${id}/files?path=/home/analista/evidencia/auditoria.log`,
          );
          const line = file.data.content
            .split("\n")
            .find(
              (entry: string) =>
                entry.includes("restringidos") && entry.includes("status=200"),
            );
          const trace = line.split(" ")[0];
          assert.ok(!audit.data.content.includes(trace));
          return visit("/correlacionar?trace=" + trace);
        },
      },
      {
        id: "permiso-por-excepcion",
        category: "A10",
        ordinary: "/exportar?groups=%5B%5D",
        wrong: "/exportar?groups=invalid-json",
        solve: async (_, visit) => {
          assert.equal(
            (
              await visit(
                "/exportar?groups=" +
                  encodeURIComponent(JSON.stringify(["admin"])),
              )
            ).data.status,
            403,
          );
          return visit("/exportar?groups=null");
        },
      },
    ];
    const newFlags = new Set<string>();
    for (const scenario of expandedCases)
      await t.test(
        `${scenario.category}: recorrido y aislamiento de ${scenario.id}`,
        async () => {
          const path = `/challenges/${scenario.id}/web`;
          const visit = (url: string) => request(path, "POST", { url });
          assert.equal(
            (await request(path, "POST", { url: "/" }, "")).response.status,
            401,
          );
          assert.equal(
            (
              await request(
                path,
                "POST",
                { url: "/" },
                cookie,
                "https://otro.invalid",
              )
            ).response.status,
            403,
          );
          const before = (await request("/game")).data;
          const configuration = before.challenges.find(
            (entry: any) => entry.id === scenario.id,
          );
          assert.ok(
            configuration.category.includes(scenario.category + ":2025"),
          );
          const home = await visit("/");
          assert.equal(home.data.status, 200);
          assert.ok(!JSON.stringify(home.data).includes("CTF{"));
          assert.ok(
            !JSON.stringify((await visit(scenario.ordinary)).data).includes(
              "CTF{",
            ),
          );
          assert.ok(
            !JSON.stringify((await visit(scenario.wrong)).data).includes(
              "CTF{",
            ),
          );
          for (const url of [
            "https://example.com/",
            "http://127.0.0.1/",
            "file:///etc/passwd",
            "//169.254.169.254/",
            "/?unexpected=1",
          ])
            assert.equal((await visit(url)).response.status, 400);
          const evidence = await request(
            `/challenges/${scenario.id}/files?path=/home/analista/evidencia`,
          );
          assert.equal(evidence.data.type, "directory");
          for (const entry of evidence.data.entries) {
            const file = await request(
              `/challenges/${scenario.id}/files?path=/home/analista/evidencia/${entry.name}`,
            );
            assert.ok(!file.data.content.includes("CTF{"));
          }
          try {
            assert.equal(
              (
                await request(
                  `/admin/challenges/${scenario.id}`,
                  "PATCH",
                  { enabled: false, points: configuration.points },
                  adminCookie,
                )
              ).response.status,
              200,
            );
            assert.equal((await visit("/")).response.status, 404);
            assert.equal(
              (
                await request(`/challenges/${scenario.id}/commands`, "POST", {
                  command: "curl /",
                })
              ).response.status,
              404,
            );
          } finally {
            await request(
              `/admin/challenges/${scenario.id}`,
              "PATCH",
              { enabled: configuration.enabled, points: configuration.points },
              adminCookie,
            );
          }
          const solution = await scenario.solve(scenario.id, visit);
          assert.equal(solution.data.status, 200);
          const flag = solution.data.body.match(/CTF\{[a-f0-9]+\}/)?.[0];
          assert.ok(flag);
          assert.ok(!newFlags.has(flag));
          newFlags.add(flag);
          const otherId =
            scenario.id === "modo-depuracion"
              ? "dependencia-fantasma"
              : "modo-depuracion";
          assert.equal(
            (
              await request(`/challenges/${otherId}/submissions`, "POST", {
                flag,
              })
            ).data.correct,
            false,
          );
          assert.equal(
            (
              await request(`/challenges/${scenario.id}/submissions`, "POST", {
                flag: "CTF{incorrecta}",
              })
            ).data.correct,
            false,
          );
          const submissions = await Promise.all(
            Array.from({ length: 3 }, () =>
              request(`/challenges/${scenario.id}/submissions`, "POST", {
                flag,
              }),
            ),
          );
          assert.ok(submissions.every((result) => result.data.correct));
          const after = (await request("/game")).data;
          assert.equal(after.score, before.score + configuration.points);
          assert.equal(
            after.solves.filter(
              (solve: any) => solve.challengeId === scenario.id,
            ).length,
            1,
          );
          assert.equal((await request("/me")).data.user.role, "PARTICIPANT");
        },
      );
    await t.test(
      "codec y grep trabajan solo con texto y archivos virtuales",
      async () => {
        const run = (command: string) =>
          request("/challenges/cifrado-de-turno/commands", "POST", { command });
        const encoded = (await run('codec b64url-encode {"role":"admin"}')).data
          .output;
        assert.equal(
          (await run("codec b64url-decode " + encoded)).data.output,
          '{"role":"admin"}',
        );
        assert.match((await run("codec xor zz key")).data.output, /no válidos/);
        assert.match(
          (await run("grep backup.key evidencia/mantenimiento.ini")).data
            .output,
          /st-archive-2025/,
        );
        assert.match(
          (await run("grep secret /etc/passwd")).data.output,
          /no existe/,
        );
        assert.equal((await run("codec url-decode %27")).data.output, "'");
      },
    );
    await t.test(
      "archivos del equipo virtual sin contexto de reto",
      async () => {
        assert.equal(
          (await request("/workstation/files", "GET", undefined, "")).response
            .status,
          401,
        );
        const filesystemRoot = await request("/workstation/files?path=/");
        assert.equal(filesystemRoot.response.status, 200);
        assert.deepEqual(filesystemRoot.data.entries, [
          { name: "home", type: "directory" },
        ]);
        const home = await request("/workstation/files?path=/home");
        assert.equal(home.response.status, 200);
        assert.deepEqual(home.data.entries, [
          { name: "analista", type: "directory" },
        ]);
        const root = await request("/workstation/files");
        assert.equal(root.response.status, 200);
        assert.ok(
          root.data.entries.some(
            (entry: { name: string }) => entry.name === "servicios",
          ),
        );
        const services = await request(
          "/workstation/files?path=/home/analista/servicios",
        );
        assert.ok(
          services.data.entries.some(
            (entry: { name: string }) =>
              entry.name === "archivo.seventech.local",
          ),
        );
        const basePath = "/home/analista/servicios/archivo.seventech.local";
        const folder = await request(
          "/workstation/files?path=" + basePath + "/evidencia",
        );
        const file = folder.data.entries.find(
          (entry: { type: string }) => entry.type === "file",
        );
        const result = await request(
          "/workstation/files?path=" +
            encodeURIComponent(basePath + "/evidencia/" + file.name),
        );
        const original = await request(
          "/challenges/archivo-sin-fronteras/files?path=" +
            encodeURIComponent("/home/analista/evidencia/" + file.name),
        );
        assert.equal(result.data.content, original.data.content);
        assert.equal(
          (await request("/workstation/files?path=/etc/passwd")).response
            .status,
          404,
        );
        assert.equal(
          (
            await request(
              "/workstation/files?path=/home/analista/../../etc/passwd",
            )
          ).response.status,
          404,
        );
        assert.throws(() => readWorkstationFile([], basePath + "/evidencia"));
        assert.deepEqual(
          readWorkstationFile([], "/home/analista").type,
          "directory",
        );
      },
    );
    await t.test(
      "diez retos de criptografía: cuatro manuales y seis con herramientas",
      async () => {
        // Give this collection its own API lifetime and rate-limit window.
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        const game = (await request("/game")).data;
        const entries = game.challenges.filter((entry: { category: string }) =>
          entry.category.startsWith("Criptografía"),
        );
        assert.equal(entries.length, 10);
        assert.equal(
          entries.filter((entry: { category: string }) =>
            entry.category.endsWith("A mano"),
          ).length,
          4,
        );
        assert.equal(
          entries.filter((entry: { category: string }) =>
            entry.category.endsWith("Con herramientas"),
          ).length,
          6,
        );
        const flags = new Set<string>();
        let earned = 0;
        for (const challenge of CRYPTO_CHALLENGES) {
          const path = `/home/analista/criptografia/${challenge.id}/evidencia`;
          const instructions = await request(
            "/workstation/files?path=" +
              encodeURIComponent(path + "/enunciado.txt"),
          );
          assert.equal(instructions.response.status, 200);
          let flag: string;
          if (challenge.category.endsWith("A mano")) {
            const puzzle = instructions.data.content as string;
            if (challenge.id === "crypto-cesar")
              flag =
                "CTF{" +
                puzzle
                  .match(/Mensaje: ([A-Z]+)/)![1]
                  .replace(/[A-Z]/g, (c) =>
                    String.fromCharCode(
                      65 + ((c.charCodeAt(0) - 65 - 3 + 26) % 26),
                    ),
                  ) +
                "}";
            else if (challenge.id === "crypto-atbash")
              flag =
                "CTF{" +
                puzzle
                  .match(/Mensaje: ([A-Z]+)/)![1]
                  .replace(/[A-Z]/g, (c) =>
                    String.fromCharCode(90 - (c.charCodeAt(0) - 65)),
                  ) +
                "}";
            else if (challenge.id === "crypto-polibio")
              flag =
                "CTF{" +
                puzzle
                  .match(/Mensaje: ([0-9 ]+)/)![1]
                  .trim()
                  .split(" ")
                  .map(
                    (pair) =>
                      "ABCDEFGHIKLMNOPQRSTUVWXYZ"[
                        (+pair[0] - 1) * 5 + (+pair[1] - 1)
                      ],
                  )
                  .join("") +
                "}";
            else {
              const text = puzzle.match(/Mensaje: ([A-Z]+)/)![1];
              flag =
                "CTF{" +
                Array.from(
                  { length: 9 },
                  (_, i) => text[(i % 3) * 3 + Math.floor(i / 3)],
                ).join("") +
                "}";
            }
          } else if (challenge.id === "crypto-capas") {
            const file = await request(
              "/workstation/files?path=" +
                encodeURIComponent(path + "/lote.txt"),
            );
            assert.equal(file.response.status, 200);
            const fragments = [
              ...(file.data.content as string).matchAll(
                /Fragmento recibido (\d\d:\d\d:\d\d)\n([A-Z \n]+?)(?=\n\n|$)/g,
              ),
            ];
            assert.equal(fragments.length, 3);
            const cipher = fragments
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map((part) => part[2].replace(/\s/g, ""))
              .join("");
            const decoded = runEnigma(cipher, {
              rotors: ["III", "I", "V"],
              rings: [4, 11, 19],
              positions: "NOX",
              reflector: "B",
              plugboard: "AV BS CG DL FU HZ IN KM EO RT",
            }).text;
            flag = `CTF{${decoded.match(/LACONTRASENAFINALES([A-Z]+)FINDELTRANSMITIDO/)![1]}}`;
            assert.equal(flag, "CTF{SEVENTECHGDA}");
            assert.equal(
              (
                await request(
                  `/challenges/${challenge.id}/submissions`,
                  "POST",
                  { flag: "CTF{SEVENTECH}" },
                )
              ).data.correct,
              false,
            );
            assert.equal(
              (
                await request(
                  `/challenges/${challenge.id}/submissions`,
                  "POST",
                  { flag: "CTF{INCORRECTA}" },
                )
              ).data.correct,
              false,
            );
          } else {
            const file = await request(
              "/workstation/files?path=" +
                encodeURIComponent(path + "/lote.txt"),
            );
            assert.equal(file.response.status, 200);
            let text = file.data.content as string;
            assert.ok(text.length <= 20000);
            if (challenge.id === "crypto-base64")
              text = transformText("b64-decode", text);
            else if (challenge.id === "crypto-hex")
              text = transformText("hex-decode", text);
            else if (challenge.id === "crypto-binario")
              text = transformText("binary-decode", text);
            else if (challenge.id === "crypto-xor")
              text = transformText("xor", text, "rack-27");
            else if (challenge.id === "crypto-vigenere")
              text = transformText("vigenere-decode", text, "OFICINA");
            else assert.fail(`Codificación no contemplada: ${challenge.id}`);
            flag = text
              .split("\n")
              .find((line) => line.startsWith("ACTA-004:"))!
              .split(": ")[1];
            const decoy = text.split("\n")[0].split(": ")[1];
            assert.equal(
              (
                await request(
                  `/challenges/${challenge.id}/submissions`,
                  "POST",
                  { flag: decoy },
                )
              ).data.correct,
              false,
            );
          }
          assert.equal(flag, cryptoFlag(challenge.id));
          assert.ok(!flags.has(flag));
          flags.add(flag);
          assert.ok(!instructions.data.content.includes(flag));
          assert.equal(
            (
              await request(`/challenges/${challenge.id}/submissions`, "POST", {
                flag,
              })
            ).data.correct,
            true,
          );
          const score = (await request("/game")).data.score;
          assert.equal(
            (
              await request(`/challenges/${challenge.id}/submissions`, "POST", {
                flag,
              })
            ).data.correct,
            true,
          );
          assert.equal((await request("/game")).data.score, score);
          earned += challenge.points;
          assert.throws(() => readWorkstationFile([], path + "/enunciado.txt"));
        }
        assert.equal((await request("/game")).data.score, game.score + earned);
        assert.throws(() => transformText("hex-decode", "123"));
        assert.throws(() => transformText("binary-decode", "0102"));
        assert.throws(() => transformText("vigenere-decode", "texto", "12"));
      },
    );
    await t.test(
      "el libro conserva diez historias y respeta disponibilidad por capítulo",
      async () => {
        assert.equal(
          (await request("/scene/objects/crypto-book", "GET", undefined, ""))
            .response.status,
          401,
        );
        const book = await request("/scene/objects/crypto-book");
        assert.equal(book.response.status, 200);
        assert.equal(book.data.documents.length, 10);
        const folders = await request(
          "/workstation/files?path=/home/analista/criptografia",
        );
        assert.deepEqual(
          folders.data.entries.map((entry: { name: string }) => entry.name),
          CRYPTO_CHALLENGES.map((entry) => cryptoFolder(entry.id)),
        );
        for (const entry of book.data.documents) {
          assert.equal(entry.body, undefined);
          const chapter = await request(
            "/scene/objects/crypto-book/documents/" + entry.id,
          );
          const mirror = await request(
            "/workstation/files?path=" +
              encodeURIComponent(
                `/home/analista/criptografia/${entry.id}/evidencia/enunciado.txt`,
              ),
          );
          assert.equal(chapter.response.status, 200);
          assert.equal(chapter.data.body, mirror.data.content);
          assert.ok(chapter.data.body.includes("Entre las hojas"));
          for (const spoiler of [
            "Base64",
            "hexadecimal",
            "binario",
            "XOR",
            "Vigenère",
            "Decodifica",
            "Se cifró",
            "Orden de empaquetado",
            "Usa el Transformador",
          ])
            assert.ok(
              !chapter.data.body.includes(spoiler),
              `El capítulo ${entry.id} revela ${spoiler}`,
            );
          const canonical = await request(
            "/workstation/files?path=" +
              encodeURIComponent(
                `/home/analista/criptografia/${cryptoFolder(entry.id)}/evidencia/enunciado.txt`,
              ),
          );
          assert.equal(canonical.data.content, mirror.data.content);

          assert.ok(!chapter.data.body.includes(cryptoFlag(entry.id)));
        }
        const id = "crypto-cesar";
        const configuration = await db.challenge.findUniqueOrThrow({
          where: { id },
          select: { enabled: true },
        });
        try {
          await db.challenge.update({
            where: { id },
            data: { enabled: false },
          });
          const listing = await request("/scene/objects/crypto-book");
          assert.ok(
            !listing.data.documents.some(
              (entry: { id: string }) => entry.id === id,
            ),
          );
          assert.equal(
            (await request("/scene/objects/crypto-book/documents/" + id))
              .response.status,
            404,
          );
        } finally {
          await db.challenge.update({
            where: { id },
            data: { enabled: configuration.enabled },
          });
        }
      },
    );
    await t.test(
      "diez investigaciones OSINT con fuentes, búsqueda y puntuación independiente",
      async () => {
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        const game = (await request("/game")).data;
        assert.equal(
          game.challenges.filter((entry: { category: string }) =>
            entry.category.startsWith("OSINT"),
          ).length,
          10,
        );
        const solutions: { answer: string; references: [string, RegExp][] }[] =
          [
            {
              answer: "nube_de_tinta",
              references: [
                ["/cultura/programa", /N-17/],
                ["/revista/convocatoria", /Cuadernos del Este/],
                ["/comunidad/perfiles", /nube_de_tinta.*Mara Ríos/],
              ],
            },
            {
              answer: "plaza_del_olmo",
              references: [
                ["/fototeca/sobre-8", /reloj cuadrado/],
                ["/obras/fuentes", /tres peces/],
                ["/biblioteca/accesos", /oriental de la plaza del Olmo/],
              ],
            },
            {
              answer: "20251018_0235",
              references: [
                ["/radio/aviso", /21:35/],
                ["/municipio/reloj", /UTC−05:00/],
                ["/agencia/cable", /02:50 UTC/],
              ],
            },
            {
              answer: "taller_ambar",
              references: [
                ["/boletin/rectificacion", /TA-08/],
                ["/contratos/firma", /TA-08/],
              ],
            },
            {
              answer: "archivo_lumbre_example",
              references: [
                ["/directorio/archivo", /AL-11.*TR-19/],
                ["/avisos/traslado", /archivo-lumbre.example/],
                ["/comunidad/amigos", /independiente/],
              ],
            },
            {
              answer: "anden_4",
              references: [
                ["/manifiestos/ll48", /V-208/],
                ["/horarios/servicios", /R-73.*V-208/],
                ["/estacion/obras", /R-73 llega al andén 4/],
              ],
            },
            {
              answer: "sala_de_las_mareas",
              references: [
                ["/agenda/actual", /28 de octubre/],
                ["/archivo/captura-28", /Sala de las Mareas/],
                ["/reservas/borrador", /no se envió/],
              ],
            },
            {
              answer: "fiesta_del_agua",
              references: [
                ["/campana/cartel", /LM-204/],
                ["/fototeca/lm204", /F-22, fotograma 6/],
                ["/cuadernos/ct9", /Fiesta del Agua/],
              ],
            },
            {
              answer: "equipo_cedro",
              references: [
                ["/proyectos/mirador", /OV-217/],
                ["/directorio/colaboradores", /OV-217: Lucía Vera/],
                ["/memorias/equipos", /Equipo Cedro:.*OV-217/],
              ],
            },
            {
              answer: "puerta_norte",
              references: [
                ["/registro/depositos", /D-17.*EC-06/],
                ["/entidades/cambios", /EC-06:.*Taller del Estuario/],
                ["/directorio/sedes", /Taller del Estuario: sede B/],
                ["/agenda/retiros", /Puerta Norte/],
              ],
            },
          ];
        let points = 0;
        for (const [index, lab] of OSINT_LABS.entries()) {
          const id = lab.challenge.id;
          const visit = (url: string, session = cookie) =>
            request(`/challenges/${id}/web`, "POST", { url }, session);
          assert.equal((await visit(lab.home, "")).response.status, 401);
          const home = await visit(lab.home);
          assert.equal(home.response.status, 201);
          assert.equal(home.data.status, 200);
          assert.ok(home.data.links.length >= 4);
          const flag = `CTF{${solutions[index].answer}}`;
          assert.equal(flag, osintFlag(id));
          assert.ok(!JSON.stringify(home.data).includes(flag));
          for (const link of home.data.links) {
            const page = await visit(link.path);
            assert.equal(page.data.status, 200);
            assert.match(page.data.body, /Fuente:.*\nFecha de la ficha:/);
            assert.ok(!JSON.stringify(page.data).includes(flag));
            const reference = solutions[index].references.find(
              ([path]) => path === link.path,
            );
            if (reference) assert.match(page.data.body, reference[1]);
          }
          assert.ok(
            solutions[index].references.every(([path]) =>
              home.data.links.some(
                (link: { path: string }) => link.path === path,
              ),
            ),
          );
          const result = await visit("/buscar?q=" + encodeURIComponent("2025"));
          assert.equal(result.data.status, 200);
          assert.ok(Array.isArray(result.data.links));
          assert.equal(
            (await visit("/buscar?q=zzzzsincoincidencias")).data.links.length,
            0,
          );
          assert.equal(
            (await visit("https://externo.example/")).response.status,
            400,
          );
          assert.equal(
            (await visit(lab.home.replace("://", "://usuario:clave@"))).response
              .status,
            400,
          );
          assert.equal((await visit("/no-existe")).data.status, 404);
          const curl = await request(`/challenges/${id}/commands`, "POST", {
            command: "curl " + lab.home,
          });
          assert.match(curl.data.output, new RegExp(lab.challenge.title));
          const file = await request(
            "/workstation/files?path=" +
              encodeURIComponent(
                `/home/analista/servicios/${new URL(lab.home).hostname}/evidencia/expediente.txt`,
              ),
          );
          assert.equal(file.response.status, 200);
          assert.ok(file.data.content.includes(lab.home));
          assert.equal(
            (
              await request(`/challenges/${id}/submissions`, "POST", {
                flag: osintFlag(OSINT_LABS[(index + 1) % 10].challenge.id),
              })
            ).data.correct,
            false,
          );
          const solve = await request(`/challenges/${id}/submissions`, "POST", {
            flag,
          });
          assert.equal(solve.data.correct, true);
          assert.equal(solve.data.awardedPoints, lab.challenge.points);
          assert.equal(
            (await request(`/challenges/${id}/submissions`, "POST", { flag }))
              .data.awardedPoints,
            0,
          );
          points += lab.challenge.points;
        }
        assert.equal((await request("/game")).data.score, game.score + points);
        assert.equal(points, 19);
        const id = OSINT_LABS[0].challenge.id;
        const original = await db.challenge.findUniqueOrThrow({
          where: { id },
          select: { enabled: true },
        });
        try {
          await db.challenge.update({
            where: { id },
            data: { enabled: false },
          });
          assert.equal(
            (await request(`/challenges/${id}/web`, "POST", { url: "/" }))
              .response.status,
            404,
          );
          assert.equal(
            (
              await request(
                "/workstation/files?path=/home/analista/servicios/fuentes-01.seventech.local/evidencia/expediente.txt",
              )
            ).response.status,
            404,
          );
          assert.ok(
            !(await request("/game")).data.challenges.some(
              (entry: { id: string }) => entry.id === id,
            ),
          );
        } finally {
          await db.challenge.update({
            where: { id },
            data: { enabled: original.enabled },
          });
        }
      },
    );
    await t.test(
      "el panel OSINT presenta diez sobres sin soluciones y protege cada expediente",
      async () => {
        assert.equal(
          (await request("/scene/objects/osint-board", "GET", undefined, ""))
            .response.status,
          401,
        );
        const panel = await request("/scene/objects/osint-board");
        assert.equal(panel.response.status, 200);
        assert.equal(panel.data.documents.length, 10);
        for (const entry of panel.data.documents) {
          assert.equal(entry.body, undefined);
          const document = await request(
            "/scene/objects/osint-board/documents/" + entry.id,
          );
          assert.equal(document.response.status, 200);
          assert.match(document.data.body, /Recorte encontrado/);
          assert.match(
            document.data.body,
            /Archivo de consulta: http:\/\/fuentes-/,
          );
          assert.ok(!document.data.body.includes(osintFlag(entry.id)));
          assert.equal(
            (
              await request(
                "/scene/objects/osint-board/documents/" + entry.id,
                "GET",
                undefined,
                "",
              )
            ).response.status,
            401,
          );
        }
        assert.equal(
          (await request("/scene/objects/osint-board/documents/crypto-cesar"))
            .response.status,
          404,
        );
        const id = "osint-02";
        const original = await db.challenge.findUniqueOrThrow({
          where: { id },
          select: { enabled: true },
        });
        try {
          await db.challenge.update({
            where: { id },
            data: { enabled: false },
          });
          const filtered = await request("/scene/objects/osint-board");
          assert.equal(filtered.data.documents.length, 9);
          assert.ok(
            !filtered.data.documents.some(
              (entry: { id: string }) => entry.id === id,
            ),
          );
          assert.equal(
            (await request("/scene/objects/osint-board/documents/" + id))
              .response.status,
            404,
          );
        } finally {
          await db.challenge.update({
            where: { id },
            data: { enabled: original.enabled },
          });
        }
      },
    );
    await t.test(
      "biblioteca de consulta sin asociaciones ni material de resolución",
      async () => {
        assert.equal(
          (await request("/scene/objects/library", "GET", undefined, ""))
            .response.status,
          401,
        );
        const listing = await request("/scene/objects/library");
        assert.equal(listing.response.status, 200);
        assert.equal(listing.data.challengeId, null);
        assert.equal(listing.data.documents.length, 25);
        assert.equal(
          new Set(
            listing.data.documents.map(
              (book: { category: string }) => book.category,
            ),
          ).size,
          25,
        );
        const titles = new Set<string>();
        const challenges = (await request("/game")).data.challenges;
        let pages = 0;
        for (const entry of listing.data.documents) {
          assert.equal(entry.body, undefined);
          assert.ok(!titles.has(entry.title));
          titles.add(entry.title);
          const result = await request(
            "/scene/objects/library/documents/" + entry.id,
          );
          assert.equal(result.response.status, 200);
          const book = REFERENCE_BOOKS.find((book) => book.id === entry.id)!;
          assert.equal(entry.category, book.category);
          assert.equal(entry.pageCount, book.pages.length);
          assert.equal(
            result.data.body.split("\n\n§\n\n").length,
            book.pages.length,
          );
          for (const chapter of book.pages)
            assert.ok(chapter.body.length > 180);
          pages += book.pages.length;
          for (const challenge of challenges) {
            assert.ok(!result.data.body.includes(challenge.id));
            assert.ok(!result.data.body.includes(challenge.title));
          }
          for (const forbidden of [
            "CTF{",
            "rack-27",
            "WXUQR",
            "VHKVQL",
            "ACTA-004",
            "N-17",
            "fuentes-01",
            "OFICINA",
            "4100",
            "lote.txt",
            "El último privilegio",
            "gestion.seventech.local",
            "svc.continuidad",
            "recuperador.js",
            "respaldo.snapshot",
            "custodia/sobre.json",
          ])
            assert.ok(
              !result.data.body.includes(forbidden),
              `${entry.id} contiene material específico: ${forbidden}`,
            );
          assert.equal(
            (
              await request(
                "/scene/objects/library/documents/" + entry.id,
                "GET",
                undefined,
                "",
              )
            ).response.status,
            401,
          );
        }
        assert.equal(pages, 274);
        assert.equal(
          (await request("/scene/objects/library/documents/osint-01")).response
            .status,
          404,
        );
        assert.equal(
          (await request("/scene/objects/library/documents/crypto-cesar"))
            .response.status,
          404,
        );
        assert.equal(
          (await request("/scene/objects/library/documents/volume-99")).response
            .status,
          404,
        );
      },
    );
    await t.test(
      "archivo histórico Windows conserva lectura y rechaza flags estáticas sin operaciones",
      async () => {
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        const game = (await request("/game")).data;
        const cases = game.challenges.filter(
          (entry: { device: string }) => entry.device === "laptop",
        );
        assert.equal(cases.length, 10);
        assert.equal(
          (await request("/windows/files", "GET", undefined, "")).response
            .status,
          401,
        );
        assert.equal(
          (await request("/windows/event-logs", "GET", undefined, "")).response
            .status,
          401,
        );
        const read = (path: string, hidden = true) =>
          request(
            "/windows/files?path=" +
              encodeURIComponent(path) +
              "&hidden=" +
              hidden,
          );
        assert.equal((await read("C:/")).data.entries[0].name, "Users");
        assert.equal(
          (await read("c:/users/analista/documents/expedientes/CASO-01")).data
            .type,
          "directory",
        );
        for (const path of [
          "/etc/passwd",
          "file:///etc/passwd",
          "D:/",
          "C:/../secret",
          "C:/Users/Analista/test:stream",
          "\\\\server\\share",
        ])
          assert.equal((await read(path)).response.status, 400);
        assert.equal(
          (await read("C:/Windows/System32/config/SAM")).response.status,
          404,
        );
        assert.equal(
          (await request("/windows/files?hidden=maybe")).response.status,
          400,
        );
        assert.equal(
          normalizeWindowsPath("c:/Users/Analista/./Documents/../Downloads"),
          "C:\\Users\\Analista\\Downloads",
        );
        const logs = (await request("/windows/event-logs")).data.entries;
        assert.equal(logs.length, 5);
        let earned = 0;
        const normalize = (value: string) =>
          value.toLowerCase().replace(/[. -]/g, "_");
        async function collect(
          path: string,
          root = path,
        ): Promise<Record<string, any>> {
          const listing = await read(path);
          assert.equal(listing.response.status, 200);
          const result: Record<string, any> = {};
          for (const entry of listing.data.entries) {
            const name = path + "\\" + entry.name;
            if (entry.type === "directory")
              Object.assign(result, await collect(name, root));
            else {
              const file = await read(name);
              assert.equal(file.response.status, 200);
              result[name.slice(root.length + 1)] = file.data;
            }
          }
          return result;
        }
        for (const [index, challenge] of WINDOWS_CHALLENGES.entries()) {
          const files = await collect(windowsFolder(challenge.id));
          assert.ok(files["expediente.txt"].content.includes(challenge.title));
          for (const file of Object.values(files)) {
            assert.ok(!file.content.includes(windowsFlag(challenge.id)));
            assert.equal(
              file.properties.bytes,
              Buffer.byteLength(file.content),
            );
          }
          let answer = "";
          if (index === 0) {
            const rows = JSON.parse(files["Security.evtx.json"].content);
            const first = rows
              .filter(
                (entry: any) =>
                  entry.eventId === 4624 &&
                  entry.data.LogonType === "10" &&
                  entry.time > "2025-11-01T18:00:00Z",
              )
              .sort((a: any, b: any) => a.time.localeCompare(b.time))[0];
            answer = files["cuentas.csv"].content
              .split("\n")
              .find((line: string) =>
                line.startsWith(first.data.TargetUserSid + ","),
              )!
              .split(",")[1];
          } else if (index === 1) {
            const row = files["papelera.csv"].content
              .split("\n")
              .find((line: string) =>
                line.includes("\\Documents\\acta_cierre.txt"),
              )!
              .split(",");
            answer = normalize(
              files[row[3]].content.match(
                /Referencia de entrega: ([A-Z0-9-]+)/,
              )[1],
            );
          } else if (index === 2) {
            const id = files["escritorio.csv"].content
              .split("\n")[1]
              .split(",")[1];
            const target = files[id + ".lnk.txt"].content
              .match(/Destino: (.+)/)[1]
              .split("\\")
              .at(-1);
            answer = normalize(target);
          } else if (index === 3) {
            const item = Object.entries(files).find(
              ([name, file]) =>
                file.properties.attributes.includes("Hidden") &&
                file.properties.modified > "2025-11-01T18:00:00Z" &&
                !files["inventario.csv"].content.includes(name),
            )![1];
            answer = normalize(
              item.content.match(/Folio interno: ([A-Z0-9-]+)/)[1],
            );
            const without = await read(
              windowsFolder(challenge.id) + "\\Archivo",
              false,
            );
            assert.ok(
              !without.data.entries.some(
                (entry: any) => entry.name === "adjunto.dat.txt",
              ),
            );
            const withHidden = await read(
              windowsFolder(challenge.id) + "\\Archivo",
              true,
            );
            assert.ok(
              withHidden.data.entries.some(
                (entry: any) =>
                  entry.name === "adjunto.dat.txt" && entry.hidden,
              ),
            );
          } else if (index === 4) {
            const rows = JSON.parse(files["Security.evtx.json"].content);
            const selected = rows.find(
              (entry: any) =>
                entry.eventId === 4688 &&
                entry.time >= "2025-11-01T20:00:00Z" &&
                entry.time <= "2025-11-01T20:15:00Z" &&
                entry.data.NewProcessName.includes("\\Downloads\\"),
            );
            answer = normalize(selected.data.NewProcessName.split("\\").at(-1));
          } else if (index === 5) {
            const entries = files["usuario_run.reg.txt"].content
              .split("\n")
              .filter((line: string) => line.includes(" = "));
            const added = entries.find(
              (line: string) =>
                !files["linea_base.csv"].content.includes(
                  line.split(" = ")[0] + ",",
                ),
            )!;
            answer = normalize(added.split(" = ")[0]);
          } else if (index === 6) {
            const rows = JSON.parse(files["Security.evtx.json"].content);
            const created = rows.find(
              (entry: any) => entry.time > "2025-11-01T10:20:00Z",
            );
            assert.ok(
              files["Revision.task.xml.txt"].content.includes("LogonTrigger"),
            );
            answer = normalize(created.data.TaskName.split("\\").at(-1));
          } else if (index === 7) {
            const transfer = files["transferencias.csv"].content
              .split("\n")
              .find((line: string) => line.includes("16:22:00Z"))!;
            const drive = transfer.split(",")[2].slice(0, 2);
            const mount = files["montajes.csv"].content
              .split("\n")
              .slice(1)
              .filter(
                (line: string) =>
                  line.split(",")[1] === drive &&
                  line.split(",")[0] < transfer.split(",")[0],
              )
              .at(-1)!;
            const volume = mount.split(",")[2];
            answer = files["dispositivos.csv"].content
              .split("\n")
              .find((line: string) => line.endsWith("," + volume))!
              .split(",")[0]
              .toLowerCase();
          } else if (index === 8) {
            const content =
              files["copia_final.txt"].content.match(/colección: (DOC-\d+)/)[1];
            const download = files["descargas.csv"].content
              .split("\n")
              .find((line: string) =>
                line.includes("," + content + ",COMPLETE"),
              )!;
            answer = normalize(new URL(download.split(",")[1]).hostname);
          } else {
            const rows = JSON.parse(
              files["Security-preservado.evtx.json"].content,
            );
            const task = rows.find((entry: any) => entry.eventId === 4698);
            const logon = rows.find(
              (entry: any) =>
                entry.eventId === 4624 &&
                entry.data.LogonType === "10" &&
                entry.data.TargetLogonId === task.data.SubjectLogonId,
            );
            const cleared = JSON.parse(
              files["Colector.evtx.json"].content,
            ).find(
              (entry: any) =>
                entry.data.SubjectLogonId === task.data.SubjectLogonId,
            );
            assert.equal(cleared.data.SubjectUserSid, logon.data.TargetUserSid);
            answer = files["cuentas.csv"].content
              .split("\n")
              .find((line: string) =>
                line.startsWith(logon.data.TargetUserSid + ","),
              )!
              .split(",")[1];
          }
          const flag = `CTF{${answer}}`;
          assert.equal(flag, windowsFlag(challenge.id));
          assert.equal(
            (
              await request(`/challenges/${challenge.id}/submissions`, "POST", {
                flag: windowsFlag(WINDOWS_CHALLENGES[(index + 1) % 10].id),
              })
            ).data.correct,
            false,
          );
          const solved = await request(
            `/challenges/${challenge.id}/submissions`,
            "POST",
            { flag },
          );
          assert.equal(solved.data.correct, false);
          assert.equal(solved.data.awardedPoints, 0);
          assert.equal(
            (
              await request(`/challenges/${challenge.id}/submissions`, "POST", {
                flag,
              })
            ).data.awardedPoints,
            0,
          );
        }
        assert.equal(earned, 0);
        assert.equal((await request("/game")).data.score, game.score + earned);
        const id = "windows-01";
        const original = await db.challenge.findUniqueOrThrow({
          where: { id },
          select: { enabled: true },
        });
        try {
          await db.challenge.update({
            where: { id },
            data: { enabled: false },
          });
          assert.equal(
            (await read(windowsFolder(id) + "\\Security.evtx.json")).response
              .status,
            404,
          );
          assert.ok(
            !(await request("/windows/event-logs")).data.entries.some(
              (entry: any) => entry.path.includes("caso-01"),
            ),
          );
        } finally {
          await db.challenge.update({
            where: { id },
            data: { enabled: original.enabled },
          });
        }
      },
    );
    await t.test(
      "diez retos de redes con capturas, rack y puntuación independiente",
      async () => {
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        const game = (await request("/game")).data;
        assert.equal(
          game.challenges.filter((entry: any) =>
            entry.id.startsWith("network-"),
          ).length,
          10,
        );
        assert.equal(
          (await request("/network/captures", "GET", undefined, "")).response
            .status,
          401,
        );
        assert.equal(
          (await request("/scene/objects/rack", "GET", undefined, "")).response
            .status,
          401,
        );
        const index = (await request("/network/captures")).data.entries;
        assert.equal(index.length, 20);
        const rack = (await request("/scene/objects/rack")).data;
        assert.equal(rack.documents.length, 10);
        let points = 0;
        for (const [n, challenge] of NETWORK_CHALLENGES.entries()) {
          const path =
            networkFolder(challenge.id) + "/evidencia/turno.capture.json";
          const file = await request(
            "/workstation/files?path=" + encodeURIComponent(path),
          );
          assert.equal(file.response.status, 200);
          const capture = JSON.parse(file.data.content);
          assert.equal(capture.format, "seventech-capture-v1");
          assert.equal(capture.timezone, "UTC");
          const rows = capture.packets as any[];
          assert.ok(rows.length >= 12);
          assert.deepEqual(
            rows.map((row) => row.number),
            rows.map((_, i) => i + 1),
          );
          assert.deepEqual(
            rows.map((row) => row.time),
            rows.map((row) => row.time).sort(),
          );
          const document = await request(
            `/scene/objects/rack/documents/${challenge.id}`,
          );
          assert.equal(document.response.status, 200);
          assert.ok(document.data.body.includes(path));
          const terminal = await request(
            `/challenges/${challenge.id}/commands`,
            "POST",
            { command: "cat evidencia/expediente.txt" },
          );
          assert.equal(terminal.response.status, 201);
          assert.ok(terminal.data.output.includes(challenge.title));
          const flagForCase = networkFlag(challenge.id);
          assert.ok(!file.data.content.includes(flagForCase));
          assert.ok(!document.data.body.includes(flagForCase));
          let answer = "";
          if (n === 0) {
            const query = rows.find(
              (row) =>
                row.source === "10.44.8.21" &&
                row.details.Query === "inventario.interno.example" &&
                row.details.ResponseCode === undefined,
            );
            answer = rows
              .find(
                (row) =>
                  row.destination === query.source &&
                  row.details.TransactionId === query.details.TransactionId &&
                  row.details.ResponseCode === "NOERROR",
              )
              .details.Answer.replaceAll(".", "_");
          } else if (n === 1) {
            const wrong = rows.find(
              (row) =>
                row.protocol === "ARP" &&
                row.details.SenderIP === "10.44.8.1" &&
                row.details.SenderMAC !== "02:50:00:00:00:01",
            );
            answer = wrong.details.SenderMAC.replaceAll(":", "_");
          } else if (n === 2) {
            const accepted = rows.find(
              (row) =>
                row.protocol === "DHCP" &&
                row.details.MessageType === "ACK" &&
                row.details.ClientMAC === "02:50:00:00:00:23",
            );
            answer = accepted.details.ServerIdentifier.replaceAll(".", "_");
          } else if (n === 3) {
            const reset = rows.find(
              (row) =>
                row.source === "10.44.9.14" &&
                row.details.Flags?.includes("RST"),
            );
            answer = String(reset.sourcePort);
          } else if (n === 4) {
            const ok = rows.find(
              (row) =>
                row.protocol === "HTTP" &&
                row.destination === "10.44.8.41" &&
                row.details.Status === "200",
            );
            answer = ok.payload
              .match(/filename="([^"]+)"/)[1]
              .replaceAll(".", "_");
          } else if (n === 5) {
            const pieces = new Map(
              rows
                .filter(
                  (row) =>
                    row.source === "10.44.8.61" &&
                    row.details.Query?.endsWith(".sonda.interno.example"),
                )
                .map((row) => [
                  row.details.Query.split(".")[0],
                  row.details.Query.split(".")[1],
                ]),
            );
            answer = Buffer.from(
              [...pieces.entries()]
                .sort(([a], [b]) => String(a).localeCompare(String(b)))
                .map(([, value]) => value)
                .join(""),
              "hex",
            ).toString("utf8");
          } else if (n === 6) {
            const control = rows.filter((row) => row.stream === 1);
            const completed = control.findIndex(
              (row) => row.details.ReplyCode === "226",
            );
            const store = control
              .slice(0, completed)
              .filter((row) => row.details.Command === "STOR")
              .at(-1);
            answer = store.payload.trim().split(" ")[1].replaceAll(".", "_");
          } else if (n === 7) {
            const pair = rows.filter(
              (row) =>
                row.details.Identifier === "0x4410" &&
                row.details.Sequence === "7",
            );
            const outgoing = pair.find((row) => row.details.Type === "8");
            const incoming = pair.find((row) => row.details.Type === "0");
            answer =
              String(Date.parse(incoming.time) - Date.parse(outgoing.time)) +
              "_ms";
          } else if (n === 8) {
            const data = rows.find(
              (row) =>
                row.source === "10.44.8.91" &&
                row.protocol === "TLS" &&
                row.info === "Application Data",
            );
            const hello = rows.find(
              (row) => row.stream === data.stream && row.details.ServerName,
            );
            answer = hello.details.ServerName.replaceAll(".", "_");
            assert.equal(data.payload, undefined);
          } else {
            const sent = rows.find(
              (row) =>
                row.source === "10.44.8.44" && row.details.Method === "POST",
            );
            const lease = rows.find(
              (row) =>
                row.protocol === "DHCP" &&
                row.details.AssignedIP === sent.source &&
                row.time < sent.time,
            );
            assert.equal(lease.details.ClientMAC, sent.details.SourceMAC);
            const inventory = document.data.body.match(
              /02:50:00:00:00:64 = ([a-z_]+)/,
            );
            answer = inventory![1];
          }
          const flag = `CTF{${answer}}`;
          assert.equal(flag, flagForCase);
          assert.equal(
            (
              await request(`/challenges/${challenge.id}/submissions`, "POST", {
                flag,
              })
            ).response.status,
            400,
          );
          points += challenge.points;
        }
        assert.equal(points, 19);
        assert.equal((await request("/game")).data.score, game.score);
        assert.equal(
          (await request("/scene/objects/rack/documents/windows-01")).response
            .status,
          404,
        );
        const id = "network-01";
        const original = await db.challenge.findUniqueOrThrow({
          where: { id },
          select: { enabled: true },
        });
        try {
          await db.challenge.update({
            where: { id },
            data: { enabled: false },
          });
          assert.equal(
            (await request("/network/captures")).data.entries.length,
            19,
          );
          assert.ok(
            !(await request("/scene/objects/rack")).data.documents.some(
              (entry: any) => entry.id === id,
            ),
          );
          assert.equal(
            (await request(`/scene/objects/rack/documents/${id}`)).response
              .status,
            404,
          );
          assert.equal(
            (
              await request(
                "/workstation/files?path=" +
                  encodeURIComponent(
                    networkFolder(id) + "/evidencia/turno.capture.json",
                  ),
              )
            ).response.status,
            404,
          );
        } finally {
          await db.challenge.update({
            where: { id },
            data: { enabled: original.enabled },
          });
        }
      },
    );
    await t.test(
      "red operativa persistente: diez incidencias, configuración, aislamiento y puntuación",
      async () => {
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.equal(
          (await request("/network/labs/free", "GET", undefined, "")).response
            .status,
          401,
        );
        assert.equal(
          (await request("/network/labs/not-a-lab")).response.status,
          404,
        );
        const free = (await request("/network/labs/free")).data;
        assert.equal(free.id, "free");
        assert.equal(free.devices.length, 5);
        assert.equal(
          (
            await request("/network/labs/free/validate", "POST", {
              revision: free.revision,
            })
          ).response.status,
          400,
        );
        const { repairs } = await import("./network-repairs");
        const before = (await request("/game")).data.score;
        let earned = 0;
        for (const [id, steps] of Object.entries(repairs)) {
          let lab = (await request("/network/labs/" + id)).data;
          const failure = await request(
            `/network/labs/${id}/validate`,
            "POST",
            { revision: lab.revision },
          );
          assert.equal(failure.data.correct, false);
          assert.equal(failure.data.awardedPoints, 0);
          lab.revision = failure.data.revision;
          for (const [device, commands] of steps) {
            let context: any = { mode: "user" };
            for (const command of commands) {
              const result = await request(
                `/network/labs/${id}/command`,
                "POST",
                { revision: lab.revision, device, command, context },
              );
              assert.equal(
                result.response.status,
                201,
                JSON.stringify(result.data),
              );
              assert.ok(
                !result.data.output.startsWith("%"),
                result.data.output,
              );
              lab = result.data;
              context = result.data.context;
            }
          }
          const saved = (await request("/network/labs/" + id)).data;
          assert.deepEqual(saved.state, lab.state);
          assert.equal(saved.revision, lab.revision);
          const result = await request(`/network/labs/${id}/validate`, "POST", {
            revision: lab.revision,
          });
          assert.equal(result.data.correct, true, JSON.stringify(result.data));
          earned += result.data.awardedPoints;
          const repeat = await request(`/network/labs/${id}/validate`, "POST", {
            revision: result.data.revision,
          });
          assert.equal(repeat.data.correct, true);
          assert.equal(repeat.data.awardedPoints, 0);
          const capture = (await request(`/network/labs/${id}/capture`)).data;
          assert.equal(capture.format, "seventech-capture-v1");
          assert.ok(capture.packets.length > 0);
        }
        assert.equal(earned, 19);
        assert.equal((await request("/game")).data.score, before + 19);
        let lab = (await request("/network/labs/network-01")).data;
        assert.equal(
          (
            await request("/network/labs/network-01/configure", "POST", {
              revision: lab.revision,
              device: "dns1",
              change: {
                kind: "dns",
                name: "remesas.interno.example",
                ip: "10.44.9.18",
              },
            })
          ).response.status,
          201,
        );
        assert.equal(
          (
            await request("/network/labs/network-01/command", "POST", {
              revision: lab.revision,
              device: "pc1",
              command: "help",
            })
          ).response.status,
          409,
        );
        lab = (await request("/network/labs/network-01")).data;
        const overlap = await Promise.all([
          request("/network/labs/network-01/command", "POST", {
            revision: lab.revision,
            device: "pc1",
            command: "help",
          }),
          request("/network/labs/network-01/command", "POST", {
            revision: lab.revision,
            device: "pc1",
            command: "show running-config",
          }),
        ]);
        assert.deepEqual(
          overlap.map((r) => r.response.status).sort(),
          [201, 409],
        );
        lab = (await request("/network/labs/network-01")).data;
        const invalid = await request(
          "/network/labs/network-01/configure",
          "POST",
          {
            revision: lab.revision,
            device: "dns1",
            change: { kind: "dns", name: "outside.example", ip: "999.1.1.1" },
          },
        );
        assert.equal(invalid.response.status, 400);
        assert.equal(
          (
            await request("/network/labs/network-01/configure", "POST", {
              revision: lab.revision,
              device: "sw1",
              userId: "another",
              change: { kind: "snooping", enabled: false },
            })
          ).response.status,
          400,
        );
        const account = await request(
          "/auth/register",
          "POST",
          {
            alias: prefix + "_net",
            password,
            code: process.env.REGISTRATION_CODE,
          },
          "",
        );
        const other = account.response.headers.get("set-cookie")!.split(";")[0];
        assert.equal(
          (await request("/network/labs/network-01", "GET", undefined, other))
            .data.revision,
          0,
        );
        const otherFree = (
          await request("/network/labs/free", "GET", undefined, other)
        ).data;
        await request(
          "/network/labs/free/configure",
          "POST",
          {
            revision: otherFree.revision,
            device: "sw1",
            change: {
              kind: "port",
              number: 1,
              up: false,
              vlan: 8,
              mode: "access",
              trusted: false,
            },
          },
          other,
        );
        assert.equal(
          (await request("/network/labs/free")).data.state.running.sw1.ports[0]
            .up,
          true,
        );
        assert.equal(
          (
            await request(
              "/network/labs/network-01/validate",
              "POST",
              { revision: lab.revision },
              adminCookie,
            )
          ).response.status,
          401,
        );
        assert.ok(
          (await request("/network/captures")).data.entries.some(
            (e: any) => e.path === "/network/labs/network-01/capture",
          ),
        );
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.equal(
          (await request("/network/labs/network-01")).data.state.running.dns1
            .records["remesas.interno.example"],
          "10.44.9.18",
        );
        const original = await db.challenge.findUniqueOrThrow({
          where: { id: "network-01" },
        });
        try {
          await db.challenge.update({
            where: { id: original.id },
            data: { enabled: false },
          });
          assert.equal(
            (await request("/network/labs/network-01")).response.status,
            404,
          );
          assert.equal(
            (
              await request("/network/labs/network-01/validate", "POST", {
                revision: lab.revision,
              })
            ).response.status,
            404,
          );
          assert.ok(
            !(await request("/network/captures")).data.entries.some(
              (e: any) => e.path === "/network/labs/network-01/capture",
            ),
          );
        } finally {
          await db.challenge.update({
            where: { id: original.id },
            data: { enabled: original.enabled },
          });
        }
      },
    );
    await t.test(
      "móvil: diez investigaciones, evidencias virtuales y progreso",
      async () => {
        await app.close();
        app = await createApp();
        await app.listen(0, "127.0.0.1");
        base = await app.getUrl();
        assert.equal(
          (await request("/mobile/artifacts", "GET", undefined, "")).response
            .status,
          401,
        );
        assert.equal(
          (await request("/mobile/files", "GET", undefined, "")).response
            .status,
          401,
        );
        const game = (await request("/game")).data;
        assert.equal(
          game.challenges.filter((c: any) => c.device === "phone").length,
          10,
        );
        const index = (await request("/mobile/artifacts")).data.entries;
        assert.equal(index.length, 19);
        assert.ok(index.every((e: any) => !("content" in e)));
        const load = async (n: number, name: string) => {
          const result = await request(
            `/mobile/files?path=${encodeURIComponent(`/storage/emulated/0/Expedientes/caso-${String(n).padStart(2, "0")}/${name}`)}`,
          );
          assert.equal(result.response.status, 200);
          assert.equal(result.data.type, "file");
          assert.ok(!result.data.content.includes("CTF{"));
          return name.endsWith(".json")
            ? JSON.parse(result.data.content)
            : result.data.content;
        };
        const answers: string[] = [];
        const chat = await load(1, "conversacion.json"),
          journal = await load(1, "diario.json");
        answers.push(
          journal.journal
            .find(
              (e: any) =>
                e.id === chat.messages.find((m: any) => m.deleted).id &&
                e.operation === "insert",
            )
            .text.split(" ")[1]
            .toLowerCase(),
        );
        answers.push(
          (await load(2, "imagenes.json")).assets.find(
            (e: any) =>
              e.id.startsWith("puerta") &&
              !e.derivedFrom &&
              e.captured < "2026-02-12T08:00:00Z",
          ).device,
        );
        const route = await load(3, "recorrido.json");
        const samples = route.samples.filter((e: any) => e.time > "09:10");
        const stop = samples.find((e: any) =>
          samples.some(
            (f: any) =>
              JSON.stringify(f.position) === JSON.stringify(e.position) &&
              Number(f.time.slice(3)) - Number(e.time.slice(3)) >= 10,
          ),
        );
        answers.push(
          Object.keys(route.zones)
            .find(
              (k) =>
                JSON.stringify(route.zones[k]) ===
                JSON.stringify(stop.position),
            )!
            .toLowerCase(),
        );
        const permissions = await load(4, "permisos.json");
        answers.push(
          permissions.grants.find(
            (g: any) =>
              g.state === "granted" &&
              !permissions.approved[g.package].includes(g.permission),
          ).package,
        );
        const notices = await load(5, "avisos.json");
        answers.push(
          notices.notifications
            .filter((n: any) => n.state === "posted")
            .sort(
              (a: any, b: any) => Date.parse(a.emitted) - Date.parse(b.emitted),
            )[0].id,
        );
        const directory = await load(6, "directorio.txt");
        const codes = await load(6, "codigos.json");
        answers.push(
          codes.codes
            .map((c: any) => new URL(c.payload).hostname)
            .find((host: string) => !directory.includes(host)),
        );
        const downloads = await load(7, "descargas.json");
        answers.push(
          downloads.downloads.find(
            (d: any) =>
              d.state === "complete" && d.origin === downloads.approvedOrigin,
          ).content,
        );
        const backup = await load(8, "respaldos.json");
        answers.push(
          backup.snapshots
            .filter(
              (s: any) => s.created < "11:00" && s.records.includes("r17"),
            )
            .sort((a: any, b: any) => b.created.localeCompare(a.created))[0].id,
        );
        const sessions = await load(9, "sesiones.json");
        answers.push(
          sessions.sessions.find(
            (s: any) =>
              s.account === "iris" &&
              s.state === "active" &&
              !["móvil-azul", "estación-2"].includes(s.device),
          ).id,
        );
        const events = await load(10, "eventos.json"),
          mail = await load(10, "buzon.json");
        const event = events.events.find(
          (e: any) => e.action === "open" && e.time === "18:42Z",
        );
        const device = events.sessions.find(
          (s: any) => s.id === event.session,
        ).device;
        answers.push(
          mail.messages
            .find(
              (m: any) =>
                m.device === device &&
                m.state !== "draft" &&
                m.time > event.time,
            )
            .text.split(" ")[1]
            .toLowerCase(),
        );
        const before = (await request("/game")).data.score;
        for (let n = 0; n < 10; n++) {
          const id = `mobile-${String(n + 1).padStart(2, "0")}`;
          assert.equal(
            (
              await request(`/challenges/${id}/submissions`, "POST", {
                flag: `CTF{${answers[(n + 1) % 10]}}`,
              })
            ).data.correct,
            false,
          );
          const correct = await request(
            `/challenges/${id}/submissions`,
            "POST",
            { flag: `CTF{${answers[n]}}` },
          );
          assert.equal(correct.data.correct, true);
          assert.equal(
            (
              await request(`/challenges/${id}/submissions`, "POST", {
                flag: `CTF{${answers[n]}}`,
              })
            ).data.awardedPoints,
            0,
          );
        }
        assert.equal((await request("/game")).data.score - before, 19);
        const folder = (await request("/mobile/files")).data;
        assert.equal(folder.entries.length, 10);
        for (const path of [
          "/etc/passwd",
          "/home/analista",
          "/storage/emulated/0/Expedientes/../secret",
          "https://example.test",
        ])
          assert.equal(
            (await request("/mobile/files?path=" + encodeURIComponent(path)))
              .response.status,
            400,
          );
        const original = await db.challenge.findUniqueOrThrow({
          where: { id: "mobile-01" },
        });
        try {
          await db.challenge.update({
            where: { id: original.id },
            data: { enabled: false },
          });
          assert.equal(
            (await request("/mobile/artifacts")).data.entries.length,
            17,
          );
          assert.equal(
            (
              await request(
                "/mobile/files?path=" +
                  encodeURIComponent(
                    "/storage/emulated/0/Expedientes/caso-01/diario.json",
                  ),
              )
            ).response.status,
            404,
          );
        } finally {
          await db.challenge.update({
            where: { id: original.id },
            data: { enabled: original.enabled },
          });
        }
      },
    );
    await t.test(
      "fotografías JPEG con EXIF y aislamiento de medios",
      async () => {
        const guest = await fetch(
          base + "/api/v1/mobile/media/puerta-original",
        );
        assert.equal(guest.status, 401);
        const media = async (id: string) =>
          fetch(base + "/api/v1/mobile/media/" + id, { headers: { cookie } });
        const response = await media("puerta-original");
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "image/jpeg");
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(bytes.readUInt16BE(0), 0xffd8);
        const { parse } = await import("exifr");
        const tags = await parse(bytes, { reviveValues: false });
        assert.equal(tags.Model, "cam-17");
        assert.equal(tags.DateTimeOriginal, "2026:02:12 07:45:00");
        const copy = await media("puerta-copia");
        assert.equal(
          (await parse(Buffer.from(await copy.arrayBuffer()))).Model,
          "editor-4",
        );
        for (const id of ["qr-recepcion", "qr-ascensor", "qr-soporte"]) {
          const qr = await media(id);
          assert.equal(qr.status, 200);
          assert.match(await qr.text(), /<svg/);
        }
        assert.equal((await media("unknown")).status, 404);
        const enabled = (
          await db.challenge.findUniqueOrThrow({ where: { id: "mobile-02" } })
        ).enabled;
        try {
          await db.challenge.update({
            where: { id: "mobile-02" },
            data: { enabled: false },
          });
          assert.equal((await media("puerta-original")).status, 404);
          assert.ok(
            !(await request("/mobile/artifacts")).data.entries.some((e: any) =>
              e.mediaUrl?.includes("puerta-original"),
            ),
          );
        } finally {
          await db.challenge.update({
            where: { id: "mobile-02" },
            data: { enabled },
          });
        }
        const osint = (
          await request("/challenges/osint-02/web", "POST", {
            url: "http://fuentes-02.seventech.local/fototeca/sobre-8",
          })
        ).data;
        assert.equal(osint.media.src, "/assets/evidence/osint-plaza.jpg");
        assert.ok(osint.source.publisher);
      },
    );
    await t.test("cerrar sesión revoca el token en servidor", async () => {
      assert.equal(
        (await request("/auth/logout", "POST", {})).response.status,
        201,
      );
      assert.equal((await request("/me")).response.status, 401);
    });
  } finally {
    const users = await db.user.findMany({
      where: { alias: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await db.submission.deleteMany({ where: { userId: { in: ids } } });
    await db.solve.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await registration.cleanup();
    await db.$disconnect();
  }
});
