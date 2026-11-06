import { PrismaClient } from "../generated/prisma";
import { seedDemoData } from "../lib/db/seed-demo";
import { assertDatabaseEnvironment } from "../lib/db/config";
import { logDatabaseError } from "../lib/db/errors";

const prisma = new PrismaClient();

Promise.resolve().then(() => { assertDatabaseEnvironment(); return seedDemoData(prisma); })
  .then(() => console.log("Demo data seeded."))
  .catch((error) => { logDatabaseError(error, "데모 시드"); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
