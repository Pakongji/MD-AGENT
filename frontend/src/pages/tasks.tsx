import { useSearchParams } from "react-router-dom";
import { PageTabs } from "@/components/common/page-tabs";
import { WorkOverview } from "@/features/tasks/work-overview";
import { TasksPage } from "@/features/tasks/tasks-page";
import { WorklogPanel } from "@/features/tasks/worklog-panel";
import { CalendarPage } from "@/features/calendar/calendar-page";
import { CollaborationPage } from "@/features/collaboration/collaboration-page";

export default function Tasks() {
  const [params] = useSearchParams();
  return <PageTabs initial={params.get("tab") || undefined} tabs={[
    { key: "today", label: "오늘", content: <WorkOverview /> },
    { key: "plan", label: "업무 계획 · 전체 목록", content: <TasksPage /> },
    { key: "calendar", label: "캘린더", content: <CalendarPage initialMonth={params.get("month") || undefined} /> },
    { key: "collab", label: "협업 요청", content: <CollaborationPage /> },
    { key: "worklog", label: "업무일지", content: <WorklogPanel /> },
  ]} />;
}
