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
  let currentIndex      = $state(0);
  let answers           = $state<Record<string, { selectedOption: string | null; textAnswer: string | null }>>(
    { ...data.answersMap }
  );
  let timeRemaining     = $state(data.session.timeRemainingSecs);
  let submitting        = $state(false);
  let submitted         = $state(false);
  let violationCount    = $state(data.session.violationCount);
  let showWarning       = $state(false);
  let lastViolationType = $state('');
  let lastViolationAction = $state('');

  // Submit confirmation — two-step
  // Step 1: "Submit exam?" → Yes/No (modal1)
  // Step 2: answered/unanswered summary → Proceed/Cancel (modal2)
  let showSubmitModal1  = $state(false);
  let showSubmitModal2  = $state(false);

  let faceMonitorEl: FaceMonitor;

  const questions = data.questions;
  const session   = data.session;
  const exam      = data.exam;

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentQuestion  = $derived(questions[currentIndex]);
  const answeredCount    = $derived(
    Object.values(answers).filter(a => a.selectedOption !== null || (a.textAnswer ?? '').trim() !== '').length
  );
  const unansweredCount  = $derived(questions.length - answeredCount);
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
  function next() { if (!isLast)  currentIndex++; }
  function goTo(i: number) { currentIndex = i; }

  // ── Timer sync ────────────────────────────────────────────────────────────
  let syncInterval: ReturnType<typeof setInterval> | null = null;

  function startTimeSync() {
    syncInterval = setInterval(async () => {
      if (submitted || timeRemaining <= 0) return;
      await fetch(`/api/exam/${exam.id}/answer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'time_sync', session_id: session.id, remaining: timeRemaining }),
      }).catch(() => {});
    }, 15_000);
  }

  function onTimerTick(secs: number) { timeRemaining = secs; }
  async function onTimerExpired()     { await submitExam('time_up'); }

  // ── Submit (actual) ───────────────────────────────────────────────────────
  async function submitExam(reason: 'manual' | 'time_up' | 'violation' = 'manual') {
    if (submitting || submitted) return;
    submitting = true;
    showSubmitModal1 = false;
    showSubmitModal2 = false;
    faceMonitorEl?.stop();

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

  // ── Submit flow — two modals ──────────────────────────────────────────────
  function requestSubmit() {
    if (submitting || submitted) return;
    showSubmitModal1 = true;
  }

  // Modal 1: "Yes" → go to modal 2
  function submitModal1Yes() {
    showSubmitModal1 = false;
    showSubmitModal2 = true;
  }
  function submitModal1No() {
    showSubmitModal1 = false;
  }

  // Modal 2: "Confirm" → actually submit
  function submitModal2Confirm() {
    submitExam('manual');
  }
  function submitModal2Cancel() {
    showSubmitModal2 = false;
  }

  // ── Violations ────────────────────────────────────────────────────────────
  async function handleViolation(type: string) {
    if (submitted) return;
    lastViolationType   = type;
    lastViolationAction = '';
    showWarning     = true;
    violationCount++;
    try {
      const res  = await fetch(`/api/exam/${exam.id}/violation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, flag_type: type }),
      });
      const body = await res.json();
      if (body.action) lastViolationAction = body.action;
      if (body.action === 'auto_submitted') await submitExam('violation');
    } catch {}
  }

  function onFaceViolation(type: 'no_face_detected' | 'multiple_faces' | 'face_mismatch') {
    handleViolation(type);
  }

  function dismissWarning() { showWarning = false; }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  function handleKeyDown(e: KeyboardEvent) {
    // Don't fire inside text inputs / textareas
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Modals absorb all keys when open
    if (showSubmitModal1 || showSubmitModal2) {
      if (showSubmitModal1) {
        if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); submitModal1Yes(); }
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); submitModal1No();  }
      }
      if (showSubmitModal2) {
        if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); submitModal2Confirm(); }
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); submitModal2Cancel();  }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); submitModal2Cancel();  }
      }
      return;
    }

    // Violation warning modal
    if (showWarning) {
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); dismissWarning(); }
      return;
    }

    const key = e.key.toUpperCase();

    // MCQ option selection — A B C D (and E for 5-option questions)
    if (['A','B','C','D','E'].includes(key) && currentQuestion?.type === 'mcq') {
      e.preventDefault();
      const optIndex = key.charCodeAt(0) - 65; // A=0, B=1, …
      const opt = currentQuestion.options?.[optIndex];
      if (opt) onMCQAnswer(currentQuestion.id, opt.id);
      return;
    }

    // Navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); prev(); }

    // Number keys 1–9 jump to question
    if (/^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key) - 1;
      if (idx < totalQuestions) { e.preventDefault(); goTo(idx); }
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(() => {
    if (!browser) return;
    startTimeSync();
    window.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    if (!browser) return;
    if (syncInterval) clearInterval(syncInterval);
    window.removeEventListener('keydown', handleKeyDown);
  });

  // ── Scroll active nav chip into view ─────────────────────────────────────
  let navTrack: HTMLDivElement | null = null;
  $effect(() => {
    if (!navTrack) return;
    const chip = navTrack.querySelector<HTMLButtonElement>(`[data-q="${currentIndex}"]`);
    chip?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
</script>

<svelte:head>
  <title>{exam.courseCode} — {exam.title}</title>
</svelte:head>

<KioskShell onViolation={handleViolation}>

  <div class="exam-shell">

    <!-- ── Top bar ────────────────────────────────────────────────────────── -->
    <header class="top-bar">
      <!-- Left: branding + exam info -->
      <div class="bar-left">
        <span class="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <rect width="22" height="22" rx="5" fill="#16a34a"/>
            <path d="M6 11.5l3.5 3.5 6.5-7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="course-badge">{exam.courseCode}</span>
        <span class="exam-name">{exam.title}</span>
      </div>

      <!-- Centre: timer -->
      <div class="bar-centre">
        <ExamTimer
          seconds={timeRemaining}
          totalSeconds={exam.durationMinutes * 60}
          onTick={onTimerTick}
          onExpired={onTimerExpired}
        />
      </div>

      <!-- Right: progress + submit + face monitor -->
      <div class="bar-right">
        <span class="progress-label">
          <span class="answered-num">{answeredCount}</span>
          <span class="progress-sep">/</span>
          <span class="total-num">{totalQuestions}</span>
          <span class="progress-word">answered</span>
        </span>

        <button class="btn-submit" onclick={requestSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Exam'}
        </button>

        <!-- Face monitor lives in the top-right bar area -->
        <FaceMonitor
          bind:this={faceMonitorEl}
          examId={exam.id}
          sessionId={session.id}
          enrolledDescriptor={data.enrolledDescriptor}
          onViolation={onFaceViolation}
          onForceSubmit={() => submitExam('violation')}
        />
      </div>
    </header>

    <!-- ── Question area ──────────────────────────────────────────────────── -->
    <main class="question-area">

      <!-- Question meta row -->
      <div class="q-meta">
        <span class="q-num">Question {currentIndex + 1} <span class="q-of">of {totalQuestions}</span></span>
        <span class="q-marks-pill">{currentQuestion?.marks ?? 1} mark{(currentQuestion?.marks ?? 1) !== 1 ? 's' : ''}</span>
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

      <!-- Prev / Next navigation -->
      <div class="q-nav">
        <button class="btn-nav btn-prev" onclick={prev} disabled={isFirst} aria-label="Previous question">
          ← Previous
        </button>

        <!-- Keyboard hint strip -->
        <div class="kbd-hints" aria-hidden="true">
          {#if currentQuestion?.type === 'mcq'}
            {#each ['A','B','C','D'] as k}
              <kbd>{k}</kbd>
            {/each}
            <span class="hint-sep">|</span>
          {/if}
          <kbd>←</kbd><kbd>→</kbd>
        </div>

        {#if isLast}
          <button class="btn-nav btn-finish" onclick={requestSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Finish & Submit'}
          </button>
        {:else}
          <button class="btn-nav btn-next" onclick={next} aria-label="Next question">
            Next →
          </button>
        {/if}
      </div>

    </main>

    <!-- ── Bottom question navigator (JAMB-style) ─────────────────────────── -->
    <nav class="q-nav-bar" aria-label="Question navigator">
      <div class="nav-track" bind:this={navTrack}>
        {#each questions as q, i}
          {@const isAnswered = !!(answers[q.id]?.selectedOption || (answers[q.id]?.textAnswer ?? '').trim())}
          {@const isActive   = i === currentIndex}
          <button
            class="q-chip"
            class:active={isActive}
            class:answered={isAnswered && !isActive}
            data-q={i}
            onclick={() => goTo(i)}
            title="Question {i + 1}{isAnswered ? ' — answered' : ''}"
            aria-label="Go to question {i + 1}"
            aria-current={isActive ? 'true' : undefined}
          >
            {i + 1}
          </button>
        {/each}
      </div>

      <!-- Legend -->
      <div class="nav-legend" aria-hidden="true">
        <span class="legend-item"><span class="legend-dot active"></span>Current</span>
        <span class="legend-item"><span class="legend-dot answered"></span>Answered</span>
        <span class="legend-item"><span class="legend-dot unanswered"></span>Unanswered</span>
      </div>
    </nav>

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
    <!-- Keyboard hint on warning -->
    <div class="kbd-overlay-hint" aria-hidden="true">Press <kbd>R</kbd> to return to exam</div>
  {/if}

  <!-- ── Submit Modal 1 — "Submit exam?" ────────────────────────────────── -->
  {#if showSubmitModal1}
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Submit exam confirmation">
      <div class="modal-box">
        <div class="modal-icon warning-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h2 class="modal-title">Submit your exam?</h2>
        <p class="modal-body">
          You have answered <strong class="answered-strong">{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
          {#if unansweredCount > 0}
            <span class="unanswered-warn">{unansweredCount} question{unansweredCount !== 1 ? 's' : ''} unanswered.</span>
          {/if}
        </p>
        <div class="modal-actions">
          <button class="modal-btn ghost" onclick={submitModal1No}>
            <span class="modal-btn-key">N</span> No, return to exam
          </button>
          <button class="modal-btn primary" onclick={submitModal1Yes}>
            <span class="modal-btn-key">Y</span> Yes, proceed
          </button>
        </div>
        <p class="modal-kbd-hint" aria-hidden="true">Press <kbd>Y</kbd> to proceed · <kbd>N</kbd> to return</p>
      </div>
    </div>
  {/if}

  <!-- ── Submit Modal 2 — Final confirmation ────────────────────────────── -->
  {#if showSubmitModal2}
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Final submission confirmation">
      <div class="modal-box">
        <div class="modal-icon final-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#16a34a" stroke-width="1.8"/>
            <path d="M8 12l3 3 5-6" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 class="modal-title">Final confirmation</h2>

        <!-- Summary checklist -->
        <div class="summary-list">
          <div class="summary-row">
            <span class="summary-label">Answered</span>
            <span class="summary-val green">{answeredCount} / {totalQuestions}</span>
          </div>
          {#if unansweredCount > 0}
            <div class="summary-row">
              <span class="summary-label">Unanswered</span>
              <span class="summary-val amber">{unansweredCount} question{unansweredCount !== 1 ? 's' : ''}</span>
            </div>
          {/if}
          <div class="summary-row">
            <span class="summary-label">Time remaining</span>
            <span class="summary-val">{Math.floor(timeRemaining / 60)}m {timeRemaining % 60}s</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Violations</span>
            <span class="summary-val" class:amber={violationCount > 0}>{violationCount}</span>
          </div>
        </div>

        <p class="modal-oath">
          By confirming, you declare that this submission is entirely your own work and that you have not engaged in any form of examination malpractice.
        </p>

        <div class="modal-actions">
          <button class="modal-btn ghost" onclick={submitModal2Cancel}>
            <span class="modal-btn-key">R</span> Return to exam
          </button>
          <button class="modal-btn danger" onclick={submitModal2Confirm} disabled={submitting}>
            {#if submitting}
              <span class="modal-spinner"></span> Submitting…
            {:else}
              <span class="modal-btn-key">Y</span> Submit now
            {/if}
          </button>
        </div>
        <p class="modal-kbd-hint" aria-hidden="true">Press <kbd>Y</kbd> to submit · <kbd>R</kbd> to return</p>
      </div>
    </div>
  {/if}

</KioskShell>

<style>
  /* ── Shell ────────────────────────────────────────────────────────────── */
  .exam-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg, #f6f7f9);
    color: var(--color-text, #111827);
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  /* ── Top bar ──────────────────────────────────────────────────────────── */
  .top-bar {
    height: 52px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem 0 0.875rem;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    gap: 1rem;
    position: relative;
    z-index: 10;
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }

  .brand-mark { display: flex; align-items: center; flex-shrink: 0; }

  .course-badge {
    font-size: 0.68rem;
    font-weight: 800;
    font-family: monospace;
    padding: 0.18rem 0.45rem;
    border-radius: 0.3rem;
    background: #dcfce7;
    color: #15803d;
    letter-spacing: 0.02em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .exam-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .bar-centre {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .progress-label {
    display: flex;
    align-items: baseline;
    gap: 0.15rem;
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
  }
  .answered-num  { font-weight: 800; color: #15803d; font-size: 0.85rem; }
  .progress-sep  { font-weight: 400; color: #d1d5db; }
  .total-num     { font-weight: 600; color: #374151; }
  .progress-word { font-size: 0.65rem; color: #9ca3af; margin-left: 0.15rem; }

  .btn-submit {
    padding: 0.4rem 0.875rem;
    background: #16a34a;
    color: #fff;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .btn-submit:hover:not(:disabled) { background: #15803d; }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Question area ────────────────────────────────────────────────────── */
  .question-area {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 2rem 3rem;
    gap: 1.5rem;
    /* leave room for bottom nav */
    padding-bottom: 1rem;
  }

  .q-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .q-num {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9ca3af;
  }
  .q-of { font-weight: 500; }

  .q-marks-pill {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    color: #6b7280;
  }

  .q-body { flex: 1; }

  /* Prev / Next strip */
  .q-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1.25rem;
    border-top: 1px solid #e5e7eb;
    margin-top: auto;
    gap: 1rem;
  }

  .kbd-hints {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    font-weight: 700;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    border-radius: 4px;
    background: #f9fafb;
    border: 1px solid #d1d5db;
    border-bottom-width: 2px;
    color: #6b7280;
    font-family: inherit;
  }
  .hint-sep { font-size: 0.6rem; color: #d1d5db; }

  .btn-nav {
    padding: 0.55rem 1.125rem;
    border-radius: 0.375rem;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #374151;
    white-space: nowrap;
  }
  .btn-nav:hover:not(:disabled) { border-color: #16a34a; color: #15803d; }
  .btn-nav:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-finish {
    background: #16a34a;
    color: #fff;
    border-color: transparent;
  }
  .btn-finish:hover:not(:disabled) {
    background: #15803d;
    color: #fff;
    border-color: transparent;
  }

  /* ── Bottom navigator bar (JAMB-style) ───────────────────────────────── */
  .q-nav-bar {
    flex-shrink: 0;
    background: #fff;
    border-top: 1px solid #e5e7eb;
    padding: 0.5rem 0.75rem 0.5rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .nav-track {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    overflow-x: auto;
    scroll-behavior: smooth;
    padding-bottom: 2px; /* prevent clip of focus rings */
    /* hide scrollbar but keep functionality */
    scrollbar-width: none;
  }
  .nav-track::-webkit-scrollbar { display: none; }

  .q-chip {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 0.35rem;
    border: 1.5px solid #e5e7eb;
    background: #f9fafb;
    font-size: 0.65rem;
    font-weight: 700;
    cursor: pointer;
    color: #9ca3af;
    transition: all 0.12s;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .q-chip:hover {
    border-color: #16a34a;
    color: #15803d;
    background: #f0fdf4;
  }

  .q-chip.active {
    background: #16a34a;
    border-color: #16a34a;
    color: #fff;
    box-shadow: 0 2px 8px rgba(22,163,74,0.35);
    transform: scale(1.1);
  }

  .q-chip.answered {
    background: #dcfce7;
    border-color: #86efac;
    color: #15803d;
  }

  /* Legend */
  .nav-legend {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex-shrink: 0;
    padding-left: 0.5rem;
    border-left: 1px solid #f3f4f6;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.6rem;
    color: #9ca3af;
    white-space: nowrap;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .legend-dot.active    { background: #16a34a; }
  .legend-dot.answered  { background: #dcfce7; border: 1.5px solid #86efac; }
  .legend-dot.unanswered { background: #f9fafb; border: 1.5px solid #e5e7eb; }

  /* ── Modals ────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    backdrop-filter: blur(2px);
  }

  .modal-box {
    background: #fff;
    border-radius: 1rem;
    padding: 2rem;
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    animation: modal-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes modal-pop {
    from { opacity: 0; transform: scale(0.92) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }
  .modal-icon.warning-icon { background: #fef9c3; }
  .modal-icon.final-icon   { background: #dcfce7; }

  .modal-title {
    font-size: 1.1rem;
    font-weight: 800;
    color: #111827;
    margin: 0;
    text-align: center;
  }

  .modal-body {
    font-size: 0.85rem;
    color: #374151;
    text-align: center;
    line-height: 1.6;
    margin: 0;
  }
  .answered-strong  { color: #15803d; }
  .unanswered-warn  { display: block; margin-top: 0.3rem; color: #b45309; font-weight: 600; }

  /* Summary list in modal 2 */
  .summary-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.6rem;
    padding: 0.875rem;
  }
  .summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.82rem;
  }
  .summary-label { color: #6b7280; font-weight: 500; }
  .summary-val   { font-weight: 700; color: #111827; }
  .summary-val.green { color: #15803d; }
  .summary-val.amber { color: #b45309; }

  .modal-oath {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.6;
    margin: 0;
    padding: 0.75rem;
    background: #fffbeb;
    border-radius: 0.5rem;
    border: 1px solid #fde68a;
    text-align: center;
  }

  .modal-actions {
    display: flex;
    gap: 0.625rem;
  }

  .modal-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    border: none;
  }
  .modal-btn.ghost {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
  }
  .modal-btn.ghost:hover { background: #e5e7eb; }

  .modal-btn.primary {
    background: #16a34a;
    color: #fff;
  }
  .modal-btn.primary:hover { background: #15803d; }

  .modal-btn.danger {
    background: #dc2626;
    color: #fff;
  }
  .modal-btn.danger:hover:not(:disabled) { background: #b91c1c; }
  .modal-btn.danger:disabled { opacity: 0.5; cursor: not-allowed; }

  .modal-btn-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 3px;
    background: rgba(255,255,255,0.25);
    font-size: 0.62rem;
    font-weight: 800;
    flex-shrink: 0;
  }
  .modal-btn.ghost .modal-btn-key {
    background: rgba(0,0,0,0.08);
    color: #6b7280;
  }

  .modal-kbd-hint {
    text-align: center;
    font-size: 0.68rem;
    color: #9ca3af;
    margin: 0;
  }
  .modal-kbd-hint kbd {
    font-size: 0.62rem;
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid #d1d5db;
    background: #f9fafb;
    border-bottom-width: 2px;
    color: #374151;
  }

  .modal-spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Violation return hint */
  .kbd-overlay-hint {
    position: fixed;
    bottom: 5.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9500;
    font-size: 0.72rem;
    color: rgba(255,255,255,0.7);
    background: rgba(0,0,0,0.5);
    padding: 0.35rem 0.875rem;
    border-radius: 999px;
    backdrop-filter: blur(4px);
    white-space: nowrap;
  }
  .kbd-overlay-hint kbd {
    background: rgba(255,255,255,0.15);
    border-color: rgba(255,255,255,0.3);
    color: #fff;
    font-size: 0.62rem;
  }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .question-area { padding: 1.25rem 1rem; }
    .top-bar { padding: 0 0.75rem; gap: 0.5rem; }
    .exam-name { display: none; }
    .progress-word { display: none; }
    .kbd-hints { display: none; }
    .nav-legend { display: none; }
  }

  @media (max-width: 480px) {
    .q-chip { width: 28px; height: 28px; font-size: 0.6rem; }
    .modal-box { padding: 1.5rem; }
  }
</style>