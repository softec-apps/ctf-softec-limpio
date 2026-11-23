export type RotorName = "I" | "II" | "III" | "IV" | "V";
export type EnigmaSettings = {
  rotors: [RotorName, RotorName, RotorName];
  rings: [number, number, number];
  positions: string;
  reflector: "B" | "C";
  plugboard: string;
};
export const ROTOR_NAMES: readonly RotorName[];
export function parsePlugboard(source?: string): number[];
export function runEnigma(
  text: string,
  settings: EnigmaSettings,
): { text: string; positions: string };
