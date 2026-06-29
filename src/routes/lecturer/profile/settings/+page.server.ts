// src/routes/lecturer/profile/settings/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { hashPassword } from '$lib/server/auth/password.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get user preferences
  const preferences = await prisma.userPreference.findUnique({
    where: { userId: user.id }
  });

  // Get user with department and college
  const userWithDetails = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      department: {
        include: {
          college: true
        }
      },
      level: true
    }
  });

  return {
    user: userWithDetails,
    preferences: preferences?.prefs || {}
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();

    const formData = await request.formData();
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const title = formData.get('title') as string;
    const bio = formData.get('bio') as string;
    const twitter = formData.get('twitter') as string;
    const linkedin = formData.get('linkedin') as string;
    const github = formData.get('github') as string;

    if (!fullName) {
      return fail(400, { error: 'Full name is required' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName,
        phone: phone || null,
        title: title || null,
        bio: bio || null,
        twitter: twitter || null,
        linkedin: linkedin || null,
        github: github || null
      }
    });

    return { success: true, message: 'Profile updated successfully!' };
  },

  updatePreferences: async ({ request, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();

    const formData = await request.formData();
    const theme = formData.get('theme') as string;
    const language = formData.get('language') as string;
    const emailNotifications = formData.get('emailNotifications') === 'on';
    const fontSize = formData.get('fontSize') as string;

    const prefs = {
      theme: theme || 'system',
      language: language || 'en',
      emailNotifications,
      fontSize: fontSize || 'medium'
    };

    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: { prefs },
      create: {
        userId: user.id,
        prefs
      }
    });

    return { success: true, message: 'Preferences updated successfully!' };
  },

  changePassword: async ({ request, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();

    const formData = await request.formData();
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return fail(400, { error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return fail(400, { error: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters' });
    }

    // Verify current password
    const { verifyPassword } = await import('$lib/server/auth/password.js');
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return fail(400, { error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword }
    });

    return { success: true, message: 'Password changed successfully!' };
  },

  updateNotifications: async ({ request, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();

    const formData = await request.formData();
    const examNotifications = formData.get('examNotifications') === 'on';
    const resultNotifications = formData.get('resultNotifications') === 'on';
    const systemNotifications = formData.get('systemNotifications') === 'on';

    // Get existing preferences
    const existing = await prisma.userPreference.findUnique({
      where: { userId: user.id }
    });

    const prefs = {
      ...(existing?.prefs as any || {}),
      notifications: {
        exam: examNotifications,
        results: resultNotifications,
        system: systemNotifications
      }
    };

    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: { prefs },
      create: {
        userId: user.id,
        prefs
      }
    });

    return { success: true, message: 'Notification preferences updated!' };
  }
};