import { test } from "node:test";
import assert from "node:assert/strict";
import { MockAIProvider } from "../lib/ai/mock-provider";
import { understandQuestion } from "../lib/ai/intent";
import { EMPTY_DASHBOARD, type DashboardData } from "../lib/types/domain";

const ai = new MockAIProvider();
const inv = (id: string, name: string, extra: Record<string, unknown>) => ({ id, productId: id, stockQty: 100, dailySales: 10, stockDays: 20, leadTimeDays: 7, safetyStock: 10, expectedStockoutDate: "2026-11-30T00:00:00Z", status: "양호", recommendedOrderQty: 0, orderStatus: "미발주", product: { name, category: name.includes("립") ? "립" : "헤어" }, purchaseOrders: [], ...extra });
const data = {
  ...EMPTY_DASHBOARD,
  meta: { aiProvider: "mock", lastUpdated: "2026-11-05T08:00:00Z" },
  inventory: [
    inv("a", "A 립밤", { stockDays: 4, stockQty: 720, dailySales: 180, orderStatus: "발주 결정 · 실행 대기", recommendedOrderQty: 1200 }),
    inv("h", "F 단백질 헤어마스크", { stockDays: 52, stockQty: 1352, dailySales: 26, leadTimeDays: 8, status: "과재고", orderStatus: "보류" }),
  ],
  tasks: [{ id: "t1", title: "A 립밤 추가 발주 여부 결정", status: "완료", priority: "HIGH", inventoryId: "a", requiresDecision: true, dueAt: null, dueLabel: "", reason: "", aiExecutable: false, category: "재고/발주",
    decisions: [{ id: "d", status: "CONFIRMED", outcome: "PROCEED", quantity: 700, content: "A립밤 700개 발주", rationale: "협의", authorName: "박홍지", confirmedAt: "2026-10-29T06:00:00Z", createdAt: "2026-10-29T06:00:00Z" }] }],
  products: [{ id: "h", name: "F 단백질 헤어마스크", category: "헤어", revenue: 1, salesQty: 1, marginRate: 27.6 }],
} as unknown as DashboardData;

test("과재고 질문에는 발주가 아니라 소진 계획으로 답한다", async () => {
  assert.equal(understandQuestion("과재고 상품 어떻게 소진하면 좋을까?").intent, "과재고 소진");
  const answer = await ai.answer("과재고 상품 어떻게 소진하면 좋을까?", "/", data);
  assert.match(answer.conclusion, /F 단백질 헤어마스크.*52일분/);
  assert.ok(!answer.actions.some((action) => action.command?.type === "CREATE_ORDER"));
});

test("이미 발주 결정된 상품은 새 수량을 권하지 않고 등록을 안내한다", async () => {
  const answer = await ai.answer("지금 발주해야 할 상품 뭐야?", "/", data);
  assert.match(answer.conclusion, /A 립밤.*700개 발주로 결정/);
  assert.equal(answer.actions[0].command?.type, "REVIEW_TASK");
});

test("채널을 콕 집은 매출 질문은 그 채널 자료로 답한다", async () => {
  assert.equal(understandQuestion("올리브영 매출 왜 빠졌어?").scope, "올리브영 채널");
  const answer = await ai.answer("올리브영 매출 왜 빠졌어?", "/", data);
  assert.match(answer.conclusion, /^올리브영은 직전 기간 대비 -12\.0%/);
  assert.match(answer.impact, /샘플/);
});
