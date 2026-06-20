<!-- src/routes/vc-dvc/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { Home, BarChart2, ClipboardList, Bell, User, LogOut, Menu, X, Crown } from '@lucide/svelte';

  let { data, children }: { data: LayoutData; children: any } = $props();
  let sidebarOpen = $state(false);

  const navItems = [
    { href: '/vc-dvc',          label: 'Dashboard', icon: Home },
    { href: '/vc-dvc/results',  label: 'Results',   icon: BarChart2 },
    { href: '/vc-dvc/reports',  label: 'Reports',   icon: ClipboardList },
  ];

  function isActive(href: string) {
    return href === '/vc-dvc'
      ? $page.url.pathname === '/vc-dvc'
      : $page.url.pathname.startsWith(href);
  }

  function initials(name: string) {
    return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
</script>

<svelte:head>
  <style>:root{--p-accent:#8b5cf6;--p-accent-dim:rgba(139,92,246,.12);--p-accent-hover:#7c3aed;--p-accent-text:#4c1d95;}</style>
</svelte:head>

<div class="sidebar-overlay" class:open={sidebarOpen} onclick={() => sidebarOpen = false} role="none"></div>

<div class="portal-shell">
  <aside class="sidebar" class:open={sidebarOpen}>
    <a href="/vc-dvc" class="sidebar-logo">
      <div class="sidebar-logo-icon"><Crown size={17} /></div>
      <div class="sidebar-logo-text">
        <span class="sidebar-logo-title">MOUAU eTest</span>
        <span class="sidebar-logo-role">VC / DVC Portal</span>
      </div>
    </a>

    <nav class="sidebar-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link"
          class:active={isActive(item.href)}
          onclick={() => sidebarOpen = false}
        >
          <item.icon size={15} />{item.label}
        </a>
      {/each}
    </nav>

    <div class="sidebar-foot">
      <a href="/vc-dvc/notifications" class="nav-link" class:active={isActive('/vc-dvc/notifications')} onclick={() => sidebarOpen = false}>
        <Bell size={15} />Notifications
        {#if data.unreadCount > 0}<span class="notif-badge">{data.unreadCount}</span>{/if}
      </a>
      <a href="/vc-dvc/profile" class="nav-link" class:active={isActive('/vc-dvc/profile')}><User size={15} />Profile</a>
      <a href="/logout" class="nav-link"><LogOut size={15} />Sign out</a>
    </div>
  </aside>

  <div class="portal-main">
    <header class="portal-topbar">
      <div class="topbar-left">
        <button class="mob-toggle" onclick={() => sidebarOpen = !sidebarOpen}>
          {#if sidebarOpen}<X size={18} />{:else}<Menu size={18} />{/if}
        </button>
        <div class="topbar-breadcrumb">
          VC / DVC &rsaquo; <strong>{data.user?.fullName ?? ''}</strong>
        </div>
      </div>
      <div class="topbar-actions">
        <a href="/vc-dvc/notifications" class="topbar-icon-btn">
          <Bell size={17} />
          {#if data.unreadCount > 0}<span class="topbar-badge">{data.unreadCount}</span>{/if}
        </a>
        <a href="/vc-dvc/profile" class="topbar-avatar">
          {initials(data.user?.fullName ?? 'V')}
        </a>
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
