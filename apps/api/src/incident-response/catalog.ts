import type { EvidenceCase } from "../casework/types";
export const INCIDENT_CASES: EvidenceCase[] = [
  {
    title: "La alerta y el equipo",
    question:
      "Relaciona la alerta confirmada con el inventario por agent_id. Entrega CTF{hostname}.",
    answer: "pc-diseno-07",
    files: {
      "alertas.csv":
        "id,agent_id,estado\nA1,ag-22,descartada\nA2,ag-71,confirmada\n",
      "inventario.csv":
        "agent_id,hostname\nag-22,pc-soporte-02\nag-71,pc-diseno-07\n",
    },
  },
  {
    title: "La cuenta del acceso",
    question:
      "Identifica la cuenta de la sesión que descargó el recurso confidencial. No atribuyas la descarga a otra sesión de la misma IP. Entrega CTF{cuenta}.",
    answer: "svc-reportes",
    files: {
      "sesiones.csv":
        "sesion,cuenta,ip\nS8,ana,10.2.0.8\nS9,svc-reportes,10.2.0.8\n",
      "proxy.csv": "sesion,recurso,bytes\nS8,publico,780\nS9,nomina,19000\n",
    },
  },
  {
    title: "El indicador confirmado",
    question:
      "La alerta incluye un dominio sospechoso; usa la respuesta HTTP para distinguir un intento fallido de una descarga completada. Entrega CTF{dominio}.",
    answer: "drop.faro.example",
    files: {
      "dns.csv":
        "request,dominio\nR1,help.seventech.example\nR2,drop.faro.example\nR3,noise.faro.example\n",
      "proxy.csv":
        "request,status,tipo\nR1,200,soporte\nR2,200,ejecutable\nR3,503,ejecutable\n",
    },
  },
  {
    title: "Contener sin apagar el servicio",
    question:
      "Escoge la acción del plan que aísla el host comprometido y conserva el canal de gestión del EDR, sin cortar el servicio compartido. Entrega CTF{id_accion}.",
    answer: "ACT-C",
    files: {
      "incidente.json":
        '{"host": "pc-77", "edr": "10.90.0.5", "shared": "srv-pagos"}',
      "planes.csv":
        "accion,objetivo,bloquea_datos,permite_edr\nACT-A,srv-pagos,true,false\nACT-B,pc-77,false,true\nACT-C,pc-77,true,true\n",
    },
  },
  {
    title: "Dos relojes, un acceso",
    question:
      "Normaliza a UTC. El colector adelanta dos minutos; el PC está en UTC-05. Identifica la conexión que ocurre después del inicio y antes del cierre de la sesión. Entrega CTF{id_conexion}.",
    answer: "NET-5",
    files: {
      "sesion.csv":
        "evento,fuente,hora\ninicio,pc,03:10:00\ncierre,pc,03:14:00\n",
      "red.csv":
        "id,fuente,hora\nNET-3,colector,08:11:00\nNET-5,colector,08:14:00\nNET-7,colector,08:17:00\n",
      "relojes.txt":
        "pc:UTC-05 sin desfase. colector:UTC con adelanto de 2 minutos. Mismo día.",
    },
  },
  {
    title: "El salto entre sesiones",
    question:
      "Cruza autenticación, emisión de token y uso del recurso por trace_id. Entrega CTF{cuenta_origen}.",
    answer: "op-integracion",
    files: {
      "auth.csv": "sesion,cuenta\nS-31,op-integracion\nS-32,op-backup\n",
      "tokens.csv": "trace_id,sesion,token\nT-81,S-31,K-12\nT-82,S-32,K-13\n",
      "accesos.csv":
        "trace_id,token,recurso\nT-81,K-12,exportacion-restringida\nT-82,K-13,backup\n",
    },
  },
  {
    title: "Lo que queda tras borrar",
    question:
      "Un evento de borrado local no borra la copia del colector. Busca el proceso que inició el borrado en el host confirmado y entrega CTF{process_guid}.",
    answer: "P-712",
    files: {
      "incidente.txt": "host confirmado: ws-18\n",
      "colector.csv":
        "host,event,process_guid\nws-18,clear-log,P-712\nws-19,clear-log,P-801\nws-18,start,P-700\n",
      "procesos.csv":
        "guid,parent,imagen\nP-712,P-700,log-cleaner.exe\nP-801,P-800,admin-tool.exe\n",
    },
  },
  {
    title: "Reconstruir el movimiento lateral",
    question:
      "Desde el host inicial sigue únicamente sesiones autenticadas con la credencial marcada como comprometida. Ignora conexiones fallidas y cuentas ajenas. Ordena por UTC. Forma la ruta de hosts con > y entrega CTF{sha256_del_texto_sin_salto}.",
    answer: "abdcd6af4108c7eed9bad07a36a0fd2c3fd3e4c6729361c94eeca62e47381ef7",
    files: {
      "inicio.json": '{"host": "ws-04", "credential": "cred-8"}',
      "sesiones.csv":
        "utc,origen,destino,credential,resultado\n08:02,ws-04,srv-mail,cred-8,failed\n08:04,jump-02,srv-docs,cred-8,ok\n08:03,ws-04,jump-02,cred-8,ok\n08:05,srv-docs,srv-backup,cred-2,ok\n",
    },
  },
  {
    title: "El alcance de la exposición",
    question:
      "Conserva solo objetos leídos con éxito por la sesión comprometida, deduplica por object_id y cruza clasificación confidencial. Ordena IDs lexicográficamente y únelos con |. Entrega CTF{sha256_del_texto_sin_salto}.",
    answer: "7b1122c439292d7403b5ad14c785444f57a9179482a30c9a839f70fae963fdb9",
    files: {
      "incidente.json": '{"session": "S-comp"}',
      "lecturas.csv":
        "sesion,objeto,estado\nS-comp,OBJ-31,200\nS-comp,OBJ-12,200\nS-comp,OBJ-31,200\nS-comp,OBJ-44,403\nS-good,OBJ-44,200\nS-comp,OBJ-18,200\n",
      "objetos.csv":
        "id,clasificacion\nOBJ-12,confidencial\nOBJ-18,publico\nOBJ-31,confidencial\nOBJ-44,confidencial\n",
    },
  },
  {
    title: "Confirmar la recuperación",
    question:
      "Evalúa la recuperación según el criterio preservado: imagen verificada, credencial rotada tras el aislamiento y prueba funcional exitosa posterior a ambas acciones. Elige el único host que cumple todo. Forma host|image_hash|rotation_id|test_id y entrega CTF{sha256_del_texto_sin_salto}.",
    answer: "805e75c03b418ee417b17a4133d2ccaf329ba6ff6371961919109b0ac12cf459",
    files: {
      "criterio.txt":
        "La imagen debe coincidir con referencia.sha256. Las horas son UTC del mismo día. Rotación > aislamiento; test > rotación y reinstalación. No basta que un test antiguo sea exitoso.",
      "referencia.sha256":
        "c583c84c66286b5210c9af8e561c69bbe2264353b7b26c717c415dba0287e717",
      "recuperacion.csv":
        "host,image_hash,aislamiento,reinstalacion,rotation_id,rotacion,test_id,test_hora,test_estado\nsrv-21,c583c84c66286b5210c9af8e561c69bbe2264353b7b26c717c415dba0287e717,08:00,08:30,ROT-21,07:55,TEST-21,08:50,ok\nsrv-22,c583c84c66286b5210c9af8e561c69bbe2264353b7b26c717c415dba0287e717,08:00,08:30,ROT-22,08:35,TEST-22,08:50,ok\nsrv-23,4aa009153649a0a7c1425387f3da9c72330ad069ea9f69ce1640abe46f92a83b,08:00,08:30,ROT-23,08:35,TEST-23,08:50,ok\n",
    },
  },
];
