CREATE TABLE "NetworkLab" (
 "userId" TEXT NOT NULL,
 "scenarioId" TEXT NOT NULL,
 "state" JSONB NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "NetworkLab_pkey" PRIMARY KEY ("userId","scenarioId"),
 CONSTRAINT "NetworkLab_revision_check" CHECK ("revision" >= 0),
 CONSTRAINT "NetworkLab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
