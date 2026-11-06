import { PageTabs } from "@/components/common/page-tabs";
import { MarketOverview } from "@/features/market/market-overview";
import { MarketPage } from "@/features/market/market-page";
import { CompetitorsPage } from "@/features/competitors/competitors-page";
import { firstParam } from "@/lib/utils/params";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const tab = firstParam((await searchParams).tab);
  return <PageTabs key={tab ?? "overview"} initial={tab} tabs={[
    { key: "overview", label: "요약 · 영향 순", content: <MarketOverview /> },
    { key: "trend", label: "트렌드 · 검색", content: <MarketPage /> },
    { key: "competitors", label: "경쟁사 변화", content: <CompetitorsPage /> },
  ]} />;
}
