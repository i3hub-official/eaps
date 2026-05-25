<!-- src/routes/(lecturer)/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    BookOpen, Search, Filter, Plus, Clock, Users,
    CheckCircle, AlertCircle, Calendar, BarChart3,
    FileText, Eye, TrendingUp, ArrowUpRight,
    ChevronRight, RefreshCw, Download, Zap,
    PlayCircle, Archive, XCircle, Edit3
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exams } = data;

  let search = $state('');
  let filterStatus = $state('all');

  const filtered = $derived(exams.filter(e => {
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.course.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStatus;
  }));

  // KPI derived counts
  const totalExams     = $derived(exams.length);
  const activeExams    = $derived(exams.filter(e => e.status === 'active').length);
  const scheduledExams = $derived(exams.filter(e => e.status === 'scheduled').length);
  const completedExams = $derived(exams.filter(e => e.status === 'completed').length);
  const draftExams     = $derived(exams.filter(e => e.status === 'draft').length);

  const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
    draft:     { label: 'Draft',     color: '#64748b', icon: Edit3 },
    scheduled: { label: 'Scheduled', color: '#3b82f6', icon: Calendar },
    active:    { label: 'Live',      color: '#22c55e', icon: PlayCircle },
    completed: { label: 'Done',      color: '#a78bfa', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: '#ef4444', icon: XCircle },
  };

  function fmtDate(d: Date | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }

  function fmtTimeShort(d: Date | null | undefined) {
    if (!d) return '';
    const now = Date.now();
    const diff = now - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const FILTER_TABS = ['all', 'active', 'scheduled', 'draft', 'completed'];
</script>

<svelte:head><title>My Exams — MOUAU eTest</title></svelte:head>

<div class="dashboard">

  <!-- ══ PAGE HEADER ══════════════════════════════════════════ -->
  <header class="dash-header">
    <div class="dash-header-left">
      <div class="dash-eyebrow">
        <span class="dash-dot pulse"></span>
        Lecturer Portal
      </div>
      <h1 class="dash-title">Exam Manager</h1>
      <p class="dash-subtitle">MOUAU eTest · Manage and monitor your exams</p>
    </div>
    <div class="dash-header-right">
      <div class="header-actions">
        <button class="btn-outline" onclick={() => window.location.reload()}>
          <RefreshCw size={14} />
          Refresh
        </button>
        <a href="/lecturer/exams/new" class="btn-primary">
          <Plus size={14} />
          New Exam
        </a>
      </div>
    </div>
  </header>

  <!-- ══ KPI STRIP ════════════════════════════════════════════ -->
  <section class="kpi-strip">
    <div class="kpi-card kpi-slate">
      <div class="kpi-icon"><BookOpen size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{totalExams}</span>
        <span class="kpi-label">Total Exams</span>
      </div>
      <div class="kpi-trend neutral">all time</div>
    </div>

    <div class="kpi-card kpi-amber">
      <div class="kpi-icon"><Zap size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{activeExams}</span>
        <span class="kpi-label">Active Now</span>
      </div>
      {#if activeExams > 0}
        <div class="kpi-live-badge">LIVE</div>
      {:else}
        <div class="kpi-trend neutral">none running</div>
      {/if}
    </div>

    <div class="kpi-card kpi-blue">
      <div class="kpi-icon"><Calendar size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{scheduledExams}</span>
        <span class="kpi-label">Scheduled</span>
      </div>
      <div class="kpi-trend up"><ArrowUpRight size={12} /> upcoming</div>
    </div>

    <div class="kpi-card kpi-violet">
      <div class="kpi-icon"><CheckCircle size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{completedExams}</span>
        <span class="kpi-label">Completed</span>
      </div>
      <div class="kpi-trend neutral">finished</div>
    </div>

    <div class="kpi-card kpi-green">
      <div class="kpi-icon"><Edit3 size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{draftExams}</span>
        <span class="kpi-label">Drafts</span>
      </div>
      <div class="kpi-trend neutral">in progress</div>
    </div>
  </section>

  <!-- ══ MAIN PANEL ═══════════════════════════════════════════ -->
  <section class="panel">
    <div class="panel-head">
      <div class="panel-title-wrap">
        <FileText size={15} />
        <h2>All Exams</h2>
      </div>
      <span class="panel-count">{filtered.length} of {totalExams}</span>
    </div>

    <!-- Filters bar -->
    <div class="filters-bar">
      <div class="search-wrap">
        <Search size={14} class="search-icon" />
        <input
          class="search-input"
          type="search"
          placeholder="Search title or course code…"
          bind:value={search}
        />
      </div>
      <div class="tabs">
        {#each FILTER_TABS as s}
          <button
            class="tab"
            class:active={filterStatus === s}
            onclick={() => { filterStatus = s; }}
            type="button"
          >
            {s === 'all' ? 'All' : (STATUS_META[s]?.label ?? s)}
            {#if s === 'active' && activeExams > 0}
              <span class="tab-badge live">{activeExams}</span>
            {:else if s !== 'all'}
              {@const count = exams.filter(e => e.status === s).length}
              {#if count > 0}
                <span class="tab-badge">{count}</span>
              {/if}
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Table -->
    {#if filtered.length === 0}
      <div class="empty-state">
        <BookOpen size={32} />
        <p>No exams found{search ? ` for "${search}"` : ''}.</p>
        <a href="/lecturer/exams/new" class="btn-primary" style="font-size:0.8rem; padding: 0.5rem 1rem;">
          <Plus size={13} /> Create your first exam
        </a>
      </div>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Title</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Scheduled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as exam, i}
              {@const meta = STATUS_META[exam.status] ?? STATUS_META.draft}
              <tr style="animation-delay:{i * 30}ms">
                <td>
                  <span class="course-badge">{exam.course.code}</span>
                </td>
                <td class="title-cell">
                  <span class="exam-title">{exam.title}</span>
                </td>
                <td>
                  <span class="status-pill" style="color:{meta.color}; background:{meta.color}18; border-color:{meta.color}30;">
                    <svelte:component this={meta.icon} size={10} />
                    {meta.label}
                    {#if exam.status === 'active'}
                      <span class="live-dot"></span>
                    {/if}
                  </span>
                </td>
                <td>
                  <div class="duration-wrap">
                    <Clock size={12} color="var(--color-muted)" />
                    <span>{exam.durationMinutes}m</span>
                  </div>
                </td>
                <td class="mono">{fmtDate(exam.scheduledStart)}</td>
                <td>
                  <div class="actions-cell">
                    <a href="/lecturer/exams/{exam.id}/questions" class="act" title="Questions">
                      <FileText size={12} /> Questions
                    </a>
                    <a href="/lecturer/exams/{exam.id}/results" class="act" title="Results">
                      <BarChart3 size={12} /> Results
                    </a>
                    <a href="/lecturer/exams/{exam.id}/similarity" class="act act-ghost" title="Similarity">
                      <Eye size={12} />
                    </a>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

</div>

<style>
  /* ── Base ─────────────────────────────────────────────── */
  .dashboard {
    padding: 2rem 2.5rem 3rem;
    max-width: 1400px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 2rem;
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  /* ── Header ──────────────────────────────────────────── */
  .dash-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-wrap: wrap; gap: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .dash-eyebrow {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #3b82f6; margin-bottom: 0.3rem;
  }
  .dash-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #3b82f6;
  }
  .dash-dot.pulse {
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 0 0 rgba(59,130,246,0.5);
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(59,130,246,.5); }
    70%  { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
    100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
  }
  .dash-title {
    font-size: 2.25rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.2rem; line-height: 1;
  }
  .dash-subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0; }
  .dash-header-right { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .header-actions { display: flex; gap: 0.75rem; }

  .btn-outline {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent; border: 1px solid var(--color-border);
    border-radius: 0.5rem; font-size: 0.8rem; font-weight: 500;
    color: var(--color-text); cursor: pointer; transition: all 0.15s;
    text-decoration: none;
  }
  .btn-outline:hover { border-color: #3b82f6; color: #3b82f6; }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #3b82f6; border: 1px solid #3b82f6;
    border-radius: 0.5rem; font-size: 0.8rem; font-weight: 600;
    color: white; cursor: pointer; transition: all 0.15s;
    text-decoration: none;
  }
  .btn-primary:hover { background: #2563eb; border-color: #2563eb; }

  /* ── KPI Strip ───────────────────────────────────────── */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }
  .kpi-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    position: relative; overflow: hidden;
    transition: transform 0.15s, box-shadow 0.15s;
    animation: fadeUp 0.4s ease both;
  }
  .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .kpi-card::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    border-radius: 1rem 1rem 0 0;
  }
  .kpi-blue::before   { background: #3b82f6; }
  .kpi-green::before  { background: #22c55e; }
  .kpi-violet::before { background: #a78bfa; }
  .kpi-amber::before  { background: #f59e0b; }
  .kpi-slate::before  { background: #64748b; }

  .kpi-icon {
    width: 36px; height: 36px; border-radius: 0.6rem;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg);
  }
  .kpi-blue   .kpi-icon { color: #3b82f6; }
  .kpi-green  .kpi-icon { color: #22c55e; }
  .kpi-violet .kpi-icon { color: #a78bfa; }
  .kpi-amber  .kpi-icon { color: #f59e0b; }
  .kpi-slate  .kpi-icon { color: #64748b; }

  .kpi-body { display: flex; flex-direction: column; gap: 0.1rem; }
  .kpi-value {
    font-size: 1.9rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); line-height: 1;
  }
  .kpi-label {
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-muted);
  }
  .kpi-trend {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.68rem; font-weight: 700; color: var(--color-muted);
  }
  .kpi-trend.up { color: #22c55e; }
  .kpi-live-badge {
    font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em;
    color: #f59e0b; background: rgba(245,158,11,0.12);
    border: 1px solid rgba(245,158,11,0.25);
    padding: 0.1rem 0.4rem; border-radius: 999px;
    width: fit-content;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0.4; } }

  /* ── Panel ───────────────────────────────────────────── */
  .panel {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; overflow: hidden;
    animation: fadeUp 0.45s ease both;
  }
  .panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);
  }
  .panel-title-wrap {
    display: flex; align-items: center; gap: 0.5rem; color: var(--color-muted);
  }
  .panel-title-wrap h2 {
    font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-text); margin: 0;
  }
  .panel-count {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.15rem 0.5rem; border-radius: 999px;
  }

  /* ── Filters Bar ─────────────────────────────────────── */
  .filters-bar {
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .search-wrap {
    position: relative; display: flex; align-items: center;
  }
  .search-wrap :global(.search-icon) {
    position: absolute; left: 0.75rem; color: var(--color-muted); pointer-events: none;
  }
  .search-input {
    padding: 0.45rem 0.875rem 0.45rem 2.25rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem; background: var(--color-surface); color: var(--color-text);
    font-size: 0.82rem; outline: none; width: 240px;
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: #3b82f6; }

  .tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .tab {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.35rem 0.75rem; border: 1px solid var(--color-border);
    border-radius: 999px; font-size: 0.75rem; font-weight: 500;
    color: var(--color-muted); background: none; cursor: pointer;
    transition: all 0.15s;
  }
  .tab:hover { border-color: #3b82f6; color: #3b82f6; }
  .tab.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }
  .tab-badge {
    font-size: 0.62rem; font-weight: 800;
    background: rgba(255,255,255,0.25); padding: 0 0.3rem;
    border-radius: 999px; min-width: 16px; text-align: center;
  }
  .tab:not(.active) .tab-badge { background: var(--color-border); color: var(--color-muted); }
  .tab-badge.live { background: rgba(245,158,11,0.2); color: #f59e0b; }
  .tab.active .tab-badge.live { background: rgba(255,255,255,0.3); color: white; }

  /* ── Table ───────────────────────────────────────────── */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  thead tr { background: var(--color-bg); }
  th {
    padding: 0.75rem 1rem; text-align: left;
    font-size: 0.68rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid var(--color-border);
  }
  tbody tr {
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
    animation: fadeUp 0.3s ease both;
  }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: var(--color-bg); }
  td { padding: 0.875rem 1rem; vertical-align: middle; }

  .course-badge {
    font-size: 0.72rem; font-weight: 700;
    padding: 0.2rem 0.55rem;
    background: rgba(59,130,246,0.1); color: #3b82f6;
    border-radius: 999px; white-space: nowrap;
  }
  .exam-title { font-weight: 600; color: var(--color-text); }

  .status-pill {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.6rem;
    border-radius: 999px; border: 1px solid; white-space: nowrap;
  }
  .live-dot {
    width: 5px; height: 5px; border-radius: 50%; background: currentColor;
    animation: blink 1.5s step-end infinite;
  }

  .duration-wrap {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.82rem; color: var(--color-text);
  }
  .mono {
    font-variant-numeric: tabular-nums; font-size: 0.8rem;
    color: var(--color-muted);
  }

  .actions-cell { display: flex; gap: 0.4rem; align-items: center; }
  .act {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.3rem 0.65rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.4rem; font-size: 0.73rem; font-weight: 500;
    text-decoration: none; color: var(--color-text);
    transition: all 0.12s; white-space: nowrap;
  }
  .act:hover { border-color: #3b82f6; color: #3b82f6; }
  .act-ghost { padding: 0.3rem 0.5rem; }

  /* ── Empty State ─────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.875rem;
    padding: 4rem 1.5rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p { font-size: 0.875rem; margin: 0; }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 768px) {
    .dashboard { padding: 1.25rem 1rem; gap: 1.25rem; }
    .dash-title { font-size: 1.75rem; }
    .kpi-strip  { grid-template-columns: repeat(2, 1fr); }
    .search-input { width: 100%; }
    .filters-bar { flex-direction: column; align-items: flex-start; }
  }
</style>