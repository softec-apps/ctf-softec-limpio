import * as THREE from "three";
import type { SceneResources } from "../office/SceneResources";

export function createPodiumFigure(
  resources: SceneResources,
  position: number,
  x: number,
  floor: number,
) {
  const root = new THREE.Group();
  root.name = `podium-figure-${position}`;
  root.position.set(x, floor, -2.25);
  resources.scene.add(root);
  const skin = resources.material(
    ["#ce9a77", "#edc4a0", "#a96d4b"][position - 1],
    0.9,
    0,
  );
  const shirt = resources.material(
    ["#ac8650", "#7393a9", "#8b675b"][position - 1],
    0.85,
    0,
  );
  const trousers = resources.material("#293b4b", 0.9, 0);
  const shoes = resources.material("#1d262d", 0.7, 0.1);
  const hair = resources.material(
    ["#30251f", "#5c3928", "#25282d"][position - 1],
    0.9,
    0,
  );
  const medal = resources.material(
    ["#e5ba73", "#c7d5dd", "#bd8862"][position - 1],
    0.3,
    0.65,
  );
  const ribbon = resources.material("#456f80", 0.8, 0);
  const eyes = resources.material("#18232b", 0.8, 0);
  const sphere = new THREE.SphereGeometry(1, 12, 10);
  const limb = new THREE.CylinderGeometry(1, 1, 1, 10);
  function piece(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    at: [number, number, number],
    scale: [number, number, number],
    parent: THREE.Object3D = root,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  piece(
    new THREE.CylinderGeometry(0.3, 0.25, 0.76, 10),
    shirt,
    [0, 1.28, 0],
    [1, 1, 0.8],
  );
  piece(sphere, trousers, [0, 0.92, 0], [0.28, 0.19, 0.22]);
  piece(limb, skin, [0, 1.71, 0], [0.09, 0.16, 0.09]);
  piece(sphere, skin, [0, 1.97, 0], [0.24, 0.28, 0.24]);
  piece(sphere, hair, [0, 2.1, -0.025], [0.25, 0.18, 0.245]);
  for (const side of [-1, 1]) {
    piece(limb, trousers, [side * 0.155, 0.53, 0], [0.12, 0.76, 0.13]);
    piece(sphere, shoes, [side * 0.155, 0.13, 0.08], [0.145, 0.12, 0.25]);
    piece(sphere, eyes, [side * 0.085, 1.99, 0.225], [0.027, 0.035, 0.018]);
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 1.57, 0);
    arm.rotation.z =
      side * (position === 1 || (position === 2 && side === 1) ? 2.25 : 0.15);
    root.add(arm);
    piece(limb, shirt, [0, -0.17, 0], [0.1, 0.34, 0.1], arm);
    piece(limb, skin, [0, -0.43, 0], [0.075, 0.24, 0.075], arm);
    piece(sphere, skin, [0, -0.6, 0], [0.09, 0.1, 0.08], arm);
    const strap = resources.box(
      0.035,
      0.39,
      0.035,
      side * 0.075,
      1.43,
      0.24,
      ribbon,
      root,
    );
    strap.rotation.z = side * -0.35;
  }
  piece(sphere, skin, [0, 1.94, 0.24], [0.045, 0.055, 0.04]);
  const badge = piece(
    new THREE.CylinderGeometry(0.105, 0.105, 0.035, 20),
    medal,
    [0, 1.23, 0.265],
    [1, 1, 1],
  );
  badge.rotation.x = Math.PI / 2;
}
