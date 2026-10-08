import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { seedDemoData } from "@/lib/db/seed-demo";
import { getDashboardData } from "@/lib/services/data-service";
import { commandSchema, type Command } from "@/lib/validation/commands";

const todayAt = (hour = 18) => new Date(`2026-10-08T${String(hour).padStart(2, "0")}:00:00+09:00`);

async function execute(command: Command) {
  switch (command.type) {
    case "ADD_TASKS": {
      const group = await prisma.taskGroup.create({ data: { goal: command.goal, reason: command.goalReason } });
      await prisma.task.createMany({ data: command.tasks.map((task) => ({
        title: task.title, category: task.category, priority: task.priority, dueAt: todayAt(), dueLabel: task.due,
        status: "대기", aiExecutable: task.aiExecutable, source: task.source, reason: task.reason, groupId: group.id,
      })) });
      return `${command.tasks.length}개 업무를 추가했습니다.`;
    }
    case "ADD_TASK":
      await prisma.task.create({ data: { title: command.title, category: command.category, priority: command.priority, dueAt: todayAt(), dueLabel: command.due, reason: command.reason, source: "SYSTEM_SIGNAL" } });
      return "오늘 업무에 추가했습니다.";
    case "TOGGLE_TASK": {
      const task = await prisma.task.findUniqueOrThrow({ where: { id: command.id } });
      await prisma.task.update({ where: { id: command.id }, data: { status: task.status === "완료" ? "진행중" : "완료" } });
      return task.status === "완료" ? "업무를 다시 진행중으로 바꿨습니다." : "업무를 완료했습니다.";
    }
    case "UPDATE_TASK":
      await prisma.task.update({ where: { id: command.id }, data: { title: command.title, status: command.status, priority: command.priority } });
      return "업무를 수정했습니다.";
    case "CREATE_ORDER": {
      const inventory = await prisma.inventory.findUniqueOrThrow({ where: { id: command.inventoryId }, include: { product: true } });
      const expectedArrival = new Date(todayAt().getTime() + inventory.leadTimeDays * 86400000);
      await prisma.$transaction([
        prisma.purchaseOrder.create({ data: { inventoryId: inventory.id, quantity: command.quantity, status: "발주 완료", expectedArrival } }),
        prisma.inventory.update({ where: { id: inventory.id }, data: { orderStatus: "발주 완료", recommendedOrderQty: command.quantity } }),
        prisma.task.create({ data: { title: `${inventory.product.name} ${command.quantity.toLocaleString()}개 입고 추적`, category: "재고/발주", priority: "HIGH", dueAt: expectedArrival, dueLabel: `입고 예정 ${expectedArrival.toLocaleDateString("ko-KR")}`, status: "대기", aiExecutable: false, source: "SYSTEM_SIGNAL", reason: "발주 완료 후 실제 입고까지 추적하기 위해 생성했습니다." } }),
        prisma.calendarEvent.create({ data: { title: `${inventory.product.name} ${command.quantity.toLocaleString()}개 입고 예정`, type: "입고", startAt: expectedArrival, endAt: new Date(expectedArrival.getTime() + 3600000), status: "예정", sourceId: inventory.id, description: "발주에서 자동 생성된 입고 일정" } }),
      ]);
      return `${inventory.product.name} ${command.quantity.toLocaleString()}개 발주와 입고 추적 업무를 생성했습니다.`;
    }
    case "HOLD_ORDER":
      await prisma.inventory.update({ where: { id: command.inventoryId }, data: { orderStatus: "보류" } });
      return "발주 검토를 보류했습니다.";
    case "ADVANCE_PROMOTION": {
      const promotion = await prisma.promotion.findUniqueOrThrow({ where: { id: command.id } });
      const stages = ["아이디어", "기획", "디자인", "세팅", "진행", "완료"];
      const next = stages[Math.min(stages.length - 1, Math.max(0, stages.indexOf(promotion.stage)) + 1)];
      await prisma.promotion.update({ where: { id: command.id }, data: { stage: next } });
      return `프로모션을 ${next} 단계로 옮겼습니다.`;
    }
    case "CREATE_PROMOTION":
      await prisma.promotion.create({ data: { name: command.name, period: command.period, goal: command.goal, targetSkus: "선정 필요", benefit: "검토 필요", budget: 0, expectedEffect: "산정 필요", collaboration: "디자인, 마케팅", deliverables: "기획전 페이지, CRM", rationale: "사용자 입력에서 생성", stage: "아이디어" } });
      return "새 프로모션을 아이디어 단계에 추가했습니다.";
    case "SCHEDULE_PROMOTION": {
      const promotion = await prisma.promotion.findUniqueOrThrow({ where: { id: command.id } });
      const start = new Date(command.startAt);
      await prisma.calendarEvent.create({ data: { title: promotion.name, type: "프로모션", startAt: start, endAt: new Date(start.getTime() + 6 * 86400000), status: "예정", sourceId: promotion.id, description: `${promotion.period} · ${promotion.targetSkus}` } });
      return "프로모션을 캘린더에 추가했습니다.";
    }
    case "ADD_CALENDAR":
      await prisma.calendarEvent.create({ data: { title: command.title, type: command.eventType, startAt: new Date(command.startAt), endAt: new Date(command.endAt), description: command.description, status: "예정" } });
      return "일정을 추가했습니다.";
    case "UPDATE_CALENDAR":
      await prisma.calendarEvent.update({ where: { id: command.id }, data: { title: command.title, startAt: new Date(command.startAt), endAt: new Date(command.endAt), status: command.status } });
      return "일정을 수정했습니다.";
    case "COMPLETE_CALENDAR":
      await prisma.calendarEvent.update({ where: { id: command.id }, data: { status: "완료" } });
      return "일정을 완료했습니다.";
    case "CREATE_COLLAB":
      await prisma.collaborationRequest.create({ data: { title: command.title, team: command.team, owner: command.owner, dueAt: new Date(command.dueAt), status: "대기", purpose: command.purpose, deliverable: command.deliverable, reference: command.reference, requestText: command.requestText } });
      return "협업 요청을 생성했습니다.";
    case "UPDATE_COLLAB":
      await prisma.collaborationRequest.update({ where: { id: command.id }, data: { status: command.status } });
      return `협업 요청을 ${command.status} 상태로 변경했습니다.`;
    case "GENERATE_REPORT": {
      const report = await prisma.performanceReport.create({ data: { title: `${command.period} AI 성과 리포트`, period: command.period, achievement: 96, summary: "스킨케어와 A 브랜드데이가 성장을 이끌었고, 메이크업 하락은 경쟁사 할인 시점과 함께 관찰됐습니다.", wins: "스킨케어 +4.2%p; A 브랜드데이 +2.8%p", misses: "메이크업 -1.5%p; 품절 -0.8%p", nextActions: "립 실구매가 모니터링; A 립밤 입고 추적; 립오일 소싱 후보 검토" } });
      await prisma.knowledgeDocument.create({ data: { title: report.title, type: "성과", content: `${report.summary}\n잘한 점: ${report.wins}\n아쉬운 점: ${report.misses}\n다음 Action: ${report.nextActions}`, source: "AI 성과 분석", tags: "성과,회고,AI리포트" } });
      return "AI 성과 리포트를 생성하고 지식 저장소에 보관했습니다.";
    }
    case "ADD_KNOWLEDGE":
      await prisma.knowledgeDocument.create({ data: { title: command.title, type: command.documentType, content: command.content, source: command.source, tags: command.tags } });
      return "지식 저장소에 문서를 추가했습니다.";
    case "ARTICLE_FEEDBACK":
      await prisma.articleFeedback.create({ data: { articleId: command.id, value: command.value } });
      return "추천 피드백을 저장했습니다.";
    case "SAVE_ARTICLE": {
      const article = await prisma.article.update({ where: { id: command.id }, data: { saved: true } });
      const existing = await prisma.knowledgeDocument.findFirst({ where: { source: `article:${article.id}` } });
      if (!existing) await prisma.knowledgeDocument.create({ data: { title: article.title, type: "리서치", content: article.summary, source: `article:${article.id}`, tags: "시장,기사,트렌드" } });
      return "기사를 지식 저장소에 저장했습니다.";
    }
    case "READ_NOTIFICATIONS":
      await prisma.notification.updateMany({ data: { read: true } });
      return "알림을 모두 읽음 처리했습니다.";
    case "RESET_DEMO":
      await seedDemoData(prisma);
      return "데모 데이터를 초기 상태로 되돌렸습니다.";
  }
}

export async function POST(request: Request) {
  try {
    const command = commandSchema.parse(await request.json());
    const message = await execute(command);
    return NextResponse.json({ message, data: await getDashboardData() });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "입력값을 확인해주세요.", details: error.flatten() }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
  }
}
