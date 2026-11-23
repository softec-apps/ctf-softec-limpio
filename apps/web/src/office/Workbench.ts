import * as THREE from "three";
import type { SceneResources } from "./SceneResources";
import type { OfficePalette } from "./officePalette";
import { DESK_Z } from "../sceneLayout";
import { SCREEN_Y, SCREEN_Z } from "../worldGeometry";

export function createWorkbench(
  resources: SceneResources,
  palette: OfficePalette,
) {
  const { scene, box, label } = resources;
  const desk = new THREE.Group();
  desk.name = "wall-workbench";
  desk.position.z = DESK_Z;
  scene.add(desk);
  const { wood, led, metal, dark, edge } = palette;
  // Workbench, keyboard, mouse and monitor are separately modelled objects.
  box(6, 0.14, 2.45, 0, 1.08, 0, wood, desk);
  box(5.95, 0.04, 0.025, 0, 1.09, 1.24, led, desk);
  for (const x of [-2.7, 2.7]) {
    box(0.12, 1.05, 0.12, x, 0.53, -0.85, metal, desk);
    box(0.12, 1.05, 0.12, x, 0.53, 0.9, metal, desk);
    box(0.12, 0.1, 1.85, x, 0.15, 0, metal, desk);
  }
  box(0.7, 0.05, 0.5, 0, 1.2, -0.65, metal, desk);
  box(0.12, 0.4, 0.1, 0, 1.43, -0.77, edge, desk);
  const monitor = new THREE.Group();
  monitor.position.set(0, SCREEN_Y, SCREEN_Z - 0.05);
  scene.add(monitor);
  box(3.2, 1.87, 0.14, 0, 0, -0.04, metal, monitor);
  box(3.07, 1.73, 0.025, 0, 0, 0.04, dark, monitor);
  box(0.08, 0.012, 0.015, 1.42, -0.88, 0.045, led, monitor);
  monitor.userData.device = "computer";
  const monitorBrand = label(
    "S E V E N T E C H",
    0.65,
    0.08,
    "#8db1a5",
    "#18232c",
    48,
  );
  monitorBrand.position.set(0, -0.895, 0.04);
  monitor.add(monitorBrand);
  return monitor;
}
