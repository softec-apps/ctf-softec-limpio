import { DESK_Z } from "../sceneLayout";
import * as THREE from "three";
export function createOfficeLighting(scene: THREE.Scene) {
  const daylight = new THREE.DirectionalLight("#fff2df", 2.7);
  daylight.position.set(3.5, 6.5, -2);
  daylight.target.position.set(-1, 0.8, 1);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(2048, 2048);
  Object.assign(daylight.shadow.camera, {
    left: -8,
    right: 8,
    top: 7,
    bottom: -7,
    near: 0.5,
    far: 24,
  });
  daylight.shadow.bias = -0.00015;
  daylight.shadow.normalBias = 0.035;
  daylight.shadow.radius = 3;
  scene.add(daylight, daylight.target);
  scene.add(new THREE.HemisphereLight("#e6edf3", "#51483d", 0.8));
  const fill = new THREE.DirectionalLight("#b2c9e4", 0.65);
  fill.position.set(3, 4, 5);
  scene.add(fill);
  const screen = new THREE.PointLight("#b4e1df", 1.5, 3, 2);
  screen.position.set(0, 2, DESK_Z + 0.1);
  scene.add(screen);
  const rack = new THREE.PointLight("#78b9d4", 2, 3, 2);
  rack.position.set(-4, 2, -0.5);
  scene.add(rack);
  const overhead = new THREE.PointLight("#ffe8ce", 13, 10, 2);
  overhead.position.set(-2, 4.4, 1);
  scene.add(overhead);
  return {
    setIndustrialLight(on: boolean) {
      overhead.intensity = on ? 13 : 0;
    },
  };
}
