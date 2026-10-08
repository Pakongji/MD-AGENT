import { PrismaClient } from "../generated/prisma";
import { seedDemoData } from "../lib/db/seed-demo";

const prisma = new PrismaClient();

seedDemoData(prisma)
  .then(() => console.log("Demo data seeded."))
  .finally(async () => prisma.$disconnect());
