import { consoleLabs } from "../console-labs/build";
import { DATABASE_CASES } from "./cases";
import { executeReadQuery } from "./engine";
export const DATABASE_LABS = consoleLabs(
  "database-",
  DATABASE_CASES.map((entry) => ({
    title: entry.title,
    question: entry.question,
    initial: { query: "SELECT name FROM sqlite_master WHERE type = 'table'" },
    files: {
      "schema.sql": Object.entries(entry.tables)
        .map(
          ([name, table]) =>
            "CREATE TABLE " +
            name +
            " (" +
            Object.entries(table.columns)
              .map(([column, type]) => column + " " + type)
              .join(", ") +
            ");",
        )
        .join("\n"),
      "sql-help.txt":
        "SQLite real en memoria por expediente. Solo SELECT. Sin modificaciones, archivos externos ni extensiones. Hasta800 caracteres, 3 SELECT, 3 JOIN, 4 tablas, 4 funciones y 100 filas. Funciones: COUNT, SUM, MIN, MAX, AVG, LENGTH, LOWER, UPPER, COALESCE. Usa comillas simples para valores. La validación exige exactamente filas y columnas solicitadas; explorar el esquema no puntúa.",
      ...entry.files,
    },
    run(input) {
      if (typeof input.query !== "string")
        return {
          accepted: false,
          output: { error: "Incluye query como texto SQL." },
        };
      try {
        const result = executeReadQuery(entry, input.query);
        return {
          accepted: result.correct,
          output: {
            columns: result.columns,
            rows: result.rows,
            rowCount: result.rows.length,
          },
        };
      } catch (e) {
        return {
          accepted: false,
          output: {
            error: e instanceof Error ? e.message : "Consulta no válida.",
          },
        };
      }
    },
  })),
);
