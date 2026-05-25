<!-- src/routes/(admin)/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, Users, FileText, LogOut, Menu, X,
    Sun, Moon, ShieldAlert, ChevronRight, ShieldCheck,
    GraduationCap, BookOpen, ChevronDown, Loader2
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme = $derived(getTheme());
  let sidebarOpen = $state(false);
  let navLoading = $state<string | null>(null);
  let usersExpanded = $state(false);

  // Navigation structure with child items
  const navGroups = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, children: null },
    {
      href: '/admin/users',
      label: 'Users',
      icon: Users,
      children: [
        { href: '/admin/users', label: 'All Users', icon: Users },
        { href: '/admin/users?role=student', label: 'Students', icon: GraduationCap },
        { href: '/admin/users?role=lecturer', label: 'Lecturers', icon: BookOpen },
        { href: '/admin/users?role=invigilator', label: 'Invigilators', icon: ShieldCheck },
      ]
    },
    { href: '/admin/security', label: 'Security', icon: ShieldAlert, children: null },
    { href: '/admin/reports', label: 'Reports', icon: FileText, children: null },
  ];

  const currentPath = $derived($page.url.pathname);
  const currentSearch = $derived($page.url.search);

  function isActive(href: string) {
    if (href === '/admin') {
      return currentPath === '/admin';
    }
    if (href.includes('?role=')) {
      return currentPath === '/admin/users' && currentSearch === '?' + href.split('?')[1];
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  function isGroupActive(group: any) {
    if (!group.children) return isActive(group.href);
    return group.children.some((child: any) => isActive(child.href));
  }

  async function handleNavClick(href: string, event: MouseEvent) {
    event.preventDefault();
    if (navLoading) return; // Prevent simultaneous clicks

    navLoading = href;
    sidebarOpen = false;

    try {
      await goto(href);
    } finally {
      // Small delay to ensure page transition feels smooth
      setTimeout(() => {
        navLoading = null;
      }, 300);
    }
  }

  function toggleUsersGroup() {
    usersExpanded = !usersExpanded;
  }

  // Auto-expand users group if any child is active
  $effect(() => {
    if (isGroupActive(navGroups[1])) {
      usersExpanded = true;
    }
  });
</script>

<svelte:head>
  <title>Admin — MOUAU eTest</title>
</svelte:head>

<div class="admin-layout">

  <!-- Mobile sidebar overlay -->
  {#if sidebarOpen}
    <div class="sidebar-overlay" onclick={() => sidebarOpen = false}></div>
  {/if}

  <!-- Sidebar -->
  <aside class="sidebar" class:sidebar-open={sidebarOpen}>
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <ShieldAlert size={24} />
        </div>
        <div class="logo-text">
          <span class="logo-title">MOUAU eTest</span>
          <span class="logo-badge">Admin</span>
        </div>
      </div>
      <button class="close-sidebar" onclick={() => sidebarOpen = false} aria-label="Close menu">
        <X size={20} />
      </button>
    </div>

    <nav class="sidebar-nav">
      {#each navGroups as group}
        {#if !group.children}
          <!-- Single nav item -->
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
          <!-- Group with children -->
          <div class="nav-group" class:expanded={usersExpanded}>
            <button
              class="nav-link nav-group-trigger"
              class:active={isGroupActive(group)}
              onclick={toggleUsersGroup}
              type="button"
            >
              <group.icon size={18} />
              <span>{group.label}</span>
              <ChevronDown size={14} class="nav-chevron" />
            </button>

            {#if usersExpanded}
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

    <!-- Global loading bar -->
    {#if navLoading}
      <div class="nav-loading-bar">
        <div class="nav-loading-progress"></div>
      </div>
    {/if}

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">
          {data.user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div class="user-details">
          <span class="user-name">{data.user?.fullName?.split(' ')[0] || 'Admin'}</span>
          <span class="user-role">Administrator</span>
        </div>
      </div>
      <form method="POST" action="/logout">
        <button type="submit" class="logout-btn">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </form>
    </div>
  </aside>

  <!-- Main content -->
  <main class="main-content">
    <header class="main-header">
      <button class="menu-toggle" onclick={() => sidebarOpen = true} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div class="header-right">
        {#if navLoading}
          <div class="header-loading">
            <Loader2 size={16} class="spin" />
            <span>Loading...</span>
          </div>
        {/if}
        <button class="theme-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
          {#if theme === 'dark'}
            <Sun size={16} />
          {:else}
            <Moon size={16} />
          {/if}
        </button>
        <div class="admin-badge">
          <ShieldAlert size={14} />
          <span>Super Admin</span>
        </div>
      </div>
    </header>

    <div class="page-content">
      {@render children()}
    </div>
  </main>
</div>

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: var(--color-bg);
  }

  /* Sidebar */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    z-index: 99;
    animation: fadeIn 0.2s ease;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #16a34a, #15803d);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .logo-text {
    display: flex;
    flex-direction: column;
  }

  .logo-title {
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .logo-badge {
    font-size: 0.65rem;
    font-weight: 600;
    color: #16a34a;
    text-transform: uppercase;
  }

  .close-sidebar {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
  }

  .close-sidebar:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  /* Navigation */
  .sidebar-nav {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    overflow-y: auto;
  }

  .sidebar-nav::-webkit-scrollbar {
    width: 4px;
  }
  .sidebar-nav::-webkit-scrollbar-track {
    background: transparent;
  }
  .sidebar-nav::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 1rem;
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--color-text);
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.15s;
    position: relative;
    border: none;
    background: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
  }

  .nav-link:hover {
    background: var(--color-surface-hover);
  }

  .nav-link.active {
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
  }

  .nav-link.loading {
    opacity: 0.7;
    pointer-events: none;
  }

  .nav-arrow {
    margin-left: auto;
    opacity: 0.5;
  }

  .nav-loader {
    margin-left: auto;
    animation: spin 0.8s linear infinite;
    color: #16a34a;
  }

  /* Nav Group */
  .nav-group {
    display: flex;
    flex-direction: column;
  }

  .nav-group-trigger {
    justify-content: flex-start;
  }

  .nav-chevron {
    margin-left: auto;
    transition: transform 0.2s ease;
    opacity: 0.5;
  }

  .nav-group.expanded .nav-chevron {
    transform: rotate(180deg);
  }

  .nav-children {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding-left: 0.5rem;
    margin-left: 0.75rem;
    border-left: 2px solid var(--color-border);
    animation: slideDown 0.2s ease;
  }

  .nav-child {
    padding: 0.6rem 0.75rem;
    font-size: 0.82rem;
    color: var(--color-muted);
  }

  .nav-child:hover {
    color: var(--color-text);
  }

  .nav-child.active {
    background: rgba(22, 163, 74, 0.08);
    color: #16a34a;
  }

  .child-active-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #16a34a;
    margin-left: auto;
  }

  /* Loading bar */
  .nav-loading-bar {
    height: 2px;
    background: var(--color-border);
    overflow: hidden;
    flex-shrink: 0;
  }

  .nav-loading-progress {
    height: 100%;
    width: 40%;
    background: #16a34a;
    animation: loadingSlide 1s ease-in-out infinite;
  }

  /* Sidebar Footer */
  .sidebar-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #16a34a, #15803d);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    color: white;
  }

  .user-details {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .user-role {
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  .logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: #dc2626;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .logout-btn:hover {
    background: rgba(220, 38, 38, 0.1);
    border-color: #dc2626;
  }

  /* Main Content */
  .main-content {
    flex: 1;
    margin-left: 0;
    min-width: 0;
    width: 100%;
  }

  .main-header {
    position: sticky;
    top: 0;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    z-index: 50;
    gap: 1rem;
  }

  .menu-toggle {
    background: none;
    border: none;
    color: var(--color-text);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .menu-toggle:hover {
    background: var(--color-surface-hover);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    background: rgba(22, 163, 74, 0.1);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #16a34a;
    animation: fadeIn 0.2s ease;
  }

  .header-loading .spin {
    animation: spin 0.8s linear infinite;
  }

  .theme-btn {
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .theme-btn:hover {
    background: var(--color-surface-hover);
  }

  .admin-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    background: rgba(22, 163, 74, 0.1);
    border-radius: 2rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #16a34a;
  }

  .page-content {
    padding: 2rem 1.5rem;
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes loadingSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(250%); }
  }

  /* Desktop */
  @media (min-width: 1024px) {
    .sidebar {
      position: sticky;
      transform: translateX(0);
      width: 260px;
    }

    .sidebar-overlay {
      display: none;
    }

    .close-sidebar {
      display: none;
    }

    .menu-toggle {
      display: none;
    }

    .main-content {
      margin-left: 0;
      flex: 1;
    }

    .page-content {
      padding: 2rem 2.5rem;
    }
  }

  @media (min-width: 1280px) {
    .sidebar {
      width: 280px;
    }
  }

  /* Dark mode */
  :global(.dark) .admin-badge {
    background: rgba(22, 163, 74, 0.15);
  }

  :global(.dark) .logout-btn {
    border-color: rgba(220, 38, 38, 0.3);
  }

  :global(.dark) .logout-btn:hover {
    background: rgba(220, 38, 38, 0.15);
  }

  :global(.dark) .header-loading {
    background: rgba(22, 163, 74, 0.15);
  }
</style>