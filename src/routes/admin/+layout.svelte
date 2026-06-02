<!-- src/routes/(admin)/+layout.svelte -->
<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
	import { onMount } from 'svelte';
	import {
		LayoutDashboard,
		Users,
		FileText,
		LogOut,
		Menu,
		X,
		Sun,
		Moon,
		ShieldAlert,
		ChevronRight,
		ShieldCheck,
		GraduationCap,
		BookOpen,
		ChevronDown,
		LoaderCircle,
		ClipboardList,
		AlertTriangle,
		Activity,
		ScrollText,
		TrendingUp,
		BarChart3,
		PieChart,
		Target,
		Award,
		School,
		Building2,
		Layers,
		Calendar,
		Clock,
		UserCheck,
		UserX,
		UserPlus,
		Bell,
		Shield,
		FileBarChart,
		BrainCircuit,
		BookMarked,
		Monitor,
		EyeOff,
		ScanFace,
		Fingerprint,
		Plus,
		Command,
		Search,
		ChevronLeft,
		Home,
		Settings,
		HelpCircle,
		Globe,
		Database,
		Zap,
		Eye,
		RefreshCw,
		Maximize2,
		Minimize2,
		Flag,
		Star,
		Pin,
		Trash2,
		Edit3,
		Copy,
		Download,
		Upload,
		Filter,
		Sliders,
		Grid,
		List,
		CheckCircle,
		XCircle,
		Info,
		Mail,
		MessageSquare,
		Video,
		Mic,
		Camera,
		Lock,
		Unlock,
		Key,
		Cpu,
		HardDrive,
		Wifi,
		Battery,
		Volume2,
		VolumeX
	} from 'lucide-svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	onMount(() => {
		initTheme();
		initKeyboardShortcuts();
		initIdleDetection();
		loadRecentActivity();
		loadSystemStats();
		loadNotifications();
		
		// Easter egg: Konami code detection
		window.addEventListener('keydown', handleKonami);
		return () => {
			window.removeEventListener('keydown', handleKonami);
			clearIdleTimer();
		};
	});

	let theme = $derived(getTheme());
	let sidebarOpen = $state(false);
	let navLoading = $state<string | null>(null);
	let showSignOutModal = $state(false);
	let showShortcutsModal = $state(false);
	let userMenuOpen = $state(false);
	let notificationsOpen = $state(false);
	let showPerfMetrics = $state(false);
	let showTimeoutWarning = $state(false);
	let searchQuery = $state('');
	let konamiIndex = $state(0);
	let idleTime = $state(0);
	let timeLeft = $state(60);
	let idleTimer: any = null;
	
	// Expandable group states
	let usersExpanded = $state(false);
	let reportsExpanded = $state(false);
	
	// Pinned items
	let pinnedItems = $state<string[]>([]);
	
	// Data states
	let recentActivities = $state<any[]>([]);
	let systemStats = $state({ activeExams: 0, onlineUsers: 0, pendingReviews: 0, systemStatus: 'healthy' as 'healthy' | 'warning' | 'error' });
	let notifications = $state<any[]>([]);
	let unreadCount = $state(0);
	let loadTime = $state(0);
	let apiCalls = $state(0);
	let isMobile = $state(false);
	
	// Quick actions visibility
	let showQuickActions = $state(true);

	const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

	function handleKonami(e: KeyboardEvent) {
		if (e.key === konamiCode[konamiIndex]) {
			konamiIndex++;
			if (konamiIndex === konamiCode.length) {
				activateEasterEgg();
				konamiIndex = 0;
			}
		} else {
			konamiIndex = 0;
		}
	}

	function activateEasterEgg() {
		showPerfMetrics = true;
		setTimeout(() => {
			showPerfMetrics = false;
		}, 5000);
	}

	function initKeyboardShortcuts() {
		window.addEventListener('keydown', (e) => {
			if (e.ctrlKey && e.key === 'k') {
				e.preventDefault();
				document.querySelector<HTMLInputElement>('.sidebar-search-input')?.focus();
			}
			if (e.ctrlKey && e.key === 'b') {
				e.preventDefault();
				sidebarOpen = !sidebarOpen;
			}
			if (e.ctrlKey && e.key === 'h') {
				e.preventDefault();
				showShortcutsModal = true;
			}
			if (e.ctrlKey && e.shiftKey && e.key === 'P') {
				e.preventDefault();
				showPerfMetrics = !showPerfMetrics;
			}
		});
	}

	function initIdleDetection() {
		const resetIdleTimer = () => {
			idleTime = 0;
			if (showTimeoutWarning) {
				showTimeoutWarning = false;
				clearTimeout(idleTimer);
			}
		};
		
		window.addEventListener('mousemove', resetIdleTimer);
		window.addEventListener('keypress', resetIdleTimer);
		window.addEventListener('click', resetIdleTimer);
		
		setInterval(() => {
			idleTime++;
			if (idleTime >= 25 && !showTimeoutWarning) { // 25 minutes
				showTimeoutWarning = true;
				startCountdown();
			}
		}, 60000);
	}

	function startCountdown() {
		timeLeft = 60;
		idleTimer = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				clearInterval(idleTimer);
				showSignOutModal = true;
			}
		}, 1000);
	}

	function extendSession() {
		showTimeoutWarning = false;
		idleTime = 0;
		clearInterval(idleTimer);
	}

	function clearIdleTimer() {
		if (idleTimer) clearInterval(idleTimer);
	}

	async function loadRecentActivity() {
		// Simulated data - replace with actual API call
		recentActivities = [
			{ message: 'New exam created: CST 401', timeAgo: '2 min ago' },
			{ message: 'Student submitted exam', timeAgo: '15 min ago' },
			{ message: 'Violation flagged: Exam 304', timeAgo: '1 hour ago' },
			{ message: 'New user registered', timeAgo: '3 hours ago' }
		];
	}

	async function loadSystemStats() {
		// Simulated data - replace with actual API call
		systemStats = {
			activeExams: 12,
			onlineUsers: 87,
			pendingReviews: 5,
			systemStatus: 'healthy'
		};
	}

	async function loadNotifications() {
		// Simulated data - replace with actual API call
		notifications = [
			{ id: 1, title: 'Exam Starting Soon', message: 'CST 301 exam starts in 30 minutes', read: false, time: '5 min ago' },
			{ id: 2, title: 'Violation Alert', message: 'Multiple tab switches detected', read: false, time: '1 hour ago' },
			{ id: 3, title: 'System Update', message: 'Platform update scheduled', read: true, time: '1 day ago' }
		];
		unreadCount = notifications.filter(n => !n.read).length;
	}

	function markAllRead() {
		notifications = notifications.map(n => ({ ...n, read: true }));
		unreadCount = 0;
	}

	function togglePin(itemHref: string) {
		if (pinnedItems.includes(itemHref)) {
			pinnedItems = pinnedItems.filter(i => i !== itemHref);
		} else {
			pinnedItems = [...pinnedItems, itemHref];
		}
	}

	// Navigation structure
	const navGroups = [
		{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, children: null },
		{
			href: '/admin/users',
			label: 'Users',
			icon: Users,
			children: [
				{ href: '/admin/users', label: 'All Users', icon: Users },
				{ href: '/admin/users?role=student', label: 'Students', icon: GraduationCap },
				{ href: '/admin/users?role=lecturer', label: 'Lecturers', icon: BookOpen },
				{ href: '/admin/users?role=invigilator', label: 'Invigilators', icon: ShieldCheck }
			]
		},
		{ href: '/admin/security', label: 'Security', icon: ShieldAlert, children: null },
		{
			href: '/admin/reports',
			label: 'Reports',
			icon: FileText,
			children: [
				{ href: '/admin/reports', label: 'Overview', icon: Activity },
				{ href: '/admin/reports/exam-performance', label: 'Exam Performance', icon: ClipboardList },
				{ href: '/admin/reports/student-performance', label: 'Student Performance', icon: TrendingUp },
				{ href: '/admin/reports/course-analysis', label: 'Course Analysis', icon: BookMarked },
				{ href: '/admin/reports/question-analysis', label: 'Question Analysis', icon: BrainCircuit },
				{ href: '/admin/reports/grade-distribution', label: 'Grade Distribution', icon: Award },
				{ href: '/admin/reports/pass-fail', label: 'Pass / Fail Analysis', icon: Target },
				{ href: '/admin/reports/time-score', label: 'Time vs Score', icon: Clock },
				{ href: '/admin/reports/violations', label: 'Violations Overview', icon: AlertTriangle },
				{ href: '/admin/reports/violation-trends', label: 'Violation Trends', icon: TrendingUp },
				{ href: '/admin/reports/flagged-sessions', label: 'Flagged Sessions', icon: EyeOff },
				{ href: '/admin/reports/security-incidents', label: 'Security Incidents', icon: Shield },
				{ href: '/admin/reports/action-analysis', label: 'Action Taken', icon: FileBarChart },
				{ href: '/admin/reports/user-overview', label: 'User Overview', icon: Users },
				{ href: '/admin/reports/student-demographics', label: 'Student Demographics', icon: School },
				{ href: '/admin/reports/lecturer-activity', label: 'Lecturer Activity', icon: BookOpen },
				{ href: '/admin/reports/invigilator-assignments', label: 'Invigilator Assignments', icon: UserCheck },
				{ href: '/admin/reports/registration-trends', label: 'Registration Trends', icon: UserPlus },
				{ href: '/admin/reports/suspended-users', label: 'Suspended Users', icon: UserX },
				{ href: '/admin/reports/college-performance', label: 'College Performance', icon: Building2 },
				{ href: '/admin/reports/department-performance', label: 'Department Performance', icon: Layers },
				{ href: '/admin/reports/level-analysis', label: 'Level Analysis', icon: BarChart3 },
				{ href: '/admin/reports/course-enrollment', label: 'Course Enrollment', icon: BookMarked },
				{ href: '/admin/reports/session-semester', label: 'Session / Semester', icon: Calendar },
				{ href: '/admin/reports/audit-logs', label: 'Audit Logs', icon: ScrollText },
				{ href: '/admin/reports/system-activity', label: 'System Activity', icon: Monitor },
				{ href: '/admin/reports/login-history', label: 'Login History', icon: Fingerprint },
				{ href: '/admin/reports/notification-analytics', label: 'Notifications', icon: Bell },
				{ href: '/admin/reports/exam-scheduling', label: 'Exam Scheduling', icon: Calendar }
			]
		}
	];

	const currentPath = $derived($page.url.pathname);
	const currentSearch = $derived($page.url.search);

	// Breadcrumb generation
	const breadcrumbs = $derived(() => {
		const crumbs = [{ href: '/admin', label: 'Dashboard' }];
		const pathParts = currentPath.split('/').filter(p => p && p !== 'admin');
		let currentHref = '/admin';
		
		for (const part of pathParts) {
			currentHref += `/${part}`;
			const label = part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
			crumbs.push({ href: currentHref, label });
		}
		return crumbs;
	});

	function isActive(href: string, isChild: boolean = false): boolean {
		if (href === '/admin') return currentPath === '/admin';
		if (href === '/admin/users' && !isChild) return currentPath === '/admin/users' && !currentSearch;
		if (href.includes('?role=')) return currentPath === '/admin/users' && currentSearch === '?' + href.split('?')[1];
		if (href === '/admin/users' && isChild) return currentPath === '/admin/users' && !currentSearch;
		if (href === '/admin/reports' && !isChild) return currentPath === '/admin/reports';
		if (href === '/admin/reports' && isChild) return currentPath === '/admin/reports';
		if (href.startsWith('/admin/reports/')) return currentPath === href;
		if (href === '/admin/security') return currentPath === '/admin/security';
		return currentPath === href;
	}

	function isGroupChildActive(group: { children: any[] | null }): boolean {
		if (!group.children) return false;
		return group.children.some((child: { href: string }) => isActive(child.href, true));
	}

	async function handleNavClick(href: string, event: MouseEvent) {
		event.preventDefault();
		if (navLoading) return;
		navLoading = href;
		sidebarOpen = false;
		apiCalls++;
		const startTime = performance.now();
		try {
			await goto(href);
			loadTime = performance.now() - startTime;
		} finally {
			setTimeout(() => {
				navLoading = null;
			}, 300);
		}
	}

	function toggleUsersGroup() { usersExpanded = !usersExpanded; }
	function toggleReportsGroup() { reportsExpanded = !reportsExpanded; }

	$effect(() => {
		if (isGroupChildActive(navGroups[1])) usersExpanded = true;
		if (isGroupChildActive(navGroups[3])) reportsExpanded = true;
		
		// Check if mobile
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	// Filtered nav items based on search
	const filteredNavGroups = $derived(() => {
		if (!searchQuery) return navGroups;
		const query = searchQuery.toLowerCase();
		return navGroups.filter(group => {
			if (group.label.toLowerCase().includes(query)) return true;
			if (group.children) {
				return group.children.some(child => child.label.toLowerCase().includes(query));
			}
			return false;
		}).map(group => {
			if (group.children && searchQuery) {
				return {
					...group,
					children: group.children.filter(child => child.label.toLowerCase().includes(query))
				};
			}
			return group;
		});
	});
</script>

<svelte:head>
	<title>Admin — MOUAU eTest</title>
</svelte:head>

<div class="admin-layout">
	<!-- Session Timeout Warning -->
	{#if showTimeoutWarning}
		<div class="timeout-warning">
			<AlertTriangle size={20} />
			<div class="timeout-content">
				<strong>Session expiring soon</strong>
				<p>You will be logged out in {timeLeft} seconds due to inactivity</p>
			</div>
			<button class="timeout-extend" onclick={extendSession}>Stay logged in</button>
		</div>
	{/if}

	<!-- Performance Metrics Overlay -->
	{#if showPerfMetrics}
		<div class="perf-overlay">
			<div class="perf-item"><Cpu size={12} /> Load: {loadTime.toFixed(0)}ms</div>
			<div class="perf-item"><Database size={12} /> API: {apiCalls}</div>
			<div class="perf-item"><HardDrive size={12} /> Memory: {Math.round(performance.memory?.usedJSHeapSize / 1048576) || 0}MB</div>
		</div>
	{/if}

	<!-- Mobile sidebar overlay -->
	{#if sidebarOpen}
		<div class="sidebar-overlay" onclick={() => (sidebarOpen = false)}></div>
	{/if}

	<!-- Sidebar -->
	<aside class="sidebar" class:sidebar-open={sidebarOpen}>
		<div class="sidebar-header">
			<div class="logo">
				<div class="logo-icon">
					<ShieldAlert size={24} />
				</div>
				<div class="logo-text">
					<span class="logo-title">MOUAU eTest</span>
					<span class="logo-badge">Admin</span>
				</div>
			</div>
			<button class="close-sidebar" onclick={() => (sidebarOpen = false)} aria-label="Close menu">
				<X size={20} />
			</button>
		</div>

		<!-- Sidebar Search -->
		<div class="sidebar-search">
			<Search size={14} />
			<input 
				type="text" 
				placeholder="Search menu... (Ctrl+K)" 
				class="sidebar-search-input"
				bind:value={searchQuery}
			/>
		</div>

		<nav class="sidebar-nav">
			<!-- Pinned Items Section -->
			{#if pinnedItems.length > 0}
				<div class="pinned-section">
					<div class="pinned-header">
						<Pin size={12} />
						<span>Pinned</span>
					</div>
					{#each pinnedItems as pinnedHref}
						{@const item = navGroups.flatMap(g => g.children ? [g, ...g.children] : [g]).find(i => i.href === pinnedHref)}
						{#if item}
							<a
								href={item.href}
								class="nav-link pinned-item"
								class:active={isActive(item.href)}
								onclick={(e) => handleNavClick(item.href, e)}
							>
								<div class="nav-link-icon">
									<item.icon size={16} />
								</div>
								<span class="nav-link-text">{item.label}</span>
								<button class="unpin-btn" onclick={(e) => { e.preventDefault(); togglePin(item.href); }}>
									<X size={12} />
								</button>
							</a>
						{/if}
					{/each}
				</div>
				<div class="nav-spacer"></div>
			{/if}

			{#each filteredNavGroups() as group, groupIndex (group.href)}
				{#if groupIndex > 0}
					<div class="nav-spacer"></div>
				{/if}

				{#if !group.children}
					<a
						href={group.href}
						class="nav-link"
						class:active={isActive(group.href)}
						class:loading={navLoading === group.href}
						onclick={(e) => handleNavClick(group.href, e)}
					>
						<div class="nav-link-icon">
							<group.icon size={18} />
						</div>
						<span class="nav-link-text">{group.label}</span>
						<div class="pin-btn" onclick={(e) => { e.preventDefault(); togglePin(group.href); }} title="Pin to sidebar" role="button" tabindex="0">
							<Pin size={12} />
						</div>
						{#if navLoading === group.href}
							<LoaderCircle size={16} class="nav-loader" />
						{:else if isActive(group.href)}
							<div class="active-indicator"></div>
						{/if}
					</a>
				{:else}
					<div
						class="nav-group"
						class:expanded={group.label === 'Users' ? usersExpanded : reportsExpanded}
						class:child-active={isGroupChildActive(group)}
					>
						<button
							class="nav-link nav-group-trigger"
							class:active={isActive(group.href)}
							onclick={group.label === 'Users' ? toggleUsersGroup : toggleReportsGroup}
							type="button"
						>
							<div class="nav-link-icon">
								<group.icon size={18} />
							</div>
							<span class="nav-link-text">{group.label}</span>
							<div class="pin-btn" onclick={(e) => { e.preventDefault(); togglePin(group.href); }} title="Pin to sidebar" role="button" tabindex="0">
								<Pin size={12} />
							</div>
							<ChevronDown size={14} class="nav-chevron" />
						</button>

						{#if group.label === 'Users' ? usersExpanded : reportsExpanded}
							<div class="nav-children">
								{#each group.children as child, childIndex (child.href)}
									{#if childIndex > 0}
										<div class="child-spacer"></div>
									{/if}
									<a
										href={child.href}
										class="nav-link nav-child"
										class:active={isActive(child.href, true)}
										class:loading={navLoading === child.href}
										onclick={(e) => handleNavClick(child.href, e)}
									>
										<div class="nav-link-icon child-icon">
											<child.icon size={16} />
										</div>
										<span class="nav-link-text">{child.label}</span>
										<div class="pin-btn-child" onclick={(e) => { e.preventDefault(); togglePin(child.href); }} title="Pin to sidebar" role="button" tabindex="0">
											<Pin size={10} />
										</div>
										{#if navLoading === child.href}
											<LoaderCircle size={12} class="nav-loader" />
										{:else if isActive(child.href, true)}
											<div class="active-indicator child-indicator"></div>
										{/if}
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</nav>

		<!-- Quick Stats -->
		<div class="quick-stats">
			<div class="stat-item">
				<span class="stat-value">{systemStats.activeExams}</span>
				<span class="stat-label">Active Exams</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat-item">
				<span class="stat-value">{systemStats.onlineUsers}</span>
				<span class="stat-label">Online</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat-item">
				<span class="stat-value">{systemStats.pendingReviews}</span>
				<span class="stat-label">Pending</span>
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="recent-activity">
			<div class="activity-header">
				<Activity size={14} />
				<span>Recent Activity</span>
				<RefreshCw size={12} class="refresh-icon" onclick={loadRecentActivity} />
			</div>
			<div class="activity-list">
				{#each recentActivities as activity}
					<div class="activity-item">
						<span class="activity-dot"></span>
						<span class="activity-text">{activity.message}</span>
						<span class="activity-time">{activity.timeAgo}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Global loading bar -->
		{#if navLoading}
			<div class="nav-loading-bar">
				<div class="nav-loading-progress"></div>
			</div>
		{/if}

		<div class="sidebar-footer">
			<button class="shortcuts-btn" onclick={() => showShortcutsModal = true}>
				<Command size={14} />
				<span>Keyboard Shortcuts</span>
			</button>
			<div class="user-menu">
				<button class="user-menu-btn" onclick={() => userMenuOpen = !userMenuOpen}>
					<div class="user-avatar-small">{data.user?.fullName?.charAt(0)?.toUpperCase() || 'A'}</div>
					<ChevronDown size={12} />
				</button>
				{#if userMenuOpen}
					<div class="user-menu-dropdown">
						<a href="/admin/profile"><UserCheck size={14} /> Profile Settings</a>
						<a href="/admin/notifications"><Bell size={14} /> Notifications</a>
						<a href="/admin/preferences"><Settings size={14} /> Preferences</a>
						<hr />
						<button onclick={toggleTheme}>
							{#if theme === 'dark'}<Sun size={14} />{:else}<Moon size={14} />{/if}
							{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
						</button>
						<hr />
						<button onclick={() => { userMenuOpen = false; showShortcutsModal = true; }}>
							<Command size={14} /> Keyboard Shortcuts
						</button>
						<hr />
						<button onclick={() => { userMenuOpen = false; showSignOutModal = true; }}>
							<LogOut size={14} /> Sign Out
						</button>
					</div>
				{/if}
			</div>
		</div>
	</aside>

	<!-- Main content -->
	<main class="main-content">
		<header class="main-header">
			<button class="menu-toggle" onclick={() => (sidebarOpen = true)} aria-label="Open menu">
				<Menu size={20} />
			</button>

			<!-- Breadcrumbs -->
			<div class="breadcrumbs">
				<Home size={14} class="breadcrumb-home" />
				{#each breadcrumbs() as crumb, i}
					{#if i > 0}<ChevronRight size={12} class="breadcrumb-sep" />{/if}
					<a 
						href={crumb.href} 
						class="breadcrumb-link" 
						class:active={i === breadcrumbs().length - 1}
						onclick={(e) => handleNavClick(crumb.href, e)}
					>
						{crumb.label}
					</a>
				{/each}
			</div>

			<div class="header-right">
				<!-- System Status -->
				<div class="system-status">
					{#if systemStats.systemStatus === 'healthy'}
						<div class="status-indicator healthy"></div>
						<span>Operational</span>
					{:else if systemStats.systemStatus === 'warning'}
						<AlertTriangle size={12} class="status-warning" />
						<span>Degraded</span>
					{:else}
						<XCircle size={12} class="status-error" />
						<span>Issues</span>
					{/if}
				</div>

				{#if navLoading}
					<div class="header-loading">
						<Loader2 size={16} class="spin" />
						<span>Loading...</span>
					</div>
				{/if}

				<!-- Notification Center -->
				<div class="notification-center">
					<button class="notification-btn" onclick={() => { notificationsOpen = !notificationsOpen; userMenuOpen = false; }}>
						<Bell size={16} />
						{#if unreadCount > 0}
							<span class="notification-badge">{unreadCount}</span>
						{/if}
					</button>
					{#if notificationsOpen}
						<div class="notifications-dropdown">
							<div class="notifications-header">
								<span>Notifications</span>
								<button onclick={markAllRead}>Mark all read</button>
							</div>
							<div class="notifications-list">
								{#each notifications as notification}
									<div class="notification-item" class:unread={!notification.read}>
										<div class="notification-icon">
											{#if notification.title.includes('Exam')}
												<Calendar size={14} />
											{:else if notification.title.includes('Violation')}
												<AlertTriangle size={14} />
											{:else}
												<Info size={14} />
											{/if}
										</div>
										<div class="notification-content">
											<div class="notification-title">{notification.title}</div>
											<div class="notification-message">{notification.message}</div>
											<div class="notification-time">{notification.time}</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<button class="theme-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
					{#if theme === 'dark'}
						<Sun size={16} />
					{:else}
						<Moon size={16} />
					{/if}
				</button>
			</div>
		</header>

		<div class="page-content">
			{@render children()}
		</div>
	</main>

	<!-- Quick Actions Panel -->
	<div class="quick-actions" class:visible={!sidebarOpen && showQuickActions}>
		<button class="quick-action" onclick={() => goto('/admin/exams/create')}>
			<Plus size={16} />
			<span>New Exam</span>
		</button>
		<button class="quick-action" onclick={() => goto('/admin/users/create')}>
			<UserPlus size={16} />
			<span>Add User</span>
		</button>
		<button class="quick-action" onclick={() => goto('/admin/reports')}>
			<BarChart3 size={16} />
			<span>Reports</span>
		</button>
		<button class="quick-action-toggle" onclick={() => showQuickActions = !showQuickActions}>
			{#if showQuickActions}
				<Minimize2 size={14} />
			{:else}
				<Maximize2 size={14} />
			{/if}
		</button>
	</div>

	<!-- Sign Out Confirmation Modal -->
	{#if showSignOutModal}
		<div class="modal-backdrop" onclick={() => showSignOutModal = false}>
			<div class="modal-card" onclick={(e) => e.stopPropagation()}>
				<div class="modal-icon">
					<LogOut size={22} />
				</div>
				<h2 class="modal-title">Sign out?</h2>
				<p class="modal-desc">You will be returned to the login screen. Any unsaved changes will be lost.</p>
				<div class="modal-actions">
					<button class="modal-cancel" onclick={() => showSignOutModal = false} type="button">
						Cancel
					</button>
					<form method="POST" action="/logout">
						<button type="submit" class="modal-confirm">
							<LogOut size={14} />
							Sign Out
						</button>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Keyboard Shortcuts Modal -->
	{#if showShortcutsModal}
		<div class="modal-backdrop" onclick={() => showShortcutsModal = false}>
			<div class="modal-card shortcuts-modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-icon">
					<Command size={22} />
				</div>
				<h2 class="modal-title">Keyboard Shortcuts</h2>
				<div class="shortcuts-list">
					<div class="shortcut-item">
						<kbd>Ctrl</kbd> + <kbd>K</kbd>
						<span>Focus search</span>
					</div>
					<div class="shortcut-item">
						<kbd>Ctrl</kbd> + <kbd>B</kbd>
						<span>Toggle sidebar</span>
					</div>
					<div class="shortcut-item">
						<kbd>Ctrl</kbd> + <kbd>H</kbd>
						<span>Show shortcuts</span>
					</div>
					<div class="shortcut-item">
						<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
						<span>Performance metrics</span>
					</div>
					<div class="shortcut-item">
						<kbd>↑</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> <kbd>←</kbd> <kbd>→</kbd> <kbd>B</kbd> <kbd>A</kbd>
						<span>Easter egg</span>
					</div>
				</div>
				<div class="modal-actions">
					<button class="modal-cancel" onclick={() => showShortcutsModal = false}>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.admin-layout {
		display: flex;
		min-height: 100vh;
		background: var(--color-bg);
	}

	/* Timeout Warning */
	.timeout-warning {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 300;
		background: var(--color-surface);
		border: 1px solid #f59e0b;
		border-radius: 0.75rem;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
		animation: slideInRight 0.3s ease;
	}

	.timeout-warning svg { color: #f59e0b; flex-shrink: 0; }
	.timeout-content strong { display: block; font-size: 0.85rem; color: var(--color-text); }
	.timeout-content p { font-size: 0.75rem; color: var(--color-muted); margin: 0; }
	.timeout-extend { padding: 0.4rem 0.8rem; background: #f59e0b; border: none; border-radius: 0.5rem; color: white; font-size: 0.75rem; font-weight: 600; cursor: pointer; }

	/* Performance Overlay */
	.perf-overlay {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		z-index: 300;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		display: flex;
		gap: 1rem;
		font-size: 0.7rem;
		font-family: monospace;
		color: #16a34a;
		pointer-events: none;
	}

	.perf-item { display: flex; align-items: center; gap: 0.25rem; }

	/* Sidebar */
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: 280px;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		z-index: 100;
		transform: translateX(-100%);
		transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		overflow: hidden;
	}

	.sidebar.sidebar-open { transform: translateX(0); }
	.sidebar-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
		z-index: 99;
		animation: fadeIn 0.2s ease;
	}
	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}
	.logo { display: flex; align-items: center; gap: 0.75rem; }
	.logo-icon {
		width: 36px; height: 36px;
		background: linear-gradient(135deg, #16a34a, #15803d);
		border-radius: 0.5rem;
		display: flex; align-items: center; justify-content: center;
		color: white;
	}
	.logo-text { display: flex; flex-direction: column; }
	.logo-title { font-weight: 800; font-size: 0.9rem; color: var(--color-text); }
	.logo-badge { font-size: 0.65rem; font-weight: 600; color: #16a34a; text-transform: uppercase; }
	.close-sidebar {
		background: none; border: none; color: var(--color-muted);
		cursor: pointer; padding: 0.25rem;
		display: flex; align-items: center; justify-content: center;
		border-radius: 0.25rem;
	}
	.close-sidebar:hover { color: var(--color-text); background: var(--color-bg); }

	/* Sidebar Search */
	.sidebar-search {
		margin: 0.75rem 1rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.sidebar-search input {
		background: none;
		border: none;
		outline: none;
		flex: 1;
		font-size: 0.8rem;
		color: var(--color-text);
	}
	.sidebar-search svg { color: var(--color-muted); }

	/* Pinned Section */
	.pinned-section {
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.pinned-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-muted);
		text-transform: uppercase;
	}
	.pinned-item { position: relative; }
	.unpin-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-muted);
		opacity: 0;
		transition: opacity 0.15s;
	}
	.pinned-item:hover .unpin-btn { opacity: 1; }

	/* Quick Stats */
	.quick-stats {
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding: 0.75rem 1rem;
		margin: 0 1rem 0.75rem;
		background: var(--color-bg);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}
	.stat-item { text-align: center; }
	.stat-value { display: block; font-size: 1rem; font-weight: 700; color: var(--color-text); }
	.stat-label { font-size: 0.6rem; color: var(--color-muted); }
	.stat-divider { width: 1px; height: 24px; background: var(--color-border); }

	/* Recent Activity */
	.recent-activity {
		margin: 0 1rem 0.75rem;
		padding: 0.5rem;
		background: var(--color-bg);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}
	.activity-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-bottom: 0.5rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-muted);
		border-bottom: 1px solid var(--color-border);
	}
	.refresh-icon { margin-left: auto; cursor: pointer; opacity: 0.5; transition: opacity 0.15s; }
	.refresh-icon:hover { opacity: 1; transform: rotate(180deg); }
	.activity-list { margin-top: 0.5rem; }
	.activity-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0;
		font-size: 0.7rem;
	}
	.activity-dot {
		width: 6px; height: 6px;
		border-radius: 50%;
		background: #16a34a;
		flex-shrink: 0;
	}
	.activity-text { flex: 1; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.activity-time { font-size: 0.6rem; color: var(--color-muted); }

	/* Sidebar Footer & User Menu */
	.sidebar-footer {
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.shortcuts-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem;
		margin-bottom: 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-muted);
		cursor: pointer;
		transition: all 0.15s;
	}
	.shortcuts-btn:hover { background: var(--color-surface-hover); color: var(--color-text); }
	.user-menu { position: relative; }
	.user-menu-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.user-avatar-small {
		width: 28px; height: 28px;
		background: linear-gradient(135deg, #16a34a, #15803d);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.75rem;
		color: white;
	}
	.user-menu-dropdown {
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		margin-bottom: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		z-index: 10;
	}
	.user-menu-dropdown a, .user-menu-dropdown button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		text-decoration: none;
		font-size: 0.75rem;
		color: var(--color-text);
		background: none;
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
	}
	.user-menu-dropdown a:hover, .user-menu-dropdown button:hover { background: var(--color-surface-hover); }
	.user-menu-dropdown hr { margin: 0.25rem 0; border-color: var(--color-border); }

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		padding: 0.5rem 1rem;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		min-height: 0;
	}
	.nav-spacer { height: 0.5rem; }
	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-radius: 0.5rem;
		text-decoration: none;
		color: var(--color-text);
		font-weight: 500;
		font-size: 0.85rem;
		transition: all 0.15s ease;
		position: relative;
		border: none;
		background: none;
		cursor: pointer;
		width: 100%;
		text-align: left;
	}
	.nav-link:hover { background: var(--color-surface-hover); }
	.nav-link-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--color-muted);
	}
	.nav-link-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.nav-link.active { background: rgba(22, 163, 74, 0.1); color: #16a34a; font-weight: 600; }
	.nav-link.active .nav-link-icon { color: #16a34a; }
	.pin-btn, .pin-btn-child {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-muted);
		opacity: 0;
		transition: opacity 0.15s;
		padding: 0.25rem;
	}
	.nav-link:hover .pin-btn, .nav-child:hover .pin-btn-child { opacity: 1; }
	.active-indicator {
		width: 6px; height: 6px;
		border-radius: 50%;
		background: #16a34a;
		flex-shrink: 0;
	}
	.nav-chevron { margin-left: auto; transition: transform 0.2s ease; opacity: 0.5; flex-shrink: 0; }
	.nav-group.expanded .nav-chevron { transform: rotate(180deg); }
	.nav-children {
		display: flex;
		flex-direction: column;
		padding: 0.25rem 0 0.25rem 2rem;
		margin-left: 0.5rem;
		border-left: 2px solid var(--color-border);
		animation: slideDown 0.2s ease;
	}
	.child-spacer { height: 0.25rem; }
	.nav-child { padding: 0.5rem 0.75rem; font-size: 0.8rem; color: var(--color-muted); }
	.nav-child:hover { color: var(--color-text); background: var(--color-surface-hover); }
	.nav-child.active { background: rgba(22, 163, 74, 0.08); color: #16a34a; font-weight: 600; }
	.nav-loader { animation: spin 0.8s linear infinite; color: #16a34a; flex-shrink: 0; }

	/* Main Content */
	.main-content {
		flex: 1;
		margin-left: 0;
		min-width: 0;
		width: 100%;
	}
	.main-header {
		position: sticky;
		top: 0;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		z-index: 50;
		gap: 1rem;
	}
	.menu-toggle {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.menu-toggle:hover { background: var(--color-surface-hover); }

	/* Breadcrumbs */
	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
	}
	.breadcrumb-home { color: var(--color-muted); flex-shrink: 0; }
	.breadcrumb-sep { color: var(--color-muted); flex-shrink: 0; }
	.breadcrumb-link {
		font-size: 0.8rem;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.breadcrumb-link:hover { color: #16a34a; }
	.breadcrumb-link.active { color: var(--color-text); font-weight: 600; }

	/* Header Right */
	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.system-status {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.6rem;
		background: var(--color-bg);
		border-radius: 2rem;
		font-size: 0.7rem;
	}
	.status-indicator {
		width: 8px; height: 8px;
		border-radius: 50%;
	}
	.status-indicator.healthy { background: #16a34a; box-shadow: 0 0 4px #16a34a; }
	.status-warning { color: #f59e0b; }
	.status-error { color: #dc2626; }
	.header-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.75rem;
		background: rgba(22, 163, 74, 0.1);
		border-radius: 0.5rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: #16a34a;
	}

	/* Notification Center */
	.notification-center { position: relative; }
	.notification-btn {
		position: relative;
		width: 36px; height: 36px;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.notification-btn:hover { background: var(--color-surface-hover); }
	.notification-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		background: #dc2626;
		color: white;
		font-size: 0.6rem;
		font-weight: 700;
		padding: 0.1rem 0.3rem;
		border-radius: 1rem;
	}
	.notifications-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		width: 320px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
		z-index: 50;
		overflow: hidden;
	}
	.notifications-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.8rem;
		font-weight: 600;
	}
	.notifications-header button {
		background: none;
		border: none;
		color: #16a34a;
		font-size: 0.7rem;
		cursor: pointer;
	}
	.notifications-list { max-height: 400px; overflow-y: auto; }
	.notification-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
	}
	.notification-item:hover { background: var(--color-surface-hover); }
	.notification-item.unread { background: rgba(22, 163, 74, 0.05); }
	.notification-icon { flex-shrink: 0; color: #16a34a; }
	.notification-content { flex: 1; }
	.notification-title { font-size: 0.75rem; font-weight: 600; color: var(--color-text); }
	.notification-message { font-size: 0.7rem; color: var(--color-muted); margin-top: 0.2rem; }
	.notification-time { font-size: 0.6rem; color: var(--color-muted); margin-top: 0.2rem; }

	.theme-btn {
		width: 36px; height: 36px;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.theme-btn:hover { background: var(--color-surface-hover); }

	.page-content { padding: 2rem 1.5rem; }

	/* Quick Actions */
	.quick-actions {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 40;
		transform: translateX(0);
		transition: transform 0.2s ease;
	}
	.quick-actions:not(.visible) { transform: translateX(120px); }
	.quick-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		background: #16a34a;
		border: none;
		border-radius: 2rem;
		color: white;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
		transition: all 0.15s;
	}
	.quick-action:hover { background: #15803d; transform: translateY(-2px); }
	.quick-action-toggle {
		width: 32px; height: 32px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--color-muted);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	.quick-action-toggle:hover { background: var(--color-surface-hover); }

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		animation: fadeIn 0.15s ease;
	}
	.modal-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		padding: 2rem 1.75rem 1.5rem;
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
		animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.modal-icon {
		width: 48px; height: 48px;
		background: rgba(22, 163, 74, 0.1);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #16a34a;
	}
	.modal-title { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; }
	.modal-desc { font-size: 0.82rem; color: var(--color-muted); text-align: center; margin: 0; line-height: 1.5; }
	.modal-actions {
		display: flex;
		gap: 0.75rem;
		width: 100%;
		margin-top: 0.5rem;
	}
	.modal-cancel {
		flex: 1;
		padding: 0.65rem 1rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-text);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	.modal-cancel:hover { background: var(--color-surface-hover); }
	.modal-confirm {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.65rem 1rem;
		background: #dc2626;
		border: none;
		border-radius: 0.5rem;
		color: white;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	.modal-confirm:hover { background: #b91c1c; }
	.modal-actions form { flex: 1; display: flex; }

	/* Shortcuts Modal */
	.shortcuts-modal { max-width: 340px; }
	.shortcuts-list {
		width: 100%;
		margin: 0.5rem 0;
	}
	.shortcut-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		font-size: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}
	.shortcut-item kbd {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		padding: 0.2rem 0.4rem;
		font-family: monospace;
		font-size: 0.7rem;
		font-weight: 600;
	}

	/* Loading Bar */
	.nav-loading-bar {
		height: 2px;
		background: var(--color-border);
		overflow: hidden;
		flex-shrink: 0;
	}
	.nav-loading-progress {
		height: 100%;
		width: 40%;
		background: #16a34a;
		animation: loadingSlide 1s ease-in-out infinite;
	}

	/* Animations */
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
	@keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
	@keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
	@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
	@keyframes loadingSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }

	/* Desktop */
	@media (min-width: 1024px) {
		.sidebar {
			position: fixed;
			transform: translateX(0);
			width: 260px;
			height: 100dvh;
			max-height: 100dvh;
			overflow: hidden;
		}
		.sidebar-overlay { display: none; }
		.close-sidebar { display: none; }
		.menu-toggle { display: none; }
		.main-content { margin-left: 260px; flex: 1; }
		.page-content { padding: 2rem 2.5rem; }
	}
	@media (min-width: 1280px) {
		.sidebar { width: 280px; }
		.main-content { margin-left: 280px; }
	}
</style>