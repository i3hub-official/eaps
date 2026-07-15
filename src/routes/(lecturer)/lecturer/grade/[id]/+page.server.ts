// src/routes/(lecturer)/lecturer/grade/[id]/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { error, fail } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { 
	revealName, 
	revealMatricNumber,
	revealEmail,
	revealText,
	isEncrypted 
} from '$lib/security/dataProtection.js'
import { Decimal } from 'decimal.js'

function safeReveal(fn: () => string, fallback: string): string {
	try {
		const result = fn()
		return result || fallback
	} catch (e) {
		console.warn('[grade-detail] Failed to decrypt field:', e)
		return fallback
	}
}

function decryptField(value: string | null | undefined): string {
	if (!value) return 'N/A'
	const strValue = String(value)
	if (!isEncrypted(strValue)) return strValue
	try {
		return safeReveal(() => revealText(strValue), strValue)
	} catch (e) {
		try {
			return safeReveal(() => revealName(strValue), strValue)
		} catch (e2) {
			return strValue
		}
	}
}

function decryptName(firstName: string | null, lastName: string | null): string {
	if (!firstName && !lastName) return 'Unknown'
	
	let first = ''
	let last = ''
	
	if (firstName) {
		try {
			first = isEncrypted(firstName) ? revealName(firstName) : firstName
		} catch (e) {
			first = firstName
		}
	}
	
	if (lastName) {
		try {
			last = isEncrypted(lastName) ? revealName(lastName) : lastName
		} catch (e) {
			last = lastName
		}
	}
	
	return `${first} ${last}`.trim() || 'Unknown'
}

function decryptMatricNumber(matric: string | null): string {
	if (!matric) return 'N/A'
	try {
		return isEncrypted(matric) ? revealMatricNumber(matric) : matric
	} catch (e) {
		return matric
	}
}

function decryptEmail(email: string | null): string {
	if (!email) return 'Unknown'
	try {
		return isEncrypted(email) ? revealEmail(email) : email
	} catch (e) {
		return email
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()
	const answerId = params.id

	const answer = await prisma.studentAnswer.findUnique({
		where: { id: answerId },
		include: {
			session: {
				include: {
					assessment: {
						include: {
							course: {
								select: {
									id: true,
									code: true,
									title: true,
								}
							},
							questions: {
								include: {
									question: {
										include: {
											options: {
												orderBy: { order: 'asc' }
											}
										}
									}
								}
							}
						}
					},
					student: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							matricNumber: true,
							email: true,
						}
					}
				}
			},
			question: {
				include: {
					options: {
						orderBy: { order: 'asc' }
					}
				}
			},
			gradedBy: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
				}
			}
		}
	})

	if (!answer) {
		throw error(404, 'Answer not found')
	}

	// Verify the lecturer has access to this answer
	if (answer.session.assessment.createdById !== user.id) {
		throw error(403, 'You do not have permission to grade this submission')
	}

	// ─── Decrypt student data ──────────────────────────────────────────────
	const studentName = decryptName(
		answer.session.student?.firstName || null,
		answer.session.student?.lastName || null
	)
	const matricNumber = decryptMatricNumber(answer.session.student?.matricNumber || null)
	const studentEmail = decryptEmail(answer.session.student?.email || null)

	// ─── Decrypt grader name ───────────────────────────────────────────────
	let graderName = 'Not graded'
	if (answer.gradedBy) {
		graderName = decryptName(
			answer.gradedBy.firstName || null,
			answer.gradedBy.lastName || null
		)
	}

	// ─── Decrypt question data ──────────────────────────────────────────────
	const questionBody = decryptField(answer.question.body)
	const questionExplanation = answer.question.explanation ? decryptField(answer.question.explanation) : null

	// ─── Decrypt options ────────────────────────────────────────────────────
	const selectedOptionIds = answer.selectedOptions as string[] || []
	const options = answer.question.options.map((opt) => ({
		...opt,
		body: decryptField(opt.body),
		isSelected: selectedOptionIds.includes(opt.id),
	}))

	// ─── Decrypt assessment title and course data ──────────────────────────
	const assessmentTitle = decryptField(answer.session.assessment.title)
	const courseCode = answer.session.assessment.course?.code 
		? decryptField(answer.session.assessment.course.code) 
		: 'N/A'
	const courseTitle = answer.session.assessment.course?.title 
		? decryptField(answer.session.assessment.course.title) 
		: 'N/A'

	// ─── Determine if it's auto-gradable ──────────────────────────────────
	const autoGradableTypes = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
	const isAutoGradable = autoGradableTypes.includes(answer.question.type)

	// ─── Get the correct answers ──────────────────────────────────────────
	const correctOptions = options.filter(o => o.isCorrect).map(o => o.id)

	// ─── Get assessment info ──────────────────────────────────────────────
	const assessment = answer.session.assessment
	const totalQuestions = assessment.questions.length

	// ─── Get session info ──────────────────────────────────────────────────
	const session = answer.session

	return {
		answer: {
			id: answer.id,
			marksAwarded: answer.marksAwarded ? Number(answer.marksAwarded) : null,
			isCorrect: answer.isCorrect,
			isManualGraded: answer.isManualGraded,
			textAnswer: answer.textAnswer,
			selectedOptions: answer.selectedOptions as string[],
			answeredAt: answer.answeredAt,
			gradedAt: answer.gradedAt,
		},
		question: {
			id: answer.question.id,
			body: questionBody,
			explanation: questionExplanation,
			type: answer.question.type,
			difficulty: answer.question.difficulty,
			marks: Number(answer.question.marks),
			options,
			correctOptions,
		},
		student: {
			id: answer.session.studentId,
			name: studentName,
			matricNumber,
			email: studentEmail,
		},
		grader: {
			id: answer.gradedById,
			name: graderName,
		},
		assessment: {
			id: assessment.id,
			title: assessmentTitle,
			type: assessment.type,
			courseCode,
			courseTitle,
			totalMarks: Number(assessment.totalMarks),
			passMark: Number(assessment.passMark),
			totalQuestions,
		},
		session: {
			id: session.id,
			status: session.status,
			startedAt: session.startedAt,
			submittedAt: session.submittedAt,
			attemptNumber: session.attemptNumber,
		},
		isAutoGradable,
	}
}

export const actions: Actions = {
	grade: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()

		const answerId = String(formData.get('answerId') ?? '')
		const marksAwarded = parseFloat(String(formData.get('marks') ?? '0'))
		const isCorrect = formData.get('isCorrect') === 'true'
		const isManualGraded = formData.get('isManualGraded') === 'true'

		if (!answerId) {
			return fail(400, { error: 'Answer ID is required' })
		}

		if (marksAwarded < 0) {
			return fail(400, { error: 'Marks cannot be negative' })
		}

		const prisma = await getPrismaClient()

		// Verify ownership
		const answer = await prisma.studentAnswer.findUnique({
			where: { id: answerId },
			include: {
				session: {
					include: {
						assessment: true
					}
				},
				question: true
			}
		})

		if (!answer) {
			return fail(404, { error: 'Answer not found' })
		}

		if (answer.session.assessment.createdById !== user.id) {
			return fail(403, { error: 'You do not have permission to grade this answer' })
		}

		// Validate marks don't exceed question marks
		const maxMarks = Number(answer.question.marks)
		if (marksAwarded > maxMarks) {
			return fail(400, { error: `Marks cannot exceed ${maxMarks}` })
		}

		try {
			await prisma.studentAnswer.update({
				where: { id: answerId },
				data: {
					marksAwarded: new Decimal(marksAwarded),
					isCorrect,
					isManualGraded,
					gradedAt: new Date(),
					gradedById: user.id,
				}
			})

			return { success: true, message: 'Grade saved successfully' }
		} catch (err) {
			console.error('[grade] Failed to save grade:', err)
			return fail(500, { error: 'Failed to save grade' })
		}
	},

	autoGrade: async ({ request, locals }) => {
		const user = await requireLecturer(locals.user)
		const formData = await request.formData()
		const answerId = String(formData.get('answerId') ?? '')

		if (!answerId) {
			return fail(400, { error: 'Answer ID is required' })
		}

		const prisma = await getPrismaClient()

		const answer = await prisma.studentAnswer.findUnique({
			where: { id: answerId },
			include: {
				session: {
					include: {
						assessment: true
					}
				},
				question: {
					include: {
						options: true
					}
				}
			}
		})

		if (!answer) {
			return fail(404, { error: 'Answer not found' })
		}

		if (answer.session.assessment.createdById !== user.id) {
			return fail(403, { error: 'You do not have permission to grade this answer' })
		}

		const selectedOptions = answer.selectedOptions as string[] || []
		const correctOptions = answer.question.options.filter(o => o.isCorrect).map(o => o.id)
		const isCorrect = selectedOptions.length === correctOptions.length &&
			selectedOptions.every(id => correctOptions.includes(id))

		const marks = isCorrect ? Number(answer.question.marks) : 0

		try {
			await prisma.studentAnswer.update({
				where: { id: answerId },
				data: {
					marksAwarded: new Decimal(marks),
					isCorrect,
					isManualGraded: true,
					gradedAt: new Date(),
					gradedById: user.id,
				}
			})

			return { success: true, message: 'Auto-graded successfully', marks }
		} catch (err) {
			console.error('[grade] Failed to auto-grade:', err)
			return fail(500, { error: 'Failed to auto-grade' })
		}
	}
}