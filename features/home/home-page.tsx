"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Bot, Boxes, CalendarClock, Check, CircleAlert, Send, Sparkles, WandSparkles } from "lucide-react";
import { Badge, Button, Card, compactMoney, DataBoundary, money } from "@/components/common/ui";
import type { CopilotAnswer } from "@/lib/ai/provider";
import { getSalesSnapshot } from "@/lib/services/dashboard-metrics";
import { useAppStore } from "@/lib/store/app-store";

type ChatMessage =
  | { id: string; role: "user"; text: string; fromHistory?: boolean }
  | { id: string; role: "assistant"; answer: CopilotAnswer; fromHistory?: boolean }
  | { id: string; role: "status"; text: string };

const suggestions = [
  "오늘 가장 먼저 할 일 알려줘",
  "A 립밤 재고 확인하고 발주안 보여줘",
  "이번 달 매출을 요약해줘",
  "B사 할인 대응 업무 만들어줘",
  "립오일 프로모션 기획해줘",
  "이번 달 성과 리포트 만들어줘",
];

function parseAnswer(value: string) {
  try {
    return JSON.parse(value) as CopilotAnswer;
  } catch {
    return null;
  }
}

export function HomePage() {
  const router = useRouter();
  const { data, command, busy, loading, showToast, recordAIConversation } = useAppStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [executed, setExecuted] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const sales = getSalesSnapshot(data.salesMetrics);
  const openTasks = data.tasks.filter((task) => task.status !== "완료");
  const orderRisks = data.inventory.filter((item) => item.status === "발주 필요" && item.orderStatus !== "발주 완료");
  const mainCompetitor = [...data.competitorEvents].sort((a, b) => Math.abs(b.impactEstimate) - Math.abs(a.impactEstimate))[0];

  const history = useMemo(() => data.aiConversations.slice(0, 6).reverse(), [data.aiConversations]);

  useEffect(() => {
    if (loading || historyLoaded) return;
    const previous: ChatMessage[] = [];
    history.forEach((conversation) => {
      const answer = parseAnswer(conversation.answer);
      previous.push({ id: `${conversation.id}-question`, role: "user", text: conversation.question, fromHistory: true });
      if (answer) previous.push({ id: `${conversation.id}-answer`, role: "assistant", answer, fromHistory: true });
    });
    setMessages(previous);
    setHistoryLoaded(true);
  }, [history, historyLoaded, loading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, asking]);

  async function ask(prompt = input) {
    const question = prompt.trim();
    if (question.length < 2 || asking) return;
    const questionId = `question-${Date.now()}`;
    setMessages((current) => [...current, { id: questionId, role: "user", text: question }]);
    setInput("");
    setAsking(true);
    try {
      const response = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, page: "/" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "답변을 만들지 못했습니다.");
      if (payload.conversation) recordAIConversation(payload.conversation);
      setMessages((current) => [...current, { id: `answer-${Date.now()}`, role: "assistant", answer: payload.answer }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "status", text: error instanceof Error ? error.message : "답변을 만들지 못했습니다." }]);
    } finally {
      setAsking(false);
    }
  }

  async function runAction(messageId: string, actionIndex: number, action: CopilotAnswer["actions"][number]) {
    const actionKey = `${messageId}-${actionIndex}`;
    if (executed.has(actionKey)) return;

    if (action.command) {
      const success = await command(action.command as unknown as Record<string, unknown>);
      if (success) {
        setExecuted((current) => new Set(current).add(actionKey));
        setMessages((current) => [...current, { id: `status-${Date.now()}`, role: "status", text: action.resultMessage ?? `“${action.label}” 실행을 완료했습니다.` }]);
      }
      return;
    }

    if (action.taskTitle) {
      const success = await command({ type: "ADD_TASK", title: action.taskTitle, category: "AI Copilot", priority: "HIGH", due: "오늘", reason: "AI 대화에서 생성" });
      if (success) {
        setExecuted((current) => new Set(current).add(actionKey));
        setMessages((current) => [...current, { id: `status-${Date.now()}`, role: "status", text: `“${action.taskTitle}” 업무를 추가했습니다.` }]);
      }
      return;
    }

    if (action.target) router.push(action.target);
  }

  return <DataBoundary><div className="ai-home-layout">
    <section className="agent-chat" aria-label="MD AI Agent 대화">
      <header className="agent-chat-header">
        <div className="agent-avatar"><Sparkles size={20} /></div>
        <div><div className="agent-title-row"><h2>MD AI Agent</h2><Badge tone="green">실행 가능</Badge></div><p>데이터를 확인하고, 판단을 돕고, 필요한 업무까지 실행합니다.</p></div>
        <div className="agent-data-state"><span className="live-dot" /> 데모 데이터 연결됨</div>
      </header>

      <div className="agent-messages" ref={scrollRef} aria-live="polite">
        <div className="chat-row assistant">
          <div className="chat-avatar"><Bot size={17} /></div>
          <div className="chat-bubble assistant-bubble welcome-bubble">
            <span className="message-kicker">오늘의 시작</span>
            <h3>민지님, 무엇을 같이 처리할까요?</h3>
            <p>매출·재고·시장·경쟁사·일정을 모두 확인하고 있어요. 질문뿐 아니라 “업무 추가해줘”, “발주해줘”, “리포트 만들어줘”처럼 실행을 요청해도 됩니다.</p>
            <div className="chat-suggestions">{suggestions.map((suggestion) => <button key={suggestion} disabled={asking} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>
          </div>
        </div>

        {messages.map((message) => {
          if (message.role === "user") return <div className="chat-row user" key={message.id}><div className="chat-bubble user-bubble"><p>{message.text}</p></div><div className="chat-user-avatar">김</div></div>;
          if (message.role === "status") return <div className="chat-status" key={message.id}><Check size={14} /><span>{message.text}</span></div>;
          return <div className="chat-row assistant" key={message.id}>
            <div className="chat-avatar"><Bot size={17} /></div>
            <div className="chat-bubble assistant-bubble">
              <span className="message-kicker">AI 판단</span>
              <h3>{message.answer.conclusion}</h3>
              <div className="answer-section"><strong>근거</strong><ul>{message.answer.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></div>
              <div className="answer-impact"><strong>자사 영향</strong><p>{message.answer.impact}</p></div>
              {message.answer.sources?.length ? <div className="chat-sources"><span>근거 문서</span>{message.answer.sources.map((source) => <strong key={source}>{source}</strong>)}</div> : null}
              {!message.fromHistory && <div className="chat-actions">{message.answer.actions.map((action, index) => {
                const actionKey = `${message.id}-${index}`;
                const isDone = executed.has(actionKey);
                return <Button key={`${action.label}-${index}`} variant={action.command || action.taskTitle ? "purple" : "secondary"} disabled={busy || isDone} onClick={() => void runAction(message.id, index, action)} aria-label={action.label}>{isDone ? <><Check size={13} /> 실행 완료</> : action.label}</Button>;
              })}</div>}
            </div>
          </div>;
        })}

        {asking && <div className="chat-row assistant"><div className="chat-avatar"><Bot size={17} /></div><div className="chat-bubble assistant-bubble thinking-bubble"><span /><span /><span /><p>업무 데이터와 근거를 확인하고 있어요.</p></div></div>}
      </div>

      <form className="agent-composer" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
        <div className="composer-box">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} placeholder="예: A 립밤 재고 확인하고 필요하면 발주안 만들어줘" aria-label="MD AI Agent에게 요청" rows={2} />
          <button type="submit" disabled={asking || input.trim().length < 2} aria-label="AI에게 요청 보내기"><Send size={18} /></button>
        </div>
        <div className="composer-meta"><span><WandSparkles size={12} /> 현재 데이터에 근거해 답하고, 실행 전 버튼으로 확인받습니다.</span><span>Enter 전송 · Shift+Enter 줄바꿈</span></div>
      </form>
    </section>

    <aside className="agent-context" aria-label="AI 업무 컨텍스트">
      <Card className="context-briefing">
        <div className="context-title"><div><span className="message-kicker">LIVE CONTEXT</span><h3>AI가 보고 있는 오늘</h3></div><span className="live-dot" /></div>
        <button onClick={() => void ask("이번 달 매출을 요약해줘")}><span className="context-icon orange"><BarChart3 size={16} /></span><div><span>최근 30일 매출</span><strong>{compactMoney(sales.revenue)}</strong><small>직전 30일 대비 {sales.revenueChangeRate > 0 ? "+" : ""}{sales.revenueChangeRate.toFixed(1)}%</small></div></button>
        <button onClick={() => void ask("오늘 가장 먼저 할 일 알려줘")}><span className="context-icon purple"><Sparkles size={16} /></span><div><span>미완료 업무</span><strong>{openTasks.length}건</strong><small>AI 실행 가능 {openTasks.filter((task) => task.aiExecutable).length}건</small></div></button>
        <button onClick={() => void ask("재고 위험 상품과 발주안을 알려줘")}><span className="context-icon red"><Boxes size={16} /></span><div><span>즉시 발주 검토</span><strong>{orderRisks.length}개 상품</strong><small>{orderRisks[0]?.product?.name ?? "현재 위험 없음"}</small></div></button>
        <button onClick={() => void ask("경쟁사 변화 중 가장 중요한 걸 알려줘")}><span className="context-icon blue"><CircleAlert size={16} /></span><div><span>경쟁사 최대 영향</span><strong>{mainCompetitor ? `-${money(Math.abs(mainCompetitor.impactEstimate))}원` : "없음"}</strong><small>{mainCompetitor?.title ?? "감지된 변화 없음"}</small></div></button>
      </Card>

      <Card>
        <div className="context-title"><div><span className="message-kicker">CONVERSATION GUIDE</span><h3>이렇게 말해보세요</h3></div></div>
        <div className="command-examples">
          <button onClick={() => { setInput("A 립밤 1,200개 발주해줘"); showToast("요청 문장을 입력창에 준비했습니다."); }}><strong>실행 요청</strong><span>“A 립밤 1,200개 발주해줘”</span></button>
          <button onClick={() => { setInput("첫 번째 업무 완료 처리해줘"); showToast("요청 문장을 입력창에 준비했습니다."); }}><strong>업무 관리</strong><span>“첫 번째 업무 완료 처리해줘”</span></button>
          <button onClick={() => { setInput("디자인팀 협업 요청 만들어줘"); showToast("요청 문장을 입력창에 준비했습니다."); }}><strong>협업 요청</strong><span>“디자인팀 협업 요청 만들어줘”</span></button>
          <button onClick={() => { setInput("10월 23일 일정 충돌 정리해줘"); showToast("요청 문장을 입력창에 준비했습니다."); }}><strong>일정 정리</strong><span>“10월 23일 일정 충돌 정리해줘”</span></button>
        </div>
      </Card>

      <div className="agent-trust-note"><CalendarClock size={14} /><p>AI는 조회와 초안을 바로 제공하고, 데이터가 바뀌는 실행은 버튼을 눌렀을 때만 처리합니다.</p></div>
    </aside>
  </div></DataBoundary>;
}
