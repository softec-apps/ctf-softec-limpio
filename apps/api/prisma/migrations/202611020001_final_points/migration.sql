ALTER TABLE "PrivilegedLab" ADD COLUMN "awardedPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PrivilegedLab" ADD CONSTRAINT "PrivilegedLab_points" CHECK ("awardedPoints" IN (0, 100));
UPDATE "PrivilegedLab" SET "awardedPoints" = 100 WHERE "completedAt" IS NOT NULL;
