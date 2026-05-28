<!-- src/routes/lecturer/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, BookOpen, ClipboardList, Menu, X,
    Sun, Moon, LogOut, ChevronRight, Loader2,
    PlusCircle, BarChart2, ChevronDown, AlertCircle
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme = $derived(getTheme());
  let sidebarOpen = $state(false);
  let navLoading = $state<string | null>(null);
  let examsExpanded = $state(false);
  let showSignoutModal = $state(false);
  let isSigningOut = $state(false);

  const navGroups = [
    { href: '/lecturer', label: 'Dashboard', icon: LayoutDashboard, children: null },
    {
      href: '/lecturer/exams',
      label: 'Exams',
      icon: ClipboardList,
      children: [
        { href: '/lecturer/exams',        label: 'All Exams',    icon: ClipboardList },
        { href: '/lecturer/exams/create', label: 'Create Exam',  icon: PlusCircle },
        { href: '/lecturer/results',      label: 'Results',      icon: BarChart2 },
      ]
    },
  ];

  const currentPath = $derived($page.url.pathname);
  const currentSearch = $derived($page.url.search);

  function isActive(href: string) {
    if (href === '/lecturer') return currentPath === '/lecturer';
    if (href.includes('?')) {
      return currentPath === href.split('?')[0] && currentSearch === '?' + href.split('?')[1];
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  function isGroupActive(group: any) {
    if (!group.children) return isActive(group.href);
    return group.children.some((child: any) => isActive(child.href));
  }

  async function handleNavClick(href: string, event: MouseEvent) {
    event.preventDefault();
    if (navLoading) return;
    navLoading = href;
    sidebarOpen = false;
    try {
      await goto(href);
    } finally {
      setTimeout(() => { navLoading = null; }, 300);
    }
  }

  function toggleExamsGroup() { examsExpanded = !examsExpanded; }
  function openSignoutModal()  { showSignoutModal = true; }
  function closeSignoutModal() { if (!isSigningOut) showSignoutModal = false; }

  async function confirmSignout() {
    isSigningOut = true;
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/logout';
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error('Signout failed:', error);
      isSigningOut = false;
      closeSignoutModal();
    }
  }

  $effect(() => {
    if (isGroupActive(navGroups[1])) examsExpanded = true;
  });
</script>

<svelte:head>
  <title>Lecturer — MOUAU eTest</title>
</svelte:head>

<div class="lecturer-layout">

  {#if sidebarOpen}
    <div class="sidebar-overlay" onclick={() => sidebarOpen = false}></div>
  {/if}

  <!-- Sign-out confirmation modal -->
  {#if showSignoutModal}
    <div class="modal-overlay" onclick={closeSignoutModal}>
      <div class="modal-container" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-icon">
            <LogOut size={24} />
          </div>
          <h3>Sign Out</h3>
          <button class="modal-close" onclick={closeSignoutModal} disabled={isSigningOut}>
            <X size={20} />
          </button>
        </div>
        <div class="modal-body">
          <AlertCircle size={20} />
          <p>Are you sure you want to sign out?</p>
          <p class="modal-warning">You'll need to sign in again to access your dashboard.</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn-secondary" onclick={closeSignoutModal} disabled={isSigningOut}>
            Cancel
          </button>
          <button class="modal-btn modal-btn-danger" onclick={confirmSignout} disabled={isSigningOut}>
            {#if isSigningOut}
              <Loader2 size={16} class="spin" /> Signing Out…
            {:else}
              <LogOut size={16} /> Sign Out
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Sidebar -->
  <aside class="sidebar" class:sidebar-open={sidebarOpen}>
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <BookOpen size={24} />
        </div>
        <div class="logo-text">
          <span class="logo-title">MOUAU eTest</span>
          <span class="logo-badge">Lecturer</span>
        </div>
      </div>
      <button class="close-sidebar" onclick={() => sidebarOpen = false} aria-label="Close menu">
        <X size={20} />
      </button>
    </div>

    <nav class="sidebar-nav">
      {#each navGroups as group}
        {#if !group.children}
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
          <div class="nav-group" class:expanded={examsExpanded}>
            <button
              class="nav-link nav-group-trigger"
              class:active={isGroupActive(group)}
              onclick={toggleExamsGroup}
              type="button"
            >
              <group.icon size={18} />
              <span>{group.label}</span>
              <ChevronDown size={14} class="nav-chevron" />
            </button>

            {#if examsExpanded}
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

    {#if navLoading}
      <div class="nav-loading-bar">
        <div class="nav-loading-progress"></div>
      </div>
    {/if}

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">
          {data.user?.fullName?.charAt(0)?.toUpperCase() || 'L'}
        </div>
        <div class="user-details">
          <span class="user-name">{data.user?.fullName?.split(' ')[0] || 'Lecturer'}</span>
          <span class="user-role">Lecturer</span>
        </div>
      </div>
      <button onclick={openSignoutModal} class="logout-btn">
        <LogOut size={16} />
        <span>Sign Out</span>
      </button>
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
            <span>Loading…</span>
          </div>
        {/if}
        <button class="theme-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>
        <div class="lecturer-badge">
          <BookOpen size={14} />
          <span>Lecturer</span>
        </div>
      </div>
    </header>

    <div class="page-content">
      {@render children()}
    </div>
  </main>
</div>

<style>
  /* ── Brand tokens ─────────────────────────────────────── */
  :root {
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-800: #166534;
  }

  .lecturer-layout {
    display: flex;
    min-height: 100vh;
    background: var(--color-bg);
  }

  /* ── Modal ───────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; animation: fadeIn 0.2s ease;
  }

  .modal-container {
    background: var(--color-surface); border-radius: 1rem;
    width: 90%; max-width: 420px;
    box-shadow: 0 20px 35px -8px rgba(0,0,0,0.2);
    animation: slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
    border: 1px solid var(--color-border);
  }

  .modal-header {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border);
  }

  .modal-icon {
    width: 40px; height: 40px;
    background: rgba(220,38,38,0.1); border-radius: 0.75rem;
    display: flex; align-items: center; justify-content: center; color: #dc2626;
  }

  .modal-header h3 { font-size: 1.25rem; font-weight: 700; color: var(--color-text); margin: 0; flex: 1; }

  .modal-close {
    background: transparent; border: none; color: var(--color-muted);
    cursor: pointer; padding: 0.25rem; border-radius: 0.375rem;
    display: flex; align-items: center; transition: all 0.15s;
  }
  .modal-close:hover:not(:disabled) { background: var(--color-surface-hover); color: var(--color-text); }
  .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }

  .modal-body { padding: 1.5rem; text-align: center; }
  .modal-body svg { color: #dc2626; margin-bottom: 0.75rem; }
  .modal-body p { margin: 0.5rem 0; font-size: 0.95rem; color: var(--color-text); }
  .modal-body p:first-of-type { font-weight: 600; font-size: 1rem; }
  .modal-warning { font-size: 0.8rem !important; color: var(--color-muted) !important; }

  .modal-footer {
    display: flex; gap: 0.75rem;
    padding: 1rem 1.5rem 1.5rem; border-top: 1px solid var(--color-border);
  }

  .modal-btn {
    flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.6rem 1rem; border-radius: 0.5rem;
    font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none;
  }
  .modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .modal-btn-secondary {
    background: transparent; border: 1px solid var(--color-border); color: var(--color-text);
  }
  .modal-btn-secondary:hover:not(:disabled) { background: var(--color-surface-hover); }
  .modal-btn-danger { background: #dc2626; color: white; }
  .modal-btn-danger:hover:not(:disabled) {
    background: #b91c1c; transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220,38,38,0.3);
  }

  /* ── Sidebar ─────────────────────────────────────────── */
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
    background: var(--color-surface); border-right: 1px solid var(--color-border);
    display: flex; flex-direction: column;
    z-index: 100; transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
    overflow: hidden;
  }
  .sidebar.sidebar-open { transform: translateX(0); }

  .sidebar-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
    z-index: 99; animation: fadeIn 0.2s ease;
  }

  .sidebar-header { flex-shrink: 0;
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border);
  }

  .logo { display: flex; align-items: center; gap: 0.75rem; }

  .logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, var(--green-600), var(--green-700));
    border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center; color: white;
  }

  .logo-text { display: flex; flex-direction: column; }
  .logo-title { font-weight: 800; font-size: 0.9rem; color: var(--color-text); }
  .logo-badge { font-size: 0.65rem; font-weight: 600; color: var(--green-600); text-transform: uppercase; }

  .close-sidebar {
    background: none; border: none; color: var(--color-muted);
    cursor: pointer; padding: 0.25rem; border-radius: 0.25rem;
    display: flex; align-items: center; justify-content: center;
  }
  .close-sidebar:hover { color: var(--color-text); background: var(--color-bg); }

  /* ── Nav ─────────────────────────────────────────────── */
  .sidebar-nav {
    flex: 1; padding: 1rem;
    display: flex; flex-direction: column; gap: 0.125rem; overflow: visible; min-height: 0;
  }

  .nav-link {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.7rem 1rem; border-radius: 0.5rem;
    text-decoration: none; color: var(--color-text);
    font-weight: 500; font-size: 0.875rem; transition: all 0.15s;
    border: none; background: none; cursor: pointer; width: 100%; text-align: left;
  }
  .nav-link:hover { background: var(--color-surface-hover); }
  .nav-link.active { background: rgba(22,163,74,0.1); color: var(--green-600); }
  .nav-link.loading { opacity: 0.7; pointer-events: none; }

  .nav-arrow { margin-left: auto; opacity: 0.5; }
  .nav-loader { margin-left: auto; animation: spin 0.8s linear infinite; color: var(--green-600); }

  .nav-group { display: flex; flex-direction: column; }
  .nav-group-trigger { justify-content: flex-start; }
  .nav-chevron { margin-left: auto; transition: transform 0.2s ease; opacity: 0.5; }
  .nav-group.expanded .nav-chevron { transform: rotate(180deg); }

  .nav-children {
    display: flex; flex-direction: column; gap: 0.125rem;
    padding-left: 0.5rem; margin-left: 0.75rem;
    border-left: 2px solid rgba(22,163,74,0.35);
    animation: slideDown 0.2s ease;
  }

  .nav-child { padding: 0.6rem 0.75rem; font-size: 0.82rem; color: var(--color-muted); }
  .nav-child:hover { color: var(--color-text); }
  .nav-child.active { background: rgba(22,163,74,0.08); color: var(--green-600); }

  .child-active-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--green-600); margin-left: auto;
  }

  /* ── Loading bar ─────────────────────────────────────── */
  .nav-loading-bar { height: 2px; background: var(--color-border); overflow: hidden; flex-shrink: 0; }
  .nav-loading-progress {
    height: 100%; width: 40%; background: var(--green-600);
    animation: loadingSlide 1s ease-in-out infinite;
  }

  /* ── Sidebar footer ──────────────────────────────────── */
  .sidebar-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--color-border); flex-shrink: 0; }

  .user-info { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }

  .user-avatar {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, var(--green-600), var(--green-700));
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 1rem; color: white;
  }

  .user-details { display: flex; flex-direction: column; }
  .user-name { font-weight: 600; font-size: 0.85rem; color: var(--color-text); }
  .user-role { font-size: 0.7rem; color: var(--color-muted); }

  .logout-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.6rem; background: transparent;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    color: #dc2626; font-size: 0.8rem; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .logout-btn:hover { background: rgba(220,38,38,0.1); border-color: #dc2626; }

  /* ── Main content ────────────────────────────────────── */
  .main-content { flex: 1; margin-left: 0; min-width: 0; width: 100%; }

  .main-header {
    position: sticky; top: 0;
    background: var(--color-surface); border-bottom: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1.5rem; z-index: 50; gap: 1rem;
  }

  .menu-toggle {
    background: none; border: none; color: var(--color-text);
    cursor: pointer; padding: 0.5rem; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
  }
  .menu-toggle:hover { background: var(--color-surface-hover); }

  .header-right { display: flex; align-items: center; gap: 0.75rem; }

  .header-loading {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.75rem; background: rgba(22,163,74,0.1);
    border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600;
    color: var(--green-600); animation: fadeIn 0.2s ease;
  }
  .header-loading .spin { animation: spin 0.8s linear infinite; }

  .theme-btn {
    width: 36px; height: 36px; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: transparent;
    color: var(--color-text); cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .theme-btn:hover { background: var(--color-surface-hover); }

  .lecturer-badge {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.8rem; background: rgba(22,163,74,0.1);
    border-radius: 2rem; font-size: 0.75rem; font-weight: 600; color: var(--green-600);
  }

  .page-content { padding: 2rem 1.5rem; }

  /* ── Animations ──────────────────────────────────────── */
  @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin      { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes loadingSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }

  /* ── Desktop ─────────────────────────────────────────── */
  @media (min-width: 1024px) {
    .lecturer-layout { align-items: flex-start; }
    .sidebar { position: sticky; top: 0; height: 100vh; transform: translateX(0); width: 260px; overflow: hidden; flex-shrink: 0; }
    .sidebar-overlay, .close-sidebar, .menu-toggle { display: none; }
    .main-content { margin-left: 0; flex: 1; min-width: 0; min-height: 100vh; display: flex; flex-direction: column; }
    .page-content { padding: 2rem 2.5rem; flex: 1; }
  }

  @media (min-width: 1280px) { .sidebar { width: 280px; } }

  /* ── Dark mode ───────────────────────────────────────── */
  :global(.dark) .lecturer-badge    { background: rgba(22,163,74,0.15); }
  :global(.dark) .header-loading    { background: rgba(22,163,74,0.15); }
  :global(.dark) .logout-btn        { border-color: rgba(220,38,38,0.3); }
  :global(.dark) .logout-btn:hover  { background: rgba(220,38,38,0.15); }
  :global(.dark) .modal-icon        { background: rgba(220,38,38,0.15); }
</style>