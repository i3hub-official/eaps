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
    FileText, Clock, Menu, User, PanelLeftClose, PanelLeftOpen
  } from '@lucide/svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme          = $derived(getTheme());
  let collapsed      = $state(false);
  let mobileOpen     = $state(false);
  let navLoading     = $state<string | null>(null);
  let examsOpen      = $state(false);
  let resultsOpen    = $state(false);
  let studentsOpen   = $state(false);
  let showSignout    = $state(false);
  let isSigningOut   = $state(false);
  let showNotifs     = $state(false);
  let notifications  = $state<any[]>(data.notifications ?? []);
  let markingAll     = $state(false);

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

  // Auto-expand groups when on their routes
  const currentPath = $derived($page.url.pathname);
  $effect(() => {
    if (currentPath.startsWith('/lecturer/exams'))   examsOpen   = true;
    if (currentPath.startsWith('/lecturer/results')) resultsOpen = true;
    if (currentPath.startsWith('/lecturer/students')) studentsOpen = true;
  });

  type NavItem = { href: string; label: string; icon: any; children?: NavItem[] };

  const nav: NavItem[] = [
    { href: '/lecturer',              
    label: 'Dashboard',     
    icon: LayoutDashboard
  },
   {
      href: '/lecturer/students',
      label: 'Students',
      icon: User,
      children: [
        { href: '/lecturer/students',  label: 'Overview',   icon: ClipboardList },
        { href: '/lecturer/students/report', label: 'Report', icon: PlusCircle    },
      ]
    },
    {
      href: '/lecturer/exams',
      label: 'Exams',
      icon: ClipboardList,
      children: [
        { href: '/lecturer/exams',        label: 'All Exams',   icon: ClipboardList },
        { href: '/lecturer/exams/create', label: 'Create Exam', icon: PlusCircle    },
      ]
    },
    {
      href: '/lecturer/results',
      label: 'Results',
      icon: BarChart2,
      children: [
        { href: '/lecturer/results', label: 'All Results', icon: BarChart2 }
      ]
    },
    { href: '/lecturer/notifications', label: 'Notifications', icon: Bell },
    { href: '/lecturer/profile',       label: 'Profile',       icon: User },
  ];

  function isActive(href: string) {
    if (href === '/lecturer') return currentPath === '/lecturer';
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  function isGroupActive(g: NavItem) {
    if (!g.children) return isActive(g.href);
    return g.children.some(c => isActive(c.href));
  }

  function isGroupOpen(g: NavItem) {
    if (g.label === 'Exams')   return examsOpen;
    if (g.label === 'Results') return resultsOpen;
    if (g.label === 'Students') return studentsOpen
    return false;
  }

  function toggleGroup(g: NavItem) {
    if (g.label === 'Exams')   examsOpen   = !examsOpen;
    if (g.label === 'Results') resultsOpen = !resultsOpen;
    if (g.label === 'Students') studentsOpen = !studentsOpen;
  }

  async function navigate(href: string, e: MouseEvent) {
    e.preventDefault();
    if (navLoading) return;
    navLoading = href;
    mobileOpen = false;
    try { await goto(href); }
    finally { setTimeout(() => navLoading = null, 300); }
  }

  async function confirmSignout() {
    isSigningOut = true;
    const f = document.createElement('form');
    f.method = 'POST'; f.action = '/logout';
    document.body.appendChild(f); f.submit();
  }

  async function markAllRead() {
    if (markingAll || !unreadCount) return;
    markingAll = true;
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      notifications = notifications.map(n => ({ ...n, isRead: true }));
    } finally { markingAll = false; }
  }

  async function markOneRead(id: string) {
    notifications = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
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

  const breadcrumbs = $derived((() => {
    const parts = currentPath.replace(/^\/lecturer/, '').split('/').filter(Boolean);
    if (!parts.length) return [];
    const map: Record<string, string> = {
      exams: 'Exams', create: 'Create', results: 'Results',
      questions: 'Questions', profile: 'Profile', notifications: 'Notifications'
    };
    const crumbs = [{ label: 'Home', href: '/lecturer' }];
    let built = '/lecturer';
    for (const p of parts) {
      built += '/' + p;
      crumbs.push({
        label: /^[0-9a-f-]{36}$/i.test(p) ? 'Exam' : (map[p] ?? p[0].toUpperCase() + p.slice(1)),
        href: built
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
      .reduce((a, w, i, arr) => (i === 0 || i === arr.length - 1) ? a + w[0] : a, '')
      .toUpperCase().slice(0, 2)
  );

  const firstName = $derived(data.user?.fullName?.split(' ')[0] ?? 'Lecturer');
</script>

<svelte:head><title>Lecturer — MOUAU eTest</title></svelte:head>

{#if mobileOpen}
  <div class="mob-overlay" onclick={() => mobileOpen = false} aria-hidden="true"></div>
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
        onclick={() => collapsed = !collapsed}
        aria-label={collapsed ? 'Expand' : 'Collapse'}
      >
        {#if collapsed}<PanelLeftOpen size={15} />{:else}<PanelLeftClose size={15} />{/if}
      </button>
      <button class="tog-btn mobile-only" type="button" onclick={() => mobileOpen = false} aria-label="Close">
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
          {@const active = isActive(item.href)}
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
          <!-- Collapsed: just top-level link, no children -->
          {@const active = isGroupActive(item)}
          <a
            href={item.href}
            class="nav-lnk"
            class:active
            onclick={e => navigate(item.href, e)}
            title={item.label}
          >
            <div class="nav-icon" class:active><item.icon size={16} strokeWidth={2} /></div>
          </a>
        {:else}
          <!-- Expanded: collapsible group -->
          {@const gopen  = isGroupOpen(item)}
          {@const active = isGroupActive(item)}
          <div class="nav-group" class:open={gopen}>
            <button
              class="nav-lnk group-trigger"
              class:active
              onclick={() => toggleGroup(item)}
              type="button"
            >
              <div class="nav-icon" class:active><item.icon size={16} strokeWidth={2} /></div>
              <span class="nav-label">{item.label}</span>
              {#if item.label === 'Exams' && pendingGrades > 0}
                <span class="badge-amber">{pendingGrades}</span>
              {/if}
              <ChevronDown size={13} class="chevron" />
            </button>
            {#if gopen}
              <div class="nav-children">
                {#each item.children as child}
                  {@const cactive = isActive(child.href)}
                  {@const cloading = navLoading === child.href}
                  <a
                    href={child.href}
                    class="nav-child"
                    class:active={cactive}
                    class:loading={cloading}
                    onclick={e => navigate(child.href, e)}
                  >
                    <child.icon size={13} strokeWidth={2} />
                    <span>{child.label}</span>
                    {#if cloading}
                      <div class="spinner sm" style="margin-left:auto"></div>
                    {:else if cactive}
                      <div class="child-dot"></div>
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

      <button class="foot-btn signout" type="button" onclick={() => showSignout = true} title={collapsed ? 'Sign out' : undefined}>
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
        <button class="mob-menu mobile-only" type="button" onclick={() => mobileOpen = true} aria-label="Open menu">
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
            onclick={() => showNotifs = !showNotifs}
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
  /* ── Tokens — Indigo for lecturers ───────────────────────────── */
  :root {
    --lc50:  #eef2ff;
    --lc100: #e0e7ff;
    --lc400: #818cf8;
    --lc500: #6366f1;
    --lc600: #4f46e5;
    --lc700: #4338ca;
    --lc-soft:  rgba(79,70,229,0.08);
    --lc-soft2: rgba(79,70,229,0.15);
    --sw: 248px;
    --sc: 64px;
    --th: 56px;
    --r:  10px;
    --ease: 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Shell ──────────────────────────────────────────────────────── */
  .shell {
    display: grid;
    grid-template-columns: var(--sw) 1fr;
    min-height: 100vh;
    background: var(--color-bg);
    transition: grid-template-columns var(--ease);
  }
  .shell.collapsed { grid-template-columns: var(--sc) 1fr; }

  /* ── Sidebar ────────────────────────────────────────────────────── */
  .sidebar {
    display: flex; flex-direction: column;
    height: 100vh; position: sticky; top: 0;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    overflow: hidden; z-index: 50;
    transition: width var(--ease);
    width: var(--sw);
  }
  .sidebar.collapsed { width: var(--sc); }

  /* Brand */
  .sidebar-top {
    display: flex; align-items: center; justify-content: space-between;
    height: var(--th); padding: 0 0.875rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0; gap: 0.5rem;
  }
  .brand {
    display: flex; align-items: center; gap: 0.625rem;
    text-decoration: none; flex: 1; min-width: 0; overflow: hidden;
  }
  .brand-icon {
    width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc700), var(--lc500));
    display: flex; align-items: center; justify-content: center; color: #fff;
    box-shadow: 0 2px 8px rgba(79,70,229,0.3);
  }
  .brand-copy { display: flex; flex-direction: column; line-height: 1.25; overflow: hidden; }
  .brand-name { font-size: 0.875rem; font-weight: 800; color: var(--color-text); letter-spacing: -0.02em; white-space: nowrap; }
  .brand-name em { font-style: normal; color: var(--lc600); }
  .brand-role { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-muted); white-space: nowrap; margin-top: 1px; }

  .tog-btn {
    width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .tog-btn:hover { border-color: var(--lc600); color: var(--lc600); }

  /* Stats */
  .stats-row {
    display: flex; align-items: center;
    margin: 0.625rem 0.75rem; padding: 0.5rem 0.625rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: var(--r); gap: 0; flex-shrink: 0;
  }
  .stat {
    flex: 1; display: flex; align-items: center; justify-content: center;
    gap: 0.3rem; flex-direction: column; padding: 0.1rem;
    color: var(--color-muted);
  }
  .stat svg { color: var(--lc600); }
  .stat-n { font-size: 0.8rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .stat-l { font-size: 0.52rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); }
  .stat.amber .stat-n { color: #f59e0b; }
  .stat-div { width: 1px; height: 22px; background: var(--color-border); }
  .stat-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-border); flex-shrink: 0; }
  .stat-dot.pulse { background: var(--lc500); animation: dot-pulse 2s ease-in-out infinite; }

  /* Nav */
  .nav {
    flex: 1; padding: 0.5rem 0.625rem;
    display: flex; flex-direction: column; gap: 0.125rem;
    overflow-y: auto; overflow-x: hidden;
  }
  .nav::-webkit-scrollbar { width: 3px; }
  .nav::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .nav-lnk {
    position: relative;
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.5rem 0.625rem; border-radius: var(--r);
    text-decoration: none; color: var(--color-muted);
    font-size: 0.83rem; font-weight: 500; white-space: nowrap;
    transition: color 0.15s, background 0.15s;
    border: none; background: none; cursor: pointer; width: 100%;
    text-align: left; font-family: inherit;
  }
  .nav-lnk:hover { color: var(--color-text); background: var(--color-bg); }
  .nav-lnk.active { color: var(--lc700); font-weight: 700; background: var(--lc-soft); }
  :global(.dark) .nav-lnk.active { color: var(--lc400); }
  .nav-lnk.loading { opacity: 0.6; pointer-events: none; }

  .nav-icon {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .nav-icon.active { background: var(--lc600); color: #fff; }
  :global(.dark) .nav-icon.active { background: var(--lc500); }

  .nav-label { flex: 1; }

  .badge-count {
    font-size: 0.58rem; font-weight: 800; padding: 0.1rem 0.4rem;
    border-radius: 20px; background: #dc2626; color: #fff;
  }
  .badge-amber {
    font-size: 0.58rem; font-weight: 800; padding: 0.1rem 0.4rem;
    border-radius: 20px; background: #f59e0b; color: #fff;
  }
  .collapsed-dot {
    position: absolute; top: 6px; right: 6px;
    width: 6px; height: 6px; border-radius: 50%; background: #dc2626;
    border: 2px solid var(--color-surface);
  }

  /* Groups */
  .nav-group { display: flex; flex-direction: column; }
  .group-trigger { justify-content: flex-start; }
  :global(.nav-group .chevron) { transition: transform 0.2s ease; opacity: 0.5; flex-shrink: 0; }
  :global(.nav-group.open .chevron) { transform: rotate(180deg); }

  .nav-children {
    display: flex; flex-direction: column; gap: 0.1rem;
    padding: 0.25rem 0 0.25rem 0.75rem;
    margin-left: calc(0.625rem + 15px);
    border-left: 2px solid rgba(79,70,229,0.25);
    animation: slide-down 0.18s ease;
  }
  .nav-child {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.475rem 0.625rem; border-radius: 8px;
    text-decoration: none; font-size: 0.79rem; font-weight: 500;
    color: var(--color-muted); transition: color 0.15s, background 0.15s;
  }
  .nav-child:hover { color: var(--color-text); background: var(--color-bg); }
  .nav-child.active { color: var(--lc700); font-weight: 600; background: var(--lc-soft); }
  :global(.dark) .nav-child.active { color: var(--lc400); }
  .nav-child.loading { opacity: 0.6; pointer-events: none; }
  .child-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--lc600); margin-left: auto; }

  .spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--color-border); border-top-color: var(--lc600);
    animation: spin 0.65s linear infinite;
  }
  .spinner.sm { width: 11px; height: 11px; }

  .load-bar { height: 2px; background: var(--color-border); overflow: hidden; flex-shrink: 0; }
  .load-progress { height: 100%; width: 40%; background: var(--lc600); animation: load-slide 1s ease-in-out infinite; }

  /* Footer */
  .sidebar-foot {
    padding: 0.5rem 0.625rem 0.875rem;
    border-top: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: 0.125rem; flex-shrink: 0;
  }
  .foot-btn {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.5rem 0.625rem; border-radius: var(--r); width: 100%;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); font-size: 0.83rem; font-weight: 500;
    font-family: inherit; white-space: nowrap;
    transition: color 0.15s, background 0.15s;
  }
  .foot-btn:hover { color: var(--color-text); background: var(--color-bg); }
  .foot-btn.signout:hover { color: #dc2626; background: rgba(220,38,38,0.06); }

  .foot-icon {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .foot-btn.signout:hover .foot-icon { border-color: rgba(220,38,38,0.3); color: #dc2626; }

  .profile-row {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.5rem 0.625rem; border-radius: var(--r);
    border: 1px solid var(--color-border); background: var(--color-bg);
    text-decoration: none; transition: all 0.15s; flex-shrink: 0;
  }
  .profile-row:hover { border-color: var(--lc600); background: var(--lc-soft); }

  .avatar {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc700), var(--lc500));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.6rem; font-weight: 800; color: #fff;
  }
  .profile-copy { display: flex; flex-direction: column; flex: 1; min-width: 0; line-height: 1.25; }
  .profile-name { font-size: 0.8rem; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .profile-sub  { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--lc600); }
  :global(.profile-arr) { color: var(--color-muted); transition: transform 0.15s; }
  .profile-row:hover :global(.profile-arr) { transform: translateX(2px); color: var(--lc600); }

  /* ── Main ───────────────────────────────────────────────────────── */
  .main { display: flex; flex-direction: column; min-height: 100vh; min-width: 0; }

  .topbar {
    position: sticky; top: 0; z-index: 30;
    height: var(--th); padding: 0 1.25rem;
    background: var(--color-surface); border-bottom: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    flex-shrink: 0;
  }
  .topbar-l { display: flex; align-items: center; gap: 0.625rem; flex: 1; min-width: 0; }
  .topbar-r { display: flex; align-items: center; gap: 0.375rem; flex-shrink: 0; }

  .mob-menu {
    width: 34px; height: 34px; border-radius: 8px;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
  }

  .bc { display: flex; align-items: center; gap: 0.2rem; font-size: 0.78rem; min-width: 0; }
  .bc-lnk { color: var(--color-muted); text-decoration: none; white-space: nowrap; transition: color 0.15s; }
  .bc-lnk:hover { color: var(--lc600); }
  .bc-cur { color: var(--color-text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :global(.bc-sep) { color: var(--color-border); }

  .greet { font-size: 0.82rem; color: var(--color-muted); }
  .greet strong { color: var(--color-text); font-weight: 700; }

  .load-pill {
    display: flex; align-items: center; gap: 0.35rem;
    padding: 0.25rem 0.625rem; background: var(--lc-soft);
    border-radius: 20px; font-size: 0.7rem; font-weight: 600; color: var(--lc600);
  }

  .icon-btn {
    position: relative; width: 34px; height: 34px; border-radius: 8px;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .icon-btn:hover { border-color: var(--lc600); color: var(--lc600); }
  .icon-btn.notif-lit { border-color: rgba(79,70,229,0.4); color: var(--lc600); }

  .notif-badge {
    position: absolute; top: -5px; right: -5px;
    background: #dc2626; color: #fff;
    font-size: 0.5rem; font-weight: 800; min-width: 15px; height: 15px;
    border-radius: 20px; display: flex; align-items: center; justify-content: center;
    padding: 0 2px; border: 2px solid var(--color-surface);
  }

  .role-pill {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.3rem 0.7rem; background: var(--lc-soft);
    border-radius: 20px; font-size: 0.72rem; font-weight: 700; color: var(--lc600);
  }
  @media (max-width: 640px) { .role-pill { display: none; } }

  /* Notifications */
  .notif-anchor { position: relative; }
  .notif-drop {
    position: absolute; top: calc(100% + 8px); right: 0; width: 320px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.12); z-index: 200;
    overflow: hidden; animation: dd-in 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .notif-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border);
  }
  .notif-title { font-size: 0.82rem; font-weight: 700; color: var(--color-text); }
  .mark-all {
    display: flex; align-items: center; gap: 0.3rem;
    background: none; border: none; color: var(--lc600);
    font-size: 0.7rem; font-weight: 600; cursor: pointer;
    padding: 0.2rem 0.4rem; border-radius: 6px; font-family: inherit;
  }
  .mark-all:hover { background: var(--lc-soft); }
  .mark-all:disabled { opacity: 0.5; pointer-events: none; }
  .notif-list { max-height: 300px; overflow-y: auto; }
  .notif-list::-webkit-scrollbar { width: 3px; }
  .notif-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
  .notif-empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 2rem 1rem; color: var(--color-muted); font-size: 0.78rem;
  }
  .notif-item {
    width: 100%; display: flex; gap: 0.625rem; padding: 0.75rem 1rem;
    border: none; background: transparent; cursor: pointer;
    text-align: left; font-family: inherit;
    border-bottom: 1px solid var(--color-border); transition: background 0.12s;
  }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: rgba(79,70,229,0.04); }
  .notif-pip { width: 6px; height: 6px; border-radius: 50%; background: transparent; margin-top: 5px; flex-shrink: 0; }
  .notif-pip.active { background: var(--lc600); }
  .notif-body { flex: 1; min-width: 0; }
  .notif-t { font-size: 0.76rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .notif-m { font-size: 0.7rem; color: var(--color-muted); margin: 0 0 0.25rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .notif-time { font-size: 0.63rem; color: var(--color-muted); opacity: 0.65; }
  .notif-foot { padding: 0.5rem 1rem; border-top: 1px solid var(--color-border); text-align: center; }
  .notif-foot a { font-size: 0.72rem; font-weight: 600; color: var(--lc600); text-decoration: none; }
  .notif-foot a:hover { text-decoration: underline; }

  .content { flex: 1; padding: 1.75rem 1.5rem; }
  @media (min-width: 1280px) { .content { padding: 2rem 2.5rem; } }

  /* ── Sign-out modal ─────────────────────────────────────────────── */
  .modal-bg {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 1rem;
    animation: fade 0.18s ease;
  }
  .modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 16px; width: 100%; max-width: 340px;
    padding: 2rem 1.75rem 1.75rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    text-align: center; animation: modal-up 0.22s cubic-bezier(0.16,1,0.3,1);
  }
  .modal-ico {
    width: 52px; height: 52px; border-radius: 50%; margin-bottom: 0.25rem;
    background: rgba(220,38,38,0.08); border: 2px solid rgba(220,38,38,0.2);
    display: flex; align-items: center; justify-content: center; color: #dc2626;
  }
  .modal h3 { font-size: 1.05rem; font-weight: 800; color: var(--color-text); }
  .modal p  { font-size: 0.8rem; color: var(--color-muted); line-height: 1.5; margin-bottom: 0.5rem; }
  .modal-row { display: flex; gap: 0.5rem; width: 100%; }
  .btn-ghost {
    flex: 1; padding: 0.6rem;
    border: 1.5px solid var(--color-border); border-radius: 8px;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.83rem; font-weight: 700; cursor: pointer; font-family: inherit;
  }
  .btn-ghost:hover { border-color: var(--color-text); }
  .btn-ghost:disabled { opacity: 0.5; }
  .btn-danger {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.6rem; background: #dc2626; border: none; border-radius: 8px;
    color: #fff; font-size: 0.83rem; font-weight: 700; cursor: pointer; font-family: inherit;
  }
  .btn-danger:hover { background: #b91c1c; }
  .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Mobile ─────────────────────────────────────────────────────── */
  .mob-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); z-index: 49;
  }

  .desktop-only { display: flex; }
  .mobile-only  { display: none; }

  @media (max-width: 1023px) {
    .desktop-only { display: none !important; }
    .mobile-only  { display: flex !important; }
    .shell, .shell.collapsed { grid-template-columns: 1fr; }
    .sidebar {
      position: fixed; left: 0; top: 0; height: 100%;
      transform: translateX(-100%);
      transition: transform var(--ease);
      box-shadow: 4px 0 24px rgba(0,0,0,0.1);
      width: var(--sw) !important;
    }
    .sidebar.mob-open { transform: translateX(0); }
    .mob-overlay { display: block; animation: fade 0.18s ease; }
  }

  @keyframes spin       { to { transform: rotate(360deg); } }
  @keyframes fade       { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slide-down { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
  @keyframes dd-in      { from { opacity: 0; transform: translateY(-5px) scale(0.97); } to { opacity: 1; transform: none; } }
  @keyframes modal-up   { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }
  @keyframes load-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
  @keyframes dot-pulse  { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,.4); } 50% { box-shadow: 0 0 0 4px rgba(99,102,241,0); } }
  :global(.spin) { animation: spin 0.7s linear infinite; }
</style>