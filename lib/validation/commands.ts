import { z } from "zod";

const plannedTask = z.object({
  title: z.string().min(1), category: z.string().min(1), priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  due: z.string().min(1), aiExecutable: z.boolean(), source: z.enum(["USER_INPUT", "AI_INFERRED", "SYSTEM_SIGNAL"]), reason: z.string(),
  requiresDecision: z.boolean().optional(),
});

export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ADD_TASKS"), goal: z.string().min(1), goalReason: z.string(), tasks: z.array(plannedTask).min(1) }),
  z.object({ type: z.literal("ADD_TASK"), title: z.string().min(1), category: z.string().min(1), priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"), due: z.string().default("오늘"), reason: z.string().default(""), requiresDecision: z.boolean().optional() }),
  z.object({ type: z.literal("TOGGLE_TASK"), id: z.string().min(1) }),
  z.object({ type: z.literal("UPDATE_TASK"), id: z.string().min(1), title: z.string().min(1), status: z.enum(["대기", "진행중", "완료"]), priority: z.enum(["HIGH", "MEDIUM", "LOW"]), requiresDecision: z.boolean().optional() }),
  z.object({ type: z.literal("REVIEW_TASK"), id: z.string().min(1) }),
  z.object({
    type: z.literal("SAVE_DECISION"), id: z.string().uuid(), taskId: z.string().min(1).optional(), inventoryId: z.string().min(1).optional(),
    status: z.enum(["DRAFT", "CONFIRMED"]), outcome: z.enum(["PROCEED", "HOLD", "DECLINE"]),
    content: z.string().trim().max(2000).default(""), rationale: z.string().trim().max(4000).default(""),
    alternatives: z.string().trim().max(2000).default(""), followUp: z.string().trim().max(1000).default(""),
    reviewAt: z.string().datetime().nullable().optional(), quantity: z.number().int().positive().max(10000000).nullable().optional(),
  }),
  z.object({ type: z.literal("CREATE_ORDER"), inventoryId: z.string().min(1), quantity: z.number().int().positive(), decisionId: z.string().min(1).optional(), expectedArrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  z.object({ type: z.literal("HOLD_ORDER"), inventoryId: z.string().min(1) }),
  z.object({ type: z.literal("ADVANCE_PROMOTION"), id: z.string().min(1) }),
  z.object({ type: z.literal("CREATE_PROMOTION"), name: z.string().min(1), period: z.string().min(1), goal: z.string().min(1) }),
  z.object({ type: z.literal("SCHEDULE_PROMOTION"), id: z.string().min(1), startAt: z.string().datetime() }),
  z.object({ type: z.literal("ADD_CALENDAR"), title: z.string().min(1), eventType: z.string().min(1), startAt: z.string().datetime(), endAt: z.string().datetime(), description: z.string().default("") }),
  z.object({ type: z.literal("UPDATE_CALENDAR"), id: z.string().min(1), title: z.string().min(1), startAt: z.string().datetime(), endAt: z.string().datetime(), status: z.enum(["예정", "진행", "완료"]) }),
  z.object({ type: z.literal("COMPLETE_CALENDAR"), id: z.string().min(1) }),
  z.object({ type: z.literal("CREATE_COLLAB"), title: z.string().min(1), team: z.string().min(1), owner: z.string().min(1), dueAt: z.string().datetime(), purpose: z.string(), deliverable: z.string(), reference: z.string(), requestText: z.string() }),
  z.object({ type: z.literal("UPDATE_COLLAB"), id: z.string().min(1), status: z.enum(["대기", "진행", "승인 대기", "완료"]) }),
  z.object({ type: z.literal("GENERATE_REPORT"), period: z.string().min(1) }),
  z.object({ type: z.literal("ADD_KNOWLEDGE"), title: z.string().min(1), documentType: z.string().min(1), content: z.string().min(1), source: z.string().default("사용자 입력"), tags: z.string().default("") }),
  z.object({ type: z.literal("ARTICLE_FEEDBACK"), id: z.string().min(1), value: z.enum(["유용", "관심없음"]) }),
  z.object({ type: z.literal("SAVE_ARTICLE"), id: z.string().min(1) }),
  z.object({ type: z.literal("READ_NOTIFICATIONS") }),
  z.object({ type: z.literal("RESET_DEMO") }),
]);

export type Command = z.infer<typeof commandSchema>;
