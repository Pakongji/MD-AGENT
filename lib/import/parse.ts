/**
 * 엑셀·CSV 업로드 해석. 열 이름이 조금 달라도(일자/날짜/주문일 등) 읽고, 줄마다 문제를 모아 미리보기로 보여줍니다.
 * 파일을 읽는 부분(read-table.ts)과 분리해 테스트할 수 있게 둡니다.
 */
export type ImportKind = "sales" | "inventory";
export type Table = { headers: string[]; rows: unknown[][] };
export type ProductRef = { id: string; name: string; sku?: string | null };
export type Issue = { row: number; reason: string };

const clean = (value: string) => value.replace(/\s|\(.*?\)|_|-/g, "").toLowerCase();

const ALIASES: Record<string, string[]> = {
  date: ["일자", "날짜", "주문일", "주문일자", "결제일", "판매일", "date"],
  channel: ["채널", "판매채널", "판매처", "몰", "쇼핑몰", "channel"],
  sku: ["상품코드", "품번", "sku", "상품번호", "자사상품코드", "바코드"],
  name: ["상품명", "상품", "품목", "품목명", "product", "productname"],
  revenue: ["매출액", "매출", "판매금액", "결제금액", "판매액", "주문금액", "revenue", "sales"],
  orders: ["주문수", "주문건수", "주문", "orders"],
  quantity: ["판매수량", "수량", "판매량", "qty", "quantity"],
  stock: ["현재고", "재고", "재고수량", "가용재고", "stock"],
  dailySales: ["일평균판매", "일평균판매량", "일판매량", "dailysales"],
  leadTime: ["리드타임", "리드타임일", "납기", "leadtime"],
  safetyStock: ["안전재고", "safetystock"],
};

/** 헤더 이름 → 표준 키 위치 */
export function mapHeaders(headers: string[]) {
  const index: Record<string, number> = {};
  headers.forEach((header, position) => {
    const key = clean(String(header ?? ""));
    for (const [field, names] of Object.entries(ALIASES)) {
      if (index[field] === undefined && names.some((name) => clean(name) === key)) index[field] = position;
    }
  });
  return index;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** 날짜 칸 → "YYYY-MM-DD". 엑셀 날짜·일련번호·2026-11-05·2026.11.05·20261105·11/05/2026 지원 */
export function parseDateCell(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    // 엑셀 날짜는 UTC 자정으로 읽히므로 UTC 기준 날짜를 씁니다.
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }
  const text = String(value).trim();
  let match = /^(\d{4})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/.exec(text);
  if (!match) { const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(text); if (compact) match = compact; }
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${year}-${pad(month)}-${pad(day)}`;
  }
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (us) return `${us[3]}-${pad(Number(us[1]))}-${pad(Number(us[2]))}`;
  return null;
}

/** 숫자 칸: "1,234,000원", " 12 개" 등 → 숫자. 비었으면 null, 숫자가 아니면 NaN */
export function parseNumberCell(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const text = String(value).replace(/[,\s원개건₩]/g, "");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

const CHANNEL_ALIASES: Array<[RegExp, string]> = [
  [/쿠팡|coupang/i, "쿠팡"], [/올리브영|olive/i, "올리브영"], [/자사|공식몰|cafe24|카페24|own/i, "자사몰"], [/네이버|스마트스토어|naver|smartstore/i, "네이버"],
];
export function normalizeChannel(value: unknown) {
  const text = String(value ?? "").trim();
  return CHANNEL_ALIASES.find(([pattern]) => pattern.test(text))?.[1] ?? text;
}

/** 품번(대소문자·공백 무시) 우선, 없으면 상품명 정확히 일치 */
export function matchProduct(products: ProductRef[], sku: string, name: string) {
  const skuKey = sku.replace(/\s/g, "").toLowerCase();
  if (skuKey) {
    const bySku = products.find((product) => (product.sku ?? "").replace(/\s/g, "").toLowerCase() === skuKey);
    if (bySku) return bySku;
  }
  const nameKey = name.replace(/\s+/g, " ").trim();
  return nameKey ? products.find((product) => product.name === nameKey) : undefined;
}

const cell = (row: unknown[], index: number | undefined) => (index === undefined ? undefined : row[index]);
const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());
const isBlankRow = (row: unknown[]) => row.every((value) => value === null || value === undefined || String(value).trim() === "");

export type SalesRow = { row: number; date: string; channel: string; sku: string; productName: string; productId: string | null; revenue: number; orders: number; quantity: number };
export type InventoryRow = { row: number; productId: string; productName: string; stockQty: number; dailySales: number | null; leadTimeDays: number | null; safetyStock: number | null };

export const REQUIRED: Record<ImportKind, { fields: string[]; label: string }> = {
  sales: { fields: ["date", "channel", "revenue"], label: "일자·채널·매출액 열과, 상품코드 또는 상품명 열" },
  inventory: { fields: ["stock"], label: "현재고 열과, 상품코드 또는 상품명 열" },
};

function missingColumns(kind: ImportKind, index: Record<string, number>) {
  const names: Record<string, string> = { date: "일자", channel: "채널", revenue: "매출액", stock: "현재고" };
  const missing = REQUIRED[kind].fields.filter((field) => index[field] === undefined).map((field) => names[field]);
  if (index.sku === undefined && index.name === undefined) missing.push("상품코드 또는 상품명");
  return missing;
}

/** 매출: 같은 일자·채널·상품이 여러 줄이면 합칩니다. 상품을 못 찾아도 일별·채널 합계에는 반영합니다. */
export function parseSales(table: Table, products: ProductRef[]) {
  const index = mapHeaders(table.headers);
  const missing = missingColumns("sales", index);
  const issues: Issue[] = [];
  const merged = new Map<string, SalesRow>();
  let unmatched = 0;
  if (missing.length) return { rows: [] as SalesRow[], issues, missing, unmatched, totalRows: table.rows.filter((row) => !isBlankRow(row)).length };
  table.rows.forEach((row, offset) => {
    if (isBlankRow(row)) return;
    const line = offset + 2;
    const date = parseDateCell(cell(row, index.date));
    const channel = normalizeChannel(cell(row, index.channel));
    const sku = text(cell(row, index.sku));
    const productName = text(cell(row, index.name));
    const revenue = parseNumberCell(cell(row, index.revenue));
    const orders = parseNumberCell(cell(row, index.orders));
    const quantity = parseNumberCell(cell(row, index.quantity));
    if (!date) return void issues.push({ row: line, reason: "일자를 읽지 못함" });
    if (!channel) return void issues.push({ row: line, reason: "채널이 비어 있음" });
    if (revenue === null || Number.isNaN(revenue) || revenue < 0) return void issues.push({ row: line, reason: "매출액이 숫자가 아님" });
    if ([orders, quantity].some((value) => value !== null && (Number.isNaN(value) || value < 0))) return void issues.push({ row: line, reason: "주문수·수량이 숫자가 아님" });
    if (!sku && !productName) return void issues.push({ row: line, reason: "상품코드·상품명이 모두 비어 있음" });
    const product = matchProduct(products, sku, productName);
    if (!product) unmatched += 1;
    const key = `${date}|${channel}|${product?.id ?? (sku || productName)}`;
    const existing = merged.get(key);
    if (existing) { existing.revenue += Math.round(revenue); existing.orders += Math.round(orders ?? 0); existing.quantity += Math.round(quantity ?? 0); return; }
    merged.set(key, { row: line, date, channel, sku, productName: product?.name ?? productName, productId: product?.id ?? null, revenue: Math.round(revenue), orders: Math.round(orders ?? 0), quantity: Math.round(quantity ?? 0) });
  });
  return { rows: [...merged.values()], issues, missing, unmatched, totalRows: table.rows.filter((row) => !isBlankRow(row)).length };
}

/** 재고: 등록된 상품과 맞는 줄만 반영합니다(새 상품은 데이터 등록에서 먼저 등록). */
export function parseInventory(table: Table, products: ProductRef[]) {
  const index = mapHeaders(table.headers);
  const missing = missingColumns("inventory", index);
  const issues: Issue[] = [];
  const rows = new Map<string, InventoryRow>();
  if (missing.length) return { rows: [] as InventoryRow[], issues, missing, totalRows: table.rows.filter((row) => !isBlankRow(row)).length };
  table.rows.forEach((row, offset) => {
    if (isBlankRow(row)) return;
    const line = offset + 2;
    const sku = text(cell(row, index.sku));
    const name = text(cell(row, index.name));
    const stock = parseNumberCell(cell(row, index.stock));
    const optional = (field: string) => { const value = parseNumberCell(cell(row, index[field])); return value === null ? null : value; };
    const [dailySales, leadTimeDays, safetyStock] = [optional("dailySales"), optional("leadTime"), optional("safetyStock")];
    if (stock === null || Number.isNaN(stock) || stock < 0) return void issues.push({ row: line, reason: "현재고가 숫자가 아님" });
    if ([dailySales, leadTimeDays, safetyStock].some((value) => value !== null && (Number.isNaN(value) || value < 0))) return void issues.push({ row: line, reason: "일평균 판매·리드타임·안전재고가 숫자가 아님" });
    const product = matchProduct(products, sku, name);
    if (!product) return void issues.push({ row: line, reason: `등록되지 않은 상품(${sku || name}) — 데이터 등록에서 먼저 등록하거나 품번을 맞춰주세요` });
    if (rows.has(product.id)) issues.push({ row: line, reason: `${product.name}이(가) 여러 줄 — 마지막 줄로 반영` });
    rows.set(product.id, { row: line, productId: product.id, productName: product.name, stockQty: Math.round(stock), dailySales: dailySales === null ? null : Math.round(dailySales), leadTimeDays: leadTimeDays === null ? null : Math.round(leadTimeDays), safetyStock: safetyStock === null ? null : Math.round(safetyStock) });
  });
  return { rows: [...rows.values()], issues, missing, totalRows: table.rows.filter((row) => !isBlankRow(row)).length };
}

/** 재고 지표 다시 계산(재고 화면과 같은 규칙) */
export function inventoryFigures(stockQty: number, dailySales: number, leadTimeDays: number, safetyStock: number) {
  const stockDays = dailySales > 0 ? Math.floor(stockQty / dailySales) : 999;
  const status = stockDays < leadTimeDays ? "발주 필요" : stockDays < leadTimeDays * 2 ? "주의" : stockDays >= 30 ? "과재고" : "양호";
  const recommendedOrderQty = Math.max(0, Math.ceil(safetyStock + dailySales * leadTimeDays - stockQty));
  return { stockDays, status, recommendedOrderQty };
}
