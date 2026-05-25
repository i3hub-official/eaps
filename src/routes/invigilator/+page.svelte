<!-- src/routes/(invigilator)/invigilator/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ShieldCheck, Clock, Calendar, Activity,
    ArrowUpRight, PlayCircle, CheckCircle,
    AlertCircle, Eye, RefreshCw, Zap,
    Monitor, Users, BookOpen, ChevronRight
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  function fmtDate(d: Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function fmtTimeShort(d: Date | null) {
    if (!d) return '';
    const now = Date.now();
    const diff = new Date(d).getTime() - now;
    if (diff < 0) return 'started';
    const m = Math.floor(diff / 60000);
    if (m < 60) return `in ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `in ${h}h`;
    return `in ${Math.floor(h / 24)}d`;
  }

  // KPI counts
  const totalAssigned = $derived(data.exams.length);
  const activeExams   = $derived(data.exams.filter(e => e.status === 'active').length);
  const upcoming      = $derived(data.exams.filter(e => e.status === 'scheduled').length);
  const completed     = $derived(data.exams.filter(e => e.status === 'completed').length);

  const STATUS_META: Record<string, { label: string; color: string }> = {
    draft:     { label: 'Draft',     color: '#64748b' },
    scheduled: { label: 'Scheduled', color: '#3b82f6' },
    active:    { label: 'Live',      color: '#22c55e' },
    completed: { label: 'Done',      color: '#a78bfa' },
    cancelled: { label: 'Cancelled', color: '#ef4444' },
  };
</script>

<svelte:head><title>Invigilator — MOUAU eTest</title></svelte:head>

<div class="dashboard">

  <!-- ══ PAGE HEADER ══════════════════════════════════════════ -->
  <header class="dash-header">
    <div class="dash-header-left">
      <div class="dash-eyebrow">
        <span class="dash-dot pulse"></span>
        Invigilator Portal
      </div>
      <h1 class="dash-title">Exam Monitor</h1>
      <p class="dash-subtitle">MOUAU eTest · Supervise and manage your assigned exams</p>
    </div>
    <div class="dash-header-right">
      <div class="header-actions">
        <button class="btn-outline" onclick={() => window.location.reload()}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    </div>
  </header>

  <!-- ══ KPI STRIP ════════════════════════════════════════════ -->
  <section class="kpi-strip">
    <div class="kpi-card kpi-slate">
      <div class="kpi-icon"><ShieldCheck size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{totalAssigned}</span>
        <span class="kpi-label">Assigned</span>
      </div>
      <div class="kpi-trend neutral">total exams</div>
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
        <span class="kpi-value">{upcoming}</span>
        <span class="kpi-label">Upcoming</span>
      </div>
      <div class="kpi-trend up"><ArrowUpRight size={12} /> scheduled</div>
    </div>

    <div class="kpi-card kpi-violet">
      <div class="kpi-icon"><CheckCircle size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{completed}</span>
        <span class="kpi-label">Completed</span>
      </div>
      <div class="kpi-trend neutral">done</div>
    </div>
  </section>

  <!-- ══ CONTENT GRID ══════════════════════════════════════════ -->
  <div class="content-grid">

    <!-- Exams list panel -->
    <section class="panel panel-main">
      <div class="panel-head">
        <div class="panel-title-wrap">
          <Activity size={15} />
          <h2>Assigned Exams</h2>
        </div>
        <span class="panel-count">{totalAssigned} exams</span>
      </div>

      {#if data.exams.length === 0}
        <div class="empty-state">
          <ShieldCheck size={32} />
          <p>No exams assigned to you yet.</p>
          <span class="empty-sub">Check back later or contact your administrator.</span>
        </div>
      {:else}
        <ul class="exam-list">
          {#each data.exams as exam, i}
            {@const meta = STATUS_META[exam.status ?? 'draft'] ?? STATUS_META.draft}
            <li class="exam-item" style="animation-delay:{i * 40}ms">
              <div class="exam-left">
                <div class="exam-icon" class:live={exam.status === 'active'}>
                  {#if exam.status === 'active'}
                    <PlayCircle size={16} />
                  {:else if exam.status === 'scheduled'}
                    <Calendar size={16} />
                  {:else if exam.status === 'completed'}
                    <CheckCircle size={16} />
                  {:else}
                    <BookOpen size={16} />
                  {/if}
                </div>

                <div class="exam-info">
                  <div class="exam-top">
                    <span class="course-badge">{exam.course.code}</span>
                    <span class="status-pill" style="color:{meta.color}; background:{meta.color}18; border-color:{meta.color}30;">
                      {meta.label}
                      {#if exam.status === 'active'}
                        <span class="live-dot"></span>
                      {/if}
                    </span>
                  </div>
                  <span class="exam-title">{exam.title}</span>
                  <div class="exam-meta">
                    <span class="meta-item">
                      <Clock size={11} />
                      {fmtDate(exam.scheduledStart)}
                    </span>
                    {#if exam.status === 'scheduled' && exam.scheduledStart}
                      <span class="countdown">{fmtTimeShort(exam.scheduledStart)}</span>
                    {/if}
                  </div>
                </div>
              </div>

              <a
                href="/invigilator/{exam.id}"
                class="monitor-btn"
                class:monitor-live={exam.status === 'active'}
              >
                {#if exam.status === 'active'}
                  <Monitor size={14} />
                  Monitor Live
                {:else}
                  <Eye size={14} />
                  View
                {/if}
                <ChevronRight size={13} />
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Right sidebar: quick info panels -->
    <div class="right-col">

      <!-- Active exam highlight -->
      {#if activeExams > 0}
        <section class="panel panel-live">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <Zap size={15} color="#f59e0b" />
              <h2>Live Right Now</h2>
            </div>
            <span class="live-badge">● LIVE</span>
          </div>
          <div class="live-body">
            {#each data.exams.filter(e => e.status === 'active') as exam}
              <div class="live-exam">
                <span class="live-course">{exam.course.code}</span>
                <span class="live-title">{exam.title}</span>
                <a href="/invigilator/{exam.id}" class="monitor-btn monitor-live" style="margin-top:0.5rem; width:100%; justify-content:center;">
                  <Monitor size={14} /> Open Monitor <ChevronRight size={13} />
                </a>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Upcoming exams -->
      {#if upcoming > 0}
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <Calendar size={15} />
              <h2>Upcoming</h2>
            </div>
            <span class="panel-count">{upcoming}</span>
          </div>
          <ul class="mini-list">
            {#each data.exams.filter(e => e.status === 'scheduled') as exam}
              <li class="mini-item">
                <div class="mini-dot blue"></div>
                <div class="mini-info">
                  <span class="mini-course">{exam.course.code}</span>
                  <span class="mini-title">{exam.title}</span>
                  <span class="mini-time">{fmtDate(exam.scheduledStart)}</span>
                </div>
                <span class="mini-countdown">{fmtTimeShort(exam.scheduledStart)}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      <!-- Status summary -->
      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <ShieldCheck size={15} />
            <h2>Your Summary</h2>
          </div>
        </div>
        <div class="summary-rows">
          {#each [
            { label: 'Total Assigned', value: totalAssigned, color: '#64748b' },
            { label: 'Active Now',     value: activeExams,   color: '#f59e0b' },
            { label: 'Upcoming',       value: upcoming,      color: '#3b82f6' },
            { label: 'Completed',      value: completed,     color: '#a78bfa' },
          ] as row}
            <div class="summary-row">
              <div class="summary-left">
                <span class="summary-dot" style="background:{row.color}"></span>
                <span class="summary-label">{row.label}</span>
              </div>
              <div class="summary-bar-wrap">
                <div
                  class="summary-bar"
                  style="width:{totalAssigned > 0 ? Math.round((row.value / totalAssigned) * 100) : 0}%; background:{row.color};"
                ></div>
              </div>
              <span class="summary-val" style="color:{row.color}">{row.value}</span>
            </div>
          {/each}
        </div>
      </section>

    </div>
  </div>

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
    text-transform: uppercase; color: #a78bfa; margin-bottom: 0.3rem;
  }
  .dash-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #a78bfa;
  }
  .dash-dot.pulse {
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 0 0 rgba(167,139,250,0.5);
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(167,139,250,.5); }
    70%  { box-shadow: 0 0 0 6px rgba(167,139,250,0); }
    100% { box-shadow: 0 0 0 0 rgba(167,139,250,0); }
  }
  .dash-title {
    font-size: 2.25rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.2rem; line-height: 1;
  }
  .dash-subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0; }
  .dash-header-right { display: flex; align-items: center; }
  .header-actions { display: flex; gap: 0.75rem; }

  .btn-outline {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent; border: 1px solid var(--color-border);
    border-radius: 0.5rem; font-size: 0.8rem; font-weight: 500;
    color: var(--color-text); cursor: pointer; transition: all 0.15s;
    text-decoration: none;
  }
  .btn-outline:hover { border-color: #a78bfa; color: #a78bfa; }

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
  .kpi-violet::before { background: #a78bfa; }
  .kpi-amber::before  { background: #f59e0b; }
  .kpi-slate::before  { background: #64748b; }

  .kpi-icon {
    width: 36px; height: 36px; border-radius: 0.6rem;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg);
  }
  .kpi-blue   .kpi-icon { color: #3b82f6; }
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
    padding: 0.1rem 0.4rem; border-radius: 999px; width: fit-content;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0.4; } }

  /* ── Content Grid ────────────────────────────────────── */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .content-grid { grid-template-columns: 1fr; }
  }

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
  .live-badge {
    font-size: 0.62rem; font-weight: 800; letter-spacing: 0.08em;
    color: #f59e0b; animation: blink 1.5s step-end infinite;
  }

  /* ── Exam List ───────────────────────────────────────── */
  .exam-list { list-style: none; padding: 0; margin: 0; }
  .exam-item {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
    animation: fadeUp 0.35s ease both;
  }
  .exam-item:last-child { border-bottom: none; }
  .exam-item:hover { background: var(--color-bg); }

  .exam-left { display: flex; align-items: flex-start; gap: 0.875rem; flex: 1; min-width: 0; }

  .exam-icon {
    width: 36px; height: 36px; border-radius: 0.6rem;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg); border: 1px solid var(--color-border);
    flex-shrink: 0; color: var(--color-muted);
  }
  .exam-icon.live {
    background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.3);
    color: #22c55e;
  }

  .exam-info { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
  .exam-top  { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

  .course-badge {
    font-size: 0.68rem; font-weight: 700;
    padding: 0.15rem 0.5rem;
    background: rgba(167,139,250,0.1); color: #a78bfa;
    border-radius: 999px; white-space: nowrap;
  }
  .status-pill {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.67rem; font-weight: 700;
    padding: 0.15rem 0.5rem; border-radius: 999px; border: 1px solid;
  }
  .live-dot {
    width: 5px; height: 5px; border-radius: 50%; background: currentColor;
    animation: blink 1.5s step-end infinite;
  }

  .exam-title { font-size: 0.9rem; font-weight: 600; color: var(--color-text); }
  .exam-meta  { display: flex; align-items: center; gap: 0.75rem; }
  .meta-item  { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: var(--color-muted); }
  .countdown  { font-size: 0.7rem; font-weight: 700; color: #3b82f6; }

  .monitor-btn {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.5rem; font-size: 0.78rem; font-weight: 600;
    text-decoration: none; color: var(--color-text);
    transition: all 0.15s; white-space: nowrap; flex-shrink: 0;
  }
  .monitor-btn:hover { border-color: #a78bfa; color: #a78bfa; }
  .monitor-btn.monitor-live {
    background: #22c55e; border-color: #22c55e; color: white;
  }
  .monitor-btn.monitor-live:hover { background: #16a34a; border-color: #16a34a; }

  /* ── Right col ───────────────────────────────────────── */
  .right-col { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Live panel ──────────────────────────────────────── */
  .panel-live { border-color: rgba(245,158,11,0.3); }
  .panel-live .panel-head { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.04); }
  .live-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .live-exam { display: flex; flex-direction: column; gap: 0.25rem; }
  .live-course { font-size: 0.7rem; font-weight: 700; color: #f59e0b; }
  .live-title  { font-size: 0.9rem; font-weight: 600; color: var(--color-text); }

  /* ── Mini list ───────────────────────────────────────── */
  .mini-list { list-style: none; padding: 0; margin: 0; }
  .mini-item {
    display: flex; align-items: flex-start; gap: 0.75rem;
    padding: 0.875rem 1.25rem; border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
  }
  .mini-item:last-child { border-bottom: none; }
  .mini-item:hover { background: var(--color-bg); }

  .mini-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 0.35rem;
  }
  .mini-dot.blue { background: #3b82f6; }

  .mini-info { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
  .mini-course { font-size: 0.68rem; font-weight: 700; color: #3b82f6; }
  .mini-title  { font-size: 0.8rem; font-weight: 600; color: var(--color-text); }
  .mini-time   { font-size: 0.72rem; color: var(--color-muted); }
  .mini-countdown { font-size: 0.7rem; font-weight: 700; color: #3b82f6; white-space: nowrap; margin-top: 0.2rem; }

  /* ── Summary rows ────────────────────────────────────── */
  .summary-rows { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  .summary-row  { display: flex; align-items: center; gap: 0.75rem; }
  .summary-left { display: flex; align-items: center; gap: 0.5rem; min-width: 110px; }
  .summary-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .summary-label { font-size: 0.75rem; font-weight: 600; color: var(--color-text); }
  .summary-bar-wrap {
    flex: 1; height: 5px; border-radius: 3px;
    background: var(--color-border); overflow: hidden;
  }
  .summary-bar {
    height: 100%; border-radius: 3px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); min-width: 4px;
  }
  .summary-val { font-size: 0.82rem; font-weight: 700; min-width: 20px; text-align: right; }

  /* ── Empty State ─────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3.5rem 1.5rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p { font-size: 0.9rem; margin: 0; color: var(--color-text); font-weight: 600; }
  .empty-sub { font-size: 0.8rem; }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 768px) {
    .dashboard { padding: 1.25rem 1rem; gap: 1.25rem; }
    .dash-title { font-size: 1.75rem; }
    .kpi-strip  { grid-template-columns: repeat(2, 1fr); }
    .exam-item  { flex-direction: column; align-items: flex-start; }
    .monitor-btn { width: 100%; justify-content: center; }
  }
</style>