import { PrismaClient } from "@prisma/client";

const clients: Record<string, PrismaClient> = {};

export function getMonitorClient(env: "dev" | "prod"): PrismaClient {
  const url =
    env === "prod"
      ? process.env.MONITOR_PROD_DATABASE_URL
      : process.env.MONITOR_DEV_DATABASE_URL || process.env.DATABASE_URL;

  if (!url) throw new Error(`No database URL configured for ${env}`);

  if (!clients[env]) {
    clients[env] = new PrismaClient({
      datasourceUrl: url,
    });
  }
  return clients[env];
}
