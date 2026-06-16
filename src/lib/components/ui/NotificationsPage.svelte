<!-- src/lib/components/ui/NotificationsPage.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';

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

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  let filter = $state<'all' | 'unread'>('all');
  const visible = $derived(
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications
  );
</script>

<div class="notif-page">
  <header class="notif-header">
    <div class="header-left">
      <h1>Notifications</h1>
      {#if unreadCount > 0}
        <span class="badge">{unreadCount} unread</span>
      {/if}
    </div>
    <div class="header-actions">
      <div class="filter-tabs">
        <button class="tab" class:active={filter === 'all'} onclick={() => filter = 'all'}>All</button>
        <button class="tab" class:active={filter === 'unread'} onclick={() => filter = 'unread'}>Unread</button>
      </div>
      {#if unreadCount > 0}
        <form method="POST" action="?/mark_all_read" use:enhance>
          <button class="action-btn" type="submit">Mark all read</button>
        </form>
      {/if}
      {#if notifications.length > 0}
        <form method="POST" action="?/delete_all" use:enhance>
          <button class="action-btn danger" type="submit">Clear all</button>
        </form>
      {/if}
    </div>
  </header>

  {#if visible.length === 0}
    <div class="empty">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <p>{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
    </div>
  {:else}
    <ul class="notif-list">
      {#each visible as n (n.id)}
        <li class="notif-item" class:unread={!n.isRead}>
          <div class="notif-dot" class:dot-unread={!n.isRead}></div>
          <div class="notif-body">
            <p class="notif-title">{n.title}</p>
            <p class="notif-msg">{n.message}</p>
            <time class="notif-time">{timeAgo(n.createdAt)}</time>
          </div>
          <div class="notif-item-actions">
            {#if !n.isRead}
              <form method="POST" action="?/mark_read" use:enhance>
                <input type="hidden" name="id" value={n.id} />
                <button class="icon-btn" type="submit" title="Mark as read">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </form>
            {/if}
            <form method="POST" action="?/delete" use:enhance>
              <input type="hidden" name="id" value={n.id} />
              <button class="icon-btn danger" type="submit" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </form>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .notif-page { max-width: 720px; margin: 0 auto; padding: 1.5rem; }

  .notif-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem;
  }
  .header-left { display: flex; align-items: center; gap: 0.75rem; }
  .header-left h1 { font-size: 1.35rem; font-weight: 800; margin: 0; color: var(--color-text); }
  .badge {
    padding: 0.2rem 0.6rem; border-radius: 999px;
    background: var(--g500, #22c55e); color: #fff;
    font-size: 0.72rem; font-weight: 800;
  }

  .header-actions { display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap; }

  .filter-tabs { display: flex; border: 1.5px solid var(--color-border); border-radius: 0.5rem; overflow: hidden; }
  .tab {
    padding: 0.4rem 0.875rem; font-size: 0.8rem; font-weight: 700;
    background: none; border: none; cursor: pointer; color: var(--color-muted);
    transition: all 0.15s;
  }
  .tab.active { background: var(--color-surface); color: var(--color-text); }
  .tab:not(:last-child) { border-right: 1.5px solid var(--color-border); }

  .action-btn {
    padding: 0.4rem 0.875rem; border-radius: 0.5rem; font-size: 0.78rem; font-weight: 700;
    border: 1.5px solid var(--color-border); background: var(--color-surface);
    color: var(--color-text); cursor: pointer; transition: all 0.15s;
  }
  .action-btn:hover { border-color: var(--color-text); }
  .action-btn.danger { color: #ef4444; border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.04); }
  .action-btn.danger:hover { background: rgba(239,68,68,0.1); }

  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.875rem;
    padding: 4rem 1rem; border: 1.5px dashed var(--color-border); border-radius: 1rem;
    color: var(--color-muted); text-align: center;
  }
  .empty-icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--color-bg); border: 1.5px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted);
  }
  .empty p { font-size: 0.9rem; margin: 0; }

  .notif-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }

  .notif-item {
    display: flex; align-items: flex-start; gap: 0.875rem;
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .notif-item:first-child { border-top: 1px solid var(--color-border); }
  .notif-item.unread { background: var(--color-bg); margin: 0 -0.75rem; padding-left: 0.75rem; padding-right: 0.75rem; border-radius: 0.5rem; border-color: transparent; margin-bottom: 2px; }

  .notif-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 0.35rem;
    background: var(--color-border);
  }
  .notif-dot.dot-unread { background: var(--g500, #22c55e); box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }

  .notif-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.25rem; }
  .notif-title { font-size: 0.9rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .notif-msg { font-size: 0.84rem; color: var(--color-muted); margin: 0; line-height: 1.5; }
  .notif-time { font-size: 0.72rem; color: var(--color-muted); opacity: 0.7; }

  .notif-item-actions { display: flex; gap: 0.375rem; flex-shrink: 0; }
  .icon-btn {
    width: 30px; height: 30px; border-radius: 0.375rem;
    border: 1.5px solid var(--color-border); background: var(--color-surface);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--color-muted); transition: all 0.15s;
  }
  .icon-btn:hover { border-color: var(--color-text); color: var(--color-text); }
  .icon-btn.danger:hover { border-color: rgba(239,68,68,0.4); color: #ef4444; background: rgba(239,68,68,0.06); }
</style>