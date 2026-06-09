<!-- src/routes/student/notifications/+page.svelte -->
 <script lang="ts">
  import {
    Bell, CheckCheck, Trash2, CheckCircle2, AlertCircle,
    Info, AlertTriangle, XCircle, Loader2, Inbox
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let notifications = $state(data.notifications);
  let markingAll = $state(false);
  let deleting = $state<string | null>(null);

  const unreadCount = $derived(notifications.filter(n => !n.isRead).length);

  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    markingAll = true;
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) notifications = notifications.map(n => ({ ...n, isRead: true }));
    } catch { /* silent */ }
    finally { markingAll = false; }
  }

  async function markOneRead(id: string) {
    const notif = notifications.find(n => n.id === id);
    if (!notif || notif.isRead) return;
    notifications = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {
      notifications = notifications.map(n => n.id === id ? { ...n, isRead: false } : n);
    }
  }

  async function deleteNotif(id: string) {
    deleting = id;
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) notifications = notifications.filter(n => n.id !== id);
    } catch { /* silent */ }
    finally { deleting = null; }
  }

  function relativeTime(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(date).toLocaleDateString();
  }

  function typeIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes('error') || t.includes('fail')) return XCircle;
    if (t.includes('warn') || t.includes('alert')) return AlertTriangle;
    if (t.includes('success') || t.includes('pass')) return CheckCircle2;
    return Info;
  }

  function typeColor(title: string) {
    const t = title.toLowerCase();
    if (t.includes('error') || t.includes('fail')) return '#dc2626';
    if (t.includes('warn') || t.includes('alert')) return '#f59e0b';
    if (t.includes('success') || t.includes('pass')) return 'var(--green-600)';
    return 'var(--blue-500)';
  }
</script>

<div class="notif-page">
  <div class="page-header">
    <div class="header-left">
      <div class="header-icon"><Bell size={20} /></div>
      <div>
        <h1>Notifications</h1>
        <p class="page-sub">{unreadCount} unread · {notifications.length} total</p>
      </div>
    </div>
    {#if unreadCount > 0}
      <button class="mark-all-btn" onclick={markAllRead} disabled={markingAll}>
        {#if markingAll}<Loader2 size={12} class="spin-icon" />{:else}<CheckCheck size={12} />{/if}
        Mark all read
      </button>
    {/if}
  </div>

  {#if notifications.length === 0}
    <div class="empty-page">
      <Inbox size={40} strokeWidth={1.2} />
      <p class="empty-title">No notifications</p>
      <p class="empty-sub">You're all caught up. New notifications will appear here.</p>
    </div>
  {:else}
    <div class="notif-list-page">
      {#each notifications as n (n.id)}
        {@const Icon = typeIcon(n.title)}
        {@const color = typeColor(n.title)}
        <div class="notif-row" class:unread={!n.isRead}>
          <div class="notif-row-icon" style="color: {color}; background: {color}12;">
            <Icon size={16} />
          </div>
          <div class="notif-row-body" onclick={() => markOneRead(n.id)} role="button" tabindex="0">
            <div class="notif-row-top">
              <span class="notif-row-title">{n.title}</span>
              <span class="notif-row-time">{relativeTime(n.createdAt)}</span>
            </div>
            <p class="notif-row-msg">{n.message}</p>
          </div>
          <button
            class="notif-row-delete"
            onclick={() => deleteNotif(n.id)}
            disabled={deleting === n.id}
            aria-label="Delete notification"
          >
            {#if deleting === n.id}
              <Loader2 size={13} class="spin-icon" />
            {:else}
              <Trash2 size={13} />
            {/if}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .notif-page { display: flex; flex-direction: column; gap: 1rem; }
  .page-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .header-left { display: flex; align-items: center; gap: 0.75rem; }
  .header-icon {
    width: 40px; height: 40px; border-radius: 0.625rem;
    background: var(--green-soft); color: var(--green-600);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .page-header h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .page-sub { font-size: 0.75rem; color: var(--color-muted); margin: 0.15rem 0 0; }
  .mark-all-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.45rem 0.875rem; border-radius: 0.45rem;
    background: var(--green-soft); color: var(--green-700);
    border: 1px solid rgba(34,197,94,0.2);
    font-size: 0.78rem; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .mark-all-btn:hover { background: var(--green-600); color: white; }
  .mark-all-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .empty-page {
    display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
    padding: 4rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-title { font-size: 0.9rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-sub { font-size: 0.78rem; margin: 0; }

  .notif-list-page {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
    display: flex; flex-direction: column;
  }
  .notif-row {
    display: flex; align-items: flex-start; gap: 0.75rem;
    padding: 1rem; border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .notif-row:last-child { border-bottom: none; }
  .notif-row:hover { background: var(--color-bg); }
  .notif-row.unread { background: rgba(34,197,94,0.03); }
  .notif-row-icon {
    width: 36px; height: 36px; border-radius: 0.5rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .notif-row-body { flex: 1; min-width: 0; cursor: pointer; }
  .notif-row-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.2rem; }
  .notif-row-title { font-size: 0.82rem; font-weight: 700; color: var(--color-text); }
  .notif-row-time { font-size: 0.68rem; color: var(--color-muted); white-space: nowrap; }
  .notif-row-msg { font-size: 0.78rem; color: var(--color-muted); margin: 0; line-height: 1.4; }
  .notif-row-delete {
    width: 30px; height: 30px; border-radius: 0.35rem; flex-shrink: 0;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; margin-top: 2px;
  }
  .notif-row-delete:hover { background: rgba(220,38,38,0.08); color: #dc2626; }
  .notif-row-delete:disabled { opacity: 0.4; cursor: not-allowed; }

  :global(.spin-icon) { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>