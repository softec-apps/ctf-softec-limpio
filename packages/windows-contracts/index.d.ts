export type WindowsLabEvent = {
  sequence: number;
  id: number;
  actor: string;
  action: string;
  target: string;
};
export type WindowsHostView = {
  id: string;
  name: string;
  ip: string;
  title: string;
  description: string;
  points: number;
  enabled: boolean;
};
export type WindowsLabView = {
  connected: boolean;
  hosts: WindowsHostView[];
  host: string | null;
  principal: string;
  prompt: string;
  cwd: string;
  proofs: string[];
  events: WindowsLabEvent[];
  entry: { user: string; password: string };
  solved?: string[];
  score?: number;
  password?: boolean;
};
export type WindowsLabReply = {
  output: string;
  view: WindowsLabView;
  awardedPoints?: number;
};
