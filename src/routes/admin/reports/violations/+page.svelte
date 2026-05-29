<!-- src/routes/(admin)/security/violations/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    AlertTriangle, Shield, EyeOff, Clock, Search
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  const { violations, summary } = data;

  // ── Search — server-driven via URL param ─────────────────────────────────
  // Client-side filter for instant feedback while the user types,
  // then submit to server on Enter / 300ms debounce for the real query.
  let searchQuery = $state(data.searchQuery ?? '');
  let debounceTimer: ReturnType<typeof setTimeout>;

  function onSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const u = new URL($page.url);
      if (searchQuery.trim()) {
        u.searchParams.set('q', searchQuery.trim());
      } else {
        u.searchParams.delete('q');
      }
      goto(u.toString(), { keepFocus: true, replaceState: true });
    }, 350);
  }

  // Client-side instant filter while debounce is pending
  const filtered = $derived(
    violations.filter(v =>
      !searchQuery.trim() ||
      v.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.matric.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const SEV_CLASS: Record<string, string> = {
    low:      'sev-low',
    medium:   'sev-medium',
    high:     'sev-high',
    critical: 'sev-critical',
  };

  const ACT_CLASS: Record<string, string> = {
    warning:             'act-warning',
    invigilator_alerted: 'act-alert',
    exam_paused:         'act-paused',
    auto_submitted:      'act-auto',
  };

  function formatType(key: string) {
    return key.replace(/_/g, ' ');
  }

  function formatAction(key: string) {
    return key.replace(/_/g, ' ');
  }
</script>

<svelte:head><title>Violations — MOUAU eTest</title></svelte:head>

<div class="page">

  <header class="page-header">
    <div>
      <h1>Violations</h1>
      <p class="subtitle">Real-time security incident log</p>
    </div>
  </header>

  <!-- Summary -->
  <div class="summary-row">
    <div class="stat-card">
      <div class="stat-icon red"><AlertTriangle size={17} /></div>
      <div class="stat-body">
        <span class="stat-val">{summary.total}</span>
        <span class="stat-lbl">All time</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber"><Clock size={17} /></div>
      <div class="stat-body">
        <span class="stat-val">{summary.today}</span>
        <span class="stat-lbl">Today</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red"><Shield size={17} /></div>
      <div class="stat-body">
        <span class="stat-val">{summary.critical}</span>
        <span class="stat-lbl">Critical</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange"><EyeOff size={17} /></div>
      <div class="stat-body">
        <span class="stat-val">{summary.high}</span>
        <span class="stat-lbl">High severity</span>
      </div>
    </div>
  </div>

  <!-- Table card -->
  <div class="table-card">
    <div class="table-toolbar">
      <h2>Violation Log <span class="count-badge">{filtered.length}</span></h2>
      <div class="search-wrap">
        <Search size={14} />
        <input
          type="search"
          placeholder="Search student, matric, type…"
          bind:value={searchQuery}
          oninput={onSearchInput}
        />
      </div>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Student</th>
            <th>Exam</th>
            <th>Type</th>
            <th>Severity</th>
            <th>Action</th>
            <th>Flagged At</th>
          </tr>
        </thead>
        <tbody>
          {#if filtered.length === 0}
            <tr>
              <td colspan="7" class="empty-row">
                {searchQuery ? 'No violations match your search.' : 'No violations recorded yet.'}
              </td>
            </tr>
          {:else}
            {#each filtered as v}
              <tr>
                <td><code class="vid">{v.id}</code></td>
                <td>
                  <span class="student-name">{v.student}</span>
                  <span class="student-matric">{v.matric}</span>
                </td>
                <td class="exam-cell">{v.exam}</td>
                <td><span class="type-pill">{formatType(v.type)}</span></td>
                <td><span class="badge {SEV_CLASS[v.severity] ?? 'sev-medium'}">{v.severity}</span></td>
                <td><span class="badge {ACT_CLASS[v.action] ?? 'act-warning'}">{formatAction(v.action)}</span></td>
                <td class="time-cell">{v.flaggedAt}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

</div>

<style>
  .page {
    max-width: 1100px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Header ──────────────────────────────────────────── */
  h1 { font-size: 1.4rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--color-text); }
  .subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  /* ── Summary ─────────────────────────────────────────── */
  .summary-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  @media (max-width: 640px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 0.875rem 1rem;
    display: flex; align-items: center; gap: 0.75rem;
  }

  .stat-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-icon.red    { background: rgba(220,38,38,0.1);   color: #dc2626; }
  .stat-icon.amber  { background: rgba(245,158,11,0.1);  color: #d97706; }
  .stat-icon.orange { background: rgba(249,115,22,0.1);  color: #ea580c; }

  .stat-body { display: flex; flex-direction: column; gap: 0.1rem; }
  .stat-val  { font-size: 1.3rem; font-weight: 800; color: var(--color-text); font-variant-numeric: tabular-nums; line-height: 1.1; }
  .stat-lbl  { font-size: 0.7rem; color: var(--color-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

  /* ── Table card ──────────────────────────────────────── */
  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
  }

  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    gap: 1rem;
    flex-wrap: wrap;
  }

  h2 {
    font-size: 0.875rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .count-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.15rem 0.45rem;
    background: rgba(22,163,74,0.1);
    color: #16a34a;
    border-radius: 999px;
  }

  .search-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-muted);
    transition: border-color 0.15s;
    min-width: 240px;
  }

  .search-wrap:focus-within {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22,163,74,0.08);
  }

  .search-wrap input {
    flex: 1; background: none; border: none; outline: none;
    color: var(--color-text); font-size: 0.82rem; font-family: inherit;
  }

  .search-wrap input::placeholder { color: var(--color-muted); }

  /* ── Table ───────────────────────────────────────────── */
  .table-scroll { overflow-x: auto; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    white-space: nowrap;
  }

  thead { background: var(--color-bg); }

  th {
    padding: 0.625rem 1rem;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--color-bg); }

  /* ── Cell content ────────────────────────────────────── */
  .vid {
    font-family: monospace;
    font-size: 0.72rem;
    color: var(--color-muted);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    padding: 0.15rem 0.4rem;
    border-radius: 0.3rem;
  }

  td:nth-child(2) {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .student-name   { font-weight: 600; font-size: 0.82rem; color: var(--color-text); }
  .student-matric { font-size: 0.7rem; color: var(--color-muted); font-family: monospace; }

  .exam-cell {
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-muted);
    font-size: 0.78rem;
  }

  .type-pill {
    padding: 0.2rem 0.55rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: capitalize;
    color: var(--color-text);
  }

  /* ── Badges ──────────────────────────────────────────── */
  .badge {
    display: inline-flex;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .sev-low      { background: rgba(22,163,74,0.1);   color: #16a34a; }
  .sev-medium   { background: rgba(245,158,11,0.1);  color: #d97706; }
  .sev-high     { background: rgba(249,115,22,0.12); color: #ea580c; }
  .sev-critical { background: rgba(220,38,38,0.12);  color: #dc2626; }

  .act-warning  { background: rgba(245,158,11,0.1);  color: #d97706; }
  .act-alert    { background: rgba(249,115,22,0.12); color: #ea580c; }
  .act-paused   { background: rgba(220,38,38,0.12);  color: #dc2626; }
  .act-auto     { background: rgba(139,92,246,0.1);  color: #7c3aed; }

  .time-cell {
    font-size: 0.75rem;
    color: var(--color-muted);
    font-family: monospace;
  }

  /* ── Empty ───────────────────────────────────────────── */
  .empty-row {
    text-align: center;
    padding: 3rem 1rem !important;
    color: var(--color-muted);
    font-size: 0.875rem;
  }

  /* ── Dark mode ───────────────────────────────────────── */
  :global(.dark) .stat-icon.red    { background: rgba(220,38,38,0.15); }
  :global(.dark) .stat-icon.amber  { background: rgba(245,158,11,0.15); }
  :global(.dark) .stat-icon.orange { background: rgba(249,115,22,0.15); }
</style>