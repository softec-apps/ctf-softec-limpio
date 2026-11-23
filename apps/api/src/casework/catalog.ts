import { DEVOPS_CASES } from "../devops/catalog";
import { WIRELESS_CASES } from "../wireless/catalog";
import { MEMORY_CASES } from "../memory-analysis/catalog";
import type { EvidenceCase } from "./types";
import { SPECIALIST_STATIONS } from "../../../../packages/specialist-contracts";
import { MALWARE_CASES } from "../malware-analysis/catalog";
import { INCIDENT_CASES } from "../incident-response/catalog";
import { ACCESS_CASES } from "../physical-access/catalog";
import { pointsFor } from "../scoring/policy";
import { isWirelessOperational } from "../wireless/scenarios";
import { flagValue } from "../security";
const sources: Record<string, EvidenceCase[]> = {
  quarantine: MALWARE_CASES,
  soc: INCIDENT_CASES,
  "badge-reader": ACCESS_CASES,
  "devops-node": DEVOPS_CASES,
  "wireless-ap": WIRELESS_CASES,
  "memory-unit": MEMORY_CASES,
};
export const ANALYSIS_COLLECTIONS = SPECIALIST_STATIONS.filter(
  (station) => sources[station.id],
).map((station) => ({
  station,
  cases: sources[station.id].map((entry, index) => ({
    ...entry,
    id: station.prefix + String(index + 1).padStart(2, "0"),
  })),
}));
export const ANALYSIS_CASES = ANALYSIS_COLLECTIONS.flatMap((collection) =>
  collection.cases.map((entry) => ({ ...entry, station: collection.station })),
);
export const ANALYSIS_CHALLENGES = ANALYSIS_CASES.map((entry) => ({
  id: entry.id,
  title: entry.title,
  description: `${entry.question.replace(/CTF\{([^}]+)\}/g, "una flag con $1")} Evidencias: ${entry.station.root}/caso-${entry.id.slice(-2)}. Expediente independiente.`,
  category: entry.station.category,
  device: "computer",
  points: pointsFor(entry.id),
}));
export const getAnalysisCase = (id: string) =>
  ANALYSIS_CASES.find((entry) => entry.id === id);
export function analysisFlag(id: string) {
  if (isWirelessOperational(id)) return flagValue(`wireless-reserved:v2:${id}`);
  const entry = getAnalysisCase(id);
  if (!entry) throw new Error("Expediente desconocido.");
  return `CTF{${entry.answer}}`;
}
export function analysisFiles(id: string) {
  const entry = getAnalysisCase(id);
  if (!entry) return undefined;
  return {
    "/home/analista/LEEME.txt": entry.question,
    ...Object.fromEntries(
      Object.entries(entry.files).map(([name, body]) => [
        "/home/analista/evidencia/" + name,
        body,
      ]),
    ),
  };
}
