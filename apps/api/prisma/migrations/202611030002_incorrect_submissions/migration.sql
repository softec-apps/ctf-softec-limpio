ALTER TABLE "PrivilegedLab"
ADD COLUMN "incorrectSubmissions" INTEGER NOT NULL DEFAULT 0
CONSTRAINT "PrivilegedLab_incorrectSubmissions_nonnegative" CHECK ("incorrectSubmissions" >= 0);
