import { PageTabs } from "@/components/common/page-tabs";
import { ChannelOverview } from "@/features/sales/channel-overview";
import { SalesPage } from "@/features/sales/sales-page";
import { InventoryPage } from "@/features/inventory/inventory-page";
import { ProductsPage } from "@/features/products/products-page";
import { redirect } from "next/navigation";
import { firstParam } from "@/lib/utils/params";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const tab = firstParam((await searchParams).tab);
  // 예전 위치(매출·재고 > 거래처·상품 등록)는 관리 > 데이터 등록으로 옮겼습니다.
  if (tab === "master") redirect("/registry");
  return <PageTabs key={tab ?? "overview"} initial={tab} tabs={[
    { key: "overview", label: "채널별 매출 · 재고", content: <ChannelOverview /> },
    { key: "sales", label: "매출 상세 · 상품 진단", content: <SalesPage /> },
    { key: "inventory", label: "재고 · 발주 · 입고", content: <InventoryPage /> },
    { key: "products", label: "상품 · 브랜드", content: <ProductsPage /> },
  ]} />;
}
