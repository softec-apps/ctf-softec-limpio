import * as THREE from "three";
import { RACK_POSITION, RACK_YAW } from "./sceneLayout";
export function createRoomFixtures(
  scene: THREE.Scene,
  materials: {
    wall: THREE.Material;
    metal: THREE.Material;
    edge: THREE.Material;
    dark: THREE.Material;
  },
  label: (
    text: string,
    w: number,
    h: number,
    color?: string,
    background?: string,
    fontSize?: number,
  ) => THREE.Mesh,
) {
  const targets: THREE.Object3D[] = [];
  const owned: THREE.Material[] = [];
  const material = (color: string, emissive?: string) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      emissive: emissive ?? "#000000",
      emissiveIntensity: 0.6,
      roughness: 0.6,
      metalness: 0.3,
    });
    owned.push(m);
    return m;
  };
  const glass = new THREE.MeshStandardMaterial({
    color: "#b8c9cf",
    transparent: true,
    opacity: 0.12,
    roughness: 0.12,
    metalness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  owned.push(glass);
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Object3D = scene,
  ) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  // Complete the room and create a real doorway opening into a short vestibule.
  box(0.18, 5, 10.6, 7, 2.4, 0.8, materials.wall);
  box(8.95, 5, 0.18, -1.525, 2.4, 6, materials.wall);
  box(2.35, 5, 0.18, 5.825, 2.4, 6, materials.wall);
  box(1.7, 2.15, 0.18, 3.8, 3.825, 6, materials.wall);
  box(13, 0.15, 10.4, 0.5, 4.95, 0.8, materials.wall);
  for (const x of [-4, 0, 4]) {
    box(0.16, 0.09, 8.8, x, 4.8, 0.5, materials.metal);
    box(0.1, 0.016, 3.4, x, 4.73, 0.3, material("#a4c5b8", "#88c9aa"));
  }
  const passageMat = material("#17292a");
  box(2.1, 0.15, 2.6, 3.8, -0.08, 7.2, materials.wall);
  box(0.16, 3, 2.5, 2.8, 1.5, 7.2, passageMat);
  box(0.16, 3, 2.5, 4.8, 1.5, 7.2, passageMat);
  box(2.15, 3, 0.16, 3.8, 1.5, 8.45, passageMat);
  box(2.15, 0.12, 2.5, 3.8, 3.05, 7.2, passageMat);
  const corridorLight = new THREE.PointLight("#a7cbb4", 7, 4, 2);
  corridorLight.position.set(3.8, 2.5, 7.2);
  scene.add(corridorLight);
  const frame = material("#4e625c");
  box(0.1, 2.8, 0.22, 3, 1.4, 5.96, frame);
  box(0.1, 2.8, 0.22, 4.6, 1.4, 5.96, frame);
  box(1.7, 0.11, 0.22, 3.8, 2.8, 5.96, frame);
  const door = new THREE.Group();
  door.position.set(3.05, 0, 5.98);
  door.userData.device = "door";
  scene.add(door);
  box(1.5, 2.73, 0.09, 0.75, 1.365, 0, materials.metal, door);
  box(1.21, 1.45, 0.016, 0.75, 1.48, -0.057, materials.dark, door);
  box(0.16, 0.12, 0.07, 1.26, 1.22, -0.08, frame, door);
  box(0.29, 0.035, 0.04, 1.16, 1.23, -0.13, frame, door);
  const doorSign = label("ACCESO", 0.53, 0.17, "#cbe5d0", "#18232c", 67);
  doorSign.rotation.y = Math.PI;
  doorSign.position.set(0.75, 2.3, -0.062);
  door.add(doorSign);
  targets.push(door);
  const exitSign = label(
    "SEVENTECH / LAB",
    1.25,
    0.2,
    "#c5efd0",
    "#18312a",
    55,
  );
  exitSign.rotation.y = Math.PI;
  exitSign.position.set(3.8, 3.12, 5.86);
  scene.add(exitSign);
  // Hinged rack door and visible patching hardware, ready for lab scenarios.
  const rackAssembly = new THREE.Group();
  rackAssembly.position.fromArray(RACK_POSITION);
  rackAssembly.rotation.y = RACK_YAW;
  scene.add(rackAssembly);
  const rackDoor = new THREE.Group();
  rackDoor.position.set(-0.61, 0.06, 0.58);
  rackDoor.userData = { device: "rack", fixtureAction: "rack-door" };
  rackAssembly.add(rackDoor);
  box(1.18, 3.38, 0.028, 0.59, 1.69, 0, glass, rackDoor);
  box(0.035, 3.42, 0.055, 0, 1.71, 0, materials.edge, rackDoor);
  box(0.035, 3.42, 0.055, 1.18, 1.71, 0, materials.edge, rackDoor);
  box(1.18, 0.035, 0.055, 0.59, 0.02, 0, materials.edge, rackDoor);
  box(1.18, 0.035, 0.055, 0.59, 3.4, 0, materials.edge, rackDoor);
  const seal = material("#10161a");
  for (const x of [0.035, 1.145])
    box(0.014, 3.29, 0.014, x, 1.71, 0.014, seal, rackDoor);
  for (const y of [0.065, 3.355])
    box(1.1, 0.014, 0.014, 0.59, y, 0.014, seal, rackDoor);
  box(0.065, 0.34, 0.025, 1.09, 1.55, 0.038, seal, rackDoor);
  box(0.027, 0.24, 0.07, 1.09, 1.56, 0.072, materials.edge, rackDoor);
  for (const y of [1.45, 1.67])
    box(0.027, 0.025, 0.07, 1.09, y, 0.045, materials.edge, rackDoor);
  const lock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.012, 16),
    material("#9ca5ac"),
  );
  lock.rotation.x = Math.PI / 2;
  lock.position.set(1.09, 1.37, 0.062);
  rackDoor.add(lock);
  box(0.003, 0.018, 0.003, 1.09, 1.37, 0.07, seal, rackDoor);
  for (const y of [0.4, 1.7, 3.02]) {
    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.12, 12),
      materials.edge,
    );
    hinge.position.set(-0.006, y, 0);
    rackDoor.add(hinge);
  }

  const networkArchive = box(
    0.68,
    0.21,
    0.035,
    0.59,
    2.75,
    0.1,
    material("#41616a"),
    rackDoor,
  );
  networkArchive.userData = { device: "rack", fixtureAction: "network-cases" };
  const networkLabel = label(
    "EXPEDIENTES DE RED",
    0.61,
    0.12,
    "#dce8de",
    "#41616a",
    48,
  );
  networkLabel.position.set(0.59, 2.75, 0.125);
  networkLabel.userData = { device: "rack", fixtureAction: "network-cases" };
  rackDoor.add(networkLabel);
  targets.push(rackDoor);
  const patch = new THREE.Group();
  patch.position.set(0, 3.22, 0.55);
  patch.userData.device = "rack";
  rackAssembly.add(patch);
  box(1.1, 0.23, 0.08, 0, 0, 0, materials.dark, patch);
  const connector = material("#757f87");
  const socket = material("#090d10");
  const copper = material("#bca16a");
  const link = material("#4eac72", "#4eac72");
  const portIndicators: THREE.MeshStandardMaterial[] = [];
  let portsDirty = false;
  for (let i = 0; i < 8; i++) {
    const port = box(
      0.08,
      0.065,
      0.035,
      -0.43 + i * 0.12,
      0,
      0.055,
      connector,
      patch,
    );
    port.userData = { device: "rack", port: i + 1 };
    box(0.058, 0.043, 0.01, 0, 0.005, 0.022, socket, port);
    box(0.025, 0.008, 0.01, 0, -0.02, 0.022, socket, port);
    const contacts = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.003, 0.014, 0.003),
      copper,
      8,
    );
    const transform = new THREE.Matrix4();
    for (let pin = 0; pin < 8; pin++) {
      transform.makeTranslation(-0.022 + pin * 0.006, 0.012, 0.029);
      contacts.setMatrixAt(pin, transform);
    }
    port.add(contacts);
    const indicator = link.clone();
    owned.push(indicator);
    portIndicators.push(indicator);
    if (i === 7) {
      indicator.color.set("#26353c");
      indicator.emissive.set("#000000");
    }
    box(0.008, 0.006, 0.007, 0.023, 0.041, 0.016, indicator, port);
    const number = label(
      String(i + 1).padStart(2, "0"),
      0.08,
      0.035,
      "#bdc5ca",
      "#17252b",
      180,
    );
    number.position.set(0, -0.063, 0.024);
    port.add(number);
    targets.push(port);
  }
  const rackLabel = label(
    "ST-SW01   /   PATCH 01",
    1.03,
    0.13,
    "#c5e1d3",
    "#17252b",
    54,
  );
  rackLabel.position.set(0, 3.45, 0.57);
  rackLabel.userData.device = "rack";
  rackAssembly.add(rackLabel);
  targets.push(patch, rackLabel);
  for (let i = 0; i < 3; i++) {
    const x = -0.43 + i * 0.12;
    const endX = -0.39 + i * 0.105;
    const cableMaterial = material(["#426d93", "#c3a456", "#6b8d75"][i]);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 3.22, 0.665),
      new THREE.Vector3(x - 0.05, 3.04, 0.76 + i * 0.02),
      new THREE.Vector3(endX - 0.06, 2.82, 0.73 + i * 0.02),
      new THREE.Vector3(endX, 2.655, 0.6),
    ]);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, 0.009, 8, false),
      cableMaterial,
    );
    rackAssembly.add(mesh);
    for (const [cx, cy, cz] of [
      [x, 3.22, 0.65],
      [endX, 2.655, 0.58],
    ]) {
      box(0.049, 0.035, 0.045, cx, cy, cz, material("#a1adb0"), rackAssembly);
      box(0.037, 0.031, 0.035, cx, cy, cz + 0.03, cableMaterial, rackAssembly);
    }
  }
  let doorOpen = false,
    rackOpen = false;
  function update(dt: number) {
    portsDirty = false;
    const factor = 1 - Math.exp(-dt * 6);
    door.rotation.y = THREE.MathUtils.lerp(
      door.rotation.y,
      doorOpen ? -Math.PI * 0.51 : 0,
      factor,
    );
    rackDoor.rotation.y = THREE.MathUtils.lerp(
      rackDoor.rotation.y,
      rackOpen ? -Math.PI * 0.48 : 0,
      factor,
    );
  }
  function isAnimating() {
    return (
      portsDirty ||
      Math.abs(door.rotation.y - (doorOpen ? -Math.PI * 0.51 : 0)) > 0.001 ||
      Math.abs(rackDoor.rotation.y - (rackOpen ? -Math.PI * 0.48 : 0)) > 0.001
    );
  }
  return {
    targets,
    update,
    isAnimating,
    setDoor: (open: boolean) => {
      doorOpen = open;
    },
    setPorts: (states: boolean[]) => {
      portIndicators.forEach((m, i) => {
        m.color.set(states[i] ? "#4eac72" : "#26353c");
        m.emissive.set(states[i] ? "#4eac72" : "#000000");
      });
      portsDirty = true;
    },
    setRack: (open: boolean) => {
      rackOpen = open;
    },
    dispose: () => owned.forEach((m) => m.dispose()),
  };
}
