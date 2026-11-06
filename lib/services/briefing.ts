import type { DashboardData, InventoryItem } from "@/lib/types/domain";
import { latestConfirmed } from "@/lib/decisions/shared";
import { shortDate } from "@/lib/services/data-freshness";

export type SignalTone = "red" | "orange" | "green";

export interface BriefingSignal {
  id: string;
  tone: SignalTone;
  label: string;
  title: string;
  evidence: string;
  impact: string;
  source: string;
  /** decided: 이미 발주 결정이 확정돼 등록만 남은 상태(새 결정을 요구하지 않고 기존 결정을 엽니다). */
  action: { label: string; kind: "order"; inventory: InventoryItem; decided?: boolean } | { label: string; kind: "link"; href: string };
}

const won = (value: number) => {
  const man = Math.round(value / 10000);
  return man >= 10000 ? `${(man / 10000).toFixed(1)}억원` : `${new Intl.NumberFormat("ko-KR").format(man)}만원`;
};

/** 홈 '오늘 결정할 것': 재고 · 경쟁사 · 트렌드에서 영향이 큰 신호를 하나씩 고릅니다. */
export function buildBriefing(data: DashboardData, inCategory: (category?: string | null) => boolean): BriefingSignal[] {
  const signals: BriefingSignal[] = [];

  const risk = data.inventory
    .filter((item) => item.orderStatus !== "발주 완료" && item.stockDays < item.leadTimeDays && inCategory(item.product?.category))
    .sort((a, b) => (a.stockDays - a.leadTimeDays) - (b.stockDays - b.leadTimeDays))[0];
  if (risk) {
    const product = data.products.find((item) => item.id === risk.productId);
    const unitPrice = product && product.salesQty ? product.revenue / product.salesQty : 0;
    const gapDays = Math.max(0, risk.leadTimeDays - risk.stockDays);
    // 발주 결정은 확정됐지만 아직 등록하지 않은 상품은 "검토"가 아니라 "등록"을 안내합니다.
    const decidedTask = risk.orderStatus === "발주 결정 · 실행 대기"
      ? data.tasks.filter((task) => task.inventoryId === risk.id && latestConfirmed(task)?.outcome === "PROCEED").sort((a, b) => (latestConfirmed(b)?.confirmedAt ?? "").localeCompare(latestConfirmed(a)?.confirmedAt ?? ""))[0]
      : undefined;
    const decided = decidedTask ? latestConfirmed(decidedTask) : undefined;
    if (decided) signals.push({
      id: "inventory", tone: "red", label: "긴급",
      title: `${risk.product?.name ?? "상품"} ${decided.quantity ? `${new Intl.NumberFormat("ko-KR").format(decided.quantity)}개 ` : ""}발주 결정됨 — 아직 발주 등록 전이에요`,
      evidence: `${shortDate(decided.confirmedAt ?? decided.createdAt)} ${decided.authorName} 결정 · 재고 ${risk.stockDays}일분 · 리드타임 ${risk.leadTimeDays}일`,
      impact: gapDays ? `등록이 늦어질수록 입고 전 품절 공백(현재 약 ${gapDays}일)이 길어져요` : "결정한 수량으로 발주를 등록하세요",
      source: `결정 기록 · 재고${risk.updatedAt ? ` · ${shortDate(risk.updatedAt)} 수정` : ""}`,
      action: { label: "발주 등록하기", kind: "order", inventory: risk, decided: true },
    });
    else signals.push({
      id: "inventory", tone: "red", label: "긴급",
      title: `${risk.product?.name ?? "상품"} 재고 ${risk.stockDays}일분 — 리드타임 ${risk.leadTimeDays}일보다 짧아요`,
      evidence: `일평균 ${risk.dailySales}개 판매 · 안전재고 ${risk.safetyStock}개 · 권장 발주 ${risk.recommendedOrderQty}개`,
      impact: unitPrice && gapDays ? `지금 발주해도 입고 전 약 ${gapDays}일 품절 공백 · 하루 매출 약 ${won(unitPrice * risk.dailySales)} (추정)` : "입고 전 품절 가능성을 확인해야 해요",
      source: `재고${risk.updatedAt ? ` · ${shortDate(risk.updatedAt)} 수정` : ""}`,
      action: { label: "발주 검토", kind: "order", inventory: risk },
    });
  }

  const competitor = [...data.competitorEvents].sort((a, b) => Math.abs(b.impactEstimate) - Math.abs(a.impactEstimate))[0];
  if (competitor) {
    const now = Date.parse(data.meta.lastUpdated) || 0;
    const ended = Boolean(now && Date.parse(competitor.endAt) < now);
    signals.push({
      id: "competitor", tone: "orange", label: ended ? "종료" : "주의",
      title: ended ? `${competitor.title} — ${shortDate(competitor.endAt)}에 종료, 결과 확인` : `${competitor.title}${competitor.overlapDescription ? ` — ${competitor.overlapDescription}` : ""}`,
      evidence: competitor.detail,
      impact: `예상 매출 영향 -${won(Math.abs(competitor.impactEstimate))} · 영향 상품 ${competitor.affectedSkuCount}개 (추정)`,
      source: `경쟁사 모니터링 · ${shortDate(competitor.startAt)}`,
      action: { label: "대응안 보기", kind: "link", href: "/market" },
    });
  }

  const keyword = [...data.marketKeywords].sort((a, b) => b.tenWeeksChange - a.tenWeeksChange)[0];
  if (keyword && keyword.tenWeeksChange > 0) {
    const related = data.inventory.find((item) => item.product?.name.includes(keyword.keyword));
    signals.push({
      id: "trend", tone: "green", label: "기회",
      title: `'${keyword.keyword}' 검색 관심도 상승 — 10주간 +${keyword.tenWeeksChange}p`,
      evidence: `관심도 지수 ${keyword.currentIndex} · 월 검색량 ${new Intl.NumberFormat("ko-KR").format(keyword.monthlyVolume)}회 · 전년 대비 ${keyword.yearOverYear > 0 ? "+" : ""}${keyword.yearOverYear}%`,
      impact: related ? `관련 상품 ${related.product?.name} 재고 ${related.stockDays}일분 — 기획전 전에 재고부터 확인` : keyword.judgment,
      source: "검색 트렌드",
      action: { label: "기획전 초안", kind: "link", href: `/promotions?topic=${encodeURIComponent(keyword.keyword)}` },
    });
  }
  return signals;
}

/** 저장된 일별 매출의 마지막 날과 그 7일 전 같은 요일을 비교합니다. */
export function lastDayRevenue(data: DashboardData) {
  const byDay = new Map<string, number>();
  for (const row of data.salesMetrics) {
    const key = row.date.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + row.revenue);
  }
  const days = [...byDay.keys()].sort();
  const last = days[days.length - 1];
  if (!last) return null;
  const weekBefore = new Date(Date.parse(last + "T00:00:00Z") - 7 * 86_400_000).toISOString().slice(0, 10);
  const value = byDay.get(last)!;
  const previous = byDay.get(weekBefore);
  return { day: last, value, changeRate: previous ? ((value - previous) / previous) * 100 : null, label: won(value) };
}

export function pendingDecisionTasks(data: DashboardData) {
  return data.tasks.filter((task) => task.requiresDecision && task.status !== "완료" && !latestConfirmed(task));
}
