import * as THREE from "three";
import type { ArtifactDocument } from "./artifactTypes";
import {
  NOTEBOOK_POSITION,
  boardNotePosition,
  ARCHIVE_POSITION,
  ARCHIVE_YAW,
  NOTICEBOARD_POSITION,
  NOTICEBOARD_YAW,
} from "./sceneLayout";
import { createDrawerTray } from "./drawerGeometry";

export function createSceneArtifacts(
  scene: THREE.Scene,
  invalidate: () => void,
) {
  const targets: THREE.Object3D[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const documents = new Map<
    string,
    {
      document: ArtifactDocument;
      canvas: HTMLCanvasElement;
      texture: THREE.CanvasTexture;
    }
  >();
  const mat = (color: string) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.83,
      metalness: 0.14,
    });
    materials.push(m);
    return m;
  };
  const metal = mat("#283941"),
    edge = mat("#4b5b5e"),
    inner = mat("#122126"),
    paper = mat("#d5cdb3"),
    folderMaterial = mat("#a58b55"),
    binding = mat("#244d3d");
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Object3D = scene,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function paint(canvas: HTMLCanvasElement, document: ArtifactDocument) {
    canvas.width = 1024;
    canvas.height = 1400;
    const ctx = canvas.getContext("2d")!;
    const handwritten = document.style !== "typed";
    const sticky = document.style === "sticky";
    const bg = ctx.createLinearGradient(0, 0, 1024, 1400);
    bg.addColorStop(0, sticky ? "#e0d69d" : "#eee5c9");
    bg.addColorStop(0.5, sticky ? "#e8dea8" : "#f0e9d4");
    bg.addColorStop(1, sticky ? "#cfc485" : "#d9cfb1");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 1400);
    for (let i = 0; i < 1300; i++) {
      ctx.fillStyle = `rgba(100,78,39,${i % 4 === 0 ? 0.025 : 0.012})`;
      ctx.fillRect(
        (i * 397) % 1024,
        (i * 277) % 1400,
        1 + (i % 3),
        1 + (i % 2),
      );
    }
    if (document.style === "handwriting") {
      ctx.strokeStyle = "#7896a141";
      ctx.lineWidth = 1;
      for (let y = 185; y < 1300; y += 73) {
        ctx.beginPath();
        ctx.moveTo(58, y);
        ctx.lineTo(974, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "#bc68644b";
      ctx.beginPath();
      ctx.moveTo(90, 58);
      ctx.lineTo(90, 1330);
      ctx.stroke();
    }
    ctx.fillStyle = handwritten ? "#263949" : "#25333a";
    ctx.font = handwritten
      ? '58px Caveat, "Segoe Print", cursive'
      : document.challengeId
        ? '30px "Courier New",monospace'
        : '37px "Courier New",monospace';
    ctx.textBaseline = "top";
    const maxWidth = handwritten ? 810 : 830;
    const lineHeight = handwritten ? 73 : document.challengeId ? 50 : 62;
    let y = 98;
    let lineNumber = 0;
    for (const paragraph of document.body.split("\n")) {
      if (!paragraph) {
        y += lineHeight * 0.65;
        continue;
      }
      let line = "";
      const lines: string[] = [];
      for (const word of paragraph.split(" ")) {
        const candidate = line ? line + " " + word : word;
        if (ctx.measureText(candidate).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else line = candidate;
      }
      if (line) lines.push(line);
      for (const text of lines) {
        ctx.save();
        const jitter = handwritten ? ((lineNumber % 3) - 1) * 3 : 0;
        ctx.translate(116 + jitter, y);
        if (handwritten) ctx.rotate(((lineNumber % 5) - 2) * 0.002);
        ctx.fillText(text, 0, 0);
        ctx.restore();
        y += lineHeight;
        lineNumber++;
      }
    }
    ctx.fillStyle = "#6e6a57";
    ctx.font = handwritten ? "38px Caveat, cursive" : "23px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      document.page !== undefined ? String(document.page + 1) : document.title,
      512,
      1328,
    );
    ctx.textAlign = "left";
    const shade = ctx.createLinearGradient(0, 0, 38, 0);
    shade.addColorStop(0, "#473b262a");
    shade.addColorStop(1, "#473b2600");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 42, 1400);
  }
  function textureFor(document: ArtifactDocument) {
    let existing = documents.get(document.objectId + document.id);
    if (existing) return existing.texture;
    const canvas = globalThis.document.createElement("canvas");
    paint(canvas, document);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    documents.set(document.objectId + document.id, {
      document,
      canvas,
      texture,
    });
    return texture;
  }
  function pageMaterial() {
    const material = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      side: THREE.DoubleSide,
      roughness: 1,
      emissive: "#bbb19a",
      emissiveIntensity: 0.09,
    });
    materials.push(material);
    return material;
  }
  const book = new THREE.Group();
  book.position.fromArray(NOTEBOOK_POSITION);
  book.userData.device = "notebook";
  scene.add(book);
  box(1.32, 0.055, 0.94, 0, 0, 0, binding, book);
  box(0.025, 0.06, 0.88, 0, 0.01, 0, binding, book);
  box(0.62, 0.032, 0.87, -0.33, 0.04, 0, paper, book);
  box(0.62, 0.032, 0.87, 0.33, 0.04, 0, paper, book);
  const leftMaterial = pageMaterial(),
    rightMaterial = pageMaterial();
  function bookPage(material: THREE.Material, x: number) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.61, 0.86), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, 0);
    mesh.receiveShadow = true;
    book.add(mesh);
    return mesh;
  }
  const leftPage = bookPage(leftMaterial, -0.325),
    rightPage = bookPage(rightMaterial, 0.325);
  leftPage.userData = { device: "notebook", pageTurn: -1 };
  rightPage.userData = { device: "notebook", pageTurn: 1 };
  targets.push(book, leftPage, rightPage);
  const flipPivot = new THREE.Group();
  flipPivot.position.y = 0.075;
  book.add(flipPivot);
  const flipping = box(0.62, 0.006, 0.86, 0.32, 0, 0, paper, flipPivot);
  flipping.castShadow = true;
  flipPivot.visible = false;
  let flipTime = 0;
  // Real drawers: each tray, face, handle and folder moves as its own group.
  const cabinet = new THREE.Group();
  cabinet.position.fromArray(ARCHIVE_POSITION);
  cabinet.rotation.y = ARCHIVE_YAW;
  cabinet.userData.device = "archive";
  scene.add(cabinet);
  box(0.055, 1.4, 0.86, -0.475, 0, 0, metal, cabinet);
  box(0.055, 1.4, 0.86, 0.475, 0, 0, metal, cabinet);
  box(0.98, 0.055, 0.86, 0, 0.695, 0, metal, cabinet);
  box(0.98, 0.055, 0.86, 0, -0.695, 0, metal, cabinet);
  box(0.98, 1.4, 0.045, 0, 0, -0.43, inner, cabinet);
  targets.push(cabinet);
  const drawers: THREE.Group[] = [];
  const trayInterior = mat("#67786e");
  let drawerGoal: number | null = null;
  const folderNames = [
    ["Compras", "Inventario"],
    ["Incidencias", "Entregas"],
    ["Mantenimiento", "Procedimientos"],
  ];
  for (let i = 0; i < 3; i++) {
    const tray = createDrawerTray(i, {
      front: edge,
      inside: trayInterior,
      handle: inner,
    });
    cabinet.add(tray);
    drawers.push(tray);
    targets.push(tray);
    for (let f = 0; f < 2; f++) {
      const folder = new THREE.Group();
      folder.position.set(f ? 0.2 : -0.2, -0.15, 0.02);
      folder.userData = { device: "archive", drawer: i, folder: f };
      tray.add(folder);
      box(0.34, 0.018, 0.53, 0, 0, 0, folderMaterial, folder);
      box(0.2, 0.018, 0.075, 0, 0.01, -0.29, folderMaterial, folder);
      box(0.29, 0.005, 0.45, 0, 0.014, 0, paper, folder);
      const tag = document.createElement("canvas");
      tag.width = 512;
      tag.height = 100;
      const ctx = tag.getContext("2d")!;
      ctx.fillStyle = "#dfd4ad";
      ctx.fillRect(0, 0, 512, 100);
      ctx.fillStyle = "#333e34";
      ctx.font = "34px monospace";
      ctx.textAlign = "center";
      ctx.fillText(folderNames[i][f], 256, 61);
      const texture = new THREE.CanvasTexture(tag);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });
      materials.push(material);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.065),
        material,
      );
      label.rotation.x = -Math.PI / 2;
      label.position.set(0, 0.028, -0.1);
      folder.add(label);
      targets.push(folder);
    }
  }
  const board = box(2.4, 1.55, 0.07, ...NOTICEBOARD_POSITION, mat("#514d36"));
  board.rotation.y = NOTICEBOARD_YAW;
  board.userData.device = "noticeboard";
  targets.push(board);
  const notes: THREE.Mesh[] = [];
  const noteMaterials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 6; i++) {
    const noteMaterial = pageMaterial();
    const inkCanvas = globalThis.document.createElement("canvas");
    inkCanvas.width = 410;
    inkCanvas.height = 410;
    const ink = inkCanvas.getContext("2d")!;
    ink.fillStyle = "#e8dfa9";
    ink.fillRect(0, 0, 410, 410);
    ink.strokeStyle = "#38483b";
    ink.lineWidth = 2.5;
    for (let row = 0; row < 5; row++) {
      ink.beginPath();
      ink.moveTo(46, 67 + row * 56);
      for (let stroke = 0; stroke < 13; stroke++) {
        const x = 46 + stroke * 22;
        ink.bezierCurveTo(
          x + 5,
          50 + row * 56,
          x + 12,
          80 + row * 56,
          x + 21,
          64 + row * 56,
        );
      }
      ink.stroke();
    }
    const inkTexture = new THREE.CanvasTexture(inkCanvas);
    inkTexture.colorSpace = THREE.SRGBColorSpace;
    textures.push(inkTexture);
    noteMaterial.map = inkTexture;
    noteMaterial.color.set(
      i % 3 === 0 ? "#dfd79a" : i % 3 === 1 ? "#c9dbbd" : "#ddc6a1",
    );
    noteMaterials.push(noteMaterial);
    const note = new THREE.Mesh(
      new THREE.PlaneGeometry(0.53, 0.48),
      noteMaterial,
    );
    note.position.fromArray(boardNotePosition(i));
    note.rotation.set(0, NOTICEBOARD_YAW, i % 2 ? 0.04 : -0.045);
    note.userData = { device: "noticeboard", documentId: "note-" + (i + 1) };
    scene.add(note);
    notes.push(note);
    targets.push(note);
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.023, 8, 6),
      mat(i % 2 ? "#9b4b3b" : "#476b61"),
    );
    pin.position
      .copy(note.position)
      .add(
        new THREE.Vector3(
          Math.sin(NOTICEBOARD_YAW) * 0.028,
          0.2,
          Math.cos(NOTICEBOARD_YAW) * 0.028,
        ),
      );
    scene.add(pin);
  }
  const heldMaterial = pageMaterial();
  const held = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.1), heldMaterial);
  held.visible = false;
  held.castShadow = true;
  scene.add(held);
  let heldObject = "";
  let liftTime = 0;
  const heldOrigin = new THREE.Vector3();
  const heldTarget = new THREE.Vector3();
  let paperAngle = 0;
  let lastBookPage = -1;
  function showDocument(document: ArtifactDocument) {
    if (document.objectId === "notebook") {
      const material =
        (document.page ?? 0) % 2 === 0 ? leftMaterial : rightMaterial;
      material.map = textureFor(document);
      material.needsUpdate = true;
      if (
        lastBookPage >= 0 &&
        Math.floor(lastBookPage / 2) !== Math.floor((document.page ?? 0) / 2)
      ) {
        flipTime = 0.001;
        flipPivot.visible = true;
      }
      lastBookPage = document.page ?? 0;
    } else {
      heldObject = document.objectId;
      heldMaterial.map = textureFor(document);
      heldMaterial.color.set("#ffffff");
      heldMaterial.needsUpdate = true;
      held.visible = true;
      liftTime = 0.001;
      held.scale.setScalar(0.75);
      held.rotation.set(
        0,
        document.objectId === "noticeboard" ? NOTICEBOARD_YAW : ARCHIVE_YAW,
        -0.025,
      );
      if (document.objectId === "noticeboard") {
        const index = Math.max(0, Number(document.id.split("-")[1]) - 1);
        noteMaterials[index].map = textureFor(document);
        noteMaterials[index].color.set("#ffffff");
        noteMaterials[index].needsUpdate = true;
        heldOrigin.copy(notes[index].position);
        heldTarget.set(
          NOTICEBOARD_POSITION[0] - 1.07,
          NOTICEBOARD_POSITION[1],
          NOTICEBOARD_POSITION[2],
        );
        held.scale.set(0.9, 0.8, 1);
        paperAngle = 0.035;
      } else {
        heldOrigin.copy(
          cabinet.localToWorld(
            new THREE.Vector3(
              document.folder === 1 ? 0.2 : -0.2,
              0.43 - (document.drawer ?? 1) * 0.43 - 0.13,
              0.9,
            ),
          ),
        );
        heldTarget.copy(cabinet.localToWorld(new THREE.Vector3(0, 0.87, 1.22)));
        paperAngle = -0.025;
      }
      held.position.copy(heldOrigin);
    }
    invalidate();
  }
  function closePaper() {
    held.visible = false;
    heldObject = "";
    invalidate();
  }
  function setDrawer(index: number | null) {
    drawerGoal = index;
    closePaper();
    invalidate();
  }
  function update(dt: number, view: string) {
    if (flipTime > 0) {
      flipTime += dt;
      flipPivot.rotation.z =
        Math.sin(Math.min(1, flipTime / 0.65) * Math.PI) * Math.PI * 0.93;
      if (flipTime >= 0.65) {
        flipTime = 0;
        flipPivot.visible = false;
      }
    }
    if (held.visible && liftTime > 0) {
      liftTime += dt;
      const t = Math.min(1, liftTime / 0.42);
      const eased = 1 - Math.pow(1 - t, 3);
      held.position.lerpVectors(heldOrigin, heldTarget, eased);
      held.scale.setScalar(
        0.75 + eased * (heldObject === "noticeboard" ? 0.12 : 0.25),
      );
      held.rotation.z = paperAngle * (1 - eased * 0.6);
      if (t === 1) liftTime = 0;
    }
    for (let i = 0; i < 3; i++) {
      const goal = i === drawerGoal ? 0.86 : 0.1;
      drawers[i].position.z = THREE.MathUtils.lerp(
        drawers[i].position.z,
        goal,
        1 - Math.exp(-dt * 9),
      );
    }
    held.visible = heldObject !== "" && view === heldObject;
  }
  function focus(view: string) {
    if (!held.visible || view !== heldObject) return null;
    return view === "noticeboard"
      ? {
          eye: [
            NOTICEBOARD_POSITION[0] - 2.57,
            NOTICEBOARD_POSITION[1],
            NOTICEBOARD_POSITION[2],
          ],
          look: heldTarget.toArray(),
        }
      : {
          eye: [heldTarget.x - 1.58, 1.6, heldTarget.z],
          look: heldTarget.toArray(),
        };
  }
  function isAnimating() {
    return (
      flipTime > 0 ||
      liftTime > 0 ||
      drawers.some(
        (d, i) =>
          Math.abs(d.position.z - (i === drawerGoal ? 0.86 : 0.1)) > 0.0005,
      )
    );
  }
  void document.fonts.load("58px Caveat").then(() => {
    for (const value of documents.values()) {
      paint(value.canvas, value.document);
      value.texture.needsUpdate = true;
    }
    invalidate();
  });
  return {
    targets,
    showDocument,
    closePaper,
    setDrawer,
    focus,
    update,
    isAnimating,
    getDrawer: () => drawerGoal,
    dispose: () => {
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
