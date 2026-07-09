// This file contains the navigation configuration for the dashboard, including the navigation items and sections for different user roles. It defines the structure of the navigation menu based on the user's role, providing a clear and organized way to access various features and pages within the application.
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
import LogOut from '@lucide/svelte/icons/log-out';

export type NavItem = { label: string; href: string; icon: Component<any> };
export type NavSection = { label?: string; items: NavItem[] };
export type Role = 'student' | 'exam-officer' | 'invigilator' | 'admin';

export const roleLabel: Record<Role, string> = {
	student: 'Student Portal',
	'exam-officer': 'Examination Office',
	invigilator: 'Invigilation Console',
	admin: 'Administration'
};

export const navByRole: Record<Role, NavSection[]> = {
	student: [
		{ items: [{ label: 'Dashboard', href: '/student', icon: LayoutDashboard }] },
		{
			label: 'Coursework',
			items: [
				{ label: 'Courses', href: '/student/courses', icon: BookOpen },
				{ label: 'Practice', href: '/student/practice', icon: PencilLine },
				{ label: 'Assignments', href: '/student/assignments', icon: ClipboardList }
			]
		},
		{
			label: 'Assessments',
			items: [
				{ label: 'Upcoming tests', href: '/student/tests', icon: CalendarClock },
				{ label: 'Upcoming exams', href: '/student/exams', icon: GraduationCap },
				{ label: 'Results', href: '/student/results', icon: BarChart3 },
				{ label: 'Attendance', href: '/student/attendance', icon: CalendarCheck },
				{ label: 'Face enrollment', href: '/student/face-enroll', icon: ScanFace }
			]
		},
		{
			label: 'Updates',
			items: [
				{ label: 'Notifications', href: '/student/notifications', icon: Bell },
				{ label: 'Messages', href: '/student/messages', icon: MessageSquare }
			]
		}
	],
	'exam-officer': [
		{ items: [{ label: 'Dashboard', href: '/exam-officer', icon: LayoutDashboard }] },
		{
			label: 'Create',
			items: [
				{ label: 'Exam', href: '/exam-officer/create/exam', icon: FilePlus },
				{ label: 'Test', href: '/exam-officer/create/test', icon: FilePlus },
				{ label: 'Assignment', href: '/exam-officer/create/assignment', icon: FilePlus },
				{ label: 'Practice', href: '/exam-officer/create/practice', icon: FilePlus }
			]
		},
		{
			label: 'Content',
			items: [
				{ label: 'Question bank', href: '/exam-officer/question-bank', icon: Database },
				{ label: 'Grade submissions', href: '/exam-officer/grade', icon: ClipboardList }
			]
		},
		{
			label: 'Operations',
			items: [
				{ label: 'Scheduling', href: '/exam-officer/scheduling', icon: CalendarPlus },
				{ label: 'Approvals', href: '/exam-officer/approval', icon: ShieldCheck },
				{ label: 'Invigilators', href: '/exam-officer/invigilators', icon: Users },
				{ label: 'Device monitoring', href: '/exam-officer/device-monitoring', icon: Laptop },
				{ label: 'Incident reports', href: '/exam-officer/incidents', icon: TriangleAlert }
			]
		},
		{
			label: 'Insights',
			items: [
				{ label: 'Analytics', href: '/exam-officer/analytics', icon: BarChart3 },
				{ label: 'Reports', href: '/exam-officer/reports', icon: FileText }
			]
		}
	],
	invigilator: [
		{ items: [{ label: 'Live candidates', href: '/invigilator', icon: Radio }] },
		{
			label: 'Monitoring',
			items: [
				{ label: 'Device status', href: '/invigilator/devices', icon: Laptop },
				{ label: 'Camera status', href: '/invigilator/cameras', icon: Camera },
				{ label: 'Network status', href: '/invigilator/network', icon: Wifi },
				{ label: 'Flagged candidates', href: '/invigilator/flagged', icon: Flag }
			]
		}
	],
	admin: [
		{ items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard }] },
		{
			label: 'People',
			items: [
				{ label: 'Students', href: '/admin/students', icon: GraduationCap },
				{ label: 'Lecturers', href: '/admin/lecturers', icon: Users }
			]
		},
		{
			label: 'Structure',
			items: [
				{ label: 'Colleges', href: '/admin/colleges', icon: Building2 },
				{ label: 'Departments', href: '/admin/departments', icon: Layers },
				{ label: 'Courses', href: '/admin/courses', icon: BookOpen }
			]
		},
		{
			label: 'Oversight',
			items: [
				{ label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
				{ label: 'Reports', href: '/admin/reports', icon: FileText },
				{ label: 'Audit logs', href: '/admin/audit-logs', icon: ScrollText },
				{ label: 'Face duplicates', href: '/admin/face-duplicates', icon: ScanFace },
				{ label: 'Settings', href: '/admin/settings', icon: Settings }
			]
		}
	]
};

// Logout is not a plain navigable route — it's a POST form action — so it's kept
// separate from navByRole and rendered as a <form> in app-sidebar.svelte, not an <a>.
// Sharing the label/icon here still keeps all nav-adjacent config in one place.
export const logoutNavItem: { label: string; action: string; icon: Component<any> } = {
	label: 'Sign out',
	action: '/logout',
	icon: LogOut
};