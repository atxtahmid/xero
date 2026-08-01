import { PrismaClient } from "@prisma/client";

type GlobalPrisma = {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrisma;

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

process.on("beforeExit", async () => {
  await db.$disconnect();
});

export default db;