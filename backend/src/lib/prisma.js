import { PrismaClient } from '@prisma/client';

// One PrismaClient per process. DATABASE_URL is read from backend/.env (local)
// or from the hosting platform's secret settings (staging). It is never sent to the browser.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__shopsmartPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.__shopsmartPrisma = prisma;
