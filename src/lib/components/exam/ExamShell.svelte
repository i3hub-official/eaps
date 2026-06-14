<!-- src/lib/components/exam/ExamShell.svelte -->
<script lang="ts">
  import type { ExamConfig, ExamSessionState, Question, StudentAnswerInput } from '$lib/types/exam.js';
  import QuestionRenderer from './QuestionRenderer.svelte';
  import ExamTimer        from './ExamTimer.svelte';
  import FaceVerifyModal  from './FaceVerifyModal.svelte';
  import { goto }         from '$app/navigation';
  import { onMount }      from 'svelte';

  interface Props {
    examId: string;
    config: ExamConfig;
    session: ExamSessionState | null;
    questions: Question[];
    initialAnswers: StudentAnswerInput[];
    faceVerified: boolean;
    needsStart: boolean;
  }

  let {
    examId,
    config,
    session,
    questions,
    initialAnswers,
    faceVerified: initialFaceVerified,
    needsStart
  }: Props = $props();

  // ── State ─────────────────────────────────────────────────────────────────
  let answers      = $state<StudentAnswerInput[]>(initialAnswers);
  let currentIdx   = $state(session?.currentQuestionIndex ?? 0);
  let showFace     = $state(!initialFaceVerified);
  let showOverview = $state(false);
  let showReview   = $state(false);
  let isSubmitting = $state(false);
  let timerRef: ExamTimer;

  const totalQuestions = $derived(questions.length);
  const currentQ       = $derived(questions[currentIdx] ?? null);
  const currentAnswer  = $derived(
    currentQ ? (answers.find(a => a.questionId === currentQ.id) ?? null) : null
  );
  const answeredCount  = $derived(
    answers.filter(a => a.selectedOption !== null || (a.textAnswer !== null && a.textAnswer !== '')).length
  );

  // ── Start exam if needed ──────────────────────────────────────────────────
  onMount(async () => {
    if (needsStart) {
      const res = await fetch(`/api/exam/${examId}/start`, { method: 'POST' });
      if (!res.ok) {
        alert('Failed to start exam. Please try again.');
        goto('/student');
        return;
      }
      const data = await res.json();
      // Reload page to get fresh session data
      window.location.reload();
    }
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleAnswer(ans: StudentAnswerInput) {
    const idx = answers.findIndex(a => a.questionId === ans.questionId);
    if (idx >= 0) {
      answers[idx] = ans;
    } else {
      answers = [...answers, ans];
    }
    debouncedSave(ans);
  }

  let saveTimeout: ReturnType<typeof setTimeout>;
  function debouncedSave(ans: StudentAnswerInput) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveAnswer(ans), 800);
  }

 async function saveAnswer(ans: StudentAnswerInput) {
    if (!session) return;
    try {
      const res = await fetch(`/api/exam/${examId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          questionId: ans.questionId,
          selectedOption: ans.selectedOption,
          textAnswer: ans.textAnswer,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (typeof result.timeRemainingSecs === 'number') {
          timerRef?.sync(result.timeRemainingSecs);
        }
      } else if (res.status === 410) {
        // Server says time's up — stop fighting it, submit immediately.
        await submitExam();
      } else {
        queueForRetry(ans);
      }
    } catch {
      queueForRetry(ans);
    }
  }

  let offlineQueue: StudentAnswerInput[] = [];
  function queueForRetry(ans: StudentAnswerInput) {
    const idx = offlineQueue.findIndex(a => a.questionId === ans.questionId);
    if (idx >= 0) offlineQueue[idx] = ans;
    else offlineQueue.push(ans);
  }

  async function syncOffline() {
    if (!session || offlineQueue.length === 0) return;
    const queue = [...offlineQueue];
    offlineQueue = [];
    for (const ans of queue) await saveAnswer(ans);
  }

  function prev() { if (currentIdx > 0) currentIdx--; }
  function next() { if (currentIdx < totalQuestions - 1) currentIdx++; }
  function gotoQuestion(i: number) { currentIdx = i; showOverview = false; showReview = false; }

  async function submitExam() {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      await syncOffline();
      const res = await fetch(`/api/exam/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session?.id }),
      });
      if (res.ok) {
        goto('/student/results');
      } else {
        alert('Failed to submit. Please try again.');
      }
    } finally {
      isSubmitting = false;
    }
  }

  function onFaceSuccess() { showFace = false; }
  function onFaceCancel() { goto('/student'); }

  function onKey(e: KeyboardEvent) {
    if (showFace || showOverview || showReview) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="exam-shell">
  {#if showFace}
    <FaceVerifyModal
      {examId}
      onSuccess={onFaceSuccess}
      onCancel={onFaceCancel}
    />
  {/if}

  <header class="exam-header">
    <div class="exam-info">
      <h1>{config.title}</h1>
      <span class="meta">Question {currentIdx + 1} of {totalQuestions} · {answeredCount} answered</span>
    </div>
    {#if session}
      <ExamTimer
        bind:this={timerRef}
        totalSeconds={config.durationMinutes * 60}
        remainingSeconds={session.timeRemainingSecs}
        onTimeUp={submitExam}
      />
    {/if}
    <button class="overview-btn" onclick={() => showOverview = true}>
      Overview
    </button>
  </header>

  <main class="exam-main">
    {#if showOverview}
      <div class="overview-panel">
        <h2>Question Overview</h2>
        <div class="q-grid">
          {#each questions as q, i}
            {@const ans = answers.find(a => a.questionId === q.id)}
            {@const hasAnswer = ans && (ans.selectedOption !== null || (ans.textAnswer !== null && ans.textAnswer !== ''))}
            <button
              class="q-pill"
              class:answered={hasAnswer}
              class:current={i === currentIdx}
              onclick={() => gotoQuestion(i)}
            >
              {i + 1}
            </button>
          {/each}
        </div>
        <button class="close-btn" onclick={() => showOverview = false}>Close</button>
      </div>
    {:else if showReview}
      <div class="review-panel">
        <h2>Review Answers</h2>
        {#each questions as q, i}
          <div class="review-item">
            <span class="review-num">{i + 1}</span>
            <QuestionRenderer question={q} answer={answers.find(a => a.questionId === q.id) ?? null} mode="review" onAnswer={() => {}} />
          </div>
        {/each}
        <div class="review-actions">
          <button class="back-btn" onclick={() => showReview = false}>Back to Exam</button>
          <button class="submit-btn" onclick={submitExam} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Exam'}
          </button>
        </div>
      </div>
    {:else if currentQ}
      <div class="question-wrap">
        <QuestionRenderer
          question={currentQ}
          answer={currentAnswer}
          mode="exam"
          onAnswer={handleAnswer}
        />
      </div>
    {/if}
  </main>

  {#if !showOverview && !showReview}
    <footer class="exam-footer">
      <button class="nav-btn" onclick={prev} disabled={currentIdx === 0}>
        ← Previous
      </button>
      <button class="review-toggle" onclick={() => showReview = true}>
        Review & Submit
      </button>
      <button class="nav-btn primary" onclick={next} disabled={currentIdx === totalQuestions - 1}>
        Next →
      </button>
    </footer>
  {/if}
</div>

<style>
  .exam-shell {
    display: flex; flex-direction: column;
    height: 100vh; height: 100dvh;
    background: var(--color-bg, #f9fafb);
  }
  .exam-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 1.25rem;
    background: var(--color-surface, white);
    border-bottom: 1.5px solid var(--color-border, #e5e7eb);
    flex-shrink: 0;
  }
  .exam-info { flex: 1; min-width: 0; }
  .exam-info h1 { font-size: 0.95rem; font-weight: 800; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .exam-info .meta { font-size: 0.72rem; color: var(--color-muted, #6b7280); }
  .overview-btn {
    padding: 0.5rem 1rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
    border-radius: 0.5rem;
    font-size: 0.78rem; font-weight: 700;
    cursor: pointer; white-space: nowrap;
  }
  .overview-btn:hover { border-color: var(--g500, #22c55e); color: var(--g600, #16a34a); }
  .exam-main {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex; flex-direction: column;
  }
  .question-wrap {
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    padding: 2rem;
  }
  .overview-panel, .review-panel {
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    padding: 1.5rem;
  }
  .overview-panel h2, .review-panel h2 { font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; }
  .q-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .q-pill {
    width: 44px; height: 44px;
    border: 2px solid var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
    border-radius: 0.5rem;
    font-size: 0.85rem; font-weight: 700;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .q-pill:hover { border-color: var(--g400, #4ade80); }
  .q-pill.answered { background: var(--g50, #f0fdf4); border-color: var(--g500, #22c55e); color: var(--g700, #15803d); }
  .q-pill.current { box-shadow: 0 0 0 3px rgba(34,197,94,0.2); }
  .close-btn, .back-btn {
    padding: 0.625rem 1.25rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
    border-radius: 0.5rem;
    font-size: 0.85rem; font-weight: 700;
    cursor: pointer;
  }
  .review-item {
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    padding: 1.25rem 0;
  }
  .review-item:last-child { border-bottom: none; }
  .review-num {
    display: inline-block;
    width: 28px; height: 28px;
    background: var(--color-bg, #f9fafb);
    border-radius: 50%;
    text-align: center;
    line-height: 28px;
    font-size: 0.75rem; font-weight: 800;
    margin-bottom: 0.5rem;
  }
  .review-actions {
    display: flex; gap: 1rem; justify-content: flex-end;
    margin-top: 1.5rem; padding-top: 1rem;
    border-top: 1.5px solid var(--color-border, #e5e7eb);
  }
  .submit-btn {
    padding: 0.75rem 1.5rem;
    background: var(--g500, #22c55e);
    color: white;
    border: none;
    border-radius: 0.625rem;
    font-size: 0.9rem; font-weight: 800;
    cursor: pointer;
    transition: all 0.15s;
  }
  .submit-btn:hover:not(:disabled) { background: var(--g600, #16a34a); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .exam-footer {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 1.25rem;
    background: var(--color-surface, white);
    border-top: 1.5px solid var(--color-border, #e5e7eb);
    flex-shrink: 0;
  }
  .nav-btn {
    padding: 0.625rem 1.25rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    background: var(--color-surface, white);
    border-radius: 0.5rem;
    font-size: 0.85rem; font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .nav-btn:hover:not(:disabled) { border-color: var(--g400, #4ade80); }
  .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .nav-btn.primary { background: var(--g500, #22c55e); color: white; border-color: var(--g500, #22c55e); }
  .nav-btn.primary:hover:not(:disabled) { background: var(--g600, #16a34a); }
  .review-toggle {
    padding: 0.625rem 1rem;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1.5px solid #dbeafe;
    border-radius: 0.5rem;
    font-size: 0.78rem; font-weight: 700;
    cursor: pointer;
  }
  .review-toggle:hover { background: #dbeafe; }
  @media (max-width: 760px) {
    .exam-header { flex-wrap: wrap; }
    .exam-info h1 { font-size: 0.85rem; }
  }
</style>