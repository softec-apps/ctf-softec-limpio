export type OtView = {
  revision: number;
  controller: string;
  role: "observer" | "operator";
  fanRpm: number;
  fanRunning: boolean;
  lightOn: boolean;
  beacon: "blue" | "red" | "green";
  temperatureC: number;
  alarmThresholdC: number;
  alarmActive: boolean;
  firmware: string;
  securityVersion: number;
  legacyDiagnostic: boolean;
  programDigest: string;
  history: { sequence: number; event: string }[];
};
export type OtReply = { output: string; view: OtView };
