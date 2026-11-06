import type { TaskItem, DecisionOutcome } from "@/lib/types/domain";

export const outcomeLabels: Record<DecisionOutcome, string> = {
  PROCEED: "진행", HOLD: "보류", DECLINE: "진행하지 않음",
};

export function suggestsDecision(title: string) {
  return /결정|확정|검토|대응안/.test(title);
}

export function latestConfirmed(task: Pick<TaskItem, "decisions">) {
  return task.decisions?.filter((decision) => decision.status === "CONFIRMED")
    .sort((a, b) => (b.confirmedAt ?? b.createdAt).localeCompare(a.confirmedAt ?? a.createdAt))[0];
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
