"use client";

import { create } from "zustand";
import type { DashboardData } from "@/lib/types/domain";
import { EMPTY_DASHBOARD } from "@/lib/types/domain";

type ToastTone = "success" | "error" | "info";

interface AppState {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  busy: boolean;
  toast: { message: string; tone: ToastTone } | null;
  load: () => Promise<void>;
  command: (command: Record<string, unknown>) => Promise<boolean>;
  showToast: (message: string, tone?: ToastTone) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  data: EMPTY_DASHBOARD,
  loading: true,
  error: null,
  busy: false,
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
    set({ busy: true });
    try {
      const response = await fetch("/api/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "요청을 처리하지 못했습니다.");
      set({ data: payload.data, busy: false, toast: { message: payload.message, tone: "success" } });
      window.setTimeout(() => get().clearToast(), 2600);
      return true;
    } catch (error) {
      set({ busy: false, toast: { message: error instanceof Error ? error.message : "오류가 발생했습니다.", tone: "error" } });
      window.setTimeout(() => get().clearToast(), 3200);
      return false;
    }
  },
  showToast: (message, tone = "info") => {
    set({ toast: { message, tone } });
    window.setTimeout(() => get().clearToast(), 2600);
  },
  clearToast: () => set({ toast: null }),
}));
