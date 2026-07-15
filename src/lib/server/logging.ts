// src/lib/server/logging.ts
import { getPrismaClient } from '$lib/server/db/index.js'

export type LogLevel = 'error' | 'fatal' | 'warn' | 'warning' | 'info' | 'debug' | 'trace' | 'verbose'

export interface LogContext {
	userId?: string
	userType?: 'staff' | 'student' | 'system'
	ipAddress?: string
	userAgent?: string
	metadata?: Record<string, any>
}

export class SystemLogger {
	private static instance: SystemLogger
	private prisma: any

	constructor() {
		// Lazy load prisma
	}

	private async getPrisma() {
		if (!this.prisma) {
			this.prisma = await getPrismaClient()
		}
		return this.prisma
	}

	async log(
		level: LogLevel,
		message: string,
		source: string,
		context?: LogContext
	): Promise<void> {
		try {
			const prisma = await this.getPrisma()
			await prisma.systemLog.create({
				data: {
					level,
					message,
					source,
					metadata: context?.metadata || {},
					ipAddress: context?.ipAddress,
					userAgent: context?.userAgent,
					userId: context?.userId,
					userType: context?.userType || 'system',
				}
			})
		} catch (error) {
			// Fallback to console if database logging fails
			console.error(`[${source}] ${level}: ${message}`, error)
		}
	}

	async error(message: string, source: string, context?: LogContext): Promise<void> {
		return this.log('error', message, source, context)
	}

	async warn(message: string, source: string, context?: LogContext): Promise<void> {
		return this.log('warn', message, source, context)
	}

	async info(message: string, source: string, context?: LogContext): Promise<void> {
		return this.log('info', message, source, context)
	}

	async debug(message: string, source: string, context?: LogContext): Promise<void> {
		return this.log('debug', message, source, context)
	}
}

export const logger = new SystemLogger()