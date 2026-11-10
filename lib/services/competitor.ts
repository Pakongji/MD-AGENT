import type { CompetitorEventItem } from "@/lib/types/domain";

const DAY = 86_400_000;
export type EventPhase = "upcoming" | "active" | "ended";

export function eventPhase(event: Pick<CompetitorEventItem, "startAt" | "endAt">, now: number): EventPhase {
  if (now && Date.parse(event.startAt) > now) return "upcoming";
  if (now && Date.parse(event.endAt) < now) return "ended";
  return "active";
}

const impact = (event: CompetitorEventItem) => Math.abs(event.impactEstimate);

/**
 * 지금 볼 경쟁사 변화 순서: 진행 중(영향 큰 순) → 2주 안에 시작 → 최근 30일 안에 끝남(최근 순) → 나머지(영향 큰 순).
 * 홈 카드·시장 화면·AI 답변이 같은 순서를 씁니다.
 */
export function rankCompetitorEvents(events: CompetitorEventItem[], now: number) {
  const group = (event: CompetitorEventItem) => {
    const phase = eventPhase(event, now);
    if (phase === "active") return 0;
    if (phase === "upcoming") return Date.parse(event.startAt) - now <= 14 * DAY ? 1 : 3;
    return now - Date.parse(event.endAt) <= 30 * DAY ? 2 : 3;
  };
  return [...events].sort((a, b) => group(a) - group(b)
    || (group(a) === 2 ? Date.parse(b.endAt) - Date.parse(a.endAt) : 0)
    || impact(b) - impact(a));
}

export function focusCompetitorEvent(events: CompetitorEventItem[], now: number) {
  return rankCompetitorEvents(events, now)[0];
}

/** 결과 확인용 기간: 행사 전(같은 길이) · 행사 중 · 행사 후(같은 길이) — KST 날짜 YYYY-MM-DD */
export function impactPeriods(event: Pick<CompetitorEventItem, "startAt" | "endAt">) {
  const ymd = (time: number) => new Date(time + 9 * 3_600_000).toISOString().slice(0, 10);
  const start = Date.parse(`${ymd(Date.parse(event.startAt))}T00:00:00+09:00`);
  const end = Date.parse(`${ymd(Date.parse(event.endAt))}T00:00:00+09:00`);
  const days = Math.max(1, Math.round((end - start) / DAY) + 1);
  return {
    days,
    before: { start: ymd(start - days * DAY), end: ymd(start - DAY) },
    during: { start: ymd(start), end: ymd(end) },
    after: { start: ymd(end + DAY), end: ymd(end + days * DAY) },
  };
}
