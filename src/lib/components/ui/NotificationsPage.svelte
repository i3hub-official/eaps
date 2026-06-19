<!-- src/lib/components/ui/NotificationsPage.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  interface Notification {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }

  interface Props {
    notifications: Notification[];
    unreadCount: number;
  }

  let { notifications, unreadCount }: Props = $props();

  let currentRole = $derived.by(() => {
    const path = $page.url.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/lecturer')) return 'lecturer';
    if (path.startsWith('/invigilator')) return 'invigilator';
    if (path.startsWith('/student')) return 'student';
    return 'default';
  });

  const roleStyles = {
    admin: {
      accent: 'var(--admin-accent, #6366f1)',
      accentSoft: 'var(--admin-accent-bg, rgba(99,102,241,0.08))',
      accentMid: 'rgba(99,102,241,0.15)',
      border: 'var(--admin-border, rgba(99,102,241,0.15))'
    },
    lecturer: {
      accent: 'var(--lecturer-accent, #8b5cf6)',
      accentSoft: 'var(--lecturer-accent-bg, rgba(139,92,246,0.08))',
      accentMid: 'rgba(139,92,246,0.15)',
      border: 'var(--lecturer-border, rgba(139,92,246,0.15))'
    },
    invigilator: {
      accent: 'var(--invigilator-accent, #f59e0b)',
      accentSoft: 'var(--invigilator-accent-bg, rgba(245,158,11,0.08))',
      accentMid: 'rgba(245,158,11,0.15)',
      border: 'var(--invigilator-border, rgba(245,158,11,0.15))'
    },
    student: {
      accent: 'var(--student-accent, #10b981)',
      accentSoft: 'var(--student-accent-bg, rgba(16,185,129,0.08))',
      accentMid: 'rgba(16,185,129,0.15)',
      border: 'var(--student-border, rgba(16,185,129,0.15))'
    },
    default: {
      accent: 'var(--g500, #22c55e)',
      accentSoft: 'rgba(34,197,94,0.08)',
      accentMid: 'rgba(34,197,94,0.15)',
      border: 'rgba(34,197,94,0.15)'
    }
  };

  const s = $derived(roleStyles[currentRole] || roleStyles.default);

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  let filter = $state<'all' | 'unread'>('all');

  const visible = $derived(
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications
  );

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    lecturer: 'Lecturer',
    invigilator: 'Invigilator',
    student: 'Student',
    default: ''
  };

  const totalCount = $derived(notifications.length);
  const unreadPercent = $derived(
    totalCount > 0 ? Math.round((unreadCount / totalCount) * 100) : 0
  );
</script>

<div class="np" style="--accent: {s.accent}; --accent-soft: {s.accentSoft}; --accent-mid: {s.accentMid}; --accent-border: {s.border}">
  
  <!-- Page Header -->
  <header class="np-header">
    <div class="np-header-top">
      <div class="np-title-group">
        <div class="np-title-row">
          <h1 class="np-title">Notifications</h1>
          {#if currentRole !== 'default'}
            <span class="np-role-chip">{roleLabels[currentRole]}</span>
          {/if}
        </div>
        {#if totalCount > 0}
          <p class="np-subtitle">
            {unreadCount > 0 
              ? `${unreadCount} of ${totalCount} unread` 
              : `${totalCount} notification${totalCount !== 1 ? 's' : ''}, all caught up`}
          </p>
        {/if}
      </div>

      {#if unreadCount > 0}
        <div class="np-progress-ring" aria-hidden="true">
          <svg viewBox="0 0 36 36" class="np-ring-svg">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--accent-soft)" stroke-width="3"/>
            <circle 
              cx="18" cy="18" r="15.5" fill="none" 
              stroke="var(--accent)" stroke-width="3"
              stroke-dasharray="{unreadPercent * 0.974} 97.4"
              stroke-linecap="round"
              transform="rotate(-90 18 18)"
              class="np-ring-fill"
            />
          </svg>
          <span class="np-ring-text">{unreadCount}</span>
        </div>
      {/if}
    </div>

    <!-- Controls Bar -->
    <div class="np-controls">
      <div class="np-filter-group">
        <button 
          class="np-filter" 
          class:active={filter === 'all'} 
          onclick={() => filter = 'all'}
        >
          All
          <span class="np-filter-count">{totalCount}</span>
        </button>
        <button 
          class="np-filter" 
          class:active={filter === 'unread'} 
          onclick={() => filter = 'unread'}
        >
          Unread
          {#if unreadCount > 0}
            <span class="np-filter-count np-filter-count--accent">{unreadCount}</span>
          {/if}
        </button>
      </div>

      <div class="np-actions">
        {#if unreadCount > 0}
          <form method="POST" action="?/mark_all_read" use:enhance>
            <button class="np-btn" type="submit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Mark all read
            </button>
          </form>
        {/if}
        {#if notifications.length > 0}
          <form method="POST" action="?/delete_all" use:enhance>
            <button class="np-btn np-btn--ghost" type="submit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Clear all
            </button>
          </form>
        {/if}
      </div>
    </div>
  </header>

  <!-- Empty State -->
  {#if visible.length === 0}
    <div class="np-empty">
      <div class="np-empty-visual">
        <div class="np-empty-bell">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div class="np-empty-ring"></div>
      </div>
      <h3 class="np-empty-title">
        {filter === 'unread' ? 'All caught up!' : 'No notifications'}
      </h3>
      <p class="np-empty-desc">
        {filter === 'unread' 
          ? "You've read all your notifications. Nice work." 
          : 'When you get notifications, they\'ll show up here.'}
      </p>
    </div>
  {:else}
    <!-- Notification List -->
    <div class="np-list" role="list">
      {#each visible as n, i (n.id)}
        <article 
          class="np-item" 
          class:unread={!n.isRead}
          style="animation-delay: {i * 40}ms"
          role="listitem"
        >
          <!-- Unread indicator bar -->
          {#if !n.isRead}
            <div class="np-item-accent"></div>
          {/if}

          <div class="np-item-content">
            <div class="np-item-header">
              <h3 class="np-item-title">{n.title}</h3>
              <time class="np-item-time" datetime={n.createdAt}>{timeAgo(n.createdAt)}</time>
            </div>
            <p class="np-item-msg">{n.message}</p>
          </div>

          <div class="np-item-actions">
            {#if !n.isRead}
              <form method="POST" action="?/mark_read" use:enhance>
                <input type="hidden" name="id" value={n.id} />
                <button 
                  class="np-icon-btn" 
                  type="submit" 
                  title="Mark as read"
                  aria-label="Mark as read"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </form>
            {/if}
            <form method="POST" action="?/delete" use:enhance>
              <input type="hidden" name="id" value={n.id} />
              <button 
                class="np-icon-btn np-icon-btn--danger" 
                type="submit" 
                title="Delete notification"
                aria-label="Delete notification"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </form>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* ── Base ─────────────────────────────────────── */
  .np {
    max-width: 680px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
    font-family: inherit;
  }

  /* ── Header ───────────────────────────────────── */
  .np-header {
    margin-bottom: 1.75rem;
  }

  .np-header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .np-title-group {
    min-width: 0;
  }

  .np-title-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 0.35rem;
  }

  .np-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text, #0a0a0a);
    margin: 0;
    letter-spacing: -0.025em;
    line-height: 1.2;
  }

  .np-role-chip {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    background: var(--accent);
    color: #fff;
    line-height: 1.4;
  }

  .np-subtitle {
    font-size: 0.85rem;
    color: var(--color-muted, #737373);
    margin: 0;
    font-weight: 500;
  }

  /* Progress Ring */
  .np-progress-ring {
    position: relative;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
  }

  .np-ring-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .np-ring-fill {
    transition: stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .np-ring-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--accent);
  }

  /* ── Controls ─────────────────────────────────── */
  .np-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .np-filter-group {
    display: flex;
    background: var(--color-bg, #fafafa);
    border: 1px solid var(--color-border, #e5e5e5);
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
  }

  .np-filter {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.45rem 0.875rem;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--color-muted, #737373);
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .np-filter:hover {
    color: var(--color-text, #0a0a0a);
  }

  .np-filter.active {
    background: #fff;
    color: var(--color-text, #0a0a0a);
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  }

  .np-filter-count {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.05rem 0.35rem;
    border-radius: 6px;
    background: var(--color-border, #e5e5e5);
    color: var(--color-muted, #737373);
    line-height: 1.5;
    min-width: 1.25rem;
    text-align: center;
    transition: all 0.2s ease;
  }

  .np-filter.active .np-filter-count {
    background: var(--color-border, #e5e5e5);
    color: var(--color-text, #0a0a0a);
  }

  .np-filter-count--accent {
    background: var(--accent-soft) !important;
    color: var(--accent) !important;
  }

  .np-filter.active .np-filter-count--accent {
    background: var(--accent-mid) !important;
    color: var(--accent) !important;
  }

  .np-actions {
    display: flex;
    gap: 0.5rem;
  }

  .np-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.875rem;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--color-text, #0a0a0a);
    background: var(--color-bg, #fafafa);
    border: 1px solid var(--color-border, #e5e5e5);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .np-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-soft);
  }

  .np-btn:active {
    transform: scale(0.97);
  }

  .np-btn--ghost {
    color: var(--color-muted, #737373);
  }

  .np-btn--ghost:hover {
    color: #ef4444;
    border-color: rgba(239,68,68,0.3);
    background: rgba(239,68,68,0.05);
  }

  /* ── Empty State ──────────────────────────────── */
  .np-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 1.5rem 3.5rem;
    text-align: center;
  }

  .np-empty-visual {
    position: relative;
    width: 96px;
    height: 96px;
    margin-bottom: 1.5rem;
  }

  .np-empty-bell {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: var(--color-bg, #fafafa);
    border: 1px solid var(--color-border, #e5e5e5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted, #a3a3a3);
  }

  .np-empty-ring {
    position: absolute;
    inset: 0;
    border: 2px dashed var(--color-border, #e5e5e5);
    border-radius: 50%;
    animation: emptySpin 20s linear infinite;
  }

  @keyframes emptySpin {
    to { transform: rotate(360deg); }
  }

  .np-empty-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text, #0a0a0a);
    margin: 0 0 0.375rem;
  }

  .np-empty-desc {
    font-size: 0.85rem;
    color: var(--color-muted, #737373);
    margin: 0;
    max-width: 280px;
    line-height: 1.5;
  }

  /* ── Notification List ────────────────────────── */
  .np-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .np-item {
    position: relative;
    display: flex;
    align-items: stretch;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e5e5e5);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease;
    animation: itemSlideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  @keyframes itemSlideIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .np-item:hover {
    border-color: color-mix(in srgb, var(--color-border, #e5e5e5) 50%, var(--accent) 50%);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }

  .np-item.unread {
    border-color: var(--accent-border);
    background: var(--accent-soft);
  }

  .np-item.unread:hover {
    border-color: var(--accent-mid);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  /* Accent bar for unread */
  .np-item-accent {
    width: 3px;
    flex-shrink: 0;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
  }

  .np-item-content {
    flex: 1;
    min-width: 0;
    padding: 0.875rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .np-item-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .np-item-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-text, #0a0a0a);
    margin: 0;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .np-item.unread .np-item-title {
    font-weight: 800;
  }

  .np-item-time {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--color-muted, #a3a3a3);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .np-item-msg {
    font-size: 0.82rem;
    color: var(--color-muted, #737373);
    margin: 0;
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .np-item.unread .np-item-msg {
    color: color-mix(in srgb, var(--color-muted, #737373) 70%, var(--color-text, #0a0a0a) 30%);
  }

  /* Item Actions */
  .np-item-actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0.625rem 0.75rem;
    gap: 0.375rem;
    flex-shrink: 0;
    opacity: 0;
    transform: translateX(4px);
    transition: all 0.2s ease;
  }

  .np-item:hover .np-item-actions {
    opacity: 1;
    transform: translateX(0);
  }

  .np-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-muted, #a3a3a3);
    transition: all 0.15s ease;
  }

  .np-icon-btn:hover {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-border);
  }

  .np-icon-btn:active {
    transform: scale(0.9);
  }

  .np-icon-btn--danger:hover {
    background: rgba(239,68,68,0.06);
    color: #ef4444;
    border-color: rgba(239,68,68,0.2);
  }

  /* ── Mobile ───────────────────────────────────── */
  @media (max-width: 640px) {
    .np {
      padding: 1.25rem 1rem 2.5rem;
    }

    .np-title {
      font-size: 1.3rem;
    }

    .np-header-top {
      margin-bottom: 1rem;
    }

    .np-controls {
      flex-direction: column;
      align-items: stretch;
      gap: 0.625rem;
    }

    .np-filter-group {
      width: 100%;
    }

    .np-filter {
      flex: 1;
      justify-content: center;
      padding: 0.5rem 0.75rem;
    }

    .np-actions {
      display: flex;
      gap: 0.5rem;
    }

    .np-btn {
      flex: 1;
      justify-content: center;
      padding: 0.5rem 0.5rem;
      font-size: 0.75rem;
    }

    .np-btn svg {
      display: none;
    }

    /* Always show actions on mobile (no hover) */
    .np-item-actions {
      opacity: 1;
      transform: translateX(0);
      flex-direction: row;
      padding: 0.625rem 0.75rem;
      align-items: center;
      border-left: 1px solid var(--color-border, #e5e5e5);
    }

    .np-item.unread .np-item-actions {
      border-left-color: var(--accent-border);
    }

    .np-item {
      border-radius: 10px;
    }

    .np-item-content {
      padding: 0.75rem 0.875rem;
    }

    .np-item-header {
      flex-direction: column;
      gap: 0.15rem;
    }

    .np-item-title {
      white-space: normal;
      -webkit-line-clamp: 1;
    }

    .np-empty {
      padding: 3rem 1rem 2.5rem;
    }

    .np-progress-ring {
      width: 44px;
      height: 44px;
    }

    .np-ring-text {
      font-size: 0.7rem;
    }
  }

  @media (max-width: 380px) {
    .np-role-chip {
      display: none;
    }

    .np-filter-count {
      display: none;
    }
  }

  /* ── Dark mode ────────────────────────────────── */
  @media (prefers-color-scheme: dark) {
    .np-item.unread {
      --accent-soft: color-mix(in srgb, var(--accent) 6%, var(--color-surface, #1a1a1a));
    }

    .np-filter.active {
      background: var(--color-surface, #1a1a1a);
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }

    .np-item:hover {
      box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    }
  }

  /* ── Reduced motion ───────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .np-item {
      animation: none;
    }

    .np-empty-ring {
      animation: none;
    }

    .np-ring-fill {
      transition: none;
    }
  }
</style>