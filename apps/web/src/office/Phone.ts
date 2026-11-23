import { PHONE_POSITION } from "../sceneLayout";
import * as THREE from "three";
import type { SceneResources } from "./SceneResources";
import type { OfficePalette } from "./officePalette";
import { createPhonePreviewTexture } from "../PhonePreview";

export function createPhone(resources: SceneResources, palette: OfficePalette) {
  const { scene, box, materials, textures } = resources;
  const { edge, dark } = palette;
  // Smartphone on the desktop.
  const phone = new THREE.Group();
  phone.position.fromArray(PHONE_POSITION);
  phone.rotation.y = -0.22;
  phone.userData.device = "phone";
  scene.add(phone);
  box(0.34, 0.045, 0.66, 0, 0, 0, edge, phone);
  const phoneTexture = createPhonePreviewTexture();
  textures.push(phoneTexture);
  const phoneMaterial = new THREE.MeshBasicMaterial({
    map: phoneTexture,
    toneMapped: false,
  });
  materials.push(phoneMaterial);
  const phoneDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.58),
    phoneMaterial,
  );
  phoneDisplay.rotation.x = -Math.PI / 2;
  phoneDisplay.position.set(0, 0.03, 0);
  phone.add(phoneDisplay);
  box(0.1, 0.006, 0.015, 0, 0.034, -0.235, dark, phone);
  return phone;
}
