-- 거래처(공급사)와 상품 기준 정보 등록. 기존 자료를 바꾸지 않는 추가 전용 변경입니다.
BEGIN;

CREATE TABLE "Supplier" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "contactName" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "cc" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "deliverTo" TEXT NOT NULL DEFAULT '',
  "paymentTerms" TEXT NOT NULL DEFAULT '',
  "leadTimeDays" INTEGER,
  "memo" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier" ("name");

ALTER TABLE "Brand" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Brand_supplierId_idx" ON "Brand" ("supplierId");

ALTER TABLE "Product" ADD COLUMN "sku" TEXT;
ALTER TABLE "Product" ADD COLUMN "price" INTEGER;
ALTER TABLE "Product" ADD COLUMN "cost" INTEGER;
CREATE UNIQUE INDEX "Product_sku_key" ON "Product" ("sku");

ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Supplier" FROM anon, authenticated;

COMMIT;
