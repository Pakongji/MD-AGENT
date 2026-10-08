"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, CalendarClock, CircleDollarSign, ShieldAlert } from "lucide-react";
import { Badge, Button, Card, DataBoundary, Metric, Modal, SectionTitle, money } from "@/components/common/ui";
import { mockAnalytics } from "@/lib/mock/data";
import { useAppStore } from "@/lib/store/app-store";

export function CompetitorsPage() {
  const [tab, setTab] = useState<"today" | "history">("today");
  const [priceOpen, setPriceOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const { data, command } = useAppStore();
  const router = useRouter();
  const main = data.competitorEvents[0];
  async function addResponseTask() { if (await command({ type: "ADD_TASK", title: "B사 립 20% 할인 대응안 결정", category: "경쟁사", priority: "HIGH", due: "오늘", reason: "경쟁사 실구매가와 예상 영향을 검토해 생성" })) { setResponseOpen(false); router.push("/tasks"); } }
  return <DataBoundary><div className="stack">
    <div className="tabs"><button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>오늘 변화</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>1년 프로모션 History</button></div>
    {tab === "today" ? <>
      <div className="grid-4"><Metric label="오늘 감지한 변화" value={`${data.competitorEvents.length}건`} delta="할인 1 · 신상품 1" /><Metric label="직접 경쟁 SKU" value={`${main?.affectedSkuCount ?? 14}개`} delta="립 카테고리 중심" tone="bad" /><Metric label="행사 중복" value="4일" delta="자사 립 기획전과 겹침" tone="bad" /><Metric label="주 매출 영향 추정" value={`-${money(Math.abs(main?.impactEstimate ?? 6800000))}원`} delta="가격·기간 기반 추정" tone="bad" /></div>
      <Card className="card-purple"><div className="grid-main-side"><div><Badge tone="red"><ShieldAlert size={11} /> 우선 대응</Badge><h2 style={{ margin: "12px 0 7px" }}>{main?.title}</h2><p>{main?.detail}</p><div className="actions"><Button variant="secondary" onClick={() => setPriceOpen(true)}><CircleDollarSign size={13} /> 실구매가 비교</Button><Button onClick={() => setResponseOpen(true)}>대응안 생성</Button></div></div><div className="diagnosis"><strong><Bot size={14} className="purple" /> 자사 영향</strong><p>직접 경쟁 SKU {main?.affectedSkuCount}개, 자사 프로모션과 {main?.overlapDescription}. 주 매출 영향은 -680만원으로 추정되며 확정값은 아닙니다.</p></div></div></Card>
      <Card><SectionTitle title="경쟁사 변화" description="가격·프로모션·신상품을 자사 영향 중심으로 정리했습니다." />{data.competitorEvents.map((event) => <div className="issue-grid" key={event.id}><div className="issue-cell"><span>변화</span><Badge tone={event.type === "할인" ? "red" : "purple"}>{event.type}</Badge><h3 style={{ marginTop: 7 }}>{event.title}</h3></div><div className="issue-cell"><span>상세</span><p>{event.detail}</p></div><div className="issue-cell"><span>자사 영향</span><strong>{event.affectedSkuCount}개 SKU · {event.impactEstimate < 0 ? "-" : "+"}{money(Math.abs(event.impactEstimate))}원 추정</strong><p>{event.overlapDescription}</p></div><div className="actions"><Button variant="secondary" onClick={() => setPriceOpen(true)}>가격 비교</Button><Button onClick={() => setResponseOpen(true)}>대응 검토</Button></div></div>)}</Card>
    </> : <Card><SectionTitle title="1년 프로모션 History" description="과거 이력은 반복 가능성을 관찰하는 근거이며, 올해 실행을 단정하지 않습니다." /> <div className="diagnosis"><strong><CalendarClock size={14} className="purple" /> AI 패턴 안내</strong><p>작년 같은 시기 B사 립 할인 이력이 있습니다. 올해도 반드시 진행한다고 단정할 수 없으므로 공식 채널과 실구매가를 모니터링하세요.</p></div><div className="table-wrap" style={{ marginTop: 13 }}><table className="data-table"><thead><tr><th>시기</th><th>경쟁사</th><th>프로모션</th><th>기간</th><th>관찰 메모</th></tr></thead><tbody>{mockAnalytics.promotionHistory.map((item) => <tr key={`${item.period}-${item.event}`}><td>{item.period}</td><td>{item.competitor}</td><td><strong>{item.event}</strong></td><td>{item.duration}</td><td>{item.note}</td></tr>)}</tbody></table></div></Card>}
    <Modal open={priceOpen} title="실구매가 비교" onClose={() => setPriceOpen(false)}><p>정가나 할인율이 아니라 고객이 실제 결제하는 가격으로 비교합니다.</p><div className="table-wrap" style={{ marginTop: 13 }}><table className="data-table"><thead><tr><th>상품</th><th>자사 실구매가</th><th>경쟁사 실구매가</th><th>차이</th><th>판단</th></tr></thead><tbody>{mockAnalytics.competitorPrices.map((item) => { const diff = Math.round(((item.ours - item.competitor) / item.competitor) * 100); return <tr key={item.product}><td><strong>{item.product}</strong></td><td>{money(item.ours)}원</td><td>{money(item.competitor)}원</td><td className="red">+{diff}%</td><td><Badge tone="red">경쟁사보다 {money(item.ours - item.competitor)}원 비쌈</Badge></td></tr>; })}</tbody></table></div></Modal>
    <Modal open={responseOpen} title="B사 할인 대응안" onClose={() => setResponseOpen(false)}><div className="diagnosis"><strong><Bot size={14} className="purple" /> AI 제안</strong><p>전 상품 가격 인하보다 영향이 큰 직접 경쟁 SKU 5개에 앱 전용 쿠폰을 적용하고, 나머지는 단독 세트로 차별화하는 안을 먼저 검토하세요.</p></div><div className="draft-grid"><div><span>선택안 A</span><strong>핵심 SKU 5개 앱 쿠폰 10%</strong></div><div><span>선택안 B</span><strong>립오일 + 립밤 단독 세트</strong></div><div><span>근거</span><strong>대표 틴트 실구매가 +13%</strong></div><div><span>예상 방어 효과</span><strong>주 매출 380–520만원</strong></div></div><div className="modal-actions"><Button variant="secondary" onClick={() => setPriceOpen(true)}>가격 다시 보기</Button><Button onClick={() => void addResponseTask()}>오늘 업무 추가</Button></div></Modal>
  </div></DataBoundary>;
}
