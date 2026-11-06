import assert from "node:assert/strict";
import test from "node:test";
import { categoryBenchmark, diagnoseProduct, productInventory, relatedProductTasks, simulateProductScenario, stockPosition } from "../lib/services/product-diagnostics";
import type { InventoryItem, ProductItem, TaskItem } from "../lib/types/domain";

const product: ProductItem = { id: "a", name: "A 립밤", category: "립", lifecycle: "성장", revenue: 165000000, salesQty: 6320, marginRate: 34.2, risk: "품절 위험", brand: { name: "A 뷰티", status: "성장" } };
const inventory: InventoryItem = { id: "stock-a", productId: "a", stockQty: 720, dailySales: 180, stockDays: 4, leadTimeDays: 7, safetyStock: 540, expectedStockoutDate: "2026-10-25T00:00:00Z", status: "발주 필요", recommendedOrderQty: 1200, orderStatus: "미발주", product: { name: product.name, category: product.category }, purchaseOrders: [] };
const now = new Date("2026-10-29T00:00:00Z");

test("A 립밤 재고 4일, 안전재고 도달 1일, 일반 입고 전 공백 3일을 계산한다", () => {
  const result = diagnoseProduct(product, [product], inventory, now);
  assert.equal(result.issue, "STOCK_GAP");
  assert.equal(result.stock?.coverageDays, 4);
  assert.equal(result.stock?.safetyDays, 1);
  assert.equal(result.gapDays, 3);
});
test("발주량 증가는 입고 전 공백을 줄이지 않고 입고 후 재고만 바꾼다", () => {
  const small = simulateProductScenario(720, 180, 1200, 7, "STANDARD")!;
  const large = simulateProductScenario(720, 180, 2400, 7, "STANDARD")!;
  assert.equal(small.gapDays, 3); assert.equal(large.gapDays, 3);
  assert.equal(small.unmetUnits, 540); assert.equal(large.unmetUnits, 540);
  assert.equal(small.unitsAfter, 1200); assert.equal(large.unitsAfter, 2400);
});
test("직접 입력한 2일 긴급 입고 가정은 공백 없이 잔여 재고와 입고를 합한다", () => {
  const result = simulateProductScenario(720, 180, 1200, 2, "EXPEDITED")!;
  assert.equal(result.gapDays, 0); assert.equal(result.unmetUnits, 0);
  assert.equal(result.unitsAfter, 1560);
});
test("보류는 발주량을 더하지 않고 재검토 시점까지의 재고만 계산한다", () => {
  const result = simulateProductScenario(720, 180, 1200, 3, "HOLD")!;
  assert.equal(result.quantity, 0); assert.equal(result.unitsAfter, 180);
  assert.equal(result.coverageAfter, 1);
});
test("판매량 0, 음수 재고, 빈 납기와 잘못된 수량은 전망을 생성하지 않는다", () => {
  assert.equal(stockPosition({ ...inventory, dailySales: 0 }), null);
  assert.equal(simulateProductScenario(720, 0, 1200, 7, "STANDARD"), null);
  assert.equal(simulateProductScenario(-1, 180, 1200, 7, "STANDARD"), null);
  assert.equal(simulateProductScenario(720, 180, 1200, NaN, "EXPEDITED"), null);
  assert.equal(simulateProductScenario(720, 180, 1.5, 7, "STANDARD"), null);
  assert.equal(simulateProductScenario(720, 180, 0, 7, "STANDARD"), null);
  assert.equal(diagnoseProduct(product, [product], { ...inventory, stockQty: 0 }, now).issue, "STOCKOUT");
});
test("카테고리 비교는 선택 상품을 제외한 중앙값을 사용하고 매출 동률을 같은 순위로 처리한다", () => {
  const products = [product, { ...product, id: "b", revenue: 165000000, marginRate: 36 }, { ...product, id: "c", revenue: 100000000, marginRate: 40 }];
  const result = categoryBenchmark(product, products);
  assert.equal(result.rank, 1); assert.equal(result.peerCount, 2); assert.equal(result.peerMargin, 38);
  assert.ok(Math.abs(result.marginGap! + 3.8) < 1e-9);
  assert.equal(categoryBenchmark(product, [product]).peerMargin, null);
  assert.equal(categoryBenchmark({ ...product, revenue: 0 }, [{ ...product, revenue: 0 }]).revenueShare, null);
});
test("기존 미입고 발주가 있으면 해당 일정으로 공백을 확인하고 지연을 우선 표시한다", () => {
  const order = { id: "po", quantity: 1200, status: "발주 완료", expectedArrival: "2026-10-31T00:00:00Z", createdAt: now.toISOString() };
  const result = diagnoseProduct(product, [product], { ...inventory, orderStatus: "발주 완료", purchaseOrders: [order] }, now);
  assert.equal(result.arrivalDays, 2); assert.equal(result.gapDays, 0);
  const overdue = diagnoseProduct(product, [product], { ...inventory, orderStatus: "발주 완료", purchaseOrders: [{ ...order, expectedArrival: "2026-10-28T00:00:00Z" }] }, now);
  assert.equal(overdue.issue, "OVERDUE");
  const complete = diagnoseProduct(product, [product], { ...inventory, purchaseOrders: [{ ...order, status: "입고 완료" }] }, now);
  assert.equal(complete.activeOrderCount, 0);
});
test("등록된 재고일수와 무관하게 재고·판매속도로 계산하고 재고 관계를 우선한다", () => {
  assert.equal(stockPosition({ ...inventory, stockDays: 999 })?.coverageDays, 4);
  assert.equal(productInventory({ ...product, inventory: { ...inventory, stockQty: 1 } }, [inventory])?.stockQty, 720);
  assert.equal(diagnoseProduct(product, [product], undefined, now).issue, "NO_INVENTORY");
});
test("관련 업무는 상품 연결을 우선하며 다른 재고에 연결된 이름 일치 업무를 섞지 않는다", () => {
  const base: TaskItem = { id: "task", title: "A 립밤 발주 결정", description: "", category: "재고/발주", priority: "HIGH", dueAt: null, dueLabel: "오늘", status: "대기", aiExecutable: false, source: "USER_INPUT", reason: "", requiresDecision: true, inventoryId: null, decisions: [] };
  const tasks = [{ ...base, id: "linked", title: "발주 확인", inventoryId: inventory.id }, { ...base, id: "named" }, { ...base, id: "other", inventoryId: "other-stock" }];
  assert.deepEqual(relatedProductTasks(product, inventory, tasks).map((item) => item.id), ["linked", "named"]);
});

test("보류 후 재검토 시점에 발주하면 리드타임만큼 공백이 생기는 것을 함께 계산한다", async () => {
  const { holdReorderGap } = await import("../lib/services/product-diagnostics");
  // 532개 / 하루 76개 = 7일분, 3일 보류 후 발주 → 3 + 9 = 12일째 입고 → 5일 공백
  const result = holdReorderGap(532, 76, 3, 9)!;
  assert.equal(result.arrivalDay, 12);
  assert.equal(Number(result.gapDays.toFixed(1)), 5);
  assert.equal(result.unmetUnits, 380);
  assert.equal(holdReorderGap(2000, 76, 3, 9)!.gapDays, 0);
  assert.equal(holdReorderGap(532, 0, 3, 9), null);
});
