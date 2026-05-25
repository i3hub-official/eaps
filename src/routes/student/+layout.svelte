<!-- src/routes/(student)/+layout.svelte -->
<script lang="ts">
  import { page }    from '$app/stores';
  import { onMount } from 'svelte';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import type { LayoutData } from './$types';
  import {
    LayoutDashboard, Camera, LogOut, Menu, X,
    Sun, Moon, User, Mail, Hash, Layers,
    GraduationCap, ShieldCheck, ChevronRight,
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme    = $derived(getTheme());
  let menuOpen = $state(false);
  let bioOpen  = $state(false);

  const links = [
    { href: '/dashboard', label: 'Dashboard',       icon: LayoutDashboard },
    { href: '/enroll',    label: 'Face Enrollment',  icon: Camera          },
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

  function openBio()  { bioOpen = true; menuOpen = false; }
  function closeBio() { bioOpen = false; }
  function toggleMenu(e: MouseEvent) { e.stopPropagation(); menuOpen = !menuOpen; }
  function closeMenu() { menuOpen = false; }
</script>

<div class="layout">

  <!-- ══ NAVBAR ══════════════════════════════════════════════ -->
  <header class="navbar">

    <!-- Green accent bar at top -->
    <div class="navbar-accent"></div>

    <div class="nav-inner">

      <!-- Brand -->
      <a href="/dashboard" class="nav-brand" aria-label="MOUAU eTest home">
        <div class="brand-mark">
          <img src="/mouau_logo.png" alt="MOUAU" class="brand-logo" width="26" height="26" />
        </div>
        <div class="brand-wordmark">
          <span class="brand-name">MOUAU</span>
          <span class="brand-sub">eTest</span>
        </div>
        <div class="brand-divider" aria-hidden="true"></div>
        <span class="brand-portal">Student Portal</span>
      </a>

      <!-- Desktop nav -->
      <nav class="nav-links" aria-label="Main navigation">
        {#each links as link}
          <a
            href={link.href}
            class="nav-link"
            class:active={isActive(link.href)}
            aria-current={isActive(link.href) ? 'page' : undefined}
          >
            <link.icon size={14} strokeWidth={2} />
            <span>{link.label}</span>
            {#if isActive(link.href)}
              <span class="nav-link-pip" aria-hidden="true"></span>
            {/if}
          </a>
        {/each}
      </nav>

      <div class="nav-right">

        <!-- Theme toggle -->
        <button class="nav-icon-btn" onclick={toggleTheme} type="button" aria-label="Toggle theme">
          {#if theme === 'dark'}
            <Sun size={15} strokeWidth={2} />
          {:else}
            <Moon size={15} strokeWidth={2} />
          {/if}
        </button>

        <!-- Avatar -->
        <button class="nav-avatar-btn" onclick={openBio} type="button" aria-label="View profile">
          <div class="nav-avatar">
            <span class="nav-avatar-initials">{initials()}</span>
          </div>
          <div class="nav-avatar-info">
            <span class="nav-avatar-name">{data.user.fullName.split(' ')[0]}</span>
            <span class="nav-avatar-role">Student</span>
          </div>
          <ChevronRight size={12} class="nav-avatar-chevron" />
        </button>

        <!-- Hamburger -->
        <button
          class="nav-icon-btn nav-hamburger"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onclick={toggleMenu}
        >
          {#if menuOpen}<X size={17} />{:else}<Menu size={17} />{/if}
        </button>

      </div>
    </div>

    <!-- Mobile dropdown -->
    {#if menuOpen}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="mobile-overlay" onclick={closeMenu}></div>
      <div class="mobile-menu">

        <!-- User card -->
        <button class="mobile-user-card" type="button" onclick={openBio}>
          <div class="mobile-avatar">
            <span>{initials()}</span>
          </div>
          <div class="mobile-user-info">
            <p class="mobile-user-name">{data.user.fullName}</p>
            <p class="mobile-user-meta">{data.user.matricNumber ?? data.user.email}</p>
          </div>
          <ChevronRight size={14} class="mobile-chevron" />
        </button>

        <div class="mobile-sep"></div>

        {#each links as link}
          <a
            href={link.href}
            class="mobile-nav-link"
            class:active={isActive(link.href)}
            onclick={closeMenu}
          >
            <div class="mobile-link-icon" class:active={isActive(link.href)}>
              <link.icon size={15} />
            </div>
            <span>{link.label}</span>
            {#if isActive(link.href)}<span class="mobile-active-dot"></span>{/if}
          </a>
        {/each}

        <div class="mobile-sep"></div>

        <div class="mobile-utils">
          <button class="mobile-util-btn" type="button" onclick={() => { toggleTheme(); }}>
            {#if theme === 'dark'}
              <Sun size={15} /> Light Mode
            {:else}
              <Moon size={15} /> Dark Mode
            {/if}
          </button>

          <form method="POST" action="/logout">
            <button type="submit" class="mobile-util-btn logout">
              <LogOut size={15} /> Sign Out
            </button>
          </form>
        </div>
      </div>
    {/if}

  </header>

  <!-- ══ MAIN ════════════════════════════════════════════════ -->
  <main class="layout-main">
    {@render children()}
  </main>

</div>

<!-- ══ BIO MODAL ════════════════════════════════════════════ -->
{#if bioOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bio-title"
    onclick={(e) => { if (e.target === e.currentTarget) closeBio(); }}
    onkeydown={(e) => { if (e.key === 'Escape') closeBio(); }}
  >
    <div class="bio-modal">

      <!-- Decorative top strip -->
      <div class="bio-strip"></div>

      <!-- Header -->
      <div class="bio-header">
        <div class="bio-avatar-wrap">
          <div class="bio-avatar">
            <span>{initials()}</span>
          </div>
          <div class="bio-avatar-ring" aria-hidden="true"></div>
        </div>
        <div class="bio-header-text">
          <h2 id="bio-title">{data.user.fullName}</h2>
          <div class="bio-chips">
            <span class="bio-chip green"><GraduationCap size={11} /> Student</span>
            <span class="bio-chip" class:active-chip={data.user.isActive} class:inactive-chip={!data.user.isActive}>
              <ShieldCheck size={11} />
              {data.user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <button class="bio-close-btn" onclick={closeBio} type="button" aria-label="Close profile">
          <X size={16} />
        </button>
      </div>

      <!-- Info rows -->
      <div class="bio-body">
        <div class="bio-field">
          <div class="bio-field-icon"><Mail size={14} /></div>
          <div>
            <p class="bio-field-label">Email</p>
            <p class="bio-field-value">{data.user.email}</p>
          </div>
        </div>

        {#if data.user.matricNumber}
          <div class="bio-field">
            <div class="bio-field-icon"><Hash size={14} /></div>
            <div>
              <p class="bio-field-label">Matric Number</p>
              <p class="bio-field-value mono">{data.user.matricNumber}</p>
            </div>
          </div>
        {/if}

        {#if data.user.level}
          <div class="bio-field">
            <div class="bio-field-icon"><Layers size={14} /></div>
            <div>
              <p class="bio-field-label">Level</p>
              <p class="bio-field-value">{data.user.level} Level</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer actions -->
      <div class="bio-footer">
        <a href="/enroll" class="bio-action-outline" onclick={closeBio}>
          <Camera size={14} /> Update Face ID
        </a>
        <form method="POST" action="/logout" style="flex:1">
          <button type="submit" class="bio-action-logout">
            <LogOut size={14} /> Sign Out
          </button>
        </form>
      </div>

    </div>
  </div>
{/if}

<style>
  /* ── CSS vars ────────────────────────────────────────── */
  :root {
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-900: #14532d;
    --green-glow: rgba(34, 197, 94, 0.18);
    --green-soft: rgba(34, 197, 94, 0.08);
    --nav-h: 58px;
  }

  /* ── Layout ──────────────────────────────────────────── */
  .layout {
    display: flex; flex-direction: column; min-height: 100vh;
    background: var(--color-bg);
  }
  .layout-main { flex: 1; }

  /* ══ NAVBAR ══════════════════════════════════════════════ */
  .navbar {
    position: sticky; top: 0; z-index: 100;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    box-shadow: 0 1px 0 var(--color-border);
  }

  /* 2px green accent line at very top */
  .navbar-accent {
    height: 2.5px;
    background: linear-gradient(90deg, var(--green-700), var(--green-500), var(--green-700));
  }

  .nav-inner {
    max-width: 1280px; margin: 0 auto;
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0 1.5rem; height: var(--nav-h);
  }

  /* ── Brand ────────────────────────────────────────────── */
  .nav-brand {
    display: flex; align-items: center; gap: 0.6rem;
    text-decoration: none; flex-shrink: 0; margin-right: 0.5rem;
  }
  .brand-mark {
    width: 34px; height: 34px; border-radius: 8px;
    background: var(--green-soft);
    border: 1px solid rgba(34,197,94,0.2);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
    transition: border-color 0.2s;
  }
  .nav-brand:hover .brand-mark { border-color: rgba(34,197,94,0.5); }
  .brand-logo { width: 22px; height: 22px; object-fit: contain; }

  .brand-wordmark {
    display: none; flex-direction: column; line-height: 1;
  }
  @media (min-width: 480px) { .brand-wordmark { display: flex; } }
  .brand-name {
    font-size: 0.9rem; font-weight: 900; letter-spacing: -0.02em;
    color: var(--color-text);
  }
  .brand-sub {
    font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em;
    color: var(--green-600); text-transform: uppercase;
  }
  [data-theme="dark"] .brand-sub { color: var(--green-500); }

  .brand-divider {
    width: 1px; height: 20px; background: var(--color-border);
    flex-shrink: 0; margin: 0 0.1rem;
    display: none;
  }
  @media (min-width: 600px) { .brand-divider { display: block; } }

  .brand-portal {
    display: none; font-size: 0.7rem; font-weight: 600;
    color: var(--color-muted); letter-spacing: 0.03em;
    white-space: nowrap;
  }
  @media (min-width: 600px) { .brand-portal { display: block; } }

  /* ── Nav links ────────────────────────────────────────── */
  .nav-links {
    display: none; align-items: center; gap: 0.15rem; flex: 1;
  }
  @media (min-width: 768px) { .nav-links { display: flex; } }

  .nav-link {
    position: relative;
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.45rem 0.8rem; border-radius: 0.5rem;
    text-decoration: none; font-size: 0.825rem; font-weight: 500;
    color: var(--color-muted);
    transition: color 0.15s, background 0.15s;
  }
  .nav-link:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }
  .nav-link.active {
    color: var(--green-700); font-weight: 700;
    background: var(--green-soft);
  }
  [data-theme="dark"] .nav-link.active {
    color: var(--green-500);
    background: var(--green-soft);
  }

  /* Bottom pip on active link */
  .nav-link-pip {
    position: absolute; bottom: -0.45rem; left: 50%;
    transform: translateX(-50%);
    width: 20px; height: 2px; border-radius: 1px;
    background: var(--green-600);
  }
  [data-theme="dark"] .nav-link-pip { background: var(--green-500); }

  /* ── Nav right ────────────────────────────────────────── */
  .nav-right { margin-left: auto; display: flex; align-items: center; gap: 0.3rem; }

  .nav-icon-btn {
    width: 34px; height: 34px; border-radius: 0.5rem;
    border: 1px solid transparent; background: none; cursor: pointer;
    color: var(--color-muted); display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0;
  }
  .nav-icon-btn:hover {
    background: var(--color-bg);
    border-color: var(--color-border);
    color: var(--color-text);
  }

  /* Avatar button */
  .nav-avatar-btn {
    display: none; align-items: center; gap: 0.45rem;
    background: none; border: 1px solid var(--color-border);
    border-radius: 0.6rem; padding: 0.3rem 0.6rem 0.3rem 0.3rem;
    cursor: pointer; color: var(--color-text);
    transition: all 0.15s; max-width: 200px;
  }
  @media (min-width: 480px) { .nav-avatar-btn { display: flex; } }
  .nav-avatar-btn:hover {
    border-color: var(--green-600);
    background: var(--green-soft);
  }
  [data-theme="dark"] .nav-avatar-btn:hover { border-color: var(--green-500); }

  .nav-avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
  }
  .nav-avatar-initials {
    font-size: 0.65rem; font-weight: 800; color: #fff; letter-spacing: 0.01em;
  }
  .nav-avatar-info {
    display: flex; flex-direction: column; align-items: flex-start; gap: 0; line-height: 1;
  }
  .nav-avatar-name { font-size: 0.8rem; font-weight: 700; color: var(--color-text); }
  .nav-avatar-role { font-size: 0.6rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .nav-avatar-btn :global(.nav-avatar-chevron) { color: var(--color-muted); flex-shrink: 0; }

  /* Hamburger — mobile only */
  .nav-hamburger { display: flex; }
  @media (min-width: 768px) { .nav-hamburger { display: none; } }

  /* ── Mobile menu ──────────────────────────────────────── */
  .mobile-overlay {
    position: fixed; inset: 0; z-index: 98; background: transparent;
  }
  .mobile-menu {
    position: absolute; top: 100%; left: 0; right: 0; z-index: 99;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 0.875rem 1rem 1.25rem;
    display: flex; flex-direction: column; gap: 0.2rem;
    box-shadow: 0 12px 32px rgba(0,0,0,0.1);
    animation: menu-drop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @media (min-width: 768px) { .mobile-menu { display: none; } }
  @keyframes menu-drop {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Mobile user card */
  .mobile-user-card {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.875rem; border-radius: 0.75rem; width: 100%;
    background: var(--green-soft); border: 1px solid rgba(34,197,94,0.15);
    cursor: pointer; text-align: left; font-family: inherit;
    transition: background 0.15s; margin-bottom: 0.25rem;
  }
  .mobile-user-card:hover { background: rgba(34,197,94,0.12); }
  .mobile-avatar {
    width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 0.8rem; font-weight: 800;
  }
  .mobile-user-info { flex: 1; min-width: 0; }
  .mobile-user-name {
    font-size: 0.9rem; font-weight: 700; color: var(--color-text);
    margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mobile-user-meta {
    font-size: 0.72rem; color: var(--color-muted);
    margin: 0.1rem 0 0; font-family: monospace;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mobile-user-card :global(.mobile-chevron) { color: var(--color-muted); flex-shrink: 0; }

  .mobile-sep { height: 1px; background: var(--color-border); margin: 0.4rem 0; }

  .mobile-nav-link {
    display: flex; align-items: center; gap: 0.7rem;
    padding: 0.65rem 0.75rem; border-radius: 0.6rem;
    font-size: 0.875rem; font-weight: 500; color: var(--color-text);
    text-decoration: none; transition: background 0.12s;
  }
  .mobile-nav-link:hover { background: var(--color-bg); }
  .mobile-nav-link.active { color: var(--green-700); font-weight: 700; }
  [data-theme="dark"] .mobile-nav-link.active { color: var(--green-500); }

  .mobile-link-icon {
    width: 30px; height: 30px; border-radius: 0.45rem; flex-shrink: 0;
    background: var(--color-bg); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); transition: all 0.15s;
  }
  .mobile-link-icon.active {
    background: var(--green-soft); border-color: rgba(34,197,94,0.2);
    color: var(--green-700);
  }
  [data-theme="dark"] .mobile-link-icon.active { color: var(--green-500); }

  .mobile-active-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--green-600); margin-left: auto; flex-shrink: 0;
  }
  [data-theme="dark"] .mobile-active-dot { background: var(--green-500); }

  .mobile-utils { display: flex; gap: 0.5rem; }
  .mobile-util-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.6rem; border: 1px solid var(--color-border); border-radius: 0.6rem;
    background: var(--color-bg); color: var(--color-muted);
    font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .mobile-util-btn:hover { border-color: var(--color-text); color: var(--color-text); }
  .mobile-util-btn.logout { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
  .mobile-util-btn.logout:hover { background: #fee2e2; }
  [data-theme="dark"] .mobile-util-btn.logout {
    background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.25); color: #fca5a5;
  }

  /* ══ BIO MODAL ════════════════════════════════════════════ */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: backdrop-in 0.2s ease;
  }
  @keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }

  .bio-modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem; width: 100%; max-width: 400px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.2);
    overflow: hidden;
    animation: modal-rise 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes modal-rise {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Green strip at top of modal */
  .bio-strip {
    height: 3px;
    background: linear-gradient(90deg, var(--green-700), var(--green-500), #34d399);
  }

  .bio-header {
    display: flex; align-items: flex-start; gap: 1rem;
    padding: 1.5rem;
    background: linear-gradient(160deg, var(--green-soft) 0%, transparent 60%);
    border-bottom: 1px solid var(--color-border);
  }

  /* Avatar with decorative ring */
  .bio-avatar-wrap { position: relative; flex-shrink: 0; }
  .bio-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; font-weight: 800; color: #fff;
    position: relative; z-index: 1;
  }
  .bio-avatar-ring {
    position: absolute; inset: -3px; border-radius: 50%;
    border: 2px solid rgba(34,197,94,0.3);
    animation: ring-pulse 3s ease-in-out infinite;
  }
  @keyframes ring-pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%       { opacity: 0.8; transform: scale(1.05); }
  }

  .bio-header-text { flex: 1; min-width: 0; }
  .bio-header-text h2 {
    font-size: 1rem; font-weight: 800; letter-spacing: -0.02em;
    color: var(--color-text); margin: 0 0 0.5rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .bio-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .bio-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.55rem;
    border-radius: 999px; border: 1px solid var(--color-border);
    color: var(--color-muted); background: var(--color-bg);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .bio-chip.green {
    background: var(--green-soft); border-color: rgba(34,197,94,0.25);
    color: var(--green-700);
  }
  [data-theme="dark"] .bio-chip.green { color: var(--green-500); }
  .active-chip  { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.2); color: var(--green-700); }
  .inactive-chip { background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.2); color: #dc2626; }
  [data-theme="dark"] .active-chip  { color: var(--green-500); }
  [data-theme="dark"] .inactive-chip { color: #f87171; }

  .bio-close-btn {
    width: 30px; height: 30px; border-radius: 0.5rem; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; align-self: flex-start;
  }
  .bio-close-btn:hover { border-color: var(--color-text); color: var(--color-text); }

  /* Bio body */
  .bio-body {
    padding: 1.25rem 1.5rem;
    display: flex; flex-direction: column; gap: 1rem;
  }
  .bio-field { display: flex; align-items: flex-start; gap: 0.875rem; }
  .bio-field-icon {
    width: 32px; height: 32px; border-radius: 0.5rem; flex-shrink: 0;
    background: var(--green-soft); border: 1px solid rgba(34,197,94,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--green-700); margin-top: 0.1rem;
  }
  [data-theme="dark"] .bio-field-icon { color: var(--green-500); }

  .bio-field-label {
    font-size: 0.65rem; font-weight: 700; color: var(--color-muted);
    margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.06em;
  }
  .bio-field-value {
    font-size: 0.875rem; font-weight: 500; color: var(--color-text); margin: 0;
  }
  .bio-field-value.mono { font-family: monospace; font-size: 0.9rem; }

  /* Bio footer */
  .bio-footer {
    display: flex; gap: 0.65rem; align-items: center;
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid var(--color-border);
  }
  .bio-action-outline {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.6rem 1rem; border: 1.5px solid var(--color-border);
    border-radius: 0.6rem; font-size: 0.8rem; font-weight: 700;
    color: var(--color-text); text-decoration: none; background: none;
    transition: all 0.15s; white-space: nowrap; font-family: inherit;
  }
  .bio-action-outline:hover {
    border-color: var(--green-600); color: var(--green-700);
    background: var(--green-soft);
  }
  [data-theme="dark"] .bio-action-outline:hover { color: var(--green-500); }

  .bio-action-logout {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    width: 100%; padding: 0.6rem 1rem;
    background: #fef2f2; border: 1.5px solid #fecaca;
    border-radius: 0.6rem; font-size: 0.8rem; font-weight: 700;
    color: #dc2626; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .bio-action-logout:hover { background: #fee2e2; border-color: #fca5a5; }
  [data-theme="dark"] .bio-action-logout {
    background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.25); color: #fca5a5;
  }
  [data-theme="dark"] .bio-action-logout:hover { background: rgba(220,38,38,0.14); }
</style>