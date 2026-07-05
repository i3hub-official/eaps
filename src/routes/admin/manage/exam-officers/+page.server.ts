// src/routes/admin/manage/exam-officers/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';
import { hashPassword } from '$lib/server/auth/password.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const prisma = await getPrismaClient();

	const [colleges, examOfficers] = await Promise.all([
		prisma.college.findMany({
			orderBy: { name: 'asc' },
			select: {
				id: true,
				name: true,
				code: true,
				_count: {
					select: {
						users: {
							where: { role: 'exam_officer', isActive: true }
						}
					}
				}
			}
		}),
		prisma.user.findMany({
			where: { role: 'exam_officer' },
			orderBy: { fullName: 'asc' },
			select: {
				id: true,
				fullName: true,
				email: true,
				staffId: true,
				collegeId: true,
				isActive: true,
				createdAt: true,
				college: {
					select: {
						id: true,
						name: true,
						code: true
					}
				}
			}
		})
	]);

	return {
		colleges,
		examOfficers
	};
};

export const actions: Actions = {
	// Create a new exam officer
	create: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const prisma = await getPrismaClient();

		const formData = await request.formData();
		const fullName = formData.get('fullName')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const staffId = formData.get('staffId')?.toString().trim();
		const collegeId = formData.get('collegeId')?.toString();
		const password = formData.get('password')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		const errors: Record<string, string> = {};

		// Validation
		if (!fullName) errors.fullName = 'Full name is required';
		if (!email) errors.email = 'Email is required';
		if (!staffId) errors.staffId = 'Staff ID is required';
		if (!collegeId) errors.collegeId = 'Please select a college';
		if (!password || password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		}
		if (password !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, { errors, values: { fullName, email, staffId, collegeId } });
		}

		try {
			// Check if email exists
			const existing = await prisma.user.findUnique({
				where: { email: email!.toLowerCase() }
			});

			if (existing) {
				return fail(400, {
					errors: { email: 'Email already exists' },
					values: { fullName, email, staffId, collegeId }
				});
			}

			const hashedPassword = await hashPassword(password!);

			const user = await prisma.user.create({
				data: {
					fullName: fullName!,
					email: email!.toLowerCase(),
					staffId: staffId!,
					passwordHash: hashedPassword,
					role: 'exam_officer',
					collegeId: parseInt(collegeId!),
					session: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)
				}
			});

			// Audit log
			await prisma.auditLog.create({
				data: {
					userId: locals.user!.id,
					action: 'exam_officer_created',
					entity: 'User',
					entityId: user.id,
					metadata: {
						email: user.email,
						fullName: user.fullName,
						collegeId: parseInt(collegeId!)
					}
				}
			});

			return {
				success: true,
				message: `Exam officer ${user.fullName} created successfully`
			};

		} catch (error) {
			console.error('Failed to create exam officer:', error);
			return fail(500, {
				errors: { general: 'Failed to create exam officer' },
				values: { fullName, email, staffId, collegeId }
			});
		}
	},

	// Assign an existing user as exam officer to a college
	assign: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const prisma = await getPrismaClient();

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const collegeId = formData.get('collegeId')?.toString();

		if (!userId || !collegeId) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			const user = await prisma.user.update({
				where: { id: userId },
				data: {
					collegeId: parseInt(collegeId),
					role: 'exam_officer'
				}
			});

			await prisma.auditLog.create({
				data: {
					userId: locals.user!.id,
					action: 'exam_officer_assigned',
					entity: 'User',
					entityId: user.id,
					metadata: {
						email: user.email,
						fullName: user.fullName,
						collegeId: parseInt(collegeId)
					}
				}
			});

			return {
				success: true,
				message: `${user.fullName} assigned as exam officer successfully`
			};

		} catch (error) {
			console.error('Failed to assign exam officer:', error);
			return fail(500, { error: 'Failed to assign exam officer' });
		}
	},

	// Unassign exam officer from college (remove college but keep role)
	unassign: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const prisma = await getPrismaClient();

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) {
			return fail(400, { error: 'Missing user ID' });
		}

		try {
			const user = await prisma.user.update({
				where: { id: userId },
				data: { collegeId: null }
			});

			await prisma.auditLog.create({
				data: {
					userId: locals.user!.id,
					action: 'exam_officer_unassigned',
					entity: 'User',
					entityId: user.id,
					metadata: {
						email: user.email,
						fullName: user.fullName
					}
				}
			});

			return {
				success: true,
				message: `${user.fullName} unassigned from college successfully`
			};

		} catch (error) {
			console.error('Failed to unassign exam officer:', error);
			return fail(500, { error: 'Failed to unassign exam officer' });
		}
	},

	// Toggle exam officer active status
	toggleActive: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const prisma = await getPrismaClient();

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) {
			return fail(400, { error: 'Missing user ID' });
		}

		try {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { isActive: true, email: true, fullName: true }
			});

			if (!user) {
				return fail(404, { error: 'User not found' });
			}

			const updated = await prisma.user.update({
				where: { id: userId },
				data: { isActive: !user.isActive }
			});

			await prisma.auditLog.create({
				data: {
					userId: locals.user!.id,
					action: `exam_officer_${updated.isActive ? 'activated' : 'deactivated'}`,
					entity: 'User',
					entityId: updated.id,
					metadata: {
						email: updated.email,
						fullName: updated.fullName,
						isActive: updated.isActive
					}
				}
			});

			return {
				success: true,
				message: `Exam officer ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
				isActive: updated.isActive
			};

		} catch (error) {
			console.error('Failed to toggle exam officer status:', error);
			return fail(500, { error: 'Failed to toggle status' });
		}
	},

	// Delete exam officer
	delete: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const prisma = await getPrismaClient();

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) {
			return fail(400, { error: 'Missing user ID' });
		}

		try {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { email: true, fullName: true }
			});

			if (!user) {
				return fail(404, { error: 'User not found' });
			}

			await prisma.user.delete({
				where: { id: userId }
			});

			await prisma.auditLog.create({
				data: {
					userId: locals.user!.id,
					action: 'exam_officer_deleted',
					entity: 'User',
					entityId: userId,
					metadata: {
						email: user.email,
						fullName: user.fullName
					}
				}
			});

			return {
				success: true,
				message: `Exam officer ${user.fullName} deleted successfully`
			};

		} catch (error) {
			console.error('Failed to delete exam officer:', error);
			return fail(500, { error: 'Failed to delete exam officer' });
		}
	}
};