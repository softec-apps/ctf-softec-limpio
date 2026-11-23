import { SPECIALIST_STATIONS } from "../../../packages/specialist-contracts";
import {
  RACK_POSITION,
  BOOKSHELF_POSITION,
  OT_POSITION,
  PRINTER_POSITION,
  ARCHIVE_POSITION,
  DESK_Z,
} from "./sceneLayout";
// Eye level matched to the room's enlarged furniture and 2.73-unit door.
export const WALK_EYE_HEIGHT = 2.3;
export const WALK_START = { x: 3.85, z: 4.5, yaw: 0.4, pitch: -0.04 };
export const WALK_FIELD_OF_VIEW = 70;
export type PlayerPosition = { x: number; z: number };
const obstructions = [
  ...SPECIALIST_STATIONS.filter((station) =>
    ["api-kiosk", "quarantine"].includes(station.id),
  ).map((station) => ({
    minX: station.position[0] - 0.63,
    maxX: station.position[0] + 0.63,
    minZ: station.position[2] - (station.id === "api-kiosk" ? 0.6 : 0.45),
    maxZ: station.position[2] + (station.id === "api-kiosk" ? 0.6 : 0.45),
  })),
  {
    minX: OT_POSITION[0] - 0.45,
    maxX: OT_POSITION[0] + 0.35,
    minZ: OT_POSITION[2] - 0.65,
    maxZ: OT_POSITION[2] + 1.4,
  },
  {
    minX: PRINTER_POSITION[0] - 0.65,
    maxX: PRINTER_POSITION[0] + 0.65,
    minZ: PRINTER_POSITION[2] - 0.6,
    maxZ: PRINTER_POSITION[2] + 0.6,
  },
  { minX: -3.25, maxX: 3.25, minZ: DESK_Z - 1.45, maxZ: DESK_Z + 1.48 },
  {
    minX: ARCHIVE_POSITION[0] - 1.45,
    maxX: ARCHIVE_POSITION[0] + 0.55,
    minZ: ARCHIVE_POSITION[2] - 0.65,
    maxZ: ARCHIVE_POSITION[2] + 0.65,
  },
  {
    minX: RACK_POSITION[0] - 0.7,
    maxX: RACK_POSITION[0] + 0.8,
    minZ: RACK_POSITION[2] - 0.85,
    maxZ: RACK_POSITION[2] + 0.85,
  },
  {
    minX: BOOKSHELF_POSITION[0] - 0.82,
    maxX: BOOKSHELF_POSITION[0] + 0.82,
    minZ: BOOKSHELF_POSITION[2] - 1.1,
    maxZ: BOOKSHELF_POSITION[2] + 1.1,
  },
];
export function walkable(x: number, z: number, doorOpen: boolean) {
  const inRoom = x >= -5.67 && x <= 6.67 && z >= -4.05 && z <= 5.68;
  const inPassage = doorOpen && x >= 3.25 && x <= 4.35 && z >= 5.4 && z <= 8.05;
  if (!inRoom && !inPassage) return false;
  return !obstructions.some(
    (b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ,
  );
}
export function movePlayer(
  position: PlayerPosition,
  yaw: number,
  forward: number,
  strafe: number,
  seconds: number,
  doorOpen: boolean,
) {
  const length = Math.hypot(forward, strafe) || 1;
  const speed = 2.35 * Math.min(0.05, Math.max(0, seconds));
  const dx =
    ((-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) / length) * speed;
  const dz =
    ((-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) / length) * speed;
  const result = { ...position };
  if (walkable(result.x + dx, result.z, doorOpen)) result.x += dx;
  if (walkable(result.x, result.z + dz, doorOpen)) result.z += dz;
  return result;
}
