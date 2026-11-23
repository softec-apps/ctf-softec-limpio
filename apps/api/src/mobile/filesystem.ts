import { mobileMediaArtifacts } from "./media";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MOBILE_CASES, MOBILE_ROOT, mobileFolder } from "./catalog";
export function mobileArtifacts(enabled: string[]) {
  return [
    ...MOBILE_CASES.filter((c) => enabled.includes(c.id)).flatMap((c) =>
      c.files.map((file) => ({
        ...file,
        path: `${mobileFolder(c.id)}/${file.name}`,
      })),
    ),
    ...mobileMediaArtifacts(enabled),
  ];
}
export function readMobileFile(enabled: string[], path: string) {
  if (
    !path.startsWith(MOBILE_ROOT) ||
    path.includes("\0") ||
    path.split("/").some((p) => p === ".." || p === ".")
  )
    throw new BadRequestException("Ruta fuera del almacenamiento virtual.");
  const files = mobileArtifacts(enabled);
  const file = files.find((f) => f.path === path);
  if (file) return { type: "file", ...file };
  const prefix = path.replace(/\/$/, "") + "/";
  const children = new Map<
    string,
    { name: string; path: string; type: string }
  >();
  for (const f of files)
    if (f.path.startsWith(prefix)) {
      const name = f.path.slice(prefix.length).split("/")[0];
      children.set(name, {
        name,
        path: prefix + name,
        type: f.path === prefix + name ? "file" : "directory",
      });
    }
  if (!children.size && path !== MOBILE_ROOT)
    throw new NotFoundException("Archivo virtual no disponible.");
  return { type: "directory", path, entries: [...children.values()] };
}
