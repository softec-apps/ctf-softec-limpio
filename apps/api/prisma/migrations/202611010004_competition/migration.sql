CREATE TABLE "Competition" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "open" BOOLEAN NOT NULL DEFAULT true,
  "closedAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Competition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Competition_singleton" CHECK ("id" = 1),
  CONSTRAINT "Competition_closed_at" CHECK (("open" AND "closedAt" IS NULL) OR (NOT "open" AND "closedAt" IS NOT NULL))
);
