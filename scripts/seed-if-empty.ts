import { PrismaClient } from "../generated/prisma";
import { seedDemoData } from "../lib/db/seed-demo";
import { assertDatabaseEnvironment } from "../lib/db/config";
import { logDatabaseError } from "../lib/db/errors";

const prisma = new PrismaClient();

async function main() {
  assertDatabaseEnvironment();
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    console.log("Existing data found. Demo seed skipped.");
    return;
  }

  await seedDemoData(prisma);
  console.log("Empty database initialized with demo data.");
}

main()
  .catch((error) => {
    logDatabaseError(error, "빈 DB 시드");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
