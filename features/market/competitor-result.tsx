"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@/components/common/ui";
import { signedPercent } from "@/lib/services/dashboard-metrics";

type PeriodTotal = { start: string; end: string; dataDays: number; dailyRevenue: number | null };
type ChannelPeriod = { dataDays: number; channels: { channel: string; dailyRevenue: number | null }[] };
type Impact = { days: number; total: { before: PeriodTotal; during: PeriodTotal; after: PeriodTotal }; channels: ChannelPeriod[] | null };

const man = (value: number | null) => (value === null ? "자료 없음" : `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`);
const change = (from: number | null, to: number | null) => (from && to !== null ? ((to - from) / from) * 100 : null);
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

/** 끝난 경쟁사 행사의 결과: 행사 전·중·후 같은 길이 기간의 하루 평균 매출 비교 */
export function CompetitorResultCard({ eventId, title }: { eventId: string; title: string }) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/competitor-impact?eventId=${encodeURIComponent(eventId)}`)
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "결과를 계산하지 못했어요."); return payload; })
      .then((payload) => { if (!cancelled) setImpact(payload); })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "결과를 계산하지 못했어요."); });
    return () => { cancelled = true; };
  }, [eventId]);

  const t = impact?.total;
  const duringChange = t ? change(t.before.dailyRevenue, t.during.dailyRevenue) : null;
  const afterChange = t ? change(t.before.dailyRevenue, t.after.dailyRevenue) : null;
  // 행사 전·중 모두 기간의 절반 이상 자료가 있어야 결론을 냅니다(며칠치만으로 단정하지 않음).
  const minDays = impact ? Math.ceil(impact.days / 2) : 1;
  const enough = t ? t.before.dataDays >= minDays && t.during.dataDays >= minDays : false;
  const verdict = !t ? "" : !enough ? `행사 전 ${t.before.dataDays}일 · 행사 중 ${t.during.dataDays}일치 자료뿐이라(각 ${minDays}일 이상 필요) 영향을 판단하기 일러요. 해당 기간 매출을 업로드하면 계산돼요.`
    : duringChange !== null && duringChange <= -3 ? `행사 기간 하루 매출이 행사 전보다 ${signedPercent(duringChange)} 줄었어요.${afterChange === null || t.after.dataDays === 0 ? " 행사 후 자료가 아직 없어 회복 여부는 확인 전이에요." : afterChange >= -1 ? " 행사가 끝난 뒤 행사 전 수준으로 회복했어요." : ` 행사 후에도 ${signedPercent(afterChange)}로 회복이 덜 됐어요 — 고객 이탈 여부를 확인하세요.`}`
      : `행사 기간 하루 매출 변화가 ${signedPercent(duringChange ?? 0)}로 크지 않았어요. 이번 행사의 영향은 제한적이었어요.`;

  return <Card className="rd-result-card">
    <div className="rd-card-head"><div className="rd-card-title"><h3>결과 확인 · {title}</h3><Badge tone="neutral">행사 종료</Badge></div><span className="rd-muted">같은 길이({impact?.days ?? "-"}일) 기간 하루 평균</span></div>
    {error && <p className="decision-error">{error}</p>}
    {!impact && !error && <p className="rd-muted">매출 자료로 계산하는 중…</p>}
    {t && <>
      <div className="rd-result-grid">
        {([["행사 전", t.before], ["행사 중", t.during], ["행사 후", t.after]] as const).map(([label, period]) => <div key={label} className={label === "행사 중" ? "is-during" : ""}>
          <span>{label} <small>{md(period.start)}~{md(period.end)}</small></span>
          <strong>{man(period.dailyRevenue)}</strong>
          <small className="rd-muted">자료 {period.dataDays}/{impact!.days}일{label !== "행사 전" && period.dailyRevenue !== null && t.before.dailyRevenue ? ` · ${signedPercent(change(t.before.dailyRevenue, period.dailyRevenue)!)}` : ""}</small>
        </div>)}
      </div>
      <p className={`rd-result-verdict${enough && duringChange !== null && duringChange <= -3 ? " red" : ""}`}>{verdict}</p>
      {impact!.channels && <div className="table-wrap"><table className="data-table"><thead><tr><th>채널</th><th>행사 전</th><th>행사 중</th><th>행사 후</th></tr></thead><tbody>
        {[...new Set(impact!.channels.flatMap((period) => period.channels.map((item) => item.channel)))].map((channel) => { const value = (index: number) => impact!.channels![index].channels.find((item) => item.channel === channel)?.dailyRevenue ?? null; const during = change(value(0), value(1)); return <tr key={channel}><td><strong>{channel}</strong></td><td>{man(value(0))}</td><td>{man(value(1))}{during !== null && <span className={during <= -3 ? "red" : "rd-muted"}> {signedPercent(during)}</span>}</td><td>{man(value(2))}</td></tr>; })}
      </tbody></table></div>}
      {!impact!.channels && <p className="pd-data-note">채널별 비교는 매출을 업로드하면 볼 수 있어요(데이터 연결 &gt; 매출).</p>}
    </>}
  </Card>;
}
