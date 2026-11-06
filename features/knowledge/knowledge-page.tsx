"use client";

import { useMemo, useState } from "react";
import { Bot, FilePlus, Library, Search, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState, Modal, SectionTitle } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import type { CopilotAnswer } from "@/lib/ai/provider";

export function KnowledgePage() {
  const { data, command, busy, showToast, openDecision } = useAppStore();
  const [documentFilter, setDocumentFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState(""); const [type, setType] = useState("회의"); const [content, setContent] = useState("");
  const filtered = useMemo(() => { const q = query.toLowerCase(); return data.knowledgeDocuments.filter((doc) => (documentFilter === "전체" || doc.type === "의사결정") && (!q || `${doc.title} ${doc.type} ${doc.content} ${doc.tags}`.toLowerCase().includes(q))); }, [data.knowledgeDocuments, query, documentFilter]);
  async function ask() {
    if (query.trim().length < 2) { showToast("검색어나 질문을 입력해주세요.", "error"); return; }
    setAsking(true); const response = await fetch("/api/ai/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: query, page: "/records?tab=knowledge" }) }); const payload = await response.json(); setAsking(false); if (response.ok) setAnswer(payload.answer);
  }
  return <DataBoundary><div className="stack">
    <Card className="card-purple"><SectionTitle title="MD Agent의 장기 기억" description="자료를 검색하거나 자연어로 물으면 반드시 근거 문서와 함께 답합니다." action={<Badge tone="purple"><Library size={11} /> {data.knowledgeDocuments.length}개 문서</Badge>} /><div className="knowledge-search"><div className="search-wrap"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} placeholder="예: 작년에 립 프로모션 뭐가 잘됐지?" aria-label="지식 문서 검색" /></div><Button onClick={() => void ask()} disabled={asking}><Sparkles size={13} /> {asking ? "근거 확인 중…" : "AI에게 질문"}</Button><Button variant="secondary" onClick={() => setAddOpen(true)}><FilePlus size={13} /> 자료 추가</Button></div></Card>
    <div className="knowledge-filters">{["전체", "의사결정"].map((filter) => <Button key={filter} variant={documentFilter === filter ? "purple" : "secondary"} aria-pressed={documentFilter === filter} onClick={() => setDocumentFilter(filter)}>{filter === "의사결정" ? "의사결정 기록" : "전체 자료"}</Button>)}</div>
    <div className="knowledge-layout"><Card><SectionTitle title="자료" description="프로모션·상품·브랜드·보고서·회의·의사결정·성과·리서치" />{filtered.length ? filtered.map((doc) => {
      const decisionId = doc.source.startsWith("task-decision:") ? doc.source.slice("task-decision:".length) : null;
      const task = decisionId ? data.tasks.find((item) => item.decisions.some((decision) => decision.id === decisionId)) : null;
      return <article className="document-item" key={doc.id}><header><div><h3>{doc.title}</h3><div className="document-meta"><span>{new Date(doc.createdAt).toLocaleDateString("ko-KR")}</span><span>{decisionId ? "업무에서 확정한 결정" : doc.source}</span></div></div><Badge tone={doc.type === "의사결정" ? "green" : doc.type === "성과" ? "orange" : doc.type === "리서치" ? "purple" : "blue"}>{doc.type}</Badge></header><p className={decisionId ? "decision-document-content" : undefined}>{doc.content}</p><div className="document-meta">{doc.tags.split(",").filter(Boolean).map((tag) => <span key={tag}>#{tag}</span>)}</div>{task && decisionId && <Button variant="secondary" onClick={() => openDecision({ taskId: task.id, selectedId: decisionId })}>연결된 업무와 결정 보기</Button>}</article>;
    }) : <EmptyState title="검색 결과가 없습니다" description="다른 키워드로 검색하거나 업무에서 결정을 기록해보세요." />}</Card><Card className="answer-panel"><SectionTitle title="AI 답변" description="내부 문서의 근거를 명시합니다." action={<Badge tone="purple"><Bot size={11} /> Grounded</Badge>} />{!answer && !asking && <EmptyState title="질문을 기다리고 있어요" description="과거 프로모션, 상품 운영, 회의 결정을 물어보세요." />}{asking && <div className="ai-thinking"><Bot size={19} /><span>관련 문서를 찾고 답변 근거를 확인하고 있어요…</span></div>}{answer && <div className="copilot-answer"><div><span className="answer-label">결론</span><h3>{answer.conclusion}</h3></div><div><span className="answer-label">근거</span><ul>{answer.evidence.map((item) => <li key={item}>{item}</li>)}</ul></div><div><span className="answer-label">자사 영향</span><p>{answer.impact}</p></div><div className="source-box"><span>근거 문서</span>{answer.sources?.length ? answer.sources.map((source) => <strong key={source}>{source}</strong>) : <strong>현재 MD Agent 데모 데이터</strong>}</div></div>}</Card></div>
    <Modal open={addOpen} title="지식 자료 추가" onClose={() => setAddOpen(false)} width="560px"><div className="field"><label>제목</label><input value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="field" style={{ marginTop: 12 }}><label>유형</label><select value={type} onChange={(event) => setType(event.target.value)}><option>프로모션</option><option>상품</option><option>브랜드</option><option>보고서</option><option>회의</option><option>의사결정</option><option>성과</option><option>리서치</option></select></div><div className="field" style={{ marginTop: 12 }}><label>내용</label><textarea value={content} onChange={(event) => setContent(event.target.value)} /></div><div className="modal-actions"><Button variant="secondary" onClick={() => setAddOpen(false)}>취소</Button><Button disabled={!title || !content || busy} onClick={async () => { if (await command({ type: "ADD_KNOWLEDGE", title, documentType: type, content, source: "사용자 입력", tags: type })) { setAddOpen(false); setTitle(""); setContent(""); } }}>저장</Button></div></Modal>
  </div></DataBoundary>;
}
