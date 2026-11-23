import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NotFoundException } from "@nestjs/common";
import { mobileFolder } from "./catalog";
export const MOBILE_MEDIA = [
  {
    id: "puerta-original",
    challengeId: "mobile-02",
    name: "IMG_20260212_074500.jpg",
    title: "Puerta de acceso",
    type: "image/jpeg",
    captured: "2026-02-12T07:45:00Z",
  },
  {
    id: "puerta-copia",
    challengeId: "mobile-02",
    name: "IMG_20260213_063000.jpg",
    title: "Puerta de acceso · copia",
    type: "image/jpeg",
    captured: "2026-02-13T06:30:00Z",
  },
  {
    id: "pasillo",
    challengeId: "mobile-02",
    name: "IMG_20260212_071000.jpg",
    title: "Pasillo",
    type: "image/jpeg",
    captured: "2026-02-12T07:10:00Z",
  },
  {
    id: "qr-recepcion",
    challengeId: "mobile-06",
    name: "invitacion-recepcion.svg",
    title: "Recepción",
    type: "image/svg+xml",
    captured: "2026-02-12T08:32:00Z",
  },
  {
    id: "qr-ascensor",
    challengeId: "mobile-06",
    name: "invitacion-ascensor.svg",
    title: "Ascensor",
    type: "image/svg+xml",
    captured: "2026-02-12T08:33:00Z",
  },
  {
    id: "qr-soporte",
    challengeId: "mobile-06",
    name: "invitacion-soporte.svg",
    title: "Soporte",
    type: "image/svg+xml",
    captured: "2026-02-12T08:34:00Z",
  },
];
export function mobileMediaArtifacts(enabled: string[]) {
  return MOBILE_MEDIA.filter((m) => enabled.includes(m.challengeId)).map(
    (m) => ({
      name: m.name,
      title: m.title,
      app: "gallery",
      content: "",
      path: `${mobileFolder(m.challengeId)}/${m.name}`,
      mediaUrl: `/api/v1/mobile/media/${m.id}`,
      mediaType: m.type,
      captured: m.captured,
    }),
  );
}
export function readMobileMedia(enabled: string[], id: string) {
  const entry = MOBILE_MEDIA.find(
    (m) => m.id === id && enabled.includes(m.challengeId),
  );
  if (!entry) throw new NotFoundException("Imagen no disponible.");
  // Both source and compiled modules resolve the same packaged asset directory.
  return {
    type: entry.type,
    bytes: readFileSync(resolve(__dirname, "../../assets/mobile", entry.name)),
  };
}
