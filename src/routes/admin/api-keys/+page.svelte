<!-- src/routes/admin/api-keys/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { slide, fade } from 'svelte/transition';
  import {
    Key, Plus, Trash2, ShieldOff, Eye, EyeOff, Copy, Check,
    Activity, RefreshCw, Globe, Clock, Hash, Shield, X,
    AlertTriangle, CheckCircle, ChevronDown, Filter, Search,
    BarChart3, Zap, Lock, Unlock, MoreHorizontal, Calendar,
    TrendingUp, TrendingDown, Minus, Download, RefreshCcw,
    ArrowUpRight, ArrowDownRight, Layers, ShieldCheck,
    Info, XCircle, Loader2, ChevronRight, Sparkles, Sun, Moon
  } from 'lucide-svelte';
  import { getTheme } from '$lib/index.js';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const theme = $derived(getTheme());

  const ALL_SCOPES = [
    { value: 'read_users',      label: 'Read Users',       group: 'Users',      desc: 'List and view user records', icon: Eye },
    { value: 'write_users',     label: 'Write Users',      group: 'Users',      desc: 'Create, update, suspend users', icon: Shield },
    { value: 'read_exams',      label: 'Read Exams',       group: 'Exams',      desc: 'List and fetch exam details', icon: Eye },
    { value: 'write_exams',     label: 'Write Exams',      group: 'Exams',      desc: 'Create and modify exams', icon: Shield },
    { value: 'read_results',    label: 'Read Results',     group: 'Results',    desc: 'Access exam results and scores', icon: BarChart3 },
    { value: 'read_reports',    label: 'Read Reports',     group: 'Reports',    desc: 'Access analytics and reports', icon: TrendingUp },
    { value: 'read_violations', label: 'Read Violations',  group: 'Security',   desc: 'View violation and flag data', icon: EyeOff },
    { value: 'write_violations',label: 'Write Violations', group: 'Security',   desc: 'Record and update violations', icon: ShieldOff },
    { value: 'admin_full',      label: 'Full Admin',       group: 'Admin',      desc: 'All permissions — use with caution', icon: Zap },
  ] as const;

  const SCOPE_GROUPS = [...new Set(ALL_SCOPES.map(s => s.group))];

  // ── State ──────────────────────────────────────────────────────
  let showCreateModal = $state(false);
  let showRawKey = $state<string | null>(null);
  let rawKeyCopied = $state(false);
  let searchQuery = $state('');
  let filterStatus = $state<'all' | 'active' | 'revoked' | 'expired'>('all');
  let selectedScopes = $state<string[]>([]);
  let expandedKey = $state<string | null>(null);
  let selectedKeys = $state<Set<string>>(new Set());
  let showBulkActions = $state(false);
  let sortBy = $state<'createdAt' | 'lastUsedAt' | 'requestCount'>('createdAt');
  let sortDir = $state<'asc' | 'desc'>('desc');
  let toast = $state<{ message: string; type: 'success' | 'error' | 'info'; id: number } | null>(null);
  let createLoading = $state(false);

  $effect(() => {
    if (form?.success && form?.rawKey) {
      showRawKey = form.rawKey;
      showCreateModal = false;
      newKeyName = '';
      newKeyExpiry = '';
      newKeyIpWhitelist = '';
      selectedScopes = [];
      showToast('API key created successfully', 'success');
    }
    if (form?.error) showToast(form.error, 'error');
  });

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    toast = { message, type, id };
    setTimeout(() => { if (toast?.id === id) toast = null; }, 4000);
  }

  async function copyKey() {
    if (!showRawKey) return;
    await navigator.clipboard.writeText(showRawKey);
    rawKeyCopied = true;
    showToast('Key copied to clipboard', 'success');
    setTimeout(() => rawKeyCopied = false, 2000);
  }

  function toggleScope(scope: string) {
    if (scope === 'admin_full') {
      selectedScopes = selectedScopes.includes('admin_full') ? [] : ['admin_full'];
      return;
    }
    if (selectedScopes.includes('admin_full')) selectedScopes = [];
    selectedScopes = selectedScopes.includes(scope)
      ? selectedScopes.filter(s => s !== scope)
      : [...selectedScopes, scope];
  }

  function toggleKeySelection(keyId: string) {
    const next = new Set(selectedKeys);
    if (next.has(keyId)) next.delete(keyId);
    else next.add(keyId);
    selectedKeys = next;
    showBulkActions = next.size > 0;
  }

  function toggleAllKeys() {
    if (selectedKeys.size === filteredKeys.length && filteredKeys.length > 0) {
      selectedKeys = new Set();
      showBulkActions = false;
    } else {
      selectedKeys = new Set(filteredKeys.map(k => k.id));
      showBulkActions = true;
    }
  }

  function clearSelection() {
    selectedKeys = new Set();
    showBulkActions = false;
  }

  const filteredKeys = $derived(
    data.keys
      .filter(k => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || k.name.toLowerCase().includes(q) || k.keyPrefix.toLowerCase().includes(q);
        const matchStatus = filterStatus === 'all' || k.status === filterStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'requestCount') return (a.requestCount - b.requestCount) * dir;
        const aDate = a[sortBy] ? new Date(a[sortBy]!).getTime() : 0;
        const bDate = b[sortBy] ? new Date(b[sortBy]!).getTime() : 0;
        return (aDate - bDate) * dir;
      })
  );

  function statusColor(status: string) {
    return status === 'active' ? 'status-active'
      : status === 'revoked' ? 'status-revoked'
      : 'status-expired';
  }

  function statusIcon(status: string) {
    return status === 'active' ? ShieldCheck
      : status === 'revoked' ? ShieldOff
      : Clock;
  }

  function formatDate(d: string | Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatRelative(d: string | Date | null) {
    if (!d) return 'Never';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(d);
  }

  function scopeBadgeColor(scope: string) {
    if (scope === 'admin_full') return 'scope-admin';
    if (scope.startsWith('write_')) return 'scope-write';
    return 'scope-read';
  }

  // Form state
  let newKeyName = $state('');
  let newKeyExpiry = $state('');
  let newKeyIpWhitelist = $state('');
</script>

<svelte:head>
  <title>API Access Management — MOUAU eTest Admin</title>
</svelte:head>

<div class="ak-page">

  <!-- Toast -->
  {#if toast}
    <div class="toast-container" transition:slide={{ duration: 200 }}>
      <div class="toast toast-{toast.type}">
        {#if toast.type === 'success'}<CheckCircle size={16} />
        {:else if toast.type === 'error'}<XCircle size={16} />
        {:else}<Info size={16} />{/if}
        <span>{toast.message}</span>
      </div>
    </div>
  {/if}

  <!-- Header -->
  <div class="ak-header">
    <div class="ak-header-left">
      <div class="ak-header-icon"><Key size={22} /></div>
      <div>
        <h1 class="ak-title">API Access Management</h1>
        <p class="ak-subtitle">Manage API keys, monitor usage, and control external integrations</p>
      </div>
    </div>
    <button class="btn-primary" onclick={() => showCreateModal = true}>
      <Plus size={15} /> New API Key
    </button>
  </div>

  <!-- Stats -->
  <div class="stats-dashboard">
    <div class="stat-card stat-highlight">
      <div class="stat-progress-ring">
        <svg viewBox="0 0 36 36">
          <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path class="ring-fill" stroke-dasharray="{data.stats.total > 0 ? Math.round((data.stats.active / data.stats.total) * 100) : 0}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div class="ring-value">{data.stats.total > 0 ? Math.round((data.stats.active / data.stats.total) * 100) : 0}%</div>
      </div>
      <div class="stat-content">
        <div class="stat-val">{data.stats.active}</div>
        <div class="stat-lbl">Active Keys</div>
        <div class="stat-trend trend-up">
          <TrendingUp size={12} /><span>Healthy</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon stat-total"><Hash size={18} /></div>
      <div class="stat-content">
        <div class="stat-val">{data.stats.total}</div>
        <div class="stat-lbl">Total Keys</div>
        <div class="stat-sub">{data.stats.revoked + data.stats.expired} inactive</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon stat-revoked"><ShieldOff size={18} /></div>
      <div class="stat-content">
        <div class="stat-val">{data.stats.revoked}</div>
        <div class="stat-lbl">Revoked</div>
        <div class="stat-sub">Security actions</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon stat-expired"><Clock size={18} /></div>
      <div class="stat-content">
        <div class="stat-val">{data.stats.expired}</div>
        <div class="stat-lbl">Expired</div>
        <div class="stat-sub">Needs renewal</div>
      </div>
    </div>

    <div class="stat-card stat-wide">
      <div class="stat-icon stat-logs"><Activity size={18} /></div>
      <div class="stat-content">
        <div class="stat-val">{data.stats.recentLogs.length.toLocaleString()}</div>
        <div class="stat-lbl">Recent Requests</div>
        <div class="stat-sub">Last 50 API calls tracked</div>
      </div>
      <div class="stat-chart">
        <div class="sparkline">
          {#each data.stats.recentLogs.slice(0, 20) as log, i}
            <div class="spark-bar" style="height: {Math.min(100, (log.durationMs || 50) / 5)}%; opacity: {0.3 + (i / 20) * 0.7};" />
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="search-wrap">
        <Search size={14} />
        <input class="search-input" placeholder="Search by name or prefix…" bind:value={searchQuery} />
        {#if searchQuery}
          <button class="search-clear" onclick={() => searchQuery = ''}><X size={12} /></button>
        {/if}
      </div>
      <div class="filter-tabs">
        {#each ['all','active','revoked','expired'] as s}
          <button
            class="filter-tab"
            class:active={filterStatus === s}
            onclick={() => filterStatus = s as typeof filterStatus}
          >
            {#if s === 'all'}<Layers size={12} />
            {:else if s === 'active'}<ShieldCheck size={12} />
            {:else if s === 'revoked'}<ShieldOff size={12} />
            {:else}<Clock size={12} />{/if}
            <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            <span class="tab-count">
              {s === 'all' ? data.stats.total : s === 'active' ? data.stats.active : s === 'revoked' ? data.stats.revoked : data.stats.expired}
            </span>
          </button>
        {/each}
      </div>
    </div>
    <div class="toolbar-right">
      <div class="sort-dropdown">
        <select bind:value={sortBy} class="sort-select">
          <option value="createdAt">Created</option>
          <option value="lastUsedAt">Last Used</option>
          <option value="requestCount">Requests</option>
        </select>
        <button class="sort-dir-btn" onclick={() => sortDir = sortDir === 'asc' ? 'desc' : 'asc'}>
          {#if sortDir === 'desc'}<ArrowDownRight size={14} />{:else}<ArrowUpRight size={14} />{/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Bulk Actions -->
  {#if showBulkActions}
    <div class="bulk-bar" transition:slide={{ duration: 200 }}>
      <div class="bulk-info">
        <CheckCircle size={16} />
        <span><strong>{selectedKeys.size}</strong> key{selectedKeys.size > 1 ? 's' : ''} selected</span>
      </div>
      <div class="bulk-actions">
        <button class="btn-ghost btn-sm" onclick={clearSelection}><X size={13} /> Clear</button>
        <form method="POST" action="?/revokeBulk" use:enhance>
          {#each [...selectedKeys] as id}<input type="hidden" name="ids" value={id} />{/each}
          <button type="submit" class="btn-warning btn-sm"><Lock size={13} /> Revoke</button>
        </form>
        <form method="POST" action="?/deleteBulk" use:enhance>
          {#each [...selectedKeys] as id}<input type="hidden" name="ids" value={id} />{/each}
          <button type="submit" class="btn-danger btn-sm"><Trash2 size={13} /> Delete</button>
        </form>
      </div>
    </div>
  {/if}

  <!-- Keys Table -->
  <div class="keys-table-wrap">
    {#if filteredKeys.length === 0}
      <div class="empty-state" transition:fade>
        <div class="empty-illustration">
          <Key size={48} strokeWidth={1} />
          <div class="empty-orbit"><Shield size={20} /></div>
        </div>
        <h3>No API keys found</h3>
        <p>{searchQuery ? 'Try adjusting your search or filters' : 'Create your first API key to get started'}</p>
        {#if !searchQuery}
          <button class="btn-primary" onclick={() => showCreateModal = true}><Plus size={14} /> Create API Key</button>
        {:else}
          <button class="btn-ghost" onclick={() => { searchQuery = ''; filterStatus = 'all'; }}><RefreshCcw size={14} /> Clear filters</button>
        {/if}
      </div>
    {:else}
      <table class="keys-table">
        <thead>
          <tr>
            <th class="th-checkbox">
              <label class="checkbox-wrap">
                <input type="checkbox" checked={selectedKeys.size === filteredKeys.length && filteredKeys.length > 0} onchange={toggleAllKeys} />
                <span class="check-custom"></span>
              </label>
            </th>
            <th>Key Details</th>
            <th>Scopes</th>
            <th>Status</th>
            <th>Usage</th>
            <th>Expires</th>
            <th class="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredKeys as key, index (key.id)}
            <tr class="key-row" class:expanded={expandedKey === key.id} class:selected={selectedKeys.has(key.id)} style="animation-delay: {index * 30}ms">
              <td class="td-checkbox">
                <label class="checkbox-wrap">
                  <input type="checkbox" checked={selectedKeys.has(key.id)} onchange={() => toggleKeySelection(key.id)} />
                  <span class="check-custom"></span>
                </label>
              </td>
              <td>
                <button class="key-name-btn" onclick={() => expandedKey = expandedKey === key.id ? null : key.id}>
                  <ChevronDown size={14} class="row-chevron" style="transform: rotate({expandedKey === key.id ? '180deg' : '0deg'}); transition: transform .2s" />
                  <div class="key-avatar"><Key size={14} /></div>
                  <div class="key-info">
                    <span class="key-name">{key.name}</span>
                    <div class="key-meta">
                      <code>{key.keyPrefix}…</code>
                      <span class="meta-dot">•</span>
                      <span>by {key.createdBy.fullName}</span>
                      <span class="meta-dot">•</span>
                      <span>{formatRelative(key.createdAt)}</span>
                    </div>
                  </div>
                </button>
              </td>
              <td>
                <div class="scope-list">
                  {#each key.scopes.slice(0, 2) as scope}
                    <span class="scope-badge {scopeBadgeColor(scope)}">
                      {#if scope === 'admin_full'}<Zap size={10} />{:else if scope.startsWith('write_')}<Shield size={10} />{:else}<Eye size={10} />{/if}
                      {scope.replace(/_/g,' ')}
                    </span>
                  {/each}
                  {#if key.scopes.length > 2}
                    <button class="scope-badge scope-more" onclick={() => expandedKey = expandedKey === key.id ? null : key.id}>+{key.scopes.length - 2}</button>
                  {/if}
                </div>
              </td>
              <td>
                <span class="status-badge {statusColor(key.status)}">
                  <svelte:component this={statusIcon(key.status)} size={11} />
                  {key.status}
                </span>
              </td>
              <td>
                <div class="usage-cell">
                  <div class="usage-count">{key.requestCount.toLocaleString()}</div>
                  <div class="usage-bar"><div class="usage-fill" style="width: {Math.min(100, (key.requestCount / Math.max(...data.keys.map(k => k.requestCount))) * 100)}%"></div></div>
                  <div class="usage-last">{formatRelative(key.lastUsedAt)}</div>
                </div>
              </td>
              <td class="td-expiry">
                {#if key.expiresAt}
                  <div class="expiry-cell" class:expiry-soon={new Date(key.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && key.status === 'active'}>
                    <Calendar size={12} /><span>{formatDate(key.expiresAt)}</span>
                  </div>
                {:else}
                  <span class="td-muted">Never</span>
                {/if}
              </td>
              <td class="td-actions">
                <div class="row-actions">
                  {#if key.status === 'active'}
                    <form method="POST" action="?/revoke" use:enhance={() => { return async ({ update }) => { await update(); showToast('Key revoked', 'info'); }; }}>
                      <input type="hidden" name="id" value={key.id} />
                      <button type="submit" class="action-btn action-revoke" title="Revoke key"><Lock size={13} /></button>
                    </form>
                  {:else}
                    <button class="action-btn action-revoke" disabled title="Already revoked"><Lock size={13} /></button>
                  {/if}
                  <form method="POST" action="?/delete" use:enhance={() => { return async ({ update }) => { await update(); showToast('Key deleted', 'info'); }; }}>
                    <input type="hidden" name="id" value={key.id} />
                    <button type="submit" class="action-btn action-delete" title="Delete key" onclick={(e) => { if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault(); }}><Trash2 size={13} /></button>
                  </form>
                  <button class="action-btn action-expand" onclick={() => expandedKey = expandedKey === key.id ? null : key.id}><MoreHorizontal size={13} /></button>
                </div>
              </td>
            </tr>
            {#if expandedKey === key.id}
              <tr class="key-detail-row" transition:slide={{ duration: 200 }}>
                <td colspan="7">
                  <div class="key-detail">
                    <div class="detail-grid">
                      <div class="detail-section">
                        <h4><Shield size={13} /> Permissions</h4>
                        <div class="scope-detail-list">
                          {#each key.scopes as scope}
                            {@const scopeDef = ALL_SCOPES.find(s => s.value === scope)}
                            <div class="scope-detail-item">
                              <span class="scope-badge {scopeBadgeColor(scope)}">
                                {#if scope === 'admin_full'}<Zap size={10} />{:else if scope.startsWith('write_')}<Shield size={10} />{:else}<Eye size={10} />{/if}
                                {scope.replace(/_/g,' ')}
                              </span>
                              {#if scopeDef}<span class="scope-desc">{scopeDef.desc}</span>{/if}
                            </div>
                          {/each}
                        </div>
                      </div>
                      <div class="detail-section">
                        <h4><Globe size={13} /> IP Whitelist</h4>
                        {#if key.ipWhitelist.length}
                          <div class="ip-list">
                            {#each key.ipWhitelist as ip}<span class="ip-chip"><Globe size={11} />{ip}</span>{/each}
                          </div>
                        {:else}
                          <div class="detail-empty"><Unlock size={14} /><span>No restrictions — all IPs allowed</span></div>
                        {/if}
                      </div>
                      <div class="detail-section">
                        <h4><Info size={13} /> Metadata</h4>
                        <div class="meta-grid">
                          <div class="meta-item"><span class="meta-label">Created</span><span class="meta-value">{formatDate(key.createdAt)}</span></div>
                          <div class="meta-item"><span class="meta-label">Created by</span><span class="meta-value">{key.createdBy.fullName}</span></div>
                          <div class="meta-item"><span class="meta-label">Last used</span><span class="meta-value">{formatRelative(key.lastUsedAt)}</span></div>
                          <div class="meta-item"><span class="meta-label">Total requests</span><span class="meta-value">{key.requestCount.toLocaleString()}</span></div>
                          {#if key.revokedBy}
                            <div class="meta-item"><span class="meta-label">Revoked by</span><span class="meta-value">{key.revokedBy.fullName}</span></div>
                            <div class="meta-item"><span class="meta-label">Revoked on</span><span class="meta-value">{formatDate(key.revokedAt)}</span></div>
                          {/if}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <!-- Logs -->
  {#if data.stats.recentLogs.length > 0}
    <div class="logs-section" transition:fade>
      <div class="logs-header">
        <h3 class="section-title"><Activity size={16} /> Recent API Activity <span class="section-badge">{data.stats.recentLogs.length}</span></h3>
        <div class="logs-actions">
          <button class="btn-ghost btn-sm" onclick={() => showToast('Export coming soon', 'info')}><Download size={13} /> Export</button>
          <button class="btn-ghost btn-sm" onclick={() => showToast('Refreshed', 'success')}><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>
      <div class="logs-table-wrap">
        <table class="logs-table">
          <thead>
            <tr><th>Key</th><th>Method</th><th>Endpoint</th><th>Status</th><th>Duration</th><th>Time</th></tr>
          </thead>
          <tbody>
            {#each data.stats.recentLogs.slice(0, 20) as log, i}
              <tr style="animation-delay: {i * 20}ms">
                <td>
                  <div class="log-key-cell">
                    <code class="log-key">{log.key.keyPrefix}…</code>
                    <span class="log-key-name">{log.key.name}</span>
                  </div>
                </td>
                <td><span class="method-badge method-{log.method.toLowerCase()}">{log.method}</span></td>
                <td class="log-endpoint"><code>{log.endpoint}</code></td>
                <td>
                  <span class="status-code" class:sc-ok={log.statusCode < 400} class:sc-warn={log.statusCode >= 400 && log.statusCode < 500} class:sc-err={log.statusCode >= 500}>
                    {log.statusCode}
                  </span>
                </td>
                <td class="td-muted">
                  <div class="duration-cell">
                    <div class="duration-bar" style="width: {Math.min(100, (log.durationMs || 0) / 10)}%; background: {log.durationMs && log.durationMs > 1000 ? 'var(--color-warning)' : 'var(--color-success)'};"></div>
                    <span>{log.durationMs ? `${log.durationMs}ms` : '—'}</span>
                  </div>
                </td>
                <td class="td-muted">{formatRelative(log.createdAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

</div>

<!-- Create Modal -->
{#if showCreateModal}
  <div class="modal-bg" onclick={() => showCreateModal = false} role="dialog" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()} transition:slide={{ duration: 200 }}>
      <div class="modal-head">
        <div class="modal-icon"><Sparkles size={18} /></div>
        <div>
          <h2>New API Key</h2>
          <p class="modal-subtitle">Generate a secure key for external integrations</p>
        </div>
        <button class="modal-close" onclick={() => showCreateModal = false}><X size={16} /></button>
      </div>
      <form method="POST" action="?/create" use:enhance={() => { createLoading = true; return async ({ update }) => { createLoading = false; await update(); }; }}>
        <div class="form-field">
          <label for="key-name">Key Name <span class="req">*</span></label>
          <input id="key-name" name="name" bind:value={newKeyName} placeholder="e.g. LMS Integration" required />
          <span class="field-hint">Give it a descriptive name so you remember what it's for</span>
        </div>
        <div class="form-field">
          <label>Scopes <span class="req">*</span></label>
          <div class="scopes-grid">
            {#each SCOPE_GROUPS as group}
              <div class="scope-group">
                <div class="scope-group-label">{group}</div>
                {#each ALL_SCOPES.filter(s => s.group === group) as scope}
                  <label class="scope-check" class:scope-check-admin={scope.value === 'admin_full'} class:checked={selectedScopes.includes(scope.value)}>
                    <input type="checkbox" name="scopes" value={scope.value} checked={selectedScopes.includes(scope.value)} onchange={() => toggleScope(scope.value)} />
                    <div class="scope-check-box">{#if selectedScopes.includes(scope.value)}<Check size={10} strokeWidth={3} />{/if}</div>
                    <div class="scope-check-content">
                      <div class="scope-check-header"><svelte:component this={scope.icon} size={12} /><span class="scope-check-label">{scope.label}</span></div>
                      <span class="scope-check-desc">{scope.desc}</span>
                    </div>
                  </label>
                {/each}
              </div>
            {/each}
          </div>
          {#if selectedScopes.length === 0}<span class="field-hint field-hint-warn">Select at least one scope</span>{:else}<span class="field-hint">{selectedScopes.length} scope{selectedScopes.length > 1 ? 's' : ''} selected</span>{/if}
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="key-expiry">Expires in (days)</label>
            <div class="input-with-icon"><Calendar size={14} /><input id="key-expiry" name="expiresIn" type="number" min="1" bind:value={newKeyExpiry} placeholder="Never" /></div>
            <span class="field-hint">Leave empty for no expiration</span>
          </div>
          <div class="form-field">
            <label for="key-ip">IP Whitelist</label>
            <div class="input-with-icon"><Globe size={14} /><input id="key-ip" name="ipWhitelist" bind:value={newKeyIpWhitelist} placeholder="192.168.1.1, 10.0.0.0/24" /></div>
            <span class="field-hint">Comma-separated IP addresses or CIDR ranges</span>
          </div>
        </div>
        {#if form?.error}<div class="form-error" transition:slide><AlertTriangle size={13} /> {form.error}</div>{/if}
        <div class="modal-foot">
          <button type="button" class="btn-ghost" onclick={() => showCreateModal = false}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={createLoading || !newKeyName || selectedScopes.length === 0}>
            {#if createLoading}<Loader2 size={14} class="spin" /> Generating...{:else}<Key size={14} /> Generate Key{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Raw Key Modal -->
{#if showRawKey}
  <div class="modal-bg" role="dialog" aria-modal="true" transition:fade>
    <div class="modal raw-key-modal" transition:slide={{ duration: 200 }}>
      <div class="rk-success-ring"><div class="rk-icon"><CheckCircle size={32} /></div></div>
      <h2 class="rk-title">API Key Created</h2>
      <p class="rk-subtitle">Your new key is ready to use</p>
      <div class="rk-warning">
        <AlertTriangle size={14} />
        <div><strong>Copy this key now.</strong><span>It will never be shown again for security reasons.</span></div>
      </div>
      <div class="rk-key-wrap">
        <code class="rk-key">{showRawKey}</code>
        <button class="rk-copy-btn" onclick={copyKey}>
          {#if rawKeyCopied}<Check size={15} /> Copied!{:else}<Copy size={15} /> Copy to Clipboard{/if}
        </button>
      </div>
      <div class="rk-actions"><button class="btn-primary rk-done" onclick={() => { showRawKey = null; rawKeyCopied = false; }}>Done — I've Saved the Key</button></div>
    </div>
  </div>
{/if}

<style>
  /* ═══════════════════════════════════════════════════════════════
     THEME-AWARE STYLES — uses only layout CSS variables
     No hardcoded light-mode colors. All colors reference:
     --color-bg, --color-surface, --color-surface-hover,
     --color-text, --color-muted, --color-border
     ═══════════════════════════════════════════════════════════════ */

  .ak-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem;
    color: var(--color-text);
  }

  /* ── Toast ───────────────────────────────────────────────────── */
  .toast-container {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 300;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1.25rem;
    border-radius: 0.625rem;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.15);
    animation: toastSlide 0.3s ease;
    min-width: 280px;
    backdrop-filter: blur(8px);
  }
  .toast-success {
    background: rgba(22, 163, 74, 0.95);
    color: white;
  }
  .toast-error {
    background: rgba(220, 38, 38, 0.95);
    color: white;
  }
  .toast-info {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }
  @keyframes toastSlide {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  /* ── Header ──────────────────────────────────────────────────── */
  .ak-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .ak-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .ak-header-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  .ak-title {
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.2;
    letter-spacing: -0.025em;
  }
  .ak-subtitle {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin-top: 0.25rem;
  }

  /* ── Buttons ─────────────────────────────────────────────────── */
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
  }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn-ghost {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .btn-ghost:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
    border-color: var(--color-muted);
  }
  .btn-sm { padding: 0.4rem 0.875rem; font-size: 0.78rem; }
  .btn-warning {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: #f59e0b;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .btn-warning:hover { background: #d97706; }
  .btn-danger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .btn-danger:hover { background: #b91c1c; }

  /* ── Stats Dashboard ─────────────────────────────────────────── */
  .stats-dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }
  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    transition: all 0.3s ease;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  .stat-highlight {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), var(--color-surface));
    border-color: rgba(59, 130, 246, 0.2);
  }
  .stat-wide { grid-column: span 2; }
  .stat-content { flex: 1; }
  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .stat-total  { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
  .stat-active { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
  .stat-revoked{ background: rgba(220, 38, 38, 0.12); color: #dc2626; }
  .stat-expired{ background: rgba(234, 179, 8, 0.12); color: #ca8a04; }
  .stat-logs   { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }
  .stat-val {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
    letter-spacing: -0.025em;
  }
  .stat-lbl {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin-top: 0.375rem;
    font-weight: 500;
  }
  .stat-sub {
    font-size: 0.7rem;
    color: var(--color-muted);
    margin-top: 0.25rem;
    opacity: 0.7;
  }
  .stat-trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    margin-top: 0.5rem;
  }
  .trend-up { color: #16a34a; }
  .trend-down { color: #dc2626; }
  .trend-stable { color: var(--color-muted); }

  /* Progress Ring */
  .stat-progress-ring {
    position: relative;
    width: 56px;
    height: 56px;
    flex-shrink: 0;
  }
  .stat-progress-ring svg {
    transform: rotate(-90deg);
    width: 100%;
    height: 100%;
  }
  .ring-bg {
    fill: none;
    stroke: var(--color-border);
    stroke-width: 3;
  }
  .ring-fill {
    fill: none;
    stroke: #3b82f6;
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dasharray 0.6s ease;
  }
  .ring-value {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #3b82f6;
  }

  /* Sparkline */
  .stat-chart {
    margin-left: auto;
    display: flex;
    align-items: flex-end;
    height: 40px;
    gap: 2px;
  }
  .sparkline {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 100%;
  }
  .spark-bar {
    width: 4px;
    background: #3b82f6;
    border-radius: 2px;
    transition: height 0.3s ease;
    min-height: 4px;
  }

  /* ── Toolbar ─────────────────────────────────────────────────── */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    flex-wrap: wrap;
  }
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    flex: 1;
    max-width: 360px;
    transition: all 0.2s;
  }
  .search-wrap:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .search-wrap svg {
    color: var(--color-muted);
    flex-shrink: 0;
  }
  .search-input {
    background: none;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--color-text);
    width: 100%;
    font-family: inherit;
  }
  .search-clear {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.125rem;
    display: flex;
    border-radius: 0.25rem;
    transition: all 0.15s;
  }
  .search-clear:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  .filter-tabs {
    display: flex;
    gap: 0.25rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.25rem;
  }
  .filter-tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    border-radius: 0.375rem;
    border: none;
    background: none;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .filter-tab:hover { color: var(--color-text); }
  .filter-tab.active {
    background: var(--color-surface);
    color: var(--color-text);
    font-weight: 700;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .tab-count {
    font-size: 0.65rem;
    background: var(--color-bg);
    padding: 0.125rem 0.375rem;
    border-radius: 1rem;
    color: var(--color-muted);
  }
  .filter-tab.active .tab-count {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  /* Sort */
  .sort-dropdown {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.25rem;
  }
  .sort-select {
    background: none;
    border: none;
    font-size: 0.8rem;
    color: var(--color-text);
    font-family: inherit;
    padding: 0.375rem 0.5rem;
    cursor: pointer;
    outline: none;
  }
  .sort-dir-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.375rem;
    border-radius: 0.25rem;
    display: flex;
    transition: all 0.15s;
  }
  .sort-dir-btn:hover {
    background: var(--color-bg);
    color: var(--color-text);
  }

  /* ── Bulk Actions ────────────────────────────────────────────── */
  .bulk-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.06), var(--color-surface));
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.5rem;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .bulk-info {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    color: #3b82f6;
    font-size: 0.875rem;
  }
  .bulk-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* ── Table ───────────────────────────────────────────────────── */
  .keys-table-wrap {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .keys-table {
    width: 100%;
    border-collapse: collapse;
  }
  .keys-table th {
    padding: 0.875rem 1rem;
    background: var(--color-bg);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  .keys-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }
  .key-row {
    animation: fadeInUp 0.3s ease forwards;
    opacity: 0;
    transition: all 0.15s;
  }
  .key-row:hover {
    background: var(--color-surface-hover);
  }
  .key-row.selected {
    background: rgba(59, 130, 246, 0.06);
  }
  .key-row:last-child td {
    border-bottom: none;
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Checkbox */
  .th-checkbox, .td-checkbox {
    width: 40px;
    padding-right: 0 !important;
    text-align: center;
  }
  .checkbox-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
  }
  .checkbox-wrap input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .check-custom {
    width: 18px;
    height: 18px;
    border: 2px solid var(--color-border);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  .checkbox-wrap input:checked + .check-custom {
    background: #3b82f6;
    border-color: #3b82f6;
  }
  .checkbox-wrap input:checked + .check-custom::after {
    content: '';
    width: 5px;
    height: 9px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    margin-bottom: 2px;
  }

  /* Key Cell */
  .key-name-btn {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text);
    font-family: inherit;
    padding: 0;
    text-align: left;
    width: 100%;
  }
  .key-avatar {
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  .key-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .key-name {
    font-weight: 700;
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-text);
  }
  .key-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.72rem;
    color: var(--color-muted);
    flex-wrap: wrap;
  }
  .key-meta code {
    background: var(--color-bg);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.65rem;
    color: var(--color-muted);
  }
  .meta-dot {
    opacity: 0.4;
    color: var(--color-muted);
  }

  /* Scope Badges */
  .scope-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .scope-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    border-radius: 2rem;
    text-transform: capitalize;
    white-space: nowrap;
  }
  .scope-read  { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .scope-write { background: rgba(234, 179, 8, 0.1); color: #ca8a04; }
  .scope-admin { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
  .scope-more {
    background: var(--color-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: all 0.15s;
  }
  .scope-more:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  /* Status badges */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.375rem 0.875rem;
    border-radius: 2rem;
    text-transform: capitalize;
    white-space: nowrap;
  }
  .status-active  { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .status-revoked { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
  .status-expired { background: rgba(234, 179, 8, 0.1); color: #ca8a04; }

  /* Usage */
  .usage-cell {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 120px;
  }
  .usage-count {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-text);
  }
  .usage-bar {
    height: 4px;
    background: var(--color-bg);
    border-radius: 2px;
    overflow: hidden;
  }
  .usage-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 2px;
    transition: width 0.5s ease;
  }
  .usage-last {
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  /* Expiry */
  .expiry-cell {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .expiry-soon {
    color: #f59e0b;
    font-weight: 600;
  }
  .expiry-soon svg {
    color: #f59e0b;
  }
  .td-muted {
    color: var(--color-muted);
    font-size: 0.8rem;
  }

  /* Actions */
  .th-actions { text-align: right; }
  .td-actions { text-align: right; }
  .row-actions {
    display: flex;
    gap: 0.375rem;
    justify-content: flex-end;
  }
  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    transition: all 0.15s;
  }
  .action-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  .action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .action-revoke:hover:not(:disabled) {
    border-color: #f59e0b;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.08);
  }
  .action-delete:hover:not(:disabled) {
    border-color: #dc2626;
    color: #dc2626;
    background: rgba(220, 38, 38, 0.08);
  }
  .action-expand:hover {
    border-color: var(--color-muted);
    color: var(--color-text);
  }

  /* Detail Row */
  .key-detail-row td {
    background: var(--color-bg);
    padding: 0;
    border-bottom: 1px solid var(--color-border);
  }
  .key-detail {
    padding: 1.5rem;
  }
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 2rem;
  }
  .detail-section h4 {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    margin-bottom: 0.875rem;
  }
  .scope-detail-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .scope-detail-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .scope-desc {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .ip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .ip-chip {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.78rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.375rem 0.75rem;
    color: var(--color-text);
  }
  .detail-empty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  .meta-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    font-weight: 600;
  }
  .meta-value {
    font-size: 0.8rem;
    color: var(--color-text);
    font-weight: 600;
  }

  /* Empty State */
  .empty-state {
    padding: 4rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    color: var(--color-muted);
    text-align: center;
  }
  .empty-illustration {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .empty-illustration > :global(svg:first-child) {
    color: var(--color-border);
  }
  .empty-orbit {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 32px;
    height: 32px;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
  }
  .empty-state h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }
  .empty-state p {
    font-size: 0.875rem;
    max-width: 320px;
    margin: 0;
    line-height: 1.5;
    color: var(--color-muted);
  }

  /* ── Logs ────────────────────────────────────────────────────── */
  .logs-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .logs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.025em;
  }
  .section-badge {
    font-size: 0.7rem;
    background: var(--color-bg);
    color: var(--color-muted);
    padding: 0.25rem 0.625rem;
    border-radius: 1rem;
    font-weight: 600;
  }
  .logs-actions {
    display: flex;
    gap: 0.5rem;
  }
  .logs-table-wrap {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .logs-table {
    width: 100%;
    border-collapse: collapse;
  }
  .logs-table th {
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  .logs-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.82rem;
  }
  .logs-table tr {
    animation: fadeInUp 0.3s ease forwards;
    opacity: 0;
  }
  .logs-table tr:last-child td {
    border-bottom: none;
  }
  .log-key-cell {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  .log-key {
    font-size: 0.72rem;
    background: var(--color-bg);
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
    color: var(--color-text);
    width: fit-content;
  }
  .log-key-name {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .log-endpoint code {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .method-badge {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.25rem 0.625rem;
    border-radius: 0.25rem;
  }
  .method-get    { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .method-post   { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .method-put    { background: rgba(234, 179, 8, 0.1); color: #ca8a04; }
  .method-delete { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
  .method-patch  { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

  .status-code {
    font-weight: 700;
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: var(--color-bg);
  }
  .sc-ok  { color: #16a34a; background: rgba(22, 163, 74, 0.08); }
  .sc-warn { color: #ca8a04; background: rgba(234, 179, 8, 0.08); }
  .sc-err { color: #dc2626; background: rgba(220, 38, 38, 0.08); }

  .duration-cell {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  .duration-bar {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--color-bg);
    overflow: hidden;
    flex-shrink: 0;
  }

  /* ── Modal ───────────────────────────────────────────────────── */
  .modal-bg {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: modalFade 0.2s ease;
  }
  @keyframes modalFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    width: 100%;
    max-width: 600px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    max-height: 90vh;
    overflow-y: auto;
    animation: modalSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes modalSlide {
    from { opacity: 0; transform: translateY(20px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .modal-head {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.5rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  .modal-head h2 {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }
  .modal-subtitle {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }
  .modal-close {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    display: flex;
    border-radius: 0.375rem;
    padding: 0.5rem;
    transition: all 0.15s;
  }
  .modal-close:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  .modal form {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .form-field label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .req {
    color: #dc2626;
  }
  .field-hint {
    font-size: 0.72rem;
    color: var(--color-muted);
    margin-top: 0.125rem;
  }
  .field-hint-warn {
    color: #dc2626;
  }
  .input-with-icon {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.875rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    transition: all 0.2s;
  }
  .input-with-icon:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .input-with-icon svg {
    color: var(--color-muted);
    flex-shrink: 0;
  }
  .input-with-icon input {
    background: none;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--color-text);
    width: 100%;
    font-family: inherit;
  }
  input[type="text"], input[type="number"], input:not([type="checkbox"]):not([type="radio"]) {
    padding: 0.625rem 0.875rem; 
    background: var(--color-bg);
    border: 1px solid var(--color-border); 
    border-radius: var(--radius);
    font-size: 0.875rem; 
    color: var(--color-text); 
    font-family: inherit; 
    outline: none;
    transition: all 0.2s;
    width: 100%;
  }
  input:focus { 
    border-color: #3b82f6; 
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  input::placeholder {
    color: var(--color-muted);
    opacity: 0.6;
  }

  /* Scopes Grid */
  .scopes-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); 
    gap: 0.75rem; 
  }
  .scope-group { 
    display: flex; 
    flex-direction: column; 
    gap: 0.5rem; 
  }
  .scope-group-label { 
    font-size: 0.65rem; 
    font-weight: 800; 
    text-transform: uppercase; 
    letter-spacing: 0.08em; 
    color: var(--color-muted); 
    margin-bottom: 0.25rem;
    padding-left: 0.25rem;
  }
  .scope-check {
    display: flex; 
    align-items: flex-start; 
    gap: 0.625rem;
    padding: 0.625rem; 
    border-radius: var(--radius); 
    border: 1px solid var(--color-border); 
    background: var(--color-surface);
    cursor: pointer; 
    transition: all 0.15s;
  }
  .scope-check:hover {
    border-color: #bfdbfe;
    background: #fafafa;
  }
  .scope-check.checked {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.04);
  }
  .scope-check-admin { 
    border-color: rgba(220,38,38,0.2); 
  }
  .scope-check-admin:hover {
    border-color: rgba(220,38,38,0.4);
    background: rgba(220, 38, 38, 0.02);
  }
  .scope-check-admin.checked {
    border-color: #dc2626;
    background: rgba(220, 38, 38, 0.04);
  }
  .scope-check input { 
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .scope-check-box {
    width: 18px;
    height: 18px;
    border: 2px solid var(--color-border);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.125rem;
    transition: all 0.15s;
    color: white;
  }
  .scope-check.checked .scope-check-box {
    background: #3b82f6;
    border-color: #3b82f6;
  }
  .scope-check-admin.checked .scope-check-box {
    background: #dc2626;
    border-color: #dc2626;
  }
  .scope-check-content { 
    display: flex; 
    flex-direction: column; 
    gap: 0.125rem;
  }
  .scope-check-header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .scope-check-header :global(svg) {
    color: var(--color-muted);
  }
  .scope-check.checked .scope-check-header :global(svg) {
    color: #3b82f6;
  }
  .scope-check-admin.checked .scope-check-header :global(svg) {
    color: #dc2626;
  }
  .scope-check-label { 
    font-size: 0.82rem; 
    font-weight: 700; 
    color: var(--color-text); 
  }
  .scope-check-desc { 
    font-size: 0.72rem; 
    color: var(--color-muted); 
    line-height: 1.4; 
  }

  .form-error { 
    display: flex; 
    align-items: center; 
    gap: 0.5rem; 
    padding: 0.875rem 1rem; 
    background: rgba(220,38,38,0.06); 
    border: 1px solid rgba(220,38,38,0.15); 
    border-radius: var(--radius); 
    font-size: 0.82rem; 
    color: #dc2626; 
  }
  .modal-foot { 
    display: flex; 
    gap: 0.75rem; 
    justify-content: flex-end; 
    padding-top: 0.5rem; 
    border-top: 1px solid var(--color-border); 
  }

  /* Raw Key Modal */
  .raw-key-modal { 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    gap: 1.25rem; 
    padding: 2.5rem 2rem;
    text-align: center;
    max-width: 480px;
  }
  .rk-success-ring {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, #16a34a, #22c55e);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 8px 24px rgba(22, 163, 74, 0.3);
    animation: successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes successPop {
    0% { transform: scale(0); opacity: 0; }
    70% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  .rk-icon { 
    color: white; 
  }
  .rk-title { 
    font-size: 1.25rem; 
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }
  .rk-subtitle {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }
  .rk-warning {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    text-align: left;
    padding: 1rem 1.25rem;
    background: rgba(234, 179, 8, 0.08);
    border: 1px solid rgba(234, 179, 8, 0.2);
    border-radius: var(--radius);
    font-size: 0.82rem;
    color: #a16207;
    width: 100%;
  }
  .rk-warning strong {
    display: block;
    color: #ca8a04;
    margin-bottom: 0.25rem;
  }
  .rk-key-wrap { 
    width: 100%; 
    background: var(--color-bg); 
    border: 2px solid var(--color-border); 
    border-radius: var(--radius-md); 
    padding: 1.25rem; 
    display: flex; 
    flex-direction: column; 
    gap: 1rem; 
  }
  .rk-key { 
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 0.78rem; 
    word-break: break-all; 
    color: var(--color-text); 
    line-height: 1.6;
    background: white;
    padding: 0.875rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    letter-spacing: 0.025em;
  }
  .rk-copy-btn { 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 0.5rem; 
    padding: 0.625rem 1.25rem; 
    background: var(--color-surface); 
    border: 1px solid var(--color-border); 
    border-radius: var(--radius); 
    font-size: 0.875rem; 
    font-weight: 600; 
    cursor: pointer; 
    font-family: inherit; 
    color: var(--color-text); 
    transition: all 0.15s; 
    align-self: center;
  }
  .rk-copy-btn:hover { 
    background: var(--color-surface-hover); 
    border-color: #3b82f6; 
    color: #3b82f6;
  }
  .rk-actions {
    width: 100%;
  }
  .rk-done { 
    width: 100%; 
    justify-content: center; 
    padding: 0.875rem;
    font-size: 0.875rem;
  }

  /* Confirm Modal */
  .confirm-modal {
    max-width: 420px;
    padding: 2rem;
    text-align: center;
  }
  .confirm-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.25rem;
  }
  .confirm-icon.warn {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
  .confirm-icon.danger {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
  .confirm-modal h2 {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0 0 0.5rem;
  }
  .confirm-modal p {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0 0 1.5rem;
    line-height: 1.5;
  }
  .confirm-modal .modal-foot {
    justify-content: center;
    border: none;
    padding: 0;
  }

  /* Spin Animation */
  :global(.spin) {
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { 
    to { transform: rotate(360deg); } 
  }

  /* ── Responsive ──────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .ak-page {
      padding: 1rem;
      gap: 1rem;
    }
    .stats-dashboard {
      grid-template-columns: repeat(2, 1fr);
    }
    .stat-wide {
      grid-column: span 2;
    }
    .stat-highlight {
      grid-column: span 2;
    }
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }
    .toolbar-left {
      flex-direction: column;
    }
    .search-wrap {
      max-width: none;
    }
    .filter-tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .form-row {
      grid-template-columns: 1fr;
    }
    .scopes-grid {
      grid-template-columns: 1fr;
    }
    .detail-grid {
      grid-template-columns: 1fr;
    }
    .keys-table th,
    .keys-table td {
      padding: 0.75rem 0.625rem;
    }
    .th-checkbox,
    .td-checkbox {
      width: 36px;
    }
    .td-actions {
      min-width: 100px;
    }
    .usage-cell {
      min-width: 80px;
    }
    .bulk-bar {
      flex-direction: column;
      gap: 0.75rem;
    }
    .bulk-actions {
      width: 100%;
      justify-content: stretch;
    }
    .bulk-actions :global(form) {
      flex: 1;
    }
    .bulk-actions :global(button) {
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .stats-dashboard {
      grid-template-columns: 1fr;
    }
    .stat-wide,
    .stat-highlight {
      grid-column: span 1;
    }
    .ak-title {
      font-size: 1.1rem;
    }
    .modal {
      margin: 0.5rem;
      max-height: calc(100vh - 1rem);
    }
    .raw-key-modal {
      padding: 1.5rem 1rem;
    }
  }
</style>
