// src/routes/(admin)/admin/students/+page.server.ts
import type { PageServerLoad } from './$types'
import { requireStaff } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { StaffRole } from '@prisma/client'
import { 
	revealName, 
	revealMatricNumber, 
	revealEmail, 
	revealText,
	isEncrypted 
} from '$lib/security/dataProtection.js'

const PAGE_SIZE = 20

// Tier 1 fields each use their own fixed IV (see FIXED_IV in encryption.ts),
// so decryption must be routed to the matching reveal function -- calling
// revealName() on a matricNumber ciphertext decrypts with the wrong IV and
// fails PKCS7 padding validation on the first/only block.
const TIER1_REVEALERS: Record<string, (v: string) => string> = {
	name: revealName,
	matricNo: revealMatricNumber,
	email: revealEmail,
}

function safeReveal(fn: () => string, fallback: string): string {
	try {
		const result = fn()
		return result || fallback
	} catch (e) {
		console.warn('[students] Failed to decrypt field:', e)
		return fallback
	}
}

// Detects which encryption tier produced a value and calls the matching
// decrypt function.
//   Tier 1 (searchable, fixed IV): pure hex, no separator       -> tier1Field-specific revealer
//   Tier 2 (field, random IV):     "iv:ciphertext"   (1 colon)  -> decryptField (revealText)
//   Tier 3 (secure, GCM):          "iv:tag:ciphertext" (2 colons)
function decryptField(value: string | null | undefined, tier1Field: keyof typeof TIER1_REVEALERS = 'name'): string {
	if (!value) return 'N/A'

	const strValue = String(value)
	if (!isEncrypted(strValue)) return strValue

	const colonCount = (strValue.match(/:/g) || []).length

	if (colonCount >= 1) {
		// Tier 2 (or Tier 3) format -- random IV, not the fixed-IV
		// searchable format. This is what mismatched-encryption rows contain.
		return safeReveal(() => revealText(strValue), '[Encrypted - format mismatch]')
	}

	// No colon -- pure hex, Tier 1 searchable format. Must use the revealer
	// matching this specific field's fixed IV.
	const revealer = TIER1_REVEALERS[tier1Field] || revealName
	return safeReveal(() => revealer(strValue), '[Decrypt failed]')
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireStaff(locals.user)

	if (user.primaryRole !== 'SUPER_ADMIN') {
		return {
			error: 'You do not have permission to view students.',
			students: [],
			pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
			stats: { total: 0, active: 0, suspended: 0, graduated: 0 },
			filters: { search: '', level: 'all', status: 'all', department: 'all' }
		}
	}

	const prisma = await getPrismaClient()

	const page = parseInt(url.searchParams.get('page') || '1')
	const searchQuery = url.searchParams.get('search') || ''
	const levelFilter = url.searchParams.get('level') || 'all'
	const statusFilter = url.searchParams.get('status') || 'all'
	const departmentFilter = url.searchParams.get('department') || 'all'

	const skip = (page - 1) * PAGE_SIZE

	const where: any = {}

	if (searchQuery) {
		where.OR = [
			{ matricNumber: { contains: searchQuery, mode: 'insensitive' } },
			{ firstName: { contains: searchQuery, mode: 'insensitive' } },
			{ lastName: { contains: searchQuery, mode: 'insensitive' } },
			{ email: { contains: searchQuery, mode: 'insensitive' } },
		]
	}

	if (levelFilter !== 'all') {
		where.currentLevelId = levelFilter
	}

	if (statusFilter !== 'all') {
		where.status = statusFilter
	}

	if (departmentFilter !== 'all') {
		where.departmentId = departmentFilter
	}

	const [students, totalCount, levels, departments, stats] = await Promise.all([
		prisma.student.findMany({
			where,
			include: {
				currentLevel: { select: { name: true } },
				department: { select: { name: true, shortName: true } },
				programme: { select: { name: true, shortName: true } },
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: PAGE_SIZE,
		}),
		prisma.student.count({ where }),
		prisma.level.findMany({ orderBy: { name: 'asc' } }),
		prisma.department.findMany({ 
			select: { id: true, name: true, shortName: true },
			orderBy: { name: 'asc' } 
		}),
		prisma.$transaction([
			prisma.student.count(),
			prisma.student.count({ where: { status: 'ACTIVE' } }),
			prisma.student.count({ where: { status: 'SUSPENDED' } }),
			prisma.student.count({ where: { status: 'GRADUATED' } }),
		])
	])

	const totalPages = Math.ceil(totalCount / PAGE_SIZE)

	function decryptStudent(student: any) {
		let name = 'Unknown Student'
		let matricNumber = 'N/A'
		let email = 'Unknown'
		let levelName = 'N/A'
		let departmentName = 'N/A'
		let programmeName = 'N/A'

		try {
			// Decrypt name
			if (student.firstName && student.lastName) {
				const firstName = decryptField(student.firstName, 'name')
				const lastName = decryptField(student.lastName, 'name')
				name = `${firstName} ${lastName}`.trim()
			}

			// Decrypt matric number
			if (student.matricNumber) {
				matricNumber = decryptField(student.matricNumber, 'matricNo')
			}

			// Decrypt email
			if (student.email) {
				email = decryptField(student.email, 'email')
			}

			// Decrypt level name (if encrypted)
			if (student.currentLevel?.name) {
				levelName = decryptField(student.currentLevel.name)
			}

			// Decrypt department name (if encrypted)
			if (student.department?.name) {
				departmentName = decryptField(student.department.name)
			} else if (student.department?.shortName) {
				departmentName = decryptField(student.department.shortName)
			}

			// Decrypt programme name (if encrypted)
			if (student.programme?.name) {
				programmeName = decryptField(student.programme.name)
			} else if (student.programme?.shortName) {
				programmeName = decryptField(student.programme.shortName)
			}
		} catch (e) {
			console.warn('[students] Failed to decrypt student data:', e)
		}

		return {
			id: student.id,
			name,
			matricNumber,
			email,
			level: levelName,
			department: departmentName,
			programme: programmeName,
			status: student.status,
			createdAt: student.createdAt,
			lastLoginAt: student.lastLoginAt,
			faceEnrolledAt: student.faceEnrolledAt,
		}
	}

	const processedStudents = students.map(decryptStudent)

	return {
		students: processedStudents,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems: totalCount,
			pageSize: PAGE_SIZE,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		},
		stats: {
			total: stats[0],
			active: stats[1],
			suspended: stats[2],
			graduated: stats[3],
		},
		levels: levels.map(l => ({ id: l.id, name: decryptField(l.name) })),
		departments: departments.map(d => ({ 
			id: d.id, 
			name: decryptField(d.name), 
			shortName: decryptField(d.shortName) 
		})),
		filters: {
			search: searchQuery,
			level: levelFilter,
			status: statusFilter,
			department: departmentFilter,
		}
	}
}