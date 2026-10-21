"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bot, FileText, Sparkles } from "lucide-react";
import { Badge, Button, Card, compactMoney, DataBoundary, Metric, Modal, SectionTitle } from "@/components/common/ui";
import { mockAnalytics } from "@/lib/mock/data";
import { DEMO_MONTHLY_TARGET, getSalesSnapshot } from "@/lib/services/dashboard-metrics";
import { useAppStore } from "@/lib/store/app-store";

export function PerformancePage() {
  const { data, command, busy } = useAppStore();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const latest = data.performanceReports[0];
  const sales = getSalesSnapshot(data.salesMetrics);
  const goalGap = Math.max(0, DEMO_MONTHLY_TARGET - sales.revenue);
  const promotionRoi = ((mockAnalytics.promotionPerformance.attributedRevenue - mockAnalytics.promotionPerformance.spend) / mockAnalytics.promotionPerformance.spend) * 100;
  const growthProducts = data.products.filter((product) => product.lifecycle === "성장" || product.lifecycle === "신규").length;
  const chartData = mockAnalytics.salesContribution.map((item) => ({ ...item, positive: item.value > 0 ? item.value : 0, negative: item.value < 0 ? item.value : 0 }));
  async function generate() { if (await command({ type: "GENERATE_REPORT", period: "2026년 10월" })) setReportOpen(true); }
  return <DataBoundary><div className="stack">
    <div className="grid-4"><Metric label="최근 30일 목표 달성률" value={`${sales.achievementRate.toFixed(1)}%`} delta={`월 목표까지 ${compactMoney(goalGap)}`} tone={sales.achievementRate >= 75 ? "good" : "neutral"} /><Metric label="프로모션 ROI" value={`${promotionRoi.toFixed(0)}%`} delta={`귀속 매출 ${compactMoney(mockAnalytics.promotionPerformance.attributedRevenue)} · 비용 ${compactMoney(mockAnalytics.promotionPerformance.spend)}`} tone="up" /><Metric label="성장 상품" value={`${growthProducts}개`} delta="신규 포함" tone="up" /><Metric label="완료 업무" value={`${data.tasks.filter((item) => item.status === "완료").length}건`} delta={`전체 ${data.tasks.length}건 중`} /></div>
    <div className="grid-main-side"><Card className="chart-card"><SectionTitle title="성과 기여 요인" description="전체 매출 증감에 함께 기여한 요인의 추정치입니다." /><div className="chart-container"><ResponsiveContainer><BarChart data={chartData} layout="vertical"><CartesianGrid stroke="#edf0f4" horizontal={false} /><XAxis type="number" tick={{ fontSize: 8 }} /><YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 9 }} axisLine={false} /><Tooltip formatter={(value) => `${value}%p`} /><Bar dataKey="positive" name="상승 기여" fill="#ed8521" radius={[0, 4, 4, 0]} /><Bar dataKey="negative" name="하락 기여" fill="#3478d4" radius={[4, 0, 0, 4]} /></BarChart></ResponsiveContainer></div></Card><Card className="card-purple"><SectionTitle title="AI 성과 Report" description="숫자를 회고와 다음 Action으로 정리합니다." action={<Badge tone="purple"><Sparkles size={11} /> AI</Badge>} /><div className="diagnosis"><strong><Bot size={14} className="purple" /> 생성 내용</strong><p>잘한 점, 아쉬운 점, 다음 Action을 정리하고 생성 즉시 지식 저장소에 보관합니다.</p></div><div className="actions"><Button disabled={busy} onClick={() => void generate()}><FileText size={13} /> AI Report 생성</Button></div></Card></div>
    {latest && <Card><SectionTitle title="주간 / 월간 회고" description={latest.title} /><div className="review-grid"><div className="review-card"><span>잘한 점</span><p>{latest.wins}</p></div><div className="review-card"><span>아쉬운 점</span><p>{latest.misses}</p></div><div className="review-card"><span>다음 Action</span><p>{latest.nextActions}</p></div></div></Card>}
    <Card><SectionTitle title="최근 성과 리포트" description="지식 저장소와 연결된 장기 기록입니다." />{data.performanceReports.map((report) => <div className="issue-grid" key={report.id}><div className="issue-cell"><span>리포트</span><strong>{report.title}</strong></div><div className="issue-cell"><span>목표 달성률</span><strong>{report.achievement}%</strong></div><div className="issue-cell"><span>요약</span><p>{report.summary}</p></div><div className="actions"><Button variant="secondary" onClick={() => router.push("/knowledge")}>지식 저장소</Button></div></div>)}</Card>
    <Modal open={reportOpen} title="AI 성과 리포트 생성 완료" onClose={() => setReportOpen(false)}><Badge tone="green">지식 저장소 저장 완료</Badge><h2 style={{ margin: "10px 0 7px" }}>2026년 10월 AI 성과 리포트</h2><p>스킨케어와 A 브랜드데이가 성장을 이끌었고, 메이크업 하락은 경쟁사 할인 시점과 함께 관찰됐습니다.</p><div className="review-grid" style={{ marginTop: 14 }}><div className="review-card"><span>잘한 점</span><p>스킨케어 +4.2%p<br />A 브랜드데이 +2.8%p</p></div><div className="review-card"><span>아쉬운 점</span><p>메이크업 -1.5%p<br />품절 -0.8%p</p></div><div className="review-card"><span>다음 Action</span><p>실구매가 모니터링<br />A 립밤 입고 추적</p></div></div><div className="modal-actions"><Button variant="secondary" onClick={() => setReportOpen(false)}>닫기</Button><Button onClick={() => { setReportOpen(false); router.push("/knowledge"); }}>근거 문서 보기</Button></div></Modal>
  </div></DataBoundary>;
}
