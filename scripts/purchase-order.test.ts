import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPurchaseOrderMail, emlFile, gmailComposeLink, mailtoLink, poNumber, poStage, resolveSupplier, supplierFor } from "../lib/orders/purchase-order";
import type { ProductItem, SupplierItem } from "../lib/types/domain";

const po = { id: "cmw48ju0n0001u4lk7ehl8j8f", quantity: 700, expectedArrival: "2026-11-13T00:00:00.000Z", createdAt: "2026-11-06T00:27:51.863Z" };

test("예전 '발주 완료'는 거래처 발송 전(발주 등록)으로 본다", () => {
  assert.equal(poStage("발주 완료"), "발주 등록");
  assert.equal(poStage("발주서 발송"), "발주서 발송");
  assert.equal(poStage("이상한 값"), "발주 등록");
});

test("A 립밤 발주서: 거래처·발주번호·수량·희망 입고일·회신 요청이 들어간다", () => {
  const supplier = supplierFor("A 뷰티");
  assert.ok(supplier);
  const mail = buildPurchaseOrderMail({ po, productName: "A 립밤", brandName: "A 뷰티", supplier, senderName: "박홍지" });
  assert.equal(poNumber(po), "PO-20261106-8J8F");
  assert.equal(mail.to, supplier!.email);
  assert.equal(mail.subject, "[발주서] PO-20261106-8J8F A 립밤 700개 · 희망 입고 11/13");
  assert.match(mail.body, /A뷰티\(주\) 영업팀 김지은 매니저님/);
  assert.match(mail.body, /수량: 700개/);
  assert.match(mail.body, /희망 입고일: 2026년 11월 13일\(금\)/);
  assert.match(mail.body, /납품 가능 여부/);
  assert.match(mail.body, /박홍지 드림$/);
});

test("거래처 연락처가 없으면 받는 사람을 비워 직접 입력하게 한다", () => {
  const mail = buildPurchaseOrderMail({ po, productName: "Z 상품", brandName: "Z 브랜드", senderName: "MD" });
  assert.equal(mail.to, "");
  assert.match(mail.body, /Z 브랜드 담당자님/);
});

test("mailto 링크는 받는 사람을 인코딩하지 않고, 본문 줄바꿈을 CRLF로 보존한다", () => {
  const link = mailtoLink({ to: "order@a.example.com", subject: "발주 A", body: "1줄\n2줄" });
  assert.ok(link.startsWith("mailto:order@a.example.com?subject="));
  assert.equal(decodeURIComponent(link.split("body=")[1]), "1줄\r\n2줄");
});

test("Gmail 작성 링크에 받는 사람·제목·본문이 모두 들어간다", () => {
  const url = new URL(gmailComposeLink({ to: "order@a.example.com", subject: "[발주서] A 립밤", body: "수량: 700개\n감사합니다" }));
  assert.equal(url.searchParams.get("to"), "order@a.example.com");
  assert.equal(url.searchParams.get("su"), "[발주서] A 립밤");
  assert.equal(url.searchParams.get("body"), "수량: 700개\n감사합니다");
});

test("메일 파일(.eml)은 보내기 전 초안으로 열리고 한글 제목·본문이 깨지지 않는다", () => {
  const eml = emlFile({ to: "order@a.example.com", subject: "[발주서] A 립밤", body: "안녕하세요\n수량: 700개" });
  assert.ok(eml.startsWith("To: order@a.example.com\r\n"));
  assert.ok(eml.includes("X-Unsent: 1"));
  const subject = /Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(eml)![1];
  assert.equal(Buffer.from(subject, "base64").toString("utf-8"), "[발주서] A 립밤");
  const body = eml.split("\r\n\r\n")[1].replace(/\r\n/g, "");
  assert.equal(Buffer.from(body, "base64").toString("utf-8"), "안녕하세요\r\n수량: 700개");
});

test("등록한 거래처가 샘플보다 우선한다", () => {
  const suppliers = [{ id: "s1", name: "A뷰티 실제거래처", contactName: "홍길동", email: "real@abeauty.co.kr", cc: "", phone: "", deliverTo: "이천", paymentTerms: "현금", leadTimeDays: 7, memo: "", brands: [{ id: "b1", name: "A 뷰티" }], createdAt: "", updatedAt: "" }] as SupplierItem[];
  const products = [{ id: "p1", name: "A 립밤", brand: { name: "A 뷰티", status: "성장", supplierId: "s1" } }] as unknown as ProductItem[];
  const registered = resolveSupplier("A 뷰티", { suppliers, products })!;
  assert.equal(registered.sample, false);
  assert.equal(registered.email, "real@abeauty.co.kr");
  const sample = resolveSupplier("B 코스메틱", { suppliers, products })!;
  assert.equal(sample.sample, true);
  assert.equal(resolveSupplier("없는 브랜드", { suppliers, products }), undefined);
});
