import type { OtView } from "../ot-contracts";
import type { WindowsLabView } from "../windows-contracts";
export type LinuxServer = {
  id: string;
  index: number;
  name: string;
  ip: string | null;
  user: string | null;
  title: string;
  description: string;
  points: number;
  status: "locked" | "available" | "solved" | "disabled";
};
export type LinuxNetworkView = {
  connected: boolean;
  address: string | null;
  route: string | null;
  host: string | null;
  cwd: string;
  prompt: string;
  password: boolean;
  entry: { host: string; ip: string; hint: string } | null;
  servers: LinuxServer[];
  score: number;
};
export type LinuxReply = {
  output: string;
  clear?: boolean;
  view: LinuxNetworkView;
  awardedPoints?: number;
};

export type WorkstationReply = {
  windows?: WindowsLabView;
  ot?: OtView;
  printed?: boolean;
  output: string;
  cwd: string;
  clear?: boolean;
  awardedPoints?: number;
  network: LinuxNetworkView;
};
