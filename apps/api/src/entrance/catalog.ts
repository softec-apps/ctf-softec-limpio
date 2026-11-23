import { pointsFor } from "../scoring/policy";
export const ENTRANCE_CHALLENGE = {
  id: "primer-rastro",
  title: "La puerta del laboratorio",
  description:
    "El acceso comienza en un pasillo. Encuentra en el código fuente de la página las cuatro cifras que abren la puerta, entra al laboratorio y usa el computador. El PIN cambia al cargar la página y el acceso se acredita automáticamente en tu cuenta.",
  category: "Iniciación en el escenario",
  device: "entrance",
  points: pointsFor("primer-rastro"),
};
export const LEGACY_ENTRANCE_DESCRIPTION =
  "Alguien dejó un mensaje en el computador. Explora los archivos, encuentra la evidencia y recupera la flag.";

export const LEGACY_ENTRANCE_DESCRIPTIONS = [
  "El acceso comienza en un pasillo. Encuentra en el código fuente de la página las ocho cifras que abren la puerta, entra al laboratorio y usa el computador. El acceso se acredita automáticamente en tu cuenta.",
  LEGACY_ENTRANCE_DESCRIPTION,
  "El laboratorio comienza en un pasillo. Encuentra en el código fuente de la página las ocho cifras que abren la puerta, entra a la oficina y usa el computador. El acceso se acredita automáticamente en tu cuenta.",
];
