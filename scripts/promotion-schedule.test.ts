import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestMilestones } from "../lib/promotion-planner/schedule";

// 2026-11-05(목) 17:00 KST
const now = new Date("2026-11-05T08:00:00Z");

test("행사 시작일이 있으면 오픈을 시작일 10시로 고정하고 검수·초안을 그 전 평일로 잡는다", () => {
  const result = suggestMilestones([], now, "2026-11-20");
  assert.equal(result.launch, "2026-11-20T10:00");
  assert.equal(result.review, "2026-11-19T10:00");
  assert.equal(result.draft, "2026-11-18T10:00");
});

test("거꾸로 잡을 때 주말과 기존 일정을 피한다", () => {
  // 11/23(월) 오픈 → 검수는 금요일(11/20), 금요일 10시는 이미 일정이 있어 14시
  const busy = [{ startAt: "2026-11-20T01:00:00Z", endAt: "2026-11-20T02:00:00Z", status: "예정" }];
  const result = suggestMilestones(busy, now, "2026-11-23");
  assert.equal(result.launch, "2026-11-23T10:00");
  assert.equal(result.review, "2026-11-20T14:00");
  assert.equal(result.draft, "2026-11-19T10:00");
});

test("시작일이 없거나 준비 기간이 부족하면 내일부터 차례로 배정한다", () => {
  assert.deepEqual(suggestMilestones([], now), { draft: "2026-11-06T10:00", review: "2026-11-09T10:00", launch: "2026-11-10T10:00" });
  assert.deepEqual(suggestMilestones([], now, "2026-11-07"), { draft: "2026-11-06T10:00", review: "2026-11-09T10:00", launch: "2026-11-10T10:00" });
});
