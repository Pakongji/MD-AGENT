import type { DashboardData } from "@/lib/types/domain";

const kst = (value: string | number | Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ...options }).format(new Date(value));

/** 화면 숫자가 언제 기준인지: 저장된 매출 자료의 마지막 날짜를 기준으로 표시합니다. */
export function latestDataDate(data: Pick<DashboardData, "salesMetrics">) {
  const times = data.salesMetrics.map((row) => Date.parse(row.date)).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)) : null;
}

export function dataAsOf(data: Pick<DashboardData, "salesMetrics">) {
  const latest = latestDataDate(data);
  return latest ? `${kst(latest, { month: "2-digit", day: "2-digit" }).replace(/\.\s?/g, "/").replace(/\/$/, "")} 마감` : "자료 없음";
}

export function shortDate(value: string | number | Date) {
  return kst(value, { month: "numeric", day: "numeric" });
}

export function shortDateTime(value: string | number | Date) {
  return kst(value, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}
