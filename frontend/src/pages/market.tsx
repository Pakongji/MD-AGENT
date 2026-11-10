import { useSearchParams } from "react-router-dom";
import { PageTabs } from "@/components/common/page-tabs";
import { MarketOverview } from "@/features/market/market-overview";
import { MarketPage } from "@/features/market/market-page";
import { CompetitorsPage } from "@/features/competitors/competitors-page";

export default function Market() {
  const [params] = useSearchParams();
  return <PageTabs tabs={[
    { key: "overview", label: "요약 · 영향 순", content: <MarketOverview focus={params.get("focus") || undefined} eventId={params.get("event") || undefined} /> },
    { key: "trend", label: "트렌드 · 검색", content: <MarketPage /> },
    { key: "competitors", label: "경쟁사 변화", content: <CompetitorsPage /> },
  ]} />;
}
