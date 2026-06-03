<!-- src/routes/admin/notifications/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    Bell, CheckCheck, Trash2, Send, X, Plus,
    CheckCircle, AlertCircle, BellOff, Filter
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showSendModal = $state(false);
  let filter = $state<'all' | 'unread' | 'read'>('all');
  let sendLoading = $state(false);

  const filtered = $derived(
    filter === 'unread' ? data.notifications.filter(n => !n.isRead)
    : filter === 'read'   ? data.notifications.filter(n => n.isRead)
    : data.notifications
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

  $effect(() => {
    if (form?.success && showSendModal) showSendModal = false;
  });
</script>

<div class="notif-page">

  <!-- Header -->
  <div class="page-header">
    <div class="ph-left">
      <div class="ph-icon"><Bell size={20} /></div>
      <div>
        <h1>Notifications</h1>
        <p>
          {data.unreadCount > 0
            ? `${data.unreadCount} unread notification${data.unreadCount > 1 ? 's' : ''}`
            : 'All caught up'}
        </p>
      </div>
    </div>
    <div class="ph-actions">
      {#if data.unreadCount > 0}
        <form method="POST" action="?/markAllRead" use:enhance>
          <button type="submit" class="btn-outline"><CheckCheck size={14} /> Mark all read</button>
        </form>
      {/if}
      {#if data.notifications.length > 0}
        <form method="POST" action="?/deleteAll" use:enhance>
          <button type="submit" class="btn-outline btn-outline-red"><Trash2 size={14} /> Clear all</button>
        </form>
      {/if}
      <button class="btn-primary" onclick={() => showSendModal = true}>
        <Send size={14} /> Send Notification
      </button>
    </div>
  </div>

  <!-- Success/error from send -->
  {#if form?.success && form?.message}
    <div class="toast toast-ok"><CheckCircle size={13} /> {form.message}</div>
  {/if}
  {#if form?.error}
    <div class="toast toast-err"><AlertCircle size={13} /> {form.error}</div>
  {/if}

  <!-- Filter tabs -->
  <div class="filter-tabs">
    {#each [
      { key: 'all',    label: `All (${data.notifications.length})` },
      { key: 'unread', label: `Unread (${data.unreadCount})` },
      { key: 'read',   label: `Read (${data.notifications.length - data.unreadCount})` },
    ] as tab}
      <button
        class="filter-tab"
        class:active={filter === tab.key}
        onclick={() => filter = tab.key as typeof filter}
      >{tab.label}</button>
    {/each}
  </div>

  <!-- List -->
  <div class="notif-list-card">
    {#if filtered.length === 0}
      <div class="empty">
        <BellOff size={32} />
        <p>No {filter !== 'all' ? filter : ''} notifications</p>
      </div>
    {:else}
      {#each filtered as notif (notif.id)}
        <div class="notif-item" class:unread={!notif.isRead}>
          <div class="ni-dot-wrap">
            {#if !notif.isRead}<div class="ni-dot"></div>{/if}
          </div>
          <div class="ni-content">
            <div class="ni-title">{notif.title}</div>
            <div class="ni-message">{notif.message}</div>
            <div class="ni-time">{relative(notif.createdAt)}</div>
          </div>
          <div class="ni-actions">
            {#if !notif.isRead}
              <form method="POST" action="?/markRead" use:enhance>
                <input type="hidden" name="id" value={notif.id} />
                <button type="submit" class="ni-btn" title="Mark as read"><CheckCircle size={13} /></button>
              </form>
            {/if}
            <form method="POST" action="?/delete" use:enhance>
              <input type="hidden" name="id" value={notif.id} />
              <button type="submit" class="ni-btn ni-del" title="Delete"><Trash2 size={13} /></button>
            </form>
          </div>
        </div>
      {/each}
    {/if}
  </div>

</div>

<!-- Send notification modal -->
{#if showSendModal}
  <div class="modal-bg" onclick={() => showSendModal = false} role="dialog" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-head">
        <h2><Send size={16} /> Send Notification</h2>
        <button class="modal-close" onclick={() => showSendModal = false}><X size={15} /></button>
      </div>
      <form
        method="POST"
        action="?/send"
        use:enhance={() => {
          sendLoading = true;
          return async ({ update }) => { sendLoading = false; await update(); };
        }}
        class="modal-form"
      >
        <div class="field">
          <label for="userId">Recipient User ID <span class="req">*</span></label>
          <input id="userId" name="userId" placeholder="UUID of the target user" required />
          <span class="field-hint">Find the user ID on the user detail page</span>
        </div>
        <div class="field">
          <label for="ntitle">Title <span class="req">*</span></label>
          <input id="ntitle" name="title" placeholder="Notification title" required />
        </div>
        <div class="field">
          <label for="nmessage">Message <span class="req">*</span></label>
          <textarea id="nmessage" name="message" placeholder="Notification body…" rows="4" required></textarea>
        </div>
        {#if form?.error}
          <div class="toast toast-err"><AlertCircle size={13} /> {form.error}</div>
        {/if}
        <div class="modal-foot">
          <button type="button" class="btn-ghost" onclick={() => showSendModal = false}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={sendLoading}>
            {sendLoading ? '⟳ Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .notif-page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 720px; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .ph-left { display: flex; align-items: center; gap: .875rem; }
  .ph-icon { width: 44px; height: 44px; border-radius: .75rem; background: linear-gradient(135deg,#f59e0b,#d97706); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); }
  .ph-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }

  .btn-primary { display: flex; align-items: center; gap: .5rem; padding: .55rem 1rem; background: #16a34a; color: white; border: none; border-radius: .5rem; font-size: .8rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s; }
  .btn-primary:hover { background: #15803d; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .btn-outline { display: flex; align-items: center; gap: .375rem; padding: .5rem .875rem; background: none; border: 1px solid var(--color-border); border-radius: .5rem; font-size: .78rem; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--color-text); transition: all .15s; }
  .btn-outline:hover { background: var(--color-surface-hover); }
  .btn-outline-red:hover { border-color: #dc2626; color: #dc2626; }
  .btn-ghost { display: flex; align-items: center; gap: .5rem; padding: .575rem 1.1rem; background: transparent; border: 1px solid var(--color-border); color: var(--color-text); border-radius: .5rem; font-size: .82rem; font-weight: 600; cursor: pointer; font-family: inherit; }
  .btn-ghost:hover { background: var(--color-surface-hover); }

  /* Toast */
  .toast { display: flex; align-items: center; gap: .5rem; padding: .625rem .875rem; border-radius: .5rem; font-size: .78rem; }
  .toast-ok  { background: rgba(22,163,74,.08);  border: 1px solid rgba(22,163,74,.25);  color: #16a34a; }
  .toast-err { background: rgba(220,38,38,.08);  border: 1px solid rgba(220,38,38,.25);  color: #dc2626; }

  /* Filter tabs */
  .filter-tabs { display: flex; gap: .25rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .5rem; padding: .25rem; align-self: flex-start; }
  .filter-tab { padding: .4rem .875rem; border-radius: .375rem; border: none; background: none; font-size: .75rem; font-weight: 500; color: var(--color-muted); cursor: pointer; font-family: inherit; transition: all .15s; }
  .filter-tab.active { background: var(--color-surface); color: var(--color-text); font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,.08); }

  /* Notification list */
  .notif-list-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .notif-item { display: flex; align-items: flex-start; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border); transition: background .1s; }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--color-surface-hover); }
  .notif-item.unread { background: rgba(245,158,11,.03); }
  .ni-dot-wrap { width: 18px; display: flex; justify-content: center; padding-top: .35rem; flex-shrink: 0; }
  .ni-dot { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; }
  .ni-content { flex: 1; min-width: 0; }
  .ni-title { font-size: .85rem; font-weight: 700; color: var(--color-text); }
  .ni-message { font-size: .78rem; color: var(--color-muted); margin-top: .25rem; line-height: 1.45; }
  .ni-time { font-size: .68rem; color: var(--color-muted); margin-top: .375rem; }
  .ni-actions { display: flex; gap: .375rem; flex-shrink: 0; }
  .ni-btn { width: 28px; height: 28px; border-radius: .375rem; border: 1px solid var(--color-border); background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--color-muted); transition: all .15s; }
  .ni-btn:hover { background: var(--color-bg); color: #16a34a; border-color: #16a34a; }
  .ni-del:hover { color: #dc2626 !important; border-color: #dc2626 !important; }

  /* Empty */
  .empty { padding: 4rem; display: flex; flex-direction: column; align-items: center; gap: .875rem; color: var(--color-muted); }
  .empty p { font-size: .9rem; text-transform: capitalize; }

  /* Modal */
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 1rem; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.5rem; border-bottom: 1px solid var(--color-border); }
  .modal-head h2 { display: flex; align-items: center; gap: .5rem; font-size: .95rem; font-weight: 700; }
  .modal-close { background: none; border: none; cursor: pointer; color: var(--color-muted); display: flex; padding: .25rem; border-radius: .375rem; }
  .modal-close:hover { background: var(--color-bg); color: var(--color-text); }
  .modal-form { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem 1.5rem; }
  .modal-foot { display: flex; justify-content: flex-end; gap: .625rem; padding-top: .25rem; }
  .field { display: flex; flex-direction: column; gap: .35rem; }
  label { font-size: .78rem; font-weight: 600; color: var(--color-text); }
  .req { color: #dc2626; }
  .field-hint { font-size: .68rem; color: var(--color-muted); }
  input, textarea { padding: .6rem .875rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .5rem; font-size: .82rem; color: var(--color-text); font-family: inherit; outline: none; transition: border-color .15s; resize: vertical; }
  input:focus, textarea:focus { border-color: #f59e0b; }
</style>