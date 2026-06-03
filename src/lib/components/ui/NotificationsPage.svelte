<!-- src/lib/components/ui/NotificationsPage.svelte -->
<!-- Reusable notifications page UI. Pass accentColor for role branding. -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { Bell, CheckCheck, Trash2, X, CheckCircle, BellOff } from 'lucide-svelte';

  let {
    notifications,
    unreadCount,
    form,
    accentColor = '#16a34a',
    accentBg    = 'rgba(22,163,74,.12)',
  }: {
    notifications: { id: string; title: string; message: string; isRead: boolean; createdAt: Date | string }[];
    unreadCount: number;
    form: any;
    accentColor?: string;
    accentBg?: string;
  } = $props();

  let filter = $state<'all'|'unread'|'read'>('all');

  const filtered = $derived(
    filter === 'unread' ? notifications.filter(n => !n.isRead)
    : filter === 'read' ? notifications.filter(n =>  n.isRead)
    : notifications
  );

  function relative(d: Date | string) {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
</script>

<div class="notif-page">
  <div class="page-header">
    <div class="ph-icon" style="background: {accentColor}"><Bell size={20} /></div>
    <div>
      <h1>Notifications</h1>
      <p>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
    </div>
    <div class="ph-actions">
      {#if unreadCount > 0}
        <form method="POST" action="?/markAllRead" use:enhance>
          <button type="submit" class="btn-outline"><CheckCheck size={13} /> Mark all read</button>
        </form>
      {/if}
      {#if notifications.length > 0}
        <form method="POST" action="?/deleteAll" use:enhance>
          <button type="submit" class="btn-outline btn-red"><Trash2 size={13} /> Clear all</button>
        </form>
      {/if}
    </div>
  </div>

  {#if form?.success}
    <div class="toast-ok"><CheckCircle size={13} /> Done.</div>
  {/if}

  <div class="filter-tabs">
    {#each [
      { k: 'all',    l: `All (${notifications.length})` },
      { k: 'unread', l: `Unread (${unreadCount})` },
      { k: 'read',   l: `Read (${notifications.length - unreadCount})` },
    ] as tab}
      <button
        class="filter-tab"
        class:active={filter === tab.k}
        onclick={() => filter = tab.k as typeof filter}
      >{tab.l}</button>
    {/each}
  </div>

  <div class="list-card">
    {#if filtered.length === 0}
      <div class="empty"><BellOff size={28} /><p>No {filter !== 'all' ? filter : ''} notifications</p></div>
    {:else}
      {#each filtered as n (n.id)}
        <div class="notif-item" class:unread={!n.isRead}>
          <div class="ni-dot-wrap">
            {#if !n.isRead}<div class="ni-dot" style="background:{accentColor}"></div>{/if}
          </div>
          <div class="ni-body">
            <div class="ni-title">{n.title}</div>
            <div class="ni-msg">{n.message}</div>
            <div class="ni-time">{relative(n.createdAt)}</div>
          </div>
          <div class="ni-actions">
            {#if !n.isRead}
              <form method="POST" action="?/markRead" use:enhance>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" class="ni-btn" title="Mark read"><CheckCircle size={13} /></button>
              </form>
            {/if}
            <form method="POST" action="?/delete" use:enhance>
              <input type="hidden" name="id" value={n.id} />
              <button type="submit" class="ni-btn ni-del" title="Delete"><Trash2 size={13} /></button>
            </form>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .notif-page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 680px; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .ph-icon { width: 44px; height: 44px; border-radius: .75rem; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); }
  .ph-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
  .btn-outline { display: flex; align-items: center; gap: .375rem; padding: .45rem .875rem; background: none; border: 1px solid var(--color-border); border-radius: .5rem; font-size: .78rem; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--color-text); }
  .btn-outline:hover { background: var(--color-surface-hover); }
  .btn-red:hover { border-color: #dc2626; color: #dc2626; }
  .toast-ok { display: flex; align-items: center; gap: .5rem; padding: .625rem .875rem; background: rgba(22,163,74,.08); border: 1px solid rgba(22,163,74,.25); border-radius: .5rem; font-size: .78rem; color: #16a34a; }
  .filter-tabs { display: flex; gap: .25rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .5rem; padding: .25rem; align-self: flex-start; }
  .filter-tab { padding: .4rem .875rem; border-radius: .375rem; border: none; background: none; font-size: .75rem; font-weight: 500; color: var(--color-muted); cursor: pointer; font-family: inherit; }
  .filter-tab.active { background: var(--color-surface); color: var(--color-text); font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .list-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .notif-item { display: flex; align-items: flex-start; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border); transition: background .1s; }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-surface-hover); }
  .ni-dot-wrap { width: 16px; display: flex; justify-content: center; padding-top: .35rem; flex-shrink: 0; }
  .ni-dot { width: 8px; height: 8px; border-radius: 50%; }
  .ni-body { flex: 1; min-width: 0; }
  .ni-title { font-size: .85rem; font-weight: 700; color: var(--color-text); }
  .ni-msg { font-size: .78rem; color: var(--color-muted); margin-top: .25rem; line-height: 1.45; }
  .ni-time { font-size: .68rem; color: var(--color-muted); margin-top: .375rem; }
  .ni-actions { display: flex; gap: .375rem; flex-shrink: 0; }
  .ni-btn { width: 28px; height: 28px; border-radius: .375rem; border: 1px solid var(--color-border); background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--color-muted); }
  .ni-btn:hover { background: var(--color-bg); color: #16a34a; border-color: #16a34a; }
  .ni-del:hover { color: #dc2626 !important; border-color: #dc2626 !important; }
  .empty { padding: 3.5rem; display: flex; flex-direction: column; align-items: center; gap: .875rem; color: var(--color-muted); }
  .empty p { font-size: .9rem; text-transform: capitalize; }
</style>