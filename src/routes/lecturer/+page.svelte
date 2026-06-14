<!-- src/routes/lecturer/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import {
    PlusCircle, Clock, Users, CheckCircle2, AlertCircle,
    BarChart2, ChevronRight, BookOpen, FileText, Zap,
    TrendingUp, Calendar, Eye, PlayCircle, XCircle,
    MoreVertical, ArrowUpRight, Layers, Award
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  // Derived stats from data
  const stats = $derived(data.stats ?? {});
  const recentExams = $derived(data.recentExams ?? []);
  const upcomingExams = $derived(data.upcomingExams ?? []);
  const recentActivity = $derived(data.recentActivity ?? []);

  const activeExams   = $derived(stats.activeExams   ?? 0);
  const totalExams    = $derived(stats.totalExams    ?? 0);
  const totalStudents = $derived(stats.totalStudents ?? 0);
  const avgScore      = $derived(stats.avgScore      ?? 0);
  const pendingGrades = $derived(stats.pendingGrades ?? 0);
  const passRate      = $derived(stats.passRate      ?? 0);

  const firstName = $derived(data.user?.fullName?.split(' ')[0] ?? 'Lecturer');

  function statusColor(status: string) {
    if (status === 'active')    return 'status-active';
    if (status === 'scheduled') return 'status-scheduled';
    if (status === 'completed') return 'status-completed';
    if (status === 'draft')     return 'status-draft';
    return 'status-draft';
  }

  function statusLabel(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  }

  function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
</script>

<div class="page">

  <!-- ── Page header ─────────────────────────────────────────── -->
  <div class="page-header">
    <div class="header-left">
      <p class="header-eyebrow">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}</p>
      <h1 class="header-title">{data.user?.title ? data.user.title + ' ' : ''}{data.user?.fullName ?? 'Lecturer'}</h1>
      <p class="header-sub">Here's what's happening with your exams today.</p>
    </div>
    <div class="header-actions">
      <a href="/lecturer/exams/create" class="btn-primary">
        <PlusCircle size={15} />
        New Exam
      </a>
    </div>
  </div>

  <!-- ── Stat cards ───────────────────────────────────────────── -->
  <div class="stats-grid">

    <div class="stat-card" class:highlight={activeExams > 0}>
      <div class="stat-top">
        <div class="stat-icon icon-active">
          <Zap size={16} />
        </div>
        {#if activeExams > 0}
          <span class="live-badge"><span class="live-dot"></span>Live</span>
        {/if}
      </div>
      <div class="stat-value">{activeExams}</div>
      <div class="stat-label">Active Exams</div>
      {#if activeExams > 0}
        <a href="/lecturer/exams" class="stat-link">View active <ArrowUpRight size={11} /></a>
      {/if}
    </div>

    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-icon icon-total">
          <FileText size={16} />
        </div>
      </div>
      <div class="stat-value">{totalExams}</div>
      <div class="stat-label">Total Exams</div>
      <a href="/lecturer/exams" class="stat-link">All exams <ArrowUpRight size={11} /></a>
    </div>

    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-icon icon-students">
          <Users size={16} />
        </div>
      </div>
      <div class="stat-value">{totalStudents.toLocaleString()}</div>
      <div class="stat-label">Total Students</div>
      <a href="/lecturer/students" class="stat-link">View students <ArrowUpRight size={11} /></a>
    </div>

    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-icon icon-score">
          <TrendingUp size={16} />
        </div>
      </div>
      <div class="stat-value">{avgScore}<span class="stat-unit">%</span></div>
      <div class="stat-label">Average Score</div>
      <div class="score-bar">
        <div class="score-fill" style="width: {avgScore}%"></div>
      </div>
    </div>

    <div class="stat-card" class:warn={pendingGrades > 0}>
      <div class="stat-top">
        <div class="stat-icon" class:icon-pending={pendingGrades > 0} class:icon-clear={pendingGrades === 0}>
          {#if pendingGrades > 0}<AlertCircle size={16} />{:else}<CheckCircle2 size={16} />{/if}
        </div>
      </div>
      <div class="stat-value">{pendingGrades}</div>
      <div class="stat-label">Pending Grades</div>
      {#if pendingGrades > 0}
        <a href="/lecturer/results" class="stat-link warn-link">Grade now <ArrowUpRight size={11} /></a>
      {/if}
    </div>

    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-icon icon-pass">
          <Award size={16} />
        </div>
      </div>
      <div class="stat-value">{passRate}<span class="stat-unit">%</span></div>
      <div class="stat-label">Pass Rate</div>
      <div class="score-bar">
        <div class="score-fill pass-fill" style="width: {passRate}%"></div>
      </div>
    </div>

  </div>

  <!-- ── Main content grid ─────────────────────────────────────── -->
  <div class="content-grid">

    <!-- Recent Exams -->
    <section class="card exams-card">
      <div class="card-head">
        <div class="card-head-l">
          <Layers size={15} />
          <h2>Recent Exams</h2>
        </div>
        <a href="/lecturer/exams" class="card-link">All exams <ChevronRight size={13} /></a>
      </div>

      {#if recentExams.length === 0}
        <div class="empty-state">
          <BookOpen size={32} strokeWidth={1.2} />
          <p>No exams yet</p>
          <a href="/lecturer/exams/create" class="btn-sm">Create your first exam</a>
        </div>
      {:else}
        <div class="exam-list">
          {#each recentExams as exam}
            <a href="/lecturer/exams/{exam.id}" class="exam-row">
              <div class="exam-row-l">
                <div class="exam-code">{exam.course?.code ?? '—'}</div>
                <div class="exam-info">
                  <span class="exam-title">{exam.title}</span>
                  <span class="exam-meta">
                    <Clock size={11} />{formatDate(exam.scheduledStart ?? exam.createdAt)}
                    &middot; {exam._count?.questions ?? 0} questions
                  </span>
                </div>
              </div>
              <div class="exam-row-r">
                <span class="status-pill {statusColor(exam.status)}">{statusLabel(exam.status)}</span>
                <ChevronRight size={14} class="row-arr" />
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Right column -->
    <div class="right-col">

      <!-- Quick actions -->
      <section class="card quick-card">
        <div class="card-head">
          <div class="card-head-l">
            <Zap size={15} />
            <h2>Quick actions</h2>
          </div>
        </div>
        <div class="quick-grid">
          <a href="/lecturer/exams/create" class="quick-btn">
            <PlusCircle size={18} />
            <span>New exam</span>
          </a>
          <a href="/lecturer/exams" class="quick-btn">
            <PlayCircle size={18} />
            <span>My exams</span>
          </a>
          <a href="/lecturer/results" class="quick-btn">
            <BarChart2 size={18} />
            <span>Results</span>
          </a>
          <a href="/lecturer/students/report" class="quick-btn">
            <Eye size={18} />
            <span>Reports</span>
          </a>
        </div>
      </section>

      <!-- Upcoming exams -->
      <section class="card upcoming-card">
        <div class="card-head">
          <div class="card-head-l">
            <Calendar size={15} />
            <h2>Upcoming</h2>
          </div>
        </div>

        {#if upcomingExams.length === 0}
          <div class="empty-sm">
            <CheckCircle2 size={20} strokeWidth={1.3} />
            <p>No upcoming exams</p>
          </div>
        {:else}
          <div class="upcoming-list">
            {#each upcomingExams.slice(0, 4) as exam}
              <a href="/lecturer/exams/{exam.id}" class="upcoming-row">
                <div class="upcoming-dot"></div>
                <div class="upcoming-info">
                  <span class="upcoming-title">{exam.title}</span>
                  <span class="upcoming-date">
                    <Calendar size={10} />{formatDate(exam.scheduledStart)}
                  </span>
                </div>
                <span class="upcoming-code">{exam.course?.code ?? '—'}</span>
              </a>
            {/each}
          </div>
        {/if}
      </section>

    </div>
  </div>

</div>

<style>
  /* ── Page ──────────────────────────────────────────────────── */
  .page { display: flex; flex-direction: column; gap: 1.75rem; }

  /* ── Header ────────────────────────────────────────────────── */
  .page-header {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .header-eyebrow {
    font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--lc600); margin-bottom: 0.25rem;
  }
  .header-title {
    font-size: 1.6rem; font-weight: 800; color: var(--color-text);
    letter-spacing: -0.03em; line-height: 1.15; margin: 0 0 0.3rem;
  }
  .header-sub {
    font-size: 0.82rem; color: var(--color-muted); margin: 0;
  }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.6rem 1.1rem; background: var(--lc600); color: #fff;
    border-radius: 10px; font-size: 0.83rem; font-weight: 700;
    text-decoration: none; transition: background 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .btn-primary:hover { background: var(--lc700); transform: translateY(-1px); }

  /* ── Stats grid ─────────────────────────────────────────────── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
    gap: 0.875rem;
  }
  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 1rem 1.1rem 1rem;
    display: flex; flex-direction: column; gap: 0.2rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .stat-card:hover {
    border-color: var(--lc600);
    box-shadow: 0 0 0 3px rgba(79,70,229,0.06);
  }
  .stat-card.highlight {
    border-color: rgba(79,70,229,0.4);
    background: rgba(79,70,229,0.03);
  }
  .stat-card.warn {
    border-color: rgba(245,158,11,0.4);
    background: rgba(245,158,11,0.03);
  }
  .stat-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  .stat-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .icon-active   { background: rgba(99,102,241,0.12); color: var(--lc600); }
  .icon-total    { background: rgba(99,102,241,0.08); color: var(--lc600); }
  .icon-students { background: rgba(14,165,233,0.1); color: #0ea5e9; }
  .icon-score    { background: rgba(16,185,129,0.1); color: #10b981; }
  .icon-pending  { background: rgba(245,158,11,0.1); color: #f59e0b; }
  .icon-clear    { background: rgba(16,185,129,0.1); color: #10b981; }
  .icon-pass     { background: rgba(168,85,247,0.1); color: #a855f7; }

  .live-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--lc600);
    background: rgba(79,70,229,0.1); padding: 0.15rem 0.5rem; border-radius: 20px;
  }
  .live-dot {
    width: 5px; height: 5px; border-radius: 50%; background: var(--lc600);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .stat-value {
    font-size: 2rem; font-weight: 900; color: var(--color-text);
    letter-spacing: -0.04em; line-height: 1;
  }
  .stat-unit { font-size: 1rem; font-weight: 600; opacity: 0.6; }
  .stat-label {
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.1rem;
  }
  .stat-link {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.7rem; font-weight: 700; color: var(--lc600);
    text-decoration: none; margin-top: 0.4rem; transition: gap 0.15s;
  }
  .stat-link:hover { gap: 0.35rem; }
  .warn-link { color: #f59e0b; }
  .score-bar {
    height: 3px; background: var(--color-border);
    border-radius: 2px; overflow: hidden; margin-top: 0.5rem;
  }
  .score-fill {
    height: 100%; background: linear-gradient(90deg, var(--lc500), var(--lc400));
    border-radius: 2px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  }
  .pass-fill { background: linear-gradient(90deg, #10b981, #34d399); }

  /* ── Content grid ───────────────────────────────────────────── */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 0.875rem;
    align-items: start;
  }
  @media (max-width: 900px) {
    .content-grid { grid-template-columns: 1fr; }
  }

  /* ── Cards ──────────────────────────────────────────────────── */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    overflow: hidden;
  }
  .card-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1.125rem;
    border-bottom: 1px solid var(--color-border);
  }
  .card-head-l {
    display: flex; align-items: center; gap: 0.5rem;
    color: var(--lc600);
  }
  .card-head-l h2 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text); margin: 0;
  }
  .card-link {
    display: inline-flex; align-items: center; gap: 0.15rem;
    font-size: 0.72rem; font-weight: 600; color: var(--lc600); text-decoration: none;
  }
  .card-link:hover { text-decoration: underline; }

  /* ── Exam list ──────────────────────────────────────────────── */
  .exam-list { display: flex; flex-direction: column; }
  .exam-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.8rem 1.125rem; gap: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    text-decoration: none; transition: background 0.12s;
  }
  .exam-row:last-child { border-bottom: none; }
  .exam-row:hover { background: var(--color-bg); }
  .exam-row-l { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
  .exam-code {
    font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
    padding: 0.25rem 0.5rem; border-radius: 6px;
    background: var(--lc-soft); color: var(--lc700); white-space: nowrap; flex-shrink: 0;
  }
  :global(.dark) .exam-code { color: var(--lc400); }
  .exam-info { display: flex; flex-direction: column; min-width: 0; gap: 0.2rem; }
  .exam-title {
    font-size: 0.82rem; font-weight: 600; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .exam-meta {
    font-size: 0.68rem; color: var(--color-muted);
    display: flex; align-items: center; gap: 0.3rem;
  }
  .exam-row-r { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  :global(.row-arr) { color: var(--color-border); transition: color 0.15s, transform 0.15s; }
  .exam-row:hover :global(.row-arr) { color: var(--lc600); transform: translateX(2px); }

  /* Status pills */
  .status-pill {
    font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0.2rem 0.55rem; border-radius: 20px;
    white-space: nowrap;
  }
  .status-active    { background: rgba(79,70,229,0.1);  color: var(--lc700); }
  .status-scheduled { background: rgba(14,165,233,0.1); color: #0369a1; }
  .status-completed { background: rgba(16,185,129,0.1); color: #065f46; }
  .status-draft     { background: var(--color-bg);      color: var(--color-muted); border: 1px solid var(--color-border); }
  :global(.dark) .status-active    { color: var(--lc400); }
  :global(.dark) .status-completed { color: #34d399; }
  :global(.dark) .status-scheduled { color: #38bdf8; }

  /* ── Quick actions ──────────────────────────────────────────── */
  .quick-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 0.5rem; padding: 0.875rem;
  }
  .quick-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.45rem; padding: 0.875rem 0.5rem;
    border-radius: 10px; text-decoration: none;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); font-size: 0.72rem; font-weight: 600;
    transition: all 0.15s;
  }
  .quick-btn:hover {
    border-color: var(--lc600); color: var(--lc700);
    background: var(--lc-soft); transform: translateY(-1px);
  }
  :global(.dark) .quick-btn:hover { color: var(--lc400); }

  /* ── Upcoming ───────────────────────────────────────────────── */
  .upcoming-list { display: flex; flex-direction: column; padding: 0.25rem 0; }
  .upcoming-row {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.65rem 1.125rem; text-decoration: none;
    transition: background 0.12s;
  }
  .upcoming-row:hover { background: var(--color-bg); }
  .upcoming-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    background: var(--lc600); box-shadow: 0 0 0 3px rgba(79,70,229,0.15);
  }
  .upcoming-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
  .upcoming-title {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .upcoming-date {
    font-size: 0.65rem; color: var(--color-muted);
    display: flex; align-items: center; gap: 0.25rem;
  }
  .upcoming-code {
    font-size: 0.62rem; font-weight: 700; color: var(--lc700);
    background: var(--lc-soft); padding: 0.15rem 0.45rem; border-radius: 5px;
    flex-shrink: 0; white-space: nowrap;
  }
  :global(.dark) .upcoming-code { color: var(--lc400); }

  /* ── Right column ───────────────────────────────────────────── */
  .right-col { display: flex; flex-direction: column; gap: 0.875rem; }

  /* ── Empty states ───────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
    padding: 2.5rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p { font-size: 0.82rem; margin: 0; }
  .empty-sm {
    display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
    padding: 1.25rem 1rem; color: var(--color-muted); text-align: center;
    font-size: 0.78rem;
  }
  .empty-sm p { margin: 0; }
  .btn-sm {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.45rem 0.9rem; background: var(--lc600); color: #fff;
    border-radius: 8px; font-size: 0.75rem; font-weight: 700;
    text-decoration: none; margin-top: 0.25rem;
  }
  .btn-sm:hover { background: var(--lc700); }

  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>