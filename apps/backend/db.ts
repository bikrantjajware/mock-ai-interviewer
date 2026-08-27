import { PrismaClient } from "./generates/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; // Match your database driver

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// Export a single global client instance
export const prisma = new PrismaClient({ adapter });
