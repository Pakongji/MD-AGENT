"use client";

import { useMemo, useState } from "react";
import { Bot, CheckCircle2, ListChecks, Plus, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState, Modal, SectionTitle } from "@/components/common/ui";
import { TaskRow } from "@/components/common/task-row";
import { useAppStore } from "@/lib/store/app-store";
import type { TaskItem, TaskPlanResult } from "@/lib/types/domain";

export function TasksPage() {
  const { data, command, busy, showToast } = useAppStore();
  const [input, setInput] = useState("");
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<TaskPlanResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("전체");
  const [editTask, setEditTask] = useState<TaskItem | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState("일반");
  const visibleTasks = useMemo(() => data.tasks.filter((task) => filter === "전체" || task.status === filter), [data.tasks, filter]);

  async function makePlan() {
    if (input.trim().length < 3) { showToast("업무 내용을 3자 이상 입력해주세요.", "error"); return; }
    setPlanning(true); setPlan(null);
    const response = await fetch("/api/ai/task-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) });
    const payload = await response.json(); setPlanning(false);
    if (!response.ok) { showToast(payload.error, "error"); return; }
    setPlan(payload.result);
    setSelected(new Set(payload.result.goals.flatMap((goal: TaskPlanResult["goals"][number], goalIndex: number) => goal.tasks.map((_, taskIndex) => `${goalIndex}-${taskIndex}`))));
  }

  async function addSelected() {
    if (!plan) return;
    let added = 0;
    for (let goalIndex = 0; goalIndex < plan.goals.length; goalIndex += 1) {
      const goal = plan.goals[goalIndex];
      const tasks = goal.tasks.filter((_, taskIndex) => selected.has(`${goalIndex}-${taskIndex}`));
      if (tasks.length) { const ok = await command({ type: "ADD_TASKS", goal: goal.goal, goalReason: goal.reason, tasks }); if (ok) added += tasks.length; }
    }
    if (added) { setPlan(null); setInput(""); }
  }

  return <DataBoundary><div className="stack">
    <div className="grid-2">
      <Card className="planner-box">
        <SectionTitle title="해야 할 일을 편하게 적어주세요" description="AI가 업무 목적을 이해하고 준비·실행·후속 업무까지 제안합니다." action={<Badge tone="purple"><Sparkles size={11} /> AI 업무 플래너</Badge>} />
        <div className="field"><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="예: 오늘 오전 11시까지 디자인팀에 추석 프로모션 배너 시안을 넘기고, 오후 3시까지 이사님께 월 매출 보고자료를 드려야 해." aria-label="오늘 업무 입력" /></div>
        <div className="planner-note"><Bot size={15} /><span>문장을 쉼표로 나누지 않습니다. 목표와 실제 MD 워크플로를 해석해 빠뜨리기 쉬운 업무를 함께 제안합니다.</span></div>
        <div className="actions"><Button onClick={() => void makePlan()} disabled={planning}>{planning ? "업무 흐름 분석 중…" : "AI가 업무 계획 만들기"}</Button><Button variant="secondary" onClick={() => setManualOpen(true)}><Plus size={13} /> 직접 추가</Button></div>
      </Card>
      <Card>
        <SectionTitle title="AI가 만든 업무 계획" description="필요한 항목만 체크해 실제 오늘 업무에 추가하세요." />
        {!plan && !planning && <EmptyState title="아직 생성된 계획이 없습니다" description="왼쪽에 업무를 입력하면 선행·핵심·후속 단계로 확장합니다." />}
        {planning && <div className="state-box"><Bot className="purple" /><strong>업무 목적을 이해하고 있어요</strong><span>실제 완료까지 필요한 단계를 구성합니다.</span></div>}
        {plan && <div>
          <div className="plan-summary"><ListChecks size={18} /><span><strong>{plan.goals.length}개 목표</strong>에서 {plan.goals.reduce((sum, goal) => sum + goal.tasks.length, 0)}개 업무를 제안했습니다. 보라색 항목은 AI가 누락 방지를 위해 추가한 업무입니다.</span></div>
          {plan.goals.map((goal, goalIndex) => <div className="plan-group" key={goal.goal}>
            <div className="plan-group-header"><div><strong>{goalIndex + 1}. {goal.goal}</strong><p>{goal.reason}</p></div><Badge tone="purple">업무 묶음</Badge></div>
            {goal.tasks.map((task, taskIndex) => { const key = `${goalIndex}-${taskIndex}`; return <label className="plan-task" key={key}><input type="checkbox" checked={selected.has(key)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} /><div><strong>{task.title}</strong><p>{task.category} · {task.due} · {task.priority === "HIGH" ? "높음" : "중간"}{task.aiExecutable ? " · AI 실행 가능" : ""}</p><div className="reason-box">{task.reason}</div></div><Badge tone={task.source === "USER_INPUT" ? "blue" : "purple"}>{task.source === "USER_INPUT" ? "입력에서 파악" : "AI가 추가"}</Badge></label>; })}
          </div>)}
          <div className="modal-actions"><Button variant="secondary" onClick={() => { if (!plan) return; const core = new Set<string>(); plan.goals.forEach((goal, gi) => goal.tasks.forEach((task, ti) => { if (task.source === "USER_INPUT") core.add(`${gi}-${ti}`); })); setSelected(core); }}>핵심 업무만 선택</Button><Button onClick={() => void addSelected()} disabled={busy || selected.size === 0}><CheckCircle2 size={14} /> 선택한 업무 추가 ({selected.size})</Button></div>
        </div>}
      </Card>
    </div>
    <Card>
      <SectionTitle title="오늘의 업무" description={`전체 ${data.tasks.length}건`} action={<div className="filters"><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="업무 상태 필터"><option>전체</option><option>대기</option><option>진행중</option><option>완료</option></select></div>} />
      {visibleTasks.length ? visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void command({ type: "TOGGLE_TASK", id: task.id })} onEdit={() => setEditTask(task)} />) : <EmptyState title="조건에 맞는 업무가 없습니다" description="필터를 바꾸거나 새 업무를 추가해보세요." />}
    </Card>
    <Modal open={Boolean(editTask)} title="업무 수정" onClose={() => setEditTask(null)} width="500px">{editTask && <TaskEditForm task={editTask} onCancel={() => setEditTask(null)} onSave={async (value) => { if (await command({ type: "UPDATE_TASK", id: editTask.id, ...value })) setEditTask(null); }} />}</Modal>
    <Modal open={manualOpen} title="업무 직접 추가" onClose={() => setManualOpen(false)} width="500px"><div className="field"><label>업무명</label><input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} /></div><div className="field" style={{ marginTop: 12 }}><label>카테고리</label><select value={manualCategory} onChange={(event) => setManualCategory(event.target.value)}><option>일반</option><option>재고/발주</option><option>프로모션</option><option>경쟁사</option><option>협업 요청</option><option>성과</option></select></div><div className="modal-actions"><Button variant="secondary" onClick={() => setManualOpen(false)}>취소</Button><Button disabled={!manualTitle.trim() || busy} onClick={async () => { if (await command({ type: "ADD_TASK", title: manualTitle, category: manualCategory, priority: "MEDIUM", due: "오늘", reason: "사용자가 직접 추가" })) { setManualOpen(false); setManualTitle(""); } }}>추가</Button></div></Modal>
  </div></DataBoundary>;
}

function TaskEditForm({ task, onCancel, onSave }: { task: TaskItem; onCancel: () => void; onSave: (value: { title: string; status: TaskItem["status"]; priority: TaskItem["priority"] }) => Promise<void> }) {
  const [title, setTitle] = useState(task.title); const [status, setStatus] = useState(task.status); const [priority, setPriority] = useState(task.priority);
  return <><div className="field"><label>업무명</label><input value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="form-grid" style={{ marginTop: 12 }}><div className="field"><label>상태</label><select value={status} onChange={(event) => setStatus(event.target.value as TaskItem["status"])}><option>대기</option><option>진행중</option><option>완료</option></select></div><div className="field"><label>우선순위</label><select value={priority} onChange={(event) => setPriority(event.target.value as TaskItem["priority"])}><option value="HIGH">높음</option><option value="MEDIUM">중간</option><option value="LOW">낮음</option></select></div></div><div className="modal-actions"><Button variant="secondary" onClick={onCancel}>취소</Button><Button disabled={!title.trim()} onClick={() => void onSave({ title, status, priority })}>저장</Button></div></>;
}
