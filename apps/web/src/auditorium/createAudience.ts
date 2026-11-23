import * as THREE from "three";
import type { SceneResources } from "../office/SceneResources";

export function createAudience(
  resources: SceneResources,
  seats: THREE.Matrix4[],
) {
  const people = seats.filter(
    (_, index) => index % 7 !== 0 && index % 11 !== 0,
  );
  const skin = ["#b98261", "#edc4a0", "#795341", "#ce9a77", "#a96d4b"];
  const shirts = [
    "#537e91",
    "#b68c5d",
    "#6a7e63",
    "#844b56",
    "#d2c5aa",
    "#3e536e",
    "#8a6f9c",
  ];
  const hair = ["#30251f", "#4e3526", "#997348", "#24282b"];
  const trousers = ["#283747", "#434345", "#314552"];
  const surface = resources.material("#ffffff", 0.9, 0);
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  const limb = new THREE.CylinderGeometry(1, 1, 1, 8);
  const torso = new THREE.CylinderGeometry(0.3, 0.23, 0.64, 8);
  function part(
    name: string,
    geometry: THREE.BufferGeometry,
    position: THREE.Vector3,
    scale: THREE.Vector3,
    palette: string[],
    rotation = new THREE.Euler(),
    visible = (_index: number) => true,
  ) {
    const selected = people
      .map((seat, index) => ({ seat, index }))
      .filter(({ index }) => visible(index));
    const mesh = new THREE.InstancedMesh(geometry, surface, selected.length);
    mesh.name = name;
    selected.forEach(({ seat, index }, instance) => {
      const variation = 0.94 + (index % 5) * 0.025;
      const local = new THREE.Matrix4().compose(
        position.clone().multiplyScalar(variation),
        new THREE.Quaternion().setFromEuler(rotation),
        scale.clone().multiplyScalar(variation),
      );
      mesh.setMatrixAt(instance, seat.clone().multiply(local));
      mesh.setColorAt(
        instance,
        new THREE.Color(
          palette[(index * 3 + Math.floor(index / 8)) % palette.length],
        ),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    resources.scene.add(mesh);
  }
  part(
    "audience-torso",
    torso,
    new THREE.Vector3(0, 1.1, -0.06),
    new THREE.Vector3(1, 1, 0.8),
    shirts,
  );
  part(
    "audience-head",
    sphere,
    new THREE.Vector3(0, 1.7, -0.1),
    new THREE.Vector3(0.21, 0.25, 0.21),
    skin,
  );
  part(
    "audience-neck",
    limb,
    new THREE.Vector3(0, 1.44, -0.1),
    new THREE.Vector3(0.085, 0.16, 0.085),
    skin,
  );
  part(
    "audience-hair",
    sphere,
    new THREE.Vector3(0, 1.8, -0.06),
    new THREE.Vector3(0.22, 0.17, 0.22),
    hair,
    new THREE.Euler(),
    (index) => index % 6 !== 0,
  );
  part(
    "audience-bun",
    sphere,
    new THREE.Vector3(0, 1.78, 0.15),
    new THREE.Vector3(0.12, 0.13, 0.12),
    hair,
    new THREE.Euler(),
    (index) => index % 5 === 0,
  );
  for (const side of [-1, 1]) {
    part(
      "audience-sleeve",
      limb,
      new THREE.Vector3(side * 0.33, 1.17, -0.1),
      new THREE.Vector3(0.1, 0.4, 0.1),
      shirts,
      new THREE.Euler(-0.25, 0, side * 0.14),
    );
    part(
      "audience-forearm",
      limb,
      new THREE.Vector3(side * 0.34, 0.99, -0.32),
      new THREE.Vector3(0.075, 0.38, 0.075),
      skin,
      new THREE.Euler(Math.PI / 2, 0, 0),
    );
    part(
      "audience-hand",
      sphere,
      new THREE.Vector3(side * 0.34, 0.99, -0.52),
      new THREE.Vector3(0.08, 0.07, 0.1),
      skin,
    );
    part(
      "audience-thigh",
      limb,
      new THREE.Vector3(side * 0.16, 0.81, -0.29),
      new THREE.Vector3(0.14, 0.59, 0.14),
      trousers,
      new THREE.Euler(Math.PI / 2, 0, 0),
    );
    part(
      "audience-shin",
      limb,
      new THREE.Vector3(side * 0.16, 0.48, -0.55),
      new THREE.Vector3(0.105, 0.56, 0.105),
      trousers,
    );
    part(
      "audience-shoe",
      sphere,
      new THREE.Vector3(side * 0.16, 0.21, -0.65),
      new THREE.Vector3(0.13, 0.1, 0.23),
      ["#20282c"],
    );
  }
}
