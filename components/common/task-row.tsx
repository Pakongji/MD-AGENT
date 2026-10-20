"use client";

import { Bot, Pencil } from "lucide-react";
import { Badge } from "@/components/common/ui";
import type { TaskItem } from "@/lib/types/domain";

const priorityLabel = { HIGH: "높음", MEDIUM: "중간", LOW: "낮음" };

export function TaskRow({ task, onToggle, onEdit }: { task: TaskItem; onToggle: () => void; onEdit?: () => void }) {
  const overdue = task.status !== "완료" && task.dueAt && new Date(task.dueAt) < new Date();
  const dueLabel = overdue ? `기한 지남 · ${new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(task.dueAt!))}` : task.dueLabel;
  return <div className={`task-row ${task.status === "완료" ? "is-done" : ""}`}>
    <input type="checkbox" checked={task.status === "완료"} onChange={onToggle} aria-label={`${task.title} 완료 상태`} />
    <div className="task-main"><strong>{task.title}</strong><div className="task-meta"><span>{task.category}</span><span>·</span><span className={overdue ? "red" : ""}>{dueLabel}</span>{task.aiExecutable && <><span>·</span><span className="ai-inline"><Bot size={12} /> AI 실행 가능</span></>}</div></div>
    <Badge tone={task.priority === "HIGH" ? "red" : task.priority === "MEDIUM" ? "orange" : "neutral"}>{priorityLabel[task.priority]}</Badge>
    {onEdit && <button className="icon-button" onClick={onEdit} aria-label={`${task.title} 수정`}><Pencil size={15} /></button>}
  </div>;
}
