-- 사용자 권한(역할·권한·사용 여부)과 공급사 품목. 기존 자료를 바꾸지 않는 추가 전용 변경입니다.
BEGIN;

-- 지금까지 모든 계정이 전체 기능을 썼으므로 기존 계정은 관리자로 둡니다. 이후 새로 가입하는 계정은 조회 전용으로 시작합니다.
ALTER TABLE "Account" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "Account" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY['task','decide','order','promotion','master','users','reset']::TEXT[];
ALTER TABLE "Account" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Account" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "Account" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
ALTER TABLE "Account" ALTER COLUMN "permissions" SET DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "SupplierProduct" (
  "id" TEXT PRIMARY KEY,
  "supplierId" TEXT NOT NULL REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "supplierSku" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT '',
  "unitCost" INTEGER,
  "moq" INTEGER,
  "leadTimeDays" INTEGER,
  "memo" TEXT NOT NULL DEFAULT '',
  "linkedProductId" TEXT REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "SupplierProduct_supplierId_name_key" ON "SupplierProduct" ("supplierId", "name");
CREATE INDEX "SupplierProduct_linkedProductId_idx" ON "SupplierProduct" ("linkedProductId");

ALTER TABLE "SupplierProduct" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SupplierProduct" FROM anon, authenticated;

COMMIT;
