import { DatabaseSync } from "node:sqlite";
export type SqlValue = string | number | null;
export type SqlRow = Record<string, SqlValue>;
export type DatabaseCase = {
  title: string;
  question: string;
  tables: Record<
    string,
    { columns: Record<string, "TEXT" | "INTEGER">; rows: SqlValue[][] }
  >;
  expected: SqlRow[];
  files: Record<string, string>;
};
const functions = new Set([
  "count",
  "sum",
  "min",
  "max",
  "avg",
  "length",
  "lower",
  "upper",
  "coalesce",
]);
export function validateReadQuery(value: string) {
  const query = value.trim().replace(/;$/, "").trim();
  if (
    query.length > 800 ||
    !/^select\b/i.test(query) ||
    /[;"`\[\]]|--|\/\*/.test(query) ||
    /'\s*\(/.test(query)
  )
    throw Error(
      "Usa un SELECT de hasta 800 caracteres, sin comentarios, múltiples sentencias ni identificadores entre comillas.",
    );
  const lexical = query.replace(/'(?:''|[^'])*'/g, "''");
  if (
    /\b(with|recursive|attach|detach|pragma|insert|update|delete|drop|alter|create|replace|vacuum)\b/i.test(
      lexical,
    )
  )
    throw Error(
      "La consola admite únicamente consultas de lectura del expediente.",
    );
  if (
    (lexical.match(/\bselect\b/gi)?.length ?? 0) > 3 ||
    (lexical.match(/\bjoin\b/gi)?.length ?? 0) > 3 ||
    (lexical.match(/\b(from|join)\s+[a-z_]\w*/gi)?.length ?? 0) > 4 ||
    (lexical.match(/\bunion\b/gi)?.length ?? 0) > 1
  )
    throw Error(
      "Consulta demasiado compleja: hasta 3 SELECT, 3 JOIN y 4 referencias de tablas.",
    );
  for (const clause of lexical.matchAll(
    /\bfrom\b([\s\S]*?)(?=\bwhere\b|\bgroup\b|\border\b|\blimit\b|\bunion\b|$)/gi,
  ))
    if (clause[1].includes(","))
      throw Error("Usa JOIN explícito en lugar de listas de tablas en FROM.");
  let calls = 0;
  for (const match of lexical.matchAll(/\b([a-z_]\w*)\s*\(/gi)) {
    const name = match[1].toLowerCase();
    if (
      [
        "in",
        "exists",
        "over",
        "select",
        "from",
        "on",
        "where",
        "and",
        "or",
        "not",
        "when",
        "then",
        "else",
        "case",
        "having",
        "as",
      ].includes(name)
    )
      continue;
    if (!functions.has(name)) throw Error("Función no disponible: " + name);
    if (++calls > 4)
      throw Error(
        "Admite hasta 4 funciones de agregación o texto por consulta.",
      );
  }
  return query;
}
function sameRows(actual: SqlRow[], expected: SqlRow[]) {
  if (actual.length !== expected.length) return false;
  return actual.every((row, index) => {
    const keys = Object.keys(row).sort(),
      other = Object.keys(expected[index]).sort();
    return (
      JSON.stringify(keys) === JSON.stringify(other) &&
      keys.every((key) => row[key] === expected[index][key])
    );
  });
}
export function executeReadQuery(entry: DatabaseCase, value: string) {
  const query = validateReadQuery(value),
    db = new DatabaseSync(":memory:", { allowExtension: false });
  try {
    db.exec("PRAGMA trusted_schema=OFF");
    for (const [name, table] of Object.entries(entry.tables)) {
      if (!/^[a-z_][a-z0-9_]*$/.test(name) || table.rows.length > 8)
        throw Error("Esquema de laboratorio inválido.");
      const columns = Object.entries(table.columns);
      if (columns.some(([column]) => !/^[a-z_][a-z0-9_]*$/.test(column)))
        throw Error("Columna de laboratorio inválida.");
      db.exec(
        `CREATE TABLE ${name} (${columns.map(([column, type]) => column + " " + type).join(",")})`,
      );
      const insert = db.prepare(
        `INSERT INTO ${name} VALUES (${columns.map(() => "?").join(",")})`,
      );
      for (const row of table.rows) insert.run(...row);
    }
    db.exec("PRAGMA query_only=ON");
    const rows = db.prepare(query).all() as SqlRow[];
    if (rows.length > 100)
      throw Error("La consulta devuelve más de 100 filas; limita el resultado.");
    const columns = rows.length ? Object.keys(rows[0]) : [];
    return { columns, rows, correct: sameRows(rows, entry.expected) };
  } finally {
    db.close();
  }
}
