import { DATABASE_LABS } from "./database-lab/catalog";
import { CONTRACT_LABS } from "./smart-contracts/catalog";
import { CLOUD_LABS } from "./cloud/catalog";
import { AI_LABS } from "./ai-security/catalog";
import { API_LABS } from "./api-security/catalog";
import { ANALYSIS_CHALLENGES, analysisFlag } from "./casework/catalog";
import { isWirelessOperational } from "./wireless/scenarios";
import { FILE_CHALLENGES, fileFlag } from "./file-forensics/catalog";
import { OT_CHALLENGES, otFlag } from "./ot/catalog";
import { PRINTER_CHALLENGES, printerFlag } from "./printer/catalog";
import { DOMAIN_CHALLENGES } from "./domain/catalog";
import {
  INVESTIGATION_CHALLENGES,
  investigationFlag,
} from "./investigation/catalog";
import { pointsFor, scoringEntries } from "./scoring/policy";
import { domainSeedVerifier } from "./domain/service";
import {
  ENTRANCE_CHALLENGE,
  LEGACY_ENTRANCE_DESCRIPTIONS,
} from "./entrance/catalog";
import { REVERSE_CHALLENGES, reverseFlag } from "./reversing/catalog";
import { STEGO_CHALLENGES, stegoFlag } from "./stego/catalog";
import {
  LINUX_CHALLENGES,
  LINUX_LEGACY_DESCRIPTIONS,
} from "./linux-network/catalog";
import { linuxSeedVerifier } from "./linux-network/service";
import { MOBILE_CHALLENGES, mobileFlag } from "./mobile/catalog";
import { db } from "./db";
import { passwordHash, flagValue, flagVerifier } from "./security";
import { NIGHT_CASE_VERSION, NIGHT_CASE_DESCRIPTION } from "./scene-documents";
import { WEB_CHALLENGE_VERSION, WEB_CHALLENGE } from "./web-lab/access-control";
import { WEB_LABS } from "./web-lab/catalog";
import { CRYPTO_CHALLENGES, cryptoFlag } from "./crypto/catalog";
import { OSINT_LABS, osintFlag } from "./osint/catalog";
import { WINDOWS_INTERACTIVE_CHALLENGES } from "./windows-lab/catalog";
import { windowsSeedVerifier } from "./windows-lab/service";
import {
  NETWORK_CHALLENGES,
  networkFlag,
  NETWORK_ARCHIVE_DESCRIPTIONS,
} from "./network/catalog";
async function seed() {
  const alias = process.env.ADMIN_ALIAS;
  const password = process.env.ADMIN_PASSWORD;
  if (!alias || !password || password.length < 16)
    throw new Error(
      "Configura ADMIN_ALIAS y ADMIN_PASSWORD (mínimo 16 caracteres).",
    );
  await db.user.upsert({
    where: { alias },
    create: { alias, passwordHash: passwordHash(password), role: "ADMIN" },
    update: {},
  });
  await db.challenge.updateMany({
    where: {
      id: ENTRANCE_CHALLENGE.id,
      description: { in: LEGACY_ENTRANCE_DESCRIPTIONS },
    },
    data: {
      title: ENTRANCE_CHALLENGE.title,
      description: ENTRANCE_CHALLENGE.description,
      category: ENTRANCE_CHALLENGE.category,
      device: ENTRANCE_CHALLENGE.device,
    },
  });
  await db.challenge.upsert({
    where: { id: ENTRANCE_CHALLENGE.id },
    create: {
      ...ENTRANCE_CHALLENGE,
      flagVerifier: flagVerifier(flagValue(ENTRANCE_CHALLENGE.id)),
    },
    update: {},
  });
  await db.challenge.upsert({
    where: { id: "turno-nocturno" },
    create: {
      id: "turno-nocturno",
      title: "Las pistas del turno nocturno",
      description: NIGHT_CASE_DESCRIPTION,
      category: "Investigación en el escenario",
      device: "scene",
      points: pointsFor("turno-nocturno"),
      flagVerifier: flagVerifier(flagValue(NIGHT_CASE_VERSION)),
    },
    update: {},
  });
  for (const lab of WEB_LABS) {
    await db.challenge.upsert({
      where: { id: lab.challenge.id },
      create: {
        ...lab.challenge,
        flagVerifier: flagVerifier(
          flagValue(lab.flagVersion ?? lab.challenge.id),
        ),
      },
      update: {},
    });
  }
  for (const challenge of OT_CHALLENGES)
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(otFlag(challenge.id)),
      },
      update: {},
    });
  for (const challenge of PRINTER_CHALLENGES)
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(printerFlag(challenge.id)),
      },
      update: {},
    });
  for (const challenge of ANALYSIS_CHALLENGES)
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(analysisFlag(challenge.id)),
      },
      update: isWirelessOperational(challenge.id)
        ? {
            title: challenge.title,
            description: challenge.description,
            flagVerifier: flagVerifier(analysisFlag(challenge.id)),
          }
        : {},
    });
  for (const lab of [
    ...API_LABS,
    ...CLOUD_LABS,
    ...AI_LABS,
    ...DATABASE_LABS,
    ...CONTRACT_LABS,
  ])
    await db.challenge.upsert({
      where: { id: lab.challenge.id },
      create: {
        ...lab.challenge,
        flagVerifier: flagVerifier(flagValue(lab.challenge.id)),
      },
      update: {},
    });
  for (const challenge of FILE_CHALLENGES)
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(fileFlag(challenge.id)),
      },
      update: {},
    });
  for (const challenge of INVESTIGATION_CHALLENGES)
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(investigationFlag(challenge.id)),
      },
      update: { description: challenge.description },
    });
  for (const challenge of CRYPTO_CHALLENGES) {
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(cryptoFlag(challenge.id)),
      },
      update:
        challenge.id === "crypto-capas"
          ? {
              title: challenge.title,
              description: challenge.description,
              flagVerifier: flagVerifier(cryptoFlag(challenge.id)),
            }
          : {},
    });
  }
  for (const lab of OSINT_LABS) {
    await db.challenge.upsert({
      where: { id: lab.challenge.id },
      create: {
        ...lab.challenge,
        flagVerifier: flagVerifier(osintFlag(lab.challenge.id)),
      },
      update: {},
    });
  }
  for (const challenge of WINDOWS_INTERACTIVE_CHALLENGES) {
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: windowsSeedVerifier(challenge.id),
      },
      update: {
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        device: challenge.device,
        flagVerifier: windowsSeedVerifier(challenge.id),
      },
    });
  }
  for (const challenge of DOMAIN_CHALLENGES)
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: { ...challenge, flagVerifier: domainSeedVerifier(challenge.id) },
      update: {},
    });
  for (const challenge of REVERSE_CHALLENGES)
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(reverseFlag(challenge.id)),
      },
      update: {},
    });
  for (const challenge of STEGO_CHALLENGES)
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(stegoFlag(challenge.id)),
      },
      update: {},
    });
  for (const challenge of LINUX_CHALLENGES) {
    // Refresh known standard descriptions without replacing administrator edits.
    await db.challenge.updateMany({
      where: {
        id: challenge.id,
        description: { in: LINUX_LEGACY_DESCRIPTIONS[challenge.id] },
      },
      data: { description: challenge.description },
    });
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: { ...challenge, flagVerifier: linuxSeedVerifier(challenge.id) },
      update: {},
    });
  }
  for (const challenge of MOBILE_CHALLENGES) {
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(mobileFlag(challenge.id)),
      },
      update: {},
    });
  }
  await db.challenge.updateMany({
    where: {
      id: "network-08",
      description:
        "El reloj del router se aparta del de la oficina. Configura la fuente NTP autorizada y sincronízalo. Comprueba que el estado indica sincronización sin desactivar los enlaces.",
    },
    data: {
      description: NETWORK_CHALLENGES.find(
        (challenge) => challenge.id === "network-08",
      )!.description,
    },
  });
  for (const challenge of NETWORK_CHALLENGES) {
    await db.challenge.updateMany({
      where: {
        id: challenge.id,
        description: NETWORK_ARCHIVE_DESCRIPTIONS[challenge.id],
      },
      data: {
        description: challenge.description,
        category: challenge.category,
      },
    });
    await db.challenge.upsert({
      where: { id: challenge.id },
      create: {
        ...challenge,
        flagVerifier: flagVerifier(networkFlag(challenge.id)),
      },
      update: {},
    });
  }
  await db.challenge.updateMany({
    where: {
      id: WEB_CHALLENGE.id,
      flagVerifier: flagVerifier(flagValue(WEB_CHALLENGE.id)),
    },
    data: { flagVerifier: flagVerifier(flagValue(WEB_CHALLENGE_VERSION)) },
  });
  await db.challenge.updateMany({
    where: {
      id: "turno-nocturno",
      flagVerifier: flagVerifier(flagValue("turno-nocturno")),
    },
    data: {
      description: NIGHT_CASE_DESCRIPTION,
      flagVerifier: flagVerifier(flagValue(NIGHT_CASE_VERSION)),
    },
  });
  for (const entry of scoringEntries())
    await db.challenge.updateMany({
      where: { id: entry.id },
      data: { points: entry.points },
    });
  console.log(
    "Datos iniciales disponibles. Se conservan usuarios, configuración y resultados existentes.",
  );
}
seed()
  .finally(() => db.$disconnect())
  .catch(() => {
    console.error(
      "No se pudieron preparar los datos iniciales. Revisa la conexión y la configuración privada.",
    );
    process.exitCode = 1;
  });
