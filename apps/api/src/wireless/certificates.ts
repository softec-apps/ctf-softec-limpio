import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const names = [
  "campus-ca",
  "foreign-ca",
  "primary",
  "secondary",
  "wrong-name",
  "foreign",
  "expired",
] as const;
export type CertificateName = (typeof names)[number];
const certificates = new Map(
  names.map((name) => [
    name,
    new X509Certificate(
      readFileSync(resolve(__dirname, "../../assets/wireless", name + ".pem")),
    ),
  ]),
);
export const certificate = (name: CertificateName) => certificates.get(name)!;
export const certificateHash = (name: CertificateName) =>
  certificate(name).fingerprint256.replaceAll(":", "").toLowerCase();
export const incidentTime = new Date(
  Date.parse(certificate("primary").validFrom) + 86400000,
);

export function inspectCertificate(name: string) {
  if (!names.includes(name as CertificateName))
    throw new Error("Certificados disponibles: " + names.join(", "));
  const parsedCertificate = certificate(name as CertificateName);
  return `${parsedCertificate.subject}\nIssuer: ${parsedCertificate.issuer}\nSAN: ${parsedCertificate.subjectAltName}\nNot before: ${parsedCertificate.validFrom}\nNot after: ${parsedCertificate.validTo}\nExtended key usage: ${parsedCertificate.keyUsage?.join(", ") ?? "none"}\nSHA256: ${certificateHash(name as CertificateName)}\n\n${parsedCertificate.toString()}`;
}

export function validateServerCertificate(
  name: CertificateName,
  anchors: string[],
  serverNames: string[],
) {
  const parsedCertificate = certificate(name);
  const root = ["campus-ca", "foreign-ca"]
    .map((name) => certificate(name as CertificateName))
    .find(
      (root) =>
        anchors.includes(
          root.fingerprint256.replaceAll(":", "").toLowerCase(),
        ) &&
        parsedCertificate.checkIssued(root) &&
        parsedCertificate.verify(root.publicKey),
    );
  if (!root) return { accepted: false, reason: "unknown_ca" };
  if (
    incidentTime < new Date(parsedCertificate.validFrom) ||
    incidentTime > new Date(parsedCertificate.validTo)
  )
    return { accepted: false, reason: "certificate_expired_or_not_yet_valid" };
  if (!parsedCertificate.keyUsage?.includes("1.3.6.1.5.5.7.3.1"))
    return { accepted: false, reason: "unsupported_certificate_purpose" };
  if (
    !serverNames.some((name) =>
      parsedCertificate.checkHost(name, { subject: "never", wildcards: false }),
    )
  )
    return { accepted: false, reason: "server_name_mismatch" };
  return { accepted: true, reason: "certificate_verified" };
}
