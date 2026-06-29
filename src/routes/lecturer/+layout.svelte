<!-- src/routes/lecturer/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page, navigating } from '$app/stores';
  import { goto } from '$app/navigation';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import {
    LayoutDashboard, BookOpen, ClipboardList, X,
    Sun, Moon, LogOut, ChevronRight, LoaderCircle,
    PlusCircle, BarChart2, ChevronDown, Bell, CheckCheck,
    FileText, Clock, Menu, User, PanelLeftClose, PanelLeftOpen,
    Zap, CalendarClock, FileEdit, CheckCircle, Download,
    GraduationCap, BookMarked, ShieldAlert, Flag,
    TrendingUp, BookCheck, Settings, HelpCircle, Award,
    Upload, Tag, Star, Eye, Activity, Scale,
    ListOrdered, GripVertical, Copy, Printer,Archive,
  } from '@lucide/svelte';
  import { setContext } from 'svelte';
  import { ROLE_CONTEXT_KEY } from '$lib/constants/context';

  setContext(ROLE_CONTEXT_KEY, 'lecturer');

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  // ── Core UI State ─────────────────────────────────────────────────────────
  let theme         = $derived(getTheme());
  let collapsed     = $state(false);
  let mobileOpen    = $state(false);
  let navLoading    = $state<string | null>(null);
  let showSignout   = $state(false);
  let isSigningOut  = $state(false);
  let showNotifs    = $state(false);
  let notifications = $state<any[]>(data.notifications ?? []);
  let markingAll    = $state(false);

  // ── Accordion State ────────────────────────────────────────────────────────
  let userOpenGroup = $state<string | null>(null);

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

  // ── Derived: which group should be open based on route ───────────────────
  const routeGroup = $derived.by(() => {
    if (currentPath.startsWith('/lecturer/exams'))    return 'Exams';
    if (currentPath.startsWith('/lecturer/results'))  return 'Results';
    if (currentPath.startsWith('/lecturer/students')) return 'Students';
    if (currentPath.startsWith('/lecturer/questions')) return 'Question Bank';
    return null;
  });

  const openGroup = $derived(userOpenGroup ?? routeGroup);

  // ── Nav Structure ─────────────────────────────────────────────────────────
  type NavChild = {
    href: string;
    label: string;
    icon: any;
    sectionLabel?: string;
    badge?: () => number | null;
  };
  type NavItem = {
    href: string;
    label: string;
    icon: any;
    badge?: () => number | null;
    children?: NavChild[];
  };

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
        { href: '/lecturer/exams',                  label: 'All Exams',           icon: ListOrdered,  sectionLabel: 'Overview' },
        { href: '/lecturer/exams/create',           label: 'Create Exam',          icon: PlusCircle,   sectionLabel: 'Actions' },
        { href: '/lecturer/exams/drafts',           label: 'My Drafts',            icon: FileEdit      },
        { href: '/lecturer/exams/archived',         label: 'Archived',             icon: Archive       },
        { href: '/lecturer/exams/scheduled',        label: 'Scheduled',            icon: CalendarClock, sectionLabel: 'Filter' },
        { href: '/lecturer/exams/active',           label: 'Active Now',           icon: Zap           },
        { href: '/lecturer/exams/completed',        label: 'Completed',            icon: CheckCircle   },
      ],
    },
    {
      href:  '/lecturer/results',
      label: 'Results',
      icon:  BarChart2,
      badge: () => pendingGrades || null,
      children: [
        { href: '/lecturer/results',               label: 'All Results',   icon: BarChart2,   sectionLabel: 'Overview' },
        { href: '/lecturer/results/by-course',     label: 'By Course',     icon: BookMarked   },
        { href: '/lecturer/results/by-exam',       label: 'By Exam',       icon: BookCheck    },
        { href: '/lecturer/results/grade-reports', label: 'Grade Reports', icon: TrendingUp,  sectionLabel: 'Reports'  },
        { href: '/lecturer/results/export',        label: 'Export',        icon: Download     },
        { href: '/lecturer/results/print',         label: 'Print Results', icon: Printer,     sectionLabel: 'Actions'  },
      ],
    },
    {
      href:  '/lecturer/students',
      label: 'Students',
      icon:  GraduationCap,
      children: [
        { href: '/lecturer/students',             label: 'Overview',          icon: User,         sectionLabel: 'Students'   },
        { href: '/lecturer/students/by-course',   label: 'By Course',         icon: BookMarked    },
        { href: '/lecturer/students/eligibility', label: 'Eligibility',       icon: BookCheck,    sectionLabel: 'Monitoring' },
        { href: '/lecturer/students/violations',  label: 'Violations',        icon: ShieldAlert   },
        { href: '/lecturer/students/performance', label: 'Performance',       icon: TrendingUp    },
        { href: '/lecturer/students/report',      label: 'Report Student',    icon: Flag,         sectionLabel: 'Actions'    },
        { href: '/lecturer/students/upload',      label: 'Upload Students',   icon: Upload        },
      ],
    },
    {
      href:  '/lecturer/questions',
      label: 'Question Bank',
      icon:  HelpCircle,
      children: [
        { href: '/lecturer/questions',          label: 'All Questions',   icon: ListOrdered,  sectionLabel: 'Overview' },
        { href: '/lecturer/questions/create',   label: 'Create Question', icon: PlusCircle,   sectionLabel: 'Actions' },
        { href: '/lecturer/questions/import',   label: 'Import',          icon: Download      },
        { href: '/lecturer/questions/tags',     label: 'Tags',            icon: Tag,          sectionLabel: 'Organize' },
        { href: '/lecturer/questions/favorites', label: 'Favorites',      icon: Star          },
      ],
    },
    {
      href:  '/lecturer/notifications',
      label: 'Notifications',
      icon:  Bell,
    },
    {
      href:  '/lecturer/profile',
      label: 'Profile',
      icon:  User,
      children: [
        { href: '/lecturer/profile',           label: 'My Profile',     icon: User,         sectionLabel: 'Personal' },
        { href: '/lecturer/profile/settings',  label: 'Settings',       icon: Settings,     sectionLabel: 'Preferences' },
        { href: '/lecturer/profile/security',  label: 'Security',       icon: ShieldAlert   },
        { href: '/lecturer/profile/notifications', label: 'Notification Preferences', icon: Bell },
      ],
    },
  ];

  // ── Active Helpers ────────────────────────────────────────────────────────
  function isActive(href: string) {
    const [path] = href.split('?');
    if (path === '/lecturer') return currentPath === '/lecturer';
    return currentPath === path;
  }

  function isGroupActive(item: NavItem) {
    if (!item.children) return isActive(item.href);
    return item.children.some(c => isActive(c.href)) ||
      currentPath.startsWith(item.href + '/');
  }

  function isGroupOpen(item: NavItem) {
    return openGroup === item.label;
  }

  function toggleGroup(item: NavItem) {
    if (!item.children) return;
    userOpenGroup = openGroup === item.label ? null : item.label;
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

  // ── Sign Out ──────────────────────────────────────────────────────────────
  async function confirmSignout() {
    if (isSigningOut) return;
    isSigningOut = true;
    try {
      await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
    } catch { /* fallback */ }
    const f = document.createElement('form');
    f.method = 'POST'; f.action = '/logout';
    document.body.appendChild(f); f.submit();
  }

  function cancelSignout() {
    if (!isSigningOut) showSignout = false;
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  async function markAllRead() {
    if (markingAll || !unreadCount) return;
    markingAll = true;
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) notifications = notifications.map(n => ({ ...n, isRead: true }));
    } finally { markingAll = false; }
  }

  async function markOneRead(id: string) {
    const notif = notifications.find(n => n.id === id);
    if (!notif || notif.isRead) return;
    notifications = notifications.map(n => (n.id === id ? { ...n, isRead: true } : n));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {
      notifications = notifications.map(n => (n.id === id ? { ...n, isRead: false } : n));
    }
  }

  let notifRef = $state<HTMLDivElement | null>(null);
  function handleDocClick(e: MouseEvent) {
    if (showNotifs && notifRef && !notifRef.contains(e.target as Node)) showNotifs = false;
  }
  $effect(() => {
    if (showNotifs) {
      document.addEventListener('click', handleDocClick, true);
      return () => document.removeEventListener('click', handleDocClick, true);
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
      violations: 'Violations', report: 'Report Student', 'question-bank': 'Question Bank',
      drafts: 'Drafts', archived: 'Archived', scheduled: 'Scheduled',
      active: 'Active Now', completed: 'Completed', settings: 'Settings',
      security: 'Security', 'notification-preferences': 'Notification Preferences',
      print: 'Print Results', 'upload-students': 'Upload Students',
      performance: 'Performance', tags: 'Tags', favorites: 'Favorites',
      import: 'Import', ca: 'CA Management', 'question-builder': 'Question Builder'
    };
    const crumbs = [{ label: 'Home', href: '/lecturer' }];
    let built = '/lecturer';
    for (const p of parts) {
      built += '/' + p;
      const label = /^[0-9a-f-]{36}$/i.test(p) ? 'Exam' : (map[p] ?? p[0].toUpperCase() + p.slice(1).replace(/-/g, ' '));
      crumbs.push({ label, href: built });
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

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (showSignout) { showSignout = false; return; }
      if (showNotifs)  { showNotifs  = false; return; }
      if (mobileOpen)  { mobileOpen  = false; return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      collapsed = !collapsed;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:head><title>Lecturer — MOUAU eTest</title></svelte:head>

<!-- Mobile overlay -->
{#if mobileOpen}
  <div class="mob-overlay" onclick={() => (mobileOpen = false)} aria-hidden="true"></div>
{/if}

<!-- Sign-out modal -->
{#if showSignout}
  <div class="modal-bg" onclick={cancelSignout} role="dialog" aria-modal="true" aria-labelledby="signout-title">
    <div class="modal" onclick={e => e.stopPropagation()}>
      <div class="modal-ico" class:spinning={isSigningOut}>
        {#if isSigningOut}<LoaderCircle size={22} class="spin" />{:else}<LogOut size={22} />{/if}
      </div>
      <h3 id="signout-title">Sign out?</h3>
      <p>You will need to sign in again to access your dashboard.</p>
      <div class="modal-row">
        <button class="btn-ghost" onclick={cancelSignout} disabled={isSigningOut} type="button">Cancel</button>
        <button class="btn-danger" onclick={confirmSignout} disabled={isSigningOut} type="button">
          {#if isSigningOut}<LoaderCircle size={14} class="spin" /><span>Signing out...</span>
          {:else}<LogOut size={14} /><span>Sign out</span>{/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Shell -->
<div class="shell" class:collapsed class:signing-out={isSigningOut}>

  <!-- ═══ SIDEBAR ═══ -->
  <aside class="sidebar" class:collapsed class:mob-open={mobileOpen}>

    <!-- Brand -->
    <div class="sidebar-top">
      <a href="/lecturer" class="brand" aria-label="Lecturer home" onclick={e => navigate('/lecturer', e)}>
        <div class="brand-icon"><BookOpen size={17} strokeWidth={2} /></div>
        {#if !collapsed}
          <div class="brand-copy">
            <span class="brand-name">MOUAU <em>eTest</em></span>
            <span class="brand-role">Lecturer Portal</span>
          </div>
        {/if}
      </a>
      <button class="tog-btn desktop-only" type="button"
        onclick={() => (collapsed = !collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand (Ctrl+B)' : 'Collapse (Ctrl+B)'}
      >
        {#if collapsed}<PanelLeftOpen size={15} />{:else}<PanelLeftClose size={15} />{/if}
      </button>
      <button class="tog-btn mobile-only" type="button" onclick={() => (mobileOpen = false)} aria-label="Close menu">
        <X size={15} />
      </button>
    </div>

    <!-- Stats strip -->
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
      {#each nav as item (item.label)}

        {#if !item.children}
          <!-- ── Flat link ─────────────────────────────────────────────── -->
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
              {#if loading}<div class="spinner"></div>
              {:else}<item.icon size={16} strokeWidth={2} />{/if}
            </div>
            {#if !collapsed}
              <span class="nav-label">{item.label}</span>
              {#if item.label === 'Notifications' && unreadCount > 0}
                <span class="badge-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
              {:else if item.badge?.()}
                <span class="badge-count badge-live">{item.badge()}</span>
              {/if}
            {:else if (item.label === 'Notifications' && unreadCount > 0) || item.badge?.()}
              <span class="collapsed-dot"></span>
            {/if}
          </a>

        {:else if collapsed}
          <!-- ── Collapsed group: icon-only link ───────────────────────── -->
          {@const gactive = isGroupActive(item)}
          <a
            href={item.href}
            class="nav-lnk"
            class:active={gactive}
            onclick={e => navigate(item.href, e)}
            title={item.label}
          >
            <div class="nav-icon" class:active={gactive}>
              <item.icon size={16} strokeWidth={2} />
            </div>
            {#if item.badge?.()}
              <span class="collapsed-dot"></span>
            {/if}
          </a>

        {:else}
          <!-- ── Expanded group: accordion ─────────────────────────────── -->
          {@const gopen   = isGroupOpen(item)}
          {@const gactive = isGroupActive(item)}
          <div class="nav-group">
            <button
              class="nav-lnk group-trigger"
              class:active={gactive}
              onclick={() => toggleGroup(item)}
              type="button"
              aria-expanded={gopen}
            >
              <div class="nav-icon" class:active={gactive}>
                <item.icon size={16} strokeWidth={2} />
              </div>
              <span class="nav-label">{item.label}</span>
              {#if item.badge?.()}
                <span class="badge-count badge-live">{item.badge()}</span>
              {/if}
              <span class="chevron" class:open={gopen}>
                <ChevronDown size={13} strokeWidth={2.5} />
              </span>
            </button>

            {#if gopen}
              <div class="nav-children" transition:slide={{ duration: 200, easing: cubicOut }}>
                {#each item.children as child (child.href)}
                  {#if child.sectionLabel}
                    <div class="nav-section-label">{child.sectionLabel}</div>
                  {/if}

                  {@const cactive  = isActive(child.href)}
                  {@const cloading = navLoading === child.href}
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
                    {#if cactive}<span class="child-pip"></span>{/if}
                    {#if child.badge?.()}
                      <span class="child-badge">{child.badge()}</span>
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
      <button class="foot-btn" type="button" onclick={toggleTheme}
        title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
      >
        <div class="foot-icon">
          {#if theme === 'dark'}<Sun size={14} />{:else}<Moon size={14} />{/if}
        </div>
        {#if !collapsed}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>{/if}
      </button>

      <a href="/lecturer/profile" class="profile-row"
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

      <button class="foot-btn signout" type="button" onclick={() => (showSignout = true)}
        title={collapsed ? 'Sign out' : undefined}
      >
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
            {#each breadcrumbs as crumb, i (crumb.href)}
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
          <div class="load-pill"><LoaderCircle size={13} class="spin" /><span>Loading...</span></div>
        {/if}

        <!-- Notifications -->
        <div class="notif-anchor" bind:this={notifRef}>
          <button class="icon-btn" class:notif-lit={unreadCount > 0} type="button"
            onclick={() => (showNotifs = !showNotifs)}
            aria-label="Notifications" aria-haspopup="true" aria-expanded={showNotifs}
          >
            <Bell size={16} />
            {#if unreadCount > 0}
              <span class="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            {/if}
          </button>

          {#if showNotifs}
            <div class="notif-drop" onclick={e => e.stopPropagation()} transition:slide={{ duration: 150, easing: cubicOut }}>
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
                  <a href="/lecturer/notifications" onclick={e => { showNotifs = false; navigate('/lecturer/notifications', e); }}>
                    All notifications
                  </a>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button class="icon-btn" type="button" onclick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>

        <div class="role-pill"><BookOpen size={12} /><span>Lecturer</span></div>
      </div>
    </header>

    <main class="content">
      <div class="content-inner">
        {@render children()}
      </div>
    </main>
  </div>
</div>

<style>
  /* ── Design tokens ───────────────────────────────────────────────────────── */
  :global(:root) {
    --lc-50:  #eef2ff;
    --lc-100: #e0e7ff;
    --lc-200: #c7d2fe;
    --lc-300: #a5b4fc;
    --lc-400: #818cf8;
    --lc-500: #6366f1;
    --lc-600: #4f46e5;
    --lc-700: #4338ca;
    --lc-800: #3730a3;
    --lc-900: #312e81;
    --lc-soft: rgba(79, 70, 229, 0.08);
  }

  /* ── Shell ───────────────────────────────────────────────────────────────── */
  .shell { display: flex; height: 100dvh; overflow: hidden; background: var(--color-bg); }
  .shell.signing-out { pointer-events: none; opacity: 0.85; transition: opacity 0.3s ease; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

  /* ── Sidebar ─────────────────────────────────────────────────────────────── */
  .sidebar {
    width: 240px; flex-shrink: 0;
    display: flex; flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    transition: width 0.25s cubic-bezier(.4,0,.2,1);
    overflow: hidden; position: relative; z-index: 40;
  }
  .sidebar.collapsed { width: 60px; }

  /* ── Brand ───────────────────────────────────────────────────────────────── */
  .sidebar-top {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.875rem 0.75rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .brand { display: flex; align-items: center; gap: 0.55rem; text-decoration: none; flex: 1; min-width: 0; }
  .brand-icon {
    width: 32px; height: 32px; border-radius: 0.5rem; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc-700), var(--lc-600));
    display: flex; align-items: center; justify-content: center; color: #fff;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
  }
  .brand-copy { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .brand-name { font-size: 0.85rem; font-weight: 800; color: var(--color-text); white-space: nowrap; letter-spacing: -0.02em; }
  .brand-name em { font-style: normal; color: var(--lc-600); }
  .brand-role { font-size: 0.62rem; color: var(--color-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

  .tog-btn {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); cursor: pointer; transition: all 0.15s ease;
  }
  .tog-btn:hover { color: var(--color-text); border-color: var(--lc-600); background: var(--lc-soft); }
  .tog-btn:active { transform: scale(0.95); }

  /* ── Stats row ───────────────────────────────────────────────────────────── */
  .stats-row {
    display: flex; align-items: center;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--color-border);
    gap: 0.5rem; flex-shrink: 0;
  }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; flex: 1; }
  .stat-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-muted); }
  .stat-dot.pulse { background: var(--lc-600); animation: ring 2s ease-in-out infinite; }
  @keyframes ring {
    0%, 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0.5); }
    50%       { box-shadow: 0 0 0 5px rgba(79,70,229,0); }
  }
  .stat-n { font-size: 0.875rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .stat-l { font-size: 0.58rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .stat.amber .stat-n { color: var(--lc-600); }
  .stat.pulse-stat .stat-n { color: var(--lc-600); }
  .stat-div { width: 1px; height: 20px; background: var(--color-border); flex-shrink: 0; }

  /* ── Nav ─────────────────────────────────────────────────────────────────── */
  .nav {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 0.5rem;
    display: flex; flex-direction: column; gap: 1px;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }
  .nav::-webkit-scrollbar { width: 4px; }
  .nav::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }

  .nav-lnk {
    display: flex; align-items: center; gap: 0.55rem;
    padding: 0.55rem 0.6rem;
    border-radius: 0.55rem;
    text-decoration: none; font-size: 0.825rem; font-weight: 600;
    color: var(--color-muted);
    border: none; background: none; cursor: pointer;
    font-family: inherit; width: 100%; text-align: left;
    transition: background 0.15s ease, color 0.15s ease;
    position: relative;
  }
  .nav-lnk:hover { background: var(--color-bg); color: var(--color-text); }
  .nav-lnk:active { transform: scale(0.98); }
  .nav-lnk.active { background: var(--lc-soft); color: var(--lc-600); }
  .nav-lnk.loading { opacity: 0.7; pointer-events: none; }

  .nav-icon {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: transparent; color: inherit;
    transition: background 0.15s ease;
  }
  .nav-icon.active { background: rgba(79,70,229,0.12); color: var(--lc-600); }
  .nav-lnk:hover .nav-icon:not(.active) { background: var(--color-border); }

  .nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .chevron {
    flex-shrink: 0; color: var(--color-muted);
    display: flex; align-items: center;
    transition: transform 0.2s cubic-bezier(.4,0,.2,1);
  }
  .chevron.open { transform: rotate(180deg); }

  .badge-count {
    font-size: 0.6rem; font-weight: 800; padding: 0.1rem 0.4rem;
    border-radius: 999px; background: var(--lc-soft); color: var(--lc-600); flex-shrink: 0;
  }
  .badge-live { background: rgba(22,163,74,0.12); color: #16a34a; }
  .collapsed-dot {
    position: absolute; top: 6px; right: 6px;
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--lc-600);
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .nav-group { display: flex; flex-direction: column; }

  .nav-children {
    display: flex; flex-direction: column; gap: 1px;
    margin: 2px 0 4px 14px;
    padding-left: 10px;
    border-left: 1.5px solid var(--color-border);
  }

  .nav-section-label {
    font-size: 0.58rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.09em; color: var(--color-muted);
    padding: 0.55rem 0.5rem 0.2rem;
    opacity: 0.55;
  }
  .nav-children > .nav-section-label:first-child { padding-top: 0.25rem; }

  .nav-child {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.44rem 0.6rem;
    border-radius: 0.45rem;
    text-decoration: none; font-size: 0.795rem; font-weight: 500;
    color: var(--color-muted);
    transition: background 0.12s ease, color 0.12s ease;
    position: relative;
  }
  .nav-child:hover { background: var(--color-bg); color: var(--color-text); }
  .nav-child.active {
    background: var(--lc-soft);
    color: var(--lc-600);
    font-weight: 700;
  }
  .nav-child.loading { opacity: 0.6; pointer-events: none; }

  .child-icon {
    width: 22px; height: 22px; border-radius: 0.35rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: inherit; background: transparent; transition: background 0.12s;
  }
  .child-icon.active { background: rgba(79,70,229,0.1); color: var(--lc-600); }
  .nav-child:hover .child-icon:not(.active) { background: var(--color-border); }

  .child-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .child-pip {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--lc-600); flex-shrink: 0; margin-left: auto;
  }
  .child-badge {
    font-size: 0.55rem; font-weight: 700; padding: 0.05rem 0.35rem;
    border-radius: 999px; background: var(--lc-soft); color: var(--lc-600);
    flex-shrink: 0;
  }

  .spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--color-border); border-top-color: var(--lc-600);
    animation: spin 0.6s linear infinite;
  }
  .spinner.sm { width: 11px; height: 11px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .load-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--color-border); overflow: hidden; }
  .load-progress { height: 100%; background: linear-gradient(90deg, var(--lc-600), var(--lc-400)); animation: loadbar 1.4s ease-in-out infinite; }
  @keyframes loadbar {
    0%   { width: 0%; margin-left: 0; }
    50%  { width: 60%; margin-left: 20%; }
    100% { width: 0%; margin-left: 100%; }
  }

  .sidebar-foot {
    padding: 0.5rem; border-top: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: 1px; flex-shrink: 0;
  }
  .foot-btn {
    display: flex; align-items: center; gap: 0.55rem; padding: 0.5rem;
    border-radius: 0.5rem; border: none; background: none; cursor: pointer;
    color: var(--color-muted); font-size: 0.8rem; font-weight: 600;
    font-family: inherit; width: 100%; text-align: left;
    transition: background 0.12s ease, color 0.12s ease; white-space: nowrap;
  }
  .foot-btn:hover { background: var(--color-bg); color: var(--color-text); }
  .foot-btn.signout:hover { color: #ef4444; background: rgba(239,68,68,0.06); }
  .foot-icon {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg);
  }
  .profile-row {
    display: flex; align-items: center; gap: 0.55rem; padding: 0.5rem;
    border-radius: 0.5rem; text-decoration: none; transition: background 0.12s ease; cursor: pointer;
  }
  .profile-row:hover { background: var(--color-bg); }
  .avatar {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc-700), var(--lc-600));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.62rem; font-weight: 800; color: #fff; letter-spacing: 0.02em;
  }
  .profile-copy { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .profile-name { font-size: 0.8rem; font-weight: 700; color: var(--color-text); white-space: nowrap; }
  .profile-sub  { font-size: 0.62rem; color: var(--color-muted); font-weight: 600; }
  .profile-arr { color: var(--color-muted); flex-shrink: 0; transition: transform 0.15s ease; }
  .profile-row:hover .profile-arr { transform: translateX(2px); color: var(--color-text); }

  .mob-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 39; backdrop-filter: blur(3px); }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 40;
      transform: translateX(-100%);
      transition: transform 0.25s cubic-bezier(.4,0,.2,1);
      width: 260px !important;
    }
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

  /* ── Topbar ──────────────────────────────────────────────────────────────── */
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
    color: var(--color-muted); cursor: pointer; transition: all 0.15s ease;
  }
  .mob-menu:hover { border-color: var(--lc-600); color: var(--color-text); }

  .bc { display: flex; align-items: center; gap: 0.3rem; min-width: 0; }
  .bc-lnk { font-size: 0.78rem; color: var(--color-muted); text-decoration: none; font-weight: 500; white-space: nowrap; transition: color 0.12s ease; }
  .bc-lnk:hover { color: var(--lc-600); }
  .bc-cur { font-size: 0.78rem; color: var(--color-text); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bc-sep { flex-shrink: 0; color: var(--color-muted); }
  .greet { font-size: 0.82rem; color: var(--color-muted); }
  .greet strong { color: var(--color-text); }

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
    transition: all 0.15s ease;
  }
  .icon-btn:hover { color: var(--color-text); border-color: var(--lc-600); background: var(--lc-soft); }
  .icon-btn:active { transform: scale(0.95); }
  .icon-btn.notif-lit { color: var(--lc-600); border-color: var(--lc-600); background: var(--lc-soft); }
  .notif-badge {
    position: absolute; top: -4px; right: -4px;
    font-size: 0.55rem; font-weight: 800; padding: 0.1rem 0.3rem;
    background: var(--lc-600); color: #fff;
    border-radius: 999px; border: 1.5px solid var(--color-surface);
    min-width: 14px; text-align: center;
    animation: pop-in 0.3s ease;
  }
  @keyframes pop-in { 0% { transform: scale(0); } 80% { transform: scale(1.2); } 100% { transform: scale(1); } }

  .role-pill {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 700; padding: 0.3rem 0.625rem;
    border-radius: 999px; background: var(--lc-soft); color: var(--lc-600);
    border: 1px solid color-mix(in srgb, var(--lc-600) 20%, transparent);
  }

  /* ── Notifications panel ─────────────────────────────────────────────────── */
  .notif-anchor { position: relative; }
  .notif-drop {
    position: absolute; top: calc(100% + 8px); right: 0; width: 340px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; box-shadow: 0 12px 40px rgba(0,0,0,0.16);
    z-index: 200; overflow: hidden;
  }
  .notif-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1rem 0.625rem;
    border-bottom: 1px solid var(--color-border);
  }
  .notif-title { font-size: 0.82rem; font-weight: 800; color: var(--color-text); }
  .mark-all {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; color: var(--lc-600);
    background: none; border: none; cursor: pointer; font-family: inherit;
    padding: 0.25rem 0.4rem; border-radius: 0.3rem; transition: background 0.12s ease;
  }
  .mark-all:hover { background: var(--lc-soft); }
  .mark-all:disabled { opacity: 0.5; cursor: not-allowed; }
  .notif-list { max-height: 320px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--color-border) transparent; }
  .notif-item {
    display: flex; align-items: flex-start; gap: 0.625rem;
    padding: 0.75rem 1rem; width: 100%;
    border: none; background: none; cursor: pointer; text-align: left;
    font-family: inherit; border-bottom: 1px solid var(--color-border); transition: background 0.1s ease;
  }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: rgba(79,70,229,0.04); }
  .notif-pip { width: 7px; height: 7px; border-radius: 50%; background: var(--color-border); flex-shrink: 0; margin-top: 4px; }
  .notif-pip.active { background: var(--lc-600); animation: pulse-dot 2s ease-in-out infinite; }
  .notif-body { flex: 1; min-width: 0; }
  .notif-t { font-size: 0.78rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.15rem; }
  .notif-m { font-size: 0.72rem; color: var(--color-muted); margin: 0 0 0.25rem; line-height: 1.4; }
  .notif-time { font-size: 0.65rem; color: var(--color-muted); font-weight: 600; }
  .notif-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: var(--color-muted); font-size: 0.78rem; }
  .notif-foot { padding: 0.625rem 1rem; border-top: 1px solid var(--color-border); }
  .notif-foot a { font-size: 0.75rem; font-weight: 600; color: var(--lc-600); text-decoration: none; transition: opacity 0.12s ease; }
  .notif-foot a:hover { opacity: 0.8; }

  /* ── Content ─────────────────────────────────────────────────────────────── */
  .content { flex: 1; overflow-y: auto; overflow-x: hidden; background: var(--color-bg); scroll-behavior: smooth; }
  .content::-webkit-scrollbar { width: 6px; }
  .content::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 6px; }
  .content-inner { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
  @media (max-width: 768px) { .content-inner { padding: 1rem; } }

  /* ── Sign-out modal ──────────────────────────────────────────────────────── */
  .modal-bg {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 300;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px); animation: fade-in 0.2s ease;
  }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.75rem;
    width: min(380px, calc(100vw - 2rem));
    display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
    text-align: center; box-shadow: 0 24px 80px rgba(0,0,0,0.25);
    animation: modal-in 0.25s cubic-bezier(.4,0,.2,1);
  }
  @keyframes modal-in { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: none; } }
  .modal-ico {
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(239,68,68,0.1); color: #ef4444;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 0.25rem; transition: all 0.3s ease;
  }
  .modal-ico.spinning { background: var(--lc-soft); color: var(--lc-600); }
  .modal h3 { font-size: 1.05rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .modal p  { font-size: 0.82rem; color: var(--color-muted); margin: 0; line-height: 1.5; }
  .modal-row { display: flex; gap: 0.75rem; margin-top: 0.75rem; width: 100%; }
  .btn-ghost {
    flex: 1; padding: 0.625rem; border-radius: 0.625rem;
    border: 1.5px solid var(--color-border); background: var(--color-bg);
    font-size: 0.82rem; font-weight: 700; color: var(--color-text);
    cursor: pointer; font-family: inherit; transition: all 0.15s ease;
  }
  .btn-ghost:hover:not(:disabled) { border-color: var(--color-text); background: var(--color-surface); }
  .btn-ghost:active:not(:disabled) { transform: scale(0.98); }
  .btn-danger {
    flex: 1; padding: 0.625rem; border-radius: 0.625rem;
    border: none; background: #ef4444; color: #fff;
    font-size: 0.82rem; font-weight: 700; cursor: pointer;
    font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    transition: all 0.15s ease;
  }
  .btn-danger:hover:not(:disabled) { background: #dc2626; box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
  .btn-danger:active:not(:disabled) { transform: scale(0.98); }
  .btn-danger:disabled, .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  :global(.spin) { animation: spin 0.7s linear infinite; display: inline-block; }
</style>