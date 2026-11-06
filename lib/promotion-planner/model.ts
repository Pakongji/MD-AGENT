import { z } from "zod";

const line = z.string().trim().min(1).max(600);
export const briefSchema = z.object({
  topic: z.string().trim().min(3).max(300),
  channel: z.string().trim().max(80),
  period: z.string().trim().max(80),
  goal: z.string().trim().max(150),
  budget: z.number().int().min(0).max(2_000_000_000).nullable(),
});

/** 1단계 시장 조사 입력: 조사할 주제와 판매 채널만 받습니다. 예산·목표 같은 내부 정보는 조사에 보내지 않습니다. */
export const querySchema = z.object({
  topic: z.string().trim().min(2).max(120),
  channel: z.string().trim().max(80),
});

export const overviewKeys = ["topic", "channel", "period", "goal"] as const;
export type OverviewKey = (typeof overviewKeys)[number];
export const overviewLabels: Record<OverviewKey, string> = { topic: "주제", channel: "채널", period: "기간", goal: "목표" };
const evidenceRefs = z.array(z.number().int().min(1).max(10)).max(6);
/** 시장 조사를 근거로 AI가 제안한 행사 개요. evidence는 근거 자료(sources)의 1부터 시작하는 번호입니다. */
export const overviewSchema = z.object({
  topic: z.string().trim().max(300),
  channel: z.string().trim().max(80),
  period: z.string().trim().max(80),
  goal: z.string().trim().max(150),
  evidence: z.object({ topic: evidenceRefs, channel: evidenceRefs, period: evidenceRefs, goal: evidenceRefs }).partial(),
});

export function readPromotionPeriod(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/.exec(value);
  return match ? { start: match[1], end: match[2] } : undefined;
}

export const fields = [
  ["title", "기획안 이름"], ["audience", "타깃"], ["products", "상품 구성"],
  ["benefit", "혜택"], ["message", "배너 카피"], ["risk", "확인할 조건"],
] as const;
export const optionSchema = z.object({
  title: line, audience: line, products: line, benefit: line, message: line, risk: line,
});

const safeSourceUrl = z.string().max(1500).url().refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
});
export const researchSchema = z.object({
  mode: z.enum(["live", "reference"]),
  checkedAt: z.string().datetime(),
  summary: line,
  sources: z.array(z.object({ title: line, url: safeSourceUrl, finding: line })).max(10),
  options: z.array(optionSchema).length(3),
  query: querySchema.optional(),
  overview: overviewSchema.optional(),
});
export const figmaLinkSchema = z.union([z.literal(""), safeSourceUrl.refine(value => {
  try {
    const u = new URL(value);
    return (u.hostname === "www.figma.com" || u.hostname === "figma.com") && /^\/(?:design|file|proto)\//.test(u.pathname);
  } catch { return false; }
})]);
export const draftSchema = optionSchema.extend({
  origin: z.record(z.enum(["title", "audience", "products", "benefit", "message", "risk"]), z.number().int().min(1).max(3)),
  notes: z.string().trim().max(1800),
  figmaUrl: figmaLinkSchema,
});

export const milestones = { draft: "배너·상세페이지 초안", review: "상품·디자인 검수", launch: "기획전 오픈" } as const;
export const scheduleSchema = z.object({
  draft: z.string().datetime().optional(), review: z.string().datetime().optional(), launch: z.string().datetime().optional(),
}).refine(value => Object.values(value).length > 0, "일정을 하나 이상 입력해주세요.")
  .refine(value => {
    const times = [value.draft, value.review, value.launch].filter((v): v is string => Boolean(v)).map(v => Date.parse(v));
    return times.every((value, i) => i === 0 || value > times[i - 1]);
  }, "초안, 검수, 오픈 순서로 일정을 입력해주세요.");

export type Brief = z.infer<typeof briefSchema>;
export type PromotionOption = z.infer<typeof optionSchema>;
export type PromotionResearch = z.infer<typeof researchSchema>;
export type PromotionDraft = z.infer<typeof draftSchema>;
export type PromotionMilestone = keyof typeof milestones;
export type PromotionQuery = z.infer<typeof querySchema>;
export type PromotionOverview = z.infer<typeof overviewSchema>;
export type PromotionRevision = { version: number; at: string; action: "개요 확정" | "초안 저장" | "기획 확정" | "일정 등록"; brief?: Brief; draft?: PromotionDraft; schedule?: z.infer<typeof scheduleSchema> };
export type PlannerRecord = {
  id: string; promotionId: string | null; version: number; updatedAt: string;
  brief: Brief; research: PromotionResearch; draft: PromotionDraft | null; revisions: PromotionRevision[];
};

/** 행사 개요를 확정했는지. 이전 방식(개요를 먼저 입력하던 기획안)은 이미 확정된 것으로 봅니다. */
export function overviewConfirmed(plan: Pick<PlannerRecord, "research" | "revisions" | "draft">) {
  return !plan.research.overview || Boolean(plan.draft) || plan.revisions.some(item => item.action === "개요 확정");
}

export function overviewToBrief(overview: PromotionOverview, query: PromotionQuery): Brief {
  const topic = overview.topic.trim().length >= 3 ? overview.topic.trim() : `${query.topic} 기획전`;
  return {
    topic: topic.slice(0, 300),
    channel: (overview.channel || query.channel).slice(0, 80),
    period: overview.period.slice(0, 80),
    goal: overview.goal.slice(0, 150),
    budget: null,
  };
}
