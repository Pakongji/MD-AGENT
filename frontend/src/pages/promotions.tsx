import { useSearchParams } from "react-router-dom";
import { PageTabs } from "@/components/common/page-tabs";
import { PromotionsPage } from "@/features/promotions/promotions-page";
import { PromotionPlanner } from "@/features/promotions/promotion-planner";

export default function Promotions() {
  const [params] = useSearchParams();
  const topic = params.get("topic")?.slice(0, 120);
  return <PageTabs tabs={[
    { key: "plan", label: "새 기획", content: <PromotionPlanner key={topic || ""} initialTopic={topic} /> },
    { key: "pipeline", label: "진행 중인 프로모션", content: <PromotionsPage /> },
  ]} />;
}
