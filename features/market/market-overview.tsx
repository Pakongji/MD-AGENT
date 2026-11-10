"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, TrendingUp } from "lucide-react";
import { Badge, Button, Card, DataBoundary, money } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { PRICE_COMPARISON_SAMPLE } from "@/lib/mock/samples";
import { shortDate } from "@/lib/services/data-freshness";
import { eventPhase, focusCompetitorEvent, rankCompetitorEvents } from "@/lib/services/competitor";
import { CompetitorResultCard } from "./competitor-result";

const impactLevels = [
  { tone: "red" as const, label: "영향 높음" },
  { tone: "orange" as const, label: "영향 중간" },
];

/** 시장·경쟁 > 요약: 시장 신호는 영향 순으로, 경쟁사는 채널별 실구매가로 비교 */
/** focus=competitor|result: 홈의 경쟁사 카드에서 왔을 때 경쟁사 영역을 먼저 보여줍니다. event로 특정 경쟁사 변화를 엽니다. */
export function MarketOverview({ focus, eventId }: { focus?: string; eventId?: string } = {}) {
  const { data, filters, command, busy } = useAppStore();
  const [option, setOption] = useState<number | null>(null);
  const competitorColumn = useRef<HTMLDivElement>(null);
  const nowForRank = Date.parse(data.meta.lastUpdated) || 0;
  const competitor = data.competitorEvents.find((event) => event.id === eventId) ?? focusCompetitorEvent(data.competitorEvents, nowForRank);
  const otherEvents = rankCompetitorEvents(data.competitorEvents, nowForRank).filter((event) => event.id !== competitor?.id);
  const competitorFirst = focus === "competitor" || focus === "result";
  // 경쟁사 카드에서 들어오면 경쟁사 영역으로 바로 스크롤합니다(화면이 좁아 위아래로 쌓일 때 대응안이 아래로 밀리지 않게).
  useEffect(() => { if (competitorFirst) competitorColumn.current?.scrollIntoView({ block: "start" }); }, [competitorFirst]);
  const keywords = [...data.marketKeywords].sort((a, b) => b.tenWeeksChange - a.tenWeeksChange);
  const priceRows = PRICE_COMPARISON_SAMPLE.rows;
  // 렌더 중 현재 시각 대신 데이터를 불러온 시각을 기준으로 경쟁사 행사 종료 여부를 판단합니다.
  const now = Date.parse(data.meta.lastUpdated) || 0;
  const ended = Boolean(competitor && eventPhase(competitor, now) === "ended");
  const eventLabel = (label: string) => ended && competitor && /진행\s*중/.test(label) ? label.replace(/진행\s*중/, `종료 · ${shortDate(competitor.endAt)}`) : label;
  const worst = [...priceRows].sort((a, b) => (b.ourPrice - b.competitorPrice) - (a.ourPrice - a.competitorPrice))[0];
  // 채널별 실구매가 샘플은 B사 립 할인에 대한 것이라, 그 변화일 때만 씁니다. 다른 변화는 등록한 내용을 보여줍니다.
  const priceSampleApplies = Boolean(competitor && competitor.competitor.name === "B사" && ["할인", "가격"].includes(competitor.type));
  const waitDetail = ended && competitor ? `경쟁사 행사는 ${shortDate(competitor.endAt)}에 종료 · 재개 여부만 모니터링` : `${competitor ? `${shortDate(competitor.endAt)}까지` : "당분간"} 판매 추이를 지켜보기`;
  const options = !competitor ? [] : ["할인", "가격"].includes(competitor.type) ? [
    priceSampleApplies
      ? { title: `${worst.channel}만 가격 맞추기`, detail: `실구매가 차이 ${money(worst.ourPrice - worst.competitorPrice)}원만큼 쿠폰 · 행사 기간 동안 마진 감소`, tag: { tone: "orange" as const, label: "비용 큼" } }
      : { title: "겹치는 채널만 쿠폰으로 가격 맞추기", detail: "경쟁사 실구매가를 확인한 채널만 · 행사 기간 동안 마진 감소", tag: { tone: "orange" as const, label: "비용 큼" } },
    { title: "증정 구성으로 대응", detail: "가격은 유지하고 미니 사이즈 증정 · 증정품 원가와 재고 확인 필요", tag: { tone: "purple" as const, label: "AI 추천" } },
    { title: "대응 안 함", detail: waitDetail, tag: { tone: "neutral" as const, label: "리스크 있음" } },
  ] : competitor.type === "신상품" ? [
    { title: "자사 상품 강점 메시지 강화", detail: "상세페이지·리뷰 상단에 차별 효능·성분을 보강 · 비용 적음", tag: { tone: "purple" as const, label: "AI 추천" } },
    { title: "체험·샘플 증정으로 전환 방어", detail: "구매 고객 미니 증정 또는 체험팩 · 증정품 원가와 재고 확인 필요", tag: { tone: "orange" as const, label: "비용 중간" } },
    { title: "초기 반응만 모니터링", detail: "경쟁 신상품의 리뷰 수·판매 순위를 2주간 확인 후 결정", tag: { tone: "neutral" as const, label: "리스크 있음" } },
  ] : competitor.type === "프로모션" ? [
    { title: "같은 기간 맞불 기획전", detail: "겹치는 상품군으로 기획전 편성 · 혜택 비용과 재고 확인 필요", tag: { tone: "orange" as const, label: "비용 큼" } },
    { title: "자사 행사 시점 이동", detail: "경쟁사 행사 직후로 기획전을 옮겨 정면 경쟁 회피", tag: { tone: "purple" as const, label: "AI 추천" } },
    { title: "대응 안 함", detail: waitDetail, tag: { tone: "neutral" as const, label: "리스크 있음" } },
  ] : [
    { title: "영향 상품 점검 업무 만들기", detail: "겹치는 자사 상품의 판매·가격·리뷰를 확인", tag: { tone: "purple" as const, label: "AI 추천" } },
    { title: "대응 안 함", detail: waitDetail, tag: { tone: "neutral" as const, label: "리스크 있음" } },
  ];

  async function decide() {
    if (option === null || !competitor) return;
    const chosen = options[option];
    await command({ type: "ADD_TASK", title: `${competitor.competitor.name} ${competitor.type} 대응: ${chosen.title}`, category: "경쟁사", priority: "HIGH", due: "오늘", reason: `${competitor.title} · 선택한 대응안: ${chosen.title} (${chosen.detail})`, requiresDecision: true });
  }

  const marketSection = <div className="rd-col-main stack" key="market">
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
    </div>;

  const competitorSection = <div className={`rd-col-side rd-col-wide stack${competitorFirst ? " rd-focus" : ""}`} ref={competitorColumn} key="competitor">
      {competitor && ended && <CompetitorResultCard eventId={competitor.id} title={competitor.title} />}
      {competitor && !priceSampleApplies && <Card>
        <div className="rd-card-head"><div className="rd-card-title"><h3>{competitor.competitor.name} · {competitor.type}</h3><Badge tone={ended ? "neutral" : "red"}>{ended ? "종료" : eventPhase(competitor, now) === "upcoming" ? "예정" : "진행 중"}</Badge></div><span className="rd-muted">{shortDate(competitor.startAt)} ~ {shortDate(competitor.endAt)}</span></div>
        <strong>{competitor.title}</strong>
        {competitor.detail && <p className="rd-muted">{competitor.detail}</p>}
        <div className="rd-event-facts">
          {competitor.overlapDescription && <span><b>겹치는 자사 상품·행사</b>{competitor.overlapDescription}</span>}
          <span><b>예상 영향</b>{competitor.impactEstimate ? `주 -${money(Math.round(Math.abs(competitor.impactEstimate) / 10000))}만원 (추정)` : "미입력"}{competitor.affectedSkuCount ? ` · 영향 상품 ${competitor.affectedSkuCount}개` : ""}</span>
        </div>
        <small className="rd-muted">채널별 실구매가 비교는 경쟁사 가격 연결 후 볼 수 있어요. 내용 수정은 관리 &gt; 데이터 등록 &gt; 경쟁사 변화에서 해요.</small>
      </Card>}
      {priceSampleApplies && <Card>
        <div className="rd-card-head"><div className="rd-card-title"><h3>경쟁사 실구매가 비교 · 채널별</h3>{ended ? <Badge tone="neutral">경쟁사 행사 종료</Badge> : <Badge tone="red">대응 필요</Badge>}</div></div>
        <p className="rd-muted">{PRICE_COMPARISON_SAMPLE.competitorProduct} vs 자사 {PRICE_COMPARISON_SAMPLE.ourProduct} ({PRICE_COMPARISON_SAMPLE.basis})</p>
        <div className="table-wrap"><table className="data-table rd-table"><thead><tr><th>채널</th><th>경쟁사</th><th>자사</th><th>차이</th><th>경쟁사 행사</th></tr></thead><tbody>
          {priceRows.map((row) => { const diff = row.ourPrice - row.competitorPrice; return <tr key={row.channel} className={filters.channel === row.channel ? "rd-row-active" : undefined}>
            <td><strong>{row.channel}</strong></td><td>{money(row.competitorPrice)}원</td><td>{money(row.ourPrice)}원</td>
            <td><Badge tone={diff > 1000 ? "red" : diff > 0 ? "orange" : "green"}>{diff > 0 ? `자사 +${money(diff)}원` : `자사 ${money(diff)}원`}</Badge></td><td>{eventLabel(row.competitorEvent)}</td>
          </tr>; })}
        </tbody></table></div>
        <small className="rd-muted">채널별 가격 수집이 연결되지 않아 샘플 값이에요{competitor ? ` · 감지된 변화: ${competitor.title} (${shortDate(competitor.startAt)}~${shortDate(competitor.endAt)}${ended ? " · 종료" : ""})` : ""}</small>
      </Card>}

      <Card>
        <div className="rd-card-head"><h3>{ended ? "다시 같은 행사가 오면 · 대응안" : "대응안 · 하나 골라 결정하기"}</h3><span className="rd-muted">AI 제안 3</span></div>
        {competitor && <p className="rd-muted">대상: {competitor.title}</p>}
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

      {otherEvents.length > 0 && <Card>
        <div className="rd-card-head"><h3>다른 경쟁사 변화</h3><Link className="rd-link" href="/market?tab=competitors">전체 보기 →</Link></div>
        {otherEvents.slice(0, 3).map((event) => { const phase = eventPhase(event, now); return <Link key={event.id} className="rd-schedule-row rd-event-link" href={`/market?tab=overview&focus=${phase === "ended" ? "result" : "competitor"}&event=${event.id}`}><Badge tone={phase === "active" ? "red" : phase === "upcoming" ? "orange" : "neutral"}>{phase === "active" ? "진행 중" : phase === "upcoming" ? "예정" : "종료"}</Badge><strong>{event.title}</strong><span className="rd-muted">{event.impactEstimate ? `-${money(Math.round(Math.abs(event.impactEstimate) / 10000))}만원` : event.type}</span></Link>; })}
      </Card>}
      {!competitor && <Card><p className="rd-muted">등록된 경쟁사 변화가 없어요. 관리 &gt; 데이터 등록 &gt; 경쟁사 변화에서 등록하세요.</p></Card>}
    </div>;

  return <DataBoundary><div className="rd-columns">{competitorFirst ? [competitorSection, marketSection] : [marketSection, competitorSection]}</div></DataBoundary>;
}
