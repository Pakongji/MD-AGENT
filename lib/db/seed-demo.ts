import type { PrismaClient } from "@/generated/prisma";
import { demoData, salesSeries } from "@/lib/mock/data";

export async function seedDemoData(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.aIConversation.deleteMany(), prisma.notification.deleteMany(), prisma.insight.deleteMany(),
    prisma.knowledgeDocument.deleteMany(), prisma.performanceReport.deleteMany(), prisma.collaborationRequest.deleteMany(),
    prisma.calendarEvent.deleteMany(), prisma.promotion.deleteMany(), prisma.competitorEvent.deleteMany(),
    prisma.competitor.deleteMany(), prisma.articleFeedback.deleteMany(), prisma.article.deleteMany(),
    prisma.marketTrend.deleteMany(), prisma.marketKeyword.deleteMany(), prisma.purchaseOrder.deleteMany(),
    prisma.inventory.deleteMany(), prisma.product.deleteMany(), prisma.brand.deleteMany(),
    prisma.salesMetric.deleteMany(), prisma.task.deleteMany(), prisma.taskGroup.deleteMany(), prisma.user.deleteMany(),
  ]);

  await prisma.user.create({ data: demoData.user });
  const groupIds = new Map<string, string>();
  for (const group of demoData.taskGroups) {
    const created = await prisma.taskGroup.create({ data: { goal: group.goal, reason: group.reason } });
    groupIds.set(group.key, created.id);
  }
  for (const task of demoData.tasks) {
    const { groupKey, ...data } = task;
    await prisma.task.create({ data: { ...data, groupId: groupKey ? groupIds.get(groupKey) : undefined } });
  }
  await prisma.salesMetric.createMany({ data: salesSeries });

  const brandIds = new Map<string, string>();
  for (const brand of demoData.brands) {
    const created = await prisma.brand.create({ data: { name: brand.name, status: brand.status } });
    brandIds.set(brand.key, created.id);
  }
  const productIds = new Map<string, string>();
  for (const product of demoData.products) {
    const { key, brandKey, ...data } = product;
    const created = await prisma.product.create({ data: { ...data, brandId: brandIds.get(brandKey)! } });
    productIds.set(key, created.id);
  }
  for (const item of demoData.inventory) {
    const { productKey, ...data } = item;
    await prisma.inventory.create({ data: { ...data, productId: productIds.get(productKey)! } });
  }
  await prisma.marketKeyword.createMany({ data: demoData.marketKeywords });
  await prisma.marketTrend.createMany({ data: demoData.marketTrends });
  for (const article of demoData.articles) await prisma.article.create({ data: article });

  const competitorIds = new Map<string, string>();
  for (const competitor of demoData.competitors) {
    const created = await prisma.competitor.create({ data: { name: competitor.name } });
    competitorIds.set(competitor.key, created.id);
  }
  for (const event of demoData.competitorEvents) {
    const { competitorKey, ...data } = event;
    await prisma.competitorEvent.create({ data: { ...data, competitorId: competitorIds.get(competitorKey)! } });
  }
  await prisma.promotion.createMany({ data: demoData.promotions });
  await prisma.calendarEvent.createMany({ data: demoData.calendarEvents });
  await prisma.collaborationRequest.createMany({ data: demoData.collaborationRequests });
  await prisma.performanceReport.createMany({ data: demoData.reports });
  await prisma.knowledgeDocument.createMany({ data: demoData.knowledge });
  await prisma.insight.createMany({ data: demoData.insights });
  await prisma.notification.createMany({ data: demoData.notifications });
}
