import type { DashboardData, TaskPlanResult } from "@/lib/types/domain";

export const TASK_PLANNER_SYSTEM_PROMPT = `당신은 커머스 MD의 업무 파트너다.
문장을 Task로 단순 분리하지 말고 업무 목적과 workflow를 이해해서 필요한 선행/후속 업무까지 만들어라.
각 업무에는 title, category, priority, due, aiExecutable, source, reason을 포함하고 반드시 JSON으로 답한다.`;

export interface CopilotAnswer {
  conclusion: string;
  evidence: string[];
  impact: string;
  actions: Array<{ label: string; target: string; taskTitle?: string }>;
  sources?: string[];
}

export interface AIProvider {
  readonly name: string;
  planTasks(input: string): Promise<TaskPlanResult>;
  answer(question: string, page: string, data: DashboardData): Promise<CopilotAnswer>;
}
