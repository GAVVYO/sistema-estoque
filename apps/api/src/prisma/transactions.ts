import { setTimeout as delay } from 'node:timers/promises';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from './prisma.service';

export async function lockOperation(tx: Prisma.TransactionClient, key: string) {
  await tx.$executeRaw`INSERT INTO "OperationLock" ("key") VALUES (${key}) ON DUPLICATE KEY UPDATE "key" = "key"`;
  await tx.$queryRaw`SELECT "key" FROM "OperationLock" WHERE "key" = ${key} FOR UPDATE`;
}

export async function writeTransaction<T>(db: PrismaService, operation: (tx: Prisma.TransactionClient) => Promise<T>, options?: { timeout?: number; maxWait?: number; isolationLevel?: Prisma.TransactionIsolationLevel }) {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(operation, { isolationLevel: 'ReadCommitted', ...options }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt >= 2) throw error;
      // Retry only whole rolled-back transactions, never individual stock writes.
      await delay(20 * (attempt + 1));
    }
  }
}
