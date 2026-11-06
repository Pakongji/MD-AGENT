import { test } from "node:test";
import assert from "node:assert/strict";
import { MockAIProvider } from "../lib/ai/mock-provider";

const ai = new MockAIProvider();

test("문장마다 목표를 나누고 각자의 마감과 대상을 쓴다", async () => {
  const { goals } = await ai.planTasks("내일 오후 2시까지 SCM팀에 12월 립 발주 계획을 넘기고, 금요일까지 블프 기획전 상품 리스트를 확정해야 해.");
  assert.equal(goals.length, 2);
  const [order, promo] = goals;
  const orderKey = order.tasks.find((task) => task.source === "USER_INPUT")!;
  const promoKey = promo.tasks.find((task) => task.source === "USER_INPUT")!;
  assert.equal(orderKey.title, "SCM팀에 12월 립 발주 계획 전달");
  assert.match(orderKey.due, /^(내일 14:00|\d+\. \d+\.\(.\) 14:00)$/);
  assert.equal(promoKey.title, "블프 기획전 상품 리스트를 확정");
  assert.match(promoKey.due, /18:00$/);
  assert.notEqual(orderKey.due, promoKey.due);
});

test("기존 smoke 시나리오: 두 목표, 두 번째 마감은 오늘 15:00", async () => {
  const { goals } = await ai.planTasks("오늘 오전 11시까지 디자인팀에 추석 프로모션 배너 시안을 넘기고, 오후 3시까지 이사님께 월 매출 보고자료를 드려야 해.");
  assert.equal(goals.length, 2);
  assert.ok(goals[0].tasks.filter((task) => task.source === "AI_INFERRED").length >= 5);
  assert.equal(goals[1].tasks.filter((task) => task.due === "오늘 15:00").length, 1);
  assert.equal(goals[0].tasks.find((task) => task.source === "USER_INPUT")!.title, "디자인팀에 추석 프로모션 배너 시안 전달");
  assert.equal(goals[1].tasks.find((task) => task.source === "USER_INPUT")!.title, "이사님께 월 매출 보고자료 전달");
});
