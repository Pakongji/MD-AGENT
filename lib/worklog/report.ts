import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db/prisma";
import { kstDay, worklogPeriods, type WorklogRange } from "./period";
import { poStage } from "@/lib/orders/purchase-order";

type Snapshot = Prisma.JsonValue;
type Activity = { entity: string; entityId: string; action: string; occurredAt: Date; snapshot: Snapshot };

export type WorklogRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  completedAt: string;
  due: string;
  result: string;
  blocker: string;
  next: string;
  owner: string;
  source: string;
  href: string;
};

export type WorklogReport = {
  label: string;
  start: string;
  end: string;
  asOf: string;
  trackingSince: string;
  completed: number;
  pending: number;
  blockers: number;
  calendar: number;
  rows: WorklogRow[];
  followups: WorklogRow[];
  achievements: string[];
  blockerGroups: { name: string; count: number }[];
};

const key = (event: Activity) => event.entity + ":" + event.entityId;
const snapshot = (event: Activity) => (event.snapshot && typeof event.snapshot === "object" && !Array.isArray(event.snapshot) ? event.snapshot : {});
const field = (event: Activity, property: string) => {
  const v = snapshot(event)[property];
  return typeof v === "string" ? v : "";
};
const time = (value: string) => value ? Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + "Z") : NaN;
const format = (value: Date | number) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(value);
const fmtField = (event: Activity, property: string) => {
  const at = time(field(event, property));
  return Number.isFinite(at) ? format(at) : "";
};
const statusOf = (event: Activity) => field(event, event.entity === "Promotion" ? "stage" : "status");
const finished = (status: string) => ["완료", "입고 완료", "취소", "종료"].includes(status);
const links: Record<string, [string, string]> = {
  Task: ["업무", "/tasks"], CollaborationRequest: ["협업 요청", "/tasks?tab=collab"],
  CalendarEvent: ["캘린더", "/tasks?tab=calendar"], PurchaseOrder: ["발주·입고", "/sales?tab=inventory"],
  Promotion: ["프로모션", "/promotions"],
};

function indexChanges(events: Activity[]) {
  const indexed = new Map<string, Activity[]>();
  for (const event of events) {
    const id = key(event);
    const group = indexed.get(id) ?? [];
    group.push(event);
    indexed.set(id, group);
  }
  return indexed;
}

export function buildWorklog(range: WorklogRange, before: Activity[], events: Activity[], upcoming: Activity[], productNames: Map<string, string>, trackingSince?: Date): WorklogReport {
  const current = new Map(before.map(event => [key(event), event]));
  const transitions = new Map<string, Date>();
  const seen = indexChanges(events.filter(event => event.action !== "BASELINE"));
  for (const event of events) {
    const id = key(event);
    if (event.action === "DELETED") {
      current.delete(id);
      transitions.delete(id);
      continue;
    }
    const status = statusOf(event);
    const previous = current.get(id);
    if (event.action !== "BASELINE" && status === "완료" && (!previous || statusOf(previous) !== status)) {
      transitions.set(id, event.occurredAt);
    } else if (status !== "완료") {
      transitions.delete(id);
    }
    current.set(id, event);
  }

  const decisions = new Map<string, Activity>();
  for (const event of current.values()) {
    if (event.entity !== "TaskDecision" || statusOf(event) !== "CONFIRMED") continue;
    // 승인 대기·반려된 결정은 아직 효력이 없으므로 업무일지의 결정 결과로 쓰지 않습니다.
    if (!["NOT_REQUIRED", "APPROVED", undefined].includes(field(event, "approvalStatus") || undefined)) continue;
    const taskId = field(event, "taskId");
    const saved = decisions.get(taskId);
    if (!saved || time(field(event, "confirmedAt")) >= time(field(saved, "confirmedAt"))) decisions.set(taskId, event);
  }

  const orders = [...current.values()].filter(event => event.entity === "PurchaseOrder");
  const linkedCalendar = new Set<string>();
  const calendarRows = [...current.values()].filter(event => event.entity === "CalendarEvent");
  for (const event of calendarRows) {
    const sourceId = field(event, "sourceId");
    const type = field(event, "type");
    if (sourceId && (
      (type === "프로모션" && current.has("Promotion:" + sourceId))
      || (type === "의사결정" && current.has("TaskDecision:" + sourceId))
      || (type === "입고" && orders.some(order => field(order, "inventoryId") === sourceId
        && time(field(order, "expectedArrival")) === time(field(event, "startAt"))))
    )) linkedCalendar.add(event.entityId);
  }

  const rows: WorklogRow[] = [];
  const followups: WorklogRow[] = [];
  const inPeriod = (at: number) => at >= +range.start && at < +range.end;
  const activePeriod = +range.cutoff < +range.end;
  for (const event of current.values()) {
    const spec = links[event.entity];
    if (!spec) continue;
    const [source, href] = spec;
    const status = statusOf(event);
    const dateField = event.entity === "CalendarEvent" ? "startAt" : event.entity === "PurchaseOrder" ? "expectedArrival" : "dueAt";
    const dueAt = time(field(event, dateField));
    const due = fmtField(event, dateField);
    const taskDecision = event.entity === "Task" ? decisions.get(event.entityId) : undefined;
    const decisionInPeriod = taskDecision && inPeriod(time(field(taskDecision, "confirmedAt")));
    const isPending = !finished(status);
    const overdue = isPending && Number.isFinite(dueAt) && dueAt < +range.cutoff;
    const relatedChanges = seen.has(key(event)) || decisionInPeriod;
    const isCalendar = event.entity === "CalendarEvent";
    const include = relatedChanges || inPeriod(dueAt) || (isPending && (event.entity === "Task" || activePeriod || overdue) && !isCalendar);
    const completedAt = transitions.get(key(event));
    let blocker = "";
    let next = "";
    let result = "처리 내용 기록 없음";
    let title = field(event, "title") || field(event, "name");

    if (event.entity === "Task") {
      if (taskDecision) {
        const rationale = field(taskDecision, "rationale");
        result = [field(taskDecision, "content"), rationale].filter(Boolean).join(" · ") || result;
        if (isPending && field(taskDecision, "outcome") === "HOLD") {
          blocker = "결정 보류";
          next = field(taskDecision, "followUp") || "재검토 일정 확인";
        }
      }
      if (isPending && !next) next = "업무 상태와 다음 행동 확인";
    } else if (event.entity === "CollaborationRequest") {
      result = field(event, "deliverable") || field(event, "purpose") || result;
      if (isPending && status === "대기") blocker = "협업 응답 대기";
      if (isPending) next = "담당자에게 진행 상태 확인";
    } else if (event.entity === "PurchaseOrder") {
      const qty = snapshot(event).quantity;
      title = (productNames.get(field(event, "inventoryId")) || "상품") + " 발주";
      const linked = calendarRows.some(item => linkedCalendar.has(item.entityId)
        && field(item, "type") === "입고" && field(item, "sourceId") === field(event, "inventoryId")
        && time(field(item, "startAt")) === dueAt);
      result = (typeof qty === "number" ? qty.toLocaleString("ko-KR") + "개 발주 등록" : "발주 등록") + (linked ? " · 캘린더 입고 일정 연결" : "");
      if (overdue) blocker = "입고 확인 필요";
      if (isPending) next = "실제 입고 여부 확인";
      // 발주 등록만 하고 거래처에 보내지 않은 발주는 병목입니다.
      if (status === "발주 등록" || status === "발주 완료") { blocker = blocker || "발주서 미발송"; next = "거래처에 발주서 보내기"; }
      else if (status === "발주서 발송") { result += " · 발주서 발송"; next = "거래처 납기 회신 확인"; }
      else if (status === "납기 확정") result += " · 납기 확정";
    } else if (event.entity === "Promotion") {
      result = "기획 단계 · " + status;
      if (isPending) next = "현재 단계와 다음 마감 확인";
    } else if (isCalendar) {
      result = field(event, "description") || "일정 등록";
      if (isPending) next = "캘린더 일정 확인";
    }
    if (overdue && !blocker && !isCalendar) blocker = "마감 초과 · 원인 확인 필요";
    // 마감 전인 업무는 병목이 아닙니다. 보고서에서 "원인 기록 없음"으로 보이면 막힌 것처럼 읽히므로 진행 예정으로 표시합니다.
    if (isPending && !blocker && event.entity === "Task" && result === "처리 내용 기록 없음") result = dueAt ? "마감 전 · 진행 예정" : "마감일 없음 · 일정 확인 필요";

    const row = {
      id: key(event), type: source, title, status: event.entity === "PurchaseOrder" ? poStage(status) : status, completedAt: completedAt ? format(completedAt) : "",
      due, result, blocker, next, owner: field(event, "owner"), source: taskDecision ? source + " · 의사결정 기록" : source, href,
    };
    if (include && !(isCalendar && linkedCalendar.has(event.entityId))) rows.push(row);
    if (isPending && include && !isCalendar) followups.push(row);
  }
  for (const event of upcoming) {
    if (finished(statusOf(event))) continue;
    followups.push({
      id: "schedule:" + event.entityId, type: "캘린더 일정", title: field(event, "title"), status: statusOf(event),
      due: fmtField(event, "startAt"), completedAt: "", result: "", blocker: "", next: "캘린더 일정 확인",
      owner: "", source: "캘린더", href: "/tasks?tab=calendar",
    });
  }

  rows.sort((a, b) => Number(Boolean(b.completedAt)) - Number(Boolean(a.completedAt)) || b.completedAt.localeCompare(a.completedAt) || a.title.localeCompare(b.title, "ko"));
  followups.sort((a, b) => Number(Boolean(b.blocker && b.blocker !== "원인 기록 없음")) - Number(Boolean(a.blocker && a.blocker !== "원인 기록 없음")) || (a.due || "9999").localeCompare(b.due || "9999"));
  const pendingTasks = rows.filter(row => row.type === "업무" && !finished(row.status));
  const completedTasks = rows.filter(row => row.type === "업무" && row.completedAt);
  const groups = new Map<string, number>();
  for (const row of followups) {
    if (row.blocker && row.blocker !== "원인 기록 없음") groups.set(row.blocker, (groups.get(row.blocker) ?? 0) + 1);
  }
  const blockerGroups = [...groups].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return {
    label: worklogPeriods[range.period] + " 업무일지", start: range.startDay, end: range.endDay, asOf: format(range.cutoff),
    trackingSince: trackingSince ? kstDay(trackingSince) : "",
    completed: completedTasks.length, pending: pendingTasks.length, blockers: blockerGroups.reduce((count, group) => count + group.count, 0),
    calendar: calendarRows.filter(event => inPeriod(time(field(event, "startAt")))).length,
    rows, followups, achievements: completedTasks.slice(0, 5).map(row => row.title + " · " + row.result), blockerGroups,
  };
}

export async function getWorklog(range: WorklogRange) {
  const [before, events, inventories, first] = await prisma.$transaction([
    prisma.$queryRaw<Activity[]>`SELECT DISTINCT ON ("entity","entityId") "entity","entityId","action","occurredAt","snapshot"
      FROM "WorkActivity" WHERE "occurredAt" < ${range.start}
      ORDER BY "entity","entityId","occurredAt" DESC,"id" DESC`,
    prisma.workActivity.findMany({ where: { occurredAt: { gte: range.start, lt: range.cutoff } }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }),
    prisma.inventory.findMany({ select: { id: true, product: { select: { name: true } } } }),
    prisma.workActivity.findFirst({ orderBy: { occurredAt: "asc" }, select: { occurredAt: true } }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const previous = before.filter(event => event.action !== "DELETED");
  const calendar = new Map(previous.filter(event => event.entity === "CalendarEvent").map(event => [event.entityId, event]));
  for (const event of events) {
    if (event.entity !== "CalendarEvent") continue;
    if (event.action === "DELETED") calendar.delete(event.entityId);
    else calendar.set(event.entityId, event);
  }
  const horizon = +range.cutoff + 14 * 86_400_000;
  const upcoming = [...calendar.values()].filter(event => {
    const start = time(field(event, "startAt"));
    return start >= +range.cutoff && start < horizon;
  });
  return buildWorklog(range, previous, events, upcoming, new Map(inventories.map(i => [i.id, i.product.name])), first?.occurredAt);
}
