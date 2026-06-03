<!-- src/routes/lecturer/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, BookOpen, ClipboardList, Menu, X,
    Sun, Moon, LogOut, ChevronRight, Loader2,
    PlusCircle, BarChart2, ChevronDown, AlertCircle,
    Bell, CheckCheck, FileText, Clock, ChevronLeft
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme = $derived(getTheme());
  let sidebarOpen    = $state(false);
  let navLoading     = $state<string | null>(null);
  let examsExpanded  = $state(false);
  let showSignoutModal    = $state(false);
  let isSigningOut        = $state(false);
  let showNotifications   = $state(false);
  let notifications       = $state<any[]>(data.notifications ?? []);
  let markingAllRead      = $state(false);

  const unreadCount = $derived(notifications.filter(n => !n.isRead).length);

  // ── Quick stats (passed from layout server load) ──────────────────────
  const activeExams   = $derived(data.stats?.activeExams   ?? 0);
  const pendingGrades = $derived(data.stats?.pendingGrades ?? 0);
  const totalExams    = $derived(data.stats?.totalExams    ?? 0);

  // ── Nav ───────────────────────────────────────────────────────────────
  const navGroups = [
    { href: '/lecturer', label: 'Dashboard', icon: LayoutDashboard, children: null },
    {
      href: '/lecturer/exams',
      label: 'Exams',
      icon: ClipboardList,
      children: [
        { href: '/lecturer/exams',        label: 'All Exams',   icon: ClipboardList },
        { href: '/lecturer/exams/create', label: 'Create Exam', icon: PlusCircle    },
        { href: '/lecturer/results',      label: 'Results',     icon: BarChart2     },
      ]
    },
  ];

  const currentPath   = $derived($page.url.pathname);
  const currentSearch = $derived($page.url.search);

  // ── Breadcrumb ────────────────────────────────────────────────────────
  const breadcrumbs = $derived((() => {
    const crumbs: { label: string; href: string }[] = [];
    const parts = currentPath.replace(/^\/lecturer/, '').split('/').filter(Boolean);

    if (parts.length === 0) return [];   // dashboard — no crumb needed

    crumbs.push({ label: 'Lecturer', href: '/lecturer' });

    const labelMap: Record<string, string> = {
      exams:    'Exams',
      create:   'Create Exam',
      results:  'Results',
      questions:'Questions',
      similarity: 'Similarity',
    };

    let built = '/lecturer';
    for (const part of parts) {
      built += '/' + part;
      // UUID segments → "Exam Details"
      const label = /^[0-9a-f-]{36}$/i.test(part)
        ? 'Exam Details'
        : (labelMap[part] ?? part.charAt(0).toUpperCase() + part.slice(1));
      crumbs.push({ label, href: built });
    }

    return crumbs;
  })());

  function isActive(href: string) {
    if (href === '/lecturer') return currentPath === '/lecturer';
    if (href.includes('?')) {
      return currentPath === href.split('?')[0] && currentSearch === '?' + href.split('?')[1];
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  function isGroupActive(group: any) {
    if (!group.children) return isActive(group.href);
    return group.children.some((c: any) => isActive(c.href));
  }

  async function handleNavClick(href: string, event: MouseEvent) {
    event.preventDefault();
    if (navLoading) return;
    navLoading = href;
    sidebarOpen = false;
    try { await goto(href); }
    finally { setTimeout(() => { navLoading = null; }, 300); }
  }

  function toggleExamsGroup() { examsExpanded = !examsExpanded; }
  function openSignoutModal()  { showSignoutModal = true; }
  function closeSignoutModal() { if (!isSigningOut) showSignoutModal = false; }

  async function confirmSignout() {
    isSigningOut = true;
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/logout';
      document.body.appendChild(form);
      form.submit();
    } catch {
      isSigningOut = false;
      closeSignoutModal();
    }
  }

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

  $effect(() => {
    if (isGroupActive(navGroups[1])) examsExpanded = true;
  });

  function relativeTime(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
</script>

<svelte:head><title>Lecturer — MOUAU eTest</title></svelte:head>

<div class="lecturer-layout">

  {#if sidebarOpen}
    <div class="sidebar-overlay" onclick={() => sidebarOpen = false}></div>
  {/if}

  <!-- ── Sign-out modal ──────────────────────────────────────────────── -->
  {#if showSignoutModal}
    <div class="modal-overlay" onclick={closeSignoutModal}>
      <div class="modal-container" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-icon"><LogOut size={24} /></div>
          <h3>Sign Out</h3>
          <button class="modal-close" onclick={closeSignoutModal} disabled={isSigningOut}>
            <X size={20} />
          </button>
        </div>
        <div class="modal-body">
          <AlertCircle size={20} />
          <p>Are you sure you want to sign out?</p>
          <p class="modal-warning">You'll need to sign in again to access your dashboard.</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn-secondary" onclick={closeSignoutModal} disabled={isSigningOut}>Cancel</button>
          <button class="modal-btn modal-btn-danger" onclick={confirmSignout} disabled={isSigningOut}>
            {#if isSigningOut}<Loader2 size={16} class="spin" /> Signing Out…{:else}<LogOut size={16} /> Sign Out{/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
  <aside class="sidebar" class:sidebar-open={sidebarOpen}>

    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon"><BookOpen size={24} /></div>
        <div class="logo-text">
          <span class="logo-title">MOUAU eTest</span>
          <span class="logo-badge">Lecturer</span>
        </div>
      </div>
      <button class="close-sidebar" onclick={() => sidebarOpen = false} aria-label="Close menu">
        <X size={20} />
      </button>
    </div>

    <!-- Quick stats strip -->
    <div class="stats-strip">
      <div class="stat-pill">
        <div class="stat-dot active-dot"></div>
        <span class="stat-num">{activeExams}</span>
        <span class="stat-lbl">Active</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-pill">
        <FileText size={11} />
        <span class="stat-num">{totalExams}</span>
        <span class="stat-lbl">Exams</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-pill" class:pending-highlight={pendingGrades > 0}>
        <Clock size={11} />
        <span class="stat-num">{pendingGrades}</span>
        <span class="stat-lbl">Pending</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      {#each navGroups as group}
        {#if !group.children}
          <a
            href={group.href}
            class="nav-link"
            class:active={isActive(group.href)}
            class:loading={navLoading === group.href}
            onclick={(e) => handleNavClick(group.href, e)}
          >
            <group.icon size={18} />
            <span>{group.label}</span>
            {#if navLoading === group.href}
              <Loader2 size={14} class="nav-loader" />
            {:else if isActive(group.href)}
              <ChevronRight size={14} class="nav-arrow" />
            {/if}
          </a>
        {:else}
          <div class="nav-group" class:expanded={examsExpanded}>
            <button class="nav-link nav-group-trigger" class:active={isGroupActive(group)} onclick={toggleExamsGroup} type="button">
              <group.icon size={18} />
              <span>{group.label}</span>
              {#if pendingGrades > 0}
                <span class="nav-badge">{pendingGrades}</span>
              {/if}
              <ChevronDown size={14} class="nav-chevron" />
            </button>
            {#if examsExpanded}
              <div class="nav-children">
                {#each group.children as child}
                  <a
                    href={child.href}
                    class="nav-link nav-child"
                    class:active={isActive(child.href)}
                    class:loading={navLoading === child.href}
                    onclick={(e) => handleNavClick(child.href, e)}
                  >
                    <child.icon size={16} />
                    <span>{child.label}</span>
                    {#if navLoading === child.href}
                      <Loader2 size={12} class="nav-loader" />
                    {:else if isActive(child.href)}
                      <div class="child-active-dot"></div>
                    {/if}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </nav>

    {#if navLoading}
      <div class="nav-loading-bar"><div class="nav-loading-progress"></div></div>
    {/if}

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">{data.user?.fullName?.charAt(0)?.toUpperCase() || 'L'}</div>
        <div class="user-details">
          <span class="user-name">{data.user?.fullName?.split(' ')[0] || 'Lecturer'}</span>
          <span class="user-role">Lecturer</span>
        </div>
      </div>
      <button onclick={openSignoutModal} class="logout-btn">
        <LogOut size={16} /><span>Sign Out</span>
      </button>
    </div>
  </aside>

  <!-- ── Main content ────────────────────────────────────────────────── -->
  <main class="main-content">
    <header class="main-header">
      <div class="header-left">
        <button class="menu-toggle" onclick={() => sidebarOpen = true} aria-label="Open menu">
          <Menu size={20} />
        </button>

        <!-- Breadcrumb -->
        {#if breadcrumbs.length > 0}
          <nav class="breadcrumb" aria-label="Breadcrumb">
            {#each breadcrumbs as crumb, i}
              {#if i > 0}<ChevronRight size={13} class="bc-sep" />{/if}
              {#if i === breadcrumbs.length - 1}
                <span class="bc-current">{crumb.label}</span>
              {:else}
                <a href={crumb.href} class="bc-link" onclick={(e) => handleNavClick(crumb.href, e)}>
                  {crumb.label}
                </a>
              {/if}
            {/each}
          </nav>
        {/if}
      </div>

      <div class="header-right">
        {#if navLoading}
          <div class="header-loading">
            <Loader2 size={16} class="spin" /><span>Loading…</span>
          </div>
        {/if}

        <!-- Notification bell -->
        <div class="notif-wrap">
          <button
            class="icon-btn notif-btn"
            class:has-unread={unreadCount > 0}
            onclick={() => showNotifications = !showNotifications}
            aria-label="Notifications"
            type="button"
          >
            <Bell size={17} />
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
                    {#if markingAllRead}
                      <Loader2 size={12} class="spin" />
                    {:else}
                      <CheckCheck size={12} />
                    {/if}
                    Mark all read
                  </button>
                {/if}
              </div>

              <div class="notif-list">
                {#if notifications.length === 0}
                  <div class="notif-empty">
                    <Bell size={28} strokeWidth={1.5} />
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
                      <div class="notif-dot-wrap">
                        {#if !n.isRead}<div class="notif-unread-dot"></div>{/if}
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
                  <a href="/lecturer/notifications" onclick={(e) => { showNotifications = false; handleNavClick('/lecturer/notifications', e); }} class="notif-all-link">
                    View all notifications
                  </a>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button class="icon-btn theme-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>

        <div class="lecturer-badge">
          <BookOpen size={14} /><span>Lecturer</span>
        </div>
      </div>
    </header>

    <div class="page-content">
      {@render children()}
    </div>
  </main>
</div>

<style>
  :root {
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-800: #166534;
  }

  .lecturer-layout { display: flex; min-height: 100vh; background: var(--color-bg); }

  /* ── Modal ───────────────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; animation: fadeIn 0.2s ease;
  }
  .modal-container {
    background: var(--color-surface); border-radius: 1rem;
    width: 90%; max-width: 420px;
    box-shadow: 0 20px 35px -8px rgba(0,0,0,0.2);
    animation: slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
    border: 1px solid var(--color-border);
  }
  .modal-header { display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border); }
  .modal-icon { width: 40px; height: 40px; background: rgba(220,38,38,0.1); border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; color: #dc2626; }
  .modal-header h3 { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; flex: 1; }
  .modal-close { background: transparent; border: none; color: var(--color-muted); cursor: pointer; padding: 0.25rem; border-radius: 0.375rem; display: flex; align-items: center; transition: all 0.15s; }
  .modal-close:hover:not(:disabled) { background: var(--color-surface-hover); color: var(--color-text); }
  .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
  .modal-body { padding: 1.5rem; text-align: center; }
  .modal-body svg { color: #dc2626; margin-bottom: 0.75rem; }
  .modal-body p { margin: 0.5rem 0; font-size: 0.9rem; color: var(--color-text); }
  .modal-warning { font-size: 0.78rem !important; color: var(--color-muted) !important; }
  .modal-footer { display: flex; gap: 0.75rem; padding: 1rem 1.5rem 1.5rem; border-top: 1px solid var(--color-border); }
  .modal-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none; font-family: inherit; }
  .modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .modal-btn-secondary { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); }
  .modal-btn-secondary:hover:not(:disabled) { background: var(--color-surface-hover); }
  .modal-btn-danger { background: #dc2626; color: white; }
  .modal-btn-danger:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220,38,38,0.3); }

  /* ── Sidebar ─────────────────────────────────────────────────────── */
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
    background: var(--color-surface); border-right: 1px solid var(--color-border);
    display: flex; flex-direction: column;
    z-index: 100; transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
    overflow: hidden;
  }
  .sidebar.sidebar-open { transform: translateX(0); }

  .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 99; animation: fadeIn 0.2s ease; }

  .sidebar-header { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border); }
  .logo { display: flex; align-items: center; gap: 0.75rem; }
  .logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, var(--green-600), var(--green-700)); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; }
  .logo-text { display: flex; flex-direction: column; }
  .logo-title { font-weight: 800; font-size: 0.9rem; color: var(--color-text); }
  .logo-badge { font-size: 0.65rem; font-weight: 600; color: var(--green-600); text-transform: uppercase; }
  .close-sidebar { background: none; border: none; color: var(--color-muted); cursor: pointer; padding: 0.25rem; border-radius: 0.25rem; display: flex; align-items: center; }
  .close-sidebar:hover { color: var(--color-text); background: var(--color-bg); }

  /* ── Quick stats strip ───────────────────────────────────────────── */
  .stats-strip {
    display: flex; align-items: center; gap: 0;
    margin: 0.75rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    overflow: hidden;
  }
  .stat-pill {
    flex: 1; display: flex; align-items: center; justify-content: center;
    gap: 0.3rem; padding: 0.55rem 0.5rem;
    font-size: 0.7rem; color: var(--color-muted);
  }
  .stat-num { font-weight: 800; font-size: 0.82rem; color: var(--color-text); }
  .stat-lbl { font-size: 0.65rem; color: var(--color-muted); }
  .stat-divider { width: 1px; height: 28px; background: var(--color-border); flex-shrink: 0; }
  .stat-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .active-dot { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,0.25); animation: pulse-dot 2s ease-in-out infinite; }
  .pending-highlight .stat-num { color: #f59e0b; }

  @keyframes pulse-dot {
    0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
    50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0.1); }
  }

  /* ── Nav ─────────────────────────────────────────────────────────── */
  .sidebar-nav { flex: 1; padding: 0.5rem 1rem; display: flex; flex-direction: column; gap: 0.125rem; overflow: visible; min-height: 0; }
  .nav-link { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 1rem; border-radius: 0.5rem; text-decoration: none; color: var(--color-text); font-weight: 500; font-size: 0.875rem; transition: all 0.15s; border: none; background: none; cursor: pointer; width: 100%; text-align: left; }
  .nav-link:hover { background: var(--color-surface-hover); }
  .nav-link.active { background: rgba(22,163,74,0.1); color: var(--green-600); }
  .nav-link.loading { opacity: 0.7; pointer-events: none; }
  .nav-arrow { margin-left: auto; opacity: 0.5; }
  .nav-loader { margin-left: auto; animation: spin 0.8s linear infinite; color: var(--green-600); }
  .nav-badge { margin-left: auto; background: #f59e0b; color: white; font-size: 0.62rem; font-weight: 800; padding: 0.1rem 0.4rem; border-radius: 999px; line-height: 1.4; }
  .nav-group { display: flex; flex-direction: column; }
  .nav-group-trigger { justify-content: flex-start; }
  .nav-chevron { transition: transform 0.2s ease; opacity: 0.5; }
  .nav-group.expanded .nav-chevron { transform: rotate(180deg); }
  .nav-children { display: flex; flex-direction: column; gap: 0.125rem; padding-left: 0.5rem; margin-left: 0.75rem; border-left: 2px solid rgba(22,163,74,0.35); animation: slideDown 0.2s ease; }
  .nav-child { padding: 0.6rem 0.75rem; font-size: 0.82rem; color: var(--color-muted); }
  .nav-child:hover { color: var(--color-text); }
  .nav-child.active { background: rgba(22,163,74,0.08); color: var(--green-600); }
  .child-active-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green-600); margin-left: auto; }
  .nav-loading-bar { height: 2px; background: var(--color-border); overflow: hidden; flex-shrink: 0; }
  .nav-loading-progress { height: 100%; width: 40%; background: var(--green-600); animation: loadingSlide 1s ease-in-out infinite; }

  /* ── Sidebar footer ──────────────────────────────────────────────── */
  .sidebar-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--color-border); flex-shrink: 0; }
  .user-info { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
  .user-avatar { width: 40px; height: 40px; background: linear-gradient(135deg, var(--green-600), var(--green-700)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; color: white; }
  .user-details { display: flex; flex-direction: column; }
  .user-name { font-weight: 600; font-size: 0.85rem; color: var(--color-text); }
  .user-role { font-size: 0.7rem; color: var(--color-muted); }
  .logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem; background: transparent; border: 1px solid var(--color-border); border-radius: 0.5rem; color: #dc2626; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .logout-btn:hover { background: rgba(220,38,38,0.1); border-color: #dc2626; }

  /* ── Main content ────────────────────────────────────────────────── */
  .main-content { flex: 1; margin-left: 0; min-width: 0; width: 100%; }

  .main-header {
    position: sticky; top: 0;
    background: var(--color-surface); border-bottom: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1.5rem; z-index: 50; gap: 1rem;
  }

  .header-left { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
  .header-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

  .menu-toggle { background: none; border: none; color: var(--color-text); cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .menu-toggle:hover { background: var(--color-surface-hover); }

  /* ── Breadcrumb ──────────────────────────────────────────────────── */
  .breadcrumb {
    display: flex; align-items: center; gap: 0.25rem;
    font-size: 0.8rem; min-width: 0; overflow: hidden;
  }
  .bc-sep { color: var(--color-muted); opacity: 0.5; flex-shrink: 0; }
  .bc-link { color: var(--color-muted); text-decoration: none; white-space: nowrap; transition: color 0.15s; }
  .bc-link:hover { color: var(--green-600); }
  .bc-current { color: var(--color-text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ── Shared icon button ──────────────────────────────────────────── */
  .icon-btn {
    width: 36px; height: 36px; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: transparent;
    color: var(--color-text); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; position: relative; flex-shrink: 0;
  }
  .icon-btn:hover { background: var(--color-surface-hover); }

  /* ── Notification bell ───────────────────────────────────────────── */
  .notif-wrap { position: relative; }

  .notif-btn.has-unread {
    border-color: rgba(22,163,74,0.4);
    color: var(--green-600);
  }

  .notif-badge {
    position: absolute; top: -5px; right: -5px;
    background: #dc2626; color: white;
    font-size: 0.55rem; font-weight: 800;
    min-width: 16px; height: 16px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 3px; border: 2px solid var(--color-surface);
    animation: badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }

  @keyframes badge-pop {
    from { transform: scale(0); }
    to   { transform: scale(1); }
  }

  .notif-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 340px; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: 0.875rem;
    box-shadow: 0 12px 40px rgba(0,0,0,0.15);
    z-index: 200; overflow: hidden;
    animation: dd-open 0.18s cubic-bezier(0.16,1,0.3,1);
  }

  @keyframes dd-open {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }

  .notif-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1rem 0.625rem;
    border-bottom: 1px solid var(--color-border);
  }
  .notif-title { font-weight: 700; font-size: 0.85rem; color: var(--color-text); }
  .mark-all-btn { display: flex; align-items: center; gap: 0.3rem; background: none; border: none; color: var(--green-600); font-size: 0.72rem; font-weight: 600; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.35rem; transition: background 0.15s; font-family: inherit; }
  .mark-all-btn:hover { background: rgba(22,163,74,0.08); }
  .mark-all-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .notif-list { max-height: 320px; overflow-y: auto; }
  .notif-list::-webkit-scrollbar { width: 4px; }
  .notif-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .notif-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2.5rem 1rem; color: var(--color-muted); font-size: 0.8rem; }

  .notif-item {
    width: 100%; display: flex; gap: 0.625rem;
    padding: 0.75rem 1rem; border: none; background: transparent;
    cursor: pointer; text-align: left; font-family: inherit;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
  }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: rgba(22,163,74,0.03); }

  .notif-dot-wrap { width: 16px; flex-shrink: 0; display: flex; align-items: flex-start; padding-top: 4px; }
  .notif-unread-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green-600); }

  .notif-body { flex: 1; min-width: 0; }
  .notif-item-title { font-size: 0.78rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .notif-item-msg { font-size: 0.73rem; color: var(--color-muted); margin: 0 0 0.3rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .notif-item-time { font-size: 0.67rem; color: var(--color-muted); opacity: 0.7; margin: 0; }

  .notif-foot { padding: 0.6rem 1rem; border-top: 1px solid var(--color-border); text-align: center; }
  .notif-all-link { font-size: 0.75rem; font-weight: 600; color: var(--green-600); text-decoration: none; }
  .notif-all-link:hover { text-decoration: underline; }

  .header-loading { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem; background: rgba(22,163,74,0.1); border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--green-600); animation: fadeIn 0.2s ease; }
  .header-loading .spin { animation: spin 0.8s linear infinite; }

  .lecturer-badge { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.8rem; background: rgba(22,163,74,0.1); border-radius: 2rem; font-size: 0.75rem; font-weight: 600; color: var(--green-600); }

  .page-content { padding: 2rem 1.5rem; }

  /* ── Animations ──────────────────────────────────────────────────── */
  @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin      { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes loadingSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }

  /* ── Desktop ─────────────────────────────────────────────────────── */
  @media (min-width: 1024px) {
    .sidebar { position: sticky; top: 0; height: 100vh; transform: translateX(0); width: 260px; overflow: hidden; flex-shrink: 0; }
    .sidebar-overlay, .close-sidebar, .menu-toggle { display: none; }
    .main-content { margin-left: 0; flex: 1; min-width: 0; min-height: 100vh; display: flex; flex-direction: column; }
    .page-content { padding: 2rem 2.5rem; flex: 1; }
  }
  @media (min-width: 1280px) { .sidebar { width: 280px; } }

  /* ── Dark mode ───────────────────────────────────────────────────── */
  :global(.dark) .lecturer-badge  { background: rgba(22,163,74,0.15); }
  :global(.dark) .header-loading  { background: rgba(22,163,74,0.15); }
  :global(.dark) .logout-btn      { border-color: rgba(220,38,38,0.3); }
  :global(.dark) .logout-btn:hover{ background: rgba(220,38,38,0.15); }
  :global(.dark) .modal-icon      { background: rgba(220,38,38,0.15); }
  :global(.dark) .notif-dropdown  { box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
  :global(.dark) .notif-item.unread { background: rgba(22,163,74,0.05); }
</style>