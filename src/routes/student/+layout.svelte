<!-- src/routes/(student)/+layout.svelte -->
<script lang="ts">
  import { page,navigating }    from '$app/stores';
  import { onMount } from 'svelte';
  import { initTheme, toggleTheme, getTheme } from '$lib/index.js';
  import type { LayoutData } from './$types';
  import {
    LayoutDashboard, Camera, LogOut, Sun, Moon,
    Mail, Hash, Layers, GraduationCap, ShieldCheck,
    ChevronRight, X, AlertTriangle,BarChart2,
  } from 'lucide-svelte';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  onMount(() => initTheme());

  let theme       = $derived(getTheme());
  let bioOpen     = $state(false);
  let signOutOpen = $state(false);
  let collapsed   = $state(false);

 const links = [
  { href: '/student',         label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/student/results', label: 'My Results',     icon: BarChart2       },
  { href: '/student/enroll',  label: 'Face Enrollment', icon: Camera          },
];

  const currentPath = $derived($page.url.pathname);
 function isActive(href: string) {
  return currentPath === href;
}

  const initials = $derived(() => {
    const parts = data.user.fullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  });
</script>

<div class="layout" class:collapsed>

  <!-- ══ SIDEBAR ══════════════════════════════════════════════ -->
  <aside class="sidebar">

    <!-- Top: brand + collapse toggle -->
    <div class="sidebar-top">
      <a href="/student" class="brand" aria-label="MOUAU eTest home">
        <div class="brand-mark">
          <img src="/mouau_logo.png" alt="MOUAU" width="22" height="22" />
        </div>
        {#if !collapsed}
          <div class="brand-text">
            <span class="brand-name">MOUAU</span>
            <span class="brand-sub">eTest · Student</span>
          </div>
        {/if}
      </a>

      <button
        class="collapse-btn"
        type="button"
        onclick={() => collapsed = !collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronRight size={14} />
      </button>
    </div>

 <!-- Nav links -->
<nav class="sidebar-nav" aria-label="Main navigation">
 {#each links as { href, label, icon: Icon }}
  <a href={href}
    class="nav-link"
    class:active={isActive(href)}
    class:loading={$navigating?.to?.url.pathname === href}
    aria-current={isActive(href) ? 'page' : undefined}
    title={collapsed ? label : undefined}
  >
    <div class="nav-link-icon">
      {#if $navigating?.to?.url.pathname === href}
        <span class="nav-spinner"></span>
      {:else}
        <Icon size={16} strokeWidth={2} />
      {/if}
    </div>
    <span class="nav-link-label" class:hidden={collapsed}>{label}</span>
    <span class="active-pip" class:visible={isActive(href)} aria-hidden="true"></span>
  </a>
{/each}
</nav>

    <!-- Bottom: theme + avatar + signout -->
    <div class="sidebar-bottom">
      <!-- Theme toggle -->
      <button
        class="icon-btn"
        onclick={toggleTheme}
        type="button"
        aria-label="Toggle theme"
        title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
      >
        {#if theme === 'dark'}
          <Sun size={15} />
        {:else}
          <Moon size={15} />
        {/if}
        {#if !collapsed}<span>{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }</span>{/if}
      </button>

      <!-- Avatar / profile -->
      <button
        class="avatar-btn"
        onclick={() => bioOpen = true}
        type="button"
        aria-label="View profile"
        title={collapsed ? data.user.fullName : undefined}
      >
        <div class="avatar">
          <span>{initials()}</span>
        </div>
        {#if !collapsed}
          <div class="avatar-info">
            <span class="avatar-name">{data.user.fullName.split(' ')[0]}</span>
            <span class="avatar-role">Student</span>
          </div>
        {/if}
      </button>

      <!-- Sign out -->
      <button
        class="icon-btn signout-btn"
        type="button"
        onclick={() => signOutOpen = true}
        aria-label="Sign out"
        title={collapsed ? 'Sign out' : undefined}
      >
        <LogOut size={15} />
        {#if !collapsed}<span>Sign Out</span>{/if}
      </button>
    </div>

  </aside>

  <!-- ══ MAIN ════════════════════════════════════════════════ -->
  <main class="layout-main">
    {@render children()}
  </main>

</div>

<!-- ══ SIGN OUT CONFIRMATION MODAL ═════════════════════════ -->
{#if signOutOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="signout-title"
    onclick={(e) => { if (e.target === e.currentTarget) signOutOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') signOutOpen = false; }}
  >
    <div class="confirm-modal">
      <div class="confirm-icon-wrap">
        <div class="confirm-icon">
          <LogOut size={22} />
        </div>
      </div>

      <h2 id="signout-title">Sign out?</h2>
      <p>You'll need to sign in again to access your exams and results.</p>

      <div class="confirm-actions">
        <button
          class="btn-cancel"
          type="button"
          onclick={() => signOutOpen = false}
        >
          Cancel
        </button>

        <form method="POST" action="/logout" style="flex:1">
          <button type="submit" class="btn-signout">
            <LogOut size={14} /> Yes, sign out
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- ══ BIO MODAL ════════════════════════════════════════════ -->
{#if bioOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bio-title"
    onclick={(e) => { if (e.target === e.currentTarget) bioOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') bioOpen = false; }}
  >
    <div class="bio-modal">
      <div class="bio-strip"></div>

      <div class="bio-header">
        <div class="bio-avatar-wrap">
          <div class="bio-avatar"><span>{initials()}</span></div>
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
        <button class="bio-close-btn" onclick={() => bioOpen = false} type="button" aria-label="Close profile">
          <X size={16} />
        </button>
      </div>

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

      <div class="bio-footer">
        <a href="/enroll" class="bio-action-outline" onclick={() => bioOpen = false}>
          <Camera size={14} /> Update Face ID
        </a>
        <button
          type="button"
          class="bio-action-logout"
          onclick={() => { bioOpen = false; signOutOpen = true; }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :root {
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-soft: rgba(34, 197, 94, 0.08);
    --sidebar-w: 220px;
    --sidebar-w-collapsed: 60px;
  }

  /* ── Layout ──────────────────────────────────────────── */
  .layout {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    min-height: 100vh;
    background: var(--color-bg);
    transition: grid-template-columns 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .layout.collapsed {
    grid-template-columns: var(--sidebar-w-collapsed) 1fr;
  }

  .layout-main { overflow: auto; }

  /* ══ SIDEBAR ═════════════════════════════════════════════ */
  .sidebar {
    display: flex; flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    height: 100vh; position: sticky; top: 0;
    overflow: hidden;
    transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Top ─────────────────────────────────────────────── */
  .sidebar-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 0.75rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    gap: 0.5rem; flex-shrink: 0;
  }

  .brand {
    display: flex; align-items: center; gap: 0.6rem;
    text-decoration: none; min-width: 0; overflow: hidden;
  }
  .brand-mark {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    background: var(--green-soft); border: 1px solid rgba(34,197,94,0.2);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .brand-mark img { width: 20px; height: 20px; object-fit: contain; }
  .brand-text { display: flex; flex-direction: column; line-height: 1; min-width: 0; }
  .brand-name {
    font-size: 0.875rem; font-weight: 900; letter-spacing: -0.02em;
    color: var(--color-text); white-space: nowrap;
  }
  .brand-sub {
    font-size: 0.58rem; font-weight: 700; letter-spacing: 0.06em;
    color: var(--green-600); text-transform: uppercase; white-space: nowrap;
  }
  [data-theme="dark"] .brand-sub { color: var(--green-500); }

  .collapse-btn {
    width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .collapse-btn:hover { border-color: var(--green-600); color: var(--green-600); }
  .layout.collapsed .collapse-btn :global(svg) { transform: rotate(180deg); }

  /* ── Nav ─────────────────────────────────────────────── */
  .sidebar-nav {
    flex: 1; padding: 0.75rem 0.5rem;
    display: flex; flex-direction: column; gap: 0.2rem;
    overflow-y: auto; overflow-x: hidden;
  }

  .nav-link {
    position: relative;
    display: flex; align-items: center; gap: 0.65rem;
    padding: 0.6rem 0.65rem; border-radius: 0.6rem;
    text-decoration: none; font-size: 0.825rem; font-weight: 500;
    color: var(--color-muted); white-space: nowrap; overflow: hidden;
    transition: color 0.15s, background 0.15s;
  }
  .nav-link:hover { color: var(--color-text); background: var(--color-bg); }
  .nav-link.active {
    color: var(--green-700); font-weight: 700;
    background: var(--green-soft);
  }
  [data-theme="dark"] .nav-link.active { color: var(--green-500); }

  .nav-link-icon {
    width: 28px; height: 28px; border-radius: 0.45rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .nav-link.active .nav-link-icon {
    background: rgba(34,197,94,0.12);
  }

  .nav-link-label { flex: 1; }

  /* Left pip on active */
  .active-pip {
    position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 60%; border-radius: 0 2px 2px 0;
    background: var(--green-600);
  }
  [data-theme="dark"] .active-pip { background: var(--green-500); }

  /* ── Bottom ──────────────────────────────────────────── */
  .sidebar-bottom {
    padding: 0.5rem; border-top: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: 0.2rem; flex-shrink: 0;
  }

  .icon-btn {
    display: flex; align-items: center; gap: 0.65rem;
    padding: 0.6rem 0.65rem; border-radius: 0.6rem; width: 100%;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); font-size: 0.825rem; font-weight: 500;
    font-family: inherit; white-space: nowrap; overflow: hidden;
    transition: color 0.15s, background 0.15s;
  }
  .icon-btn :global(svg) { flex-shrink: 0; }
  .icon-btn:hover { color: var(--color-text); background: var(--color-bg); }

  .signout-btn:hover { color: #dc2626; background: #fef2f2; }
  [data-theme="dark"] .signout-btn:hover { color: #fca5a5; background: rgba(220,38,38,0.08); }

  .avatar-btn {
    display: flex; align-items: center; gap: 0.65rem;
    padding: 0.5rem 0.65rem; border-radius: 0.6rem; width: 100%;
    border: 1px solid var(--color-border); background: none; cursor: pointer;
    font-family: inherit; white-space: nowrap; overflow: hidden;
    transition: all 0.15s;
  }
  .avatar-btn:hover { border-color: var(--green-600); background: var(--green-soft); }
  [data-theme="dark"] .avatar-btn:hover { border-color: var(--green-500); }

  .avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
  }
  .avatar span { font-size: 0.65rem; font-weight: 800; color: #fff; }

  .avatar-info { display: flex; flex-direction: column; line-height: 1; min-width: 0; }
  .avatar-name {
    font-size: 0.8rem; font-weight: 700; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .avatar-role {
    font-size: 0.58rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  /* ══ MODALS ══════════════════════════════════════════════ */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem; animation: backdrop-in 0.2s ease;
  }
  @keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }

  /* ── Sign out confirm ────────────────────────────────── */
  .confirm-modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; width: 100%; max-width: 340px;
    padding: 2rem 1.75rem 1.75rem;
    box-shadow: 0 32px 80px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    text-align: center;
    animation: modal-rise 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes modal-rise {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .confirm-icon-wrap { margin-bottom: 0.5rem; }
  .confirm-icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: #fef2f2; border: 2px solid #fecaca;
    display: flex; align-items: center; justify-content: center;
    color: #dc2626;
  }
  [data-theme="dark"] .confirm-icon {
    background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.3); color: #fca5a5;
  }

  .confirm-modal h2 {
    font-size: 1.15rem; font-weight: 800; color: var(--color-text);
    margin: 0.25rem 0 0; letter-spacing: -0.02em;
  }
  .confirm-modal p {
    font-size: 0.825rem; color: var(--color-muted);
    margin: 0 0 1rem; line-height: 1.5;
  }

  .confirm-actions {
    display: flex; gap: 0.65rem; width: 100%;
  }
  .btn-cancel {
    flex: 1; padding: 0.7rem 1rem;
    border: 1.5px solid var(--color-border); border-radius: 0.6rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .btn-cancel:hover { border-color: var(--color-text); }

  .btn-signout {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    width: 100%; padding: 0.7rem 1rem;
    background: #dc2626; border: none; border-radius: 0.6rem;
    color: #fff; font-size: 0.875rem; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .btn-signout:hover { background: #b91c1c; }

  /* ── Bio modal (unchanged) ───────────────────────────── */
  .bio-modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; width: 100%; max-width: 400px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.2); overflow: hidden;
    animation: modal-rise 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .bio-strip {
    height: 3px;
    background: linear-gradient(90deg, var(--green-700), var(--green-500), #34d399);
  }
  .bio-header {
    display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem;
    background: linear-gradient(160deg, var(--green-soft) 0%, transparent 60%);
    border-bottom: 1px solid var(--color-border);
  }
  .bio-avatar-wrap { position: relative; flex-shrink: 0; }
  .bio-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, var(--green-700), var(--green-500));
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; font-weight: 800; color: #fff; position: relative; z-index: 1;
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
    background: var(--green-soft); border-color: rgba(34,197,94,0.25); color: var(--green-700);
  }
  [data-theme="dark"] .bio-chip.green { color: var(--green-500); }
  .active-chip   { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.2); color: var(--green-700); }
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

  .bio-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
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
  .bio-field-value { font-size: 0.875rem; font-weight: 500; color: var(--color-text); margin: 0; }
  .bio-field-value.mono { font-family: monospace; font-size: 0.9rem; }

  .bio-footer {
    display: flex; gap: 0.65rem; align-items: center;
    padding: 1rem 1.5rem 1.5rem; border-top: 1px solid var(--color-border);
  }
  .bio-action-outline {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.6rem 1rem; border: 1.5px solid var(--color-border);
    border-radius: 0.6rem; font-size: 0.8rem; font-weight: 700;
    color: var(--color-text); text-decoration: none; background: none;
    transition: all 0.15s; white-space: nowrap; font-family: inherit;
  }
  .bio-action-outline:hover { border-color: var(--green-600); color: var(--green-700); background: var(--green-soft); }
  [data-theme="dark"] .bio-action-outline:hover { color: var(--green-500); }

  .bio-action-logout {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    flex: 1; padding: 0.6rem 1rem;
    background: #fef2f2; border: 1.5px solid #fecaca;
    border-radius: 0.6rem; font-size: 0.8rem; font-weight: 700;
    color: #dc2626; cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .bio-action-logout:hover { background: #fee2e2; border-color: #fca5a5; }
  [data-theme="dark"] .bio-action-logout {
    background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.25); color: #fca5a5;
  }
  [data-theme="dark"] .bio-action-logout:hover { background: rgba(220,38,38,0.14); }

  /* ── Mobile fallback: collapse sidebar fully ─────────── */
  @media (max-width: 640px) {
    .layout { grid-template-columns: var(--sidebar-w-collapsed) 1fr; }
    .brand-text, .nav-link-label, .avatar-info, .icon-btn span { display: none; }
    .collapse-btn { display: none; }
  }
  .active-pip {
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 60%; border-radius: 0 2px 2px 0;
  background: var(--green-600);
  opacity: 0;
}
.active-pip.visible { opacity: 1; }
[data-theme="dark"] .active-pip { background: var(--green-500); }
.nav-link-label { flex: 1; transition: opacity 0.15s; }
.nav-link-label.hidden { opacity: 0; width: 0; overflow: hidden; pointer-events: none; }
.nav-link.loading {
  pointer-events: none;
  opacity: 0.6;
}

.nav-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--green-600);
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

</style>