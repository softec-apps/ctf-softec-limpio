import { OSINT_BOARD_POSITION, OSINT_BOARD_YAW } from "../sceneLayout";
import * as THREE from "three";
import type { SceneResources } from "./SceneResources";

export function createOsintBoard(
  resources: SceneResources,
  invalidate: () => void = () => {},
) {
  const { scene, box, material, label } = resources;
  const group = new THREE.Group();
  group.position.fromArray(OSINT_BOARD_POSITION);
  group.rotation.y=OSINT_BOARD_YAW;
  group.userData.device = "osint-board";
  scene.add(group);
  const frame = material("#584330");
  const cork = material("#776548");
  const paper = material("#d8c59a");
  const seal = material("#855041");
  const solvedSeal = material("#5d9275");
  box(2.7, 1.45, 0.09, 0, 0, 0, frame, group);
  box(2.59, 1.33, 0.015, 0, 0, 0.055, cork, group);
  const title = label(
    "ARCHIVO DE INVESTIGACIONES / OSINT",
    2.35,
    0.17,
    "#eddfbd",
    "#42392d",
    46,
  );
  title.position.set(0, 0.55, 0.075);
  group.add(title);
  const targets: THREE.Object3D[] = [group];
  const envelopes: { id: string; root: THREE.Group; seal: THREE.Mesh }[] = [];
  for (let i = 0; i < 10; i++) {
    const id = `osint-${String(i + 1).padStart(2, "0")}`;
    const envelope = new THREE.Group();
    envelope.position.set(
      -1.02 + (i % 5) * 0.51,
      0.19 - Math.floor(i / 5) * 0.47,
      0.09,
    );
    envelope.rotation.z = i % 2 ? 0.025 : -0.025;
    envelope.userData = { device: "osint-board", documentId: id };
    group.add(envelope);
    box(0.43, 0.31, 0.018, 0, 0, 0, paper, envelope);
    const flap = new THREE.BufferGeometry();
    flap.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-0.215, 0.155, 0.013, 0, -0.015, 0.013, 0.215, 0.155, 0.013],
        3,
      ),
    );
    const flapMesh = new THREE.Mesh(flap, material("#bfad83"));
    envelope.add(flapMesh);
    const stamp = box(0.07, 0.07, 0.012, 0, -0.025, 0.02, seal, envelope);
    const number = label(
      `CASO ${String(i + 1).padStart(2, "0")}`,
      0.31,
      0.065,
      "#4b4231",
      "#d8c59a",
      55,
    );
    number.position.set(0, -0.115, 0.016);
    envelope.add(number);
    const pin = box(0.025, 0.025, 0.035, 0, 0.16, 0.02, seal, envelope);
    pin.rotation.z = 0.6;
    targets.push(envelope);
    envelopes.push({ id, root: envelope, seal: stamp });
  }
  return {
    targets,
    setCases(solved: string[], available: string[]) {
      for (const entry of envelopes) {
        entry.root.visible = available.includes(entry.id);
        entry.root.traverse((object) =>
          object.layers.set(available.includes(entry.id) ? 0 : 31),
        );
        entry.seal.material = solved.includes(entry.id) ? solvedSeal : seal;
      }
      invalidate();
    },
  };
}
