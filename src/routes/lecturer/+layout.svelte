<!-- src/routes/lecturer/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page, navigating } from '$app/stores';
  import { goto } from '$app/navigation';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, BookOpen, ClipboardList, X,
    Sun, Moon, LogOut, ChevronRight, LoaderCircle,
    PlusCircle, BarChart2, ChevronDown, Bell, CheckCheck,
    FileText, Clock, Menu, User, PanelLeftClose, PanelLeftOpen,
    Zap, CalendarClock, FileEdit, Library, Download,
    GraduationCap, BookMarked, ShieldAlert, Flag, Search,
    TrendingUp, BookCheck
  } from '@lucide/svelte';
  import { setContext } from 'svelte';
  import { ROLE_CONTEXT_KEY } from '$lib/constants/context';

  setContext(ROLE_CONTEXT_KEY, 'lecturer');

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme         = $derived(getTheme());
  let collapsed     = $state(false);
  let mobileOpen    = $state(false);
  let navLoading    = $state<string | null>(null);
  let showSignout   = $state(false);
  let isSigningOut  = $state(false);
  let showNotifs    = $state(false);
  let notifications = $state<any[]>(data.notifications ?? []);
  let markingAll    = $state(false);

  // Group open states
  let examsOpen    = $state(false);
  let resultsOpen  = $state(false);
  let studentsOpen = $state(false);

  const unreadCount   = $derived(notifications.filter(n => !n.isRead).length);
  const activeExams   = $derived(data.stats?.activeExams   ?? 0);
  const pendingGrades = $derived(data.stats?.pendingGrades ?? 0);
  const totalExams    = $derived(data.stats?.totalExams    ?? 0);

  onMount(() => {
    const saved = localStorage.getItem('lec-sidebar-collapsed');
    if (saved !== null) collapsed = JSON.parse(saved);
  });

  $effect(() => {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('lec-sidebar-collapsed', JSON.stringify(collapsed));
  });

  $effect(() => { if ($navigating) mobileOpen = false; });

  const currentPath = $derived($page.url.pathname);

  // Auto-expand groups when on their routes
  $effect(() => {
    if (currentPath.startsWith('/lecturer/exams'))    examsOpen    = true;
    if (currentPath.startsWith('/lecturer/results'))  resultsOpen  = true;
    if (currentPath.startsWith('/lecturer/students')) studentsOpen = true;
  });

  // ── Nav structure ─────────────────────────────────────────────────────────
  type NavChild = { href: string; label: string; icon: any; dividerBefore?: string };
  type NavItem  = { href: string; label: string; icon: any; badge?: () => number | null; children?: NavChild[] };

  const nav: NavItem[] = [
    {
      href:  '/lecturer',
      label: 'Dashboard',
      icon:  LayoutDashboard,
    },
    {
      href:  '/lecturer/exams',
      label: 'Exams',
      icon:  ClipboardList,
      badge: () => activeExams || null,
      children: [
        // ── Manage group
        { href: '/lecturer/exams',           label: 'All Exams',      icon: ClipboardList,  dividerBefore: 'Manage' },
        { href: '/lecturer/exams?status=active',    label: 'Active Now',     icon: Zap             },
        { href: '/lecturer/exams?status=scheduled', label: 'Scheduled',      icon: CalendarClock   },
        { href: '/lecturer/exams?status=draft',     label: 'Drafts',         icon: FileEdit        },
        // ── Build group
        { href: '/lecturer/exams/create',    label: 'Create Exam',    icon: PlusCircle,     dividerBefore: 'Build' },
        { href: '/lecturer/questions',       label: 'Question Bank',  icon: Library         },
      ],
    },
    {
      href:  '/lecturer/results',
      label: 'Results',
      icon:  BarChart2,
      badge: () => pendingGrades || null,
      children: [
        { href: '/lecturer/results',              label: 'All Results',   icon: BarChart2,   dividerBefore: 'Results' },
        { href: '/lecturer/results/by-course',    label: 'By Course',     icon: BookMarked   },
        { href: '/lecturer/results/by-exam',      label: 'By Exam',       icon: BookCheck    },
        { href: '/lecturer/results/grade-reports',label: 'Grade Reports', icon: TrendingUp,  dividerBefore: 'Reports' },
        { href: '/lecturer/results/export',       label: 'Export',        icon: Download     },
      ],
    },
    {
      href:  '/lecturer/students',
      label: 'Students',
      icon:  GraduationCap,
      children: [
        { href: '/lecturer/students',              label: 'Overview',      icon: User,        dividerBefore: 'Students' },
        { href: '/lecturer/students/by-course',    label: 'By Course',     icon: BookMarked   },
        { href: '/lecturer/students/eligibility',  label: 'Eligibility',   icon: BookCheck,   dividerBefore: 'Monitoring' },
        { href: '/lecturer/students/violations',   label: 'Violations',    icon: ShieldAlert  },
        { href: '/lecturer/students/report',       label: 'Report Student',icon: Flag,        dividerBefore: 'Actions'   },
      ],
    },
    { href: '/lecturer/notifications', label: 'Notifications', icon: Bell },
    { href: '/lecturer/profile',       label: 'Profile',       icon: User },
  ];

  // ── Active / group helpers ────────────────────────────────────────────────
  function isActive(href: string) {
    // Exact match for most routes
    const [path] = href.split('?');
    if (path === '/lecturer') return currentPath === '/lecturer';

    // For parent anchors only match exactly
    const parents = ['/lecturer/exams', '/lecturer/results', '/lecturer/students'];
    if (parents.includes(path)) return currentPath === path;

    return currentPath === path;
  }

  function isGroupActive(item: NavItem) {
    if (!item.children) return isActive(item.href);
    return item.children.some(c => isActive(c.href)) ||
      currentPath.startsWith(item.href + '/') ||
      currentPath.startsWith(item.href + '?');
  }

  function isGroupOpen(item: NavItem) {
    if (item.label === 'Exams')    return examsOpen;
    if (item.label === 'Results')  return resultsOpen;
    if (item.label === 'Students') return studentsOpen;
    return false;
  }

  function toggleGroup(item: NavItem) {
    if (item.label === 'Exams')    examsOpen    = !examsOpen;
    if (item.label === 'Results')  resultsOpen  = !resultsOpen;
    if (item.label === 'Students') studentsOpen = !studentsOpen;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  async function navigate(href: string, e: MouseEvent) {
    e.preventDefault();
    if (navLoading) return;
    navLoading = href;
    mobileOpen = false;
    try { await goto(href); }
    finally { setTimeout(() => (navLoading = null), 300); }
  }

  async function confirmSignout() {
    isSigningOut = true;
    const f = document.createElement('form');
    f.method = 'POST'; f.action = '/logout';
    document.body.appendChild(f); f.submit();
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  async function markAllRead() {
    if (markingAll || !unreadCount) return;
    markingAll = true;
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      notifications = notifications.map(n => ({ ...n, isRead: true }));
    } finally { markingAll = false; }
  }

  async function markOneRead(id: string) {
    notifications = notifications.map(n => (n.id === id ? { ...n, isRead: true } : n));
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  }

  function closeNotifsOutside(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.notif-anchor')) showNotifs = false;
  }
  $effect(() => {
    if (showNotifs) {
      document.addEventListener('click', closeNotifsOutside);
      return () => document.removeEventListener('click', closeNotifsOutside);
    }
  });

  // ── Breadcrumbs ───────────────────────────────────────────────────────────
  const breadcrumbs = $derived((() => {
    const parts = currentPath.replace(/^\/lecturer/, '').split('/').filter(Boolean);
    if (!parts.length) return [];
    const map: Record<string, string> = {
      exams: 'Exams', create: 'Create', results: 'Results',
      questions: 'Questions', profile: 'Profile', notifications: 'Notifications',
      students: 'Students', 'by-course': 'By Course', 'by-exam': 'By Exam',
      'grade-reports': 'Grade Reports', export: 'Export', eligibility: 'Eligibility',
      violations: 'Violations', report: 'Report', 'question-bank': 'Question Bank',
    };
    const crumbs = [{ label: 'Home', href: '/lecturer' }];
    let built = '/lecturer';
    for (const p of parts) {
      built += '/' + p;
      crumbs.push({
        label: /^[0-9a-f-]{36}$/i.test(p)
          ? 'Exam'
          : (map[p] ?? p[0].toUpperCase() + p.slice(1)),
        href: built,
      });
    }
    return crumbs;
  })());

  function reltime(date: string) {
    const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const initials = $derived(
    (data.user?.fullName ?? 'L').trim().split(/\s+/).filter(Boolean)
      .reduce((a: string, w: string, i: number, arr: string[]) =>
        (i === 0 || i === arr.length - 1) ? a + w[0] : a, '')
      .toUpperCase().slice(0, 2)
  );

  const firstName = $derived(data.user?.fullName?.split(' ')[0] ?? 'Lecturer');
</script>

<svelte:head><title>Lecturer — MOUAU eTest</title></svelte:head>

{#if mobileOpen}
  <div class="mob-overlay" onclick={() => (mobileOpen = false)} aria-hidden="true"></div>
{/if}

<!-- Sign-out modal -->
{#if showSignout}
  <div class="modal-bg" onclick={() => { if (!isSigningOut) showSignout = false; }}>
    <div class="modal" onclick={e => e.stopPropagation()}>
      <div class="modal-ico"><LogOut size={20} /></div>
      <h3>Sign out?</h3>
      <p>You'll need to sign in again to access your dashboard.</p>
      <div class="modal-row">
        <button class="btn-ghost" onclick={() => showSignout = false} disabled={isSigningOut} type="button">Cancel</button>
        <button class="btn-danger" onclick={confirmSignout} disabled={isSigningOut} type="button">
          {#if isSigningOut}<LoaderCircle size={14} class="spin" /> Signing out…{:else}<LogOut size={14} /> Sign out{/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="shell" class:collapsed>

  <!-- ═══ SIDEBAR ═══ -->
  <aside class="sidebar" class:collapsed class:mob-open={mobileOpen}>

    <!-- Brand -->
    <div class="sidebar-top">
      <a href="/lecturer" class="brand" aria-label="Lecturer home">
        <div class="brand-icon"><BookOpen size={17} strokeWidth={2} /></div>
        {#if !collapsed}
          <div class="brand-copy">
            <span class="brand-name">MOUAU <em>eTest</em></span>
            <span class="brand-role">Lecturer Portal</span>
          </div>
        {/if}
      </a>
      <button
        class="tog-btn desktop-only"
        type="button"
        onclick={() => (collapsed = !collapsed)}
        aria-label={collapsed ? 'Expand' : 'Collapse'}
      >
        {#if collapsed}<PanelLeftOpen size={15} />{:else}<PanelLeftClose size={15} />{/if}
      </button>
      <button class="tog-btn mobile-only" type="button" onclick={() => (mobileOpen = false)} aria-label="Close">
        <X size={15} />
      </button>
    </div>

    <!-- Stats strip — expanded only -->
    {#if !collapsed}
      <div class="stats-row">
        <div class="stat" class:pulse-stat={activeExams > 0}>
          <div class="stat-dot" class:pulse={activeExams > 0}></div>
          <span class="stat-n">{activeExams}</span>
          <span class="stat-l">Active</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <FileText size={10} />
          <span class="stat-n">{totalExams}</span>
          <span class="stat-l">Total</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat" class:amber={pendingGrades > 0}>
          <Clock size={10} />
          <span class="stat-n">{pendingGrades}</span>
          <span class="stat-l">Pending</span>
        </div>
      </div>
    {/if}

    <!-- Nav -->
    <nav class="nav" aria-label="Lecturer navigation">
      {#each nav as item}
        {#if !item.children}
          <!-- Flat link -->
          {@const active  = isActive(item.href)}
          {@const loading = navLoading === item.href}
          <a
            href={item.href}
            class="nav-lnk"
            class:active
            class:loading
            onclick={e => navigate(item.href, e)}
            title={collapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <div class="nav-icon" class:active>
              {#if loading}
                <div class="spinner"></div>
              {:else}
                <item.icon size={16} strokeWidth={2} />
              {/if}
            </div>
            {#if !collapsed}
              <span class="nav-label">{item.label}</span>
              {#if item.label === 'Notifications' && unreadCount > 0}
                <span class="badge-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
              {/if}
            {:else if item.label === 'Notifications' && unreadCount > 0}
              <span class="collapsed-dot"></span>
            {/if}
          </a>

        {:else if collapsed}
          <!-- Collapsed: top-level link only -->
          {@const active = isGroupActive(item)}
          <a
            href={item.href}
            class="nav-lnk"
            class:active
            onclick={e => navigate(item.href, e)}
            title={item.label}
          >
            <div class="nav-icon" class:active>
              <item.icon size={16} strokeWidth={2} />
            </div>
            {#if item.badge?.()}
              <span class="collapsed-dot"></span>
            {/if}
          </a>

        {:else}
          <!-- Expanded: collapsible group with labelled sections -->
          {@const gopen  = isGroupOpen(item)}
          {@const active = isGroupActive(item)}
          <div class="nav-group" class:open={gopen}>
            <button
              class="nav-lnk group-trigger"
              class:active
              onclick={() => toggleGroup(item)}
              type="button"
            >
              <div class="nav-icon" class:active>
                <item.icon size={16} strokeWidth={2} />
              </div>
              <span class="nav-label">{item.label}</span>
              {#if item.badge?.()}
                <span class="badge-count badge-live">{item.badge()}</span>
              {/if}
              <ChevronDown size={13} class="chevron" style="margin-left: auto; transition: transform 0.2s; transform: rotate({gopen ? 180 : 0}deg)" />
            </button>

            {#if gopen}
              <div class="nav-children">
                {#each item.children as child}
                  {@const cactive  = isActive(child.href)}
                  {@const cloading = navLoading === child.href}

                  {#if child.dividerBefore}
                    <div class="nav-section-label">{child.dividerBefore}</div>
                  {/if}

                  <a
                    href={child.href}
                    class="nav-child"
                    class:active={cactive}
                    class:loading={cloading}
                    onclick={e => navigate(child.href, e)}
                    aria-current={cactive ? 'page' : undefined}
                  >
                    <span class="child-icon" class:active={cactive}>
                      {#if cloading}
                        <div class="spinner sm"></div>
                      {:else}
                        <child.icon size={13} strokeWidth={2} />
                      {/if}
                    </span>
                    <span class="child-label">{child.label}</span>
                    {#if cactive}
                      <span class="child-active-pip"></span>
                    {/if}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </nav>

    <!-- Loading bar -->
    {#if navLoading}
      <div class="load-bar"><div class="load-progress"></div></div>
    {/if}

    <!-- Footer -->
    <div class="sidebar-foot">
      <button class="foot-btn" type="button" onclick={toggleTheme} title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}>
        <div class="foot-icon">
          {#if theme === 'dark'}<Sun size={14} />{:else}<Moon size={14} />{/if}
        </div>
        {#if !collapsed}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>{/if}
      </button>

      <a
        href="/lecturer/profile"
        class="profile-row"
        onclick={e => navigate('/lecturer/profile', e)}
        title={collapsed ? data.user?.fullName : undefined}
      >
        <div class="avatar">{initials}</div>
        {#if !collapsed}
          <div class="profile-copy">
            <span class="profile-name">{data.user?.title ? data.user.title + ' ' : ''}{firstName}</span>
            <span class="profile-sub">Lecturer</span>
          </div>
          <ChevronRight size={13} class="profile-arr" />
        {/if}
      </a>

      <button class="foot-btn signout" type="button" onclick={() => (showSignout = true)} title={collapsed ? 'Sign out' : undefined}>
        <div class="foot-icon"><LogOut size={14} /></div>
        {#if !collapsed}<span>Sign out</span>{/if}
      </button>
    </div>
  </aside>

  <!-- ═══ MAIN ═══ -->
  <div class="main">

    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-l">
        <button class="mob-menu mobile-only" type="button" onclick={() => (mobileOpen = true)} aria-label="Open menu">
          <Menu size={17} />
        </button>

        {#if breadcrumbs.length}
          <nav class="bc" aria-label="Breadcrumb">
            {#each breadcrumbs as crumb, i}
              {#if i > 0}<ChevronRight size={11} class="bc-sep" />{/if}
              {#if i === breadcrumbs.length - 1}
                <span class="bc-cur">{crumb.label}</span>
              {:else}
                <a href={crumb.href} class="bc-lnk" onclick={e => navigate(crumb.href, e)}>{crumb.label}</a>
              {/if}
            {/each}
          </nav>
        {:else}
          <span class="greet">Welcome back, <strong>{firstName}</strong></span>
        {/if}
      </div>

      <div class="topbar-r">
        {#if navLoading || $navigating}
          <div class="load-pill"><LoaderCircle size={13} class="spin" /><span>Loading…</span></div>
        {/if}

        <!-- Notifications -->
        <div class="notif-anchor">
          <button
            class="icon-btn"
            class:notif-lit={unreadCount > 0}
            type="button"
            onclick={() => (showNotifs = !showNotifs)}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {#if unreadCount > 0}
              <span class="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            {/if}
          </button>

          {#if showNotifs}
            <div class="notif-drop" onclick={e => e.stopPropagation()}>
              <div class="notif-head">
                <span class="notif-title">Notifications</span>
                {#if unreadCount > 0}
                  <button class="mark-all" onclick={markAllRead} disabled={markingAll} type="button">
                    {#if markingAll}<LoaderCircle size={11} class="spin" />{:else}<CheckCheck size={11} />{/if}
                    Mark all read
                  </button>
                {/if}
              </div>
              <div class="notif-list">
                {#if !notifications.length}
                  <div class="notif-empty"><Bell size={28} strokeWidth={1.2} /><p>No notifications</p></div>
                {:else}
                  {#each notifications.slice(0, 20) as n (n.id)}
                    <button class="notif-item" class:unread={!n.isRead} onclick={() => markOneRead(n.id)} type="button">
                      <div class="notif-pip" class:active={!n.isRead}></div>
                      <div class="notif-body">
                        <p class="notif-t">{n.title}</p>
                        <p class="notif-m">{n.message}</p>
                        <span class="notif-time">{reltime(n.createdAt)}</span>
                      </div>
                    </button>
                  {/each}
                {/if}
              </div>
              {#if notifications.length}
                <div class="notif-foot">
                  <a href="/lecturer/notifications" onclick={() => { showNotifs = false; }}>All notifications</a>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button class="icon-btn" type="button" onclick={toggleTheme} aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>

        <div class="role-pill"><BookOpen size={12} /><span>Lecturer</span></div>
      </div>
    </header>

    <main class="content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  /* ── Shell ──────────────────────────────────────────────────────────────── */
  .shell { display: flex; height: 100dvh; overflow: hidden; background: var(--color-bg); }
  .main  { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

  /* ── Sidebar ────────────────────────────────────────────────────────────── */
  .sidebar {
    width: 228px; flex-shrink: 0;
    display: flex; flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    transition: width 0.22s cubic-bezier(.4,0,.2,1);
    overflow: hidden; position: relative; z-index: 40;
  }
  .sidebar.collapsed { width: 56px; }

  /* ── Brand ──────────────────────────────────────────────────────────────── */
  .sidebar-top {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.875rem 0.75rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .brand {
    display: flex; align-items: center; gap: 0.55rem;
    text-decoration: none; flex: 1; min-width: 0;
  }
  .brand-icon {
    width: 30px; height: 30px; border-radius: 0.5rem; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc-700, #4338ca), var(--lc-600, #4f46e5));
    display: flex; align-items: center; justify-content: center; color: #fff;
  }
  .brand-copy { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .brand-name {
    font-size: 0.82rem; font-weight: 800; color: var(--color-text);
    white-space: nowrap; letter-spacing: -0.02em;
  }
  .brand-name em { font-style: normal; color: var(--lc-600, #4f46e5); }
  .brand-role { font-size: 0.62rem; color: var(--color-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .tog-btn {
    width: 26px; height: 26px; border-radius: 0.4rem; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); cursor: pointer; transition: all 0.15s;
  }
  .tog-btn:hover { color: var(--color-text); border-color: var(--lc-600, #4f46e5); }

  /* ── Stats row ──────────────────────────────────────────────────────────── */
  .stats-row {
    display: flex; align-items: center;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--color-border);
    gap: 0.5rem; flex-shrink: 0;
  }
  .stat {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.1rem; flex: 1;
  }
  .stat-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--color-muted);
  }
  .stat-dot.pulse { background: #16a34a; animation: ring 1.8s ease-in-out infinite; }
  @keyframes ring {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
    50%       { box-shadow: 0 0 0 5px rgba(22,163,74,0); }
  }
  .stat-n { font-size: 0.875rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .stat-l { font-size: 0.58rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .stat.amber .stat-n { color: #d97706; }
  .stat.pulse-stat .stat-n { color: #16a34a; }
  .stat-div { width: 1px; height: 20px; background: var(--color-border); flex-shrink: 0; }

  /* ── Nav ────────────────────────────────────────────────────────────────── */
  .nav {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 0.5rem 0.5rem;
    display: flex; flex-direction: column; gap: 1px;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  /* flat link & group trigger share base */
  .nav-lnk {
    display: flex; align-items: center; gap: 0.55rem;
    padding: 0.5rem 0.5rem;
    border-radius: 0.55rem;
    text-decoration: none; font-size: 0.825rem; font-weight: 600;
    color: var(--color-muted);
    border: none; background: none; cursor: pointer;
    font-family: inherit; width: 100%; text-align: left;
    transition: background 0.12s, color 0.12s;
    position: relative;
  }
  .nav-lnk:hover { background: var(--color-bg); color: var(--color-text); }
  .nav-lnk.active { background: var(--lc-soft, rgba(79,70,229,0.08)); color: var(--lc-600, #4f46e5); }

  .nav-icon {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: transparent; color: inherit;
    transition: background 0.12s;
  }
  .nav-icon.active { background: var(--lc-soft, rgba(79,70,229,0.1)); color: var(--lc-600, #4f46e5); }
  .nav-lnk:hover .nav-icon:not(.active) { background: var(--color-border); }

  .nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* badges */
  .badge-count {
    font-size: 0.6rem; font-weight: 800; padding: 0.1rem 0.4rem;
    border-radius: 999px; background: var(--lc-soft, rgba(79,70,229,.1));
    color: var(--lc-600, #4f46e5); flex-shrink: 0;
  }
  .badge-live { background: rgba(22,163,74,.12); color: #16a34a; }
  .collapsed-dot {
    position: absolute; top: 6px; right: 6px;
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--lc-600, #4f46e5);
  }

  /* ── Groups ─────────────────────────────────────────────────────────────── */
  .nav-group { display: flex; flex-direction: column; }

  /* ── Children ───────────────────────────────────────────────────────────── */
  .nav-children {
    display: flex; flex-direction: column; gap: 1px;
    padding: 0.25rem 0 0.25rem 0.875rem;
    margin-left: 0.75rem;
    border-left: 1.5px solid var(--color-border);
    margin-bottom: 0.25rem;
  }

  /* Section divider label */
  .nav-section-label {
    font-size: 0.58rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--color-muted);
    padding: 0.6rem 0.5rem 0.2rem;
    opacity: 0.6;
  }
  /* Remove top padding on the very first section label */
  .nav-children .nav-section-label:first-child { padding-top: 0.2rem; }

  .nav-child {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.42rem 0.6rem;
    border-radius: 0.45rem;
    text-decoration: none; font-size: 0.8rem; font-weight: 500;
    color: var(--color-muted);
    transition: background 0.1s, color 0.1s;
    position: relative;
  }
  .nav-child:hover { background: var(--color-bg); color: var(--color-text); }
  .nav-child.active {
    background: var(--lc-soft, rgba(79,70,229,0.07));
    color: var(--lc-600, #4f46e5);
    font-weight: 700;
  }

  .child-icon {
    width: 22px; height: 22px; border-radius: 0.35rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: inherit; background: transparent;
    transition: background 0.1s;
  }
  .child-icon.active { background: var(--lc-soft, rgba(79,70,229,0.1)); color: var(--lc-600, #4f46e5); }
  .nav-child:hover .child-icon:not(.active) { background: var(--color-border); }

  .child-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .child-active-pip {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--lc-600, #4f46e5);
    flex-shrink: 0; margin-left: auto;
  }

  /* ── Spinners ───────────────────────────────────────────────────────────── */
  .spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--color-border);
    border-top-color: var(--lc-600, #4f46e5);
    animation: spin 0.6s linear infinite;
  }
  .spinner.sm { width: 11px; height: 11px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Load bar ───────────────────────────────────────────────────────────── */
  .load-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 2px; background: var(--color-border);
  }
  .load-progress {
    height: 100%; background: var(--lc-600, #4f46e5);
    animation: loadbar 1.4s ease-in-out infinite;
  }
  @keyframes loadbar {
    0%   { width: 0%; margin-left: 0; }
    50%  { width: 60%; margin-left: 20%; }
    100% { width: 0%; margin-left: 100%; }
  }

  /* ── Footer ─────────────────────────────────────────────────────────────── */
  .sidebar-foot {
    padding: 0.5rem; border-top: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: 1px; flex-shrink: 0;
  }
  .foot-btn {
    display: flex; align-items: center; gap: 0.55rem;
    padding: 0.5rem 0.5rem; border-radius: 0.5rem;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); font-size: 0.8rem; font-weight: 600;
    font-family: inherit; width: 100%; text-align: left;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
  }
  .foot-btn:hover { background: var(--color-bg); color: var(--color-text); }
  .foot-btn.signout:hover { color: #ef4444; }
  .foot-icon {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg);
  }

  .profile-row {
    display: flex; align-items: center; gap: 0.55rem;
    padding: 0.5rem 0.5rem; border-radius: 0.5rem;
    text-decoration: none;
    transition: background 0.12s;
    cursor: pointer;
  }
  .profile-row:hover { background: var(--color-bg); }
  .avatar {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc-700, #4338ca), var(--lc-600, #4f46e5));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.62rem; font-weight: 800; color: #fff; letter-spacing: 0.02em;
  }
  .profile-copy { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .profile-name { font-size: 0.8rem; font-weight: 700; color: var(--color-text); white-space: nowrap; }
  .profile-sub  { font-size: 0.62rem; color: var(--color-muted); font-weight: 600; }

  /* ── Mobile overlay ─────────────────────────────────────────────────────── */
  .mob-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    z-index: 39; backdrop-filter: blur(2px);
  }
  @media (max-width: 768px) {
    .sidebar { position: fixed; top: 0; left: 0; bottom: 0; z-index: 40; transform: translateX(-100%); transition: transform 0.22s cubic-bezier(.4,0,.2,1); width: 240px !important; }
    .sidebar.mob-open { transform: translateX(0); }
    .shell { display: block; }
    .main  { height: 100dvh; }
  }
  .desktop-only { display: flex; }
  .mobile-only  { display: none; }
  @media (max-width: 768px) {
    .desktop-only { display: none; }
    .mobile-only  { display: flex; }
  }

  /* ── Topbar ─────────────────────────────────────────────────────────────── */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.25rem; height: 52px; flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface); gap: 1rem;
  }
  .topbar-l { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
  .topbar-r { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

  .mob-menu {
    width: 32px; height: 32px; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); cursor: pointer;
  }

  /* Breadcrumb */
  .bc { display: flex; align-items: center; gap: 0.3rem; min-width: 0; }
  .bc-lnk { font-size: 0.78rem; color: var(--color-muted); text-decoration: none; font-weight: 500; white-space: nowrap; transition: color 0.12s; }
  .bc-lnk:hover { color: var(--lc-600, #4f46e5); }
  .bc-cur { font-size: 0.78rem; color: var(--color-text); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .greet  { font-size: 0.82rem; color: var(--color-muted); }
  .greet strong { color: var(--color-text); }

  /* Topbar actions */
  .load-pill {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.72rem; color: var(--color-muted); font-weight: 600;
    padding: 0.3rem 0.6rem; border-radius: 999px;
    background: var(--color-bg); border: 1px solid var(--color-border);
  }
  .icon-btn {
    width: 32px; height: 32px; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); cursor: pointer; position: relative;
    transition: all 0.12s;
  }
  .icon-btn:hover { color: var(--color-text); border-color: var(--lc-600, #4f46e5); }
  .icon-btn.notif-lit { color: var(--lc-600, #4f46e5); border-color: var(--lc-600, #4f46e5); }
  .notif-badge {
    position: absolute; top: -4px; right: -4px;
    font-size: 0.55rem; font-weight: 800; padding: 0.1rem 0.3rem;
    background: #ef4444; color: #fff; border-radius: 999px; border: 1.5px solid var(--color-surface);
    min-width: 14px; text-align: center;
  }
  .role-pill {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 700;
    padding: 0.3rem 0.625rem; border-radius: 999px;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
    border: 1px solid color-mix(in srgb, var(--lc-600, #4f46e5) 20%, transparent);
  }

  /* ── Notifications panel ────────────────────────────────────────────────── */
  .notif-anchor { position: relative; }
  .notif-drop {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 320px; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: 0.875rem;
    box-shadow: 0 12px 40px rgba(0,0,0,0.16); z-index: 200; overflow: hidden;
  }
  .notif-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1rem 0.625rem;
    border-bottom: 1px solid var(--color-border);
  }
  .notif-title { font-size: 0.82rem; font-weight: 800; color: var(--color-text); }
  .mark-all {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; color: var(--lc-600, #4f46e5);
    background: none; border: none; cursor: pointer; font-family: inherit; padding: 0;
  }
  .notif-list { max-height: 320px; overflow-y: auto; }
  .notif-item {
    display: flex; align-items: flex-start; gap: 0.625rem;
    padding: 0.75rem 1rem; width: 100%;
    border: none; background: none; cursor: pointer; text-align: left;
    font-family: inherit; border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: var(--lc-soft, rgba(79,70,229,0.04)); }
  .notif-pip { width: 7px; height: 7px; border-radius: 50%; background: var(--color-border); flex-shrink: 0; margin-top: 4px; }
  .notif-pip.active { background: var(--lc-600, #4f46e5); }
  .notif-body { flex: 1; min-width: 0; }
  .notif-t  { font-size: 0.78rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.15rem; }
  .notif-m  { font-size: 0.72rem; color: var(--color-muted); margin: 0 0 0.25rem; line-height: 1.4; }
  .notif-time { font-size: 0.65rem; color: var(--color-muted); font-weight: 600; }
  .notif-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: var(--color-muted); font-size: 0.78rem; }
  .notif-foot { padding: 0.625rem 1rem; border-top: 1px solid var(--color-border); }
  .notif-foot a { font-size: 0.75rem; font-weight: 600; color: var(--lc-600, #4f46e5); text-decoration: none; }

  /* ── Content ────────────────────────────────────────────────────────────── */
  .content { flex: 1; overflow-y: auto; overflow-x: hidden; }

  /* ── Sign-out modal ─────────────────────────────────────────────────────── */
  .modal-bg {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 300; display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(3px);
  }
  .modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.75rem; width: min(360px, calc(100vw - 2rem));
    display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
    text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  .modal-ico {
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(239,68,68,0.1); color: #ef4444;
    display: flex; align-items: center; justify-content: center; margin-bottom: 0.25rem;
  }
  .modal h3 { font-size: 1rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .modal p  { font-size: 0.82rem; color: var(--color-muted); margin: 0; }
  .modal-row { display: flex; gap: 0.625rem; margin-top: 0.5rem; width: 100%; }
  .btn-ghost {
    flex: 1; padding: 0.625rem; border-radius: 0.625rem;
    border: 1.5px solid var(--color-border); background: var(--color-bg);
    font-size: 0.82rem; font-weight: 700; color: var(--color-text);
    cursor: pointer; font-family: inherit;
  }
  .btn-danger {
    flex: 1; padding: 0.625rem; border-radius: 0.625rem;
    border: none; background: #ef4444; color: #fff;
    font-size: 0.82rem; font-weight: 700; cursor: pointer;
    font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  }
  .btn-danger:disabled, .btn-ghost:disabled { opacity: 0.6; cursor: not-allowed; }

  :global(.spin) { animation: spin 0.7s linear infinite; display: inline-block; }
</style>