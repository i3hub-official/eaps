<!-- src/routes/lecturer/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, BookOpen, ClipboardList, X,
    Sun, Moon, LogOut, ChevronRight, LoaderCircle,
    PlusCircle, BarChart2, ChevronDown,
    Bell, CheckCheck, FileText, Clock, Menu, User,
    Users, Search, AlertTriangle, Settings
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme             = $derived(getTheme());
  let collapsed         = $state(false);
  let sidebarOpen       = $state(false);
  let navLoading        = $state<string | null>(null);
  let examsExpanded     = $state(false);
  let resultsExpanded   = $state(false);
  let showSignoutModal  = $state(false);
  let isSigningOut      = $state(false);
  let showNotifications = $state(false);
  let notifications     = $state<any[]>(data.notifications ?? []);
  let markingAllRead    = $state(false);

  const unreadCount   = $derived(notifications.filter((n: any) => !n.isRead).length);
  const activeExams   = $derived(data.stats?.activeExams   ?? 0);
  const pendingGrades = $derived(data.stats?.pendingGrades ?? 0);
  const totalExams    = $derived(data.stats?.totalExams    ?? 0);

  const navGroups = [
    { href: '/lecturer', label: 'Dashboard', icon: LayoutDashboard, children: null },
    {
      href: '/lecturer/exams',
      label: 'Exams',
      icon: ClipboardList,
      children: [
        { href: '/lecturer/exams',        label: 'All Exams',     icon: ClipboardList },
        { href: '/lecturer/exams/create', label: 'Create Exam',   icon: PlusCircle },
      ],
    },
    {
      href: '/lecturer/results',
      label: 'Results',
      icon: BarChart2,
      children: [
        { href: '/lecturer/results', label: 'All Results', icon: BarChart2 },
      ],
    },
    { href: '/lecturer/notifications', label: 'Notifications', icon: Bell, children: null, badge: unreadCount },
    { href: '/lecturer/profile',       label: 'Profile',       icon: User, children: null },
  ];

  const currentPath   = $derived($page.url.pathname);
  const currentSearch = $derived($page.url.search);

  const breadcrumbs = $derived((() => {
    const parts = currentPath.replace(/^\/lecturer/, '').split('/').filter(Boolean);
    if (!parts.length) return [];
    const crumbs: { label: string; href: string }[] = [{ label: 'Home', href: '/lecturer' }];
    const labelMap: Record<string, string> = {
      exams: 'Exams', 
      create: 'Create Exam',
      results: 'Results', 
      questions: 'Questions', 
      similarity: 'Similarity',
      students: 'Students',
      profile: 'Profile',
      notifications: 'Notifications'
    };
    let built = '/lecturer';
    for (const part of parts) {
      built += '/' + part;
      let label = part;
      if (/^[0-9a-f-]{36}$/i.test(part)) {
        label = 'Exam Details';
      } else if (labelMap[part]) {
        label = labelMap[part];
      } else {
        label = part.charAt(0).toUpperCase() + part.slice(1);
      }
      crumbs.push({ label, href: built });
    }
    return crumbs;
  })());

  function isActive(href: string) {
    if (href === '/lecturer') return currentPath === '/lecturer';
    if (href.includes('?')) return currentPath === href.split('?')[0] && currentSearch === '?' + href.split('?')[1];
    return currentPath === href || currentPath.startsWith(href + '/');
  }
  
  function isGroupActive(group: any) {
    if (!group.children) return isActive(group.href);
    return group.children.some((c: any) => isActive(c.href));
  }

  // Check if any child route of exams is active
  function isExamsActive() {
    return currentPath.startsWith('/lecturer/exams') || currentPath.startsWith('/lecturer/results');
  }

  // Check if results subroutes are active
  function isResultsActive() {
    return currentPath.startsWith('/lecturer/results');
  }

  async function navigate(href: string, e: MouseEvent) {
    e.preventDefault();
    if (navLoading) return;
    navLoading = href;
    sidebarOpen = false;
    try { await goto(href); }
    finally { setTimeout(() => { navLoading = null; }, 300); }
  }

  async function confirmSignout() {
    isSigningOut = true;
    try {
      const f = document.createElement('form');
      f.method = 'POST'; f.action = '/logout';
      document.body.appendChild(f); f.submit();
    } catch { isSigningOut = false; showSignoutModal = false; }
  }

  async function markAllRead() {
    if (markingAllRead || unreadCount === 0) return;
    markingAllRead = true;
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      notifications = notifications.map((n: any) => ({ ...n, isRead: true }));
    } catch { /* silent */ }
    finally { markingAllRead = false; }
  }

  async function markOneRead(id: string) {
    notifications = notifications.map((n: any) => n.id === id ? { ...n, isRead: true } : n);
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  }

  function handleNotifsOutside(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.notif-wrap')) showNotifications = false;
  }

  $effect(() => {
    if (showNotifications) {
      document.addEventListener('click', handleNotifsOutside);
      return () => document.removeEventListener('click', handleNotifsOutside);
    }
  });

  $effect(() => { 
    if (isExamsActive()) examsExpanded = true;
    if (isResultsActive()) resultsExpanded = true;
  });

  function relativeTime(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const initials = $derived(
    (data.user?.fullName ?? 'L').trim().split(/\s+/).filter(Boolean)
      .reduce((acc: string, w: string, i: number, arr: string[]) =>
        i === 0 || i === arr.length - 1 ? acc + w[0] : acc, '')
      .toUpperCase().slice(0, 2)
  );
</script>

<svelte:head><title>Lecturer — MOUAU eTest</title></svelte:head>

<div class="layout" class:collapsed>

  {#if sidebarOpen}
    <div class="sidebar-overlay" onclick={() => sidebarOpen = false}></div>
  {/if}

  <!-- ── Sign-out modal ─────────────────────────────────────────── -->
  {#if showSignoutModal}
    <div class="modal-backdrop" onclick={() => { if (!isSigningOut) showSignoutModal = false; }}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap"><LogOut size={22} /></div>
        <h3>Sign Out</h3>
        <p>Are you sure you want to sign out?</p>
        <p class="modal-sub">You'll need to sign in again to access your dashboard.</p>
        <div class="modal-actions">
          <button class="btn-cancel" onclick={() => showSignoutModal = false} disabled={isSigningOut} type="button">Cancel</button>
          <button class="btn-signout" onclick={confirmSignout} disabled={isSigningOut} type="button">
            {#if isSigningOut}<LoaderCircle size={14} class="spin-icon" /> Signing Out…{:else}<LogOut size={14} /> Sign Out{/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── Sidebar ────────────────────────────────────────────────── -->
  <aside class="sidebar" class:sidebar-open={sidebarOpen}>

    <div class="sidebar-top">
      <a href="/lecturer" class="brand" aria-label="Lecturer home">
        <div class="brand-mark"><BookOpen size={18} /></div>
        {#if !collapsed}
          <div class="brand-text">
            <span class="brand-name">MOUAU eTest</span>
            <span class="brand-sub">Lecturer Portal</span>
          </div>
        {/if}
      </a>
      <button
        class="collapse-btn" type="button"
        onclick={() => { collapsed = !collapsed; sidebarOpen = false; }}
        aria-label={collapsed ? 'Expand' : 'Collapse'}
      ><ChevronRight size={13} /></button>
    </div>

    {#if !collapsed}
      <div class="stats-strip">
        <div class="stat-pill">
          <div class="stat-dot" class:pulse={activeExams > 0}></div>
          <span class="stat-num">{activeExams}</span>
          <span class="stat-lbl">Active</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <FileText size={10} />
          <span class="stat-num">{totalExams}</span>
          <span class="stat-lbl">Exams</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill" class:amber={pendingGrades > 0}>
          <Clock size={10} />
          <span class="stat-num">{pendingGrades}</span>
          <span class="stat-lbl">Pending</span>
        </div>
      </div>
    {/if}

    <nav class="sidebar-nav" aria-label="Main navigation">
      {#each navGroups as group}
        {#if !group.children}
          <a
            href={group.href}
            class="nav-link"
            class:active={isActive(group.href)}
            class:loading={navLoading === group.href}
            onclick={(e) => navigate(group.href, e)}
            title={collapsed ? group.label : undefined}
          >
            <div class="nav-icon">
              {#if navLoading === group.href}
                <span class="nav-spinner"></span>
              {:else}
                <group.icon size={16} strokeWidth={2} />
              {/if}
            </div>
            {#if !collapsed}
              <span class="nav-label">{group.label}</span>
              {#if group.badge && group.badge > 0}
                <span class="nav-badge">{group.badge > 99 ? '99+' : group.badge}</span>
              {/if}
            {/if}
            {#if isActive(group.href)}<span class="active-pip"></span>{/if}
          </a>
        {:else}
          {#if collapsed}
            <a href={group.href} class="nav-link" class:active={isGroupActive(group)}
               onclick={(e) => navigate(group.href, e)} title={group.label}>
              <div class="nav-icon"><group.icon size={16} strokeWidth={2} /></div>
              {#if isGroupActive(group)}<span class="active-pip"></span>{/if}
            </a>
          {:else}
            <div class="nav-group" class:expanded={group.label === 'Exams' ? examsExpanded : resultsExpanded}>
              <button class="nav-link nav-group-trigger" class:active={isGroupActive(group)}
                      onclick={() => {
                        if (group.label === 'Exams') examsExpanded = !examsExpanded;
                        if (group.label === 'Results') resultsExpanded = !resultsExpanded;
                      }} type="button">
                <div class="nav-icon"><group.icon size={16} strokeWidth={2} /></div>
                <span class="nav-label">{group.label}</span>
                {#if group.label === 'Exams' && pendingGrades > 0}
                  <span class="nav-badge">{pendingGrades}</span>
                {/if}
                <ChevronDown size={13} class="nav-chevron" />
              </button>
              {#if (group.label === 'Exams' && examsExpanded) || (group.label === 'Results' && resultsExpanded)}
                <div class="nav-children">
                  {#each group.children as child}
                    <a href={child.href} class="nav-child"
                       class:active={isActive(child.href)}
                       class:loading={navLoading === child.href}
                       onclick={(e) => navigate(child.href, e)}>
                      <child.icon size={14} strokeWidth={2} />
                      <span>{child.label}</span>
                      {#if navLoading === child.href}
                        <span class="nav-spinner small" style="margin-left:auto"></span>
                      {:else if isActive(child.href)}
                        <div class="child-dot"></div>
                      {/if}
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        {/if}
      {/each}
    </nav>

    {#if navLoading}
      <div class="nav-loading-bar"><div class="nav-loading-progress"></div></div>
    {/if}

    <div class="sidebar-bottom">
      <button class="icon-btn theme-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
        {#if theme === 'dark'}<Sun size={15} />{:else}<Moon size={15} />{/if}
        {#if !collapsed}<span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>{/if}
      </button>
      
      <a 
        href="/lecturer/profile" 
        class="avatar-btn"
        onclick={(e) => navigate('/lecturer/profile', e)}
        aria-label="Profile"
        title={collapsed ? data.user?.fullName : undefined}
      >
        <div class="avatar"><span>{initials}</span></div>
        {#if !collapsed}
          <div class="avatar-info">
            <span class="avatar-name">{data.user.title} {data.user?.fullName?.split(' ')[0] ?? 'Lecturer'}</span>
            <span class="avatar-role">Lecturer</span>
          </div>
          <ChevronRight size={12} class="avatar-chevron" />
        {/if}
      </a>
      
      <button class="icon-btn signout-btn" type="button" onclick={() => showSignoutModal = true}
              aria-label="Sign out" title={collapsed ? 'Sign out' : undefined}>
        <LogOut size={15} />
        {#if !collapsed}<span>Sign Out</span>{/if}
      </button>
    </div>
  </aside>

  <!-- ── Main ──────────────────────────────────────────────────── -->
  <div class="layout-main">
    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-toggle" onclick={() => sidebarOpen = true} aria-label="Open menu" type="button">
          <Menu size={18} />
        </button>
        {#if breadcrumbs.length > 0}
          <nav class="breadcrumb" aria-label="Breadcrumb">
            {#each breadcrumbs as crumb, i}
              {#if i > 0}<ChevronRight size={12} class="bc-sep" />{/if}
              {#if i === breadcrumbs.length - 1}
                <span class="bc-current">{crumb.label}</span>
              {:else}
                <a href={crumb.href} class="bc-link" onclick={(e) => navigate(crumb.href, e)}>{crumb.label}</a>
              {/if}
            {/each}
          </nav>
        {:else}
          <span class="topbar-greeting">Welcome back, <strong>{data.user?.fullName?.split(' ')[0] ?? 'Lecturer'}</strong></span>
        {/if}
      </div>

      <div class="topbar-right">
        {#if navLoading}
          <div class="loading-pill"><LoaderCircle size={13} class="spin-icon" /><span>Loading…</span></div>
        {/if}

        <div class="notif-wrap">
          <button class="topbar-btn notif-btn" class:has-unread={unreadCount > 0}
                  onclick={() => showNotifications = !showNotifications}
                  aria-label="Notifications" type="button">
            <Bell size={16} />
            {#if unreadCount > 0}<span class="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>{/if}
          </button>
          {#if showNotifications}
            <div class="notif-dropdown" onclick={(e) => e.stopPropagation()}>
              <div class="notif-head">
                <span class="notif-title">Notifications</span>
                {#if unreadCount > 0}
                  <button class="mark-all-btn" onclick={markAllRead} disabled={markingAllRead} type="button">
                    {#if markingAllRead}<LoaderCircle size={11} class="spin-icon" />{:else}<CheckCheck size={11} />{/if}
                    Mark all read
                  </button>
                {/if}
              </div>
              <div class="notif-list">
                {#if notifications.length === 0}
                  <div class="notif-empty"><Bell size={26} strokeWidth={1.5} /><p>No notifications yet</p></div>
                {:else}
                  {#each notifications.slice(0, 20) as n (n.id)}
                    <button class="notif-item" class:unread={!n.isRead}
                            onclick={() => markOneRead(n.id)} type="button">
                      <div class="notif-dot-col">{#if !n.isRead}<div class="notif-dot"></div>{/if}</div>
                      <div class="notif-body">
                        <p class="notif-item-title">{n.title}</p>
                        <p class="notif-item-msg">{n.message}</p>
                        <p class="notif-item-time">{relativeTime(n.createdAt)}</p>
                      </div>
                    </button>
                  {/each}
                {/if}
              </div>
              {#if notifications.length > 0}
                <div class="notif-foot">
                  <a href="/lecturer/notifications"
                     onclick={(e) => { showNotifications = false; navigate('/lecturer/notifications', e); }}
                     class="notif-all-link">View all notifications</a>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button class="topbar-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>

        <div class="role-badge"><BookOpen size={13} /><span>Lecturer</span></div>
      </div>
    </header>

    <main class="page-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  /* ── Color tokens — INDIGO for lecturers ──────────────────────── */
  :root {
    --lc-50:  #f5f3ff;
    --lc-100: #ede9fe;
    --lc-400: #818cf8;
    --lc-500: #6366f1;
    --lc-600: #4f46e5;
    --lc-700: #4338ca;
    --lc-soft: rgba(99, 102, 241, 0.08);
    --sidebar-w: 240px;
    --sidebar-collapsed: 60px;
    --topbar-h: 52px;
    --radius-btn: 0.6rem;
    --transition: 0.22s cubic-bezier(0.4,0,0.2,1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .layout {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    min-height: 100vh;
    background: var(--color-bg);
    transition: grid-template-columns var(--transition);
  }
  .layout.collapsed { grid-template-columns: var(--sidebar-collapsed) 1fr; }

  /* ── Sidebar ─────────────────────────────────────────────────────── */
  .sidebar {
    display: flex; flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    height: 100vh; position: sticky; top: 0;
    overflow: hidden; z-index: 40;
  }

  @media (max-width: 1023px) {
    .sidebar {
      position: fixed; top: 0; left: 0; bottom: 0;
      width: var(--sidebar-w) !important;
      transform: translateX(-100%);
      transition: transform var(--transition);
      z-index: 100;
    }
    .sidebar.sidebar-open { transform: translateX(0); }
    .layout, .layout.collapsed { grid-template-columns: 1fr; }
  }

  .sidebar-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 99;
  }
  @media (max-width: 1023px) { .sidebar-overlay { display: block; animation: fade-in .2s ease; } }

  /* Brand */
  .sidebar-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem .75rem .875rem;
    border-bottom: 1px solid var(--color-border); gap: .5rem; flex-shrink: 0;
  }
  .brand {
    display: flex; align-items: center; gap: .6rem;
    text-decoration: none; min-width: 0; overflow: hidden;
  }
  .brand-mark {
    width: 34px; height: 34px; border-radius: .625rem; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc-700), var(--lc-500));
    display: flex; align-items: center; justify-content: center; color: white;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  }
  .brand-text { display: flex; flex-direction: column; line-height: 1; }
  .brand-name { font-size: .82rem; font-weight: 800; letter-spacing: -.02em; color: var(--color-text); white-space: nowrap; }
  .brand-sub  { font-size: .58rem; font-weight: 700; letter-spacing: .05em; color: var(--lc-600); text-transform: uppercase; white-space: nowrap; margin-top: 1px; }

  .collapse-btn {
    width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center; transition: all .15s;
  }
  .collapse-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .layout.collapsed .collapse-btn :global(svg) { transform: rotate(180deg); }
  @media (max-width: 1023px) { .collapse-btn { display: none; } }

  /* Stats strip */
  .stats-strip {
    display: flex; align-items: center;
    margin: .625rem .75rem; background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: .625rem; overflow: hidden; flex-shrink: 0;
  }
  .stat-pill {
    flex: 1; display: flex; align-items: center; justify-content: center;
    gap: .3rem; padding: .5rem; color: var(--color-muted); font-size: .68rem;
  }
  .stat-num { font-weight: 800; font-size: .8rem; color: var(--color-text); }
  .stat-lbl { font-size: .62rem; color: var(--color-muted); }
  .stat-divider { width: 1px; height: 24px; background: var(--color-border); }
  .stat-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-border); flex-shrink: 0; }
  .stat-dot.pulse { background: var(--lc-500); animation: dot-pulse 2s ease-in-out infinite; }
  .stat-pill.amber .stat-num { color: #f59e0b; }
  @keyframes dot-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, .4); }
    50%      { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0); }
  }

  /* Nav */
  .sidebar-nav {
    flex: 1; padding: .5rem .625rem;
    display: flex; flex-direction: column; gap: .15rem;
    overflow-y: auto; overflow-x: hidden;
  }
  .sidebar-nav::-webkit-scrollbar { width: 3px; }
  .sidebar-nav::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .nav-link {
    position: relative; display: flex; align-items: center; gap: .6rem;
    padding: .6rem .625rem; border-radius: var(--radius-btn);
    text-decoration: none; font-size: .825rem; font-weight: 500;
    color: var(--color-muted); white-space: nowrap; overflow: hidden;
    transition: color .15s, background .15s;
    border: none; background: none; cursor: pointer; width: 100%;
    text-align: left; font-family: inherit;
  }
  .nav-link:hover { color: var(--color-text); background: var(--color-bg); }
  .nav-link.active { color: var(--lc-700); font-weight: 700; background: var(--lc-soft); }
  :global(.dark) .nav-link.active { color: var(--lc-400); }
  .nav-link.loading { opacity: .6; pointer-events: none; }

  .nav-icon {
    width: 28px; height: 28px; border-radius: .45rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; transition: background .15s;
  }
  .nav-link.active .nav-icon { background: rgba(99, 102, 241, .12); }
  .nav-label { flex: 1; }

  .active-pip {
    position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 60%; border-radius: 0 2px 2px 0; background: var(--lc-600);
  }
  :global(.dark) .active-pip { background: var(--lc-400); }

  .nav-badge {
    background: #f59e0b; color: white;
    font-size: .6rem; font-weight: 800; padding: .1rem .4rem;
    border-radius: 999px; line-height: 1.5; margin-right: .25rem;
  }

  .nav-group { display: flex; flex-direction: column; }
  .nav-chevron { transition: transform .2s ease; opacity: .5; flex-shrink: 0; }
  .nav-group.expanded .nav-chevron { transform: rotate(180deg); }

  .nav-children {
    display: flex; flex-direction: column; gap: .1rem;
    padding-left: .5rem; margin-left: .875rem;
    border-left: 2px solid rgba(99, 102, 241, .3);
    animation: slide-down .18s ease;
  }
  .nav-child {
    display: flex; align-items: center; gap: .5rem;
    padding: .55rem .625rem; border-radius: .45rem;
    text-decoration: none; font-size: .8rem; font-weight: 500;
    color: var(--color-muted); transition: color .15s, background .15s;
  }
  .nav-child:hover { color: var(--color-text); background: var(--color-bg); }
  .nav-child.active { color: var(--lc-700); font-weight: 600; background: var(--lc-soft); }
  :global(.dark) .nav-child.active { color: var(--lc-400); }
  .nav-child.loading { opacity: .6; pointer-events: none; }
  .child-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--lc-600); margin-left: auto; }

  .nav-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--color-border); border-top-color: var(--lc-600);
    animation: spin .6s linear infinite;
  }
  .nav-spinner.small { width: 11px; height: 11px; }

  .nav-loading-bar { height: 2px; background: var(--color-border); overflow: hidden; flex-shrink: 0; }
  .nav-loading-progress { height: 100%; width: 40%; background: var(--lc-600); animation: loading-slide 1s ease-in-out infinite; }

  /* Sidebar footer */
  .sidebar-bottom {
    padding: .5rem .625rem .875rem;
    border-top: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: .15rem; flex-shrink: 0;
  }
  .icon-btn {
    display: flex; align-items: center; gap: .6rem;
    padding: .6rem .625rem; border-radius: var(--radius-btn); width: 100%;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); font-size: .825rem; font-weight: 500;
    font-family: inherit; white-space: nowrap; overflow: hidden;
    transition: color .15s, background .15s;
  }
  .icon-btn:hover { color: var(--color-text); background: var(--color-bg); }
  .signout-btn:hover { color: #dc2626 !important; background: rgba(220,38,38,.06) !important; }

  .avatar-btn {
    display: flex; align-items: center; gap: .6rem;
    padding: .5rem .625rem; border-radius: var(--radius-btn); width: 100%;
    border: 1px solid var(--color-border); background: none; cursor: pointer;
    font-family: inherit; white-space: nowrap; overflow: hidden; transition: all .15s;
    text-decoration: none;
  }
  .avatar-btn:hover { border-color: var(--lc-600); background: var(--lc-soft); }

  .avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc-700), var(--lc-500));
    display: flex; align-items: center; justify-content: center;
  }
  .avatar span { font-size: .65rem; font-weight: 800; color: #fff; }
  .avatar-info { display: flex; flex-direction: column; line-height: 1; min-width: 0; flex: 1; }
  .avatar-name { font-size: .78rem; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .avatar-role { font-size: .57rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 1px; }
  .avatar-chevron { color: var(--color-muted); opacity: .6; flex-shrink: 0; }
  .avatar-btn:hover .avatar-chevron { color: var(--lc-600); opacity: 1; }

  /* ── Main ─────────────────────────────────────────────────────────── */
  .layout-main { display: flex; flex-direction: column; min-height: 100vh; min-width: 0; }

  .topbar {
    position: sticky; top: 0; z-index: 30; height: var(--topbar-h);
    background: var(--color-surface); border-bottom: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.5rem; gap: 1rem; flex-shrink: 0;
  }
  .topbar-left  { display: flex; align-items: center; gap: .75rem; min-width: 0; flex: 1; }
  .topbar-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }

  .menu-toggle {
    background: none; border: none; color: var(--color-text); cursor: pointer;
    padding: .45rem; border-radius: .45rem;
    display: none; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .menu-toggle:hover { background: var(--color-surface-hover); }
  @media (max-width: 1023px) { .menu-toggle { display: flex; } }

  .breadcrumb { display: flex; align-items: center; gap: .2rem; font-size: .78rem; min-width: 0; }
  .bc-sep { color: var(--color-muted); opacity: .4; flex-shrink: 0; }
  .bc-link { color: var(--color-muted); text-decoration: none; white-space: nowrap; transition: color .15s; }
  .bc-link:hover { color: var(--lc-600); }
  .bc-current { color: var(--color-text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .topbar-greeting { font-size: .82rem; color: var(--color-muted); }
  .topbar-greeting strong { color: var(--color-text); font-weight: 700; }

  .loading-pill {
    display: flex; align-items: center; gap: .4rem;
    padding: .35rem .7rem; background: var(--lc-soft);
    border-radius: 999px; font-size: .72rem; font-weight: 600; color: var(--lc-600);
  }
  .spin-icon { animation: spin .8s linear infinite; }

  .topbar-btn {
    width: 34px; height: 34px; border-radius: .5rem;
    border: 1px solid var(--color-border); background: transparent;
    color: var(--color-text); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s; position: relative; flex-shrink: 0;
  }
  .topbar-btn:hover { background: var(--color-surface-hover); }
  .notif-btn.has-unread { border-color: rgba(99, 102, 241, .4); color: var(--lc-600); }

  .notif-badge {
    position: absolute; top: -5px; right: -5px;
    background: #dc2626; color: white;
    font-size: .5rem; font-weight: 800; min-width: 15px; height: 15px;
    border-radius: 999px; display: flex; align-items: center; justify-content: center;
    padding: 0 2px; border: 2px solid var(--color-surface);
  }

  .role-badge {
    display: flex; align-items: center; gap: .4rem;
    padding: .35rem .75rem; background: var(--lc-soft);
    border-radius: 999px; font-size: .72rem; font-weight: 700; color: var(--lc-600);
  }
  @media (max-width: 640px) { .role-badge { display: none; } }

  /* Notifications */
  .notif-wrap { position: relative; }
  .notif-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 330px; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: .875rem;
    box-shadow: 0 12px 40px rgba(0,0,0,.15); z-index: 200; overflow: hidden;
    animation: dd-in .18s cubic-bezier(.16,1,.3,1);
  }
  @keyframes dd-in { from{opacity:0;transform:translateY(-6px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  .notif-head { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem .5rem; border-bottom: 1px solid var(--color-border); }
  .notif-title { font-weight: 700; font-size: .82rem; color: var(--color-text); }
  .mark-all-btn { display: flex; align-items: center; gap: .3rem; background: none; border: none; color: var(--lc-600); font-size: .7rem; font-weight: 600; cursor: pointer; padding: .2rem .45rem; border-radius: .35rem; font-family: inherit; }
  .mark-all-btn:hover { background: var(--lc-soft); }
  .mark-all-btn:disabled { opacity: .5; cursor: not-allowed; }
  .notif-list { max-height: 300px; overflow-y: auto; }
  .notif-list::-webkit-scrollbar { width: 3px; }
  .notif-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
  .notif-empty { display: flex; flex-direction: column; align-items: center; gap: .4rem; padding: 2rem 1rem; color: var(--color-muted); font-size: .78rem; }
  .notif-item { width: 100%; display: flex; gap: .5rem; padding: .7rem 1rem; border: none; background: transparent; cursor: pointer; text-align: left; font-family: inherit; border-bottom: 1px solid var(--color-border); transition: background .12s; }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: rgba(99, 102, 241, .03); }
  .notif-dot-col { width: 14px; flex-shrink: 0; display: flex; align-items: flex-start; padding-top: 4px; }
  .notif-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--lc-600); }
  .notif-body { flex: 1; min-width: 0; }
  .notif-item-title { font-size: .76rem; font-weight: 600; color: var(--color-text); margin: 0 0 .12rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .notif-item-msg { font-size: .71rem; color: var(--color-muted); margin: 0 0 .25rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .notif-item-time { font-size: .65rem; color: var(--color-muted); opacity: .65; margin: 0; }
  .notif-foot { padding: .5rem 1rem; border-top: 1px solid var(--color-border); text-align: center; }
  .notif-all-link { font-size: .72rem; font-weight: 600; color: var(--lc-600); text-decoration: none; }
  .notif-all-link:hover { text-decoration: underline; }

  .page-content { flex: 1; padding: 2rem 1.5rem; }
  @media (min-width: 1024px) { .page-content { padding: 2rem 2.5rem; } }

  /* ── Sign-out modal ───────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem; animation: fade-in .2s ease;
  }
  .modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; width: 100%; max-width: 340px;
    padding: 2rem 1.75rem 1.75rem;
    box-shadow: 0 32px 80px rgba(0,0,0,.2);
    display: flex; flex-direction: column; align-items: center; gap: .5rem;
    text-align: center; animation: modal-up .25s cubic-bezier(.16,1,.3,1);
  }
  .modal-icon-wrap {
    width: 54px; height: 54px; border-radius: 50%; margin-bottom: .5rem;
    background: rgba(220,38,38,.08); border: 2px solid rgba(220,38,38,.2);
    display: flex; align-items: center; justify-content: center; color: #dc2626;
  }
  .modal h3   { font-size: 1.1rem; font-weight: 800; color: var(--color-text); margin: .25rem 0 0; }
  .modal p    { font-size: .82rem; color: var(--color-text); margin: 0; }
  .modal-sub  { color: var(--color-muted) !important; margin-bottom: .75rem !important; line-height: 1.5; }
  .modal-actions { display: flex; gap: .6rem; width: 100%; margin-top: .5rem; }
  .btn-cancel {
    flex: 1; padding: .65rem 1rem;
    border: 1.5px solid var(--color-border); border-radius: var(--radius-btn);
    background: var(--color-bg); color: var(--color-text);
    font-size: .85rem; font-weight: 700; cursor: pointer; font-family: inherit;
  }
  .btn-cancel:hover { border-color: var(--color-text); }
  .btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
  .btn-signout {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: .4rem;
    padding: .65rem 1rem; background: #dc2626; border: none; border-radius: var(--radius-btn);
    color: #fff; font-size: .85rem; font-weight: 700; cursor: pointer; font-family: inherit;
  }
  .btn-signout:hover { background: #b91c1c; }
  .btn-signout:disabled { opacity: .6; cursor: not-allowed; }

  @keyframes spin          { to { transform: rotate(360deg); } }
  @keyframes fade-in       { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slide-down    { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes loading-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
  @keyframes modal-up      { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>