import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "../generated/prisma";
import { DecisionError, registerDecisionOrder, requireTaskDecision, saveDecision } from "../lib/decisions/service";
import { commandSchema } from "../lib/validation/commands";

// Explicit opt-in: creates only uniquely identified test fixtures and removes them in finally.
async function main() {
  if (process.env.DECISION_TEST_ALLOW_DATABASE_WRITES !== "1") throw new Error("Set DECISION_TEST_ALLOW_DATABASE_WRITES=1 to run fixture integration checks.");
  loadEnvConfig(resolve(__dirname, ".."), true, { info() {}, error() {} });
  const db = new PrismaClient();
  const marker = `[검증용-${randomUUID()}]`;
  const taskId = `qa-${randomUUID()}`, brandId = `qa-${randomUUID()}`, productId = `qa-${randomUUID()}`, inventoryId = `qa-${randomUUID()}`;
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const sources = ids.map((id) => `task-decision:${id}`);
  const fingerprints = () => db.$queryRaw<Array<{ accounts: string; conversations: string }>>`
    SELECT (SELECT md5(coalesce(string_agg(row_to_json(a)::text, '' ORDER BY a.id), '')) FROM public."Account" a) AS accounts,
    (SELECT md5(coalesce(string_agg(row_to_json(c)::text, '' ORDER BY c.id), '')) FROM public."AIConversation" c) AS conversations`;
  const before = await fingerprints();
  try {
    const actor = await db.account.findFirstOrThrow({ select: { id: true, name: true } });
    await db.$transaction(async (tx) => {
      await tx.brand.create({ data: { id: brandId, name: marker, status: "검증" } });
      await tx.product.create({ data: { id: productId, name: `${marker} 상품`, category: "검증", lifecycle: "검증", revenue: 0, salesQty: 0, marginRate: 0, risk: "검증", brandId } });
      await tx.inventory.create({ data: { id: inventoryId, productId, stockQty: 10, dailySales: 5, stockDays: 2, leadTimeDays: 7, safetyStock: 10, expectedStockoutDate: new Date(), status: "발주 필요", recommendedOrderQty: 30 } });
      await tx.task.create({ data: { id: taskId, title: `${marker} 발주 여부 결정`, category: "검증", priority: "LOW", dueLabel: "검증", requiresDecision: true, inventoryId } });
    });
    await assert.rejects(requireTaskDecision(db, taskId), DecisionError);
    const input = commandSchema.parse({ type: "SAVE_DECISION", id: ids[0], taskId, inventoryId, status: "DRAFT", outcome: "PROCEED" });
    if (input.type !== "SAVE_DECISION") throw new Error("Unexpected command");
    await assert.rejects(saveDecision(db, { ...input, status: "CONFIRMED" }, actor), DecisionError);
    assert.equal(await db.taskDecision.count({ where: { taskId } }), 0, "invalid confirmation must roll back");
    await saveDecision(db, input, actor);
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: taskId } })).status, "대기");
    assert.equal(await db.knowledgeDocument.count({ where: { source: { in: sources } } }), 0);
    await assert.rejects(saveDecision(db, input, { id: "not-the-author", name: "다른 작성자" }), (error: unknown) => error instanceof DecisionError && error.status === 403);

    const proceed = { ...input, status: "CONFIRMED" as const, content: "검증용 발주 진행", rationale: "재고일수가 리드타임보다 짧음", quantity: 30, followUp: `${marker} 납기 확인` };
    await saveDecision(db, proceed, actor);
    await saveDecision(db, { ...proceed, rationale: "확정 기록 덮어쓰기 시도" }, actor);
    assert.equal((await db.taskDecision.findUniqueOrThrow({ where: { id: ids[0] } })).rationale, proceed.rationale, "confirmed records are immutable");
    assert.equal(await db.knowledgeDocument.count({ where: { source: sources[0] } }), 1, "retries must not duplicate knowledge");
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: taskId } })).status, "완료");
    assert.equal(await db.purchaseOrder.count({ where: { inventoryId } }), 0, "confirmation must not execute an order");
    await requireTaskDecision(db, taskId);

    const reviewAt = new Date(Date.now() + 86400000).toISOString();
    await saveDecision(db, { ...proceed, id: ids[1], outcome: "HOLD", content: "공급사 확인 후 재검토", reviewAt, followUp: "" }, actor);
    await assert.rejects(requireTaskDecision(db, taskId), DecisionError);
    await assert.rejects(registerDecisionOrder(db, { type: "CREATE_ORDER", inventoryId, decisionId: ids[0], quantity: 30 }, new Date()), DecisionError);
    assert.equal(await db.calendarEvent.count({ where: { sourceId: ids[1] } }), 1);

    await saveDecision(db, { ...proceed, id: ids[2], followUp: "" }, actor);
    assert.equal((await db.calendarEvent.findFirstOrThrow({ where: { sourceId: ids[1] } })).status, "완료");
    await assert.rejects(registerDecisionOrder(db, { type: "CREATE_ORDER", inventoryId, decisionId: ids[2], quantity: 31 }, new Date()), DecisionError);
    await registerDecisionOrder(db, { type: "CREATE_ORDER", inventoryId, decisionId: ids[2], quantity: 30 }, new Date());
    await registerDecisionOrder(db, { type: "CREATE_ORDER", inventoryId, decisionId: ids[2], quantity: 30 }, new Date());
    assert.equal(await db.purchaseOrder.count({ where: { inventoryId } }), 1);
    assert.equal(await db.taskDecision.count({ where: { taskId, status: "CONFIRMED" } }), 3);
    const security = await db.$queryRaw<Array<{ rls: boolean; anonymous_select: boolean }>>`SELECT relrowsecurity AS rls, has_table_privilege('anon', 'public."TaskDecision"', 'SELECT') AS anonymous_select FROM pg_class WHERE oid = 'public."TaskDecision"'::regclass`;
    assert.equal(security[0].rls, true); assert.equal(security[0].anonymous_select, false);
    console.log("PASS: drafts, required rationale, authorship, immutable revisions, holds, stale-order guards, idempotence, knowledge links, RLS");
  } finally {
    await db.$transaction(async (tx) => {
      await tx.knowledgeDocument.deleteMany({ where: { source: { in: sources } } });
      await tx.calendarEvent.deleteMany({ where: { sourceId: { in: [...ids, inventoryId] } } });
      await tx.task.deleteMany({ where: { OR: [{ id: taskId }, { title: { startsWith: marker } }] } });
      await tx.purchaseOrder.deleteMany({ where: { inventoryId } });
      await tx.inventory.deleteMany({ where: { id: inventoryId } });
      await tx.product.deleteMany({ where: { id: productId } });
      await tx.brand.deleteMany({ where: { id: brandId } });
    });
    const after = await fingerprints();
    assert.deepEqual(after, before, "accounts and conversations must remain byte-for-byte unchanged");
    await db.$disconnect();
    console.log("PASS: test fixtures removed; existing accounts and conversations preserved");
  }
}

main().catch((error) => { console.error(error instanceof assert.AssertionError ? error.message : `${error.name}: ${error.code ?? "integration check failed"}`); process.exitCode = 1; });
