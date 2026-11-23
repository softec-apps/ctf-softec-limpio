import { createSpecialistDevices } from "./SpecialistDevices";
import { createRankingTelevision } from "./RankingTelevision";
import { createIndustrialCabinet } from "./IndustrialCabinet";
import { createMultifunctionPrinter } from "./MultifunctionPrinter";
import * as THREE from "three";
import { createSceneResources } from "./SceneResources";
import { createOfficePalette } from "./officePalette";
import { createRoomShell } from "./RoomShell";
import { createWorkbench } from "./Workbench";
import { createGamingKeyboard } from "./GamingKeyboard";
import { createGamingMouse } from "./GamingMouse";
import { createPhone } from "./Phone";
import { createLaptop } from "../Laptop";
import { createServerRack } from "./ServerRack";
import { createRoomFixtures } from "../RoomFixtures";
import { createOsintBoard } from "./OsintBoard";
import { createBookshelf } from "./Bookshelf";
import { createSceneArtifacts } from "../SceneArtifacts";
import { createOfficeLighting } from "./OfficeLighting";

export function createOfficeScene(
  scene: THREE.Scene,
  options: { maxAnisotropy: number; requestRender: () => void },
) {
  const resources = createSceneResources(scene);
  const palette = createOfficePalette(resources);
  createRoomShell(resources, palette, options);
  const television = createRankingTelevision(resources, options.requestRender);
  const monitor = createWorkbench(resources, palette);
  createGamingKeyboard(resources, palette);
  createGamingMouse(resources, palette);
  const laptop = createLaptop(scene);
  const phone = createPhone(resources, palette);
  const rack = createServerRack(resources, palette);
  const printer = createMultifunctionPrinter(resources, options.requestRender);
  const lighting = createOfficeLighting(scene);
  const ot = createIndustrialCabinet(
    resources,
    options.requestRender,
    lighting.setIndustrialLight,
  );
  const fixtures = createRoomFixtures(
    scene,
    {
      wall: palette.concrete,
      metal: palette.metal,
      edge: palette.edge,
      dark: palette.dark,
    },
    resources.label,
  );
  const osintBoard = createOsintBoard(resources, options.requestRender);
  const bookshelf = createBookshelf(resources, palette);
  const specialistDevices = createSpecialistDevices(resources);
  const artifacts = createSceneArtifacts(scene, options.requestRender);
  return {
    fixtures,
    television,
    printer,
    ot,
    artifacts,
    osintBoard,
    targets: [
      monitor,
      ...specialistDevices,
      television.root,
      printer.root,
      ot.root,
      laptop.root,
      phone,
      rack,
      ...bookshelf.targets,
      ...osintBoard.targets,
      ...fixtures.targets,
      ...artifacts.targets,
    ],
    dispose() {
      fixtures.dispose();
      artifacts.dispose();
      // Keycaps and mouse shells share geometries: release each GPU buffer once.
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.Mesh || object instanceof THREE.Line)
          geometries.add(object.geometry);
      });
      geometries.forEach((geometry) => geometry.dispose());
      resources.dispose();
      laptop.dispose();
    },
  };
}
