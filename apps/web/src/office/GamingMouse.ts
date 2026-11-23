import * as THREE from "three";
import { DESK_Z } from "../sceneLayout";
import type { SceneResources } from "./SceneResources";
import type { OfficePalette } from "./officePalette";

export function createGamingMouse(
  resources: SceneResources,
  palette: OfficePalette,
) {
  const { scene, box, material } = resources;
  const { dark, edge, keyLights } = palette;
  const mouse = new THREE.Group();
  mouse.position.set(1.12, 1.17, DESK_Z + 0.55);
  mouse.rotation.y = -0.12;
  scene.add(mouse);
  const mouseShell = material("#17212e", 0.42, 0.25);
  const mouseButtons = material("#344052", 0.4, 0.3);
  const domeGeometry = new THREE.SphereGeometry(
    1,
    28,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const shell = new THREE.Mesh(domeGeometry, mouseShell);
  shell.scale.set(0.15, 0.105, 0.235);
  shell.position.y = 0.03;
  shell.castShadow = true;
  shell.receiveShadow = true;
  mouse.add(shell);
  box(0.24, 0.025, 0.34, 0, 0.014, 0, dark, mouse);
  for (const side of [-1, 1]) {
    const button = new THREE.Mesh(domeGeometry, mouseButtons);
    button.scale.set(0.065, 0.036, 0.12);
    button.position.set(side * 0.071, 0.092, -0.09);
    button.castShadow = true;
    mouse.add(button);
    const points = Array.from({ length: 25 }, (_, index) => {
      const angle = (index / 24) * Math.PI;
      return new THREE.Vector3(
        side * Math.sin(angle) * 0.151,
        0.033,
        Math.cos(angle) * 0.236,
      );
    });
    const accent = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        32,
        0.007,
        6,
        false,
      ),
      keyLights[side < 0 ? 2 : 11],
    );
    mouse.add(accent);
  }
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.035, 16),
    dark,
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0, 0.132, -0.14);
  mouse.add(wheel);
  const wheelRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.032, 0.005, 6, 20),
    keyLights[2],
  );
  wheelRing.rotation.y = Math.PI / 2;
  wheelRing.position.copy(wheel.position);
  mouse.add(wheelRing);
  box(0.028, 0.012, 0.033, 0, 0.136, -0.045, edge, mouse);
  box(0.024, 0.006, 0.01, 0, 0.144, -0.045, keyLights[11], mouse);
  for (const z of [-0.025, 0.045])
    box(0.02, 0.026, 0.055, -0.147, 0.07, z, edge, mouse);
  for (const [x, z, rotation] of [
    [-0.014, 0.075, -0.6],
    [0.008, 0.1, 0.6],
  ]) {
    const emblem = box(0.012, 0.006, 0.047, x, 0.128, z, keyLights[8], mouse);
    emblem.rotation.y = rotation;
  }
  return mouse;
}
