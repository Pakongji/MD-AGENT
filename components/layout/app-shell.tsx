"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Bot, Boxes, CalendarDays, ChartNoAxesCombined, ChevronRight, ClipboardCheck, Handshake, Home, Library, PackageSearch, RotateCcw, Search, Sparkles, Tag, TrendingUp, Users, X } from "lucide-react";
import { Button, Modal } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import type { CopilotAnswer } from "@/lib/ai/provider";

const nav = [
  { href: "/", label: "홈", icon: Home, subtitle: "대화만으로 조회·판단·실행까지 연결하세요." },
  { href: "/tasks", label: "오늘의 업무", icon: ClipboardCheck, subtitle: "AI와 함께 오늘 할 일을 정리하고 실행하세요." },
  { href: "/sales", label: "매출 분석", icon: ChartNoAxesCombined, subtitle: "매출 변화와 상품별 성과를 빠르게 확인하세요." },
  { href: "/market", label: "시장/트렌드", icon: TrendingUp, subtitle: "오늘의 시장 신호를 확인하고 더 깊게 검증하세요." },
  { href: "/competitors", label: "경쟁사 모니터링", icon: Users, subtitle: "우리 매출에 영향이 큰 경쟁사 변화부터 대응하세요." },
  { href: "/inventory", label: "재고/발주", icon: Boxes, subtitle: "품절과 과재고를 줄이고 발주 결정을 빠르게 내리세요." },
  { href: "/products", label: "상품/브랜드 관리", icon: PackageSearch, subtitle: "상품과 브랜드의 성과·리스크·구색을 관리하세요." },
  { href: "/promotions", label: "프로모션 기획", icon: Tag, subtitle: "시장·경쟁사·재고 신호를 프로모션으로 연결하세요." },
  { href: "/calendar", label: "캘린더", icon: CalendarDays, subtitle: "프로모션·마감·입고·협업 일정을 함께 관리하세요." },
  { href: "/collaboration", label: "협업 요청", icon: Handshake, subtitle: "요청서 생성부터 담당자·마감·상태까지 관리하세요." },
  { href: "/performance", label: "성과 분석", icon: Sparkles, subtitle: "성과를 회고하고 다음 액션으로 연결하세요." },
  { href: "/knowledge", label: "지식 저장소", icon: Library, subtitle: "과거 자료와 인사이트를 근거와 함께 재사용하세요." },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, load, command, loading, busy, toast, clearToast, showToast, recordAIConversation } = useAppStore();
  const [question, setQuestion] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const current = nav.find((item) => item.href === pathname) || nav[0];
  const unread = data.notifications.filter((item) => !item.read).length;

  useEffect(() => { void load(); }, [load]);

  async function askCopilot() {
    if (loading) { showToast("업무 데이터를 불러온 뒤 질문해주세요.", "info"); return; }
    if (question.trim().length < 2) return;
    setCopilotOpen(true); setCopilotLoading(true); setAnswer(null);
    try {
      const response = await fetch("/api/ai/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, page: pathname }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "답변을 만들지 못했습니다.");
      if (payload.conversation) recordAIConversation(payload.conversation);
      setAnswer(payload.answer);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "답변을 만들지 못했습니다.", "error");
    } finally {
      setCopilotLoading(false);
    }
  }

  async function runCopilotAction(action: CopilotAnswer["actions"][number]) {
    if (action.command) {
      await command(action.command as unknown as Record<string, unknown>);
      return;
    }
    if (action.taskTitle) {
      await command({ type: "ADD_TASK", title: action.taskTitle, category: "AI Copilot", priority: "HIGH", due: "오늘", reason: "Copilot 답변에서 생성" });
      return;
    }
    if (action.target) {
      setCopilotOpen(false);
      router.push(action.target);
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>MD AI Agent</span></Link>
      <nav aria-label="주 메뉴">{nav.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`}><Icon size={17} /><span>{item.label}</span>{pathname === item.href && <ChevronRight size={14} className="nav-arrow" />}</Link>; })}</nav>
      <div className="sidebar-footer">
        <div className="mode-card"><Bot size={16} /><div><strong>Mock AI Mode</strong><span>API 키 없이 동작 중</span></div></div>
        <Button variant="ghost" className="full-width" onClick={() => setResetOpen(true)} aria-label="데모 데이터 초기화"><RotateCcw size={14} /> 데모 데이터 초기화</Button>
      </div>
    </aside>
    <main className="main-shell">
      <header className="topbar">
        <div className="page-heading"><span className="eyebrow">MD Workspace</span><h1>{current.label}</h1><p>{current.subtitle}</p></div>
        <div className="topbar-actions">
          <label className="category-select"><span>담당 카테고리</span><select aria-label="담당 카테고리"><option>뷰티 전체</option><option>립 메이크업</option><option>스킨케어</option><option>베이스 메이크업</option></select></label>
          {pathname !== "/" && <form className="copilot-input" onSubmit={(event) => { event.preventDefault(); void askCopilot(); }}><Bot size={17} /><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="AI에게 물어보세요" aria-label="AI Copilot 질문" /><button aria-label="AI에게 질문"><Search size={16} /></button></form>}
          <button className="notification-button" aria-label={`알림 ${unread}개`} onClick={() => { setNotificationsOpen(!notificationsOpen); if (unread) void command({ type: "READ_NOTIFICATIONS" }); }}><Bell size={18} />{unread > 0 && <span>{unread}</span>}</button>
          <div className="profile"><span>김</span><div><strong>김민지</strong><small>Beauty MD</small></div></div>
        </div>
      </header>
      {notificationsOpen && <div className="notification-popover"><div className="popover-title"><strong>알림</strong><button onClick={() => setNotificationsOpen(false)} aria-label="알림 닫기"><X size={16} /></button></div>{data.notifications.map((item) => <button key={item.id} onClick={() => { setNotificationsOpen(false); router.push(item.target); }}><strong>{item.title}</strong><span>{item.detail}</span></button>)}</div>}
      <div className="page-content">{children}</div>
    </main>
    {toast && <div className={`toast toast-${toast.tone}`} role="status"><span>{toast.message}</span><button onClick={clearToast} aria-label="알림 닫기"><X size={15} /></button></div>}
    <Modal open={copilotOpen} title="MD Copilot" onClose={() => setCopilotOpen(false)}>
      <div className="copilot-question"><span>질문</span><strong>{question}</strong></div>
      {copilotLoading && <div className="ai-thinking"><Bot size={19} /><span>현재 페이지와 내부 데이터를 함께 확인하고 있어요…</span></div>}
      {answer && <div className="copilot-answer">
        <div><span className="answer-label">결론</span><h3>{answer.conclusion}</h3></div>
        <div><span className="answer-label">근거</span><ul>{answer.evidence.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><span className="answer-label">자사 영향</span><p>{answer.impact}</p></div>
        {answer.sources?.length ? <div className="source-box"><span>근거 문서</span>{answer.sources.map((source) => <strong key={source}>{source}</strong>)}</div> : null}
        <div className="modal-actions">{answer.actions.map((action) => <Button key={action.label} variant={action.command || action.taskTitle ? "purple" : "secondary"} onClick={() => void runCopilotAction(action)}>{action.label}</Button>)}</div>
      </div>}
    </Modal>
    <Modal open={resetOpen} title="데모 데이터 초기화" onClose={() => setResetOpen(false)} width="460px"><p>지금까지 추가·수정한 데모 데이터가 모두 초기 상태로 돌아갑니다.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setResetOpen(false)}>취소</Button><Button variant="danger" disabled={busy} onClick={async () => { if (await command({ type: "RESET_DEMO" })) setResetOpen(false); }}>초기화</Button></div></Modal>
  </div>;
}
