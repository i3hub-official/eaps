// src/routes/lecturer/reports/assessments/+page.server.ts
import type { PageServerLoad, Actions } from './$types'
import { error, fail } from '@sveltejs/kit'
import { getPrismaClient } from '$lib/server/db/index.js'
import { requireLecturer } from '$lib/server/auth/guards.js'

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user)
	const prisma = await getPrismaClient()

	// Fetch all assessments created by this lecturer with their released results
	const assessments = await prisma.assessment.findMany({
		where: { createdById: user.id, type: { in: ['TEST', 'EXAMINATION', 'ASSIGNMENT'] } },
		include: {
			course: { select: { code: true, title: true } },
			results: {
				where: { isReleased: true },
				include: {
					student: {
						select: {
							id: true,
							matricNumber: true,
							firstName: true,
							lastName: true,
							department: { select: { code: true } },
						},
					},
					session: { select: { submittedAt: true } },
				},
			},
		},
		orderBy: [{ course: { code: 'asc' } }, { type: 'asc' }, { title: 'asc' }],
	})

	if (assessments.length === 0) {
		return {
			assessments: [],
			students: new Map(),
			reportData: [],
		}
	}

	// Collect all unique students across all assessments
	const studentMap = new Map<
		string,
		{
			id: string
			matricNumber: string
			firstName: string
			lastName: string
			departmentCode: string
		}
	>()

	for (const assessment of assessments) {
		for (const result of assessment.results) {
			if (!studentMap.has(result.student.id)) {
				studentMap.set(result.student.id, {
					id: result.student.id,
					matricNumber: result.student.matricNumber,
					firstName: result.student.firstName,
					lastName: result.student.lastName,
					departmentCode: result.student.department?.code ?? 'N/A',
				})
			}
		}
	}

	// Build report data: map of studentId -> map of assessmentId -> result data
	const reportData = new Map<
		string,
		Map<
			string,
			{
				marks: number
				totalMarks: number
				percentage: number
				grade: string | null
				passed: boolean
				submittedAt: Date | null
			}
		>
	>()

	for (const student of studentMap.values()) {
		reportData.set(student.id, new Map())
	}

	for (const assessment of assessments) {
		for (const result of assessment.results) {
			const studentResults = reportData.get(result.student.id)
			if (studentResults) {
				studentResults.set(assessment.id, {
					marks: Number(result.marksObtained),
					totalMarks: Number(result.totalMarks),
					percentage: result.percentage,
					grade: result.grade,
					passed: result.passed,
					submittedAt: result.session?.submittedAt ?? null,
				})
			}
		}
	}

	return {
		assessments: assessments.map((a) => ({
			id: a.id,
			title: a.title,
			type: a.type,
			courseCode: a.course.code,
			courseTitle: a.course.title,
			totalMarks: Number(a.totalMarks),
			resultCount: a.results.length,
		})),
		students: Array.from(studentMap.values()).sort((a, b) =>
			`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
		),
		reportData: Object.fromEntries(
			Array.from(reportData).map(([studentId, assessmentResults]) => [
				studentId,
				Object.fromEntries(assessmentResults),
			]),
		),
	}
}

export const actions: Actions = {
	exportCsv: async ({ locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessments = await prisma.assessment.findMany({
			where: { createdById: user.id, type: { in: ['TEST', 'EXAMINATION', 'ASSIGNMENT'] } },
			include: {
				course: { select: { code: true } },
				results: {
					where: { isReleased: true },
					include: {
						student: {
							select: {
								id: true,
								matricNumber: true,
								firstName: true,
								lastName: true,
							},
						},
						session: { select: { submittedAt: true } },
					},
				},
			},
			orderBy: [{ course: { code: 'asc' } }, { type: 'asc' }, { title: 'asc' }],
		})

		if (assessments.length === 0) {
			return fail(400, { error: 'No assessments found' })
		}

		const studentMap = new Map<string, { matricNumber: string; firstName: string; lastName: string }>()
		for (const assessment of assessments) {
			for (const result of assessment.results) {
				if (!studentMap.has(result.student.id)) {
					studentMap.set(result.student.id, {
						matricNumber: result.student.matricNumber,
						firstName: result.student.firstName,
						lastName: result.student.lastName,
					})
				}
			}
		}

		const students = Array.from(studentMap.entries())
			.sort(([, a], [, b]) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))

		// Build CSV header
		const headers = ['Matric Number', 'Student Name']
		for (const assessment of assessments) {
			headers.push(`${assessment.course.code} - ${assessment.title} (Marks)`)
			headers.push(`${assessment.course.code} - ${assessment.title} (%)`)
			headers.push(`${assessment.course.code} - ${assessment.title} (Grade)`)
			headers.push(`${assessment.course.code} - ${assessment.title} (Status)`)
			headers.push(`${assessment.course.code} - ${assessment.title} (Submitted)`)
		}

		const rows = [headers]

		for (const [studentId, student] of students) {
			const row = [student.matricNumber, `${student.firstName} ${student.lastName}`]

			for (const assessment of assessments) {
				const result = assessment.results.find((r) => r.student.id === studentId)
				if (result) {
					row.push(String(Number(result.marksObtained)))
					row.push(String(result.percentage))
					row.push(result.grade ?? 'N/A')
					row.push(result.passed ? 'Pass' : 'Fail')
					row.push(result.session?.submittedAt ? new Date(result.session.submittedAt).toLocaleString('en-NG') : 'N/A')
				} else {
					row.push('—', '—', '—', '—', '—')
				}
			}

			rows.push(row)
		}

		// Escape CSV values
		const csv = rows
			.map((row) =>
				row
					.map((cell) => {
						const str = String(cell)
						if (str.includes(',') || str.includes('"') || str.includes('\n')) {
							return `"${str.replace(/"/g, '""')}"`
						}
						return str
					})
					.join(','),
			)
			.join('\n')

		return {
			success: true,
			csv,
			filename: `assessments-report-${new Date().toISOString().split('T')[0]}.csv`,
		}
	},

	exportPdf: async ({ locals }) => {
		const user = await requireLecturer(locals.user)
		const prisma = await getPrismaClient()

		const assessments = await prisma.assessment.findMany({
			where: { createdById: user.id, type: { in: ['TEST', 'EXAMINATION', 'ASSIGNMENT'] } },
			include: {
				course: { select: { code: true, title: true } },
				results: {
					where: { isReleased: true },
					include: {
						student: {
							select: {
								id: true,
								matricNumber: true,
								firstName: true,
								lastName: true,
							},
						},
						session: { select: { submittedAt: true } },
					},
				},
			},
			orderBy: [{ course: { code: 'asc' } }, { type: 'asc' }, { title: 'asc' }],
		})

		if (assessments.length === 0) {
			return fail(400, { error: 'No assessments found' })
		}

		const studentMap = new Map<string, { matricNumber: string; firstName: string; lastName: string }>()
		for (const assessment of assessments) {
			for (const result of assessment.results) {
				if (!studentMap.has(result.student.id)) {
					studentMap.set(result.student.id, {
						matricNumber: result.student.matricNumber,
						firstName: result.student.firstName,
						lastName: result.student.lastName,
					})
				}
			}
		}

		const students = Array.from(studentMap.entries())
			.sort(([, a], [, b]) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))

		// Build HTML table for PDF
		let html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Assessment Report</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
		h1 { font-size: 16px; margin-bottom: 5px; }
		.meta { font-size: 10px; color: #666; margin-bottom: 20px; }
		table { width: 100%; border-collapse: collapse; margin-top: 20px; }
		th { background: #f0f0f0; border: 1px solid #999; padding: 6px; text-align: left; font-weight: bold; }
		td { border: 1px solid #ccc; padding: 4px 6px; }
		tr:nth-child(even) { background: #f9f9f9; }
		.pass { color: green; }
		.fail { color: red; }
	</style>
</head>
<body>
	<h1>Assessment Report</h1>
	<div class="meta">Generated: ${new Date().toLocaleString('en-NG')}</div>
	<table>
		<thead>
			<tr>
				<th>Matric Number</th>
				<th>Student Name</th>
`

		for (const assessment of assessments) {
			html += `
				<th colspan="5">${assessment.course.code} - ${assessment.title}</th>
`
		}

		html += `
			</tr>
			<tr>
				<th colspan="2"></th>
`

		for (const assessment of assessments) {
			html += `
				<th>Marks</th>
				<th>%</th>
				<th>Grade</th>
				<th>Status</th>
				<th>Submitted</th>
`
		}

		html += `
			</tr>
		</thead>
		<tbody>
`

		for (const [studentId, student] of students) {
			html += `
			<tr>
				<td>${student.matricNumber}</td>
				<td>${student.firstName} ${student.lastName}</td>
`

			for (const assessment of assessments) {
				const result = assessment.results.find((r) => r.student.id === studentId)
				if (result) {
					const statusClass = result.passed ? 'pass' : 'fail'
					const statusText = result.passed ? 'Pass' : 'Fail'
					const submitted = result.session?.submittedAt
						? new Date(result.session.submittedAt).toLocaleDateString('en-NG')
						: 'N/A'
					html += `
				<td>${Number(result.marksObtained)}</td>
				<td>${result.percentage}%</td>
				<td>${result.grade ?? 'N/A'}</td>
				<td class="${statusClass}">${statusText}</td>
				<td>${submitted}</td>
`
				} else {
					html += `
				<td colspan="5" style="text-align: center; color: #999;">—</td>
`
				}
			}

			html += `
			</tr>
`
		}

		html += `
		</tbody>
	</table>
</body>
</html>
`

		return {
			success: true,
			html,
			filename: `assessments-report-${new Date().toISOString().split('T')[0]}.pdf`,
		}
	},
}