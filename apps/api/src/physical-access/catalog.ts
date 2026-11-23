import type { EvidenceCase } from "../casework/types";
export const ACCESS_CASES: EvidenceCase[] = [
  {
    title: "La credencial revocada",
    question:
      "El lector permitió una tarjeta que ya figuraba revocada en la lista vigente. Identifica el evento aceptado y entrega CTF{id_evento}.",
    answer: "EV-14",
    files: {
      "revocaciones.csv": "uid,estado\nC-18,revocada\nC-19,activa\n",
      "eventos.csv":
        "id,uid,resultado\nEV-13,C-19,permitido\nEV-14,C-18,permitido\nEV-15,C-18,denegado\n",
    },
  },
  {
    title: "Un pase fuera de fecha",
    question:
      "La vigencia es un intervalo UTC [desde,hasta), con hasta excluido. Identifica el acceso aceptado fuera de vigencia. Entrega CTF{id_evento}.",
    answer: "EV-22",
    files: {
      "pase.json":
        '{"uid": "V-24", "desde": "2026-10-20T08:00:00Z", "hasta": "2026-10-20T12:00:00Z"}',
      "eventos.csv":
        "id,hora,resultado\nEV-21,2026-10-20T11:59:59Z,permitido\nEV-22,2026-10-20T12:00:00Z,permitido\n",
    },
  },
  {
    title: "Una secuencia repetida",
    question:
      "Por credencial y controlador, el contador debe aumentar estrictamente. Detecta el primer evento permitido que repite un contador previamente aceptado en ese mismo ámbito. Entrega CTF{id_evento}.",
    answer: "EV-35",
    files: {
      "eventos.csv":
        "id,uid,controlador,contador,resultado\nEV-31,C-3,R1,11,permitido\nEV-32,C-3,R2,11,permitido\nEV-33,C-3,R1,12,permitido\nEV-35,C-3,R1,12,permitido\n",
    },
  },
  {
    title: "La puerta del grupo equivocado",
    question:
      "Cruza persona, grupo y política de puerta. Encuentra la apertura permitida sin autorización del grupo. Entrega CTF{id_evento}.",
    answer: "EV-44",
    files: {
      "personas.csv": "uid,grupo\nC-40,visitantes\nC-41,tecnicos\n",
      "politicas.csv": "puerta,grupo\nalmacen,tecnicos\nrecepcion,visitantes\n",
      "eventos.csv":
        "id,uid,puerta,resultado\nEV-43,C-40,recepcion,permitido\nEV-44,C-40,almacen,permitido\n",
    },
  },
  {
    title: "Anti-passback incompleto",
    question:
      "Cada UID empieza fuera. Una entrada requiere estado fuera y una salida requiere estado dentro; solo los eventos permitidos cambian estado. Encuentra la primera entrada permitida que viola la política. Entrega CTF{id_evento}.",
    answer: "EV-55",
    files: {
      "eventos.csv":
        "id,uid,accion,resultado\nEV-51,C-50,entrada,permitido\nEV-52,C-50,salida,denegado\nEV-53,C-51,entrada,permitido\nEV-55,C-50,entrada,permitido\n",
    },
  },
  {
    title: "La copia que volvió atrás",
    question:
      "El UID por sí solo no distingue una copia. El controlador valida un contador creciente global por UID. Identifica el primer acceso permitido con contador menor al máximo previamente aceptado para la misma tarjeta. Entrega CTF{id_evento}.",
    answer: "EV-64",
    files: {
      "lecturas.csv":
        "id,uid,lector,contador,resultado\nEV-61,C-61,L1,30,permitido\nEV-62,C-61,L2,31,permitido\nEV-63,C-62,L1,7,permitido\nEV-64,C-61,L3,29,permitido\n",
    },
  },
  {
    title: "El permiso heredado",
    question:
      "Calcula membresías transitivas desde la cuenta indicada. La política de emergencia permite entrar solo si alcanza el grupo operadores Y no alcanza el grupo suspendidos. Encuentra la cuenta que fue admitida pese a la denegación heredada. Entrega CTF{cuenta}.",
    answer: "usr-pablo",
    files: {
      "miembros.csv":
        "miembro,grupo\nusr-pablo,contratistas\ncontratistas,operadores\ncontratistas,suspendidos\nusr-ines,operadores\n",
      "entradas.csv":
        "cuenta,resultado\nusr-ines,permitido\nusr-pablo,permitido\n",
    },
  },
  {
    title: "La caché desconectada",
    question:
      "La lista local se descargó antes de una revocación. Correlaciona controlador, UID y hora del acceso aceptado; determina el evento que usó una caché antigua tras la revocación, antes de reconectar. Forma evento|controlador|revision_local y entrega CTF{sha256_del_texto_sin_salto}.",
    answer: "655a417824917d2c163f6fe2cb2b1474a3020e9ad98844721c707da45a460df5",
    files: {
      "revocacion.csv": "uid,utc,revision\nC-80,08:10,43\n",
      "controladores.csv":
        "id,revision_local,desconectado,reconexion\nR8,42,08:05,08:40\nR9,43,08:12,08:15\n",
      "eventos.csv":
        "id,controlador,uid,utc,resultado\nEV-82,R8,C-80,08:08,permitido\nEV-84,R8,C-80,08:20,permitido\nEV-85,R9,C-80,08:25,denegado\n",
    },
  },
  {
    title: "La apertura sin tarjeta",
    question:
      "Correlaciona la apertura mecánica sin autorización con el cambio de alimentación del mismo controlador. El evento debe ocurrir entre la pérdida y restauración de energía, y tener el sensor abierto. Excluye otra puerta con un acceso legítimo. Forma puerta|controlador|evento y entrega CTF{sha256_del_texto_sin_salto}.",
    answer: "3a20b86f1a036596043442f34e41a8bd1cc7dc32212261b0ea363a536c826f57",
    files: {
      "energia.csv":
        "controlador,perdida,restauracion\nR9,09:10:00,09:12:00\nR10,09:20:00,09:21:00\n",
      "sensores.csv":
        "evento,puerta,controlador,utc,sensor,autorizacion\nEV-93,D9,R9,09:09:00,cerrado,ninguna\nEV-94,D9,R9,09:10:30,abierto,ninguna\nEV-95,D10,R10,09:20:30,abierto,AUTH-1\n",
      "alcance.txt":
        "Exportación preservada. No se acciona la puerta del laboratorio ni se cambia la alimentación real.",
    },
  },
  {
    title: "El permiso empaquetado",
    question:
      "Decodifica la carga Base64 JSON de cada credencial. Verifica su HMAC-SHA256 con la clave de la adquisición (sobre los bytes exactos decodificados). El bit 3 de doorMask autoriza archivo; descarta firmas inválidas y credenciales revocadas por serial. Encuentra la única credencial válida que tiene ese bit pese a pertenecer a visitantes. Entrega CTF{serial}.",
    answer: "P-103",
    files: {
      "clave.hex": "6c61622d706163732d6b65792d3236",
      "credenciales.json":
        '[{"payload": "eyJzZXJpYWwiOiJQLTEwMSIsImdydXBvIjoidmlzaXRhbnRlcyIsImRvb3JNYXNrIjoyfQ==", "hmac": "4984b5dc0308a4c6a7a5c2d8f15ce69deb9447e36767319b238a1e60d76c69f3"}, {"payload": "eyJzZXJpYWwiOiJQLTEwMiIsImdydXBvIjoidmlzaXRhbnRlcyIsImRvb3JNYXNrIjo4fQ==", "hmac": "10730f9c0c19e26e0856f07eb81354045d3c8251da5775237db4c044d92ace89"}, {"payload": "eyJzZXJpYWwiOiJQLTEwMyIsImdydXBvIjoidmlzaXRhbnRlcyIsImRvb3JNYXNrIjoxMH0=", "hmac": "cf445b8afa562fda1e65c5e9a9ff8681ed0582afe33336c4112429ad6f109ef2"}, {"payload": "eyJzZXJpYWwiOiJQLTEwNCIsImdydXBvIjoidmlzaXRhbnRlcyIsImRvb3JNYXNrIjo4fQ==", "hmac": "0000000000000000000000000000000000000000000000000000000000000000"}]',
      "revocadas.txt": "P-102\n",
      "formato.txt":
        "Exportación de credenciales ficticias, no tarjetas reales. doorMask es un entero; los bits empiezan en 0. grupo=visitantes no debe recibir acceso al archivo.",
    },
  },
];
