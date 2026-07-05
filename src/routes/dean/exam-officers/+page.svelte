<!-- src/routes/hod/exam-officers/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { ShieldCheck, Users, Mail, Phone, IdCard, Search, X } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let search = $state('');
  let tab = $state<'officers' | 'coordinators'>('officers');

  function initials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  const activeList = $derived(tab === 'officers' ? data.examOfficers : data.collegeCoordinators);

  const filteredList = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.staffId ?? '').toLowerCase().includes(q)
    );
  });
</script>

<svelte:head><title>Exam Officers & Coordinators — HOD Portal</title></svelte:head>

<div class="page-header">
  <div class="page-header-text">
    <h1>Exam Officers & Coordinators</h1>
    <p>Everyone in your college handling college-level exam coordination.</p>
  </div>
</div>

<div class="toolbar">
  <div class="tabs">
    <button type="button" class="tab" class:active={tab === 'officers'} onclick={() => (tab = 'officers')}>
      <ShieldCheck size={14} /> Exam Officers
      <span class="tab-count">{data.examOfficers.length}</span>
    </button>
    <button type="button" class="tab" class:active={tab === 'coordinators'} onclick={() => (tab = 'coordinators')}>
      <Users size={14} /> College Coordinators
      <span class="tab-count">{data.collegeCoordinators.length}</span>
    </button>
  </div>

  <div class="search-box">
    <Search size={16} />
    <input type="text" placeholder="Search by name, email, or staff ID..." bind:value={search} />
    {#if search}
      <button type="button" class="icon-btn" onclick={() => (search = '')} aria-label="Clear search">
        <X size={14} />
      </button>
    {/if}
  </div>
</div>

<div class="hod-grid">
  {#each filteredList as p}
    <div class="hod-card" class:inactive={!p.isActive || p.isSuspended}>
      <div class="hod-card-top">
        <div class="avatar">
          {#if p.photoUrl}
            <img src={p.photoUrl} alt={p.fullName} />
          {:else}
            <span>{initials(p.fullName)}</span>
          {/if}
        </div>
        <div class="hod-name-block">
          <strong>{p.fullName}</strong>
          <span class="role-name">{tab === 'officers' ? 'Exam Officer' : 'College Coordinator'}</span>
        </div>
        {#if p.isSuspended}
          <span class="status-chip suspended">Suspended</span>
        {:else if !p.isActive}
          <span class="status-chip inactive">Inactive</span>
        {:else}
          <span class="status-chip active">Active</span>
        {/if}
      </div>

      <div class="hod-details">
        <div class="detail-row">
          <Mail size={13} />
          <a href="mailto:{p.email}">{p.email}</a>
        </div>
        {#if p.phone}
          <div class="detail-row">
            <Phone size={13} />
            <span>{p.phone}</span>
          </div>
        {/if}
        {#if p.staffId}
          <div class="detail-row">
            <IdCard size={13} />
            <span>{p.staffId}</span>
          </div>
        {/if}
      </div>

      <div class="hod-footer">
        <a href="mailto:{p.email}" class="btn-contact">
          <Mail size={12} /> Contact
        </a>
      </div>
    </div>
  {:else}
    <div class="empty-state">
      {#if tab === 'officers'}
        <ShieldCheck size={40} strokeWidth={1} color="var(--color-muted)" />
        <p>{search ? 'No exam officers match your search.' : 'No exam officers have been added for your college yet.'}</p>
      {:else}
        <Users size={40} strokeWidth={1} color="var(--color-muted)" />
        <p>{search ? 'No college coordinators match your search.' : 'No college coordinator is currently assigned in your college.'}</p>
      {/if}
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

  .tabs { display: flex; gap: 0.5rem; }
  .tab {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 0.9rem;
    background: var(--surface-1);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 600;
    color: var(--color-muted); cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .tab:hover { border-color: var(--p-accent); color: var(--p-accent); }
  .tab.active { background: var(--p-accent); border-color: var(--p-accent); color: white; }
  .tab-count {
    font-size: 0.68rem; font-weight: 700;
    background: rgba(255,255,255,0.25); padding: 0.05rem 0.4rem; border-radius: 1rem;
  }
  .tab:not(.active) .tab-count { background: var(--color-bg); }

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
    min-width: 240px;
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
  .role-name { font-size: 0.76rem; color: var(--color-muted); }

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

  .hod-footer {
    display: flex; align-items: center; justify-content: flex-end;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
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