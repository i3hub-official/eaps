<!-- src/routes/exam-officer/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import {
    Home, ClipboardList, BarChart2,
    Bell, User, LogOut, Menu, X
  } from '@lucide/svelte';

  let { data, children }: { data: LayoutData; children: any } = $props();
  let sidebarOpen = $state(false);

  const navItems = [
    { href: '/exam-officer',          label: 'Dashboard', icon: Home },
    { href: '/exam-officer/exams',    label: 'Exams',     icon: ClipboardList },
    { href: '/exam-officer/results',  label: 'Results',   icon: BarChart2 },
  ];

  function isActive(href: string) {
    return href === '/exam-officer'
      ? $page.url.pathname === '/exam-officer'
      : $page.url.pathname.startsWith(href);
  }

  function initials(name: string) {
    return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }
</script>

<svelte:head>
  <style>:root{--p-accent:#0ea5e9;--p-accent-dim:rgba(14,165,233,.12);--p-accent-hover:#0284c7;--p-accent-text:#0c4a6e;}</style>
</svelte:head>

<div class="sidebar-overlay" class:open={sidebarOpen} onclick={() => sidebarOpen = false} role="none"></div>

<div class="portal-shell">
  <aside class="sidebar" class:open={sidebarOpen}>
    <a href="/exam-officer" class="sidebar-logo">
      <div class="sidebar-logo-icon"><ClipboardList size={17} /></div>
      <div class="sidebar-logo-text">
        <span class="sidebar-logo-title">MOUAU eTest</span>
        <span class="sidebar-logo-role">Exam Officer</span>
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
      <a href="/exam-officer/notifications" class="nav-link" class:active={isActive('/exam-officer/notifications')} onclick={() => sidebarOpen = false}>
        <Bell size={15} />Notifications
        {#if data.unreadCount > 0}<span class="notif-badge">{data.unreadCount}</span>{/if}
      </a>
      <a href="/exam-officer/profile" class="nav-link" class:active={isActive('/exam-officer/profile')}><User size={15} />Profile</a>
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
          Exam Officer &rsaquo; <strong>{data.user?.fullName ?? ''}</strong>
        </div>
      </div>
      <div class="topbar-actions">
        <a href="/exam-officer/notifications" class="topbar-icon-btn">
          <Bell size={17} />
          {#if data.unreadCount > 0}<span class="topbar-badge">{data.unreadCount}</span>{/if}
        </a>
        <a href="/exam-officer/profile" class="topbar-avatar">
          {initials(data.user?.fullName ?? 'E')}
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
