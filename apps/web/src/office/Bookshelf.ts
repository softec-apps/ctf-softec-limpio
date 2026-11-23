import * as THREE from "three";
import type { SceneResources } from "./SceneResources";
import type { OfficePalette } from "./officePalette";
import { BOOKSHELF_POSITION, BOOKSHELF_YAW } from "../sceneLayout";
import { REFERENCE_CATEGORIES } from "../library/categories";
export function createBookshelf(
  resources: SceneResources,
  palette: OfficePalette,
) {
  const { scene, box, label, material } = resources;
  const { metal, edge } = palette;
  const bookshelf = new THREE.Group();
  bookshelf.position.fromArray(BOOKSHELF_POSITION);
  bookshelf.rotation.y = BOOKSHELF_YAW;
  scene.add(bookshelf);
  const targets: THREE.Object3D[] = [];
  const cover = material("#804936");
  const referenceCovers = [
    material("#304558"),
    material("#48533b"),
    material("#654242"),
  ];
  const columns = 7;
  let referenceIndex = 0;
  for (
    let i = 0;
    i < Math.ceil((REFERENCE_CATEGORIES.length + 1) / columns);
    i++
  ) {
    const shelfY = 0.9 + i * 0.9;
    box(2.05, 0.08, 0.5, 0, shelfY, 0, metal, bookshelf);
    for (const x of [-0.92, 0.92])
      box(0.045, 0.25, 0.4, x, shelfY - 0.13, -0.03, edge, bookshelf);
    for (let j = 0; j < columns; j++) {
      if (referenceIndex >= REFERENCE_CATEGORIES.length) break;
      const height = 0.45 + (j % 2) * 0.1;
      const selected = i === 1 && j === 2;
      const book = box(
        selected ? 0.24 : 0.22,
        height,
        0.27,
        -((columns - 1) * 0.26) / 2 + j * 0.26,
        shelfY + 0.04 + height / 2,
        0,
        selected ? cover : referenceCovers[i % referenceCovers.length],
        bookshelf,
      );
      const device = selected ? "crypto-book" : "library";
      const volumeId = selected
        ? undefined
        : `volume-${String(++referenceIndex).padStart(2, "0")}`;
      book.userData = { device, documentId: volumeId };
      targets.push(book);
      const spine = label(
        selected
          ? "RELATOS EN CLAVE"
          : REFERENCE_CATEGORIES[referenceIndex - 1].toLocaleUpperCase("es"),
        0.4,
        0.12,
        "#f2dca4",
        selected ? "#804936" : ["#304558", "#48533b", "#654242"][i % 3],
        54,
      );
      spine.rotation.z = Math.PI / 2;
      spine.position.set(book.position.x, book.position.y, 0.138);
      spine.userData = { device, documentId: volumeId };
      bookshelf.add(spine);
      targets.push(spine);
    }
  }
  return { root: bookshelf, targets };
}
