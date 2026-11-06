import { PageTabs } from "@/components/common/page-tabs";
import { WorkOverview } from "@/features/tasks/work-overview";
import { TasksPage } from "@/features/tasks/tasks-page";
import { WorklogPanel } from "@/features/tasks/worklog-panel";
import { CalendarPage } from "@/features/calendar/calendar-page";
import { CollaborationPage } from "@/features/collaboration/collaboration-page";
import { firstParam } from "@/lib/utils/params";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; month?: string | string[] }> }) {
  const params = await searchParams;
  const tab = firstParam(params.tab);
  return <PageTabs key={tab ?? "today"} initial={tab} tabs={[
    { key: "today", label: "오늘", content: <WorkOverview /> },
    { key: "plan", label: "업무 계획 · 전체 목록", content: <TasksPage /> },
    { key: "calendar", label: "캘린더", content: <CalendarPage initialMonth={firstParam(params.month)} /> },
    { key: "collab", label: "협업 요청", content: <CollaborationPage /> },
    { key: "worklog", label: "업무일지", content: <WorklogPanel /> },
  ]} />;
}
