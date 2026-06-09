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
		ArrowRight
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
		{ href: '/student/exams',            label: 'My Exams',     icon: ClipboardList,   exact: false, desc: 'Active & upcoming'    },
		{ href: '/student/results',          label: 'Results',      icon: BarChart3,       exact: false, desc: 'Performance history'  },
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

	<!-- ══ SIDEBAR ════════════════════════════════════════════════ -->
	<aside class="sidebar" class:collapsed class:mobile-open={mobileOpen}>

		<!-- Brand -->
		<div class="sidebar-top">
			<a href="/student" class="brand">
				<div class="brand-mark">
					<GraduationCap size={18} strokeWidth={2} />
				</div>
				{#if !collapsed}
					<div class="brand-text">
						<span class="brand-name">MOUAU <em>eTest</em></span>
						<span class="brand-sub">Student Portal</span>
					</div>
				{/if}
			</a>
			<button class="icon-btn desktop-only" type="button" onclick={() => (collapsed = !collapsed)} aria-label="Toggle sidebar">
				<ChevronRight size={14} class={collapsed ? '' : 'flip'} />
			</button>
			<button class="icon-btn mobile-only" type="button" onclick={() => (mobileOpen = false)} aria-label="Close menu">
				<X size={15} />
			</button>
		</div>

		<!-- Stats strip — only when expanded -->
		{#if !collapsed}
			<div class="stats-strip">
				<div class="sstat">
					<span class="sstat-val">{data.stats?.activeExams ?? 0}</span>
					<span class="sstat-lbl">Live</span>
				</div>
				<div class="sstat-div"></div>
				<div class="sstat">
					<span class="sstat-val">{data.stats?.upcomingExams ?? 0}</span>
					<span class="sstat-lbl">Upcoming</span>
				</div>
				<div class="sstat-div"></div>
				<div class="sstat">
					<span class="sstat-val">{data.stats?.totalResults ?? 0}</span>
					<span class="sstat-lbl">Results</span>
				</div>
				<div class="sstat-div"></div>
				<div class="sstat">
					<span class="sstat-val {(data.stats?.averageScore ?? 0) >= 50 ? 'good' : 'warn'}">{data.stats?.averageScore ?? 0}%</span>
					<span class="sstat-lbl">Avg</span>
				</div>
			</div>
		{/if}

		<!-- Nav -->
		<nav class="sidebar-nav">
			{#each links as { href, label, icon: Icon, exact, badge }}
				{@const active = isActive(href, exact)}
				<a {href} class="nav-link" class:active>
					<div class="nav-icon" class:active>
						{#if $navigating?.to?.url.pathname === href}
							<span class="nav-spinner"></span>
						{:else}
							<Icon size={17} strokeWidth={1.9} />
						{/if}
					</div>
					{#if !collapsed}
						<span class="nav-label">{label}</span>
						{#if badge === 'open'}
							<span class="nav-badge">Open</span>
						{/if}
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Bottom -->
		<div class="sidebar-foot">
			<button class="foot-btn" type="button" onclick={toggleTheme}>
				<div class="foot-icon">
					{#if theme === 'dark'}<Sun size={15} />{:else}<Moon size={15} />{/if}
				</div>
				{#if !collapsed}<span class="foot-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>{/if}
			</button>

			<button class="profile-btn" type="button" onclick={() => (bioOpen = true)}>
				<div class="profile-av">{initials()}</div>
				{#if !collapsed}
					<div class="profile-info">
						<span class="profile-name">{displayName()}</span>
						<span class="profile-role">Student</span>
					</div>
					<ChevronRight size={12} class="profile-arrow" />
				{/if}
			</button>

			<button class="foot-btn signout" type="button" onclick={() => (signOutOpen = true)}>
				<div class="foot-icon danger">
					<LogOut size={15} />
				</div>
				{#if !collapsed}<span class="foot-label">Sign out</span>{/if}
			</button>
		</div>
	</aside>

	<!-- ══ MAIN ═══════════════════════════════════════════════════ -->
	<div class="layout-main">

		<!-- Topbar -->
		<header class="topbar">
			<div class="topbar-left">
				<button class="icon-btn mobile-only" type="button" onclick={() => (mobileOpen = true)}>
					<Menu size={17} />
				</button>

				{#if breadcrumbs.length > 0}
					<nav class="breadcrumb" aria-label="Breadcrumb">
						{#each breadcrumbs as crumb, i}
							{#if i > 0}<ChevronRight size={11} class="bc-sep" />{/if}
							{#if i === breadcrumbs.length - 1}
								<span class="bc-cur">{crumb.label}</span>
							{:else}
								<a href={crumb.href} class="bc-link">{crumb.label}</a>
							{/if}
						{/each}
					</nav>
				{:else}
					<span class="topbar-greet">Welcome back, <strong>{displayName()}</strong></span>
				{/if}
			</div>

			<div class="topbar-right">
				{#if $navigating}
					<div class="loading-pill">
						<Loader2 size={12} class="spin" /> Loading…
					</div>
				{/if}

				<!-- Notifications -->
				<div class="notif-wrap">
					<button class="icon-btn" class:notif-active={unreadCount > 0} type="button"
						onclick={() => (showNotifs = !showNotifs)}>
						<Bell size={16} />
						{#if unreadCount > 0}
							<span class="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
						{/if}
					</button>

					{#if showNotifs}
						<div class="notif-dropdown" onclick={e => e.stopPropagation()}>
							<div class="notif-head">
								<span class="notif-title">Notifications</span>
								{#if unreadCount > 0}
									<button class="mark-all-btn" onclick={markAllRead} disabled={markingAll} type="button">
										{#if markingAll}<Loader2 size={11} class="spin" />{:else}<CheckCheck size={11} />{/if}
										Mark all read
									</button>
								{/if}
							</div>
							<div class="notif-list">
								{#if notifications.length === 0}
									<div class="notif-empty">
										<Bell size={26} strokeWidth={1.5} />
										<p>All caught up</p>
									</div>
								{:else}
									{#each notifications as n (n.id)}
										<div class="notif-item" class:unread={!n.isRead} onclick={() => markOneRead(n.id)}>
											{#if !n.isRead}<div class="n-dot"></div>{:else}<div class="n-dot-empty"></div>{/if}
											<div class="n-body">
												<p class="n-title">{n.title}</p>
												<p class="n-msg">{n.message}</p>
												<span class="n-time">{relativeTime(n.createdAt)}</span>
											</div>
											<button class="n-del" onclick={e => deleteNotification(n.id, e)} type="button">
												<X size={11} />
											</button>
										</div>
									{/each}
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<button class="icon-btn" type="button" onclick={toggleTheme}>
					{#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
				</button>
			</div>
		</header>

		<!-- Active exam banner -->
		{#if data.activeExamSession}
			<div class="exam-banner">
				<AlertTriangle size={14} />
				<span class="eb-label">Active exam:</span>
				<span class="eb-title">{data.activeExamSession.examTitle}</span>
				<a href={`/student/exam/${data.activeExamSession.id}`} class="eb-btn">
					Resume <ArrowRight size={12} />
				</a>
			</div>
		{/if}

		<main class="page-content">
			{@render children()}
		</main>
	</div>
</div>

<!-- ══ SIGN OUT MODAL ═══════════════════════════════════════════ -->
{#if signOutOpen}
	<div class="modal-bg" onclick={e => { if (e.target === e.currentTarget) signOutOpen = false; }}>
		<div class="confirm-modal">
			<div class="confirm-icon"><LogOut size={22} /></div>
			<h2>Sign out?</h2>
			<p>You'll need to sign in again to continue.</p>
			<div class="confirm-actions">
				<button class="btn-cancel" onclick={() => (signOutOpen = false)}>Cancel</button>
				<form method="POST" action="/logout" style="flex:1">
					<button type="submit" class="btn-danger">Yes, sign out</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- ══ BIO MODAL ════════════════════════════════════════════════ -->
{#if bioOpen}
	<div class="modal-bg bio-bg" onclick={e => { if (e.target === e.currentTarget) bioOpen = false; }}>
		<div class="bio-modal">
			<div class="bio-head">
				<div class="bio-av">{initials()}</div>
				<div class="bio-ident">
					<h2>{data.user.fullName}</h2>
					<p>{data.user.email}</p>
				</div>
				<button class="icon-btn" onclick={() => (bioOpen = false)}><X size={15} /></button>
			</div>
			<div class="bio-body" bind:this={bioScrollContainer}>
				{#each bioSections() as section}
					<div class="bio-section">
						<div class="bio-sec-head">
							<svelte:component this={section.icon} size={13} />
							<h3>{section.title}</h3>
						</div>
						<div class="bio-grid">
							{#each section.fields as field}
								<div class="bio-field">
									<svelte:component this={field.icon} size={13} class="bio-field-icon" />
									<div>
										<div class="bf-label">{field.label}</div>
										<div class="bf-val">{field.value}</div>
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
	/* ── Tokens ─────────────────────────────────────────────────── */
	:root {
		--g4:  #4ade80;
		--g5:  #22c55e;
		--g6:  #16a34a;
		--g7:  #15803d;
		--gs:  rgba(22,163,74,0.08);
		--gsb: rgba(22,163,74,0.14);
		--sw:  256px;    /* sidebar width */
		--sc:  64px;     /* sidebar collapsed */
		--th:  54px;     /* topbar height */
	}

	/* ── Layout shell ───────────────────────────────────────────── */
	.layout {
		display: grid;
		grid-template-columns: var(--sw) 1fr;
		min-height: 100vh;
		background: var(--color-bg);
		transition: grid-template-columns 0.22s ease;
	}
	.layout.collapsed { grid-template-columns: var(--sc) 1fr; }

	/* ── Sidebar ────────────────────────────────────────────────── */
	.sidebar {
		display: flex;
		flex-direction: column;
		width: var(--sw);
		height: 100vh;
		position: sticky;
		top: 0;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		transition: width 0.22s ease;
		overflow: hidden;
		z-index: 50;
		flex-shrink: 0;
	}
	.sidebar.collapsed { width: var(--sc); }

	/* Brand */
	.sidebar-top {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 1rem 0.875rem;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
		min-height: var(--th);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		flex: 1;
		min-width: 0;
	}
	.brand-mark {
		width: 34px; height: 34px;
		border-radius: 0.625rem;
		background: var(--g6);
		display: flex; align-items: center; justify-content: center;
		color: #fff;
		flex-shrink: 0;
	}
	.brand-text { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
	.brand-name {
		font-size: 0.875rem; font-weight: 800; letter-spacing: -0.02em;
		color: var(--color-text); white-space: nowrap;
	}
	.brand-name em { font-style: normal; color: var(--g6); }
	.brand-sub {
		font-size: 0.58rem; font-weight: 700; letter-spacing: 0.07em;
		text-transform: uppercase; color: var(--color-muted);
	}

	/* Shared icon button */
	.icon-btn {
		width: 30px; height: 30px;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer; color: var(--color-muted);
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0; transition: all 0.15s;
		font-family: inherit;
	}
	.icon-btn:hover { border-color: var(--g6); color: var(--g6); }
	.icon-btn :global(.flip) { transform: rotate(180deg); }

	/* Stats strip */
	.stats-strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0.875rem 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		gap: 0.5rem;
	}
	.sstat { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; flex: 1; }
	.sstat-val { font-size: 1rem; font-weight: 800; color: var(--color-text); line-height: 1; }
	.sstat-val.good { color: var(--g6); }
	.sstat-val.warn { color: #d97706; }
	.sstat-lbl { font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
	.sstat-div { width: 1px; height: 28px; background: var(--color-border); flex-shrink: 0; }

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		padding: 0.5rem 0.75rem;
		display: flex; flex-direction: column; gap: 0.175rem;
		overflow-y: auto; overflow-x: hidden;
	}
	.nav-link {
		position: relative;
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.575rem 0.75rem;
		border-radius: 0.625rem;
		text-decoration: none;
		transition: background 0.12s;
		color: var(--color-muted);
	}
	.nav-link:hover { background: var(--gs); color: var(--color-text); }
	.nav-link.active { background: var(--gsb); color: var(--color-text); }

	/* Nav icon — white on green when active, muted on transparent when not */
	.nav-icon {
		width: 30px; height: 30px;
		border-radius: 0.5rem;
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0;
		color: var(--color-muted);
		background: transparent;
		transition: all 0.15s;
	}
	.nav-icon.active {
		background: var(--g6);
		color: #fff;              /* white icon on green — readable */
	}
	.nav-link:hover .nav-icon:not(.active) {
		background: var(--gs);
		color: var(--g6);
	}

	.nav-label {
		flex: 1;
		font-size: 0.82rem; font-weight: 600;
		color: inherit;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.nav-badge {
		font-size: 0.58rem; font-weight: 800; letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.15rem 0.45rem; border-radius: 0.375rem;
		background: var(--g6); color: #fff;
	}

	/* Spinner inside nav */
	.nav-spinner {
		width: 15px; height: 15px;
		border: 2px solid rgba(22,163,74,0.2);
		border-top-color: var(--g6);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	/* Sidebar footer */
	.sidebar-foot {
		padding: 0.75rem;
		border-top: 1px solid var(--color-border);
		display: flex; flex-direction: column; gap: 0.25rem;
		flex-shrink: 0;
	}
	.foot-btn {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.55rem 0.75rem;
		border-radius: 0.625rem; border: none;
		background: transparent; cursor: pointer;
		font-family: inherit; width: 100%;
		transition: background 0.12s;
	}
	.foot-btn:hover { background: var(--gs); }
	.foot-icon {
		width: 30px; height: 30px; border-radius: 0.5rem;
		display: flex; align-items: center; justify-content: center;
		background: var(--color-bg); border: 1px solid var(--color-border);
		color: var(--color-muted); flex-shrink: 0;
	}
	.foot-icon.danger { border-color: transparent; }
	.foot-btn.signout:hover .foot-icon { background: rgba(220,38,38,0.08); color: #dc2626; border-color: rgba(220,38,38,0.2); }
	.foot-label { font-size: 0.8rem; font-weight: 600; color: var(--color-text); }

	.profile-btn {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.55rem 0.75rem;
		border-radius: 0.625rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer; font-family: inherit; width: 100%;
		transition: all 0.15s;
	}
	.profile-btn:hover { border-color: var(--g6); }
	.profile-av {
		width: 30px; height: 30px; border-radius: 50%;
		background: var(--g6);
		display: flex; align-items: center; justify-content: center;
		font-size: 0.68rem; font-weight: 800; color: #fff;
		flex-shrink: 0;
	}
	.profile-info { flex: 1; text-align: left; min-width: 0; }
	.profile-name { display: block; font-size: 0.8rem; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.profile-role { display: block; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--g6); }
	.profile-btn :global(.profile-arrow) { color: var(--color-muted); flex-shrink: 0; transition: transform 0.15s; }
	.profile-btn:hover :global(.profile-arrow) { transform: translateX(2px); color: var(--g6); }

	/* ── Main area ──────────────────────────────────────────────── */
	.layout-main { display: flex; flex-direction: column; min-width: 0; }

	/* Topbar */
	.topbar {
		display: flex; align-items: center; justify-content: space-between;
		height: var(--th); padding: 0 1.5rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		position: sticky; top: 0; z-index: 40; gap: 1rem;
		flex-shrink: 0;
	}
	.topbar-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
	.topbar-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

	.breadcrumb { display: flex; align-items: center; gap: 0.375rem; font-size: 0.78rem; }
	.bc-link { color: var(--color-muted); text-decoration: none; transition: color 0.15s; }
	.bc-link:hover { color: var(--g6); }
	.bc-cur { color: var(--color-text); font-weight: 600; }
	.breadcrumb :global(.bc-sep) { color: var(--color-border); }
	.topbar-greet { font-size: 0.83rem; color: var(--color-muted); }

	.loading-pill {
		display: flex; align-items: center; gap: 0.375rem;
		padding: 0.3rem 0.75rem; border-radius: 2rem;
		background: var(--color-bg); border: 1px solid var(--color-border);
		font-size: 0.72rem; color: var(--color-muted);
	}

	/* Notif */
	.notif-wrap { position: relative; }
	.icon-btn.notif-active { border-color: var(--g6); color: var(--g6); }
	.notif-badge {
		position: absolute; top: -5px; right: -5px;
		background: #ef4444; color: #fff;
		font-size: 0.52rem; font-weight: 800;
		min-width: 15px; height: 15px; border-radius: 999px;
		display: flex; align-items: center; justify-content: center;
		padding: 0 2px; border: 2px solid var(--color-surface);
	}
	.notif-dropdown {
		position: absolute; top: calc(100% + 8px); right: 0;
		width: 310px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.875rem;
		box-shadow: 0 8px 24px rgba(0,0,0,0.1);
		z-index: 100; overflow: hidden;
	}
	.notif-head {
		display: flex; align-items: center; justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.notif-title { font-size: 0.83rem; font-weight: 700; color: var(--color-text); }
	.mark-all-btn {
		display: flex; align-items: center; gap: 0.3rem;
		font-size: 0.7rem; font-weight: 600; color: var(--g6);
		background: none; border: none; cursor: pointer; font-family: inherit;
	}
	.mark-all-btn:disabled { opacity: 0.5; }
	.notif-list { max-height: 340px; overflow-y: auto; }
	.notif-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: var(--color-muted); }
	.notif-empty p { font-size: 0.8rem; margin: 0; }
	.notif-item { display: flex; align-items: flex-start; gap: 0.625rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.12s; }
	.notif-item:hover { background: var(--gs); }
	.notif-item.unread { background: var(--gs); }
	.n-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--g6); margin-top: 5px; flex-shrink: 0; }
	.n-dot-empty { width: 6px; height: 6px; flex-shrink: 0; }
	.n-body { flex: 1; min-width: 0; }
	.n-title { font-size: 0.78rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.15rem; }
	.n-msg   { font-size: 0.7rem; color: var(--color-muted); margin: 0 0 0.15rem; }
	.n-time  { font-size: 0.63rem; color: var(--color-muted); }
	.n-del { width: 22px; height: 22px; border-radius: 0.375rem; border: none; background: transparent; cursor: pointer; color: var(--color-muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
	.n-del:hover { background: rgba(220,38,38,0.08); color: #dc2626; }

	/* Exam banner */
	.exam-banner {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.625rem 1.5rem;
		background: rgba(245,158,11,0.07);
		border-bottom: 1px solid rgba(245,158,11,0.18);
		color: #d97706; font-size: 0.8rem;
	}
	.eb-label { font-weight: 700; flex-shrink: 0; }
	.eb-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.eb-btn {
		display: flex; align-items: center; gap: 0.3rem;
		padding: 0.3rem 0.75rem; border-radius: 0.4rem;
		background: rgba(245,158,11,0.12); color: #d97706;
		text-decoration: none; font-size: 0.73rem; font-weight: 700;
		flex-shrink: 0; transition: background 0.12s;
	}
	.eb-btn:hover { background: rgba(245,158,11,0.22); }

	/* Page content */
	.page-content { flex: 1; padding: 1.5rem; overflow-x: hidden; }

	/* Mobile overlay */
	.mobile-overlay {
		display: none; position: fixed; inset: 0; z-index: 49;
		background: rgba(0,0,0,0.45); backdrop-filter: blur(3px);
	}

	/* ── Modals ─────────────────────────────────────────────────── */
	.modal-bg {
		position: fixed; inset: 0; z-index: 200;
		background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
		display: flex; align-items: center; justify-content: center; padding: 1rem;
	}
	.confirm-modal {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem; padding: 1.75rem;
		max-width: 360px; width: 100%;
	}
	.confirm-icon {
		width: 44px; height: 44px; border-radius: 0.75rem;
		background: rgba(220,38,38,0.08); color: #dc2626;
		display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;
	}
	.confirm-modal h2 { font-size: 1.05rem; font-weight: 800; margin: 0 0 0.5rem; color: var(--color-text); }
	.confirm-modal p  { font-size: 0.82rem; color: var(--color-muted); margin: 0 0 1.5rem; }
	.confirm-actions { display: flex; gap: 0.625rem; }
	.btn-cancel {
		flex: 1; padding: 0.625rem; border-radius: 0.5rem;
		border: 1px solid var(--color-border); background: transparent;
		cursor: pointer; font-weight: 600; font-size: 0.83rem; font-family: inherit;
		color: var(--color-text);
	}
	.btn-danger {
		width: 100%; padding: 0.625rem; border-radius: 0.5rem;
		border: none; background: #dc2626; color: #fff;
		font-weight: 700; font-size: 0.83rem; cursor: pointer; font-family: inherit;
	}

	/* Bio modal */
	.bio-bg { align-items: flex-end; }
	@media (min-width: 641px) { .bio-bg { align-items: center; } }
	.bio-modal {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1.125rem; width: 100%; max-width: 540px;
		max-height: 86vh; display: flex; flex-direction: column; overflow: hidden;
	}
	.bio-head {
		display: flex; align-items: center; gap: 1rem;
		padding: 1.25rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}
	.bio-av {
		width: 52px; height: 52px; border-radius: 50%;
		background: var(--g6);
		display: flex; align-items: center; justify-content: center;
		font-size: 1rem; font-weight: 800; color: #fff; flex-shrink: 0;
	}
	.bio-ident { flex: 1; min-width: 0; }
	.bio-ident h2 { font-size: 0.95rem; font-weight: 800; margin: 0 0 0.2rem; color: var(--color-text); }
	.bio-ident p  { font-size: 0.78rem; color: var(--color-muted); margin: 0; }
	.bio-body { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1.5rem; }
	.bio-section { display: flex; flex-direction: column; gap: 0.875rem; }
	.bio-sec-head {
		display: flex; align-items: center; gap: 0.5rem;
		padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border);
	}
	.bio-sec-head :global(svg) { color: var(--g6); }
	.bio-sec-head h3 { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); margin: 0; }
	.bio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; }
	.bio-field {
		display: flex; align-items: flex-start; gap: 0.625rem;
		padding: 0.75rem; border-radius: 0.625rem;
		background: var(--color-bg); border: 1px solid var(--color-border);
	}
	.bio-field :global(.bio-field-icon) { color: var(--g6); flex-shrink: 0; margin-top: 1px; }
	.bf-label { font-size: 0.62rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); margin-bottom: 0.15rem; }
	.bf-val   { font-size: 0.8rem; font-weight: 600; color: var(--color-text); }

	/* ── Utilities ──────────────────────────────────────────────── */
	@keyframes spin { to { transform: rotate(360deg); } }
	:global(.spin) { animation: spin 0.7s linear infinite; }

	.desktop-only { display: flex; }
	.mobile-only  { display: none; }

	/* ── Responsive ─────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.desktop-only { display: none !important; }
		.mobile-only  { display: flex !important; }

		.layout, .layout.collapsed { grid-template-columns: 1fr; }

		.sidebar {
			position: fixed; left: 0; top: 0; height: 100%;
			transform: translateX(-100%);
			transition: transform 0.22s ease;
			box-shadow: 4px 0 20px rgba(0,0,0,0.12);
		}
		.sidebar.mobile-open { transform: translateX(0); }
		.mobile-overlay { display: block; }

		.topbar { padding: 0 1rem; }
		.page-content { padding: 1rem; }
		.bio-grid { grid-template-columns: 1fr; }
	}
</style>