import type {
  WirelessAssessment,
  WirelessId,
  WirelessPacket,
  WirelessState,
} from "../../../../packages/wireless-contracts";
import { siteFor, testNames } from "./scenarios";

export const hasWirelessAssessment = (id: WirelessId) =>
  id === "wireless-08" || id === "wireless-09";

export function initialWirelessLearning(
  seed: string,
): NonNullable<WirelessState["learning"]> {
  return {
    version: 1,
    stage: "diagnosis",
    variant: parseInt(siteFor(seed).tag.slice(-2), 16) % 2,
    accepted: false,
    attempts: 0,
    feedback: "",
    records: [],
  };
}

export function wirelessTests(id: WirelessId, state: WirelessState) {
  return [
    ...testNames(id),
    ...(id === "wireless-09" && state.learning?.stage === "transfer"
      ? ["retired-maintenance"]
      : []),
  ];
}

export function transferBrief(id: WirelessId, seed: string) {
  const site = siteFor(seed);
  return id === "wireless-08"
    ? `SEGUNDA INCIDENCIA / CH-${site.tag}-B\nLa infraestructura DHCP se ha migrado: el relay autorizado pasa a ${site.transferRelay}. Tras una intervención en el pasillo este, inventario vuelve a fallar. Conserva las VLAN aprobadas, la seguridad y el servicio de invitados. La receta anterior ya no cubre este cambio. Diagnostica las nuevas trazas antes de aplicar otra corrección.`
    : `SEGUNDA INCIDENCIA / CH-${site.tag}-B\nLa tableta ${site.identity} se ha retirado. Su sustituta autorizada es ${site.transferIdentity}; el sensor ${site.sensor} continúa en servicio. El traspaso de configuración no ha terminado correctamente. Recupera mantenimiento y continuidad de identidad; el equipo retirado debe perder la autorización y el sensor conservar su bond. Diagnostica las nuevas trazas antes de aplicar cambios.`;
}

function assessmentDefinition(id: WirelessId, state: WirelessState) {
  const transfer = state.learning?.stage === "transfer",
    variant = state.learning?.variant ?? 0;
  if (id === "wireless-08" && !transfer)
    return {
      question:
        "Si corriges únicamente el transporte de la VLAN de clientes en ap-west, ¿qué esperas de roam-west y renew-west?",
      causes: [
        {
          id: "forwarding",
          label:
            "La autenticación termina; fallan el transporte de clientes y la renovación DHCP.",
        },
        {
          id: "credentials",
          label: "RADIUS rechaza las credenciales de los lectores.",
        },
        { id: "radio", label: "El AP no completa la asociación de radio." },
        {
          id: "application",
          label: "El servidor de inventario está caído para ambos pasillos.",
        },
      ],
      predictions: [
        {
          id: "roam-only",
          label: "Roam-west puede recuperarse; renew-west seguirá fallando.",
        },
        { id: "both", label: "Se recuperarán ambas pruebas sin otro cambio." },
        {
          id: "neither",
          label: "Ninguna puede recuperarse hasta cambiar las credenciales.",
        },
      ],
      cause: "forwarding",
      prediction: "roam-only",
      evidence: [
        (packet: WirelessPacket) =>
          packet.details.test === "roam-west" &&
          packet.info.includes("EAP=success") &&
          packet.info.includes("discarded"),
        (packet: WirelessPacket) =>
          packet.details.test === "renew-west" &&
          packet.info.includes("no usable offer"),
      ],
    };
  if (id === "wireless-08")
    return {
      question:
        "Si actualizas únicamente el destino del relay al nuevo servidor, ¿qué resultado esperas?",
      causes: [
        {
          id: "east-uplink",
          label:
            "El uplink de ap-east pierde la VLAN de clientes y el relay conserva el destino anterior.",
        },
        {
          id: "inventory-policy",
          label:
            "La política hacia inventario bloquea el servicio y el relay conserva el destino anterior.",
        },
        { id: "credentials", label: "Las credenciales EAP han caducado." },
        {
          id: "guest",
          label: "Es necesario permitir que invitados accedan a los lectores.",
        },
      ],
      predictions: [
        {
          id: "renew-only",
          label:
            "Puede recuperarse renew-west; persistirá el fallo de inventario.",
        },
        {
          id: "both",
          label: "También quedarán resueltos los fallos de inventario.",
        },
        {
          id: "radio",
          label:
            "Se deshabilitará automáticamente la autenticación inalámbrica.",
        },
      ],
      cause: variant === 0 ? "east-uplink" : "inventory-policy",
      prediction: "renew-only",
      evidence: [
        (packet: WirelessPacket) =>
          packet.details.test === "east-session" &&
          packet.info.includes(
            variant === 0 ? "discarded" : "TCP inventory: timeout",
          ),
        (packet: WirelessPacket) =>
          packet.details.test === "renew-west" &&
          packet.info.includes("no usable offer"),
      ],
    };
  if (!transfer)
    return {
      question:
        "Si exiges autenticación GATT, pero mantienes opcional la firma del firmware, ¿qué ocurrirá con una imagen sin firma enviada por mantenimiento autenticado?",
      causes: [
        {
          id: "authorization",
          label:
            "Faltan controles separados de admisión, autenticación y autorización de firmware.",
        },
        {
          id: "radio",
          label: "La señal BLE se pierde antes de establecer la conexión.",
        },
        {
          id: "signature",
          label: "La firma obligatoria rechaza todas las imágenes legítimas.",
        },
        {
          id: "sensor",
          label: "La telemetría del sensor necesita permisos de escritura DFU.",
        },
      ],
      predictions: [
        {
          id: "accepted-image",
          label:
            "La imagen aún puede aceptarse: la autenticación del enlace no verifica su firma.",
        },
        {
          id: "rejected-image",
          label:
            "Se rechazará automáticamente por estar autenticado el enlace.",
        },
        {
          id: "telemetry",
          label: "Dejará de funcionar toda notificación del sensor.",
        },
      ],
      cause: "authorization",
      prediction: "accepted-image",
      evidence: [
        (packet: WirelessPacket) =>
          packet.details.test === "unbonded-write" &&
          packet.info.includes("connection admitted"),
        (packet: WirelessPacket) =>
          packet.details.test === "unsigned-image" &&
          packet.info.includes("image accepted"),
      ],
    };
  return {
    question:
      "Si añades la tableta nueva a los bonds pero conservas el bond de la retirada, ¿qué control seguirá sin satisfacerse?",
    causes: [
      {
        id: "replacement-role",
        label:
          "Falta la identidad sustituta y DFU quedó asignado al rol sensor.",
      },
      {
        id: "replacement-resolution",
        label:
          "Falta la identidad sustituta y se desactivó la resolución de identidad privada.",
      },
      {
        id: "signature",
        label: "El único problema es una imagen de firmware sin firma.",
      },
      {
        id: "telemetry",
        label: "Es necesario borrar también el bond del sensor de producción.",
      },
    ],
    predictions: [
      {
        id: "retired-authorized",
        label:
          "La tableta retirada seguirá autorizada; debe fallar retired-maintenance.",
      },
      {
        id: "automatically-retired",
        label: "Añadir un bond revoca automáticamente el anterior.",
      },
      {
        id: "signature-disabled",
        label:
          "La firma del firmware quedará desactivada al cambiar los bonds.",
      },
    ],
    cause: variant === 0 ? "replacement-role" : "replacement-resolution",
    prediction: "retired-authorized",
    evidence: [
      (packet: WirelessPacket) =>
        packet.details.test === "maintenance" &&
        packet.info.includes("Bond ") &&
        packet.info.includes("missing"),
      (packet: WirelessPacket) =>
        variant === 0
          ? packet.details.test === "maintenance" &&
            packet.info.includes("role=sensor")
          : packet.details.test === "rotating-identity" &&
            packet.info.includes("unknown identity"),
    ],
  };
}

export function wirelessAssessment(
  id: WirelessId,
  state: WirelessState,
  seed: string,
): WirelessAssessment | undefined {
  if (!hasWirelessAssessment(id) || !state.learning) return undefined;
  const definition = assessmentDefinition(id, state);
  const recorded = state.learning.records.find(
    (record) => record.stage === state.learning!.stage,
  );
  const rotate = <T>(items: T[]) => {
    const offset = parseInt(siteFor(seed).tag.slice(0, 2), 16) % items.length;
    return [...items.slice(offset), ...items.slice(0, offset)];
  };
  return {
    stage: state.learning.stage,
    brief:
      state.learning.stage === "transfer"
        ? transferBrief(id, seed)
        : "Antes de aplicar el cambio, registra el diagnóstico, predice un efecto concreto y cita dos observaciones distintas de la captura. La primera reparación abre una segunda incidencia; el comprobante se entrega al completar ambas.",
    question: definition.question,
    accepted: state.learning.accepted,
    feedback: state.learning.feedback,
    causes: rotate(definition.causes),
    predictions: rotate(definition.predictions),
    evidence: state.packets.map((packet) => ({
      number: packet.number,
      summary: `#${packet.number} [${packet.details.test}] ${packet.info}`,
    })),
    ...(recorded
      ? {
          response: {
            cause: definition.causes.find(
              (cause) => cause.id === recorded.cause,
            )!.label,
            prediction: definition.predictions.find(
              (prediction) => prediction.id === recorded.prediction,
            )!.label,
            evidence: recorded.evidence,
          },
        }
      : {}),
  };
}

export function assessWireless(
  id: WirelessId,
  state: WirelessState,
  cause: string,
  prediction: string,
  references: string,
) {
  const learning = state.learning;
  if (!learning || !hasWirelessAssessment(id))
    throw new Error("Este expediente no incluye una evaluación previa.");
  if (learning.accepted)
    return "El diagnóstico de esta fase ya está registrado.";
  const numbers = references.split(",").map(Number);
  const selected = numbers.map((number) =>
    state.packets.find((packet) => packet.number === number),
  );
  const definition = assessmentDefinition(id, state);
  const correct =
    numbers.length === 2 &&
    new Set(numbers).size === 2 &&
    selected.every(
      (packet) =>
        packet && packet.details.configRevision === String(state.generation),
    ) &&
    cause === definition.cause &&
    prediction === definition.prediction &&
    definition.evidence.every((matches) =>
      selected.some((packet) => packet && matches(packet)),
    );
  learning.attempts = Math.min(100000, learning.attempts + 1);
  learning.accepted = Boolean(correct);
  learning.feedback = correct
    ? "Diagnóstico, predicción y evidencias registrados. Puedes aplicar el cambio preparado."
    : "La combinación de diagnóstico, predicción y evidencias no coincide con lo observado. Revisa las trazas de esta fase.";
  if (correct)
    learning.records.push({
      stage: learning.stage,
      cause,
      prediction,
      evidence: selected.map((packet) => ({
        number: packet!.number,
        info: packet!.info,
      })),
    });
  return learning.feedback;
}

export function startWirelessTransfer(
  id: WirelessId,
  state: WirelessState,
  seed: string,
) {
  if (!state.learning || state.learning.stage !== "diagnosis")
    throw new Error("No se puede iniciar otra segunda incidencia.");
  const site = siteFor(seed);
  state.learning.stage = "transfer";
  state.learning.accepted = false;
  state.learning.feedback = "";
  if (id === "wireless-08") {
    if (state.learning.variant === 0)
      state.running["ap-east"].allowedVlans = site.guest;
    else state.running.gateway.staffToInventory = "deny";
  } else {
    if (state.learning.variant === 0) state.running.dfu.role = "sensor";
    else state.running.gateway.identityResolution = "disabled";
  }
  state.candidate = structuredClone(state.running);
  state.generation++;
  state.checks = [];
  state.verified = null;
  state.packets = [];
  return transferBrief(id, seed);
}
