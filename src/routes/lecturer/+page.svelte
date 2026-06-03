<!-- src/routes/lecturer/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    BookOpen, Plus, CheckCircle,
    Calendar, Zap, BarChart3, ArrowUpRight,
    TrendingUp, Users, Clock,
    RefreshCw, ChevronRight,
    FileText, Edit3
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exams, statsMap } = data;

  const totalExams     = $derived(exams.length);
  const activeExams    = $derived(exams.filter((e: any) => e.status === 'active').length);
  const scheduledExams = $derived(exams.filter((e: any) => e.status === 'scheduled').length);
  const completedExams = $derived(exams.filter((e: any) => e.status === 'completed').length);
  const draftExams     = $derived(exams.filter((e: any) => e.status === 'draft').length);

  const totalStudents = $derived(
    Object.values(statsMap ?? {}).reduce((sum: number, s: any) => sum + (s?.total ?? 0), 0)
  );

  const avgPass = $derived(() => {
    const vals = Object.values(statsMap ?? {}).filter((s: any) => s?.pass_rate != null);
    if (!vals.length) return 0;
    return Math.round(
      vals.reduce((a: number, s: any) => a + Number(s.pass_rate ?? 0), 0) / vals.length
    );
  });

  const STATUS_META: Record<string, { label: string; color: string }> = {
    draft:     { label: 'Draft',     color: '#64748b' },
    scheduled: { label: 'Scheduled', color: '#3b82f6' },
    active:    { label: 'Live',      color: '#22c55e' },
    completed: { label: 'Done',      color: '#a78bfa' },
    cancelled: { label: 'Cancelled', color: '#ef4444' },
  };

  // Sort: active → scheduled → draft → completed → cancelled
  const ORDER: Record<string, number> = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 };
  const sortedExams = $derived([...exams].sort((a: any, b: any) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9)));
</script>

<svelte:head><title>Lecturer Dashboard — MOUAU eTest</title></svelte:head>

<div class="dashboard">

  <!-- ══ HEADER ═════════════════════════════════════════════════ -->
  <header class="dash-header">
    <div class="dash-header-left">
      <div class="dash-eyebrow">
        <span class="dash-dot pulse"></span>
        Lecturer Portal
      </div>
      <h1 class="dash-title">My Dashboard</h1>
      <p class="dash-subtitle">Welcome back, <strong>{data.user.fullName}</strong></p>
    </div>
    <div class="header-actions">
      <button class="btn-outline" type="button" onclick={() => window.location.reload()}>
        <RefreshCw size={14} /> Refresh
      </button>
      <a href="/lecturer/exams/create" class="btn-primary">
        <Plus size={14} /> New Exam
      </a>
    </div>
  </header>

  <!-- ══ KPI STRIP ══════════════════════════════════════════════ -->
  <section class="kpi-strip" aria-label="Key statistics">
    <div class="kpi-card kpi-slate" style="--delay:0ms">
      <div class="kpi-icon"><BookOpen size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{totalExams}</span>
        <span class="kpi-label">Total Exams</span>
      </div>
      <div class="kpi-trend">all time</div>
    </div>

    <div class="kpi-card kpi-green" style="--delay:60ms">
      <div class="kpi-icon"><Zap size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{activeExams}</span>
        <span class="kpi-label">Active Now</span>
      </div>
      {#if activeExams > 0}
        <div class="kpi-live-badge">LIVE</div>
      {:else}
        <div class="kpi-trend">none running</div>
      {/if}
    </div>

    <div class="kpi-card kpi-blue" style="--delay:120ms">
      <div class="kpi-icon"><Calendar size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{scheduledExams}</span>
        <span class="kpi-label">Scheduled</span>
      </div>
      <div class="kpi-trend up"><ArrowUpRight size={12} /> upcoming</div>
    </div>

    <div class="kpi-card kpi-violet" style="--delay:180ms">
      <div class="kpi-icon"><CheckCircle size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{completedExams}</span>
        <span class="kpi-label">Completed</span>
      </div>
      <div class="kpi-trend">finished</div>
    </div>

    <div class="kpi-card kpi-teal" style="--delay:240ms">
      <div class="kpi-icon"><Users size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{totalStudents}</span>
        <span class="kpi-label">Students</span>
      </div>
      <div class="kpi-trend up"><ArrowUpRight size={12} /> enrolled</div>
    </div>

    <div class="kpi-card kpi-emerald" style="--delay:300ms">
      <div class="kpi-icon"><TrendingUp size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{avgPass()}%</span>
        <span class="kpi-label">Avg Pass Rate</span>
      </div>
      <div class="kpi-trend">across exams</div>
    </div>
  </section>

  <!-- ══ EXAMS PANEL ════════════════════════════════════════════ -->
  {#if sortedExams.length === 0}
    <section class="panel">
      <div class="empty-state">
        <div class="empty-icon"><BookOpen size={32} strokeWidth={1.2} /></div>
        <p class="empty-title">No exams yet</p>
        <p class="empty-sub">Create your first exam to get started.</p>
        <a href="/lecturer/exams/create" class="btn-primary">
          <Plus size={14} /> Create Exam
        </a>
      </div>
    </section>
  {:else}
    <section class="panel">
      <div class="panel-head">
        <div class="panel-title-wrap">
          <FileText size={15} />
          <h2>My Exams</h2>
        </div>
        <div class="panel-head-right">
          <span class="panel-count">{totalExams} exam{totalExams !== 1 ? 's' : ''}</span>
          <a href="/lecturer/exams" class="panel-link">
            View all <ChevronRight size={12} />
          </a>
        </div>
      </div>

      <div class="exam-grid">
        {#each sortedExams as exam, i (exam.id)}
          {@const s    = (statsMap ?? {})[exam.id]}
          {@const meta = STATUS_META[exam.status] ?? STATUS_META.draft}
          <div class="exam-card" style="animation-delay:{i * 45}ms">
            <div class="card-accent" style="background:{meta.color}"></div>

            <div class="card-top">
              <span class="course-badge">{exam.course.code}</span>
              <span class="status-pill" style="color:{meta.color}; background:{meta.color}18; border-color:{meta.color}35;">
                {#if exam.status === 'active'}
                  <span class="live-dot" style="background:{meta.color}"></span>
                {/if}
                {meta.label}
              </span>
            </div>

            <h3 class="exam-title">{exam.title}</h3>

            <div class="exam-meta-row">
              <span class="meta-chip"><Clock size={11} />{exam.durationMinutes}m</span>
              <span class="meta-chip"><BarChart3 size={11} />{exam.totalMarks} marks</span>
              <span class="meta-chip">Pass {exam.passMark}</span>
            </div>

            {#if s && (s.total > 0)}
              <div class="stats-strip">
                <div class="stat-box">
                  <span class="stat-val">{s.total}</span>
                  <span class="stat-lbl">Students</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-box">
                  <span class="stat-val">{s.submitted ?? 0}</span>
                  <span class="stat-lbl">Submitted</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-box">
                  <span class="stat-val" class:good={(s.avg_pct ?? 0) >= 50}>{s.avg_pct ?? 0}%</span>
                  <span class="stat-lbl">Avg</span>
                </div>
              </div>
            {:else}
              <div class="no-data">No attempts yet</div>
            {/if}

            <div class="card-actions">
              <a href="/lecturer/exams/{exam.id}/questions" class="act">
                <FileText size={12} /> Questions
              </a>
              <a href="/lecturer/exams/{exam.id}/results" class="act">
                <BarChart3 size={12} /> Results
              </a>
              <a href="/lecturer/exams/{exam.id}" class="act act-outline">
                <Edit3 size={12} /> Manage
              </a>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

</div>

<style>
  /* ── Tokens ──────────────────────────────────────────────────── */
  :root {
    --green-400: #4ade80;
    --green-500: #22c55e;
    --green-600: #16a34a;
    --green-700: #15803d;
    --green-soft: rgba(34,197,94,0.08);
  }

  .dashboard {
    padding: 2rem 1.5rem 3rem;
    max-width: 1200px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 2rem;
  }
  @media (min-width: 1024px) { .dashboard { padding: 2rem 2.5rem 3rem; } }

  /* ── Header ──────────────────────────────────────────────────── */
  .dash-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-wrap: wrap; gap: 1rem;
    padding-bottom: 1.25rem; border-bottom: 1px solid var(--color-border);
  }

  .dash-eyebrow {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--green-600); margin-bottom: 0.3rem;
  }

  .dash-dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--green-600);
  }
  .dash-dot.pulse { animation: dot-pulse 2s ease-in-out infinite; }

  @keyframes dot-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
    70%      { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
  }

  .dash-title {
    font-size: 2rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.25rem; line-height: 1;
  }

  .dash-subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0; }
  .dash-subtitle strong { color: var(--color-text); font-weight: 700; }

  .header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

  .btn-outline {
    display: inline-flex; align-items: center; gap: 0.45rem;
    padding: 0.5rem 1rem; background: transparent;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .btn-outline:hover { border-color: var(--green-600); color: var(--green-600); }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.45rem;
    padding: 0.5rem 1.1rem; background: var(--green-600);
    border: none; border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 700; color: white;
    cursor: pointer; transition: all 0.15s; text-decoration: none; font-family: inherit;
    white-space: nowrap;
  }
  .btn-primary:hover {
    background: var(--green-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(22,163,74,0.3);
  }

  /* ── KPI Strip ───────────────────────────────────────────────── */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
    gap: 1rem;
  }

  .kpi-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    position: relative; overflow: hidden;
    transition: transform 0.15s, box-shadow 0.15s;
    animation: fade-up 0.4s ease both;
    animation-delay: var(--delay, 0ms);
  }
  .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.07); }

  /* Coloured top bar */
  .kpi-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 1rem 1rem 0 0;
  }
  .kpi-green::before   { background: var(--green-500); }
  .kpi-blue::before    { background: #3b82f6; }
  .kpi-violet::before  { background: #a78bfa; }
  .kpi-slate::before   { background: #64748b; }
  .kpi-teal::before    { background: #14b8a6; }
  .kpi-emerald::before { background: var(--green-400); }

  .kpi-icon {
    width: 36px; height: 36px; border-radius: 0.6rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg);
  }
  .kpi-green   .kpi-icon { color: var(--green-600); }
  .kpi-blue    .kpi-icon { color: #3b82f6; }
  .kpi-violet  .kpi-icon { color: #a78bfa; }
  .kpi-slate   .kpi-icon { color: #64748b; }
  .kpi-teal    .kpi-icon { color: #14b8a6; }
  .kpi-emerald .kpi-icon { color: var(--green-600); }

  .kpi-body { display: flex; flex-direction: column; gap: 0.1rem; }
  .kpi-value {
    font-size: 1.85rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); line-height: 1;
  }
  .kpi-label {
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-muted);
  }
  .kpi-trend {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.68rem; font-weight: 600; color: var(--color-muted);
  }
  .kpi-trend.up { color: var(--green-600); }

  .kpi-live-badge {
    font-size: 0.6rem; font-weight: 800; letter-spacing: 0.12em;
    color: var(--green-600);
    background: var(--green-soft);
    border: 1px solid rgba(22,163,74,0.3);
    padding: 0.12rem 0.5rem; border-radius: 999px; width: fit-content;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0.35; } }

  /* ── Panel ───────────────────────────────────────────────────── */
  .panel {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; overflow: hidden;
    animation: fade-up 0.45s ease both; animation-delay: 320ms;
  }

  .panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1.25rem; border-bottom: 1px solid var(--color-border);
    gap: 1rem;
  }
  .panel-title-wrap {
    display: flex; align-items: center; gap: 0.5rem; color: var(--color-muted);
  }
  .panel-title-wrap h2 {
    font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-text); margin: 0;
  }
  .panel-head-right { display: flex; align-items: center; gap: 0.75rem; }
  .panel-count {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.15rem 0.55rem; border-radius: 999px;
  }
  .panel-link {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.75rem; font-weight: 600; color: var(--green-600);
    text-decoration: none; transition: gap 0.15s;
  }
  .panel-link:hover { gap: 0.4rem; }

  /* ── Exam grid ───────────────────────────────────────────────── */
  .exam-grid {
    padding: 1.25rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  /* ── Exam card ───────────────────────────────────────────────── */
  .exam-card {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 1.125rem;
    display: flex; flex-direction: column; gap: 0.875rem;
    position: relative; overflow: hidden;
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
    animation: fade-up 0.4s ease both;
  }
  .exam-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.07);
    border-color: rgba(22,163,74,0.3);
  }

  .card-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 0.875rem 0.875rem 0 0;
  }

  /* Card top */
  .card-top {
    display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
  }

  .course-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--green-soft); color: var(--green-600);
    border-radius: 999px; letter-spacing: 0.04em;
  }

  .status-pill {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.6rem;
    border-radius: 999px; border: 1px solid; white-space: nowrap;
  }

  .live-dot {
    width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
    animation: blink 1.5s step-end infinite;
  }

  .exam-title {
    font-size: 0.92rem; font-weight: 700; color: var(--color-text);
    margin: 0; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

  .exam-meta-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }

  .meta-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-surface); border: 1px solid var(--color-border);
    padding: 0.18rem 0.5rem; border-radius: 999px;
  }

  /* Stats strip */
  .stats-strip {
    display: flex; align-items: center;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.625rem; overflow: hidden;
  }
  .stat-box {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 0.1rem; padding: 0.55rem 0.5rem;
  }
  .stat-val {
    font-size: 1.05rem; font-weight: 800; letter-spacing: -0.03em;
    color: var(--color-text); line-height: 1;
  }
  .stat-val.good { color: var(--green-600); }
  .stat-lbl {
    font-size: 0.6rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
  }
  .stat-divider { width: 1px; height: 30px; background: var(--color-border); flex-shrink: 0; }

  .no-data {
    font-size: 0.72rem; color: var(--color-muted);
    padding: 0.45rem 0.625rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.45rem;
  }

  /* Card actions */
  .card-actions { display: flex; gap: 0.4rem; margin-top: auto; flex-wrap: wrap; }

  .act {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.38rem 0.75rem;
    background: var(--green-600); border: 1px solid var(--green-600);
    border-radius: 0.45rem; font-size: 0.73rem; font-weight: 700;
    text-decoration: none; color: white; cursor: pointer;
    font-family: inherit; transition: all 0.12s; white-space: nowrap;
  }
  .act:hover { background: var(--green-700); border-color: var(--green-700); }

  .act.act-outline {
    background: transparent; border-color: var(--color-border);
    color: var(--color-text); margin-left: auto;
  }
  .act.act-outline:hover {
    border-color: var(--green-600); color: var(--green-600);
    background: var(--green-soft);
  }

  /* ── Empty state ─────────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 4rem 1.5rem; text-align: center;
  }

  .empty-icon {
    width: 64px; height: 64px; border-radius: 1rem;
    background: var(--green-soft); border: 1px solid rgba(22,163,74,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--green-600); margin-bottom: 0.25rem;
  }

  .empty-title { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-sub   { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  /* ── Animations ──────────────────────────────────────────────── */
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Responsive ──────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .dash-title    { font-size: 1.65rem; }
    .kpi-strip     { grid-template-columns: repeat(2, 1fr); }
    .exam-grid     { grid-template-columns: 1fr; padding: 1rem; }
    .header-actions{ flex-wrap: wrap; }
  }

  @media (max-width: 420px) {
    .kpi-strip { grid-template-columns: 1fr 1fr; }
  }
</style>