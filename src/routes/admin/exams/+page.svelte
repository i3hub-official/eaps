<!-- src/routes/admin/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import {
    ClipboardList, Plus, Search, Filter, X, CheckCircle, AlertCircle,
    Calendar, PlayCircle, PauseCircle, FileText, ChevronRight, Loader2
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let search = $state(data.search ?? '');
  let status = $state(data.statusFilter ?? 'all');
  let navLoading = $state<string | null>(null);

  function applyFilters() {
    const params = new URLSearchParams();
    if (search?.trim()) params.set('q', search.trim());
    if (status !== 'all') params.set('status', status);
    const qs = params.toString();
    goto(`/admin/exams${qs ? '?' + qs : ''}`);
  }

  function clearFilters() {
    search = '';
    status = 'all';
    goto('/admin/exams');
  }

  function statusIcon(s: string) {
    return s === 'active' ? PlayCircle
      : s === 'completed' ? CheckCircle
      : s === 'scheduled' ? Calendar
      : s === 'cancelled' ? PauseCircle
      : FileText;
  }

  function statusColor(s: string) {
    return s === 'active'    ? 'es-active'
      : s === 'completed' ? 'es-completed'
      : s === 'scheduled' ? 'es-scheduled'
      : s === 'cancelled' ? 'es-cancelled'
      : 'es-draft';
  }

  function formatDate(d: string | Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function handleNav(href: string) {
    if (navLoading) return;
    navLoading = href;
    await goto(href);
    navLoading = null;
  }

  const STATUSES = [
    { key: 'all',       label: 'All',       icon: Filter,       cls: 'sb-all' },
    { key: 'draft',     label: 'Draft',     icon: FileText,     cls: 'sb-draft' },
    { key: 'scheduled', label: 'Scheduled', icon: Calendar,     cls: 'sb-scheduled' },
    { key: 'active',    label: 'Active',    icon: PlayCircle,   cls: 'sb-active' },
    { key: 'completed', label: 'Completed', icon: CheckCircle,  cls: 'sb-completed' },
    { key: 'cancelled', label: 'Cancelled', icon: PauseCircle,  cls: 'sb-cancelled' },
  ] as const;
</script>

<svelte:head><title>Exams — MOUAU eTest Admin</title></svelte:head>

<div class="exams-page">
  <div class="page-header">
    <div class="page-title">
      <ClipboardList size={22} class="title-icon" />
      <div>
        <h1>Exams</h1>
        <p class="subtitle">{data.total ?? 0} exam{data.total !== 1 ? 's' : ''} total</p>
      </div>
    </div>
    <button class="btn-primary" onclick={() => handleNav('/admin/exams/create')}>
      {#if navLoading === '/admin/exams/create'}
        <Loader2 size={15} class="spin" />
      {:else}
        <Plus size={15} />
      {/if}
      New Exam
    </button>
  </div>

  <!-- Status summary -->
  <div class="status-bar">
    {#each STATUSES as item}
      <button
        class="sb-chip {item.cls}"
        class:sb-selected={status === item.key}
        onclick={() => { status = item.key; applyFilters(); }}
      >
        <item.icon size={13} />
        {item.label}
        <span class="sb-count">{data.stats?.[item.key] ?? 0}</span>
      </button>
    {/each}
  </div>

  <!-- Search + filter bar -->
  <div class="filter-bar">
    <div class="search-wrap">
      <Search size={14} />
      <input
        class="search-input"
        placeholder="Search exams, course codes…"
        bind:value={search}
        onkeydown={(e) => e.key === 'Enter' && applyFilters()}
      />
      {#if search}
        <button class="search-clear" onclick={() => { search = ''; applyFilters(); }}><X size={14} /></button>
      {/if}
    </div>
    <div class="filter-actions">
      <button class="btn-ghost" onclick={applyFilters}><Filter size={14} /> Apply</button>
      {#if search || status !== 'all'}
        <button class="btn-ghost btn-ghost-subtle" onclick={clearFilters}><X size={14} /> Clear</button>
      {/if}
    </div>
  </div>

  <!-- Table -->
  <div class="table-card">
    {#if data.exams.length === 0}
      <div class="empty-state">
        <ClipboardList size={48} class="empty-icon" />
        <p class="empty-title">No exams found</p>
        <p class="empty-desc">
          {search || status !== 'all'
            ? 'Try adjusting your search or filters.'
            : 'Get started by creating your first exam.'}
        </p>
        {#if !search && status === 'all'}
          <button class="btn-primary btn-sm" onclick={() => handleNav('/admin/exams/create')}>
            <Plus size={14} /> Create Exam
          </button>
        {/if}
      </div>
    {:else}
      <div class="table-wrap">
        <table class="exams-table">
          <thead>
            <tr>
              <th>Exam</th>
              <th>Course</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Questions</th>
              <th>Sessions</th>
              <th>Scheduled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.exams as exam (exam.id)}
              {@const Icon = statusIcon(exam.status)}
              <tr
                onclick={() => handleNav(`/admin/exams/${exam.id}`)}
                class="exam-row"
                role="link"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && handleNav(`/admin/exams/${exam.id}`)}
              >
                <td>
                  <div class="exam-title">{exam.title}</div>
                  <div class="exam-meta">
                    <span class="exam-session">{exam.session}</span>
                    {#if exam.levels?.length}
                      <span class="sep">·</span>
                      <span>Lvl {exam.levels.join(', ')}</span>
                    {/if}
                  </div>
                </td>
                <td>
                  <div class="course-code">{exam.course?.code ?? '—'}</div>
                  <div class="course-title">{exam.course?.title ?? ''}</div>
                </td>
                <td>
                  <span class="exam-status {statusColor(exam.status)}">
                    <Icon size={11} />
                    {exam.status}
                  </span>
                </td>
                <td class="td-muted">{exam.durationMinutes ?? '—'}m</td>
                <td class="td-muted">{exam._count?.questions ?? 0}</td>
                <td class="td-muted">{exam._count?.examSessions ?? 0}</td>
                <td class="td-muted">{formatDate(exam.scheduledStart)}</td>
                <td>
                  <ChevronRight size={14} class="row-chevron" />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if data.total > data.limit}
        <div class="pagination">
          <button
            class="page-btn"
            disabled={data.page <= 1 || !!navLoading}
            onclick={() => {
              const params = new URLSearchParams();
              params.set('page', String(data.page - 1));
              if (search) params.set('q', search);
              if (status !== 'all') params.set('status', status);
              handleNav(`/admin/exams?${params}`);
            }}
          >← Prev</button>
          <span class="page-info">Page {data.page} of {Math.ceil(data.total / data.limit)}</span>
          <button
            class="page-btn"
            disabled={data.page * data.limit >= data.total || !!navLoading}
            onclick={() => {
              const params = new URLSearchParams();
              params.set('page', String(data.page + 1));
              if (search) params.set('q', search);
              if (status !== 'all') params.set('status', status);
              handleNav(`/admin/exams?${params}`);
            }}
          >Next →</button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .exams-page { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Page Header ─────────────────────────────────────────────── */
  .page-header {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  .page-title { display: flex; align-items: center; gap: 0.875rem; }
  .page-title :global(.title-icon) { color: #3b82f6; flex-shrink: 0; }
  .page-title h1 { font-size: 1.35rem; font-weight: 700; color: var(--color-text); line-height: 1.2; margin: 0; }
  .subtitle { font-size: 0.8rem; color: var(--color-muted); margin-top: 0.15rem; }

  .btn-primary {
    display: inline-flex; align-items: center; gap: .5rem;
    padding: .55rem 1.1rem; background: #3b82f6; color: white;
    border: none; border-radius: .5rem; font-size: .82rem; font-weight: 600;
    cursor: pointer; font-family: inherit; text-decoration: none;
    transition: background .15s, transform .1s; white-space: nowrap;
  }
  .btn-primary:hover:not(:disabled) { background: #2563eb; }
  .btn-primary:active:not(:disabled) { transform: translateY(1px); }
  .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
  .btn-sm { padding: .4rem .875rem; font-size: .8rem; }

  /* ── Status Bar ──────────────────────────────────────────────── */
  .status-bar { display: flex; gap: .5rem; flex-wrap: wrap; }
  .sb-chip {
    display: flex; align-items: center; gap: .375rem;
    padding: .4rem .875rem; border-radius: 2rem;
    border: 1.5px solid transparent; font-size: .75rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all .15s;
    background: var(--color-surface); color: var(--color-muted);
  }
  .sb-count { font-size: .65rem; background: rgba(0,0,0,.08); padding: .1rem .4rem; border-radius: 2rem; font-weight: 700; }
  .sb-chip:hover { color: var(--color-text); }

  .sb-all.sb-selected, .sb-all:hover       { border-color: var(--color-text); color: var(--color-text); background: var(--color-bg); }
  .sb-active.sb-selected, .sb-active:hover    { border-color: #22c55e; color: #16a34a; background: rgba(22,163,74,.08); }
  .sb-completed.sb-selected, .sb-completed:hover { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,.08); }
  .sb-scheduled.sb-selected, .sb-scheduled:hover { border-color: #8b5cf6; color: #8b5cf6; background: rgba(139,92,246,.08); }
  .sb-cancelled.sb-selected, .sb-cancelled:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,.08); }
  .sb-draft.sb-selected, .sb-draft:hover { border-color: var(--color-border); color: var(--color-text); background: var(--color-bg); }
  .sb-selected .sb-count { background: currentColor; color: white; opacity: .9; }

  /* ── Filter Bar ──────────────────────────────────────────────── */
  .filter-bar { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
  .filter-actions { display: flex; gap: .5rem; }

  .search-wrap {
    flex: 1; display: flex; align-items: center; gap: .5rem; max-width: 400px;
    padding: .5rem .875rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: .625rem;
    transition: border-color .15s, box-shadow .15s;
  }
  .search-wrap:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
  .search-wrap :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .search-input { background: none; border: none; outline: none; font-size: .82rem; color: var(--color-text); width: 100%; font-family: inherit; }
  .search-input::placeholder { color: var(--color-muted); opacity: .6; }
  .search-clear {
    background: none; border: none; cursor: pointer; color: var(--color-muted);
    padding: .15rem; border-radius: .25rem; display: flex; align-items: center;
    transition: color .15s;
  }
  .search-clear:hover { color: var(--color-text); }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: .5rem;
    padding: .5rem .875rem; background: transparent;
    border: 1px solid var(--color-border); color: var(--color-text);
    border-radius: .5rem; font-size: .8rem; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: all .15s; white-space: nowrap;
  }
  .btn-ghost:hover { background: var(--color-bg); border-color: var(--color-text); }
  .btn-ghost-subtle { color: var(--color-muted); border-color: transparent; }
  .btn-ghost-subtle:hover { color: var(--color-text); background: var(--color-bg); border-color: var(--color-border); }

  /* ── Table ───────────────────────────────────────────────────── */
  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: .875rem;
    overflow: hidden;
  }
  .table-wrap { overflow-x: auto; }
  .exams-table { width: 100%; border-collapse: collapse; }
  .exams-table th {
    padding: .75rem 1rem; background: var(--color-bg);
    font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
    color: var(--color-muted); text-align: left; border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  .exams-table td { padding: .875rem 1rem; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
  .exams-table tbody tr { transition: background .1s; }
  .exams-table tbody tr:hover td { background: var(--color-bg); }
  .exams-table tbody tr:last-child td { border-bottom: none; }

  .exam-row { cursor: pointer; }
  .exam-row:focus { outline: none; background: var(--color-bg); box-shadow: inset 0 0 0 2px rgba(59,130,246,.2); }

  .exam-title { font-weight: 600; font-size: .85rem; color: var(--color-text); }
  .exam-meta { font-size: .7rem; color: var(--color-muted); margin-top: .2rem; display: flex; gap: .375rem; align-items: center; }
  .exam-session { font-weight: 500; }
  .sep { opacity: .5; }

  .course-code { font-weight: 700; font-size: .8rem; color: var(--color-text); font-family: ui-monospace, SFMono-Regular, monospace; }
  .course-title { font-size: .7rem; color: var(--color-muted); }

  .td-muted { color: var(--color-muted); font-size: .8rem; white-space: nowrap; }

  .exam-status {
    display: inline-flex; align-items: center; gap: .3rem;
    font-size: .68rem; font-weight: 700; padding: .25rem .625rem;
    border-radius: 2rem; text-transform: capitalize; white-space: nowrap;
  }
  .es-active    { background: rgba(22,163,74,.12); color: #16a34a; }
  .es-completed { background: rgba(59,130,246,.12); color: #3b82f6; }
  .es-scheduled { background: rgba(139,92,246,.12); color: #8b5cf6; }
  .es-cancelled { background: rgba(239,68,68,.12);  color: #ef4444; }
  .es-draft     { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }

  .row-chevron { color: var(--color-muted); transition: transform .15s, color .15s; }
  .exam-row:hover .row-chevron { color: #3b82f6; transform: translateX(2px); }

  /* ── Pagination ──────────────────────────────────────────────── */
  .pagination {
    display: flex; align-items: center; justify-content: center; gap: 1rem;
    padding: 1rem; border-top: 1px solid var(--color-border);
  }
  .page-btn {
    padding: .4rem .875rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: .375rem;
    font-size: .78rem; cursor: pointer; font-family: inherit; color: var(--color-text);
    font-weight: 500; transition: all .15s;
  }
  .page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,.05); }
  .page-btn:disabled { opacity: .4; cursor: not-allowed; }
  .page-info { font-size: .78rem; color: var(--color-muted); font-weight: 500; }

  /* ── Empty State ─────────────────────────────────────────────── */
  .empty-state { padding: 4rem 1.5rem; display: flex; flex-direction: column; align-items: center; gap: .75rem; text-align: center; }
  .empty-state :global(.empty-icon) { color: var(--color-border); }
  .empty-title { font-size: .95rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .empty-desc { font-size: .8rem; color: var(--color-muted); margin: 0; }

  /* ── Spin ────────────────────────────────────────────────────── */
  :global(.spin) { animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ──────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .page-header { flex-direction: column; align-items: stretch; }
    .page-title { justify-content: center; }
    .status-bar { justify-content: center; }
    .filter-bar { flex-direction: column; align-items: stretch; }
    .search-wrap { max-width: none; }
    .filter-actions { justify-content: stretch; }
    .filter-actions button { flex: 1; justify-content: center; }
    .exams-table th:nth-child(n+5), .exams-table td:nth-child(n+5) { display: none; }
    .exams-table th:nth-child(4), .exams-table td:nth-child(4) { display: none; }
  }
</style>