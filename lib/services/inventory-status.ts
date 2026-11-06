import type { InventoryItem } from "@/lib/types/domain";

export type StockState = { tone: "red" | "orange" | "blue" | "neutral"; label: "발주 완료" | "품절 위험" | "과재고" | "주의" | "양호" };

/**
 * 재고 상태 판정의 단일 기준입니다. 저장된 상태 문자열 대신 재고일수와 리드타임 관계로 계산해
 * 홈 브리핑·채널별 재고·재고/발주 화면이 같은 상품을 같은 상태로 보여주게 합니다.
 */
export function stockState(item: Pick<InventoryItem, "orderStatus" | "stockDays" | "leadTimeDays" | "status">): StockState {
  if (item.orderStatus === "발주 완료") return { tone: "neutral", label: "발주 완료" };
  if (item.stockDays < item.leadTimeDays) return { tone: "red", label: "품절 위험" };
  if (item.status === "과재고") return { tone: "blue", label: "과재고" };
  if (item.stockDays < item.leadTimeDays * 2) return { tone: "orange", label: "주의" };
  return { tone: "neutral", label: "양호" };
}

/** 입고 전 재고 공백이 큰 순서(재고일수 − 리드타임 오름차순)로 정렬합니다. */
export function byStockGap(a: Pick<InventoryItem, "stockDays" | "leadTimeDays">, b: Pick<InventoryItem, "stockDays" | "leadTimeDays">) {
  return (a.stockDays - a.leadTimeDays) - (b.stockDays - b.leadTimeDays);
}
