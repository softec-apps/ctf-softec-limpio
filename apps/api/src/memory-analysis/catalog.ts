import type { EvidenceCase } from "../casework/types";
export const MEMORY_CASES: EvidenceCase[] = [
  {
    title: "El proceso fuera de la lista",
    question:
      "Compara pslist con psscan. Excluye objetos con exitTime y encuentra el PID del objeto no terminado ausente de la lista activa. Entrega CTF{pid}.",
    answer: "417",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[{"pid":100,"name":"shell.exe"}],"scan":[{"pid":100,"name":"shell.exe","exitTime":null},{"pid":203,"name":"old.exe","exitTime":"08:10"},{"pid":417,"name":"cache.exe","exitTime":null}],"connections":[],"regions":[],"handles":[]}',
    },
  },
  {
    title: "El dueño de la conexión",
    question:
      "Usa netscan y el inventario de procesos para identificar la imagen que tiene conexión ESTABLISHED al indicador del expediente. Entrega CTF{nombre_de_imagen}.",
    answer: "syncsvc.exe",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[{"pid":101,"name":"browser.exe"},{"pid":480,"name":"syncsvc.exe"}],"scan":[],"connections":[{"pid":101,"remote":"203.0.113.88","port":443,"state":"CLOSED"},{"pid":480,"remote":"203.0.113.88","port":443,"state":"ESTABLISHED"}],"regions":[],"handles":[]}',
      "ioc.txt": "203.0.113.88:443",
    },
  },
  {
    title: "La orden codificada",
    question:
      "Localiza el hijo directo de WINWORD.EXE y decodifica su argumento EncodedCommand como Base64 de UTF-16LE. Recupera el valor de Tag y entrega CTF{valor}.",
    answer: "RAM-63-A",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[{"pid":200,"ppid":4,"name":"WINWORD.EXE"},{"pid":622,"ppid":200,"name":"powershell.exe","commandLine":"powershell.exe -EncodedCommand UwBlAHQALQBWAGEAcgBpAGEAYgBsAGUAIAAtAE4AYQBtAGUAIABUAGEAZwAgAC0AVgBhAGwAdQBlACAAUgBBAE0ALQA2ADMALQBBAA=="},{"pid":623,"ppid":4,"name":"powershell.exe","commandLine":"powershell.exe -NoProfile"}],"scan":[],"connections":[],"regions":[],"handles":[]}',
    },
  },
  {
    title: "El archivo que seguía abierto",
    question:
      "Busca los handles File del proceso objetivo. Selecciona la ruta bajo Restricted, no el log público, y entrega CTF{nombre_con_extension}.",
    answer: "plan-64.txt",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[{"pid":640,"name":"viewer.exe"}],"scan":[],"connections":[],"regions":[],"handles":[{"pid":640,"type":"File","name":"C:\\\\Public\\\\app.log"},{"pid":640,"type":"File","name":"C:\\\\Restricted\\\\plan-64.txt"}]}',
      "objetivo.txt": "pid=640",
    },
  },
  {
    title: "Código en una región privada",
    question:
      "Usa malfind: identifica la región private que tiene permiso de ejecución y empieza por bytes MZ. Excluye image-backed y regiones sin ejecución. Forma pid|base y entrega CTF{texto}.",
    answer: "650|0x7000",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[],"scan":[],"connections":[],"regions":[{"pid":650,"base":"0x5000","type":"image","protection":"RX","bytes":"4d5a9000"},{"pid":650,"base":"0x7000","type":"private","protection":"RWX","bytes":"4d5a9000"},{"pid":651,"base":"0x8000","type":"private","protection":"RW","bytes":"4d5a0000"}],"handles":[]}',
    },
  },
  {
    title: "El padre tenía otro GUID",
    question:
      "El ppid fue reutilizado. Relaciona parentCreateTime del hijo con createTime del objeto padre en psscan. Entrega CTF{guid_del_padre_real}.",
    answer: "PROC-OLD-80",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[{"pid":80,"guid":"PROC-NEW-80","createTime":"08:20"},{"pid":660,"ppid":80,"parentCreateTime":"08:01","createTime":"08:10"}],"scan":[{"pid":80,"guid":"PROC-OLD-80","createTime":"08:01","exitTime":"08:15"},{"pid":80,"guid":"PROC-NEW-80","createTime":"08:20","exitTime":null}],"connections":[],"regions":[],"handles":[]}',
    },
  },
  {
    title: "Un token ajeno",
    question:
      "Compara el SID esperado del proceso con el SID del token adquirido. Selecciona el token distinto que además tiene SeDebugPrivilege habilitado. Entrega CTF{tokenId}.",
    answer: "TOK-67-X",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[{"pid":670,"expectedSid":"S-1-5-21-670","tokenId":"TOK-67-X"},{"pid":671,"expectedSid":"S-1-5-21-671","tokenId":"TOK-67-N"}],"scan":[],"connections":[],"regions":[],"handles":[],"tokens":[{"id":"TOK-67-X","sid":"S-1-5-18","enabled":["SeDebugPrivilege"]},{"id":"TOK-67-N","sid":"S-1-5-21-671","enabled":[]}]}',
    },
  },
  {
    title: "Páginas fuera de orden",
    question:
      "Reconstruye el buffer del proceso por virtualOffset, usando solo committed=true y el tamaño lógico preservado. Verifica SHA256 y lee channel. Entrega CTF{valor_de_channel}.",
    answer: "RAM-68-B",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[],"scan":[],"connections":[],"regions":[{"pid":680,"virtualOffset":18,"committed":true,"bytes":"6f64653d7175696574534c41434b"},{"pid":680,"virtualOffset":0,"committed":true,"bytes":"6368616e6e656c3d52"},{"pid":680,"virtualOffset":9,"committed":true,"bytes":"414d2d36382d423b6d"},{"pid":680,"virtualOffset":0,"committed":false,"bytes":"77726f6e67"}],"handles":[],"buffer":{"pid":680,"size":27,"sha256":"4fe5b64814f20cef898a4dcdec5705f0c6daaa92b60fc0f56a670c6ff7ee56ac"}}',
    },
  },
  {
    title: "El socket de un PID reciclado",
    question:
      "Correlaciona ownerCreateTime del socket con createTime del proceso y exige state=ESTABLISHED. El PID actual no basta. Encuentra la conexión al IOC y forma processGuid|remote|port. Entrega CTF{sha256_del_texto_sin_salto}.",
    answer: "cdb9f4c79473e2256bef116eacc099694c9fc3ed4952595f9f46b849f74721b7",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[{"pid":690,"guid":"PROC-NEW-69","createTime":"08:20"}],"scan":[{"pid":690,"guid":"PROC-OLD-69","createTime":"08:01","exitTime":"08:15"},{"pid":690,"guid":"PROC-NEW-69","createTime":"08:20","exitTime":null}],"connections":[{"pid":690,"ownerCreateTime":"08:01","remote":"198.51.100.69","port":8443,"state":"ESTABLISHED"},{"pid":690,"ownerCreateTime":"08:20","remote":"198.51.100.69","port":8443,"state":"LISTEN"}],"regions":[],"handles":[]}',
      "ioc.txt": "198.51.100.69",
    },
  },
  {
    title: "Reconstruir la generación adquirida",
    question:
      "Verifica baseHash, aplica parches committed por seq al buffer base y valida afterHash tras cada uno. No apliques pending. Entrega CTF{sha256_del_buffer_final}.",
    answer: "22865b5feb051c4d56507498ecfcf2d38e1e7682d227cc09c8006fb20b809bb2",
    files: {
      "snapshot.memory.json":
        '{"format":"seventech-memory-v1","acquiredAt":"2026-11-02T08:30:00Z","processes":[],"scan":[],"connections":[],"regions":[],"handles":[],"base":{"bytes":"4c41422d4d454d4f52592d30303030","sha256":"623b55cbd029462245951d89881ca87d49bed69b15d7e39c8fc332fa0cbb8058"},"patches":[{"seq":3,"state":"committed","offset":4,"bytes":"52414d","afterHash":"22865b5feb051c4d56507498ecfcf2d38e1e7682d227cc09c8006fb20b809bb2"},{"seq":2,"state":"pending","offset":0,"bytes":"424144","afterHash":"2f05d4b689d270cafb02285f35f44866f7dc8a2d368a3f9d1124373eeab31fb1"},{"seq":1,"state":"committed","offset":11,"bytes":"323638","afterHash":"27d8143cca401f823e56b2bc4c5baf6d8f391cff311d0195c292e3d3e8aef5b7"}]}',
      "formato.txt":
        "Snapshot didáctico de un buffer de memoria y su diario. Offsets de bytes, no caracteres. No es un formato de hipervisor ni un volcado de RAM nativo.",
    },
  },
];
