import { test } from "node:test";
import assert from "node:assert/strict";
import { eventPhase, focusCompetitorEvent, impactPeriods, rankCompetitorEvents } from "../lib/services/competitor";
import type { CompetitorEventItem } from "../lib/types/domain";

const now = Date.parse("2026-11-06T03:00:00Z");
const ev = (id: string, start: string, end: string, impactEstimate = 0) => ({ id, type: "할인", title: id, detail: "", impactEstimate, affectedSkuCount: 0, overlapDescription: "", startAt: start, endAt: end, competitor: { name: "X" } }) as CompetitorEventItem;

test("단계: 시작 전·진행 중·종료", () => {
  assert.equal(eventPhase(ev("a", "2026-11-10T00:00:00Z", "2026-11-12T00:00:00Z"), now), "upcoming");
  assert.equal(eventPhase(ev("b", "2026-11-01T00:00:00Z", "2026-11-12T00:00:00Z"), now), "active");
  assert.equal(eventPhase(ev("c", "2026-10-20T00:00:00Z", "2026-10-26T00:00:00Z"), now), "ended");
});

test("영향이 커도 끝난 행사보다 진행 중·곧 시작하는 행사를 먼저 본다", () => {
  const events = [
    ev("ended-big", "2026-10-20T00:00:00Z", "2026-10-26T00:00:00Z", -6_800_000),
    ev("active-small", "2026-11-01T00:00:00Z", "2026-11-12T00:00:00Z", -1_000_000),
    ev("upcoming", "2026-11-12T00:00:00Z", "2026-11-15T00:00:00Z"),
    ev("ended-old", "2026-08-01T00:00:00Z", "2026-08-05T00:00:00Z", -9_000_000),
  ];
  assert.deepEqual(rankCompetitorEvents(events, now).map((event) => event.id), ["active-small", "upcoming", "ended-big", "ended-old"]);
  assert.equal(focusCompetitorEvent([events[0], events[3]], now)?.id, "ended-big");
});

test("결과 확인 기간: 행사와 같은 길이로 전·후를 잡는다 (KST 날짜)", () => {
  const periods = impactPeriods({ startAt: "2026-10-19T15:00:00Z", endAt: "2026-10-26T14:59:59Z" }); // KST 10/20 ~ 10/26
  assert.equal(periods.days, 7);
  assert.deepEqual(periods.before, { start: "2026-10-13", end: "2026-10-19" });
  assert.deepEqual(periods.during, { start: "2026-10-20", end: "2026-10-26" });
  assert.deepEqual(periods.after, { start: "2026-10-27", end: "2026-11-02" });
});
