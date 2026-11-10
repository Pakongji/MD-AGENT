"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, Download, Mail, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState, compactMoney, money } from "@/components/common/ui";
import { matchesCategory, useAppStore } from "@/lib/store/app-store";
import { CHANNELS } from "@/lib/mock/samples";
import { channelRows, channelShareFrom } from "@/lib/services/channel-stats";
import { getSalesSnapshot, signedPercent } from "@/lib/services/dashboard-metrics";
import { dataAsOf } from "@/lib/services/data-freshness";
import { stockState } from "@/lib/services/inventory-status";
import { ProductLabel } from "@/components/common/product-thumb";
import { focusCompetitorEvent } from "@/lib/services/competitor";

/** 매출·재고 > 채널별: 채널로 쪼개 보고, 재고 위험은 바로 발주 검토까지 */
export function ChannelOverview() {
  const { data, filters, setFilters, openDecision, showToast } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sales = getSalesSnapshot(data.salesMetrics);
  const rows = channelRows(data);
  const isSample = rows[0]?.sample ?? true;
  const share = channelShareFrom(rows, filters.channel);
  const sampleApplied = filters.channel !== "전체";
  const marginRate = useMemo(() => {
    const total = data.products.reduce((sum, item) => sum + item.revenue, 0);
    return total ? data.products.reduce((sum, item) => sum + item.marginRate * item.revenue, 0) / total : 0;
  }, [data.products]);
  const alert = rows.find((item) => item.alert);
  const competitor = focusCompetitorEvent(data.competitorEvents, Date.parse(data.meta.lastUpdated) || 0);
  const inventory = data.inventory
    .filter((item) => matchesCategory(filters, item.product?.category))
    .sort((a, b) => (a.stockDays - a.leadTimeDays) - (b.stockDays - b.leadTimeDays));
  const risky = inventory.filter((item) => stockState(item).label === "품절 위험");
  const picked = inventory.filter((item) => selected.has(item.id));

  function toggle(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function exportErp() {
    const rows = [["상품코드", "상품명", "발주수량", "현재고", "리드타임(일)", "비고"], ...picked.map((item) => [item.productId, item.product?.name ?? "", item.recommendedOrderQty, item.stockQty, item.leadTimeDays, `재고 ${item.stockDays}일분`])];
    const csv = "﻿" + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `발주-ERP업로드-${new Date().toLocaleDateString("en-CA")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("ERP 업로드용 파일을 받았어요. 열 이름이 다르면 ERP 양식에 맞게 바꿔주세요.", "success");
  }

  const mailBody = picked.map((item) => `- ${item.product?.name}: ${money(item.recommendedOrderQty)}개 (현재 재고 ${item.stockDays}일분, 리드타임 ${item.leadTimeDays}일)`).join("\n");

  return <DataBoundary><div className="stack">
    <div className="rd-toolbar">
      <div className="rd-channel-tabs" role="group" aria-label="판매 채널">
        {CHANNELS.map((channel) => <button key={channel} aria-pressed={filters.channel === channel} onClick={() => setFilters({ channel })}>
          {channel}{rows.find((item) => item.channel === channel)?.alert && <i className="rd-dot" aria-label="이상 신호" />}
        </button>)}
      </div>
      <span className="rd-muted rd-push"><Clock3 size={13} /> 기준 {dataAsOf(data)} · {isSample ? "채널 비중은 샘플" : "업로드한 매출 기준"}</span>
    </div>

    <div className="rd-kpis rd-kpis-4">
      <Card className="rd-kpi"><span>매출{sampleApplied ? ` · ${filters.channel}` : ""}</span><div><strong>{compactMoney(sales.revenue * share)}</strong><Badge tone={sales.revenueChangeRate >= 0 ? "green" : "red"}>{signedPercent(sales.revenueChangeRate)}</Badge></div><small>직전 {sales.periodDays}일 대비{sampleApplied ? (isSample ? " · 샘플 비중 적용" : " · 채널 비중 적용") : ""}</small></Card>
      <Card className="rd-kpi"><span>주문</span><div><strong>{money(Math.round(sales.orders * share))}건</strong><Badge tone={sales.ordersChangeRate >= 0 ? "green" : "red"}>{signedPercent(sales.ordersChangeRate)}</Badge></div><small>직전 {sales.periodDays}일 대비</small></Card>
      <Card className="rd-kpi"><span>객단가</span><div><strong>{money(sales.averageOrderValue)}원</strong><Badge tone={sales.averageOrderValueChangeRate >= 0 ? "green" : "red"}>{signedPercent(sales.averageOrderValueChangeRate)}</Badge></div><small>직전 {sales.periodDays}일 대비</small></Card>
      <Card className="rd-kpi"><span>마진율</span><div><strong>{marginRate.toFixed(1)}%</strong></div><small>상품 등록값의 매출 가중 평균</small></Card>
    </div>

    <div className="rd-columns rd-columns-even">
      <Card>
        <div className="rd-card-head"><div className="rd-card-title"><h3>채널별 매출</h3>{alert && <Badge tone="red">이상 신호 1</Badge>}</div><span className="rd-muted">최근 {isSample ? sales.periodDays : 30}일 · {isSample ? "샘플 비중" : "업로드 매출"}</span></div>
        <div className="table-wrap"><table className="data-table rd-table"><thead><tr><th>채널</th><th>매출</th><th>비중</th><th>직전 대비</th><th>전환율</th><th>메모</th></tr></thead><tbody>
          {rows.map((row) => <tr key={row.channel} className={filters.channel === row.channel ? "rd-row-active" : undefined}>
            <td>{(CHANNELS as readonly string[]).includes(row.channel) ? <button className="rd-link-strong" onClick={() => setFilters({ channel: row.channel as (typeof CHANNELS)[number] })}>{row.channel}</button> : <strong>{row.channel}</strong>}</td>
            <td>{compactMoney(row.revenue ?? sales.revenue * row.share)}</td><td>{Math.round(row.share * 100)}%</td>
            <td>{row.alert ? <Badge tone="red">{signedPercent(row.changeRate)}</Badge> : <span className={row.changeRate >= 0 ? "green" : "red"}>{signedPercent(row.changeRate)}</span>}</td>
            <td>{row.conversionRate === null ? "—" : `${row.conversionRate.toFixed(1)}%`}</td><td className={row.alert ? "red" : "rd-muted"}>{row.note || "-"}</td>
          </tr>)}
        </tbody></table></div>
        {alert && <div className="rd-ai-note">
          <strong><Sparkles size={14} /> AI 해석</strong>
          <p>{alert.channel} 매출 하락 시점이 {competitor ? `‘${competitor.title}’` : "경쟁사 할인"}과 겹쳐요. {alert.sample ? "유입보다 전환율이 낮아져서 가격 영향 가능성이 있어요." : `직전 30일보다 ${Math.abs(alert.changeRate).toFixed(1)}% 줄었어요.`} 원인을 단정하지 않고 ‘추정’으로 표시했어요.</p>
          <Link className="rd-link" href="/market">경쟁사 실구매가 비교 보기 →</Link>
        </div>}
        <p className="rd-muted rd-note">채널별 실적은 아직 연결되지 않아 샘플 비중으로 나눠 보여줘요. 매출 데이터를 연결하면 실제 값으로 바뀌어요.</p>
      </Card>

      <Card>
        <div className="rd-card-head"><div className="rd-card-title"><h3>재고 위험 · 발주</h3>{risky.length > 0 && <Badge tone="red">품절 위험 {risky.length}</Badge>}</div><span className="rd-muted">재고일수 = 현재고 ÷ 일평균 판매</span></div>
        {inventory.length ? <div className="table-wrap"><table className="data-table rd-table"><thead><tr><th aria-label="선택" /><th>상품</th><th>재고</th><th>리드타임</th><th>상태</th><th>권장 발주</th><th /></tr></thead><tbody>
          {inventory.map((item) => { const state = stockState(item); return <tr key={item.id}>
            <td><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`${item.product?.name} 선택`} /></td>
            <td><ProductLabel name={item.product?.name ?? "상품"} productId={item.productId} sub={item.product?.category} /></td>
            <td className={state.tone === "red" ? "red" : undefined}>{item.stockDays}일</td><td>{item.leadTimeDays}일</td>
            <td><Badge tone={state.tone}>{state.label}</Badge></td>
            <td>{item.orderStatus === "발주 완료" ? "-" : `${money(item.recommendedOrderQty)}개`}</td>
            <td>{item.orderStatus !== "발주 완료" && <Button variant="ghost" onClick={() => openDecision({ inventoryId: item.id, outcome: "PROCEED", quantity: item.recommendedOrderQty })}>발주 검토</Button>}</td>
          </tr>; })}
        </tbody></table></div> : <EmptyState title="선택한 카테고리에 재고 자료가 없어요" description="상단 카테고리를 바꿔보세요." />}
        <div className="rd-action-bar">
          <p>{picked.length ? `선택 ${picked.length}건 · ${money(picked.reduce((sum, item) => sum + item.recommendedOrderQty, 0))}개` : "상품을 선택하면 ERP 업로드 파일과 승인 요청 메일을 한 번에 만들 수 있어요."} 발주는 ‘발주 검토’에서 결정 기록 후 등록돼요.</p>
          <div className="rd-inline-actions">
            <Button variant="secondary" disabled={!picked.length} onClick={exportErp}><Download size={13} /> ERP 업로드용 파일 받기</Button>
            {picked.length ? <a className="button button-secondary" href={`mailto:?subject=${encodeURIComponent(`[발주 승인 요청] ${picked.length}건`)}&body=${encodeURIComponent(`안녕하세요. 아래 상품의 발주 승인을 요청드립니다.\n\n${mailBody}\n\n감사합니다.`)}`}><Mail size={13} /> SCM 승인 요청 메일</a> : <Button variant="secondary" disabled><Mail size={13} /> SCM 승인 요청 메일</Button>}
          </div>
        </div>
      </Card>
    </div>
  </div></DataBoundary>;
}
