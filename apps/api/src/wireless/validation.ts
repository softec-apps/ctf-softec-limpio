import type {
  WirelessConfig,
  WirelessId,
} from "../../../../packages/wireless-contracts";
import {
  certificateHash,
  validateServerCertificate,
  type CertificateName,
} from "./certificates";
import { siteFor } from "./scenarios";

export type Trial = { passed: boolean; protocol: string; trace: string[] };

function roaming(
  config: WirelessConfig,
  name: string,
  seed: string,
  context: { transfer?: boolean },
): Trial {
  const site = siteFor(seed),
    controller = config.controller,
    gateway = config.gateway;
  const radio = (ap: string) =>
    config[ap].rf === "enabled" &&
    controller.auth === "eap-tls" &&
    controller.pmf === "required";
  const vlan = (ap: string, id: string) =>
    config[ap].allowedVlans.split(",").includes(id);
  const staff = (ap: string) =>
    radio(ap) &&
    controller.forwarding === "local" &&
    controller.clientVlan === site.staff &&
    vlan(ap, site.staff);
  const east = staff("ap-east"),
    west = staff("ap-west");
  const trace = [
    `RADIUS Access-Accept: Tunnel-Private-Group-ID=${site.staff}`,
    `WLAN local-switching=${controller.forwarding}; assigned VLAN=${controller.clientVlan}`,
  ];
  let passed = false;
  if (name === "east-session") {
    passed = east && gateway.staffToInventory === "allow";
    trace.push(
      `ap-east EAP=${radio("ap-east") ? "success" : "failure"}; uplink VLAN${site.staff}=${vlan("ap-east", site.staff) ? "forwarded" : "discarded"}`,
      `TCP inventory: ${passed ? "established" : "timeout"}`,
    );
  } else if (name === "roam-west") {
    passed =
      east &&
      west &&
      controller.ft === "enabled" &&
      gateway.staffToInventory === "allow";
    trace.push(
      `FT reassociation ap-east→ap-west: ${controller.ft === "enabled" ? "84ms" : "full EAP 930ms"}`,
      `ap-west EAP=${radio("ap-west") ? "success" : "failure"}; uplink VLAN${site.staff}=${vlan("ap-west", site.staff) ? "forwarded" : "discarded"}`,
      `TCP session: ${passed ? "sequence continuous" : "retransmission timeout"}`,
    );
  } else if (name === "renew-west") {
    passed =
      west &&
      gateway.dhcpRelay ===
        (context.transfer ? site.transferRelay : site.relay);
    trace.push(
      `DHCPDISCOVER vlan=${site.staff}; relay-destination=${gateway.dhcpRelay}`,
      `DHCP lease: ${passed ? "ACK / correct subnet" : "no usable offer"}`,
    );
  } else if (name === "guest-isolation") {
    const guestWorks =
      ["ap-east", "ap-west"].every((ap) => radio(ap) && vlan(ap, site.guest)) &&
      controller.guestVlan === site.guest;
    passed = guestWorks && gateway.guestToStaff === "deny" && east && west;
    trace.push(
      `Guest association and lease: ${guestWorks ? "success" : "failure"}`,
      `Guest→staff policy: ${gateway.guestToStaff === "deny" ? "DROP" : "FORWARDED"}`,
    );
  } else if (name === "existing-clients") {
    passed =
      east &&
      west &&
      gateway.staffToInventory === "allow" &&
      ["ap-east", "ap-west"].every(
        (ap) =>
          config[ap].nativeVlan === "99" &&
          config[ap].allowedVlans
            .split(",")
            .every((v) => [site.staff, site.guest].includes(v)),
      );
    trace.push(
      `Existing clients: ${passed ? "inventory reachable / management unchanged" : "service or approved segmentation changed"}`,
    );
  } else if (name === "staff-isolation") {
    passed =
      east &&
      west &&
      gateway.clientIsolation === "enabled" &&
      gateway.staffToInventory === "allow";
    trace.push(
      `STA→STA: ${gateway.clientIsolation === "enabled" ? "DROP" : "FORWARDED"}`,
      `STA→inventory: ${gateway.staffToInventory === "allow" ? "established" : "blocked"}`,
    );
  }
  return { passed, protocol: "802.11/DHCP", trace };
}

function bluetooth(
  config: WirelessConfig,
  name: string,
  seed: string,
  context: { transfer?: boolean },
): Trial {
  const site = siteFor(seed),
    gateway = config.gateway,
    dfu = config.dfu,
    telemetry = config.telemetry;
  const bonds = gateway.bonds.split(",");
  const maintenanceIdentity = context.transfer
    ? site.transferIdentity
    : site.identity;
  const maintenance =
    bonds.includes(maintenanceIdentity) &&
    gateway.pairing === "numeric-comparison" &&
    dfu.encryption === "required" &&
    ["any", "maintenance"].includes(dfu.role);
  const sensor =
    bonds.includes(site.sensor) &&
    telemetry.notifications === "enabled" &&
    telemetry.encryption === "required" &&
    telemetry.role === "sensor";
  const trace = [
    `Gateway LE-SC=${gateway.secureConnections}; pairing=${gateway.pairing}`,
    `GATT DFU: encryption=${dfu.encryption}; authentication=${dfu.authentication}; role=${dfu.role}; signature=${dfu.signature}`,
  ];
  let passed = false;
  if (name === "maintenance") {
    passed = maintenance;
    trace.push(
      `Bond ${maintenanceIdentity}: ${bonds.includes(maintenanceIdentity) ? "known" : "missing"}`,
      `Numeric Comparison / signed firmware: ${passed ? "write accepted, firmware verified" : "maintenance failed"}`,
    );
  } else if (name === "rotating-identity") {
    passed = maintenance && sensor && gateway.identityResolution === "enabled";
    trace.push(
      `RPA rotation window1→window2: ${gateway.identityResolution === "enabled" ? "resolving list matched bond" : "unknown identity"}`,
      `Maintenance and sensor continuity: ${passed ? "preserved" : "lost"}`,
    );
  } else if (name === "telemetry") {
    passed = sensor;
    trace.push(
      `Bond ${site.sensor}: ${bonds.includes(site.sensor) ? "known" : "missing"}`,
      `ATT notification: ${passed ? "delivered over encrypted link" : "delivery failed"}`,
    );
  } else if (name === "unbonded-write") {
    passed = maintenance && sensor && gateway.allowUnbonded === "disabled";
    trace.push(
      `Unprovisioned central: ${gateway.allowUnbonded === "disabled" ? "connection rejected" : "connection admitted"}`,
    );
  } else if (name === "justworks-write") {
    passed =
      maintenance &&
      gateway.secureConnections === "required" &&
      dfu.authentication === "required";
    trace.push(
      `Legacy/JustWorks DFU session: ${passed ? "insufficient authentication, rejected" : "security downgrade not reliably rejected"}`,
    );
  } else if (name === "sensor-dfu") {
    passed = sensor && maintenance && dfu.role === "maintenance";
    trace.push(
      `Authenticated sensor attempts DFU characteristic: ${dfu.role === "maintenance" ? "authorization denied" : "write granted outside maintenance role"}`,
    );
  } else if (name === "unsigned-image") {
    passed = maintenance && dfu.signature === "required";
    trace.push(
      `Authenticated maintenance, invalid application signature: ${dfu.signature === "required" ? "image rejected" : "image accepted"}`,
    );
  } else if (name === "retired-maintenance" && context.transfer) {
    passed =
      maintenance &&
      sensor &&
      gateway.allowUnbonded === "disabled" &&
      bonds.every((identity) =>
        [site.transferIdentity, site.sensor].includes(identity),
      );
    trace.push(
      `Retired maintenance ${site.identity}: ${bonds.includes(site.identity) ? "bond remains authorized" : "not authorized"}`,
      `Approved bond set: ${passed ? "only current maintenance and sensor" : "replacement or removal incomplete"}`,
    );
  }
  return { passed, protocol: "BLE/ATT", trace };
}

function eap(config: WirelessConfig, name: string): Trial {
  const profile = config.supplicant,
    radius = config.radius;
  const certName: CertificateName =
    name === "foreign-ca"
      ? "foreign"
      : name === "wrong-san"
        ? "wrong-name"
        : name === "expired"
          ? "expired"
          : name === "secondary"
            ? "secondary"
            : "primary";
  const chain =
    profile.validateServer === "enabled"
      ? validateServerCertificate(
          certName,
          profile.trustAnchors.split(","),
          profile.serverNames.split(","),
        )
      : { accepted: true, reason: "server_validation_disabled" };
  let accepted =
    chain.accepted &&
    (profile.leafPin === "none" ||
      profile.leafPin === certificateHash(certName));
  const service =
    profile.method === "eap-tls" &&
    radius.primary === "enabled" &&
    radius.secondary === "enabled";
  if (!service) accepted = false;
  if (
    name === "revoked-client" &&
    profile.revocation === "hard-fail" &&
    radius.crlStatus === "current"
  )
    accepted = false;
  const positive = ["primary", "secondary"].includes(name);
  const passed = service && (positive ? accepted : !accepted);
  return {
    passed,
    protocol: "EAP-TLS",
    trace: [
      `TLS server certificate=${certName}; sha256=${certificateHash(certName)}`,
      `X509 path/SAN/EKU/time: ${chain.reason}`,
      `Leaf pin: ${profile.leafPin === "none" ? "not configured" : profile.leafPin === certificateHash(certName) ? "matched" : "mismatch"}`,
      ...(name === "revoked-client"
        ? [
            `Client serial listed in CRL; cache=${radius.crlStatus}; policy=${profile.revocation}`,
          ]
        : []),
      `EAP result: ${accepted ? "SUCCESS" : "FAILURE"}; expected=${positive ? "SUCCESS" : "FAILURE"}`,
    ],
  };
}

export function runWirelessTrial(
  id: WirelessId,
  config: WirelessConfig,
  name: string,
  seed: string,
  context: { transfer?: boolean } = {},
): Trial {
  if (id === "wireless-08") return roaming(config, name, seed, context);
  if (id === "wireless-09") return bluetooth(config, name, seed, context);
  return eap(config, name);
}
