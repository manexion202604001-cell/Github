import 'server-only'
import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client のシングルトン。
 * Component から直接 import せず、必ず feature の service 層を経由すること(要件121)。
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
