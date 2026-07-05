// src/lib/server/db/users.ts

import { getPrismaClient } from './index.js';
import type { User, UserRole } from '@prisma/client';

export type { User, UserRole };
export type SafeUser = Omit<User, 'passwordHash'>;

const safeSelect = {
  id: true, matricNumber: true, staffId: true, email: true,
  fullName: true, role: true, departmentId: true, level: true,
  photoUrl: true, isActive: true, createdAt: true, updatedAt: true,
} as const;

export async function findUserById(id: string) {
  const prisma = await getPrismaClient();

  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string) {
  const prisma = await getPrismaClient();

  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function findUserByMatric(matricNumber: string) {
  const prisma = await getPrismaClient();

  return prisma.user.findUnique({ where: { matricNumber: matricNumber.toUpperCase().trim() } });
}

export async function getSafeUser(id: string): Promise<SafeUser | null> {
  const prisma = await getPrismaClient();

  return prisma.user.findUnique({ where: { id }, select: safeSelect });
}

export async function getUserById(id: string) {
  const prisma = await getPrismaClient();

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
  const prisma = await getPrismaClient();

  return prisma.user.findMany({
    where: role ? { role } : undefined,
    select: safeSelect,
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });
}

export async function listStudentsByDepartment(departmentId: string): Promise<SafeUser[]> {
  const prisma = await getPrismaClient();

  return prisma.user.findMany({
    where: { role: 'student', departmentId },
    select: safeSelect,
    orderBy: [{ level: 'asc' }, { fullName: 'asc' }],
  });
}


export async function createUser(input: {
  email: string; 
  fullName: string; 
  passwordHash: string; 
  role: UserRole;
  matricNumber?: string; 
  staffId?: string; 
  departmentId?: string;
  collegeId?: string;
  level?: number; 
  photoUrl?: string;
  phone?: string;
}) {
  const prisma = await getPrismaClient();

  const data: any = {
    email: input.email.toLowerCase().trim(),
    fullName: input.fullName.trim(),
    passwordHash: input.passwordHash,
    role: input.role,
    matricNumber: input.matricNumber?.toUpperCase().trim() ?? null,
    staffId: input.staffId?.trim() ?? null,
    phone: input.phone?.trim() ?? null,
    photoUrl: input.photoUrl ?? null,
  };

  // collegeId needs to be parsed as Int because it's an Int in the schema
  if (input.collegeId) {
    data.college = { connect: { id: parseInt(input.collegeId) } };
  }
  
  if (input.departmentId) {
    data.department = { connect: { id: input.departmentId } };
  }

  if (input.level != null) {
    data.level = { connect: { level: input.level } };
  }
  
  return prisma.user.create({ data });
}

export async function updateUser(id: string, input: {
  fullName?: string;
  email?: string; 
  departmentId?: string;
  level?: number; 
  photoUrl?: string; 
  isActive?: boolean; 
  collegeId?: string;
  staffId?: string;
  matricNumber?: string;
  phone?: string;
}): Promise<SafeUser> {
  const prisma = await getPrismaClient();

  const { level, departmentId, collegeId, ...data } = input;

  return prisma.user.update({
    where: { id },
    data: {
      ...data,
      department: departmentId ? { connect: { id: departmentId } } : undefined,
      level: level != null ? { connect: { level: level } } : undefined,
      college: collegeId ? { connect: { id: parseInt(collegeId) } } : undefined,
    },
    select: safeSelect,
  });
}

export async function updatePasswordHash(id: string, passwordHash: string) {
  const prisma = await getPrismaClient();

  await prisma.user.update({ where: { id }, data: { passwordHash } });
}

export async function deactivateUser(id: string) {
  const prisma = await getPrismaClient();

  await prisma.user.update({ where: { id }, data: { isActive: false } });
}

export async function emailExists(email: string): Promise<boolean> {
  const prisma = await getPrismaClient();

  const count = await prisma.user.count({ where: { email: email.toLowerCase().trim() } });
  return count > 0;
}

export async function matricExists(matricNumber: string): Promise<boolean> {
  const prisma = await getPrismaClient();

  const count = await prisma.user.count({ where: { matricNumber: matricNumber.toUpperCase().trim() } });
  return count > 0;
}

export async function updatePhotoUrl(id: string, photoUrl: string) {
  const prisma = await getPrismaClient();

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