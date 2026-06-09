<!-- src/routes/(student)/+layout.svelte -->
<script lang="ts">
	import { page, navigating } from '$app/stores';
	import { onMount } from 'svelte';
	import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
	import type { LayoutData } from './$types';
	import {
		LayoutDashboard,
		LogOut,
		Sun,
		Moon,
		Hash,
		Layers,
		GraduationCap,
		ShieldCheck,
		ChevronRight,
		X,
		BarChart3,
		Bell,
		CheckCheck,
		Loader2,
		BookOpen,
		Clock,
		Award,
		ClipboardList,
		Calendar,
		FileText,
		UserCircle,
		AlertTriangle,
		Phone,
		MapPin,
		Flag,
		VenusAndMars,
		Cake,
		Building2,
		Fingerprint,
		Eye,
		IdCard,
		School,
		Menu,
		CheckCircle2,
		XCircle,
		Timer,
		TrendingUp,
		BookMarked,
		Sparkles,
		Target,
		Activity,
		Zap
	} from 'lucide-svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	onMount(() => initTheme());

	let theme = $derived(getTheme());
	let bioOpen = $state(false);
	let signOutOpen = $state(false);
	let collapsed = $state(false);
	let mobileOpen = $state(false);
	let showNotifs = $state(false);
	let notifications = $state<any[]>(data.notifications ?? []);
	let markingAll = $state(false);
	let notifLoading = $state(false);
	let hoveredNav = $state<string | null>(null);

	const unreadCount = $derived(notifications.filter((n) => !n.isRead).length);

	onMount(() => {
		const saved = localStorage.getItem('sidebar-collapsed');
		if (saved !== null) collapsed = JSON.parse(saved);
	});

	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
		}
	});

	$effect(() => {
		if ($navigating) mobileOpen = false;
	});

	// Enhanced nav links with icons and descriptions
	const links = [
		{
			href: '/student',
			label: 'Dashboard',
			icon: LayoutDashboard,
			exact: true,
			desc: 'Overview & stats'
		},
		{
			href: '/student/exams',
			label: 'My Exams',
			icon: ClipboardList,
			exact: false,
			desc: 'Active & upcoming'
		},
		{
			href: '/student/results',
			label: 'Results',
			icon: BarChart3,
			exact: false,
			desc: 'Performance history'
		},
		{
			href: '/student/courses',
			label: 'Courses',
			icon: BookMarked,
			exact: false,
			desc: 'Registered courses'
		},
		{
			href: '/student/courses/register',
			label: 'Registration',
			icon: BookOpen,
			exact: false,
			desc: 'Add new courses',
			badge: 'open'
		},
		{
			href: '/student/notifications',
			label: 'Alerts',
			icon: Bell,
			exact: false,
			desc: 'Important updates'
		},
		{
			href: '/student/profile',
			label: 'Profile',
			icon: UserCircle,
			exact: false,
			desc: 'Account settings'
		}
	];

	const currentPath = $derived($page.url.pathname);

	function isActive(href: string, exact: boolean) {
		if (exact) return currentPath === href;
		if (href === '/student/courses' && currentPath.startsWith('/student/courses/register'))
			return false;
		return currentPath === href || currentPath.startsWith(href + '/');
	}

	// Breadcrumb (keep existing implementation)
	const breadcrumbs = $derived(
		(() => {
			const parts = currentPath
				.replace(/^\/student/, '')
				.split('/')
				.filter(Boolean);
			if (parts.length === 0) return [];
			const crumbs: { label: string; href: string }[] = [{ label: 'Home', href: '/student' }];
			const map: Record<string, string> = {
				results: 'Results',
				exams: 'Exams',
				courses: 'Courses',
				register: 'Registration',
				notifications: 'Alerts',
				profile: 'Profile',
				exam: 'Exam Session',
				complete: 'Complete'
			};
			let built = '/student';
			for (const part of parts) {
				built += '/' + part;
				const label = /^[0-9a-f-]{36}$/i.test(part)
					? 'Session'
					: (map[part] ?? part.charAt(0).toUpperCase() + part.slice(1));
				crumbs.push({ label, href: built });
			}
			return crumbs;
		})()
	);

	// User data (keep existing)
	const initials = $derived(() => {
		const parts = data.user.fullName.trim().split(/\s+/);
		return parts.length >= 2
			? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
			: parts[0].slice(0, 2).toUpperCase();
	});

	const displayName = $derived(() => {
		const parts = data.user.fullName.trim().split(/\s+/);
		return parts[0] ?? data.user.fullName;
	});

	// Stats
	const activeExams = $derived(data.stats?.activeExams ?? 0);
	const totalResults = $derived(data.stats?.totalResults ?? 0);
	const pendingRegistrations = $derived(data.stats?.pendingRegistrations ?? 0);
	const upcomingExams = $derived(data.stats?.upcomingExams ?? 0);
	const averageScore = $derived(data.stats?.averageScore ?? 78.5); // Example

	// Notification functions (keep existing implementations)
	async function markAllRead() {
		if (markingAll || unreadCount === 0) return;
		markingAll = true;
		try {
			const res = await fetch('/api/notifications/read-all', { method: 'POST' });
			if (res.ok) notifications = notifications.map((n) => ({ ...n, isRead: true }));
		} catch {
			/* silent */
		} finally {
			markingAll = false;
		}
	}

	async function markOneRead(id: string) {
		const notif = notifications.find((n) => n.id === id);
		if (!notif || notif.isRead) return;
		notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
		try {
			await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
		} catch {
			notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: false } : n));
		}
	}

	async function deleteNotification(id: string, e: Event) {
		e.stopPropagation();
		notifLoading = true;
		try {
			const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
			if (res.ok) notifications = notifications.filter((n) => n.id !== id);
		} catch {
			/* silent */
		} finally {
			notifLoading = false;
		}
	}

	function handleNotifsOutside(e: MouseEvent) {
		if (!(e.target as HTMLElement).closest('.notif-wrap')) showNotifs = false;
	}

	$effect(() => {
		if (showNotifs) {
			document.addEventListener('click', handleNotifsOutside);
			return () => document.removeEventListener('click', handleNotifsOutside);
		}
	});

	function relativeTime(date: string) {
		const diff = Date.now() - new Date(date).getTime();
		const m = Math.floor(diff / 60000);
		if (m < 1) return 'Just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h / 24);
		if (d < 30) return `${d}d ago`;
		return new Date(date).toLocaleDateString();
	}

	// Bio sections (keep existing implementation)
	const bioSections = $derived(() => {
		const u = data.user;
		const sections: {
			title: string;
			icon: any;
			fields: { label: string; value: string; icon: any }[];
		}[] = [];

		const personal = [];
		if (u.fullName) personal.push({ label: 'Full Name', value: u.fullName, icon: UserCircle });
		if (u.email) personal.push({ label: 'Email', value: u.email, icon: FileText });
		if (u.phone) personal.push({ label: 'Phone', value: u.phone, icon: Phone });
		if (u.gender) personal.push({ label: 'Gender', value: u.gender, icon: VenusAndMars });
		if (u.dateOfBirth)
			personal.push({
				label: 'Date of Birth',
				value: new Date(u.dateOfBirth).toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				}),
				icon: Cake
			});
		if (personal.length) sections.push({ title: 'Personal', icon: UserCircle, fields: personal });

		const academic = [];
		if (u.matricNumber)
			academic.push({ label: 'Matric Number', value: u.matricNumber, icon: Hash });
		if (u.jambRegNo) academic.push({ label: 'JAMB Reg. No', value: u.jambRegNo, icon: IdCard });
		if (u.level)
			academic.push({
				label: 'Level',
				value: `${u.level.level ?? u.level.name ?? '—'} Level`,
				icon: TrendingUp
			});
		if (u.session) academic.push({ label: 'Session', value: u.session, icon: Calendar });
		if (u.department?.name)
			academic.push({ label: 'Department', value: u.department.name, icon: BookOpen });
		if (u.college?.name) academic.push({ label: 'College', value: u.college.name, icon: School });
		if (academic.length)
			sections.push({ title: 'Academic', icon: GraduationCap, fields: academic });

		return sections;
	});

	let bioScrollContainer: HTMLDivElement;
	function scrollToSection(index: number) {
		const sects = bioScrollContainer?.querySelectorAll('.bio-section');
		if (sects?.[index]) sects[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<!-- Mobile overlay -->
{#if mobileOpen}
	<div class="mobile-overlay" onclick={() => (mobileOpen = false)} aria-hidden="true"></div>
{/if}

<div class="layout" class:collapsed>
	<!-- ══ REDESIGNED SIDEBAR ═══════════════════════════════════════ -->
	<aside class="sidebar" class:collapsed class:mobile-open={mobileOpen}>
		<!-- Animated gradient border -->
		<div class="sidebar-glow"></div>

		<!-- Brand Section -->
		<div class="sidebar-top">
			<a href="/student" class="brand">
				<div class="brand-mark">
					<GraduationCap size={20} strokeWidth={1.8} />
					<div class="brand-pulse"></div>
				</div>
				{#if !collapsed}
					<div class="brand-text">
						<span class="brand-name">MOUAU <span class="brand-highlight">eTest</span></span>
						<span class="brand-sub">Student Portal</span>
					</div>
				{/if}
			</a>
			<button
				class="collapse-btn desktop-only"
				type="button"
				onclick={() => (collapsed = !collapsed)}
			>
				<ChevronRight size={14} class={collapsed ? 'rotated' : ''} />
			</button>
			<button
				class="close-mobile-btn mobile-only"
				type="button"
				onclick={() => (mobileOpen = false)}
			>
				<X size={15} />
			</button>
		</div>

		<!-- Compact Stats Card (always visible when expanded) -->

		{#if !collapsed}
			<div class="stats-card">
				<div class="stats-header">
					<Activity size={12} class="stats-icon" />
					<span class="stats-title">Academic Stats</span>
				</div>

				<!-- Primary Stats Grid -->
				<div class="stats-grid">
					<div class="stat-item">
						<div class="stat-value">{data.stats?.activeExams ?? 0}</div>
						<div class="stat-label">Active Exams</div>
					</div>
					<div class="stat-item">
						<div class="stat-value">{data.stats?.upcomingExams ?? 0}</div>
						<div class="stat-label">Upcoming</div>
					</div>
					<div class="stat-item">
						<div class="stat-value">{data.stats?.totalResults ?? 0}</div>
						<div class="stat-label">Results</div>
					</div>
					<div class="stat-item">
						<div class="stat-value">{data.stats?.completedExams ?? 0}</div>
						<div class="stat-label">Completed</div>
					</div>
				</div>

				<!-- Separator -->
				<div class="stats-divider"></div>

				<!-- Performance Stats -->
				<div class="stats-performance">
					<div class="performance-item">
						<div class="performance-label">
							<TrendingUp size={10} />
							<span>Avg Score</span>
						</div>
						<div class="performance-value" class:high={(data.stats?.averageScore ?? 0) >= 70}>
							{data.stats?.averageScore ?? 0}%
						</div>
					</div>

					{#if data.stats?.gpa > 0}
						<div class="performance-item">
							<div class="performance-label">
								<Award size={10} />
								<span>GPA</span>
							</div>
							<div class="performance-value">{data.stats?.gpa ?? 0}</div>
						</div>
					{/if}

					<div class="performance-item">
						<div class="performance-label">
							<BookOpen size={10} />
							<span>Credits</span>
						</div>
						<div class="performance-value">{data.stats?.totalCreditHours ?? 0}</div>
					</div>

					<div class="performance-item">
						<div class="performance-label">
							<ClipboardList size={10} />
							<span>Courses</span>
						</div>
						<div class="performance-value">{data.stats?.totalRegistrations ?? 0}</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Navigation -->
		<nav class="sidebar-nav">
			{#each links as { href, label, icon: Icon, exact, desc, badge }}
				{@const active = isActive(href, exact)}
				<a
					{href}
					class="nav-link"
					class:active
					class:loading={$navigating?.to?.url.pathname === href}
					onmouseenter={() => (hoveredNav = href)}
					onmouseleave={() => (hoveredNav = null)}
				>
					<div class="nav-icon-wrapper">
						<div class="nav-icon-bg" class:active></div>
						{#if $navigating?.to?.url.pathname === href}
							<span class="nav-spinner"></span>
						{:else}
							<Icon size={18} strokeWidth={1.8} />
						{/if}
					</div>

					{#if !collapsed}
						<div class="nav-content">
							<span class="nav-label">{label}</span>
							{#if desc && hoveredNav === href}
								<span class="nav-desc">{desc}</span>
							{:else if badge === 'open'}
								<span class="nav-badge">Open</span>
							{/if}
						</div>
					{/if}

					{#if active && !collapsed}
						<div class="nav-active-indicator">
							<div class="active-dot"></div>
						</div>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Bottom Actions -->
		<div class="sidebar-bottom">
			<!-- Theme Toggle -->
			<button class="action-btn theme-btn" onclick={toggleTheme} type="button">
				<div class="action-icon">
					{#if theme === 'dark'}
						<Sun size={16} />
					{:else}
						<Moon size={16} />
					{/if}
				</div>
				{#if !collapsed}
					<span class="action-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
				{/if}
			</button>

			<!-- User Profile Button -->
			<button class="profile-btn" onclick={() => (bioOpen = true)} type="button">
				<div class="profile-avatar">
					<span>{initials()}</span>
					<div class="profile-status"></div>
				</div>
				{#if !collapsed}
					<div class="profile-info">
						<span class="profile-name">{displayName()}</span>
						<span class="profile-role">Student</span>
					</div>
					<ChevronRight size={12} class="profile-chevron" />
				{/if}
			</button>

			<!-- Sign Out -->
			<button class="action-btn signout-btn" type="button" onclick={() => (signOutOpen = true)}>
				<div class="action-icon">
					<LogOut size={16} />
				</div>
				{#if !collapsed}
					<span class="action-label">Sign Out</span>
				{/if}
			</button>
		</div>
	</aside>

	<!-- ══ MAIN CONTENT ═══════════════════════════════════════════ -->
	<div class="layout-main">
		<!-- Topbar -->
		<header class="topbar">
			<div class="topbar-left">
				<button
					class="mobile-menu-btn mobile-only"
					onclick={() => (mobileOpen = true)}
					type="button"
				>
					<Menu size={18} />
				</button>

				{#if breadcrumbs.length > 0}
					<nav class="breadcrumb">
						{#each breadcrumbs as crumb, i}
							{#if i > 0}<ChevronRight size={11} class="bc-sep" />{/if}
							{#if i === breadcrumbs.length - 1}
								<span class="bc-current">{crumb.label}</span>
							{:else}
								<a href={crumb.href} class="bc-link">{crumb.label}</a>
							{/if}
						{/each}
					</nav>
				{:else}
					<span class="topbar-greeting">
						Welcome back, <strong>{displayName()}</strong>
					</span>
				{/if}
			</div>

			<div class="topbar-right">
				{#if $navigating}
					<div class="nav-loading-pill">
						<Loader2 size={13} class="spin-icon" />
						<span>Loading…</span>
					</div>
				{/if}

				<!-- Notifications -->
				<div class="notif-wrap">
					<button
						class="topbar-btn notif-btn"
						class:has-unread={unreadCount > 0}
						onclick={() => (showNotifs = !showNotifs)}
						type="button"
					>
						<Bell size={16} />
						{#if unreadCount > 0}
							<span class="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
						{/if}
					</button>

					{#if showNotifs}
						<div class="notif-dropdown" onclick={(e) => e.stopPropagation()}>
							<div class="notif-head">
								<div class="notif-head-left">
									<span class="notif-title">Notifications</span>
									{#if unreadCount > 0}
										<span class="notif-unread-count">{unreadCount} new</span>
									{/if}
								</div>
								{#if unreadCount > 0}
									<button
										class="mark-all-btn"
										onclick={markAllRead}
										disabled={markingAll}
										type="button"
									>
										{#if markingAll}<Loader2 size={11} class="spin-icon" />{:else}<CheckCheck
												size={11}
											/>{/if}
										Mark all
									</button>
								{/if}
							</div>
							<div class="notif-list">
								{#if notifications.length === 0}
									<div class="notif-empty">
										<Bell size={28} strokeWidth={1.5} />
										<p>All caught up!</p>
									</div>
								{:else}
									{#each notifications as n (n.id)}
										<div
											class="notif-item"
											class:unread={!n.isRead}
											onclick={() => markOneRead(n.id)}
										>
											<div class="notif-dot-col">
												{#if !n.isRead}<div class="notif-dot"></div>{/if}
											</div>
											<div class="notif-body">
												<p class="notif-item-title">{n.title}</p>
												<p class="notif-item-msg">{n.message}</p>
												<span class="notif-item-time">{relativeTime(n.createdAt)}</span>
											</div>
											<button
												class="notif-delete"
												onclick={(e) => deleteNotification(n.id, e)}
												type="button"
											>
												<X size={12} />
											</button>
										</div>
									{/each}
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<button class="topbar-btn" onclick={toggleTheme} type="button">
					{#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
				</button>
			</div>
		</header>

		<!-- Active Exam Banner -->
		{#if data.activeExamSession}
			<div class="exam-alert-banner">
				<AlertTriangle size={15} />
				<div class="exam-alert-content">
					<span class="exam-alert-title">Active Exam:</span>
					<span class="exam-alert-course">{data.activeExamSession.examTitle}</span>
				</div>
				<a href={`/student/exam/${data.activeExamSession.id}`} class="exam-alert-btn">
					Resume <ArrowRight size={12} />
				</a>
			</div>
		{/if}

		<main class="page-content">
			{@render children()}
		</main>
	</div>
</div>

<!-- Modals (keep existing implementations) -->
<!-- Sign Out Modal -->
{#if signOutOpen}
	<div
		class="modal-backdrop"
		onclick={(e) => {
			if (e.target === e.currentTarget) signOutOpen = false;
		}}
	>
		<div class="confirm-modal">
			<div class="confirm-icon"><LogOut size={24} /></div>
			<h2>Sign out?</h2>
			<p>You'll need to sign in again to continue.</p>
			<div class="confirm-actions">
				<button class="btn-cancel" onclick={() => (signOutOpen = false)}>Cancel</button>
				<form method="POST" action="/logout" style="flex:1">
					<button type="submit" class="btn-signout">Yes, sign out</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Bio Modal -->
{#if bioOpen}
	<div
		class="modal-backdrop bio-backdrop"
		onclick={(e) => {
			if (e.target === e.currentTarget) bioOpen = false;
		}}
	>
		<div class="bio-modal">
			<div class="bio-header">
				<div class="bio-avatar">{initials()}</div>
				<div class="bio-info">
					<h2>{data.user.fullName}</h2>
					<p>{data.user.email}</p>
				</div>
				<button class="bio-close" onclick={() => (bioOpen = false)}><X size={16} /></button>
			</div>
			<div class="bio-body" bind:this={bioScrollContainer}>
				{#each bioSections() as section}
					<div class="bio-section">
						<div class="bio-section-header">
							<svelte:component this={section.icon} size={14} />
							<h3>{section.title}</h3>
						</div>
						<div class="bio-grid">
							{#each section.fields as field}
								<div class="bio-field">
									<svelte:component this={field.icon} size={13} />
									<div>
										<div class="bio-field-label">{field.label}</div>
										<div class="bio-field-value">{field.value}</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	/* CSS Variables */
	:root {
		--green-400: #4ade80;
		--green-500: #22c55e;
		--green-600: #16a34a;
		--green-700: #15803d;
		--green-soft: rgba(34, 197, 94, 0.08);
		--green-glow: rgba(34, 197, 94, 0.15);
		--sidebar-w: 260px;
		--sidebar-collapsed: 72px;
		--topbar-h: 56px;
		--radius-card: 1rem;
		--radius-btn: 0.75rem;
		--transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Layout */
	.layout {
		display: grid;
		grid-template-columns: var(--sidebar-w) 1fr;
		min-height: 100vh;
		background: var(--color-bg);
		transition: grid-template-columns var(--transition);
	}

	.layout.collapsed {
		grid-template-columns: var(--sidebar-collapsed) 1fr;
	}

	/* Sidebar */
	.sidebar {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		backdrop-filter: blur(10px);
		height: 100vh;
		position: sticky;
		top: 0;
		width: var(--sidebar-w);
		transition: width var(--transition);
		z-index: 50;
		overflow: hidden;
		border-right: 1px solid rgba(34, 197, 94, 0.1);
	}

	.sidebar-glow {
		position: absolute;
		top: 0;
		right: 0;
		width: 2px;
		height: 100%;
		background: linear-gradient(180deg, var(--green-500), var(--green-600), transparent);
		opacity: 0.5;
	}

	.sidebar.collapsed {
		width: var(--sidebar-collapsed);
	}

	/* Brand */
	.sidebar-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1rem;
		border-bottom: 1px solid rgba(34, 197, 94, 0.1);
		flex-shrink: 0;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		flex: 1;
	}

	.brand-mark {
		position: relative;
		width: 36px;
		height: 36px;
		border-radius: 0.875rem;
		background: linear-gradient(135deg, var(--green-600), var(--green-500));
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
	}

	.brand-pulse {
		position: absolute;
		inset: -2px;
		border-radius: 1rem;
		background: linear-gradient(135deg, var(--green-500), transparent);
		opacity: 0;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.05);
		}
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.brand-name {
		font-size: 0.9rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}

	.brand-highlight {
		color: var(--green-600);
		background: linear-gradient(135deg, var(--green-600), var(--green-400));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.brand-sub {
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--green-600);
		text-transform: uppercase;
	}

	.collapse-btn,
	.close-mobile-btn {
		width: 28px;
		height: 28px;
		border-radius: 0.5rem;
		border: 1px solid rgba(34, 197, 94, 0.2);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: var(--transition);
		flex-shrink: 0;
	}

	.collapse-btn:hover,
	.close-mobile-btn:hover {
		border-color: var(--green-600);
		color: var(--green-600);
		transform: scale(1.05);
	}

	.collapse-btn :global(.rotated) {
		transform: rotate(180deg);
	}

	/* Stats Card */
	.stats-card {
		margin: 1rem;
		padding: 0.875rem;
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.02));
		border: 1px solid rgba(34, 197, 94, 0.15);
		border-radius: 0.875rem;
	}

	.stats-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(34, 197, 94, 0.1);
	}

	.stats-icon {
		color: var(--green-600);
	}

	.stats-title {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-muted);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.625rem;
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: 1.125rem;
		font-weight: 800;
		color: var(--color-text);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.6rem;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		padding: 0.5rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.nav-link {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.75rem;
		text-decoration: none;
		transition: var(--transition);
		cursor: pointer;
		overflow: hidden;
	}

	.nav-link:hover {
		background: rgba(34, 197, 94, 0.08);
	}

	.nav-link.active {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.06));
	}

	.nav-icon-wrapper {
		position: relative;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.nav-icon-bg {
		position: absolute;
		inset: 0;
		border-radius: 0.625rem;
		background: var(--green-soft);
		opacity: 0;
		transition: var(--transition);
	}

	.nav-icon-bg.active {
		opacity: 1;
		background: linear-gradient(135deg, var(--green-600), var(--green-500));
	}

	.nav-link:hover .nav-icon-bg {
		opacity: 0.5;
	}

	.nav-link :global(svg) {
		position: relative;
		z-index: 1;
		color: var(--color-muted);
		transition: var(--transition);
	}

	.nav-link.active :global(svg) {
		color: var(--green-600);
	}

	.nav-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.nav-label {
		font-size: 0.825rem;
		font-weight: 600;
		color: var(--color-text);
		transition: var(--transition);
	}

	.nav-desc {
		font-size: 0.65rem;
		color: var(--green-600);
		animation: slideIn 0.2s ease;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.nav-badge {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.6rem;
		font-weight: 800;
		padding: 0.125rem 0.5rem;
		border-radius: 0.5rem;
		background: linear-gradient(135deg, var(--green-600), var(--green-500));
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.nav-active-indicator {
		position: absolute;
		left: -0.75rem;
		top: 50%;
		transform: translateY(-50%);
	}

	.active-dot {
		width: 3px;
		height: 20px;
		background: var(--green-600);
		border-radius: 0 2px 2px 0;
		animation: glowPulse 1.5s ease-in-out infinite;
	}

	@keyframes glowPulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
			box-shadow: 0 0 4px var(--green-600);
		}
	}

	/* Sidebar Bottom */
	.sidebar-bottom {
		padding: 0.75rem;
		border-top: 1px solid rgba(34, 197, 94, 0.1);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.75rem;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: var(--transition);
		width: 100%;
		font-family: inherit;
	}

	.action-btn:hover {
		background: rgba(34, 197, 94, 0.08);
	}

	.action-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.625rem;
		background: var(--green-soft);
		color: var(--green-600);
		flex-shrink: 0;
	}

	.action-label {
		font-size: 0.825rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.signout-btn:hover .action-icon {
		background: rgba(220, 38, 38, 0.1);
		color: #dc2626;
	}

	.profile-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(34, 197, 94, 0.2);
		background: var(--color-bg);
		cursor: pointer;
		transition: var(--transition);
		width: 100%;
		font-family: inherit;
	}

	.profile-btn:hover {
		border-color: var(--green-600);
		transform: translateX(2px);
	}

	.profile-avatar {
		position: relative;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--green-700), var(--green-500));
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.profile-avatar span {
		font-size: 0.7rem;
		font-weight: 800;
		color: white;
	}

	.profile-status {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--green-500);
		border: 2px solid var(--color-surface);
		animation: statusPulse 2s ease-in-out infinite;
	}

	@keyframes statusPulse {
		0%,
		100% {
			background: var(--green-500);
		}
		50% {
			background: var(--green-400);
			box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
		}
	}

	.profile-info {
		flex: 1;
		text-align: left;
		min-width: 0;
	}

	.profile-name {
		display: block;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.profile-role {
		display: block;
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--green-600);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.profile-chevron {
		color: var(--color-muted);
		flex-shrink: 0;
		transition: var(--transition);
	}

	.profile-btn:hover .profile-chevron {
		transform: translateX(2px);
		color: var(--green-600);
	}

	/* Topbar (keep existing styles, just adjust) */
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--topbar-h);
		padding: 0 1.5rem;
		background: var(--color-surface);
		border-bottom: 1px solid rgba(34, 197, 94, 0.1);
		position: sticky;
		top: 0;
		z-index: 40;
		gap: 1rem;
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.mobile-menu-btn {
		width: 36px;
		height: 36px;
		border-radius: 0.5rem;
		border: 1px solid rgba(34, 197, 94, 0.2);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8rem;
	}

	.bc-link {
		color: var(--color-muted);
		text-decoration: none;
		transition: color 0.2s;
	}

	.bc-link:hover {
		color: var(--green-600);
	}

	.bc-current {
		color: var(--color-text);
		font-weight: 600;
	}

	.topbar-greeting {
		font-size: 0.85rem;
		color: var(--color-muted);
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.topbar-btn {
		width: 36px;
		height: 36px;
		border-radius: 0.5rem;
		border: 1px solid rgba(34, 197, 94, 0.2);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: var(--transition);
	}

	.topbar-btn:hover {
		border-color: var(--green-600);
		color: var(--green-600);
		transform: scale(1.05);
	}

	/* Notifications (simplified) */
	.notif-wrap {
		position: relative;
	}

	.notif-btn.has-unread {
		border-color: var(--green-600);
		color: var(--green-600);
	}

	.notif-badge {
		position: absolute;
		top: -6px;
		right: -6px;
		background: #ef4444;
		color: white;
		font-size: 0.55rem;
		font-weight: 800;
		min-width: 16px;
		height: 16px;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 3px;
		border: 2px solid var(--color-surface);
	}

	.notif-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 320px;
		background: var(--color-surface);
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: 0.875rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		z-index: 100;
		overflow: hidden;
	}

	.notif-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(34, 197, 94, 0.1);
	}

	.notif-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.notif-list {
		max-height: 360px;
		overflow-y: auto;
	}

	.notif-item {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.notif-item:hover {
		background: rgba(34, 197, 94, 0.05);
	}

	.notif-item.unread {
		background: rgba(34, 197, 94, 0.08);
	}

	.notif-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--green-600);
		margin-top: 6px;
	}

	.notif-body {
		flex: 1;
	}

	.notif-item-title {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 0.2rem;
	}

	.notif-item-msg {
		font-size: 0.72rem;
		color: var(--color-muted);
		margin: 0 0 0.2rem;
	}

	.notif-item-time {
		font-size: 0.65rem;
		color: var(--color-muted);
	}

	.notif-delete {
		width: 24px;
		height: 24px;
		border-radius: 0.375rem;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.notif-delete:hover {
		background: rgba(220, 38, 38, 0.1);
		color: #dc2626;
	}

	/* Exam Alert Banner */
	.exam-alert-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.04));
		border-bottom: 1px solid rgba(245, 158, 11, 0.2);
		color: #d97706;
	}

	.exam-alert-content {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.exam-alert-title {
		font-weight: 700;
		font-size: 0.8rem;
	}

	.exam-alert-course {
		font-size: 0.8rem;
		opacity: 0.8;
	}

	.exam-alert-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.875rem;
		border-radius: 0.5rem;
		background: rgba(245, 158, 11, 0.15);
		color: #d97706;
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 600;
		transition: var(--transition);
	}

	.exam-alert-btn:hover {
		background: rgba(245, 158, 11, 0.25);
		transform: translateX(2px);
	}

	/* Page Content */
	.page-content {
		flex: 1;
		padding: 1.5rem;
		overflow-x: hidden;
	}

	/* Mobile Overlay */
	.mobile-overlay {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 49;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
	}

	/* Modal Styles (simplified) */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.confirm-modal {
		background: var(--color-surface);
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: 1rem;
		padding: 1.5rem;
		max-width: 380px;
		width: 100%;
	}

	.confirm-icon {
		width: 48px;
		height: 48px;
		border-radius: 0.75rem;
		background: rgba(220, 38, 38, 0.1);
		color: #dc2626;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.confirm-modal h2 {
		font-size: 1.1rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
	}

	.confirm-modal p {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0 0 1.25rem;
	}

	.confirm-actions {
		display: flex;
		gap: 0.625rem;
	}

	.btn-cancel {
		flex: 1;
		padding: 0.625rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(34, 197, 94, 0.2);
		background: transparent;
		cursor: pointer;
		font-weight: 600;
	}

	.btn-signout {
		width: 100%;
		padding: 0.625rem;
		border-radius: 0.5rem;
		border: none;
		background: #dc2626;
		color: white;
		font-weight: 700;
		cursor: pointer;
	}

	/* Bio Modal */
	.bio-backdrop {
		align-items: flex-end;
	}

	@media (min-width: 641px) {
		.bio-backdrop {
			align-items: center;
		}
	}

	.bio-modal {
		background: var(--color-surface);
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: 1.25rem;
		width: 100%;
		max-width: 560px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.bio-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		border-bottom: 1px solid rgba(34, 197, 94, 0.1);
	}

	.bio-avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--green-700), var(--green-500));
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		font-weight: 800;
		color: white;
	}

	.bio-info {
		flex: 1;
	}

	.bio-info h2 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
	}

	.bio-info p {
		font-size: 0.8rem;
		color: var(--color-muted);
		margin: 0;
	}

	.bio-close {
		width: 32px;
		height: 32px;
		border-radius: 0.5rem;
		border: 1px solid rgba(34, 197, 94, 0.2);
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bio-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
	}

	.bio-section {
		margin-bottom: 1.5rem;
	}

	.bio-section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(34, 197, 94, 0.1);
	}

	.bio-section-header h3 {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
		margin: 0;
	}

	.bio-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.bio-field {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.75rem;
		border-radius: 0.625rem;
		background: var(--color-bg);
		border: 1px solid rgba(34, 197, 94, 0.1);
	}

	.bio-field :global(svg) {
		color: var(--green-600);
		flex-shrink: 0;
	}

	.bio-field-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-muted);
		margin-bottom: 0.125rem;
	}

	.bio-field-value {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
	}

	/* Loading Spinner */
	.nav-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(34, 197, 94, 0.2);
		border-top-color: var(--green-600);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.spin-icon {
		animation: spin 0.8s linear infinite;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.desktop-only {
			display: none !important;
		}
		.mobile-only {
			display: flex !important;
		}

		.layout,
		.layout.collapsed {
			grid-template-columns: 1fr;
		}

		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			transform: translateX(-100%);
			transition: transform var(--transition);
			z-index: 50;
			box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
		}

		.sidebar.mobile-open {
			transform: translateX(0);
		}

		.mobile-overlay {
			display: block;
		}

		.topbar {
			padding: 0 1rem;
		}

		.page-content {
			padding: 1rem;
		}

		.bio-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Add to your existing styles */

	.stats-divider {
		margin: 0.75rem 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.2), transparent);
	}

	.stats-performance {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.performance-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0;
	}

	.performance-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.performance-label :global(svg) {
		color: var(--green-600);
	}

	.performance-value {
		font-size: 0.75rem;
		font-weight: 800;
		color: var(--color-text);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background: var(--color-bg);
	}

	.performance-value.high {
		color: var(--green-600);
		background: var(--green-soft);
	}

	.stats-warning {
		margin-top: 0.75rem;
		padding: 0.5rem;
		border-radius: 0.5rem;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.2);
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.65rem;
		font-weight: 600;
		color: #d97706;
	}

	.stats-warning :global(svg) {
		flex-shrink: 0;
	}

	/* For collapsed sidebar, show tooltips on hover */
	.sidebar.collapsed .stats-card {
		display: none;
	}

	/* Optional: Add a mini indicator for collapsed state */
	.sidebar.collapsed::before {
		content: '';
		position: absolute;
		top: 5rem;
		left: 50%;
		transform: translateX(-50%);
		width: 24px;
		height: 24px;
		border-radius: 0.5rem;
		background: var(--green-soft);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: center;
		opacity: 0.5;
	}
</style>
