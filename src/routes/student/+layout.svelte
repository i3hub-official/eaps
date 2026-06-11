<!-- src/routes/student/+layout.svelte -->
<script lang="ts">
	import { page, navigating } from '$app/stores';
	import { onMount } from 'svelte';
	import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
	import type { LayoutData } from './$types';
	import {
		LayoutDashboard, LogOut, Sun, Moon, Hash, GraduationCap,
		ShieldCheck, ChevronRight, X, BarChart3, Bell, CheckCheck,
		Loader2, BookOpen, Award, ClipboardList, Calendar, FileText,
		UserCircle, AlertTriangle, Phone, VenusAndMars, Cake, Building2,
		IdCard, School, Menu, TrendingUp, BookMarked, Activity,
		ArrowRight, Sparkles, Zap, Target, Clock, CheckCircle2
	} from 'lucide-svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	onMount(() => initTheme());

	let theme       = $derived(getTheme());
	let bioOpen     = $state(false);
	let signOutOpen = $state(false);
	let collapsed   = $state(false);
	let mobileOpen  = $state(false);
	let showNotifs  = $state(false);
	let notifications = $state<any[]>(data.notifications ?? []);
	let markingAll  = $state(false);
	let notifLoading = $state(false);

	const unreadCount = $derived(notifications.filter(n => !n.isRead).length);

	onMount(() => {
		const saved = localStorage.getItem('sidebar-collapsed');
		if (saved !== null) collapsed = JSON.parse(saved);
	});

	$effect(() => {
		if (typeof localStorage !== 'undefined')
			localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
	});

	$effect(() => { if ($navigating) mobileOpen = false; });

	const links = [
		{ href: '/student',                  label: 'Dashboard',    icon: LayoutDashboard, exact: true,  desc: 'Overview & stats'     },
		{ href: '/student/exam',            label: 'My Exams',     icon: ClipboardList,   exact: false, desc: 'Active & upcoming'    },
		{ href: '/student/results',          label: 'Results',      icon: Target,          exact: false, desc: 'Performance history'  },
		{ href: '/student/courses',          label: 'Courses',      icon: BookMarked,      exact: false, desc: 'Registered courses'   },
		{ href: '/student/courses/register', label: 'Registration', icon: BookOpen,        exact: false, desc: 'Add new courses', badge: 'open' },
		{ href: '/student/notifications',    label: 'Alerts',       icon: Bell,            exact: false, desc: 'Important updates'    },
		{ href: '/student/profile',          label: 'Profile',      icon: UserCircle,      exact: false, desc: 'Account settings'     },
	];

	const currentPath = $derived($page.url.pathname);

	function isActive(href: string, exact: boolean) {
		if (exact) return currentPath === href;
		if (href === '/student/courses' && currentPath.startsWith('/student/courses/register')) return false;
		return currentPath === href || currentPath.startsWith(href + '/');
	}

	const breadcrumbs = $derived((() => {
		const parts = currentPath.replace(/^\/student/, '').split('/').filter(Boolean);
		if (parts.length === 0) return [];
		const crumbs: { label: string; href: string }[] = [{ label: 'Home', href: '/student' }];
		const map: Record<string, string> = {
			results: 'Results', exams: 'Exams', courses: 'Courses',
			register: 'Registration', notifications: 'Alerts', profile: 'Profile',
			exam: 'Exam Session', complete: 'Complete'
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
	})());

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

	async function markAllRead() {
		if (markingAll || unreadCount === 0) return;
		markingAll = true;
		try {
			const res = await fetch('/api/notifications/read-all', { method: 'POST' });
			if (res.ok) notifications = notifications.map(n => ({ ...n, isRead: true }));
		} catch { /* silent */ } finally { markingAll = false; }
	}

	async function markOneRead(id: string) {
		const notif = notifications.find(n => n.id === id);
		if (!notif || notif.isRead) return;
		notifications = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
		try { await fetch(`/api/notifications/${id}/read`, { method: 'POST' }); }
		catch { notifications = notifications.map(n => n.id === id ? { ...n, isRead: false } : n); }
	}

	async function deleteNotification(id: string, e: Event) {
		e.stopPropagation();
		notifLoading = true;
		try {
			const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
			if (res.ok) notifications = notifications.filter(n => n.id !== id);
		} catch { /* silent */ } finally { notifLoading = false; }
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

	const bioSections = $derived(() => {
		const u = data.user;
		const sections: { title: string; icon: any; fields: { label: string; value: string; icon: any }[] }[] = [];

		const personal = [];
		if (u.fullName)     personal.push({ label: 'Full Name',    value: u.fullName,                                icon: UserCircle });
		if (u.email)        personal.push({ label: 'Email',        value: u.email,                                   icon: FileText   });
		if (u.phone)        personal.push({ label: 'Phone',        value: u.phone,                                   icon: Phone      });
		if (u.gender)       personal.push({ label: 'Gender',       value: u.gender,                                  icon: VenusAndMars });
		if (u.dateOfBirth)  personal.push({ label: 'Date of Birth',value: new Date(u.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), icon: Cake });
		if (personal.length) sections.push({ title: 'Personal', icon: UserCircle, fields: personal });

		const academic = [];
		if (u.matricNumber) academic.push({ label: 'Matric No.',   value: u.matricNumber,                            icon: Hash      });
		if (u.jambRegNo)    academic.push({ label: 'JAMB Reg.',    value: u.jambRegNo,                               icon: IdCard    });
		if (u.level)        academic.push({ label: 'Level',        value: `${u.level.level ?? u.level.name ?? '—'} Level`, icon: TrendingUp });
		if (u.session)      academic.push({ label: 'Session',      value: u.session,                                 icon: Calendar  });
		if (u.department?.name) academic.push({ label: 'Department', value: u.department.name,                      icon: BookOpen  });
		if (u.college?.name)    academic.push({ label: 'College',    value: u.college.name,                          icon: School    });
		if (academic.length) sections.push({ title: 'Academic', icon: GraduationCap, fields: academic });

		return sections;
	});

	let bioScrollContainer: HTMLDivElement;
</script>

{#if mobileOpen}
	<div class="mobile-overlay" onclick={() => (mobileOpen = false)} aria-hidden="true"></div>
{/if}

<div class="layout" class:collapsed>

	<!-- ══ SIDEBAR ═══════════════════════════════════════════════ -->
	<aside class="sidebar" class:collapsed class:mobile-open={mobileOpen}>

		<!-- Brand with hamburger inside when expanded -->
		<div class="sidebar-top">
			<a href="/student" class="brand">
				<div class="brand-mark">
					<GraduationCap size={20} strokeWidth={2} />
				</div>
				{#if !collapsed}
					<div class="brand-text">
						<span class="brand-name">MOUAU <em>eTest</em></span>
						<span class="brand-sub">Student Portal</span>
					</div>
				{/if}
			</a>
			<!-- Hamburger button (always visible when not collapsed) -->
			{#if !collapsed}
				<button class="hamburger-btn desktop-only" type="button" onclick={() => (collapsed = true)} aria-label="Collapse sidebar">
					<Menu size={18} />
				</button>
			{/if}
			<button class="close-btn mobile-only" type="button" onclick={() => (mobileOpen = false)} aria-label="Close menu">
				<X size={16} />
			</button>
		</div>

		<!-- Expand button at end of collapsed pane -->
		{#if collapsed}
			<div class="expand-trigger">
				<button class="expand-btn" type="button" onclick={() => (collapsed = false)} aria-label="Expand sidebar">
					<ChevronRight size={16} class="expand-icon" />
				</button>
			</div>
		{/if}

		<!-- Stats strip - only when expanded -->
{#if !collapsed}
	<div class="stats-strip">
		<div class="stat-card-mini">
			<Zap size={12} />
			<div>
				<span class="stat-val">{data.stats?.activeExams ?? 0}</span>
				<span class="stat-label">Live</span>
			</div>
		</div>
		<div class="stat-card-mini">
			<Clock size={12} />
			<div>
				<span class="stat-val">{data.stats?.upcomingExams ?? 0}</span>
				<span class="stat-label">Upcoming</span>
			</div>
		</div>
		<div class="stat-card-mini">
			<Target size={12} />
			<div>
				<span class="stat-val">{data.stats?.totalResults ?? 0}</span>
				<span class="stat-label">Results</span>
			</div>
		</div>
		<div class="stat-card-mini">
			<Activity size={12} />
			<div>
				<span class="stat-val {(data.stats?.averageScore ?? 0) >= 50 ? 'good' : 'warn'}">{data.stats?.averageScore ?? 0}%</span>
				<span class="stat-label">Avg</span>
			</div>
		</div>
	</div>
{/if}
	<!-- Navigation -->
		<nav class="sidebar-nav">
			{#each links as { href, label, icon: Icon, exact, badge, desc }}
				{@const active = isActive(href, exact)}
				<a {href} class="nav-link" class:active>
					<div class="nav-icon" class:active>
						{#if $navigating?.to?.url.pathname === href}
							<div class="nav-spinner"></div>
						{:else}
							<Icon size={18} strokeWidth={1.8} />
						{/if}
					</div>
					{#if !collapsed}
						<div class="nav-content">
							<span class="nav-label">{label}</span>
							<span class="nav-desc">{desc}</span>
						</div>
						{#if badge === 'open'}
							<span class="nav-badge">Open</span>
						{/if}
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Bottom section -->
		<div class="sidebar-foot">
			<button class="theme-toggle" type="button" onclick={toggleTheme}>
				<div class="theme-icon">
					{#if theme === 'dark'}<Sun size={15} />{:else}<Moon size={15} />{/if}
				</div>
				{#if !collapsed}<span class="theme-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>{/if}
			</button>

			<button class="profile-card" type="button" onclick={() => (bioOpen = true)}>
				<div class="profile-avatar">
					{initials()}
					<div class="online-dot"></div>
				</div>
				{#if !collapsed}
					<div class="profile-info">
						<span class="profile-name">{displayName()}</span>
						<span class="profile-role">Student</span>
					</div>
					<ChevronRight size={14} class="profile-arrow" />
				{/if}
			</button>

			<button class="signout-btn" type="button" onclick={() => (signOutOpen = true)}>
				<div class="signout-icon">
					<LogOut size={15} />
				</div>
				{#if !collapsed}<span class="signout-label">Sign out</span>{/if}
			</button>
		</div>
	</aside>

	<!-- ══ MAIN CONTENT ═══════════════════════════════════════════════════ -->
	<div class="layout-main">

		<!-- Topbar -->
		<header class="topbar">
			<div class="topbar-left">
				<button class="menu-btn mobile-only" type="button" onclick={() => (mobileOpen = true)}>
					<Menu size={18} />
				</button>

				{#if breadcrumbs.length > 0}
					<nav class="breadcrumb" aria-label="Breadcrumb">
						{#each breadcrumbs as crumb, i}
							{#if i > 0}<ChevronRight size={12} class="bc-sep" />{/if}
							{#if i === breadcrumbs.length - 1}
								<span class="bc-cur">{crumb.label}</span>
							{:else}
								<a href={crumb.href} class="bc-link">{crumb.label}</a>
							{/if}
						{/each}
					</nav>
				{:else}
					<div class="welcome-badge">
						<Sparkles size={14} />
						<span>Welcome back, <strong>{displayName()}</strong></span>
					</div>
				{/if}
			</div>

			<div class="topbar-right">
				{#if $navigating}
					<div class="loading-indicator">
						<Loader2 size={14} class="spin" />
						<span>Loading...</span>
					</div>
				{/if}

				<!-- Notifications dropdown -->
				<div class="notif-wrap">
					<button class="notif-btn" class:has-unread={unreadCount > 0} type="button"
						onclick={() => (showNotifs = !showNotifs)}>
						<Bell size={16} />
						{#if unreadCount > 0}
							<span class="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
						{/if}
					</button>

					{#if showNotifs}
						<div class="notif-dropdown" onclick={e => e.stopPropagation()}>
							<div class="notif-header">
								<span class="notif-title">Notifications</span>
								{#if unreadCount > 0}
									<button class="mark-read-btn" onclick={markAllRead} disabled={markingAll} type="button">
										{#if markingAll}<Loader2 size={12} class="spin" />{:else}<CheckCheck size={12} />{/if}
										Mark all read
									</button>
								{/if}
							</div>
							<div class="notif-list">
								{#if notifications.length === 0}
									<div class="notif-empty">
										<Bell size={32} strokeWidth={1.2} />
										<p>All caught up</p>
										<span>No new notifications</span>
									</div>
								{:else}
									{#each notifications as n (n.id)}
										<div class="notif-item" class:unread={!n.isRead} onclick={() => markOneRead(n.id)}>
											<div class="notif-dot" class:unread={!n.isRead}></div>
											<div class="notif-content">
												<p class="notif-title-text">{n.title}</p>
												<p class="notif-message">{n.message}</p>
												<span class="notif-time">{relativeTime(n.createdAt)}</span>
											</div>
											<button class="notif-delete" onclick={e => deleteNotification(n.id, e)} type="button">
												<X size={12} />
											</button>
										</div>
									{/each}
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<button class="theme-toggle-btn" type="button" onclick={toggleTheme}>
					{#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
				</button>
			</div>
		</header>

		<!-- Active exam banner -->
		{#if data.activeExamSession}
			<div class="exam-alert">
				<AlertTriangle size={14} />
				<div class="alert-content">
					<span class="alert-label">Active exam:</span>
					<span class="alert-title">{data.activeExamSession.examTitle}</span>
				</div>
				<a href={`/student/exam/${data.activeExamSession.id}`} class="resume-btn">
					Resume <ArrowRight size={12} />
				</a>
			</div>
		{/if}

		<!-- Page content -->
		<main class="page-content">
			{@render children()}
		</main>
	</div>
</div>

<!-- ══ SIGN OUT MODAL ═══════════════════════════════════════════ -->
{#if signOutOpen}
	<div class="modal-overlay" onclick={e => { if (e.target === e.currentTarget) signOutOpen = false; }}>
		<div class="modal-container">
			<div class="modal-icon danger"><LogOut size={24} /></div>
			<h2>Sign out?</h2>
			<p>You'll need to sign in again to continue.</p>
			<div class="modal-actions">
				<button class="btn-secondary" onclick={() => (signOutOpen = false)}>Cancel</button>
				<form method="POST" action="/logout" style="flex:1">
					<button type="submit" class="btn-danger">Yes, sign out</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- ══ BIO MODAL ════════════════════════════════════════════ -->
{#if bioOpen}
	<div class="modal-overlay bio-modal-overlay" onclick={e => { if (e.target === e.currentTarget) bioOpen = false; }}>
		<div class="bio-modal">
			<div class="bio-header">
				<div class="bio-avatar">
					{initials()}
					<CheckCircle2 size={16} class="verified-badge" />
				</div>
				<div class="bio-info">
					<h2>{data.user.fullName}</h2>
					<p>{data.user.email}</p>
				</div>
				<button class="close-modal" onclick={() => (bioOpen = false)}><X size={16} /></button>
			</div>
			<div class="bio-content" bind:this={bioScrollContainer}>
				{#each bioSections() as section}
					<div class="info-section">
						<div class="section-header">
							<svelte:component this={section.icon} size={14} />
							<h3>{section.title}</h3>
						</div>
						<div class="info-grid">
							{#each section.fields as field}
								<div class="info-card">
									<svelte:component this={field.icon} size={14} class="info-icon" />
									<div>
										<div class="info-label">{field.label}</div>
										<div class="info-value">{field.value}</div>
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
	/* ── CSS Variables ─────────────────────────────────────────── */
	:root {
		--green-500: #10b981;
		--green-600: #059669;
		--green-700: #047857;
		--green-soft: rgba(16, 185, 129, 0.08);
		--green-soft-b: rgba(16, 185, 129, 0.14);
		--sidebar-width: 280px;
		--sidebar-collapsed: 72px;
		--topbar-height: 64px;
		--radius: 12px;
		--radius-sm: 8px;
	}

	/* ── Layout ───────────────────────────────────────────────── */
	.layout {
		display: grid;
		grid-template-columns: var(--sidebar-width) 1fr;
		min-height: 100vh;
		background: var(--color-bg);
		transition: grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.layout.collapsed {
		grid-template-columns: var(--sidebar-collapsed) 1fr;
	}

	/* ── Sidebar ──────────────────────────────────────────────── */
	.sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 50;
	}

	.sidebar.collapsed {
		width: var(--sidebar-collapsed);
	}

	/* Sidebar Top / Brand */
	.sidebar-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
		height: var(--topbar-height);
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
		width: 38px;
		height: 38px;
		border-radius: var(--radius-sm);
		background: linear-gradient(135deg, var(--green-500), var(--green-700));
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
	}

	.brand-name {
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}

	.brand-name em {
		font-style: normal;
		color: var(--green-600);
	}

	.brand-sub {
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	/* Hamburger button - visible when expanded */
	.hamburger-btn {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.hamburger-btn:hover {
		border-color: var(--green-600);
		color: var(--green-600);
	}

	/* Expand trigger - at the top of collapsed sidebar */
	.expand-trigger {
		display: flex;
		justify-content: center;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--color-border);
	}

	.expand-btn {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.expand-btn:hover {
		border-color: var(--green-600);
		color: var(--green-600);
	}

	.expand-icon {
		transform: rotate(180deg);
	}

	.close-btn {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.close-btn:hover {
		border-color: var(--green-600);
		color: var(--green-600);
	}

	/* Stats Strip */
/* Stats Strip - Reduced size */
.stats-strip {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 0.25rem;
	padding: 0.5rem 0.75rem;
	margin: 0.25rem 0.75rem;
	background: var(--color-bg);
	border-radius: var(--radius-sm);
	border: 1px solid var(--color-border);
}

.stat-card-mini {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.15rem;
}

.stat-card-mini svg {
	color: var(--green-600);
	width: 14px;
	height: 14px;
	flex-shrink: 0;
}

.stat-card-mini div {
	display: flex;
	flex-direction: column;
	line-height: 1;
}

.stat-val {
	font-size: 0.75rem;
	font-weight: 800;
	color: var(--color-text);
}

.stat-val.good { color: var(--green-600); }
.stat-val.warn { color: #f59e0b; }

.stat-label {
	font-size: 0.5rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-muted);
}

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		overflow-y: auto;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: var(--radius-sm);
		text-decoration: none;
		transition: all 0.2s;
		color: var(--color-muted);
	}

	.nav-link:hover {
		background: var(--green-soft);
		color: var(--color-text);
	}

	.nav-link.active {
		background: var(--green-soft-b);
		color: var(--green-600);
	}

	.nav-icon {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all 0.2s;
	}

	.nav-icon.active {
		background: var(--green-600);
		color: white;
	}

	.nav-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.nav-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: inherit;
	}

	.nav-desc {
		font-size: 0.65rem;
		color: var(--color-muted);
	}

	.nav-badge {
		font-size: 0.6rem;
		font-weight: 800;
		padding: 0.15rem 0.5rem;
		border-radius: 20px;
		background: var(--green-600);
		color: white;
	}

	.nav-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(5, 150, 105, 0.2);
		border-top-color: var(--green-600);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	/* Sidebar Footer */
	.sidebar-foot {
		padding: 0.75rem;
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.theme-toggle, .signout-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		cursor: pointer;
		width: 100%;
		transition: background 0.2s;
		font-family: inherit;
	}

	.theme-toggle:hover { background: var(--green-soft); }
	.signout-btn:hover { background: rgba(239, 68, 68, 0.08); }

	.theme-icon, .signout-icon {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		flex-shrink: 0;
	}

	.signout-btn:hover .signout-icon {
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.theme-label, .signout-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
	}

	/* Profile Card */
	.profile-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		width: 100%;
		margin: 0.25rem 0;
		transition: all 0.2s;
	}

	.profile-card:hover {
		border-color: var(--green-600);
	}

	.profile-avatar {
		position: relative;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--green-500), var(--green-700));
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 800;
		color: white;
		flex-shrink: 0;
	}

	.online-dot {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #22c55e;
		border: 2px solid var(--color-surface);
	}

	.profile-info {
		flex: 1;
		text-align: left;
	}

	.profile-name {
		display: block;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.profile-role {
		display: block;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--green-600);
	}

	.profile-arrow {
		color: var(--color-muted);
		transition: transform 0.2s;
	}

	.profile-card:hover .profile-arrow {
		transform: translateX(3px);
		color: var(--green-600);
	}

	/* ── Main Area ───────────────────────────────────────────── */
	.layout-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	/* Topbar */
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--topbar-height);
		padding: 0 1.5rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
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

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.menu-btn {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.welcome-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.75rem;
		background: var(--green-soft);
		border-radius: 20px;
		font-size: 0.8rem;
		color: var(--green-600);
	}

	.welcome-badge svg {
		color: var(--green-600);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
	}

	.bc-link {
		color: var(--color-muted);
		text-decoration: none;
		transition: color 0.2s;
	}

	.bc-link:hover { color: var(--green-600); }
	.bc-cur { color: var(--color-text); font-weight: 600; }
	.bc-sep { color: var(--color-border); }

	.loading-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 20px;
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	/* Notifications */
	.notif-wrap { position: relative; }
	.notif-btn {
		position: relative;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.notif-btn.has-unread {
		border-color: var(--green-600);
		color: var(--green-600);
	}

	.unread-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		background: #ef4444;
		color: white;
		font-size: 0.5rem;
		font-weight: 800;
		min-width: 16px;
		height: 16px;
		border-radius: 20px;
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
		width: 340px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		z-index: 100;
		overflow: hidden;
	}

	.notif-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.notif-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.mark-read-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--green-600);
		background: none;
		border: none;
		cursor: pointer;
	}

	.notif-list {
		max-height: 360px;
		overflow-y: auto;
	}

	.notif-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem;
		color: var(--color-muted);
		text-align: center;
	}

	.notif-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		cursor: pointer;
		transition: background 0.2s;
		border-bottom: 1px solid var(--color-border);
	}

	.notif-item:hover { background: var(--green-soft); }
	.notif-item.unread { background: var(--green-soft); }

	.notif-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: transparent;
		margin-top: 6px;
		flex-shrink: 0;
	}

	.notif-dot.unread { background: var(--green-600); }

	.notif-content { flex: 1; min-width: 0; }
	.notif-title-text {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 0.2rem;
	}
	.notif-message {
		font-size: 0.7rem;
		color: var(--color-muted);
		margin: 0 0 0.25rem;
	}
	.notif-time {
		font-size: 0.6rem;
		color: var(--color-muted);
	}
	.notif-delete {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.notif-delete:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.theme-toggle-btn {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.theme-toggle-btn:hover {
		border-color: var(--green-600);
		color: var(--green-600);
	}

	/* Exam Alert Banner */
	.exam-alert {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.04));
		border-left: 3px solid #f59e0b;
		color: #d97706;
	}

	.alert-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.alert-label {
		font-weight: 700;
		font-size: 0.8rem;
	}

	.alert-title {
		font-size: 0.8rem;
	}

	.resume-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.85rem;
		border-radius: 20px;
		background: rgba(245, 158, 11, 0.12);
		color: #d97706;
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 700;
		transition: background 0.2s;
	}

	.resume-btn:hover {
		background: rgba(245, 158, 11, 0.2);
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

	/* ── Modals ──────────────────────────────────────────────── */
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal-container {
		background: var(--color-surface);
		border-radius: var(--radius);
		padding: 1.75rem;
		max-width: 380px;
		width: 100%;
		text-align: center;
	}

	.modal-icon {
		width: 52px;
		height: 52px;
		border-radius: var(--radius);
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1rem;
	}

	.modal-container h2 {
		font-size: 1.1rem;
		font-weight: 800;
		margin: 0 0 0.5rem;
		color: var(--color-text);
	}

	.modal-container p {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0 0 1.5rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn-secondary, .btn-danger {
		flex: 1;
		padding: 0.625rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		font-family: inherit;
	}

	.btn-secondary {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	/* Bio Modal */
	.bio-modal-overlay {
		align-items: flex-end;
	}

	@media (min-width: 768px) {
		.bio-modal-overlay {
			align-items: center;
		}
	}

	.bio-modal {
		background: var(--color-surface);
		border-radius: var(--radius);
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
		border-bottom: 1px solid var(--color-border);
	}

	.bio-avatar {
		position: relative;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--green-500), var(--green-700));
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 800;
		color: white;
		flex-shrink: 0;
	}

	.verified-badge {
		position: absolute;
		bottom: 0;
		right: 0;
		background: white;
		border-radius: 50%;
		color: var(--green-600);
	}

	.bio-info {
		flex: 1;
	}

	.bio-info h2 {
		font-size: 1rem;
		font-weight: 800;
		margin: 0 0 0.2rem;
		color: var(--color-text);
	}

	.bio-info p {
		font-size: 0.75rem;
		color: var(--color-muted);
		margin: 0;
	}

	.close-modal {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bio-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.info-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.section-header svg {
		color: var(--green-600);
	}

	.section-header h3 {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-muted);
		margin: 0;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.info-card {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
	}

	.info-icon {
		color: var(--green-600);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.info-label {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		margin-bottom: 0.2rem;
	}

	.info-value {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
	}

	/* Animations */
	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	:global(.spin) {
		animation: spin 0.7s linear infinite;
	}

	/* Responsive */
	.desktop-only { display: flex; }
	.mobile-only { display: none; }

	@media (max-width: 768px) {
		.desktop-only { display: none !important; }
		.mobile-only { display: flex !important; }

		.layout, .layout.collapsed {
			grid-template-columns: 1fr;
		}

		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			height: 100%;
			transform: translateX(-100%);
			transition: transform 0.25s ease;
			box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
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

		.info-grid {
			grid-template-columns: 1fr;
		}
	}
</style>