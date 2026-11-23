export type WirelessId = "wireless-08" | "wireless-09" | "wireless-10";
export type WirelessConfig = Record<string, Record<string, string>>;
export type WirelessPacket = {
  number: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  details: Record<string, string>;
};
export type WirelessCheck = {
  name: string;
  passed: boolean;
  revision: number;
};
export type WirelessState = {
  version: 2;
  running: WirelessConfig;
  candidate: WirelessConfig;
  generation: number;
  checks: WirelessCheck[];
  verified: number | null;
  packets: WirelessPacket[];
  journal: string[];
  learning?: {
    version: 1;
    stage: "diagnosis" | "transfer";
    variant: number;
    accepted: boolean;
    attempts: number;
    feedback: string;
    records: {
      stage: string;
      cause: string;
      prediction: string;
      evidence: { number: number; info: string }[];
    }[];
  };
};
export type WirelessAssessment = {
  stage: "diagnosis" | "transfer";
  brief: string;
  question: string;
  accepted: boolean;
  feedback: string;
  causes: { id: string; label: string }[];
  predictions: { id: string; label: string }[];
  evidence: { number: number; summary: string }[];
  response?: {
    cause: string;
    prediction: string;
    evidence: { number: number; info: string }[];
  };
};
export type WirelessView = {
  id: WirelessId;
  revision: number;
  generation: number;
  dirty: boolean;
  ticket: string;
  devices: string[];
  tests: string[];
  checks: WirelessCheck[];
  journal: string[];
  assessment?: WirelessAssessment;
};
export type WirelessReply = { view: WirelessView; output: string };
