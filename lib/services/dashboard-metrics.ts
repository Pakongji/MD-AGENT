import type { DashboardData } from "@/lib/types/domain";

export const DEMO_MONTHLY_TARGET = 1_520_000_000;

type SalesMetric = DashboardData["salesMetrics"][number];

function sum(rows: SalesMetric[], key: "revenue" | "orders" | "visitors") {
  return rows.reduce((total, row) => total + row[key], 0);
}

function changeRate(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function getSalesSnapshot(metrics: SalesMetric[]) {
  const sorted = [...metrics].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const dateKeys = Array.from(
    new Set(sorted.map((row) => new Date(row.date).toISOString().slice(0, 10))),
  );
  const periodDays = Math.min(30, Math.max(1, Math.floor(dateKeys.length / 2) || dateKeys.length));
  const currentDates = new Set(dateKeys.slice(-periodDays));
  const previousDates = new Set(dateKeys.slice(-periodDays * 2, -periodDays));
  const currentRows = sorted.filter((row) => currentDates.has(new Date(row.date).toISOString().slice(0, 10)));
  const previousRows = sorted.filter((row) => previousDates.has(new Date(row.date).toISOString().slice(0, 10)));

  const revenue = sum(currentRows, "revenue");
  const orders = sum(currentRows, "orders");
  const visitors = sum(currentRows, "visitors");
  const previousRevenue = sum(previousRows, "revenue");
  const previousOrders = sum(previousRows, "orders");
  const previousVisitors = sum(previousRows, "visitors");
  const averageOrderValue = orders ? Math.round(revenue / orders) : 0;
  const previousAverageOrderValue = previousOrders ? previousRevenue / previousOrders : 0;

  return {
    currentRows,
    previousRows,
    periodDays,
    revenue,
    orders,
    visitors,
    averageDailyVisitors: currentDates.size ? Math.round(visitors / currentDates.size) : 0,
    averageOrderValue,
    achievementRate: DEMO_MONTHLY_TARGET ? (revenue / DEMO_MONTHLY_TARGET) * 100 : 0,
    revenueChangeRate: changeRate(revenue, previousRevenue),
    ordersChangeRate: changeRate(orders, previousOrders),
    visitorsChangeRate: changeRate(visitors, previousVisitors),
    averageOrderValueChangeRate: changeRate(averageOrderValue, previousAverageOrderValue),
  };
}

export function signedPercent(value: number, digits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}
