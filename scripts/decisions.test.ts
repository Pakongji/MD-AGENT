import assert from "node:assert/strict";
import test from "node:test";
import { latestConfirmed, suggestsDecision, validateDecision } from "../lib/decisions/shared";
import { commandSchema } from "../lib/validation/commands";
import type { TaskDecisionItem } from "../lib/types/domain";

const valid = { content: "추가 발주 진행", rationale: "재고일수가 리드타임보다 짧음", outcome: "PROCEED" as const, quantity: 100 };
test("결정 확정에는 사용자 결정과 공백이 아닌 근거가 모두 필요하다", () => {
  assert.equal(validateDecision(valid, true), null);
  assert.ok(validateDecision({ ...valid, content: "  " }, true));
  assert.ok(validateDecision({ ...valid, rationale: "\n " }, true));
});
test("보류는 미래의 재검토 일시가 필요하다", () => {
  const now = new Date("2026-10-29T00:00:00Z");
  assert.ok(validateDecision({ ...valid, outcome: "HOLD" }, true, now));
  assert.ok(validateDecision({ ...valid, outcome: "HOLD", reviewAt: "2026-10-28T00:00:00Z" }, true, now));
  assert.equal(validateDecision({ ...valid, outcome: "HOLD", reviewAt: "2026-10-30T00:00:00Z" }, true, now), null);
});
test("발주 결정에만 유효한 수량을 요구한다", () => {
  assert.ok(validateDecision({ ...valid, quantity: 0 }, true));
  assert.ok(validateDecision({ ...valid, quantity: 1.5 }, true));
  assert.equal(validateDecision({ ...valid, quantity: null }, false), null);
  assert.equal(validateDecision({ ...valid, quantity: null, outcome: "DECLINE" }, true), null);
});
test("최신 확정 기록은 초안을 제외하고 확정 시각으로 선택한다", () => {
  const base: TaskDecisionItem = { id: "", taskId: "task", authorId: "author", authorName: "검증", status: "DRAFT", outcome: "PROCEED", content: "", rationale: "", alternatives: "", followUp: "", reviewAt: null, quantity: null, evidence: { capturedAt: "2026-10-29T00:00:00Z", taskTitle: "업무", taskReason: "" }, confirmedAt: null, createdAt: "2026-10-29T00:00:00Z", updatedAt: "2026-10-29T00:00:00Z" };
  const decisions = [
    { ...base, id: "old", status: "CONFIRMED", confirmedAt: "2026-10-29T01:00:00Z" },
    { ...base, id: "draft", status: "DRAFT", createdAt: "2026-10-30T00:00:00Z" },
    { ...base, id: "new", status: "CONFIRMED", confirmedAt: "2026-10-29T02:00:00Z" },
  ] as TaskDecisionItem[];
  assert.equal(latestConfirmed({ decisions })?.id, "new");
});
test("일반 실행 업무와 의사결정 제안을 구분한다", () => {
  assert.equal(suggestsDecision("배너 파일 전달"), false);
  assert.equal(suggestsDecision("추가 발주 여부 결정"), true);
  assert.equal(suggestsDecision("프로모션 대상 SKU 확정"), true);
});
test("초안은 빈 입력을 허용하고 클라이언트 작성자 정보를 사용하지 않는다", () => {
  const command = commandSchema.parse({ type: "SAVE_DECISION", id: "7d6bdd78-d96c-4d21-a176-28d9d7f08c45", taskId: "task", status: "DRAFT", outcome: "PROCEED", authorId: "forged" });
  assert.equal(command.type, "SAVE_DECISION");
  assert.equal("authorId" in command, false);
});
