// src/lib/server/system/flags.ts
import { getPrismaClient } from '$lib/server/db/index.js';

export interface SystemFlags {
  maintenance: boolean;
  shutdown: boolean;
}

/**
 * Get system flags
 */
export async function getSystemFlags(): Promise<SystemFlags> {
  try {
    const prisma = await getPrismaClient();

    // Get from database
    const flags = await prisma.systemFlag.findMany({
      where: {
        key: {
          in: ['maintenance', 'shutdown']
        }
      }
    });

    // Convert to boolean values (schema stores value as text)
    const result: SystemFlags = {
      maintenance: flags.find(f => f.key === 'maintenance')?.value === 'true',
      shutdown: flags.find(f => f.key === 'shutdown')?.value === 'true'
    };

    return result;
  } catch (error) {
    console.error('Error getting system flags:', error);
    // Return defaults if there's an error
    return {
      maintenance: false,
      shutdown: false
    };
  }
}
/**
 * Set a system flag
 */
export async function setSystemFlag(
  key: 'maintenance' | 'shutdown',
  value: boolean,
  userId: string
): Promise<void> {
  try {
    const prisma = await getPrismaClient();
    const stringValue = value ? 'true' : 'false';

    // Check if flag exists
    const existing = await prisma.systemFlag.findUnique({
      where: { key }
    });

    if (existing) {
      // Update existing flag
      await prisma.systemFlag.update({
        where: { key },
        data: {
          value: stringValue,
          updatedAt: new Date(),
          updatedBy: userId
        }
      });
    } else {
      // Create new flag (id auto-generated via @default(cuid()))
      await prisma.systemFlag.create({
        data: {
          key,
          value: stringValue,
          updatedAt: new Date(),
          updatedBy: userId
        }
      });
    }

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          actorType: 'staff', // system flags are only settable by staff/SUPER_ADMIN
          action: 'SYSTEM_FLAG_UPDATED',
          details: `System flag "${key}" set to ${value}`,
          timestamp: new Date()
        }
      });
    } catch {
      console.log(`[AUDIT] User ${userId} set flag ${key} to ${value}`);
    }
  } catch (error) {
    console.error(`Error setting system flag ${key}:`, error);
    throw error;
  }
}

/**
 * Clear the system flags cache - no-op since we don't use Redis
 */
export function clearFlagCache(): void {
  // No cache to clear since we don't use Redis
  console.log('Cache clear called but no Redis configured');
}