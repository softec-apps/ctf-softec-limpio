import { surfaceGrain } from "./SurfaceTextures";
import * as THREE from "three";
import type { SceneResources } from "./SceneResources";

export function createOfficePalette(resources: SceneResources) {
  const { material, glow, materials } = resources;
  const metal = material("#18232c", 0.45, 0.7);
  const dark = material("#0b131a", 0.7, 0.35);
  const edge = material("#34434d", 0.4, 0.7);
  const wood = material("#795b40", 0.52, 0);
  const concrete = material("#8c9392", 0.94, 0);
  concrete.bumpMap = surfaceGrain(resources, "plaster");
  concrete.bumpScale = 0.035;
  metal.roughness = 0.37;
  const amber = material("#d59a50", 0.55, 0.2);
  const led = glow("#47d995", 2);
  const blueLed = glow("#4faeca", 1.5);
  const keyLights = Array.from({ length: 14 }, (_, col) => {
    const color = new THREE.Color().setHSL(0.48 + (col / 13) * 0.4, 1, 0.58);
    const light = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    materials.push(light);
    return light;
  });
  return { metal, dark, edge, wood, concrete, amber, led, blueLed, keyLights };
}
export type OfficePalette = ReturnType<typeof createOfficePalette>;
