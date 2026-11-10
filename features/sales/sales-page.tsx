"use client";

import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartSpline, Layers3, Search } from "lucide-react";
import { Badge, Button, Card, DataBoundary, Metric, Modal, SectionTitle, compactMoney, money } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { DEMO_MONTHLY_TARGET, getSalesSnapshot, signedPercent } from "@/lib/services/dashboard-metrics";
import { prioritizeProducts } from "@/lib/services/product-diagnostics";
import { ProductDiagnosisPanel } from "./product-diagnosis-panel";
import { ProductLabel } from "@/components/common/product-thumb";

function periodDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "자료 없음";
}

export function SalesPage() {
  const { data } = useAppStore();
  const [scopeOpen, setScopeOpen] = useState(false);
  const [productOpen, setProductOpen] = useState<string | null>(null);
  const [category, setCategory] = useState("전체");
  const sales = getSalesSnapshot(data.salesMetrics);
  const series = sales.currentRows.map((item) => {
    const day = new Date(item.date);
    return { day: `${day.getMonth() + 1}.${day.getDate()}`, revenue: item.revenue / 1000000, orders: item.orders };
  });
  const diagnoses = prioritizeProducts(data.products, data.inventory);
  const reviewProducts = diagnoses.filter((item) => item.priority > 0).slice(0, 3);
  const stockRisks = diagnoses.filter((item) => item.priority >= 4).length;
  const categories = [...new Set(data.products.map((item) => item.category))];
  const visibleProducts = data.products.filter((item) => category === "전체" || item.category === category);
  const firstDate = sales.currentRows[0]?.date;
  const lastDate = sales.currentRows[sales.currentRows.length - 1]?.date;

  return <DataBoundary><div className="stack">
    <div className="sales-data-scope"><div><Badge tone="blue">전체 매출 집계</Badge><span>{periodDate(firstDate)} ~ {periodDate(lastDate)}</span><small>저장된 최근 {sales.periodDays}개 일자 · 전체 채널 합계</small></div><Button variant="secondary" onClick={() => setScopeOpen(true)}>집계 기준</Button></div>
    <div className="grid-4">
      <Metric label="총 매출" value={compactMoney(sales.revenue)} delta={`직전 ${sales.periodDays}일 대비 ${signedPercent(sales.revenueChangeRate)}`} tone={sales.revenueChangeRate >= 0 ? "up" : "down"} />
      <Metric label="목표 달성률" value={`${sales.achievementRate.toFixed(1)}%`} delta={`데모 월 목표 ${compactMoney(DEMO_MONTHLY_TARGET)}`} tone={sales.achievementRate >= 75 ? "good" : "neutral"} />
      <Metric label="주문 수" value={`${money(sales.orders)}건`} delta={`직전 ${sales.periodDays}일 대비 ${signedPercent(sales.ordersChangeRate)}`} tone={sales.ordersChangeRate >= 0 ? "up" : "down"} />
      <Metric label="객단가" value={`${money(sales.averageOrderValue)}원`} delta={`직전 ${sales.periodDays}일 대비 ${signedPercent(sales.averageOrderValueChangeRate)}`} tone={sales.averageOrderValueChangeRate >= 0 ? "up" : "down"} />
    </div>
    <div className="grid-main-side">
      <Card className="chart-card"><SectionTitle title="매출 추이" description="저장된 일자별 전체 매출과 주문 수를 확인합니다." action={<Button variant="secondary" onClick={() => setScopeOpen(true)}><ChartSpline size={13} /> 분석 범위</Button>} /><div className="chart-container"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={series}><CartesianGrid stroke="#edf0f4" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis yAxisId="left" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} unit="백만" width={52} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} unit="건" width={42} /><Tooltip contentStyle={{ border: "1px solid #e6e9ef", borderRadius: 9, fontSize: 10 }} formatter={(value, name) => name === "revenue" ? [`${value}백만원`, "매출"] : [`${value}건`, "주문"]} /><Bar yAxisId="left" dataKey="revenue" fill="#ed8521" radius={[4, 4, 0, 0]} /><Line yAxisId="right" type="monotone" dataKey="orders" stroke="#7357cb" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div></Card>
      <Card><SectionTitle title="우선 검토할 상품" description={`현재 자료에서 재고·입고 우선 확인 ${stockRisks}개`} action={<Badge tone="purple"><Layers3 size={11} /> 규칙 기반 진단</Badge>} /><div className="sales-priority-list">{reviewProducts.map((item) => <button key={item.product.id} onClick={() => setProductOpen(item.product.id)}><div><strong>{item.product.name}</strong><Badge tone={item.priority >= 4 ? "red" : "orange"}>{item.priority >= 4 ? "우선 확인" : "검토"}</Badge></div><p>{item.headline}</p><span>근거와 대응안 확인 →</span></button>)}{!reviewProducts.length && <p className="pd-data-note">현재 등록 자료에서 우선 검토할 위험이 계산되지 않았습니다.</p>}</div></Card>
    </div>
    <Card>
      <SectionTitle title="상품별 성과 및 리스크" description="상품 집계값을 비교하고, 상품 진단에서 근거·대응안·결정 이력을 확인하세요." action={<label className="sales-product-filter">상품 목록 카테고리<select aria-label="상품 목록 카테고리" value={category} onChange={(event) => { setCategory(event.target.value); setProductOpen(null); }}><option>전체</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>} />
      <p className="pd-data-note sales-product-scope">아래는 등록된 상품별 집계값입니다. 상품별 집계기간이 없어 상단의 일별 매출과 동일 기간으로 비교하지 않습니다.</p>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>상품</th><th>등록 매출</th><th>등록 판매량</th><th>재고일수 · 등록값</th><th>마진율</th><th>등록 상태</th><th>진단</th></tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.id} className={productOpen === product.id ? "sales-product-selected" : undefined}><td><ProductLabel name={product.name} src={product.imageUrl ?? null} sub={`${product.brand.name} · ${product.category}`} /></td><td>{compactMoney(product.revenue)}</td><td>{money(product.salesQty)}개</td><td>{product.inventory ? `${product.inventory.stockDays}일` : "미등록"}</td><td>{product.marginRate}%</td><td><Badge tone={product.risk.includes("품절") ? "red" : product.risk === "양호" ? "green" : "orange"}>{product.risk}</Badge></td><td><Button variant="secondary" onClick={() => setProductOpen(product.id)} aria-label={`${product.name} 상품 진단`}><Search size={12} /> 상품 진단</Button></td></tr>)}</tbody></table></div>
      {!visibleProducts.length && <p className="pd-data-note">표시할 상품이 없습니다.</p>}
    </Card>
    <Modal open={scopeOpen} title="매출 집계와 분석 범위" onClose={() => setScopeOpen(false)}>
      <div className="diagnosis"><strong>전체 매출 KPI</strong><p>{periodDate(firstDate)} ~ {periodDate(lastDate)}의 저장된 일별 매출을 집계했습니다. 비교치는 그보다 앞선 최대 {sales.periodDays}개 일자의 자료를 사용합니다. 달력상 오늘까지의 최신 기간을 보장하지 않습니다.</p></div>
      <div className="diagnosis"><strong>상품 진단</strong><p>상품별 등록 매출·판매량·마진율과 연결된 재고를 사용합니다. 재고 커버일수는 재고 ÷ 등록 일평균 판매량으로 계산하고, 공급사 납기와 비교합니다. 자료 수정 시각과 실제 재고 실사 시점은 다를 수 있습니다.</p></div>
      <div className="diagnosis"><strong>추가 자료가 필요한 분석</strong><p>상품별 일별 매출, 앱·웹별 실적, 조회→구매 전환, 할인·반품 내역이 없어 상품별 전주 대비 변화와 매출 변화 기여도는 산출하지 않습니다. 카테고리 선택은 상품 목록에만 적용됩니다.</p></div>
    </Modal>
    {productOpen && <ProductDiagnosisPanel productId={productOpen} productIds={visibleProducts.some((item) => item.id === productOpen) ? visibleProducts.map((item) => item.id) : data.products.map((item) => item.id)} onSelect={setProductOpen} onClose={() => setProductOpen(null)} />}
  </div></DataBoundary>;
}
