import { DATABASE_LABS } from "./database-lab/catalog";
import { CONTRACT_LABS } from "./smart-contracts/catalog";
import { CLOUD_LABS } from "./cloud/catalog";
import { AI_LABS } from "./ai-security/catalog";
import { API_LABS } from "./api-security/catalog";
import { ANALYSIS_CASES } from "./casework/catalog";
import { FILE_CHALLENGES, FILE_ROOT } from "./file-forensics/catalog";
import { OT_CHALLENGES, OT_ROOT } from "./ot/catalog";
import { PRINTER_CHALLENGES, PRINTER_ROOT } from "./printer/catalog";
import { DOMAIN_ROOT } from "./domain/catalog";
import {
  INVESTIGATION_CHALLENGES,
  INVESTIGATION_ROOT,
} from "./investigation/catalog";
import { PRIVILEGED_ROOT, DISCOVERY_NOTE } from "./privileged/artifacts";
import { REVERSE_ROOT, REVERSE_CASES } from "./reversing/catalog";
import { readReverseFile } from "./reversing/artifacts";
import { STEGO_ROOT, STEGO_CASES } from "./stego/catalog";
import { readStegoFile } from "./stego/artifacts";
import { NETWORK_CHALLENGES, networkFolder } from "./network/catalog";
import { NotFoundException } from "@nestjs/common";
import { HOME, readVirtual, virtualPath } from "./virtual-filesystem";
import { OSINT_LABS } from "./osint/catalog";
import { WEB_LABS } from "./web-lab/catalog";

import { CRYPTO_CHALLENGES, cryptoFolder } from "./crypto/catalog";

/** Mount existing virtual files under stable paths on the simulated workstation. */
export function readWorkstationFile(enabledIds: string[], value: string) {
  let path = virtualPath(value);
  if (path === PRIVILEGED_ROOT)
    return {
      type: "directory" as const,
      path,
      entries: [{ name: "sesion-anterior.log", type: "file" as const }],
    };
  if (path === PRIVILEGED_ROOT + "/sesion-anterior.log")
    return {
      type: "file" as const,
      path,
      name: "sesion-anterior.log",
      content: DISCOVERY_NOTE,
    };
  if (path === REVERSE_ROOT || path.startsWith(REVERSE_ROOT + "/"))
    return readReverseFile(enabledIds, path);
  if (path === STEGO_ROOT || path.startsWith(STEGO_ROOT + "/"))
    return readStegoFile(enabledIds, path);
  for (const entry of CRYPTO_CHALLENGES) {
    const legacy = `${HOME}/criptografia/${entry.id}`;
    if (path === legacy || path.startsWith(legacy + "/")) {
      path =
        `${HOME}/criptografia/${cryptoFolder(entry.id)}` +
        path.slice(legacy.length);
      break;
    }
  }
  const mounts = [
    ...WEB_LABS,
    ...OSINT_LABS,
    ...API_LABS,
    ...CLOUD_LABS,
    ...AI_LABS,
    ...DATABASE_LABS,
    ...CONTRACT_LABS,
  ]
    .filter((lab) => enabledIds.includes(lab.challenge.id))
    .map((lab) => ({
      root: `${HOME}/servicios/${new URL(lab.home).hostname}`,
      id: lab.challenge.id,
    }));
  mounts.push(
    ...OT_CHALLENGES.filter((c) => enabledIds.includes(c.id)).map((c) => ({
      root: `${OT_ROOT}/caso-${c.id.slice(-2)}`,
      id: c.id,
    })),
  );
  mounts.push(
    ...PRINTER_CHALLENGES.filter((c) => enabledIds.includes(c.id)).map((c) => ({
      root: `${PRINTER_ROOT}/caso-${c.id.slice(-2)}`,
      id: c.id,
    })),
  );
  mounts.push(
    ...INVESTIGATION_CHALLENGES.filter((c) => enabledIds.includes(c.id)).map(
      (c) => ({
        root: `${INVESTIGATION_ROOT}/caso-${c.id.slice(-2)}`,
        id: c.id,
      }),
    ),
  );
  mounts.push(
    ...FILE_CHALLENGES.filter((c) => enabledIds.includes(c.id)).map((c) => ({
      root: `${FILE_ROOT}/caso-${c.id.slice(-2)}`,
      id: c.id,
    })),
  );
  mounts.push(
    ...ANALYSIS_CASES.filter((entry) => enabledIds.includes(entry.id)).map(
      (entry) => ({
        root: `${entry.station.root}/caso-${entry.id.slice(-2)}`,
        id: entry.id,
      }),
    ),
  );
  if (enabledIds.includes("primer-rastro"))
    mounts.push({ root: `${HOME}/documentos`, id: "primer-rastro" });
  mounts.push(
    ...CRYPTO_CHALLENGES.filter((entry) => enabledIds.includes(entry.id)).map(
      (entry) => ({
        root: `${HOME}/criptografia/${cryptoFolder(entry.id)}`,
        id: entry.id,
      }),
    ),
  );
  mounts.push(
    ...NETWORK_CHALLENGES.filter((entry) => enabledIds.includes(entry.id)).map(
      (entry) => ({ root: networkFolder(entry.id), id: entry.id }),
    ),
  );
  const mount = mounts.find(
    (entry) => path === entry.root || path.startsWith(entry.root + "/"),
  );
  if (mount) {
    const result = readVirtual(mount.id, HOME + path.slice(mount.root.length));
    return { ...result, path };
  }
  const roots = [
    HOME,
    PRIVILEGED_ROOT,
    ...(enabledIds.some((id) => id.startsWith("ad-")) ? [DOMAIN_ROOT] : []),
    ...(REVERSE_CASES.some((c) => enabledIds.includes(c.id))
      ? [REVERSE_ROOT]
      : []),
    ...mounts.map((entry) => entry.root),
    ...(STEGO_CASES.some((c) => enabledIds.includes(c.id)) ? [STEGO_ROOT] : []),
  ];
  const prefix = path === "/" ? "/" : path + "/";
  if (path === HOME || roots.some((root) => root.startsWith(prefix))) {
    const names = roots
      .filter((root) => root.startsWith(prefix))
      .map((root) => root.slice(prefix.length).split("/")[0]);
    return {
      type: "directory" as const,
      path,
      entries: [...new Set(names)].map((name) => ({
        name,
        type: "directory" as const,
      })),
    };
  }
  throw new NotFoundException("No existe ese archivo o directorio virtual.");
}
