import type {
  WirelessId,
  WirelessReply,
  WirelessView,
} from "../packages/wireless-contracts";

export function wirelessRepairs(id: WirelessId, ticket: string) {
  if (id === "wireless-08") {
    const [, staff, guest] = ticket.match(
      /usan VLAN (\d+); invitados VLAN (\d+)/,
    )!;
    const relay = ticket
      .match(/relay aprobado es ([\d.]+)/)![1]
      .replace(/\.$/, "");
    return [
      `configure ap-west allowedVlans ${staff},${guest}`,
      `configure gateway dhcpRelay ${relay}`,
      "configure gateway guestToStaff deny",
      "configure gateway clientIsolation enabled",
    ];
  }
  if (id === "wireless-09")
    return [
      "configure gateway secureConnections required",
      "configure gateway pairing numeric-comparison",
      "configure gateway identityResolution enabled",
      "configure gateway allowUnbonded disabled",
      "configure dfu authentication required",
      "configure dfu role maintenance",
      "configure dfu signature required",
    ];
  return [
    "configure supplicant validateServer enabled",
    "configure supplicant serverNames radius-a.campus.example,radius-b.campus.example",
    "configure supplicant leafPin none",
    "configure supplicant revocation hard-fail",
    "configure radius crlStatus current",
  ];
}

export function wirelessAssessmentCommand(id: WirelessId, view: WirelessView) {
  const assessment = view.assessment;
  if (!assessment) throw new Error("Falta la evaluación del laboratorio.");
  const find = (test: string, text: string) => {
    const entry = assessment.evidence.find(
      (packet) =>
        packet.summary.includes(`[${test}]`) && packet.summary.includes(text),
    );
    if (!entry) throw new Error(`No existe la evidencia ${test}/${text}`);
    return entry.number;
  };
  if (id === "wireless-08" && assessment.stage === "diagnosis")
    return `assess forwarding roam-only ${find("roam-west", "discarded")},${find("renew-west", "no usable offer")}`;
  if (id === "wireless-08") {
    const uplink = assessment.evidence.some(
      (packet) =>
        packet.summary.includes("[east-session]") &&
        packet.summary.includes("discarded"),
    );
    return `assess ${uplink ? "east-uplink" : "inventory-policy"} renew-only ${find("east-session", uplink ? "discarded" : "TCP inventory: timeout")},${find("renew-west", "no usable offer")}`;
  }
  if (assessment.stage === "diagnosis")
    return `assess authorization accepted-image ${find("unbonded-write", "connection admitted")},${find("unsigned-image", "image accepted")}`;
  const role = assessment.evidence.some(
    (packet) =>
      packet.summary.includes("[maintenance]") &&
      packet.summary.includes("role=sensor"),
  );
  return `assess ${role ? "replacement-role" : "replacement-resolution"} retired-authorized ${find("maintenance", "missing")},${role ? find("maintenance", "role=sensor") : find("rotating-identity", "unknown identity")}`;
}

export function wirelessTransferRepairs(id: WirelessId, view: WirelessView) {
  const brief = view.assessment!.brief;
  if (id === "wireless-08") {
    const [, staff, guest] = view.ticket.match(
      /usan VLAN (\d+); invitados VLAN (\d+)/,
    )!;
    const relay = brief.match(/pasa a ([\d.]+)/)![1].replace(/\.$/, "");
    return [
      `configure ap-east allowedVlans ${staff},${guest}`,
      "configure gateway staffToInventory allow",
      `configure gateway dhcpRelay ${relay}`,
    ];
  }
  const identity = brief.match(/sustituta autorizada es ([a-z0-9-]+)/)![1];
  const sensor = brief.match(/sensor (sensor-[a-z0-9]+) continúa/)![1];
  return [
    `configure gateway bonds ${identity},${sensor}`,
    "configure dfu role maintenance",
    "configure gateway identityResolution enabled",
  ];
}

export async function completeWirelessFixture(
  id: WirelessId,
  call: (
    path: string,
    body?: unknown,
  ) => Promise<{ status: number; data: unknown }>,
) {
  let view = (await call(`/wireless/labs/${id}`)).data as WirelessView;
  let output = "";
  async function run(command: string) {
    const result = await call(`/wireless/labs/${id}/commands`, {
      command,
      revision: view.revision,
    });
    if (result.status !== 201)
      throw new Error(`Falló ${command}: ${JSON.stringify(result.data)}`);
    const reply = result.data as WirelessReply;
    view = reply.view;
    output = reply.output;
  }
  for (let phase = 0; phase < 2; phase++) {
    if (view.assessment && !view.assessment.accepted)
      await run(wirelessAssessmentCommand(id, view));
    const repairs =
      view.assessment?.stage === "transfer"
        ? wirelessTransferRepairs(id, view)
        : wirelessRepairs(id, view.ticket);
    for (const command of [...repairs, "commit", "test all", "verify"])
      await run(command);
    if (output.includes("CTF{")) break;
  }
  const flag = output.match(/CTF\{[a-f0-9]{32}\}/)?.[0];
  if (!flag) throw new Error("No se acreditó el cambio inalámbrico: " + output);
  return flag;
}
