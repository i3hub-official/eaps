<!-- src/lib/components/exam/ExamShell.svelte -->
<!-- Replace the <script> block only — template and styles stay the same -->
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
    questions:           Question[];
    initialAnswers:      StudentAnswerInput[];
    faceVerified:        boolean;
    needsStart:          boolean;
    enrolledDescriptor?: number[] | null;
  }

  let {
    examId,
    config,
    session,
    questions,
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

  const totalQuestions = $derived(questions.length);
  const currentQ       = $derived(questions[currentIdx] ?? null);
  const currentAnswer  = $derived(
    currentQ ? (answers.find(a => a.questionId === currentQ.id) ?? null) : null
  );
  const answeredCount  = $derived(
    answers.filter(a =>
      a.selectedOption !== null ||
      (a.textAnswer !== null && a.textAnswer !== '')
    ).length
  );

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
    }
  });

  // ── Auto-submit on window close / unload ──────────────────────────────
  // Saves whatever is in the offline queue before the page unloads.
  // This is a best-effort — browsers limit how long beforeunload handlers run.
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    // Flush offline queue synchronously via sendBeacon
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
    // Let the browser show its own "Leave?" prompt so the student knows
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
        goto('/student/exams?examId=' + examId); // will re-load and show 'flagged' state
      }
    } catch {
      // Network error — ignore, timer will still auto-submit
    }
  }

  // ── Tab / window visibility violations ────────────────────────────────
  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      handleViolation('no_face_detected'); // reuse as "tab switched away"
      // Better: log as tab_switch — but violation endpoint only accepts FlagType
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
      const res = await fetch(`/api/exam/${examId}/answer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId:      session.id,
          questionId:     ans.questionId,
          selectedOption: ans.selectedOption,
          textAnswer:     ans.textAnswer,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (typeof result.timeRemainingSecs === 'number') {
          timerRef?.sync(result.timeRemainingSecs);
        }
      } else if (res.status === 410) {
        // Time's up server-side
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

    // Exit fullscreen gracefully
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

      if (res.ok) {
        goto('/student/results?examId=' + examId);
      } else if (res.status === 409) {
        // Already submitted — go to results anyway
        goto('/student/results?examId=' + examId);
      } else {
        // Keep trying — do not re-enable isSubmitting
        alert('Submit failed. Please try again or contact your invigilator.');
        isSubmitting = false;
      }
    } catch {
      // Network failure — keep isSubmitting=true and retry in 5s
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

    <!-- Face Monitor — shown in top bar during exam -->
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
          {#each questions as q, i}
            {@const ans = answers.find(a => a.questionId === q.id)}
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
        {#each questions as q, i}
          <div class="review-item">
            <span class="review-num">{i + 1}</span>
            <QuestionRenderer
              question={q}
              answer={answers.find(a => a.questionId === q.id) ?? null}
              mode="review"
              onAnswer={() => {}}
            />
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