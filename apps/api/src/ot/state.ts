import { createHash } from "node:crypto";
import type { OtView } from "../../../../packages/ot-contracts";
import { OT_CONTROLLER } from "./catalog";

export const programDigest = (source: string) =>
  createHash("sha256").update(source).digest("hex");
export const BASE_PROGRAM =
  "LD ENABLE\nAND NOT MAINTENANCE\nST FAN_RUN\nLD ALARM\nST BEACON";
export type OtState = {
  role: "observer" | "operator";
  fanRpm: number;
  fanRunning: boolean;
  lightOn: boolean;
  beaconManual: boolean;
  temperatureDeciC: number;
  alarmThresholdDeciC: number;
  firmware: string;
  securityVersion: number;
  legacyDiagnostic: boolean;
  legacyKeyHex: string | null;
  program: string;
  history: { sequence: number; event: string }[];
};
export function initialOtState(): OtState {
  return {
    role: "observer",
    fanRpm: 900,
    fanRunning: true,
    lightOn: true,
    beaconManual: false,
    temperatureDeciC: 780,
    alarmThresholdDeciC: 650,
    firmware: "2.4.0",
    securityVersion: 7,
    legacyDiagnostic: false,
    legacyKeyHex: null,
    program: BASE_PROGRAM,
    history: [],
  };
}
export function otView(state: OtState, revision: number): OtView {
  const alarm = state.temperatureDeciC > state.alarmThresholdDeciC;
  return {
    revision,
    controller: OT_CONTROLLER,
    role: state.role,
    fanRpm: state.fanRpm,
    fanRunning: state.fanRunning,
    lightOn: state.lightOn,
    beacon: state.beaconManual ? "blue" : alarm ? "red" : "green",
    temperatureC: state.temperatureDeciC / 10,
    alarmThresholdC: state.alarmThresholdDeciC / 10,
    alarmActive: alarm,
    firmware: state.firmware,
    securityVersion: state.securityVersion,
    legacyDiagnostic: state.legacyDiagnostic,
    programDigest: programDigest(state.program),
    history: state.history,
  };
}
