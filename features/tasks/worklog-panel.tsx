"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Badge, Button, Card, EmptyState, Metric, SectionTitle } from "@/components/common/ui";
import { kstDay, worklogPeriods, type WorklogPeriod } from "@/lib/worklog/period";
import type { WorklogReport } from "@/lib/worklog/report";

export function WorklogPanel() {
  const [period, setPeriod] = useState<WorklogPeriod>("daily");
  const [date, setDate] = useState(kstDay);
  const [refresh, setRefresh] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [response, setResponse] = useState<{ key: string; report?: WorklogReport; error?: string }>();
  const endpoint = "/api/worklog?" + new URLSearchParams({ period, date });
  const requestKey = endpoint + "#" + refresh;
  const current = response?.key === requestKey ? response : undefined;
  const report = current?.report;

  useEffect(() => {
    const abort = new AbortController();
    fetch(endpoint, { signal: abort.signal, cache: "no-store" }).then(async result => {
      const data = await result.json();
      if (!result.ok) throw new Error(data.error);
      setResponse({ key: requestKey, report: data });
    }).catch(error => {
      if (!abort.signal.aborted) setResponse({ key: requestKey, error: error.message || "업무일지를 불러오지 못했습니다." });
    });
    return () => abort.abort();
  }, [endpoint, requestKey]);

  async function download() {
    if (!report || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const result = await fetch(endpoint + "&format=xlsx");
      if (!result.ok) throw new Error((await result.json()).error);
      const url = URL.createObjectURL(await result.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "MD-" + report.label + "-" + report.start + (report.start === report.end ? "" : "_" + report.end) + ".xlsx";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "엑셀을 다운로드하지 못했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  return <div className="stack md-feature-body">
    <Card>
      <SectionTitle title="자동 업무일지" description="업무 변경과 캘린더·협업·발주·결정 기록을 자동으로 모아 보여줍니다."
        action={<Badge tone="green">자동 집계</Badge>} />
      <div className="md-feature-toolbar">
        <div className="actions" aria-label="일지 기간">
          {Object.entries(worklogPeriods).map(([key, label]) => <Button key={key} type="button" variant={period === key ? "purple" : "secondary"}
            aria-pressed={period === key} onClick={() => setPeriod(key as WorklogPeriod)}>{label}</Button>)}
        </div>
        <label className="md-date-control">기준일 <input type="date" max={kstDay()} value={date} onChange={event => event.target.value && setDate(event.target.value)} /></label>
        <div className="actions md-end">
          <Button variant="secondary" onClick={() => setRefresh(value => value + 1)}>새로고침</Button>
          <Button onClick={() => void download()} disabled={!report || downloading}><Download size={15} />{downloading ? "준비 중…" : "엑셀 다운로드"}</Button>
        </div>
      </div>
      {report && <p className="tiny">{report.start} ~ {report.end} · {report.asOf} 기준 (한국시간){report.trackingSince && " · 변경 이력 수집 " + report.trackingSince + "부터"}</p>}
      {downloadError && <p role="alert">{downloadError}</p>}
    </Card>
    {!current && <div className="state-box" role="status">업무일지를 집계하는 중입니다.</div>}
    {current?.error && <Card><p role="alert">{current.error}</p></Card>}
    {report && <>
      <div className="grid-4">
        <Metric label="완료 업무" value={report.completed + "건"} tone="good" />
        <Metric label="미완료 업무" value={report.pending + "건"} />
        <Metric label="병목 확인" value={report.blockers + "건"} tone={report.blockers ? "down" : "neutral"} />
        <Metric label="캘린더 일정" value={report.calendar + "건"} />
      </div>
      <div className="md-worklog-grid">
        <Card><SectionTitle title={report.label} description="기간 안에 기록된 업무와 연결된 처리 결과입니다." />
          {report.rows.length ? <div className="md-feature-table"><table className="data-table">
            <thead><tr><th>업무·기록</th><th>상태</th><th>완료·마감</th><th>결과 또는 병목</th><th>근거</th></tr></thead>
            <tbody>{report.rows.map(row => <tr key={row.id}>
              <td><strong>{row.title}</strong></td><td><Badge tone={row.status === "완료" ? "green" : row.blocker && row.blocker !== "원인 기록 없음" ? "orange" : "neutral"}>{row.status}</Badge></td>
              <td>{row.completedAt || row.due || "—"}</td><td>{row.blocker || row.result}</td><td><Link className="md-source" href={row.href}>{row.source}</Link></td>
            </tr>)}</tbody>
          </table></div> : <EmptyState title="이 기간에 표시할 기록이 없습니다" description="업무와 일정을 사용하면 변경 내역이 자동으로 반영됩니다." />}
        </Card>
        <div className="stack">
          <Card><SectionTitle title="병목 확인" />
            {report.blockerGroups.length ? report.blockerGroups.map(group => <p key={group.name}>{group.name} · {group.count}건</p>) : <p>기록에서 확인된 병목이 없습니다.</p>}
          </Card>
          <Card><SectionTitle title="후속 업무·일정" description="마감이 임박한 업무와 등록된 캘린더 일정입니다." />
            {report.followups.length ? <ul className="md-followups">{report.followups.slice(0, 8).map(row => <li key={row.id}>
              <Link href={row.href}>{row.title}</Link><p>{[row.due, row.next].filter(Boolean).join(" · ")}</p>
            </li>)}</ul> : <p>예정된 후속 작업이 없습니다.</p>}
          </Card>
        </div>
      </div>
    </>}
  </div>;
}
