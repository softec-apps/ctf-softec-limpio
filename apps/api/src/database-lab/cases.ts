import type { DatabaseCase } from "./engine";
export const DATABASE_CASES: DatabaseCase[] = [
  {
    title: "La clave que seguía activa",
    question:
      "Consulta backup_keys y devuelve solo la columna value de la clave activa. La validación requiere exactamente una fila.",
    tables: {
      backup_keys: {
        columns: {
          id: "INTEGER",
          value: "TEXT",
          active: "INTEGER",
        },
        rows: [
          [1, "lab-old-71", 0],
          [2, "lab-db-71", 1],
        ],
      },
    },
    expected: [
      {
        value: "lab-db-71",
      },
    ],
    files: {},
  },
  {
    title: "La configuración privada",
    question:
      "El NAS publicó settings completas. Devuelve solo value del ajuste export_token que no es público.",
    tables: {
      settings: {
        columns: {
          name: "TEXT",
          value: "TEXT",
          public: "INTEGER",
        },
        rows: [
          ["theme", "dark", 1],
          ["export_token", "lab-export-72", 0],
          ["debug", "off", 0],
        ],
      },
    },
    expected: [
      {
        value: "lab-export-72",
      },
    ],
    files: {},
  },
  {
    title: "Borrar de la vista no era borrar",
    question:
      "El cliente 17 está borrado lógicamente. Recupera solo recovery_code de ese registro; no uses un cliente activo.",
    tables: {
      customers: {
        columns: {
          id: "INTEGER",
          name: "TEXT",
          deleted_at: "TEXT",
          recovery_code: "TEXT",
        },
        rows: [
          [12, "Luna", null, "ACTIVE-12"],
          [17, "Bruma", "2026-10-20", "RET-73-X"],
          [18, "Norte", null, "ACTIVE-18"],
        ],
      },
    },
    expected: [
      {
        recovery_code: "RET-73-X",
      },
    ],
    files: {},
  },
  {
    title: "La copia íntegra y completa",
    question:
      "Relaciona el hash del acta de adquisición con backups y exige complete=1. Devuelve únicamente id de la copia correcta.",
    tables: {
      backups: {
        columns: {
          id: "TEXT",
          sha256: "TEXT",
          complete: "INTEGER",
        },
        rows: [
          [
            "B-1",
            "41f0c27c00e8018f7715b5f50f67b5b54c229c1b843a014152785d9005f58fde",
            1,
          ],
          [
            "B-2",
            "0d8da7dc169a0c12f0a6f121b819ca38b055b6e2440830f3453bb6c17d3c3106",
            0,
          ],
          [
            "B-3",
            "0d8da7dc169a0c12f0a6f121b819ca38b055b6e2440830f3453bb6c17d3c3106",
            1,
          ],
        ],
      },
    },
    expected: [
      {
        id: "B-3",
      },
    ],
    files: {
      "acquisition.sha256":
        "0d8da7dc169a0c12f0a6f121b819ca38b055b6e2440830f3453bb6c17d3c3106",
    },
  },
  {
    title: "La cuenta de la exportación",
    question:
      "Relaciona exports, sessions y users por identificadores. Devuelve solo alias de la cuenta cuya sesión exportó payroll con allowed=1.",
    tables: {
      users: {
        columns: {
          id: "TEXT",
          alias: "TEXT",
        },
        rows: [
          ["U-1", "ana"],
          ["U-2", "svc-audit"],
          ["U-3", "public"],
        ],
      },
      sessions: {
        columns: {
          id: "TEXT",
          user_id: "TEXT",
        },
        rows: [
          ["S-1", "U-1"],
          ["S-2", "U-2"],
          ["S-3", "U-3"],
        ],
      },
      exports: {
        columns: {
          session_id: "TEXT",
          record_id: "TEXT",
          allowed: "INTEGER",
        },
        rows: [
          ["S-1", "public", 1],
          ["S-2", "payroll", 1],
          ["S-3", "payroll", 0],
        ],
      },
    },
    expected: [
      {
        alias: "svc-audit",
      },
    ],
    files: {},
  },
  {
    title: "Un permiso cruzó de tenant",
    question:
      "Cruza actors, grants y resources. Encuentra la autorización permitida cuyo actor pertenece a un tenant distinto del recurso. Devuelve actor_id y resource_id, exactamente una fila.",
    tables: {
      actors: {
        columns: {
          id: "TEXT",
          role: "TEXT",
          tenant: "TEXT",
        },
        rows: [
          ["A-6", "reporter", "north"],
          ["A-7", "reader", "south"],
        ],
      },
      grants: {
        columns: {
          role: "TEXT",
          resource: "TEXT",
          allowed: "INTEGER",
        },
        rows: [
          ["reporter", "R-6", 1],
          ["reader", "R-7", 1],
          ["reporter", "R-7", 0],
        ],
      },
      resources: {
        columns: {
          id: "TEXT",
          tenant: "TEXT",
        },
        rows: [
          ["R-6", "south"],
          ["R-7", "south"],
        ],
      },
    },
    expected: [
      {
        actor_id: "A-6",
        resource_id: "R-6",
      },
    ],
    files: {},
  },
  {
    title: "La revisión que sí se confirmó",
    question:
      "Para el documento AUDIT selecciona la versión más alta cuyo tx está committed, ignorando pending y aborted. Devuelve solo content, una fila.",
    tables: {
      transactions: {
        columns: {
          id: "TEXT",
          state: "TEXT",
        },
        rows: [
          ["T-1", "committed"],
          ["T-2", "pending"],
          ["T-3", "aborted"],
          ["T-4", "committed"],
        ],
      },
      revisions: {
        columns: {
          doc: "TEXT",
          tx: "TEXT",
          version: "INTEGER",
          content: "TEXT",
        },
        rows: [
          ["AUDIT", "T-1", 1, "initial"],
          ["AUDIT", "T-2", 9, "pending-content"],
          ["AUDIT", "T-3", 10, "aborted-content"],
          ["AUDIT", "T-4", 4, "approved-v4"],
        ],
      },
    },
    expected: [
      {
        content: "approved-v4",
      },
    ],
    files: {},
  },
  {
    title: "La referencia compuesta",
    question:
      "La integridad requiere coincidencia de order_id y tenant. Identifica line_items sin pedido del mismo tenant, aunque exista el mismo id en otro tenant. Devuelve únicamente id, sin duplicados y en orden ascendente.",
    tables: {
      orders: {
        columns: {
          id: "INTEGER",
          tenant: "TEXT",
        },
        rows: [
          [1, "north"],
          [2, "south"],
          [3, "north"],
        ],
      },
      line_items: {
        columns: {
          id: "INTEGER",
          order_id: "INTEGER",
          tenant: "TEXT",
        },
        rows: [
          [6, 1, "north"],
          [8, 2, "north"],
          [9, 2, "south"],
          [11, 9, "north"],
        ],
      },
    },
    expected: [
      {
        id: 8,
      },
      {
        id: 11,
      },
    ],
    files: {},
  },
  {
    title: "El saldo después del commit",
    question:
      "Reconstruye el saldo de cash: opening más entradas menos salidas, solo transacciones committed. Las transferencias de cash a sí mismo no cambian el saldo. Devuelve una sola columna closing y una fila.",
    tables: {
      balances: {
        columns: {
          account: "TEXT",
          opening: "INTEGER",
        },
        rows: [["cash", 100]],
      },
      transactions: {
        columns: {
          id: "TEXT",
          state: "TEXT",
        },
        rows: [
          ["T1", "committed"],
          ["T2", "committed"],
          ["T3", "pending"],
          ["T4", "aborted"],
        ],
      },
      transfers: {
        columns: {
          id: "INTEGER",
          tx: "TEXT",
          from_acct: "TEXT",
          to_acct: "TEXT",
          amount: "INTEGER",
        },
        rows: [
          [1, "T1", "bank", "cash", 40],
          [2, "T2", "cash", "bank", 15],
          [3, "T3", "cash", "bank", 90],
          [4, "T4", "bank", "cash", 5],
          [5, "T2", "cash", "cash", 10],
        ],
      },
    },
    expected: [
      {
        closing: 125,
      },
    ],
    files: {},
  },
  {
    title: "El alcance quedó en la auditoría",
    question:
      "Usa incident.json para delimitar sesión y secuencia máxima. Relaciona events con sessions y objects. Conserva lecturas exitosas de objetos confidential de un tenant distinto al de la sesión; elimina duplicados. Devuelve solo object_id en orden lexicográfico.",
    tables: {
      sessions: {
        columns: {
          id: "TEXT",
          tenant: "TEXT",
        },
        rows: [
          ["S-C", "north"],
          ["S-G", "south"],
        ],
      },
      objects: {
        columns: {
          id: "TEXT",
          tenant: "TEXT",
          classification: "TEXT",
        },
        rows: [
          ["DOC-10", "south", "confidential"],
          ["DOC-31", "south", "confidential"],
          ["DOC-42", "south", "public"],
          ["DOC-50", "north", "confidential"],
        ],
      },
      events: {
        columns: {
          seq: "INTEGER",
          session_id: "TEXT",
          object_id: "TEXT",
          result: "INTEGER",
        },
        rows: [
          [1, "S-C", "DOC-31", 200],
          [2, "S-C", "DOC-10", 200],
          [3, "S-C", "DOC-31", 200],
          [4, "S-C", "DOC-42", 200],
          [5, "S-C", "DOC-50", 200],
          [6, "S-G", "DOC-31", 200],
          [8, "S-C", "DOC-42", 403],
          [10, "S-C", "DOC-50", 200],
        ],
      },
    },
    expected: [
      {
        object_id: "DOC-10",
      },
      {
        object_id: "DOC-31",
      },
    ],
    files: {
      "incident.json": '{"session": "S-C", "maxSeq": 9}',
    },
  },
];
