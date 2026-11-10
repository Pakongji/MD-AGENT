"use client";

import { useState } from "react";
import { Bot, Pencil } from "lucide-react";
import { Badge, Button } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { lastRejected, latestConfirmed, outcomeLabels, pendingApproval } from "@/lib/decisions/shared";
import { hasPermission } from "@/lib/auth/permissions";
import type { TaskItem } from "@/lib/types/domain";
import { dueDisplay } from "@/lib/utils/due";

const priorityLabel = { HIGH: "높음", MEDIUM: "중간", LOW: "낮음" };
const shortTime = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

/** 담당자 칩: 누르면 맡길 사람을 고르는 목록으로 바뀝니다. */
function AssigneeChip({ task }: { task: TaskItem }) {
  const { data, command, busy } = useAppStore();
  const [editing, setEditing] = useState(false);
  const assignee = data.members.find((member) => member.id === task.assigneeId);
  const canAssign = hasPermission(data.meta.viewer, "task");
  if (editing) {
    return <select className="task-assignee-select" autoFocus defaultValue={task.assigneeId ?? ""} disabled={busy} aria-label={`${task.title} 담당자`}
      onBlur={() => setEditing(false)}
      onChange={async (event) => { setEditing(false); await command({ type: "ASSIGN_TASK", id: task.id, assigneeId: event.target.value || null }); }}>
      <option value="">담당자 없음</option>
      {data.members.filter((member) => member.active || member.id === task.assigneeId).map((member) => <option key={member.id} value={member.id}>{member.name}{member.id === data.meta.viewerId ? " (나)" : ""}</option>)}
    </select>;
  }
  return <button type="button" className={`task-assignee${assignee ? "" : " is-empty"}`} disabled={!canAssign} onClick={() => setEditing(true)} title={canAssign ? "담당자 바꾸기" : "업무 권한이 있어야 바꿀 수 있어요"}>
    {assignee ? <><span className="task-assignee-avatar">{assignee.name.replace(/^\[[^\]]*\]\s*/, "").slice(0, 1) || "?"}</span>{assignee.id === data.meta.viewerId ? "나" : assignee.name}</> : "담당자 없음"}
  </button>;
}

export function TaskRow({ task, onToggle, onEdit }: { task: TaskItem; onToggle: () => void; onEdit?: () => void }) {
  const { openDecision, data } = useAppStore();
  const decision = latestConfirmed(task);
  const pending = pendingApproval(task);
  const rejected = !decision && !pending ? lastRejected(task) : undefined;
  const inventory = data.inventory.find((item) => item.id === task.inventoryId);
  const dueLabel = dueDisplay(task, new Date());
  const overdue = dueLabel.includes("기한 지남");
  const canApprove = hasPermission(data.meta.viewer, "approve");
  const reviewMine = pending && canApprove && pending.authorId !== data.meta.viewerId;

  const decisionBadge = pending ? <Badge tone="orange">승인 대기 · {pending.authorName}</Badge>
    : rejected ? <Badge tone="red">반려됨</Badge>
      : <Badge tone={decision ? "green" : "purple"}>{decision ? `결정: ${outcomeLabels[decision.outcome]}` : task.status === "완료" ? "결정 기록 없음" : "의사결정 필요"}</Badge>;
  const actionLabel = reviewMine ? "승인 검토하기" : pending ? "승인 요청 보기" : rejected ? "반려 사유 보고 다시 결정" : decision ? "결정 기록 보기" : "검토하고 결정하기";

  return <div className={`task-row ${task.status === "완료" ? "is-done" : ""} ${task.requiresDecision ? "has-decision" : ""}`}>
    <input type="checkbox" checked={task.status === "완료"} onChange={onToggle} aria-label={`${task.title} 완료 상태`} />
    <div className="task-main">{task.requiresDecision ? <button className="task-title-button" onClick={() => openDecision({ taskId: task.id })}>{task.title}</button> : <strong>{task.title}</strong>}
      <div className="task-meta"><AssigneeChip task={task} /><span>{task.category}</span><span>·</span><span className={overdue ? "red" : ""}>{dueLabel}</span>{task.aiExecutable && <><span>·</span><span className="ai-inline"><Bot size={12} /> AI 초안 가능</span></>}</div>
      {task.requiresDecision && <div className="task-decision-meta">{decisionBadge}{inventory && <Badge tone={inventory.orderStatus === "발주 완료" ? "green" : "neutral"}>실행: {inventory.orderStatus === "발주 완료" ? "발주 등록 완료" : inventory.orderStatus === "발주 결정 · 실행 대기" ? "발주 대기" : inventory.orderStatus}</Badge>}</div>}
      {decision && <p className="task-decision-summary" title={decision.content}>“{decision.content}” · {decision.authorName} · {shortTime(decision.confirmedAt ?? decision.createdAt)}{decision.approvalStatus === "APPROVED" && decision.approverName ? ` · 승인 ${decision.approverName}` : ""}</p>}
      {pending && <p className="task-decision-summary" title={pending.content}>승인 요청: “{pending.content}”</p>}
      {rejected && <p className="task-decision-summary red" title={rejected.approvalComment}>반려 사유({rejected.approverName}): {rejected.approvalComment}</p>}
    </div>
    <Badge tone={task.priority === "HIGH" ? "red" : task.priority === "MEDIUM" ? "orange" : "neutral"}>{priorityLabel[task.priority]}</Badge>
    {task.requiresDecision && <Button variant={reviewMine ? "primary" : "secondary"} className="task-decision-action" onClick={() => openDecision({ taskId: task.id })}>{actionLabel}</Button>}
    {onEdit && <button className="icon-button" onClick={onEdit} aria-label={`${task.title} 수정`}><Pencil size={15} /></button>}
  </div>;
}
