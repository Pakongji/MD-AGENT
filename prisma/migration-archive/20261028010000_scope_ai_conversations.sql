-- ARCHIVE ONLY: not applied and excluded from prisma/migrations.
-- The project retains shared workspace history; do not execute this proposal.
ALTER TABLE "AIConversation" ADD COLUMN "accountId" TEXT;

CREATE INDEX "AIConversation_accountId_createdAt_idx" ON "AIConversation"("accountId", "createdAt");

ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
