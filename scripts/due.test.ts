import { test } from "node:test";
import assert from "node:assert/strict";
import { dueDisplay, parseDueText, relativeDueLabel } from "../lib/utils/due";

// 2026-11-05(목) 17:00 KST
const now = new Date("2026-11-05T08:00:00Z");
const kst = (value: Date | null) => value && new Date(value.getTime() + 9 * 3_600_000).toISOString().slice(0, 16);

test("상대 날짜와 시간을 한국 시간으로 해석한다", () => {
  assert.equal(kst(parseDueText("오늘 오전 11시까지", now)), "2026-11-05T11:00");
  assert.equal(kst(parseDueText("내일 오후 2시까지", now)), "2026-11-06T14:00");
  assert.equal(kst(parseDueText("내일 10:30", now)), "2026-11-06T10:30");
  assert.equal(kst(parseDueText("모레", now)), "2026-11-07T18:00");
  assert.equal(kst(parseDueText("오후 3시까지", now)), "2026-11-05T15:00");
  assert.equal(kst(parseDueText("3시 반", now)), "2026-11-05T15:30");
});

test("요일·이번 주·월일을 해석한다", () => {
  assert.equal(kst(parseDueText("금요일까지", now)), "2026-11-06T18:00");
  assert.equal(kst(parseDueText("목요일", now)), "2026-11-05T18:00");
  assert.equal(kst(parseDueText("다음 주 월요일 오전 10시", now)), "2026-11-09T10:00");
  assert.equal(kst(parseDueText("다음 주 목요일", now)), "2026-11-12T18:00");
  assert.equal(kst(parseDueText("이번 주", now)), "2026-11-06T18:00");
  assert.equal(kst(parseDueText("11/20", now)), "2026-11-20T18:00");
  assert.equal(kst(parseDueText("12월 3일 오후 4시", now)), "2026-12-03T16:00");
});

test("날짜 단서가 없는 단계 문구는 null", () => {
  for (const label of ["먼저", "결정 전", "발주 후", "확정 직후", ""]) assert.equal(parseDueText(label, now), null);
});

test("마감 표시는 저장된 문구가 아니라 실제 마감 시각으로 다시 계산한다", () => {
  assert.equal(relativeDueLabel("2026-10-22T01:30:00Z", now), "기한 지남 · 10. 22.");
  assert.equal(relativeDueLabel("2026-11-05T09:00:00Z", now), "오늘 18:00");
  assert.equal(relativeDueLabel("2026-11-06T05:00:00Z", now), "내일 14:00");
  assert.equal(relativeDueLabel("2026-11-20T01:00:00Z", now), "11. 20.(금) 10:00");
  // 10/21에 "내일 10:30"으로 저장된 업무
  assert.equal(dueDisplay({ dueAt: "2026-10-22T01:30:00Z", dueLabel: "내일 10:30", status: "대기" }, now), "기한 지남 · 10. 22.");
  // 단계 문구는 살린다
  assert.equal(dueDisplay({ dueAt: "2026-11-12T01:00:00Z", dueLabel: "결정 재검토", status: "진행중" }, now), "결정 재검토 · 11. 12.(목) 10:00");
  assert.equal(dueDisplay({ dueAt: "2026-10-22T01:30:00Z", dueLabel: "내일 10:30", status: "완료" }, now), "10. 22. 마감");
  assert.equal(dueDisplay({ dueAt: null, dueLabel: "이번 주" }, now), "이번 주");
});

test("시간을 말하지 않은 '오늘' 마감은 저녁에 만들어도 바로 기한 초과가 되지 않는다", async () => {
  const { dueForStorage } = await import("../lib/utils/due");
  const evening = new Date("2026-11-05T09:30:00Z"); // 18:30 KST
  assert.equal(kst(dueForStorage("오늘", evening)), "2026-11-05T23:59");
  assert.equal(kst(dueForStorage("이번 주", evening)), "2026-11-06T18:00");
  // 시간을 명시했으면 지났더라도 그대로(사용자가 말한 마감)
  assert.equal(kst(dueForStorage("오늘 오전 11시", evening)), "2026-11-05T11:00");
  // 오전에 만들면 기본 18:00
  assert.equal(kst(dueForStorage("오늘", new Date("2026-11-05T01:00:00Z"))), "2026-11-05T18:00");
});

test("다음 영업일은 주말을 건너뛴다", async () => {
  const { nextBusinessDay } = await import("../lib/utils/due");
  assert.equal(kst(nextBusinessDay(new Date("2026-11-06T03:00:00Z"))), "2026-11-09T18:00"); // 금 → 월
  assert.equal(kst(nextBusinessDay(new Date("2026-11-05T03:00:00Z"))), "2026-11-06T18:00"); // 목 → 금
});
