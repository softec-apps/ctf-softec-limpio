import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";

export function createSceneResources(scene: THREE.Scene) {
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const geometries = new Map<string, THREE.BufferGeometry>();
  let disposed = false;
  function sharedGeometry(key: string, create: () => THREE.BufferGeometry) {
    let geometry = geometries.get(key);
    if (!geometry) {
      geometry = create();
      geometries.set(key, geometry);
    }
    return geometry;
  }
  function material(
    color: THREE.ColorRepresentation,
    roughness = 0.65,
    metalness = 0.15,
  ) {
    const surface = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    materials.push(surface);
    return surface;
  }
  function glow(color: THREE.ColorRepresentation, intensity = 1) {
    const surface = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.4,
    });
    materials.push(surface);
    return surface;
  }
  function box(
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    meshMaterial: THREE.Material,
    parent: THREE.Object3D = scene,
  ) {
    const mesh = new THREE.Mesh(
      sharedGeometry(`box:${width}:${height}:${depth}`, () =>
        Math.min(width, height, depth) >= 0.08
          ? new RoundedBoxGeometry(
              width,
              height,
              depth,
              1,
              Math.min(0.018, Math.min(width, height, depth) * 0.1),
            )
          : new THREE.BoxGeometry(width, height, depth),
      ),
      meshMaterial,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    meshMaterial: THREE.Material,
    parent: THREE.Object3D = scene,
  ) {
    const mesh = new THREE.Mesh(
      sharedGeometry(
        `cylinder:${radius}:${height}`,
        () => new THREE.CylinderGeometry(radius, radius, height, 16),
      ),
      meshMaterial,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cable(points: number[][], color = "#111f25", radius = 0.018) {
    const curve = new THREE.CatmullRomCurve3(
      points.map(
        (point) => new THREE.Vector3(...(point as [number, number, number])),
      ),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 32, radius, 6, false),
      material(color),
    );
    scene.add(mesh);
    return mesh;
  }
  function label(
    text: string,
    width: number,
    height: number,
    color = "#a8e8cf",
    background = "#0a1820",
    fontSize = 35,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;
    context.fillStyle = background;
    context.fillRect(0, 0, 1024, 256);
    context.fillStyle = color;
    context.font = `600 ${fontSize}px monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    text
      .split("\n")
      .forEach((line, index, lines) =>
        context.fillText(
          line,
          512,
          128 + (index - (lines.length - 1) / 2) * (fontSize + 18),
        ),
      );
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const labelMaterial = new THREE.MeshBasicMaterial({ map: texture });
    materials.push(labelMaterial);
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      labelMaterial,
    );
  }
  return {
    scene,
    material,
    glow,
    box,
    cylinder,
    cable,
    label,
    materials,
    textures,
    get disposed() {
      return disposed;
    },
    dispose() {
      disposed = true;
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}
export type SceneResources = ReturnType<typeof createSceneResources>;
