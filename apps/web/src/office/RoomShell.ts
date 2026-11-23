import { surfaceGrain, loadWoodSurface } from "./SurfaceTextures";
import * as THREE from "three";
import type { SceneResources } from "./SceneResources";
import type { OfficePalette } from "./officePalette";

export function createRoomShell(
  resources: SceneResources,
  palette: OfficePalette,
  options: { maxAnisotropy: number; requestRender: () => void },
) {
  const { box, material } = resources;
  const { concrete } = palette;
  // Continuous walls enclose the perimeter workstations.
  const floor = material("#626768", 0.78, 0);
  floor.bumpMap = surfaceGrain(resources, "floor");
  floor.bumpScale = 0.025;
  box(14, 0.18, 12, 0, -0.1, 0, floor);
  loadWoodSurface(
    resources,
    palette.wood,
    options.maxAnisotropy,
    options.requestRender,
  );
  box(14, 5, 0.18, 0, 2.4, -4.4, concrete);
  box(0.18, 5, 12, -6, 2.4, 0, concrete);
  const tileMaterial = material("#454c4c", 0.88);
  for (let i = -6; i <= 6; i++) {
    box(0.012, 0.003, 11, i, 0.002, 0, tileMaterial);
    box(13, 0.003, 0.012, 0, 0.002, i, tileMaterial);
  }
}
