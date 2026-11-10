import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { denyMessage, hasPermission } from "@/lib/auth/permissions";
import { databaseErrorMessage, logDatabaseError } from "@/lib/db/errors";
import { briefSchema, draftSchema, milestones, overviewToBrief, querySchema, researchSchema, scheduleSchema, type PromotionMilestone, type PromotionRevision } from "@/lib/promotion-planner/model";
import { PlannerResearchError, referenceResearch, regenerateOptions, researchPromotion } from "@/lib/promotion-planner/research";

export const runtime = "nodejs";
export const maxDuration = 90;
const planRef = { id: z.string().min(1).max(100), version: z.number().int().nonnegative() };
const requestSchema = z.discriminatedUnion("action", [
  // 1단계: 주제·채널만으로 시장 조사 → 조사 근거가 붙은 행사 개요 제안
  z.object({ action: z.literal("research"), id: z.string().uuid(), query: querySchema, mode: z.enum(["live", "reference"]) }),
  // 2단계: MD가 행사 개요(예산 포함)를 확인·수정해서 확정 → 바뀌었으면 3안을 다시 만듦
  z.object({ action: z.literal("overview"), ...planRef, brief: briefSchema }),
  z.object({ action: z.literal("save"), ...planRef, draft: draftSchema, confirm: z.boolean() }),
  z.object({ action: z.literal("schedule"), ...planRef, schedule: scheduleSchema }),
]);

class PlanConflict extends Error {}

async function authorId() {
  const email = (await auth())?.user?.email;
  return email ? (await prisma.account.findUnique({ where: { email }, select: { id: true } }))?.id : null;
}

/** 기획안 저장·확정·일정 등록은 '프로모션' 권한이 필요합니다. */
async function canEditPromotion(id: string) {
  const account = await prisma.account.findUnique({ where: { id }, select: { permissions: true, active: true } });
  return hasPermission(account, "promotion");
}

function fail(error: unknown) {
  if (error instanceof PlanConflict) return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof PlannerResearchError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
    return Response.json({ error: "웹 조사 응답 시간이 초과됐습니다. 다시 시도하거나 참고 초안을 사용하세요." }, { status: 504 });
  }
  logDatabaseError(error, "프로모션 기획");
  return Response.json({ error: databaseErrorMessage(error, "프로모션 요청을 처리하지 못했습니다.") }, { status: 500 });
}

export async function GET() {
  try {
    const author = await authorId();
    if (!author) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const plans = await prisma.promotionPlan.findMany({ where: { authorId: author }, orderBy: { updatedAt: "desc" }, take: 30 });
    return Response.json({ plans, liveAvailable: Boolean(process.env.OPENAI_API_KEY?.trim()) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const author = await authorId();
    if (!author) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (!await canEditPromotion(author)) return Response.json({ error: denyMessage("promotion") }, { status: 403 });
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "입력 내용을 확인해주세요." }, { status: 400 });
    const command = parsed.data;
    if (command.action === "research") {
      const existing = await prisma.promotionPlan.findUnique({ where: { id: command.id } });
      if (existing?.authorId === author) return Response.json({ plan: existing });
      if (existing) return Response.json({ error: "새 요청으로 다시 시도해주세요." }, { status: 409 });
      const research = command.mode === "live" ? await researchPromotion(command.query) : referenceResearch(command.query);
      const brief = overviewToBrief(research.overview!, command.query);
      const plan = await prisma.promotionPlan.create({ data: { id: command.id, authorId: author, brief, research } });
      return Response.json({ plan });
    }

    if (command.action === "overview") {
      const existing = await prisma.promotionPlan.findFirst({ where: { id: command.id, authorId: author } });
      if (!existing || existing.version !== command.version) throw new PlanConflict("기획안이 변경됐습니다. 새로고침한 뒤 다시 열어주세요.");
      if (existing.promotionId) throw new PlanConflict("이미 확정한 기획은 행사 개요를 바꿀 수 없어요. 새 기획으로 시작해주세요.");
      const research = researchSchema.parse(existing.research);
      const before = briefSchema.parse(existing.brief);
      const changed = (["topic", "channel", "period", "goal"] as const).some(key => before[key].trim() !== command.brief[key].trim());
      // 웹 호출은 트랜잭션 밖에서 처리하고, 저장할 때 버전을 다시 확인합니다.
      const options = changed ? await regenerateOptions(command.brief, research) : research.options;
      const version = existing.version + 1;
      const revision: PromotionRevision = { version, at: new Date().toISOString(), action: "개요 확정", brief: command.brief };
      const update = await prisma.promotionPlan.updateMany({
        where: { id: existing.id, authorId: author, version: command.version },
        data: { version, brief: command.brief, research: { ...research, options }, revisions: [...(existing.revisions as PromotionRevision[]), revision] },
      });
      if (!update.count) throw new PlanConflict("다른 화면에서 기획안이 변경됐습니다. 새로고침해주세요.");
      return Response.json({ plan: await prisma.promotionPlan.findUniqueOrThrow({ where: { id: existing.id } }) });
    }

    const plan = await prisma.$transaction(async tx => {
      const existing = await tx.promotionPlan.findFirst({ where: { id: command.id, authorId: author } });
      if (!existing || existing.version !== command.version) {
        throw new PlanConflict("기획안이 변경됐습니다. 새로고침한 뒤 다시 열어주세요.");
      }
      const version = existing.version + 1;
      const at = new Date().toISOString();
      const revisions = existing.revisions as PromotionRevision[];
      const brief = briefSchema.parse(existing.brief);
      let revision: PromotionRevision;
      if (command.action === "save") {
        revision = { version, at, action: command.confirm ? "기획 확정" : "초안 저장", draft: command.draft };
      } else {
        if (!existing.promotionId) throw new PlanConflict("기획안을 확정한 뒤 캘린더에 연결해주세요.");
        const previous = [...revisions].reverse().find(item => item.schedule)?.schedule ?? {};
        const combined = scheduleSchema.safeParse({ ...previous, ...command.schedule });
        if (!combined.success) throw new PlanConflict("기존 일정과 새 일정의 순서를 확인해주세요.");
        revision = { version, at, action: "일정 등록", schedule: combined.data };
      }
      const update = await tx.promotionPlan.updateMany({
        where: { id: existing.id, authorId: author, version: command.version },
        data: { version, revisions: [...revisions, revision], ...(command.action === "save" ? { draft: command.draft } : {}) },
      });
      if (!update.count) throw new PlanConflict("다른 화면에서 기획안이 변경됐습니다. 새로고침해주세요.");

      if (command.action === "save" && command.confirm) {
        const draft = command.draft;
        const data = {
          name: draft.title, goal: brief.goal || draft.audience, period: brief.period || "일정 미정",
          targetSkus: draft.products, benefit: draft.benefit, budget: brief.budget ?? 0, expectedEffect: "확정 성과는 집행 후 검증",
          collaboration: "디자인, 마케팅", deliverables: "배너, 상세페이지",
          rationale: [draft.message, draft.risk, draft.notes].filter(Boolean).join("\n"),
        };
        if (existing.promotionId) {
          await tx.promotion.update({ where: { id: existing.promotionId }, data });
        } else {
          const promotion = await tx.promotion.create({ data: { ...data, stage: "기획" } });
          await tx.promotionPlan.update({ where: { id: existing.id }, data: { promotionId: promotion.id } });
        }
      } else if (command.action === "schedule") {
        const promotion = await tx.promotion.findUniqueOrThrow({ where: { id: existing.promotionId! } });
        for (const [step, value] of Object.entries(command.schedule)) {
          const startAt = new Date(value);
          const endAt = new Date(+startAt + 3_600_000);
          const id = "promotion-plan-" + existing.id + "-" + step;
          const details = { title: promotion.name + " · " + milestones[step as PromotionMilestone], startAt, endAt };
          await tx.calendarEvent.upsert({ where: { id }, update: details, create: {
            id, ...details, sourceId: promotion.id, type: "프로모션", description: "확정한 AI 기획안의 제작 일정",
          } });
        }
      }
      return tx.promotionPlan.findUniqueOrThrow({ where: { id: existing.id } });
    });
    return Response.json({ plan });
  } catch (error) { return fail(error); }
}
