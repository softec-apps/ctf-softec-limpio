import type { CompetitionStatus } from "../../../packages/competition-contracts";
export type { CompetitionStatus } from "../../../packages/competition-contracts";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await response
    .json()
    .catch(() => ({ message: "No se pudo leer la respuesta del servidor." }));
  if (!response.ok)
    throw new ApiError(
      Array.isArray(body.message)
        ? body.message.join(" ")
        : (body.message ?? "No se pudo completar la operación."),
      response.status,
    );
  return body;
}
export const post = (path: string, body: unknown = {}) =>
  api(path, { method: "POST", body: JSON.stringify(body) });
export type User = { id: string; alias: string; role: "ADMIN" | "PARTICIPANT" };
export type Challenge = {
  categoryGroup?: string;
  difficulty: "easy" | "medium" | "hard";
  id: string;
  title: string;
  description: string;
  category: string;
  device: string;
  points: number;
  enabled: boolean;
};
export type Game = {
  bonusPoints: number;
  competition: CompetitionStatus;
  challenges: Challenge[];
  solves: { challengeId: string; points: number; createdAt: string }[];
  score: number;
};
