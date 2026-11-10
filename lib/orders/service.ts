import type { PrismaClient } from "@/generated/prisma";
import type { Command } from "@/lib/validation/commands";
import { poNumber, poStage } from "@/lib/orders/purchase-order";
import { nextBusinessDay } from "@/lib/utils/due";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
const kstLabel = (date: Date) => date.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

async function loadOrder(tx: Tx, id: string) {
  const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { inventory: { include: { product: true } } } });
  if (!po) throw new Error("발주 정보를 찾지 못했습니다. 화면을 새로고침해주세요.");
  const name = po.inventory.product.name;
  const trackingTitle = `${name} ${po.quantity.toLocaleString()}개 입고 추적`;
  const replyTitle = `${name} 발주서 납기 회신 확인`;
  return { po, name, trackingTitle, replyTitle };
}

/** 발주서를 거래처에 보냈다고 기록하고, 납기 회신 확인 업무를 만듭니다. (메일 발송 자체는 사용자의 메일 앱에서 합니다.) */
export async function sendPurchaseOrder(db: PrismaClient, command: Extract<Command, { type: "SEND_PURCHASE_ORDER" }>) {
  return db.$transaction(async (tx) => {
    const { po, name, replyTitle } = await loadOrder(tx, command.purchaseOrderId);
    if (poStage(po.status) !== "발주 등록") return `${name} 발주서는 이미 발송 처리되었습니다.`;
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "발주서 발송" } });
    const existing = await tx.task.findFirst({ where: { title: replyTitle, status: { not: "완료" } } });
    if (!existing) {
      await tx.task.create({ data: {
        title: replyTitle, category: "재고/발주", priority: "HIGH", dueAt: nextBusinessDay(), dueLabel: "다음 영업일",
        source: "SYSTEM_SIGNAL", inventoryId: po.inventoryId, requiresDecision: false,
        reason: `${poNumber(po)} 발주서를 ${command.sentTo}에 보냄 · 제목: ${command.subject}`,
      } });
    }
    return `${name} 발주서를 발송 처리했습니다. 거래처 회신이 오면 납기를 확정하세요.`;
  });
}

/** 거래처가 회신한 납기로 입고 예정일을 확정하고, 입고 추적 업무와 캘린더를 같은 날짜로 맞춥니다. */
export async function confirmPurchaseOrderDelivery(db: PrismaClient, command: Extract<Command, { type: "CONFIRM_PO_DELIVERY" }>) {
  const arrival = new Date(`${command.expectedArrival}T09:00:00+09:00`);
  if (!Number.isFinite(arrival.getTime())) throw new Error("입고 예정일을 확인해주세요.");
  return db.$transaction(async (tx) => {
    const { po, name, trackingTitle, replyTitle } = await loadOrder(tx, command.purchaseOrderId);
    const stage = poStage(po.status);
    if (stage === "입고 완료" || stage === "취소") return `${name} 발주는 이미 ${stage} 상태입니다.`;
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "납기 확정", expectedArrival: arrival } });
    await tx.task.updateMany({ where: { title: trackingTitle, status: { not: "완료" } }, data: { dueAt: arrival, dueLabel: `입고 예정 ${kstLabel(arrival)}` } });
    await tx.task.updateMany({ where: { title: replyTitle, status: { not: "완료" } }, data: { status: "완료" } });
    await tx.calendarEvent.updateMany({ where: { sourceId: po.inventoryId, type: "입고", status: { not: "완료" } }, data: { startAt: arrival, endAt: new Date(arrival.getTime() + 3_600_000) } });
    const moved = Math.round((arrival.getTime() - po.expectedArrival.getTime()) / 86_400_000);
    return `${name} 납기를 ${kstLabel(arrival)}로 확정했습니다${moved ? ` (희망일 대비 ${moved > 0 ? `${moved}일 늦음` : `${-moved}일 빠름`})` : ""}.`;
  });
}

/** 실제 입고를 확인합니다: 재고 수량에 더하고, 입고 추적 업무·캘린더를 완료로 바꿉니다. */
export async function receivePurchaseOrder(db: PrismaClient, command: Extract<Command, { type: "RECEIVE_PO" }>) {
  return db.$transaction(async (tx) => {
    const { po, name, trackingTitle, replyTitle } = await loadOrder(tx, command.purchaseOrderId);
    if (poStage(po.status) === "입고 완료") return `${name}은(는) 이미 입고 완료 처리되었습니다.`;
    const received = command.receivedQty ?? po.quantity;
    const stockQty = po.inventory.stockQty + received;
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "입고 완료" } });
    await tx.inventory.update({ where: { id: po.inventoryId }, data: {
      stockQty, stockDays: po.inventory.dailySales > 0 ? Math.floor(stockQty / po.inventory.dailySales) : po.inventory.stockDays, orderStatus: "입고 완료",
    } });
    await tx.task.updateMany({ where: { title: { in: [trackingTitle, replyTitle] }, status: { not: "완료" } }, data: { status: "완료" } });
    await tx.calendarEvent.updateMany({ where: { sourceId: po.inventoryId, type: "입고", status: { not: "완료" } }, data: { status: "완료" } });
    return `${name} ${received.toLocaleString()}개 입고를 반영했습니다${received !== po.quantity ? ` (발주 ${po.quantity.toLocaleString()}개 중 ${received.toLocaleString()}개)` : ""}.`;
  });
}
