ALTER TABLE "Session" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'game';
ALTER TABLE "Session" ADD CONSTRAINT "Session_scope" CHECK ("scope" IN ('game', 'admin'));
