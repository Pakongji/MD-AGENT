import { test } from "node:test";
import assert from "node:assert/strict";
import { inventoryFigures, mapHeaders, normalizeChannel, parseDateCell, parseInventory, parseNumberCell, parseSales } from "../lib/import/parse";
import { decodeCsv, parseCsv } from "../lib/import/read-table";

const products = [{ id: "p1", name: "A 립밤", sku: "AB-LB-001" }, { id: "p2", name: "B 쿠션", sku: null }];

test("열 이름이 달라도 같은 뜻이면 읽는다", () => {
  const index = mapHeaders(["주문일자", "판매채널", "품번", "상품명", "결제금액(원)", "주문 건수", "판매수량"]);
  assert.deepEqual([index.date, index.channel, index.sku, index.name, index.revenue, index.orders, index.quantity], [0, 1, 2, 3, 4, 5, 6]);
});

test("날짜·숫자·채널 정리", () => {
  assert.equal(parseDateCell("2026-11-05"), "2026-11-05");
  assert.equal(parseDateCell("2026.11.5"), "2026-11-05");
  assert.equal(parseDateCell("20261105"), "2026-11-05");
  assert.equal(parseDateCell("2026년 11월 5일"), "2026-11-05");
  assert.equal(parseDateCell(46331), "2026-11-05"); // 엑셀 일련번호
  assert.equal(parseDateCell(new Date(Date.UTC(2026, 10, 5))), "2026-11-05");
  assert.equal(parseDateCell("어제"), null);
  assert.equal(parseNumberCell("1,234,000원"), 1234000);
  assert.equal(parseNumberCell(""), null);
  assert.ok(Number.isNaN(parseNumberCell("없음")));
  assert.equal(normalizeChannel("네이버 스마트스토어"), "네이버");
  assert.equal(normalizeChannel("Coupang"), "쿠팡");
  assert.equal(normalizeChannel("무신사"), "무신사");
});

test("매출: 상품을 품번·이름으로 찾고, 같은 일자·채널·상품은 합치고, 문제 줄은 사유와 함께 뺀다", () => {
  const result = parseSales({ headers: ["일자", "채널", "상품코드", "상품명", "매출액", "주문수", "수량"], rows: [
    ["2026-11-05", "쿠팡", "ab-lb-001", "", "1,000,000", 40, 50],
    ["2026-11-05", "쿠팡", "AB-LB-001", "", 500000, 10, 20],
    ["2026-11-05", "올리브영", "", "B 쿠션", 300000, 8, 8],
    ["2026-11-05", "자사몰", "NEW-001", "신상품", 100000, 2, 2],
    ["", "쿠팡", "AB-LB-001", "", 1000, 1, 1],
    ["2026-11-05", "쿠팡", "AB-LB-001", "", "모름", 1, 1],
    [null, null, null, null, null, null, null],
  ] }, products);
  assert.deepEqual(result.missing, []);
  assert.equal(result.totalRows, 6);
  assert.equal(result.rows.length, 3);
  const lip = result.rows.find((row) => row.productId === "p1")!;
  assert.deepEqual([lip.revenue, lip.orders, lip.quantity, lip.channel], [1500000, 50, 70, "쿠팡"]);
  assert.equal(result.unmatched, 1);
  assert.deepEqual(result.issues.map((issue) => issue.reason), ["일자를 읽지 못함", "매출액이 숫자가 아님"]);
});

test("필수 열이 없으면 무엇이 빠졌는지 알려준다", () => {
  assert.deepEqual(parseSales({ headers: ["날짜", "금액"], rows: [] }, products).missing, ["채널", "매출액", "상품코드 또는 상품명"]);
  assert.deepEqual(parseInventory({ headers: ["상품명"], rows: [] }, products).missing, ["현재고"]);
});

test("재고: 등록된 상품만 반영하고 선택 열은 비워도 된다", () => {
  const result = parseInventory({ headers: ["품번", "상품명", "현재고", "리드타임"], rows: [
    ["AB-LB-001", "", "1,200", 7], ["", "B 쿠션", 300, ""], ["", "없는 상품", 10, 3],
  ] }, products);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows[1], { row: 3, productId: "p2", productName: "B 쿠션", stockQty: 300, dailySales: null, leadTimeDays: null, safetyStock: null });
  assert.match(result.issues[0].reason, /등록되지 않은 상품\(없는 상품\)/);
  assert.deepEqual(inventoryFigures(300, 60, 7, 120), { stockDays: 5, status: "발주 필요", recommendedOrderQty: 240 });
});

test("CSV: 따옴표 안 쉼표·한글(EUC-KR) 파일을 읽는다", () => {
  assert.deepEqual(parseCsv('일자,상품명,매출액\r\n2026-11-05,"A 립밤, 미니","1,000"\n'), [["일자", "상품명", "매출액"], ["2026-11-05", "A 립밤, 미니", "1,000"]]);
  const eucKr = new Uint8Array([0xc0, 0xcf, 0xc0, 0xda]); // "일자"
  assert.equal(decodeCsv(eucKr), "일자");
});
