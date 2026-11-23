import * as THREE from "three";
import { DESK_Z } from "../sceneLayout";
import type { SceneResources } from "./SceneResources";
import type { OfficePalette } from "./officePalette";

export function createGamingKeyboard(
  resources: SceneResources,
  palette: OfficePalette,
) {
  const { scene, box, material, materials, textures } = resources;
  const { edge, dark, keyLights } = palette;
  const keyboard = new THREE.Group();
  keyboard.position.set(0.08, 1.17, DESK_Z + 0.45);
  scene.add(keyboard);
  box(1.4, 0.055, 0.66, 0, 0, 0, edge, keyboard);
  box(1.36, 0.025, 0.62, 0, 0.04, 0, dark, keyboard);
  box(1.25, 0.035, 0.1, 0, 0.005, 0.35, dark, keyboard);
  const keycap = material("#1d2636", 0.38, 0.25);
  const keyGeometry = new THREE.BoxGeometry(1, 1, 1);
  for (let col = 0; col < 14; col++)
    box(
      0.094,
      0.012,
      0.012,
      -0.63 + col * 0.097,
      0,
      0.333,
      keyLights[col],
      keyboard,
    );
  const legendsCanvas = document.createElement("canvas");
  legendsCanvas.width = 1536;
  legendsCanvas.height = 768;
  const legendsContext = legendsCanvas.getContext("2d")!;
  legendsContext.fillStyle = "#e5eeff";
  legendsContext.textAlign = "center";
  legendsContext.textBaseline = "middle";
  legendsContext.font = "500 26px monospace";
  const keyRows = [
    ["ESC", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "−", "=", "⌫"],
    ["TAB", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
    ["CAPS", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "ENTER"],
    ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "SHIFT"],
    ["CTRL", "WIN", "ALT", "SPACE", "ALT", "FN", "CTRL"],
  ];
  const caps = new THREE.InstancedMesh(
    keyGeometry,
    keycap,
    keyRows.flat().length,
  );
  caps.castShadow = true;
  caps.receiveShadow = true;
  keyboard.add(caps);
  const rims = new Map<THREE.Material, THREE.Matrix4[]>();
  const keyTransform = new THREE.Object3D();
  let capIndex = 0;
  for (const [row, keys] of keyRows.entries()) {
    const widths = keys.map((key) =>
      key === "SPACE" ? 6 : key === "SHIFT" ? 2 : key === "ENTER" ? 2 : 1,
    );
    const unit = 1.24 / widths.reduce((sum, width) => sum + width, 0);
    let cursor = -0.62;
    for (const [index, key] of keys.entries()) {
      const width = widths[index] * unit;
      const x = cursor + width / 2;
      const z = -0.24 + row * 0.115;
      const light =
        keyLights[Math.min(13, Math.round(((x + 0.62) / 1.24) * 13))];
      keyTransform.scale.set(width - 0.006, 0.012, 0.101);
      keyTransform.position.set(x, 0.061, z);
      keyTransform.updateMatrix();
      const lightRims = rims.get(light) ?? [];
      lightRims.push(keyTransform.matrix.clone());
      rims.set(light, lightRims);
      keyTransform.scale.set(width - 0.017, 0.038, 0.087);
      keyTransform.position.set(x, 0.086, z);
      keyTransform.updateMatrix();
      caps.setMatrixAt(capIndex++, keyTransform.matrix);
      if (key !== "SPACE")
        legendsContext.fillText(
          key,
          ((x + 0.7) / 1.4) * 1536,
          ((z + 0.33) / 0.66) * 768,
          (width / 1.4) * 1300,
        );
      cursor += width;
    }
  }
  for (const [light, matrices] of rims) {
    const instances = new THREE.InstancedMesh(
      keyGeometry,
      light,
      matrices.length,
    );
    matrices.forEach((matrix, index) => instances.setMatrixAt(index, matrix));
    keyboard.add(instances);
  }
  const legendsTexture = new THREE.CanvasTexture(legendsCanvas);
  legendsTexture.colorSpace = THREE.SRGBColorSpace;
  textures.push(legendsTexture);
  const legendsMaterial = new THREE.MeshBasicMaterial({
    map: legendsTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  materials.push(legendsMaterial);
  const legends = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.66),
    legendsMaterial,
  );
  legends.rotation.x = -Math.PI / 2;
  legends.position.y = 0.106;
  keyboard.add(legends);
  return keyboard;
}
