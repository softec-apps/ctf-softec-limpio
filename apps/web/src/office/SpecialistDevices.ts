import * as THREE from "three";
import { SPECIALIST_STATIONS } from "../../../../packages/specialist-contracts";
import type { SceneResources } from "./SceneResources";
export function createSpecialistDevices(resources: SceneResources) {
  const { box, material, label } = resources;
  const shell = material("#17242d", 0.38, 0.5),
    edge = material("#899899", 0.3, 0.7),
    screen = material("#0c2027", 0.4),
    accent = material("#5a9f99", 0.45, 0.3);
  return SPECIALIST_STATIONS.filter(
    (station) => !["database-nas", "devops-node"].includes(station.id),
  ).map((station) => {
    const root = new THREE.Group();
    root.position.fromArray(station.position);
    root.rotation.y = station.yaw;
    root.userData.device = station.id;
    resources.scene.add(root);
    if (station.id === "api-kiosk") {
      box(0.9, 0.08, 0.75, 0, 0.05, 0, shell, root);
      box(0.3, 1.2, 0.2, 0, 0.68, -0.1, edge, root);
      box(0.94, 1.25, 0.16, 0, 1.78, 0, shell, root);
      box(0.82, 1.08, 0.02, 0, 1.8, 0.091, screen, root);
      box(0.28, 0.04, 0.03, 0, 1.22, 0.1, accent, root);
      const face = label(
        "SEVENTECH\nSERVICES / API\n10 EXPEDIENTES",
        0.72,
        0.45,
        "#a7d8d4",
        "#0c2027",
        48,
      );
      face.position.set(0, 1.86, 0.108);
      root.add(face);
    } else if (station.id === "quarantine") {
      box(1.15, 0.08, 0.85, 0, 1.08, 0, edge, root);
      for (const x of [-0.48, 0.48])
        box(0.08, 1.05, 0.65, x, 0.54, 0, shell, root);
      box(0.8, 0.53, 0.1, 0, 1.72, -0.1, shell, root);
      box(0.08, 0.35, 0.1, 0, 1.3, -0.1, edge, root);
      box(0.7, 0.02, 0.28, 0, 1.14, 0.22, shell, root);
      box(0.23, 0.4, 0.45, 0.4, 1.32, -0.04, shell, root);
      box(0.14, 0.02, 0.01, 0.4, 1.48, 0.195, accent, root);
      const face = label(
        "Q-LAB\nANALISIS ESTATICO\nMUESTRAS INERTES",
        0.72,
        0.4,
        "#d7c99c",
        "#111e28",
        43,
      );
      face.position.set(0, 1.72, -0.04);
      root.add(face);
    } else if (station.id === "soc") {
      box(2.05, 1.12, 0.1, 0, 0, 0, shell, root);
      box(1.91, 1, 0.025, 0, 0, 0.065, screen, root);
      const face = label(
        "SEVENTECH / SOC\n10 CASOS DE RESPUESTA\nEVIDENCIAS PRESERVADAS",
        1.7,
        0.65,
        "#98c9d2",
        "#0c2027",
        45,
      );
      face.position.z = 0.085;
      root.add(face);
      box(0.035, 0.02, 0.01, 0.88, -0.49, 0.085, accent, root);
    } else if (station.id === "cloud-tablet") {
      box(0.78, 1.08, 0.06, 0, 0, 0, edge, root);
      box(0.7, 0.96, 0.015, 0, 0.015, 0.038, screen, root);
      box(0.3, 0.04, 0.08, 0, -0.55, -0.02, shell, root);
      const face = label(
        "CLOUD / LAB\nIDENTIDADES\nY RECURSOS",
        0.61,
        0.52,
        "#a9d8e8",
        "#0c2027",
        46,
      );
      face.position.set(0, 0.05, 0.05);
      root.add(face);
    } else if (station.id === "ai-assistant") {
      resources.cylinder(0.18, 0.42, 0, 0.23, 0, shell, root);
      resources.cylinder(0.185, 0.025, 0, 0.45, 0, accent, root);
      const face = label("AGENT\nLAB", 0.22, 0.15, "#c3ded3", "#17242d", 50);
      face.position.set(0, 0.26, 0.184);
      root.add(face);
    } else if (station.id === "wireless-ap") {
      resources.cylinder(0.38, 0.13, 0, 0, 0, edge, root);
      box(0.4, 0.14, 0.3, 0, 0.12, 0, shell, root);
      box(0.09, 0.012, 0.025, 0, -0.073, 0.18, accent, root);
      const face = label("RADIOLAB / AX", 0.45, 0.12, "#254452", "#899899", 43);
      face.position.set(0, -0.071, -0.05);
      face.rotation.x = Math.PI / 2;
      root.add(face);
    } else if (station.id === "memory-unit") {
      box(0.48, 0.24, 0.32, 0, 0.14, 0, shell, root);
      box(0.4, 0.03, 0.22, 0, 0.27, 0, edge, root);
      for (const x of [-0.13, 0, 0.13])
        box(0.065, 0.035, 0.02, x, 0.1, 0.17, accent, root);
      const face = label(
        "RAMLAB\nACQUISITION",
        0.36,
        0.11,
        "#a8d4c8",
        "#17242d",
        40,
      );
      face.position.set(0, 0.2, 0.166);
      root.add(face);
    } else if (station.id === "contract-wallet") {
      box(0.42, 0.16, 0.24, 0, 0.09, 0, shell, root);
      box(0.23, 0.09, 0.02, -0.04, 0.12, 0.13, screen, root);
      for (const x of [-0.15, 0.15])
        box(0.04, 0.03, 0.03, x, 0.06, 0.14, edge, root);
      const face = label("CHAINLAB", 0.22, 0.06, "#b4d7ca", "#0c2027", 44);
      face.position.set(-0.04, 0.12, 0.145);
      root.add(face);
    } else {
      box(0.32, 0.55, 0.1, 0, 0, 0, shell, root);
      box(0.26, 0.2, 0.02, 0, 0.1, 0.061, screen, root);
      box(0.17, 0.12, 0.015, 0, -0.12, 0.064, accent, root);
      const face = label(
        "PACS\nSEVENTECH",
        0.23,
        0.13,
        "#a7d8d4",
        "#0c2027",
        52,
      );
      face.position.set(0, 0.11, 0.08);
      root.add(face);
    }
    return root;
  });
}
