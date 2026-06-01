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
		Loader2,
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
		Fingerprint
	} from 'lucide-svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	onMount(() => initTheme());

	let theme = $derived(getTheme());
	let sidebarOpen = $state(false);
	let navLoading = $state<string | null>(null);
	let showSignOutModal = $state(false);

	// Expandable group states
	let usersExpanded = $state(false);
	let reportsExpanded = $state(false);

	// ─── Navigation Structure ───────────────────────────────────────────────────

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
				// ── Overview ──
				{ href: '/admin/reports', label: 'Overview', icon: Activity },

				// ── Exam & Performance ──
				{ href: '/admin/reports/exam-performance', label: 'Exam Performance', icon: ClipboardList },
				{
					href: '/admin/reports/student-performance',
					label: 'Student Performance',
					icon: TrendingUp
				},
				{ href: '/admin/reports/course-analysis', label: 'Course Analysis', icon: BookMarked },
				{
					href: '/admin/reports/question-analysis',
					label: 'Question Analysis',
					icon: BrainCircuit
				},
				{ href: '/admin/reports/grade-distribution', label: 'Grade Distribution', icon: Award },
				{ href: '/admin/reports/pass-fail', label: 'Pass / Fail Analysis', icon: Target },
				{ href: '/admin/reports/time-score', label: 'Time vs Score', icon: Clock },

				// ── Security & Violations ──
				{ href: '/admin/reports/violations', label: 'Violations Overview', icon: AlertTriangle },
				{ href: '/admin/reports/violation-trends', label: 'Violation Trends', icon: TrendingUp },
				{ href: '/admin/reports/flagged-sessions', label: 'Flagged Sessions', icon: EyeOff },
				{ href: '/admin/reports/security-incidents', label: 'Security Incidents', icon: Shield },
				{ href: '/admin/reports/action-analysis', label: 'Action Taken', icon: FileBarChart },

				// ── User & Demographics ──
				{ href: '/admin/reports/user-overview', label: 'User Overview', icon: Users },
				{
					href: '/admin/reports/student-demographics',
					label: 'Student Demographics',
					icon: School
				},
				{ href: '/admin/reports/lecturer-activity', label: 'Lecturer Activity', icon: BookOpen },
				{
					href: '/admin/reports/invigilator-assignments',
					label: 'Invigilator Assignments',
					icon: UserCheck
				},
				{
					href: '/admin/reports/registration-trends',
					label: 'Registration Trends',
					icon: UserPlus
				},
				{ href: '/admin/reports/suspended-users', label: 'Suspended Users', icon: UserX },

				// ── Institutional ──
				{
					href: '/admin/reports/college-performance',
					label: 'College Performance',
					icon: Building2
				},
				{
					href: '/admin/reports/department-performance',
					label: 'Department Performance',
					icon: Layers
				},
				{ href: '/admin/reports/level-analysis', label: 'Level Analysis', icon: BarChart3 },
				{ href: '/admin/reports/course-enrollment', label: 'Course Enrollment', icon: BookMarked },
				{ href: '/admin/reports/session-semester', label: 'Session / Semester', icon: Calendar },

				// ── Operational ──
				{ href: '/admin/reports/audit-logs', label: 'Audit Logs', icon: ScrollText },
				{ href: '/admin/reports/system-activity', label: 'System Activity', icon: Monitor },
				{ href: '/admin/reports/login-history', label: 'Login History', icon: Fingerprint },
				{ href: '/admin/reports/notification-analytics', label: 'Notifications', icon: Bell },
				{ href: '/admin/reports/exam-scheduling', label: 'Exam Scheduling', icon: Calendar }
			]
		}
	];

	// ─── Active State Logic ─────────────────────────────────────────────────────

	const currentPath = $derived($page.url.pathname);
	const currentSearch = $derived($page.url.search);

	function isActive(href: string, isChild: boolean = false): boolean {
		// Dashboard exact match
		if (href === '/admin') {
			return currentPath === '/admin';
		}

		// Users parent — only active when on /admin/users with NO role filter
		if (href === '/admin/users' && !isChild) {
			return currentPath === '/admin/users' && !currentSearch;
		}

		// Users child with query params
		if (href.includes('?role=')) {
			return currentPath === '/admin/users' && currentSearch === '?' + href.split('?')[1];
		}

		// All Users child link
		if (href === '/admin/users' && isChild) {
			return currentPath === '/admin/users' && !currentSearch;
		}

		// Reports parent — only active when exactly on /admin/reports (no subpath)
		if (href === '/admin/reports' && !isChild) {
			return currentPath === '/admin/reports';
		}

		// Reports Overview child
		if (href === '/admin/reports' && isChild) {
			return currentPath === '/admin/reports';
		}

		// Reports child links (exact match on subpaths)
		if (href.startsWith('/admin/reports/')) {
			return currentPath === href;
		}

		// Security exact match
		if (href === '/admin/security') {
			return currentPath === '/admin/security';
		}

		// Fallback for any other exact match
		return currentPath === href;
	}

	function isGroupChildActive(group: { children: any[] | null }): boolean {
		if (!group.children) return false;
		return group.children.some((child: { href: string }) => isActive(child.href, true));
	}

	// ─── Navigation Handlers ──────────────────────────────────────────────────

	async function handleNavClick(href: string, event: MouseEvent) {
		event.preventDefault();
		if (navLoading) return;

		navLoading = href;
		sidebarOpen = false;

		try {
			await goto(href);
		} finally {
			setTimeout(() => {
				navLoading = null;
			}, 300);
		}
	}

	function toggleUsersGroup() {
		usersExpanded = !usersExpanded;
	}

	function toggleReportsGroup() {
		reportsExpanded = !reportsExpanded;
	}

	// Auto-expand groups when a child is active
	$effect(() => {
		if (isGroupChildActive(navGroups[1])) usersExpanded = true;
		if (isGroupChildActive(navGroups[3])) reportsExpanded = true;
	});
</script>

<svelte:head>
	<title>Admin — MOUAU eTest</title>
</svelte:head>

<div class="admin-layout">
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

		<nav class="sidebar-nav">
			{#each navGroups as group, groupIndex}
				{#if groupIndex > 0}
					<div class="nav-spacer"></div>
				{/if}

				{#if !group.children}
					<!-- Single nav item -->
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
						{#if navLoading === group.href}
							<Loader2 size={14} class="nav-loader" />
						{:else if isActive(group.href)}
							<div class="active-indicator"></div>
						{/if}
					</a>
				{:else}
					<!-- Group with children -->
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
							<ChevronDown size={14} class="nav-chevron" />
						</button>

						{#if group.label === 'Users' ? usersExpanded : reportsExpanded}
							<div class="nav-children">
								{#each group.children as child, childIndex}
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
										{#if navLoading === child.href}
											<Loader2 size={12} class="nav-loader" />
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

		<!-- Global loading bar -->
		{#if navLoading}
			<div class="nav-loading-bar">
				<div class="nav-loading-progress"></div>
			</div>
		{/if}

		<div class="sidebar-footer">
			<div class="user-info">
				<div class="user-avatar">
					{data.user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
				</div>
				<div class="user-details">
					<span class="user-name">{data.user?.fullName?.split(' ')[0] || 'Admin'}</span>
					<span class="user-role">Administrator</span>
				</div>
			</div>
			<button type="button" class="logout-btn" onclick={() => (showSignOutModal = true)}>
				<LogOut size={16} />
				<span>Sign Out</span>
			</button>
		</div>
	</aside>

	<!-- Main content -->
	<main class="main-content">
		<header class="main-header">
			<button class="menu-toggle" onclick={() => (sidebarOpen = true)} aria-label="Open menu">
				<Menu size={20} />
			</button>

			<div class="header-right">
				{#if navLoading}
					<div class="header-loading">
						<Loader2 size={16} class="spin" />
						<span>Loading...</span>
					</div>
				{/if}
				<button class="theme-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
					{#if theme === 'dark'}
						<Sun size={16} />
					{:else}
						<Moon size={16} />
					{/if}
				</button>
				<div class="admin-badge">
					<ShieldAlert size={14} />
					<span>Super Admin</span>
				</div>
			</div>
		</header>

		<div class="page-content">
			{@render children()}
		</div>
	</main>

  <!-- Sign Out Confirmation Modal -->
  {#if showSignOutModal}
    <div class="modal-backdrop" onclick={() => showSignOutModal = false}>
      <div class="modal-card" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon">
          <LogOut size={22} />
        </div>
        <h2 class="modal-title">Sign out?</h2>
        <p class="modal-desc">You'll be returned to the login screen. Any unsaved changes will be lost.</p>
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
</div>

<style>
	.admin-layout {
		display: flex;
		min-height: 100vh;
		background: var(--color-bg);
	}

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

	.sidebar.sidebar-open {
		transform: translateX(0);
	}

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
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.logo-icon {
		width: 36px;
		height: 36px;
		background: linear-gradient(135deg, #16a34a, #15803d);
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.logo-text {
		display: flex;
		flex-direction: column;
	}

	.logo-title {
		font-weight: 800;
		font-size: 0.9rem;
		color: var(--color-text);
	}

	.logo-badge {
		font-size: 0.65rem;
		font-weight: 600;
		color: #16a34a;
		text-transform: uppercase;
	}

	.close-sidebar {
		background: none;
		border: none;
		color: var(--color-muted);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
	}

	.close-sidebar:hover {
		color: var(--color-text);
		background: var(--color-bg);
	}

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		padding: 1.25rem 1rem;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		min-height: 0;
	}

	.sidebar-nav::-webkit-scrollbar {
		width: 4px;
	}
	.sidebar-nav::-webkit-scrollbar-track {
		background: transparent;
	}
	.sidebar-nav::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 2px;
	}

	/* Spacing between top-level nav items */
	.nav-spacer {
		height: 0.5rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.625rem;
		text-decoration: none;
		color: var(--color-text);
		font-weight: 500;
		font-size: 0.875rem;
		transition: all 0.15s ease;
		position: relative;
		border: none;
		background: none;
		cursor: pointer;
		width: 100%;
		text-align: left;
	}

	.nav-link:hover {
		background: var(--color-surface-hover);
	}

	.nav-link-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--color-muted);
		transition: color 0.15s ease;
	}

	.nav-link:hover .nav-link-icon {
		color: var(--color-text);
	}

	.nav-link-text {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Active state - ONLY ONE item shows this at a time */
	.nav-link.active {
		background: rgba(22, 163, 74, 0.1);
		color: #16a34a;
		font-weight: 600;
	}

	.nav-link.active .nav-link-icon {
		color: #16a34a;
	}

	.nav-link.loading {
		opacity: 0.7;
		pointer-events: none;
	}

	/* Active indicator dot */
	.active-indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #16a34a;
		flex-shrink: 0;
		animation: pulse 2s ease-in-out infinite;
	}

	.active-indicator.child-indicator {
		width: 5px;
		height: 5px;
	}

	.nav-loader {
		animation: spin 0.8s linear infinite;
		color: #16a34a;
		flex-shrink: 0;
	}

	/* Nav Group */
	.nav-group {
		display: flex;
		flex-direction: column;
	}

	.nav-group-trigger {
		justify-content: flex-start;
	}

	/* When a child is active, parent gets subtle styling but NOT the full active treatment */
	.nav-group.child-active .nav-group-trigger {
		color: var(--color-text);
		font-weight: 600;
	}

	.nav-group.child-active .nav-group-trigger .nav-link-icon {
		color: #16a34a;
	}

	.nav-chevron {
		margin-left: auto;
		transition: transform 0.2s ease;
		opacity: 0.5;
		flex-shrink: 0;
	}

	.nav-group.expanded .nav-chevron {
		transform: rotate(180deg);
	}

	.nav-children {
		display: flex;
		flex-direction: column;
		padding: 0.5rem 0 0.25rem 0;
		margin-left: 2.75rem;
		margin-right: 0.5rem;
		border-left: 2px solid var(--color-border);
		animation: slideDown 0.2s ease;
	}

	/* Spacing between child items */
	.child-spacer {
		height: 0.25rem;
	}

	.nav-child {
		padding: 0.6rem 0.875rem;
		font-size: 0.82rem;
		color: var(--color-muted);
		margin-left: 0.75rem;
		border-radius: 0.5rem;
	}

	.nav-child:hover {
		color: var(--color-text);
		background: var(--color-surface-hover);
	}

	.nav-child.active {
		background: rgba(22, 163, 74, 0.08);
		color: #16a34a;
		font-weight: 600;
	}

	.nav-child.active .child-icon {
		color: #16a34a;
	}

	.child-icon {
		width: 18px;
		height: 18px;
	}

	/* Loading bar */
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

	/* Sidebar Footer */
	.sidebar-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.user-avatar {
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, #16a34a, #15803d);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1rem;
		color: white;
	}

	.user-details {
		display: flex;
		flex-direction: column;
	}

	.user-name {
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-text);
	}

	.user-role {
		font-size: 0.7rem;
		color: var(--color-muted);
	}

	.logout-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.6rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: #dc2626;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.logout-btn:hover {
		background: rgba(220, 38, 38, 0.1);
		border-color: #dc2626;
	}

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

	.menu-toggle:hover {
		background: var(--color-surface-hover);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		background: rgba(22, 163, 74, 0.1);
		border-radius: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #16a34a;
		animation: fadeIn 0.2s ease;
	}

	.header-loading .spin {
		animation: spin 0.8s linear infinite;
	}

	.theme-btn {
		width: 36px;
		height: 36px;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.theme-btn:hover {
		background: var(--color-surface-hover);
	}

	.admin-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.8rem;
		background: rgba(22, 163, 74, 0.1);
		border-radius: 2rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #16a34a;
	}

	.page-content {
		padding: 2rem 1.5rem;
	}

	/* Animations */
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes loadingSlide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(250%);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

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

		.sidebar-overlay {
			display: none;
		}

		.close-sidebar {
			display: none;
		}

		.menu-toggle {
			display: none;
		}

		.main-content {
			margin-left: 260px;
			flex: 1;
		}

		.page-content {
			padding: 2rem 2.5rem;
		}
	}

	@media (min-width: 1280px) {
		.sidebar {
			width: 280px;
		}

		.main-content {
			margin-left: 280px;
		}
	}

	/* Dark mode */
	:global(.dark) .admin-badge {
		background: rgba(22, 163, 74, 0.15);
	}

	:global(.dark) .logout-btn {
		border-color: rgba(220, 38, 38, 0.3);
	}

	:global(.dark) .logout-btn:hover {
		background: rgba(220, 38, 38, 0.15);
	}

	:global(.dark) .header-loading {
		background: rgba(22, 163, 74, 0.15);
	}

  /* Sign Out Modal */
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
    max-width: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-icon {
    width: 48px;
    height: 48px;
    background: rgba(220, 38, 38, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #dc2626;
    margin-bottom: 0.25rem;
  }

  .modal-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .modal-desc {
    font-size: 0.82rem;
    color: var(--color-muted);
    text-align: center;
    margin: 0;
    line-height: 1.5;
  }

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
    transition: all 0.15s;
  }

  .modal-cancel:hover {
    background: var(--color-surface-hover);
  }

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
    transition: all 0.15s;
  }

  .modal-confirm:hover {
    background: #b91c1c;
  }

  .modal-actions form {
    flex: 1;
    display: flex;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  :global(.dark) .modal-icon {
    background: rgba(220, 38, 38, 0.15);
  }
</style>
