-- Additive migration: preserve existing accounts, conversations and task statuses.
ALTER TABLE "Task" ADD COLUMN "requiresDecision" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "inventoryId" TEXT;
ALTER TABLE "Task" ADD CONSTRAINT "Task_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Task_inventoryId_idx" ON "Task"("inventoryId");

CREATE TABLE "TaskDecision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "authorName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "outcome" TEXT NOT NULL DEFAULT 'PROCEED',
  "content" TEXT NOT NULL DEFAULT '',
  "rationale" TEXT NOT NULL DEFAULT '',
  "alternatives" TEXT NOT NULL DEFAULT '',
  "followUp" TEXT NOT NULL DEFAULT '',
  "reviewAt" TIMESTAMP(3),
  "quantity" INTEGER,
  "evidence" JSONB NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskDecision_status_check" CHECK ("status" IN ('DRAFT', 'CONFIRMED')),
  CONSTRAINT "TaskDecision_outcome_check" CHECK ("outcome" IN ('PROCEED', 'HOLD', 'DECLINE')),
  CONSTRAINT "TaskDecision_confirmed_check" CHECK ("status" <> 'CONFIRMED' OR (length(trim("content")) > 0 AND length(trim("rationale")) > 0 AND "confirmedAt" IS NOT NULL)),
  CONSTRAINT "TaskDecision_review_check" CHECK ("status" <> 'CONFIRMED' OR "outcome" <> 'HOLD' OR "reviewAt" IS NOT NULL),
  CONSTRAINT "TaskDecision_quantity_check" CHECK ("quantity" IS NULL OR "quantity" > 0)
);
CREATE INDEX "TaskDecision_taskId_createdAt_idx" ON "TaskDecision"("taskId", "createdAt");
CREATE INDEX "TaskDecision_authorId_idx" ON "TaskDecision"("authorId");

-- Credentials/JWT authentication is handled by the application server. No direct Data API access.
ALTER TABLE "TaskDecision" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TaskDecision" FROM anon, authenticated;

UPDATE "Task" SET "requiresDecision" = true WHERE "title" ~ '(결정|확정|검토|대응안)';
UPDATE "Task" t SET "inventoryId" = i."id"
FROM "Inventory" i JOIN "Product" p ON p."id" = i."productId"
WHERE t."requiresDecision" = true AND t."category" = '재고/발주'
  AND position(p."name" IN t."title") > 0;
