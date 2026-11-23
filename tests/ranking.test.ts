import { televisionFieldOfView } from "../apps/web/src/worldGeometry";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Scene, Raycaster, Vector3, PerspectiveCamera, Box3 } from "three";
import { topTen, type RankingDisplay } from "../apps/web/src/ranking/display";
import { paintTelevision } from "../apps/web/src/ranking/paintTelevision";
import { createRankingTelevision } from "../apps/web/src/office/RankingTelevision";
import { createSceneResources } from "../apps/web/src/office/SceneResources";
import { sceneObjects } from "../apps/api/src/scene-objects";
function surface() {
  const text: string[] = [];
  const context = {
    fillRect: () => {},
    fillText: (value: string) => text.push(value),
    measureText: (value: string) => ({ width: value.length * 13 }),
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  return { context, canvas, text };
}
const entries = Array.from({ length: 14 }, (_, index) => ({
  position: index + 1,
  alias: "participante_" + index,
  score: index === 0 ? 101 : 40 - index,
  solved: index === 0 ? 2 : 10,
  incorrectAttempts: 0,
}));
test("el televisor conserva la posición oficial, los empates y el premio final y limita a diez", () => {
  const source = structuredClone(entries);
  source[2].score = source[1].score;
  source[2].position = source[1].position;
  const snapshot = structuredClone(source),
    selected = topTen(source);
  assert.equal(selected.length, 10);
  assert.deepEqual(
    selected.map((row) => row.position),
    [1, 2, 2, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(selected[0].score, 101);
  assert.equal(selected[1].alias, source[1].alias);
  assert.deepEqual(source, snapshot);
  assert.deepEqual(topTen([]), []);
});
test("la pantalla física dibuja solo participantes reales y pide acceso sin inventar datos", () => {
  const { context, text } = surface();
  paintTelevision(context, {
    phase: "ready",
    competitionOpen: false,
    entries: topTen(entries),
  });
  assert.ok(text.includes("participante_0"));
  assert.ok(text.includes("participante_9"));
  assert.ok(!text.includes("participante_10"));
  assert.ok(text.includes("101"));
  assert.ok(text.includes("Competencia cerrada"));
  text.length = 0;
  paintTelevision(context, { phase: "signin", entries: [] });
  assert.ok(text.some((value) => value.includes("Inicia sesión")));
  assert.ok(!text.some((value) => value.startsWith("participante_")));
});
test("el televisor mantiene16:9, se selecciona desde su cámara y actualiza textura solo con cambios", () => {
  const scene = new Scene(),
    resources = createSceneResources(scene),
    { canvas } = surface();
  let redraws = 0;
  const television = createRankingTelevision(
    resources,
    () => redraws++,
    canvas,
  );
  const display: RankingDisplay = {
    phase: "ready",
    entries: topTen(entries),
    competitionOpen: true,
  };
  television.setDisplay(display);
  const version = resources.textures[0].version;
  television.setDisplay(structuredClone(display));
  assert.equal(resources.textures[0].version, version);
  assert.equal(redraws, 2);
  assert.equal(canvas.width / canvas.height, 16 / 9);
  scene.updateMatrixWorld(true);
  const record = sceneObjects.find((object) => object.id === "television")!,
    eye = new Vector3().fromArray(record.eye),
    look = new Vector3().fromArray(record.look);
  assert.ok(
    new Raycaster(eye, look.sub(eye).normalize()).intersectObject(
      television.root,
      true,
    ).length > 0,
  );
  const bounds = new Box3().setFromObject(television.root);
  for (const aspect of [1440 / 1000, 390 / 844]) {
    const camera = new PerspectiveCamera(
      televisionFieldOfView(
        aspect,
        eye.distanceTo(new Vector3().fromArray(record.look)),
      ),
      aspect,
      0.05,
      70,
    );
    camera.position.copy(eye);
    camera.lookAt(new Vector3().fromArray(record.look));
    camera.updateMatrixWorld(true);
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const point = new Vector3(x, y, z).project(camera);
          assert.ok(
            Math.abs(point.x) < 0.97 && Math.abs(point.y) < 0.97,
            "El televisor debe caber en su cámara",
          );
        }
  }
  assert.equal(television.root.userData.device, "television");
  assert.deepEqual(record.challengeIds, []);
  resources.dispose();
});
