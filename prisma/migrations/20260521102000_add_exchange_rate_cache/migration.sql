CREATE TABLE "ExchangeRateCache" (
  "id" TEXT NOT NULL,
  "base" TEXT NOT NULL,
  "rates" JSONB NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExchangeRateCache_pkey" PRIMARY KEY ("id")
);
