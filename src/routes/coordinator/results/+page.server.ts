// src/routes/coordinator/results/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireDeptViewer  } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireDeptViewer(locals.user);
	if (user.role !== 'department_coordinator') {
		throw new Error('Access denied. Department Coordinator access required.');
	}
	
	if (!user.departmentId) {
		throw new Error('Department Coordinator must be associated with a department');
	}
	
	const prisma = await getPrismaClient();
	const departmentId = user.departmentId;

	// Get all results in the department
	const results = await prisma.examResult.findMany({
		where: {
			exam: {
				examDepartments: { some: { departmentId } }
			}
		},
		select: {
			id: true,
			score: true,
			percentage: true,
			grade: true,
			passed: true,
			finalScore: true,
			finalGrade: true,
			finalPassed: true,
			submittedAt: true,
			student: {
				select: {
					id: true,
					fullName: true,
					matricNumber: true
				}
			},
			exam: {
				select: {
					id: true,
					title: true,
					totalMarks: true,
					course: { select: { code: true, title: true } }
				}
			},
			session: {
				select: {
					status: true,
					startedAt: true,
					submittedAt: true
				}
			}
		},
		orderBy: { submittedAt: 'desc' },
		take: 100
	});

	// Get stats
	const stats = {
		total: results.length,
		passed: results.filter(r => r.passed === true).length,
		failed: results.filter(r => r.passed === false).length,
		pending: results.filter(r => r.score === null).length,
		graded: results.filter(r => r.score !== null).length,
		averageScore: results.length > 0 
			? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
			: 0
	};

	// Get grade distribution
	const gradeDistribution = {
		A: results.filter(r => r.grade === 'A' || r.grade === 'A+').length,
		B: results.filter(r => r.grade === 'B' || r.grade === 'B+').length,
		C: results.filter(r => r.grade === 'C' || r.grade === 'C+').length,
		D: results.filter(r => r.grade === 'D' || r.grade === 'D+').length,
		F: results.filter(r => r.grade === 'F' || r.grade === 'E').length
	};

	return {
		results,
		stats,
		gradeDistribution,
		departmentId
	};
};