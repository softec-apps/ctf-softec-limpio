import { readReverseBytes } from "./reversing/artifacts";
import { REVERSE_ROOT } from "./reversing/catalog";
import { readStegoBytes } from "./stego/artifacts";
export function readWorkstationBytes(enabled: string[], path: string) {
  return path.startsWith(REVERSE_ROOT + "/")
    ? readReverseBytes(enabled, path)
    : readStegoBytes(enabled, path);
}
