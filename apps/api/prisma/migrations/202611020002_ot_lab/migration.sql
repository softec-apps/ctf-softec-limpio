CREATE TABLE "OtLab" (
  "userId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OtLab_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "OtLab_revision_nonnegative" CHECK ("revision" >= 0),
  CONSTRAINT "OtLab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
