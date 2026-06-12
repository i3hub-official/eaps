<!-- src/routes/student/exam/[examId]/session/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto }               from '$app/navigation';
  import { browser }            from '$app/environment';
  import KioskShell             from '$lib/components/exam/KioskShell.svelte';
  import FaceMonitor            from '$lib/components/exam/FaceMonitor.svelte';
  import ExamTimer              from '$lib/components/exam/ExamTimer.svelte';
  import QuestionMCQ            from '$lib/components/exam/QuestionMCQ.svelte';
  import QuestionFITB           from '$lib/components/exam/QuestionFITB.svelte';
  import ViolationWarning       from '$lib/components/exam/ViolationWarning.svelte';
  import type { PageData }      from './$types';

  let { data }: { data: PageData } = $props();

  // ── State ─────────────────────────────────────────────────────────────────
  let currentIndex    = $state(0);
  let answers         = $state<Record<string, { selectedOption: string | null; textAnswer: string | null }>>(
    { ...data.answersMap }
  );
  let timeRemaining   = $state(data.session.timeRemainingSecs);
  let submitting      = $state(false);
  let submitted       = $state(false);
  let violationCount  = $state(data.session.violationCount);
  let showWarning     = $state(false);
  let lastViolationType = $state('');
  let lastViolationAction = $state('');
  let faceMonitor: FaceMonitor;

  const questions = data.questions;
  const session   = data.session;
  const exam      = data.exam;

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentQuestion  = $derived(questions[currentIndex]);
  const answeredCount    = $derived(Object.keys(answers).length);
  const totalQuestions   = $derived(questions.length);
  const isFirst          = $derived(currentIndex === 0);
  const isLast           = $derived(currentIndex === totalQuestions - 1);

  // ── Answer saving ─────────────────────────────────────────────────────────
  async function saveAnswer(questionId: string, selectedOption: string | null, textAnswer: string | null) {
    answers = { ...answers, [questionId]: { selectedOption, textAnswer } };

    await fetch(`/api/exam/${exam.id}/answer`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id:      session.id,
        question_id:     questionId,
        selected_option: selectedOption,
        text_answer:     textAnswer,
        time_spent_secs: 0,
      }),
    }).catch(() => {});
  }

  function onMCQAnswer(questionId: string, optionId: string) {
    saveAnswer(questionId, optionId, null);
  }

  function onFITBAnswer(questionId: string, text: string) {
    saveAnswer(questionId, null, text);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function prev() { if (!isFirst) currentIndex--; }
  function next() { if (!isLast) currentIndex++; }
  function goTo(i: number) { currentIndex = i; }

  // ── Timer sync ────────────────────────────────────────────────────────────
  let syncInterval: ReturnType<typeof setInterval> | null = null;

  function startTimeSync() {
    syncInterval = setInterval(async () => {
      if (submitted || timeRemaining <= 0) return;
      await fetch(`/api/exam/${exam.id}/answer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:       'time_sync',
          session_id: session.id,
          remaining:  timeRemaining,
        }),
      }).catch(() => {});
    }, 15_000);
  }

  function onTimerTick(secs: number) {
    timeRemaining = secs;
  }

  async function onTimerExpired() {
    await submitExam('time_up');
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submitExam(reason: 'manual' | 'time_up' | 'violation' = 'manual') {
    if (submitting || submitted) return;
    submitting = true;
    faceMonitor?.stop();

    try {
      await fetch(`/api/exam/${exam.id}/submit`, {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ session_id: session.id }),
      });
    } catch {}

    submitted = true;

    if (exam.showResultAfter) {
      await goto(`/student/exam/${exam.id}/complete`);
    } else {
      await goto(`/student/exam/${exam.id}/complete`);
    }
  }

  // ── Violations ────────────────────────────────────────────────────────────
  async function handleViolation(type: string) {
    if (submitted) return;

    lastViolationType  = type;
    lastViolationAction = '';
    showWarning    = true;
    violationCount++;

    try {
      const res = await fetch(`/api/exam/${exam.id}/violation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          flag_type:  type,
        }),
      });

      const data = await res.json();
      if (data.action) lastViolationAction = data.action;
      if (data.action === 'auto_submitted') {
        await submitExam('violation');
      }
    } catch {}
  }

  function onFaceViolation(type: 'no_face_detected' | 'multiple_faces') {
    handleViolation(type);
  }

  function dismissWarning() {
    showWarning = false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(() => {
    startTimeSync();
  });

  onDestroy(() => {
    if (syncInterval) clearInterval(syncInterval);
  });
</script>

<svelte:head>
  <title>{exam.courseCode} — {exam.title}</title>
</svelte:head>

<KioskShell onViolation={handleViolation}>

  <div class="exam-shell">

    <!-- ── Top bar ────────────────────────────────────────────────────────── -->
    <header class="top-bar">
      <div class="exam-info">
        <span class="course-code">{exam.courseCode}</span>
        <span class="exam-title">{exam.title}</span>
      </div>

      <div class="top-center">
        <ExamTimer
          seconds={timeRemaining}
          totalSeconds={exam.durationMinutes * 60}
          onTick={onTimerTick}
          onExpired={onTimerExpired}
        />
      </div>

      <div class="top-right">
        <span class="answered-count">
          {answeredCount}/{totalQuestions} answered
        </span>
        <button
          class="btn-submit"
          onclick={() => submitExam('manual')}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit Exam'}
        </button>
      </div>
    </header>

    <!-- ── Main content ───────────────────────────────────────────────────── -->
    <div class="content">

      <!-- Question panel -->
      <main class="question-panel">

        <!-- Question header -->
        <div class="q-header">
          <span class="q-num">Question {currentIndex + 1} of {totalQuestions}</span>
          <span class="q-marks">{currentQuestion?.marks ?? 1} mark{(currentQuestion?.marks ?? 1) !== 1 ? 's' : ''}</span>
        </div>

        <!-- Question body -->
        <div class="q-body">
          {#if currentQuestion?.type === 'mcq'}
            <QuestionMCQ
              questionId={currentQuestion.id}
              body={currentQuestion.body}
              imageUrl={currentQuestion.imageUrl ?? null}
              options={currentQuestion.options}
              selected={answers[currentQuestion.id]?.selectedOption ?? null}
              displayIndex={currentIndex}
              total={totalQuestions}
              onAnswer={onMCQAnswer}
            />
          {:else if currentQuestion?.type === 'fill_in_the_blank'}
            <QuestionFITB
              questionId={currentQuestion.id}
              body={currentQuestion.body}
              imageUrl={currentQuestion.imageUrl ?? null}
              textAnswer={answers[currentQuestion.id]?.textAnswer ?? ''}
              displayIndex={currentIndex}
              total={totalQuestions}
              onAnswer={onFITBAnswer}
            />
          {/if}
        </div>

        <!-- Navigation -->
        <div class="q-nav">
          <button class="btn-nav" onclick={prev} disabled={isFirst}>
            ← Previous
          </button>
          {#if isLast}
            <button class="btn-nav btn-finish" onclick={() => submitExam('manual')} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Finish & Submit'}
            </button>
          {:else}
            <button class="btn-nav btn-next" onclick={next}>
              Next →
            </button>
          {/if}
        </div>

      </main>

      <!-- Question grid sidebar -->
      <aside class="q-grid">
        <p class="grid-label">Questions</p>
        <div class="grid">
          {#each questions as q, i}
            <button
              class="grid-btn"
              class:active={i === currentIndex}
              class:answered={!!(answers[q.id]?.selectedOption || answers[q.id]?.textAnswer)}
              onclick={() => goTo(i)}
              title="Question {i + 1}"
            >
              {i + 1}
            </button>
          {/each}
        </div>
      </aside>

    </div>

    <!-- ── Violation warning overlay ──────────────────────────────────────── -->
    {#if showWarning}
      <ViolationWarning
        flagType={lastViolationType}
        action={lastViolationAction || 'warning'}
        count={violationCount}
        max={exam.maxViolations}
        onDismiss={dismissWarning}
      />
    {/if}

  </div>

  <!-- Face monitor (fixed, bottom-right) -->
  <FaceMonitor
    bind:this={faceMonitor}
    examId={exam.id}
    sessionId={session.id}
    enrolledDescriptor={data.enrolledDescriptor}
    onViolation={onFaceViolation}
  />

</KioskShell>

<style>
  .exam-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  /* ── Top bar ──────────────────────────────────────────────────────────── */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    height: 56px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    gap: 1rem;
  }

  .exam-info {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
  }

  .course-code {
    font-size: 0.7rem;
    font-weight: 800;
    font-family: monospace;
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem;
    background: var(--green-soft, rgba(21,128,61,0.1));
    color: var(--green-700, #15803d);
    white-space: nowrap;
  }

  .exam-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;
  }

  .top-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  .top-right {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
  }

  .answered-count {
    font-size: 0.75rem;
    color: var(--color-muted);
    font-weight: 500;
    white-space: nowrap;
  }

  .btn-submit {
    padding: 0.45rem 1rem;
    background: var(--green-600, #16a34a);
    color: #fff;
    border: none;
    border-radius: 0.4rem;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .btn-submit:hover:not(:disabled) { background: var(--green-700, #15803d); }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Content layout ───────────────────────────────────────────────────── */
  .content {
    display: flex;
    flex: 1;
    overflow: hidden;
    gap: 0;
  }

  /* ── Question panel ───────────────────────────────────────────────────── */
  .question-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 2rem 2.5rem;
    gap: 1.5rem;
  }

  .q-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .q-num {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .q-marks {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 0.3rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
  }

  .q-body {
    flex: 1;
  }

  .q-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
    margin-top: auto;
  }

  .btn-nav {
    padding: 0.6rem 1.25rem;
    border-radius: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
  }
  .btn-nav:hover:not(:disabled) {
    border-color: var(--green-600, #16a34a);
    color: var(--green-600, #16a34a);
  }
  .btn-nav:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-next {
    background: var(--color-surface);
  }

  .btn-finish {
    background: var(--green-600, #16a34a);
    color: #fff;
    border-color: transparent;
  }
  .btn-finish:hover:not(:disabled) {
    background: var(--green-700, #15803d);
    color: #fff;
  }

  /* ── Question grid sidebar ────────────────────────────────────────────── */
  .q-grid {
    width: 200px;
    flex-shrink: 0;
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .grid-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.375rem;
  }

  .grid-btn {
    aspect-ratio: 1;
    border-radius: 0.3rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.12s;
    font-family: inherit;
  }

  .grid-btn:hover { border-color: var(--green-600, #16a34a); color: var(--green-700, #15803d); }
  .grid-btn.active { background: var(--green-600, #16a34a); color: #fff; border-color: transparent; }
  .grid-btn.answered:not(.active) {
    background: var(--green-soft, rgba(21,128,61,0.1));
    border-color: var(--green-600, #16a34a);
    color: var(--green-700, #15803d);
  }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .q-grid { display: none; }
    .question-panel { padding: 1.25rem; }
    .top-bar { padding: 0 1rem; }
    .exam-title { display: none; }
  }
</style>