import { PRINTER_POSITION, PRINTER_YAW } from "../sceneLayout";
import * as THREE from "three";
import type { SceneResources } from "./SceneResources";

export function createMultifunctionPrinter(
  resources: SceneResources,
  requestRender: () => void,
) {
  const { scene, box, material, label, glow } = resources;
  const root = new THREE.Group();
  root.position.fromArray(PRINTER_POSITION);
  root.rotation.y = PRINTER_YAW;
  scene.add(root);
  root.userData.device = "printer";
  const pearl = material("#dedfdb", 0.38, 0.05),
    graphite = material("#242b30", 0.4, 0.25),
    seam = material("#11191e", 0.7, 0.1),
    paper = material("#f4f0e5", 0.95, 0),
    stand = material("#41494c", 0.6, 0.3);
  box(1.05, 0.055, 0.88, 0, 0.87, 0, stand, root);
  for (const x of [-0.43, 0.43])
    for (const z of [-0.34, 0.34])
      box(0.045, 0.84, 0.045, x, 0.42, z, stand, root);
  // Separate shell, paper drawers, output throat and scanner preserve real proportions.
  box(0.72, 0.43, 0.66, 0, 1.12, 0, pearl, root);
  box(0.665, 0.18, 0.018, 0, 1.01, 0.338, pearl, root);
  box(0.29, 0.012, 0.01, 0, 1.065, 0.35, seam, root);
  box(0.67, 0.006, 0.018, 0, 1.105, 0.34, seam, root);
  box(0.61, 0.1, 0.37, 0, 1.25, 0.12, seam, root);
  box(0.57, 0.013, 0.41, 0, 1.2, 0.16, graphite, root);
  box(0.71, 0.065, 0.68, 0, 1.365, -0.015, graphite, root);
  box(0.67, 0.036, 0.62, 0, 1.414, -0.025, pearl, root);
  box(0.41, 0.072, 0.38, -0.09, 1.47, -0.08, pearl, root);
  box(0.38, 0.017, 0.27, -0.09, 1.515, -0.06, seam, root);
  box(0.35, 0.009, 0.23, -0.09, 1.528, -0.08, paper, root);
  box(0.015, 0.045, 0.25, -0.275, 1.54, -0.08, pearl, root);
  box(0.015, 0.045, 0.25, 0.095, 1.54, -0.08, pearl, root);
  const panel = new THREE.Group();
  panel.position.set(0.145, 1.365, 0.36);
  panel.rotation.x = -0.24;
  root.add(panel);
  box(0.305, 0.17, 0.035, 0, 0, 0, graphite, panel);
  box(0.255, 0.125, 0.005, -0.008, 0, 0.021, glow("#133e50", 0.4), panel);
  const display = label("FLOW / READY", 0.22, 0.06, "#d8edf0", "#133e50", 42);
  display.position.set(-0.008, 0.02, 0.025);
  panel.add(display);
  for (let i = 0; i < 3; i++)
    box(
      0.036,
      0.024,
      0.004,
      -0.078 + i * 0.065,
      -0.031,
      0.026,
      glow(["#6bd2c2", "#8cacc2", "#b8d3dc"][i], 0.45),
      panel,
    );
  box(0.009, 0.009, 0.005, 0.14, 0.055, 0.025, glow("#64e1c0", 0.7), panel);
  box(0.018, 0.055, 0.013, -0.31, 1.17, 0.341, seam, root);
  const brand = label("SEVENTECH", 0.18, 0.035, "#444d51", "#dedfdb", 40);
  brand.position.set(-0.18, 1.33, 0.337);
  root.add(brand);
  const model = label("M740", 0.08, 0.027, "#727a7e", "#dedfdb", 40);
  model.position.set(0.25, 1.12, 0.339);
  root.add(model);
  const sheet = new THREE.Group();
  sheet.position.set(0, 1.218, 0.3);
  sheet.rotation.x = -0.035;
  sheet.visible = false;
  root.add(sheet);
  box(0.285, 0.004, 0.39, 0, 0, 0.09, paper, sheet);
  for (let i = 0; i < 7; i++)
    box(
      i === 0 ? 0.2 : 0.18,
      0.002,
      0.003,
      0,
      0.004,
      -0.06 + i * 0.025,
      graphite,
      sheet,
    );
  return {
    root,
    setPrinted(visible: boolean) {
      sheet.visible = visible;
      requestRender();
    },
  };
}
