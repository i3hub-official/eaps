// src/lib/server/db/users.ts

import { prisma } from './index.js';
import type { User, UserRole } from '@prisma/client';

export type { User, UserRole };
export type SafeUser = Omit<User, 'passwordHash'>;

const safeSelect = {
  id: true, matricNumber: true, staffId: true, email: true,
  fullName: true, role: true, departmentId: true, level: true,
  photoUrl: true, isActive: true, createdAt: true, updatedAt: true,
} as const;

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function findUserByMatric(matricNumber: string) {
  return prisma.user.findUnique({ where: { matricNumber: matricNumber.toUpperCase().trim() } });
}

export async function getSafeUser(id: string): Promise<SafeUser | null> {
  return prisma.user.findUnique({ where: { id }, select: safeSelect });
}

// ✅ Fixed getUserById - using correct relation names from your schema
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      department: {
        include: {
          college: true,
          courses: {
            select: {
              code: true,
              title: true,
              creditUnits: true,
              level: true
            },
            take: 5
          }
        }
      },
      // ✅ Fixed: Use 'examSessions' instead of 'examAttempts'
      examSessions: {
        include: {
          exam: {
            include: {
              course: true
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        take: 10
      },
      // ✅ Fixed: Use 'courseRegistrations' instead of 'courses'
      courseRegistrations: {
        include: {
          course: true
        },
        take: 10
      },
      _count: {
        select: {
          examSessions: true,
          courseRegistrations: true
        }
      }
    }
  });
}

export async function listUsers(role?: UserRole): Promise<SafeUser[]> {
  return prisma.user.findMany({
    where: role ? { role } : undefined,
    select: safeSelect,
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });
}

export async function listStudentsByDepartment(departmentId: string): Promise<SafeUser[]> {
  return prisma.user.findMany({
    where: { role: 'student', departmentId },
    select: safeSelect,
    orderBy: [{ level: 'asc' }, { fullName: 'asc' }],
  });
}

export async function createUser(input: {
  email: string; fullName: string; passwordHash: string; role: UserRole;
  matricNumber?: string; staffId?: string; departmentId?: string;
  level?: number; photoUrl?: string;
}) {
  const data: any = {
    email: input.email.toLowerCase().trim(),
    fullName: input.fullName.trim(),
    passwordHash: input.passwordHash,
    role: input.role,
    matricNumber: input.matricNumber?.toUpperCase().trim() ?? null,
    staffId: input.staffId?.trim() ?? null,
    departmentId: input.departmentId ?? null,
    photoUrl: input.photoUrl ?? null,
  };

  if (input.level != null) {
    data.level = { connect: { id: input.level } };
  }

  return prisma.user.create({ data });
}

export async function updateUser(id: string, input: {
  fullName?: string; email?: string; departmentId?: string;
  level?: number; photoUrl?: string; isActive?: boolean;
}): Promise<SafeUser> {
  const { level, ...data } = input;

  return prisma.user.update({
    where: { id },
    data: {
      ...data,
      level: level != null ? { connect: { id: level } } : undefined,
    },
    select: safeSelect,
  });
}

export async function updatePasswordHash(id: string, passwordHash: string) {
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}

export async function deactivateUser(id: string) {
  await prisma.user.update({ where: { id }, data: { isActive: false } });
}

export async function emailExists(email: string): Promise<boolean> {
  const count = await prisma.user.count({ where: { email: email.toLowerCase().trim() } });
  return count > 0;
}

export async function matricExists(matricNumber: string): Promise<boolean> {
  const count = await prisma.user.count({ where: { matricNumber: matricNumber.toUpperCase().trim() } });
  return count > 0;
}

export async function updatePhotoUrl(id: string, photoUrl: string) {
  await prisma.user.update({ where: { id }, data: { photoUrl } });
}

// ─── Aliases (compatibility) ──────────────────────────────────────────────────

/** Alias for findUserByEmail */
export const getUserByEmail = findUserByEmail;

/** Returns just the password hash for a given email */
export async function getUserPasswordHash(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  return user?.passwordHash ?? null;
}