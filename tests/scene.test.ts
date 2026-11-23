import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PerspectiveCamera,
  Vector3,
  Scene,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
  Box3,
  Ray,
} from "three";
import {
  RACK_POSITION,
  OT_POSITION,
  ARCHIVE_POSITION,
  NOTEBOOK_POSITION,
  PHONE_POSITION,
  DESK_Z,
  BOOKSHELF_POSITION,
  boardNotePosition,
} from "../apps/web/src/sceneLayout";
import { createDrawerTray } from "../apps/web/src/drawerGeometry";
import { sceneObjects } from "../apps/api/src/scene-objects";
import {
  SCREEN_W,
  SCREEN_H,
  SCREEN_Y,
  SCREEN_Z,
  computerDistance,
} from "../apps/web/src/worldGeometry";

test("el monitor completo queda dentro de la cámara al acercarse, en escritorio y móvil", () => {
  for (const [w, h] of [
    [1920, 1080],
    [1366, 768],
    [1280, 1024],
    [390, 844],
    [768, 1024],
  ]) {
    const camera = new PerspectiveCamera(45, w / h, 0.05, 70);
    camera.position.set(0, SCREEN_Y, SCREEN_Z + computerDistance(w / h));
    camera.lookAt(0, SCREEN_Y, SCREEN_Z);
    camera.updateMatrixWorld();
    for (const x of [-SCREEN_W / 2, SCREEN_W / 2])
      for (const y of [-SCREEN_H / 2, SCREEN_H / 2]) {
        const p = new Vector3(x, SCREEN_Y + y, SCREEN_Z).project(camera);
        assert.ok(Math.abs(p.x) < 0.92, `monitor fuera del ancho en ${w}x${h}`);
        assert.ok(
          Math.abs(p.y) < 0.84,
          `monitor fuera de la altura en ${w}x${h}`,
        );
        assert.ok(p.z > -1 && p.z < 1);
      }
  }
});
test("el rack no intercepta ninguna nota desde la vista del tablón ni desde la entrada", () => {
  const rackBounds = new Box3().setFromCenterAndSize(
    new Vector3(...RACK_POSITION).add(new Vector3(0.045, 1.75, 0)),
    new Vector3(0.99, 3.5, 1.25),
  );
  for (const eye of [
    new Vector3().fromArray(
      sceneObjects.find((o) => o.id === "noticeboard")!.eye,
    ),
    new Vector3(WALK_START.x, WALK_EYE_HEIGHT, WALK_START.z),
  ])
    for (let i = 0; i < 6; i++)
      for (const x of [-0.24, 0, 0.24])
        for (const y of [-0.21, 0, 0.21]) {
          const point = new Vector3(...boardNotePosition(i)).add(
            new Vector3(x, y, 0),
          );
          const ray = new Ray(
            eye,
            new Vector3().subVectors(point, eye).normalize(),
          );
          const hit = ray.intersectBox(rackBounds, new Vector3());
          assert.ok(
            !hit || hit.distanceTo(eye) > point.distanceTo(eye),
            `rack oculta la nota ${i + 1}`,
          );
        }
});
test("cada cajón tiene fondo continuo y paredes cerradas al abrirse y cerrarse", () => {
  const material = new MeshBasicMaterial();
  for (let i = 0; i < 3; i++) {
    const drawer = createDrawerTray(i, {
      front: material,
      inside: material,
      handle: material,
    });
    for (const zOffset of [0.1, 0.86]) {
      drawer.position.z = zOffset;
      drawer.updateMatrixWorld(true);
      for (const x of [-0.4, 0, 0.4])
        for (const z of [-0.29, 0, 0.29]) {
          const origin = drawer.localToWorld(new Vector3(x, 0.25, z));
          const rc = new Raycaster(origin, new Vector3(0, -1, 0));
          const hits = rc.intersectObject(drawer, true);
          assert.equal(hits[0]?.object.name, "drawer-bottom");
        }
      for (const [direction, name] of [
        [new Vector3(0, 0, -1), "drawer-back"],
        [new Vector3(-1, 0, 0), "drawer-left"],
        [new Vector3(1, 0, 0), "drawer-right"],
        [new Vector3(0, 0, 1), "drawer-front"],
      ] as const) {
        const rc = new Raycaster(
          drawer.localToWorld(new Vector3(0, 0, 0)),
          direction,
        );
        assert.equal(rc.intersectObject(drawer, true)[0]?.object.name, name);
      }
    }
    drawer.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
  }
  material.dispose();
});
test("la selección de un componente del monitor identifica el dispositivo de la escena", () => {
  const scene = new Scene();
  const monitor = new Mesh(
    new BoxGeometry(SCREEN_W, SCREEN_H, 0.1),
    new MeshBasicMaterial(),
  );
  monitor.position.set(0, SCREEN_Y, SCREEN_Z);
  monitor.userData.device = "computer";
  scene.add(monitor);
  scene.updateMatrixWorld();
  const camera = new PerspectiveCamera(45, 16 / 9, 0.05, 70);
  camera.position.set(0, SCREEN_Y, SCREEN_Z + computerDistance(16 / 9));
  camera.lookAt(monitor.position);
  camera.updateMatrixWorld();
  const rc = new Raycaster();
  rc.setFromCamera(new Vector2(0, 0), camera);
  const hits = rc.intersectObjects(scene.children, true);
  assert.equal(hits[0]?.object.userData.device, "computer");
  monitor.geometry.dispose();
  monitor.material.dispose();
});

import {
  WALK_START,
  WALK_EYE_HEIGHT,
  movePlayer,
  walkable,
} from "../apps/web/src/roomNavigation";
import { createRoomFixtures } from "../apps/web/src/RoomFixtures";

test("el centro queda libre y la marcha bloquea los muebles perimetrales y las paredes", () => {
  for (const [x, z] of [
    [3.85, 4.5],
    [5.8, 1],
    [5.8, -2.5],
    [0, 0],
    [0, -1],
    [-3.7, -2.5],
    [-2.8, 2],
    [0, 4.5],
  ])
    assert.ok(walkable(x, z, false));
  for (const [x, z] of [
    [0, DESK_Z],
    [BOOKSHELF_POSITION[0], BOOKSHELF_POSITION[2]],
    [ARCHIVE_POSITION[0], ARCHIVE_POSITION[2]],
    [7, 2],
    [-6, 2],
    [0, -4.5],
    [0, 6.2],
  ])
    assert.equal(walkable(x, z, true), false);
  const p = movePlayer({ x: 3.3, z: DESK_Z }, Math.PI / 2, 1, 0, 0.05, false);
  assert.equal(p.x, 3.3);
  assert.ok(walkable(WALK_START.x, WALK_START.z, false));
  assert.ok(WALK_START.z < 6);
});

test("el acceso al vestíbulo requiere abrir la puerta y respeta sus límites", () => {
  assert.equal(walkable(3.8, 6.2, false), false);
  assert.ok(walkable(3.8, 6.2, true));
  assert.ok(walkable(3.8, 7.9, true));
  assert.equal(walkable(3.8, 8.3, true), false);
  assert.equal(walkable(4.6, 6.4, true), false);
});

test("caminar mantiene velocidad diagonal y permite cualquier orientación", () => {
  const origin = { x: 3.85, z: 4.5 };
  for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 4]) {
    const straight = movePlayer(origin, yaw, 1, 0, 0.04, false);
    const diagonal = movePlayer(origin, yaw, 1, 1, 0.04, false);
    assert.ok(
      Math.abs(
        Math.hypot(straight.x - origin.x, straight.z - origin.z) - 0.094,
      ) < 1e-8,
    );
    assert.ok(
      Math.abs(
        Math.hypot(diagonal.x - origin.x, diagonal.z - origin.z) - 0.094,
      ) < 1e-8,
    );
  }
});

test("la puerta tiene apertura real y el rack ofrece ocho puertos seleccionables", () => {
  const scene = new Scene();
  const material = new MeshBasicMaterial();
  const fixtures = createRoomFixtures(
    scene,
    { wall: material, metal: material, edge: material, dark: material },
    () => new Mesh(new BoxGeometry(0.1, 0.1, 0.01), material),
  );
  const rc = new Raycaster(new Vector3(3.8, 1.5, 5), new Vector3(0, 0, 1));
  const device = (object: any): string | undefined =>
    object?.userData.device ??
    (object?.parent ? device(object.parent) : undefined);
  scene.updateMatrixWorld(true);
  assert.equal(
    device(rc.intersectObjects(scene.children, true)[0].object),
    "door",
  );
  fixtures.setDoor(true);
  fixtures.setRack(true);
  for (let i = 0; i < 100; i++) fixtures.update(0.1);
  scene.updateMatrixWorld(true);
  const hits = rc.intersectObjects(scene.children, true);
  assert.notEqual(device(hits[0].object), "door");
  assert.ok(hits[0].distance > 2);
  assert.equal(fixtures.targets.filter((o) => o.userData.port).length, 8);
  assert.equal(fixtures.isAnimating(), false);
  fixtures.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) o.geometry.dispose();
  });
  material.dispose();
});

import { createSceneResources } from "../apps/web/src/office/SceneResources";
import { createServerRack } from "../apps/web/src/office/ServerRack";
import type { OfficePalette } from "../apps/web/src/office/officePalette";
test("el rack detallado conserva los ocho blancos y cabe completo en la cámara", () => {
  const scene = new Scene();
  const resources = createSceneResources(scene);
  const material = resources.material("#454b50");
  const label = () => new Mesh(new BoxGeometry(0.02, 0.02, 0.001), material);
  const rack = createServerRack({ ...resources, label }, {
    edge: material,
  } as OfficePalette);
  const fixtures = createRoomFixtures(
    scene,
    { wall: material, metal: material, edge: material, dark: material },
    label,
  );
  fixtures.setRack(true);
  for (let i = 0; i < 100; i++) fixtures.update(0.1);
  scene.updateMatrixWorld(true);
  const targets = [rack, ...fixtures.targets];
  const ports = fixtures.targets.filter((o) => o.userData.port);
  for (const port of ports) {
    const center = port.getWorldPosition(new Vector3());
    const ray = new Raycaster(
      center.clone().add(new Vector3(2, 0, 0)),
      new Vector3(-1, 0, 0),
    );
    const hit = ray.intersectObjects(targets, true)[0];
    let action: any = hit?.object;
    while (action && action.userData.port === undefined) action = action.parent;
    assert.equal(
      action?.userData.port,
      port.userData.port,
      `El puerto ${port.userData.port} queda oculto por la nueva geometría`,
    );
  }
  const record = sceneObjects.find((o) => o.id === "rack")!;
  const bounds = new Box3().setFromObject(rack);
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ]) {
    const camera = new PerspectiveCamera(45, width / height, 0.05, 70);
    camera.position.fromArray(record.eye);
    camera.lookAt(new Vector3().fromArray(record.look));
    camera.updateMatrixWorld(true);
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const p = new Vector3(x, y, z).project(camera);
          assert.ok(
            Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95,
            `El gabinete sale del encuadre ${width}x${height}: ${p.x},${p.y}`,
          );
        }
  }
  assert.ok(rack.getObjectByName("storage-array"));
  assert.ok(rack.getObjectByName("power-backup"));
  assert.ok(rack.getObjectByName("access-switch"));
  fixtures.dispose();
  resources.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) o.geometry.dispose();
  });
});

import { createBookshelf } from "../apps/web/src/office/Bookshelf";
import { REFERENCE_BOOKS } from "../apps/api/src/library/catalog";
import { REFERENCE_CATEGORIES } from "../apps/web/src/library/categories";
test("un libro por categoría y Relatos en clave conservan blancos independientes", () => {
  const scene = new Scene(),
    resources = createSceneResources(scene),
    material = resources.material("#405163");
  const label = (..._args: unknown[]) =>
    new Mesh(new BoxGeometry(0.4, 0.12, 0.001), material);
  const shelf = createBookshelf({ ...resources, label }, {
    metal: material,
    edge: material,
  } as OfficePalette);
  scene.updateMatrixWorld(true);
  const ids = new Set(
    shelf.targets
      .filter((t) => t.userData.device === "library")
      .map((t) => t.userData.documentId),
  );
  assert.equal(ids.size, 25);
  assert.deepEqual(
    REFERENCE_CATEGORIES,
    REFERENCE_BOOKS.map((book) => book.category),
  );
  assert.deepEqual([...ids], [...REFERENCE_BOOKS.map((b) => b.id)]);
  assert.equal(
    shelf.targets.filter((t) => t.userData.device === "crypto-book").length,
    2,
  );
  const eye = new Vector3().fromArray(
    sceneObjects.find((o) => o.id === "library")!.eye,
  );
  for (const target of shelf.targets.filter((_, index) => index % 2 === 1)) {
    const point = target.getWorldPosition(new Vector3()),
      ray = new Raycaster(eye, point.clone().sub(eye).normalize()),
      hit = ray
        .intersectObject(shelf.root, true)
        .find((hit) => hit.object.userData.device);
    assert.ok(hit);
    assert.equal(hit!.object.userData.device, target.userData.device);
    assert.equal(hit!.object.userData.documentId, target.userData.documentId);
  }
  resources.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) o.geometry.dispose();
  });
});

import { createIndustrialCabinet } from "../apps/web/src/office/IndustrialCabinet";
import { initialOtState, otView } from "../apps/api/src/ot/state";
test("el control industrial es seleccionable y solo anima ventilación mientras se observa", () => {
  const scene = new Scene(),
    resources = createSceneResources(scene),
    surface = resources.material("#55666b");
  const label = () => new Mesh(new BoxGeometry(0.3, 0.06, 0.001), surface);
  let illuminated = true,
    redraws = 0;
  const cabinet = createIndustrialCabinet(
    { ...resources, label },
    () => redraws++,
    (on) => {
      illuminated = on;
    },
  );
  scene.updateMatrixWorld(true);
  const object = sceneObjects.find((o) => o.id === "ot")!,
    eye = new Vector3().fromArray(object.eye),
    look = new Vector3().fromArray(object.look);
  assert.ok(
    new Raycaster(eye, look.sub(eye).normalize()).intersectObject(
      cabinet.root,
      true,
    ).length > 0,
  );
  assert.equal(cabinet.root.userData.device, "ot");
  assert.equal(walkable(OT_POSITION[0], OT_POSITION[2], false), false);
  assert.equal(walkable(5.8, OT_POSITION[2], false), true);
  const view = otView(initialOtState(), 0);
  cabinet.apply({ ...view, lightOn: false });
  assert.equal(illuminated, false);
  assert.equal(cabinet.isAnimating("ot"), true);
  assert.equal(cabinet.isAnimating("room"), false);
  assert.equal(cabinet.isAnimating("computer"), false);
  cabinet.apply({ ...view, fanRunning: false, lightOn: true });
  assert.equal(illuminated, true);
  assert.equal(cabinet.isAnimating("ot"), false);
  assert.equal(redraws, 2);
  resources.dispose();
});

test("la entrada comunica con las zonas de trabajo, lectura, equipos e investigación", () => {
  const step = 0.2,
    toGrid = (x: number, z: number) => [
      Math.round((x + 5.6) / step),
      Math.round((z + 4) / step),
    ],
    key = (x: number, z: number) => x + "," + z;
  const start = toGrid(WALK_START.x, WALK_START.z),
    queue = [start],
    visited = new Set([key(start[0], start[1])]);
  for (let at = 0; at < queue.length; at++) {
    const [x, z] = queue[at];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        position = key(nx, nz);
      if (
        visited.has(position) ||
        !walkable(-5.6 + nx * step, -4 + nz * step, false)
      )
        continue;
      visited.add(position);
      queue.push([nx, nz]);
    }
  }
  for (const [x, z] of [
    [0, 3.5],
    [-4.15, -2.35],
    [-4.0, 0.1],
    [5.4, -2.35],
    [5.55, 1],
    [4.4, 3.9],
    [4.9, 0.9],
    [0, -1.3],
    [-4, 2.15],
    [-4, 4.4],
    [5.4, 0],
    [4.5, 3.3],
  ]) {
    const target = toGrid(x, z);
    assert.ok(
      visited.has(key(target[0], target[1])),
      `No hay recorrido hasta ${x},${z}`,
    );
  }
});

import { SPECIALIST_STATIONS } from "../packages/specialist-contracts";
import { createSpecialistDevices } from "../apps/web/src/office/SpecialistDevices";
test("las once estaciones tienen blancos físicos y sus muebles no bloquean la entrada", () => {
  const scene = new Scene(),
    resources = createSceneResources(scene),
    surface = resources.material("#14303b");
  const label = () => new Mesh(new BoxGeometry(0.2, 0.1, 0.001), surface);
  const roots = createSpecialistDevices({ ...resources, label });
  const rack = createServerRack({ ...resources, label }, {
    edge: surface,
  } as OfficePalette);
  const targets = [...roots, rack];
  scene.updateMatrixWorld(true);
  const physicalIds = new Set<string>();
  scene.traverse((object) => {
    if (
      SPECIALIST_STATIONS.some(
        (station) => station.id === object.userData.device,
      )
    )
      physicalIds.add(object.userData.device);
  });
  assert.equal(physicalIds.size, 11);
  for (const station of SPECIALIST_STATIONS) {
    const target = new Vector3().fromArray(station.look);
    const eye = new Vector3().fromArray(station.eye),
      ray = new Raycaster(eye, target.clone().sub(eye).normalize());
    const hit = ray.intersectObjects(targets, true)[0];
    assert(hit, station.id);
    let object = hit.object;
    while (object.parent && !object.userData.device) object = object.parent;
    assert.equal(object.userData.device, station.id);
    if (["api-kiosk", "quarantine"].includes(station.id))
      assert.equal(
        walkable(station.position[0], station.position[2], false),
        false,
      );
  }
  assert(walkable(WALK_START.x, WALK_START.z, false));
  resources.dispose();
});

test("los dispositivos de mesa dejan libres el cuaderno y el teléfono", () => {
  const scene = new Scene(),
    resources = createSceneResources(scene),
    surface = resources.material("#14303b");
  const roots = createSpecialistDevices({
    ...resources,
    label: () => new Mesh(new BoxGeometry(0.2, 0.1, 0.001), surface),
  });
  scene.updateMatrixWorld(true);
  const deskDevices = roots.filter((root) =>
    ["ai-assistant", "memory-unit", "contract-wallet"].includes(
      root.userData.device,
    ),
  );
  const notebook = new Box3().setFromCenterAndSize(
    new Vector3(...NOTEBOOK_POSITION).add(new Vector3(0, 0.04, 0)),
    new Vector3(1.32, 0.1, 0.94),
  );
  const phone = new Box3().setFromCenterAndSize(
    new Vector3(...PHONE_POSITION),
    new Vector3(0.5, 0.1, 0.75),
  );
  for (const root of deskDevices) {
    const bounds = new Box3().setFromObject(root);
    assert(
      !bounds.intersectsBox(notebook),
      root.userData.device + " invade el cuaderno",
    );
    assert(
      !bounds.intersectsBox(phone),
      root.userData.device + " invade el teléfono",
    );
    for (const other of deskDevices)
      if (root !== other)
        assert(
          !bounds.intersectsBox(new Box3().setFromObject(other)),
          root.userData.device + " invade " + other.userData.device,
        );
  }
  resources.dispose();
});

test("las estaciones presentan su cara operativa hacia el interior y sus cámaras", () => {
  const viewer = new Vector3(0.5, 2.3, 1);
  for (const station of SPECIALIST_STATIONS) {
    if (["wireless-ap", "badge-reader"].includes(station.id)) continue;
    const toward = viewer.clone().sub(new Vector3(...station.position));
    toward.y = 0;
    toward.normalize();
    const front = new Vector3(Math.sin(station.yaw), 0, Math.cos(station.yaw));
    assert(front.dot(toward) > 0.4, station.id + " presenta el reverso");
    const eyeDirection = new Vector3(...station.eye).sub(
      new Vector3(...station.position),
    );
    eyeDirection.y = 0;
    assert(
      front.dot(eyeDirection.normalize()) > 0.4,
      station.id + " presenta el reverso a su cámara",
    );
  }
});

test("el área central permanece transitable sin muebles decorativos", () => {
  for (let x = -3; x <= 3; x += 0.25)
    for (let z = -1.25; z <= 4.75; z += 0.25)
      assert(walkable(x, z, false), `Obstáculo en el centro: ${x},${z}`);
});
