import { createHash, createHmac } from "node:crypto";
import { gzipSync } from "node:zlib";
import { flagValue } from "../security";
import { getPrinterCase, PRINTER_MODEL, PRINTER_SERIAL } from "./catalog";

export const printerHash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function printerSignature(text: string) {
  return createHmac("sha256", flagValue("printer-signing-v1"))
    .update(text)
    .digest("hex");
}
export function firmwarePackage() {
  const image = { mode: "production", report: "status" };
  return {
    manifest: {
      model: PRINTER_MODEL,
      version: "7.4.0",
      imageSha256: printerHash(JSON.stringify(image)),
      signature: printerSignature(PRINTER_MODEL + "|7.4.0"),
    },
    image,
  };
}
export function signedPrinterFrame(
  counter: number,
  epoch: string,
  serial = PRINTER_SERIAL,
) {
  const text = JSON.stringify({
    serial,
    epoch,
    counter,
    operation: "snapshot",
  });
  return {
    topic: "flow/telemetry/snapshot",
    payload: gzipSync(text).toString("base64"),
    signature: printerSignature(text),
  };
}
export const scannerTicket = () =>
  printerHash(PRINTER_SERIAL + "|B-418|n-7821");
const support = {
  "protocolos.txt":
    "FLOW M740 / kit de diagnóstico\nTerminal del PC: printer help. Cada petición opera sobre servicios virtuales del equipo.\nLos argumentos JSON o PJL con espacios se escriben entre comillas simples. Los informes impresos aparecen en la salida y en la bandeja táctil.\nNo necesitas resolver otros expedientes.\n",
};
export function printerFiles(id: string): Record<string, string> | undefined {
  const challenge = getPrinterCase(id);
  if (!challenge) return undefined;
  const evidence: Record<string, Record<string, string>> = {
    "iot-01": {
      "trabajos.csv":
        "trabajo,propietario,estado\nJ-821,recepcion,impreso\nJ-824,custodia,retenido\n",
      "servicio.txt":
        "El servicio de cola ofrece queue y job IDENTIFICADOR. La pantalla de Inicio lista únicamente trabajos recientes.\n",
    },
    "iot-02": {
      "soporte.log":
        "GET /support/manifest.txt 200\nGET /support/export-0317.cfg 200\n",
      "inventario.txt":
        "Los respaldos de servicio se descargan mediante printer fetch RUTA. El manifiesto identifica la copia del equipo.\n",
    },
    "iot-03": {
      "manual-instalacion.txt":
        "FLOW M740 / puesta en servicio\nLa cuenta inicial de servicio es service. La contraseña de fábrica se forma con Flow! y los últimos cuatro caracteres del número de serie. Se debe cambiar antes de entregar el equipo.\n",
      "etiqueta.txt": `Modelo: ${PRINTER_MODEL}\nSerie: ${PRINTER_SERIAL}\nRevisión de entrega: contraseña de servicio sin rotación.\n`,
    },
    "iot-04": {
      "almacenamiento.txt":
        "La bandeja local conserva imágenes y sus transcripciones OCR. El servicio scans enumera los nombres; scan NOMBRE recupera un documento.\n",
      "politica.txt":
        "Modo invitado: lectura de bandeja compartida. Borrado al terminar: desactivado.\n",
    },
    "iot-05": {
      "puerto-9100.txt":
        'Intérprete PJL compatible: FSQUERY NAME="volumen:/ruta" y FSUPLOAD NAME="volumen:/ruta" OFFSET=0 SIZE=n\nLa unidad de servicio admite lectura de archivos. Tamaño máximo de bloque: 512 bytes.\n',
      "inventario-servicio.csv":
        "volumen,ruta,bytes\n0,/service/custodia.txt,192\n0,/public/status.txt,64\n",
    },
    "iot-06": {
      "broker.conf":
        "prefix=flow\nsite=laboratorio\ndevice=ST740-0317\nretained=enabled\nanonymous_subscribe=true\n",
      "rutas.json": JSON.stringify(
        {
          reports: "{prefix}/{site}/{device}/reports/last",
          encoding: "base64",
          transport: "MQTT retained",
        },
        null,
        2,
      ),
    },
    "iot-07": {
      "ticket.json": JSON.stringify(
        {
          operation: "release-job",
          job: "J-932",
          "requesting-user-name": "visitante",
          "document-format": "application/pdf",
        },
        null,
        2,
      ),
      "ipp.log":
        "J-932 owner=archivo state=held authentication=none\nEl proxy pasa requesting-user-name del ticket al motor. El motor compara ese nombre con el propietario del trabajo.\n",
    },
    "iot-08": {
      "firmware.json": JSON.stringify(firmwarePackage(), null, 2),
      "verificador.txt":
        "Manifiesto v1: firma HMAC del texto model|version. imageSha256 debe coincidir con SHA256 del JSON compacto de image.\nEl cargador reconoce mode=production o maintenance; report=status o custody.\nLa firma y la huella de imagen se comprueban por separado.\n",
      "cadena-produccion.txt":
        "El manifiesto procede del fabricante. No se dispone de su clave de firma. No cambies modelo ni versión. El modo de diagnóstico imprime el informe seleccionado.\n",
    },
    "iot-09": {
      "destinos.log":
        "Permitido por el validador antiguo: prefijo https://scan.seventech.local\nCliente de transferencia: interpretación URL estándar, con userinfo.\nRuta interna de custodia: https://vault.printer.internal/export?ticket=<resumen>\n",
      "lote.json": JSON.stringify(
        { serial: PRINTER_SERIAL, batch: "B-418", nonce: "n-7821" },
        null,
        2,
      ),
      "protocolo.txt":
        "El ticket es SHA256 de serial|batch|nonce, sin espacios. El controlador envía la URL validada al cliente de transferencia. No hay resolución DNS fuera del equipo virtual.\n",
    },
    "iot-10": {
      "capturas.json": JSON.stringify(
        [
          signedPrinterFrame(40, "K-28"),
          signedPrinterFrame(41, "K-29", "ST740-0440"),
          signedPrinterFrame(41, "K-29"),
        ],
        null,
        2,
      ),
      "estado.json": JSON.stringify(
        {
          serial: PRINTER_SERIAL,
          epoch: "K-29",
          nextCounter: 41,
          compression: "gzip",
          encoding: "base64",
        },
        null,
        2,
      ),
      "despacho.txt":
        "La firma HMAC se comprueba sobre los bytes descomprimidos del payload. El enrutador usa topic por separado.\nRutas: flow/telemetry/snapshot → telemetría; flow/vault/snapshot → archivo protegido.\nEl receptor exige serie, época y contador vigentes. La operación snapshot no modifica el contador.\n",
    },
  };
  return {
    "/home/analista/LEEME.txt": challenge.description,
    ...Object.fromEntries(
      Object.entries({ ...support, ...evidence[id] }).map(([name, content]) => [
        "/home/analista/evidencia/" + name,
        content,
      ]),
    ),
  };
}
