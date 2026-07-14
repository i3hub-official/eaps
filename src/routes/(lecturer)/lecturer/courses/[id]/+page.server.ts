// src/routes/(lecturer)/lecturer/courses/[id]/+page.server.ts
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { 
  revealName, 
  revealMatricNumber, 
  revealEmail,
  revealText
} from '$lib/security/dataProtection.js'

// Helper to deeply serialize all Decimal objects
// Helper to deeply serialize all Decimal and Date objects
function serializeData(data: any): any {
  if (data === null || data === undefined) return data

  // Dates are already serializable by devalue — pass through untouched
  if (data instanceof Date) return data

  // Decimal.js / Prisma Decimal instances: duck-type instead of relying on
  // constructor.name, which can be wrong/mangled depending on how the
  // value was produced (raw queries, aggregates, bundler renaming, etc.)
  if (
    typeof data === 'object' &&
    typeof data.toNumber === 'function' &&
    typeof data.toFixed === 'function'
  ) {
    return Number(data)
  }

  // BigInt fields (e.g. from counts/aggregates) aren't serializable either
  if (typeof data === 'bigint') return Number(data)

  if (Array.isArray(data)) {
    return data.map(item => serializeData(item))
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {}
    for (const key in data) {
      result[key] = serializeData(data[key])
    }
    return result
  }

  return data
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()
	const courseId = params.id

	// Get the course with all related data
	const course = await prisma.course.findUnique({
		where: { id: courseId },
		include: {
			department: {
				include: {
					college: true
				}
			},
			level: true,
			offerings: {
				where: {
					lecturerId: user.id
				},
				include: {
					semester: {
						include: {
							session: true
						}
					}
				}
			},
			assessments: {
				where: {
					createdById: user.id
				},
				orderBy: {
					createdAt: 'desc'
				}
			},
			questions: {
				where: {
					createdById: user.id,
					isActive: true
				},
				take: 5,
				orderBy: {
					createdAt: 'desc'
				}
			},
			registrations: {
				where: {
					status: 'APPROVED'
				},
				include: {
					student: {
						include: {
							currentLevel: true,
							department: true,
							programme: true
						}
					}
				},
				take: 10,
				orderBy: {
					createdAt: 'desc'
				}
			},
			transcriptEntries: {
				where: {
					studentId: { not: undefined }
				},
				take: 10,
				orderBy: {
					updatedAt: 'desc'
				}
			}
		}
	})

	if (!course) {
		throw error(404, 'Course not found')
	}

	// Verify the lecturer has access to this course
	const hasAccess = course.offerings.some(o => o.lecturerId === user.id)
	if (!hasAccess) {
		throw error(403, 'You do not have access to this course')
	}

	// Get current semester
	const currentSemester = await prisma.semester.findFirst({
		where: { isCurrent: true },
		include: { session: true }
	})

	// Get student count
	const studentCount = await prisma.courseRegistration.count({
		where: {
			courseId: courseId,
			status: 'APPROVED'
		}
	})

	// Get assessment stats
	const assessmentStats = {
		total: course.assessments.length,
		published: course.assessments.filter(a => a.status === 'PUBLISHED' || a.status === 'ACTIVE').length,
		draft: course.assessments.filter(a => a.status === 'DRAFT').length,
		completed: course.assessments.filter(a => a.status === 'ENDED').length
	}

	// Get recent activity
	const recentActivity = await prisma.auditLog.findMany({
		where: {
			entity: 'Course',
			entityId: courseId
		},
		orderBy: {
			createdAt: 'desc'
		},
		take: 10,
		include: {
			staff: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			}
		}
	})

	// Safe decrypt helper
	function safeDecrypt(value: string | null): string | null {
		if (!value) return null
		try {
			return revealText(value)
		} catch (e) {
			return value
		}
	}

	// Decrypt student data safely
	const decryptedStudents = course.registrations.map(reg => {
		let decryptedStudent = {
			...reg.student,
			matricNumber: reg.student.matricNumber || 'N/A',
			firstName: 'N/A',
			lastName: 'N/A',
			otherNames: reg.student.otherNames || null,
			email: 'N/A',
			programme: reg.student.programme ? {
				...reg.student.programme,
				shortName: reg.student.programme.shortName || 'N/A',
				name: reg.student.programme.name || 'N/A'
			} : null
		}

		try {
			if (reg.student.matricNumber) {
				try {
					decryptedStudent.matricNumber = revealMatricNumber(reg.student.matricNumber)
				} catch (e) {
					decryptedStudent.matricNumber = reg.student.matricNumber
				}
			}

			if (reg.student.firstName) {
				try {
					decryptedStudent.firstName = revealName(reg.student.firstName)
				} catch (e) {
					decryptedStudent.firstName = reg.student.firstName
				}
			}

			if (reg.student.lastName) {
				try {
					decryptedStudent.lastName = revealName(reg.student.lastName)
				} catch (e) {
					decryptedStudent.lastName = reg.student.lastName
				}
			}

			if (reg.student.otherNames) {
				try {
					decryptedStudent.otherNames = revealName(reg.student.otherNames)
				} catch (e) {
					decryptedStudent.otherNames = reg.student.otherNames
				}
			}

			if (reg.student.email) {
				try {
					decryptedStudent.email = revealEmail(reg.student.email)
				} catch (e) {
					decryptedStudent.email = reg.student.email
				}
			}

			if (reg.student.programme?.shortName) {
				try {
					decryptedStudent.programme.shortName = revealText(reg.student.programme.shortName)
				} catch (e) {
					decryptedStudent.programme.shortName = reg.student.programme.shortName
				}
			}

			if (reg.student.programme?.name) {
				try {
					decryptedStudent.programme.name = revealText(reg.student.programme.name)
				} catch (e) {
					decryptedStudent.programme.name = reg.student.programme.name
				}
			}
		} catch (e) {
			console.warn('Failed to decrypt student data:', e)
		}

		return {
			...reg,
			student: decryptedStudent
		}
	})

	// Build the response data
	const responseData = {
		course: {
			id: course.id,
			code: course.code,
			title: course.title,
			creditUnits: course.creditUnits,
			type: course.type,
			status: course.status,
			description: safeDecrypt(course.description),
			department: course.department,
			college: course.department.college,
			level: course.level
		},
		offerings: course.offerings,
		assessments: course.assessments,
		recentQuestions: course.questions,
		recentStudents: decryptedStudents,
		studentCount,
		assessmentStats,
		recentActivity,
		transcriptEntries: course.transcriptEntries,
		currentSemester: currentSemester ? {
			id: currentSemester.id,
			name: `${currentSemester.type} ${currentSemester.session?.name || ''}`,
			isActive: currentSemester.isCurrent
		} : null
	}

	// Serialize all Decimal objects in the response
	return serializeData(responseData)
}