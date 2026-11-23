export type DomainEvent = {
  sequence: number;
  id: number;
  actor: string;
  action: string;
  target: string;
};
export type DomainView = {
  connected: boolean;
  domain: string;
  controller: { name: string; ip: string };
  target: { name: string; ip: string; os: string };
  groups: Record<string, string[]>;
  computers: string[];
  delegates: string[];
  policy: { version: number; applied: number };
  events: DomainEvent[];
  evidence: { name: string; kind: string }[];
  proofs: string[];
  solved: string[];
  score: number;
};
export type DomainReply = {
  output: string;
  view: DomainView;
  awardedPoints?: number;
};
