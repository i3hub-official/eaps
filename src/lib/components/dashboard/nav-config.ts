// src/lib/components/dashboard/nav-config.ts
import type { Component } from 'svelte';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import BookOpen from '@lucide/svelte/icons/book-open';
import PencilLine from '@lucide/svelte/icons/pencil-line';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import CalendarCheck from '@lucide/svelte/icons/calendar-check';
import Bell from '@lucide/svelte/icons/bell';
import MessageSquare from '@lucide/svelte/icons/message-square';
import FilePlus from '@lucide/svelte/icons/file-plus';
import Database from '@lucide/svelte/icons/database';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import FileText from '@lucide/svelte/icons/file-text';
import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Users from '@lucide/svelte/icons/users';
import Laptop from '@lucide/svelte/icons/laptop';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import Radio from '@lucide/svelte/icons/radio';
import Camera from '@lucide/svelte/icons/camera';
import Wifi from '@lucide/svelte/icons/wifi';
import Flag from '@lucide/svelte/icons/flag';
import Building2 from '@lucide/svelte/icons/building-2';
import Layers from '@lucide/svelte/icons/layers';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import Settings from '@lucide/svelte/icons/settings';
import ScanFace from '@lucide/svelte/icons/scan-face';
import Mail from '@lucide/svelte/icons/mail';
import FileCheck from '@lucide/svelte/icons/file-check';
import Clock from '@lucide/svelte/icons/clock';
import UserCheck from '@lucide/svelte/icons/user-check';
import UserX from '@lucide/svelte/icons/user-x';
import Award from '@lucide/svelte/icons/award';
import Shield from '@lucide/svelte/icons/shield';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import Code from '@lucide/svelte/icons/code';
import Server from '@lucide/svelte/icons/server';
import Activity from '@lucide/svelte/icons/activity';
import Cpu from '@lucide/svelte/icons/cpu';
import HardDrive from '@lucide/svelte/icons/hard-drive';

export type NavItem = { label: string; href: string; icon: Component<any> };
export type NavSection = { label?: string; items: NavItem[] };
export type Role = 'student' | 'lecturer' | 'exam-officer' | 'invigilator' | 'admin';

export const roleLabel: Record<Role, string> = {
	student: 'Student Portal',
	lecturer: 'Lecturer Portal',
	'exam-officer': 'Examination Office',
	invigilator: 'Invigilation Console',
	admin: 'Administration'
};

export const navByRole: Record<Role, NavSection[]> = {
	student: [
		// ─── Overview ────────────────────────────────────────────────────
		{ items: [{ label: 'Dashboard', href: '/student', icon: LayoutDashboard }] },
		
		// ─── Academic Work ─────────────────────────────────────────────
		{
			label: 'Academic Work',
			items: [
				{ label: 'My Courses', href: '/student/courses', icon: BookOpen },
				{ label: 'Assignments', href: '/student/assignments', icon: ClipboardList },
				{ label: 'Practice', href: '/student/practice', icon: PencilLine }
			]
		},
		
		// ─── Assessments ──────────────────────────────────────────────
		{
			label: 'Assessments',
			items: [
				{ label: 'Upcoming Tests', href: '/student/tests', icon: CalendarClock },
				{ label: 'Upcoming Exams', href: '/student/exams', icon: GraduationCap },
				{ label: 'Results & Transcript', href: '/student/results', icon: BarChart3 },
				{ label: 'Attendance', href: '/student/attendance', icon: CalendarCheck }
			]
		},
		
		// ─── Communication ────────────────────────────────────────────
		{
			label: 'Communication',
			items: [
				{ label: 'Notifications', href: '/student/notifications', icon: Bell },
				{ label: 'Messages', href: '/student/messages', icon: MessageSquare }
			]
		}
	],
	
	lecturer: [
		// ─── Overview ────────────────────────────────────────────────────
		{ items: [{ label: 'Dashboard', href: '/lecturer', icon: LayoutDashboard }] },
		
		// ─── Teaching ──────────────────────────────────────────────────
		{
			label: 'Teaching',
			items: [
				{ label: 'My Courses', href: '/lecturer/courses', icon: BookOpen },
				{ label: 'Attendance', href: '/lecturer/attendance', icon: CalendarCheck }
			]
		},
		
		// ─── Assessments ──────────────────────────────────────────────
		{
			label: 'Assessments',
			items: [
				{ label: 'All Assessments', href: '/lecturer/assessments', icon: ClipboardList },
				{ label: 'Practice', href: '/lecturer/assessments/create/practice', icon: FilePlus },
				{ label: 'Assignment', href: '/lecturer/assessments/create/assignment', icon: FilePlus },
				{ label: 'Test', href: '/lecturer/assessments/create/test', icon: FilePlus },
				{ label: 'Exam', href: '/lecturer/assessments/create/exam', icon: FileCheck }
			]
		},
		
		// ─── Content & Grading ────────────────────────────────────────
		{
			label: 'Content & Grading',
			items: [
				{ label: 'Question Bank', href: '/lecturer/question-bank', icon: Database },
				{ label: 'Grade Submissions', href: '/lecturer/grade', icon: ClipboardList }
			]
		},
		
		// ─── Insights ─────────────────────────────────────────────────
		{
			label: 'Insights',
			items: [
				{ label: 'Reports', href: '/lecturer/reports', icon: BarChart3 },
				{ label: 'Assessment Reports', href: '/lecturer/reports/assessments', icon: BarChart3 }
			]
		},
		
		// ─── Communication ────────────────────────────────────────────
		{
			label: 'Communication',
			items: [
				{ label: 'Notifications', href: '/lecturer/notifications', icon: Bell },
				{ label: 'Messages', href: '/lecturer/messages', icon: MessageSquare }
			]
		}
	],
	
	'exam-officer': [
		// ─── Overview ────────────────────────────────────────────────────
		{ items: [{ label: 'Dashboard', href: '/exam-officer', icon: LayoutDashboard }] },
		
		// ─── Exam Management ──────────────────────────────────────────
		{
			label: 'Exam Management',
			items: [
				{ label: 'Practice', href: '/exam-officer/create/practice', icon: FilePlus },
				{ label: 'Assignment', href: '/exam-officer/create/assignment', icon: FilePlus },
				{ label: 'Test', href: '/exam-officer/create/test', icon: FilePlus },
				{ label: 'Exam', href: '/exam-officer/create/exam', icon: FileCheck }
			]
		},
		
		// ─── Operations ───────────────────────────────────────────────
		{
			label: 'Operations',
			items: [
				{ label: 'Scheduling', href: '/exam-officer/scheduling', icon: CalendarPlus },
				{ label: 'Approvals', href: '/exam-officer/approval', icon: ShieldCheck },
				{ label: 'Invigilators', href: '/exam-officer/invigilators', icon: Users },
				{ label: 'Incident Reports', href: '/exam-officer/incidents', icon: TriangleAlert }
			]
		},
		
		// ─── Monitoring ──────────────────────────────────────────────
		{
			label: 'Monitoring',
			items: [
				{ label: 'Device Monitoring', href: '/exam-officer/device-monitoring', icon: Laptop },
				{ label: 'Live Sessions', href: '/exam-officer/live-sessions', icon: Radio }
			]
		},
		
		// ─── Content ──────────────────────────────────────────────────
		{
			label: 'Content',
			items: [
				{ label: 'Question Bank', href: '/exam-officer/question-bank', icon: Database },
				{ label: 'Grade Submissions', href: '/exam-officer/grade', icon: ClipboardList }
			]
		},
		
		// ─── Insights ─────────────────────────────────────────────────
		{
			label: 'Insights',
			items: [
				{ label: 'Analytics', href: '/exam-officer/analytics', icon: BarChart3 },
				{ label: 'Reports', href: '/exam-officer/reports', icon: FileText }
			]
		}
	],
	
	invigilator: [
		// ─── Overview ────────────────────────────────────────────────────
		{ items: [{ label: 'Live Candidates', href: '/invigilator', icon: Radio }] },
		
		// ─── Monitoring ──────────────────────────────────────────────
		{
			label: 'Monitoring',
			items: [
				{ label: 'Device Status', href: '/invigilator/devices', icon: Laptop },
				{ label: 'Camera Status', href: '/invigilator/cameras', icon: Camera },
				{ label: 'Network Status', href: '/invigilator/network', icon: Wifi },
				{ label: 'Flagged Candidates', href: '/invigilator/flagged', icon: Flag }
			]
		},
		
		// ─── Actions ──────────────────────────────────────────────────
		{
			label: 'Actions',
			items: [
				{ label: 'Incident Reports', href: '/invigilator/incidents', icon: AlertCircle },
				{ label: 'Session Logs', href: '/invigilator/logs', icon: ScrollText }
			]
		}
	],
	
	admin: [
		// ─── Overview ────────────────────────────────────────────────────
		{ items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard }] },
		
		// ─── User Management ──────────────────────────────────────────
		{
			label: 'User Management',
			items: [
				{ label: 'Students', href: '/admin/students', icon: GraduationCap },
				{ label: 'Lecturers', href: '/admin/lecturers', icon: Users }
			]
		},
		
		// ─── Academic Structure ──────────────────────────────────────
		{
			label: 'Academic Structure',
			items: [
				{ label: 'Colleges', href: '/admin/colleges', icon: Building2 },
				{ label: 'Departments', href: '/admin/departments', icon: Layers },
				{ label: 'Courses', href: '/admin/courses', icon: BookOpen },
				{ label: 'Levels', href: '/admin/levels', icon: Award }
			]
		},
		
		// ─── Oversight ────────────────────────────────────────────────
		{
			label: 'Oversight',
			items: [
				{ label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
				{ label: 'Reports', href: '/admin/reports', icon: FileText },
				{ label: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText }
			]
		},
		
		// ─── Security ──────────────────────────────────────────────────
		{
			label: 'Security',
			items: [
				{ label: 'Face Duplicates', href: '/admin/face-duplicates', icon: ScanFace },
				{ label: 'User Sessions', href: '/admin/sessions', icon: Shield },
				{ label: 'Access Control', href: '/admin/access-control', icon: UserCheck },
				{ label: 'Suspicious Activity', href: '/admin/suspicious', icon: UserX }
			]
		},
		
		// ─── System ────────────────────────────────────────────────────
		{
			label: 'System',
			items: [
				{ label: 'Development Team', href: '/admin/team', icon: Code },
				{ label: 'Staff Invitations', href: '/admin/staff-invitations', icon: Mail },
				{ label: 'System Logs', href: '/admin/system-logs', icon: Server },
				{ label: 'Settings', href: '/admin/settings', icon: Settings }
			]
		}
	]
};