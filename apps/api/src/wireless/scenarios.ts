import { createHash } from "node:crypto";
import type {
  WirelessConfig,
  WirelessId,
} from "../../../../packages/wireless-contracts";
import { certificateHash, incidentTime } from "./certificates";

export const isWirelessOperational = (id: string): id is WirelessId =>
  ["wireless-08", "wireless-09", "wireless-10"].includes(id);

export function siteFor(seed: string) {
  const tag = createHash("sha256").update(seed).digest("hex").slice(0, 6);
  const zone = (parseInt(tag.slice(0, 2), 16) % 80) + 10;
  return {
    tag,
    staff: String(200 + zone),
    guest: String(400 + zone),
    relay: `10.42.${zone}.10`,
    transferRelay: `10.43.${zone}.20`,
    identity: `maint-${tag}`,
    transferIdentity: `maint-new-${tag}`,
    sensor: `sensor-${tag}`,
  };
}
export const OPERATIONAL_CASES = [
  {
    title: "El pasillo donde se pierde la sesión",
    question:
      "Durante el cambio de turno, los terminales del almacén se autentican pero pierden el inventario al cambiar de AP. Restaura movilidad y renovación de concesiones sin abrir el acceso de invitados ni interrumpir los clientes existentes. Justifica el diagnóstico con dos trazas y predice el efecto de un cambio antes de aplicarlo. La primera reparación abre una segunda incidencia con otros requisitos; el comprobante exige adaptar y validar ambas soluciones. Abre el detalle para operar el laboratorio.",
  },
  {
    title: "La actualización que cruzó el perímetro BLE",
    question:
      "Un equipo de mantenimiento sustituyó la pasarela BLE y ahora una sesión sin autenticar alcanza la actualización del sensor. Recupera el mantenimiento autorizado y la telemetría sin confiar en direcciones privadas que rotan. Justifica el diagnóstico con dos trazas y predice un efecto antes de aplicar cambios. Después se sustituye la tableta de mantenimiento y debes adaptar la autorización, conservar el sensor y rechazar el equipo retirado. El comprobante exige resolver y validar las dos fases desde el detalle del reto.",
  },
  {
    title: "La renovación de RADIUS dejó una puerta abierta",
    question:
      "Tras renovar los certificados y activar el segundo RADIUS, parte de la flota falla y otra acepta un servidor ajeno. Recupera el servicio EAP-TLS con validación de cadena, nombre, propósito y vigencia, sin fijar la huella de un único certificado final. Inspecciona los certificados y el perfil desplegado, corrige el candidato y prueba el servicio legítimo y los casos de rechazo. Obtén el comprobante en el laboratorio del detalle del reto.",
  },
] as const;

export function initialConfig(id: WirelessId, seed: string): WirelessConfig {
  const site = siteFor(seed);
  if (id === "wireless-08")
    return {
      controller: {
        clientVlan: site.staff,
        guestVlan: site.guest,
        forwarding: "local",
        ft: "enabled",
        pmf: "required",
        auth: "eap-tls",
      },
      "ap-east": {
        allowedVlans: `${site.staff},${site.guest}`,
        nativeVlan: "99",
        rf: "enabled",
      },
      "ap-west": { allowedVlans: site.guest, nativeVlan: "99", rf: "enabled" },
      gateway: {
        dhcpRelay: "10.42.0.99",
        clientIsolation: "disabled",
        guestToStaff: "allow",
        staffToInventory: "allow",
      },
    };
  if (id === "wireless-09")
    return {
      gateway: {
        secureConnections: "optional",
        pairing: "just-works",
        bonds: `${site.identity},${site.sensor}`,
        identityResolution: "disabled",
        allowUnbonded: "enabled",
      },
      dfu: {
        encryption: "required",
        authentication: "optional",
        role: "any",
        signature: "optional",
      },
      telemetry: {
        notifications: "enabled",
        role: "sensor",
        encryption: "required",
      },
    };
  return {
    supplicant: {
      method: "eap-tls",
      validateServer: "disabled",
      trustAnchors: certificateHash("campus-ca"),
      serverNames: "radius-a.campus.example",
      leafPin: certificateHash("primary"),
      revocation: "soft-fail",
    },
    radius: { primary: "enabled", secondary: "enabled", crlStatus: "stale" },
  };
}

export const testNames = (id: WirelessId) =>
  id === "wireless-08"
    ? [
        "east-session",
        "roam-west",
        "renew-west",
        "guest-isolation",
        "existing-clients",
        "staff-isolation",
      ]
    : id === "wireless-09"
      ? [
          "maintenance",
          "rotating-identity",
          "telemetry",
          "unbonded-write",
          "justworks-write",
          "sensor-dfu",
          "unsigned-image",
        ]
      : [
          "primary",
          "secondary",
          "foreign-ca",
          "wrong-san",
          "expired",
          "revoked-client",
        ];

export function ticket(id: WirelessId, seed: string) {
  const site = siteFor(seed);
  const common = `Incidente ${id.toUpperCase()} / cambio CH-${site.tag}\nConsola de operación acotada. No controla radios ni equipos externos. Los cambios y las pruebas se conservan por cuenta.\n`;
  if (id === "wireless-08")
    return (
      common +
      `ALMACÉN / 06:40\nLos lectores realizan EAP-TLS y usan VLAN ${site.staff}; invitados VLAN ${site.guest}. Gestión de AP permanece en VLAN99. Flex/local switching: el tráfico de clientes sale por el uplink de cada AP. El relay aprobado es ${site.relay}. Inventario requiere continuidad de sesión y renovación DHCP en ambos pasillos. Roaming FT y PMF son obligatorios para esta flota. Invitados y clientes entre sí no deben alcanzar otros terminales; sí el servicio de inventario.\nNo se autoriza cambiar la VLAN asignada, desactivar radios ni aislar el almacén de su servidor.\nArquitectura: lector → ap-east/ap-west → uplink local → gateway → DHCP/inventario.\nAl inicio, show events conserva registros de las alarmas; test genera nuevas trazas sobre la configuración running.`
    );
  if (id === "wireless-09")
    return (
      common +
      `MANTENIMIENTO / pasarela edge-${site.tag}\nIdentidades aprovisionadas: ${site.identity} (mantenimiento DisplayYesNo, Numeric Comparison) y ${site.sensor} (sensor con bond preexistente). La dirección privada cambia; el servicio debe reconocer el bond mediante resolución de identidad. No se permite sustituir identidades por MAC ni eliminar bonds.\nActualizaciones: solo mantenimiento autenticado mediante LE Secure Connections y firmware firmado. Telemetría: notificaciones cifradas del sensor, sin concederle escritura DFU. El firmware lleva validación de firma de aplicación, distinta de la seguridad del enlace.\nEl cambio no autoriza silenciar notificaciones, dar rol any ni admitir nuevas identidades sin aprovisionamiento.`
    );
  return (
    common +
    `CAMPUS / renovación PKI\nFecha del expediente: ${incidentTime.toISOString()}. Deben funcionar radius-a.campus.example y radius-b.campus.example, ambos con certificados finales distintos emitidos por Seventech Training Root. El perfil se distribuye por MDM. La confianza se ancla en la CA; no se autoriza TOFU ni pin del certificado final.\nLas pruebas incluyen raíz externa, SAN distinto, certificado caducado y cliente revocado. La comprobación de revocación es obligatoria y su lista debe estar actualizada. EAP-TLS y ambos RADIUS permanecen habilitados.\nshow cert campus-ca y show cert <servidor> muestran PEM, emisor, SAN, EKU, fechas y SHA256. Las firmas, la cadena directa, SAN, EKU y fechas se comprueban con X509Certificate de Node; CRL y transporte EAP son modelos del laboratorio.`
  );
}

export const COMMAND_HELP = `ticket | devices | show running [equipo] | show candidate [equipo] | show events | show cert <nombre>
configure <equipo> <propiedad> <valor>
diff | commit | rollback
test <nombre> | capture | verify | reset --confirm
help fields muestra las propiedades y valores admitidos. test all ejecuta la batería completa.
configure cambia solo el candidato; commit lo aplica y caduca las comprobaciones anteriores. verify exige todas las pruebas vigentes y un candidato sin cambios. reset restaura únicamente este laboratorio; conserva los puntos obtenidos.`;

export const FIELD_VALUES: Record<
  string,
  string[] | "vlans" | "identities" | "fingerprints" | "hosts" | "ip"
> = {
  clientVlan: "vlans",
  guestVlan: "vlans",
  allowedVlans: "vlans",
  nativeVlan: "vlans",
  dhcpRelay: "ip",
  forwarding: ["local", "central"],
  ft: ["enabled", "disabled"],
  pmf: ["required", "optional", "disabled"],
  auth: ["eap-tls", "open"],
  rf: ["enabled", "disabled"],
  clientIsolation: ["enabled", "disabled"],
  guestToStaff: ["allow", "deny"],
  staffToInventory: ["allow", "deny"],
  secureConnections: ["required", "optional"],
  pairing: ["numeric-comparison", "just-works"],
  bonds: "identities",
  identityResolution: ["enabled", "disabled"],
  allowUnbonded: ["enabled", "disabled"],
  encryption: ["required", "optional"],
  authentication: ["required", "optional"],
  role: ["maintenance", "sensor", "any"],
  signature: ["required", "optional"],
  notifications: ["enabled", "disabled"],
  method: ["eap-tls", "peap"],
  validateServer: ["enabled", "disabled"],
  trustAnchors: "fingerprints",
  serverNames: "hosts",
  leafPin: "fingerprints",
  revocation: ["hard-fail", "soft-fail"],
  primary: ["enabled", "disabled"],
  secondary: ["enabled", "disabled"],
  crlStatus: ["current", "stale"],
};

export function validSetting(key: string, value: string) {
  const rule = FIELD_VALUES[key];
  if (Array.isArray(rule)) return rule.includes(value);
  if (rule === "vlans")
    return value
      .split(",")
      .every((v) => /^\d{1,4}$/.test(v) && Number(v) > 0 && Number(v) < 4095);
  if (rule === "ip")
    return (
      /^\d{1,3}(\.\d{1,3}){3}$/.test(value) &&
      value.split(".").every((v) => Number(v) <= 255)
    );
  if (rule === "fingerprints")
    return (
      value === "none" ||
      value.split(",").every((v) => /^[a-f0-9]{64}$/.test(v))
    );
  if (rule === "hosts")
    return value
      .split(",")
      .every((v) => /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(v));
  return (
    rule === "identities" &&
    value.split(",").every((v) => /^[a-z0-9-]{3,64}$/.test(v))
  );
}
