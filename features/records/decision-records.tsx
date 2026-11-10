"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Search } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState, Modal } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { outcomeLabels, isEffective } from "@/lib/decisions/shared";
import { shortDate, shortDateTime } from "@/lib/services/data-freshness";
import type { TaskDecisionItem, TaskItem } from "@/lib/types/domain";

const RESULT_SOURCE = "decision-result:";
const RESULT_DUE_DAYS = 14;
type Entry = { decision: TaskDecisionItem; task: TaskItem; result?: { content: string; createdAt: string } };

/** 기록 > 결정 기록: 확정한 결정을 이력으로 보고, 2주가 지나면 결과를 남깁니다. */
export function DecisionRecords() {
  const { data, command, busy, openDecision } = useAppStore();
  const [query, setQuery] = useState("");
  const [resultFor, setResultFor] = useState<Entry | null>(null);
  const [verdict, setVerdict] = useState("판단 유효");
  const [resultText, setResultText] = useState("");

  const entries = useMemo<Entry[]>(() => {
    const results = new Map(data.knowledgeDocuments.filter((doc) => doc.source.startsWith(RESULT_SOURCE)).map((doc) => [doc.source.slice(RESULT_SOURCE.length), { content: doc.content, createdAt: doc.createdAt }]));
    return data.tasks.flatMap((task) => task.decisions.filter(isEffective).map((decision) => ({ decision, task, result: results.get(decision.id) })))
      .sort((a, b) => (b.decision.confirmedAt ?? b.decision.createdAt).localeCompare(a.decision.confirmedAt ?? a.decision.createdAt));
  }, [data.knowledgeDocuments, data.tasks]);

  const now = Date.parse(data.meta.lastUpdated) || 0; // 데이터를 불러온 시각 기준
  const q = query.trim().toLowerCase();
  const visible = entries.filter(({ decision, task }) => !q || `${task.title} ${decision.content} ${decision.rationale} ${decision.alternatives}`.toLowerCase().includes(q));
  const due = entries.filter(({ decision, result }) => !result && decision.outcome !== "HOLD" && now - Date.parse(decision.confirmedAt ?? decision.createdAt) >= RESULT_DUE_DAYS * 86_400_000);
  const report = data.performanceReports[0];
  const docs = data.knowledgeDocuments.filter((doc) => doc.type !== "의사결정" && !doc.source.startsWith(RESULT_SOURCE)).filter((doc) => !q || `${doc.title} ${doc.content} ${doc.tags}`.toLowerCase().includes(q)).slice(0, 4);

  async function saveResult() {
    if (!resultFor || !resultText.trim()) return;
    const ok = await command({ type: "ADD_KNOWLEDGE", title: `결정 결과 · ${resultFor.task.title}`, documentType: "결정 결과", content: `${verdict} · ${resultText.trim()}`, source: `${RESULT_SOURCE}${resultFor.decision.id}`, tags: `결정 결과,${resultFor.task.category}` });
    if (ok) { setResultFor(null); setResultText(""); setVerdict("판단 유효"); }
  }

  return <DataBoundary><div className="stack">
    <div className="rd-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 왜 립오일 발주 보류했지? · 작년 립 기획전" aria-label="기록 검색" /></div>
    <div className="rd-columns">
      <Card className="rd-col-main">
        <div className="rd-card-head"><h3>결정 기록 · 최신순</h3><span className="rd-muted">확정 기록은 덮어쓰지 않고 이력으로 쌓여요</span></div>
        {visible.map(({ decision, task, result }) => <div className="rd-timeline-item" key={decision.id}>
          <div className="rd-timeline-date"><span>{shortDate(decision.confirmedAt ?? decision.createdAt)}</span><i className={decision.outcome === "HOLD" ? "orange" : decision.outcome === "DECLINE" ? "gray" : "green"} /></div>
          <div className="rd-timeline-card">
            <div className="rd-signal-title"><Badge tone={decision.outcome === "HOLD" ? "orange" : decision.outcome === "DECLINE" ? "neutral" : "green"}>{outcomeLabels[decision.outcome]}</Badge><strong>{task.title}</strong></div>
            <p className="rd-kv"><b>결정</b>{decision.content}{decision.quantity ? ` · ${decision.quantity.toLocaleString("ko-KR")}개` : ""}</p>
            <p className="rd-kv"><b>판단 근거</b>{decision.rationale}</p>
            {decision.alternatives && <p className="rd-kv muted"><b>검토한 대안</b>{decision.alternatives}</p>}
            <small className="rd-muted">작성 {decision.authorName}{decision.reviewAt ? ` · 재검토 ${shortDateTime(decision.reviewAt)}` : ""}{decision.followUp ? ` · 후속: ${decision.followUp}` : ""}</small>
            {result ? <div className="rd-result"><CheckCircle2 size={14} /><span>결과 확인 · {result.content}</span></div>
              : decision.outcome !== "HOLD" && <Button variant="ghost" onClick={() => setResultFor({ decision, task })}>결과 기록하기</Button>}
            <Button variant="ghost" onClick={() => openDecision({ taskId: task.id, selectedId: decision.id })}>연결된 업무와 결정 보기</Button>
          </div>
        </div>)}
        {!visible.length && <EmptyState title={q ? "검색어와 맞는 결정이 없어요" : "아직 확정한 결정이 없어요"} description="업무에서 ‘검토하고 결정하기’로 결정을 확정하면 여기에 쌓여요." />}
      </Card>

      <div className="rd-col-side">
        <Card>
          <div className="rd-card-head"><div className="rd-card-title"><h3>결과 확인이 필요한 결정</h3>{due.length > 0 && <Badge tone="orange">{due.length}</Badge>}</div></div>
          <p className="rd-muted">결정한 지 {RESULT_DUE_DAYS}일이 지나면 결과를 남기도록 알려줘요. 이게 쌓이면 다음 판단의 근거가 돼요.</p>
          {due.slice(0, 4).map((entry) => <div className="rd-due" key={entry.decision.id}><div><strong>{entry.task.title}</strong><small>{shortDate(entry.decision.confirmedAt ?? entry.decision.createdAt)} 확정 · {outcomeLabels[entry.decision.outcome]}</small></div><Button variant="ghost" onClick={() => setResultFor(entry)}>결과 기록</Button></div>)}
          {!due.length && <p className="rd-muted">지금 결과를 남길 결정이 없어요.</p>}
        </Card>
        {report && <Card>
          <div className="rd-card-head"><h3>{report.title}</h3><span className="rd-muted">{report.period}</span></div>
          <div className="rd-kpi-inline"><strong>달성률 {report.achievement}%</strong></div>
          <p className="rd-muted">{report.summary}</p>
          <Link className="button button-secondary" href="/records?tab=reports">리포트 전체 보기</Link>
        </Card>}
        <Card>
          <div className="rd-card-head"><h3>관련 지식 문서</h3><Link className="rd-link" href="/records?tab=knowledge">전체 →</Link></div>
          {docs.map((doc) => <div className="rd-article" key={doc.id}><FileText size={14} /><div><strong>{doc.title}</strong><small>{shortDate(doc.createdAt)} · {doc.type}</small></div></div>)}
          {!docs.length && <p className="rd-muted">표시할 문서가 없어요.</p>}
        </Card>
      </div>
    </div>

    <Modal open={Boolean(resultFor)} title="결정 결과 기록" onClose={() => setResultFor(null)} width="520px">
      {resultFor && <>
        <p><strong>{resultFor.task.title}</strong> · {outcomeLabels[resultFor.decision.outcome]}</p>
        <p className="rd-muted">결정: {resultFor.decision.content}</p>
        <div className="rd-segment" role="group" aria-label="판단 결과">{["판단 유효", "일부만 맞음", "다시 볼 점 있음"].map((item) => <button key={item} type="button" aria-pressed={verdict === item} onClick={() => setVerdict(item)}>{item}</button>)}</div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="decision-result">실제 결과</label><textarea id="decision-result" value={resultText} onChange={(event) => setResultText(event.target.value)} placeholder="예: 해당 주 립 매출 -2% (예상 -5%), 품절 없이 입고 완료" /></div>
        <div className="modal-actions"><Button variant="secondary" onClick={() => setResultFor(null)}>취소</Button><Button disabled={busy || !resultText.trim()} onClick={() => void saveResult()}>결과 저장</Button></div>
      </>}
    </Modal>
  </div></DataBoundary>;
}
