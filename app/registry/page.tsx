import { PageTabs } from "@/components/common/page-tabs";
import { MasterDataPage } from "@/features/master/master-data-page";
import { UsersPage } from "@/features/master/users-page";
import { CompetitorEventsPage } from "@/features/master/competitor-events-page";
import { firstParam } from "@/lib/utils/params";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const tab = firstParam((await searchParams).tab);
  return <PageTabs key={tab ?? "suppliers"} initial={tab} tabs={[
    { key: "suppliers", label: "거래처 등록", content: <MasterDataPage section="suppliers" /> },
    { key: "products", label: "상품 등록", content: <MasterDataPage section="products" /> },
    { key: "competitors", label: "경쟁사 변화", content: <CompetitorEventsPage /> },
    { key: "users", label: "사용자 등록", content: <UsersPage /> },
  ]} />;
}
