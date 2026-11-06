import { test } from "node:test";
import assert from "node:assert/strict";
import { reportNextActions } from "../lib/services/report-actions";
import type { DashboardData } from "../lib/types/domain";

const now = new Date("2026-11-05T08:00:00Z");
const inv = (id: string, name: string, extra: Record<string, unknown>) => ({ id, productId: id, stockQty: 100, dailySales: 10, stockDays: 20, leadTimeDays: 7, safetyStock: 10, expectedStockoutDate: now.toISOString(), status: "양호", recommendedOrderQty: 0, orderStatus: "미발주", product: { name }, purchaseOrders: [], ...extra });
const confirmed = (extra: Record<string, unknown>) => ({ id: "d", taskId: "t", authorId: "a", authorName: "박", status: "CONFIRMED", content: "", rationale: "", alternatives: "", followUp: "", reviewAt: null, quantity: null, evidence: {}, confirmedAt: "2026-10-29T06:00:00Z", createdAt: "2026-10-29T06:00:00Z", updatedAt: "2026-10-29T06:00:00Z", ...extra });

test("다음 Action은 실제 발주·결정·재고 상태로 만든다", () => {
  const data = {
    inventory: [
      inv("a", "A 립밤", { orderStatus: "발주 결정 · 실행 대기", stockDays: 4 }),
      inv("b", "B 쿠션", { orderStatus: "발주 완료", purchaseOrders: [{ id: "po", inventoryId: "b", quantity: 700, status: "발주 완료", expectedArrival: "2026-11-15T00:00:00Z", createdAt: now.toISOString() }] }),
      inv("e", "E 플럼퍼", { stockDays: 7, leadTimeDays: 9 }),
    ],
    tasks: [
      { id: "t1", title: "A 립밤 추가 발주 여부 결정", status: "완료", inventoryId: "a", decisions: [confirmed({ outcome: "PROCEED", quantity: 700 })] },
      { id: "t2", title: "가격 인하 결정", status: "진행중", inventoryId: null, decisions: [confirmed({ outcome: "HOLD", reviewAt: "2026-11-12T01:00:00Z" })] },
    ],
    competitorEvents: [{ endAt: "2026-10-26T00:00:00Z" }],
  } as unknown as Pick<DashboardData, "inventory" | "tasks" | "competitorEvents">;
  const actions = reportNextActions(data, now, 10);
  assert.deepEqual(actions, [
    "A 립밤 700개 발주 등록 (결정 완료 · 등록 전)",
    "B 쿠션 700개 입고 추적 (예정 11. 15.)",
    "E 플럼퍼 발주 검토 (재고 7일 < 리드타임 9일)",
    "가격 인하 결정 재검토 (11. 12.)",
  ]);
  // 발주하지 않은 A 립밤에 "입고 추적"을 쓰지 않고, 종료된 경쟁사 행사는 모니터링하지 않는다
  assert.ok(!actions.some((line) => line.startsWith("A 립밤") && line.includes("입고 추적")));
  assert.ok(!actions.some((line) => line.includes("경쟁사")));
});
