<!-- src/routes/student/notifications/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import { Bell, CheckCheck, Trash2, X } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  let notifications = $state(data.notifications);
  let markingAll    = $state(false);

  const unread = $derived(notifications.filter((n: any) => !n.isRead).length);

  function relativeTime(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d < 30 ? `${d}d ago` : new Date(date).toLocaleDateString('en-GB');
  }

  function typeBadgeClass(type: string) {
    return { info:'type-info', warning:'type-warning', alert:'type-alert', error:'type-error', critical:'type-critical' }[type] || 'type-info';
  }
</script>

<svelte:head><title>Notifications — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>Notifications</h1>
      <p class="subtitle">{notifications.length} total · {unread} unread</p>
    </div>
    {#if unread > 0}
      <form method="POST" action="?/markAllRead" use:enhance={() => {
        markingAll = true;
        return async ({ update }) => {
          await update();
          notifications = notifications.map((n: any) => ({ ...n, isRead: true }));
          markingAll = false;
        };
      }}>
        <button type="submit" class="btn-mark-all" disabled={markingAll}>
          <CheckCheck size={14} />
          {markingAll ? 'Marking…' : 'Mark all read'}
        </button>
      </form>
    {/if}
  </header>

  {#if notifications.length === 0}
    <div class="empty">
      <Bell size={40} strokeWidth={1.2} />
      <p class="empty-title">All caught up</p>
      <p class="empty-sub">No notifications to show.</p>
    </div>
  {:else}
    <div class="notif-list">
      {#each notifications as n (n.id)}
        <div class="notif-item" class:unread={!n.isRead}>
          <div class="notif-dot-col">
            {#if !n.isRead}<div class="notif-dot"></div>{/if}
          </div>
          <div class="notif-body">
            <div class="notif-head-row">
              <p class="notif-title">{n.title}</p>
              {#if n.type}<span class="type-badge {typeBadgeClass(n.type)}">{n.type}</span>{/if}
            </div>
            <p class="notif-msg">{n.message}</p>
            <span class="notif-time">{relativeTime(n.createdAt)}</span>
          </div>
          <div class="notif-actions">
            {#if !n.isRead}
              <form method="POST" action="?/markRead" use:enhance={() => {
                return async ({ update }) => {
                  await update();
                  notifications = notifications.map((x: any) => x.id === n.id ? { ...x, isRead: true } : x);
                };
              }}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" class="action-btn" title="Mark read">
                  <CheckCheck size={13} />
                </button>
              </form>
            {/if}
            <form method="POST" action="?/delete" use:enhance={() => {
              return async ({ update }) => {
                await update();
                notifications = notifications.filter((x: any) => x.id !== n.id);
              };
            }}>
              <input type="hidden" name="id" value={n.id} />
              <button type="submit" class="action-btn delete" title="Delete">
                <Trash2 size={13} />
              </button>
            </form>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { max-width: 700px; }
  .page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.5rem; }
  .page-header h1 { font-size:1.5rem; font-weight:700; color:var(--color-text); margin:0; }
  .subtitle { color:var(--color-muted); font-size:0.875rem; margin-top:0.25rem; }

  .btn-mark-all { display:flex; align-items:center; gap:0.375rem; padding:0.5rem 0.875rem; border:1px solid var(--color-border); border-radius:0.5rem; background:none; font-size:0.8rem; font-weight:600; color:var(--color-muted); cursor:pointer; transition:all 0.15s; white-space:nowrap; }
  .btn-mark-all:hover { border-color:#16a34a; color:#16a34a; }
  .btn-mark-all:disabled { opacity:0.5; cursor:not-allowed; }

  .empty { display:flex; flex-direction:column; align-items:center; gap:0.75rem; padding:4rem 2rem; text-align:center; background:var(--color-surface); border:1px solid var(--color-border); border-radius:0.875rem; color:var(--color-muted); }
  .empty-title { font-size:1rem; font-weight:700; color:var(--color-text); margin:0; }
  .empty-sub { font-size:0.85rem; margin:0; }

  .notif-list { display:flex; flex-direction:column; gap:0; background:var(--color-surface); border:1px solid var(--color-border); border-radius:0.875rem; overflow:hidden; }

  .notif-item { display:flex; align-items:flex-start; gap:0.75rem; padding:1rem 1.25rem; border-bottom:1px solid var(--color-border); transition:background 0.1s; }
  .notif-item:last-child { border-bottom:none; }
  .notif-item:hover { background:var(--color-bg); }
  .notif-item.unread { background:rgba(34,197,94,0.03); }

  .notif-dot-col { width:14px; flex-shrink:0; padding-top:6px; }
  .notif-dot { width:7px; height:7px; border-radius:50%; background:#22c55e; }

  .notif-body { flex:1; min-width:0; }
  .notif-head-row { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem; flex-wrap:wrap; }
  .notif-title { font-size:0.875rem; font-weight:600; color:var(--color-text); margin:0; }
  .notif-msg { font-size:0.825rem; color:var(--color-muted); margin:0 0 0.375rem; line-height:1.5; }
  .notif-time { font-size:0.72rem; color:var(--color-muted); }

  .type-badge { font-size:0.62rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:0.25rem; }
  .type-info     { background:rgba(59,130,246,.1);  color:#1d4ed8; }
  .type-warning  { background:rgba(245,158,11,.1);  color:#d97706; }
  .type-alert    { background:rgba(249,115,22,.1);  color:#c2410c; }
  .type-error    { background:rgba(239,68,68,.1);   color:#dc2626; }
  .type-critical { background:rgba(220,38,38,.15);  color:#991b1b; }

  .notif-actions { display:flex; gap:0.25rem; flex-shrink:0; }
  .action-btn { width:28px; height:28px; border-radius:0.375rem; border:1px solid var(--color-border); background:none; cursor:pointer; color:var(--color-muted); display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .action-btn:hover { border-color:#16a34a; color:#16a34a; }
  .action-btn.delete:hover { border-color:#dc2626; color:#dc2626; }
</style>