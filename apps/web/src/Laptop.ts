import { LAPTOP_POSITION } from "./sceneLayout";
import * as THREE from "three";

// Visual-only laptop. Keep the display separate so it can host applications later.
export function createLaptop(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "windows-laptop";
  root.userData.device = "laptop";
  root.position.fromArray(LAPTOP_POSITION);
  root.rotation.y = -0.08;
  root.scale.setScalar(0.85);
  scene.add(root);
  const shell = new THREE.MeshStandardMaterial({
    color: "#68737e",
    metalness: 0.85,
    roughness: 0.33,
  });
  const keys = new THREE.MeshStandardMaterial({
    color: "#192028",
    roughness: 0.65,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#0a0e14",
    roughness: 0.4,
  });
  const touchpad = new THREE.MeshStandardMaterial({
    color: "#515d69",
    metalness: 0.6,
    roughness: 0.4,
  });
  const materials: THREE.Material[] = [shell, keys, trim, touchpad];
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(1.58, 0.065, 1.04, 0, 0, 0, shell);
  box(1.42, 0.012, 0.45, 0, 0.038, -0.12, trim);
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 14; col++) {
      box(
        0.081,
        0.012,
        0.065,
        -0.645 + col * 0.099,
        0.052,
        -0.29 + row * 0.081,
        keys,
      );
    }
  box(0.47, 0.012, 0.06, -0.03, 0.053, 0.035, keys);
  box(0.49, 0.006, 0.23, 0, 0.036, 0.327, touchpad);
  for (const x of [-0.68, 0.68]) box(0.12, 0.075, 0.075, x, 0.035, -0.45, trim);
  // The lid tilts away from the player, like an open physical laptop.
  const lid = new THREE.Group();
  lid.position.set(0, 0.04, -0.47);
  lid.rotation.x = -0.18;
  root.add(lid);
  box(1.58, 1.02, 0.046, 0, 0.51, 0, shell, lid);
  box(1.52, 0.96, 0.015, 0, 0.51, 0.027, trim, lid);
  box(0.025, 0.012, 0.01, 0, 0.985, 0.039, keys, lid);
  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  canvas.height = 900;
  const ctx = canvas.getContext("2d")!;
  paintWindowsWallpaper(ctx);
  function text(
    value: string,
    x: number,
    y: number,
    size = 19,
    color = "#fff",
    align: CanvasTextAlign = "center",
  ) {
    ctx.font = `${size}px "Segoe UI",sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }
  function windows(x: number, y: number, size: number) {
    ctx.fillStyle = "#1687ed";
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 2; c++)
        ctx.fillRect(
          x + c * (size / 2 + 2),
          y + r * (size / 2 + 2),
          size / 2 - 1,
          size / 2 - 1,
        );
  }
  // Desktop shortcuts: recognizable Windows shapes with Spanish labels.
  ctx.fillStyle = "#e0eaf3";
  ctx.fillRect(49, 36, 38, 44);
  ctx.strokeStyle = "#8ab8d9";
  ctx.lineWidth = 3;
  ctx.strokeRect(49, 36, 38, 44);
  ctx.fillStyle = "#a8c7dc";
  ctx.fillRect(43, 31, 50, 6);
  text("Papelera de", 70, 108, 18);
  text("reciclaje", 70, 130, 18);
  ctx.fillStyle = "#65b7ef";
  ctx.fillRect(43, 174, 54, 36);
  ctx.fillStyle = "#103d65";
  ctx.fillRect(48, 179, 44, 25);
  ctx.fillStyle = "#c8d4df";
  ctx.fillRect(66, 211, 8, 8);
  ctx.fillRect(54, 219, 32, 4);
  text("Este equipo", 70, 250, 18);
  ctx.fillStyle = "#f5c44e";
  ctx.fillRect(44, 297, 26, 12);
  ctx.fillStyle = "#ffd469";
  ctx.fillRect(43, 305, 56, 34);
  text("Archivos", 70, 370, 18);
  // Frosted taskbar, centered applications, compact system tray.
  ctx.fillStyle = "rgba(235,245,255,.93)";
  ctx.fillRect(0, 838, 1440, 62);
  windows(498, 857, 24);
  ctx.strokeStyle = "#33465c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(560, 868, 9, 0, Math.PI * 2);
  ctx.moveTo(567, 875);
  ctx.lineTo(574, 882);
  ctx.stroke();
  ctx.fillStyle = "#f6c34b";
  ctx.fillRect(603, 860, 29, 23);
  ctx.fillStyle = "#ffe08b";
  ctx.fillRect(603, 855, 13, 8);
  const edge = ctx.createLinearGradient(662, 852, 691, 884);
  edge.addColorStop(0, "#14c8a3");
  edge.addColorStop(1, "#0875d6");
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(677, 869, 16, 0, Math.PI * 2);
  ctx.fill();
  text("e", 677, 879, 29, "#e8ffff");
  ctx.fillStyle = "#f9fcff";
  ctx.fillRect(710, 855, 27, 29);
  windows(717, 865, 10);
  ctx.fillStyle = "#5a82bd";
  ctx.fillRect(757, 857, 27, 25);
  ctx.fillStyle = "#dfedff";
  ctx.fillRect(761, 861, 10, 17);
  text("⌃", 1220, 878, 20, "#263b52");
  text("ESP", 1260, 877, 17, "#263b52");
  text("10:24", 1372, 862, 17, "#263b52");
  text("31/10/2026", 1372, 884, 15, "#263b52");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const displayMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  materials.push(displayMaterial);
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(1.43, 0.894),
    displayMaterial,
  );
  display.position.set(0, 0.515, 0.039);
  lid.add(display);
  return {
    root,
    dispose: () => {
      texture.dispose();
      materials.forEach((material) => material.dispose());
    },
  };
}

export function paintWindowsWallpaper(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, 1440, 900);
  bg.addColorStop(0, "#102d72");
  bg.addColorStop(0.5, "#167ce2");
  bg.addColorStop(1, "#071c52");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1440, 900);
  // Folded blue ribbons, drawn procedurally rather than an external wallpaper image.
  for (let i = 0; i < 11; i++) {
    const x = 370 + i * 37,
      y = 110 + i * 17;
    const gradient = ctx.createLinearGradient(x, y, x + 390, y + 490);
    gradient.addColorStop(0, "#84d9ff");
    gradient.addColorStop(0.24, "#2384ee");
    gradient.addColorStop(0.53, "#083eab");
    gradient.addColorStop(0.78, "#54b5fb");
    gradient.addColorStop(1, "#0c46b7");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, y + 155);
    ctx.bezierCurveTo(x - 220, y + 410, x + 500, y + 520, x + 300, y + 190);
    ctx.bezierCurveTo(x + 220, y + 45, x + 60, y + 10, x, y + 155);
    ctx.fill();
  }
}
