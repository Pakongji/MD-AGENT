import { test } from "node:test";
import assert from "node:assert/strict";
import { isEffective, lastRejected, latestConfirmed, pendingApproval } from "../lib/decisions/shared";
import { commandPermission, ROLES } from "../lib/auth/permissions";
import type { TaskDecisionItem } from "../lib/types/domain";

const d = (id: string, at: string, extra: Partial<TaskDecisionItem>) => ({ id, status: "CONFIRMED", outcome: "PROCEED", content: id, confirmedAt: at, createdAt: at, ...extra }) as TaskDecisionItem;

test("효력 있는 결정은 확정 + (승인 불필요 또는 승인됨)만", () => {
  assert.ok(isEffective({ status: "CONFIRMED" }));
  assert.ok(isEffective({ status: "CONFIRMED", approvalStatus: "NOT_REQUIRED" }));
  assert.ok(isEffective({ status: "CONFIRMED", approvalStatus: "APPROVED" }));
  assert.ok(!isEffective({ status: "CONFIRMED", approvalStatus: "PENDING" }));
  assert.ok(!isEffective({ status: "CONFIRMED", approvalStatus: "REJECTED" }));
  assert.ok(!isEffective({ status: "DRAFT", approvalStatus: "NOT_REQUIRED" }));
});

test("승인 대기 결정은 확정된 결정으로 치지 않고 따로 찾는다", () => {
  const task = { decisions: [d("old", "2026-11-01T00:00:00Z", { approvalStatus: "NOT_REQUIRED", outcome: "HOLD" }), d("new", "2026-11-05T00:00:00Z", { approvalStatus: "PENDING" })] };
  assert.equal(latestConfirmed(task)?.id, "old");
  assert.equal(pendingApproval(task)?.id, "new");
  assert.equal(lastRejected(task), undefined);
});

test("반려는 가장 최근 확정 시도일 때만 '반려됨'으로 본다", () => {
  const rejected = { decisions: [d("r", "2026-11-05T00:00:00Z", { approvalStatus: "REJECTED", approvalComment: "수량 과다" })] };
  assert.equal(lastRejected(rejected)?.approvalComment, "수량 과다");
  assert.equal(latestConfirmed(rejected), undefined);
  const fixed = { decisions: [...rejected.decisions, d("ok", "2026-11-06T00:00:00Z", { approvalStatus: "APPROVED" })] };
  assert.equal(lastRejected(fixed), undefined);
  assert.equal(latestConfirmed(fixed)?.id, "ok");
});

test("역할: 팀장·관리자만 승인 권한, MD는 결정은 하되 승인 필요", () => {
  const role = (key: string) => ROLES.find((item) => item.key === key)!.permissions as readonly string[];
  assert.ok(role("ADMIN").includes("approve"));
  assert.ok(role("LEAD").includes("approve") && role("LEAD").includes("decide"));
  assert.ok(role("MD").includes("decide") && !role("MD").includes("approve"));
  assert.equal(commandPermission("APPROVE_DECISION"), "approve");
  assert.equal(commandPermission("REJECT_DECISION"), "approve");
  assert.equal(commandPermission("ASSIGN_TASK"), "task");
});
