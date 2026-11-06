"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { Bell, BookOpen, Bot, ChartNoAxesCombined, ClipboardCheck, Clock3, Database, Home, LogOut, Send, Sparkles, Tag, TrendingUp, X } from "lucide-react";
import { Button, Modal } from "@/components/common/ui";
import { DecisionDialog } from "@/components/common/decision-dialog";
import { CopilotAnswerView } from "@/components/common/copilot-answer";
import { ALL_CATEGORIES, useAppStore } from "@/lib/store/app-store";
import { CHANNELS, CONNECTED_SOURCES, DATA_SOURCES, type Channel } from "@/lib/mock/samples";
import { dataConnectionMeta, navSections, routeMeta, type NavKey } from "@/lib/navigation";
import { dataAsOf } from "@/lib/services/data-freshness";
import type { CopilotAnswer } from "@/lib/ai/provider";

const icons: Record<NavKey, typeof Home> = { home: Home, work: ClipboardCheck, analysis: ChartNoAxesCombined, market: TrendingUp, promotions: Tag, records: BookOpen };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return <SessionProvider><AuthenticatedAppShell>{children}</AuthenticatedAppShell></SessionProvider>;
}

function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data, load, command, loading, busy, toast, clearToast, filters, setFilters, restoreFilters, openCopilot } = useAppStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const meta = routeMeta(pathname);
  const unread = data.notifications.filter((item) => !item.read).length;
  const categories = useMemo(() => [...new Set(data.products.map((item) => item.category))], [data.products]);
  const asOf = dataAsOf(data);
  const connected = CONNECTED_SOURCES.length;
  const userLabel = session?.user?.name || session?.user?.email || "로그인 사용자";

  useEffect(() => { restoreFilters(); }, [restoreFilters]);
  useEffect(() => { void load(); }, [load, pathname]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openCopilot(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openCopilot]);

  return <div className="app-shell">
    <aside className="sidebar rd-sidebar">
      <Link href="/" className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>MD AI Agent</span></Link>
      <nav aria-label="주 메뉴">
        {navSections.map((section) => <div key={section.label} className="rd-nav-section">
          <span className="rd-nav-label">{section.label}</span>
          {section.items.map((item) => {
            const Icon = icons[item.key];
            const active = meta.key === item.key;
            return <Link key={item.href} href={item.href} className={`rd-nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={17} /><span><strong>{item.label}</strong><small>{item.sub}</small></span>
            </Link>;
          })}
        </div>)}
      </nav>
      <div className="sidebar-footer">
        <Link href={dataConnectionMeta.href} className={`rd-data-card ${pathname.startsWith("/data") ? "active" : ""}`}>
          <span className="rd-data-card-title"><Database size={14} /> {connected ? "일부 데이터 연결됨" : "샘플 데이터로 보는 중"}</span>
          <span>연결된 데이터 {connected}/{DATA_SOURCES.length} · 연결한 화면부터 실데이터로 바뀌어요</span>
          <strong>데이터 연결 설정 →</strong>
        </Link>
        <button className="rd-reset" onClick={() => setResetOpen(true)}>데모 데이터 초기화</button>
      </div>
    </aside>
    <main className="main-shell">
      <header className="topbar rd-topbar">
        <div className="page-heading"><span className="eyebrow">MD Workspace</span><h1>{meta.label}</h1><p>{meta.subtitle}</p></div>
        <div className="topbar-actions">
          <span className="rd-asof" title={connected ? "연결된 데이터의 마지막 업로드 시각입니다." : "아직 연결된 데이터가 없어 샘플 데이터를 보여주고 있어요."}>
            <Clock3 size={14} /> {loading ? "데이터 확인 중" : `데이터 기준 ${asOf}`}{!connected && <em>· 샘플</em>}
          </span>
          <label className="rd-select"><span>카테고리</span>
            <select aria-label="담당 카테고리" value={filters.category} onChange={(event) => setFilters({ category: event.target.value })}>
              <option>{ALL_CATEGORIES}</option>{categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="rd-select"><span>채널</span>
            <select aria-label="판매 채널" value={filters.channel} onChange={(event) => setFilters({ channel: event.target.value as Channel })}>
              {CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
            </select>
          </label>
          <button className="rd-ask" onClick={() => openCopilot()} aria-label="AI에게 묻기 (Ctrl+K)"><Sparkles size={14} /> AI에게 묻기 <kbd>Ctrl K</kbd></button>
          <button className="notification-button" aria-label={`알림 ${unread}개`} onClick={() => { setNotificationsOpen(!notificationsOpen); if (unread) void command({ type: "READ_NOTIFICATIONS" }); }}><Bell size={18} />{unread > 0 && <span>{unread}</span>}</button>
          <div className="rd-profile" title={userLabel}><span>{userLabel.slice(0, 1)}</span><button onClick={() => void signOut({ redirectTo: "/login" })} aria-label="로그아웃" title="로그아웃"><LogOut size={14} /></button></div>
        </div>
      </header>
      {notificationsOpen && <div className="notification-popover"><div className="popover-title"><strong>알림</strong><button onClick={() => setNotificationsOpen(false)} aria-label="알림 닫기"><X size={16} /></button></div>{data.notifications.map((item) => <button key={item.id} onClick={() => { setNotificationsOpen(false); router.push(item.target); }}><strong>{item.title}</strong><span>{item.detail}</span></button>)}</div>}
      <div className="page-content">{children}</div>
    </main>
    {toast && <div className={`toast toast-${toast.tone}`} role="status"><span>{toast.message}</span><button onClick={clearToast} aria-label="알림 닫기"><X size={15} /></button></div>}
    <CopilotModal />
    <Modal open={resetOpen} title="데모 데이터 초기화" onClose={() => setResetOpen(false)} width="460px"><p>지금까지 추가·수정한 데모 데이터가 모두 초기 상태로 돌아갑니다.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setResetOpen(false)}>취소</Button><Button variant="danger" disabled={busy} onClick={async () => { if (await command({ type: "RESET_DEMO" })) setResetOpen(false); }}>초기화</Button></div></Modal>
    <DecisionDialog />
  </div>;
}

function CopilotModal() {
  const { copilot, closeCopilot } = useAppStore();
  // 열릴 때마다 본문을 새로 마운트해 이전 질문·답변을 비웁니다.
  return <Modal open={copilot.open} title="AI에게 묻기" onClose={closeCopilot}>
    {copilot.open && <CopilotBody key={copilot.question} initialQuestion={copilot.question} />}
  </Modal>;
}

function CopilotBody({ initialQuestion }: { initialQuestion: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { closeCopilot, command, loading, showToast, recordAIConversation } = useAppStore();
  const [question, setQuestion] = useState(initialQuestion);
  const [asked, setAsked] = useState("");
  const [thinking, setThinking] = useState(false);
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);

  async function ask() {
    if (loading) { showToast("업무 데이터를 불러온 뒤 질문해주세요.", "info"); return; }
    const text = question.trim();
    if (text.length < 2 || thinking) return;
    setAsked(text); setThinking(true); setAnswer(null);
    try {
      const response = await fetch("/api/ai/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, page: pathname }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "답변을 만들지 못했습니다.");
      if (payload.conversation) recordAIConversation(payload.conversation);
      setAnswer(payload.answer);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "답변을 만들지 못했습니다.", "error");
    } finally { setThinking(false); }
  }

  async function run(action: CopilotAnswer["actions"][number]) {
    if (action.command) {
      if (["REVIEW_TASK", "TOGGLE_TASK", "CREATE_ORDER", "HOLD_ORDER"].includes(action.command.type)) closeCopilot();
      await command(action.command as unknown as Record<string, unknown>);
      return;
    }
    if (action.taskTitle) { await command({ type: "ADD_TASK", title: action.taskTitle, category: action.taskCategory ?? "일반", priority: "HIGH", due: "오늘", reason: "AI 답변에서 생성" }); return; }
    if (action.target) { closeCopilot(); router.push(action.target); }
  }

  return <>
    <form className="rd-copilot-form" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
      <input autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="무엇이든 물어보세요 · 예: 쿠팡에서 A 립밤 왜 빠졌어?" aria-label="AI에게 질문" />
      <button type="submit" disabled={thinking || question.trim().length < 2} aria-label="질문 보내기"><Send size={16} /></button>
    </form>
    {asked && <div className="copilot-question"><span>질문</span><strong>{asked}</strong></div>}
    {thinking && <div className="ai-thinking"><Bot size={19} /><span>현재 화면과 업무 데이터를 함께 확인하고 있어요…</span></div>}
    {answer && <CopilotAnswerView answer={answer} onAction={(action) => void run(action)} />}
  </>;
}
