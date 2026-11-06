import { PageTabs } from "@/components/common/page-tabs";
import { PromotionsPage } from "@/features/promotions/promotions-page";
import { PromotionPlanner } from "@/features/promotions/promotion-planner";
import { firstParam } from "@/lib/utils/params";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; topic?: string | string[] }> }) {
  const params = await searchParams;
  const raw = firstParam(params.tab);
  const tab = raw === "planner" ? "plan" : raw === "promotions" ? "pipeline" : raw;
  const topic = firstParam(params.topic)?.slice(0, 120);
  return <PageTabs key={`${tab ?? "plan"}-${topic ?? ""}`} initial={tab} tabs={[
    { key: "plan", label: "새 기획", content: <PromotionPlanner initialTopic={topic} /> },
    { key: "pipeline", label: "진행 중인 프로모션", content: <PromotionsPage /> },
  ]} />;
}
