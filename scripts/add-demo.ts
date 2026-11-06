import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "../generated/prisma";
import { addDemoDataIfEmpty } from "../lib/db/seed-demo";
import { assertDatabaseEnvironment, DatabaseConfigurationError } from "../lib/db/config";
import { logDatabaseError } from "../lib/db/errors";

async function main() {
  let envError = false;
  loadEnvConfig(resolve(__dirname, ".."), process.env.NODE_ENV !== "production", {
    info() {}, error() { envError = true; },
  });
  if (envError) throw new DatabaseConfigurationError(".env 파일을 읽지 못했습니다.");
  assertDatabaseEnvironment();

  const prisma = new PrismaClient();
  try {
    const inserted = await addDemoDataIfEmpty(prisma);
    console.log(inserted
      ? "[DB] 더미데이터를 추가했습니다. 가입 계정과 기존 AI 대화는 보존했습니다."
      : "[DB] 업무 데이터가 이미 있어 추가하지 않았습니다. 기존 데이터를 보존했습니다.");
    const [sales, products] = await Promise.all([prisma.salesMetric.count(), prisma.product.count()]);
    console.log(`[DB] 매출 ${sales}건 · 상품 ${products}개`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  logDatabaseError(error, "더미데이터 추가");
  process.exitCode = 1;
});
