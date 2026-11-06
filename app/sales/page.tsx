import { PageTabs } from "@/components/common/page-tabs";
import { ChannelOverview } from "@/features/sales/channel-overview";
import { SalesPage } from "@/features/sales/sales-page";
import { InventoryPage } from "@/features/inventory/inventory-page";
import { ProductsPage } from "@/features/products/products-page";
import { firstParam } from "@/lib/utils/params";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const tab = firstParam((await searchParams).tab);
  return <PageTabs key={tab ?? "overview"} initial={tab} tabs={[
    { key: "overview", label: "채널별 매출 · 재고", content: <ChannelOverview /> },
    { key: "sales", label: "매출 상세 · 상품 진단", content: <SalesPage /> },
    { key: "inventory", label: "재고 · 발주 · 입고", content: <InventoryPage /> },
    { key: "products", label: "상품 · 브랜드", content: <ProductsPage /> },
  ]} />;
}
