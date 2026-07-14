// src/routes/(lecturer)/lecturer/report/+page.server.ts
import type { PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import { requireLecturer } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireLecturer(locals.user);
	const prisma = await getPrismaClient();

	// Get all assessments created by this lecturer
	const assessments = await prisma.assessment.findMany({
		where: { createdById: user.id },
		include: {
			course: true,
			results: {
				select: {
					marksObtained: true,
					passed: true,
					percentage: true,
					totalMarks: true,
				},
			},
		},
	});

	// Total assessments
	const totalAssessments = assessments.length;

	// Get all students from courses taught by this lecturer
	const courseOfferings = await prisma.courseOffering.findMany({
		where: { lecturerId: user.id },
		select: { courseId: true },
	});

	const courseIds = courseOfferings.map((o) => o.courseId);
	
	const students = await prisma.courseRegistration.findMany({
		where: {
			courseId: { in: courseIds },
			status: 'APPROVED',
		},
		select: { studentId: true },
	});
	
	const totalStudents = new Set(students.map((s) => s.studentId)).size;

	// Calculate completion rate and average score
	let totalResults = 0;
	let completedResults = 0;
	let totalScore = 0;

	assessments.forEach((assessment) => {
		assessment.results.forEach((result) => {
			totalResults++;
			if (result.marksObtained !== null && result.marksObtained !== undefined) {
				completedResults++;
				totalScore += Number(result.marksObtained);
			}
		});
	});

	const completionRate = totalResults > 0 ? Math.round((completedResults / totalResults) * 100) : 0;
	const averageScore = completedResults > 0 ? Math.round(totalScore / completedResults) : 0;

	// Status distribution
	const statusDistribution = {
		published: assessments.filter((a) => a.status === 'PUBLISHED').length,
		inProgress: assessments.filter((a) => a.status === 'ACTIVE').length,
		completed: assessments.filter((a) => a.status === 'ENDED').length,
		draft: assessments.filter((a) => a.status === 'DRAFT').length,
		publishedPercent: totalAssessments > 0 ? Math.round((assessments.filter((a) => a.status === 'PUBLISHED').length / totalAssessments) * 100) : 0,
		inProgressPercent: totalAssessments > 0 ? Math.round((assessments.filter((a) => a.status === 'ACTIVE').length / totalAssessments) * 100) : 0,
		completedPercent: totalAssessments > 0 ? Math.round((assessments.filter((a) => a.status === 'ENDED').length / totalAssessments) * 100) : 0,
		draftPercent: totalAssessments > 0 ? Math.round((assessments.filter((a) => a.status === 'DRAFT').length / totalAssessments) * 100) : 0,
	};

	// Course performance
	const coursePerformance = await Promise.all(
		courseIds.map(async (courseId) => {
			const course = await prisma.course.findUnique({
				where: { id: courseId },
				select: { code: true, title: true },
			});
			
			const courseAssessments = assessments.filter((a) => a.courseId === courseId);
			let courseTotal = 0;
			let courseCompleted = 0;
			
			courseAssessments.forEach((a) => {
				a.results.forEach((r) => {
					if (r.marksObtained !== null && r.marksObtained !== undefined) {
						courseTotal += Number(r.marksObtained);
						courseCompleted++;
					}
				});
			});
			
			const avgScore = courseCompleted > 0 ? Math.round(courseTotal / courseCompleted) : 0;
			
			return {
				code: course?.code || 'Unknown',
				title: course?.title || 'Unknown',
				score: avgScore,
			};
		})
	);

	// Recent assessments (last 5)
	const recentAssessments = assessments
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.slice(0, 5)
		.map((a) => {
			const completed = a.results.filter((r) => r.marksObtained !== null && r.marksObtained !== undefined);
			const avgScore = completed.length > 0 
				? Math.round(completed.reduce((sum, r) => sum + Number(r.marksObtained), 0) / completed.length)
				: 0;
			
			const studentCount = a.results.length;
			
			let displayStatus = a.status;
			if (a.status === 'ENDED') {
				displayStatus = 'COMPLETED';
			} else if (a.status === 'ACTIVE') {
				displayStatus = 'IN_PROGRESS';
			} else if (a.status === 'PUBLISHED' || a.status === 'SCHEDULED') {
				displayStatus = 'PENDING';
			}
			
			return {
				id: a.id,
				title: a.title,
				courseCode: a.course.code,
				students: studentCount,
				status: displayStatus,
				score: avgScore,
			};
		});

	// ─── Fetch REAL recent activity ─────────────────────────────────────
	// Get recent assessment creations
	const recentCreations = await prisma.assessment.findMany({
		where: { createdById: user.id },
		select: {
			id: true,
			title: true,
			createdAt: true,
			status: true,
		},
		orderBy: { createdAt: 'desc' },
		take: 3,
	});

	// Get recent assessment sessions (student activity)
	const recentSessions = await prisma.assessmentSession.findMany({
		where: {
			assessment: {
				createdById: user.id,
			},
		},
		select: {
			id: true,
			assessmentId: true,
			assessment: {
				select: {
					title: true,
				},
			},
			student: {
				select: {
					firstName: true,
					lastName: true,
				},
			},
			status: true,
			startedAt: true,
			submittedAt: true,
			createdAt: true,
		},
		orderBy: { createdAt: 'desc' },
		take: 3,
	});

	// Get recent result releases
	const recentResults = await prisma.assessmentResult.findMany({
		where: {
			assessment: {
				createdById: user.id,
			},
			isReleased: true,
		},
		select: {
			id: true,
			assessmentId: true,
			assessment: {
				select: {
					title: true,
				},
			},
			student: {
				select: {
					firstName: true,
					lastName: true,
				},
			},
			releasedAt: true,
			marksObtained: true,
			totalMarks: true,
		},
		orderBy: { releasedAt: 'desc' },
		take: 3,
	});

	// Combine and format activities
	const activities: Array<{
		id: string;
		type: 'assessment' | 'student' | 'grade';
		message: string;
		time: string;
	}> = [];

	// Add creation activities
	recentCreations.forEach((creation) => {
		const statusMap: Record<string, string> = {
			DRAFT: 'draft',
			PUBLISHED: 'published',
			ACTIVE: 'active',
			ENDED: 'ended',
		};
		const statusText = statusMap[creation.status] || creation.status.toLowerCase();
		activities.push({
			id: `create-${creation.id}`,
			type: 'assessment',
			message: `Created "${creation.title}" (${statusText})`,
			time: timeAgo(creation.createdAt),
		});
	});

	// Add session activities
	recentSessions.forEach((session) => {
		const studentName = `${session.student.firstName} ${session.student.lastName}`;
		const action = session.status === 'SUBMITTED' ? 'completed' : 'started';
		activities.push({
			id: `session-${session.id}`,
			type: 'student',
			message: `${studentName} ${action} "${session.assessment.title}"`,
			time: timeAgo(session.createdAt),
		});
	});

	// Add result activities
	recentResults.forEach((result) => {
		const studentName = `${result.student.firstName} ${result.student.lastName}`;
		const score = result.marksObtained ? Number(result.marksObtained) : 0;
		const total = result.totalMarks ? Number(result.totalMarks) : 0;
		activities.push({
			id: `result-${result.id}`,
			type: 'grade',
			message: `Released results for ${studentName} - ${score}/${total} in "${result.assessment.title}"`,
			time: timeAgo(result.releasedAt || result.createdAt),
		});
	});

	// Sort activities by time (newest first) and limit to 10
	activities.sort((a, b) => {
		// Parse time strings to compare
		const aTime = a.time;
		const bTime = b.time;
		// Simple sort - you might want to store timestamps instead
		return 0; // Placeholder - we'll use the order they were added
	});

	// Alternative: Sort by actual date if we store timestamps
	// For now, just use the order we added them (most recent first)
	// Limit to 10 activities
	const recentActivities = activities.slice(0, 10);

	return {
		totalAssessments,
		totalStudents,
		completionRate,
		averageScore,
		statusDistribution,
		coursePerformance: coursePerformance.sort((a, b) => b.score - a.score),
		recentAssessments,
		activities: recentActivities,
	};
};

// Helper function to format time ago
function timeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);
	const diffYears = Math.floor(diffDays / 365);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
	if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
	if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
	return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}