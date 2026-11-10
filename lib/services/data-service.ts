import { prisma } from "@/lib/db/prisma";
import type { DashboardData } from "@/lib/types/domain";
import { assertDatabaseEnvironment } from "@/lib/db/config";

export async function getDashboardData(viewerId?: string) {
  assertDatabaseEnvironment();
  const [tasks, products, suppliers, supplierProducts, members, viewer, inventory, purchaseOrders, marketKeywords, marketTrends, articles, competitorEvents, promotions, calendarEvents, collaborationRequests, performanceReports, knowledgeDocuments, insights, notifications, salesMetrics, aiConversations] = await Promise.all([
    prisma.task.findMany({ include: { group: { select: { goal: true } }, decisions: { orderBy: { createdAt: "desc" } } }, orderBy: [{ status: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }] }),
    prisma.product.findMany({ include: { brand: { select: { name: true, status: true, supplierId: true } }, inventory: true }, orderBy: { revenue: "desc" } }),
    prisma.supplier.findMany({ include: { brands: { select: { id: true, name: true } } }, orderBy: { name: "asc" } }),
    prisma.supplierProduct.findMany({ orderBy: [{ supplierId: "asc" }, { name: "asc" }] }),
    prisma.account.findMany({ select: { id: true, name: true, role: true, active: true, permissions: true }, orderBy: { createdAt: "asc" } }),
    viewerId ? prisma.account.findUnique({ where: { id: viewerId }, select: { id: true, name: true, email: true, role: true, permissions: true, active: true } }) : Promise.resolve(null),
    prisma.inventory.findMany({ include: { product: { select: { name: true, category: true } }, purchaseOrders: { orderBy: { createdAt: "desc" } } }, orderBy: { stockDays: "asc" } }),
    prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.marketKeyword.findMany({ orderBy: { currentIndex: "desc" } }),
    prisma.marketTrend.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.article.findMany({ include: { feedback: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { publishedAt: "desc" } }),
    prisma.competitorEvent.findMany({ include: { competitor: { select: { name: true } } }, orderBy: { startAt: "desc" } }),
    prisma.promotion.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.calendarEvent.findMany({ orderBy: { startAt: "asc" } }),
    prisma.collaborationRequest.findMany({ orderBy: { dueAt: "asc" } }),
    prisma.performanceReport.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.knowledgeDocument.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.insight.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.notification.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.salesMetric.findMany({ orderBy: { date: "asc" } }),
    prisma.aIConversation.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  // 업로드한 매출 원장이 있으면 마지막 날짜 기준 최근 30일과 그 전 30일을 채널별로 비교합니다.
  const latestSale = await prisma.salesRecord.aggregate({ _max: { date: true } });
  let channelStats: { channel: string; revenue: number; previousRevenue: number; orders: number; share: number; changeRate: number }[] = [];
  if (latestSale._max.date) {
    const end = latestSale._max.date.getTime();
    const DAY = 86_400_000;
    const [current, previous] = await Promise.all([
      prisma.salesRecord.groupBy({ by: ["channel"], where: { date: { gte: new Date(end - 29 * DAY), lte: new Date(end) } }, _sum: { revenue: true, orders: true } }),
      prisma.salesRecord.groupBy({ by: ["channel"], where: { date: { gte: new Date(end - 59 * DAY), lt: new Date(end - 29 * DAY) } }, _sum: { revenue: true } }),
    ]);
    const total = current.reduce((sum, row) => sum + (row._sum.revenue ?? 0), 0);
    channelStats = current.map((row) => {
      const revenue = row._sum.revenue ?? 0;
      const previousRevenue = previous.find((item) => item.channel === row.channel)?._sum.revenue ?? 0;
      return { channel: row.channel, revenue, previousRevenue, orders: row._sum.orders ?? 0, share: total ? revenue / total : 0, changeRate: previousRevenue ? (revenue - previousRevenue) / previousRevenue * 100 : 0 };
    }).sort((a, b) => b.revenue - a.revenue);
  }
  const importRows = await prisma.dataImport.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, kind: true, fileName: true, appliedRows: true, skippedRows: true, periodStart: true, periodEnd: true, authorName: true, createdAt: true } });
  const dataImports = importRows.filter((row, index) => importRows.findIndex((item) => item.kind === row.kind) === index);

  const data = {
    tasks, products, suppliers, supplierProducts, members, channelStats, dataImports, inventory, purchaseOrders, marketKeywords, marketTrends, articles,
    competitorEvents, promotions, calendarEvents, collaborationRequests, performanceReports,
    knowledgeDocuments, insights, notifications, salesMetrics, aiConversations,
    meta: { aiProvider: process.env.AI_PROVIDER || "mock", lastUpdated: new Date().toISOString(), viewerId, viewer },
  };
  return JSON.parse(JSON.stringify(data)) as DashboardData;
}
