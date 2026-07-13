// src/routes/(lecturer)/lecturer/report/+page.server.ts
import type { PageServerLoad } from './$types'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'
import { revealName, revealMatricNumber } from '$lib/security/dataProtection'

// ─── Grade helpers ────────────────────────────────────────────────────────────

function letterGrade(pct: number): string {
	if (pct >= 70) return 'A'
	if (pct >= 60) return 'B'
	if (pct >= 50) return 'C'
	if (pct >= 45) return 'D'
	if (pct >= 40) return 'E'
	return 'F'
}

function isPassing(pct: number): boolean {
	return pct >= 40
}


export const load: PageServerLoad = async ({ locals, url }) => {
    const prisma = await getPrismaClient()
	const user = await requireLecturer(locals.user)

	if (!user.departmentId) {
		return {
			user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
			assessments: [],
			rows: [],
			courses: [{ id: 'all', label: 'All Courses' }],
			filters: { course: 'all', assessment: 'all' },
			error: 'No department assigned. Contact your HOD.',
		}
	}
   

	const courseFilter = url.searchParams.get('course') || 'all'
	const assessmentFilter = url.searchParams.get('assessment') || 'all'

	// ─── Courses this lecturer owns ───────────────────────────────────────────
	const courses = await prisma.course.findMany({
		where: { departmentId: user.departmentId },
		select: { id: true, code: true, title: true },
		orderBy: { code: 'asc' },
	})

	// ─── Assessments created by this lecturer ─────────────────────────────────
	const assessmentWhere: any = {
		createdById: user.id,
		...(courseFilter !== 'all' ? { courseId: courseFilter } : {}),
		...(assessmentFilter !== 'all' ? { id: assessmentFilter } : {}),
	}

	const assessments = await prisma.assessment.findMany({
		where: assessmentWhere,
		select: {
			id: true,
			title: true,
			totalMarks: true,
			course: { select: { code: true } },
		},
		orderBy: { createdAt: 'asc' },
	})

	if (assessments.length === 0) {
		return {
			user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
			assessments: [],
			rows: [],
			courses: [
				{ id: 'all', label: 'All Courses' },
				...courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` })),
			],
			filters: { course: courseFilter, assessment: assessmentFilter },
		}
	}

	const assessmentIds = assessments.map((a) => a.id)

	// ─── All exam sessions for these assessments ──────────────────────────────
	const sessions = await prisma.examSession.findMany({
		where: {
			assessmentId: { in: assessmentIds },
			status: 'COMPLETED',
		},
		include: {
			student: {
				select: {
					id: true,
					matricNumber: true,
					firstName: true,
					lastName: true,
					otherNames: true,
				},
			},
			answers: {
				where: { isManualGraded: true },
				select: { marksAwarded: true },
			},
		},
	})

	// ─── Build student → assessment → score map ───────────────────────────────
	type CellData = {
		scored: number
		total: number
		pct: number
		grade: string
		pass: boolean
		submittedAt: Date | null
	}

	const scoreMap = new Map<string, Map<string, CellData>>()
	const studentMeta = new Map<
		string,
		{ name: string; matric: string; studentId: string }
	>()

	for (const session of sessions) {
		const sid = session.student.id

		if (!studentMeta.has(sid)) {
			let name = 'Unknown'
			let matric = 'Unknown'
			try {
				const first = revealName(session.student.firstName)
				const last = revealName(session.student.lastName)
				const other = session.student.otherNames
					? revealName(session.student.otherNames)
					: ''
				name = `${last}, ${first}${other ? ' ' + other : ''}`.trim()
			} catch {}
			try {
				matric = revealMatricNumber(session.student.matricNumber)
			} catch {}
			studentMeta.set(sid, { name, matric, studentId: sid })
		}

		if (!scoreMap.has(sid)) scoreMap.set(sid, new Map())

		const assessment = assessments.find((a) => a.id === session.assessmentId)
		if (!assessment) continue

		const scored = session.answers.reduce(
			(sum, a) => sum + (a.marksAwarded ? Number(a.marksAwarded) : 0),
			0
		)
		const total = Number(assessment.totalMarks ?? 0)
		const pct = total > 0 ? Math.round((scored / total) * 100) : 0

		scoreMap.get(sid)!.set(session.assessmentId, {
			scored,
			total,
			pct,
			grade: letterGrade(pct),
			pass: isPassing(pct),
			submittedAt: session.submittedAt ?? null,
		})
	}

	// ─── Build rows ───────────────────────────────────────────────────────────
	const rows = Array.from(studentMeta.values()).map(({ name, matric, studentId }) => {
		const cells = assessments.map((a) => {
			const cell = scoreMap.get(studentId)?.get(a.id)
			return cell ?? null
		})

		const sat = cells.filter(Boolean) as CellData[]
		const totalScored = sat.reduce((s, c) => s + c.scored, 0)
		const totalPossible = sat.reduce((s, c) => s + c.total, 0)
		const overallPct = totalPossible > 0 ? Math.round((totalScored / totalPossible) * 100) : null

		return {
			studentId,
			name,
			matric,
			cells,
			totalScored,
			totalPossible,
			overallPct,
			overallGrade: overallPct !== null ? letterGrade(overallPct) : '—',
			overallPass: overallPct !== null ? isPassing(overallPct) : null,
		}
	})

	rows.sort((a, b) => a.name.localeCompare(b.name))

	return {
		user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
		assessments: assessments.map((a) => ({
			id: a.id,
			title: a.title,
			courseCode: a.course.code,
			totalMarks: Number(a.totalMarks ?? 0),
		})),
		rows,
		courses: [
			{ id: 'all', label: 'All Courses' },
			...courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` })),
		],
		allAssessments: assessments.map((a) => ({
			id: a.id,
			label: `${a.course.code} — ${a.title}`,
		})),
		filters: { course: courseFilter, assessment: assessmentFilter },
	}
}