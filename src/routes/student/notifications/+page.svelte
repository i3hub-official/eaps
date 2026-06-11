<script lang="ts">
  import {
    Bell, CheckCheck, Trash2, CheckCircle2, AlertCircle,
    Info, AlertTriangle, XCircle, Loader2, Inbox, X, Clock,
    ArrowRight, MailOpen, Mail, Sparkles, ChevronRight
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let notifications = $state(data.notifications);
  let markingAll = $state(false);
  let deleting = $state<string | null>(null);
  let selectedNotif = $state<any | null>(null);
  let modalOpen = $state(false);

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
      if (res.ok) {
        notifications = notifications.filter(n => n.id !== id);
        if (selectedNotif?.id === id) closeModal();
      }
    } catch { /* silent */ }
    finally { deleting = null; }
  }

  function openModal(notif: any) {
    selectedNotif = notif;
    modalOpen = true;
    if (!notif.isRead) markOneRead(notif.id);
  }

  function closeModal() {
    modalOpen = false;
    setTimeout(() => selectedNotif = null, 200);
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

  function fullDate(date: string) {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    return '#3b82f6';
  }

  function typeBg(title: string) {
    const t = title.toLowerCase();
    if (t.includes('error') || t.includes('fail')) return 'rgba(220,38,38,.08)';
    if (t.includes('warn') || t.includes('alert')) return 'rgba(245,158,11,.08)';
    if (t.includes('success') || t.includes('pass')) return 'var(--green-soft)';
    return 'rgba(59,130,246,.08)';
  }

  function typeLabel(title: string) {
    const t = title.toLowerCase();
    if (t.includes('error') || t.includes('fail')) return 'Error';
    if (t.includes('warn') || t.includes('alert')) return 'Warning';
    if (t.includes('success') || t.includes('pass')) return 'Success';
    return 'Info';
  }

  function handleModalBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) closeModal();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && modalOpen) closeModal();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="notif-page">
  <!-- ══ HEADER ════════════════════════════════════════════════ -->
  <header class="page-header">
    <div class="header-left">
      <div class="header-icon">
        <Bell size={20} strokeWidth={2} />
      </div>
      <div class="header-text">
        <h1>Notifications</h1>
        <p class="page-sub">
          {#if unreadCount > 0}
            <span class="unread-dot"></span>
            <span>{unreadCount} unread</span>
          {:else}
            <span>All caught up</span>
          {/if}
          <span class="sub-sep">·</span>
          <span>{notifications.length} total</span>
        </p>
      </div>
    </div>
    {#if unreadCount > 0}
      <button class="mark-all-btn" onclick={markAllRead} disabled={markingAll}>
        {#if markingAll}
          <Loader2 size={13} class="spin-icon" />
        {:else}
          <CheckCheck size={13} />
        {/if}
        Mark all read
      </button>
    {/if}
  </header>

  <!-- ══ CONTENT ═══════════════════════════════════════════════ -->
  {#if notifications.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <Inbox size={36} strokeWidth={1.2} />
      </div>
      <p class="empty-title">No notifications yet</p>
      <p class="empty-sub">New alerts and updates will appear here when they arrive.</p>
    </div>
  {:else}
    <div class="notif-list">
      {#each notifications as n (n.id)}
        {@const Icon = typeIcon(n.title)}
        {@const color = typeColor(n.title)}
        {@const bg = typeBg(n.title)}
        {@const label = typeLabel(n.title)}
        <div class="notif-card" class:unread={!n.isRead}>
          <button class="notif-main" onclick={() => openModal(n)}>
            <!-- Left: Icon -->
            <div class="notif-icon-wrap" style="background: {bg}; color: {color}">
              <Icon size={17} strokeWidth={2} />
            </div>

            <!-- Center: Content -->
            <div class="notif-content">
              <div class="notif-top">
                <span class="notif-title">{n.title}</span>
                <div class="notif-meta">
                  {#if !n.isRead}
                    <span class="notif-dot"></span>
                  {/if}
                  <span class="notif-time">
                    <Clock size={11} />
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
              </div>
              <p class="notif-msg">{n.message}</p>
              <div class="notif-footer">
                <span class="type-tag" style="background: {bg}; color: {color}">
                  {label}
                </span>
                <span class="view-hint">
                  View <ChevronRight size={11} />
                </span>
              </div>
            </div>
          </button>

          <!-- Right: Delete -->
          <button
            class="delete-btn"
            onclick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
            disabled={deleting === n.id}
            aria-label="Delete notification"
          >
            {#if deleting === n.id}
              <Loader2 size={14} class="spin-icon" />
            {:else}
              <Trash2 size={14} />
            {/if}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ══ MODAL ═══════════════════════════════════════════════════ -->
{#if modalOpen && selectedNotif}
  {@const Icon = typeIcon(selectedNotif.title)}
  {@const color = typeColor(selectedNotif.title)}
  {@const bg = typeBg(selectedNotif.title)}
  {@const label = typeLabel(selectedNotif.title)}

  <div class="modal-overlay" onclick={handleModalBackdrop} aria-hidden="true">
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <!-- Modal Header -->
      <div class="modal-header" style="background: linear-gradient(180deg, {bg} 0%, transparent 100%)">
        <div class="modal-header-content">
          <div class="modal-icon" style="background: {bg}; color: {color}">
            <Icon size={22} strokeWidth={2} />
          </div>
          <div class="modal-header-text">
            <span class="modal-type" style="color: {color}">{label}</span>
            <h2 id="modal-title">{selectedNotif.title}</h2>
          </div>
        </div>
        <button class="modal-close" onclick={closeModal} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <div class="modal-message">
          <p>{selectedNotif.message}</p>
        </div>

        <div class="modal-meta">
          <div class="meta-item">
            <Clock size={13} />
            <span>{fullDate(selectedNotif.createdAt)}</span>
          </div>
          <div class="meta-item">
            {#if selectedNotif.isRead}
              <MailOpen size={13} />
              <span>Read</span>
            {:else}
              <Mail size={13} />
              <span>Unread</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        {#if !selectedNotif.isRead}
          <button class="modal-action secondary" onclick={() => markOneRead(selectedNotif.id)}>
            <CheckCheck size={14} />
            Mark as read
          </button>
        {/if}
        <button class="modal-action danger" onclick={() => deleteNotif(selectedNotif.id)}>
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ════════════════════════════════════════════════════════════
     BASE
     ════════════════════════════════════════════════════════════ */
  .notif-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    max-width: 100%;
  }

  /* ════════════════════════════════════════════════════════════
     HEADER
     ════════════════════════════════════════════════════════════ */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.25rem 0;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .header-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, var(--green-600), var(--green-700));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.25);
  }
  .header-text h1 {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
    line-height: 1.2;
  }
  .page-sub {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: var(--color-muted);
    margin: 0.15rem 0 0;
  }
  .unread-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green-600);
    box-shadow: 0 0 6px rgba(22, 163, 74, 0.4);
    flex-shrink: 0;
  }
  .sub-sep { opacity: 0.4; }

  .mark-all-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.875rem;
    border-radius: 0.625rem;
    background: var(--green-soft);
    color: var(--green-700);
    border: 1px solid rgba(34, 197, 94, 0.15);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.18s ease;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .mark-all-btn:hover {
    background: var(--green-600);
    color: #fff;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.25);
  }
  .mark-all-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* ════════════════════════════════════════════════════════════
     EMPTY STATE
     ════════════════════════════════════════════════════════════ */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 1.5rem;
    text-align: center;
  }
  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    opacity: 0.5;
  }
  .empty-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }
  .empty-sub {
    font-size: 0.78rem;
    color: var(--color-muted);
    margin: 0;
    max-width: 260px;
  }

  /* ════════════════════════════════════════════════════════════
     NOTIFICATION LIST
     ════════════════════════════════════════════════════════════ */
  .notif-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .notif-card {
    display: flex;
    align-items: stretch;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
    transition: all 0.18s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .notif-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
    border-color: rgba(22, 163, 74, 0.2);
  }
  .notif-card.unread {
    border-left: 3px solid var(--green-600);
    background: linear-gradient(90deg, var(--green-soft), var(--color-surface));
  }
  .notif-card:not(.unread) {
    border-left: 3px solid transparent;
    opacity: 0.85;
  }
  .notif-card:not(.unread):hover {
    opacity: 1;
  }

  .notif-main {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem;
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  }
  .notif-icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .notif-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .notif-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .notif-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.3;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .notif-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }
  .notif-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green-600);
    box-shadow: 0 0 5px rgba(22, 163, 74, 0.4);
    flex-shrink: 0;
  }
  .notif-time {
    font-size: 0.65rem;
    color: var(--color-muted);
    display: flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
  }
  .notif-msg {
    font-size: 0.78rem;
    color: var(--color-muted);
    margin: 0;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .notif-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.15rem;
  }
  .type-tag {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem;
    border-radius: 0.375rem;
  }
  .view-hint {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--color-muted);
    display: flex;
    align-items: center;
    gap: 0.1rem;
    transition: all 0.15s;
  }
  .notif-main:hover .view-hint {
    color: var(--green-600);
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    min-height: 100%;
    background: transparent;
    border: none;
    border-left: 1px solid var(--color-border);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .delete-btn:hover {
    background: rgba(220, 38, 38, 0.08);
    color: #dc2626;
  }
  .delete-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ════════════════════════════════════════════════════════════
     MODAL
     ════════════════════════════════════════════════════════════ */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .modal-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem 1.25rem 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
    animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .modal-header-content {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex: 1;
    min-width: 0;
  }
  .modal-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .modal-header-text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .modal-type {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .modal-header-text h2 {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
    line-height: 1.3;
  }
  .modal-close {
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }
  .modal-close:hover {
    border-color: var(--green-400);
    color: var(--green-600);
    background: var(--green-soft);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .modal-message {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .modal-message p {
    font-size: 0.88rem;
    color: var(--color-text);
    line-height: 1.6;
    margin: 0;
  }
  .modal-meta {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: var(--color-muted);
  }
  .meta-item :global(svg) {
    color: var(--color-muted);
    opacity: 0.7;
    flex-shrink: 0;
  }

  .modal-footer {
    display: flex;
    gap: 0.625rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .modal-action {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.625rem;
    border-radius: 0.625rem;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
    border: 1px solid;
  }
  .modal-action.secondary {
    background: var(--green-soft);
    color: var(--green-700);
    border-color: rgba(34, 197, 94, 0.15);
  }
  .modal-action.secondary:hover {
    background: var(--green-600);
    color: #fff;
    border-color: var(--green-600);
  }
  .modal-action.danger {
    background: rgba(220, 38, 38, 0.08);
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.15);
  }
  .modal-action.danger:hover {
    background: #dc2626;
    color: #fff;
    border-color: #dc2626;
  }

  /* ════════════════════════════════════════════════════════════
     SPINNER
     ════════════════════════════════════════════════════════════ */
  :global(.spin-icon) {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ════════════════════════════════════════════════════════════
     RESPONSIVE
     ════════════════════════════════════════════════════════════ */
  @media (min-width: 640px) {
    .notif-page {
      padding: 1rem;
      gap: 1.25rem;
    }
    .header-text h1 { font-size: 1.2rem; }
    .notif-card { border-radius: 1rem; }
    .notif-main { padding: 1rem; gap: 0.875rem; }
    .notif-icon-wrap { width: 42px; height: 42px; }
    .notif-title { font-size: 0.9rem; }
    .notif-msg { font-size: 0.82rem; }
  }

  @media (min-width: 1024px) {
    .notif-page {
      padding: 1.5rem;
      gap: 1.5rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .header-icon {
      width: 44px;
      height: 44px;
    }
    .header-icon :global(svg) { width: 22px; height: 22px; }
    .header-text h1 { font-size: 1.35rem; }
    .page-sub { font-size: 0.78rem; }
    .mark-all-btn { padding: 0.55rem 1rem; font-size: 0.82rem; }
    .notif-list { gap: 0.625rem; }
    .notif-card { border-radius: 1rem; }
    .notif-main { padding: 1rem 1.125rem; }

    /* Modal centered on desktop */
    .modal-overlay {
      align-items: center;
      padding: 1rem;
    }
    .modal-panel {
      border-radius: 1.25rem;
      max-width: 520px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.14);
    }
    .modal-header { padding: 1.5rem; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { padding: 1rem 1.5rem; }
    .modal-header-text h2 { font-size: 1.1rem; }
  }

  @media (min-width: 1280px) {
    .notif-page { padding: 2rem; max-width: 900px; }
  }

  @media (max-width: 360px) {
    .notif-main { padding: 0.75rem; gap: 0.625rem; }
    .notif-icon-wrap { width: 34px; height: 34px; }
    .notif-icon-wrap :global(svg) { width: 15px; height: 15px; }
    .notif-title { font-size: 0.8rem; }
    .notif-msg { font-size: 0.75rem; -webkit-line-clamp: 1; }
    .delete-btn { width: 36px; }
    .header-icon { width: 36px; height: 36px; }
    .mark-all-btn { padding: 0.4rem 0.625rem; font-size: 0.72rem; }
  }
</style>