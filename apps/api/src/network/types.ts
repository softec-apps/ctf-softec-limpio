export type Packet = {
  number: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  sourcePort?: number;
  destinationPort?: number;
  stream?: number;
  details: Record<string, string>;
  payload?: string;
};
export type NetworkCase = {
  id: string;
  title: string;
  points: number;
  question: string;
  answer: string;
  notes: string;
  packets: Packet[];
};
