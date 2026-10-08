import { PrismaClient } from "../generated/prisma";
import { seedDemoData } from "../lib/db/seed-demo";

const prisma = new PrismaClient();

async function main() {
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
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
