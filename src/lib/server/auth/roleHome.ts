// src/lib/server/auth/roleHome.ts
import type { StaffRole } from '@prisma/client'

export function staffRoleHome(role: StaffRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'VC':
    case 'DVC':
    case 'REGISTRAR':
    case 'UNIVERSITY_EXAM_OFFICER':
    case 'UNIVERSITY_COURSE_COORDINATOR':
      return '/admin'
    case 'DEAN':
      return '/dean'
    case 'HOD':
    case 'COLLEGE_EXAM_OFFICER':
    case 'COLLEGE_COORDINATOR':
    case 'DEPARTMENT_EXAM_OFFICER':
    case 'DEPARTMENT_COORDINATOR':
      return '/hod'
    case 'LECTURER':
      return '/lecturer'
    case 'INVIGILATOR':
      return '/invigilator'
    default: {
      const _exhaustive: never = role
      return '/'
    }
  }
}