// src/lib/server/auth/redirect.ts
//
// Single source of truth for post-login redirects.
// Import and call roleRedirect(user.role) after successful authentication.

import type { UserRole } from '@prisma/client';

export function roleRedirect(role: UserRole): string {
  switch (role) {
    case 'admin':        return '/admin';
    case 'lecturer':     return '/lecturer';
    case 'invigilator':  return '/invigilator';
    case 'student':      return '/student';
    case 'hod':          return '/hod';
    case 'dean':         return '/dean';
    case 'exam_officer': return '/exam-officer';
    case 'vc_dvc':       return '/vc-dvc';
    default:             return '/';
  }
}