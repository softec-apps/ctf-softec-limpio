import { api } from "./api";
export type SceneObject = {
  id: string;
  name: string;
  kind: string;
  eye: number[];
  look: number[];
  description: string;
  challengeIds: string[];
};
export async function loadSceneObjects() {
  return (await api<{ objects: SceneObject[] }>("/scene/objects")).objects;
}
