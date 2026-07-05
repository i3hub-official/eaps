<!-- src/routes/dean/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { Home, Layers, ClipboardList, BarChart2, ShieldCheck, Users, Bell, User, LogOut, Menu, X, GraduationCap } from '@lucide/svelte';

  let { data, children }: { data: LayoutData; children: any } = $props();
  let sidebarOpen = $state(false);

  const navItems = [
    { href: '/dean',                 label: 'Dashboard',      icon: Home },
    { href: '/dean/departments',     label: 'Departments',    icon: Layers },
    { href: '/dean/hods',            label: 'HODs',           icon: Users },
    { href: '/dean/exam-officers', label: 'Exam Officers', icon: ShieldCheck },
    { href: '/dean/exams',           label: 'Exams',          icon: ClipboardList },
    { href: '/dean/exam-authority',  label: 'Exam Authority', icon: ShieldCheck },
    { href: '/dean/results',         label: 'Results',        icon: BarChart2 },
  ];

  function isActive(href: string) {
    if (href === '/dean') return $page.url.pathname === '/dean';
    // Exact-segment match so e.g. "/dean/exams" doesn't also light up for "/dean/exam-authority"
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
  }

  function initials(name: string) {
    return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
</script>

<svelte:head>
  <style>:root{--p-accent:#10b981;--p-accent-dim:rgba(16,185,129,.12);--p-accent-hover:#059669;--p-accent-text:#065f46;}</style>
</svelte:head>

<div class="sidebar-overlay" class:open={sidebarOpen} onclick={() => sidebarOpen = false} role="none"></div>

<div class="portal-shell">
  <aside class="sidebar" class:open={sidebarOpen}>
    <a href="/dean" class="sidebar-logo">
      <div class="sidebar-logo-icon"><GraduationCap size={17} /></div>
      <div class="sidebar-logo-text">
        <span class="sidebar-logo-title">MOUAU eTest</span>
        <span class="sidebar-logo-role">Dean Portal</span>
      </div>
    </a>
    <nav class="sidebar-nav">
      {#each navItems as item}
        <a href={item.href} class="nav-link" class:active={isActive(item.href)} onclick={() => sidebarOpen = false}>
          <item.icon size={15} />{item.label}
        </a>
      {/each}
    </nav>
    <div class="sidebar-foot">
      <a href="/dean/notifications" class="nav-link" class:active={isActive('/dean/notifications')} onclick={() => sidebarOpen = false}>
        <Bell size={15} />Notifications
        {#if data.unreadCount > 0}<span class="notif-badge">{data.unreadCount}</span>{/if}
      </a>
      <a href="/dean/profile" class="nav-link" class:active={isActive('/dean/profile')}><User size={15} />Profile</a>
      <a href="/logout" class="nav-link"><LogOut size={15} />Sign out</a>
    </div>
  </aside>

  <div class="portal-main">
    <header class="portal-topbar">
      <div class="topbar-left">
        <button class="mob-toggle" onclick={() => sidebarOpen = !sidebarOpen}>
          {#if sidebarOpen}<X size={18} />{:else}<Menu size={18} />{/if}
        </button>
        <div class="topbar-breadcrumb">Dean Portal &rsaquo; <strong>{data.user?.fullName ?? ''}</strong></div>
      </div>
      <div class="topbar-actions">
        <a href="/dean/notifications" class="topbar-icon-btn">
          <Bell size={17} />
          {#if data.unreadCount > 0}<span class="topbar-badge">{data.unreadCount}</span>{/if}
        </a>
        <a href="/dean/profile" class="topbar-avatar">{initials(data.user?.fullName ?? 'D')}</a>
      </div>
    </header>
    <main class="portal-content">{@render children()}</main>
  </div>
</div>

<style>
  @import '$lib/styles/portals.css';
  .topbar-left{display:flex;align-items:center;gap:.75rem;}
  .topbar-icon-btn{position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:.5rem;color:var(--color-muted);text-decoration:none;transition:background .15s,color .15s;}
  .topbar-icon-btn:hover{background:var(--color-bg);color:var(--color-text);}
  .topbar-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;padding:0 4px;background:var(--p-accent);color:white;font-size:.58rem;font-weight:700;border-radius:2rem;display:flex;align-items:center;justify-content:center;}
  .notif-badge{margin-left:auto;min-width:18px;height:18px;padding:0 5px;background:var(--p-accent);color:white;font-size:.62rem;font-weight:700;border-radius:2rem;display:flex;align-items:center;justify-content:center;}
</style>