import { BROWSER_LABS, hasBrowserLab } from "../catalog";
export function resolveLabTarget(value: string, base?: string) {
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    throw new Error("Introduce una dirección completa del servicio.");
  }
  if (url.username || url.password || url.hash)
    throw new Error("La dirección no admite credenciales ni fragmentos.");
  for (const id of Object.keys(BROWSER_LABS))
    if (
      hasBrowserLab(id) &&
      new URL(BROWSER_LABS[id].home).origin === url.origin
    )
      return { id, url: url.href, host: url.hostname };
  throw new Error("Ese servicio no pertenece al laboratorio.");
}
