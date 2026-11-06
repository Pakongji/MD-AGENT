"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, TrendingUp } from "lucide-react";
import { Badge, Button, Card, DataBoundary, money } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { PRICE_COMPARISON_SAMPLE } from "@/lib/mock/samples";
import { shortDate } from "@/lib/services/data-freshness";

const impactLevels = [
  { tone: "red" as const, label: "영향 높음" },
  { tone: "orange" as const, label: "영향 중간" },
];

/** 시장·경쟁 > 요약: 시장 신호는 영향 순으로, 경쟁사는 채널별 실구매가로 비교 */
export function MarketOverview() {
  const { data, filters, command, busy } = useAppStore();
  const [option, setOption] = useState<number | null>(null);
  const competitor = [...data.competitorEvents].sort((a, b) => Math.abs(b.impactEstimate) - Math.abs(a.impactEstimate))[0];
  const keywords = [...data.marketKeywords].sort((a, b) => b.tenWeeksChange - a.tenWeeksChange);
  const priceRows = PRICE_COMPARISON_SAMPLE.rows;
  // 렌더 중 현재 시각 대신 데이터를 불러온 시각을 기준으로 경쟁사 행사 종료 여부를 판단합니다.
  const now = Date.parse(data.meta.lastUpdated) || 0;
  const ended = Boolean(competitor && now && Date.parse(competitor.endAt) < now);
  const eventLabel = (label: string) => ended && competitor && /진행\s*중/.test(label) ? label.replace(/진행\s*중/, `종료 · ${shortDate(competitor.endAt)}`) : label;
  const worst = [...priceRows].sort((a, b) => (b.ourPrice - b.competitorPrice) - (a.ourPrice - a.competitorPrice))[0];
  const options = [
    { title: `${worst.channel}만 가격 맞추기`, detail: `실구매가 차이 ${money(worst.ourPrice - worst.competitorPrice)}원만큼 쿠폰 · 행사 기간 동안 마진 감소`, tag: { tone: "orange" as const, label: "비용 큼" } },
    { title: "증정 구성으로 대응", detail: "가격은 유지하고 미니 사이즈 증정 · 증정품 원가와 재고 확인 필요", tag: { tone: "purple" as const, label: "AI 추천" } },
    { title: "대응 안 함", detail: ended && competitor ? `경쟁사 행사는 ${shortDate(competitor.endAt)}에 종료 · 재개 여부만 모니터링` : `경쟁사 행사 종료(${competitor ? shortDate(competitor.endAt) : "확인 필요"})까지 지켜보기 · 다른 채널은 가격 우위`, tag: { tone: "neutral" as const, label: "리스크 있음" } },
  ];

  async function decide() {
    if (option === null || !competitor) return;
    const chosen = options[option];
    await command({ type: "ADD_TASK", title: `${competitor.competitor.name} 할인 대응: ${chosen.title}`, category: "경쟁사", priority: "HIGH", due: "오늘", reason: `${competitor.title} · 선택한 대응안: ${chosen.title} (${chosen.detail})`, requiresDecision: true });
  }

  return <DataBoundary><div className="rd-columns">
    <div className="rd-col-main stack">
      <div className="rd-card-head"><h3>시장 신호 · 영향 큰 순</h3><span className="rd-muted">새 신호 {data.marketTrends.length}</span></div>
      {data.marketTrends.map((trend, index) => { const level = impactLevels[index] ?? { tone: "neutral" as const, label: "참고" }; return <Card key={trend.id} className="rd-market-signal">
        <div className="rd-signal-meta"><TrendingUp size={15} /><Badge tone={level.tone}>{level.label}</Badge><span className="rd-muted">{trend.evidence}</span></div>
        <strong>{trend.title} — {trend.event}</strong>
        <p className="rd-impact"><b>자사 영향</b>{trend.impact}</p>
        <div className="rd-inline-actions">
          <Button variant="secondary" disabled={busy} onClick={() => void command({ type: "ADD_TASK", title: trend.recommendation, category: "시장", priority: index === 0 ? "HIGH" : "MEDIUM", due: "이번 주", reason: `${trend.title}: ${trend.event}` })}>업무로 만들기</Button>
          {index === 0 && <Link className="button button-ghost" href={`/promotions?topic=${encodeURIComponent(trend.title.split(" ")[0])}`}>기획전 조사 시작</Link>}
        </div>
      </Card>; })}
      <Card>
        <div className="rd-card-head"><h3>관심 키워드</h3><Link className="rd-link" href="/market?tab=trend">트렌드 자세히 →</Link></div>
        <div className="rd-keyword-chips">{keywords.map((item) => <span key={item.id}>{item.keyword}<Badge tone={item.tenWeeksChange > 10 ? "green" : item.tenWeeksChange < 0 ? "red" : "neutral"}>{item.tenWeeksChange > 0 ? "▲" : item.tenWeeksChange < 0 ? "▼" : ""}{Math.abs(item.tenWeeksChange)}p</Badge></span>)}</div>
      </Card>
      {data.articles.length > 0 && <Card>
        <div className="rd-card-head"><h3>참고 기사</h3></div>
        {data.articles.slice(0, 3).map((article) => <div key={article.id} className="rd-article"><FileText size={14} /><div><strong>{article.title}</strong><small>{article.publisher} · {shortDate(article.publishedAt)} · {article.recommendationWhy}</small></div></div>)}
      </Card>}
    </div>

    <div className="rd-col-side rd-col-wide">
      <Card>
        <div className="rd-card-head"><div className="rd-card-title"><h3>경쟁사 실구매가 비교 · 채널별</h3>{ended ? <Badge tone="neutral">경쟁사 행사 종료</Badge> : <Badge tone="red">대응 필요</Badge>}</div></div>
        <p className="rd-muted">{PRICE_COMPARISON_SAMPLE.competitorProduct} vs 자사 {PRICE_COMPARISON_SAMPLE.ourProduct} ({PRICE_COMPARISON_SAMPLE.basis})</p>
        <div className="table-wrap"><table className="data-table rd-table"><thead><tr><th>채널</th><th>경쟁사</th><th>자사</th><th>차이</th><th>경쟁사 행사</th></tr></thead><tbody>
          {priceRows.map((row) => { const diff = row.ourPrice - row.competitorPrice; return <tr key={row.channel} className={filters.channel === row.channel ? "rd-row-active" : undefined}>
            <td><strong>{row.channel}</strong></td><td>{money(row.competitorPrice)}원</td><td>{money(row.ourPrice)}원</td>
            <td><Badge tone={diff > 1000 ? "red" : diff > 0 ? "orange" : "green"}>{diff > 0 ? `자사 +${money(diff)}원` : `자사 ${money(diff)}원`}</Badge></td><td>{eventLabel(row.competitorEvent)}</td>
          </tr>; })}
        </tbody></table></div>
        <small className="rd-muted">채널별 가격 수집이 연결되지 않아 샘플 값이에요{competitor ? ` · 감지된 변화: ${competitor.title} (${shortDate(competitor.startAt)}~${shortDate(competitor.endAt)}${ended ? " · 종료" : ""})` : ""}</small>
      </Card>

      <Card>
        <div className="rd-card-head"><h3>대응안 · 하나 골라 결정하기</h3><span className="rd-muted">AI 제안 3</span></div>
        {options.map((item, index) => <button key={item.title} className={`rd-option ${option === index ? "selected" : ""}`} onClick={() => setOption(index)} aria-pressed={option === index}>
          <span className="rd-option-key">{"ABC"[index]}</span>
          <span className="rd-option-body"><span><strong>{item.title}</strong><Badge tone={item.tag.tone}>{item.tag.label}</Badge></span><small>{item.detail}</small></span>
          <span className="rd-option-state">{option === index ? "선택됨" : "선택"}</span>
        </button>)}
        <div className="rd-inline-actions">
          <Button disabled={option === null || busy || !competitor} onClick={() => void decide()}>결정할 업무로 만들기</Button>
          <span className="rd-muted">업무에서 ‘검토하고 결정하기’로 이유를 남기면 기록에 쌓여요</span>
        </div>
      </Card>

      {data.competitorEvents.length > 1 && <Card>
        <div className="rd-card-head"><h3>다른 경쟁사 변화</h3><Link className="rd-link" href="/market?tab=competitors">전체 보기 →</Link></div>
        {[...data.competitorEvents].sort((a, b) => Math.abs(b.impactEstimate) - Math.abs(a.impactEstimate)).slice(1, 4).map((event) => <div key={event.id} className="rd-schedule-row"><Badge tone="neutral">{event.type}</Badge><strong>{event.title}</strong><span className="rd-muted">-{money(Math.round(Math.abs(event.impactEstimate) / 10000))}만원</span></div>)}
      </Card>}
    </div>
  </div></DataBoundary>;
}
