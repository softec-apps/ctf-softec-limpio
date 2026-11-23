import { DATABASE_LABS } from "../database-lab/catalog";
import { CONTRACT_LABS } from "../smart-contracts/catalog";
import { CLOUD_LABS } from "../cloud/catalog";
import { AI_LABS } from "../ai-security/catalog";
import { API_LABS } from "../api-security/catalog";
import {
  WEB_CHALLENGE,
  WEB_CHALLENGE_VERSION,
  WEB_LAB_ORIGIN,
  webLabRequest,
} from "./access-control";
import { WEB_EVIDENCE } from "./evidence";
import {
  INJECTION_CHALLENGE,
  INJECTION_ORIGIN,
  INJECTION_EVIDENCE,
  injectionRequest,
} from "./injection";
import { scenario as misconfiguration } from "./scenarios/misconfiguration";
import { scenario as supplyChain } from "./scenarios/supply-chain";
import { scenario as cryptography } from "./scenarios/cryptography";
import { scenario as insecureDesign } from "./scenarios/insecure-design";
import { scenario as authentication } from "./scenarios/authentication";
import { scenario as integrity } from "./scenarios/integrity";
import { scenario as logging } from "./scenarios/logging";
import { scenario as exceptions } from "./scenarios/exceptions";
import type { WebLabDefinition } from "./scenario-support";

export const WEB_LABS: readonly WebLabDefinition[] = [
  {
    challenge: WEB_CHALLENGE,
    flagVersion: WEB_CHALLENGE_VERSION,
    home: WEB_LAB_ORIGIN + "/",
    request: webLabRequest,
    evidence: WEB_EVIDENCE,
  },
  misconfiguration,
  supplyChain,
  cryptography,
  {
    challenge: INJECTION_CHALLENGE,
    home: INJECTION_ORIGIN + "/",
    request: injectionRequest,
    evidence: INJECTION_EVIDENCE,
  },
  insecureDesign,
  authentication,
  integrity,
  logging,
  exceptions,
];
import { OSINT_LABS } from "../osint/catalog";
const labsById = new Map(
  [
    ...WEB_LABS,
    ...OSINT_LABS,
    ...API_LABS,
    ...CLOUD_LABS,
    ...AI_LABS,
    ...DATABASE_LABS,
    ...CONTRACT_LABS,
  ].map((lab) => [lab.challenge.id, lab]),
);
export function getWebLab(id: string): WebLabDefinition | undefined {
  return labsById.get(id);
}
