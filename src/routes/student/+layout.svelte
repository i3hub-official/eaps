<!-- src/routes/(student)/+layout.svelte -->
<script lang="ts">
  import { page, navigating } from '$app/stores';
  import { onMount } from 'svelte';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import type { LayoutData } from './$types';
  import {
    LayoutDashboard, Camera, LogOut, Sun, Moon,
    Mail, Hash, Layers, GraduationCap, ShieldCheck,
    ChevronRight, X, BarChart2, Bell, CheckCheck,
    Loader2, BookOpen, Clock, Award
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme         = $derived(getTheme());
  let bioOpen       = $state(false);
  let signOutOpen   = $state(false);
  let collapsed     = $state(false);
  let showNotifs    = $state(false);
  let notifications = $state<any[]>(data.notifications ?? []);
  let markingAll    = $state(false);

  const unreadCount = $derived(notifications.filter(n => !n.isRead).length);

  const links = [
    { href: '/student',         label: 'Dashboard',      icon: LayoutDashboard },
    { href: '/student/results', label: 'My Results',     icon: BarChart2       },
    { href: '/enroll',          label: 'Face Enrolment', icon: Camera          },
  ];

  const currentPath = $derived($page.url.pathname);

  function isActive(href: string) { return currentPath === href; }

  // ── Breadcrumb ──────────────────────────────────────────────────
  const breadcrumbs = $derived((() => {
    const parts = currentPath.replace(/^\/student/, '').split('/').filter(Boolean);
    if (parts.length === 0) return [];

    const crumbs: { label: string; href: string }[] = [
      { label: 'Home', href: '/student' }
    ];

    const map: Record<string, string> = {
      results:  'My Results',
      exam:     'Exam',
      complete: 'Complete',
    };

    let built = '/student';
    for (const part of parts) {
      built += '/' + part;
      const label = /^[0-9a-f-]{36}$/i.test(part)
        ? 'Exam Session'
        : (map[part] ?? part.charAt(0).toUpperCase() + part.slice(1));
      crumbs.push({ label, href: built });
    }
    return crumbs;
  })());

  // ── Initials ────────────────────────────────────────────────────
  const initials = $derived(() => {
    const parts = data.user.fullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  });

  // ── Notifications ───────────────────────────────────────────────
  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    markingAll = true;
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      notifications = notifications.map(n => ({ ...n, isRead: true }));
    } catch { /* silent */ }
    finally { markingAll = false; }
  }

  async function markOneRead(id: string) {
    notifications = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
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
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // Stats from server
  const activeExams   = $derived(data.stats?.activeExams   ?? 0);
  const totalResults  = $derived(data.stats?.totalResults  ?? 0);
</script>

<div class="layout" class:collapsed>

  <!-- ══ SIDEBAR ════════════════════════════════════════════════ -->
  <aside class="sidebar">

    <!-- Brand -->
    <div class="sidebar-top">
      <a href="/student" class="brand" aria-label="MOUAU eTest home">
        <div class="brand-mark">
          <GraduationCap size={18} />
        </div>
        {#if !collapsed}
          <div class="brand-text">
            <span class="brand-name">MOUAU eTest</span>
            <span class="brand-sub">Student Portal</span>
          </div>
        {/if}
      </a>
      <button
        class="collapse-btn"
        type="button"
        onclick={() => collapsed = !collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronRight size={13} />
      </button>
    </div>

    <!-- Quick stats strip (only when expanded) -->
    {#if !collapsed}
      <div class="stats-strip">
        <div class="stat-pill">
          <div class="stat-dot" class:pulse={activeExams > 0}></div>
          <span class="stat-num">{activeExams}</span>
          <span class="stat-lbl">Active</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <Award size={10} />
          <span class="stat-num">{totalResults}</span>
          <span class="stat-lbl">Results</span>
        </div>
      </div>
    {/if}

    <!-- Nav -->
    <nav class="sidebar-nav" aria-label="Main navigation">
      {#each links as { href, label, icon: Icon }}
        <a
          href={href}
          class="nav-link"
          class:active={isActive(href)}
          class:loading={$navigating?.to?.url.pathname === href}
          aria-current={isActive(href) ? 'page' : undefined}
          title={collapsed ? label : undefined}
        >
          <div class="nav-link-icon">
            {#if $navigating?.to?.url.pathname === href}
              <span class="nav-spinner"></span>
            {:else}
              <Icon size={16} strokeWidth={2} />
            {/if}
          </div>
          {#if !collapsed}
            <span class="nav-link-label">{label}</span>
          {/if}
          {#if isActive(href)}
            <span class="active-pip" aria-hidden="true"></span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Bottom -->
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
        onclick={() => bioOpen = true}
        type="button"
        aria-label="View profile"
        title={collapsed ? data.user.fullName : undefined}
      >
        <div class="avatar"><span>{initials()}</span></div>
        {#if !collapsed}
          <div class="avatar-info">
            <span class="avatar-name">{data.user.fullName.split(' ')[0]}</span>
            <span class="avatar-role">Student</span>
          </div>
          <ChevronRight size={12} class="avatar-chevron" />
        {/if}
      </button>

      <button
        class="icon-btn signout-btn"
        type="button"
        onclick={() => signOutOpen = true}
        aria-label="Sign out"
        title={collapsed ? 'Sign out' : undefined}
      >
        <LogOut size={15} />
        {#if !collapsed}<span>Sign Out</span>{/if}
      </button>
    </div>
  </aside>

  <!-- ══ MAIN ═══════════════════════════════════════════════════ -->
  <div class="layout-main">

    <!-- Top header bar -->
    <header class="topbar">
      <div class="topbar-left">
        <!-- Breadcrumb -->
        {#if breadcrumbs.length > 0}
          <nav class="breadcrumb" aria-label="Breadcrumb">
            {#each breadcrumbs as crumb, i}
              {#if i > 0}<ChevronRight size={12} class="bc-sep" />{/if}
              {#if i === breadcrumbs.length - 1}
                <span class="bc-current">{crumb.label}</span>
              {:else}
                <a href={crumb.href} class="bc-link">{crumb.label}</a>
              {/if}
            {/each}
          </nav>
        {:else}
          <span class="topbar-greeting">
            Welcome back, <strong>{data.user.fullName.split(' ')[0]}</strong>
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

        <!-- Notification bell -->
        <div class="notif-wrap">
          <button
            class="topbar-btn notif-btn"
            class:has-unread={unreadCount > 0}
            onclick={() => showNotifs = !showNotifs}
            aria-label="Notifications"
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
                <span class="notif-title">Notifications</span>
                {#if unreadCount > 0}
                  <button class="mark-all-btn" onclick={markAllRead} disabled={markingAll} type="button">
                    {#if markingAll}<Loader2 size={11} class="spin-icon" />{:else}<CheckCheck size={11} />{/if}
                    Mark all read
                  </button>
                {/if}
              </div>

              <div class="notif-list">
                {#if notifications.length === 0}
                  <div class="notif-empty">
                    <Bell size={26} strokeWidth={1.5} />
                    <p>You're all caught up</p>
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
                  <a href="/student/notifications" onclick={() => showNotifs = false} class="notif-all-link">
                    View all notifications
                  </a>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Theme toggle (header duplicate for mobile) -->
        <button class="topbar-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>
      </div>
    </header>

    <main class="page-content">
      {@render children()}
    </main>
  </div>
</div>

<!-- ══ SIGN OUT MODAL ═══════════════════════════════════════════ -->
{#if signOutOpen}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="signout-title"
    onclick={(e) => { if (e.target === e.currentTarget) signOutOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') signOutOpen = false; }}
  >
    <div class="confirm-modal">
      <div class="confirm-icon">
        <LogOut size={24} />
      </div>
      <h2 id="signout-title">Sign out?</h2>
      <p>You'll need to sign in again to access your exams and results.</p>
      <div class="confirm-actions">
        <button class="btn-cancel" type="button" onclick={() => signOutOpen = false}>Cancel</button>
        <form method="POST" action="/logout" style="flex:1">
          <button type="submit" class="btn-signout">
            <LogOut size={14} /> Yes, sign out
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- ══ BIO MODAL ════════════════════════════════════════════════ -->
{#if bioOpen}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bio-title"
    onclick={(e) => { if (e.target === e.currentTarget) bioOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') bioOpen = false; }}
  >
    <div class="bio-modal">
      <div class="bio-top-bar"></div>

      <div class="bio-header">
        <div class="bio-avatar-wrap">
          <div class="bio-avatar"><span>{initials()}</span></div>
          <div class="bio-ring" aria-hidden="true"></div>
        </div>
        <div class="bio-header-info">
          <h2 id="bio-title">{data.user.fullName}</h2>
          <div class="bio-chips">
            <span class="chip chip-green"><GraduationCap size={10} /> Student</span>
            <span class="chip" class:chip-active={data.user.isActive} class:chip-inactive={!data.user.isActive}>
              <ShieldCheck size={10} />
              {data.user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <button class="bio-close" onclick={() => bioOpen = false} type="button" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div class="bio-body">
        <div class="bio-field">
          <div class="bio-field-icon"><Mail size={14} /></div>
          <div>
            <p class="bio-field-label">Email</p>
            <p class="bio-field-value">{data.user.email}</p>
          </div>
        </div>
        {#if data.user.matricNumber}
          <div class="bio-field">
            <div class="bio-field-icon"><Hash size={14} /></div>
            <div>
              <p class="bio-field-label">Matric Number</p>
              <p class="bio-field-value mono">{data.user.matricNumber}</p>
            </div>
          </div>
        {/if}
        {#if data.user.level}
          <div class="bio-field">
            <div class="bio-field-icon"><Layers size={14} /></div>
            <div>
              <p class="bio-field-label">Level</p>
              <p class="bio-field-value">{data.user.level} Level</p>
            </div>
          </div>
        {/if}
        {#if data.user.department}
          <div class="bio-field">
            <div class="bio-field-icon"><BookOpen size={14} /></div>
            <div>
              <p class="bio-field-label">Department</p>
              <p class="bio-field-value">{data.user.department.name}</p>
            </div>
          </div>
        {/if}
      </div>

      <div class="bio-footer">
        <a href="/enroll" class="bio-btn-outline" onclick={() => bioOpen = false}>
          <Camera size={13} /> Update Face ID
        </a>
        <button
          type="button"
          class="bio-btn-danger"
          onclick={() => { bioOpen = false; signOutOpen = true; }}
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Design tokens ───────────────────────────────────────────── */
  :root {
    --green-400: #4ade80;
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-soft: rgba(34,197,94,0.08);
    --sidebar-w: 230px;
    --sidebar-collapsed: 60px;
    --topbar-h: 52px;
    --radius-card: 0.875rem;
    --radius-btn: 0.6rem;
    --transition: 0.22s cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Outer grid ──────────────────────────────────────────────── */
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

  /* ══ SIDEBAR ══════════════════════════════════════════════════ */
  .sidebar {
    display: flex; flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    height: 100vh; position: sticky; top: 0;
    overflow: hidden;
    transition: width var(--transition);
    z-index: 40;
  }

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
    background: linear-gradient(135deg, var(--green-600), var(--green-500));
    display: flex; align-items: center; justify-content: center;
    color: white;
    box-shadow: 0 2px 8px rgba(22,163,74,0.3);
  }

  .brand-text { display: flex; flex-direction: column; line-height: 1; }
  .brand-name {
    font-size: 0.82rem; font-weight: 800; letter-spacing: -0.02em;
    color: var(--color-text); white-space: nowrap;
  }
  .brand-sub {
    font-size: 0.58rem; font-weight: 700; letter-spacing: 0.05em;
    color: var(--green-600); text-transform: uppercase; white-space: nowrap; margin-top: 1px;
  }

  .collapse-btn {
    width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .collapse-btn:hover { border-color: var(--green-600); color: var(--green-600); }
  .layout.collapsed .collapse-btn :global(svg) { transform: rotate(180deg); }

  /* Stats strip */
  .stats-strip {
    display: flex; align-items: center;
    margin: 0.625rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    overflow: hidden;
    flex-shrink: 0;
  }

  .stat-pill {
    flex: 1; display: flex; align-items: center; justify-content: center;
    gap: 0.3rem; padding: 0.5rem 0.5rem;
    color: var(--color-muted); font-size: 0.68rem;
  }
  .stat-num { font-weight: 800; font-size: 0.8rem; color: var(--color-text); }
  .stat-lbl { font-size: 0.62rem; color: var(--color-muted); }
  .stat-divider { width: 1px; height: 24px; background: var(--color-border); }

  .stat-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--color-border);
  }
  .stat-dot.pulse {
    background: var(--green-500);
    animation: dot-pulse 2s ease-in-out infinite;
  }

  @keyframes dot-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    50%      { box-shadow: 0 0 0 4px rgba(34,197,94,0); }
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
  }
  .nav-link:hover { color: var(--color-text); background: var(--color-bg); }
  .nav-link.active {
    color: var(--green-700); font-weight: 700;
    background: var(--green-soft);
  }
  [data-theme="dark"] .nav-link.active { color: var(--green-400); }

  .nav-link-icon {
    width: 28px; height: 28px; border-radius: 0.45rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .nav-link.active .nav-link-icon { background: rgba(34,197,94,0.12); }

  .nav-link-label { flex: 1; }

  .active-pip {
    position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 60%; border-radius: 0 2px 2px 0;
    background: var(--green-600);
  }
  [data-theme="dark"] .active-pip { background: var(--green-400); }

  .nav-link.loading { pointer-events: none; opacity: 0.6; }
  .nav-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--color-border); border-top-color: var(--green-600);
    animation: spin 0.6s linear infinite;
  }

  /* Sidebar bottom */
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

  .signout-btn:hover { color: #dc2626 !important; background: rgba(220,38,38,0.06) !important; }

  .avatar-btn {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.5rem 0.625rem; border-radius: var(--radius-btn); width: 100%;
    border: 1px solid var(--color-border); background: none; cursor: pointer;
    font-family: inherit; white-space: nowrap; overflow: hidden;
    transition: all 0.15s;
  }
  .avatar-btn:hover { border-color: var(--green-600); background: var(--green-soft); }

  .avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
  }
  .avatar span { font-size: 0.65rem; font-weight: 800; color: #fff; }

  .avatar-info { display: flex; flex-direction: column; line-height: 1; min-width: 0; flex: 1; }
  .avatar-name { font-size: 0.78rem; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .avatar-role { font-size: 0.57rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px; }
  .avatar-chevron { color: var(--color-muted); flex-shrink: 0; }

  /* ══ MAIN CONTENT ═════════════════════════════════════════════ */
  .layout-main {
    display: flex; flex-direction: column;
    min-height: 100vh; min-width: 0;
  }

  /* Topbar */
  .topbar {
    position: sticky; top: 0; z-index: 30;
    height: var(--topbar-h);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.5rem; gap: 1rem;
  }

  .topbar-left { display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1; }
  .topbar-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

  /* Breadcrumb */
  .breadcrumb { display: flex; align-items: center; gap: 0.2rem; font-size: 0.78rem; min-width: 0; }
  .bc-sep { color: var(--color-muted); opacity: 0.4; flex-shrink: 0; }
  .bc-link { color: var(--color-muted); text-decoration: none; white-space: nowrap; transition: color 0.15s; }
  .bc-link:hover { color: var(--green-600); }
  .bc-current { color: var(--color-text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .topbar-greeting { font-size: 0.82rem; color: var(--color-muted); }
  .topbar-greeting strong { color: var(--color-text); font-weight: 700; }

  /* Nav loading pill */
  .nav-loading-pill {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.7rem;
    background: var(--green-soft); border-radius: 999px;
    font-size: 0.72rem; font-weight: 600; color: var(--green-600);
    animation: fade-in 0.2s ease;
  }
  .spin-icon { animation: spin 0.8s linear infinite; }

  /* Topbar icon buttons */
  .topbar-btn {
    width: 34px; height: 34px; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: transparent;
    color: var(--color-text); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; position: relative; flex-shrink: 0;
  }
  .topbar-btn:hover { background: var(--color-surface-hover); }

  .notif-btn.has-unread { border-color: rgba(22,163,74,0.4); color: var(--green-600); }

  .notif-badge {
    position: absolute; top: -5px; right: -5px;
    background: #dc2626; color: white;
    font-size: 0.5rem; font-weight: 800;
    min-width: 15px; height: 15px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 2px; border: 2px solid var(--color-surface);
    animation: badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }

  @keyframes badge-pop { from { transform: scale(0); } to { transform: scale(1); } }

  /* Notification dropdown */
  .notif-wrap { position: relative; }

  .notif-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 330px; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: var(--radius-card);
    box-shadow: 0 12px 40px rgba(0,0,0,0.15);
    z-index: 200; overflow: hidden;
    animation: dd-in 0.18s cubic-bezier(0.16,1,0.3,1);
  }

  @keyframes dd-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .notif-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1rem 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .notif-title { font-weight: 700; font-size: 0.82rem; color: var(--color-text); }

  .mark-all-btn {
    display: flex; align-items: center; gap: 0.3rem;
    background: none; border: none; color: var(--green-600);
    font-size: 0.7rem; font-weight: 600; cursor: pointer;
    padding: 0.2rem 0.45rem; border-radius: 0.35rem;
    transition: background 0.15s; font-family: inherit;
  }
  .mark-all-btn:hover { background: var(--green-soft); }
  .mark-all-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .notif-list { max-height: 300px; overflow-y: auto; }
  .notif-list::-webkit-scrollbar { width: 3px; }
  .notif-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .notif-empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
    padding: 2rem 1rem; color: var(--color-muted); font-size: 0.78rem;
  }

  .notif-item {
    width: 100%; display: flex; gap: 0.5rem;
    padding: 0.7rem 1rem; border: none; background: transparent;
    cursor: pointer; text-align: left; font-family: inherit;
    border-bottom: 1px solid var(--color-border); transition: background 0.12s;
  }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: rgba(22,163,74,0.03); }

  .notif-dot-col { width: 14px; flex-shrink: 0; display: flex; align-items: flex-start; padding-top: 4px; }
  .notif-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green-600); }

  .notif-body { flex: 1; min-width: 0; }
  .notif-item-title { font-size: 0.76rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.12rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .notif-item-msg { font-size: 0.71rem; color: var(--color-muted); margin: 0 0 0.25rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .notif-item-time { font-size: 0.65rem; color: var(--color-muted); opacity: 0.65; margin: 0; }

  .notif-foot { padding: 0.5rem 1rem; border-top: 1px solid var(--color-border); text-align: center; }
  .notif-all-link { font-size: 0.72rem; font-weight: 600; color: var(--green-600); text-decoration: none; }
  .notif-all-link:hover { text-decoration: underline; }

  /* Page content */
  .page-content { flex: 1; }

  /* ══ MODALS ════════════════════════════════════════════════════ */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem; animation: fade-in 0.2s ease;
  }

  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

  /* Sign-out confirm */
  .confirm-modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; width: 100%; max-width: 340px;
    padding: 2rem 1.75rem 1.75rem;
    box-shadow: 0 32px 80px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    text-align: center;
    animation: modal-up 0.25s cubic-bezier(0.16,1,0.3,1);
  }

  @keyframes modal-up {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .confirm-icon {
    width: 56px; height: 56px; border-radius: 50%; margin-bottom: 0.5rem;
    background: rgba(220,38,38,0.08); border: 2px solid rgba(220,38,38,0.2);
    display: flex; align-items: center; justify-content: center; color: #dc2626;
  }

  .confirm-modal h2 { font-size: 1.1rem; font-weight: 800; color: var(--color-text); margin: 0.25rem 0 0; }
  .confirm-modal p  { font-size: 0.82rem; color: var(--color-muted); margin: 0 0 1rem; line-height: 1.5; }

  .confirm-actions { display: flex; gap: 0.6rem; width: 100%; }

  .btn-cancel {
    flex: 1; padding: 0.7rem 1rem;
    border: 1.5px solid var(--color-border); border-radius: var(--radius-btn);
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.85rem; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .btn-cancel:hover { border-color: var(--color-text); }

  .btn-signout {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    width: 100%; padding: 0.7rem 1rem;
    background: #dc2626; border: none; border-radius: var(--radius-btn);
    color: #fff; font-size: 0.85rem; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .btn-signout:hover { background: #b91c1c; }

  /* Bio modal */
  .bio-modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; width: 100%; max-width: 400px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.2); overflow: hidden;
    animation: modal-up 0.25s cubic-bezier(0.16,1,0.3,1);
  }

  .bio-top-bar {
    height: 3px;
    background: linear-gradient(90deg, var(--green-700), var(--green-500), #34d399);
  }

  .bio-header {
    display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem;
    background: linear-gradient(160deg, var(--green-soft) 0%, transparent 60%);
    border-bottom: 1px solid var(--color-border);
  }

  .bio-avatar-wrap { position: relative; flex-shrink: 0; }

  .bio-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; font-weight: 800; color: #fff; position: relative; z-index: 1;
  }

  .bio-ring {
    position: absolute; inset: -3px; border-radius: 50%;
    border: 2px solid rgba(34,197,94,0.3);
    animation: ring-pulse 3s ease-in-out infinite;
  }

  @keyframes ring-pulse {
    0%,100% { opacity: 0.3; transform: scale(1);    }
    50%      { opacity: 0.8; transform: scale(1.05); }
  }

  .bio-header-info { flex: 1; min-width: 0; }
  .bio-header-info h2 {
    font-size: 1rem; font-weight: 800; color: var(--color-text);
    margin: 0 0 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .bio-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }

  .chip {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.62rem; font-weight: 700; padding: 0.18rem 0.5rem;
    border-radius: 999px; border: 1px solid var(--color-border);
    color: var(--color-muted); background: var(--color-bg);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .chip-green { background: var(--green-soft); border-color: rgba(34,197,94,0.25); color: var(--green-700); }
  [data-theme="dark"] .chip-green { color: var(--green-400); }
  .chip-active   { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.2); color: var(--green-700); }
  .chip-inactive { background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.2); color: #dc2626; }

  .bio-close {
    width: 30px; height: 30px; border-radius: 0.5rem; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; align-self: flex-start;
  }
  .bio-close:hover { border-color: var(--color-text); color: var(--color-text); }

  .bio-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.875rem; }

  .bio-field { display: flex; align-items: flex-start; gap: 0.75rem; }
  .bio-field-icon {
    width: 30px; height: 30px; border-radius: 0.45rem; flex-shrink: 0;
    background: var(--green-soft); border: 1px solid rgba(34,197,94,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--green-700); margin-top: 0.1rem;
  }
  [data-theme="dark"] .bio-field-icon { color: var(--green-400); }

  .bio-field-label {
    font-size: 0.6rem; font-weight: 700; color: var(--color-muted);
    margin: 0 0 0.15rem; text-transform: uppercase; letter-spacing: 0.06em;
  }
  .bio-field-value { font-size: 0.85rem; font-weight: 500; color: var(--color-text); margin: 0; }
  .bio-field-value.mono { font-family: monospace; font-size: 0.875rem; }

  .bio-footer {
    display: flex; gap: 0.6rem; align-items: center;
    padding: 1rem 1.5rem 1.5rem; border-top: 1px solid var(--color-border);
  }

  .bio-btn-outline {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 0.9rem; border: 1.5px solid var(--color-border);
    border-radius: var(--radius-btn); font-size: 0.78rem; font-weight: 700;
    color: var(--color-text); text-decoration: none; background: none;
    transition: all 0.15s; white-space: nowrap; font-family: inherit;
  }
  .bio-btn-outline:hover { border-color: var(--green-600); color: var(--green-700); background: var(--green-soft); }

  .bio-btn-danger {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    flex: 1; padding: 0.55rem 0.9rem;
    background: rgba(220,38,38,0.06); border: 1.5px solid rgba(220,38,38,0.2);
    border-radius: var(--radius-btn); font-size: 0.78rem; font-weight: 700;
    color: #dc2626; cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .bio-btn-danger:hover { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.4); }

  /* ── Animations ──────────────────────────────────────────────── */
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Mobile ──────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .layout { grid-template-columns: var(--sidebar-collapsed) 1fr; }
    .brand-text, .nav-link-label, .avatar-info, .icon-btn span,
    .avatar-chevron, .stats-strip, .collapse-btn { display: none; }
    .topbar { padding: 0 1rem; }
    .notif-dropdown { width: 290px; }
  }
</style>