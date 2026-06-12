<!-- src/routes/student/exam/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    Play, Clock, Calendar, Award, AlertCircle,
    CheckCircle2, Ban, BookOpen, ChevronRight, Timer
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let filter = $state<'all' | 'upcoming' | 'active' | 'completed'>('all');

  const filteredExams = $derived(
    filter === 'active'
      ? data.exams.filter(e => e.status === 'active' || e.sessionStatus === 'in_progress')
      : filter === 'upcoming'
      ? data.exams.filter(e => e.status === 'scheduled' && !e.sessionStatus)
      : filter === 'completed'
      ? data.exams.filter(e => e.sessionStatus === 'submitted' || e.sessionStatus === 'force_submitted')
      : data.exams
  );

  const activeCount    = $derived(data.exams.filter(e => e.status === 'active' || e.sessionStatus === 'in_progress').length);
  const upcomingCount  = $derived(data.exams.filter(e => e.status === 'scheduled' && !e.sessionStatus).length);
  const completedCount = $derived(data.exams.filter(e => e.sessionStatus === 'submitted' || e.sessionStatus === 'force_submitted').length);

  function statusConfig(exam: typeof data.exams[0]) {
    if (exam.sessionStatus === 'submitted' || exam.sessionStatus === 'force_submitted')
      return { label: 'Completed', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: CheckCircle2 };
    if (exam.status === 'active' || exam.sessionStatus === 'in_progress')
      return { label: 'In Progress', color: '#059669', bg: 'rgba(5,150,105,0.08)', icon: Play };
    if (exam.status === 'scheduled')
      return { label: 'Upcoming', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: Calendar };
    if (exam.status === 'cancelled')
      return { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', icon: Ban };
    return { label: 'Available', color: 'var(--color-muted)', bg: 'var(--color-bg)', icon: BookOpen };
  }

  function fmt(d: Date | string | null, type: 'date' | 'time') {
    if (!d) return 'TBD';
    const dt = new Date(d);
    return type === 'date'
      ? dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function dur(mins: number) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  }
</script>

<div class="exams-page">
  <div class="page-header">
    <h1>My Exams</h1>
    <p class="page-sub">{data.meta.session} · Semester {data.meta.semester} · {data.meta.totalExams} exam{data.meta.totalExams !== 1 ? 's' : ''}</p>
  </div>

  <div class="filter-tabs">
    <button class="filter-tab" class:active={filter === 'all'}       onclick={() => filter = 'all'}>All ({data.exams.length})</button>
    <button class="filter-tab" class:active={filter === 'active'}    onclick={() => filter = 'active'}>Active ({activeCount})</button>
    <button class="filter-tab" class:active={filter === 'upcoming'}  onclick={() => filter = 'upcoming'}>Upcoming ({upcomingCount})</button>
    <button class="filter-tab" class:active={filter === 'completed'} onclick={() => filter = 'completed'}>Completed ({completedCount})</button>
  </div>

  {#if filteredExams.length === 0}
    <div class="empty-state">
      <BookOpen size={48} strokeWidth={1.2}/>
      <h3>No exams found</h3>
      <p>{filter === 'all' ? 'No exams available for your registered courses.' : 'No exams match this filter.'}</p>
    </div>
  {:else}
    <div class="exams-grid">
      {#each filteredExams as exam (exam.id)}
        {@const sc = statusConfig(exam)}
        {@const Icon = sc.icon}
        <div class="exam-card">
          <div class="exam-card-header">
            <div class="exam-status" style="background:{sc.bg}; color:{sc.color}">
              <Icon size={12}/> {sc.label}
            </div>
            {#if exam.registrationType !== 'normal'}
              <span class="reg-badge">{exam.registrationType.replace('_', ' ')}</span>
            {/if}
          </div>

          <h3 class="exam-title">{exam.title}</h3>
          <p class="exam-course">{exam.courseCode} — {exam.courseTitle}</p>

          <div class="exam-details">
            <div class="detail-item"><Clock size={12}/> {dur(exam.durationMinutes)}</div>
            <div class="detail-item"><Calendar size={12}/> {fmt(exam.scheduledStart, 'date')}</div>
            <div class="detail-item"><Timer size={12}/> {fmt(exam.scheduledStart, 'time')}</div>
            <div class="detail-item"><Award size={12}/> Pass: {exam.passMark}/{exam.totalMarks}</div>
          </div>

          <div class="exam-actions">
            {#if exam.sessionStatus === 'submitted' || exam.sessionStatus === 'force_submitted'}
              <div class="score-display">
                <span class="score-label">Score:</span>
                <span class="score-value">{exam.score ?? '—'}/{exam.totalMarks}</span>
              </div>
              <button class="btn-secondary" onclick={() => goto('/student/results')}>
                View Results <ChevronRight size={14}/>
              </button>
            {:else if exam.status === 'active'}
              <!-- Navigate to lobby — lobby handles face verification then opens session in new tab -->
              <button class="btn-primary" onclick={() => goto(`/student/exam/${exam.id}`)}>
                <Play size={14}/>
                {exam.sessionStatus === 'in_progress' ? 'Resume Exam' : 'Start Exam'}
              </button>
            {:else if exam.status === 'scheduled'}
              <button class="btn-primary" disabled>
                <Clock size={14}/> Starts {fmt(exam.scheduledStart, 'time')}
              </button>
            {:else if exam.status === 'cancelled'}
              <div class="cancelled-badge"><Ban size={14}/> Cancelled</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .exams-page { max-width: 1200px; margin: 0 auto; padding: 1rem; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0 0 0.25rem; }
  .page-sub { font-size: 0.75rem; color: var(--color-muted); margin: 0; }
  .filter-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .filter-tab {
    padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid var(--color-border);
    background: var(--color-surface); font-size: 0.75rem; font-weight: 600;
    color: var(--color-muted); cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: inherit;
  }
  .filter-tab:hover { border-color: var(--green-600); color: var(--green-600); }
  .filter-tab.active { background: var(--green-600); border-color: var(--green-600); color: #fff; }
  .exams-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
  .exam-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.25rem; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .exam-card:hover { border-color: var(--green-600); box-shadow: 0 3px 12px rgba(0,0,0,0.07); }
  .exam-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
  .exam-status {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.2rem 0.5rem; border-radius: 0.375rem;
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  }
  .reg-badge {
    font-size: 0.6rem; font-weight: 600; padding: 0.15rem 0.4rem; border-radius: 0.25rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); text-transform: capitalize;
  }
  .exam-title { font-size: 0.9rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.25rem; }
  .exam-course { font-size: 0.75rem; color: var(--color-muted); margin: 0 0 1rem; }
  .exam-details {
    display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem;
    padding: 0.5rem 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border);
  }
  .detail-item { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; color: var(--color-muted); }
  .exam-actions { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .btn-primary, .btn-secondary {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 1rem; border-radius: 0.5rem;
    font-size: 0.75rem; font-weight: 600; cursor: pointer;
    transition: all 0.2s; border: none; font-family: inherit;
  }
  .btn-primary { background: var(--green-600); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: var(--green-700); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted); }
  .btn-secondary:hover { border-color: var(--green-600); color: var(--green-600); }
  .score-display { display: flex; align-items: baseline; gap: 0.25rem; }
  .score-label { font-size: 0.7rem; color: var(--color-muted); }
  .score-value { font-size: 0.85rem; font-weight: 700; color: var(--green-600); }
  .cancelled-badge { display: flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 600; color: #dc2626; }
  .empty-state { text-align: center; padding: 3rem; color: var(--color-muted); }
  .empty-state h3 { font-size: 1rem; font-weight: 700; margin: 1rem 0 0.5rem; color: var(--color-text); }
  .empty-state p { font-size: 0.75rem; margin: 0; }
  @media (max-width: 640px) {
    .exams-grid { grid-template-columns: 1fr; }
    .filter-tabs { overflow-x: auto; flex-wrap: nowrap; }
  }
</style>