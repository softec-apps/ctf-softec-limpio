import * as THREE from "three";
import type { SceneResources } from "./SceneResources";
import type { OfficePalette } from "./officePalette";
import { RACK_POSITION, RACK_YAW } from "../sceneLayout";
import { createRackHardware } from "./rack/RackHardware";

export function createServerRack(
  resources: SceneResources,
  palette: OfficePalette,
) {
  const { scene, box, material, label } = resources;
  const rack = new THREE.Group();
  rack.name = "communications-cabinet";
  rack.position.fromArray(RACK_POSITION);
  rack.rotation.y = RACK_YAW;
  rack.userData.device = "rack";
  scene.add(rack);
  const painted = material("#252b30", 0.58, 0.45);
  const rail = material("#6c737a", 0.4, 0.8);
  const rubber = material("#101417", 0.96, 0);
  // Hollow cabinet: front hardware sits in a real cavity, with visible mounting depth.
  box(1.25, 0.1, 0.94, 0, 0.13, 0, painted, rack);
  box(1.25, 0.09, 0.94, 0, 3.47, 0, painted, rack);
  box(1.2, 3.28, 0.035, 0, 1.8, -0.455, painted, rack);
  for (const x of [-0.6, 0.6]) {
    box(0.045, 3.32, 0.88, x, 1.8, 0, painted, rack);
    box(0.055, 3.35, 0.065, x, 1.79, 0.46, painted, rack);
    box(0.055, 3.35, 0.065, x, 1.79, -0.39, rail, rack);
    box(0.038, 3.18, 0.025, x * 0.9, 1.8, 0.492, rail, rack);
    for (const z of [-0.32, 0.32])
      box(0.12, 0.1, 0.12, x * 0.88, 0.035, z, rubber, rack);
  }
  const { recess, text, ventilation } = createRackHardware(resources, rack);
  // EIA-style mounting positions are represented as instanced recesses to keep draw calls bounded.
  const holes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.014, 0.02, 0.003),
    recess,
    168,
  );
  const matrix = new THREE.Matrix4();
  let index = 0;
  for (const x of [-0.54, 0.54])
    for (let unit = 0; unit < 28; unit++)
      for (const offset of [-0.025, 0, 0.025]) {
        matrix.makeTranslation(x, 0.23 + unit * 0.115 + offset, 0.508);
        holes.setMatrixAt(index++, matrix);
      }
  rack.add(holes);
  ventilation(0, 3.47, 0.8, 0.025, 35, 2, 0.478);
  text("SEVENTECH  /  COMMUNICATIONS", 0.86, 0.055, 0, 3.5, 0.49);
  for (let i = 0; i < 7; i++) {
    const marker = label(
      String((i + 1) * 4).padStart(2, "0"),
      0.027,
      0.035,
      "#bbc1c4",
      "#252b30",
      50,
    );
    marker.position.set(-0.578, 0.3 + i * 0.46, 0.525);
    rack.add(marker);
  }
  for (const x of [-0.56, 0.56])
    box(0.025, 3.1, 0.025, x, 1.78, 0.4, rubber, rack);
  // Rear cable risers remain behind the front rail and never cover selectable patch ports.
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.47 + i * 0.014, 0.25, -0.28),
      new THREE.Vector3(0.47 + i * 0.014, 1.8, -0.28),
      new THREE.Vector3(0.42, 3.35, -0.12),
    ]);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 18, 0.009, 5, false),
      i === 1 ? palette.edge : rubber,
    );
    rack.add(mesh);
  }
  return rack;
}
