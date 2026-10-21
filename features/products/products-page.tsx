"use client";

import { useRouter } from "next/navigation";
import { Bot, PackagePlus, ScanSearch, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataBoundary, Metric, SectionTitle, compactMoney, money } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";

export function ProductsPage() {
  const { data, command } = useAppStore();
  const router = useRouter();
  async function addSourcing() { if (await command({ type: "ADD_TASK", title: "립오일·립플럼퍼 신규 브랜드 소싱", category: "상품/브랜드", priority: "HIGH", due: "이번 주", reason: "시장 수요 상승 대비 자사 SKU 구색 부족" })) router.push("/tasks"); }
  const growth = data.products.filter((item) => item.lifecycle === "성장" || item.lifecycle === "신규").length;
  const needsCare = data.products.filter((item) => item.risk !== "양호" && item.risk !== "관찰").length;
  const brandPortfolio = Array.from(data.products.reduce((brands, product) => {
    const current = brands.get(product.brand.name) ?? { name: product.brand.name, status: product.brand.status, revenue: 0 };
    current.revenue += product.revenue;
    brands.set(product.brand.name, current);
    return brands;
  }, new Map<string, { name: string; status: string; revenue: number }>()).values()).sort((a, b) => b.revenue - a.revenue);
  const maxBrandRevenue = Math.max(...brandPortfolio.map((brand) => brand.revenue), 1);
  const brandStatusSummary = Array.from(brandPortfolio.reduce((summary, brand) => summary.set(brand.status, (summary.get(brand.status) ?? 0) + 1), new Map<string, number>())).map(([status, count]) => `${status} ${count}`).join(" · ");
  const lipSkuCount = data.products.filter((product) => product.category === "립").length;
  const riskProducts = data.products.filter((product) => product.inventory && product.risk !== "양호" && product.risk !== "관찰").sort((a, b) => (a.inventory?.stockDays ?? 999) - (b.inventory?.stockDays ?? 999)).slice(0, 3);
  return <DataBoundary><div className="stack">
    <div className="grid-4"><Metric label="운영 브랜드" value={`${brandPortfolio.length}개`} delta={brandStatusSummary} /><Metric label="운영 상품" value={`${data.products.length}개`} delta="최근 30일 판매 데이터 보유" /><Metric label="성장 상품" value={`${growth}개`} delta="신규 포함" tone="up" /><Metric label="관리 필요" value={`${needsCare}개`} delta="품절·과재고 우선" tone="bad" /></div>
    <Card className="card-purple"><div className="grid-main-side"><div><Badge tone="orange"><Sparkles size={11} /> 구색 공백 감지</Badge><h2 style={{ margin: "11px 0 7px" }}>립오일 시장 수요 상승, 자사 립 SKU는 {lipSkuCount}개</h2><p>검색 관심도는 전년 대비 +109%, 플럼핑 니즈는 +82%인데 자사 구색은 기본 제형 중심입니다.</p><div className="actions"><Button onClick={() => void addSourcing()}><PackagePlus size={13} /> 상품 소싱 업무 추가</Button><Button variant="secondary" onClick={() => router.push("/market")}>시장 근거 보기</Button></div></div><div className="diagnosis"><strong><Bot size={14} className="purple" /> AI 제안</strong><p>보습·광택·플럼핑 3개 니즈 축으로 후보 브랜드를 나누고, MOQ·마진·리드타임까지 비교한 뒤 입점 여부를 결정하세요.</p></div></div></Card>
    <Card><SectionTitle title="상품 Lifecycle" description="신규 → 성장 → 안정 → 감소 → 정리 후보 단계로 관리합니다." /><div className="table-wrap"><table className="data-table"><thead><tr><th>상품</th><th>브랜드</th><th>Lifecycle</th><th>매출</th><th>판매량</th><th>마진</th><th>성과 / 리스크</th></tr></thead><tbody>{data.products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><div className="tiny">{product.category}</div></td><td>{product.brand.name}</td><td><Badge tone={product.lifecycle === "성장" ? "orange" : product.lifecycle === "신규" ? "purple" : product.lifecycle === "감소" ? "blue" : "neutral"}>{product.lifecycle}</Badge></td><td>{compactMoney(product.revenue)}</td><td>{money(product.salesQty)}개</td><td>{product.marginRate}%</td><td><Badge tone={product.risk.includes("품절") ? "red" : product.risk === "과재고" ? "blue" : product.risk === "양호" ? "green" : "orange"}>{product.risk}</Badge></td></tr>)}</tbody></table></div></Card>
    <div className="grid-2"><Card><SectionTitle title="브랜드 Portfolio" description="최근 30일 상품 매출 합계와 운영 상태입니다." /><div className="contribution-list">{brandPortfolio.map((brand) => <div className="contribution-item" key={brand.name}><strong>{brand.name}<span className="tiny"> · {compactMoney(brand.revenue)}</span></strong><div className="contribution-track"><span style={{ width: `${Math.max(8, Math.round((brand.revenue / maxBrandRevenue) * 100))}%`, background: brand.status === "관리 필요" ? "#3478d4" : "#ed8521" }} /></div><Badge tone={brand.status === "성장" ? "orange" : brand.status === "관리 필요" ? "blue" : brand.status === "신규" ? "purple" : "neutral"}>{brand.status}</Badge></div>)}</div></Card><Card><SectionTitle title="상품 리스크 우선순위" description="재고와 상품 생애주기를 함께 해석합니다." /><div className="insight-list">{riskProducts.map((product) => <div className="insight-item" key={product.id}><span className={`insight-icon ${product.risk.includes("품절") ? "red" : product.risk === "과재고" ? "blue" : "orange"}`}><ScanSearch size={16} /></span><div><strong>{product.name}</strong><p>{product.lifecycle} 단계 · 재고 {product.inventory?.stockDays}일 · 리드타임 {product.inventory?.leadTimeDays}일</p></div><Badge tone={product.risk.includes("품절") ? "red" : product.risk === "과재고" ? "blue" : "orange"}>{product.inventory?.status ?? product.risk}</Badge></div>)}</div></Card></div>
  </div></DataBoundary>;
}
