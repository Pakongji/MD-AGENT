import type { DashboardData } from "@/lib/types/domain";
import { latestConfirmed } from "@/lib/decisions/shared";
import { byStockGap, stockState } from "@/lib/services/inventory-status";

const md = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).format(new Date(value));
const count = (value: number) => new Intl.NumberFormat("ko-KR").format(value);

/**
 * 성과 리포트의 '다음 Action'을 현재 업무 데이터에서 만듭니다.
 * 고정 문구 대신 실제 발주·결정·재고 상태를 보므로, 발주하지 않은 상품에 "입고 추적"을 쓰지 않습니다.
 */
export function reportNextActions(data: Pick<DashboardData, "inventory" | "tasks" | "competitorEvents">, now = new Date(), limit = 4) {
  const actions: string[] = [];

  for (const item of data.inventory) {
    const name = item.product?.name ?? "상품";
    if (item.orderStatus === "발주 결정 · 실행 대기") {
      const decided = data.tasks.filter((task) => task.inventoryId === item.id).map(latestConfirmed).find((decision) => decision?.outcome === "PROCEED");
      actions.push(`${name} ${decided?.quantity ? `${count(decided.quantity)}개 ` : ""}발주 등록 (결정 완료 · 등록 전)`);
    }
  }
  for (const item of data.inventory) {
    const order = item.purchaseOrders?.find((po) => po.status !== "입고 완료");
    if (item.orderStatus === "발주 완료" && order) actions.push(`${item.product?.name ?? "상품"} ${count(order.quantity)}개 입고 추적 (예정 ${md(order.expectedArrival)})`);
  }
  for (const item of data.inventory.filter((row) => stockState(row).label === "품절 위험" && row.orderStatus !== "발주 결정 · 실행 대기").sort(byStockGap)) {
    actions.push(`${item.product?.name ?? "상품"} 발주 검토 (재고 ${item.stockDays}일 < 리드타임 ${item.leadTimeDays}일)`);
  }
  for (const task of data.tasks) {
    const decision = latestConfirmed(task);
    if (task.status !== "완료" && decision?.outcome === "HOLD" && decision.reviewAt && Date.parse(decision.reviewAt) >= now.getTime()) {
      actions.push(`${task.title} 재검토 (${md(decision.reviewAt)})`);
    }
  }
  if (data.competitorEvents.some((event) => Date.parse(event.endAt) >= now.getTime())) actions.push("진행 중인 경쟁사 행사 실구매가 모니터링");

  return [...new Set(actions)].slice(0, limit);
}
