// src/routes/(lecturer)/lecturer/question-bank/[id]/+page.server.ts
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { 
	revealName, 
	revealMatricNumber,
	revealText,
	isEncrypted 
} from '$lib/security/dataProtection.js'

function safeReveal(fn: () => string, fallback: string): string {
	try {
		const result = fn()
		return result || fallback
	} catch (e) {
		console.warn('[question-detail] Failed to decrypt field:', e)
		return fallback
	}
}

// Decrypt any field that is encrypted
function decryptField(value: string | null | undefined): string {
	if (!value) return 'N/A'
	const strValue = String(value)
	
	// If not encrypted (plain text), return as-is
	if (!isEncrypted(strValue)) return strValue
	
	// Try to decrypt using revealText (works for most encrypted fields)
	try {
		return safeReveal(() => revealText(strValue), strValue)
	} catch (e) {
		// Try revealName as fallback
		try {
			return safeReveal(() => revealName(strValue), strValue)
		} catch (e2) {
			return strValue
		}
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()
	const questionId = params.id

	const question = await prisma.question.findUnique({
		where: { id: questionId },
		include: {
			createdBy: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
				}
			},
			course: {
				select: {
					id: true,
					code: true,
					title: true,
					department: {
						select: {
							id: true,
							name: true,
							shortName: true,
						}
					},
					level: {
						select: {
							id: true,
							name: true,
						}
					}
				}
			},
			options: {
				orderBy: { order: 'asc' }
			},
			tags: {
				include: {
					tag: true
				}
			},
			assessmentQs: {
				include: {
					assessment: {
						select: {
							id: true,
							title: true,
							type: true,
							status: true,
							course: {
								select: {
									code: true,
									title: true,
								}
							}
						}
					}
				}
			},
			answers: {
				take: 50,
				orderBy: { answeredAt: 'desc' },
				include: {
					session: {
						include: {
							student: {
								select: {
									id: true,
									firstName: true,
									lastName: true,
									matricNumber: true,
								}
							}
						}
					}
				}
			},
			versions: {
				select: {
					id: true,
					body: true,
					type: true,
					difficulty: true,
					createdAt: true,
				},
				orderBy: { createdAt: 'desc' },
				take: 10,
			}
		}
	})

	if (!question) {
		throw error(404, 'Question not found')
	}

	// Verify the lecturer owns this question
	if (question.createdById !== user.id) {
		throw error(403, 'You do not have permission to view this question')
	}

	// ─── Decrypt all fields that might be encrypted ──────────────────────────
	const decryptedBody = question.body || 'No question body'
	const decryptedExplanation = question.explanation || null

	const decryptedOptions = question.options.map((opt) => ({
		...opt,
		body: opt.body || '',
	}))

	// ─── Decrypt course data ──────────────────────────────────────────────
	let courseData = null
	if (question.course) {
		courseData = {
			id: question.course.id,
			code: decryptField(question.course.code),
			title: decryptField(question.course.title),
			department: question.course.department ? decryptField(question.course.department.name) : 'N/A',
			level: question.course.level ? decryptField(question.course.level.name) : 'N/A',
		}
	}

	// ─── Decrypt creator name ──────────────────────────────────────────────
	let creatorName = 'Unknown'
	if (question.createdBy.firstName && question.createdBy.lastName) {
		const firstName = decryptField(question.createdBy.firstName)
		const lastName = decryptField(question.createdBy.lastName)
		creatorName = `${firstName} ${lastName}`
	}

	// ─── Decrypt student answers ────────────────────────────────────────────
	// IMPORTANT: The answer data itself is stored in the StudentAnswer table.
	// We need to decrypt the student names and matric numbers from the session.
	const decryptedAnswers = question.answers.map((answer) => {
		let studentName = 'Unknown Student'
		let matricNumber = 'N/A'
		let sessionId = answer.sessionId || 'N/A'

		// Check if we have session data with student info
		if (answer.session && answer.session.student) {
			const student = answer.session.student
			
			// Decrypt student name
			if (student.firstName && student.lastName) {
				try {
					const firstName = decryptField(student.firstName)
					const lastName = decryptField(student.lastName)
					studentName = `${firstName} ${lastName}`
				} catch (e) {
					console.warn('[question-detail] Failed to decrypt student name:', e)
					studentName = 'Decryption Error'
				}
			}
			
			// Decrypt matric number
			if (student.matricNumber) {
				try {
					matricNumber = decryptField(student.matricNumber)
				} catch (e) {
					console.warn('[question-detail] Failed to decrypt matric number:', e)
					matricNumber = 'Decryption Error'
				}
			}
		}

		// Process the answer data
		let displayAnswer = ''
		if (answer.selectedOptions && Array.isArray(answer.selectedOptions) && answer.selectedOptions.length > 0) {
			displayAnswer = answer.selectedOptions.join(', ')
		} else if (answer.textAnswer) {
			displayAnswer = answer.textAnswer
		} else if (answer.orderAnswer) {
			displayAnswer = JSON.stringify(answer.orderAnswer)
		} else if (answer.matchAnswer) {
			displayAnswer = JSON.stringify(answer.matchAnswer)
		} else {
			displayAnswer = 'No answer'
		}

		return {
			id: answer.id,
			sessionId: sessionId,
			questionId: answer.questionId,
			selectedOptions: answer.selectedOptions,
			textAnswer: answer.textAnswer,
			orderAnswer: answer.orderAnswer,
			matchAnswer: answer.matchAnswer,
			marksAwarded: answer.marksAwarded ? Number(answer.marksAwarded) : null,
			isCorrect: answer.isCorrect,
			isManualGraded: answer.isManualGraded,
			gradedAt: answer.gradedAt,
			gradedById: answer.gradedById,
			answeredAt: answer.answeredAt,
			updatedAt: answer.updatedAt,
			studentName: studentName,
			matricNumber: matricNumber,
			displayAnswer: displayAnswer,
		}
	})

	// ─── Decrypt assessments ──────────────────────────────────────────────
	const decryptedAssessments = question.assessmentQs.map(aq => ({
		id: aq.assessment.id,
		title: decryptField(aq.assessment.title),
		type: aq.assessment.type,
		status: aq.assessment.status,
		courseCode: aq.assessment.course ? decryptField(aq.assessment.course.code) : 'N/A',
		courseTitle: aq.assessment.course ? decryptField(aq.assessment.course.title) : 'N/A',
		order: aq.order,
		marksOverride: aq.marksOverride ? Number(aq.marksOverride) : null,
	}))

	// ─── Calculate statistics ──────────────────────────────────────────────
	const totalUses = question.assessmentQs.length
	const totalAttempts = question.answers.length
	const correctAnswers = question.answers.filter(a => a.isCorrect === true).length
	const avgScore = totalAttempts > 0 
		? question.answers.reduce((sum, a) => sum + (a.marksAwarded ? Number(a.marksAwarded) : 0), 0) / totalAttempts
		: 0

	return {
		question: {
			id: question.id,
			body: decryptedBody,
			explanation: decryptedExplanation,
			type: question.type,
			difficulty: question.difficulty,
			marks: Number(question.marks),
			isActive: question.isActive,
			version: question.version,
			createdAt: question.createdAt,
			updatedAt: question.updatedAt,
			imageUrl: question.imageUrl,
			audioUrl: question.audioUrl,
			videoUrl: question.videoUrl,
		},
		course: courseData,
		creator: {
			id: question.createdBy.id,
			name: creatorName,
			email: question.createdBy.email,
		},
		options: decryptedOptions,
		tags: question.tags.map(t => t.tag.name),
		assessments: decryptedAssessments,
		answers: decryptedAnswers,
		answerCount: totalAttempts,
		versions: question.versions.map(v => ({
			id: v.id,
			body: v.body || '',
			type: v.type,
			difficulty: v.difficulty,
			createdAt: v.createdAt,
		})),
		stats: {
			totalUses,
			totalAttempts,
			correctAnswers,
			avgScore: parseFloat(avgScore.toFixed(2)),
			successRate: totalAttempts > 0 ? ((correctAnswers / totalAttempts) * 100).toFixed(1) : '0',
		}
	}
}