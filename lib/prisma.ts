import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const databaseUrl = process.env.DATABASE_URL || "";

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma?: any;
};

function createAccelerateClient() {
  return new PrismaClient({
    accelerateUrl: databaseUrl,
  }).$extends(withAccelerate());
}

function createDirectClient() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ??
  (databaseUrl.startsWith("prisma+postgres://")
    ? createAccelerateClient()
    : createDirectClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
