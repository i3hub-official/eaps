<script lang="ts">
  import { page } from '$app/stores';
  import { Menu, X, LogOut, Bell, LayoutDashboard, Users, Shield, Layers, Clipboard, BarChart2, Activity } from '@lucide/svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: any } = $props();
  let sidebarOpen = $state(false);

  // Close sidebar on route change
  $effect(() => {
    $page.url.pathname;
    sidebarOpen = false;
  });

  // Icon mapping
  const iconMap = {
    'grid': LayoutDashboard,
    'users': Users,
    'shield': Shield,
    'layers': Layers,
    'clipboard': Clipboard,
    'bar-chart-2': BarChart2,
    'activity': Activity,
  };

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: 'grid' },
    { href: '/admin/users', label: 'Users', icon: 'users' },
    { href: '/admin/roles', label: 'Roles & Permissions', icon: 'shield' },
    { href: '/admin/structure', label: 'Academic Structure', icon: 'layers' },
    { href: '/admin/assessments', label: 'Assessments', icon: 'clipboard' },
    { href: '/admin/reports', label: 'Reports', icon: 'bar-chart-2' },
    { href: '/admin/audit', label: 'Audit Logs', icon: 'activity' },
  ];

  // Safe access to staff data with fallbacks
  const staff = data?.staff || null;
  const staffName = staff?.firstName 
    ? `${staff.firstName} ${staff.lastName || ''}`.trim() 
    : 'Admin';
  const staffRole = staff?.primaryRole || 'Staff';
  const unreadCount = data?.unreadCount || 0;
</script>

<div class="admin-layout">
  <!-- Top bar -->
  <header class="admin-header">
    <div class="admin-header-content">
      <div class="admin-header-left">
        <button
          onclick={() => (sidebarOpen = !sidebarOpen)}
          class="admin-menu-btn"
          aria-label="Toggle menu"
        >
          {#if sidebarOpen}
            <X size={20} />
          {:else}
            <Menu size={20} />
          {/if}
        </button>
        <h1 class="admin-logo">MOUAU eTest Admin</h1>
      </div>
      
      <div class="admin-header-right">
        <!-- Notification Bell -->
        <button 
          class="admin-notif-btn"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {#if unreadCount > 0}
            <span class="admin-notif-badge">
              {unreadCount}
            </span>
          {/if}
        </button>
        
        <span class="admin-staff-name">
          {staffName}
        </span>
        <span class="admin-staff-role">
          {staffRole}
        </span>
        <a
          href="/logout"
          class="admin-logout-btn"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </a>
      </div>
    </div>
  </header>

  <div class="admin-body">
    <!-- Sidebar -->
    <aside
      class="admin-sidebar"
      class:admin-sidebar-open={sidebarOpen}
      class:admin-sidebar-closed={!sidebarOpen}
    >
      <nav class="admin-nav">
        {#each navItems as item (item.href)}
          <a
            href={item.href}
            class="admin-nav-link"
            class:admin-nav-link-active={$page.url.pathname === item.href}
          >
            <svelte:component this={iconMap[item.icon] || LayoutDashboard} size={18} />
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
    </aside>

    <!-- Overlay for mobile -->
    {#if sidebarOpen}
      <div
        class="admin-overlay"
        onclick={() => (sidebarOpen = false)}
      />
    {/if}

    <!-- Main content -->
    <main class="admin-main">
      <div class="admin-content">
        {@render children()}
      </div>
    </main>
  </div>
</div>

<style>
  /* Admin Layout Styles */
  .admin-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }

  /* Header */
  .admin-header {
    position: sticky;
    top: 0;
    z-index: 40;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .admin-header-content {
    height: 4rem;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .admin-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .admin-menu-btn {
    padding: 0.5rem;
    border-radius: 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text);
    transition: background 0.2s;
  }

  .admin-menu-btn:hover {
    background: var(--color-surface-hover);
  }

  @media (min-width: 1024px) {
    .admin-menu-btn {
      display: none;
    }
  }

  .admin-logo {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .admin-header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .admin-notif-btn {
    padding: 0.5rem;
    border-radius: 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    position: relative;
    transition: background 0.2s;
  }

  .admin-notif-btn:hover {
    background: var(--color-surface-hover);
  }

  .admin-notif-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 1rem;
    height: 1rem;
    border-radius: 9999px;
    font-size: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--red-accent);
    color: white;
  }

  .admin-staff-name {
    font-size: 0.875rem;
    color: var(--color-muted);
  }

  .admin-staff-role {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: var(--ad-soft);
    color: var(--ad-accent);
  }

  .admin-logout-btn {
    padding: 0.5rem;
    border-radius: 0.5rem;
    color: var(--color-muted);
    transition: background 0.2s;
    text-decoration: none;
    display: flex;
    align-items: center;
  }

  .admin-logout-btn:hover {
    background: var(--color-surface-hover);
  }

  /* Body */
  .admin-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Sidebar */
  .admin-sidebar {
    position: fixed;
    top: 4rem;
    left: 0;
    bottom: 0;
    width: 16rem;
    z-index: 30;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    overflow-y: auto;
  }

  @media (min-width: 1024px) {
    .admin-sidebar {
      position: static;
      transform: translateX(0);
    }
  }

  .admin-sidebar-open {
    transform: translateX(0);
  }

  .admin-sidebar-closed {
    transform: translateX(-100%);
  }

  @media (min-width: 1024px) {
    .admin-sidebar-closed {
      transform: translateX(0);
    }
  }

  .admin-nav {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .admin-nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--color-text);
    text-decoration: none;
    transition: all 0.2s;
  }

  .admin-nav-link:hover {
    background: var(--color-surface-hover);
  }

  .admin-nav-link-active {
    background: var(--ad100) !important;
    color: var(--ad700) !important;
  }

  /* Overlay */
  .admin-overlay {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(2px);
  }

  @media (min-width: 1024px) {
    .admin-overlay {
      display: none;
    }
  }

  /* Main Content */
  .admin-main {
    flex: 1;
    overflow: auto;
  }

  .admin-content {
    padding: 1.5rem;
    max-width: 80rem;
    margin: 0 auto;
  }

  /* Dark mode overrides */
  [data-theme="dark"] .admin-nav-link-active {
    background: var(--ad50) !important;
    color: var(--ad500) !important;
  }

  [data-theme="dark"] .admin-menu-btn:hover,
  [data-theme="dark"] .admin-notif-btn:hover,
  [data-theme="dark"] .admin-logout-btn:hover {
    background: var(--color-surface-hover);
  }

  [data-theme="dark"] .admin-overlay {
    background: rgba(0, 0, 0, 0.5);
  }
</style>