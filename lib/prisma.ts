import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientSingleton;
};

// The client is a union of the Accelerate-extended and direct clients whose call
// signatures don't unify, so — as before this file was made lazy — it's exposed
// as `any` to callers. Keeps the delegate typing behavior identical to before.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientSingleton = any;

// Set PRISMA_LOG=1 to surface each query and its duration when profiling slow
// endpoints; otherwise stay quiet except for warnings/errors.
const logLevels: ("query" | "info" | "warn" | "error")[] = process.env.PRISMA_LOG
  ? ["query", "info", "warn", "error"]
  : ["warn", "error"];

function createClient() {
  // Read DATABASE_URL here (not at module load) so importing this file — e.g.
  // during a Trigger.dev deploy build, which indexes task files by importing
  // them — never requires the env var. It's only needed at first real use.
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is required but is unset or empty."
    );
  }

  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
      log: logLevels,
    }).$extends(withAccelerate());
  }

  if (databaseUrl.includes(".prisma.io")) {
    const adapter = new PrismaPostgresAdapter({ connectionString: databaseUrl });
    return new PrismaClient({ adapter, log: logLevels });
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: logLevels });
}

// The instantiated client, created lazily on first access and cached for the
// lifetime of the module (plus reused across dev HMR reloads via globalThis).
let client: PrismaClientSingleton | undefined;

function getClient(): PrismaClientSingleton {
  if (client) return client;
  client = globalForPrisma.prisma ?? createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

// Lazy proxy: the underlying client (and its DATABASE_URL requirement) is only
// created on first property access. This keeps `import { prisma }` side-effect
// free so build/indexing steps that import this module don't need a database.
export const prisma: PrismaClientSingleton = new Proxy(
  {} as PrismaClientSingleton,
  {
    get(_target, prop, receiver) {
      const target = getClient();
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }
);
