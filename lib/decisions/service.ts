import type { Prisma, PrismaClient } from "@/generated/prisma";
import type { Command } from "@/lib/validation/commands";
import { outcomeLabels, validateDecision } from "./shared";

export class DecisionError extends Error {
  constructor(message: string, public status = 409, public taskId?: string) { super(message); }
}

/** 효력 있는 결정(승인 불필요 또는 승인됨)만 고르는 조건 */
const EFFECTIVE = { status: "CONFIRMED", approvalStatus: { in: ["NOT_REQUIRED", "APPROVED"] } };

export async function inventoryForTitle(db: Prisma.TransactionClient, title: string) {
  const inventories = await db.inventory.findMany({ include: { product: { select: { name: true } } } });
  return inventories.sort((a, b) => b.product.name.length - a.product.name.length)
    .find((item) => title.includes(item.product.name))?.id ?? null;
}

export async function requireTaskDecision(db: Prisma.TransactionClient, taskId: string, required?: boolean) {
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId }, include: { decisions: { where: EFFECTIVE, orderBy: { confirmedAt: "desc" }, take: 1 } } });
  if ((task.requiresDecision || required) && (!task.decisions.length || task.decisions[0].outcome === "HOLD")) {
    throw new DecisionError("완료 전에 결정 내용과 판단 근거를 기록해주세요.", 409, taskId);
  }
  return task;
}

type SaveDecision = Extract<Command, { type: "SAVE_DECISION" }>;
type Actor = { id: string; name: string; permissions?: string[] };
type Tx = Prisma.TransactionClient;

export async function saveDecision(db: PrismaClient, input: SaveDecision, actor: Actor) {
  return db.$transaction(async (tx) => {
    if (!input.taskId && !input.inventoryId) throw new DecisionError("연결할 업무나 상품을 선택해주세요.", 400);
    let taskId = input.taskId;
    if (!taskId) {
      const inventory = await tx.inventory.findUniqueOrThrow({ where: { id: input.inventoryId! }, include: { product: true } });
      const task = await tx.task.findFirst({ where: { inventoryId: inventory.id, requiresDecision: true }, orderBy: { createdAt: "desc" } })
        ?? await tx.task.create({ data: { title: `${inventory.product.name} 발주 여부 결정`, category: "재고/발주", priority: "HIGH", dueLabel: "오늘", requiresDecision: true, inventoryId: inventory.id, reason: "발주 검토에서 생성한 의사결정 업무" } });
      taskId = task.id;
    }
    const task = await tx.task.update({ where: { id: taskId }, data: { requiresDecision: true }, include: { inventory: { include: { product: true } } } });
    if (input.inventoryId && task.inventoryId !== input.inventoryId) throw new DecisionError("업무와 상품의 연결이 일치하지 않습니다.", 400);
    const existing = await tx.taskDecision.findUnique({ where: { id: input.id } });
    if (existing && (existing.taskId !== task.id || existing.authorId !== actor.id)) throw new DecisionError("다른 사용자의 초안은 수정할 수 없습니다.", 403);
    if (existing?.status === "CONFIRMED") return "이미 확정된 결정입니다. 변경하려면 새 결정을 작성해주세요.";
    if (input.status === "CONFIRMED") {
      const validation = validateDecision(input, Boolean(task.inventoryId));
      if (validation) throw new DecisionError(validation, 400);
      if (task.inventory?.orderStatus === "발주 완료") throw new DecisionError("이미 발주된 상품입니다. 기존 발주와 입고 상태를 확인해주세요.");
      const pending = await tx.taskDecision.findFirst({ where: { taskId: task.id, status: "CONFIRMED", approvalStatus: "PENDING", id: { not: input.id } } });
      if (pending) throw new DecisionError(`이미 승인 대기 중인 결정이 있습니다(${pending.authorName}). 승인·반려 후에 새로 확정할 수 있어요.`);
    }
    // 승인 권한이 없는 사람이 확정하면 승인 요청으로 올라갑니다. 승인할 사람이 아무도 없으면 바로 확정합니다.
    const needsApproval = input.status === "CONFIRMED" && !actor.permissions?.includes("approve")
      && await tx.account.count({ where: { id: { not: actor.id }, active: true, permissions: { has: "approve" } } }) > 0;
    const inventory = task.inventory;
    const evidence = {
      capturedAt: new Date().toISOString(), taskTitle: task.title, taskReason: task.reason,
      ...(inventory ? { inventory: { id: inventory.id, productName: inventory.product.name, stockQty: inventory.stockQty, dailySales: inventory.dailySales, stockDays: inventory.stockDays, leadTimeDays: inventory.leadTimeDays, safetyStock: inventory.safetyStock, recommendedOrderQty: inventory.recommendedOrderQty } } : {}),
    };
    const record = await tx.taskDecision.upsert({ where: { id: input.id },
      create: { id: input.id, taskId: task.id, authorId: actor.id, authorName: actor.name, status: input.status, approvalStatus: needsApproval ? "PENDING" : "NOT_REQUIRED", outcome: input.outcome, content: input.content, rationale: input.rationale, alternatives: input.alternatives, followUp: input.followUp, reviewAt: input.reviewAt ? new Date(input.reviewAt) : null, quantity: input.quantity ?? null, evidence, confirmedAt: input.status === "CONFIRMED" ? new Date() : null },
      update: { status: input.status, approvalStatus: needsApproval ? "PENDING" : "NOT_REQUIRED", outcome: input.outcome, content: input.content, rationale: input.rationale, alternatives: input.alternatives, followUp: input.followUp, reviewAt: input.reviewAt ? new Date(input.reviewAt) : null, quantity: input.quantity ?? null, evidence, confirmedAt: input.status === "CONFIRMED" ? new Date() : null },
    });
    if (input.status === "DRAFT") return "결정 초안을 저장했습니다. 업무 상태는 변경하지 않았습니다.";

    if (needsApproval) {
      await tx.task.update({ where: { id: task.id }, data: { status: "진행중" } });
      if (inventory) await tx.inventory.update({ where: { id: inventory.id }, data: { orderStatus: "결정 승인 대기" } });
      return `“${task.title}” 결정을 팀장 승인 요청으로 올렸습니다. 승인되면 업무가 완료되고${inventory && input.outcome === "PROCEED" ? " 발주를 등록할 수 있어요" : " 결정이 기록돼요"}.`;
    }
    return applyDecisionEffects(tx, task.id, record.id, actor.name);
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
}

/** 결정이 효력을 갖게 될 때(바로 확정 또는 승인) 업무·재고·지식 문서·후속 업무·재검토 일정을 반영합니다. */
async function applyDecisionEffects(tx: Tx, taskId: string, decisionId: string, deciderName: string, approval?: { name: string; at: Date; comment: string }) {
  const task = await tx.task.findUniqueOrThrow({ where: { id: taskId }, include: { inventory: { include: { product: true } } } });
  const record = await tx.taskDecision.findUniqueOrThrow({ where: { id: decisionId } });
  const inventory = task.inventory;
  const input = { outcome: record.outcome as "PROCEED" | "HOLD" | "DECLINE" };
  await tx.task.update({ where: { id: task.id }, data: { status: input.outcome === "HOLD" ? "진행중" : "완료", ...(input.outcome === "HOLD" ? { dueAt: record.reviewAt, dueLabel: "결정 재검토" } : {}) } });
  if (inventory) await tx.inventory.update({ where: { id: inventory.id }, data: { orderStatus: input.outcome === "PROCEED" ? "발주 결정 · 실행 대기" : input.outcome === "HOLD" ? "보류" : "발주하지 않음" } });
  const previousReviews = await tx.taskDecision.findMany({ where: { taskId: task.id, id: { not: record.id }, ...EFFECTIVE, outcome: "HOLD" }, select: { id: true } });
  if (previousReviews.length) await tx.calendarEvent.updateMany({ where: { sourceId: { in: previousReviews.map((item) => item.id) }, status: "예정" }, data: { status: "완료" } });
  const evidenceText = inventory ? `재고 ${inventory.stockQty}개 · 일평균 판매 ${inventory.dailySales}개 · 재고 ${inventory.stockDays}일 · 리드타임 ${inventory.leadTimeDays}일 · 안전재고 ${inventory.safetyStock}개` : task.reason || "관련 업무 정보를 확인했습니다.";
  const when = (date: Date) => date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  await tx.knowledgeDocument.create({ data: {
    title: `${task.title} · ${outcomeLabels[input.outcome]}`, type: "의사결정", source: `task-decision:${record.id}`, tags: `의사결정,${task.category}`,
    content: [`결정: ${record.content}`, `판단 근거: ${record.rationale}`, `검토 대안: ${record.alternatives || "별도 기록 없음"}`, `결정자: ${deciderName}`, `결정 시점: ${when(record.confirmedAt ?? new Date())}`, ...(approval ? [`승인: ${approval.name} · ${when(approval.at)}${approval.comment ? ` · ${approval.comment}` : ""}`] : []), `검토 자료: ${evidenceText}`, ...(record.quantity && inventory ? [`발주 결정 수량: ${record.quantity}개`] : []), ...(record.followUp ? [`후속 업무: ${record.followUp}`] : []), ...(record.reviewAt ? [`재검토: ${when(record.reviewAt)}`] : [])].join("\n"),
  } });
  if (record.followUp) await tx.task.create({ data: { title: record.followUp.slice(0, 200), description: `“${task.title}” 결정의 후속 업무\n${record.followUp}`, category: task.category, priority: task.priority, dueAt: record.reviewAt, dueLabel: record.reviewAt ? "재검토 후속 업무" : "일정 확인 필요", source: "SYSTEM_SIGNAL", reason: `“${task.title}”의 결정에 따른 후속 업무`, assigneeId: task.assigneeId ?? record.authorId } });
  if (record.reviewAt && input.outcome === "HOLD") await tx.calendarEvent.create({ data: { title: `${task.title} 재검토`, type: "의사결정", startAt: record.reviewAt, endAt: new Date(record.reviewAt.getTime() + 1800000), description: record.rationale, sourceId: record.id } });
  const prefix = approval ? `승인했습니다. ` : "";
  return input.outcome === "HOLD"
    ? `${prefix}“${task.title}” 보류를 확정했습니다. 업무는 진행중으로 남고, 기록 > 결정 기록에서 볼 수 있어요.`
    : `${prefix}“${task.title}” 결정을 확정하고 업무를 완료했습니다. 기록 > 결정 기록에서 볼 수 있어요.`;
}

async function loadPending(tx: Tx, decisionId: string, approver: Actor) {
  const record = await tx.taskDecision.findUnique({ where: { id: decisionId } });
  if (!record || record.status !== "CONFIRMED") throw new DecisionError("승인할 결정을 찾지 못했습니다. 화면을 새로고침해주세요.", 404);
  if (record.approvalStatus !== "PENDING") throw new DecisionError(record.approvalStatus === "APPROVED" ? "이미 승인된 결정입니다." : record.approvalStatus === "REJECTED" ? "이미 반려된 결정입니다." : "승인 요청이 아닌 결정입니다.");
  if (record.authorId === approver.id) throw new DecisionError("내가 올린 결정은 다른 승인권자가 승인해야 합니다.", 403);
  return record;
}

/** 팀장 승인: 결정에 효력을 주고(업무 완료·발주 가능 등) 승인자를 기록합니다. */
export async function approveDecision(db: PrismaClient, command: Extract<Command, { type: "APPROVE_DECISION" }>, approver: Actor) {
  return db.$transaction(async (tx) => {
    const record = await loadPending(tx, command.decisionId, approver);
    const at = new Date();
    await tx.taskDecision.update({ where: { id: record.id }, data: { approvalStatus: "APPROVED", approverId: approver.id, approverName: approver.name, approvalComment: command.comment?.trim() ?? "", approvalAt: at } });
    return applyDecisionEffects(tx, record.taskId, record.id, record.authorName, { name: approver.name, at, comment: command.comment?.trim() ?? "" });
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
}

/** 팀장 반려: 사유를 남기고 업무를 다시 '결정 필요'로 돌립니다. 요청자는 사유를 보고 새 결정을 작성합니다. */
export async function rejectDecision(db: PrismaClient, command: Extract<Command, { type: "REJECT_DECISION" }>, approver: Actor) {
  return db.$transaction(async (tx) => {
    const record = await loadPending(tx, command.decisionId, approver);
    await tx.taskDecision.update({ where: { id: record.id }, data: { approvalStatus: "REJECTED", approverId: approver.id, approverName: approver.name, approvalComment: command.comment.trim(), approvalAt: new Date() } });
    const task = await tx.task.update({ where: { id: record.taskId }, data: { status: "대기" }, include: { inventory: true } });
    if (task.inventory && task.inventory.orderStatus === "결정 승인 대기") await tx.inventory.update({ where: { id: task.inventory.id }, data: { orderStatus: "미발주" } });
    return `“${task.title}” 결정을 반려했습니다. ${record.authorName}님이 사유를 보고 다시 결정합니다.`;
  });
}

export async function registerDecisionOrder(db: PrismaClient, command: Extract<Command, { type: "CREATE_ORDER" }>, startAt: Date) {
      if (!command.decisionId) throw new DecisionError("발주 전에 결정 내용과 판단 근거를 확정해주세요.");
      return db.$transaction(async (tx) => {
        const inventory = await tx.inventory.findUniqueOrThrow({ where: { id: command.inventoryId }, include: { product: true } });
        const decision = await tx.taskDecision.findUnique({ where: { id: command.decisionId }, include: { task: true } });
        const latest = await tx.taskDecision.findFirst({ where: { ...EFFECTIVE, task: { inventoryId: inventory.id } }, orderBy: { confirmedAt: "desc" } });
        if (decision?.approvalStatus === "PENDING") throw new DecisionError("팀장 승인 후에 발주를 등록할 수 있어요.");
        if (!decision || decision.status !== "CONFIRMED" || !["NOT_REQUIRED", "APPROVED"].includes(decision.approvalStatus) || decision.outcome !== "PROCEED" || decision.task.inventoryId !== inventory.id || decision.quantity !== command.quantity || latest?.id !== decision.id) {
          throw new DecisionError("현재 상품과 수량에 맞는 최신 발주 결정을 먼저 확정해주세요.");
        }
        const existing = await tx.purchaseOrder.findFirst({ where: { inventoryId: inventory.id, status: { not: "취소" } } });
        if (existing) return `${inventory.product.name}은(는) 이미 발주 등록되었습니다.`;
        // 공급사와 합의한 납기(긴급 입고 등)가 있으면 그 날짜 09:00(KST), 없으면 리드타임 기준입니다.
        const agreed = command.expectedArrival ? new Date(`${command.expectedArrival}T09:00:00+09:00`) : null;
        if (agreed && (!Number.isFinite(agreed.getTime()) || agreed.getTime() < startAt.getTime() - 86400000 || agreed.getTime() > startAt.getTime() + 365 * 86400000)) {
          throw new DecisionError("입고 예정일은 오늘 이후 1년 안의 날짜로 입력해주세요.");
        }
        const expectedArrival = agreed ?? new Date(startAt.getTime() + inventory.leadTimeDays * 86400000);
        await tx.inventory.update({ where: { id: inventory.id }, data: { orderStatus: "발주 완료", recommendedOrderQty: command.quantity } });
        await tx.purchaseOrder.create({ data: { inventoryId: inventory.id, quantity: command.quantity, status: "발주 등록", expectedArrival } });
        await tx.task.create({ data: { title: `${inventory.product.name} ${command.quantity.toLocaleString()}개 입고 추적`, category: "재고/발주", priority: "HIGH", dueAt: expectedArrival, dueLabel: `입고 예정 ${expectedArrival.toLocaleDateString("ko-KR")}`, source: "SYSTEM_SIGNAL", reason: "발주 등록 후 실제 입고까지 추적하기 위해 생성했습니다." } });
        await tx.calendarEvent.create({ data: { title: `${inventory.product.name} ${command.quantity.toLocaleString()}개 입고 예정`, type: "입고", startAt: expectedArrival, endAt: new Date(expectedArrival.getTime() + 3600000), sourceId: inventory.id, description: `“${decision.task.title}”에 따라 등록한 발주 · ${command.quantity.toLocaleString()}개 (${decision.authorName} · ${decision.confirmedAt?.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) ?? "날짜 미상"} 결정)` } });
        return `${inventory.product.name} ${command.quantity.toLocaleString()}개 발주를 등록했습니다. 다음 단계: 거래처에 발주서 보내기`;
      }, { isolationLevel: "Serializable" });
}
