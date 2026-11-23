export const RACK_YAW = Math.PI / 2;
export const RACK_POSITION: [number, number, number] = [-5.35, 0, -2.8];
export const BOOKSHELF_YAW = Math.PI / 2;
export const BOOKSHELF_POSITION: [number, number, number] = [-5.55, 0, -0.15];
export const DESK_Z = -3;
export const NOTEBOOK_POSITION: [number, number, number] = [
  -1.7,
  1.18,
  DESK_Z + 0.3,
];
export const LAPTOP_POSITION: [number, number, number] = [
  2,
  1.185,
  DESK_Z - 0.26,
];
export const PHONE_POSITION: [number, number, number] = [
  2.65,
  1.19,
  DESK_Z + 0.65,
];
export const PRINTER_POSITION: [number, number, number] = [6.35, 0, 0];
export const PRINTER_YAW = -Math.PI / 2;
export const OT_POSITION: [number, number, number] = [6.65, 0, -2.7];
export const ARCHIVE_POSITION: [number, number, number] = [6.3, 0.72, 3.3];
export const ARCHIVE_YAW = -Math.PI / 2;
export const NOTICEBOARD_POSITION: [number, number, number] = [6.84, 3.1, 3.3];
export const NOTICEBOARD_YAW = -Math.PI / 2;
export const OSINT_BOARD_POSITION: [number, number, number] = [6.84, 3.2, 0];
export const OSINT_BOARD_YAW = -Math.PI / 2;
export const TELEVISION_POSITION: [number, number, number] = [-2.1, 2.85, 5.8];
export const TELEVISION_YAW = Math.PI;
export const TELEVISION_WIDTH = 5.6;
export const TELEVISION_HEIGHT = (TELEVISION_WIDTH * 9) / 16;
export function boardNotePosition(index: number): [number, number, number] {
  const localX = -0.7 + (index % 3) * 0.7;
  return [
    NOTICEBOARD_POSITION[0] +
      localX * Math.cos(NOTICEBOARD_YAW) +
      0.06 * Math.sin(NOTICEBOARD_YAW),
    NOTICEBOARD_POSITION[1] + 0.36 - Math.floor(index / 3) * 0.68,
    NOTICEBOARD_POSITION[2] -
      localX * Math.sin(NOTICEBOARD_YAW) +
      0.06 * Math.cos(NOTICEBOARD_YAW),
  ];
}
