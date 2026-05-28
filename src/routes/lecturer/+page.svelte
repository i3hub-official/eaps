<!-- src/routes/lecturer/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    BookOpen, Plus, GraduationCap, CheckCircle,
    Calendar, Zap, BarChart3, ArrowUpRight,
    TrendingUp, Users, Clock, Edit3,
    PlayCircle, RefreshCw, ChevronRight,
    FileText, Eye, Shield
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exams, statsMap } = data;

  const totalExams     = $derived(exams.length);
  const activeExams    = $derived(exams.filter(e => e.status === 'active').length);
  const scheduledExams = $derived(exams.filter(e => e.status === 'scheduled').length);
  const completedExams = $derived(exams.filter(e => e.status === 'completed').length);
  const draftExams     = $derived(exams.filter(e => e.status === 'draft').length);

  const totalStudents  = $derived(
    Object.values(statsMap ?? {}).reduce((sum: number, s: any) => sum + (s?.total ?? 0), 0)
  );
  const avgPass = $derived(() => {
    const vals = Object.values(statsMap ?? {}).filter((s: any) => s?.pass_rate != null);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a: number, s: any) => a + Number(s.pass_rate ?? 0), 0) / vals.length);
  });

  const STATUS_META: Record<string, { label: string; color: string }> = {
    draft:     { label: 'Draft',     color: '#64748b' },
    scheduled: { label: 'Scheduled', color: '#3b82f6' },
    active:    { label: 'Live',      color: '#22c55e' },
    completed: { label: 'Done',      color: '#a78bfa' },
    cancelled: { label: 'Cancelled', color: '#ef4444' },
  };
</script>

<svelte:head><title>Lecturer Dashboard — MOUAU eTest</title></svelte:head>

<div class="dashboard">

  <!-- ══ HEADER ═══════════════════════════════════════════════ -->
  <header class="dash-header">
    <div class="dash-header-left">
      <div class="dash-eyebrow">
        <span class="dash-dot pulse"></span>
        Lecturer Portal
      </div>
      <h1 class="dash-title">My Dashboard</h1>
      <p class="dash-subtitle">Welcome back, <strong>{data.user.fullName}</strong></p>
    </div>
    <div class="dash-header-right">
      <div class="header-actions">
        <button class="btn-outline" onclick={() => window.location.reload()}>
          <RefreshCw size={14} /> Refresh
        </button>
        <a href="/lecturer/exams/create" class="btn-primary">
          <Plus size={14} /> New Exam
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

    <div class="kpi-card kpi-teal">
      <div class="kpi-icon"><Users size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{totalStudents}</span>
        <span class="kpi-label">Students</span>
      </div>
      <div class="kpi-trend up"><ArrowUpRight size={12} /> enrolled</div>
    </div>

    <div class="kpi-card kpi-green">
      <div class="kpi-icon"><TrendingUp size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{avgPass()}%</span>
        <span class="kpi-label">Avg Pass Rate</span>
      </div>
      <div class="kpi-trend neutral">across exams</div>
    </div>
  </section>

  <!-- ══ EXAMS GRID ════════════════════════════════════════════ -->
  {#if exams.length === 0}
    <section class="panel">
      <div class="empty-state">
        <BookOpen size={36} />
        <p>You haven't created any exams yet.</p>
        <a href="/lecturer/exams/create" class="btn-primary">
          <Plus size={14} /> Create your first exam
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
        <div style="display:flex;gap:0.75rem;align-items:center;">
          <span class="panel-count">{totalExams} exams</span>
          <a href="/lecturer/exams" class="panel-link">View all <ChevronRight size={12} /></a>
        </div>
      </div>

      <div class="exam-grid">
        {#each exams as exam, i}
          {@const s = statsMap?.[exam.id]}
          {@const meta = STATUS_META[exam.status] ?? STATUS_META.draft}
          <div class="exam-card" style="animation-delay:{i * 50}ms">
            <div class="card-accent" style="background:{meta.color}"></div>

            <div class="card-top">
              <span class="course-badge">{exam.course.code}</span>
              <span class="status-pill" style="color:{meta.color};background:{meta.color}18;border-color:{meta.color}30;">
                {meta.label}
                {#if exam.status === 'active'}
                  <span class="live-dot" style="background:{meta.color}"></span>
                {/if}
              </span>
            </div>

            <h3 class="exam-title">{exam.title}</h3>

            <div class="exam-meta-row">
              <span class="meta-chip"><Clock size={11} />{exam.durationMinutes}m</span>
              <span class="meta-chip"><BarChart3 size={11} />{exam.totalMarks} marks</span>
              <span class="meta-chip">Pass {exam.passMark}</span>
            </div>

            {#if s}
              <div class="stats-strip">
                <div class="stat-box">
                  <span class="stat-val">{s.total}</span>
                  <span class="stat-lbl">Students</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-box">
                  <span class="stat-val">{s.submitted}</span>
                  <span class="stat-lbl">Submitted</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-box">
                  <span class="stat-val" style="color:#22c55e">{s.avg_pct ?? 0}%</span>
                  <span class="stat-lbl">Avg</span>
                </div>
              </div>
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
    padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border);
  }
  .dash-eyebrow {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #3b82f6; margin-bottom: 0.3rem;
  }
  .dash-dot { width: 7px; height: 7px; border-radius: 50%; background: #3b82f6; }
  .dash-dot.pulse { animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,.5); }
    70%      { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
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
    padding: 0.5rem 1rem; background: transparent;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 500; color: var(--color-text);
    cursor: pointer; transition: all 0.15s; text-decoration: none;
  }
  .btn-outline:hover { border-color: #3b82f6; color: #3b82f6; }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 1rem; background: #3b82f6;
    border: 1px solid #3b82f6; border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 600; color: white;
    cursor: pointer; transition: all 0.15s; text-decoration: none;
  }
  .btn-primary:hover { background: #2563eb; border-color: #2563eb; }

  /* ── KPI Strip ───────────────────────────────────────── */
  .kpi-strip {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem;
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
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 1rem 1rem 0 0;
  }
  .kpi-blue::before   { background: #3b82f6; }
  .kpi-green::before  { background: #22c55e; }
  .kpi-violet::before { background: #a78bfa; }
  .kpi-amber::before  { background: #f59e0b; }
  .kpi-slate::before  { background: #64748b; }
  .kpi-teal::before   { background: #14b8a6; }

  .kpi-icon {
    width: 36px; height: 36px; border-radius: 0.6rem;
    display: flex; align-items: center; justify-content: center; background: var(--color-bg);
  }
  .kpi-blue   .kpi-icon { color: #3b82f6; }
  .kpi-green  .kpi-icon { color: #22c55e; }
  .kpi-violet .kpi-icon { color: #a78bfa; }
  .kpi-amber  .kpi-icon { color: #f59e0b; }
  .kpi-slate  .kpi-icon { color: #64748b; }
  .kpi-teal   .kpi-icon { color: #14b8a6; }

  .kpi-body { display: flex; flex-direction: column; gap: 0.1rem; }
  .kpi-value { font-size: 1.9rem; font-weight: 900; letter-spacing: -0.04em; color: var(--color-text); line-height: 1; }
  .kpi-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .kpi-trend { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.68rem; font-weight: 700; color: var(--color-muted); }
  .kpi-trend.up { color: #22c55e; }
  .kpi-live-badge {
    font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em;
    color: #f59e0b; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25);
    padding: 0.1rem 0.4rem; border-radius: 999px; width: fit-content;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0.4; } }

  /* ── Panel ───────────────────────────────────────────── */
  .panel {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; overflow: hidden; animation: fadeUp 0.45s ease both;
  }
  .panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);
  }
  .panel-title-wrap { display: flex; align-items: center; gap: 0.5rem; color: var(--color-muted); }
  .panel-title-wrap h2 {
    font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-text); margin: 0;
  }
  .panel-count {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.15rem 0.5rem; border-radius: 999px;
  }
  .panel-link {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.75rem; font-weight: 600; color: #3b82f6; text-decoration: none;
    transition: gap 0.15s;
  }
  .panel-link:hover { gap: 0.4rem; }

  /* ── Exam Grid ───────────────────────────────────────── */
  .exam-grid {
    padding: 1.25rem;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;
  }
  .exam-card {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.875rem;
    position: relative; overflow: hidden;
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
    animation: fadeUp 0.4s ease both;
  }
  .exam-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.07); border-color: var(--color-primary, #3b82f6); }

  .card-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 0.875rem 0.875rem 0 0;
  }

  .card-top { display: flex; justify-content: space-between; align-items: center; }
  .course-badge {
    font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem;
    background: rgba(59,130,246,0.1); color: #3b82f6; border-radius: 999px;
  }
  .status-pill {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem;
    border-radius: 999px; border: 1px solid;
  }
  .live-dot { width: 5px; height: 5px; border-radius: 50%; animation: blink 1.5s step-end infinite; }

  .exam-title { font-size: 0.95rem; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.4; }

  .exam-meta-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .meta-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 500; color: var(--color-muted);
    background: var(--color-surface); border: 1px solid var(--color-border);
    padding: 0.15rem 0.5rem; border-radius: 999px;
  }

  .stats-strip {
    display: flex; align-items: center;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.6rem; overflow: hidden;
  }
  .stat-box { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.1rem; padding: 0.6rem 0.5rem; }
  .stat-val { font-size: 1.1rem; font-weight: 800; letter-spacing: -0.03em; color: var(--color-text); }
  .stat-lbl { font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .stat-divider { width: 1px; height: 32px; background: var(--color-border); flex-shrink: 0; }

  .card-actions { display: flex; gap: 0.4rem; margin-top: auto; }
  .act {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.35rem 0.7rem; background: #3b82f6; border: 1px solid #3b82f6;
    border-radius: 0.4rem; font-size: 0.73rem; font-weight: 600;
    text-decoration: none; color: white; transition: all 0.12s;
  }
  .act:hover { background: #2563eb; border-color: #2563eb; }
  .act.act-outline {
    background: var(--color-surface); border-color: var(--color-border); color: var(--color-text);
  }
  .act.act-outline:hover { border-color: #3b82f6; color: #3b82f6; background: var(--color-surface); }

  /* ── Empty State ─────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    padding: 4rem 1.5rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p { font-size: 0.9rem; font-weight: 600; color: var(--color-text); margin: 0; }

  @media (max-width: 768px) {
    .dashboard { padding: 1.25rem 1rem; gap: 1.25rem; }
    .dash-title { font-size: 1.75rem; }
    .kpi-strip { grid-template-columns: repeat(2, 1fr); }
    .exam-grid { grid-template-columns: 1fr; padding: 1rem; }
  }
</style>