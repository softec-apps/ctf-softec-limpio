export type DeviceId = "sw1" | "r1" | "dns1" | "files1" | "pc1";
export type Port = {
  number: number;
  description: string;
  up: boolean;
  vlan: number;
  mode: "access" | "trunk";
  trusted: boolean;
};
export type AclRule = {
  id: number;
  action: "permit" | "deny";
  protocol: "any" | "tcp" | "udp" | "icmp";
  source: string;
  destination: string;
  port: number | null;
};
export type NetworkConfig = {
  sw1: { ports: Port[]; snooping: boolean };
  r1: {
    lan: { ip: string; up: boolean; mtu: number };
    servers: { ip: string; up: boolean; mtu: number };
    acl: AclRule[];
    ntpServer: string;
    clockOffset: number;
  };
  dns1: { running: boolean; records: Record<string, string> };
  files1: {
    http: boolean;
    https: boolean;
    certificateName: string;
    minTls: "1.0" | "1.2" | "1.3";
    ftp: boolean;
    passive: boolean;
  };
};
export type Diagnostic = {
  command: string;
  device: DeviceId;
  ok: boolean;
  output: string;
  time: string;
  configVersion: number;
};
export type LivePacket = {
  number: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  details: Record<string, string>;
  sourcePort?: number;
  destinationPort?: number;
  stream?: number;
  payload?: string;
};
export type LabState = {
  running: NetworkConfig;
  startup: NetworkConfig;
  tests: Diagnostic[];
  journal: {
    time: string;
    device: DeviceId;
    command: string;
    output: string;
    prompt?: string;
  }[];
  capture: LivePacket[];
  configVersion: number;
  reloaded: DeviceId[];
};
export type ConsoleContext = {
  mode: "user" | "privileged" | "config" | "interface";
  port?: number;
  interface?: "lan" | "servers";
};
export type Mission = {
  id: string;
  title: string;
  objective: string;
  acceptance: string[];
};
export type LabSnapshot = {
  id: string;
  revision: number;
  state: LabState;
  mission: Mission | null;
  devices: { id: DeviceId; name: string; role: string; ip: string }[];
};
