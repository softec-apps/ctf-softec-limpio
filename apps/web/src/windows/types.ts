export type WindowsFile = {
  type: "file";
  path: string;
  name: string;
  content: string;
  format: "text" | "events";
  properties: {
    attributes: string[];
    created: string;
    modified: string;
    bytes: number;
  };
};
export type WindowsDirectory = {
  type: "directory";
  path: string;
  entries: { name: string; type: "file" | "directory"; hidden?: boolean }[];
};
export type FileRequest = { path: string; sequence: number };
export type WindowsEvent = {
  recordId: number;
  time: string;
  eventId: number;
  provider: string;
  channel: string;
  description: string;
  data: Record<string, string>;
};
export const CASE_ROOT = "C:\\Users\\Analista\\Documents\\Expedientes";
