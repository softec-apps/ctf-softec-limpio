import { OT_POSITION } from "../sceneLayout";
import * as THREE from "three";
import type { OtView } from "../../../../packages/ot-contracts";
import type { SceneResources } from "./SceneResources";

export function createIndustrialCabinet(
  resources: SceneResources,
  requestRender: () => void,
  setRoomLight: (on: boolean) => void,
) {
  const { scene, box, cylinder, material, glow, label } = resources;
  const root = new THREE.Group();
  root.position.fromArray(OT_POSITION);
  root.rotation.y = -Math.PI / 2;
  root.userData.device = "ot";
  scene.add(root);
  const shell = material("#b7bcb9", 0.52, 0.35),
    edge = material("#35434a", 0.45, 0.6),
    dark = material("#15232b", 0.42, 0.2),
    steel = material("#8c9699", 0.35, 0.8),
    orange = material("#dc9a42", 0.5, 0.15);
  box(1.04, 1.4, 0.34, 0, 1.65, 0, shell, root);
  box(0.98, 1.32, 0.025, 0, 1.65, 0.185, edge, root);
  box(0.91, 1.24, 0.026, 0, 1.65, 0.21, dark, root);
  for (const x of [-0.455, 0.455])
    for (const y of [1.08, 2.21]) {
      const bolt = cylinder(0.014, 0.012, x, y, 0.235, steel, root);
      bolt.rotation.x = Math.PI / 2;
    }
  box(0.79, 0.43, 0.042, 0, 1.96, 0.245, edge, root);
  const display = label("AXON / PROCESS", 0.72, 0.33, "#b8d4ce", "#142d32", 44);
  display.position.set(0, 1.96, 0.269);
  root.add(display);
  for (let i = 0; i < 4; i++) {
    box(
      0.095,
      0.028,
      0.006,
      -0.24 + i * 0.16,
      1.86,
      0.275,
      glow(i === 0 ? "#d9a452" : "#466f73", 0.4),
      root,
    );
  }
  box(0.78, 0.028, 0.05, 0, 1.54, 0.25, steel, root);
  for (let i = 0; i < 5; i++) {
    box(
      i === 0 ? 0.22 : 0.11,
      0.23,
      0.1,
      -0.29 + i * 0.145,
      1.4,
      0.25,
      i === 0 ? edge : shell,
      root,
    );
    for (let j = 0; j < 3; j++)
      box(
        0.028,
        0.018,
        0.008,
        -0.29 + i * 0.145,
        1.44 - j * 0.04,
        0.306,
        glow(j === 0 ? "#72d5a8" : "#315744", 0.5),
        root,
      );
    box(
      i === 0 ? 0.16 : 0.08,
      0.035,
      0.04,
      -0.29 + i * 0.145,
      1.27,
      0.31,
      orange,
      root,
    );
  }
  const plc = label("C24 / PLC", 0.23, 0.055, "#c4d3d7", "#35434a", 36);
  plc.position.set(-0.28, 1.54, 0.29);
  root.add(plc);
  for (let i = 0; i < 7; i++)
    box(
      0.009,
      0.13,
      0.012,
      -0.3 + i * 0.09,
      1.14,
      0.24,
      i % 2 ? orange : steel,
      root,
    );
  const badge = label(
    "SEVENTECH  /  AXON C24",
    0.66,
    0.055,
    "#26383c",
    "#b7bcb9",
    42,
  );
  badge.position.set(0, 2.29, 0.185);
  root.add(badge);
  const stop = cylinder(
    0.065,
    0.036,
    0.31,
    1.07,
    0.25,
    material("#af3a30", 0.4, 0.2),
    root,
  );
  stop.rotation.x = Math.PI / 2;
  box(0.13, 0.015, 0.04, 0.31, 0.99, 0.25, orange, root);
  const lensMaterials = [
    glow("#224539", 0.15),
    glow("#682c27", 1),
    glow("#223d5b", 0.15),
  ];
  box(0.06, 0.12, 0.07, 0.37, 2.4, 0, edge, root);
  for (let i = 0; i < 3; i++)
    cylinder(0.055, 0.07, 0.37, 2.49 + i * 0.075, 0, lensMaterials[i], root);
  const fan = new THREE.Group();
  fan.position.set(-0.91, 1.94, 0.04);
  root.add(fan);
  box(0.6, 0.6, 0.08, 0, 0, 0, edge, fan);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.245, 0.018, 6, 32),
    steel,
  );
  ring.position.z = 0.055;
  fan.add(ring);
  const rotor = new THREE.Group();
  rotor.position.z = 0.06;
  fan.add(rotor);
  for (let i = 0; i < 5; i++) {
    const blade = box(0.11, 0.23, 0.015, 0, 0.105, 0, shell, rotor);
    const a = (i * Math.PI * 2) / 5;
    blade.position.set(Math.sin(a) * 0.105, Math.cos(a) * 0.105, 0);
    blade.rotation.z = -a + 0.3;
  }
  const hub = cylinder(0.055, 0.025, 0, 0, 0.02, edge, rotor);
  hub.rotation.x = Math.PI / 2;
  for (let i = -2; i <= 2; i++)
    box(0.48, 0.006, 0.012, 0, i * 0.07, 0.09, steel, fan);
  const lamp = glow("#efd4a2", 1.2);
  box(0.6, 0.05, 0.06, 0, 2.8, 0.06, lamp, root);
  let running = true,
    rpm = 900;
  return {
    root,
    apply(view: OtView) {
      running = view.fanRunning;
      rpm = view.fanRpm;
      setRoomLight(view.lightOn);
      lamp.emissiveIntensity = view.lightOn ? 1.2 : 0;
      const selected =
        view.beacon === "green" ? 0 : view.beacon === "red" ? 1 : 2;
      lensMaterials.forEach((surface, i) => {
        surface.emissiveIntensity = i === selected ? 1.5 : 0.08;
      });
      requestRender();
    },
    isAnimating(view: string) {
      return view === "ot" && running && rpm > 0;
    },
    update(dt: number, view: string) {
      if (view === "ot" && running)
        rotor.rotation.z -= dt * Math.min(rpm / 100, 16);
    },
  };
}
