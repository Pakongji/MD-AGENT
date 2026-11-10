export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type TaskStatus = "대기" | "진행중" | "완료";
export type TaskSource = "USER_INPUT" | "AI_INFERRED" | "SYSTEM_SIGNAL";

export interface TaskPlanTask {
  title: string;
  category: string;
  priority: Priority;
  due: string;
  aiExecutable: boolean;
  source: TaskSource;
  reason: string;
  selected?: boolean;
  requiresDecision?: boolean;
}

export interface TaskPlanGoal {
  goal: string;
  reason: string;
  tasks: TaskPlanTask[];
}

export interface TaskPlanResult {
  goals: TaskPlanGoal[];
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  dueAt: string | null;
  dueLabel: string;
  status: TaskStatus;
  aiExecutable: boolean;
  source: TaskSource;
  reason: string;
  groupId?: string | null;
  group?: { goal: string } | null;
  requiresDecision: boolean;
  inventoryId: string | null;
  decisions: TaskDecisionItem[];
  assigneeId?: string | null;
}

export type DecisionOutcome = "PROCEED" | "HOLD" | "DECLINE";
export interface DecisionEvidence {
  capturedAt: string;
  taskTitle: string;
  taskReason: string;
  inventory?: {
    id: string; productName: string; stockQty: number; dailySales: number;
    stockDays: number; leadTimeDays: number; safetyStock: number; recommendedOrderQty: number;
  };
}
export interface TaskDecisionItem {
  id: string; taskId: string; authorId: string; authorName: string;
  status: "DRAFT" | "CONFIRMED"; outcome: DecisionOutcome;
  content: string; rationale: string; alternatives: string; followUp: string;
  reviewAt: string | null; quantity: number | null; evidence: DecisionEvidence;
  confirmedAt: string | null; createdAt: string; updatedAt: string;
  approvalStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  approverId?: string | null; approverName?: string; approvalComment?: string; approvalAt?: string | null;
}

/** 업무 담당자로 고를 수 있는 사용자(이메일 없이 이름·역할만) */
export interface MemberItem { id: string; name: string; role: string; active: boolean; permissions: string[] }

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  lifecycle: string;
  revenue: number;
  salesQty: number;
  marginRate: number;
  risk: string;
  sku?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  cost?: number | null;
  brandId?: string;
  brand: { name: string; status: string; supplierId?: string | null };
  inventory?: InventoryItem | null;
}

/** 거래처가 공급하는 품목(공급가·MOQ). linkedProductId로 자사 상품과 연결합니다. */
export interface SupplierProductItem {
  id: string;
  supplierId: string;
  name: string;
  supplierSku: string;
  category: string;
  unitCost: number | null;
  moq: number | null;
  leadTimeDays: number | null;
  memo: string;
  linkedProductId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 지금 로그인한 사용자와 권한(화면 버튼 제어용, 최종 검사는 서버). */
export interface ViewerInfo { id: string; name: string; email: string; role: string; permissions: string[]; active: boolean }

/** 발주를 보내는 거래처(공급사). 브랜드와 연결해 발주서 받는 사람으로 씁니다. */
export interface SupplierItem {
  id: string;
  name: string;
  contactName: string;
  email: string;
  cc: string;
  phone: string;
  deliverTo: string;
  paymentTerms: string;
  leadTimeDays: number | null;
  memo: string;
  brands: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  stockQty: number;
  dailySales: number;
  stockDays: number;
  leadTimeDays: number;
  safetyStock: number;
  expectedStockoutDate: string;
  status: string;
  recommendedOrderQty: number;
  orderStatus: string;
  product?: { name: string; category: string };
  purchaseOrders?: PurchaseOrderItem[];
  updatedAt?: string;
}

export interface PurchaseOrderItem {
  id: string;
  quantity: number;
  status: string;
  expectedArrival: string;
  createdAt: string;
}

export interface PromotionItem {
  id: string;
  name: string;
  goal: string;
  period: string;
  targetSkus: string;
  benefit: string;
  budget: number;
  expectedEffect: string;
  collaboration: string;
  deliverables: string;
  rationale: string;
  stage: string;
}

export interface CalendarItem {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  status: string;
  sourceId?: string | null;
  description: string;
}

export interface CollaborationItem {
  id: string;
  title: string;
  team: string;
  owner: string;
  dueAt: string;
  status: string;
  purpose: string;
  deliverable: string;
  reference: string;
  requestText: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
  content: string;
  source: string;
  tags: string;
  createdAt: string;
}

export interface ArticleItem {
  id: string;
  publisher: string;
  publishedAt: string;
  title: string;
  summary: string;
  recommendationWhy: string;
  saved: boolean;
  feedback: { id: string; value: string }[];
}

export interface CompetitorEventItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  impactEstimate: number;
  affectedSkuCount: number;
  overlapDescription: string;
  startAt: string;
  endAt: string;
  competitor: { name: string };
}

export interface MarketKeywordItem {
  id: string;
  keyword: string;
  monthlyVolume: number;
  yearOverYear: number;
  judgment: string;
  currentIndex: number;
  tenWeeksChange: number;
  risingSince: string;
  weeklySeries: string;
}

export interface AIConversationItem {
  id: string;
  question: string;
  answer: string;
  context: string;
  createdAt: string;
}

export interface DashboardData {
  tasks: TaskItem[];
  products: ProductItem[];
  suppliers: SupplierItem[];
  supplierProducts: SupplierProductItem[];
  members: MemberItem[];
  /** 업로드한 매출 원장 기준 최근 30일 채널 집계(없으면 빈 배열 → 화면은 샘플 표시) */
  channelStats: { channel: string; revenue: number; previousRevenue: number; orders: number; share: number; changeRate: number }[];
  /** 데이터 종류별 최근 업로드 */
  dataImports: { id: string; kind: string; fileName: string; appliedRows: number; skippedRows: number; periodStart: string | null; periodEnd: string | null; authorName: string; createdAt: string }[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrderItem[];
  marketKeywords: MarketKeywordItem[];
  marketTrends: Array<{ id: string; title: string; event: string; impact: string; recommendation: string; evidence: string }>;
  articles: ArticleItem[];
  competitorEvents: CompetitorEventItem[];
  promotions: PromotionItem[];
  calendarEvents: CalendarItem[];
  collaborationRequests: CollaborationItem[];
  performanceReports: Array<{ id: string; title: string; period: string; achievement: number; summary: string; wins: string; misses: string; nextActions: string; createdAt: string }>;
  knowledgeDocuments: KnowledgeItem[];
  insights: Array<{ id: string; type: string; title: string; interpretation: string; impact: string; evidence: string; actionLabel: string; actionTarget: string; severity: string }>;
  notifications: Array<{ id: string; title: string; detail: string; read: boolean; target: string }>;
  salesMetrics: Array<{ id: string; date: string; category: string; revenue: number; orders: number; visitors: number }>;
  aiConversations: AIConversationItem[];
  meta: { aiProvider: string; lastUpdated: string; viewerId?: string; viewer?: ViewerInfo | null };
}

export const EMPTY_DASHBOARD: DashboardData = {
  tasks: [], products: [], suppliers: [], supplierProducts: [], members: [], channelStats: [], dataImports: [], inventory: [], purchaseOrders: [], marketKeywords: [], marketTrends: [], articles: [], competitorEvents: [], promotions: [], calendarEvents: [], collaborationRequests: [], performanceReports: [], knowledgeDocuments: [], insights: [], notifications: [], salesMetrics: [], aiConversations: [], meta: { aiProvider: "mock", lastUpdated: "" },
};
