BEGIN;

CREATE TABLE "SharedRoute" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SharedRoute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SharedRoute_token_key" ON "SharedRoute"("token");
CREATE INDEX "SharedRoute_expiresAt_idx" ON "SharedRoute"("expiresAt");

COMMIT;
