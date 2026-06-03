<!-- src/routes/invigilator/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import {
    ClipboardCheck, Menu, X,
    Sun, Moon, LogOut, ChevronRight, Loader2, ShieldCheck,
    Bell, CheckCheck, Activity
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme = $derived(getTheme());
  let collapsed = $state(false);
  let sidebarOpen = $state(false);
  let navLoading = $state<string | null>(null);
  let showNotifications = $state(false);
  let showSignoutModal = $state(false);
  let isSigningOut = $state(false);
  let notifications = $state<any[]>(data.notifications ?? []);
  let markingAllRead = $state(false);

  const unreadCount = $derived(notifications.filter(n => !n.isRead).length);
  const liveSessionCount = $derived(data.stats?.liveSessions ?? 0);

  const navItems = [
    { href: '/invigilator', label: 'My Exams', icon: ClipboardCheck },
  ];

  const currentPath = $derived($page.url.pathname);

  // Breadcrumb
  const breadcrumbs = $derived((() => {
    const parts = currentPath.replace(/^\/invigilator/, '').split('/').filter(Boolean);
    if (parts.length === 0) return [];

    const crumbs: { label: string; href: string }[] = [
      { label: 'Home', href: '/invigilator' }
    ];

    const labelMap: Record<string, string> = {
      monitor: 'Monitor',
      exams: 'Exams',
    };

    let built = '/invigilator';
    for (const part of parts) {
      built += '/' + part;
      const label = /^[0-9a-f-]{36}$/i.test(part)
        ? 'Exam Details'
        : (labelMap[part] ?? part.charAt(0).toUpperCase() + part.slice(1));
      crumbs.push({ label, href: built });
    }
    return crumbs;
  })());

  function isActive(href: string) {
    if (href === '/invigilator') return currentPath === '/invigilator';
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  async function navigate(href: string, e: MouseEvent) {
    e.preventDefault();
    if (navLoading) return;
    navLoading = href;
    sidebarOpen = false;
    try { await goto(href); }
    finally { setTimeout(() => { navLoading = null; }, 300); }
  }

  // Sign out
  async function confirmSignout() {
    isSigningOut = true;
    try {
      const f = document.createElement('form');
      f.method = 'POST';
      f.action = '/logout';
      document.body.appendChild(f);
      f.submit();
    } catch {
      isSigningOut = false;
      showSignoutModal = false;
    }
  }

  // Notifications
  async function markAllRead() {
    if (markingAllRead || unreadCount === 0) return;
    markingAllRead = true;
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      notifications = notifications.map(n => ({ ...n, isRead: true }));
    } catch { /* silent */ }
    finally { markingAllRead = false; }
  }

  async function markOneRead(id: string) {
    notifications = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  }

  function handleClickOutside(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.notif-wrap')) {
      showNotifications = false;
    }
  }

  $effect(() => {
    if (showNotifications) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
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
    (data.user?.fullName ?? 'I')
      .trim().split(/\s+/)
      .filter(Boolean)
      .reduce((acc: string, w: string, i: number, arr: string[]) =>
        i === 0 || i === arr.length - 1 ? acc + w[0] : acc, '')
      .toUpperCase()
      .slice(0, 2)
  );
</script>

<svelte:head><title>Invigilator — MOUAU eTest</title></svelte:head>

<div class="layout" class:collapsed>

  <!-- Mobile overlay -->
  {#if sidebarOpen}
    <div class="sidebar-overlay" onclick={() => sidebarOpen = false}></div>
  {/if}

  <!-- Sign Out Modal -->
  {#if showSignoutModal}
    <div class="modal-backdrop" onclick={() => { if (!isSigningOut) showSignoutModal = false; }}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap"><LogOut size={22} /></div>
        <h3>Sign Out</h3>
        <p>Are you sure you want to sign out?</p>
        <p class="modal-sub">You'll need to sign in again to access your dashboard.</p>
        <div class="modal-actions">
          <button class="btn-cancel" onclick={() => showSignoutModal = false} disabled={isSigningOut} type="button">
            Cancel
          </button>
          <button class="btn-signout" onclick={confirmSignout} disabled={isSigningOut} type="button">
            {#if isSigningOut}<Loader2 size={14} class="spin-icon" /> Signing Out…{:else}<LogOut size={14} /> Sign Out{/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Sidebar -->
  <aside class="sidebar" class:sidebar-open={sidebarOpen}>

    <!-- Brand -->
    <div class="sidebar-top">
      <a href="/invigilator" class="brand" aria-label="Invigilator home">
        <div class="brand-mark"><ShieldCheck size={18} /></div>
        {#if !collapsed}
          <div class="brand-text">
            <span class="brand-name">MOUAU eTest</span>
            <span class="brand-sub">Invigilator Portal</span>
          </div>
        {/if}
      </a>
      <button
        class="collapse-btn"
        type="button"
        onclick={() => { collapsed = !collapsed; sidebarOpen = false; }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronRight size={13} />
      </button>
    </div>

    <!-- Live session strip -->
    {#if !collapsed && liveSessionCount > 0}
      <div class="live-strip">
        <div class="live-dot"></div>
        <span class="live-label">{liveSessionCount} session{liveSessionCount !== 1 ? 's' : ''} in progress</span>
      </div>
    {/if}

    <!-- Nav -->
    <nav class="sidebar-nav" aria-label="Main navigation">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link"
          class:active={isActive(item.href)}
          class:loading={navLoading === item.href}
          onclick={(e) => navigate(item.href, e)}
          title={collapsed ? item.label : undefined}
        >
          <div class="nav-icon">
            {#if navLoading === item.href}
              <span class="nav-spinner"></span>
            {:else}
              <item.icon size={16} strokeWidth={2} />
            {/if}
          </div>
          {#if !collapsed}<span class="nav-label">{item.label}</span>{/if}
          {#if !collapsed && liveSessionCount > 0}
            <span class="live-badge">{liveSessionCount}</span>
          {/if}
          {#if isActive(item.href)}<span class="active-pip" aria-hidden="true"></span>{/if}
        </a>
      {/each}
    </nav>

    {#if navLoading}
      <div class="nav-loading-bar"><div class="nav-loading-progress"></div></div>
    {/if}

    <!-- Footer -->
    <div class="sidebar-bottom">
      <button
        class="icon-btn theme-btn"
        onclick={toggleTheme}
        type="button"
        aria-label="Toggle theme"
        title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
      >
        {#if theme === 'dark'}<Sun size={15} />{:else}<Moon size={15} />{/if}
        {#if !collapsed}<span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>{/if}
      </button>

      <button
        class="avatar-btn"
        onclick={() => showSignoutModal = true}
        type="button"
        aria-label="Account"
        title={collapsed ? data.user?.fullName : undefined}
      >
        <div class="avatar"><span>{initials}</span></div>
        {#if !collapsed}
          <div class="avatar-info">
            <span class="avatar-name">{data.user?.fullName?.split(' ')[0] ?? 'Invigilator'}</span>
            <span class="avatar-role">Invigilator</span>
          </div>
          <ChevronRight size={12} class="avatar-chevron" />
        {/if}
      </button>

      <button
        class="icon-btn signout-btn"
        type="button"
        onclick={() => showSignoutModal = true}
        aria-label="Sign out"
        title={collapsed ? 'Sign out' : undefined}
      >
        <LogOut size={15} />
        {#if !collapsed}<span>Sign Out</span>{/if}
      </button>
    </div>
  </aside>

  <!-- Main content -->
  <div class="layout-main">

    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-toggle" onclick={() => sidebarOpen = true} aria-label="Open menu" type="button">
          <Menu size={18} />
        </button>

        <!-- Breadcrumb -->
        {#if breadcrumbs.length > 0}
          <nav class="breadcrumb" aria-label="Breadcrumb">
            {#each breadcrumbs as crumb, i}
              {#if i > 0}<ChevronRight size={12} class="bc-sep" />{/if}
              {#if i === breadcrumbs.length - 1}
                <span class="bc-current">{crumb.label}</span>
              {:else}
                <a href={crumb.href} class="bc-link" onclick={(e) => navigate(crumb.href, e)}>
                  {crumb.label}
                </a>
              {/if}
            {/each}
          </nav>
        {:else}
          <span class="topbar-greeting">
            Welcome back, <strong>{data.user?.fullName?.split(' ')[0] ?? 'Invigilator'}</strong>
          </span>
        {/if}
      </div>

      <div class="topbar-right">
        {#if navLoading}
          <div class="loading-pill">
            <Loader2 size={13} class="spin-icon" /><span>Loading…</span>
          </div>
        {/if}

        <!-- Live indicator in header -->
        {#if liveSessionCount > 0}
          <div class="live-indicator">
            <Activity size={13} />
            <span>{liveSessionCount} live</span>
          </div>
        {/if}

        <!-- Notification bell -->
        <div class="notif-wrap">
          <button
            class="topbar-btn notif-btn"
            class:has-unread={unreadCount > 0}
            onclick={() => showNotifications = !showNotifications}
            aria-label="Notifications"
            type="button"
          >
            <Bell size={16} />
            {#if unreadCount > 0}
              <span class="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            {/if}
          </button>

          {#if showNotifications}
            <div class="notif-dropdown" onclick={(e) => e.stopPropagation()}>
              <div class="notif-head">
                <span class="notif-title">Notifications</span>
                {#if unreadCount > 0}
                  <button class="mark-all-btn" onclick={markAllRead} disabled={markingAllRead} type="button">
                    {#if markingAllRead}<Loader2 size={11} class="spin-icon" />{:else}<CheckCheck size={11} />{/if}
                    Mark all read
                  </button>
                {/if}
              </div>
              <div class="notif-list">
                {#if notifications.length === 0}
                  <div class="notif-empty">
                    <Bell size={26} strokeWidth={1.5} />
                    <p>No notifications yet</p>
                  </div>
                {:else}
                  {#each notifications.slice(0, 20) as n (n.id)}
                    <button
                      class="notif-item"
                      class:unread={!n.isRead}
                      onclick={() => markOneRead(n.id)}
                      type="button"
                    >
                      <div class="notif-dot-col">
                        {#if !n.isRead}<div class="notif-dot"></div>{/if}
                      </div>
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
                  <a href="/invigilator/notifications" onclick={(e) => { showNotifications = false; navigate('/invigilator/notifications', e); }} class="notif-all-link">
                    View all notifications
                  </a>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button class="topbar-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>

        <div class="role-badge">
          <ShieldCheck size={13} /><span>Invigilator</span>
        </div>
      </div>
    </header>

    <main class="page-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  /* ── Tokens ──────────────────────────────────────────────────────── */
  :root {
    --invigilator-400: #fbbf24;
    --invigilator-500: #f59e0b;
    --invigilator-600: #d97706;
    --invigilator-700: #b45309;
    --invigilator-soft: rgba(217, 119, 6, 0.08);
    --sidebar-w:         240px;
    --sidebar-collapsed: 60px;
    --topbar-h:          52px;
    --radius-btn:        0.6rem;
    --transition:        0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Outer grid ──────────────────────────────────────────────────── */
  .layout {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    min-height: 100vh;
    background: var(--color-bg);
    transition: grid-template-columns var(--transition);
  }
  .layout.collapsed { grid-template-columns: var(--sidebar-collapsed) 1fr; }

  /* ══ SIDEBAR ═════════════════════════════════════════════════════ */
  .sidebar {
    display: flex; flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    height: 100vh; position: sticky; top: 0;
    overflow: hidden; z-index: 40;
    transition: width var(--transition);
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
    display: none;
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px);
    z-index: 99;
  }
  @media (max-width: 1023px) { .sidebar-overlay { display: block; animation: fade-in 0.2s ease; } }

  /* Brand */
  .sidebar-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 0.75rem 0.875rem;
    border-bottom: 1px solid var(--color-border);
    gap: 0.5rem; flex-shrink: 0;
  }

  .brand {
    display: flex; align-items: center; gap: 0.6rem;
    text-decoration: none; min-width: 0; overflow: hidden;
  }

  .brand-mark {
    width: 34px; height: 34px; border-radius: 0.625rem; flex-shrink: 0;
    background: linear-gradient(135deg, var(--invigilator-600), var(--invigilator-500));
    display: flex; align-items: center; justify-content: center; color: white;
    box-shadow: 0 2px 8px rgba(217, 119, 6, 0.3);
  }

  .brand-text { display: flex; flex-direction: column; line-height: 1; }
  .brand-name { font-size: 0.82rem; font-weight: 800; letter-spacing: -0.02em; color: var(--color-text); white-space: nowrap; }
  .brand-sub  { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.05em; color: var(--invigilator-600); text-transform: uppercase; white-space: nowrap; margin-top: 1px; }

  .collapse-btn {
    width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .collapse-btn:hover { border-color: var(--invigilator-600); color: var(--invigilator-600); }
  .layout.collapsed .collapse-btn :global(svg) { transform: rotate(180deg); }
  @media (max-width: 1023px) { .collapse-btn { display: none; } }

  /* Live strip */
  .live-strip {
    display: flex; align-items: center; gap: 0.5rem;
    margin: 0.625rem 0.75rem;
    padding: 0.5rem 0.875rem;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.25);
    border-radius: 0.5rem;
    font-size: 0.72rem; font-weight: 600; color: #16a34a;
  }
  .live-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0;
    animation: dot-pulse 2s ease-in-out infinite;
  }
  @keyframes dot-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
    50%      { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
  }

  /* Nav */
  .sidebar-nav {
    flex: 1; padding: 0.5rem 0.625rem;
    display: flex; flex-direction: column; gap: 0.15rem;
    overflow-y: auto; overflow-x: hidden;
  }

  .nav-link {
    position: relative;
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.6rem 0.625rem; border-radius: var(--radius-btn);
    text-decoration: none; font-size: 0.825rem; font-weight: 500;
    color: var(--color-muted); white-space: nowrap; overflow: hidden;
    transition: color 0.15s, background 0.15s;
    border: none; background: none; cursor: pointer; width: 100%; text-align: left;
    font-family: inherit;
  }
  .nav-link:hover { color: var(--color-text); background: var(--color-bg); }
  .nav-link.active { color: var(--invigilator-700); font-weight: 700; background: var(--invigilator-soft); }
  [data-theme="dark"] .nav-link.active { color: var(--invigilator-400); }
  .nav-link.loading { opacity: 0.6; pointer-events: none; }

  .nav-icon {
    width: 28px; height: 28px; border-radius: 0.45rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; transition: background 0.15s;
  }
  .nav-link.active .nav-icon { background: rgba(217, 119, 6, 0.12); }

  .nav-label { flex: 1; }

  .active-pip {
    position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 60%; border-radius: 0 2px 2px 0; background: var(--invigilator-600);
  }

  .live-badge {
    background: #22c55e; color: white;
    font-size: 0.62rem; font-weight: 800;
    padding: 0.1rem 0.45rem; border-radius: 999px; line-height: 1.5;
    animation: pulse-badge 2s ease-in-out infinite;
  }

  @keyframes pulse-badge {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
    50%       { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
  }

  .nav-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--color-border); border-top-color: var(--invigilator-600);
    animation: spin 0.6s linear infinite;
  }

  .nav-loading-bar { height: 2px; background: var(--color-border); overflow: hidden; flex-shrink: 0; }
  .nav-loading-progress { height: 100%; width: 40%; background: var(--invigilator-600); animation: loading-slide 1s ease-in-out infinite; }

  /* Bottom */
  .sidebar-bottom {
    padding: 0.5rem 0.625rem 0.875rem;
    border-top: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: 0.15rem; flex-shrink: 0;
  }

  .icon-btn {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.6rem 0.625rem; border-radius: var(--radius-btn); width: 100%;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); font-size: 0.825rem; font-weight: 500;
    font-family: inherit; white-space: nowrap; overflow: hidden;
    transition: color 0.15s, background 0.15s;
  }
  .icon-btn :global(svg) { flex-shrink: 0; }
  .icon-btn:hover { color: var(--color-text); background: var(--color-bg); }
  .signout-btn:hover { color: #dc2626 !important; background: rgba(220, 38, 38, 0.06) !important; }

  .avatar-btn {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.5rem 0.625rem; border-radius: var(--radius-btn); width: 100%;
    border: 1px solid var(--color-border); background: none; cursor: pointer;
    font-family: inherit; white-space: nowrap; overflow: hidden; transition: all 0.15s;
  }
  .avatar-btn:hover { border-color: var(--invigilator-600); background: var(--invigilator-soft); }

  .avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--invigilator-700), var(--invigilator-500));
    display: flex; align-items: center; justify-content: center;
  }
  .avatar span { font-size: 0.65rem; font-weight: 800; color: #fff; }

  .avatar-info { display: flex; flex-direction: column; line-height: 1; min-width: 0; flex: 1; }
  .avatar-name { font-size: 0.78rem; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .avatar-role { font-size: 0.57rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px; }
  .avatar-chevron { color: var(--color-muted); flex-shrink: 0; }

  /* ══ MAIN ════════════════════════════════════════════════════════ */
  .layout-main { display: flex; flex-direction: column; min-height: 100vh; min-width: 0; }

  /* Topbar */
  .topbar {
    position: sticky; top: 0; z-index: 30;
    height: var(--topbar-h);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.5rem; gap: 1rem; flex-shrink: 0;
  }

  .topbar-left  { display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1; }
  .topbar-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

  .menu-toggle {
    background: none; border: none; color: var(--color-text); cursor: pointer;
    padding: 0.45rem; border-radius: 0.45rem;
    display: none; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .menu-toggle:hover { background: var(--color-surface-hover); }
  @media (max-width: 1023px) { .menu-toggle { display: flex; } }

  /* Breadcrumb */
  .breadcrumb { display: flex; align-items: center; gap: 0.2rem; font-size: 0.78rem; min-width: 0; }
  .bc-sep { color: var(--color-muted); opacity: 0.4; flex-shrink: 0; }
  .bc-link { color: var(--color-muted); text-decoration: none; white-space: nowrap; transition: color 0.15s; }
  .bc-link:hover { color: var(--invigilator-600); }
  .bc-current { color: var(--color-text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .topbar-greeting { font-size: 0.82rem; color: var(--color-muted); }
  .topbar-greeting strong { color: var(--color-text); font-weight: 700; }

  .loading-pill {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.7rem;
    background: var(--invigilator-soft); border-radius: 999px;
    font-size: 0.72rem; font-weight: 600; color: var(--invigilator-600);
    animation: fade-in 0.2s ease;
  }

  .live-indicator {
    display: flex; align-items: center; gap: 0.35rem;
    padding: 0.35rem 0.7rem;
    background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.25);
    border-radius: 999px; font-size: 0.72rem; font-weight: 700; color: #16a34a;
  }
  .live-indicator svg { animation: dot-pulse 2s ease-in-out infinite; }

  /* Topbar buttons */
  .topbar-btn {
    width: 34px; height: 34px; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: transparent;
    color: var(--color-text); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; position: relative; flex-shrink: 0;
  }
  .topbar-btn:hover { background: var(--color-surface-hover); }
  .notif-btn.has-unread { border-color: rgba(217, 119, 6, 0.4); color: var(--invigilator-600); }

  .notif-badge {
    position: absolute; top: -5px; right: -5px;
    background: #dc2626; color: white;
    font-size: 0.5rem; font-weight: 800;
    min-width: 15px; height: 15px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 2px; border: 2px solid var(--color-surface);
    animation: badge-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes badge-pop { from { transform: scale(0); } to { transform: scale(1); } }

  .role-badge {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    background: var(--invigilator-soft); border-radius: 999px;
    font-size: 0.72rem; font-weight: 700; color: var(--invigilator-600);
  }
  @media (max-width: 640px) { .role-badge { display: none; } }

  /* Notification dropdown */
  .notif-wrap { position: relative; }

  .notif-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 330px; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: 0.875rem;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    z-index: 200; overflow: hidden;
    animation: dd-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes dd-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .notif-head { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem 0.5rem; border-bottom: 1px solid var(--color-border); }
  .notif-title { font-weight: 700; font-size: 0.82rem; color: var(--color-text); }
  .mark-all-btn { display: flex; align-items: center; gap: 0.3rem; background: none; border: none; color: var(--invigilator-600); font-size: 0.7rem; font-weight: 600; cursor: pointer; padding: 0.2rem 0.45rem; border-radius: 0.35rem; transition: background 0.15s; font-family: inherit; }
  .mark-all-btn:hover { background: var(--invigilator-soft); }
  .mark-all-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .notif-list { max-height: 300px; overflow-y: auto; }
  .notif-list::-webkit-scrollbar { width: 3px; }
  .notif-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .notif-empty { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 2rem 1rem; color: var(--color-muted); font-size: 0.78rem; }

  .notif-item { width: 100%; display: flex; gap: 0.5rem; padding: 0.7rem 1rem; border: none; background: transparent; cursor: pointer; text-align: left; font-family: inherit; border-bottom: 1px solid var(--color-border); transition: background 0.12s; }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: rgba(217, 119, 6, 0.03); }

  .notif-dot-col { width: 14px; flex-shrink: 0; display: flex; align-items: flex-start; padding-top: 4px; }
  .notif-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--invigilator-600); }

  .notif-body { flex: 1; min-width: 0; }
  .notif-item-title { font-size: 0.76rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.12rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .notif-item-msg { font-size: 0.71rem; color: var(--color-muted); margin: 0 0 0.25rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .notif-item-time { font-size: 0.65rem; color: var(--color-muted); opacity: 0.65; margin: 0; }

  .notif-foot { padding: 0.5rem 1rem; border-top: 1px solid var(--color-border); text-align: center; }
  .notif-all-link { font-size: 0.72rem; font-weight: 600; color: var(--invigilator-600); text-decoration: none; }
  .notif-all-link:hover { text-decoration: underline; }

  .page-content { flex: 1; padding: 2rem 1.5rem; }
  @media (min-width: 1024px) { .page-content { padding: 2rem 2.5rem; } }

  /* Sign Out Modal */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem; animation: fade-in 0.2s ease;
  }

  .modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; width: 100%; max-width: 340px;
    padding: 2rem 1.75rem 1.75rem;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.2);
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    text-align: center;
    animation: modal-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes modal-up {
    from { opacity: 0; transform: translateY(14px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .modal-icon-wrap {
    width: 54px; height: 54px; border-radius: 50%; margin-bottom: 0.5rem;
    background: rgba(220, 38, 38, 0.08); border: 2px solid rgba(220, 38, 38, 0.2);
    display: flex; align-items: center; justify-content: center; color: #dc2626;
  }

  .modal h3 { font-size: 1.1rem; font-weight: 800; color: var(--color-text); margin: 0.25rem 0 0; }
  .modal p  { font-size: 0.82rem; color: var(--color-text); margin: 0; }
  .modal-sub { color: var(--color-muted) !important; margin-bottom: 0.75rem !important; line-height: 1.5; }

  .modal-actions { display: flex; gap: 0.6rem; width: 100%; margin-top: 0.5rem; }

  .btn-cancel {
    flex: 1; padding: 0.65rem 1rem;
    border: 1.5px solid var(--color-border); border-radius: var(--radius-btn);
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.85rem; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .btn-cancel:hover { border-color: var(--color-text); }
  .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-signout {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.65rem 1rem;
    background: #dc2626; border: none; border-radius: var(--radius-btn);
    color: #fff; font-size: 0.85rem; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .btn-signout:hover { background: #b91c1c; }
  .btn-signout:disabled { opacity: 0.6; cursor: not-allowed; }

  .spin-icon { animation: spin 0.8s linear infinite; }

  /* Animations */
  @keyframes fade-in      { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin         { to { transform: rotate(360deg); } }
  @keyframes loading-slide{ 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
  @keyframes slide-down   { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

  /* Dark mode tweaks */
  :global(.dark) .role-badge    { background: rgba(217, 119, 6, 0.12); }
  :global(.dark) .notif-dropdown{ box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4); }
  :global(.dark) .notif-item.unread { background: rgba(217, 119, 6, 0.04); }
  :global(.dark) .live-strip    { background: rgba(34, 197, 94, 0.06); }
  :global(.dark) .live-indicator{ background: rgba(34, 197, 94, 0.1); }
</style>