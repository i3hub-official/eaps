// src/lib/server/system/flags.ts
import { getPrismaClient } from '$lib/server/db/index.js';

export interface SystemFlags {
	maintenance: boolean;
	shutdown: boolean;
	launchSoon: boolean;
	launchDateISO: string | null;
}

export async function getSystemFlags(): Promise<SystemFlags> {
	try {
		const prisma = await getPrismaClient();

		const flags = await prisma.systemFlag.findMany({
			where: {
				key: {
					in: ['maintenance', 'shutdown', 'launchSoon', 'launchDateISO']
				}
			}
		});

		const result: SystemFlags = {
			maintenance: flags.find(f => f.key === 'maintenance')?.value === 'true',
			shutdown: flags.find(f => f.key === 'shutdown')?.value === 'true',
			launchSoon: flags.find(f => f.key === 'launchSoon')?.value === 'true',
			launchDateISO: flags.find(f => f.key === 'launchDateISO')?.value || null
		};

		return result;
	} catch (error) {
		console.error('Error getting system flags:', error);
		return {
			maintenance: false,
			shutdown: false,
			launchSoon: false,
			launchDateISO: null
		};
	}
}

/**
 * Set a boolean system flag (maintenance / shutdown / launchSoon)
 */
export async function setSystemFlag(
	key: 'maintenance' | 'shutdown' | 'launchSoon',
	value: boolean,
	userId: string
): Promise<void> {
	try {
		const prisma = await getPrismaClient();
		const stringValue = value ? 'true' : 'false';

		const existing = await prisma.systemFlag.findUnique({ where: { key } });

		if (existing) {
			await prisma.systemFlag.update({
				where: { key },
				data: { value: stringValue, updatedAt: new Date(), updatedBy: userId }
			});
		} else {
			await prisma.systemFlag.create({
				data: { key, value: stringValue, updatedAt: new Date(), updatedBy: userId }
			});
		}

		try {
			await prisma.auditLog.create({
				data: {
					actorType: 'staff',
					staffId: userId,
					action: 'SYSTEM_FLAG_UPDATED',
					entity: 'SystemFlag',
					entityId: key,
					afterData: { key, value },
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
 * Set the launch datetime (ISO string, or null to clear it)
 */
export async function setLaunchDate(isoString: string | null, userId: string): Promise<void> {
	const prisma = await getPrismaClient();
	const key = 'launchDateISO';

	if (isoString === null) {
		await prisma.systemFlag.deleteMany({ where: { key } });
	} else {
		// Validate before persisting
		if (Number.isNaN(new Date(isoString).getTime())) {
			throw new Error('Invalid ISO datetime string');
		}

		const existing = await prisma.systemFlag.findUnique({ where: { key } });

		if (existing) {
			await prisma.systemFlag.update({
				where: { key },
				data: { value: isoString, updatedAt: new Date(), updatedBy: userId }
			});
		} else {
			await prisma.systemFlag.create({
				data: { key, value: isoString, updatedAt: new Date(), updatedBy: userId }
			});
		}
	}

	try {
		await prisma.auditLog.create({
			data: {
				actorType: 'staff',
				staffId: userId,
				action: 'LAUNCH_DATE_UPDATED',
				entity: 'SystemFlag',
				entityId: 'launchDateISO',
				afterData: { launchDateISO: isoString },
			}
		});
	} catch {
		// ignore audit log failures
	}
}

export function clearFlagCache(): void {
	console.log('Cache clear called but no Redis configured');
}