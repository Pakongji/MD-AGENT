export const worklogPeriods = { daily: "일일", weekly: "주간", monthly: "월간" } as const;
export type WorklogPeriod = keyof typeof worklogPeriods;

const dayMs = 86_400_000;
const kstMs = 9 * 3_600_000;

export function kstDay(date = new Date()) {
  return new Date(date.getTime() + kstMs).toISOString().slice(0, 10);
}

export function getWorklogPeriod(period: WorklogPeriod, anchor: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return null;
  const date = new Date(anchor + "T00:00:00Z");
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== anchor || anchor > kstDay(now)) return null;
  let start = +date;
  let end = start + dayMs;
  if (period === "weekly") {
    start -= ((date.getUTCDay() + 6) % 7) * dayMs;
    end = start + 7 * dayMs;
  }
  if (period === "monthly") {
    start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  return {
    period,
    start: new Date(start - kstMs),
    end: new Date(end - kstMs),
    cutoff: new Date(Math.min(end - kstMs, +now)),
    startDay: new Date(start).toISOString().slice(0, 10),
    endDay: new Date(end - dayMs).toISOString().slice(0, 10),
  };
}

export type WorklogRange = NonNullable<ReturnType<typeof getWorklogPeriod>>;
