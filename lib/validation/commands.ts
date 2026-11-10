import { z } from "zod";
import { isAllowedImageValue } from "@/lib/utils/image";

const plannedTask = z.object({
  title: z.string().min(1), category: z.string().min(1), priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  due: z.string().min(1), aiExecutable: z.boolean(), source: z.enum(["USER_INPUT", "AI_INFERRED", "SYSTEM_SIGNAL"]), reason: z.string(),
  requiresDecision: z.boolean().optional(),
});

export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ADD_TASKS"), goal: z.string().min(1), goalReason: z.string(), tasks: z.array(plannedTask).min(1), assigneeId: z.string().nullable().optional() }),
  z.object({ type: z.literal("ADD_TASK"), assigneeId: z.string().nullable().optional(), title: z.string().min(1), category: z.string().min(1), priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"), due: z.string().default("오늘"), reason: z.string().default(""), requiresDecision: z.boolean().optional() }),
  z.object({ type: z.literal("TOGGLE_TASK"), id: z.string().min(1) }),
  z.object({ type: z.literal("UPDATE_TASK"), id: z.string().min(1), title: z.string().min(1), status: z.enum(["대기", "진행중", "완료"]), priority: z.enum(["HIGH", "MEDIUM", "LOW"]), requiresDecision: z.boolean().optional(), assigneeId: z.string().nullable().optional() }),
  z.object({ type: z.literal("ASSIGN_TASK"), id: z.string().min(1), assigneeId: z.string().nullable() }),
  z.object({ type: z.literal("APPROVE_DECISION"), decisionId: z.string().min(1), comment: z.string().max(1000).optional() }),
  z.object({ type: z.literal("REJECT_DECISION"), decisionId: z.string().min(1), comment: z.string().trim().min(2, "반려 사유를 적어주세요.").max(1000) }),
  z.object({ type: z.literal("REVIEW_TASK"), id: z.string().min(1) }),
  z.object({
    type: z.literal("SAVE_DECISION"), id: z.string().uuid(), taskId: z.string().min(1).optional(), inventoryId: z.string().min(1).optional(),
    status: z.enum(["DRAFT", "CONFIRMED"]), outcome: z.enum(["PROCEED", "HOLD", "DECLINE"]),
    content: z.string().trim().max(2000).default(""), rationale: z.string().trim().max(4000).default(""),
    alternatives: z.string().trim().max(2000).default(""), followUp: z.string().trim().max(1000).default(""),
    reviewAt: z.string().datetime().nullable().optional(), quantity: z.number().int().positive().max(10000000).nullable().optional(),
  }),
  z.object({ type: z.literal("SAVE_SUPPLIER"), id: z.string().min(1).optional(), name: z.string().trim().min(1).max(100), contactName: z.string().max(100), email: z.string().trim().max(200).refine((value) => !value || /^\S+@\S+\.\S+$/.test(value), "이메일 형식을 확인해주세요."), cc: z.string().max(300), phone: z.string().max(50), deliverTo: z.string().max(200), paymentTerms: z.string().max(200), leadTimeDays: z.number().int().min(0).max(365).nullable().optional(), memo: z.string().max(1000), brandIds: z.array(z.string().min(1)).max(100) }),
  z.object({ type: z.literal("DELETE_SUPPLIER"), id: z.string().min(1) }),
  z.object({ type: z.literal("SAVE_PRODUCT"), id: z.string().min(1).optional(), name: z.string().trim().min(1).max(100), category: z.string().trim().min(1).max(50), brandName: z.string().trim().min(1).max(100), supplierId: z.string().optional(), sku: z.string().max(60).optional(), imageUrl: z.string().max(400000).refine(isAllowedImageValue, "이미지 형식을 확인해주세요.").nullable().optional(), price: z.number().int().min(0).max(100000000).nullable().optional(), cost: z.number().int().min(0).max(100000000).nullable().optional(), stock: z.object({ stockQty: z.number().int().min(0), dailySales: z.number().int().min(0), leadTimeDays: z.number().int().min(0).max(365), safetyStock: z.number().int().min(0) }).optional() }),
  z.object({ type: z.literal("SAVE_SUPPLIER_PRODUCT"), id: z.string().min(1).optional(), supplierId: z.string().min(1), name: z.string().trim().min(1).max(100), supplierSku: z.string().max(60), category: z.string().max(50), unitCost: z.number().int().min(0).max(100000000).nullable().optional(), moq: z.number().int().min(0).max(10000000).nullable().optional(), leadTimeDays: z.number().int().min(0).max(365).nullable().optional(), memo: z.string().max(1000), linkedProductId: z.string().optional() }),
  z.object({ type: z.literal("DELETE_SUPPLIER_PRODUCT"), id: z.string().min(1) }),
  z.object({ type: z.literal("SAVE_COMPETITOR_EVENT"), id: z.string().min(1).optional(), competitorName: z.string().trim().min(1).max(60), eventType: z.enum(["할인", "가격", "신상품", "프로모션", "기타"]), title: z.string().trim().min(2).max(120), detail: z.string().max(1000), overlapDescription: z.string().max(200), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), affectedSkuCount: z.number().int().min(0).max(100000).nullable().optional(), impactEstimate: z.number().int().min(0).max(100000000000).nullable().optional() }),
  z.object({ type: z.literal("DELETE_COMPETITOR_EVENT"), id: z.string().min(1) }),
  // 화면 전용: 발주서 창을 엽니다(서버로 보내지 않음).
  z.object({ type: z.literal("OPEN_PURCHASE_ORDER"), purchaseOrderId: z.string().min(1) }),
  z.object({ type: z.literal("SEND_PURCHASE_ORDER"), purchaseOrderId: z.string().min(1), sentTo: z.string().trim().min(3).max(300), subject: z.string().trim().min(1).max(300) }),
  z.object({ type: z.literal("CONFIRM_PO_DELIVERY"), purchaseOrderId: z.string().min(1), expectedArrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ type: z.literal("RECEIVE_PO"), purchaseOrderId: z.string().min(1), receivedQty: z.number().int().positive().optional() }),
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
