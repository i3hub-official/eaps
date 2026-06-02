<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, Users, FileText, LogOut, Menu, X,
    Sun, Moon, ShieldAlert, ShieldCheck, GraduationCap,
    BookOpen, ChevronDown, LoaderCircle, ClipboardList,
    AlertTriangle, Activity, ScrollText, TrendingUp,
    BarChart3, Target, Award, School, Building2, Layers,
    Calendar, Clock, UserCheck, UserX, UserPlus, Bell,
    Shield, FileBarChart, BrainCircuit, BookMarked, Monitor,
    EyeOff, Fingerprint, Plus, Command, Search, Home,
    ChevronRight, Settings, Pin, RefreshCw, Info, Cpu,
    Database, HardDrive
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  // ── Persistent state via localStorage ───────────────────────────
  function loadStored<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
    catch { return fallback; }
  }
  function store(key: string, val: unknown) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  onMount(() => {
    initTheme();

    // Restore persisted state
    sidebarOpen      = loadStored('admin:sidebarOpen', false);
    usersExpanded    = loadStored('admin:usersExpanded', false);
    reportsExpanded  = loadStored('admin:reportsExpanded', false);
    pinnedItems      = loadStored<string[]>('admin:pinned', []);
    showQuickActions = loadStored('admin:quickActions', true);

    // Auto-expand groups based on current path
    if (isGroupChildActive(navGroups[1])) { usersExpanded = true; store('admin:usersExpanded', true); }
    if (isGroupChildActive(navGroups[3])) { reportsExpanded = true; store('admin:reportsExpanded', true); }

    // Keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); document.querySelector<HTMLInputElement>('.sidebar-search-input')?.focus(); }
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setSidebarOpen(!sidebarOpen); }
      if (e.ctrlKey && e.key === 'h') { e.preventDefault(); showShortcutsModal = true; }
    };
    window.addEventListener('keydown', onKey);

    // Idle detection — 25 min warning, 26 min auto-logout prompt
    let idleSeconds = 0;
    const resetIdle = () => { idleSeconds = 0; };
    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('keypress', resetIdle, { passive: true });
    window.addEventListener('click', resetIdle, { passive: true });
    const idleTick = setInterval(() => {
      idleSeconds++;
      if (idleSeconds === 25 * 60) { showTimeoutWarning = true; timeLeft = 60; startCountdown(); }
    }, 1000);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keypress', resetIdle);
      window.removeEventListener('click', resetIdle);
      clearInterval(idleTick);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  });

  let theme = $derived(getTheme());
  let sidebarOpen = $state(false);
  let navLoading = $state<string | null>(null);
  let showSignOutModal = $state(false);
  let showShortcutsModal = $state(false);
  let userMenuOpen = $state(false);
  let notificationsOpen = $state(false);
  let showTimeoutWarning = $state(false);
  let showQuickActions = $state(true);
  let searchQuery = $state('');
  let timeLeft = $state(60);
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let usersExpanded = $state(false);
  let reportsExpanded = $state(false);
  let pinnedItems = $state<string[]>([]);

  function setSidebarOpen(v: boolean) { sidebarOpen = v; store('admin:sidebarOpen', v); }
  function setUsersExpanded(v: boolean) { usersExpanded = v; store('admin:usersExpanded', v); }
  function setReportsExpanded(v: boolean) { reportsExpanded = v; store('admin:reportsExpanded', v); }
  function setShowQuickActions(v: boolean) { showQuickActions = v; store('admin:quickActions', v); }

  function togglePin(href: string) {
    const next = pinnedItems.includes(href)
      ? pinnedItems.filter(i => i !== href)
      : [...pinnedItems, href];
    pinnedItems = next;
    store('admin:pinned', next);
  }

  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(countdownTimer!);
        showTimeoutWarning = false;
        showSignOutModal = true;
      }
    }, 1000);
  }

  function extendSession() {
    showTimeoutWarning = false;
    if (countdownTimer) clearInterval(countdownTimer);
  }

  // ── Nav structure ────────────────────────────────────────────────
  const navGroups = [
    { href: '/admin',           label: 'Dashboard', icon: LayoutDashboard, children: null },
    { href: '/admin/users',     label: 'Users',     icon: Users, children: [
        { href: '/admin/users',                    label: 'All Users',      icon: Users },
        { href: '/admin/users?role=student',       label: 'Students',       icon: GraduationCap },
        { href: '/admin/users?role=lecturer',      label: 'Lecturers',      icon: BookOpen },
        { href: '/admin/users?role=invigilator',   label: 'Invigilators',   icon: ShieldCheck },
      ],
    },
    { href: '/admin/security',  label: 'Security',  icon: ShieldAlert, children: null },
    { href: '/admin/reports',   label: 'Reports',   icon: FileText, children: [
        { href: '/admin/reports',                          label: 'Overview',                  icon: Activity },
        { href: '/admin/reports/exam-performance',         label: 'Exam Performance',          icon: ClipboardList },
        { href: '/admin/reports/student-performance',      label: 'Student Performance',       icon: TrendingUp },
        { href: '/admin/reports/course-analysis',          label: 'Course Analysis',           icon: BookMarked },
        { href: '/admin/reports/question-analysis',        label: 'Question Analysis',         icon: BrainCircuit },
        { href: '/admin/reports/grade-distribution',       label: 'Grade Distribution',        icon: Award },
        { href: '/admin/reports/pass-fail',                label: 'Pass / Fail Analysis',      icon: Target },
        { href: '/admin/reports/time-score',               label: 'Time vs Score',             icon: Clock },
        { href: '/admin/reports/violations',               label: 'Violations Overview',       icon: AlertTriangle },
        { href: '/admin/reports/violation-trends',         label: 'Violation Trends',          icon: TrendingUp },
        { href: '/admin/reports/flagged-sessions',         label: 'Flagged Sessions',          icon: EyeOff },
        { href: '/admin/reports/security-incidents',       label: 'Security Incidents',        icon: Shield },
        { href: '/admin/reports/action-analysis',          label: 'Action Taken',              icon: FileBarChart },
        { href: '/admin/reports/user-overview',            label: 'User Overview',             icon: Users },
        { href: '/admin/reports/student-demographics',     label: 'Student Demographics',      icon: School },
        { href: '/admin/reports/lecturer-activity',        label: 'Lecturer Activity',         icon: BookOpen },
        { href: '/admin/reports/invigilator-assignments',  label: 'Invigilator Assignments',   icon: UserCheck },
        { href: '/admin/reports/registration-trends',      label: 'Registration Trends',       icon: UserPlus },
        { href: '/admin/reports/suspended-users',          label: 'Suspended Users',           icon: UserX },
        { href: '/admin/reports/college-performance',      label: 'College Performance',       icon: Building2 },
        { href: '/admin/reports/department-performance',   label: 'Department Performance',    icon: Layers },
        { href: '/admin/reports/level-analysis',           label: 'Level Analysis',            icon: BarChart3 },
        { href: '/admin/reports/course-enrollment',        label: 'Course Enrollment',         icon: BookMarked },
        { href: '/admin/reports/session-semester',         label: 'Session / Semester',        icon: Calendar },
        { href: '/admin/reports/audit-logs',               label: 'Audit Logs',                icon: ScrollText },
        { href: '/admin/reports/system-activity',          label: 'System Activity',           icon: Monitor },
        { href: '/admin/reports/login-history',            label: 'Login History',             icon: Fingerprint },
        { href: '/admin/reports/notification-analytics',   label: 'Notifications',             icon: Bell },
        { href: '/admin/reports/exam-scheduling',          label: 'Exam Scheduling',           icon: Calendar },
      ],
    },
  ] as const;

  // ── Active-state helpers ─────────────────────────────────────────
  const currentPath   = $derived($page.url.pathname);
  const currentSearch = $derived($page.url.search);

  function isActive(href: string, isChild = false): boolean {
    if (href === '/admin') return currentPath === '/admin';
    if (href === '/admin/users' && !isChild) return currentPath === '/admin/users' && !currentSearch;
    if (href.includes('?role=')) return currentPath === '/admin/users' && currentSearch === '?' + href.split('?')[1];
    if (href === '/admin/users' && isChild) return currentPath === '/admin/users' && !currentSearch;
    if (href === '/admin/reports' && !isChild) return currentPath === '/admin/reports';
    if (href === '/admin/reports' && isChild) return currentPath === '/admin/reports';
    if (href.startsWith('/admin/reports/')) return currentPath === href;
    if (href === '/admin/security') return currentPath === '/admin/security';
    return currentPath === href;
  }

  function isGroupChildActive(group: { children: readonly { href: string }[] | null }): boolean {
    if (!group.children) return false;
    return group.children.some(c => isActive(c.href, true));
  }

  // ── Breadcrumbs ──────────────────────────────────────────────────
  // Computed as plain const inside $derived — NOT called as a function
  const breadcrumbs = $derived(() => {
    const crumbs: { href: string; label: string }[] = [{ href: '/admin', label: 'Dashboard' }];
    const parts = currentPath.split('/').filter(p => p && p !== 'admin');
    let cur = '/admin';
    for (const part of parts) {
      cur += `/${part}`;
      const label = part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      crumbs.push({ href: cur, label });
    }
    return crumbs;
  });

  // ── Filtered nav for search ──────────────────────────────────────
  const filteredGroups = $derived(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return navGroups;
    return navGroups.map(g => {
      if (!g.children) return g.label.toLowerCase().includes(q) ? g : null;
      const kids = g.children.filter(c => c.label.toLowerCase().includes(q));
      if (!g.label.toLowerCase().includes(q) && kids.length === 0) return null;
      return { ...g, children: kids.length > 0 ? kids : g.children };
    }).filter(Boolean) as typeof navGroups;
  });

  // ── All nav items flat (for pinned lookup) ───────────────────────
  const allItems = $derived(
    navGroups.flatMap(g => g.children ? [g, ...g.children] : [g])
  );

  async function handleNavClick(href: string, e: MouseEvent) {
    e.preventDefault();
    if (navLoading) return;
    navLoading = href;
    setSidebarOpen(false);
    userMenuOpen = false;
    notificationsOpen = false;
    try { await goto(href); }
    finally { setTimeout(() => { navLoading = null; }, 300); }
  }
</script>

<svelte:head><title>Admin — MOUAU eTest</title></svelte:head>

<div class="layout">

  <!-- Session timeout warning -->
  {#if showTimeoutWarning}
    <div class="timeout-bar">
      <AlertTriangle size={16} />
      <span>Session expiring in <strong>{timeLeft}s</strong> due to inactivity</span>
      <button onclick={extendSession}>Stay logged in</button>
    </div>
  {/if}

  <!-- Mobile overlay -->
  {#if sidebarOpen}
    <div class="overlay" onclick={() => setSidebarOpen(false)}></div>
  {/if}

  <!-- ── Sidebar ───────────────────────────────────────────────── -->
  <aside class="sidebar" class:open={sidebarOpen}>

    <div class="sb-head">
      <div class="sb-logo">
        <div class="sb-logo-icon"><ShieldAlert size={20} /></div>
        <div>
          <p class="sb-logo-name">MOUAU eTest</p>
          <p class="sb-logo-tag">Admin</p>
        </div>
      </div>
      <button class="sb-close" onclick={() => setSidebarOpen(false)} aria-label="Close">
        <X size={18} />
      </button>
    </div>

    <!-- Search -->
    <div class="sb-search">
      <Search size={13} />
      <input
        type="text"
        class="sidebar-search-input"
        placeholder="Search… (Ctrl+K)"
        bind:value={searchQuery}
      />
    </div>

    <nav class="sb-nav">
      <!-- Pinned items -->
      {#if pinnedItems.length > 0}
        <div class="sb-section-label"><Pin size={11} /> Pinned</div>
        {#each pinnedItems as ph}
          {@const item = allItems.find(i => i.href === ph)}
          {#if item}
            <a
              href={item.href}
              class="nav-item"
              class:active={isActive(item.href, true)}
              onclick={(e) => handleNavClick(item.href, e)}
            >
              <span class="nav-item-icon"><item.icon size={16} /></span>
              <span class="nav-item-label">{item.label}</span>
              <button
                class="pin-action unpin"
                title="Unpin"
                onclick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(ph); }}
              ><X size={10} /></button>
            </a>
          {/if}
        {/each}
        <div class="sb-sep"></div>
      {/if}

      <!-- Nav groups -->
      {#each filteredGroups() as group (group.href)}
        {#if !group.children || group.children.length === 0}
          <div class="nav-group-wrap">
            <a
              href={group.href}
              class="nav-item"
              class:active={isActive(group.href)}
              class:loading={navLoading === group.href}
              onclick={(e) => handleNavClick(group.href, e)}
            >
              {#if navLoading === group.href}
                <span class="nav-item-icon spin"><LoaderCircle size={16} /></span>
              {:else}
                <span class="nav-item-icon"><group.icon size={16} /></span>
              {/if}
              <span class="nav-item-label">{group.label}</span>
              {#if !pinnedItems.includes(group.href)}
                <button
                  class="pin-action"
                  title="Pin"
                  onclick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(group.href); }}
                ><Pin size={10} /></button>
              {/if}
              {#if isActive(group.href)}<span class="active-dot"></span>{/if}
            </a>
          </div>
        {:else}
          {@const isUsers   = group.label === 'Users'}
          {@const isExpanded = isUsers ? usersExpanded : reportsExpanded}
          {@const childActive = isGroupChildActive(group)}
          <div class="nav-group-wrap" class:child-active={childActive}>
            <button
              class="nav-item nav-group-btn"
              class:child-active={childActive}
              onclick={() => isUsers ? setUsersExpanded(!usersExpanded) : setReportsExpanded(!reportsExpanded)}
            >
              <span class="nav-item-icon"><group.icon size={16} /></span>
              <span class="nav-item-label">{group.label}</span>
              <ChevronDown size={13} class="nav-chevron" style="transform: rotate({isExpanded ? '180deg' : '0deg'}); transition: transform .2s;" />
            </button>

            {#if isExpanded}
              <div class="nav-children">
                {#each group.children as child (child.href)}
                  <a
                    href={child.href}
                    class="nav-child"
                    class:active={isActive(child.href, true)}
                    class:loading={navLoading === child.href}
                    onclick={(e) => handleNavClick(child.href, e)}
                  >
                    {#if navLoading === child.href}
                      <span class="nav-item-icon spin"><LoaderCircle size={14} /></span>
                    {:else}
                      <span class="nav-item-icon"><child.icon size={14} /></span>
                    {/if}
                    <span class="nav-item-label">{child.label}</span>
                    {#if !pinnedItems.includes(child.href)}
                      <button
                        class="pin-action"
                        title="Pin"
                        onclick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(child.href); }}
                      ><Pin size={9} /></button>
                    {/if}
                    {#if isActive(child.href, true)}<span class="active-dot"></span>{/if}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </nav>

    {#if navLoading}
      <div class="sb-progress"><div class="sb-progress-bar"></div></div>
    {/if}

    <!-- Sidebar footer -->
    <div class="sb-foot">
      <button class="sb-shortcuts-btn" onclick={() => showShortcutsModal = true}>
        <Command size={13} /> Shortcuts
      </button>
      <div class="sb-user">
        <div class="sb-avatar">{data.user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}</div>
        <div class="sb-user-info">
          <span class="sb-user-name">{data.user?.fullName?.split(' ')[0] ?? 'Admin'}</span>
          <span class="sb-user-role">Administrator</span>
        </div>
        <button
          class="sb-signout-btn"
          title="Sign out"
          onclick={() => showSignOutModal = true}
        ><LogOut size={15} /></button>
      </div>
    </div>
  </aside>

  <!-- ── Main ──────────────────────────────────────────────────── -->
  <main class="main" class:sidebar-open={sidebarOpen}>

    <header class="topbar">
      <button class="menu-btn" onclick={() => setSidebarOpen(true)} aria-label="Menu">
        <Menu size={20} />
      </button>

      <!-- Breadcrumbs -->
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <Home size={13} class="bc-home" />
        {#each breadcrumbs() as crumb, i}
          {#if i > 0}<ChevronRight size={11} class="bc-sep" />{/if}
          <a
            href={crumb.href}
            class="bc-link"
            class:bc-current={i === breadcrumbs().length - 1}
            onclick={(e) => handleNavClick(crumb.href, e)}
          >{crumb.label}</a>
        {/each}
      </nav>

      <div class="topbar-right">
        {#if navLoading}
          <div class="topbar-loading">
            <span class="spin"><LoaderCircle size={14} /></span> Loading…
          </div>
        {/if}

        <!-- Notifications -->
        <div class="notif-wrap">
          <button class="icon-btn" onclick={() => { notificationsOpen = !notificationsOpen; userMenuOpen = false; }} aria-label="Notifications">
            <Bell size={16} />
          </button>
          {#if notificationsOpen}
            <div class="notif-panel">
              <div class="notif-head">Notifications <button onclick={() => notificationsOpen = false}><X size={14} /></button></div>
              <div class="notif-empty">No new notifications</div>
            </div>
          {/if}
        </div>

        <button class="icon-btn" onclick={toggleTheme} aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>

        <!-- User menu -->
        <div class="user-menu-wrap">
          <button class="topbar-user-btn" onclick={() => { userMenuOpen = !userMenuOpen; notificationsOpen = false; }}>
            <div class="tb-avatar">{data.user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}</div>
            <ChevronDown size={12} />
          </button>
          {#if userMenuOpen}
            <div class="user-menu-panel">
              <a href="/admin/profile"       onclick={(e) => handleNavClick('/admin/profile', e)}><Settings size={13} /> Profile</a>
              <a href="/admin/notifications" onclick={(e) => handleNavClick('/admin/notifications', e)}><Bell size={13} /> Notifications</a>
              <a href="/admin/preferences"   onclick={(e) => handleNavClick('/admin/preferences', e)}><Settings size={13} /> Preferences</a>
              <hr />
              <button onclick={() => { toggleTheme(); userMenuOpen = false; }}>
                {#if theme === 'dark'}<Sun size={13} /> Light Mode{:else}<Moon size={13} /> Dark Mode{/if}
              </button>
              <hr />
              <button class="signout-menu-btn" onclick={() => { userMenuOpen = false; showSignOutModal = true; }}>
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          {/if}
        </div>
      </div>
    </header>

    <div class="page-body">
      {@render children()}
    </div>

    <!-- Quick actions -->
    <div class="quick-actions" class:qa-visible={showQuickActions}>
      <button class="qa-btn" onclick={() => goto('/admin/exams/create')}><Plus size={15} /> New Exam</button>
      <button class="qa-btn" onclick={() => goto('/admin/users/create')}><UserPlus size={15} /> Add User</button>
      <button class="qa-btn" onclick={() => goto('/admin/reports')}><BarChart3 size={15} /> Reports</button>
      <button
        class="qa-toggle"
        onclick={() => setShowQuickActions(!showQuickActions)}
        title={showQuickActions ? 'Hide quick actions' : 'Show quick actions'}
      >
        {#if showQuickActions}▼{:else}▲{/if}
      </button>
    </div>
  </main>

  <!-- ── Sign-out modal ────────────────────────────────────────── -->
  {#if showSignOutModal}
    <div class="modal-bg" onclick={() => showSignOutModal = false} role="dialog" aria-modal="true">
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap"><LogOut size={22} /></div>
        <h2 class="modal-title">Sign out?</h2>
        <p class="modal-desc">You'll be returned to the login screen. Any unsaved changes will be lost.</p>
        <div class="modal-btns">
          <button class="modal-cancel" onclick={() => showSignOutModal = false}>Cancel</button>
          <form method="POST" action="/logout" style="flex:1;display:flex;">
            <button type="submit" class="modal-confirm"><LogOut size={13} /> Sign Out</button>
          </form>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── Shortcuts modal ───────────────────────────────────────── -->
  {#if showShortcutsModal}
    <div class="modal-bg" onclick={() => showShortcutsModal = false} role="dialog" aria-modal="true">
      <div class="modal shortcuts-modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-icon-wrap"><Command size={22} /></div>
        <h2 class="modal-title">Keyboard Shortcuts</h2>
        <div class="shortcuts">
          <div class="sc"><span><kbd>Ctrl</kbd>+<kbd>K</kbd></span><span>Focus search</span></div>
          <div class="sc"><span><kbd>Ctrl</kbd>+<kbd>B</kbd></span><span>Toggle sidebar</span></div>
          <div class="sc"><span><kbd>Ctrl</kbd>+<kbd>H</kbd></span><span>Show shortcuts</span></div>
        </div>
        <div class="modal-btns">
          <button class="modal-cancel" style="flex:1" onclick={() => showShortcutsModal = false}>Close</button>
        </div>
      </div>
    </div>
  {/if}

</div>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .layout { display: flex; min-height: 100vh; background: var(--color-bg); font-family: 'DM Sans', system-ui, sans-serif; }

  /* ── Timeout bar ─────────────────────────── */
  .timeout-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 400;
    background: #f59e0b; color: white;
    display: flex; align-items: center; gap: .75rem;
    padding: .5rem 1.5rem; font-size: .8rem; font-weight: 500;
  }
  .timeout-bar button {
    margin-left: auto; padding: .25rem .75rem;
    background: white; color: #92400e;
    border: none; border-radius: .375rem;
    font-size: .75rem; font-weight: 700; cursor: pointer;
  }

  /* ── Overlay ─────────────────────────────── */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.5);
    backdrop-filter: blur(2px); z-index: 99;
  }

  /* ── Sidebar ─────────────────────────────── */
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
    background: var(--color-surface); border-right: 1px solid var(--color-border);
    display: flex; flex-direction: column;
    transform: translateX(-100%);
    transition: transform .25s cubic-bezier(.16,1,.3,1);
    z-index: 100; overflow: hidden;
  }
  .sidebar.open { transform: translateX(0); }

  .sb-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .sb-logo { display: flex; align-items: center; gap: .625rem; }
  .sb-logo-icon {
    width: 34px; height: 34px; border-radius: .5rem;
    background: linear-gradient(135deg,#16a34a,#15803d);
    display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
  }
  .sb-logo-name { font-size: .85rem; font-weight: 800; color: var(--color-text); line-height: 1.2; }
  .sb-logo-tag  { font-size: .6rem; font-weight: 600; color: #16a34a; text-transform: uppercase; }
  .sb-close {
    background: none; border: none; color: var(--color-muted);
    cursor: pointer; padding: .25rem; border-radius: .25rem;
    display: flex; align-items: center;
  }
  .sb-close:hover { color: var(--color-text); background: var(--color-bg); }

  .sb-search {
    display: flex; align-items: center; gap: .5rem;
    margin: .625rem 1rem; padding: .45rem .75rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .5rem; flex-shrink: 0;
    transition: border-color .15s;
  }
  .sb-search:focus-within { border-color: #22c55e; }
  .sb-search input {
    background: none; border: none; outline: none;
    font-size: .78rem; color: var(--color-text); width: 100%; font-family: inherit;
  }
  .sb-search svg { color: var(--color-muted); flex-shrink: 0; }

  .sb-section-label {
    display: flex; align-items: center; gap: .375rem;
    padding: .5rem 1rem .25rem; font-size: .65rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted);
  }
  .sb-sep { height: .5rem; border-bottom: 1px solid var(--color-border); margin: 0 1rem .5rem; }

  .sb-nav {
    flex: 1; overflow-y: auto; padding: .5rem .75rem;
    display: flex; flex-direction: column; gap: .125rem; min-height: 0;
  }
  .sb-nav::-webkit-scrollbar { width: 3px; }
  .sb-nav::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  /* Nav items */
  .nav-group-wrap { display: flex; flex-direction: column; }
  .nav-item, .nav-group-btn, .nav-child {
    display: flex; align-items: center; gap: .625rem;
    padding: .55rem .75rem; border-radius: .5rem;
    font-size: .82rem; font-weight: 500;
    color: var(--color-text); text-decoration: none;
    background: none; border: none; cursor: pointer; width: 100%;
    text-align: left; position: relative; font-family: inherit;
    transition: background .1s;
  }
  .nav-item:hover, .nav-group-btn:hover, .nav-child:hover { background: var(--color-surface-hover); }
  .nav-item.active, .nav-child.active {
    background: rgba(22,163,74,.1); color: #16a34a; font-weight: 600;
  }
  .nav-item.loading, .nav-child.loading { opacity: .6; pointer-events: none; }
  .nav-group-btn.child-active { color: var(--color-text); font-weight: 600; }
  .nav-group-btn.child-active .nav-item-icon { color: #16a34a; }

  .nav-item-icon {
    display: flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; flex-shrink: 0; color: var(--color-muted);
  }
  .nav-item.active .nav-item-icon,
  .nav-child.active .nav-item-icon { color: #16a34a; }
  .nav-item-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .active-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #16a34a; flex-shrink: 0;
    animation: dot-pulse 2s ease-in-out infinite;
  }
  @keyframes dot-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

  .pin-action {
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: .2rem; border-radius: .25rem;
    display: flex; align-items: center;
    opacity: 0; transition: opacity .15s; flex-shrink: 0;
  }
  .pin-action.unpin { opacity: 1; }
  .nav-item:hover .pin-action,
  .nav-child:hover .pin-action { opacity: .7; }
  .pin-action:hover { opacity: 1 !important; color: #16a34a; }

  /* Children */
  .nav-children {
    display: flex; flex-direction: column; gap: .1rem;
    padding-left: 1.5rem; margin-top: .125rem;
    border-left: 2px solid var(--color-border);
    animation: slide-down .15s ease;
  }
  @keyframes slide-down { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  .nav-child { padding: .45rem .75rem; font-size: .78rem; color: var(--color-muted); }
  .nav-child:hover { color: var(--color-text); }

  /* Loading bar */
  .sb-progress { height: 2px; background: var(--color-border); flex-shrink: 0; overflow: hidden; }
  .sb-progress-bar { height: 100%; width: 35%; background: #16a34a; animation: progress-slide 1s ease-in-out infinite; }
  @keyframes progress-slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }

  /* Sidebar footer */
  .sb-foot {
    padding: .75rem 1rem; border-top: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: .5rem; flex-shrink: 0;
  }
  .sb-shortcuts-btn {
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    width: 100%; padding: .45rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .5rem;
    font-size: .72rem; font-weight: 500; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all .15s;
  }
  .sb-shortcuts-btn:hover { color: var(--color-text); border-color: #22c55e; }

  .sb-user {
    display: flex; align-items: center; gap: .625rem;
    padding: .5rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .625rem;
  }
  .sb-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg,#16a34a,#15803d);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: .8rem; color: white; flex-shrink: 0;
  }
  .sb-user-info { flex: 1; min-width: 0; }
  .sb-user-name { display: block; font-size: .78rem; font-weight: 600; color: var(--color-text); }
  .sb-user-role { display: block; font-size: .62rem; color: var(--color-muted); }
  .sb-signout-btn {
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: .25rem; border-radius: .375rem;
    display: flex; align-items: center; transition: color .15s;
  }
  .sb-signout-btn:hover { color: #dc2626; }

  /* ── Main ────────────────────────────────── */
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

  /* ── Topbar ──────────────────────────────── */
  .topbar {
    position: sticky; top: 0; z-index: 50;
    background: var(--color-surface); border-bottom: 1px solid var(--color-border);
    display: flex; align-items: center; gap: 1rem;
    padding: .625rem 1.5rem; height: 52px;
  }
  .menu-btn {
    background: none; border: none; color: var(--color-text);
    cursor: pointer; padding: .375rem; border-radius: .375rem;
    display: flex; align-items: center;
  }
  .menu-btn:hover { background: var(--color-surface-hover); }

  /* Breadcrumbs */
  .breadcrumbs { display: flex; align-items: center; gap: .25rem; flex: 1; overflow: hidden; }
  .bc-home { color: var(--color-muted); flex-shrink: 0; }
  .bc-sep  { color: var(--color-muted); flex-shrink: 0; }
  .bc-link {
    font-size: .78rem; color: var(--color-muted);
    text-decoration: none; white-space: nowrap;
    transition: color .15s;
  }
  .bc-link:hover { color: #16a34a; }
  .bc-link.bc-current { color: var(--color-text); font-weight: 600; }

  /* Topbar right */
  .topbar-right { display: flex; align-items: center; gap: .5rem; }
  .topbar-loading {
    display: flex; align-items: center; gap: .4rem;
    padding: .3rem .625rem; background: rgba(22,163,74,.1);
    border-radius: .375rem; font-size: .72rem; font-weight: 600; color: #16a34a;
  }
  .icon-btn {
    width: 34px; height: 34px; border-radius: .5rem;
    border: 1px solid var(--color-border); background: transparent;
    color: var(--color-text); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  .icon-btn:hover { background: var(--color-surface-hover); }

  /* Notifications */
  .notif-wrap { position: relative; }
  .notif-panel {
    position: absolute; top: 100%; right: 0; margin-top: .5rem;
    width: 280px; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: .75rem;
    box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 60; overflow: hidden;
  }
  .notif-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: .75rem 1rem; border-bottom: 1px solid var(--color-border);
    font-size: .8rem; font-weight: 600;
  }
  .notif-head button { background: none; border: none; cursor: pointer; color: var(--color-muted); display: flex; }
  .notif-empty { padding: 1.5rem; text-align: center; font-size: .78rem; color: var(--color-muted); }

  /* User menu */
  .user-menu-wrap { position: relative; }
  .topbar-user-btn {
    display: flex; align-items: center; gap: .375rem;
    padding: .375rem .625rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .5rem;
    cursor: pointer; transition: border-color .15s;
  }
  .topbar-user-btn:hover { border-color: #22c55e; }
  .tb-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    background: linear-gradient(135deg,#16a34a,#15803d);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: .72rem; color: white;
  }
  .user-menu-panel {
    position: absolute; top: 100%; right: 0; margin-top: .5rem;
    width: 200px; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: .625rem;
    box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 60; overflow: hidden;
  }
  .user-menu-panel a, .user-menu-panel button {
    display: flex; align-items: center; gap: .5rem;
    padding: .6rem .875rem; text-decoration: none;
    font-size: .78rem; color: var(--color-text);
    background: none; border: none; width: 100%;
    text-align: left; cursor: pointer; font-family: inherit;
    transition: background .1s;
  }
  .user-menu-panel a:hover, .user-menu-panel button:hover { background: var(--color-surface-hover); }
  .user-menu-panel hr { border: none; border-top: 1px solid var(--color-border); margin: .25rem 0; }
  .signout-menu-btn { color: #dc2626 !important; }
  .signout-menu-btn:hover { background: rgba(220,38,38,.08) !important; }

  /* ── Page body ───────────────────────────── */
  .page-body { flex: 1; padding: 2rem 1.5rem; }

  /* ── Quick actions ───────────────────────── */
  .quick-actions {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    display: flex; flex-direction: column; gap: .5rem;
    z-index: 40; align-items: flex-end;
    transform: translateX(140px); transition: transform .25s ease;
  }
  .quick-actions.qa-visible { transform: translateX(0); }
  .qa-btn {
    display: flex; align-items: center; gap: .5rem;
    padding: .55rem 1rem; background: #16a34a;
    border: none; border-radius: 2rem; color: white;
    font-size: .78rem; font-weight: 600; cursor: pointer; font-family: inherit;
    box-shadow: 0 4px 12px rgba(22,163,74,.35);
    transition: all .15s;
  }
  .qa-btn:hover { background: #15803d; transform: translateY(-2px); }
  .qa-toggle {
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--color-surface); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: .65rem; color: var(--color-muted);
    box-shadow: 0 2px 8px rgba(0,0,0,.1);
    align-self: flex-end;
  }

  /* ── Modals ──────────────────────────────── */
  .modal-bg {
    position: fixed; inset: 0; background: rgba(0,0,0,.55);
    backdrop-filter: blur(4px); z-index: 200;
    display: flex; align-items: center; justify-content: center;
    padding: 1rem; animation: fade-in .15s ease;
  }
  @keyframes fade-in { from{opacity:0} to{opacity:1} }
  .modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 2rem 1.75rem 1.5rem;
    width: 100%; max-width: 380px;
    display: flex; flex-direction: column; align-items: center; gap: .75rem;
    box-shadow: 0 20px 60px rgba(0,0,0,.25);
    animation: slide-up .2s cubic-bezier(.16,1,.3,1);
  }
  @keyframes slide-up { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  .modal-icon-wrap {
    width: 46px; height: 46px; border-radius: 50%;
    background: rgba(22,163,74,.1); color: #16a34a;
    display: flex; align-items: center; justify-content: center;
  }
  .modal-title { font-size: 1.05rem; font-weight: 700; color: var(--color-text); }
  .modal-desc  { font-size: .8rem; color: var(--color-muted); text-align: center; line-height: 1.55; }
  .modal-btns  { display: flex; gap: .625rem; width: 100%; margin-top: .25rem; }
  .modal-cancel {
    flex: 1; padding: .625rem; background: transparent;
    border: 1px solid var(--color-border); border-radius: .5rem;
    color: var(--color-text); font-size: .85rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
  }
  .modal-cancel:hover { background: var(--color-surface-hover); }
  .modal-confirm {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: .375rem;
    padding: .625rem; background: #dc2626; border: none; border-radius: .5rem;
    color: white; font-size: .85rem; font-weight: 600; cursor: pointer; font-family: inherit;
  }
  .modal-confirm:hover { background: #b91c1c; }
  .modal-btns form { flex: 1; display: flex; }

  .shortcuts-modal { max-width: 320px; }
  .shortcuts { width: 100%; display: flex; flex-direction: column; gap: .125rem; }
  .sc {
    display: flex; justify-content: space-between; align-items: center;
    padding: .5rem .25rem; font-size: .75rem;
    border-bottom: 1px solid var(--color-border);
  }
  .sc:last-child { border-bottom: none; }
  kbd {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .25rem; padding: .15rem .4rem;
    font-family: monospace; font-size: .68rem; font-weight: 600;
  }

  .spin { animation: spin .7s linear infinite; display: flex; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Desktop ─────────────────────────────── */
  @media (min-width: 1024px) {
    .sidebar { transform: translateX(0); width: 256px; }
    .sidebar.open { transform: translateX(0); }
    .overlay { display: none; }
    .sb-close { display: none; }
    .menu-btn { display: none; }
    .main { margin-left: 256px; }
  }
  @media (min-width: 1280px) {
    .sidebar { width: 272px; }
    .main { margin-left: 272px; }
    .page-body { padding: 2rem 2.5rem; }
  }
</style>