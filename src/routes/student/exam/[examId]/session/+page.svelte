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
  import Watermark              from '$lib/components/exam/Watermark.svelte';
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
  let showNavPanel    = $state(false);  // mobile nav toggle

  const questions = data.questions;
  const session   = data.session;
  const exam      = data.exam;

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentQuestion  = $derived(questions[currentIndex]);
  const answeredCount    = $derived(Object.keys(answers).filter(k => {
    const a = answers[k];
    return a && (a.selectedOption || (a.textAnswer && a.textAnswer.trim()));
  }).length);
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
  function goTo(i: number) { currentIndex = i; showNavPanel = false; }

  // Keyboard navigation
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); next(); }
  }

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
    await goto(`/student/exam/${exam.id}/complete`);
  }

  // ── Violations ─────────────────────────────────────────────────────────────
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

  // STRICT: auto-submit from FaceMonitor when violations hit threshold
  function onForceSubmit() {
    handleViolation('multiple_faces');
    submitExam('violation');
  }

  function dismissWarning() {
    showWarning = false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(() => {
    startTimeSync();
    if (browser) document.addEventListener('keydown', onKeyDown);
  });

  onDestroy(() => {
    if (syncInterval) clearInterval(syncInterval);
    if (browser) document.removeEventListener('keydown', onKeyDown);
  });
</script>

<svelte:head>
  <title>{exam.courseCode} — {exam.title}</title>
</svelte:head>

<KioskShell onViolation={handleViolation}>

  <div class="exam-kiosk">

    <!-- ── Watermark ──────────────────────────────────────────────────────── -->
    <Watermark text="{data.student.fullName} · {exam.courseCode} · {data.student.id.slice(0,8)}" />

    <!-- ── Top bar ────────────────────────────────────────────────────────── -->
    <header class="top-bar">
      <div class="top-left">
        <div class="brand-mark">
          <span class="brand-icon">🎓</span>
          <span class="brand-text">MOUAU eTest</span>
        </div>
        <div class="exam-info">
          <span class="course-code">{exam.courseCode}</span>
          <span class="exam-title">{exam.title}</span>
        </div>
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
        <div class="answered-pill">
          <span class="pill-num">{answeredCount}</span>
          <span class="pill-sep">/</span>
          <span class="pill-total">{totalQuestions}</span>
          <span class="pill-label">answered</span>
        </div>
        <button
          class="btn-submit"
          onclick={() => submitExam('manual')}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </header>

    <!-- ── Main content ─────────────────────────────────────────────────── -->
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

        <!-- Navigation buttons -->
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

    </div>

    <!-- ── Bottom JAMB-style Question Navigator ─────────────────────────── -->
    <div class="bottom-nav">
      <div class="nav-header">
        <button class="nav-toggle" onclick={() => showNavPanel = !showNavPanel}>
          {#if showNavPanel}
            Hide Navigator ↑
          {:else}
            Show Navigator ↓
          {/if}
        </button>
        <span class="nav-stats">
          {answeredCount} answered · {totalQuestions - answeredCount} remaining
        </span>
      </div>

      <div class="nav-panel" class:open={showNavPanel}>
        <div class="nav-grid">
          {#each questions as q, i}
            {@const isAnswered = !!(answers[q.id]?.selectedOption || (answers[q.id]?.textAnswer && answers[q.id]?.textAnswer.trim()))}
            <button
              class="nav-btn"
              class:active={i === currentIndex}
              class:answered={isAnswered}
              onclick={() => goTo(i)}
              title="Question {i + 1}"
            >
              {i + 1}
            </button>
          {/each}
        </div>
      </div>

      <!-- Always-visible compact strip -->
      <div class="nav-strip" class:hidden={showNavPanel}>
        {#each questions as q, i}
          {@const isAnswered = !!(answers[q.id]?.selectedOption || (answers[q.id]?.textAnswer && answers[q.id]?.textAnswer.trim()))}
          <button
            class="strip-btn"
            class:active={i === currentIndex}
            class:answered={isAnswered}
            onclick={() => goTo(i)}
            title="Q{i + 1}"
          >
            {i + 1}
          </button>
        {/each}
      </div>
    </div>

    <!-- ── Violation warning overlay ────────────────────────────────────── -->
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

  <!-- Face monitor (fixed, bottom-right, above nav) -->
  <FaceMonitor
    bind:this={faceMonitor}
    examId={exam.id}
    sessionId={session.id}
    enrolledDescriptor={data.enrolledDescriptor}
    checkInterval={10_000}
    onViolation={onFaceViolation}
    onForceSubmit={onForceSubmit}
  />

</KioskShell>

<style>
  /* ── GREEN BRAND TOKENS ───────────────────────────────────────────────── */
  :global(:root) {
    --kiosk-green: #059669;
    --kiosk-green-light: #10b981;
    --kiosk-green-dark: #047857;
    --kiosk-green-glow: rgba(16, 185, 129, 0.15);
    --kiosk-green-soft: rgba(16, 185, 129, 0.08);
  }

  .exam-kiosk {
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
    height: 52px;
    background: linear-gradient(135deg, #064e3b, #065f46);
    border-bottom: 1px solid rgba(16, 185, 129, 0.2);
    flex-shrink: 0;
    gap: 1rem;
    color: #fff;
  }

  .top-left { display: flex; align-items: center; gap: 1rem; min-width: 0; }
  .brand-mark { display: flex; align-items: center; gap: 0.4rem; }
  .brand-icon { font-size: 1.1rem; }
  .brand-text { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.02em; opacity: 0.9; }

  .exam-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .course-code {
    font-size: 0.65rem;
    font-weight: 800;
    font-family: monospace;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    background: rgba(255,255,255,0.15);
    color: #fff;
    white-space: nowrap;
  }

  .exam-title {
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
    opacity: 0.85;
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
    gap: 0.875rem;
    flex-shrink: 0;
  }

  .answered-pill {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.25rem 0.625rem;
    background: rgba(255,255,255,0.12);
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
  }
  .pill-num { color: #34d399; font-weight: 800; }
  .pill-sep { opacity: 0.5; }
  .pill-total { opacity: 0.7; }
  .pill-label { opacity: 0.6; margin-left: 0.15rem; }

  .btn-submit {
    padding: 0.4rem 0.875rem;
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }
  .btn-submit:hover:not(:disabled) { background: #dc2626; transform: translateY(-1px); }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

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
    padding: 1.5rem 2rem;
    gap: 1.25rem;
    padding-bottom: 180px; /* space for bottom nav */
  }

  .q-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
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
    background: var(--kiosk-green-soft);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: var(--kiosk-green-dark);
  }

  .q-body { flex: 1; }

  .q-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    margin-top: auto;
  }

  .btn-nav {
    padding: 0.55rem 1.1rem;
    border-radius: 0.4rem;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
  }
  .btn-nav:hover:not(:disabled) {
    border-color: var(--kiosk-green);
    color: var(--kiosk-green);
    box-shadow: 0 0 0 3px var(--kiosk-green-glow);
  }
  .btn-nav:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-next {
    background: var(--color-surface);
  }

  .btn-finish {
    background: linear-gradient(135deg, var(--kiosk-green), var(--kiosk-green-dark));
    color: #fff;
    border-color: transparent;
    box-shadow: 0 2px 12px rgba(5, 150, 105, 0.25);
  }
  .btn-finish:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--kiosk-green-dark), #065f46);
    color: #fff;
    box-shadow: 0 4px 16px rgba(5, 150, 105, 0.35);
  }

  /* ── Bottom JAMB-style Navigator ────────────────────────────────────── */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 30;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
  }

  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .nav-toggle {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--kiosk-green);
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    padding: 0.25rem 0;
    transition: opacity 0.15s;
  }
  .nav-toggle:hover { opacity: 0.7; }

  .nav-stats {
    font-size: 0.65rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  /* Expanded panel */
  .nav-panel {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .nav-panel.open {
    max-height: 280px;
    overflow-y: auto;
  }

  .nav-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 0.375rem;
    padding: 0.75rem 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .nav-btn {
    aspect-ratio: 1;
    border-radius: 0.4rem;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.12s;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
  }
  .nav-btn:hover { border-color: var(--kiosk-green); color: var(--kiosk-green-dark); transform: translateY(-1px); }
  .nav-btn.active {
    background: linear-gradient(135deg, var(--kiosk-green), var(--kiosk-green-dark));
    color: #fff;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
    transform: scale(1.05);
  }
  .nav-btn.answered:not(.active) {
    background: var(--kiosk-green-soft);
    border-color: var(--kiosk-green);
    color: var(--kiosk-green-dark);
  }

  /* Compact strip (always visible) */
  .nav-strip {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    max-width: 800px;
    margin: 0 auto;
  }
  .nav-strip::-webkit-scrollbar { display: none; }
  .nav-strip.hidden { display: none; }

  .strip-btn {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 0.35rem;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.12s;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .strip-btn:hover { border-color: var(--kiosk-green); color: var(--kiosk-green-dark); }
  .strip-btn.active {
    background: linear-gradient(135deg, var(--kiosk-green), var(--kiosk-green-dark));
    color: #fff;
    border-color: transparent;
    box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);
  }
  .strip-btn.answered:not(.active) {
    background: var(--kiosk-green-soft);
    border-color: var(--kiosk-green);
    color: var(--kiosk-green-dark);
  }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .top-bar { padding: 0 1rem; height: 48px; }
    .brand-text { display: none; }
    .exam-title { max-width: 120px; }
    .question-panel { padding: 1rem; padding-bottom: 160px; }
    .answered-pill .pill-label { display: none; }
  }

  @media (max-width: 480px) {
    .course-code { display: none; }
    .exam-title { max-width: 100px; font-size: 0.7rem; }
    .btn-submit { padding: 0.35rem 0.625rem; font-size: 0.68rem; }
    .nav-grid { grid-template-columns: repeat(8, 1fr); gap: 0.25rem; }
    .nav-btn { min-height: 32px; font-size: 0.7rem; }
  }
</style>