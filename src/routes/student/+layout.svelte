<!-- src/routes/(student)/+layout.svelte -->
<script lang="ts">
  import { page }    from '$app/stores';
  import { onMount } from 'svelte';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import type { LayoutData } from './$types';
  import {
    LayoutDashboard, Camera, LogOut, Menu, X,
    Sun, Moon, User, Mail, Hash, Building2,
    Layers, GraduationCap, ShieldCheck,
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme     = $derived(getTheme());
  let menuOpen  = $state(false);
  let bioOpen   = $state(false);

  const links = [
    { href: '/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
    { href: '/enroll',    label: 'Face Enrollment', icon: Camera          },
  ];

  const currentPath = $derived($page.url.pathname);
  function isActive(href: string) {
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  const initials = $derived(() => {
    const parts = data.user.fullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  });

  function openBio()  { bioOpen  = true;  menuOpen = false; }
  function closeBio() { bioOpen  = false; }
  function toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    menuOpen = !menuOpen;
  }
  function closeMenu() { menuOpen = false; }
</script>

<div class="layout">
  <!-- ── Navbar ────────────────────────────────────────────────────── -->
  <header class="navbar">
    <div class="nav-inner">

      <a href="/dashboard" class="nav-brand" aria-label="MOUAU eTest">
        <!-- Logo image - shows on all screen sizes -->
        <img 
          src="/mouau_logo.png" 
          alt="MOUAU Logo" 
          class="nav-logo"
          width="32"
          height="32"
        />
        <span class="brand-text">MOUAU eTest</span>
      </a>

      <!-- Desktop links -->
      <nav class="nav-links" aria-label="Main navigation">
        {#each links as link}
          <a
            href={link.href}
            class="nav-link"
            class:active={isActive(link.href)}
            aria-current={isActive(link.href) ? 'page' : undefined}
          >
            <link.icon size={15} />
            <span>{link.label}</span>
          </a>
        {/each}
      </nav>

      <div class="nav-right">
        <!-- Theme -->
        <button class="icon-btn" onclick={toggleTheme} type="button"
          aria-label="Toggle theme">
          {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
        </button>

        <!-- Avatar → opens bio modal -->
        <button class="avatar-btn" onclick={openBio} type="button"
          aria-label="View profile">
          <span class="avatar">{initials()}</span>
          <span class="avatar-name">{data.user.fullName.split(' ')[0]}</span>
        </button>

        <!-- Hamburger — mobile only -->
        <button
          class="icon-btn hamburger"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onclick={toggleMenu}
        >
          {#if menuOpen}<X size={18} />{:else}<Menu size={18} />{/if}
        </button>
      </div>
    </div>

    <!-- Mobile menu — rendered inline, no portal needed -->
    {#if menuOpen}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="mobile-overlay" onclick={closeMenu}></div>
      <div class="mobile-menu">
        <!-- Mobile menu with logo -->
        <div class="mobile-header">
          <img 
            src="/mouau_logo.png" 
            alt="MOUAU Logo" 
            class="mobile-logo"
            width="40"
            height="40"
          />
          <span class="mobile-brand">MOUAU eTest</span>
        </div>
        
        <div class="mobile-user" role="button" tabindex="0"
          onclick={openBio}
          onkeydown={(e) => e.key === 'Enter' && openBio()}>
          <span class="avatar avatar--lg">{initials()}</span>
          <div>
            <p class="mobile-user-name">{data.user.fullName}</p>
            <p class="mobile-user-meta">{data.user.matricNumber ?? data.user.email}</p>
          </div>
          <User size={14} class="mobile-user-arrow" />
        </div>

        <div class="mobile-sep"></div>

        {#each links as link}
          <a href={link.href} class="mobile-link"
            class:active={isActive(link.href)}
            onclick={closeMenu}>
            <link.icon size={16} /><span>{link.label}</span>
          </a>
        {/each}

        <div class="mobile-sep"></div>

        <button class="mobile-link" type="button"
          onclick={() => { toggleTheme(); }}>
          {#if theme === 'dark'}
            <Sun size={16} /><span>Light Mode</span>
          {:else}
            <Moon size={16} /><span>Dark Mode</span>
          {/if}
        </button>

        <form method="POST" action="/logout">
          <button type="submit" class="mobile-link logout">
            <LogOut size={16} /><span>Sign Out</span>
          </button>
        </form>
      </div>
    {/if}
  </header>

  <!-- ── Main ──────────────────────────────────────────────────────── -->
  <main class="layout-main">
    {@render children()}
  </main>
</div>

<!-- ── Bio Modal ─────────────────────────────────────────────────── -->
{#if bioOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-overlay" role="dialog" aria-modal="true"
    aria-labelledby="bio-title"
    onclick={(e) => { if (e.target === e.currentTarget) closeBio(); }}
    onkeydown={(e) => { if (e.key === 'Escape') closeBio(); }}>

    <div class="bio-modal">
      <!-- Header -->
      <div class="bio-header">
        <span class="avatar avatar--xl">{initials()}</span>
        <div class="bio-header-info">
          <h2 id="bio-title">{data.user.fullName}</h2>
          <span class="bio-role-chip">
            <GraduationCap size={12} /> Student
          </span>
        </div>
        <button class="bio-close" onclick={closeBio} type="button" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <!-- Details grid -->
      <div class="bio-grid">
        <div class="bio-row">
          <span class="bio-icon"><Mail size={15} /></span>
          <div>
            <p class="bio-label">Email</p>
            <p class="bio-value">{data.user.email}</p>
          </div>
        </div>

        {#if data.user.matricNumber}
          <div class="bio-row">
            <span class="bio-icon"><Hash size={15} /></span>
            <div>
              <p class="bio-label">Matric Number</p>
              <p class="bio-value mono">{data.user.matricNumber}</p>
            </div>
          </div>
        {/if}

        {#if data.user.level}
          <div class="bio-row">
            <span class="bio-icon"><Layers size={15} /></span>
            <div>
              <p class="bio-label">Level</p>
              <p class="bio-value">{data.user.level} Level</p>
            </div>
          </div>
        {/if}

        <div class="bio-row">
          <span class="bio-icon"><ShieldCheck size={15} /></span>
          <div>
            <p class="bio-label">Account Status</p>
            <p class="bio-value">
              <span class="bio-status" class:active={data.user.isActive}>
                {data.user.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="bio-actions">
        <a href="/enroll" class="bio-btn-outline" onclick={closeBio}>
          <Camera size={14} /> Update Face Enrollment
        </a>
        <form method="POST" action="/logout" style="flex:1">
          <button type="submit" class="bio-btn-logout">
            <LogOut size={14} /> Sign Out
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--color-bg); }

  /* ── Navbar ────────────────────────────────────────────────────── */
  .navbar {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    position: sticky; top: 0; z-index: 100;
  }
  .nav-inner {
    max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0 1.5rem; height: 56px;
  }

  .nav-brand {
    display: flex; align-items: center; gap: 0.6rem;
    text-decoration: none; font-weight: 800; font-size: 1rem;
    color: var(--color-text); flex-shrink: 0; letter-spacing: -0.02em;
  }
  
  .nav-logo {
    width: 32px;
    height: 32px;
    object-fit: contain;
    border-radius: 8px;
    flex-shrink: 0;
  }
  
  .brand-text { display: none; }
  @media (min-width: 480px) { .brand-text { display: block; } }

  .nav-links {
    display: none; align-items: center; gap: 0.15rem; flex: 1;
  }
  @media (min-width: 768px) { .nav-links { display: flex; } }

  .nav-link {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.75rem; border-radius: 0.5rem;
    text-decoration: none; font-size: 0.875rem; font-weight: 500;
    color: var(--color-muted); transition: all 0.15s; white-space: nowrap;
  }
  .nav-link:hover { color: var(--color-text); background: var(--color-surface-hover); }
  .nav-link.active {
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
    font-weight: 600;
  }

  .nav-right { margin-left: auto; display: flex; align-items: center; gap: 0.35rem; }

  .icon-btn {
    width: 2rem; height: 2rem; border-radius: 0.5rem;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s; flex-shrink: 0;
  }
  .icon-btn:hover { background: var(--color-surface-hover); color: var(--color-text); }

  /* Avatar button */
  .avatar-btn {
    display: flex; align-items: center; gap: 0.4rem;
    background: none; border: 1px solid var(--color-border);
    border-radius: 0.6rem; padding: 0.25rem 0.5rem;
    cursor: pointer; color: var(--color-text); transition: all 0.15s;
  }
  .avatar-btn:hover { background: var(--color-surface-hover); border-color: var(--color-primary); }

  .avatar {
    width: 1.75rem; height: 1.75rem; border-radius: 50%; flex-shrink: 0;
    background: var(--color-primary); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 800; letter-spacing: 0.01em;
    user-select: none;
  }
  .avatar--lg  { width: 2.25rem; height: 2.25rem; font-size: 0.82rem; }
  .avatar--xl  { width: 3.5rem;  height: 3.5rem;  font-size: 1.1rem; flex-shrink: 0; }

  .avatar-name { font-size: 0.875rem; font-weight: 500; display: none; }
  @media (min-width: 480px) { .avatar-name { display: block; } }

  /* Hamburger — mobile only */
  .hamburger { display: flex; }
  @media (min-width: 768px) { .hamburger { display: none; } }

  /* Mobile menu */
  .mobile-overlay {
    position: fixed; inset: 0; z-index: 98;
    background: transparent;
  }
  .mobile-menu {
    position: absolute; top: 100%; left: 0; right: 0; z-index: 99;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 0.75rem 1rem 1rem;
    display: flex; flex-direction: column; gap: 0.1rem;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    animation: slide-down 0.15s ease;
  }
  @media (min-width: 768px) { .mobile-menu { display: none; } }

  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Mobile header with logo */
  .mobile-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  
  .mobile-logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 8px;
  }
  
  .mobile-brand {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }

  .mobile-user {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem; border-radius: 0.75rem; cursor: pointer;
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
    margin-bottom: 0.5rem; transition: background 0.15s;
  }
  .mobile-user:hover { background: color-mix(in srgb, var(--color-primary) 10%, transparent); }
  .mobile-user-name { font-size: 0.875rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .mobile-user-meta { font-size: 0.72rem; color: var(--color-muted); margin: 0.1rem 0 0; font-family: monospace; }
  :global(.mobile-user-arrow) { margin-left: auto; color: var(--color-muted); flex-shrink: 0; }

  .mobile-sep { height: 1px; background: var(--color-border); margin: 0.35rem 0; }

  .mobile-link {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.65rem 0.75rem; border-radius: 0.5rem;
    font-size: 0.9rem; font-weight: 500; color: var(--color-text);
    text-decoration: none; background: none; border: none;
    cursor: pointer; text-align: left; width: 100%;
    font-family: inherit; transition: background 0.1s;
  }
  .mobile-link:hover  { background: var(--color-surface-hover); }
  .mobile-link.active { color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 8%, transparent); font-weight: 600; }
  .mobile-link.logout { color: #ef4444; }
  .mobile-link.logout:hover { background: #fef2f2; }
  [data-theme="dark"] .mobile-link.logout:hover { background: rgba(239,68,68,0.1); }

  /* ── Bio Modal ─────────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: fade-in 0.15s ease;
  }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

  .bio-modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    width: 100%; max-width: 400px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.18);
    overflow: hidden;
    animation: modal-up 0.2s ease;
  }
  @keyframes modal-up {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }

  .bio-header {
    display: flex; align-items: center; gap: 1rem;
    padding: 1.5rem 1.5rem 1.25rem;
    background: linear-gradient(135deg,
      color-mix(in srgb, var(--color-primary) 8%, transparent),
      transparent);
    border-bottom: 1px solid var(--color-border);
  }
  .bio-header-info { flex: 1; min-width: 0; }
  .bio-header-info h2 {
    font-size: 1.05rem; font-weight: 800; margin: 0 0 0.35rem;
    color: var(--color-text); letter-spacing: -0.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .bio-role-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.6rem;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    color: var(--color-primary); border-radius: 999px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .bio-close {
    width: 2rem; height: 2rem; border-radius: 0.5rem; flex-shrink: 0;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); display: flex; align-items: center; justify-content: center;
    transition: background 0.15s; align-self: flex-start;
  }
  .bio-close:hover { background: var(--color-surface-hover); color: var(--color-text); }

  /* Bio rows */
  .bio-grid {
    padding: 1.25rem 1.5rem;
    display: flex; flex-direction: column; gap: 1rem;
  }
  .bio-row {
    display: flex; align-items: flex-start; gap: 0.875rem;
  }
  .bio-icon {
    width: 2rem; height: 2rem; border-radius: 0.5rem; flex-shrink: 0;
    background: var(--color-bg); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-primary); margin-top: 0.1rem;
  }
  .bio-label { font-size: 0.7rem; font-weight: 600; color: var(--color-muted); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .bio-value { font-size: 0.875rem; font-weight: 500; color: var(--color-text); margin: 0; }
  .bio-value.mono { font-family: monospace; font-size: 0.9rem; }

  .bio-status {
    display: inline-block; font-size: 0.75rem; font-weight: 700;
    padding: 0.2rem 0.6rem; border-radius: 999px;
    background: #fee2e2; color: #dc2626;
  }
  .bio-status.active { background: #dcfce7; color: #16a34a; }

  /* Actions */
  .bio-actions {
    display: flex; gap: 0.75rem; align-items: center;
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid var(--color-border);
  }
  .bio-btn-outline {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.6rem 1rem; border: 1px solid var(--color-border);
    border-radius: 0.6rem; font-size: 0.82rem; font-weight: 600;
    color: var(--color-text); text-decoration: none; background: none;
    transition: all 0.15s; white-space: nowrap;
  }
  .bio-btn-outline:hover { border-color: var(--color-primary); color: var(--color-primary); }

  .bio-btn-logout {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    width: 100%; padding: 0.6rem 1rem;
    background: #fef2f2; border: 1px solid #fecaca;
    border-radius: 0.6rem; font-size: 0.82rem; font-weight: 600;
    color: #dc2626; cursor: pointer; transition: all 0.15s;
    font-family: inherit;
  }
  .bio-btn-logout:hover { background: #fee2e2; }
  [data-theme="dark"] .bio-btn-logout { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); }
  [data-theme="dark"] .bio-btn-logout:hover { background: rgba(239,68,68,0.18); }

  /* Main */
  .layout-main { flex: 1; }
</style>