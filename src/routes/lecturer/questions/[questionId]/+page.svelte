<!-- src/routes/lecturer/questions/[questionId]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ChevronLeft, Edit, Trash2, Copy, Link2,
    HelpCircle, CheckCircle, XCircle, FileText,
    BookOpen, Clock, BarChart2, Users,
    ArrowUp, ArrowDown, List
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { question, usageStats, correctRate } = data;

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      mcq: 'Multiple Choice',
      true_false: 'True/False',
      fill_in_the_blank: 'Fill in the Blank',
      essay: 'Essay'
    };
    return labels[type] || type;
  }

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      mcq: '#2563eb',
      true_false: '#7c3aed',
      fill_in_the_blank: '#16a34a',
      essay: '#d97706'
    };
    return colors[type] || '#64748b';
  }

  function getTypeIcon(type: string) {
    const icons: Record<string, any> = {
      mcq: List,
      true_false: CheckCircle,
      fill_in_the_blank: FileText,
      essay: FileText
    };
    return icons[type] || HelpCircle;
  }

  function copyQuestion() {
    navigator.clipboard?.writeText(question.body).then(() => {
      showToast('Question copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'warn');
    });
  }

  function deleteQuestion() {
    if (!confirm('Delete this question? This action cannot be undone.')) return;
    showToast('Question deleted', 'success');
  }
</script>

<svelte:head><title>Question Details — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<HelpCircle size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-top">
      <a href="/lecturer/questions" class="back-link">
        <ChevronLeft size={14} /> Back to Question Bank
      </a>
      <div class="header-actions">
        <button class="action-btn" onclick={copyQuestion}>
          <Copy size={14} /> Copy
        </button>
        <a href={`/lecturer/questions/${question.id}/edit`} class="action-btn primary">
          <Edit size={14} /> Edit
        </a>
        <button class="action-btn danger" onclick={deleteQuestion}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
    <div class="header-main">
      <div>
        <div class="question-badges">
          <span class="type-badge" style="background:{getTypeColor(question.type)}20; color:{getTypeColor(question.type)};">
            <svelte:component this={getTypeIcon(question.type)} size={12} />
            {getTypeLabel(question.type)}
          </span>
          <span class="exam-badge">
            <BookOpen size={12} />
            {question.exam.course?.code} - {question.exam.title}
          </span>
        </div>
        <h1>{question.body}</h1>
        <p class="subtitle">
          {question.marks} mark{question.marks !== 1 ? 's' : ''} •
          Created {formatDate(question.createdAt)} •
          {question.topic ? `Topic: ${question.topic}` : 'No topic'}
        </p>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #4f46e5;">
        <Users size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{usageStats.totalAttempts}</span>
        <span class="stat-label">Total Attempts</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
        <CheckCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{usageStats.correctCount}</span>
        <span class="stat-label">Correct</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
        <XCircle size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{usageStats.incorrectCount}</span>
        <span class="stat-label">Incorrect</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: rgba(245,158,11,0.1); color: #d97706;">
        <BarChart2 size={18} />
      </div>
      <div class="stat-content">
        <span class="stat-value">{correctRate}%</span>
        <span class="stat-label">Correct Rate</span>
      </div>
    </div>
  </div>

  <!-- Details -->
  <div class="details-grid">
    <div class="card">
      <div class="card-header">
        <span class="card-icon"><HelpCircle size={16} /></span>
        <div><h2>Question Details</h2></div>
      </div>
      <div class="card-body">
        <div class="detail-row">
          <span class="detail-label">Question</span>
          <p class="detail-value">{question.body}</p>
        </div>
        <div class="detail-row">
          <span class="detail-label">Type</span>
          <span class="detail-value">{getTypeLabel(question.type)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Marks</span>
          <span class="detail-value">{question.marks}</span>
        </div>
        {#if question.topic}
          <div class="detail-row">
            <span class="detail-label">Topic</span>
            <span class="detail-value">{question.topic}</span>
          </div>
        {/if}
        <div class="detail-row">
          <span class="detail-label">Exam</span>
          <span class="detail-value">{question.exam.title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Course</span>
          <span class="detail-value">{question.exam.course?.code} - {question.exam.course?.title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Created</span>
          <span class="detail-value">{formatDate(question.createdAt)}</span>
        </div>
      </div>
    </div>

    {#if question.type === 'mcq' && question.options.length > 0}
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><List size={16} /></span>
          <div><h2>Options</h2></div>
        </div>
        <div class="card-body options-list">
          {#each question.options as opt, i}
            <div class="option-item" class:correct={opt.isCorrect}>
              <span class="option-letter">{String.fromCharCode(65 + i)}.</span>
              <span class="option-text">{opt.optionText}</span>
              {#if opt.isCorrect}
                <span class="correct-badge"><CheckCircle size={12} /> Correct</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if question.type === 'true_false' && question.options.length > 0}
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><CheckCircle size={16} /></span>
          <div><h2>True/False</h2></div>
        </div>
        <div class="card-body options-list">
          {#each question.options as opt, i}
            <div class="option-item" class:correct={opt.isCorrect}>
              <span class="option-letter">{opt.optionText}:</span>
              <span class="option-text">{opt.isCorrect ? 'Correct' : 'Incorrect'}</span>
              {#if opt.isCorrect}
                <span class="correct-badge"><CheckCircle size={12} /> Correct</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if question.type === 'fill_in_the_blank' && question.fitbAnswers.length > 0}
      <div class="card">
        <div class="card-header">
          <span class="card-icon"><FileText size={16} /></span>
          <div><h2>Accepted Answers</h2></div>
        </div>
        <div class="card-body">
          <div class="fitb-answers">
            {#each question.fitbAnswers as answer}
              <span class="fitb-answer" class:primary={answer.isPrimary}>
                {answer.acceptedAnswer}
                {#if answer.isPrimary}<span class="primary-badge">Primary</span>{/if}
              </span>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .toast-stack {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    z-index: 9999; display: flex; flex-direction: column; gap: .35rem;
    pointer-events: none;
  }
  .toast {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .5rem .9rem; border-radius: .55rem;
    font-size: .79rem; font-weight: 600; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0,0,0,.1); max-width: 300px;
    pointer-events: auto;
  }
  .toast-info { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
  .toast-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .toast-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

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

  .header-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.15s;
  }
  .back-link:hover { color: var(--color-text); }

  .header-actions {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  .action-btn {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    border-radius: 0.5rem;
    font-size: 0.75rem; font-weight: 600;
    text-decoration: none; cursor: pointer;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    transition: all 0.15s;
    font-family: inherit;
  }
  .action-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .action-btn.primary {
    background: var(--lc-600); color: white; border-color: var(--lc-600);
  }
  .action-btn.primary:hover { background: var(--lc-700); }
  .action-btn.danger {
    border-color: #dc2626; color: #dc2626;
  }
  .action-btn.danger:hover { background: #dc2626; color: white; }

  .header-main h1 {
    font-size: 1.2rem; font-weight: 800; color: var(--color-text);
    margin: 0.5rem 0;
    line-height: 1.4;
  }

  .question-badges {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  .type-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }

  .exam-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 999px; color: var(--color-muted);
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0;
  }

  .stats-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;
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

  .details-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
  }

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: visible;
  }

  .card-header {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    border-radius: 1rem 1rem 0 0;
  }

  .card-icon {
    width: 32px; height: 32px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--lc-soft); border-radius: 0.5rem;
    color: var(--lc-600);
  }

  .card-header h2 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
    margin: 0;
  }

  .card-body {
    padding: 1.125rem 1.25rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  }

  .detail-row {
    display: flex; justify-content: space-between; padding: 0.35rem 0;
    border-bottom: 1px solid var(--color-border);
  }
  .detail-row:last-child { border-bottom: none; }

  .detail-label {
    font-size: 0.75rem; color: var(--color-muted);
  }
  .detail-value {
    font-size: 0.75rem; font-weight: 600; color: var(--color-text);
    text-align: right;
    max-width: 60%;
  }
  .detail-value p {
    margin: 0;
  }

  .options-list {
    gap: 0.4rem;
  }

  .option-item {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: 0.4rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
  }
  .option-item.correct {
    border-color: #16a34a;
    background: rgba(22,163,74,0.05);
  }

  .option-letter {
    font-weight: 700; color: var(--color-muted);
    min-width: 24px;
  }
  .option-text { flex: 1; font-size: 0.8rem; color: var(--color-text); }

  .correct-badge {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.65rem; font-weight: 700; color: #16a34a;
  }

  .fitb-answers {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  .fitb-answer {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.3rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
  }
  .fitb-answer.primary {
    border-color: var(--lc-600);
    background: var(--lc-soft);
  }

  .primary-badge {
    font-size: 0.55rem; font-weight: 700; color: var(--lc-600);
    background: var(--color-surface);
    padding: 0.05rem 0.3rem;
    border-radius: 999px;
    border: 1px solid var(--lc-600);
  }

  @media (max-width: 1024px) {
    .details-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .header-top { flex-direction: column; align-items: stretch; }
    .header-actions { justify-content: stretch; }
    .header-actions .action-btn { flex: 1; justify-content: center; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: 1fr; }
  }
</style>