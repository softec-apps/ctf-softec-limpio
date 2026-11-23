export type MemoryRow = Record<string, unknown>;
export type MemorySnapshot = {
  format: "seventech-memory-v1";
  acquiredAt?: string;
  processes: MemoryRow[];
  scan: MemoryRow[];
  connections: MemoryRow[];
  regions: MemoryRow[];
  handles: MemoryRow[];
  tokens: MemoryRow[];
  patches: MemoryRow[];
  [key: string]: unknown;
};
export const MEMORY_OPERATIONS: readonly string[];
export function parseMemorySnapshot(text: string): MemorySnapshot;
export function memoryRows(
  snapshot: MemorySnapshot,
  operation: string,
): MemoryRow[];
