<!-- src/routes/student/+layout.svelte -->
<script lang="ts">
  import { page, navigating } from '$app/stores';
  import { onMount } from 'svelte';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import type { LayoutData } from './$types';
  import {
    LayoutDashboard, LogOut, Sun, Moon, GraduationCap,
    ChevronRight, X, Bell, CheckCheck, Loader2, BookOpen,
    ClipboardList, UserCircle, Menu, Target, BookMarked,
    AlertTriangle, ArrowRight, Sparkles, Zap, Clock, Activity,
    PanelLeftClose, PanelLeftOpen
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme        = $derived(getTheme());
  let collapsed    = $state(false);
  let mobileOpen   = $state(false);
  let showNotifs   = $state(false);
  let signOutOpen  = $state(false);
  let markingAll   = $state(false);
  let notifications = $state<any[]>(data.notifications ?? []);

  const unreadCount = $derived(notifications.filter(n => !n.isRead).length);

  onMount(() => {
    const saved = localStorage.getItem('stu-sidebar-collapsed');
    if (saved !== null) collapsed = JSON.parse(saved);
  });

  $effect(() => {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('stu-sidebar-collapsed', JSON.stringify(collapsed));
  });

  $effect(() => { if ($navigating) mobileOpen = false; });

  const links = [
    { href: '/student',                   label: 'Dashboard',    icon: LayoutDashboard, exact: true  },
    { href: '/student/exam',              label: 'My Exams',     icon: ClipboardList,   exact: false },
    { href: '/student/results',           label: 'Results',      icon: Target,          exact: false },
    { href: '/student/courses',           label: 'Courses',      icon: BookMarked,      exact: false },
    { href: '/student/courses/register',  label: 'Register',     icon: BookOpen,        exact: false, badge: true },
    { href: '/student/notifications',     label: 'Notifications', icon: Bell,           exact: false, count: () => unreadCount },
    { href: '/student/profile',           label: 'Profile',      icon: UserCircle,      exact: false },
  ];

  const currentPath = $derived($page.url.pathname);

  function isActive(href: string, exact: boolean) {
    if (exact) return currentPath === href;
    if (href === '/student/courses' && currentPath.startsWith('/student/courses/register')) return false;
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  const breadcrumbs = $derived((() => {
    const parts = currentPath.replace(/^\/student/, '').split('/').filter(Boolean);
    if (!parts.length) return [];
    const map: Record<string, string> = {
      results: 'Results', courses: 'Courses', register: 'Register',
      notifications: 'Notifications', profile: 'Profile', exam: 'Exam'
    };
    const crumbs = [{ label: 'Home', href: '/student' }];
    let built = '/student';
    for (const p of parts) {
      built += '/' + p;
      crumbs.push({
        label: /^[0-9a-f-]{36}$/i.test(p) ? 'Session' : (map[p] ?? p[0].toUpperCase() + p.slice(1)),
        href: built
      });
    }
    return crumbs;
  })());

  const initials = $derived((() => {
    const p = data.user.fullName.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  })());

  const firstName = $derived(data.user.fullName.trim().split(/\s+/)[0] ?? 'Student');

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

  function reltime(date: string) {
    const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
</script>

{#if mobileOpen}
  <div class="mob-overlay" onclick={() => mobileOpen = false} aria-hidden="true"></div>
{/if}

<div class="shell" class:collapsed>

  <!-- ═══ SIDEBAR ═══ -->
  <aside class="sidebar" class:collapsed class:mob-open={mobileOpen}>

    <!-- Brand row -->
    <div class="sidebar-top">
      <a href="/student" class="brand" aria-label="Student home">
        <div class="brand-icon"><GraduationCap size={18} strokeWidth={2} /></div>
        {#if !collapsed}
          <div class="brand-copy">
            <span class="brand-name">MOUAU <em>eTest</em></span>
            <span class="brand-role">Student Portal</span>
          </div>
        {/if}
      </a>
      <button
        class="tog-btn desktop-only"
        type="button"
        onclick={() => collapsed = !collapsed}
        title={collapsed ? 'Expand' : 'Collapse'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {#if collapsed}<PanelLeftOpen size={15} />{:else}<PanelLeftClose size={15} />{/if}
      </button>
      <button class="tog-btn mobile-only" type="button" onclick={() => mobileOpen = false} aria-label="Close">
        <X size={15} />
      </button>
    </div>

    <!-- Stats — expanded only -->
    {#if !collapsed}
      <div class="stats-row">
        <div class="stat">
          <Zap size={11} />
          <span class="stat-n">{data.stats?.activeExams ?? 0}</span>
          <span class="stat-l">Live</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <Clock size={11} />
          <span class="stat-n">{data.stats?.upcomingExams ?? 0}</span>
          <span class="stat-l">Soon</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <Target size={11} />
          <span class="stat-n">{data.stats?.totalResults ?? 0}</span>
          <span class="stat-l">Done</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <Activity size={11} />
          <span class="stat-n" class:good={(data.stats?.averageScore ?? 0) >= 50}>{data.stats?.averageScore ?? 0}%</span>
          <span class="stat-l">Avg</span>
        </div>
      </div>
    {/if}

    <!-- Nav -->
    <nav class="nav" aria-label="Student navigation">
      {#each links as lnk}
        {@const active = isActive(lnk.href, lnk.exact)}
        {@const count  = lnk.count?.() ?? 0}
        <a
          href={lnk.href}
          class="nav-lnk"
          class:active
          title={collapsed ? lnk.label : undefined}
          aria-current={active ? 'page' : undefined}
        >
          <div class="nav-icon" class:active>
            {#if $navigating?.to?.url.pathname.startsWith(lnk.href) && !lnk.exact}
              <div class="spinner"></div>
            {:else}
              <lnk.icon size={17} strokeWidth={1.9} />
            {/if}
          </div>
          {#if !collapsed}
            <span class="nav-label">{lnk.label}</span>
            {#if lnk.badge}
              <span class="badge-open">Open</span>
            {:else if count > 0}
              <span class="badge-count">{count > 99 ? '99+' : count}</span>
            {/if}
          {:else if (lnk.badge || count > 0)}
            <span class="collapsed-dot"></span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Footer -->
    <div class="sidebar-foot">
      <button class="foot-btn" type="button" onclick={toggleTheme} title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}>
        <div class="foot-icon">
          {#if theme === 'dark'}<Sun size={14} />{:else}<Moon size={14} />{/if}
        </div>
        {#if !collapsed}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>{/if}
      </button>

      <a href="/student/profile" class="profile-row" title={collapsed ? firstName : undefined}>
        <div class="avatar">{initials}<div class="online-pip"></div></div>
        {#if !collapsed}
          <div class="profile-copy">
            <span class="profile-name">{firstName}</span>
            <span class="profile-sub">Student</span>
          </div>
          <ChevronRight size={13} class="profile-arr" />
        {/if}
      </a>

      <button class="foot-btn signout" type="button" onclick={() => signOutOpen = true} title={collapsed ? 'Sign out' : undefined}>
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
                <a href={crumb.href} class="bc-lnk">{crumb.label}</a>
              {/if}
            {/each}
          </nav>
        {:else}
          <div class="greet"><Sparkles size={13} /><span>Welcome, <strong>{firstName}</strong></span></div>
        {/if}
      </div>

      <div class="topbar-r">
        {#if $navigating}
          <div class="load-pill"><Loader2 size={13} class="spin" /><span>Loading…</span></div>
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
            {#if unreadCount > 0}<span class="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>{/if}
          </button>

          {#if showNotifs}
            <div class="notif-drop" onclick={e => e.stopPropagation()}>
              <div class="notif-head">
                <span class="notif-head-title">Notifications</span>
                {#if unreadCount > 0}
                  <button class="mark-all" onclick={markAllRead} disabled={markingAll} type="button">
                    {#if markingAll}<Loader2 size={11} class="spin" />{:else}<CheckCheck size={11} />{/if}
                    Mark all read
                  </button>
                {/if}
              </div>
              <div class="notif-list">
                {#if !notifications.length}
                  <div class="notif-empty"><Bell size={28} strokeWidth={1.2} /><p>All caught up</p></div>
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
              {#if notifications.length > 0}
                <div class="notif-foot">
                  <a href="/student/notifications" onclick={() => showNotifs = false}>All notifications</a>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button class="icon-btn" type="button" onclick={toggleTheme} aria-label="Toggle theme">
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

    <main class="content">
      {@render children()}
    </main>
  </div>
</div>

<!-- Sign-out modal -->
{#if signOutOpen}
  <div class="modal-bg" onclick={e => { if (e.target === e.currentTarget) signOutOpen = false; }}>
    <div class="modal">
      <div class="modal-ico danger"><LogOut size={22} /></div>
      <h3>Sign out?</h3>
      <p>You'll need to sign in again to access your dashboard.</p>
      <div class="modal-row">
        <button class="btn-ghost" onclick={() => signOutOpen = false} type="button">Cancel</button>
        <form method="POST" action="/logout" style="flex:1">
          <button class="btn-danger" type="submit">Sign out</button>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Tokens ─────────────────────────────────────────────────────── */
  :root {
    --g50:  #f0fdf4;
    --g100: #dcfce7;
    --g400: #4ade80;
    --g500: #22c55e;
    --g600: #16a34a;
    --g700: #15803d;
    --g-soft: rgba(22, 163, 74, 0.08);
    --g-soft2: rgba(22, 163, 74, 0.15);
    --sw: 260px;     /* sidebar width */
    --sc: 64px;      /* collapsed */
    --th: 56px;      /* topbar height */
    --r: 10px;
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
    background: linear-gradient(135deg, var(--g500), var(--g700));
    display: flex; align-items: center; justify-content: center; color: #fff;
    box-shadow: 0 2px 8px rgba(21,128,61,0.3);
  }
  .brand-copy { display: flex; flex-direction: column; line-height: 1.25; overflow: hidden; }
  .brand-name { font-size: 0.875rem; font-weight: 800; color: var(--color-text); letter-spacing: -0.02em; white-space: nowrap; }
  .brand-name em { font-style: normal; color: var(--g600); }
  .brand-role { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-muted); white-space: nowrap; margin-top: 1px; }

  .tog-btn {
    width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .tog-btn:hover { border-color: var(--g600); color: var(--g600); }

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
  }
  .stat svg { color: var(--g600); }
  .stat-n { font-size: 0.8rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .stat-n.good { color: var(--g600); }
  .stat-l { font-size: 0.52rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); }
  .stat-div { width: 1px; height: 22px; background: var(--color-border); }

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
  }
  .nav-lnk:hover { color: var(--color-text); background: var(--color-bg); }
  .nav-lnk.active { color: var(--g700); font-weight: 700; background: var(--g-soft); }
  :global(.dark) .nav-lnk.active { color: var(--g400); }

  .nav-icon {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .nav-icon.active {
    background: var(--g600); color: #fff;
  }
  :global(.dark) .nav-icon.active { background: var(--g500); }

  .nav-label { flex: 1; }

  .badge-open {
    font-size: 0.58rem; font-weight: 800; padding: 0.1rem 0.4rem;
    border-radius: 20px; background: var(--g600); color: #fff;
    letter-spacing: 0.02em;
  }
  .badge-count {
    font-size: 0.58rem; font-weight: 800; padding: 0.1rem 0.4rem;
    border-radius: 20px; background: #dc2626; color: #fff;
  }
  .collapsed-dot {
    position: absolute; top: 6px; right: 6px;
    width: 6px; height: 6px; border-radius: 50%; background: var(--g600);
    border: 2px solid var(--color-surface);
  }

  .spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--color-border); border-top-color: var(--g600);
    animation: spin 0.65s linear infinite;
  }

  /* Sidebar footer */
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
  .profile-row:hover { border-color: var(--g600); background: var(--g-soft); }

  .avatar {
    position: relative; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--g500), var(--g700));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.6rem; font-weight: 800; color: #fff;
  }
  .online-pip {
    position: absolute; bottom: 0; right: 0;
    width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e; border: 2px solid var(--color-surface);
  }
  .profile-copy { display: flex; flex-direction: column; flex: 1; min-width: 0; line-height: 1.25; }
  .profile-name { font-size: 0.8rem; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .profile-sub  { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--g600); }
  .profile-arr  { color: var(--color-muted); transition: transform 0.15s; }
  .profile-row:hover .profile-arr { transform: translateX(2px); color: var(--g600); }

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
  .bc-lnk:hover { color: var(--g600); }
  .bc-cur { color: var(--color-text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bc-sep { color: var(--color-border); }

  .greet {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.3rem 0.7rem; background: var(--g-soft); border-radius: 20px;
    font-size: 0.78rem; color: var(--g700);
  }
  .greet strong { font-weight: 700; }
  :global(.dark) .greet { color: var(--g400); }

  .load-pill {
    display: flex; align-items: center; gap: 0.35rem;
    padding: 0.25rem 0.625rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 20px;
    font-size: 0.7rem; color: var(--color-muted);
  }

  .icon-btn {
    position: relative; width: 34px; height: 34px; border-radius: 8px;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .icon-btn:hover { border-color: var(--g600); color: var(--g600); }
  .icon-btn.notif-lit { border-color: rgba(22,163,74,0.4); color: var(--g600); }

  .notif-badge {
    position: absolute; top: -5px; right: -5px;
    background: #dc2626; color: #fff;
    font-size: 0.5rem; font-weight: 800; min-width: 15px; height: 15px;
    border-radius: 20px; display: flex; align-items: center; justify-content: center;
    padding: 0 2px; border: 2px solid var(--color-surface);
  }

  /* Notif dropdown */
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
  .notif-head-title { font-size: 0.82rem; font-weight: 700; color: var(--color-text); }
  .mark-all {
    display: flex; align-items: center; gap: 0.3rem;
    background: none; border: none; color: var(--g600);
    font-size: 0.7rem; font-weight: 600; cursor: pointer;
    padding: 0.2rem 0.4rem; border-radius: 6px; font-family: inherit;
  }
  .mark-all:hover { background: var(--g-soft); }
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
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
  }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: rgba(22,163,74,0.04); }
  .notif-pip { width: 6px; height: 6px; border-radius: 50%; background: transparent; margin-top: 5px; flex-shrink: 0; }
  .notif-pip.active { background: var(--g600); }
  .notif-body { flex: 1; min-width: 0; }
  .notif-t { font-size: 0.76rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .notif-m { font-size: 0.7rem; color: var(--color-muted); margin: 0 0 0.25rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .notif-time { font-size: 0.63rem; color: var(--color-muted); opacity: 0.65; }
  .notif-foot { padding: 0.5rem 1rem; border-top: 1px solid var(--color-border); text-align: center; }
  .notif-foot a { font-size: 0.72rem; font-weight: 600; color: var(--g600); text-decoration: none; }
  .notif-foot a:hover { text-decoration: underline; }

  /* Exam banner */
  .exam-banner {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.625rem 1.25rem;
    background: rgba(245,158,11,0.06); border-bottom: 1px solid rgba(245,158,11,0.2);
    border-left: 3px solid #f59e0b; color: #b45309; font-size: 0.78rem;
  }
  :global(.dark) .exam-banner { color: #fbbf24; }
  .eb-label { font-weight: 700; }
  .eb-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .eb-btn {
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.3rem 0.75rem; background: rgba(245,158,11,0.12);
    color: #b45309; border-radius: 20px; text-decoration: none;
    font-size: 0.72rem; font-weight: 700; flex-shrink: 0; transition: background 0.15s;
  }
  .eb-btn:hover { background: rgba(245,158,11,0.22); }

  .content { flex: 1; padding: 1.75rem 1.5rem; }
  @media (min-width: 1280px) { .content { padding: 2rem 2.5rem; } }

  /* ── Modal ──────────────────────────────────────────────────────── */
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
    width: 52px; height: 52px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin-bottom: 0.25rem;
  }
  .modal-ico.danger { background: rgba(220,38,38,0.08); color: #dc2626; border: 2px solid rgba(220,38,38,0.2); }
  .modal h3 { font-size: 1.05rem; font-weight: 800; color: var(--color-text); }
  .modal p { font-size: 0.8rem; color: var(--color-muted); line-height: 1.5; margin-bottom: 0.5rem; }
  .modal-row { display: flex; gap: 0.5rem; width: 100%; }
  .btn-ghost {
    flex: 1; padding: 0.6rem;
    border: 1.5px solid var(--color-border); border-radius: 8px;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.83rem; font-weight: 700; cursor: pointer; font-family: inherit;
  }
  .btn-ghost:hover { border-color: var(--color-text); }
  .btn-danger {
    width: 100%; padding: 0.6rem;
    background: #dc2626; border: none; border-radius: 8px;
    color: #fff; font-size: 0.83rem; font-weight: 700; cursor: pointer; font-family: inherit;
  }
  .btn-danger:hover { background: #b91c1c; }

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

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fade    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes dd-in   { from { opacity: 0; transform: translateY(-5px) scale(0.97); } to { opacity: 1; transform: none; } }
  @keyframes modal-up { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }
  :global(.spin) { animation: spin 0.7s linear infinite; }
</style>