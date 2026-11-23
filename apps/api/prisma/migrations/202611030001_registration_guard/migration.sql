CREATE TABLE "RegistrationProof" (
  "tokenHash" TEXT PRIMARY KEY,
  "deviceHash" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  CONSTRAINT "RegistrationProof_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX "RegistrationProof_expiresAt_idx" ON "RegistrationProof"("expiresAt");
CREATE TABLE "RegistrationQuota" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0 CHECK ("count" >= 0),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "RegistrationQuota_expiresAt_idx" ON "RegistrationQuota"("expiresAt");
