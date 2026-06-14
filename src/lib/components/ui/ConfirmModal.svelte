<!-- src/lib/components/ui/Navbar.svelte -->
<script lang="ts">
  import { Sun, Moon, Menu, X, ChevronDown, LogOut } from '@lucide/svelte';
  import { toggleTheme, getTheme } from '$lib/index.js';
  import type { User } from '@prisma/client';

  interface Props {
    user: User;
    links: { href: string; label: string }[];
  }

  let { user, links }: Props = $props();
  let menuOpen = $state(false);
  let theme    = $derived(getTheme());

  const ROLE_COLORS: Record<string, string> = {
    admin: 'red', lecturer: 'blue', invigilator: 'purple', student: 'green',
  };

  function closeMenu() { menuOpen = false; }
</script>

<nav class="navbar">
  <div class="nav-inner">
    <a href="/" class="brand" aria-label="MOUAU eTest Home">
      <span class="brand-icon" aria-hidden="true">📋</span>
      <span class="brand-name">MOUAU eTest</span>
    </a>

    <!-- Desktop links -->
    <ul class="nav-links" role="list">
      {#each links as link}
        <li><a href={link.href} class="nav-link">{link.label}</a></li>
      {/each}
    </ul>

    <div class="nav-right">
      <!-- Theme toggle -->
      <button class="icon-btn" onclick={toggleTheme} type="button"
        aria-label="Switch to {theme === 'dark' ? 'light' : 'dark'} mode">
        {#if theme === 'dark'}
          <Sun size={16} />
        {:else}
          <Moon size={16} />
        {/if}
      </button>

      <!-- User dropdown -->
      <div class="user-menu">
        <button class="user-btn" onclick={() => { menuOpen = !menuOpen; }} type="button">
          <span class="avatar" aria-hidden="true">
            {user.fullName.charAt(0).toUpperCase()}
          </span>
          <span class="user-name">{user.fullName.split(' ')[0]}</span>
          <span class="role-chip {ROLE_COLORS[user.role]}">{user.role}</span>
          <ChevronDown size={14} class="chevron" />
        </button>

        {#if menuOpen}
          <div class="dropdown" role="menu">
            <div class="dropdown-header">
              <p class="d-name">{user.fullName}</p>
              <p class="d-email">{user.email}</p>
              {#if user.matricNumber}
                <p class="d-meta">{user.matricNumber}</p>
              {:else if user.staffId}
                <p class="d-meta">{user.staffId}</p>
              {/if}
            </div>
            <hr class="divider" />
            <form method="POST" action="/logout">
              <button type="submit" class="dropdown-item logout" role="menuitem">
                <LogOut size={14} />
                Sign Out
              </button>
            </form>
          </div>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="click-outside" onclick={closeMenu}></div>
        {/if}
      </div>

      <!-- Mobile hamburger -->
      <button class="hamburger" onclick={() => { menuOpen = !menuOpen; }}
        type="button" aria-label="Toggle menu" aria-expanded={menuOpen}>
        {#if menuOpen}
          <X size={18} />
        {:else}
          <Menu size={18} />
        {/if}
      </button>
    </div>
  </div>

  <!-- Mobile menu -->
  {#if menuOpen}
    <div class="mobile-menu" role="navigation">
      {#each links as link}
        <a href={link.href} class="mobile-link" onclick={closeMenu}>{link.label}</a>
      {/each}
      <hr class="divider" />
      <div class="mobile-user">
        <p class="d-name">{user.fullName}</p>
        <p class="d-email">{user.email}</p>
      </div>
      <form method="POST" action="/logout">
        <button type="submit" class="mobile-link logout">
          <LogOut size={14} />
          Sign Out
        </button>
      </form>
    </div>
  {/if}
</nav>

<style>
  .navbar {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    position: sticky; top: 0; z-index: 100;
  }
  .nav-inner {
    max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; gap: 1rem;
    padding: 0 1.5rem; height: 56px;
  }

  .brand {
    display: flex; align-items: center; gap: 0.5rem;
    text-decoration: none; font-weight: 800; font-size: 1rem;
    color: var(--color-text); flex-shrink: 0;
  }
  .brand-name { display: none; }
  @media (min-width: 600px) { .brand-name { display: block; } }

  .nav-links {
    display: none; list-style: none; padding: 0; margin: 0;
    gap: 0.15rem; flex: 1;
  }
  @media (min-width: 768px) { .nav-links { display: flex; } }

  .nav-link {
    padding: 0.4rem 0.75rem; border-radius: 0.4rem;
    text-decoration: none; font-size: 0.875rem; font-weight: 500;
    color: var(--color-muted); transition: color 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .nav-link:hover { color: var(--color-text); background: var(--color-surface-hover); }

  .nav-right { margin-left: auto; display: flex; align-items: center; gap: 0.4rem; }

  .icon-btn {
    width: 2rem; height: 2rem; border-radius: 0.4rem;
    border: none; background: none; cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .icon-btn:hover { background: var(--color-surface-hover); color: var(--color-text); }

  .user-menu { position: relative; }
  .user-btn {
    display: flex; align-items: center; gap: 0.4rem;
    background: none; border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.3rem 0.5rem;
    cursor: pointer; color: var(--color-text); transition: background 0.15s;
  }
  .user-btn:hover { background: var(--color-surface-hover); }

  .avatar {
    width: 1.75rem; height: 1.75rem; border-radius: 50%;
    background: var(--color-primary); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
  }
  .user-name { font-size: 0.875rem; font-weight: 500; display: none; }
  @media (min-width: 480px) { .user-name { display: block; } }

  .role-chip {
    font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.4rem;
    border-radius: 999px; display: none; text-transform: capitalize;
  }
  @media (min-width: 640px) { .role-chip { display: block; } }
  .role-chip.red    { background: #fee2e2; color: #dc2626; }
  .role-chip.blue   { background: #dbeafe; color: #1d4ed8; }
  .role-chip.purple { background: #f3e8ff; color: #7e22ce; }
  .role-chip.green  { background: #dcfce7; color: #16a34a; }

  :global(.chevron) { color: var(--color-muted); flex-shrink: 0; }

  .click-outside { position: fixed; inset: 0; z-index: 149; }

  .dropdown {
    position: absolute; right: 0; top: calc(100% + 0.5rem);
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; min-width: 210px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    overflow: hidden; z-index: 150;
    animation: dropdown-in 0.12s ease;
  }
  @keyframes dropdown-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .dropdown-header { padding: 0.875rem 1rem; }
  .d-name  { font-size: 0.875rem; font-weight: 600; margin: 0; }
  .d-email { font-size: 0.78rem; color: var(--color-muted); margin: 0.15rem 0 0; }
  .d-meta  { font-size: 0.75rem; color: var(--color-muted); margin: 0.1rem 0 0; font-family: monospace; }
  .divider { border: none; border-top: 1px solid var(--color-border); margin: 0; }

  .dropdown-item {
    display: flex; align-items: center; gap: 0.5rem;
    width: 100%; text-align: left;
    padding: 0.65rem 1rem; background: none; border: none;
    font-size: 0.875rem; cursor: pointer; color: var(--color-text);
    transition: background 0.1s;
  }
  .dropdown-item:hover { background: var(--color-surface-hover); }
  .dropdown-item.logout { color: #dc2626; }

  .hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 2rem; height: 2rem; padding: 0;
    background: none; border: none; cursor: pointer;
    color: var(--color-text);
  }
  @media (min-width: 768px) { .hamburger { display: none; } }

  .mobile-menu {
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid var(--color-border);
    display: flex; flex-direction: column; gap: 0.2rem;
    background: var(--color-surface);
  }
  @media (min-width: 768px) { .mobile-menu { display: none; } }

  .mobile-user { padding: 0.5rem 0.75rem; }
  .mobile-link {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.6rem 0.75rem; border-radius: 0.4rem;
    font-size: 0.9rem; font-weight: 500; color: var(--color-text);
    text-decoration: none; background: none; border: none;
    cursor: pointer; text-align: left; width: 100%;
    transition: background 0.1s;
  }
  .mobile-link:hover { background: var(--color-surface-hover); }
  .mobile-link.logout { color: #dc2626; }
</style>