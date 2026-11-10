"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Send, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataBoundary } from "@/components/common/ui";
import { CopilotAnswerView } from "@/components/common/copilot-answer";
import type { CopilotAnswer } from "@/lib/ai/provider";
import { ALL_CATEGORIES, matchesCategory, useAppStore } from "@/lib/store/app-store";
import { latestConfirmed } from "@/lib/decisions/shared";
import { approvalSummary, buildBriefing, lastDayRevenue, pendingDecisionTasks } from "@/lib/services/briefing";
import { hasPermission } from "@/lib/auth/permissions";
import { dataAsOf } from "@/lib/services/data-freshness";

type ChatMessage =
  | { id: string; role: "user"; text: string; fromHistory?: boolean }
  | { id: string; role: "assistant"; answer: CopilotAnswer; question: string; fromHistory?: boolean }
  | { id: string; role: "status"; text: string };

const suggestions = ["오늘 가장 먼저 할 일 알려줘", "A 립밤 재고 확인하고 발주안 보여줘", "B사 할인 대응 업무 만들어줘", "이번 달 성과 리포트 만들어줘"];

function parseAnswer(value: string) {
  try { return JSON.parse(value) as CopilotAnswer; } catch { return null; }
}

export function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, command, busy, loading, recordAIConversation, openDecision, openPurchaseOrder, filters } = useAppStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [executed, setExecuted] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const signals = buildBriefing(data, (category) => matchesCategory(filters, category));
  const revenue = lastDayRevenue(data);
  const openTasks = data.tasks.filter((task) => task.status !== "완료");
  const pending = pendingDecisionTasks(data);
  const approvals = approvalSummary(data, data.meta.viewerId, hasPermission(data.meta.viewer, "approve"));
  const myOpen = data.tasks.filter((task) => task.status !== "완료" && task.assigneeId === data.meta.viewerId).length;
  const openCollab = data.collaborationRequests.filter((item) => item.status !== "완료");
  const waitingCollab = openCollab.filter((item) => item.status === "승인 대기" || item.status === "대기");
  const name = session?.user?.name || session?.user?.email?.split("@")[0] || "";
  const history = useMemo(() => data.aiConversations.slice(0, 4).reverse(), [data.aiConversations]);

  useEffect(() => {
    if (loading || historyLoaded) return;
    const previous: ChatMessage[] = [];
    history.forEach((conversation) => {
      const answer = parseAnswer(conversation.answer);
      previous.push({ id: `${conversation.id}-question`, role: "user", text: conversation.question, fromHistory: true });
      if (answer) previous.push({ id: `${conversation.id}-answer`, role: "assistant", answer, question: conversation.question, fromHistory: true });
    });
    setMessages(previous);
    setHistoryLoaded(true);
  }, [history, historyLoaded, loading]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, asking]);

  async function ask(prompt = input) {
    const question = prompt.trim();
    if (question.length < 2 || asking) return;
    setMessages((current) => [...current, { id: `question-${Date.now()}`, role: "user", text: question }]);
    setInput("");
    setAsking(true);
    try {
      const response = await fetch("/api/ai/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, page: "/" }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "답변을 만들지 못했습니다.");
      if (payload.conversation) recordAIConversation(payload.conversation);
      setMessages((current) => [...current, { id: `answer-${Date.now()}`, role: "assistant", answer: payload.answer, question }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "status", text: error instanceof Error ? error.message : "답변을 만들지 못했습니다." }]);
    } finally { setAsking(false); }
  }

  async function runAction(messageId: string, actionIndex: number, action: CopilotAnswer["actions"][number]) {
    const actionKey = `${messageId}-${actionIndex}`;
    if (executed.has(actionKey)) return;
    if (action.command) {
      if (await command(action.command as unknown as Record<string, unknown>)) {
        setExecuted((current) => new Set(current).add(actionKey));
        setMessages((current) => [...current, { id: `status-${Date.now()}`, role: "status", text: action.resultMessage ?? `“${action.label}” 실행을 완료했습니다.` }]);
      }
      return;
    }
    if (action.taskTitle) {
      if (await command({ type: "ADD_TASK", title: action.taskTitle, category: action.taskCategory ?? "일반", priority: "HIGH", due: "오늘", reason: "AI 대화에서 생성" })) {
        setExecuted((current) => new Set(current).add(actionKey));
        setMessages((current) => [...current, { id: `status-${Date.now()}`, role: "status", text: `“${action.taskTitle}” 업무를 추가했습니다.` }]);
      }
      return;
    }
    if (action.target) router.push(action.target);
  }

  function editQuestion(question: string) {
    setInput(question);
    inputRef.current?.focus();
  }

  return <DataBoundary><div className="rd-home">
    <div className="rd-home-main">
      <div className="rd-greeting">
        <h2>{name ? `좋은 하루예요, ${name}님` : "좋은 하루예요"}</h2>
        <p>오늘 결정할 일 {signals.length}개 · 내 업무 {myOpen}건 · 결정이 필요한 업무 {pending.length}건 · 회신 대기 협업 {waitingCollab.length}건이 있어요</p>
      </div>

      {(approvals.toReview.length > 0 || approvals.rejected.length > 0 || approvals.waiting.length > 0) && <div className="rd-approval-strip">
        {approvals.toReview.length > 0 && <button className="is-review" onClick={() => openDecision({ taskId: approvals.toReview[0].task.id })}><strong>승인 요청 {approvals.toReview.length}건</strong><span>{approvals.toReview[0].decision!.authorName} · {approvals.toReview[0].task.title}</span><b>승인 검토 →</b></button>}
        {approvals.rejected.length > 0 && <button className="is-rejected" onClick={() => openDecision({ taskId: approvals.rejected[0].task.id })}><strong>반려 {approvals.rejected.length}건</strong><span>{approvals.rejected[0].task.title} · {approvals.rejected[0].decision!.approvalComment}</span><b>다시 결정 →</b></button>}
        {approvals.waiting.length > 0 && <button className="is-waiting" onClick={() => openDecision({ taskId: approvals.waiting[0].task.id })}><strong>승인 대기 {approvals.waiting.length}건</strong><span>{approvals.waiting[0].task.title}</span><b>요청 보기 →</b></button>}
      </div>}

      <Card className="rd-brief">
        <div className="rd-card-head">
          <div className="rd-card-title"><h3>오늘 결정할 {signals.length}가지</h3><Badge tone="neutral">AI 선별</Badge></div>
          <span className="rd-muted">재고 · 경쟁사 · 트렌드에서 영향 큰 순</span>
        </div>
        {signals.map((signal) => <div key={signal.id} className="rd-signal">
          <div className="rd-signal-body">
            <div className="rd-signal-title"><Badge tone={signal.tone}>{signal.label}</Badge><strong>{signal.title}</strong></div>
            <p>근거 · {signal.evidence}</p>
            <p className="rd-impact"><b>자사 영향</b>{signal.impact}</p>
            <small>출처: {signal.source} · 샘플</small>
          </div>
          <div className="rd-signal-actions">
            <Button variant="purple" disabled={busy} onClick={() => signal.action.kind === "order"
              ? openDecision(signal.action.decided ? { inventoryId: signal.action.inventory.id } : { inventoryId: signal.action.inventory.id, outcome: "PROCEED", quantity: signal.action.inventory.recommendedOrderQty })
              : signal.action.kind === "po" ? openPurchaseOrder(signal.action.purchaseOrderId) : router.push(signal.action.href)}>{signal.action.label}</Button>
          </div>
        </div>)}
        {!signals.length && <p className="rd-muted">지금 선택한 카테고리에서 바로 결정할 신호가 없어요.</p>}
      </Card>

      <div className="rd-kpis">
        <Card className="rd-kpi"><span>마지막 날 매출</span><div><strong>{revenue?.label ?? "-"}</strong>{revenue?.changeRate != null && <Badge tone={revenue.changeRate >= 0 ? "green" : "red"}>{revenue.changeRate >= 0 ? "▲" : "▼"} {Math.abs(revenue.changeRate).toFixed(1)}%</Badge>}</div><small>전주 같은 요일 대비 · {dataAsOf(data)}{filters.category !== ALL_CATEGORIES || filters.channel !== "전체" ? " · 뷰티 전체 기준(카테고리·채널별 매출 미연결)" : ""}</small></Card>
        <Card className="rd-kpi"><span>남은 업무</span><div><strong>{openTasks.length}건</strong><Badge tone="purple">결정 필요 {pending.length}</Badge></div><small>{pending[0] ? `가장 급한 결정: ${pending[0].title}` : "결정이 필요한 업무 없음"}</small></Card>
        <Card className="rd-kpi"><span>진행 중 협업</span><div><strong>{openCollab.length}건</strong><Badge tone="orange">회신 대기 {waitingCollab.length}</Badge></div><small>{waitingCollab[0] ? `${waitingCollab[0].team} · ${waitingCollab[0].title}` : "대기 중인 요청 없음"}</small></Card>
      </div>
    </div>

    <section className="rd-chat" aria-label="AI 업무 파트너">
      <header className="rd-chat-head">
        <div><span className="rd-chat-mark"><Sparkles size={14} /></span><h3>AI 업무 파트너</h3></div>
        <Badge tone="orange">샘플 데이터 기준</Badge>
      </header>
      <div className="rd-chat-body" ref={scrollRef} aria-live="polite">
        {!messages.length && <div className="rd-chat-empty">
          <p>매출·재고·업무·경쟁사 데이터를 보고 답하고, 업무 추가·발주·리포트처럼 실행까지 도와요. 답하기 전에 질문을 어떻게 이해했는지 먼저 보여줄게요.</p>
          <div className="chat-suggestions">{suggestions.map((suggestion) => <button key={suggestion} disabled={asking} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>
        </div>}
        {messages.map((message) => {
          if (message.role === "user") return <div className="rd-bubble-user" key={message.id}><p>{message.text}</p></div>;
          if (message.role === "status") return <div className="chat-status" key={message.id}><Check size={14} /><span>{message.text}</span></div>;
          const visible = message.answer.actions.map((action, index) => ({ action, index })).filter(({ action }) => !message.fromHistory || ((action.command?.type === "TOGGLE_TASK" || action.command?.type === "REVIEW_TASK") && data.tasks.some((task) => task.id === (action.command as { id: string }).id && task.requiresDecision)));
          return <CopilotAnswerView key={message.id} answer={message.answer} onEdit={message.fromHistory ? undefined : () => editQuestion(message.question)} renderActions={() => visible.map(({ action, index }) => {
            const actionKey = `${message.id}-${index}`;
            const isDone = executed.has(actionKey);
            const task = (action.command?.type === "TOGGLE_TASK" || action.command?.type === "REVIEW_TASK") ? data.tasks.find((item) => item.id === (action.command as { id: string }).id) : undefined;
            const review = task?.requiresDecision || action.command?.type === "REVIEW_TASK";
            const label = review && task ? latestConfirmed(task) ? "결정 기록 보기" : "검토하고 결정하기" : action.label;
            return <Button key={`${action.label}-${index}`} variant={action.command || action.taskTitle ? "purple" : "secondary"} disabled={busy || (!review && isDone)} onClick={() => review && task ? openDecision({ taskId: task.id }) : void runAction(message.id, index, action)}>{!review && isDone ? <><Check size={13} /> 실행 완료</> : label}</Button>;
          })} />;
        })}
        {asking && <div className="chat-bubble assistant-bubble thinking-bubble"><span /><span /><span /><p>업무 데이터와 근거를 확인하고 있어요.</p></div>}
      </div>
      <form className="rd-chat-input" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
        <textarea ref={inputRef} value={input} rows={1} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} placeholder="무엇이든 물어보세요 · 예: 쿠팡에서 A 립밤 왜 빠졌어?" aria-label="AI에게 요청" />
        <button type="submit" disabled={asking || input.trim().length < 2} aria-label="AI에게 요청 보내기"><Send size={16} /></button>
      </form>
    </section>
  </div></DataBoundary>;
}
