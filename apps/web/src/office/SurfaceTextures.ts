import * as THREE from "three";
import type { SceneResources } from "./SceneResources";
// Deterministic microstructure: the shader receives actual surface relief, not a lighting overlay.
export function surfaceGrain(
  resources: SceneResources,
  kind: "plaster" | "fabric" | "floor",
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(256, 256);
  let seed = 7319;
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 4294967296 - 0.5;
      const weave =
        kind === "fabric" ? (x % 3 === 0 ? 16 : 0) + (y % 3 === 0 ? 12 : 0) : 0;
      const v = 128 + noise * (kind === "floor" ? 65 : 40) + weave;
      const offset = (y * 256 + x) * 4;
      image.data.set([v, v, v, 255], offset);
    }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "floor" ? 12 : 5, kind === "floor" ? 10 : 5);
  resources.textures.push(texture);
  return texture;
}
export function loadWoodSurface(
  resources: SceneResources,
  surface: THREE.MeshStandardMaterial,
  anisotropy: number,
  onLoad: () => void,
) {
  new THREE.TextureLoader().load("/assets/materials/walnut.jpg", (texture) => {
    if (resources.disposed) {
      texture.dispose();
      return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    texture.anisotropy = Math.min(anisotropy, 8);
    resources.textures.push(texture);
    surface.map = texture;
    surface.color.set("#b6a48e");
    surface.roughness = 0.48;
    surface.metalness = 0;
    surface.needsUpdate = true;
    onLoad();
  });
}
