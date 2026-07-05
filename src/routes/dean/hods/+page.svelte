<!-- src/routes/dean/hods/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { Users, Mail, Phone, IdCard, ShieldCheck, AlertCircle, Search, X, CheckCircle2 } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let search = $state('');

  const filteredHods = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.hods;
    return data.hods.filter(
      (h) =>
        h.fullName.toLowerCase().includes(q) ||
        h.email.toLowerCase().includes(q) ||
        (h.department?.name ?? '').toLowerCase().includes(q) ||
        (h.staffId ?? '').toLowerCase().includes(q)
    );
  });

  function initials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function isExamCoordinator(h: (typeof data.hods)[number]) {
    return h.department?.examCoordinator?.userId === h.id;
  }
</script>

<svelte:head><title>HODs — Dean Portal</title></svelte:head>

<div class="page-header">
  <div class="page-header-text">
    <h1>Heads of Department</h1>
    <p>All HODs across departments in your college, at a glance.</p>
  </div>
</div>

<div class="toolbar">
  <div class="search-box">
    <Search size={16} />
    <input type="text" placeholder="Search by name, email, department, or staff ID..." bind:value={search} />
    {#if search}
      <button type="button" class="icon-btn" onclick={() => (search = '')} aria-label="Clear search">
        <X size={14} />
      </button>
    {/if}
  </div>
  <span class="count-pill"><Users size={14} /> {filteredHods.length} of {data.hods.length} HODs</span>
</div>

{#if data.departmentsWithoutHod.length > 0}
  <div class="alert-warning">
    <AlertCircle size={14} />
    <span>
      {data.departmentsWithoutHod.length} department{data.departmentsWithoutHod.length === 1 ? '' : 's'} without an assigned HOD:
      <strong>{data.departmentsWithoutHod.map((d) => d.name).join(', ')}</strong>
    </span>
  </div>
{/if}

<div class="hod-grid">
  {#each filteredHods as h}
    <div class="hod-card" class:inactive={!h.isActive || h.isSuspended}>
      <div class="hod-card-top">
        <div class="avatar">
          {#if h.photoUrl}
            <img src={h.photoUrl} alt={h.fullName} />
          {:else}
            <span>{initials(h.fullName)}</span>
          {/if}
        </div>
        <div class="hod-name-block">
          <strong>{h.fullName}</strong>
          <span class="dept-name">{h.department?.name ?? 'No department assigned'}</span>
        </div>
        {#if h.isSuspended}
          <span class="status-chip suspended">Suspended</span>
        {:else if !h.isActive}
          <span class="status-chip inactive">Inactive</span>
        {:else}
          <span class="status-chip active">Active</span>
        {/if}
      </div>

      <div class="hod-details">
        <div class="detail-row">
          <Mail size={13} />
          <a href="mailto:{h.email}">{h.email}</a>
        </div>
        {#if h.phone}
          <div class="detail-row">
            <Phone size={13} />
            <span>{h.phone}</span>
          </div>
        {/if}
        {#if h.staffId}
          <div class="detail-row">
            <IdCard size={13} />
            <span>{h.staffId}</span>
          </div>
        {/if}
        {#if isExamCoordinator(h)}
          <div class="detail-row coordinator">
            <ShieldCheck size={13} />
            <span>Also department exam coordinator</span>
          </div>
        {/if}
      </div>

      <div class="hod-footer">
        <span class="dept-code">{h.department?.code ?? '—'}</span>
        <a href="mailto:{h.email}" class="btn-contact">
          <Mail size={12} /> Contact
        </a>
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <Users size={40} strokeWidth={1} color="var(--color-muted)" />
      <p>{search ? 'No HODs match your search.' : 'No HODs have been assigned in your college yet.'}</p>
      {#if search}
        <button class="btn-link" onclick={() => (search = '')}>Clear search</button>
      {/if}
    </div>
  {/each}
</div>

<style>
  @import '$lib/styles/portals.css';

  .toolbar {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--surface-1);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.45rem 0.7rem;
    color: var(--color-muted);
    flex: 1;
    min-width: 260px;
  }
  .search-box input {
    border: none;
    background: transparent;
    outline: none;
    color: var(--color-text);
    font-size: 0.85rem;
    font-family: inherit;
    width: 100%;
  }
  .icon-btn {
    background: none; border: none; cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center;
  }
  .count-pill {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    background: var(--surface-1); border: 1px solid var(--color-border);
    padding: 0.4rem 0.75rem; border-radius: 2rem; white-space: nowrap;
  }

  .alert-warning {
    display: flex; align-items: flex-start; gap: 0.5rem;
    background: #fef3c7; color: #92400e;
    padding: 0.75rem 1rem; border-radius: 0.5rem;
    margin-bottom: 1rem; font-size: 0.82rem; line-height: 1.4;
  }
  :global([data-theme='dark']) .alert-warning { background: #451a03; color: #fcd34d; }

  .hod-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .hod-card {
    background: var(--surface-1);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .hod-card:hover {
    border-color: var(--p-accent);
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
  .hod-card.inactive { opacity: 0.6; }

  .hod-card-top {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
  }
  .avatar {
    width: 42px; height: 42px; border-radius: 50%;
    background: var(--p-accent-dim); color: var(--p-accent);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
    overflow: hidden;
  }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .hod-name-block { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; flex: 1; }
  .hod-name-block strong { font-size: 0.92rem; color: var(--color-text); }
  .dept-name { font-size: 0.76rem; color: var(--color-muted); }

  .status-chip {
    font-size: 0.66rem; font-weight: 700; padding: 0.2rem 0.5rem;
    border-radius: 1rem; white-space: nowrap; flex-shrink: 0;
  }
  .status-chip.active { background: #dcfce7; color: #166534; }
  .status-chip.inactive { background: #f1f5f9; color: #64748b; }
  .status-chip.suspended { background: #fee2e2; color: #991b1b; }

  .hod-details {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }
  .detail-row {
    display: flex; align-items: center; gap: 0.45rem;
    font-size: 0.78rem; color: var(--color-muted);
  }
  .detail-row a { color: var(--color-muted); text-decoration: none; }
  .detail-row a:hover { color: var(--p-accent); text-decoration: underline; }
  .detail-row.coordinator { color: var(--p-accent); font-weight: 600; }

  .hod-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }
  .dept-code {
    font-size: 0.72rem; font-family: 'SF Mono', monospace;
    color: var(--color-muted); background: var(--surface-2, var(--color-bg));
    padding: 0.15rem 0.4rem; border-radius: 0.3rem;
  }
  .btn-contact {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; font-weight: 600; color: var(--p-accent);
    text-decoration: none; padding: 0.3rem 0.6rem;
    border: 1px solid var(--p-accent); border-radius: 0.4rem;
    transition: background 0.15s;
  }
  .btn-contact:hover { background: var(--p-accent-dim); }

  .empty-state {
    grid-column: 1 / -1;
    display: flex; flex-direction: column; align-items: center;
    gap: 0.75rem; padding: 3rem 1rem;
    color: var(--color-muted); text-align: center;
  }
  .btn-link {
    background: none; border: none;
    color: var(--p-accent); font-size: 0.85rem; cursor: pointer;
    text-decoration: underline; padding: 0.25rem;
  }
</style>