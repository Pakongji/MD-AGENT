-- 엑셀 업로드로 넣는 매출 원장과 업로드 이력. 기존 자료를 바꾸지 않는 추가 전용 변경입니다.
BEGIN;

CREATE TABLE "SalesRecord" (
  "id" TEXT PRIMARY KEY,
  "date" TIMESTAMP(3) NOT NULL,
  "channel" TEXT NOT NULL,
  "productKey" TEXT NOT NULL,
  "sku" TEXT NOT NULL DEFAULT '',
  "productName" TEXT NOT NULL DEFAULT '',
  "productId" TEXT,
  "revenue" INTEGER NOT NULL,
  "orders" INTEGER NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "importId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "SalesRecord_date_channel_productKey_key" ON "SalesRecord" ("date", "channel", "productKey");
CREATE INDEX "SalesRecord_date_idx" ON "SalesRecord" ("date");
CREATE INDEX "SalesRecord_productId_idx" ON "SalesRecord" ("productId");

CREATE TABLE "DataImport" (
  "id" TEXT PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL,
  "appliedRows" INTEGER NOT NULL,
  "skippedRows" INTEGER NOT NULL,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "summary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "DataImport_kind_createdAt_idx" ON "DataImport" ("kind", "createdAt");

ALTER TABLE "SalesRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataImport" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SalesRecord", "DataImport" FROM anon, authenticated;

COMMIT;
