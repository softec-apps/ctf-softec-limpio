import * as THREE from "three";
import { createAudience } from "./createAudience";
import { createPodiumFigure } from "./createPodiumFigure";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createSceneResources } from "../office/SceneResources";
import {
  paintMainScreen,
  paintSideScreen,
  paintPodium,
  type AuditoriumDisplay,
} from "./paintAuditorium";

export type AuditoriumView = "sala" | "pantalla" | "podio";
export function createAuditorium(container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    "aria-label",
    "Auditorio 3D de Seventech CTF. Usa los botones de vista para acercarte al escenario, marcador o podio.",
  );
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b1b27");
  scene.fog = new THREE.Fog("#0b1b27", 38, 75);
  const resources = createSceneResources(scene);
  const { box, cylinder, material, glow } = resources;
  const navy = material("#193443"),
    wall = material("#243d4b"),
    wood = material("#705443", 0.8, 0),
    metal = material("#152934", 0.4, 0.65),
    fabric = material("#376b77", 0.95, 0),
    trim = glow("#9ac8b6", 0.7),
    gold = material("#cfa264", 0.35, 0.6);
  scene.add(new THREE.HemisphereLight("#c3e5f2", "#534539", 2.3));
  const front = new THREE.DirectionalLight("#fff1d5", 3.2);
  front.position.set(-8, 13, 10);
  scene.add(front);
  const back = new THREE.DirectionalLight("#91cbe0", 2);
  back.position.set(8, 10, -8);
  scene.add(back);
  box(34, 0.25, 39, 0, -0.2, 5, navy);
  box(34, 14, 0.4, 0, 6.8, -11.4, wall);
  box(0.4, 14, 38, -17, 6.8, 7, wall);
  box(0.4, 14, 38, 17, 6.8, 7, wall);
  box(34, 0.35, 39, 0, 14, 5, navy);
  for (const side of [-1, 1]) {
    for (let z = -9; z < 24; z += 2.4) {
      box(0.18, 8.5, 1.3, side * 16.7, 5.9, z, navy);
      box(0.2, 8.8, 0.08, side * 16.5, 5.9, z + 0.8, wood);
      box(0.12, 0.06, 1.8, side * 16.4, 1.1, z, trim);
    }
  }
  box(30, 0.8, 11, 0, 0.4, -5.5, wood);
  box(30, 0.1, 0.09, 0, 0.76, 0.03, trim);
  for (let step = 0; step < 3; step++)
    box(
      8.4,
      0.18 + step * 0.2,
      0.55,
      0,
      (0.18 + step * 0.2) / 2,
      1.6 - step * 0.55,
      wood,
    );
  for (const side of [-1, 1]) {
    box(0.6, 12.2, 1, side * 9.9, 6.9, -10, navy);
    box(0.06, 11.8, 0.1, side * 9.55, 6.9, -9.42, trim);
    box(0.85, 11.8, 0.7, side * 15.5, 6.7, -10, metal);
    for (let i = 0; i < 7; i++)
      box(0.95, 0.85, 1.2, side * 15.4, 1.6 + i * 0.9, -7, metal);
  }
  box(20.4, 0.55, 0.9, 0, 13, -10, navy);
  box(19.8, 0.06, 0.06, 0, 12.65, -9.5, trim);
  const brand = resources.label(
    "Seventech CTF",
    9.5,
    1.1,
    "#e5ba73",
    "#193443",
    68,
  );
  brand.position.set(0, 13.1, -9.4);
  scene.add(brand);

  function screen(
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    pixels: [number, number],
    yaw = 0,
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = yaw;
    scene.add(group);
    box(width + 0.22, height + 0.22, 0.23, 0, 0, -0.08, metal, group);
    const canvas = document.createElement("canvas");
    [canvas.width, canvas.height] = pixels;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar el marcador.");
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    resources.textures.push(texture);
    const surface = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false,
    });
    resources.materials.push(surface);
    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.z = 0.05;
    group.add(mesh);
    return { ctx, texture, mesh };
  }
  const main = screen(18.5, 10.4, 0, 7.1, -10.05, [2048, 1152]);
  const stats = screen(4.2, 7, -12.5, 6.5, -9.7, [768, 1280], 0.12);
  const activity = screen(4.2, 7, 12.5, 6.5, -9.7, [768, 1280], -0.12);
  const winners = [
    { position: 2, x: -3.5, height: 0.85 },
    { position: 1, x: 0, height: 1.35 },
    { position: 3, x: 3.5, height: 0.55 },
  ].map(({ position, x, height }) => {
    box(
      3.1,
      height,
      2,
      x,
      0.8 + height / 2,
      -2.2,
      position === 1 ? gold : navy,
    );
    box(3.13, 0.06, 2.03, x, 0.82 + height, -2.2, position === 1 ? gold : trim);
    createPodiumFigure(resources, position, x, 0.85 + height);
    const plate = screen(
      3,
      Math.min(0.8, height + 0.1),
      x,
      0.8 + height / 2,
      -1.14,
      [1024, 384],
    );
    return { ...plate, position };
  });
  const lectern = new THREE.Group();
  lectern.position.set(-11.5, 0.8, -2.5);
  scene.add(lectern);
  box(1.2, 1.4, 0.8, 0, 0.7, 0, navy, lectern);
  const top = box(1.7, 0.12, 1.2, 0, 1.5, 0, wood, lectern);
  top.rotation.x = 0.12;
  cylinder(0.035, 0.65, 0, 1.9, 0, metal, lectern);

  // Shared geometries keep the rows of upholstered seats inexpensive to draw.
  const seats: THREE.Matrix4[] = [];
  for (let row = 0; row < 7; row++) {
    const z = 3.6 + row * 2.2,
      rise = row * 0.16;
    box(31.5, 0.15 + rise, 2.15, 0, (0.15 + rise) / 2, z + 0.4, navy);
    for (const side of [-1, 1]) {
      box(0.08, 0.025, 1.7, side * 1.55, 0.18 + rise, z + 0.4, trim);
      for (let seat = 0; seat < 8; seat++)
        seats.push(
          new THREE.Matrix4().makeTranslation(
            side * (2.5 + seat * 1.6),
            rise,
            z,
          ),
        );
    }
  }
  const seatPieces = [
    { size: [1.12, 0.2, 1.05], offset: [0, 0.65, 0], surface: fabric },
    { size: [1.16, 1.05, 0.26], offset: [0, 1.12, 0.52], surface: fabric },
    { size: [0.13, 0.13, 1.12], offset: [-0.64, 0.93, 0], surface: wood },
    { size: [0.13, 0.13, 1.12], offset: [0.64, 0.93, 0], surface: wood },
    { size: [0.12, 0.6, 0.7], offset: [-0.5, 0.35, 0], surface: metal },
    { size: [0.12, 0.6, 0.7], offset: [0.5, 0.35, 0], surface: metal },
  ];
  for (const piece of seatPieces) {
    const geometry = new THREE.BoxGeometry(
      piece.size[0],
      piece.size[1],
      piece.size[2],
    );
    const mesh = new THREE.InstancedMesh(geometry, piece.surface, seats.length);
    seats.forEach((matrix, index) =>
      mesh.setMatrixAt(
        index,
        matrix
          .clone()
          .multiply(
            new THREE.Matrix4().makeTranslation(
              piece.offset[0],
              piece.offset[1],
              piece.offset[2],
            ),
          ),
      ),
    );
    scene.add(mesh);
  }
  createAudience(resources, seats);
  for (let z = -7; z <= 16; z += 4.6) {
    box(30, 0.18, 0.35, 0, 13.65, z, metal);
    for (const x of [-12, -6, 0, 6, 12]) {
      cylinder(0.3, 0.1, x, 13.45, z, trim);
    }
  }
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.minDistance = 6;
  controls.maxDistance = 39;
  controls.minPolarAngle = 0.65;
  controls.maxPolarAngle = Math.PI / 2 + 0.08;
  controls.minAzimuthAngle = -0.75;
  controls.maxAzimuthAngle = 0.75;
  let disposed = false,
    frame = 0,
    view: AuditoriumView = "sala";
  const render = () => {
    frame = 0;
    if (!disposed && !document.hidden) renderer.render(scene, camera);
  };
  const invalidate = () => {
    if (!disposed && !frame && !document.hidden)
      frame = requestAnimationFrame(render);
  };
  controls.addEventListener("change", invalidate);
  function setView(next: AuditoriumView) {
    view = next;
    const baseFov = next === "podio" ? 46 : 43;
    camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(THREE.MathUtils.degToRad(baseFov / 2)) *
            Math.max(1, 16 / 9 / camera.aspect),
        ),
    );
    if (next === "sala") {
      camera.position.set(1.8, 9.5, 30.5);
      controls.target.set(0, 4.2, -4);
    } else if (next === "pantalla") {
      camera.position.set(0, 7.1, 6.8);
      controls.target.set(0, 7.1, -10);
    } else {
      camera.position.set(1.4, 4.4, 8);
      controls.target.set(0, 2, -2);
    }
    camera.updateProjectionMatrix();
    controls.update();
    invalidate();
  }
  function resize() {
    const width = container.clientWidth,
      height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    setView(view);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  const visibility = () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else invalidate();
  };
  document.addEventListener("visibilitychange", visibility);
  function update(display: AuditoriumDisplay) {
    paintMainScreen(main.ctx, display);
    paintSideScreen(stats.ctx, display, "stats");
    paintSideScreen(activity.ctx, display, "activity");
    [main, stats, activity].forEach((panel) => {
      panel.texture.needsUpdate = true;
    });
    winners.forEach((panel) => {
      paintPodium(
        panel.ctx,
        display.snapshot?.entries[panel.position - 1],
        panel.position,
      );
      panel.texture.needsUpdate = true;
    });
    invalidate();
  }
  resize();
  update({ snapshot: null, connected: false, page: 0, categoryPage: 0 });
  return {
    update,
    setView,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      document.removeEventListener("visibilitychange", visibility);
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          if (object instanceof THREE.InstancedMesh) object.dispose();
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      resources.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
