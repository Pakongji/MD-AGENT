import type { TaskItem, DecisionOutcome } from "@/lib/types/domain";

export const outcomeLabels: Record<DecisionOutcome, string> = {
  PROCEED: "진행", HOLD: "보류", DECLINE: "진행하지 않음",
};

export function suggestsDecision(title: string) {
  return /결정|확정|검토|대응안/.test(title);
}

/** 효력 있는 결정: 확정됐고, 승인이 필요 없거나 승인된 결정. (승인 대기·반려는 아직 결정되지 않은 것으로 봅니다) */
export const isEffective = (decision: { status: string; approvalStatus?: string | null }) =>
  decision.status === "CONFIRMED" && (!decision.approvalStatus || decision.approvalStatus === "NOT_REQUIRED" || decision.approvalStatus === "APPROVED");

const newest = <T extends { confirmedAt: string | null; createdAt: string }>(items: T[]) =>
  [...items].sort((a, b) => (b.confirmedAt ?? b.createdAt).localeCompare(a.confirmedAt ?? a.createdAt))[0];

export function latestConfirmed(task: Pick<TaskItem, "decisions">) {
  return newest((task.decisions ?? []).filter(isEffective));
}

/** 승인 대기 중인 가장 최근 결정 */
export function pendingApproval(task: Pick<TaskItem, "decisions">) {
  return newest((task.decisions ?? []).filter((decision) => decision.status === "CONFIRMED" && decision.approvalStatus === "PENDING"));
}

/** 가장 최근 확정 시도가 반려됐는지(그 뒤로 효력 있는 결정이 없을 때) */
export function lastRejected(task: Pick<TaskItem, "decisions">) {
  const latest = newest((task.decisions ?? []).filter((decision) => decision.status === "CONFIRMED"));
  return latest?.approvalStatus === "REJECTED" ? latest : undefined;
}

export function validateDecision(input: {
  content: string; rationale: string; outcome: DecisionOutcome; reviewAt?: string | null;
  quantity?: number | null;
}, isInventoryDecision: boolean, now = new Date()) {
  if (!input.content.trim()) return "결정 내용을 입력해주세요.";
  if (!input.rationale.trim()) return "판단 근거를 입력해주세요.";
  if (input.outcome === "HOLD" && (!input.reviewAt || !Number.isFinite(Date.parse(input.reviewAt)) || new Date(input.reviewAt) <= now)) {
    return "보류할 때는 앞으로의 재검토 일시를 지정해주세요.";
  }
  if (isInventoryDecision && input.outcome === "PROCEED" && (!Number.isInteger(input.quantity) || (input.quantity ?? 0) < 1)) {
    return "진행할 발주 수량을 1개 이상 입력해주세요.";
  }
  return null;
}
