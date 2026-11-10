"use client";

import { create } from "zustand";
import { commandPermission, denyMessage, hasPermission } from "@/lib/auth/permissions";
import type { AIConversationItem, DashboardData, DecisionOutcome } from "@/lib/types/domain";
import { EMPTY_DASHBOARD } from "@/lib/types/domain";
import { latestConfirmed } from "@/lib/decisions/shared";
import type { Channel } from "@/lib/mock/samples";

type ToastTone = "success" | "error" | "info";
export interface DecisionTarget { taskId?: string; inventoryId?: string; outcome?: DecisionOutcome; quantity?: number; selectedId?: string; nonce?: number; startNew?: boolean; suggestedContent?: string; contextNote?: string }

export interface WorkspaceFilters { category: string; channel: Channel }
export const ALL_CATEGORIES = "뷰티 전체";
const FILTER_STORAGE_KEY = "md-agent-filters";

function readStoredFilters(): WorkspaceFilters {
  const fallback: WorkspaceFilters = { category: ALL_CATEGORIES, channel: "전체" };
  try {
    if (typeof window === "undefined") return fallback;
    const saved = JSON.parse(window.localStorage.getItem(FILTER_STORAGE_KEY) ?? "null");
    return saved && typeof saved.category === "string" && typeof saved.channel === "string" ? { ...fallback, ...saved } : fallback;
  } catch { return fallback; }
}

export function matchesCategory(filters: WorkspaceFilters, category?: string | null) {
  return filters.category === ALL_CATEGORIES || !category || category === filters.category;
}

interface AppState {
  data: DashboardData;
  filters: WorkspaceFilters;
  setFilters: (filters: Partial<WorkspaceFilters>) => void;
  restoreFilters: () => void;
  copilot: { open: boolean; question: string };
  openCopilot: (question?: string) => void;
  closeCopilot: () => void;
  loading: boolean;
  error: string | null;
  busy: boolean;
  decisionTarget: DecisionTarget | null;
  /** 발주서(거래처 메일) 창에 띄울 발주 ID */
  poTarget: string | null;
  openPurchaseOrder: (purchaseOrderId: string) => void;
  closePurchaseOrder: () => void;
  openDecision: (target: DecisionTarget) => void;
  closeDecision: () => void;
  toast: { message: string; tone: ToastTone } | null;
  load: () => Promise<void>;
  command: (command: Record<string, unknown>) => Promise<boolean>;
  recordAIConversation: (conversation: AIConversationItem) => void;
  showToast: (message: string, tone?: ToastTone) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  data: EMPTY_DASHBOARD,
  filters: { category: ALL_CATEGORIES, channel: "전체" },
  setFilters: (next) => {
    const filters = { ...get().filters, ...next };
    set({ filters });
    try { window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters)); } catch { /* 저장 공간을 쓸 수 없으면 이번 화면에서만 유지합니다. */ }
  },
  restoreFilters: () => set({ filters: readStoredFilters() }),
  copilot: { open: false, question: "" },
  openCopilot: (question = "") => set({ copilot: { open: true, question } }),
  closeCopilot: () => set((state) => ({ copilot: { ...state.copilot, open: false } })),
  loading: true,
  error: null,
  busy: false,
  decisionTarget: null,
  poTarget: null,
  openPurchaseOrder: (purchaseOrderId) => set({ poTarget: purchaseOrderId }),
  closePurchaseOrder: () => set({ poTarget: null }),
  openDecision: (target) => set({ decisionTarget: { ...target, nonce: Date.now() } }),
  closeDecision: () => set({ decisionTarget: null }),
  toast: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "데이터를 불러오지 못했습니다.");
      set({ data: payload, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "오류가 발생했습니다." });
    }
  },
  command: async (command) => {
    if (get().busy) return false;
    const task = get().data.tasks.find((item) => item.id === command.id);
    if (command.type === "REVIEW_TASK" || (command.type === "TOGGLE_TASK" && task?.requiresDecision) || (command.type === "UPDATE_TASK" && command.status === "완료" && task?.status !== "완료" && (task?.requiresDecision || command.requiresDecision) && task && (!latestConfirmed(task) || latestConfirmed(task)?.outcome === "HOLD"))) {
      get().openDecision({ taskId: String(command.id) });
      return false;
    }
    // 권한이 없는 실행은 서버에 보내기 전에 안내합니다(최종 검사는 서버).
    const required = commandPermission(String(command.type));
    const viewer = get().data.meta.viewer;
    if (viewer && !hasPermission(viewer, required)) {
      set({ toast: { message: denyMessage(required!), tone: "error" } });
      window.setTimeout(() => get().clearToast(), 3200);
      return false;
    }
    if (command.type === "OPEN_PURCHASE_ORDER") {
      get().openPurchaseOrder(String(command.purchaseOrderId));
      return false;
    }
    if ((command.type === "CREATE_ORDER" && !command.decisionId) || command.type === "HOLD_ORDER") {
      get().openDecision({ inventoryId: String(command.inventoryId), outcome: command.type === "HOLD_ORDER" ? "HOLD" : "PROCEED", quantity: Number(command.quantity) || undefined });
      return false;
    }
    set({ busy: true });
    try {
      const response = await fetch("/api/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const payload = await response.json();
      if (!response.ok) {
        if (payload.code === "DECISION_REQUIRED" && payload.taskId && response.status === 409) get().openDecision({ taskId: payload.taskId });
        throw new Error(payload.error || "요청을 처리하지 못했습니다.");
      }
      set({ data: payload.data, busy: false, toast: { message: payload.message, tone: "success" } });
      window.setTimeout(() => get().clearToast(), 2600);
      return true;
    } catch (error) {
      set({ busy: false, toast: { message: error instanceof Error ? error.message : "오류가 발생했습니다.", tone: "error" } });
      window.setTimeout(() => get().clearToast(), 3200);
      return false;
    }
  },
  recordAIConversation: (conversation) => set((state) => ({
    data: {
      ...state.data,
      aiConversations: [conversation, ...state.data.aiConversations.filter((item) => item.id !== conversation.id)].slice(0, 12),
    },
  })),
  showToast: (message, tone = "info") => {
    set({ toast: { message, tone } });
    window.setTimeout(() => get().clearToast(), 2600);
  },
  clearToast: () => set({ toast: null }),
}));
