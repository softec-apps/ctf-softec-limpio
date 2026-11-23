import type { EvidenceCase } from "../casework/types";
import { OPERATIONAL_CASES } from "./scenarios";
export const WIRELESS_CASES: EvidenceCase[] = [
  {
    title: "La red abierta",
    question:
      "Busca el beacon de una red cuyo campo privacy sea false y rsn ausente. Entrega CTF{ssid}.",
    answer: "LAB-GUEST",
    files: {
      "radio.capture.json":
        '{"format":"seventech-capture-v1","scope":"Exportación didáctica de radio; no es PCAP ni activa una interfaz real.","packets":[{"number":1,"time":"0.0","source":"ap-lab","destination":"client-lab","protocol":"802.11","length":80,"info":"beacon","details":{"event":"beacon","ssid":"LAB-STAFF","privacy":"true","rsn":"CCMP"}},{"number":2,"time":"0.1","source":"ap-lab","destination":"client-lab","protocol":"802.11","length":80,"info":"beacon","details":{"event":"beacon","ssid":"LAB-GUEST","privacy":"false","rsn":"none"}}]}',
    },
  },
  {
    title: "Un BSSID ajeno",
    question:
      "El mismo SSID aparece desde varios BSSID. Cruza la captura con el inventario autorizado e identifica el BSSID no inventariado. Entrega CTF{bssid_con_dos_puntos}.",
    answer: "02:aa:00:00:00:77",
    files: {
      "radio.capture.json":
        '{"format":"seventech-capture-v1","scope":"Exportación didáctica de radio; no es PCAP ni activa una interfaz real.","packets":[{"number":1,"time":"0.0","source":"ap-lab","destination":"client-lab","protocol":"802.11","length":80,"info":"beacon","details":{"event":"beacon","ssid":"LAB-STAFF","bssid":"02:aa:00:00:00:11"}},{"number":2,"time":"0.1","source":"ap-lab","destination":"client-lab","protocol":"802.11","length":80,"info":"beacon","details":{"event":"beacon","ssid":"LAB-STAFF","bssid":"02:aa:00:00:00:77"}}]}',
      "autorizados.txt": "02:aa:00:00:00:11\n",
    },
  },
  {
    title: "El nombre que viajó en la sonda",
    question:
      "El beacon oculta el nombre. Identifica el SSID solicitado por la estación del expediente en su probe request. Entrega CTF{ssid}.",
    answer: "LAB-ARCHIVE",
    files: {
      "radio.capture.json":
        '{"format":"seventech-capture-v1","scope":"Exportación didáctica de radio; no es PCAP ni activa una interfaz real.","packets":[{"number":1,"time":"0.0","source":"ap-lab","destination":"client-lab","protocol":"802.11","length":80,"info":"beacon","details":{"event":"beacon","ssid":"","bssid":"02:bb:00:00:00:10"}},{"number":2,"time":"0.1","source":"02:cc:00:00:00:31","destination":"client-lab","protocol":"802.11","length":80,"info":"probe-request","details":{"event":"probe-request","source":"02:cc:00:00:00:31","ssid":"LAB-ARCHIVE"}},{"number":3,"time":"0.2","source":"02:cc:00:00:00:99","destination":"client-lab","protocol":"802.11","length":80,"info":"probe-request","details":{"event":"probe-request","source":"02:cc:00:00:00:99","ssid":"OTHER"}}]}',
      "estacion.txt": "02:cc:00:00:00:31",
    },
  },
  {
    title: "La escritura sin autenticación",
    question:
      "En el inventario GATT encuentra la característica que permite write sin exigir authenticated ni encrypted. Entrega CTF{uuid}.",
    answer: "0000ff12-0000-1000-8000-00805f9b34fb",
    files: {
      "radio.capture.json":
        '{"format":"seventech-capture-v1","scope":"Exportación didáctica de radio; no es PCAP ni activa una interfaz real.","packets":[{"number":1,"time":"0.0","source":"ap-lab","destination":"client-lab","protocol":"BLE","length":80,"info":"gatt-policy","details":{"event":"gatt-policy","protocol":"BLE","uuid":"0000ff11-0000-1000-8000-00805f9b34fb","write":"true","authenticated":"true","encrypted":"true"}},{"number":2,"time":"0.1","source":"ap-lab","destination":"client-lab","protocol":"BLE","length":80,"info":"gatt-policy","details":{"event":"gatt-policy","protocol":"BLE","uuid":"0000ff12-0000-1000-8000-00805f9b34fb","write":"true","authenticated":"false","encrypted":"false"}}]}',
    },
  },
  {
    title: "El emparejamiento sin MITM",
    question:
      "Relaciona el Pairing Request y su Response por connection. Identifica la conexión que acepta JustWorks con mitm=false en ambos extremos, pese a la política. Entrega CTF{connection}.",
    answer: "BLE-5",
    files: {
      "radio.capture.json":
        '{"format":"seventech-capture-v1","scope":"Exportación didáctica de radio; no es PCAP ni activa una interfaz real.","packets":[{"number":1,"time":"0.0","source":"ap-lab","destination":"client-lab","protocol":"BLE","length":80,"info":"pair-request","details":{"event":"pair-request","protocol":"BLE","connection":"BLE-5","method":"JustWorks","mitm":"false"}},{"number":2,"time":"0.1","source":"ap-lab","destination":"client-lab","protocol":"BLE","length":80,"info":"pair-response","details":{"event":"pair-response","protocol":"BLE","connection":"BLE-5","method":"JustWorks","mitm":"false"}},{"number":3,"time":"0.2","source":"ap-lab","destination":"client-lab","protocol":"BLE","length":80,"info":"pair-request","details":{"event":"pair-request","protocol":"BLE","connection":"BLE-6","method":"Passkey","mitm":"true"}},{"number":4,"time":"0.3","source":"ap-lab","destination":"client-lab","protocol":"BLE","length":80,"info":"pair-response","details":{"event":"pair-response","protocol":"BLE","connection":"BLE-6","method":"Passkey","mitm":"true"}}]}',
      "politica.txt":
        "Dispositivos de control requieren autenticación resistente a MITM. Se analizan registros, no se empareja hardware real.",
    },
  },
  {
    title: "La desconexión sin protección",
    question:
      "La asociación negoció PMF obligatorio. Encuentra la primera trama deauth no protegida de ese mismo BSSID hacia la estación asociada. Entrega CTF{numero_de_paquete}.",
    answer: "3",
    files: {
      "radio.capture.json":
        '{"format":"seventech-capture-v1","scope":"Exportación didáctica de radio; no es PCAP ni activa una interfaz real.","packets":[{"number":1,"time":"0.0","source":"ap-lab","destination":"client-lab","protocol":"802.11","length":80,"info":"association","details":{"event":"association","bssid":"02:dd:00:00:00:16","station":"02:cc:00:00:00:16","pmf":"required"}},{"number":2,"time":"0.1","source":"ap-lab","destination":"client-lab","protocol":"802.11","length":80,"info":"deauth","details":{"event":"deauth","bssid":"02:dd:00:00:00:99","station":"02:cc:00:00:00:16","protected":"false"}},{"number":3,"time":"0.2","source":"ap-lab","destination":"client-lab","protocol":"802.11","length":80,"info":"deauth","details":{"event":"deauth","bssid":"02:dd:00:00:00:16","station":"02:cc:00:00:00:16","protected":"false"}}]}',
    },
  },
  {
    title: "La identidad del túnel",
    question:
      "Cruza el inicio EAP de la estación objetivo con la respuesta Identity de la misma session. Extrae únicamente el dominio de la identidad exterior. Entrega CTF{dominio}.",
    answer: "lab.example",
    files: {
      "radio.capture.json":
        '{"format":"seventech-capture-v1","scope":"Exportación didáctica de radio; no es PCAP ni activa una interfaz real.","packets":[{"number":1,"time":"0.0","source":"ap-lab","destination":"client-lab","protocol":"EAP","length":80,"info":"eap-start","details":{"event":"eap-start","protocol":"EAP","station":"sta-7","session":"E-7"}},{"number":2,"time":"0.1","source":"ap-lab","destination":"client-lab","protocol":"EAP","length":80,"info":"eap-identity","details":{"event":"eap-identity","protocol":"EAP","station":"sta-8","session":"E-8","identity":"guest@other.example"}},{"number":3,"time":"0.2","source":"ap-lab","destination":"client-lab","protocol":"EAP","length":80,"info":"eap-identity","details":{"event":"eap-identity","protocol":"EAP","station":"sta-7","session":"E-7","identity":"ana@lab.example"}}]}',
      "objetivo.txt": "sta-7",
    },
  },
  ...OPERATIONAL_CASES.map((entry) => ({
    ...entry,
    answer: "operational-v2",
    files: {
      "operacion.txt":
        entry.question +
        "\n\nEl laboratorio está en el detalle del reto. También puedes usar la Terminal: wlan wireless-08 help (sustituye el número por el del expediente). ticket muestra los requisitos e inventario propios de tu sesión. configure modifica el candidato; commit aplica; test genera trazas y verify emite el comprobante cuando el servicio está corregido. No hay una respuesta fija que extraer de estos archivos.",
    },
  })),
];
