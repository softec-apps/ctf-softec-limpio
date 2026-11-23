import { gzipSync } from "node:zlib";
import { createHmac } from "node:crypto";
import { flagValue } from "../security";
import { getOtCase, OT_CONTROLLER, OT_SERIAL } from "./catalog";
import { BASE_PROGRAM, programDigest } from "./state";

export function otSignature(text: string) {
  return createHmac("sha256", flagValue("ot-vendor-key-v1"))
    .update(text)
    .digest("hex");
}
export function otFirmware(
  version: string,
  securityVersion: number,
  legacyDiagnostic: boolean,
) {
  const image = {
    controller: OT_CONTROLLER,
    version,
    securityVersion,
    legacyDiagnostic,
    payloadHex: Buffer.from(
      legacyDiagnostic
        ? "AXON/BOOT\nUART_DIAG_KEY=" +
            flagValue("ot-legacy-key").slice(4, -1) +
            "\nRECOVERY_ENABLED"
        : "AXON/BOOT\nRECOVERY_DISABLED",
    ).toString("hex"),
  };
  return { image, signature: otSignature(JSON.stringify(image)) };
}
export function capturedOtOrder(controller = OT_CONTROLLER) {
  const body = {
    controller,
    action: "light.set",
    value: false,
    counter: 81,
    expires: "2026-10-28T12:05:00Z",
    window: "MW-041",
  };
  return { body, signature: otSignature(JSON.stringify(body)) };
}
function captureFragments() {
  const frames = [capturedOtOrder("AXON-C16"), capturedOtOrder()].map((frame) =>
    Buffer.from(JSON.stringify(frame)),
  );
  const fragment = (
    stream: string,
    direction: string,
    seq: number,
    bytes: Buffer,
  ) => [stream, direction, seq, bytes.toString("hex")].join(",");
  const a = frames[0],
    b = frames[1];
  return (
    "flujo,direccion,seq,payload_hex\n" +
    [
      fragment("f23", "c2s", 20173, b.subarray(173)),
      fragment("f17", "c2s", 10000, a.subarray(0, 83)),
      fragment("f23", "s2c", 70000, Buffer.from('{"accepted":true}')),
      fragment("f23", "c2s", 20000, b.subarray(0, 83)),
      fragment("f17", "c2s", 10083, a.subarray(83, 173)),
      fragment("f23", "c2s", 20083, b.subarray(83, 173)),
      fragment("f17", "c2s", 10173, a.subarray(173)),
      fragment("f23", "c2s", 20000, b.subarray(0, 83)),
    ].join("\n")
  );
}
export function otFiles(id: string): Record<string, string> | undefined {
  const entry = getOtCase(id);
  if (!entry) return;
  const evidence: Record<string, Record<string, string>> = {
    "ot-01": {
      "mapa.csv":
        "direccion_decimal,tipo,funcion\n200,coil,indicacion_azul\n30,holding,velocidad_rpm\n40,holding,umbral_decimas_c\n100,holding,sonda_decimas_c\n",
      "captura.txt":
        "TX 000100000006010500c80000\nRX 000100000006010500c80000\nUna operación de apagado fue aceptada desde una estación sin sesión industrial.\n",
      "canal.txt":
        "Modbus TCP, unidad1. Cabecera MBAP: transacción2bytes, protocolo2bytes(0), longitud2bytes(unidad+PDU), unidad1byte. FC05 escribe una bobina: dirección2bytes, valor2bytes(FF00=ON,0000=OFF), big-endian. El cliente del PC acepta ot modbus HEX.\n",
    },
    "ot-02": {
      "entrega.txt": `Integración ${OT_CONTROLLER}\nSerie ${OT_SERIAL}\nCuenta inicial operator. Clave: Axon! seguida de los cuatro últimos caracteres de la serie. Pendiente rotación en entrega.\n`,
      "acceso.txt":
        "El panel admite ot login USUARIO CONTRASEÑA. Un acceso de operación permite usar los controles normales, pero no concede permisos de ingeniería.\n",
    },
    "ot-03": {
      "hmi-access.log":
        "GET /support/index.txt 200\nGET /backup/commissioning-0871.cfg 200\n",
      "exportaciones.txt":
        "El servicio virtual HMI admite ot http GET RUTA. Se publicaron copias durante la puesta en marcha.\n",
    },
    "ot-04": {
      "memoria.csv":
        "inicio_decimal,registros,uso\n30,1,velocidad\n40,1,umbral\n100,1,temperatura\n300,19,registro_reservado\n",
      "formato.txt":
        "FC03: dirección inicial2bytes y cantidad2bytes, big-endian. RX: MBAP7bytes, función1byte, cantidad de bytes1byte y registros. El registro reservado conserva texto ASCII, dos caracteres por registro, con relleno NUL final. No es un valor de proceso.\n",
    },
    "ot-05": {
      "peticion.json": JSON.stringify(
        { action: "engineering-tune", role: "observer", setpointRpm: 1450 },
        null,
        2,
      ),
      "permisos.csv":
        "rol,operar,calibrar\nobserver,no,no\noperator,si,no\nengineer,si,si\n",
      "puente.log":
        "La pantalla desactiva Calibrar para observer y operator. El puente antiguo transmite role como campo de petición. Servicio: ot hmi 'JSON'. Objetivo del ensayo:1450rpm.\n",
    },
    "ot-06": {
      "proxy.conf":
        "engineering_network=127.0.0.1\norigin_header=x-forwarded-for\ntrusted_hops=not_configured\n",
      "rutas.txt":
        "/engineering/diagnostics: reservado al origen de ingeniería.\nEl puente HMI recibe una dirección de cliente del proxy y la entrega al control de acceso sin verificar su procedencia.\n",
      "cliente.txt":
        "ot http GET RUTA 'CABECERAS_JSON'\nLas cabeceras se modelan como un objeto de cadenas. No se realizan peticiones de red externas.\n",
    },
    "ot-07": {
      "parametros.csv":
        "direccion_decimal,unidad,minimo,maximo,actual\n40,decimas_c,100,700,650\n100,decimas_c,-, -,780\n",
      "ensayo.txt":
        "La alarma compara sonda > umbral. Durante el ensayo térmico la sonda permanece en78.0°C. El rango de ingeniería del umbral es10.0..70.0°C. El receptor de registros acepta todo uint16.\n",
      "escritura.txt":
        "FC06 escribe un holding register: dirección2bytes y valor2bytes, big-endian. Una respuesta normal repite la solicitud. La verificación exige que el valor esté fuera del rango y deje de detectar la sonda caliente.\n",
    },
    "ot-08": {
      "ventilacion.il": BASE_PROGRAM,
      "transferencia.json": JSON.stringify(
        {
          controller: OT_CONTROLLER,
          block: "VENT_MAIN",
          source: BASE_PROGRAM,
          digest: programDigest(BASE_PROGRAM),
        },
        null,
        2,
      ),
      "interprete.txt":
        "Lenguaje didáctico inspirado en listas de instrucciones IEC: LD SEÑAL, AND [NOT] SEÑAL, OR [NOT] SEÑAL, ST SALIDA. Entradas:ENABLE,MAINTENANCE,ALARM,TRUE,FALSE. Salidas:FAN_RUN,BEACON,LIGHT_RUN. LD también admite NOT. No hay saltos, llamadas ni ejecución del sistema anfitrión.\n",
      "prueba.txt":
        "El ensayo aplica ENABLE=true,MAINTENANCE=true. Un programa autorizado debe impedir FAN_RUN. El receptor comprueba el SHA256 del texto source, pero no autentica al emisor. Transferencia: ot program 'JSON'. Demuestra que el ventilador puede permanecer activo en ese ensayo.\n",
    },
    "ot-09": {
      "repositorio.json": JSON.stringify(
        [
          {
            release: "2.4.0",
            encoding: "gzip+base64",
            bundle: gzipSync(
              JSON.stringify(otFirmware("2.4.0", 7, false)),
            ).toString("base64"),
          },
          {
            release: "1.2.0",
            encoding: "gzip+base64",
            bundle: gzipSync(
              JSON.stringify(otFirmware("1.2.0", 3, true)),
            ).toString("base64"),
          },
        ],
        null,
        2,
      ),
      "arranque.txt":
        "La firma protege todo image, serializado compacto en orden controller,version,securityVersion,legacyDiagnostic,payloadHex. La firma se comprueba antes de copiar securityVersion al contador. Mínimo instalado:7. payloadHex contiene los bytes preservados de cada imagen.\n",
      "cambios.txt":
        "2.4.0: retira el diagnóstico heredado.\n1.2.0: mantiene recuperación con desafío y credencial provisionada en imagen.\nPaquetes del repositorio: gzip+base64. Transferencia:ot firmware 'PAQUETE_JSON'.\n",
      "recuperacion.txt":
        "Protocolo de recuperación: ot diagnostic challenge devuelve un desafío ASCII. El cliente calcula HMAC-SHA256 de ese texto usando la clave hexadecimal provisionada en la imagen activa. Después envía ot diagnostic read-custody FIRMA_HEX. El área UART identifica la clave de recuperación.\n",
    },
    "ot-10": {
      "capturas.csv": captureFragments(),
      "flujos.csv":
        "flujo,origen,destino\nf17,10.77.0.22:49152,10.77.0.71:8443\nf23,10.77.0.22:49154,10.77.0.70:8443\n",
      "reensamblado.txt":
        "Cada fila representa un fragmento de aplicación de una sesión TCP preservada. c2s=cliente a controlador; s2c=respuesta. seq identifica el primer byte del fragmento. Las retransmisiones pueden repetir los mismos bytes. Selecciona el destino correcto, ordena por secuencia, elimina repeticiones y reconstruye el mensaje UTF-8. El volcado de aplicación fue adquirido después de terminar el transporte protegido.\n",
      "receptor.json": JSON.stringify(
        {
          controller: OT_CONTROLLER,
          acceptedCounter: 900,
          clock: "2026-11-02T10:00:00Z",
          maintenanceWindow: "closed",
        },
        null,
        2,
      ),
      "integridad.txt":
        "La firma protege todos los campos de body serializados en el orden de la captura. La firma es auténtica; el mensaje pertenece a una ventana terminada. El receptor antiguo comprueba la firma pero no compara el contador ni la expiración. Cliente:ot replay 'SOBRE_JSON'.\n",
    },
  };
  return {
    "/home/analista/LEEME.txt":
      entry.description + "\nMaterial independiente del resto de prácticas.",
    ...Object.fromEntries(
      Object.entries(evidence[id]).map(([name, content]) => [
        "/home/analista/evidencia/" + name,
        content,
      ]),
    ),
  };
}
