import type { InventoryItem, ProductItem, TaskItem } from "@/lib/types/domain";

export type ProductIssue = "OVERDUE" | "ORDER_CHECK" | "STOCKOUT" | "STOCK_GAP" | "SAFETY" | "OVERSTOCK" | "MARGIN" | "NO_INVENTORY" | "NO_VELOCITY" | "NORMAL";
export type ProductScenarioKey = "STANDARD" | "EXPEDITED" | "HOLD";

export function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function categoryBenchmark(product: ProductItem, products: ProductItem[]) {
  const category = products.filter((item) => item.category === product.category);
  const peers = category.filter((item) => item.id !== product.id);
  const peerMargin = median(peers.map((item) => item.marginRate));
  const totalRevenue = category.reduce((sum, item) => sum + item.revenue, 0);
  return {
    categorySize: category.length,
    rank: category.length ? 1 + peers.filter((item) => item.revenue > product.revenue).length : null,
    revenueShare: totalRevenue > 0 ? product.revenue / totalRevenue * 100 : null,
    peerCount: peers.length,
    peerMargin,
    marginGap: peerMargin === null || !Number.isFinite(product.marginRate) ? null : product.marginRate - peerMargin,
  };
}

export function stockPosition(inventory?: InventoryItem | null) {
  if (!inventory || !Number.isFinite(inventory.stockQty) || !Number.isFinite(inventory.dailySales) || inventory.dailySales <= 0 || !Number.isFinite(inventory.leadTimeDays) || inventory.leadTimeDays < 0 || !Number.isFinite(inventory.safetyStock) || inventory.safetyStock < 0) return null;
  const coverageDays = Math.max(0, inventory.stockQty) / inventory.dailySales;
  const safetyDays = Math.max(0, inventory.stockQty - Math.max(0, inventory.safetyStock)) / inventory.dailySales;
  return { coverageDays, safetyDays, gapDays: Math.max(0, inventory.leadTimeDays - coverageDays) };
}

/** Independent, constant-demand scenario; no other inbound orders or backorders are assumed. */
export function simulateProductScenario(stockQty: number, dailySales: number, quantity: number, days: number, kind: ProductScenarioKey) {
  if (![stockQty, dailySales, quantity, days].every(Number.isFinite) || dailySales <= 0 || stockQty < 0 || days < 0 || days > 365 || !Number.isInteger(quantity) || quantity < 0 || quantity > 10000000 || (kind !== "HOLD" && quantity < 1)) return null;
  const coverageDays = stockQty / dailySales;
  const gapDays = Math.max(0, days - coverageDays);
  const remainingUnits = Math.max(0, stockQty - dailySales * days);
  const unitsAfter = remainingUnits + (kind === "HOLD" ? 0 : quantity);
  return {
    days, dailySales, quantity: kind === "HOLD" ? 0 : quantity, coverageDays, gapDays,
    unmetUnits: Math.ceil(gapDays * dailySales), unitsAfter, coverageAfter: unitsAfter / dailySales,
  };
}

/**
 * 보류 후 재검토 시점에 바로 발주한다고 가정했을 때(리드타임 그대로) 입고 전까지의 재고 공백.
 * 보류 행의 "그전 공백"은 재검토 시점까지만 보므로, 이 값을 함께 보여줘야 보류가 안전해 보이는 착시를 막습니다.
 */
export function holdReorderGap(stockQty: number, dailySales: number, holdDays: number, leadTimeDays: number) {
  if (![stockQty, dailySales, holdDays, leadTimeDays].every(Number.isFinite) || dailySales <= 0 || stockQty < 0 || holdDays < 0 || leadTimeDays < 0) return null;
  const arrivalDay = holdDays + leadTimeDays;
  const gapDays = Math.max(0, arrivalDay - stockQty / dailySales);
  return { arrivalDay, gapDays, unmetUnits: Math.ceil(gapDays * dailySales) };
}

export function productInventory(product: ProductItem, inventories: InventoryItem[]) {
  return inventories.find((item) => item.productId === product.id) ?? product.inventory ?? undefined;
}

export function relatedProductTasks(product: ProductItem, inventory: InventoryItem | undefined | null, tasks: TaskItem[]) {
  return tasks.filter((task) => task.inventoryId ? task.inventoryId === inventory?.id : task.title.includes(product.name));
}

export function diagnoseProduct(product: ProductItem, products: ProductItem[], inventory?: InventoryItem | null, now = new Date()) {
  const benchmark = categoryBenchmark(product, products);
  const stock = stockPosition(inventory);
  const activeOrders = (inventory?.purchaseOrders ?? []).filter((order) => !["취소", "입고 완료", "완료"].includes(order.status))
    .filter((order) => Number.isFinite(Date.parse(order.expectedArrival)))
    .sort((a, b) => a.expectedArrival.localeCompare(b.expectedArrival));
  const nextOrder = activeOrders[0];
  const arrivalDays = nextOrder ? (new Date(nextOrder.expectedArrival).getTime() - now.getTime()) / 86400000 : null;
  const overdue = arrivalDays !== null && arrivalDays < 0;
  const gapDays = stock ? Math.max(0, (arrivalDays !== null && !overdue ? arrivalDays : inventory!.leadTimeDays) - stock.coverageDays) : null;
  let issue: ProductIssue = "NORMAL";
  let priority = 0;
  let headline = "현재 자료에서 급한 재고 공백은 계산되지 않았습니다";
  let explanation = "카테고리 내 성과와 재고 여유를 함께 확인하고, 상품별 추이 자료를 보완하세요.";
  let actionTask = "판매 추이 자료 확인";
  if (!inventory) {
    issue = "NO_INVENTORY"; priority = 1; headline = "상품에 연결된 재고 자료가 없습니다";
    explanation = "매출·마진 비교는 가능하지만 품절 시점과 발주 수량은 판단할 수 없습니다."; actionTask = "재고 자료 확인";
  } else if (overdue) {
    issue = "OVERDUE"; priority = 5; headline = "입고 예정일이 지났습니다";
    explanation = "미입고 발주가 남아 있습니다. 실제 입고 여부와 공급사 납기를 먼저 확인하세요."; actionTask = "입고 지연 여부 확인";
  } else if (inventory.orderStatus === "발주 완료" && !nextOrder) {
    issue = "ORDER_CHECK"; priority = 4; headline = "발주 상태와 입고 기록을 확인해주세요";
    explanation = "발주 완료 상태지만 유효한 미입고 일정이 없습니다. 기존 발주·입고 이력을 확인하세요."; actionTask = "발주·입고 기록 확인";
  } else if (!stock) {
    issue = "NO_VELOCITY"; priority = 1; headline = "재고 전망에 필요한 판매 속도를 확인해주세요";
    explanation = "일평균 판매량이 0이거나 유효하지 않아 재고가 버틸 기간을 계산할 수 없습니다."; actionTask = "일평균 판매 기준 확인";
  } else if (inventory.stockQty <= 0) {
    issue = "STOCKOUT"; priority = 5; headline = "판매 가능한 재고가 소진됐습니다";
    explanation = "입고 가능일과 판매 가능 여부를 확인하고, 고객에게 안내할 내용을 정리하세요."; actionTask = "재입고 가능일 확인";
  } else if ((gapDays ?? 0) > 0) {
    issue = "STOCK_GAP"; priority = 4; headline = `입고 전 약 ${gapDays!.toFixed(1)}일 재고 공백 가능성이 있습니다`;
    explanation = nextOrder ? "기존 발주의 입고까지 현재 재고가 부족할 수 있습니다. 납기 확인이 우선입니다." : "현재 판매 속도가 유지된다는 가정입니다. 일반 발주량을 늘려도 도착 전 공백은 줄어들지 않습니다.";
    actionTask = nextOrder ? "기존 발주 납기 확인" : "긴급 납기 가능 여부 확인";
  } else if (stock.safetyDays < (arrivalDays !== null ? arrivalDays : inventory.leadTimeDays)) {
    issue = "SAFETY"; priority = 3; headline = "입고 전에 안전재고 아래로 내려갈 수 있습니다";
    explanation = "완전 품절까지는 여유가 있어도 안전재고 기준으로는 완충 물량이 부족합니다."; actionTask = "재고 보충 일정 확인";
  } else if (inventory.status === "과재고" || product.risk.includes("과재고")) {
    issue = "OVERSTOCK"; priority = 2; headline = "추가 발주보다 재고 소진 대안을 검토할 시점입니다";
    explanation = `등록 상태는 과재고이며, 현재 판매 속도 기준 재고는 약 ${stock.coverageDays.toFixed(1)}일분입니다. 할인 전 마진 조건을 확인하세요.`; actionTask = "재고 소진 대안 조사";
  } else if (benchmark.marginGap !== null && benchmark.marginGap < 0) {
    issue = "MARGIN"; priority = 1; headline = "같은 카테고리 비교 상품보다 마진율이 낮습니다";
    explanation = `비교 상품 ${benchmark.peerCount}개의 중앙값보다 ${Math.abs(benchmark.marginGap).toFixed(1)}%p 낮습니다. 할인·원가 조건을 확인하세요.`; actionTask = "할인·원가 조건 확인";
  }
  return { product, inventory, benchmark, stock, nextOrder, activeOrderCount: activeOrders.length, arrivalDays, gapDays, issue, priority, headline, explanation, actionTask };
}

export function prioritizeProducts(products: ProductItem[], inventories: InventoryItem[], now = new Date()) {
  return products.map((product) => diagnoseProduct(product, products, productInventory(product, inventories), now))
    .sort((a, b) => b.priority - a.priority || (a.stock?.coverageDays ?? Infinity) - (b.stock?.coverageDays ?? Infinity) || b.product.revenue - a.product.revenue);
}
