<!-- src/lib/components/exam/ExamShell.svelte -->
<script lang="ts">
  import type { ExamConfig, ExamSessionState, Question, StudentAnswerInput } from '$lib/types/exam.js';
  import QuestionRenderer from './QuestionRenderer.svelte';
  import ExamTimer        from './ExamTimer.svelte';
  import FaceMonitor      from './FaceMonitor.svelte';
  import { goto }         from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    examId:              string;
    config:              ExamConfig;
    session:             ExamSessionState | null;
    /** Total number of questions — known upfront, but NOT the question bodies. */
    totalQuestions:      number;
    initialAnswers:      StudentAnswerInput[];
    faceVerified:        boolean;
    needsStart:          boolean;
    enrolledDescriptor?: number[] | null;
  }

  let {
    examId,
    config,
    session,
    totalQuestions,
    initialAnswers,
    faceVerified: initialFaceVerified,
    needsStart,
    enrolledDescriptor = null,
  }: Props = $props();

  // ── State ─────────────────────────────────────────────────────────────
  let answers      = $state<StudentAnswerInput[]>(initialAnswers);
  let currentIdx   = $state(session?.currentQuestionIndex ?? 0);
  let showOverview = $state(false);
  let showReview   = $state(false);
  let isSubmitting = $state(false);
  let timerRef: ExamTimer;
  let faceMonitorRef: FaceMonitor;

  // ── Question cache ─────────────────────────────────────────────────────
  // Key: display index. Value: fetched Question (no correct-answer data).
  let questionCache = $state<Map<number, Question>>(new Map());
  // Track which indices are currently being fetched to avoid duplicate requests.
  const inflight = new Set<number>();
  // How many questions to prefetch ahead and behind the current index.
  const PREFETCH_WINDOW = 2;

  const currentQ = $derived(questionCache.get(currentIdx) ?? null);
  const currentAnswer = $derived(
    currentQ ? (answers.find(a => a.questionId === currentQ.id) ?? null) : null
  );
  const answeredCount = $derived(
    answers.filter(a =>
      a.selectedOption !== null ||
      (a.textAnswer !== null && a.textAnswer !== '')
    ).length
  );

  // ── Fetch a single question by display index ───────────────────────────
  async function fetchQuestion(index: number): Promise<void> {
    if (!session) return;
    if (index < 0 || index >= totalQuestions) return;
    if (questionCache.has(index)) return;
    if (inflight.has(index)) return;

    inflight.add(index);
    try {
      const res = await fetch(
        `/api/exam/${examId}/question?index=${index}&sessionId=${session.id}`
      );

      if (res.status === 409 || res.status === 410) {
        // Session expired or already submitted
        await submitExam();
        return;
      }
      if (res.status === 423) {
        // Session paused/flagged
        goto('/student/exams');
        return;
      }
      if (!res.ok) {
        console.error(`Failed to fetch question ${index}: ${res.status}`);
        return;
      }

      const data = await res.json() as {
        index: number;
        total: number;
        question: {
          id: string;
          type: string;
          body: string;
          imageUrl: string | null;
          marks: number;
          options: Array<{ id: string; text: string }>;
        };
      };

      // Shape the server response into our client Question type.
      // fitbAnswers is intentionally empty — never revealed during a live exam.
      const q: Question = {
        id:           data.question.id,
        examId:       examId,
        type:         data.question.type as Question['type'],
        body:         data.question.body,
        topic:        null,
        imageUrl:     data.question.imageUrl,
        marks:        data.question.marks,
        displayIndex: data.index,
        options: data.question.options.map((o, i) => ({
          id:           o.id,
          optionText:   o.text,
          displayIndex: i,
        })),
        fitbAnswers: [], // never populated client-side during a live exam
      };

      // Immutably update the cache so Svelte reactivity fires
      questionCache = new Map(questionCache).set(index, q);
    } finally {
      inflight.delete(index);
    }
  }

  // ── Prefetch window around current index ──────────────────────────────
  function prefetchAround(index: number): void {
    for (let i = index - PREFETCH_WINDOW; i <= index + PREFETCH_WINDOW; i++) {
      fetchQuestion(i); // no-op if out of range, already cached, or inflight
    }
  }

  // Trigger fetch + prefetch whenever currentIdx changes
  $effect(() => {
    prefetchAround(currentIdx);
  });

  // ── Start exam if needed ──────────────────────────────────────────────
  onMount(async () => {
    if (needsStart) {
      const res = await fetch(`/api/exam/${examId}/start`, { method: 'POST' });
      if (!res.ok) {
        alert('Failed to start exam. Please try again.');
        goto('/student/exams');
        return;
      }
      window.location.reload();
      return;
    }
    // Initial fetch for starting position + surrounding window
    prefetchAround(currentIdx);
  });

  // ── Auto-submit on window close / unload ──────────────────────────────
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (offlineQueue.length > 0 && session) {
      for (const ans of offlineQueue) {
        navigator.sendBeacon(
          `/api/exam/${examId}/answer`,
          JSON.stringify({
            sessionId:      session.id,
            questionId:     ans.questionId,
            selectedOption: ans.selectedOption ?? null,
            textAnswer:     ans.textAnswer ?? null,
          }),
        );
      }
    }
    e.preventDefault();
    e.returnValue = '';
  }

  // ── Violation handler ─────────────────────────────────────────────────
  async function handleViolation(
    type: 'no_face_detected' | 'multiple_faces' | 'face_mismatch',
    meta?: Record<string, unknown>,
  ) {
    try {
      const res = await fetch(`/api/exam/${examId}/violation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ flagType: type, note: meta ? JSON.stringify(meta) : undefined }),
      });

      if (!res.ok) return;
      const data = await res.json();

      if (data.sessionStatus === 'force_submitted' || data.action === 'auto_submitted') {
        await submitExam();
      } else if (data.sessionStatus === 'flagged') {
        faceMonitorRef?.pause();
        goto('/student/exams?examId=' + examId);
      }
    } catch {
      // Network error — ignore, timer will still auto-submit
    }
  }

  // ── Tab / visibility violations ───────────────────────────────────────
  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      fetch(`/api/exam/${examId}/violation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ flagType: 'tab_switch' }),
      }).catch(() => {});
    }
  }

  function handleFullscreenChange() {
    if (!document.fullscreenElement && !isSubmitting) {
      fetch(`/api/exam/${examId}/violation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ flagType: 'fullscreen_exit' }),
      }).catch(() => {});
    }
  }

  // ── Answer handling ───────────────────────────────────────────────────
  function handleAnswer(ans: StudentAnswerInput) {
    const idx = answers.findIndex(a => a.questionId === ans.questionId);
    if (idx >= 0) answers[idx] = ans;
    else answers = [...answers, ans];
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
   async function saveAnswer(idx: number, value: string) {
  // ...
  const res = await fetch(`/api/exam/${data.examId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, questionId, answer: value }),  // ← HERE
  });

      if (res.ok) {
        const result = await res.json();
        if (typeof result.timeRemainingSecs === 'number') {
          timerRef?.sync(result.timeRemainingSecs);
        }
      } else if (res.status === 410) {
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

  // ── Navigation ────────────────────────────────────────────────────────
  function prev() { if (currentIdx > 0) currentIdx--; }
  function next() { if (currentIdx < totalQuestions - 1) currentIdx++; }
  function gotoQuestion(i: number) { currentIdx = i; showOverview = false; showReview = false; }

  // ── Submit ────────────────────────────────────────────────────────────
  async function submitExam() {
    if (isSubmitting) return;
    isSubmitting = true;

    faceMonitorRef?.stop();
    faceMonitorRef?.pause();

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }

    try {
      await syncOffline();
      const res = await fetch(`/api/exam/${examId}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId: session?.id }),
      });

      if (res.ok || res.status === 409) {
        goto('/student/results?examId=' + examId);
      } else {
        alert('Submit failed. Please try again or contact your invigilator.');
        isSubmitting = false;
      }
    } catch {
      setTimeout(submitExam, 5000);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (showOverview || showReview) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
  }

  onDestroy(() => {
    clearTimeout(saveTimeout);
    faceMonitorRef?.stop();
  });

  // ── Review panel needs the full cached list ───────────────────────────
  // Only questions already fetched are shown; others show a loading placeholder.
  const cachedQuestions = $derived(
    Array.from({ length: totalQuestions }, (_, i) => questionCache.get(i) ?? null)
  );
</script>

<svelte:window
  onkeydown={onKey}
  onbeforeunload={handleBeforeUnload}
  onvisibilitychange={handleVisibilityChange}
/>

<svelte:document onfullscreenchange={handleFullscreenChange} />

<div class="exam-shell">
  <header class="exam-header">
    <div class="exam-info">
      <h1>{config.title}</h1>
      <span class="meta">
        Question {currentIdx + 1} of {totalQuestions} · {answeredCount} answered
      </span>
    </div>

    {#if session && enrolledDescriptor}
      <FaceMonitor
        bind:this={faceMonitorRef}
        {examId}
        sessionId={session.id}
        {enrolledDescriptor}
        onViolation={handleViolation}
      />
    {/if}

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
          {#each { length: totalQuestions } as _, i}
            {@const q = questionCache.get(i)}
            {@const ans = q ? answers.find(a => a.questionId === q.id) : null}
            {@const hasAnswer = ans && (
              ans.selectedOption !== null ||
              (ans.textAnswer !== null && ans.textAnswer !== '')
            )}
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
        {#each cachedQuestions as q, i}
          <div class="review-item">
            <span class="review-num">{i + 1}</span>
            {#if q}
              <QuestionRenderer
                question={q}
                answer={answers.find(a => a.questionId === q.id) ?? null}
                mode="review"
                onAnswer={() => {}}
              />
            {:else}
              <span class="review-loading">Loading…</span>
            {/if}
          </div>
        {/each}
        <div class="review-actions">
          <button class="back-btn" onclick={() => showReview = false}>Back to Exam</button>
          <button class="submit-btn" onclick={submitExam} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Exam'}
          </button>
        </div>
      </div>

    {:else}
      <div class="question-wrap">
        {#if currentQ}
          <QuestionRenderer
            question={currentQ}
            answer={currentAnswer}
            mode="exam"
            onAnswer={handleAnswer}
          />
        {:else}
          <!-- Question is being fetched — show a non-revealing skeleton -->
          <div class="question-skeleton" aria-busy="true" aria-label="Loading question">
            <div class="skeleton-body"></div>
            <div class="skeleton-option"></div>
            <div class="skeleton-option"></div>
            <div class="skeleton-option"></div>
            <div class="skeleton-option"></div>
          </div>
        {/if}
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
      <button
        class="nav-btn primary"
        onclick={next}
        disabled={currentIdx === totalQuestions - 1}
      >
        Next →
      </button>
    </footer>
  {/if}
</div>

<style>
  .question-skeleton {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-body {
    height: 3.5rem;
    border-radius: 0.5rem;
    background: var(--color-border, #e5e7eb);
  }

  .skeleton-option {
    height: 3rem;
    border-radius: 0.75rem;
    background: var(--color-border, #e5e7eb);
    opacity: 0.6;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  .review-loading {
    color: var(--color-muted, #6b7280);
    font-size: 0.875rem;
    padding: 0.5rem 0;
  }
</style>