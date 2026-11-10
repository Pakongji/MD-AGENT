import type { PrismaClient, Prisma } from "@/generated/prisma";
import { inventoryFigures, type InventoryRow, type Issue, type SalesRow } from "./parse";

const DAY = 86_400_000;
const kstDate = (ymd: string) => new Date(`${ymd}T00:00:00+09:00`);
const TOTAL_CATEGORY = "뷰티 전체";
type Actor = { id: string; name: string };

function issueSummary(issues: Issue[]) {
  const groups = new Map<string, number>();
  for (const issue of issues) { const key = issue.reason.replace(/\(.*?\)/, "").trim(); groups.set(key, (groups.get(key) ?? 0) + 1); }
  return [...groups].map(([reason, count]) => ({ reason, count }));
}

/** 업로드한 기간 끝 기준 최근 30일 상품 매출·판매량과 재고의 일평균 판매를 다시 계산합니다. */
async function rollupProducts(tx: Prisma.TransactionClient, productIds: string[]) {
  if (!productIds.length) return;
  const latest = await tx.salesRecord.aggregate({ _max: { date: true } });
  if (!latest._max.date) return;
  const since = new Date(latest._max.date.getTime() - 29 * DAY);
  const sums = await tx.salesRecord.groupBy({ by: ["productId"], where: { productId: { in: productIds }, date: { gte: since } }, _sum: { revenue: true, quantity: true } });
  for (const sum of sums) {
    if (!sum.productId) continue;
    const revenue = sum._sum.revenue ?? 0;
    const quantity = sum._sum.quantity ?? 0;
    await tx.product.update({ where: { id: sum.productId }, data: { revenue, salesQty: quantity } });
    if (quantity > 0) {
      const inventory = await tx.inventory.findUnique({ where: { productId: sum.productId } });
      if (inventory) {
        const dailySales = Math.max(1, Math.round(quantity / 30));
        await tx.inventory.update({ where: { id: inventory.id }, data: { dailySales, ...inventoryFigures(inventory.stockQty, dailySales, inventory.leadTimeDays, inventory.safetyStock), expectedStockoutDate: new Date(Date.now() + Math.min(Math.floor(inventory.stockQty / dailySales), 365) * DAY) } });
      }
    }
  }
}

/**
 * 매출 반영. 파일에 있는 '일자 × 채널'은 통째로 바꿉니다(같은 기간을 고쳐 다시 올려도 두 번 더해지지 않음).
 * replaceSample이면 첫 업로드 때 샘플 일별 매출을 지우고 실데이터만 남깁니다.
 */
export async function applySales(db: PrismaClient, input: { rows: SalesRow[]; issues: Issue[]; totalRows: number; unmatched: number; fileName: string; replaceSample: boolean }, actor: Actor) {
  const dates = [...new Set(input.rows.map((row) => row.date))].sort();
  const channels = [...new Set(input.rows.map((row) => row.channel))];
  if (!dates.length) throw new Error("반영할 매출 줄이 없어요.");
  return db.$transaction(async (tx) => {
    const firstImport = (await tx.dataImport.count({ where: { kind: "sales" } })) === 0;
    if (input.replaceSample && firstImport) await tx.salesMetric.deleteMany({});
    await tx.salesRecord.deleteMany({ where: { date: { in: dates.map(kstDate) }, channel: { in: channels } } });
    const record = await tx.dataImport.create({ data: {
      kind: "sales", fileName: input.fileName, totalRows: input.totalRows, appliedRows: input.rows.length, skippedRows: input.issues.length,
      periodStart: kstDate(dates[0]), periodEnd: kstDate(dates[dates.length - 1]), authorId: actor.id, authorName: actor.name,
      summary: { channels, unmatched: input.unmatched, issues: issueSummary(input.issues), replacedSample: input.replaceSample && firstImport },
    } });
    await tx.salesRecord.createMany({ data: input.rows.map((row) => ({
      date: kstDate(row.date), channel: row.channel, productKey: row.productId ?? (row.sku || row.productName), sku: row.sku, productName: row.productName,
      productId: row.productId, revenue: row.revenue, orders: row.orders, quantity: row.quantity, importId: record.id,
    })) });
    // 일별 합계(홈·매출 화면이 쓰는 SalesMetric)를 원장 기준으로 다시 만듭니다.
    const totals = await tx.salesRecord.groupBy({ by: ["date"], where: { date: { in: dates.map(kstDate) } }, _sum: { revenue: true, orders: true } });
    for (const total of totals) {
      await tx.salesMetric.upsert({
        where: { date_category: { date: total.date, category: TOTAL_CATEGORY } },
        update: { revenue: total._sum.revenue ?? 0, orders: total._sum.orders ?? 0 },
        create: { date: total.date, category: TOTAL_CATEGORY, revenue: total._sum.revenue ?? 0, orders: total._sum.orders ?? 0, visitors: 0 },
      });
    }
    await rollupProducts(tx, [...new Set(input.rows.map((row) => row.productId).filter((id): id is string => Boolean(id)))]);
    return `매출 ${input.rows.length.toLocaleString()}줄(${dates[0]} ~ ${dates[dates.length - 1]}, ${channels.join("·")})을 반영했습니다.${input.issues.length ? ` 문제 있는 ${input.issues.length}줄은 건너뛰었어요.` : ""}${input.unmatched ? ` 등록되지 않은 상품 ${input.unmatched}줄은 일별·채널 합계에만 들어갔어요.` : ""}`;
  }, { maxWait: 10000, timeout: 60000 });
}

/** 재고 반영: 현재고와(넣은 경우) 일평균 판매·리드타임·안전재고를 바꾸고 재고일수·상태·권장 발주를 다시 계산합니다. */
export async function applyInventory(db: PrismaClient, input: { rows: InventoryRow[]; issues: Issue[]; totalRows: number; fileName: string }, actor: Actor) {
  if (!input.rows.length) throw new Error("반영할 재고 줄이 없어요.");
  return db.$transaction(async (tx) => {
    for (const row of input.rows) {
      const current = await tx.inventory.findUnique({ where: { productId: row.productId } });
      const product = await tx.product.findUniqueOrThrow({ where: { id: row.productId }, include: { brand: { include: { supplier: true } } } });
      const dailySales = row.dailySales ?? current?.dailySales ?? (product.salesQty > 0 ? Math.max(1, Math.round(product.salesQty / 30)) : 0);
      const leadTimeDays = row.leadTimeDays ?? current?.leadTimeDays ?? product.brand.supplier?.leadTimeDays ?? 7;
      const safetyStock = row.safetyStock ?? current?.safetyStock ?? Math.ceil(dailySales * 3);
      const figures = inventoryFigures(row.stockQty, dailySales, leadTimeDays, safetyStock);
      const values = { stockQty: row.stockQty, dailySales, leadTimeDays, safetyStock, ...figures, expectedStockoutDate: new Date(Date.now() + Math.min(figures.stockDays, 365) * DAY) };
      await tx.inventory.upsert({ where: { productId: row.productId }, update: values, create: { productId: row.productId, ...values } });
    }
    await tx.dataImport.create({ data: {
      kind: "inventory", fileName: input.fileName, totalRows: input.totalRows, appliedRows: input.rows.length, skippedRows: input.issues.length,
      authorId: actor.id, authorName: actor.name, summary: { issues: issueSummary(input.issues) },
    } });
    return `재고 ${input.rows.length.toLocaleString()}개 상품을 반영했습니다.${input.issues.length ? ` 문제 있는 ${input.issues.length}줄은 건너뛰었어요.` : ""}`;
  }, { maxWait: 10000, timeout: 60000 });
}
