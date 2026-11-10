import type { DashboardData, InventoryItem } from "@/lib/types/domain";
import { lastRejected, latestConfirmed, pendingApproval } from "@/lib/decisions/shared";
import { shortDate } from "@/lib/services/data-freshness";
import { poNumber, poStage, resolveSupplier } from "@/lib/orders/purchase-order";
import { eventPhase, focusCompetitorEvent } from "@/lib/services/competitor";

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
  action: { label: string; kind: "order"; inventory: InventoryItem; decided?: boolean } | { label: string; kind: "link"; href: string } | { label: string; kind: "po"; purchaseOrderId: string };
}

const won = (value: number) => {
  const man = Math.round(value / 10000);
  return man >= 10000 ? `${(man / 10000).toFixed(1)}억원` : `${new Intl.NumberFormat("ko-KR").format(man)}만원`;
};

/** 홈 '오늘 결정할 것': 재고 · 경쟁사 · 트렌드에서 영향이 큰 신호를 하나씩 고릅니다. */
export function buildBriefing(data: DashboardData, inCategory: (category?: string | null) => boolean): BriefingSignal[] {
  const signals: BriefingSignal[] = [];

  // 발주를 등록했지만 거래처에 아직 보내지 않았거나(가장 급함), 보냈는데 납기 회신을 못 받은 발주를 먼저 알립니다.
  const now = Date.parse(data.meta.lastUpdated) || 0;
  const openOrders = data.inventory.filter((item) => inCategory(item.product?.category))
    .flatMap((item) => (item.purchaseOrders ?? []).map((po) => ({ item, po, stage: poStage(po.status) })));
  // 여러 건이면 품절에 가장 가까운(재고일수가 적은) 상품부터, 같으면 입고 희망일이 빠른 순입니다.
  const unsentAll = openOrders.filter((row) => row.stage === "발주 등록").sort((a, b) => a.item.stockDays - b.item.stockDays || a.po.expectedArrival.localeCompare(b.po.expectedArrival));
  const unsent = unsentAll[0];
  const awaiting = openOrders.filter((row) => row.stage === "발주서 발송").sort((a, b) => a.po.expectedArrival.localeCompare(b.po.expectedArrival))[0];
  const poSignal = unsent ?? awaiting;
  if (poSignal) {
    const name = poSignal.item.product?.name ?? "상품";
    const brand = data.products.find((product) => product.id === poSignal.item.productId)?.brand?.name;
    const supplier = resolveSupplier(brand, data)?.company ?? brand ?? "거래처";
    signals.push(unsent ? {
      id: "inventory", tone: "red", label: "발주서",
      title: `${name} ${poSignal.po.quantity.toLocaleString("ko-KR")}개 발주 등록됨 — ${supplier}에 발주서를 아직 보내지 않았어요`,
      evidence: `${poNumber(poSignal.po)} · 희망 입고 ${shortDate(poSignal.po.expectedArrival)} · 재고 ${poSignal.item.stockDays}일분${unsentAll.length > 1 ? ` · 발송 대기 ${unsentAll.length}건 (나머지는 매출·재고 > 재고/발주)` : ""}`,
      impact: `발주서를 보내야 거래처가 납기를 잡습니다. 보내지 않으면 희망 입고일(${shortDate(poSignal.po.expectedArrival)})이 지켜지지 않아요`,
      source: "발주 · 입고 진행",
      action: { label: "발주서 메일 보내기", kind: "po", purchaseOrderId: poSignal.po.id },
    } : {
      id: "inventory", tone: "orange", label: "회신 대기",
      title: `${name} 발주서 보냄 — ${supplier} 납기 회신을 확인하세요`,
      evidence: `${poNumber(poSignal.po)} · 희망 입고 ${shortDate(poSignal.po.expectedArrival)}${now && Date.parse(poSignal.po.expectedArrival) < now ? " · 희망일 지남" : ""}`,
      impact: "회신받은 입고일로 확정해야 입고 추적과 캘린더가 맞춰집니다",
      source: "발주 · 입고 진행",
      action: { label: "납기 회신 입력", kind: "po", purchaseOrderId: poSignal.po.id },
    });
  }

  const risk = poSignal ? undefined : data.inventory
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

  const competitorNow = Date.parse(data.meta.lastUpdated) || 0;
  const competitor = focusCompetitorEvent(data.competitorEvents, competitorNow);
  if (competitor) {
    const phase = eventPhase(competitor, competitorNow);
    const ended = phase === "ended";
    signals.push({
      id: "competitor", tone: "orange", label: ended ? "종료" : phase === "upcoming" ? "예정" : "주의",
      title: ended ? `${competitor.title} — ${shortDate(competitor.endAt)}에 종료, 결과 확인` : phase === "upcoming" ? `${competitor.title} — ${shortDate(competitor.startAt)} 시작 예정${competitor.overlapDescription ? ` · ${competitor.overlapDescription}` : ""}` : `${competitor.title}${competitor.overlapDescription ? ` — ${competitor.overlapDescription}` : ""}`,
      evidence: competitor.detail,
      impact: `예상 매출 영향 -${won(Math.abs(competitor.impactEstimate))} · 영향 상품 ${competitor.affectedSkuCount}개 (추정)`,
      source: `경쟁사 모니터링 · ${shortDate(competitor.startAt)}`,
      // 진행 중·예정이면 대응안으로, 끝났으면 행사 전·중·후 매출을 비교하는 결과 확인으로 보냅니다.
      action: ended
        ? { label: "결과 확인", kind: "link", href: `/market?tab=overview&focus=result&event=${competitor.id}` }
        : { label: phase === "upcoming" ? "대응안 준비" : "대응안 보기", kind: "link", href: `/market?tab=overview&focus=competitor&event=${competitor.id}` },
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
  return data.tasks.filter((task) => task.requiresDecision && task.status !== "완료" && !latestConfirmed(task) && !pendingApproval(task));
}

/** 홈에 보여줄 승인 현황: 내가 승인할 것 / 내가 올려서 기다리는 것 / 반려된 것 */
export function approvalSummary(data: DashboardData, viewerId?: string, canApprove = false) {
  const withPending = data.tasks.map((task) => ({ task, decision: pendingApproval(task) })).filter((row) => row.decision);
  const toReview = canApprove ? withPending.filter((row) => row.decision!.authorId !== viewerId) : [];
  const waiting = withPending.filter((row) => row.decision!.authorId === viewerId);
  const rejected = data.tasks.map((task) => ({ task, decision: lastRejected(task) })).filter((row) => row.decision && row.decision.authorId === viewerId && !latestConfirmed(row.task) && !pendingApproval(row.task));
  return { toReview, waiting, rejected };
}
