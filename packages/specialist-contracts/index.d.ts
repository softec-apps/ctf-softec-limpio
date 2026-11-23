export type SpecialistId =
  | "api-kiosk"
  | "quarantine"
  | "soc"
  | "badge-reader"
  | "cloud-tablet"
  | "devops-node"
  | "ai-assistant"
  | "wireless-ap"
  | "memory-unit"
  | "database-nas"
  | "contract-wallet";
export type SpecialistStation = {
  id: SpecialistId;
  prefix: string;
  serviceHost?: string;
  category: string;
  title: string;
  root: string;
  description: string;
  position: [number, number, number];
  yaw: number;
  eye: [number, number, number];
  look: [number, number, number];
};
export const SPECIALIST_STATIONS: readonly SpecialistStation[];
export function stationForChallenge(id: string): SpecialistStation | undefined;

export function stationServiceHome(id: string): string | undefined;
export function stationEvidenceRoot(id: string): string | undefined;
