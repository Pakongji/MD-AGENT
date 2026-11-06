import { redirect } from "next/navigation";
import { firstParam } from "@/lib/utils/params";

// 메뉴 개편으로 '업무' 화면의 캘린더 탭으로 옮겼습니다. 예전 주소(?month 포함)로 들어와도 같은 화면이 열립니다.
export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const month = firstParam((await searchParams).month);
  redirect(month && /^\d{4}-\d{2}$/.test(month) ? `/tasks?tab=calendar&month=${month}` : "/tasks?tab=calendar");
}
