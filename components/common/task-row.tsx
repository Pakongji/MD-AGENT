"use client";

import { Bot, Pencil } from "lucide-react";
import { Badge, Button } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { latestConfirmed, outcomeLabels } from "@/lib/decisions/shared";
import type { TaskItem } from "@/lib/types/domain";
import { dueDisplay } from "@/lib/utils/due";

const priorityLabel = { HIGH: "높음", MEDIUM: "중간", LOW: "낮음" };

export function TaskRow({ task, onToggle, onEdit }: { task: TaskItem; onToggle: () => void; onEdit?: () => void }) {
  const { openDecision, data } = useAppStore();
  const decision = latestConfirmed(task);
  const inventory = data.inventory.find((item) => item.id === task.inventoryId);
  const dueLabel = dueDisplay(task, new Date());
  const overdue = dueLabel.includes("기한 지남");
  return <div className={`task-row ${task.status === "완료" ? "is-done" : ""} ${task.requiresDecision ? "has-decision" : ""}`}>
    <input type="checkbox" checked={task.status === "완료"} onChange={onToggle} aria-label={`${task.title} 완료 상태`} />
    <div className="task-main">{task.requiresDecision ? <button className="task-title-button" onClick={() => openDecision({ taskId: task.id })}>{task.title}</button> : <strong>{task.title}</strong>}<div className="task-meta"><span>{task.category}</span><span>·</span><span className={overdue ? "red" : ""}>{dueLabel}</span>{task.aiExecutable && <><span>·</span><span className="ai-inline"><Bot size={12} /> AI 초안 가능</span></>}</div>{task.requiresDecision && <div className="task-decision-meta"><Badge tone={decision ? "green" : "purple"}>{decision ? `결정: ${outcomeLabels[decision.outcome]}` : task.status === "완료" ? "결정 기록 없음" : "의사결정 필요"}</Badge>{inventory && <Badge tone={inventory.orderStatus === "발주 완료" ? "green" : "neutral"}>실행: {inventory.orderStatus === "발주 완료" ? "발주 등록 완료" : inventory.orderStatus === "발주 결정 · 실행 대기" ? "발주 대기" : inventory.orderStatus}</Badge>}</div>}{decision && <p className="task-decision-summary" title={decision.content}>“{decision.content}” · {decision.authorName} · {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(decision.confirmedAt ?? decision.createdAt))}</p>}</div>
    <Badge tone={task.priority === "HIGH" ? "red" : task.priority === "MEDIUM" ? "orange" : "neutral"}>{priorityLabel[task.priority]}</Badge>
    {task.requiresDecision && <Button variant="secondary" className="task-decision-action" onClick={() => openDecision({ taskId: task.id })}>{decision ? "결정 기록 보기" : "검토하고 결정하기"}</Button>}
    {onEdit && <button className="icon-button" onClick={onEdit} aria-label={`${task.title} 수정`}><Pencil size={15} /></button>}
  </div>;
}
