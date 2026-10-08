"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bot, CalendarPlus, Check } from "lucide-react";
import { Badge, Button, Card, DataBoundary, Modal, SectionTitle } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import type { CalendarItem } from "@/lib/types/domain";

const week = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarPage() {
  const { data, command, busy } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<CalendarItem | null>(null);
  const [title, setTitle] = useState(""); const [eventType, setEventType] = useState("회의"); const [date, setDate] = useState("2026-10-15"); const [time, setTime] = useState("10:00"); const [description, setDescription] = useState("");
  const days = useMemo(() => Array.from({ length: 35 }, (_, index) => index - 3), []);
  const eventsForDay = (day: number) => data.calendarEvents.filter((event) => { const value = new Date(event.startAt); return value.getFullYear() === 2026 && value.getMonth() === 9 && value.getDate() === day; });
  const conflicts = data.calendarEvents.filter((event, index, all) => all.some((other, otherIndex) => index !== otherIndex && new Date(event.startAt) < new Date(other.endAt) && new Date(event.endAt) > new Date(other.startAt)));

  return <DataBoundary><div className="stack">
    <Card><div className="calendar-toolbar"><div><h2>2026년 10월</h2><p>프로모션·입고·발주·회의·마감·협업 요청 통합 일정</p></div><div className="actions"><div className="filters"><select aria-label="일정 유형"><option>전체 일정</option><option>프로모션</option><option>입고</option><option>마감</option></select></div><Button onClick={() => setAddOpen(true)}><CalendarPlus size={13} /> 일정 추가</Button></div></div></Card>
    {conflicts.length > 0 && <Card><div className="conflict-card"><AlertTriangle size={18} className="red" /><div><strong>10월 12일에 업무가 몰려 있습니다.</strong><p>립 기획전 시작과 상세페이지 최종 마감 시간이 겹칩니다. 담당자와 마감 시간을 조정하는 업무를 생성하세요.</p><div className="actions"><Button variant="danger" onClick={() => void command({ type: "ADD_TASK", title: "10/12 일정 충돌 조정: 기획전 시작·상세페이지 마감", category: "일정", priority: "HIGH", due: "오늘", reason: "캘린더 충돌 탐지에서 자동 제안" })}>일정 조정 업무 생성</Button></div></div></div></Card>}
    <Card><div className="calendar-grid">{week.map((day) => <div className="calendar-head" key={day}>{day}</div>)}{days.map((day, index) => <div className={`calendar-cell ${day < 1 || day > 31 ? "muted-cell" : ""}`} key={index}><span className="calendar-day">{day < 1 ? 30 + day : day > 31 ? day - 31 : day}</span>{day >= 1 && day <= 31 && eventsForDay(day).map((event) => <button className={`calendar-event ${event.type} ${event.status === "완료" ? "완료" : ""}`} key={event.id} onClick={() => setEdit(event)} title={event.title}>{event.title}</button>)}</div>)}</div></Card>
    <Card><SectionTitle title="AI 일정 정리" description="일정 밀집과 선행 마감을 실행 업무로 바꿉니다." action={<Badge tone="purple"><Bot size={11} /> AI</Badge>} /><div className="grid-3"><div className="diagnosis"><strong>10/12 일정 충돌</strong><p>프로모션 시작과 상세페이지 마감이 일부 겹칩니다.</p></div><div className="diagnosis"><strong>10/14 A 브랜드데이</strong><p>디자인 확정이 2일 전까지 필요합니다.</p></div><div className="diagnosis"><strong>10/17 C 세럼 입고</strong><p>입고 당일 검수와 재고 반영 일정을 추가하세요.</p></div></div></Card>
    <Modal open={addOpen} title="일정 추가" onClose={() => setAddOpen(false)} width="520px"><div className="field"><label>일정명</label><input value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="form-grid" style={{ marginTop: 12 }}><div className="field"><label>유형</label><select value={eventType} onChange={(event) => setEventType(event.target.value)}><option>회의</option><option>마감</option><option>프로모션</option><option>입고</option><option>발주</option><option>협업 요청</option></select></div><div className="field"><label>날짜</label><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="field span-2"><label>시작 시간</label><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div><div className="field span-2"><label>설명</label><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></div></div><div className="modal-actions"><Button variant="secondary" onClick={() => setAddOpen(false)}>취소</Button><Button disabled={!title || busy} onClick={async () => { const start = new Date(`${date}T${time}:00+09:00`); const end = new Date(start.getTime() + 3600000); if (await command({ type: "ADD_CALENDAR", title, eventType, startAt: start.toISOString(), endAt: end.toISOString(), description })) { setAddOpen(false); setTitle(""); } }}>저장</Button></div></Modal>
    <Modal open={Boolean(edit)} title="일정 상세" onClose={() => setEdit(null)} width="480px">{edit && <><Badge tone={edit.status === "완료" ? "green" : "blue"}>{edit.type} · {edit.status}</Badge><h2 style={{ margin: "10px 0 5px" }}>{edit.title}</h2><p>{new Date(edit.startAt).toLocaleString("ko-KR")} – {new Date(edit.endAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</p><p style={{ marginTop: 8 }}>{edit.description}</p><div className="modal-actions"><Button variant="secondary" onClick={() => setEdit(null)}>닫기</Button>{edit.status !== "완료" && <Button onClick={async () => { if (await command({ type: "COMPLETE_CALENDAR", id: edit.id })) setEdit(null); }}><Check size={13} /> 일정 완료</Button>}</div></>}</Modal>
  </div></DataBoundary>;
}
