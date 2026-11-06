"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Copy, Mail, Plus } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState } from "@/components/common/ui";
import { TaskRow } from "@/components/common/task-row";
import { useAppStore } from "@/lib/store/app-store";
import { latestConfirmed } from "@/lib/decisions/shared";
import { shortDate, shortDateTime } from "@/lib/services/data-freshness";
import { kstDay } from "@/lib/worklog/period";
import type { CalendarItem, TaskItem } from "@/lib/types/domain";

type Filter = "전체" | "결정 필요" | "기한 지남" | "AI 초안 가능";

const isOverdue = (task: TaskItem, now: number) => task.status !== "완료" && Boolean(task.dueAt) && Date.parse(task.dueAt!) < now;
const needsDecision = (task: TaskItem) => task.requiresDecision && task.status !== "완료" && !latestConfirmed(task);
const DECIDED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const decidedAt = (task: TaskItem) => { const decision = latestConfirmed(task); return decision ? Date.parse(decision.confirmedAt ?? decision.createdAt) : NaN; };

/** 업무 > 오늘: 결정이 필요한 업무부터, 옆에 일정·협업·업무일지를 함께 봅니다. */
export function WorkOverview() {
  const { data, command, busy, showToast } = useAppStore();
  const [filter, setFilter] = useState<Filter>("전체");
  const [quickTitle, setQuickTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  // 렌더 중 현재 시각을 직접 읽지 않고, 데이터를 불러온 시각을 기준으로 계산합니다.
  const now = Date.parse(data.meta.lastUpdated) || 0;

  const open = data.tasks.filter((task) => task.status !== "완료");
  const done = data.tasks.filter((task) => task.status === "완료");
  // 결정을 확정하면 업무가 완료되므로, 최근 7일 안에 결정한 업무는 ‘완료’에 묻지 않고 따로 보여줍니다.
  const decidedGroup = done.filter((task) => now - decidedAt(task) <= DECIDED_WINDOW_MS).sort((a, b) => decidedAt(b) - decidedAt(a));
  const olderDone = done.filter((task) => !decidedGroup.includes(task));
  const counts: Record<Filter, number> = {
    "전체": open.length,
    "결정 필요": open.filter(needsDecision).length,
    "기한 지남": open.filter((task) => isOverdue(task, now)).length,
    "AI 초안 가능": open.filter((task) => task.aiExecutable).length,
  };
  const visible = open.filter((task) => filter === "전체" || (filter === "결정 필요" ? needsDecision(task) : filter === "기한 지남" ? isOverdue(task, now) : task.aiExecutable));
  const decisionGroup = visible.filter(needsDecision);
  const restGroup = visible.filter((task) => !needsDecision(task));

  const schedule = upcomingDay(data.calendarEvents, now);
  const conflict = findConflict(schedule.events);
  const collab = data.collaborationRequests.filter((item) => item.status !== "완료").slice(0, 3);

  async function addQuick() {
    const title = quickTitle.trim();
    if (!title) return;
    if (await command({ type: "ADD_TASK", title, category: "일반", priority: "MEDIUM", due: "오늘", reason: "업무 화면에서 바로 추가" })) setQuickTitle("");
  }

  return <DataBoundary><div className="stack">
    <div className="rd-toolbar">
      <div className="rd-segment" role="group" aria-label="업무 범위">
        <button aria-pressed="true">내 업무 {open.length}</button>
        <button disabled title="업무에 담당자 정보가 연결되면 팀 업무를 나눠 볼 수 있어요.">팀 전체 · 담당자 연결 후</button>
      </div>
      <div className="rd-filter-chips">{(Object.keys(counts) as Filter[]).map((key) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{key} {counts[key]}</button>)}</div>
      <form className="rd-quick-add" onSubmit={(event) => { event.preventDefault(); void addQuick(); }}>
        <Plus size={16} />
        <input value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="바로 추가할 업무 · 예: 12월 기획전 상품 구성 정리" aria-label="업무 바로 추가" />
        <Button type="submit" disabled={busy || !quickTitle.trim()}>추가</Button>
        <Link className="rd-link" href="/tasks?tab=plan">AI로 업무 나누기 →</Link>
      </form>
    </div>

    <div className="rd-columns">
      <Card className="rd-col-main">
        <div className="rd-card-head"><h3>할 일</h3><span className="rd-muted">결정 필요 → 결정 완료 → 마감 순</span></div>
        {decisionGroup.length > 0 && <><div className="rd-group-label">결정이 필요해요</div>{decisionGroup.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void command({ type: "TOGGLE_TASK", id: task.id })} />)}</>}
        {filter === "전체" && decidedGroup.length > 0 && <><div className="rd-group-label">결정 완료 · 최근 7일</div>{decidedGroup.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void command({ type: "TOGGLE_TASK", id: task.id })} />)}</>}
        {restGroup.length > 0 && <><div className="rd-group-label">진행할 업무</div>{restGroup.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void command({ type: "TOGGLE_TASK", id: task.id })} />)}</>}
        {!visible.length && <EmptyState title="조건에 맞는 업무가 없어요" description="다른 필터를 선택하거나 업무를 추가해보세요." />}
        {olderDone.length > 0 && <>
          <button className="rd-group-toggle" onClick={() => setShowDone(!showDone)}>완료 {olderDone.length} {showDone ? "접기" : "펼치기"}</button>
          {showDone && olderDone.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void command({ type: "TOGGLE_TASK", id: task.id })} />)}
        </>}
      </Card>

      <div className="rd-col-side">
        <Card>
          <div className="rd-card-head"><h3>{schedule.label}</h3><Link className="rd-link" href="/tasks?tab=calendar">캘린더 →</Link></div>
          {schedule.events.map((event) => <div className="rd-schedule-row" key={event.id}><span>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(event.startAt))}</span><strong>{event.title}</strong><Badge tone={event.type === "발주" ? "red" : event.type === "프로모션" ? "purple" : "neutral"}>{event.type}</Badge></div>)}
          {!schedule.events.length && <p className="rd-muted">예정된 일정이 없어요.</p>}
          {conflict && <div className="rd-conflict">
            <strong><AlertTriangle size={14} /> {shortDateTime(conflict[0].startAt)} 일정 2개가 겹쳐요</strong>
            <p>{conflict[0].title} · {conflict[1].title}</p>
            <Button variant="ghost" disabled={busy} onClick={() => void command({ type: "ADD_TASK", title: `일정 조정: ${conflict[0].title} · ${conflict[1].title}`, category: "일정", priority: "HIGH", due: "오늘", reason: "업무 화면에서 일정 겹침 감지" })}>일정 조정 업무 만들기</Button>
          </div>}
        </Card>

        <Card>
          <div className="rd-card-head"><h3>협업 요청</h3><Link className="rd-link" href="/tasks?tab=collab">전체 보기 →</Link></div>
          {collab.map((item) => <div className="rd-collab" key={item.id}>
            <div><span>{item.team} · {item.owner}</span><Badge tone={item.status === "승인 대기" ? "orange" : item.status === "진행" ? "blue" : "neutral"}>{item.status}</Badge></div>
            <strong>{item.title}</strong>
            <small>마감 {shortDateTime(item.dueAt)}</small>
            <div className="rd-inline-actions">
              <a className="rd-link" href={`mailto:?subject=${encodeURIComponent(`[요청] ${item.title}`)}&body=${encodeURIComponent(item.requestText)}`}><Mail size={13} /> 메일로 보내기</a>
              <button className="rd-link" onClick={async () => { try { await navigator.clipboard.writeText(item.requestText); showToast("요청 문구를 복사했어요. 슬랙이나 메신저에 붙여넣으세요.", "success"); } catch { showToast("복사하지 못했어요. 협업 요청 탭에서 문구를 확인해주세요.", "error"); } }}><Copy size={13} /> 문구 복사</button>
            </div>
          </div>)}
          {!collab.length && <p className="rd-muted">진행 중인 협업 요청이 없어요.</p>}
        </Card>

        <Card>
          <div className="rd-card-head"><h3>업무일지</h3><span className="rd-muted">변경 내역으로 자동 기록</span></div>
          <div className="rd-stat-row">
            <div><strong className="green">{done.length}</strong><span>완료</span></div>
            <div><strong>{open.length}</strong><span>남은 일</span></div>
            <div><strong className="red">{counts["기한 지남"]}</strong><span>기한 지남</span></div>
          </div>
          <div className="rd-inline-actions">
            <a className="button button-secondary" href={`/api/worklog?period=weekly&date=${kstDay(new Date(now))}&format=xlsx`}>주간보고 엑셀 받기</a>
            <Link className="rd-link" href="/tasks?tab=worklog">업무일지 열기 →</Link>
          </div>
        </Card>
      </div>
    </div>
  </div></DataBoundary>;
}

function upcomingDay(events: CalendarItem[], now: number) {
  const active = events.filter((event) => event.status !== "완료").sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const next = active.find((event) => Date.parse(event.endAt) >= now) ?? active[active.length - 1];
  if (!next) return { label: "다가오는 일정", events: [] as CalendarItem[] };
  const day = kstDay(new Date(next.startAt));
  const sameDay = active.filter((event) => kstDay(new Date(event.startAt)) === day);
  const label = day === kstDay(new Date(now)) ? "오늘 일정" : Date.parse(next.startAt) >= now ? `다가오는 일정 · ${shortDate(next.startAt)}` : `마지막 일정 · ${shortDate(next.startAt)}`;
  return { label, events: sameDay };
}

function findConflict(events: CalendarItem[]): [CalendarItem, CalendarItem] | null {
  for (let i = 0; i < events.length; i += 1) for (let j = i + 1; j < events.length; j += 1) {
    if (Date.parse(events[i].startAt) < Date.parse(events[j].endAt) && Date.parse(events[i].endAt) > Date.parse(events[j].startAt)) return [events[i], events[j]];
  }
  return null;
}
