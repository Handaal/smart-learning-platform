import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Singleton — reuse in dev hot-reload without exhausting connections
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error']
      : ['warn', 'error'],
  });

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;

  (prisma as any).$on('query', (e: any) => {
    logger.debug(`Prisma query: ${e.query} | ${e.duration}ms`);
  });
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
