import { BoxGeometry, Group, Mesh, type Material } from "three";
export function createDrawerTray(
  index: number,
  materials: { front: Material; inside: Material; handle: Material },
) {
  const group = new Group();
  group.position.set(0, 0.43 - index * 0.43, 0.1);
  group.userData = { device: "archive", drawer: index };
  function part(
    name: string,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: Material,
  ) {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  part("drawer-front", 0.92, 0.38, 0.05, 0, 0, 0.37, materials.front);
  part("drawer-handle", 0.28, 0.04, 0.055, 0, 0.02, 0.415, materials.handle);
  part("drawer-bottom", 0.86, 0.035, 0.72, 0, -0.1775, 0.005, materials.inside);
  part(
    "drawer-left",
    0.025,
    0.33,
    0.72,
    -0.4375,
    -0.005,
    0.005,
    materials.inside,
  );
  part(
    "drawer-right",
    0.025,
    0.33,
    0.72,
    0.4375,
    -0.005,
    0.005,
    materials.inside,
  );
  part("drawer-back", 0.89, 0.33, 0.035, 0, -0.005, -0.35, materials.inside);
  return group;
}
