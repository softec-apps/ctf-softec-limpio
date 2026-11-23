import { DESK_Z } from "./sceneLayout";
export const SCREEN_W = 3.04;
export const SCREEN_H = 1.71;
export const SCREEN_Y = 2.06;
export const SCREEN_Z = DESK_Z - 0.66;
export function screenFieldOfView(
  aspect: number,
  distance: number,
  width: number,
) {
  return Math.min(
    115,
    Math.max(
      45,
      (2 *
        Math.atan(width / (2 * distance * Math.max(0.1, aspect) * 0.85)) *
        180) /
        Math.PI,
    ),
  );
}
export function computerDistance(aspect: number) {
  return Math.max(
    SCREEN_H / (2 * Math.tan(Math.PI / 8) * 0.82),
    SCREEN_W / (2 * Math.tan(Math.PI / 8) * aspect * 0.9),
  );
}
import { TELEVISION_WIDTH } from "./sceneLayout";

export function televisionFieldOfView(aspect: number, distance: number) {
  return screenFieldOfView(aspect, distance, TELEVISION_WIDTH);
}
