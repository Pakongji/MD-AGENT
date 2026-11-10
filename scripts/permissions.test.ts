import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_PERMISSIONS, commandPermission, hasPermission, normalizePermissions, ROLES } from "../lib/auth/permissions";
import { commandSchema } from "../lib/validation/commands";
import { buildPurchaseOrderMail } from "../lib/orders/purchase-order";

test("모든 명령에 필요한 권한이 정해져 있다 (빠진 명령은 안전하게 '업무' 권한)", () => {
  const types = commandSchema.options.map((option) => option.shape.type.value);
  for (const type of types) assert.ok(commandPermission(type) === null || ALL_PERMISSIONS.includes(commandPermission(type)!), type);
  assert.equal(commandPermission("CREATE_ORDER"), "order");
  assert.equal(commandPermission("SAVE_SUPPLIER"), "master");
  assert.equal(commandPermission("RESET_DEMO"), "reset");
  assert.equal(commandPermission("READ_NOTIFICATIONS"), null);
  assert.equal(commandPermission("UNKNOWN_NEW_COMMAND"), "task");
});

test("역할 기본값: 관리자는 전부, 조회 전용은 아무것도 없다", () => {
  const role = (key: string) => ROLES.find((item) => item.key === key)!;
  assert.deepEqual([...role("ADMIN").permissions], ALL_PERMISSIONS);
  assert.deepEqual([...role("VIEWER").permissions], []);
  assert.ok(!role("MD").permissions.includes("users"));
  assert.deepEqual([...role("MEMBER").permissions], ["task"]);
});

test("권한 검사: 사용 중지된 계정은 아무것도 못 하고, 권한 없는 명령은 막힌다", () => {
  const md = { permissions: ["task", "decide", "order"], active: true };
  assert.equal(hasPermission(md, "order"), true);
  assert.equal(hasPermission(md, "master"), false);
  assert.equal(hasPermission(md, null), true);
  assert.equal(hasPermission({ ...md, active: false }, "task"), false);
  assert.equal(hasPermission({ ...md, active: false }, null), false);
  assert.equal(hasPermission(null, null), false);
});

test("저장할 권한은 알려진 키만 정해진 순서로 남긴다", () => {
  assert.deepEqual(normalizePermissions(["users", "hack", "task", "task"]), ["task", "users"]);
});

test("공급사 품목이 연결되면 발주서에 공급가·금액·품번이 들어가고 MOQ 미달을 알린다", () => {
  const po = { id: "x0001", quantity: 300, expectedArrival: "2026-11-13T00:00:00Z", createdAt: "2026-11-06T00:00:00Z" };
  const mail = buildPurchaseOrderMail({ po, productName: "A 립밤", senderName: "박홍지", supplierItem: { name: "립밤 4.5g", supplierSku: "AB-4501", unitCost: 2100, moq: 500 } });
  assert.match(mail.body, /귀사 품목: 립밤 4\.5g \(품번 AB-4501\)/);
  assert.match(mail.body, /공급가: 2,100원 × 300개 = 630,000원 \(VAT 별도\)/);
  assert.equal(mail.belowMoq, 500);
  assert.equal(buildPurchaseOrderMail({ po: { ...po, quantity: 700 }, productName: "A 립밤", senderName: "MD", supplierItem: { name: "립밤", supplierSku: "", unitCost: null, moq: 500 } }).belowMoq, null);
});
