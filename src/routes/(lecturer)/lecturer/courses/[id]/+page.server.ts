// src/routes/(lecturer)/lecturer/courses/[id]/+page.server.ts
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { 
  revealName, 
  revealMatricNumber, 
  revealEmail,
  revealText,
  isEncrypted
} from '$lib/security/dataProtection.js'

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

	// Safe decrypt helper - only decrypt if the field is actually encrypted
	function safeDecrypt(value: string | null): string | null {
		if (!value) return null
		try {
			// Check if it looks like encrypted data (contains a colon)
			if (value.includes(':')) {
				return revealText(value)
			}
			// If it doesn't look encrypted, return as-is
			return value
		} catch (e) {
			// If decryption fails, return the original value
			console.warn('Failed to decrypt field, returning original:', e)
			return value
		}
	}

	// Decrypt student data safely
	const decryptedStudents = course.registrations.map(reg => {
		try {
			return {
				...reg,
				student: {
					...reg.student,
					matricNumber: reg.student.matricNumber.includes(':') 
						? revealMatricNumber(reg.student.matricNumber) 
						: reg.student.matricNumber,
					firstName: reg.student.firstName.includes(':') 
						? revealName(reg.student.firstName) 
						: reg.student.firstName,
					lastName: reg.student.lastName.includes(':') 
						? revealName(reg.student.lastName) 
						: reg.student.lastName,
					email: reg.student.email.includes(':') 
						? revealEmail(reg.student.email) 
						: reg.student.email,
					phone: reg.student.phone ? safeDecrypt(reg.student.phone) : null
				}
			}
		} catch (e) {
			console.warn('Failed to decrypt student data:', e)
			return {
				...reg,
				student: {
					...reg.student,
					matricNumber: reg.student.matricNumber || 'N/A',
					firstName: reg.student.firstName || 'N/A',
					lastName: reg.student.lastName || 'N/A',
					email: reg.student.email || 'N/A',
					phone: reg.student.phone || null
				}
			}
		}
	})

	return {
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
		currentSemester: currentSemester ? {
			id: currentSemester.id,
			name: `${currentSemester.type} ${currentSemester.session?.name || ''}`,
			isActive: currentSemester.isCurrent
		} : null
	}
}