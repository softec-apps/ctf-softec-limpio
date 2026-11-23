import * as THREE from "three";
import type { SceneResources } from "./SceneResources";
import {
  TELEVISION_POSITION,
  TELEVISION_YAW,
  TELEVISION_WIDTH,
  TELEVISION_HEIGHT,
} from "../sceneLayout";
import type { RankingDisplay } from "../ranking/display";
import {
  paintTelevision,
  TV_CANVAS_WIDTH,
  TV_CANVAS_HEIGHT,
} from "../ranking/paintTelevision";

export function createRankingTelevision(
  resources: SceneResources,
  invalidate: () => void,
  canvas: HTMLCanvasElement = document.createElement("canvas"),
) {
  const { scene, box, material, glow } = resources;
  const root = new THREE.Group();
  root.position.fromArray(TELEVISION_POSITION);
  root.rotation.y = TELEVISION_YAW;
  root.userData.device = "television";
  scene.add(root);
  box(1.1, 0.72, 0.09, 0, 0, -0.075, material("#343a3d", 0.6, 0.6), root);
  box(
    TELEVISION_WIDTH + 0.12,
    TELEVISION_HEIGHT + 0.12,
    0.11,
    0,
    0,
    0,
    material("#151d21", 0.26, 0.55),
    root,
  );
  canvas.width = TV_CANVAS_WIDTH;
  canvas.height = TV_CANVAS_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("No se pudo preparar la pantalla del televisor.");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  resources.textures.push(texture);
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  resources.materials.push(screenMaterial);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(TELEVISION_WIDTH, TELEVISION_HEIGHT),
    screenMaterial,
  );
  screen.position.z = 0.058;
  root.add(screen);
  box(
    0.018,
    0.006,
    0.004,
    TELEVISION_WIDTH / 2 - 0.12,
    -TELEVISION_HEIGHT / 2 - 0.034,
    0.058,
    glow("#78c6b1", 0.5),
    root,
  );
  let fingerprint = "";
  function setDisplay(display: RankingDisplay) {
    const signature = JSON.stringify(display);
    if (signature === fingerprint) return;
    fingerprint = signature;
    paintTelevision(context!, display);
    texture.needsUpdate = true;
    invalidate();
  }
  setDisplay({ entries: [], phase: "loading" });
  return { root, setDisplay };
}
