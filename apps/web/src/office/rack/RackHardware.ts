import * as THREE from "three";
import type { SceneResources } from "../SceneResources";

export function createRackHardware(
  resources: SceneResources,
  rack: THREE.Group,
) {
  const { box, material, glow, label } = resources;
  const steel = material("#5c6268", 0.35, 0.8);
  const graphite = material("#262c31", 0.62, 0.35);
  const recess = material("#090d10", 0.96, 0);
  const handle = material("#90989d", 0.28, 0.82);
  const green = glow("#73c888", 0.65);
  const amber = glow("#dfb760", 0.5);
  const blue = glow("#70adcb", 0.5);
  const screwGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 10);
  screwGeometry.rotateX(Math.PI / 2);
  const screwHead = new THREE.MeshStandardMaterial({
    color: "#929ca4",
    metalness: 0.88,
    roughness: 0.32,
  });
  resources.materials.push(screwHead);
  function screws(y: number, height: number) {
    for (const x of [-0.511, 0.511])
      for (const yy of [y - height * 0.3, y + height * 0.3]) {
        const mesh = new THREE.Mesh(screwGeometry, screwHead);
        mesh.position.set(x, yy, 0.535);
        rack.add(mesh);
        box(0.012, 0.002, 0.002, x, yy, 0.539, recess, rack);
      }
  }
  function text(
    text: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z = 0.537,
  ) {
    const mesh = label(
      text,
      w,
      h,
      "#c0c7ca",
      "#252c31",
      Math.min(150, Math.floor(930 / (text.length * 0.62))),
    );
    mesh.position.set(x, y, z);
    rack.add(mesh);
    return mesh;
  }
  function ventilation(
    x: number,
    y: number,
    width: number,
    height: number,
    columns: number,
    rows: number,
    z = 0.535,
  ) {
    const holes = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.006, 6),
      recess,
      columns * rows,
    );
    holes.userData.rackPanelY = y;
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        matrix.makeTranslation(
          x - width / 2 + ((column + 0.5) * width) / columns,
          y - height / 2 + ((row + 0.5) * height) / rows,
          z,
        );
        holes.setMatrixAt(index++, matrix);
      }
    rack.add(holes);
  }
  function chassis(name: string, y: number, height: number) {
    const body = box(1.035, height, 0.72, 0, y, 0.1, steel, rack);
    body.name = name;
    box(1.04, height - 0.018, 0.025, 0, y, 0.512, graphite, rack);
    for (const x of [-0.54, 0.54])
      box(0.055, height - 0.012, 0.035, x, y, 0.515, steel, rack);
    screws(y, height);
    return body;
  }
  function status(y: number) {
    box(0.014, 0.014, 0.007, 0.46, y + 0.028, 0.535, green, rack);
    box(0.014, 0.014, 0.007, 0.46, y, 0.535, blue, rack);
    box(0.025, 0.025, 0.012, 0.46, y - 0.039, 0.535, steel, rack);
  }
  function drive(x: number, y: number, w: number, h: number, index: number) {
    box(w, h, 0.018, x, y, 0.536, recess, rack);
    box(w - 0.009, h - 0.012, 0.014, x, y, 0.548, steel, rack);
    box(w - 0.03, 0.015, 0.012, x, y - h * 0.32, 0.561, handle, rack);
    box(
      0.008,
      0.008,
      0.008,
      x - w * 0.35,
      y + h * 0.27,
      0.561,
      index % 5 === 4 ? amber : green,
      rack,
    );
    ventilation(x, y + 0.01, w - 0.035, h * 0.35, 6, 2, 0.557);
  }
  // These devices have different physical layouts; identification is printed on the chassis.
  chassis("access-switch", 2.67, 0.2);
  text("ST-SW01  |  ACCESS", 0.38, 0.04, -0.27, 2.73);
  for (let i = 0; i < 8; i++) {
    const x = -0.39 + i * 0.105;
    box(0.074, 0.065, 0.014, x, 2.655, 0.534, steel, rack);
    box(0.058, 0.046, 0.012, x, 2.658, 0.546, recess, rack);
    box(0.033, 0.008, 0.012, x, 2.64, 0.552, handle, rack);
    box(0.008, 0.008, 0.006, x - 0.018, 2.695, 0.55, green, rack);
  }
  ventilation(0.44, 2.67, 0.06, 0.09, 3, 5);
  for (const [number, y] of [
    [1, 2.18],
    [2, 1.87],
  ]) {
    chassis(`compute-server-${number}`, y, 0.235);
    text(`ST-SRV0${number}`, 0.18, 0.035, -0.38, y + 0.075);
    for (let driveIndex = 0; driveIndex < 4; driveIndex++)
      drive(-0.28 + driveIndex * 0.17, y - 0.018, 0.148, 0.124, driveIndex);
    ventilation(0.34, y, 0.1, 0.14, 5, 7);
    status(y);
  }
  chassis("storage-array", 1.4, 0.48);
  text("ST-NAS01  /  STORAGE", 0.45, 0.04, -0.17, 1.59);
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 4; col++)
      drive(-0.34 + col * 0.21, 1.47 - row * 0.17, 0.185, 0.145, row * 4 + col);
  status(1.4);
  chassis("power-backup", 0.6, 0.46);
  ventilation(-0.2, 0.61, 0.5, 0.3, 24, 12);
  const display = box(
    0.21,
    0.12,
    0.008,
    0.25,
    0.64,
    0.537,
    material("#101e23", 0.23, 0.25),
    rack,
  );
  display.name = "ups-display";
  const screen = label(
    "230 V  /  ONLINE",
    0.185,
    0.045,
    "#80b2aa",
    "#101e23",
    85,
  );
  screen.position.set(0.25, 0.65, 0.545);
  rack.add(screen);
  text("UPS  /  ST-PWR01", 0.22, 0.033, 0.24, 0.755);
  box(0.026, 0.026, 0.012, 0.39, 0.64, 0.548, steel, rack);
  box(0.012, 0.012, 0.008, 0.39, 0.7, 0.548, green, rack);
  text("ST-RTR01 / GATEWAY", 0.45, 0.04, 0, 2.96, 0.515);
  // Service blanks keep the airflow route visible between occupied rack units.
  for (const [y, h] of [
    [2.96, 0.16],
    [2.4, 0.13],
    [1.005, 0.18],
  ]) {
    box(1.04, h, 0.023, 0, y, 0.49, graphite, rack);
    ventilation(0, y, 0.85, h * 0.6, 36, 3, 0.505);
  }
  text("DEVOPS / BUILDLAB", 0.62, 0.055, 0, 1.005, 0.54);
  // The visible chassis and its controls open the corresponding simulated device.
  for (const object of rack.children) {
    const y = object.userData.rackPanelY ?? object.position.y;
    if (y > 1.13 && y < 1.67) {
      object.userData.device = "database-nas";
      continue;
    }
    if (y > 0.9 && y < 1.11) {
      object.userData.device = "devops-node";
      continue;
    }
    const id =
      y > 2.56 && y < 2.79
        ? "sw1"
        : y > 2.05 && y < 2.31
          ? "dns1"
          : y > 1.74 && y < 2.0
            ? "files1"
            : y > 2.87 && y < 3.06
              ? "r1"
              : undefined;
    if (id)
      object.userData = {
        device: "rack",
        fixtureAction: "network-device",
        networkDevice: id,
      };
  }
  return { steel, graphite, recess, text, ventilation };
}
