"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bookmark, Bot, Check, Search, ThumbsDown, ThumbsUp, TrendingUp } from "lucide-react";
import { Badge, Button, Card, DataBoundary, SectionTitle, money } from "@/components/common/ui";
import { mockAnalytics } from "@/lib/mock/data";
import { useAppStore } from "@/lib/store/app-store";

export function MarketPage() {
  const [tab, setTab] = useState<"morning" | "analysis">("morning");
  const { data, command, busy } = useAppStore();
  const router = useRouter();
  const lipKeyword = data.marketKeywords.find((keyword) => keyword.keyword === "립오일");
  const lipInventory = data.inventory.find((item) => item.product?.name === "A 글로우 립오일");
  const lipSkuCount = data.products.filter((product) => product.category === "립").length;
  async function addTask(title: string, category = "시장/트렌드") { if (await command({ type: "ADD_TASK", title, category, priority: "HIGH", due: "오늘", reason: "시장/트렌드 분석에서 생성" })) router.push("/tasks"); }

  return <DataBoundary><div className="stack">
    <div className="tabs" role="tablist"><button className={tab === "morning" ? "active" : ""} onClick={() => setTab("morning")}>아침 리포트</button><button className={tab === "analysis" ? "active" : ""} onClick={() => setTab("analysis")}>트렌드 분석</button></div>
    {tab === "morning" ? <>
      <div className="briefing-hero">
        <div className="briefing-step"><span>무슨 일이</span><h2>립오일 검색 관심도<br />7주 연속 상승</h2><p>전년 동기 대비 +{lipKeyword?.yearOverYear ?? 0}%이며 월 검색량은 {money(lipKeyword?.monthlyVolume ?? 0)}회입니다.</p></div>
        <div className="briefing-step"><span>나한테는</span><h2>자사 립 SKU {lipSkuCount}개<br />립오일 재고 {lipInventory?.stockDays ?? 0}일분</h2><p>수요 변화에 비해 구색이 좁고, 핵심 SKU의 재고도 여유롭지 않습니다.</p></div>
        <div className="briefing-step action"><span>오늘 할 일</span><h2>발주와 신규 소싱을<br />함께 검토</h2><p>재고 회전과 마진을 확인한 뒤 발주·상품 소싱으로 연결하세요.</p><div className="actions"><Button variant="secondary" onClick={() => void addTask("립오일 추가 발주 검토", "재고/발주")}>오늘 업무 추가</Button></div></div>
      </div>
      <Card><SectionTitle title="우선순위 이슈" description="시장 신호 → 자사 영향 → AI 제안 → 실행 순서로 정리했습니다." />{data.marketTrends.map((trend) => <div className="issue-grid" key={trend.id}><div className="issue-cell"><span>시장 신호</span><strong>{trend.event}</strong><p>{trend.evidence}</p></div><div className="issue-cell"><span>자사 영향</span><strong>{trend.impact}</strong></div><div className="issue-cell"><span>AI 제안</span><strong>{trend.recommendation}</strong></div><div className="actions"><Button variant="secondary" onClick={() => setTab("analysis")}>상세 분석</Button><Button onClick={() => void addTask(trend.recommendation)} disabled={busy}>업무 추가</Button></div></div>)}</Card>
      <div className="grid-main-side">
        <Card><SectionTitle title="추천 기사" description="현재 상품·프로모션과 연결되는 이유를 함께 표시합니다." />{data.articles.map((article) => { const feedback = article.feedback[0]?.value; return <article className="article-item" key={article.id}><div><div className="article-meta"><span>{article.publisher}</span><span>·</span><span>{new Date(article.publishedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span><Badge tone="purple">추천 이유</Badge></div><h3>{article.title}</h3><p>{article.summary}</p><p className="purple" style={{ marginTop: 5 }}>{article.recommendationWhy}</p></div><div className="article-actions"><Button variant={feedback === "유용" ? "purple" : "secondary"} aria-label="유용" onClick={() => void command({ type: "ARTICLE_FEEDBACK", id: article.id, value: "유용" })}><ThumbsUp size={12} /></Button><Button variant={feedback === "관심없음" ? "danger" : "secondary"} aria-label="관심없음" onClick={() => void command({ type: "ARTICLE_FEEDBACK", id: article.id, value: "관심없음" })}><ThumbsDown size={12} /></Button><Button variant={article.saved ? "purple" : "secondary"} onClick={() => void command({ type: "SAVE_ARTICLE", id: article.id })}>{article.saved ? <Check size={12} /> : <Bookmark size={12} />}{article.saved ? "저장됨" : "저장"}</Button></div></article>; })}</Card>
        <Card><SectionTitle title="키워드 수요" description="월 검색량은 검색광고 API 기준입니다." action={<Badge tone="blue"><Search size={11} /> 월 검색량</Badge>} /><div className="table-wrap"><table className="data-table"><thead><tr><th>키워드</th><th>월 검색량</th><th>전년 대비</th><th>판단</th></tr></thead><tbody>{data.marketKeywords.map((keyword) => <tr key={keyword.id}><td><strong>{keyword.keyword}</strong></td><td>{money(keyword.monthlyVolume)}회</td><td className={keyword.yearOverYear >= 0 ? "orange" : "blue"}>{keyword.yearOverYear > 0 ? "+" : ""}{keyword.yearOverYear}%</td><td><Badge tone={keyword.judgment === "진짜 상승" ? "orange" : "neutral"}>{keyword.judgment}</Badge></td></tr>)}</tbody></table></div><p className="tiny" style={{ marginTop: 10 }}>네이버 데이터랩의 검색 관심도 상대 지수와 검색광고 API의 월 검색량은 별도 지표로 표시합니다.</p></Card>
      </div>
    </> : <TrendAnalysis onAddTask={addTask} />}
  </div></DataBoundary>;
}

function TrendAnalysis({ onAddTask }: { onAddTask: (title: string, category?: string) => Promise<void> }) {
  const { data } = useAppStore();
  return <>
    <Card><div className="filters"><select aria-label="카테고리"><option>립 메이크업</option></select><input defaultValue="립오일" aria-label="키워드" /><select aria-label="기간"><option>최근 10주</option><option>최근 1년</option></select><select aria-label="집계 단위"><option>주</option><option>일</option><option>월</option></select><select aria-label="전년 비교"><option>전년 비교</option></select><select aria-label="성별"><option>전체 성별</option></select><select aria-label="연령"><option>전체 연령</option></select></div></Card>
    <div className="grid-2">
      <Card className="chart-card"><SectionTitle title="검색 수요 분석" description="네이버 데이터랩 검색 관심도 상대 지수 · 올해와 작년 비교" action={<Badge tone="orange"><TrendingUp size={11} /> 상승</Badge>} /><div className="chart-container"><ResponsiveContainer><ComposedChart data={mockAnalytics.trendComparison}><CartesianGrid stroke="#edf0f4" vertical={false} /><XAxis dataKey="week" tick={{ fontSize: 8 }} axisLine={false} /><YAxis tick={{ fontSize: 8 }} axisLine={false} /><Tooltip /><Bar dataKey="thisYear" name="올해 관심도" fill="#ed8521" radius={[4, 4, 0, 0]} /><Bar dataKey="lastYear" name="작년 관심도" fill="#dfe4eb" radius={[4, 4, 0, 0]} /><Line type="monotone" dataKey="sales" name="자사 매출 지수" stroke="#7357cb" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div></Card>
      <Card><SectionTitle title="키워드 변화" description="검색 관심도 상대 지수 기준" /><div className="table-wrap"><table className="data-table"><thead><tr><th>키워드</th><th>8주 추이</th><th>현재</th><th>10주 전 대비</th><th>상승 시작</th><th>판단</th></tr></thead><tbody>{data.marketKeywords.map((keyword) => { const series = JSON.parse(keyword.weeklySeries) as number[]; return <tr key={keyword.id}><td><strong>{keyword.keyword}</strong></td><td><div className="mini-trend">{series.slice(-8).map((value, index) => <span key={index} style={{ height: `${Math.max(4, value / 4)}px` }} />)}</div></td><td>{keyword.currentIndex}</td><td className={keyword.tenWeeksChange >= 0 ? "orange" : "blue"}>{keyword.tenWeeksChange > 0 ? "+" : ""}{keyword.tenWeeksChange}</td><td>{keyword.risingSince}</td><td><Badge tone={keyword.judgment === "진짜 상승" ? "orange" : keyword.judgment === "하락" ? "blue" : "neutral"}>{keyword.judgment}</Badge></td></tr>; })}</tbody></table></div></Card>
    </div>
    <div className="grid-2">
      <Card><SectionTitle title="니즈 분석" description="관련 키워드 변화 · Orange 증가 / Blue 감소" /><div className="stack" style={{ gap: 13 }}>{mockAnalytics.needs.map((need) => <div className="need-bar" key={need.name}><strong>{need.name}</strong><div className="need-track"><span className={`need-fill ${need.value >= 0 ? "positive" : "negative"}`} style={{ width: `${Math.min(48, Math.abs(need.value) / 2)}%` }} /></div><span className={need.value >= 0 ? "orange" : "blue"}>{need.value > 0 ? "+" : ""}{need.value}%</span></div>)}</div></Card>
      <Card><SectionTitle title="연령별 관심 비중" description="올해 vs 작년" /><div className="chart-container" style={{ height: 180 }}><ResponsiveContainer><BarChart data={mockAnalytics.demographics} layout="vertical"><CartesianGrid stroke="#edf0f4" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="age" tick={{ fontSize: 9 }} width={40} axisLine={false} /><Tooltip /><Bar dataKey="thisYear" name="올해" fill="#ed8521" radius={[0, 4, 4, 0]} /><Bar dataKey="lastYear" name="작년" fill="#dfe4eb" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div><div className="diagnosis"><strong><Bot size={13} className="purple" /> AI 해석</strong><p>30대 관심 비중이 작년보다 +8%p 늘었습니다. 보습·광택 메시지를 30대 타깃 소재에서 검증할 가치가 있습니다.</p></div></Card>
    </div>
    <Card className="card-purple"><SectionTitle title="그래서 할 일" description="검증한 시장 신호를 실제 의사결정과 실행으로 연결하세요." /><div className="grid-3"><div><Badge tone="orange">재고</Badge><h3 style={{ marginTop: 8 }}>립오일 추가 발주 검토</h3><p>재고 9일분과 리드타임 8일을 함께 확인</p><div className="actions"><Button onClick={() => void onAddTask("립오일 추가 발주 검토", "재고/발주")}>오늘 업무 추가</Button></div></div><div><Badge tone="purple">상품</Badge><h3 style={{ marginTop: 8 }}>신규 상품 소싱</h3><p>플럼핑·광택 니즈에 맞는 브랜드 후보 탐색</p><div className="actions"><Button variant="purple" onClick={() => void onAddTask("립오일·립플럼퍼 신규 상품 소싱", "상품/브랜드")}>상품 소싱</Button></div></div><div><Badge tone="blue">프로모션</Badge><h3 style={{ marginTop: 8 }}>11월 기획에 반영</h3><p>30대 보습·광택 메시지 A/B안 준비</p><div className="actions"><Button variant="secondary" onClick={() => void onAddTask("11월 립오일 프로모션 기획", "프로모션")}>프로모션 업무</Button></div></div></div></Card>
  </>;
}
