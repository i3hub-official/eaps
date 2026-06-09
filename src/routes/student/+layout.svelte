<!-- src/routes/(student)/+layout.svelte -->
<script lang="ts">
  import { page, navigating } from '$app/stores';
  import { onMount } from 'svelte';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import type { LayoutData } from './$types';
  import {
    LayoutDashboard, LogOut, Sun, Moon,
    Hash, Layers, GraduationCap, ShieldCheck,
    ChevronRight, X, BarChart2, Bell, CheckCheck,
    Loader2, BookOpen, Clock, Award, ClipboardList,
    Calendar, FileText, UserCircle, AlertTriangle,
    Phone, MapPin, Flag, VenusAndMars, Cake, Building2,
    Fingerprint, Eye, IdCard, School, Menu,
    CheckCircle2, XCircle, Timer, TrendingUp
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme        = $derived(getTheme());
  let bioOpen      = $state(false);
  let signOutOpen  = $state(false);
  let collapsed    = $state(false);
  let mobileOpen   = $state(false);   // mobile drawer
  let showNotifs   = $state(false);
  let notifications = $state<any[]>(data.notifications ?? []);
  let markingAll   = $state(false);
  let notifLoading = $state(false);

  const unreadCount = $derived(notifications.filter(n => !n.isRead).length);

  onMount(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) collapsed = JSON.parse(saved);
  });

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
    }
  });

  // Close mobile drawer on navigation
  $effect(() => {
    if ($navigating) mobileOpen = false;
  });

  // ── Navigation links ───────────────────────────────────────────
  const links = [
    { href: '/student',                   label: 'Dashboard',           icon: LayoutDashboard, exact: true  },
    { href: '/student/exams',             label: 'My Exams',            icon: ClipboardList,   exact: false },
    { href: '/student/results',           label: 'My Results',          icon: BarChart2,       exact: false },
    { href: '/student/courses/register',  label: 'Course Registration', icon: BookOpen,        exact: false },
  ];

  const currentPath = $derived($page.url.pathname);

  // Fixed: exact match for dashboard, prefix match for others
  function isActive(href: string, exact: boolean) {
    if (exact) return currentPath === href;
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  // ── Breadcrumb ─────────────────────────────────────────────────
  const breadcrumbs = $derived((() => {
    const parts = currentPath.replace(/^\/student/, '').split('/').filter(Boolean);
    if (parts.length === 0) return [];
    const crumbs: { label: string; href: string }[] = [{ label: 'Home', href: '/student' }];
    const map: Record<string, string> = {
      results:  'My Results',
      exams:    'My Exams',
      courses:  'Courses',
      register: 'Registration',
      exam:     'Exam Session',
      complete: 'Complete',
      upcoming: 'Upcoming',
      history:  'History',
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

  // ── Initials ───────────────────────────────────────────────────
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

  // ── Stats ──────────────────────────────────────────────────────
  const activeExams          = $derived(data.stats?.activeExams ?? 0);
  const totalResults         = $derived(data.stats?.totalResults ?? 0);
  const pendingRegistrations = $derived(data.stats?.pendingRegistrations ?? 0);
  const upcomingExams        = $derived(data.stats?.upcomingExams ?? 0);

  // ── Notifications ──────────────────────────────────────────────
  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    markingAll = true;
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) notifications = notifications.map(n => ({ ...n, isRead: true }));
    } catch { /* silent */ }
    finally { markingAll = false; }
  }

  async function markOneRead(id: string) {
    const notif = notifications.find(n => n.id === id);
    if (!notif || notif.isRead) return;
    notifications = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {
      notifications = notifications.map(n => n.id === id ? { ...n, isRead: false } : n);
    }
  }

  async function deleteNotification(id: string, e: Event) {
    e.stopPropagation();
    notifLoading = true;
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) notifications = notifications.filter(n => n.id !== id);
    } catch { /* silent */ }
    finally { notifLoading = false; }
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
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(date).toLocaleDateString();
  }

  // ── Bio sections ───────────────────────────────────────────────
  const bioSections = $derived(() => {
    const u = data.user;
    const sections: { title: string; icon: any; fields: { label: string; value: string; icon: any }[] }[] = [];

    const personal = [];
    if (u.fullName)     personal.push({ label: 'Full Name',      value: u.fullName, icon: UserCircle });
    if (u.email)        personal.push({ label: 'Email',          value: u.email, icon: FileText });
    if (u.phone)        personal.push({ label: 'Phone',          value: u.phone, icon: Phone });
    if (u.gender)       personal.push({ label: 'Gender',         value: u.gender, icon: VenusAndMars });
    if (u.dateOfBirth)  personal.push({ label: 'Date of Birth',  value: new Date(u.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), icon: Cake });
    if (personal.length) sections.push({ title: 'Personal Information', icon: UserCircle, fields: personal });

    const academic = [];
    if (u.matricNumber) academic.push({ label: 'Matric Number',      value: u.matricNumber, icon: Hash });
    if (u.jambRegNo)    academic.push({ label: 'JAMB Reg. No',        value: u.jambRegNo, icon: IdCard });
    if (u.level)        academic.push({ label: 'Level',               value: `${u.level.level ?? u.level.name ?? '—'} Level`, icon: TrendingUp });
    if (u.session)      academic.push({ label: 'Academic Session',    value: u.session, icon: Calendar });
    if (u.department?.name) academic.push({ label: 'Department',      value: u.department.name, icon: BookOpen });
    if (u.college?.name)    academic.push({ label: 'College',         value: u.college.name, icon: School });
    if (academic.length) sections.push({ title: 'Academic Information', icon: GraduationCap, fields: academic });

    const location = [];
    if (u.nationality)   location.push({ label: 'Nationality',    value: u.nationality, icon: Flag });
    if (u.stateOfOrigin) location.push({ label: 'State of Origin', value: u.stateOfOrigin, icon: MapPin });
    if (u.lga)           location.push({ label: 'LGA',             value: u.lga, icon: Building2 });
    if (u.address)       location.push({ label: 'Address',         value: u.address, icon: MapPin });
    if (location.length) sections.push({ title: 'Location', icon: MapPin, fields: location });

    const account = [];
    if (u.createdAt) account.push({ label: 'Account Created', value: new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), icon: Calendar });
    if (u.updatedAt) account.push({ label: 'Last Updated',    value: new Date(u.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), icon: Timer });
    account.push({ label: 'Status',          value: u.isActive ? 'Active' : 'Inactive',      icon: u.isActive ? CheckCircle2 : XCircle });
    account.push({ label: 'Face Enrollment', value: u.enrolled ? 'Enrolled' : 'Not Enrolled', icon: u.enrolled ? Fingerprint : Eye });
    if (account.length) sections.push({ title: 'Account Details', icon: ShieldCheck, fields: account });

    return sections;
  });

  let bioScrollContainer: HTMLDivElement;
  function scrollToSection(index: number) {
    const sects = bioScrollContainer?.querySelectorAll('.bio-section');
    if (sects?.[index]) sects[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<!-- Mobile overlay -->
{#if mobileOpen}
  <div class="mobile-overlay" onclick={() => mobileOpen = false} aria-hidden="true"></div>
{/if}

<div class="layout" class:collapsed>

  <!-- ══ SIDEBAR ═════════════════════════════════════════════════ -->
  <aside class="sidebar" class:collapsed class:mobile-open={mobileOpen}>

    <!-- Brand -->
    <div class="sidebar-top">
      <a href="/student" class="brand" aria-label="MOUAU eTest home">
        <div class="brand-mark"><GraduationCap size={18} /></div>
        {#if !collapsed}
          <div class="brand-text">
            <span class="brand-name">MOUAU eTest</span>
            <span class="brand-sub">Student Portal</span>
          </div>
        {/if}
      </a>
      <button
        class="collapse-btn desktop-only"
        type="button"
        onclick={() => collapsed = !collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
          <ChevronRight size={14} class={collapsed ? 'rotated' : ''} />
      </button>
      <button
        class="close-mobile-btn mobile-only"
        type="button"
        onclick={() => mobileOpen = false}
        aria-label="Close menu"
      >
        <X size={15} />
      </button>
    </div>

    <!-- Stats strip -->
    {#if !collapsed}
      <div class="stats-strip">
        <div class="stat-pill" class:active={activeExams > 0}>
          <div class="stat-dot" class:pulse={activeExams > 0}></div>
          <span class="stat-num">{activeExams}</span>
          <span class="stat-lbl">Active</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <Calendar size={10} />
          <span class="stat-num">{upcomingExams}</span>
          <span class="stat-lbl">Upcoming</span>
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
      {#each links as { href, label, icon: Icon, exact }}
        {@const active = isActive(href, exact)}
        <a
          {href}
          class="nav-link"
          class:active
          class:loading={$navigating?.to?.url.pathname === href}
          aria-current={active ? 'page' : undefined}
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
            {#if href === '/student/courses/register' && pendingRegistrations > 0}
              <span class="nav-badge">{pendingRegistrations}</span>
            {/if}
          {/if}
          {#if active}
            <span class="active-pip" aria-hidden="true"></span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Bottom -->
    <div class="sidebar-bottom">
      <button class="icon-btn theme-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
        {#if theme === 'dark'}<Sun size={15} />{:else}<Moon size={15} />{/if}
        {#if !collapsed}<span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>{/if}
      </button>

      <button class="avatar-btn" onclick={() => bioOpen = true} type="button" aria-label="View profile">
        <div class="avatar"><span>{initials()}</span></div>
        {#if !collapsed}
          <div class="avatar-info">
            <span class="avatar-name">{displayName()}</span>
            <span class="avatar-role">Student</span>
          </div>
          <ChevronRight size={12} class="avatar-chevron" />
        {/if}
      </button>

      <button class="icon-btn signout-btn" type="button" onclick={() => signOutOpen = true} aria-label="Sign out">
        <LogOut size={15} />
        {#if !collapsed}<span>Sign Out</span>{/if}
      </button>
    </div>
  </aside>

  <!-- ══ MAIN ═════════════════════════════════════════════════════ -->
  <div class="layout-main">

    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-left">
        <!-- Mobile menu button -->
        <button
          class="topbar-btn mobile-menu-btn mobile-only"
          onclick={() => mobileOpen = true}
          type="button"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {#if breadcrumbs.length > 0}
          <nav class="breadcrumb" aria-label="Breadcrumb">
            {#each breadcrumbs as crumb, i}
              {#if i > 0}<ChevronRight size={11} class="bc-sep" />{/if}
              {#if i === breadcrumbs.length - 1}
                <span class="bc-current">{crumb.label}</span>
              {:else}
                <a href={crumb.href} class="bc-link">{crumb.label}</a>
              {/if}
            {/each}
          </nav>
        {:else}
          <span class="topbar-greeting">
            Welcome back, <strong>{displayName()}</strong>
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

        <!-- Notifications -->
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
                <div class="notif-head-left">
                  <span class="notif-title">Notifications</span>
                  {#if unreadCount > 0}
                    <span class="notif-unread-count">{unreadCount} new</span>
                  {/if}
                </div>
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
                    <Bell size={28} strokeWidth={1.5} />
                    <p class="notif-empty-title">All caught up</p>
                    <p class="notif-empty-sub">No notifications to show</p>
                  </div>
                {:else}
                  {#each notifications as n (n.id)}
                    <div
                      class="notif-item"
                      class:unread={!n.isRead}
                      role="button"
                      tabindex="0"
                      onclick={() => markOneRead(n.id)}
                    >
                      <div class="notif-dot-col">
                        {#if !n.isRead}<div class="notif-dot"></div>{/if}
                      </div>
                      <div class="notif-body">
                        <p class="notif-item-title">{n.title}</p>
                        <p class="notif-item-msg">{n.message}</p>
                        <div class="notif-item-meta">
                          <span class="notif-item-time">{relativeTime(n.createdAt)}</span>
                          {#if n.type}<span class="notif-item-type">{n.type}</span>{/if}
                        </div>
                      </div>
                      <button
                        class="notif-delete"
                        onclick={(e) => deleteNotification(n.id, e)}
                        type="button"
                        aria-label="Delete"
                      ><X size={12} /></button>
                    </div>
                  {/each}
                {/if}
              </div>
              {#if notifications.length > 0}
                <div class="notif-foot">
                  <a href="/student/notifications" onclick={() => showNotifs = false} class="notif-all-link">
                    View all <ChevronRight size={12} />
                  </a>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <button class="topbar-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>
      </div>
    </header>

    <!-- Active exam banner -->
    {#if data.activeExamSession}
      <div class="exam-alert-banner">
        <AlertTriangle size={15} />
        <div class="exam-alert-content">
          <span class="exam-alert-title">Active Exam Session</span>
          <span class="exam-alert-course">{data.activeExamSession.examTitle}</span>
        </div>
        <a href={`/student/exam/${data.activeExamSession.id}`} class="exam-alert-btn">
          <Clock size={13} /> Resume Exam
        </a>
      </div>
    {/if}

    <main class="page-content">
      {@render children()}
    </main>
  </div>
</div>

<!-- ══ SIGN OUT MODAL ════════════════════════════════════════════ -->
{#if signOutOpen}
  <div
    class="modal-backdrop"
    role="dialog" aria-modal="true" aria-labelledby="signout-title"
    onclick={(e) => { if (e.target === e.currentTarget) signOutOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') signOutOpen = false; }}
  >
    <div class="confirm-modal">
      <div class="confirm-icon"><LogOut size={24} /></div>
      <h2 id="signout-title">Sign out?</h2>
      <p>You'll need to sign in again to access your exams and results.</p>
      <div class="confirm-actions">
        <button class="btn-cancel" type="button" onclick={() => signOutOpen = false}>Cancel</button>
        <form method="POST" action="/logout" style="flex:1">
          <button type="submit" class="btn-signout"><LogOut size={14} /> Yes, sign out</button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- ══ BIO MODAL ════════════════════════════════════════════════ -->
{#if bioOpen}
  <div
    class="modal-backdrop bio-backdrop"
    role="dialog" aria-modal="true" aria-labelledby="bio-title"
    onclick={(e) => { if (e.target === e.currentTarget) bioOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') bioOpen = false; }}
  >
    <div class="bio-modal">
      <div class="bio-top-bar"></div>

      <div class="bio-header">
        <div class="bio-avatar-wrap">
          <div class="bio-avatar"><span>{initials()}</span></div>
          <div class="bio-ring" aria-hidden="true"></div>
          {#if data.user.enrolled}
            <div class="bio-verified-badge" title="Face enrolled"><ShieldCheck size={10} /></div>
          {/if}
        </div>
        <div class="bio-header-info">
          <h2 id="bio-title">{data.user.fullName}</h2>
          <div class="bio-chips">
            <span class="chip chip-green"><GraduationCap size={10} /> Student</span>
            <span class="chip" class:chip-active={data.user.isActive} class:chip-inactive={!data.user.isActive}>
              <ShieldCheck size={10} /> {data.user.isActive ? 'Active' : 'Inactive'}
            </span>
            {#if data.user.level}
              <span class="chip chip-blue">
                <Layers size={10} /> {data.user.level?.level ?? data.user.level?.name ?? '—'} LEVEL
              </span>
            {/if}
            {#if data.user.enrolled}
              <span class="chip chip-teal"><Fingerprint size={10} /> Face Enrolled</span>
            {/if}
          </div>
        </div>
        <button class="bio-close" onclick={() => bioOpen = false} type="button" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div class="bio-nav">
        {#each bioSections() as section, i}
          <button class="bio-nav-item" onclick={() => scrollToSection(i)} type="button">
            <svelte:component this={section.icon} size={12} />
            {section.title}
          </button>
        {/each}
      </div>

      <div class="bio-body" bind:this={bioScrollContainer}>
        {#each bioSections() as section}
          <div class="bio-section">
            <div class="bio-section-header">
              <svelte:component this={section.icon} size={14} />
              <h3>{section.title}</h3>
            </div>
            <div class="bio-section-grid">
              {#each section.fields as field}
                <div class="bio-field">
                  <div class="bio-field-icon">
                    <svelte:component this={field.icon} size={13} />
                  </div>
                  <div class="bio-field-content">
                    <p class="bio-field-label">{field.label}</p>
                    <p class="bio-field-value" class:mono={field.label === 'Matric Number' || field.label === 'JAMB Reg. No'}>
                      {field.value}
                    </p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <div class="bio-footer">
        <button type="button" class="bio-btn-primary" onclick={() => { bioOpen = false; }}>
          <CheckCircle2 size={13} /> Done
        </button>
        <button type="button" class="bio-btn-danger" onclick={() => { bioOpen = false; signOutOpen = true; }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Tokens ──────────────────────────────────────────────────── */
  :root {
    --green-400: #4ade80;
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-soft: rgba(34,197,94,0.08);
    --blue-500:   #3b82f6;
    --blue-soft:  rgba(59,130,246,0.08);
    --teal-500:   #14b8a6;
    --teal-soft:  rgba(20,184,166,0.08);
    --sidebar-w:         240px;
    --sidebar-collapsed: 60px;
    --topbar-h:          52px;
    --radius-card:  0.875rem;
    --radius-btn:   0.6rem;
    --transition:   0.22s cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Layout grid ─────────────────────────────────────────────── */
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

  /* ── Helpers ─────────────────────────────────────────────────── */
  .desktop-only { display: flex; }
  .mobile-only  { display: none; }

  /* ══ SIDEBAR ════════════════════════════════════════════════════ */
  .sidebar {
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    height: 100vh;
    position: sticky;
    top: 0;
    overflow: hidden;
    width: var(--sidebar-w);
    transition: width var(--transition);
    z-index: 50;
    flex-shrink: 0;
  }
  .sidebar.collapsed { width: var(--sidebar-collapsed); }

  /* ── Brand ───────────────────────────────────────────────────── */
  .sidebar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0.75rem 0.875rem;
    border-bottom: 1px solid var(--color-border);
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-decoration: none;
    min-width: 0;
    overflow: hidden;
  }
  .brand-mark {
    width: 34px; height: 34px;
    border-radius: 0.625rem; flex-shrink: 0;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
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
    color: var(--green-600); text-transform: uppercase;
    white-space: nowrap; margin-top: 1px;
  }

  .collapse-btn, .close-mobile-btn {
    width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .collapse-btn:hover, .close-mobile-btn:hover {
    border-color: var(--green-600); color: var(--green-600);
  }
  .collapse-btn :global(.rotated) { transform: rotate(180deg); }

  /* ── Stats strip ─────────────────────────────────────────────── */
  .stats-strip {
    display: flex; align-items: center;
    margin: 0.625rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    overflow: hidden; flex-shrink: 0;
  }
  .stat-pill {
    flex: 1; display: flex; align-items: center; justify-content: center;
    gap: 0.3rem; padding: 0.5rem;
    color: var(--color-muted); font-size: 0.68rem;
  }
  .stat-pill.active { background: var(--green-soft); }
  .stat-num  { font-weight: 800; font-size: 0.8rem; color: var(--color-text); }
  .stat-lbl  { font-size: 0.62rem; color: var(--color-muted); }
  .stat-divider { width: 1px; height: 24px; background: var(--color-border); }
  .stat-dot  { width: 6px; height: 6px; border-radius: 50%; background: var(--color-border); }
  .stat-dot.pulse {
    background: var(--green-500);
    animation: dot-pulse 2s ease-in-out infinite;
  }
  @keyframes dot-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    50%      { box-shadow: 0 0 0 4px rgba(34,197,94,0); }
  }

  /* ── Nav ─────────────────────────────────────────────────────── */
  .sidebar-nav {
    flex: 1;
    padding: 0.5rem 0.625rem;
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
  :global([data-theme="dark"]) .nav-link.active { color: var(--green-400); }

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
  :global([data-theme="dark"]) .active-pip { background: var(--green-400); }

  .nav-badge {
    background: #dc2626; color: white;
    font-size: 0.6rem; font-weight: 800;
    min-width: 16px; height: 16px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 4px; flex-shrink: 0;
  }

  .nav-link.loading { pointer-events: none; opacity: 0.6; }
  .nav-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--color-border);
    border-top-color: var(--green-600);
    animation: spin 0.6s linear infinite;
  }

  /* ── Sidebar bottom ──────────────────────────────────────────── */
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
  .avatar-name {
    font-size: 0.78rem; font-weight: 700; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .avatar-role {
    font-size: 0.57rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px;
  }
  .avatar-chevron { color: var(--color-muted); flex-shrink: 0; }

  /* ══ MAIN ════════════════════════════════════════════════════════ */
  .layout-main {
    display: flex; flex-direction: column;
    min-width: 0; min-height: 100vh;
  }

  /* ── Topbar ──────────────────────────────────────────────────── */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    height: var(--topbar-h); padding: 0 1.25rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    position: sticky; top: 0; z-index: 40;
    gap: 1rem;
  }
  .topbar-left  { display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1; }
  .topbar-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

  .topbar-btn {
    width: 34px; height: 34px; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: none;
    color: var(--color-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .topbar-btn:hover { border-color: var(--green-600); color: var(--green-600); background: var(--green-soft); }

  .mobile-menu-btn { border: none; background: none; }
  .mobile-menu-btn:hover { border: none; background: var(--color-bg); }

  /* Breadcrumb */
  .breadcrumb {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.78rem; min-width: 0; overflow: hidden;
  }
  .bc-link {
    color: var(--color-muted); text-decoration: none; white-space: nowrap;
    transition: color 0.12s;
  }
  .bc-link:hover { color: var(--green-600); }
  .bc-current {
    color: var(--color-text); font-weight: 600; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  :global(.bc-sep) { color: var(--color-muted); flex-shrink: 0; }

  .topbar-greeting { font-size: 0.82rem; color: var(--color-muted); }
  .topbar-greeting strong { color: var(--color-text); }

  .nav-loading-pill {
    display: flex; align-items: center; gap: 0.375rem;
    padding: 0.3rem 0.75rem; border-radius: 999px;
    background: var(--color-bg); border: 1px solid var(--color-border);
    font-size: 0.72rem; color: var(--color-muted);
  }

  /* Notifications */
  .notif-wrap { position: relative; }
  .notif-btn  { position: relative; }
  .notif-btn.has-unread { color: var(--green-600); border-color: var(--green-600); }
  .notif-badge {
    position: absolute; top: -5px; right: -5px;
    background: #ef4444; color: white;
    font-size: 0.55rem; font-weight: 800;
    min-width: 15px; height: 15px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 3px; border: 2px solid var(--color-surface);
  }

  .notif-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    width: 340px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    z-index: 100; overflow: hidden;
    animation: dd-in 0.15s ease;
  }
  @keyframes dd-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .notif-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1rem; border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .notif-head-left { display: flex; align-items: center; gap: 0.5rem; }
  .notif-title { font-size: 0.85rem; font-weight: 700; color: var(--color-text); }
  .notif-unread-count {
    font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.45rem;
    background: var(--green-soft); color: var(--green-600);
    border-radius: 999px;
  }
  .mark-all-btn {
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.3rem 0.625rem; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: none;
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .mark-all-btn:hover { border-color: var(--green-600); color: var(--green-600); }
  .mark-all-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .notif-list { max-height: 360px; overflow-y: auto; }
  .notif-list::-webkit-scrollbar { width: 3px; }
  .notif-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .notif-empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 2.5rem 1rem; color: var(--color-muted); text-align: center;
  }
  .notif-empty-title { font-size: 0.85rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .notif-empty-sub   { font-size: 0.75rem; margin: 0; }

  .notif-item {
    display: flex; align-items: flex-start; gap: 0.625rem;
    padding: 0.75rem 1rem; cursor: pointer;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-bg); }
  .notif-item.unread { background: rgba(34,197,94,0.03); }

  .notif-dot-col { width: 16px; flex-shrink: 0; padding-top: 4px; }
  .notif-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green-500); }

  .notif-body { flex: 1; min-width: 0; }
  .notif-item-title { font-size: 0.8rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.2rem; }
  .notif-item-msg   { font-size: 0.75rem; color: var(--color-muted); margin: 0 0 0.3rem; line-height: 1.4; }
  .notif-item-meta  { display: flex; align-items: center; gap: 0.5rem; }
  .notif-item-time  { font-size: 0.68rem; color: var(--color-muted); }
  .notif-item-type  {
    font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
    padding: 0.1rem 0.35rem; border-radius: 0.25rem;
    background: var(--color-border); color: var(--color-muted);
  }

  .notif-delete {
    width: 22px; height: 22px; border-radius: 0.3rem; flex-shrink: 0;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .notif-delete:hover { background: rgba(220,38,38,0.1); color: #dc2626; }

  .notif-foot {
    padding: 0.5rem; border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .notif-all-link {
    display: flex; align-items: center; justify-content: center; gap: 0.25rem;
    padding: 0.45rem; border-radius: 0.45rem;
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: all 0.15s;
  }
  .notif-all-link:hover { background: var(--green-soft); color: var(--green-600); }

  /* ── Exam alert banner ───────────────────────────────────────── */
  .exam-alert-banner {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.625rem 1.25rem;
    background: rgba(245,158,11,0.08);
    border-bottom: 1px solid rgba(245,158,11,0.2);
    color: #92400e;
    font-size: 0.82rem;
  }
  :global([data-theme="dark"]) .exam-alert-banner { color: #fcd34d; }
  .exam-alert-content { display: flex; align-items: center; gap: 0.625rem; flex: 1; min-width: 0; }
  .exam-alert-title   { font-weight: 700; white-space: nowrap; }
  .exam-alert-course  { color: inherit; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .exam-alert-btn {
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.375rem 0.875rem; border-radius: 0.45rem;
    background: rgba(245,158,11,0.15); color: #92400e;
    text-decoration: none; font-size: 0.78rem; font-weight: 700;
    white-space: nowrap; transition: all 0.15s; flex-shrink: 0;
  }
  :global([data-theme="dark"]) .exam-alert-btn { color: #fcd34d; background: rgba(245,158,11,0.2); }
  .exam-alert-btn:hover { background: rgba(245,158,11,0.25); }

  /* ── Page content ────────────────────────────────────────────── */
  .page-content { flex: 1; padding: 1.5rem; overflow-x: hidden; }

  /* ── Mobile overlay ──────────────────────────────────────────── */
  .mobile-overlay {
    display: none;
    position: fixed; inset: 0; z-index: 49;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(2px);
    animation: fade-in 0.2s ease;
  }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

  /* ══ SIGN OUT MODAL ════════════════════════════════════════════ */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .confirm-modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.5rem;
    max-width: 380px; width: 100%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: scale-in 0.15s ease;
  }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .confirm-icon {
    width: 48px; height: 48px; border-radius: 0.75rem;
    background: rgba(220,38,38,0.08); color: #dc2626;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1rem;
  }
  .confirm-modal h2 { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.5rem; }
  .confirm-modal p  { font-size: 0.83rem; color: var(--color-muted); margin: 0 0 1.25rem; }
  .confirm-actions  { display: flex; gap: 0.625rem; }
  .btn-cancel {
    flex: 1; padding: 0.6rem; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: none;
    font-size: 0.83rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .btn-cancel:hover { background: var(--color-bg); color: var(--color-text); }
  .btn-signout {
    width: 100%; padding: 0.6rem; border-radius: 0.5rem;
    border: none; background: #dc2626; color: white;
    font-size: 0.83rem; font-weight: 700; cursor: pointer;
    font-family: inherit; display: flex; align-items: center;
    justify-content: center; gap: 0.375rem; transition: background 0.15s;
  }
  .btn-signout:hover { background: #b91c1c; }

  /* ══ BIO MODAL ════════════════════════════════════════════════ */
  .bio-backdrop { align-items: flex-end; padding: 0; }
  @media (min-width: 641px) {
    .bio-backdrop { align-items: center; padding: 1rem; }
  }

  .bio-modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem 1.25rem 0 0; width: 100%; max-width: 560px;
    max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
    animation: slide-up 0.25s cubic-bezier(0.34,1.56,0.64,1);
  }
  @media (min-width: 641px) {
    .bio-modal { border-radius: 1.25rem; max-height: 85vh; animation: scale-in 0.2s ease; }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .bio-top-bar { height: 4px; background: linear-gradient(90deg, var(--green-600), var(--teal-500)); flex-shrink: 0; }

  .bio-header {
    display: flex; align-items: flex-start; gap: 1rem;
    padding: 1.125rem 1.25rem; border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .bio-avatar-wrap { position: relative; flex-shrink: 0; }
  .bio-avatar {
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
  }
  .bio-avatar span { font-size: 1rem; font-weight: 800; color: #fff; }
  .bio-ring {
    position: absolute; inset: -3px; border-radius: 50%;
    border: 2px solid var(--green-600); opacity: 0.3;
  }
  .bio-verified-badge {
    position: absolute; bottom: -2px; right: -2px;
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--green-600); color: white;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--color-surface);
  }

  .bio-header-info { flex: 1; min-width: 0; }
  .bio-header-info h2 { font-size: 1rem; font-weight: 800; color: var(--color-text); margin: 0 0 0.5rem; }
  .bio-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .chip {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 0.18rem 0.5rem; border-radius: 999px;
    background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted);
  }
  .chip-green  { background: var(--green-soft); border-color: rgba(34,197,94,0.3); color: var(--green-700); }
  .chip-active { background: var(--green-soft); border-color: rgba(34,197,94,0.3); color: var(--green-700); }
  .chip-inactive { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); color: #dc2626; }
  .chip-blue   { background: var(--blue-soft); border-color: rgba(59,130,246,0.3); color: var(--blue-500); }
  .chip-teal   { background: var(--teal-soft); border-color: rgba(20,184,166,0.3); color: var(--teal-500); }

  .bio-close {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    border: 1px solid var(--color-border); background: none;
    color: var(--color-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .bio-close:hover { background: var(--color-bg); color: var(--color-text); }

  .bio-nav {
    display: flex; gap: 0.25rem; padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg); overflow-x: auto; flex-shrink: 0;
  }
  .bio-nav::-webkit-scrollbar { display: none; }
  .bio-nav-item {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.3rem 0.625rem; border-radius: 999px; white-space: nowrap;
    border: 1px solid var(--color-border); background: none;
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .bio-nav-item:hover { border-color: var(--green-600); color: var(--green-600); background: var(--green-soft); }

  .bio-body { flex: 1; overflow-y: auto; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .bio-body::-webkit-scrollbar { width: 3px; }
  .bio-body::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .bio-section { display: flex; flex-direction: column; gap: 0.75rem; }
  .bio-section-header {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-muted);
    padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border);
  }
  .bio-section-header h3 { margin: 0; font-size: inherit; font-weight: inherit; }

  .bio-section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; }

  .bio-field {
    display: flex; align-items: flex-start; gap: 0.625rem;
    padding: 0.75rem; border-radius: 0.6rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    transition: border-color 0.15s;
  }
  .bio-field:hover { border-color: var(--green-600); }
  .bio-field-icon {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    background: var(--green-soft); color: var(--green-600);
    display: flex; align-items: center; justify-content: center;
  }
  .bio-field-content { min-width: 0; }
  .bio-field-label { font-size: 0.67rem; font-weight: 600; color: var(--color-muted); margin: 0 0 0.15rem; text-transform: uppercase; letter-spacing: 0.03em; }
  .bio-field-value { font-size: 0.8rem; font-weight: 600; color: var(--color-text); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bio-field-value.mono { font-family: monospace; }

  .bio-footer {
    display: flex; gap: 0.625rem;
    padding: 0.875rem 1.25rem; border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .bio-btn-primary {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.375rem;
    padding: 0.625rem; border-radius: 0.5rem;
    background: var(--green-600); border: none; color: white;
    font-size: 0.83rem; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: background 0.15s;
  }
  .bio-btn-primary:hover { background: var(--green-700); }
  .bio-btn-danger {
    display: flex; align-items: center; justify-content: center; gap: 0.375rem;
    padding: 0.625rem 1rem; border-radius: 0.5rem;
    background: none; border: 1px solid rgba(220,38,38,0.3); color: #dc2626;
    font-size: 0.83rem; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .bio-btn-danger:hover { background: rgba(220,38,38,0.08); border-color: #dc2626; }

  /* ── Utilities ───────────────────────────────────────────────── */
  :global(.spin-icon) { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ══ MOBILE ═════════════════════════════════════════════════════ */
  @media (max-width: 768px) {
    .desktop-only { display: none !important; }
    .mobile-only  { display: flex !important; }

    /* Grid: no sidebar column — sidebar is a fixed drawer */
    .layout,
    .layout.collapsed {
      grid-template-columns: 1fr;
    }

    /* Sidebar becomes a fixed off-canvas drawer */
    .sidebar,
    .sidebar.collapsed {
      position: fixed;
      left: 0; top: 0;
      height: 100vh;
      width: 260px !important;
      transform: translateX(-100%);
      transition: transform var(--transition);
      z-index: 50;
      box-shadow: 4px 0 24px rgba(0,0,0,0.15);
    }
    .sidebar.mobile-open {
      transform: translateX(0);
    }

    /* Show overlay when drawer open */
    .mobile-overlay { display: block; }

    .topbar { padding: 0 0.875rem; }
    .page-content { padding: 1rem; }

    .notif-dropdown { width: calc(100vw - 1.75rem); right: 0; }

    .bio-section-grid { grid-template-columns: 1fr; }

    .exam-alert-course { display: none; }
  }
</style>