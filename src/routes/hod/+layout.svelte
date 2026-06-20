<!-- src/routes/hod/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import {
    Users, BookOpen, ClipboardList, BarChart2,
    Bell, User, LogOut, Menu, X, ExternalLink,
    GraduationCap, Home
  } from '@lucide/svelte';

  let { data, children }: { data: LayoutData; children: any } = $props();

  let sidebarOpen = $state(false);

  const navItems = $derived([
    { href: '/hod',              label: 'Dashboard',    icon: Home },
    { href: '/hod/departments',  label: 'Department',   icon: GraduationCap },
    { href: '/hod/lecturers',    label: 'Lecturers',    icon: Users },
    { href: '/hod/exams',        label: 'Exams',        icon: ClipboardList },
    { href: '/hod/results',      label: 'Results',      icon: BarChart2 },
  ]);

  function isActive(href: string) {
    if (href === '/hod') return $page.url.pathname === '/hod';
    return $page.url.pathname.startsWith(href);
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
</script>

<svelte:head>
  <style>:root { --p-accent:#f59e0b; --p-accent-dim:rgba(245,158,11,.12); --p-accent-hover:#d97706; --p-accent-text:#92400e; }</style>
</svelte:head>

<!-- Mobile overlay -->
<div class="sidebar-overlay" class:open={sidebarOpen} onclick={() => sidebarOpen = false} role="none"></div>

<div class="portal-shell">
  <!-- Sidebar -->
  <aside class="sidebar" class:open={sidebarOpen}>
    <a href="/hod" class="sidebar-logo">
      <div class="sidebar-logo-icon"><GraduationCap size={17} /></div>
      <div class="sidebar-logo-text">
        <span class="sidebar-logo-title">MOUAU eTest</span>
        <span class="sidebar-logo-role">HOD Portal</span>
      </div>
    </a>

    <nav class="sidebar-nav">
      {#each navItems as item}
        <a href={item.href} class="nav-link" class:active={isActive(item.href)} onclick={() => sidebarOpen = false}>
          <item.icon size={15} />{item.label}
        </a>
      {/each}

      {#if data.alsoLectures}
        <div class="nav-divider"></div>
        <span class="nav-section">Also Lecturer</span>
        <a href="/lecturer" class="nav-link ext" target="_self">
          <BookOpen size={15} />Lecturer Portal<ExternalLink size={11} style="margin-left:auto;opacity:.5" />
        </a>
      {/if}
    </nav>

    <div class="sidebar-foot">
      <a href="/hod/notifications" class="nav-link" class:active={isActive('/hod/notifications')} onclick={() => sidebarOpen = false}>
        <Bell size={15} />
        Notifications
        {#if data.unreadCount > 0}
          <span class="notif-badge">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>
        {/if}
      </a>
      <a href="/hod/profile" class="nav-link" class:active={isActive('/hod/profile')} onclick={() => sidebarOpen = false}>
        <User size={15} />Profile
      </a>
      <a href="/logout" class="nav-link">
        <LogOut size={15} />Sign out
      </a>
    </div>
  </aside>

  <!-- Main -->
  <div class="portal-main">
    <header class="portal-topbar">
      <div class="topbar-left">
        <button class="mob-toggle" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Toggle menu">
          {#if sidebarOpen}<X size={18} />{:else}<Menu size={18} />{/if}
        </button>
        <div class="topbar-breadcrumb">
          HOD Portal &rsaquo; <strong>{data.user?.fullName ?? ''}</strong>
        </div>
      </div>
      <div class="topbar-actions">
        <a href="/hod/notifications" class="topbar-icon-btn" title="Notifications">
          <Bell size={17} />
          {#if data.unreadCount > 0}<span class="topbar-badge">{data.unreadCount}</span>{/if}
        </a>
        <a href="/hod/profile" class="topbar-avatar">
          {initials(data.user?.fullName ?? 'H')}
        </a>
      </div>
    </header>

    <main class="portal-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  @import '$lib/styles/portals.css';

  .topbar-left { display:flex; align-items:center; gap:.75rem; }
  .topbar-icon-btn {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: .5rem;
    color: var(--color-muted); text-decoration: none;
    transition: background .15s, color .15s;
  }
  .topbar-icon-btn:hover { background: var(--color-bg); color: var(--color-text); }
  .topbar-badge {
    position: absolute; top: 2px; right: 2px;
    min-width: 16px; height: 16px; padding: 0 4px;
    background: var(--p-accent); color: white;
    font-size: .58rem; font-weight: 700;
    border-radius: 2rem; display: flex; align-items: center; justify-content: center;
  }
  .notif-badge {
    margin-left: auto;
    min-width: 18px; height: 18px; padding: 0 5px;
    background: var(--p-accent); color: white;
    font-size: .62rem; font-weight: 700;
    border-radius: 2rem; display: flex; align-items: center; justify-content: center;
  }
</style>