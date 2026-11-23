import { pointsFor } from "../scoring/policy";
import { MISSIONS } from "./operations/scenarios";
import type { Packet, NetworkCase } from "./types";
const BASE = Date.UTC(2025, 10, 2, 18, 0, 0);
type PacketOptions = Pick<
  Packet,
  "sourcePort" | "destinationPort" | "stream" | "payload"
>;
function packet(
  ms: number,
  source: string,
  destination: string,
  protocol: string,
  info: string,
  details: Record<string, string> = {},
  options: PacketOptions = {},
): Packet {
  return {
    number: 0,
    time: new Date(BASE + ms).toISOString(),
    source,
    destination,
    protocol,
    length: Buffer.byteLength(options.payload ?? info, "utf8") + 64,
    info,
    details,
    ...options,
  };
}
function background(): Packet[] {
  return [
    packet(
      1000,
      "10.44.8.90",
      "10.44.8.53",
      "DNS",
      "Consulta A tiempo.interno.example",
      { Query: "tiempo.interno.example", TransactionId: "0x9001" },
      { sourcePort: 54000, destinationPort: 53 },
    ),
    packet(
      1100,
      "10.44.8.53",
      "10.44.8.90",
      "DNS",
      "Respuesta sin error",
      {
        Query: "tiempo.interno.example",
        TransactionId: "0x9001",
        ResponseCode: "NOERROR",
        Answer: "10.44.8.123",
      },
      { sourcePort: 53, destinationPort: 54000 },
    ),
    packet(
      2000,
      "10.44.8.90",
      "10.44.8.123",
      "NTP",
      "Consulta de hora",
      { Mode: "client" },
      { sourcePort: 58000, destinationPort: 123 },
    ),
    packet(
      2020,
      "10.44.8.123",
      "10.44.8.90",
      "NTP",
      "Respuesta de hora",
      { Mode: "server" },
      { sourcePort: 123, destinationPort: 58000 },
    ),
    packet(
      3000,
      "10.44.8.90",
      "10.44.9.20",
      "TCP",
      "SYN",
      { Flags: "SYN" },
      { sourcePort: 51000, destinationPort: 443, stream: 90 },
    ),
    packet(
      3010,
      "10.44.9.20",
      "10.44.8.90",
      "TCP",
      "SYN ACK",
      { Flags: "SYN,ACK" },
      { sourcePort: 443, destinationPort: 51000, stream: 90 },
    ),
    packet(
      3011,
      "10.44.8.90",
      "10.44.9.20",
      "TCP",
      "ACK",
      { Flags: "ACK" },
      { sourcePort: 51000, destinationPort: 443, stream: 90 },
    ),
    packet(
      3020,
      "10.44.8.90",
      "10.44.9.20",
      "TLS",
      "ClientHello de otro equipo",
      { Version: "TLS 1.2", ServerName: "calendario.example" },
      { sourcePort: 51000, destinationPort: 443, stream: 90 },
    ),
  ];
}
const definitions: NetworkCase[] = [
  {
    id: "network-01",
    title: "La dirección del recado",
    points: pointsFor("network-01"),
    question:
      "Determina la dirección IPv4 devuelta sin error a la estación de recepción al consultar el nombre del servicio de inventario. Entrega la dirección sustituyendo puntos por guiones bajos, dentro de una flag.",
    answer: "10_44_8_27",
    notes:
      "Estación de recepción: 10.44.8.21. Servicio solicitado: inventario.interno.example. La consulta de una estación distinta no corresponde al recado.",
    packets: [
      packet(
        20000,
        "10.44.8.22",
        "10.44.8.53",
        "DNS",
        "Consulta A inventario.interno.example",
        { Query: "inventario.interno.example", TransactionId: "0x2101" },
        { sourcePort: 53001, destinationPort: 53 },
      ),
      packet(
        20100,
        "10.44.8.53",
        "10.44.8.22",
        "DNS",
        "Respuesta para otra estación",
        {
          Query: "inventario.interno.example",
          TransactionId: "0x2101",
          ResponseCode: "NOERROR",
          Answer: "10.44.8.72",
        },
        { sourcePort: 53, destinationPort: 53001 },
      ),
      packet(
        21000,
        "10.44.8.21",
        "10.44.8.53",
        "DNS",
        "Consulta A inventario.interno.example",
        { Query: "inventario.interno.example", TransactionId: "0x2201" },
        { sourcePort: 53002, destinationPort: 53 },
      ),
      packet(
        21100,
        "10.44.8.53",
        "10.44.8.21",
        "DNS",
        "Respuesta de inventario",
        {
          Query: "inventario.interno.example",
          TransactionId: "0x2201",
          ResponseCode: "NOERROR",
          Answer: "10.44.8.27",
        },
        { sourcePort: 53, destinationPort: 53002 },
      ),
      packet(
        22000,
        "10.44.8.53",
        "10.44.8.21",
        "DNS",
        "Nombre parecido no encontrado",
        {
          Query: "inventarios.interno.example",
          TransactionId: "0x2202",
          ResponseCode: "NXDOMAIN",
        },
        { sourcePort: 53, destinationPort: 53003 },
      ),
    ],
  },
  {
    id: "network-02",
    title: "Dos voces en el pasillo",
    points: pointsFor("network-02"),
    question:
      "Una dirección física anuncia la puerta de enlace con una identidad distinta de la inventariada. Identifica esa MAC discrepante. Entrega sus seis pares en minúsculas, separados por guiones bajos, dentro de una flag.",
    answer: "02_50_00_00_00_99",
    notes:
      "Inventario aprobado: puerta de enlace 10.44.8.1 / MAC 02:50:00:00:00:01. La impresora usa 10.44.8.40 / MAC 02:50:00:00:00:40. La discrepancia por sí sola no determina su causa.",
    packets: [
      packet(
        20000,
        "10.44.8.21",
        "broadcast",
        "ARP",
        "Solicitud de dirección física",
        {
          Opcode: "request",
          TargetIP: "10.44.8.1",
          SenderMAC: "02:50:00:00:00:21",
        },
      ),
      packet(
        20005,
        "10.44.8.1",
        "10.44.8.21",
        "ARP",
        "Respuesta de la puerta de enlace",
        {
          Opcode: "reply",
          SenderIP: "10.44.8.1",
          SenderMAC: "02:50:00:00:00:01",
        },
      ),
      packet(23000, "10.44.8.40", "broadcast", "ARP", "Anuncio de impresora", {
        Opcode: "reply",
        SenderIP: "10.44.8.40",
        SenderMAC: "02:50:00:00:00:40",
      }),
      packet(25000, "10.44.8.1", "broadcast", "ARP", "Segundo anuncio", {
        Opcode: "reply",
        SenderIP: "10.44.8.1",
        SenderMAC: "02:50:00:00:00:99",
      }),
      packet(
        26000,
        "10.44.8.21",
        "10.44.8.1",
        "TCP",
        "Conexión posterior",
        { DestinationMAC: "02:50:00:00:00:99", Flags: "SYN" },
        { sourcePort: 52001, destinationPort: 80, stream: 1 },
      ),
    ],
  },
  {
    id: "network-03",
    title: "La bienvenida inesperada",
    points: pointsFor("network-03"),
    question:
      "La estación del mostrador recibió configuración de un servidor no autorizado. Determina qué servidor confirmó su concesión aceptada. Entrega su IPv4 con guiones bajos en lugar de puntos, dentro de una flag.",
    answer: "10_44_8_250",
    notes:
      "Mostrador: MAC 02:50:00:00:00:23. Servidor autorizado: 10.44.8.2. El equipo del almacén usa otra MAC. El archivo conserva ofertas y confirmaciones de varias negociaciones.",
    packets: [
      packet(
        20000,
        "0.0.0.0",
        "255.255.255.255",
        "DHCP",
        "Discover",
        {
          MessageType: "Discover",
          TransactionId: "0xa401",
          ClientMAC: "02:50:00:00:00:23",
        },
        { sourcePort: 68, destinationPort: 67 },
      ),
      packet(
        20010,
        "10.44.8.2",
        "255.255.255.255",
        "DHCP",
        "Offer",
        {
          MessageType: "Offer",
          TransactionId: "0xa401",
          ClientMAC: "02:50:00:00:00:23",
          ServerIdentifier: "10.44.8.2",
          OfferedIP: "10.44.8.33",
        },
        { sourcePort: 67, destinationPort: 68 },
      ),
      packet(
        20012,
        "10.44.8.250",
        "255.255.255.255",
        "DHCP",
        "Offer",
        {
          MessageType: "Offer",
          TransactionId: "0xa401",
          ClientMAC: "02:50:00:00:00:23",
          ServerIdentifier: "10.44.8.250",
          OfferedIP: "10.44.8.34",
        },
        { sourcePort: 67, destinationPort: 68 },
      ),
      packet(
        20020,
        "0.0.0.0",
        "255.255.255.255",
        "DHCP",
        "Request",
        {
          MessageType: "Request",
          TransactionId: "0xa401",
          ClientMAC: "02:50:00:00:00:23",
          ServerIdentifier: "10.44.8.250",
          RequestedIP: "10.44.8.34",
        },
        { sourcePort: 68, destinationPort: 67 },
      ),
      packet(
        20030,
        "10.44.8.250",
        "255.255.255.255",
        "DHCP",
        "ACK",
        {
          MessageType: "ACK",
          TransactionId: "0xa401",
          ClientMAC: "02:50:00:00:00:23",
          ServerIdentifier: "10.44.8.250",
          AssignedIP: "10.44.8.34",
        },
        { sourcePort: 67, destinationPort: 68 },
      ),
      packet(
        21000,
        "10.44.8.2",
        "255.255.255.255",
        "DHCP",
        "ACK para almacén",
        {
          MessageType: "ACK",
          TransactionId: "0xa402",
          ClientMAC: "02:50:00:00:00:24",
          ServerIdentifier: "10.44.8.2",
          AssignedIP: "10.44.8.35",
        },
        { sourcePort: 67, destinationPort: 68 },
      ),
    ],
  },
  {
    id: "network-04",
    title: "El timbre que no respondió",
    points: pointsFor("network-04"),
    question:
      "Entre las comprobaciones al servidor de reservas, identifica el puerto de destino que respondió con un restablecimiento inmediato en vez de completar el establecimiento. Entrega solo el número dentro de una flag.",
    answer: "8443",
    notes:
      "Servidor de reservas: 10.44.9.14. La estación de control es 10.44.8.31. Hay tráfico hacia otros destinos que no pertenece a la comprobación.",
    packets: [
      packet(
        20000,
        "10.44.8.31",
        "10.44.9.14",
        "TCP",
        "SYN",
        { Flags: "SYN" },
        { sourcePort: 55001, destinationPort: 443, stream: 1 },
      ),
      packet(
        20008,
        "10.44.9.14",
        "10.44.8.31",
        "TCP",
        "SYN ACK",
        { Flags: "SYN,ACK" },
        { sourcePort: 443, destinationPort: 55001, stream: 1 },
      ),
      packet(
        20009,
        "10.44.8.31",
        "10.44.9.14",
        "TCP",
        "ACK",
        { Flags: "ACK" },
        { sourcePort: 55001, destinationPort: 443, stream: 1 },
      ),
      packet(
        21000,
        "10.44.8.31",
        "10.44.9.14",
        "TCP",
        "SYN",
        { Flags: "SYN" },
        { sourcePort: 55002, destinationPort: 8443, stream: 2 },
      ),
      packet(
        21004,
        "10.44.9.14",
        "10.44.8.31",
        "TCP",
        "RST ACK",
        { Flags: "RST,ACK" },
        { sourcePort: 8443, destinationPort: 55002, stream: 2 },
      ),
      packet(
        22000,
        "10.44.8.31",
        "10.44.9.15",
        "TCP",
        "RST de otro destino",
        { Flags: "RST" },
        { sourcePort: 55003, destinationPort: 8080, stream: 3 },
      ),
    ],
  },
  {
    id: "network-05",
    title: "La carta sin sobre",
    points: pointsFor("network-05"),
    question:
      "Determina el nombre del archivo servido correctamente a la estación de remesas. No corresponde a la petición fallida ni al intercambio cifrado. Entrega nombre y extensión en minúsculas, sustituyendo el punto por guion bajo, dentro de una flag.",
    answer: "remesa_q4_csv",
    notes:
      "Estación de remesas: 10.44.8.41. Portal de consulta: 10.44.9.80. Se preservaron cabeceras y contenido textual de algunos intercambios.",
    packets: [
      packet(
        20000,
        "10.44.8.41",
        "10.44.9.80",
        "HTTP",
        "GET /entregas/actual",
        { Method: "GET", Host: "remesas.interno.example" },
        {
          sourcePort: 55101,
          destinationPort: 80,
          stream: 1,
          payload:
            "GET /entregas/actual HTTP/1.1\r\nHost: remesas.interno.example\r\n\r\n",
        },
      ),
      packet(
        20015,
        "10.44.9.80",
        "10.44.8.41",
        "HTTP",
        "200 OK",
        { Status: "200" },
        {
          sourcePort: 80,
          destinationPort: 55101,
          stream: 1,
          payload:
            'HTTP/1.1 200 OK\r\nContent-Disposition: attachment; filename="remesa_q4.csv"\r\n\r\nfolio,cajas\nR-08,4\n',
        },
      ),
      packet(
        21000,
        "10.44.8.41",
        "10.44.9.80",
        "HTTP",
        "GET /entregas/anterior",
        { Method: "GET" },
        {
          sourcePort: 55102,
          destinationPort: 80,
          stream: 2,
          payload:
            "GET /entregas/anterior HTTP/1.1\r\nHost: remesas.interno.example\r\n\r\n",
        },
      ),
      packet(
        21015,
        "10.44.9.80",
        "10.44.8.41",
        "HTTP",
        "404 Not Found",
        { Status: "404" },
        {
          sourcePort: 80,
          destinationPort: 55102,
          stream: 2,
          payload: "HTTP/1.1 404 Not Found\r\n\r\nNo disponible.",
        },
      ),
      packet(
        22000,
        "10.44.9.80",
        "10.44.8.41",
        "TLS",
        "Application Data",
        { Version: "TLS 1.2", Encrypted: "true" },
        { sourcePort: 443, destinationPort: 55103, stream: 3 },
      ),
    ],
  },
  {
    id: "network-06",
    title: "Las sílabas del viento",
    points: pointsFor("network-06"),
    question:
      "Reconstruye la referencia transportada en las consultas inusuales de la estación de sensores. La numeración de sus etiquetas conserva el orden; una retransmisión no añade una pieza nueva. Entrega la referencia recuperada, en minúsculas, dentro de una flag.",
    answer: "muelle_7",
    notes:
      "Estación de sensores: 10.44.8.61. Se observaron nombres bajo sonda.interno.example. El equipo 10.44.8.62 tenía otra prueba independiente. La referencia no contiene espacios.",
    packets: [
      packet(
        20000,
        "10.44.8.61",
        "10.44.8.53",
        "DNS",
        "Consulta inusual",
        { Query: "s02.6c6c65.sonda.interno.example", TransactionId: "0xb102" },
        { sourcePort: 54002, destinationPort: 53 },
      ),
      packet(
        20100,
        "10.44.8.62",
        "10.44.8.53",
        "DNS",
        "Consulta de otra prueba",
        {
          Query: "s01.6f74726f.sonda.interno.example",
          TransactionId: "0xb201",
        },
        { sourcePort: 54011, destinationPort: 53 },
      ),
      packet(
        21000,
        "10.44.8.61",
        "10.44.8.53",
        "DNS",
        "Consulta inusual",
        { Query: "s01.6d7565.sonda.interno.example", TransactionId: "0xb101" },
        { sourcePort: 54001, destinationPort: 53 },
      ),
      packet(
        22000,
        "10.44.8.61",
        "10.44.8.53",
        "DNS",
        "Consulta repetida",
        { Query: "s02.6c6c65.sonda.interno.example", TransactionId: "0xb102" },
        { sourcePort: 54002, destinationPort: 53 },
      ),
      packet(
        23000,
        "10.44.8.61",
        "10.44.8.53",
        "DNS",
        "Consulta inusual",
        { Query: "s03.5f37.sonda.interno.example", TransactionId: "0xb103" },
        { sourcePort: 54003, destinationPort: 53 },
      ),
    ],
  },
  {
    id: "network-07",
    title: "La entrega del tercer turno",
    points: pointsFor("network-07"),
    question:
      "Identifica el archivo cuya transferencia de subida terminó satisfactoriamente en la sesión de la estación de cierre. Entrega el nombre con extensión en minúsculas y cambia el punto por guion bajo, dentro de una flag.",
    answer: "acta_cierre_txt",
    notes:
      "Estación de cierre: 10.44.8.71. Servidor de intercambio: 10.44.9.21. Dos transferencias quedaron registradas en el mismo canal de control.",
    packets: [
      packet(
        20000,
        "10.44.9.21",
        "10.44.8.71",
        "FTP",
        "Servicio preparado",
        { ReplyCode: "220" },
        {
          sourcePort: 21,
          destinationPort: 56001,
          stream: 1,
          payload: "220 Servicio de intercambio preparado\r\n",
        },
      ),
      packet(
        21000,
        "10.44.8.71",
        "10.44.9.21",
        "FTP",
        "Solicitud de subida",
        { Command: "STOR" },
        {
          sourcePort: 56001,
          destinationPort: 21,
          stream: 1,
          payload: "STOR acta_borrador.txt\r\n",
        },
      ),
      packet(
        21010,
        "10.44.9.21",
        "10.44.8.71",
        "FTP",
        "Canal de datos abierto",
        { ReplyCode: "150" },
        {
          sourcePort: 21,
          destinationPort: 56001,
          stream: 1,
          payload: "150 Abriendo canal de datos\r\n",
        },
      ),
      packet(
        21500,
        "10.44.9.21",
        "10.44.8.71",
        "FTP",
        "Transferencia interrumpida",
        { ReplyCode: "426" },
        {
          sourcePort: 21,
          destinationPort: 56001,
          stream: 1,
          payload: "426 Conexión cerrada; transferencia abortada\r\n",
        },
      ),
      packet(
        22000,
        "10.44.8.71",
        "10.44.9.21",
        "FTP",
        "Nueva solicitud de subida",
        { Command: "STOR" },
        {
          sourcePort: 56001,
          destinationPort: 21,
          stream: 1,
          payload: "STOR acta_cierre.txt\r\n",
        },
      ),
      packet(
        22010,
        "10.44.9.21",
        "10.44.8.71",
        "FTP",
        "Canal de datos abierto",
        { ReplyCode: "150" },
        {
          sourcePort: 21,
          destinationPort: 56001,
          stream: 1,
          payload: "150 Abriendo canal de datos\r\n",
        },
      ),
      packet(
        22500,
        "10.44.8.71",
        "10.44.9.21",
        "FTP-DATA",
        "Contenido del documento",
        { ControlStream: "1" },
        {
          sourcePort: 56002,
          destinationPort: 2020,
          stream: 2,
          payload: "Cierre de turno: recepción completada.\n",
        },
      ),
      packet(
        23000,
        "10.44.9.21",
        "10.44.8.71",
        "FTP",
        "Transferencia completa",
        { ReplyCode: "226" },
        {
          sourcePort: 21,
          destinationPort: 56001,
          stream: 1,
          payload: "226 Transferencia completada\r\n",
        },
      ),
    ],
  },
  {
    id: "network-08",
    title: "El eco del corredor",
    points: pointsFor("network-08"),
    question:
      "Calcula el tiempo de ida y vuelta de la comprobación con identificador 0x4410 y secuencia 7 entre la estación de control y el servidor de archivo. Entrega el número de milisegundos seguido de _ms, dentro de una flag.",
    answer: "42_ms",
    notes:
      "Control: 10.44.8.81. Servidor de archivo: 10.44.9.10. Las marcas temporales usan el mismo reloj UTC. Hay otras secuencias intercaladas.",
    packets: [
      packet(30000, "10.44.8.81", "10.44.9.10", "ICMP", "Echo request", {
        Type: "8",
        Identifier: "0x4410",
        Sequence: "7",
      }),
      packet(30005, "10.44.8.81", "10.44.9.10", "ICMP", "Echo request", {
        Type: "8",
        Identifier: "0x4410",
        Sequence: "8",
      }),
      packet(30025, "10.44.9.10", "10.44.8.81", "ICMP", "Echo reply", {
        Type: "0",
        Identifier: "0x4410",
        Sequence: "8",
      }),
      packet(30042, "10.44.9.10", "10.44.8.81", "ICMP", "Echo reply", {
        Type: "0",
        Identifier: "0x4410",
        Sequence: "7",
      }),
    ],
  },
  {
    id: "network-09",
    title: "El nombre bajo el sello",
    points: pointsFor("network-09"),
    question:
      "Determina el nombre de servidor solicitado por la estación de edición en la conexión cifrada que llegó a transportar datos de aplicación. Excluye la negociación que terminó con alerta. Entrega el nombre en minúsculas cambiando puntos por guiones bajos, dentro de una flag.",
    answer: "archivo_riomar_example",
    notes:
      "Estación de edición: 10.44.8.91. Destino observado: 10.44.9.43. Los datos de aplicación cifrados no están disponibles como texto; se preservaron campos de las negociaciones TLS 1.2 sin ECH.",
    packets: [
      packet(
        20000,
        "10.44.8.91",
        "10.44.9.43",
        "TLS",
        "ClientHello",
        { Version: "TLS 1.2", ServerName: "borrador.riomar.example" },
        { sourcePort: 57001, destinationPort: 443, stream: 1 },
      ),
      packet(
        20010,
        "10.44.9.43",
        "10.44.8.91",
        "TLS",
        "Alerta de negociación",
        { Version: "TLS 1.2", Alert: "handshake_failure" },
        { sourcePort: 443, destinationPort: 57001, stream: 1 },
      ),
      packet(
        21000,
        "10.44.8.91",
        "10.44.9.43",
        "TLS",
        "ClientHello",
        { Version: "TLS 1.2", ServerName: "archivo.riomar.example" },
        { sourcePort: 57002, destinationPort: 443, stream: 2 },
      ),
      packet(
        21010,
        "10.44.9.43",
        "10.44.8.91",
        "TLS",
        "ServerHello",
        { Version: "TLS 1.2" },
        { sourcePort: 443, destinationPort: 57002, stream: 2 },
      ),
      packet(
        21500,
        "10.44.8.91",
        "10.44.9.43",
        "TLS",
        "Application Data",
        { Version: "TLS 1.2", Encrypted: "true" },
        { sourcePort: 57002, destinationPort: 443, stream: 2 },
      ),
    ],
  },
  {
    id: "network-10",
    title: "La estación sin firma",
    points: pointsFor("network-10"),
    question:
      "Identifica el nombre del equipo que envió la remesa después de la reasignación de direcciones. El usuario que tenía esa IP antes no basta para atribuir el envío. Entrega el nombre del equipo en minúsculas y con guiones bajos, dentro de una flag.",
    answer: "estacion_cobalto",
    notes:
      "Inventario físico: 02:50:00:00:00:44 = estacion_ambar; 02:50:00:00:00:64 = estacion_cobalto. Antes de las 18:00 UTC, 10.44.8.44 correspondía a estacion_ambar. Servidor de remesas: 10.44.9.80. La captura conserva la concesión posterior y el envío.",
    packets: [
      packet(
        20000,
        "10.44.8.2",
        "255.255.255.255",
        "DHCP",
        "ACK de nueva concesión",
        {
          MessageType: "ACK",
          ClientMAC: "02:50:00:00:00:64",
          AssignedIP: "10.44.8.44",
          TransactionId: "0xd401",
          ServerIdentifier: "10.44.8.2",
        },
        { sourcePort: 67, destinationPort: 68 },
      ),
      packet(22000, "10.44.8.44", "broadcast", "ARP", "Anuncio de dirección", {
        SenderIP: "10.44.8.44",
        SenderMAC: "02:50:00:00:00:64",
        Opcode: "reply",
      }),
      packet(
        25000,
        "10.44.8.44",
        "10.44.9.80",
        "HTTP",
        "POST /remesas",
        { SourceMAC: "02:50:00:00:00:64", Method: "POST" },
        {
          sourcePort: 58001,
          destinationPort: 80,
          stream: 1,
          payload:
            "POST /remesas HTTP/1.1\r\nHost: remesas.interno.example\r\n\r\nremesa=R-41\n",
        },
      ),
      packet(
        25015,
        "10.44.9.80",
        "10.44.8.44",
        "HTTP",
        "201 Created",
        { Status: "201" },
        {
          sourcePort: 80,
          destinationPort: 58001,
          stream: 1,
          payload: "HTTP/1.1 201 Created\r\n\r\nRecepción registrada.\n",
        },
      ),
      packet(
        26000,
        "10.44.8.45",
        "10.44.9.80",
        "HTTP",
        "GET /estado",
        { SourceMAC: "02:50:00:00:00:44", Method: "GET" },
        {
          sourcePort: 58002,
          destinationPort: 80,
          stream: 2,
          payload:
            "GET /estado HTTP/1.1\r\nHost: remesas.interno.example\r\n\r\n",
        },
      ),
    ],
  },
];
export const NETWORK_CASES = definitions.map((entry) => ({
  ...entry,
  packets: [...background(), ...entry.packets]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((packet, index) => ({ ...packet, number: index + 1 })),
}));
export const NETWORK_CHALLENGES = NETWORK_CASES.map((entry) => ({
  id: entry.id,
  title: entry.title,
  points: entry.points,
  description: MISSIONS.find((m) => m.id === entry.id)!.objective,
  category: "Redes · Operación de dispositivos",
  device: "computer",
}));
export function networkFolder(id: string) {
  if (!NETWORK_CASES.some((entry) => entry.id === id))
    throw Error("Expediente de red desconocido.");
  return `/home/analista/redes/caso-${id.slice(-2)}`;
}
export function networkFlag(id: string) {
  const entry = NETWORK_CASES.find((entry) => entry.id === id);
  if (!entry) throw Error("Expediente de red desconocido.");
  return `CTF{${entry.answer}}`;
}
export function networkFiles(id: string): Record<string, string> | undefined {
  const entry = NETWORK_CASES.find((entry) => entry.id === id);
  if (!entry) return;
  return {
    "/home/analista/evidencia/expediente.txt": `${entry.title}\n\n${MISSIONS.find((m) => m.id === id)!.objective}\n\nOpera los dispositivos desde Rack → Administrar red y usa Validar red.\n\nArchivo histórico de la estación\n${entry.notes}\n\nCaptura histórica: ${networkFolder(id)}/evidencia/turno.capture.json`,
    "/home/analista/evidencia/turno.capture.json": JSON.stringify(
      {
        format: "seventech-capture-v1",
        timezone: "UTC",
        packets: entry.packets,
      },
      null,
      2,
    ),
  };
}

export function getNetworkChallenge(id: string) {
  return NETWORK_CHALLENGES.find((entry) => entry.id === id);
}

export const NETWORK_ARCHIVE_DESCRIPTIONS = Object.fromEntries(
  NETWORK_CASES.map((entry) => [
    entry.id,
    `${entry.question} El expediente y el material de captura se conservan en el rack.`,
  ]),
);
