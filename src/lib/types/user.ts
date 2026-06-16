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
  college?: string;      // "College" for students, "Faculty" for staff
  level?: string;
  matricNumber?: string;
  staffId?: string;
  joinDate?: string;
  courses?: { id: string; title: string; code: string }[];
  stats?: { label: string; value: string | number; icon: string }[];
  socialLinks?: { linkedin?: string; github?: string; twitter?: string; website?: string };
  isVerified?: boolean;
  isActive?: boolean;
  lastActive?: string;
}