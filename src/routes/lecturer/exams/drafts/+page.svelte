<!-- src/routes/lecturer/exams/drafts/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { 
    FileText, Calendar, Clock, Users, 
    ChevronRight, Edit, Trash2, PlusCircle,
    AlertCircle, CheckCircle, BookOpen
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const { drafts, statsMap, draftCount } = data;

  function formatDate(d: string | null | undefined) {
    if (!d) return 'Not scheduled';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getQuestionCount(exam: any) {
    return exam._count?.questions || 0;
  }

  function getStudentCount(exam: any) {
    const stats = (statsMap ?? {})[exam.id];
    return stats?.total || 0;
  }
</script>

<svelte:head><title>My Drafts — MOUAU eTest</title></svelte:head>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-main">
      <div>
        <h1>My Drafts</h1>
        <p class="subtitle">{draftCount} draft exam{draftCount !== 1 ? 's' : ''} in progress</p>
      </div>
      <a href="/lecturer/exams/create" class="btn-primary">
        <PlusCircle size={14} /> Create New Exam
      </a>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(100,116,139,0.1); color: #64748b;">
        <FileText size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{draftCount}</span>
        <span class="stat-label">Total Drafts</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <BookOpen size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">
          {drafts.reduce((acc, e) => acc + getQuestionCount(e), 0)}
        </span>
        <span class="stat-label">Total Questions</span>
      </div>
    </div>
  </div>

  <!-- Drafts List -->
  {#if drafts.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><FileText size={36} strokeWidth={1.2} /></div>
      <p class="empty-title">No drafts yet</p>
      <p class="empty-sub">Create a new exam to get started with your drafts.</p>
      <a href="/lecturer/exams/create" class="btn-primary">
        <PlusCircle size={14} /> Create New Exam
      </a>
    </div>
  {:else}
    <div class="drafts-grid">
      {#each drafts as exam}
        <div class="draft-card">
          <div class="card-top">
            <span class="course-badge">{exam.course?.code}</span>
            <span class="draft-badge">Draft</span>
          </div>
          
          <h3 class="draft-title">{exam.title}</h3>
          <p class="draft-course">{exam.course?.title}</p>
          
          <div class="draft-meta">
            <span class="meta-item">
              <Clock size={12} /> {exam.durationMinutes} min
            </span>
            <span class="meta-item">
              <FileText size={12} /> {getQuestionCount(exam)} questions
            </span>
            <span class="meta-item">
              <Users size={12} /> {getStudentCount(exam)} students
            </span>
          </div>
          
          <div class="draft-actions">
            <a href={`/lecturer/exams/${exam.id}/questions`} class="action-btn primary">
              <Edit size={14} /> Add Questions
            </a>
            <a href={`/lecturer/exams/${exam.id}`} class="action-btn outline">
              Manage <ChevronRight size={12} />
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-main {
    display: flex; justify-content: space-between; align-items: center;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.82rem; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .btn-primary:hover { background: var(--lc-700); transform: translateY(-1px); }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex; align-items: center; gap: 0.75rem;
  }

  .stat-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .stat-content {
    display: flex; flex-direction: column;
  }

  .stat-value {
    font-size: 1.1rem; font-weight: 800; color: var(--color-text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.6rem; font-weight: 600; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.75rem; padding: 4rem 2rem; text-align: center;
    background: var(--color-surface); border: 1.5px dashed var(--color-border);
    border-radius: 0.875rem;
  }

  .empty-icon {
    width: 64px; height: 64px; border-radius: 1rem;
    background: var(--lc-soft); border: 1px solid rgba(79,70,229,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--lc-600); margin-bottom: 0.25rem;
  }

  .empty-title {
    font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0;
  }
  .empty-sub {
    font-size: 0.82rem; color: var(--color-muted); margin: 0;
  }

  .drafts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  .draft-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 1.125rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  }
  .draft-card:hover {
    border-color: rgba(79,70,229,0.25);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-1px);
  }

  .card-top {
    display: flex; justify-content: space-between; align-items: center;
  }

  .course-badge {
    font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .draft-badge {
    font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.6rem;
    background: rgba(100,116,139,0.1); color: #64748b;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .draft-title {
    font-size: 0.9rem; font-weight: 700; color: var(--color-text);
    margin: 0; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

  .draft-course {
    font-size: 0.78rem; color: var(--color-muted); margin: -0.25rem 0 0;
  }

  .draft-meta {
    display: flex; gap: 0.75rem; flex-wrap: wrap;
  }

  .meta-item {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
  }

  .draft-actions {
    display: flex; gap: 0.4rem; margin-top: auto; padding-top: 0.25rem;
  }

  .action-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.75rem; font-weight: 700;
    text-decoration: none; cursor: pointer; font-family: inherit;
    transition: all 0.15s; white-space: nowrap;
  }
  .action-btn.primary {
    background: var(--lc-600); color: white; border: none;
  }
  .action-btn.primary:hover { background: var(--lc-700); }
  .action-btn.outline {
    background: transparent; border: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .action-btn.outline:hover { border-color: var(--lc-600); color: var(--lc-600); background: var(--lc-soft); }

  @media (max-width: 768px) {
    .header-main { flex-direction: column; align-items: stretch; gap: 0.75rem; }
    .drafts-grid { grid-template-columns: 1fr; }
  }
</style>