import { prisma } from "@/lib/db/prisma";
import type { DashboardData } from "@/lib/types/domain";

export async function getDashboardData() {
  const [tasks, products, inventory, purchaseOrders, marketKeywords, marketTrends, articles, competitorEvents, promotions, calendarEvents, collaborationRequests, performanceReports, knowledgeDocuments, insights, notifications, salesMetrics, aiConversations] = await Promise.all([
    prisma.task.findMany({ include: { group: { select: { goal: true } } }, orderBy: [{ status: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }] }),
    prisma.product.findMany({ include: { brand: { select: { name: true, status: true } }, inventory: true }, orderBy: { revenue: "desc" } }),
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

  const data = {
    tasks, products, inventory, purchaseOrders, marketKeywords, marketTrends, articles,
    competitorEvents, promotions, calendarEvents, collaborationRequests, performanceReports,
    knowledgeDocuments, insights, notifications, salesMetrics, aiConversations,
    meta: { aiProvider: process.env.AI_PROVIDER || "mock", lastUpdated: new Date().toISOString() },
  };
  return JSON.parse(JSON.stringify(data)) as DashboardData;
}
