<!-- src/routes/admin/api-keys/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    Key, Plus, Trash2, ShieldOff, Eye, EyeOff, Copy, Check,
    Activity, RefreshCw, Globe, Clock, Hash, Shield, X,
    AlertTriangle, CheckCircle, ChevronDown, Filter, Search,
    BarChart3, Zap, Lock, Unlock
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const ALL_SCOPES = [
    { value: 'read_users',      label: 'Read Users',       group: 'Users',      desc: 'List and view user records' },
    { value: 'write_users',     label: 'Write Users',      group: 'Users',      desc: 'Create, update, suspend users' },
    { value: 'read_exams',      label: 'Read Exams',       group: 'Exams',      desc: 'List and fetch exam details' },
    { value: 'write_exams',     label: 'Write Exams',      group: 'Exams',      desc: 'Create and modify exams' },
    { value: 'read_results',    label: 'Read Results',     group: 'Results',    desc: 'Access exam results and scores' },
    { value: 'read_reports',    label: 'Read Reports',     group: 'Reports',    desc: 'Access analytics and reports' },
    { value: 'read_violations', label: 'Read Violations',  group: 'Security',   desc: 'View violation and flag data' },
    { value: 'write_violations',label: 'Write Violations', group: 'Security',   desc: 'Record and update violations' },
    { value: 'admin_full',      label: 'Full Admin',       group: 'Admin',      desc: 'All permissions — use with caution' },
  ] as const;

  const SCOPE_GROUPS = [...new Set(ALL_SCOPES.map(s => s.group))];

  // ── State ────────────────────────────────────────────────────────────────────
  let showCreateModal = $state(false);
  let showRawKey = $state<string | null>(null);
  let rawKeyCopied = $state(false);
  let deleteConfirmId = $state<string | null>(null);
  let revokeConfirmId = $state<string | null>(null);
  let searchQuery = $state('');
  let filterStatus = $state<'all' | 'active' | 'revoked' | 'expired'>('all');
  let selectedScopes = $state<string[]>([]);
  let expandedKey = $state<string | null>(null);

  // Form state
  let newKeyName = $state('');
  let newKeyExpiry = $state('');
  let newKeyIpWhitelist = $state('');
  let createLoading = $state(false);

  $effect(() => {
    if (form?.success && form?.rawKey) {
      showRawKey = form.rawKey;
      showCreateModal = false;
      newKeyName = '';
      newKeyExpiry = '';
      newKeyIpWhitelist = '';
      selectedScopes = [];
    }
  });

  async function copyKey() {
    if (!showRawKey) return;
    await navigator.clipboard.writeText(showRawKey);
    rawKeyCopied = true;
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

  const filteredKeys = $derived(data.keys.filter(k => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || k.name.toLowerCase().includes(q) || k.keyPrefix.includes(q);
    const matchStatus = filterStatus === 'all' || k.status === filterStatus;
    return matchSearch && matchStatus;
  }));

  function statusColor(status: string) {
    return status === 'active' ? 'status-active'
      : status === 'revoked' ? 'status-revoked'
      : 'status-expired';
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
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function scopeBadgeColor(scope: string) {
    if (scope === 'admin_full') return 'scope-admin';
    if (scope.startsWith('write_')) return 'scope-write';
    return 'scope-read';
  }
</script>

<div class="ak-page">

  <!-- Header -->
  <div class="ak-header">
    <div class="ak-header-left">
      <div class="ak-header-icon"><Key size={22} /></div>
      <div>
        <h1 class="ak-title">API Access Management</h1>
        <p class="ak-subtitle">Manage API keys and monitor external integrations</p>
      </div>
    </div>
    <button class="btn-primary" onclick={() => showCreateModal = true}>
      <Plus size={15} /> New API Key
    </button>
  </div>

  <!-- Stats row -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-icon stat-total"><Hash size={18} /></div>
      <div>
        <div class="stat-val">{data.stats.total}</div>
        <div class="stat-lbl">Total Keys</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-active"><Zap size={18} /></div>
      <div>
        <div class="stat-val">{data.stats.active}</div>
        <div class="stat-lbl">Active</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-revoked"><ShieldOff size={18} /></div>
      <div>
        <div class="stat-val">{data.stats.revoked}</div>
        <div class="stat-lbl">Revoked</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-expired"><Clock size={18} /></div>
      <div>
        <div class="stat-val">{data.stats.expired}</div>
        <div class="stat-lbl">Expired</div>
      </div>
    </div>
    <div class="stat-card stat-card-wide">
      <div class="stat-icon stat-logs"><Activity size={18} /></div>
      <div>
        <div class="stat-val">{data.stats.recentLogs.length}</div>
        <div class="stat-lbl">Recent Requests (last 50)</div>
      </div>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters-bar">
    <div class="search-wrap">
      <Search size={13} />
      <input class="search-input" placeholder="Search by name or prefix…" bind:value={searchQuery} />
    </div>
    <div class="filter-tabs">
      {#each ['all','active','revoked','expired'] as s}
        <button
          class="filter-tab"
          class:active={filterStatus === s}
          onclick={() => filterStatus = s as typeof filterStatus}
        >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
      {/each}
    </div>
  </div>

  <!-- Keys table -->
  <div class="keys-table-wrap">
    {#if filteredKeys.length === 0}
      <div class="empty-state">
        <Key size={32} />
        <p>No API keys found</p>
        <button class="btn-primary" onclick={() => showCreateModal = true}><Plus size={14} /> Create your first key</button>
      </div>
    {:else}
      <table class="keys-table">
        <thead>
          <tr>
            <th>Name & Prefix</th>
            <th>Scopes</th>
            <th>Status</th>
            <th>Last Used</th>
            <th>Requests</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredKeys as key (key.id)}
            <tr class="key-row" class:expanded={expandedKey === key.id}>
              <td>
                <button class="key-name-btn" onclick={() => expandedKey = expandedKey === key.id ? null : key.id}>
                  <ChevronDown size={13} class="row-chevron" style="transform: rotate({expandedKey === key.id ? '180deg' : '0deg'}); transition: transform .2s" />
                  <span class="key-name">{key.name}</span>
                </button>
                <div class="key-prefix"><code>{key.keyPrefix}…</code></div>
                <div class="key-meta">by {key.createdBy.fullName} · {formatDate(key.createdAt)}</div>
              </td>
              <td>
                <div class="scope-list">
                  {#each key.scopes.slice(0, 3) as scope}
                    <span class="scope-badge {scopeBadgeColor(scope)}">{scope.replace(/_/g,' ')}</span>
                  {/each}
                  {#if key.scopes.length > 3}
                    <span class="scope-badge scope-more">+{key.scopes.length - 3}</span>
                  {/if}
                </div>
              </td>
              <td><span class="status-badge {statusColor(key.status)}">{key.status}</span></td>
              <td class="td-muted">{formatRelative(key.lastUsedAt)}</td>
              <td class="td-muted">{key.requestCount.toLocaleString()}</td>
              <td class="td-muted">{formatDate(key.expiresAt)}</td>
              <td>
                <div class="row-actions">
                  {#if key.status === 'active'}
                    <form method="POST" action="?/revoke" use:enhance>
                      <input type="hidden" name="id" value={key.id} />
                      <button type="submit" class="action-btn action-revoke" title="Revoke key">
                        <Lock size={13} />
                      </button>
                    </form>
                  {/if}
                  <form method="POST" action="?/delete" use:enhance>
                    <input type="hidden" name="id" value={key.id} />
                    <button type="submit" class="action-btn action-delete" title="Delete key">
                      <Trash2 size={13} />
                    </button>
                  </form>
                </div>
              </td>
            </tr>
            {#if expandedKey === key.id}
              <tr class="key-detail-row">
                <td colspan="7">
                  <div class="key-detail">
                    <div class="detail-section">
                      <h4>IP Whitelist</h4>
                      {#if key.ipWhitelist.length}
                        <div class="ip-list">
                          {#each key.ipWhitelist as ip}<span class="ip-chip"><Globe size={11} />{ip}</span>{/each}
                        </div>
                      {:else}
                        <span class="td-muted">No restrictions — all IPs allowed</span>
                      {/if}
                    </div>
                    <div class="detail-section">
                      <h4>All Scopes</h4>
                      <div class="scope-list">
                        {#each key.scopes as scope}
                          <span class="scope-badge {scopeBadgeColor(scope)}">{scope.replace(/_/g,' ')}</span>
                        {/each}
                      </div>
                    </div>
                    {#if key.revokedBy}
                      <div class="detail-section">
                        <h4>Revoked by</h4>
                        <span class="td-muted">{key.revokedBy.fullName} on {formatDate(key.revokedAt)}</span>
                      </div>
                    {/if}
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <!-- Recent access logs -->
  {#if data.stats.recentLogs.length > 0}
    <div class="logs-section">
      <h3 class="section-title"><Activity size={16} /> Recent API Requests</h3>
      <div class="logs-table-wrap">
        <table class="logs-table">
          <thead>
            <tr><th>Key</th><th>Method</th><th>Endpoint</th><th>Status</th><th>Duration</th><th>Time</th></tr>
          </thead>
          <tbody>
            {#each data.stats.recentLogs.slice(0, 20) as log}
              <tr>
                <td><code class="log-key">{log.key.keyPrefix}…</code><span class="td-muted"> {log.key.name}</span></td>
                <td><span class="method-badge method-{log.method.toLowerCase()}">{log.method}</span></td>
                <td class="log-endpoint"><code>{log.endpoint}</code></td>
                <td>
                  <span class="status-code" class:sc-ok={log.statusCode < 400} class:sc-err={log.statusCode >= 400}>
                    {log.statusCode}
                  </span>
                </td>
                <td class="td-muted">{log.durationMs ? `${log.durationMs}ms` : '—'}</td>
                <td class="td-muted">{formatRelative(log.createdAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

</div>

<!-- ── Create Modal ────────────────────────────────────────────────────────── -->
{#if showCreateModal}
  <div class="modal-bg" onclick={() => showCreateModal = false} role="dialog" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-head">
        <h2><Key size={18} /> New API Key</h2>
        <button class="modal-close" onclick={() => showCreateModal = false}><X size={16} /></button>
      </div>

      <form method="POST" action="?/create" use:enhance={() => {
        createLoading = true;
        return async ({ update }) => { createLoading = false; await update(); };
      }}>
        <div class="form-field">
          <label for="key-name">Key Name <span class="req">*</span></label>
          <input id="key-name" name="name" bind:value={newKeyName} placeholder="e.g. LMS Integration" required />
        </div>

        <div class="form-field">
          <label>Scopes <span class="req">*</span></label>
          <div class="scopes-grid">
            {#each SCOPE_GROUPS as group}
              <div class="scope-group">
                <div class="scope-group-label">{group}</div>
                {#each ALL_SCOPES.filter(s => s.group === group) as scope}
                  <label class="scope-check" class:scope-check-admin={scope.value === 'admin_full'}>
                    <input
                      type="checkbox"
                      name="scopes"
                      value={scope.value}
                      checked={selectedScopes.includes(scope.value)}
                      onchange={() => toggleScope(scope.value)}
                    />
                    <div class="scope-check-content">
                      <span class="scope-check-label">{scope.label}</span>
                      <span class="scope-check-desc">{scope.desc}</span>
                    </div>
                  </label>
                {/each}
              </div>
            {/each}
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="key-expiry">Expires in (days)</label>
            <input id="key-expiry" name="expiresIn" type="number" min="1" bind:value={newKeyExpiry} placeholder="Never" />
          </div>
          <div class="form-field">
            <label for="key-ip">IP Whitelist</label>
            <input id="key-ip" name="ipWhitelist" bind:value={newKeyIpWhitelist} placeholder="192.168.1.1, 10.0.0.0/24" />
          </div>
        </div>

        {#if form?.error}
          <div class="form-error"><AlertTriangle size={13} /> {form.error}</div>
        {/if}

        <div class="modal-foot">
          <button type="button" class="btn-ghost" onclick={() => showCreateModal = false}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={createLoading || !newKeyName || selectedScopes.length === 0}>
            {#if createLoading}<span class="spin">⟳</span>{:else}<Key size={14} />{/if}
            Generate Key
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ── Raw Key Display Modal ──────────────────────────────────────────────── -->
{#if showRawKey}
  <div class="modal-bg" role="dialog" aria-modal="true">
    <div class="modal raw-key-modal">
      <div class="rk-icon"><CheckCircle size={28} /></div>
      <h2 class="rk-title">API Key Created</h2>
      <p class="rk-warning">
        <AlertTriangle size={14} />
        Copy this key now. It will <strong>never be shown again.</strong>
      </p>
      <div class="rk-key-wrap">
        <code class="rk-key">{showRawKey}</code>
        <button class="rk-copy-btn" onclick={copyKey}>
          {#if rawKeyCopied}<Check size={15} />{:else}<Copy size={15} />{/if}
          {rawKeyCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <button class="btn-primary rk-done" onclick={() => { showRawKey = null; rawKeyCopied = false; }}>
        Done — I've copied the key
      </button>
    </div>
  </div>
{/if}

<style>
  .ak-page { display: flex; flex-direction: column; gap: 1.5rem; }

  /* Header */
  .ak-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .ak-header-left { display: flex; align-items: center; gap: .875rem; }
  .ak-header-icon {
    width: 44px; height: 44px; border-radius: .75rem;
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
  }
  .ak-title { font-size: 1.25rem; font-weight: 800; color: var(--color-text); }
  .ak-subtitle { font-size: .8rem; color: var(--color-muted); margin-top: .125rem; }

  /* Buttons */
  .btn-primary {
    display: flex; align-items: center; gap: .5rem;
    padding: .55rem 1.1rem; background: #16a34a; color: white;
    border: none; border-radius: .5rem; font-size: .82rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: background .15s;
  }
  .btn-primary:hover { background: #15803d; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .btn-ghost {
    display: flex; align-items: center; gap: .5rem;
    padding: .55rem 1.1rem; background: transparent;
    border: 1px solid var(--color-border); color: var(--color-text);
    border-radius: .5rem; font-size: .82rem; font-weight: 600; cursor: pointer; font-family: inherit;
  }
  .btn-ghost:hover { background: var(--color-surface-hover); }

  /* Stats */
  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .875rem; }
  .stat-card {
    display: flex; align-items: center; gap: .875rem;
    padding: 1rem 1.25rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: .875rem;
  }
  .stat-card-wide { grid-column: span 2; }
  .stat-icon {
    width: 38px; height: 38px; border-radius: .625rem;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-total  { background: rgba(99,102,241,.12); color: #6366f1; }
  .stat-active { background: rgba(22,163,74,.12);  color: #16a34a; }
  .stat-revoked{ background: rgba(220,38,38,.12);  color: #dc2626; }
  .stat-expired{ background: rgba(234,179,8,.12);  color: #ca8a04; }
  .stat-logs   { background: rgba(59,130,246,.12); color: #3b82f6; }
  .stat-val { font-size: 1.35rem; font-weight: 800; color: var(--color-text); line-height: 1; }
  .stat-lbl { font-size: .72rem; color: var(--color-muted); margin-top: .25rem; }

  /* Filters */
  .filters-bar { display: flex; align-items: center; gap: .875rem; flex-wrap: wrap; }
  .search-wrap {
    display: flex; align-items: center; gap: .5rem;
    padding: .45rem .75rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: .5rem; flex: 1; min-width: 200px;
  }
  .search-wrap svg { color: var(--color-muted); flex-shrink: 0; }
  .search-input { background: none; border: none; outline: none; font-size: .8rem; color: var(--color-text); width: 100%; font-family: inherit; }
  .filter-tabs { display: flex; gap: .25rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .5rem; padding: .25rem; }
  .filter-tab { padding: .35rem .75rem; border-radius: .375rem; border: none; background: none; font-size: .75rem; font-weight: 500; color: var(--color-muted); cursor: pointer; font-family: inherit; transition: all .15s; }
  .filter-tab.active { background: var(--color-surface); color: var(--color-text); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.08); }

  /* Table */
  .keys-table-wrap {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .875rem; overflow: hidden;
  }
  .keys-table { width: 100%; border-collapse: collapse; }
  .keys-table th {
    padding: .75rem 1rem; background: var(--color-bg);
    font-size: .7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .05em; color: var(--color-muted);
    text-align: left; border-bottom: 1px solid var(--color-border);
  }
  .keys-table td { padding: .875rem 1rem; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
  .key-row:last-child td { border-bottom: none; }
  .key-name-btn { display: flex; align-items: center; gap: .375rem; background: none; border: none; cursor: pointer; color: var(--color-text); font-family: inherit; padding: 0; }
  .key-name { font-weight: 600; font-size: .85rem; }
  .key-prefix code { font-size: .72rem; color: var(--color-muted); background: var(--color-bg); padding: .1rem .375rem; border-radius: .25rem; }
  .key-meta { font-size: .68rem; color: var(--color-muted); margin-top: .25rem; }
  .td-muted { color: var(--color-muted); font-size: .8rem; }

  /* Scope badges */
  .scope-list { display: flex; flex-wrap: wrap; gap: .25rem; }
  .scope-badge { font-size: .65rem; font-weight: 600; padding: .2rem .5rem; border-radius: .375rem; text-transform: capitalize; white-space: nowrap; }
  .scope-read  { background: rgba(59,130,246,.1);  color: #3b82f6; }
  .scope-write { background: rgba(234,179,8,.1);   color: #ca8a04; }
  .scope-admin { background: rgba(220,38,38,.1);   color: #dc2626; }
  .scope-more  { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }

  /* Status badges */
  .status-badge { font-size: .7rem; font-weight: 700; padding: .25rem .625rem; border-radius: 2rem; text-transform: uppercase; letter-spacing: .04em; }
  .status-active  { background: rgba(22,163,74,.12);  color: #16a34a; }
  .status-revoked { background: rgba(220,38,38,.12);  color: #dc2626; }
  .status-expired { background: rgba(234,179,8,.12);  color: #ca8a04; }

  /* Row actions */
  .row-actions { display: flex; gap: .375rem; }
  .action-btn {
    width: 30px; height: 30px; border-radius: .375rem; border: 1px solid var(--color-border);
    background: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); transition: all .15s;
  }
  .action-revoke:hover { border-color: #ca8a04; color: #ca8a04; background: rgba(234,179,8,.08); }
  .action-delete:hover { border-color: #dc2626; color: #dc2626; background: rgba(220,38,38,.08); }

  /* Expanded detail row */
  .key-detail-row td { background: var(--color-bg); padding: 0; border-bottom: 1px solid var(--color-border); }
  .key-detail { display: flex; gap: 2rem; padding: 1rem 1.5rem; flex-wrap: wrap; }
  .detail-section h4 { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); margin-bottom: .5rem; }
  .ip-list { display: flex; flex-wrap: wrap; gap: .375rem; }
  .ip-chip { display: flex; align-items: center; gap: .3rem; font-size: .72rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .375rem; padding: .2rem .5rem; color: var(--color-text); }

  /* Empty */
  .empty-state { padding: 4rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--color-muted); }
  .empty-state p { font-size: .9rem; }

  /* Logs */
  .logs-section { display: flex; flex-direction: column; gap: .875rem; }
  .section-title { display: flex; align-items: center; gap: .5rem; font-size: .9rem; font-weight: 700; color: var(--color-text); }
  .logs-table-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .logs-table { width: 100%; border-collapse: collapse; }
  .logs-table th { padding: .625rem 1rem; background: var(--color-bg); font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); text-align: left; border-bottom: 1px solid var(--color-border); }
  .logs-table td { padding: .625rem 1rem; border-bottom: 1px solid var(--color-border); font-size: .78rem; }
  .logs-table tr:last-child td { border-bottom: none; }
  .log-key { font-size: .72rem; background: var(--color-bg); padding: .1rem .35rem; border-radius: .25rem; }
  .log-endpoint code { font-size: .72rem; color: var(--color-muted); }
  .method-badge { font-size: .65rem; font-weight: 800; padding: .15rem .5rem; border-radius: .25rem; }
  .method-get  { background: rgba(59,130,246,.12); color: #3b82f6; }
  .method-post { background: rgba(22,163,74,.12);  color: #16a34a; }
  .method-put  { background: rgba(234,179,8,.12);  color: #ca8a04; }
  .method-delete { background: rgba(220,38,38,.12); color: #dc2626; }
  .status-code { font-weight: 700; font-size: .78rem; }
  .sc-ok  { color: #16a34a; }
  .sc-err { color: #dc2626; }

  /* Modal */
  .modal-bg {
    position: fixed; inset: 0; background: rgba(0,0,0,.55);
    backdrop-filter: blur(4px); z-index: 200;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; width: 100%; max-width: 560px;
    box-shadow: 0 20px 60px rgba(0,0,0,.25); max-height: 90vh; overflow-y: auto;
  }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border); }
  .modal-head h2 { display: flex; align-items: center; gap: .5rem; font-size: 1rem; font-weight: 700; }
  .modal-close { background: none; border: none; cursor: pointer; color: var(--color-muted); display: flex; border-radius: .375rem; padding: .25rem; }
  .modal-close:hover { color: var(--color-text); background: var(--color-bg); }

  form { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .form-field { display: flex; flex-direction: column; gap: .4rem; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  label { font-size: .78rem; font-weight: 600; color: var(--color-text); }
  .req { color: #dc2626; }
  input[type="text"], input[type="number"], input:not([type="checkbox"]) {
    padding: .6rem .875rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .5rem;
    font-size: .82rem; color: var(--color-text); font-family: inherit; outline: none;
    transition: border-color .15s;
  }
  input:focus { border-color: #16a34a; }

  /* Scopes grid */
  .scopes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: .75rem; }
  .scope-group { display: flex; flex-direction: column; gap: .375rem; }
  .scope-group-label { font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; color: var(--color-muted); margin-bottom: .125rem; }
  .scope-check {
    display: flex; align-items: flex-start; gap: .5rem;
    padding: .5rem .625rem; border-radius: .5rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    cursor: pointer; transition: border-color .15s;
  }
  .scope-check:has(input:checked) { border-color: #16a34a; background: rgba(22,163,74,.05); }
  .scope-check-admin { border-color: rgba(220,38,38,.3); }
  .scope-check-admin:has(input:checked) { border-color: #dc2626; background: rgba(220,38,38,.05); }
  .scope-check input { margin-top: .15rem; flex-shrink: 0; accent-color: #16a34a; }
  .scope-check-content { display: flex; flex-direction: column; }
  .scope-check-label { font-size: .78rem; font-weight: 600; color: var(--color-text); }
  .scope-check-desc { font-size: .68rem; color: var(--color-muted); line-height: 1.35; }

  .form-error { display: flex; align-items: center; gap: .5rem; padding: .625rem .875rem; background: rgba(220,38,38,.08); border: 1px solid rgba(220,38,38,.2); border-radius: .5rem; font-size: .78rem; color: #dc2626; }
  .modal-foot { display: flex; gap: .625rem; justify-content: flex-end; padding-top: .5rem; border-top: 1px solid var(--color-border); }

  /* Raw key modal */
  .raw-key-modal { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2.5rem 2rem; }
  .rk-icon { color: #16a34a; }
  .rk-title { font-size: 1.1rem; font-weight: 800; }
  .rk-warning { display: flex; align-items: center; gap: .5rem; font-size: .8rem; color: #ca8a04; background: rgba(234,179,8,.1); border: 1px solid rgba(234,179,8,.3); border-radius: .5rem; padding: .625rem .875rem; text-align: center; }
  .rk-key-wrap { width: 100%; background: var(--color-bg); border: 2px solid var(--color-border); border-radius: .625rem; padding: 1rem; display: flex; flex-direction: column; gap: .75rem; }
  .rk-key { font-family: monospace; font-size: .72rem; word-break: break-all; color: var(--color-text); line-height: 1.6; }
  .rk-copy-btn { display: flex; align-items: center; justify-content: center; gap: .375rem; padding: .5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .375rem; font-size: .78rem; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--color-text); transition: all .15s; align-self: flex-end; }
  .rk-copy-btn:hover { background: var(--color-surface-hover); border-color: #16a34a; }
  .rk-done { width: 100%; justify-content: center; padding: .75rem; }

  .spin { display: inline-block; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) {
    .stat-card-wide { grid-column: span 1; }
    .form-row { grid-template-columns: 1fr; }
    .scopes-grid { grid-template-columns: 1fr; }
  }
</style>