import type { PromotionMilestone } from "./model";
import { kstDay } from "@/lib/worklog/period";

type CalendarSlot = { startAt: string; endAt: string; status: string };
const day = 86_400_000;
const hour = 3_600_000;
const SLOT_HOURS = [10, 14, 16];

/** KST 기준 하루의 00:00(UTC epoch ms)에서 주말·기존 일정과 겹치지 않는 첫 슬롯을 찾습니다. */
function freeSlot(dayStart: number, busy: number[][], hours = SLOT_HOURS) {
  const local = new Date(dayStart + 9 * hour);
  if ([0, 6].includes(local.getUTCDay())) return undefined;
  return hours.map(time => dayStart + time * hour)
    .find(time => busy.every(([from, to]) => !(from < time + hour && to > time)));
}
const toLocalInput = (time: number) => new Date(time + 9 * hour).toISOString().slice(0, 16);

/**
 * 제작 일정을 추천합니다.
 * - 행사 시작일(launchDate, YYYY-MM-DD)이 있으면 오픈은 그날 10시로 고정하고, 검수·초안은 그 전 평일 빈 시간으로 거꾸로 잡습니다.
 * - 시작일이 없거나 준비 기간(평일 2일)이 부족하면 내일부터 빈 평일을 차례로 배정합니다.
 */
export function suggestMilestones(events: CalendarSlot[], now = new Date(), launchDate?: string) {
  const busy = events.filter(event => event.status !== "완료").map(event => [Date.parse(event.startAt), Date.parse(event.endAt)]);
  const tomorrow = Date.parse(kstDay(now) + "T00:00:00+09:00") + day;
  const launchDay = launchDate && /^\d{4}-\d{2}-\d{2}$/.test(launchDate) ? Date.parse(`${launchDate}T00:00:00+09:00`) : NaN;

  if (Number.isFinite(launchDay) && launchDay > tomorrow) {
    const backward: Partial<Record<PromotionMilestone, string>> = { launch: toLocalInput(launchDay + 10 * hour) };
    let cursor = launchDay - day;
    for (const step of ["review", "draft"] as const) {
      for (; cursor >= tomorrow; cursor -= day) {
        const start = freeSlot(cursor, busy);
        if (start === undefined) continue;
        backward[step] = toLocalInput(start);
        cursor -= day;
        break;
      }
    }
    if (backward.review && backward.draft) return backward;
  }

  const result: Partial<Record<PromotionMilestone, string>> = {};
  let cursor = tomorrow;
  for (const step of ["draft", "review", "launch"] as const) {
    for (; cursor < tomorrow + 30 * day; cursor += day) {
      const start = freeSlot(cursor, busy);
      if (start === undefined) continue;
      result[step] = toLocalInput(start);
      cursor += day;
      break;
    }
  }
  return result;
}
