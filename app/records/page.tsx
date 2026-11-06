import { PageTabs } from "@/components/common/page-tabs";
import { DecisionRecords } from "@/features/records/decision-records";
import { PerformancePage } from "@/features/performance/performance-page";
import { KnowledgePage } from "@/features/knowledge/knowledge-page";
import { firstParam } from "@/lib/utils/params";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const tab = firstParam((await searchParams).tab);
  return <PageTabs key={tab ?? "decisions"} initial={tab} tabs={[
    { key: "decisions", label: "결정 기록", content: <DecisionRecords /> },
    { key: "reports", label: "성과 리포트", content: <PerformancePage /> },
    { key: "knowledge", label: "지식 문서", content: <KnowledgePage /> },
  ]} />;
}
