-- 업무 담당자와 결정 승인. 기존 자료를 바꾸지 않는 추가 전용 변경입니다.
BEGIN;

ALTER TABLE "Task" ADD COLUMN "assigneeId" TEXT;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Task_assigneeId_idx" ON "Task" ("assigneeId");

-- 이미 확정된 결정은 승인 절차 없이 유효한 것으로 둡니다(NOT_REQUIRED).
ALTER TABLE "TaskDecision" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "TaskDecision" ADD COLUMN "approverId" TEXT;
ALTER TABLE "TaskDecision" ADD COLUMN "approverName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TaskDecision" ADD COLUMN "approvalComment" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TaskDecision" ADD COLUMN "approvalAt" TIMESTAMP(3);
CREATE INDEX "TaskDecision_approvalStatus_idx" ON "TaskDecision" ("approvalStatus");

-- 관리자(사용자 관리 권한 보유)에게 새 '승인' 권한을 줍니다.
UPDATE "Account" SET "permissions" = array_append("permissions", 'approve') WHERE 'users' = ANY("permissions") AND NOT ('approve' = ANY("permissions"));

COMMIT;
