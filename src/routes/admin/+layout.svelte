<!-- src/routes/(admin)/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, Users, FileText, LogOut, Menu, X,
    Sun, Moon, ShieldAlert, ChevronRight, ShieldCheck,
    GraduationCap, BookOpen
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme = $derived(getTheme());
  let sidebarOpen = $state(false);

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'All Users', icon: Users },
    { href: '/admin/users?role=student', label: 'Students', icon: GraduationCap },
    { href: '/admin/users?role=lecturer', label: 'Lecturers', icon: BookOpen },
    { href: '/admin/users?role=invigilator', label: 'Invigilators', icon: ShieldCheck },
    { href: '/admin/security', label: 'Security', icon: ShieldAlert },
    { href: '/admin/reports', label: 'Reports', icon: FileText },
  ];

  const currentPath = $derived($page.url.pathname);
  
  function isActive(href: string) {
    if (href === '/admin') {
      return currentPath === '/admin';
    }
    // Handle query params for role filtering
    if (href.includes('?role=')) {
      return currentPath === '/admin/users' && $page.url.search === href.split('?')[1];
    }
    return currentPath.startsWith(href);
  }
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
      {#each links as link}
        <a
          href={link.href}
          class="nav-link"
          class:active={isActive(link.href)}
        >
          <link.icon size={18} />
          <span>{link.label}</span>
          {#if isActive(link.href)}
            <ChevronRight size={14} class="nav-arrow" />
          {/if}
        </a>
      {/each}
    </nav>
    
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
    transition: transform 0.2s ease;
  }
  
  .sidebar.sidebar-open {
    transform: translateX(0);
  }
  
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
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
    display: none;
  }
  
  .sidebar-nav {
    flex: 1;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--color-text);
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.15s;
    position: relative;
  }
  
  .nav-link:hover {
    background: var(--color-surface-hover);
  }
  
  .nav-link.active {
    background: rgba(22, 163, 74, 0.1);
    color: #16a34a;
  }
  
  .nav-arrow {
    margin-left: auto;
    opacity: 0.5;
  }
  
  .sidebar-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border);
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
  
  /* Desktop */
  @media (min-width: 768px) {
    .sidebar {
      position: sticky;
      transform: translateX(0);
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
    }
  }
  
  @media (min-width: 1024px) {
    .sidebar {
      width: 280px;
    }
    
    .main-content {
      flex: 1;
    }
    
    .page-content {
      padding: 2rem 2.5rem;
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
</style>