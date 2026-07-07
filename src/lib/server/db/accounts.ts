// src/lib/server/db/accounts.ts
// Cross-table helpers for the split Staff/Student model — fills the gap
// left by the (auth) files' original assumption of a single `users.js`.

import { getPrismaClient } from './index.js'
import type { Student, Gender } from '@prisma/client'

export async function emailExists(email: string): Promise<boolean> {
  const prisma = await getPrismaClient()
  const normalized = email.trim().toLowerCase()
  const [staff, student] = await Promise.all([
    prisma.staff.findUnique({ where: { email: normalized }, select: { id: true } }),
    prisma.student.findUnique({ where: { email: normalized }, select: { id: true } }),
  ])
  return !!staff || !!student
}

export async function matricExists(matricNumber: string): Promise<boolean> {
  const prisma = await getPrismaClient()
  const student = await prisma.student.findUnique({
    where: { matricNumber: matricNumber.trim().toUpperCase() },
    select: { id: true },
  })
  return !!student
}

export interface CreateStudentInput {
  email: string
  firstName: string
  lastName: string
  otherNames?: string | null
  phone?: string | null
  passwordHash: string
  matricNumber: string
  departmentId: string
  programmeId?: string | null
  currentLevelId?: string | null
  entryYear: number
  gender?: Gender | null
}

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  const prisma = await getPrismaClient()
  return prisma.student.create({
    data: {
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      otherNames: input.otherNames ?? null,
      phone: input.phone ?? null,
      passwordHash: input.passwordHash,
      matricNumber: input.matricNumber.trim().toUpperCase(),
      departmentId: input.departmentId,
      programmeId: input.programmeId ?? null,
      currentLevelId: input.currentLevelId ?? null,
      entryYear: input.entryYear,
      gender: input.gender ?? null,
    },
  })
}

export async function updatePasswordHash(
  userType: 'staff' | 'student',
  userId: string,
  passwordHash: string,
): Promise<void> {
  const prisma = await getPrismaClient()
  if (userType === 'staff') {
    await prisma.staff.update({ where: { id: userId }, data: { passwordHash } })
  } else {
    await prisma.student.update({ where: { id: userId }, data: { passwordHash } })
  }
}