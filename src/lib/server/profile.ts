// src/lib/server/profile.ts
// Shared load + action logic for lecturer & invigilator profile pages.
// Each role's +page.server.ts calls these with its own role guard.

import { fail } from '@sveltejs/kit';
import { getPrismaClient } from '$lib/server/db/index.js';

import { hashPassword, verifyPassword } from '$lib/server/auth/password.js';
import { uploadToCloudinary } from '$lib/server/cloudinary.js';



export const TITLES = ['', 'Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Engr.', 'Pharm.', 'Arc.', 'Barr.'];

// ── Load ─────────────────────────────────────────────────────────────────────

export async function loadProfile(userId: string) {
  const prisma = await getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, title: true, fullName: true, email: true,
      phone: true, photoUrl: true, role: true,
      staffId: true, collegeId: true, departmentId: true,
      createdAt: true, updatedAt: true,
      college:    { select: { name: true } },
      department: { select: { name: true } },
      notifications: {
        where: { isRead: false },
        select: { id: true },
      },
    },
  });

  const recentActivity = await prisma.auditLog.findMany({

    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return { user, recentActivity, titles: TITLES };
}

// ── Update profile ────────────────────────────────────────────────────────────

export async function updateProfile(request: Request, userId: string) {
  const prisma = await getPrismaClient();

  const fd = await request.formData();
  const title    = String(fd.get('title')    ?? '').trim();
  const fullName = String(fd.get('fullName') ?? '').trim();
  const phone    = String(fd.get('phone')    ?? '').trim() || null;

  if (!fullName) return fail(400, { field: 'profile', error: 'Full name is required.' });

  // Photo upload (optional — only present if user selected a file)
  const photoFile = fd.get('photo') as File | null;
  let photoUrl: string | undefined;

  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 5 * 1024 * 1024) {
      return fail(400, { field: 'profile', error: 'Photo must be under 5 MB.' });
    }
    if (!photoFile.type.startsWith('image/')) {
      return fail(400, { field: 'profile', error: 'File must be an image.' });
    }
    const arrayBuffer = await photoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploaded = await uploadToCloudinary(buffer, {
      folder: 'mouau-etest/profiles',
      public_id: `user-${userId}`,
      overwrite: true,
      transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
    });
    photoUrl = uploaded.secure_url;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      title:    title || null,
      fullName,
      phone,
      ...(photoUrl ? { photoUrl } : {}),
    },
  });

  return { success: true, field: 'profile', message: 'Profile updated.' };
}

// ── Change password ───────────────────────────────────────────────────────────

export async function changePassword(request: Request, userId: string) {
  const prisma = await getPrismaClient();

  const fd      = await request.formData();
  const current = String(fd.get('currentPassword') ?? '');
  const next    = String(fd.get('newPassword')     ?? '');
  const confirm = String(fd.get('confirmPassword') ?? '');

  if (next.length < 8)  return fail(400, { field: 'password', error: 'Password must be at least 8 characters.' });
  if (next !== confirm) return fail(400, { field: 'password', error: 'Passwords do not match.' });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return fail(404, { field: 'password', error: 'User not found.' });

  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) return fail(400, { field: 'password', error: 'Current password is incorrect.' });

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  return { success: true, field: 'password', message: 'Password changed.' };
}