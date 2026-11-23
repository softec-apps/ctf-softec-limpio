CREATE TABLE "PrivilegedLab" (
  "userId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrivilegedLab_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "PrivilegedLab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
