import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL environment variable is required but is unset or empty.");
}
const databaseUrl: string = url;

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma?: any;
};

// Set PRISMA_LOG=1 to surface each query and its duration when profiling slow
// endpoints; otherwise stay quiet except for warnings/errors.
const logLevels: ("query" | "info" | "warn" | "error")[] = process.env.PRISMA_LOG
  ? ["query", "info", "warn", "error"]
  : ["warn", "error"];

function createAccelerateClient() {
  return new PrismaClient({
    accelerateUrl: databaseUrl,
    log: logLevels,
  }).$extends(withAccelerate());
}

function createDirectClient() {
  if (databaseUrl.includes(".prisma.io")) {
    const adapter = new PrismaPostgresAdapter({ connectionString: databaseUrl });
    return new PrismaClient({ adapter, log: logLevels });
  }
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: logLevels });
}

export const prisma =
  globalForPrisma.prisma ??
  (databaseUrl.startsWith("prisma+postgres://")
    ? createAccelerateClient()
    : createDirectClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

