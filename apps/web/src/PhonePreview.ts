import * as THREE from "three";

export function createPhonePreviewTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 580;
  const ctx = canvas.getContext("2d")!;
  const background = ctx.createLinearGradient(0, 0, 240, 580);
  background.addColorStop(0, "#35377f");
  background.addColorStop(0.5, "#b886b0");
  background.addColorStop(1, "#1b2855");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 300, 580);
  ctx.fillStyle = "#080b13";
  ctx.beginPath();
  ctx.roundRect(111, 10, 78, 21, 12);
  ctx.fill();
  ctx.fillStyle = "#f5f5ff";
  ctx.textAlign = "center";
  ctx.font = '300 57px "Segoe UI",sans-serif';
  ctx.fillText(
    new Date().toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    150,
    125,
  );
  ctx.font = '11px "Segoe UI",sans-serif';
  ctx.fillText("Seventech", 150, 148);
  ctx.fillStyle = "#ffffff2b";
  ctx.beginPath();
  ctx.roundRect(23, 180, 254, 70, 20);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = '13px "Segoe UI",sans-serif';
  ctx.fillText("Tu espacio de trabajo", 150, 212);
  ctx.font = '10px "Segoe UI",sans-serif';
  ctx.fillText("Laboratorio", 150, 231);
  const colors = [
    "#26b873",
    "#f28eac",
    "#ffdf8d",
    "#48a2ef",
    "#3c435d",
    "#9da8c1",
  ];
  for (let i = 0; i < 6; i++) {
    const x = 34 + (i % 3) * 86,
      y = 282 + Math.floor(i / 3) * 80;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect(x, y, 46, 46, 14);
    ctx.fill();
    ctx.strokeStyle = "#ffffffc9";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 14, y + 13, 18, 20);
  }
  ctx.fillStyle = "#ffffff30";
  ctx.beginPath();
  ctx.roundRect(19, 484, 262, 65, 23);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect(36 + i * 61, 495, 43, 43, 13);
    ctx.fill();
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(105, 565, 90, 3, 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
