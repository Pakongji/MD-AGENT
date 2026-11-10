import type { PrismaClient } from "@/generated/prisma";
import type { Command } from "@/lib/validation/commands";

const DAY = 86_400_000;

/** 거래처 저장(새로 만들기·수정). 선택한 브랜드를 이 거래처에 연결하고, 선택에서 뺀 브랜드는 연결을 풉니다. */
export async function saveSupplier(db: PrismaClient, command: Extract<Command, { type: "SAVE_SUPPLIER" }>) {
  const data = {
    name: command.name.trim(), contactName: command.contactName.trim(), email: command.email.trim(), cc: command.cc.trim(), phone: command.phone.trim(),
    deliverTo: command.deliverTo.trim(), paymentTerms: command.paymentTerms.trim(), leadTimeDays: command.leadTimeDays ?? null, memo: command.memo.trim(),
  };
  return db.$transaction(async (tx) => {
    const duplicate = await tx.supplier.findFirst({ where: { name: data.name, ...(command.id ? { id: { not: command.id } } : {}) } });
    if (duplicate) throw new Error(`‘${data.name}’ 거래처가 이미 있습니다.`);
    const supplier = command.id
      ? await tx.supplier.update({ where: { id: command.id }, data })
      : await tx.supplier.create({ data });
    await tx.brand.updateMany({ where: { supplierId: supplier.id, id: { notIn: command.brandIds } }, data: { supplierId: null } });
    if (command.brandIds.length) await tx.brand.updateMany({ where: { id: { in: command.brandIds } }, data: { supplierId: supplier.id } });
    return command.id ? `‘${supplier.name}’ 거래처를 수정했습니다.` : `‘${supplier.name}’ 거래처를 등록했습니다.${command.brandIds.length ? ` 연결한 브랜드 ${command.brandIds.length}개의 발주서에 자동으로 들어갑니다.` : ""}`;
  });
}

/** 거래처 삭제. 연결된 브랜드는 연결만 풀리고(브랜드·상품은 그대로), 발주서는 샘플/직접 입력으로 돌아갑니다. */
export async function deleteSupplier(db: PrismaClient, command: Extract<Command, { type: "DELETE_SUPPLIER" }>) {
  const supplier = await db.supplier.findUnique({ where: { id: command.id } });
  if (!supplier) return "이미 삭제된 거래처입니다.";
  await db.supplier.delete({ where: { id: command.id } });
  return `‘${supplier.name}’ 거래처를 삭제했습니다. 연결된 브랜드의 상품은 그대로 남습니다.`;
}

/** 자사 상품 저장. 새 브랜드면 함께 만들고, 재고 정보를 넣으면 재고·발주 화면에 바로 나오도록 재고도 만듭니다. */
export async function saveProduct(db: PrismaClient, command: Extract<Command, { type: "SAVE_PRODUCT" }>, now = new Date()) {
  const name = command.name.trim();
  const brandName = command.brandName.trim();
  const sku = command.sku?.trim() || null;
  const marginRate = command.price && command.cost != null && command.price > 0 ? Math.round((command.price - command.cost) / command.price * 1000) / 10 : null;
  return db.$transaction(async (tx) => {
    const duplicate = await tx.product.findFirst({ where: { OR: [{ name }, ...(sku ? [{ sku }] : [])], ...(command.id ? { id: { not: command.id } } : {}) } });
    if (duplicate) throw new Error(duplicate.name === name ? `‘${name}’ 상품이 이미 있습니다.` : `품번 ${sku}을(를) 쓰는 상품이 이미 있습니다.`);
    const brand = await tx.brand.upsert({ where: { name: brandName }, update: command.supplierId !== undefined ? { supplierId: command.supplierId || null } : {}, create: { name: brandName, status: "신규", supplierId: command.supplierId || null } });
    const fields = { name, category: command.category.trim(), sku, ...(command.imageUrl !== undefined ? { imageUrl: command.imageUrl || null } : {}), price: command.price ?? null, cost: command.cost ?? null, brandId: brand.id, ...(marginRate !== null ? { marginRate } : {}) };
    const product = command.id
      ? await tx.product.update({ where: { id: command.id }, data: fields })
      : await tx.product.create({ data: { ...fields, lifecycle: "신규", revenue: 0, salesQty: 0, marginRate: marginRate ?? 0, risk: "신규 등록" } });

    if (command.stock) {
      const { stockQty, dailySales, leadTimeDays, safetyStock } = command.stock;
      const stockDays = dailySales > 0 ? Math.floor(stockQty / dailySales) : 999;
      const status = stockDays < leadTimeDays ? "발주 필요" : stockDays < leadTimeDays * 2 ? "주의" : stockDays >= 30 ? "과재고" : "양호";
      const recommendedOrderQty = Math.max(0, Math.ceil(safetyStock + dailySales * leadTimeDays - stockQty));
      const values = { stockQty, dailySales, stockDays, leadTimeDays, safetyStock, status, recommendedOrderQty, expectedStockoutDate: new Date(now.getTime() + Math.min(stockDays, 365) * DAY) };
      await tx.inventory.upsert({ where: { productId: product.id }, update: values, create: { productId: product.id, ...values } });
    }
    return command.id ? `‘${name}’ 상품을 수정했습니다.` : `‘${name}’ 상품을 등록했습니다.${command.stock ? " 재고·발주 화면에도 추가됐어요." : ""}`;
  });
}

/** 공급사 품목 저장. 자사 상품과 연결하면 그 상품 발주서에 공급가·MOQ가 들어갑니다. */
export async function saveSupplierProduct(db: PrismaClient, command: Extract<Command, { type: "SAVE_SUPPLIER_PRODUCT" }>) {
  const data = {
    supplierId: command.supplierId, name: command.name.trim(), supplierSku: command.supplierSku.trim(), category: command.category.trim(),
    unitCost: command.unitCost ?? null, moq: command.moq ?? null, leadTimeDays: command.leadTimeDays ?? null, memo: command.memo.trim(),
    linkedProductId: command.linkedProductId || null,
  };
  const duplicate = await db.supplierProduct.findFirst({ where: { supplierId: data.supplierId, name: data.name, ...(command.id ? { id: { not: command.id } } : {}) } });
  if (duplicate) throw new Error(`이 거래처에 ‘${data.name}’ 품목이 이미 있습니다.`);
  if (command.id) await db.supplierProduct.update({ where: { id: command.id }, data });
  else await db.supplierProduct.create({ data });
  return command.id ? `‘${data.name}’ 공급사 품목을 수정했습니다.` : `‘${data.name}’ 공급사 품목을 등록했습니다.${data.linkedProductId ? " 연결한 자사 상품 발주서에 공급가가 들어갑니다." : ""}`;
}

export async function deleteSupplierProduct(db: PrismaClient, command: Extract<Command, { type: "DELETE_SUPPLIER_PRODUCT" }>) {
  const item = await db.supplierProduct.findUnique({ where: { id: command.id } });
  if (!item) return "이미 삭제된 품목입니다.";
  await db.supplierProduct.delete({ where: { id: command.id } });
  return `‘${item.name}’ 공급사 품목을 삭제했습니다.`;
}

/** 경쟁사 변화 저장: 경쟁사는 이름으로 찾거나 새로 만듭니다. 날짜는 한국 시간 시작일 00:00 ~ 종료일 23:59입니다. */
export async function saveCompetitorEvent(db: PrismaClient, command: Extract<Command, { type: "SAVE_COMPETITOR_EVENT" }>) {
  const startAt = new Date(`${command.startDate}T00:00:00+09:00`);
  const endAt = new Date(`${command.endDate}T23:59:59+09:00`);
  if (endAt < startAt) throw new Error("종료일이 시작일보다 빠를 수 없어요.");
  const competitor = await db.competitor.upsert({ where: { name: command.competitorName.trim() }, update: {}, create: { name: command.competitorName.trim() } });
  const data = {
    competitorId: competitor.id, type: command.eventType, title: command.title.trim(), detail: command.detail.trim(), overlapDescription: command.overlapDescription.trim(),
    affectedSkuCount: command.affectedSkuCount ?? 0, impactEstimate: command.impactEstimate ? -Math.abs(command.impactEstimate) : 0, startAt, endAt,
  };
  if (command.id) await db.competitorEvent.update({ where: { id: command.id }, data });
  else await db.competitorEvent.create({ data });
  return command.id ? `‘${data.title}’ 경쟁사 변화를 수정했습니다.` : `‘${data.title}’ 경쟁사 변화를 등록했습니다. 홈과 시장·경쟁 화면에 반영돼요.`;
}

export async function deleteCompetitorEvent(db: PrismaClient, command: Extract<Command, { type: "DELETE_COMPETITOR_EVENT" }>) {
  const event = await db.competitorEvent.findUnique({ where: { id: command.id } });
  if (!event) return "이미 삭제된 경쟁사 변화입니다.";
  await db.competitorEvent.delete({ where: { id: command.id } });
  return `‘${event.title}’ 경쟁사 변화를 삭제했습니다.`;
}
