// src/lib/types/user.ts

export type UserRole =
  | 'admin'
  | 'lecturer'
  | 'invigilator'
  | 'student'
  | 'hod'
  | 'dean'
  | 'exam_officer'
  | 'vc_dvc';

export interface User {
  id: string;
  matric_number: string | null;
  staff_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  level: number | null;
  photo_url: string | null;
  is_active: boolean;
  is_suspended: boolean;
  created_at: Date;
}

export interface SafeUser {
  id: string;
  matricNumber: string | null;
  staffId: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  level: number | null;
  photoUrl: string | null;
  isActive: boolean;
  isSuspended: boolean;
}

export interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
}

export interface SessionUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  matric_number: string | null;
  staff_id: string | null;
  department_id: string | null;
  photo_url: string | null;
  is_active: boolean;
  is_suspended: boolean;
}

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  title?: string;
  address?: string;
  state?: string;
  lga?: string;
  department?: string;
  faculty?: string;
  college?: string;
  semester?: string;
  session?: string;
  programme?: string;
  level?: string;
  matricNumber?: string;
  staffId?: string;
  joinDate?: string;
  courses?: { id: string; title: string; code: string }[];
  stats?: { label: string; value: string | number; icon: string }[];
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
  isVerified?: boolean;
  isActive?: boolean;
  isSuspended?: boolean;
  lastActive?: string;
}

export interface PerformanceData {
  grades: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  trend: number[];
  subjectPerformance: Array<{
    subject: string;
    score: number;
  }>;
  improvement: number;
}

// ── Role groupings (useful for permission checks in UI logic) ─────────────────

/** Roles that have access to governance/reporting dashboards. */
export const GOVERNANCE_ROLES: UserRole[] = ['admin', 'exam_officer', 'dean', 'vc_dvc'];

/** Roles that can create or manage exams. */
export const EXAM_MANAGEMENT_ROLES: UserRole[] = ['admin', 'exam_officer'];

/** Roles that can lecture (including HODs who also lecture). */
export const LECTURER_ROLES: UserRole[] = ['lecturer', 'hod'];

/** Staff roles (everyone except students). */
export const STAFF_ROLES: UserRole[] = [
  'admin', 'lecturer', 'invigilator', 'hod', 'dean', 'exam_officer', 'vc_dvc'
];

/** URL home map per role — mirrors ROLE_HOME in login server. */
export const ROLE_HOME: Record<UserRole, string> = {
  student: '/student',
  lecturer: '/lecturer',
  invigilator: '/invigilator',
  admin: '/admin',
  hod: '/hod',
  dean: '/dean',
  exam_officer: '/exam-officer',
  vc_dvc: '/vc-dvc',
};