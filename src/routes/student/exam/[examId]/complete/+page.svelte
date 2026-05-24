<!-- src/routes/(student)/exam/[examId]/complete/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CheckCircle, XCircle, Trophy, Medal, Star, ArrowRight, GraduationCap, Clock, Users, Award, Loader } from 'lucide-svelte';
  
  let { data }: { data: PageData } = $props();
  const { exam, result } = data;

  const GRADE_COLOR: Record<string, string> = {
    A: '#16a34a', B: '#3b82f6', C: '#f59e0b', D: '#8b5cf6', E: '#ef4444', F: '#ef4444',
  };

  let showConfetti = $state(false);
  
  function getGradeIcon(grade: string) {
    if (grade === 'A') return Trophy;
    if (grade === 'B') return Medal;
    if (grade === 'C') return Star;
    return Award;
  }
</script>

<svelte:head>
  <title>Exam Complete — MOUAU eTest</title>
</svelte:head>

<div class="page">
  <div class="card">
    {#if result}
      <!-- Result Header -->
      <div class="result-header">
        <div class="grade-circle" class:pass={result.passed} class:fail={!result.passed}>
          {#if result.passed}
            <CheckCircle size={40} strokeWidth={1.5} />
          {:else}
            <XCircle size={40} strokeWidth={1.5} />
          {/if}
        </div>
        
        <h1 class="result-title" class:pass-text={result.passed} class:fail-text={!result.passed}>
          {result.passed ? 'Excellent Work!' : 'Exam Submitted'}
        </h1>
        <p class="exam-name">{exam.title}</p>
      </div>

      <!-- Statistics Display -->
      {#if exam.showResultAfter}
        <div class="stats-container">
          <div class="stat-card">
            <div class="stat-value">{Number(result.percentage ?? 0).toFixed(1)}%</div>
            <div class="stat-label">
              <GraduationCap size={12} />
              Score
            </div>
          </div>
          
          <div class="stat-divider"></div>
          
          <div class="stat-card">
            <div class="stat-value">{result.correct}/{result.totalQuestions}</div>
            <div class="stat-label">
              <CheckCircle size={12} />
              Correct
            </div>
          </div>
          
          <div class="stat-divider"></div>
          
          <div class="stat-card">
            <div class="stat-value" class:pass-text={result.passed} class:fail-text={!result.passed}>
              {result.passed ? 'Pass' : 'Fail'}
            </div>
            <div class="stat-label">
              <Award size={12} />
              Result
            </div>
          </div>
        </div>

        <!-- Grade Badge -->
        <div class="grade-badge" style="background: {GRADE_COLOR[result.grade]}20; border-color: {GRADE_COLOR[result.grade]}">
          <span class="grade-letter" style="color: {GRADE_COLOR[result.grade]}">
            {result.grade}
          </span>
          <span class="grade-label">Grade</span>
        </div>

        <!-- Performance Message -->
        <div class="performance-message" class:pass={result.passed}>
          {#if result.passed}
            <p>Congratulations on passing the examination. Your performance demonstrates strong understanding of the subject matter.</p>
          {:else}
            <p>You can review your answers and consult with your lecturer for areas of improvement.</p>
          {/if}
        </div>
      {:else}
        <div class="pending-container">
          <div class="pending-icon">
            <Clock size={48} strokeWidth={1.5} />
          </div>
          <p class="pending-message">Your results will be released by your lecturer.</p>
          <div class="pending-badge">
            <Users size={14} />
            <span>Under Review</span>
          </div>
        </div>
      {/if}
    {:else}
      <!-- No Result State -->
      <div class="submission-container">
        <div class="submission-icon">
          <CheckCircle size={64} strokeWidth={1} />
        </div>
        <h1 class="submission-title">Exam Submitted</h1>
        <p class="exam-name">{exam.title}</p>
        <div class="submission-message">
          <p>Your submission has been received and encrypted.</p>
          <p class="small">Results will be available after lecturer review.</p>
        </div>
      </div>
    {/if}

    <!-- Action Buttons -->
    <div class="action-buttons">
      <a href="/student" class="btn-primary">
        <GraduationCap size={16} />
        Back to Dashboard
        <ArrowRight size={14} />
      </a>
      
      {#if result && exam.showResultAfter && !result.passed}
        <a href="/exam/{exam.id}/review" class="btn-secondary">
          <Star size={14} />
          Review Answers
        </a>
      {/if}
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--color-bg);
    position: relative;
    overflow: hidden;
  }

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.5rem;
    padding: 3rem 2rem;
    max-width: 480px;
    width: 100%;
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;
  }

  /* Result Header */
  .result-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .grade-circle {
    width: 5rem;
    height: 5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    transition: all 0.3s ease;
  }

  .grade-circle.pass {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    color: #16a34a;
    border: 2px solid #16a34a;
  }

  .grade-circle.fail {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    color: #dc2626;
    border: 2px solid #dc2626;
  }

  .result-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  .pass-text {
    color: #16a34a;
  }

  .fail-text {
    color: #dc2626;
  }

  .exam-name {
    color: var(--color-muted);
    font-size: 0.9rem;
    margin: 0;
  }

  /* Statistics */
  .stats-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 1.5rem;
    background: var(--color-surface-elevated);
    border-radius: 1rem;
    margin: 1.5rem 0;
  }

  .stat-card {
    text-align: center;
    flex: 1;
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
    color: var(--color-text);
  }

  .stat-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  .stat-divider {
    width: 1px;
    height: 2rem;
    background: var(--color-border);
  }

  /* Grade Badge */
  .grade-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    border: 1px solid;
    width: fit-content;
    margin: 0 auto 1rem;
  }

  .grade-letter {
    font-size: 1.25rem;
    font-weight: 800;
  }

  .grade-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  /* Performance Message */
  .performance-message {
    padding: 1rem;
    border-radius: 0.75rem;
    margin: 1rem 0;
    font-size: 0.85rem;
    line-height: 1.5;
    text-align: center;
  }

  .performance-message.pass {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .performance-message:not(.pass) {
    background: var(--color-surface-elevated);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }

  /* Pending State */
  .pending-container {
    text-align: center;
    padding: 1rem 0;
  }

  .pending-icon {
    width: 5rem;
    height: 5rem;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, var(--color-surface-elevated) 0%, var(--color-surface) 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
  }

  .pending-message {
    color: var(--color-text);
    font-size: 1rem;
    margin: 0 0 1rem;
  }

  .pending-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface-elevated);
    border-radius: 2rem;
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  /* Submission State */
  .submission-container {
    text-align: center;
    padding: 1rem 0;
  }

  .submission-icon {
    width: 6rem;
    height: 6rem;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #16a34a;
  }

  .submission-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  .submission-message {
    margin: 1rem 0;
  }

  .submission-message p {
    color: var(--color-muted);
    font-size: 0.9rem;
    margin: 0.25rem 0;
  }

  .small {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 2rem;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-primary);
    color: white;
    border-radius: 0.75rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
    border: none;
    cursor: pointer;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    filter: brightness(1.05);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: transparent;
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: translateY(-1px);
  }

  /* Animations */
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .card {
    animation: slideUp 0.4s ease-out;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .card {
      padding: 2rem 1.5rem;
    }

    .stats-container {
      flex-direction: column;
      gap: 1rem;
    }

    .stat-divider {
      width: 2rem;
      height: 1px;
    }

    .grade-circle {
      width: 4rem;
      height: 4rem;
    }

    .result-title {
      font-size: 1.5rem;
    }
  }
</style>