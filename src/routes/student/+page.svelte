<!-- src/routes/student/+page.svelte -->
<script lang="ts">
  import {
    LayoutDashboard, ClipboardList, BarChart3, BookOpen,
    Bell, Clock, Calendar, ArrowRight, Award, AlertCircle,
    TrendingUp, BookMarked, Zap
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const { recentExams, recentResults, meta } = data;

  function formatDate(d: Date | string | null) {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function daysUntil(d: Date | string | null) {
    if (!d) return null;
    const diff = new Date(d).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  function statusColor(status: string) {
    switch (status) {
      case 'active': return 'var(--green-600)';
      case 'scheduled': return 'var(--blue-500)';
      case 'completed': return 'var(--color-muted)';
      default: return 'var(--color-muted)';
    }
  }
</script>

<div class="dashboard">
  <!-- Header -->
  <div class="dash-header">
    <div>
      <h1>Dashboard</h1>
      <p class="dash-sub">{meta.session} · Semester {meta.semester}</p>
    </div>
    <div class="dash-meta">
      <span class="meta-pill"><BookMarked size={13} /> {meta.registeredCourses} Courses</span>
      {#if meta.unreadNotifications > 0}
        <span class="meta-pill alert"><Bell size={13} /> {meta.unreadNotifications} New</span>
      {/if}
    </div>
  </div>

  <!-- Quick stats cards -->
  <div class="stat-cards">
    <a href="/student/exams" class="stat-card">
      <div class="stat-card-icon" style="background: var(--green-soft); color: var(--green-600);">
        <ClipboardList size={20} />
      </div>
      <div class="stat-card-info">
        <span class="stat-card-value">{recentExams.length}</span>
        <span class="stat-card-label">Upcoming Exams</span>
      </div>
      <ArrowRight size={14} class="stat-card-arrow" />
    </a>
    <a href="/student/results" class="stat-card">
      <div class="stat-card-icon" style="background: var(--blue-soft); color: var(--blue-500);">
        <BarChart3 size={20} />
      </div>
      <div class="stat-card-info">
        <span class="stat-card-value">{recentResults.length}</span>
        <span class="stat-card-label">Recent Results</span>
      </div>
      <ArrowRight size={14} class="stat-card-arrow" />
    </a>
    <a href="/student/courses" class="stat-card">
      <div class="stat-card-icon" style="background: var(--teal-soft); color: var(--teal-500);">
        <BookOpen size={20} />
      </div>
      <div class="stat-card-info">
        <span class="stat-card-value">{meta.registeredCourses}</span>
        <span class="stat-card-label">Registered</span>
      </div>
      <ArrowRight size={14} class="stat-card-arrow" />
    </a>
  </div>

  <!-- Main grid -->
  <div class="dash-grid">
    <!-- Upcoming exams -->
    <section class="dash-section">
      <div class="section-head">
        <ClipboardList size={16} />
        <h2>Upcoming Exams</h2>
        <a href="/student/exams" class="section-link">View all <ArrowRight size={12} /></a>
      </div>
      {#if recentExams.length === 0}
        <div class="empty-state">
          <AlertCircle size={28} strokeWidth={1.5} />
          <p>No upcoming exams for this semester.</p>
          <a href="/student/courses/register">Register courses →</a>
        </div>
      {:else}
        <div class="exam-list">
          {#each recentExams as exam}
            <div class="exam-row">
              <div class="exam-row-left">
                <div class="exam-dot" style="background: {statusColor(exam.status)}"></div>
                <div class="exam-row-info">
                  <span class="exam-row-title">{exam.title}</span>
                  <span class="exam-row-course">{exam.courseCode} — {exam.courseTitle}</span>
                </div>
              </div>
              <div class="exam-row-right">
                {#if exam.scheduledStart}
                  {@const days = daysUntil(exam.scheduledStart)}
                  {#if days !== null && days <= 7 && days > 0}
                    <span class="exam-countdown"><Zap size={11} /> {days}d left</span>
                  {:else}
                    <span class="exam-date"><Calendar size={11} /> {formatDate(exam.scheduledStart)}</span>
                  {/if}
                {/if}
                {#if exam.sessionStatus === 'active' || exam.sessionStatus === 'in_progress'}
                  <a href="/student/exam/{exam.sessionId}" class="exam-btn primary">Resume</a>
                {:else if exam.status === 'active'}
                  <a href="/student/exam/{exam.id}" class="exam-btn primary">Start</a>
                {:else}
                  <span class="exam-btn ghost">Scheduled</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Recent results -->
    <section class="dash-section">
      <div class="section-head">
        <Award size={16} />
        <h2>Recent Results</h2>
        <a href="/student/results" class="section-link">View all <ArrowRight size={12} /></a>
      </div>
      {#if recentResults.length === 0}
        <div class="empty-state">
          <TrendingUp size={28} strokeWidth={1.5} />
          <p>No results available yet.</p>
        </div>
      {:else}
        <div class="result-list">
          {#each recentResults as result}
            <div class="result-row">
              <div class="result-row-left">
                <div class="result-grade" class:pass={result.passed} class:fail={!result.passed}>
                  {result.grade ?? '—'}
                </div>
                <div class="result-row-info">
                  <span class="result-row-title">{result.examTitle}</span>
                  <span class="result-row-course">{result.courseCode ?? '—'}</span>
                </div>
              </div>
              <div class="result-row-right">
                <span class="result-score">{result.percentage ?? result.score ?? 0}%</span>
                <span class="result-date">{result.submittedAt ? formatDate(result.submittedAt) : '—'}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .dashboard { display: flex; flex-direction: column; gap: 1.5rem; }

  .dash-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .dash-header h1 { font-size: 1.35rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .dash-sub { font-size: 0.78rem; color: var(--color-muted); margin: 0.25rem 0 0; }
  .dash-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .meta-pill {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.35rem 0.7rem; border-radius: 999px;
    background: var(--color-bg); border: 1px solid var(--color-border);
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
  }
  .meta-pill.alert { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); color: #dc2626; }

  .stat-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.875rem;
  }
  @media (max-width: 640px) {
    .stat-cards { grid-template-columns: 1fr; }
  }
  .stat-card {
    display: flex; align-items: center; gap: 0.875rem;
    padding: 1rem; border-radius: var(--radius-card);
    background: var(--color-surface); border: 1px solid var(--color-border);
    text-decoration: none; transition: all 0.15s;
  }
  .stat-card:hover { border-color: var(--green-600); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
  .stat-card-icon {
    width: 40px; height: 40px; border-radius: 0.625rem;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-card-info { flex: 1; min-width: 0; }
  .stat-card-value { display: block; font-size: 1.25rem; font-weight: 800; color: var(--color-text); }
  .stat-card-label { display: block; font-size: 0.72rem; color: var(--color-muted); margin-top: 2px; }
  .stat-card-arrow { color: var(--color-muted); flex-shrink: 0; transition: transform 0.15s; }
  .stat-card:hover .stat-card-arrow { transform: translateX(2px); color: var(--green-600); }

  .dash-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 900px) {
    .dash-grid { grid-template-columns: 1fr; }
  }

  .dash-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
  }
  .section-head {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 1rem 1.125rem; border-bottom: 1px solid var(--color-border);
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
  }
  .section-link {
    margin-left: auto;
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.12s;
  }
  .section-link:hover { color: var(--green-600); }

  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 2.5rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p { margin: 0; font-size: 0.8rem; }
  .empty-state a { color: var(--green-600); font-weight: 600; text-decoration: none; font-size: 0.78rem; }
  .empty-state a:hover { text-decoration: underline; }

  .exam-list { display: flex; flex-direction: column; }
  .exam-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 0.875rem 1.125rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .exam-row:last-child { border-bottom: none; }
  .exam-row:hover { background: var(--color-bg); }
  .exam-row-left { display: flex; align-items: center; gap: 0.625rem; min-width: 0; flex: 1; }
  .exam-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .exam-row-info { display: flex; flex-direction: column; min-width: 0; }
  .exam-row-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .exam-row-course { font-size: 0.72rem; color: var(--color-muted); }
  .exam-row-right { display: flex; align-items: center; gap: 0.625rem; flex-shrink: 0; }
  .exam-date { font-size: 0.72rem; color: var(--color-muted); display: flex; align-items: center; gap: 0.25rem; }
  .exam-countdown { font-size: 0.68rem; font-weight: 700; color: #f59e0b; display: flex; align-items: center; gap: 0.25rem; }
  .exam-btn {
    padding: 0.35rem 0.75rem; border-radius: 0.4rem; font-size: 0.72rem; font-weight: 700;
    text-decoration: none; white-space: nowrap; transition: all 0.15s;
  }
  .exam-btn.primary { background: var(--green-600); color: white; }
  .exam-btn.primary:hover { background: var(--green-700); }
  .exam-btn.ghost { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); cursor: default; }

  .result-list { display: flex; flex-direction: column; }
  .result-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 0.875rem 1.125rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .result-row:last-child { border-bottom: none; }
  .result-row:hover { background: var(--color-bg); }
  .result-row-left { display: flex; align-items: center; gap: 0.625rem; min-width: 0; flex: 1; }
  .result-grade {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 800; color: white;
    background: var(--color-border); color: var(--color-muted);
  }
  .result-grade.pass { background: var(--green-600); color: white; }
  .result-grade.fail { background: #dc2626; color: white; }
  .result-row-info { display: flex; flex-direction: column; min-width: 0; }
  .result-row-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .result-row-course { font-size: 0.72rem; color: var(--color-muted); }
  .result-row-right { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
  .result-score { font-size: 0.9rem; font-weight: 800; color: var(--color-text); }
  .result-date { font-size: 0.68rem; color: var(--color-muted); }
</style>