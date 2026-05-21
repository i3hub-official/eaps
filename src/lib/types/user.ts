// src/lib/types/user.ts

export type UserRole = 'admin' | 'lecturer' | 'invigilator' | 'student';

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
  created_at: Date;
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
}
