"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bot, CalendarPlus, Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState, Modal, SectionTitle } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import type { CalendarItem } from "@/lib/types/domain";

const week = ["일", "월", "화", "수", "목", "금", "토"];
const statuses = ["예정", "진행", "완료"] as const;

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return { key: dateKey(value), value, inMonth: value.getMonth() === month };
  });
}

export function CalendarPage({ initialMonth }: { initialMonth?: string }) {
  const { data, command, busy } = useAppStore();
  const initial = useMemo(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) {
      const [year, month] = initialMonth.split("-").map(Number);
      if (month >= 1 && month <= 12) return new Date(year, month - 1, 1);
    }
    return new Date();
  }, [initialMonth]);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [typeFilter, setTypeFilter] = useState("전체 일정");
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<CalendarItem | null>(null);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("회의");
  const [date, setDate] = useState(dateKey(initial));
  const [time, setTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("10:00");
  const [editStatus, setEditStatus] = useState<(typeof statuses)[number]>("예정");

  const cells = useMemo(() => monthCells(viewYear, viewMonth), [viewMonth, viewYear]);
  const filteredEvents = useMemo(() => data.calendarEvents.filter((event) => typeFilter === "전체 일정" || event.type === typeFilter), [data.calendarEvents, typeFilter]);
  const displayedEvents = filteredEvents.filter((event) => { const value = new Date(event.startAt); return value.getFullYear() === viewYear && value.getMonth() === viewMonth; });
  const eventTypes = [...new Set(data.calendarEvents.map((event) => event.type))];
  const conflictPairs = useMemo(() => {
    const pairs: Array<[CalendarItem, CalendarItem]> = [];
    data.calendarEvents.forEach((event, index) => data.calendarEvents.slice(index + 1).forEach((other) => {
      if (event.status !== "완료" && other.status !== "완료" && new Date(event.startAt) < new Date(other.endAt) && new Date(event.endAt) > new Date(other.startAt)) pairs.push([event, other]);
    }));
    return pairs;
  }, [data.calendarEvents]);
  const conflict = conflictPairs.find(([event]) => { const value = new Date(event.startAt); return value.getFullYear() === viewYear && value.getMonth() === viewMonth; });

  function moveMonth(amount: number) {
    const next = new Date(viewYear, viewMonth + amount, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function openEdit(event: CalendarItem) {
    const start = new Date(event.startAt); const end = new Date(event.endAt);
    setEdit(event); setEditTitle(event.title); setEditDate(dateKey(start));
    setEditStart(start.toTimeString().slice(0, 5)); setEditEnd(end.toTimeString().slice(0, 5));
    setEditStatus(statuses.includes(event.status as (typeof statuses)[number]) ? event.status as (typeof statuses)[number] : "예정");
  }

  return <DataBoundary><div className="stack">
    <Card><div className="calendar-toolbar"><div><div className="actions"><button className="icon-button" onClick={() => moveMonth(-1)} aria-label="이전 달"><ChevronLeft size={17} /></button><h2>{viewYear}년 {viewMonth + 1}월</h2><button className="icon-button" onClick={() => moveMonth(1)} aria-label="다음 달"><ChevronRight size={17} /></button></div><p>프로모션·입고·발주·회의·마감·협업 요청 통합 일정</p></div><div className="actions"><div className="filters"><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="일정 유형"><option>전체 일정</option>{eventTypes.map((type) => <option key={type}>{type}</option>)}</select></div><Button onClick={() => { setDate(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`); setAddOpen(true); }}><CalendarPlus size={13} /> 일정 추가</Button></div></div></Card>
    {conflict && <Card><div className="conflict-card"><AlertTriangle size={18} className="red" /><div><strong>{new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(conflict[0].startAt))}에 업무가 겹칩니다.</strong><p>{conflict[0].title}과 {conflict[1].title} 시간이 겹칩니다. 담당자와 마감 시간을 조정하는 업무를 생성하세요.</p><div className="actions"><Button variant="danger" onClick={() => void command({ type: "ADD_TASK", title: `${new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(conflict[0].startAt))} 일정 충돌 조정: ${conflict[0].title}·${conflict[1].title}`, category: "일정", priority: "HIGH", due: "오늘", reason: "캘린더 충돌 탐지에서 자동 제안" })}>일정 조정 업무 생성</Button></div></div></div></Card>}
    <Card><div className="calendar-grid">{week.map((day) => <div className="calendar-head" key={day}>{day}</div>)}{cells.map((cell) => <div className={`calendar-cell ${cell.inMonth ? "" : "muted-cell"}`} key={cell.key}><span className="calendar-day">{cell.value.getDate()}</span>{filteredEvents.filter((event) => dateKey(new Date(event.startAt)) === cell.key).map((event) => <button className={`calendar-event ${event.type} ${event.status === "완료" ? "완료" : ""}`} key={event.id} onClick={() => openEdit(event)} title={`${event.title} · ${event.status}`}>{event.title}</button>)}</div>)}</div></Card>
    <Card><SectionTitle title="AI 일정 정리" description={`${viewMonth + 1}월 일정의 충돌과 실행 준비를 요약합니다.`} action={<Badge tone="purple"><Bot size={11} /> AI</Badge>} />{displayedEvents.length ? <div className="grid-3">{displayedEvents.slice(0, 3).map((event) => <div className="diagnosis" key={event.id}><strong>{new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(event.startAt))} {event.title}</strong><p>{event.description || `${event.type} 일정입니다.`} · 현재 {event.status}</p></div>)}</div> : <EmptyState title="이 달에는 표시할 일정이 없습니다" description="일정을 추가하거나 다른 달로 이동해 확인하세요." />}</Card>
    <Modal open={addOpen} title="일정 추가" onClose={() => setAddOpen(false)} width="520px"><div className="field"><label htmlFor="calendar-title">일정명</label><input id="calendar-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="form-grid" style={{ marginTop: 12 }}><div className="field"><label htmlFor="calendar-type">유형</label><select id="calendar-type" value={eventType} onChange={(event) => setEventType(event.target.value)}><option>회의</option><option>마감</option><option>프로모션</option><option>입고</option><option>발주</option><option>협업 요청</option></select></div><div className="field"><label htmlFor="calendar-date">날짜</label><input id="calendar-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="field span-2"><label htmlFor="calendar-time">시작 시간</label><input id="calendar-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div><div className="field span-2"><label htmlFor="calendar-description">설명</label><textarea id="calendar-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div></div><div className="modal-actions"><Button variant="secondary" onClick={() => setAddOpen(false)}>취소</Button><Button disabled={!title || busy} onClick={async () => { const start = new Date(`${date}T${time}:00+09:00`); const end = new Date(start.getTime() + 3600000); if (await command({ type: "ADD_CALENDAR", title, eventType, startAt: start.toISOString(), endAt: end.toISOString(), description })) { setAddOpen(false); setTitle(""); } }}>저장</Button></div></Modal>
    <Modal open={Boolean(edit)} title="일정 수정" onClose={() => setEdit(null)} width="520px">{edit && <><div className="field"><label htmlFor="edit-calendar-title">일정명</label><input id="edit-calendar-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></div><div className="form-grid" style={{ marginTop: 12 }}><div className="field"><label htmlFor="edit-calendar-date">날짜</label><input id="edit-calendar-date" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} /></div><div className="field"><label htmlFor="edit-calendar-status">상태</label><select id="edit-calendar-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value as (typeof statuses)[number])}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div className="field"><label htmlFor="edit-calendar-start">시작</label><input id="edit-calendar-start" type="time" value={editStart} onChange={(event) => setEditStart(event.target.value)} /></div><div className="field"><label htmlFor="edit-calendar-end">종료</label><input id="edit-calendar-end" type="time" value={editEnd} onChange={(event) => setEditEnd(event.target.value)} /></div></div><p style={{ marginTop: 10 }}>{edit.description}</p><div className="modal-actions"><Button variant="secondary" onClick={() => setEdit(null)}>취소</Button>{editStatus !== "완료" && <Button variant="secondary" onClick={() => setEditStatus("완료")}><Check size={13} /> 완료로 표시</Button>}<Button disabled={!editTitle || busy} onClick={async () => { const start = new Date(`${editDate}T${editStart}:00+09:00`); let end = new Date(`${editDate}T${editEnd}:00+09:00`); if (end <= start) end = new Date(start.getTime() + 3600000); if (await command({ type: "UPDATE_CALENDAR", id: edit.id, title: editTitle, startAt: start.toISOString(), endAt: end.toISOString(), status: editStatus })) setEdit(null); }}><Save size={13} /> 변경 저장</Button></div></>}</Modal>
  </div></DataBoundary>;
}
