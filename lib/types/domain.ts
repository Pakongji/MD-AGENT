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
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  lifecycle: string;
  revenue: number;
  salesQty: number;
  marginRate: number;
  risk: string;
  brand: { name: string };
  inventory?: InventoryItem | null;
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

export interface DashboardData {
  tasks: TaskItem[];
  products: ProductItem[];
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
  meta: { aiProvider: string; lastUpdated: string };
}

export const EMPTY_DASHBOARD: DashboardData = {
  tasks: [], products: [], inventory: [], purchaseOrders: [], marketKeywords: [], marketTrends: [], articles: [], competitorEvents: [], promotions: [], calendarEvents: [], collaborationRequests: [], performanceReports: [], knowledgeDocuments: [], insights: [], notifications: [], salesMetrics: [], meta: { aiProvider: "mock", lastUpdated: "" },
};
