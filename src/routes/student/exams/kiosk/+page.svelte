<!-- src/routes/student/exams/kiosk/+page.svelte -->
<!--
  Detached kiosk window — the actual exam environment.
  Opened by /student/exams/+page.svelte via window.open().
  Posts messages back to opener: { source: 'etest_kiosk', type: 'submitted' | 'flagged' }

  Enforces:
    - Fullscreen on mount + on every fullscreenchange (violation if user exits)
    - KioskShell wraps the page for tab-switch / blur / devtools / screenshot detection
    - FaceMonitor for camera-based violations
    - ViolationWarning overlay on each flag
    - Server-authoritative timer with 30s sync
    - Offline queue + sendBeacon on unload
    - Keyboard shortcuts: A/B/C/D, N, P, S, R, Y, X
-->
<script lang="ts">
  import type { PageData } from './$types';
  import { onMount, tick } from 'svelte';
  import {
    AlertTriangle, CheckCircle, ChevronLeft, ChevronRight,
    Send, Loader2, Clock, User
  } from '@lucide/svelte';

  import KioskShell       from '$lib/components/exam/KioskShell.svelte';
  import FaceMonitor      from '$lib/components/exam/FaceMonitor.svelte';
  import ViolationWarning from '$lib/components/exam/ViolationWarning.svelte';
  import Watermark        from '$lib/components/exam/Watermark.svelte';

  import {
    persistSession,
    loadSession,
    clearSession,
    mergeServerAnswers,
    pendingAnswers,
    type PersistedSession,
  } from '$lib/exam/session-store.js';

  let { data }: { data: PageData } = $props();

  // ─── Types ───────────────────────────────────────────────────────────────
  type KioskStep = 'starting' | 'exam' | 'submitted' | 'flagged';

  type ClientQuestion = {
    id:       string;
    type:     'mcq' | 'fill_in_the_blank';
    body:     string;
    imageUrl: string | null;
    marks:    number;
    options:  Array<{ id: string; text: string }>;
  };

  // ─── Session state ────────────────────────────────────────────────────────
  let step           = $state<KioskStep>('starting');
  let sessionId      = $state<string | null>(data.sessionId);
  let totalQuestions = $state<number>(data.totalQuestions ?? 0);
  let currentIndex   = $state<number>(0);
  let answers        = $state<Record<number, string>>({});

  // ─── Question state ───────────────────────────────────────────────────────
  let question        = $state<ClientQuestion | null>(null);
  let questionLoading = $state(false);
  let questionError   = $state('');

  // ─── Timer ───────────────────────────────────────────────────────────────
  let timeRemaining  = $state<number>(data.timeRemaining ?? 0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let syncInterval:  ReturnType<typeof setInterval> | null = null;

  const timerWarning  = $derived(timeRemaining > 0 && timeRemaining <= 300);
  const timerCritical = $derived(timeRemaining > 0 && timeRemaining <= 60);

  function formatTime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function startLocalTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (timeRemaining <= 0) {
        clearInterval(timerInterval!);
        timerInterval = null;
        void handleAutoSubmit();
        return;
      }
      timeRemaining--;
      if (timeRemaining % 10 === 0 && sessionId) {
        persistSession(buildPersistedState());
      }
    }, 1000);
  }

  async function syncTimerFromServer() {
    if (!sessionId || step !== 'exam') return;
    try {
      const res = await fetch(`/api/exam/${data.examId}/time?sessionId=${sessionId}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.status === 'submitted' || json.status === 'force_submitted') {
        notifyOpener('submitted');
        stopAllTimers();
        step = 'submitted';
        return;
      }
      if (json.status === 'flagged') {
        notifyOpener('flagged');
        stopAllTimers();
        step = 'flagged';
        return;
      }
      // Correct drift > 3s
      if (Math.abs(timeRemaining - json.timeRemaining) > 3) {
        timeRemaining = json.timeRemaining;
      }
    } catch { /* silent */ }
  }

  function startTimerSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(syncTimerFromServer, 30_000);
  }

  function stopAllTimers() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (syncInterval)  { clearInterval(syncInterval);  syncInterval  = null; }
  }

  // ─── Fullscreen enforcement ───────────────────────────────────────────────
  let fullscreenViolationPending = false;

  async function requestFullscreen() {
    try { await document.documentElement.requestFullscreen(); } catch { /* ok */ }
  }

  function onFullscreenChange() {
    if (step !== 'exam') return;
    if (!document.fullscreenElement) {
      // Re-request immediately
      void requestFullscreen();
      // And log as a violation if not already pending
      if (!fullscreenViolationPending) {
        fullscreenViolationPending = true;
        void handleViolation('fullscreen_exit').then(() => {
          fullscreenViolationPending = false;
        });
      }
    }
  }

  // ─── Violations ───────────────────────────────────────────────────────────
  let violationCount   = $state(0);
  let violationVisible = $state(false);
  let violationType    = $state('');
  let violationAction  = $state('warning');

  async function handleViolation(type: string) {
    violationCount++;
    violationType = type;

    try {
      const res = await fetch(`/api/exam/${data.examId}/violation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, type }),
      });
      if (res.ok) {
        const json = await res.json();
        violationAction = json.action ?? 'warning';
        if (json.action === 'auto_submitted') {
          await submitExam();
          return;
        }
        if (json.action === 'exam_paused') {
          notifyOpener('flagged');
          stopAllTimers();
          step = 'flagged';
          return;
        }
      }
    } catch {
      violationAction = 'warning';
    }

    violationVisible = true;
  }

  // ─── Network / offline queue ──────────────────────────────────────────────
  let isOnline     = $state(true);
  let offlineQueue = $state<Array<{ index: number; questionId: string; value: string }>>([]);
  let isSyncing    = $state(false);

  async function syncOfflineQueue() {
    if (isSyncing || offlineQueue.length === 0 || !isOnline || !sessionId) return;
    isSyncing = true;
    const batch  = [...offlineQueue];
    const failed: typeof offlineQueue = [];

    for (const item of batch) {
      if (!item.questionId) continue;
      try {
        const res = await fetch(`/api/exam/${data.examId}/answer`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ sessionId, questionId: item.questionId, answer: item.value }),
        });
        if (!res.ok && res.status !== 409) failed.push(item);
      } catch { failed.push(item); }
    }

    offlineQueue = failed;
    isSyncing = false;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  let isSubmitting      = $state(false);
  let submitError       = $state('');
  let showSubmitConfirm = $state(false);
  let submitRetryTimer: ReturnType<typeof setInterval> | null = null;

  async function submitExam() {
    if (!sessionId || isSubmitting) return;
    isSubmitting = true;
    submitError  = '';
    if (submitRetryTimer) { clearInterval(submitRetryTimer); submitRetryTimer = null; }

    await syncOfflineQueue();

    try {
      const res = await fetch(`/api/exam/${data.examId}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId }),
      });

      if (res.status === 409 || res.ok) {
        clearSession(sessionId);
        stopAllTimers();
        showSubmitConfirm = false;

        // Exit fullscreen
        if (document.fullscreenElement) {
          try { await document.exitFullscreen(); } catch { /* ok */ }
        }

        // Notify portal window
        notifyOpener('submitted');
        step = 'submitted';
        return;
      }

      submitError = 'Submission failed — retrying…';
      submitRetryTimer = setInterval(submitExam, 5000);
    } catch {
      submitError = 'No connection — retrying…';
      submitRetryTimer = setInterval(submitExam, 5000);
    } finally {
      if (!submitRetryTimer) isSubmitting = false;
    }
  }

  async function handleAutoSubmit() { await submitExam(); }

  // ─── Notify opener ────────────────────────────────────────────────────────
  function notifyOpener(type: 'submitted' | 'flagged') {
    try {
      window.opener?.postMessage(
        { source: 'etest_kiosk', type },
        window.location.origin,
      );
    } catch { /* opener may be closed */ }
  }

  // ─── Session persistence ──────────────────────────────────────────────────
  function buildPersistedState(): PersistedSession {
    return {
      sessionId:    sessionId!,
      examId:       data.examId,
      answers:      { ...answers },
      currentIndex,
      timeOffsetMs: (data.timeRemaining - timeRemaining) * 1000,
      savedAt:      Date.now(),
    };
  }

  // ─── Fetch question ───────────────────────────────────────────────────────
  async function fetchQuestion(idx: number) {
    if (!sessionId) return;
    questionLoading = true;
    questionError   = '';
    question        = null;

    try {
      const res = await fetch(
        `/api/exam/${data.examId}/question?index=${idx}&sessionId=${sessionId}`
      );
      if (res.status === 409) { notifyOpener('submitted'); step = 'submitted'; return; }
      if (res.status === 423) { notifyOpener('flagged');   step = 'flagged';   return; }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        questionError = j.message ?? `Failed to load question ${idx + 1}`;
        return;
      }
      const payload  = await res.json();
      question        = payload.question;
      totalQuestions  = payload.total;
      currentIndex    = idx;
      persistSession(buildPersistedState());
    } catch {
      questionError = 'Network error — press R to retry';
    } finally {
      questionLoading = false;
    }
  }

  // ─── Save answer ──────────────────────────────────────────────────────────
  async function saveAnswer(idx: number, value: string) {
    if (!sessionId || !question) return;

    answers = { ...answers, [idx]: value };
    persistSession(buildPersistedState());

    const questionId = question.id;

    if (!isOnline) {
      const existing = offlineQueue.findIndex(q => q.index === idx);
      if (existing >= 0) offlineQueue[existing] = { index: idx, questionId, value };
      else offlineQueue = [...offlineQueue, { index: idx, questionId, value }];
      return;
    }

    try {
      const res = await fetch(`/api/exam/${data.examId}/answer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, questionId, answer: value }),
      });
      if (res.status === 409) { notifyOpener('submitted'); step = 'submitted'; return; }
      if (!res.ok) offlineQueue = [...offlineQueue, { index: idx, questionId, value }];
    } catch {
      offlineQueue = [...offlineQueue, { index: idx, questionId, value }];
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  async function goToQuestion(idx: number) {
    if (idx < 0 || idx >= totalQuestions || questionLoading) return;
    await fetchQuestion(idx);
  }
  const goNext = () => goToQuestion(currentIndex + 1);
  const goPrev = () => goToQuestion(currentIndex - 1);

  // ─── Start exam ───────────────────────────────────────────────────────────
  let startError = $state('');

  async function startExam() {
    startError = '';
    try {
      const res  = await fetch(`/api/exam/${data.examId}/start`, { method: 'POST' });
      const json = await res.json();

      if (res.status === 409) { notifyOpener('submitted'); step = 'submitted'; return; }
      if (res.status === 423) { notifyOpener('flagged');   step = 'flagged';   return; }
      if (!res.ok) { startError = json.message ?? `Error ${res.status}`; return; }

      sessionId      = json.sessionId;
      totalQuestions = json.totalQuestions;
      timeRemaining  = json.timeRemaining;

      const stored = loadSession(json.sessionId);
      if (stored) {
        answers      = mergeServerAnswers(stored, json.serverAnswers).answers;
        currentIndex = stored.currentIndex;
      } else {
        answers      = json.serverAnswers ?? {};
        currentIndex = json.currentIndex  ?? 0;
      }

      if (stored) {
        const serverKnown = new Set(Object.keys(json.serverAnswers ?? {}).map(Number));
        const pending = pendingAnswers(stored, serverKnown);
        for (const item of pending) {
          offlineQueue.push({ index: item.index, questionId: '', value: item.value });
        }
      }

      persistSession(buildPersistedState());
      step = 'exam';
      await tick();
      await requestFullscreen();
      startLocalTimer();
      startTimerSync();
      await fetchQuestion(currentIndex);
    } catch (e: any) {
      startError = e.message ?? 'Network error';
    }
  }

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  function handleKeyDown(e: KeyboardEvent) {
    if (step !== 'exam' || questionLoading) return;

    // Don't intercept when typing in FITB
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) return;

    if (violationVisible) {
      if (e.key.toLowerCase() === 'y' || e.key === 'Enter') violationVisible = false;
      return;
    }

    const letter = e.key.toUpperCase();
    if (['A','B','C','D'].includes(letter) && question?.type === 'mcq') {
      const opt = question.options[letter.charCodeAt(0) - 65];
      if (opt) { saveAnswer(currentIndex, opt.id); return; }
    }

    switch (e.key.toLowerCase()) {
      case 'n':          goNext();                                         break;
      case 'p':          goPrev();                                         break;
      case 's':          if (!showSubmitConfirm) showSubmitConfirm = true; break;
      case 'r':          void fetchQuestion(currentIndex);                  break;
      case 'y':
        if (showSubmitConfirm) void submitExam();
        break;
      case 'x':
        if (showSubmitConfirm) showSubmitConfirm = false;
        break;
    }
  }

  // ─── Beacon on unload ─────────────────────────────────────────────────────
  function setupBeacon() {
    window.addEventListener('beforeunload', () => {
      if (!sessionId || step !== 'exam') return;
      for (const item of offlineQueue) {
        if (!item.questionId) continue;
        navigator.sendBeacon(
          `/api/exam/${data.examId}/answer`,
          JSON.stringify({ sessionId, questionId: item.questionId, answer: item.value }),
        );
      }
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  onMount(() => {
    isOnline = navigator.onLine;
    window.addEventListener('online',  () => { isOnline = true;  void syncOfflineQueue(); });
    window.addEventListener('offline', () => { isOnline = false; });
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    setupBeacon();

    const s = data.sessionStatus;

    if (s === 'submitted' || s === 'force_submitted') {
      step = 'submitted';
    } else if (s === 'flagged') {
      step = 'flagged';
    } else if ((s === 'in_progress' || s === 'not_started') && data.sessionId) {
      // Resume: session exists, restore local state then enter exam
      sessionId = data.sessionId;
      const stored = loadSession(data.sessionId);
      if (stored) {
        answers      = stored.answers;
        currentIndex = stored.currentIndex;
      }
      step = 'exam';
      void requestFullscreen();
      startLocalTimer();
      startTimerSync();
      void fetchQuestion(currentIndex);
    } else {
      // Fresh start
      void startExam();
    }

    return () => {
      stopAllTimers();
      if (submitRetryTimer) clearInterval(submitRetryTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  });

  // ─── Derived ──────────────────────────────────────────────────────────────
  const answeredCount = $derived(Object.keys(answers).length);
  const unanswered    = $derived(totalQuestions - answeredCount);
  const timerPct      = $derived(
    data.timeRemaining > 0
      ? Math.max(0, (timeRemaining / data.timeRemaining) * 100)
      : 0
  );

  function dotStatus(i: number): 'current' | 'answered' | 'unanswered' {
    if (i === currentIndex) return 'current';
    return answers[i] !== undefined ? 'answered' : 'unanswered';
  }
</script>

<svelte:head>
  <title>{data.exam.title} — eTest Kiosk</title>
</svelte:head>

<!-- ═══ STARTING ════════════════════════════════════════════════════════════ -->
{#if step === 'starting'}
  <div class="splash">
    <Loader2 size={36} class="spin" />
    <p>Starting exam…</p>
    {#if startError}
      <div class="splash-error">
        <AlertTriangle size={16} /> {startError}
        <button onclick={() => void startExam()}>Retry</button>
      </div>
    {/if}
  </div>

<!-- ═══ EXAM ═════════════════════════════════════════════════════════════════ -->
{:else if step === 'exam'}
  <!--
    KioskShell handles: tab-switch, window-blur, devtools, screenshot, copy-attempt
    violations via the onViolation callback.
  -->
  <KioskShell onViolation={handleViolation}>

    <!-- Watermark burns student identity into the screen -->
    <Watermark text="{data.student.matricNumber ?? data.student.name} · eTest" />

    <!-- Face monitor: camera-based violation detection -->
    {#if sessionId}
      <FaceMonitor
        {sessionId}
        examId={data.examId}
        enrolledDescriptor={data.faceDescriptor}
        maxViolations={data.exam.maxViolations}
        onAutoSubmit={submitExam}
        onFlagged={() => {
          notifyOpener('flagged');
          stopAllTimers();
          step = 'flagged';
        }}
      />
    {/if}

    <!-- Violation warning overlay -->
    {#if violationVisible}
      <ViolationWarning
        count={violationCount}
        max={data.exam.maxViolations}
        action={violationAction}
        flagType={violationType}
        onDismiss={() => { violationVisible = false; }}
      />
    {/if}

    <!-- Submit confirm dialog -->
    {#if showSubmitConfirm}
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="confirm-modal">
          <h2>Submit Exam?</h2>
          {#if unanswered > 0}
            <p class="confirm-warn">
              <AlertTriangle size={16} />
              <strong>{unanswered}</strong> question{unanswered !== 1 ? 's' : ''} unanswered
            </p>
          {:else}
            <p class="confirm-ok">All {totalQuestions} questions answered.</p>
          {/if}
          {#if submitError}
            <p class="submit-err">{submitError}</p>
          {/if}
          <div class="confirm-keys">
            <kbd>Y</kbd> confirm &nbsp; <kbd>X</kbd> cancel
          </div>
          <div class="confirm-actions">
            <button
              class="btn-cancel"
              onclick={() => showSubmitConfirm = false}
              disabled={isSubmitting}
            >
              Keep Working <kbd>X</kbd>
            </button>
            <button
              class="btn-submit-confirm"
              onclick={() => void submitExam()}
              disabled={isSubmitting}
            >
              {#if isSubmitting}
                <Loader2 size={15} class="spin" /> Submitting…
              {:else}
                <Send size={15} /> Submit Now <kbd>Y</kbd>
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- ── Main kiosk layout ──────────────────────────────────────────────── -->
    <div class="kiosk-layout">

      <!-- ══ LEFT SIDEBAR ════════════════════════════════════════════════════ -->
      <aside class="left-panel">

        <!-- Student identity card -->
        <div class="student-card">
          {#if data.student.photoUrl}
            <img src={data.student.photoUrl} alt={data.student.name} class="student-photo" />
          {:else}
            <div class="student-photo-placeholder"><User size={20} /></div>
          {/if}
          <div class="student-info">
            <span class="student-name">{data.student.name}</span>
            <span class="student-matric">{data.student.matricNumber ?? ''}</span>
          </div>
        </div>

        <!-- Exam identity -->
        <div class="exam-info-block">
          <span class="exam-code-pill">{data.exam.courseCode}</span>
          <span class="exam-title-text">{data.exam.title}</span>
        </div>

        <!-- Timer with progress bar -->
        <div class="timer-block" class:warning={timerWarning} class:critical={timerCritical}>
          <div class="timer-bar-track">
            <div
              class="timer-bar-fill"
              style="width: {timerPct}%"
              class:warning={timerWarning}
              class:critical={timerCritical}
            ></div>
          </div>
          <div class="timer-display">
            <Clock size={14} />
            <span class="timer-digits">{formatTime(timeRemaining)}</span>
          </div>
          {#if timerWarning && !timerCritical}
            <div class="timer-hint warn">Less than 5 minutes remaining</div>
          {:else if timerCritical}
            <div class="timer-hint crit">Less than 1 minute!</div>
          {/if}
        </div>

        <!-- Answer progress -->
        <div class="progress-block">
          <div class="progress-row">
            <span class="progress-label">Answered</span>
            <span class="progress-val">{answeredCount}/{totalQuestions}</span>
          </div>
          <div class="progress-track">
            <div
              class="progress-fill"
              style="width: {totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%"
            ></div>
          </div>
        </div>

        <!-- Question navigator grid -->
        <div class="nav-section">
          <div class="nav-legend">
            <span class="legend-dot answered"></span>Answered
            <span class="legend-dot unanswered"></span>Unanswered
            <span class="legend-dot current"></span>Current
          </div>
          <div class="nav-grid">
            {#each { length: totalQuestions } as _, i}
              <button
                class="nav-btn"
                class:answered={dotStatus(i) === 'answered'}
                class:current={dotStatus(i) === 'current'}
                onclick={() => void goToQuestion(i)}
                title="Question {i + 1}"
                tabindex="-1"
              >{i + 1}</button>
            {/each}
          </div>
        </div>

        <!-- Network status -->
        {#if !isOnline}
          <div class="offline-bar">Offline — {offlineQueue.length} answer{offlineQueue.length !== 1 ? 's' : ''} queued</div>
        {:else if offlineQueue.length > 0}
          <div class="syncing-bar">Syncing {offlineQueue.length} answer{offlineQueue.length !== 1 ? 's' : ''}…</div>
        {/if}

        <!-- Violation counter -->
        {#if violationCount > 0}
          <div class="violation-counter" class:danger={violationCount >= data.exam.maxViolations - 1}>
            <AlertTriangle size={13} />
            {violationCount}/{data.exam.maxViolations} violations
          </div>
        {/if}

        <!-- Submit button -->
        <button class="btn-submit-side" onclick={() => showSubmitConfirm = true}>
          <Send size={14} /> Submit Exam <kbd>S</kbd>
        </button>

        <!-- Keyboard hints -->
        <div class="key-hints">
          <div class="key-row"><kbd>A</kbd><kbd>B</kbd><kbd>C</kbd><kbd>D</kbd> Select option</div>
          <div class="key-row"><kbd>P</kbd> Previous &nbsp; <kbd>N</kbd> Next</div>
          <div class="key-row"><kbd>R</kbd> Reload question</div>
          <div class="key-row"><kbd>S</kbd> Submit exam</div>
        </div>
      </aside>

      <!-- ══ RIGHT PANEL — QUESTION ═════════════════════════════════════════ -->
      <main class="right-panel">
        {#if questionLoading}
          <div class="q-loading">
            <Loader2 size={36} class="spin" />
            <span>Loading question…</span>
          </div>

        {:else if questionError}
          <div class="q-error">
            <AlertTriangle size={28} />
            <p>{questionError}</p>
            <button class="btn-retry" onclick={() => void fetchQuestion(currentIndex)}>
              Retry <kbd>R</kbd>
            </button>
          </div>

        {:else if question}
          <div class="question-card">

            <div class="question-header">
              <div class="q-meta-left">
                <span class="q-number">Question {currentIndex + 1}</span>
                <span class="q-of">of {totalQuestions}</span>
              </div>
              <div class="q-meta-right">
                <span class="q-marks">{question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
                {#if answers[currentIndex] !== undefined}
                  <span class="q-answered-badge">
                    <CheckCircle size={12} /> Answered
                  </span>
                {/if}
              </div>
            </div>

            <div class="question-body-wrap">
              <p class="question-text">{question.body}</p>
              {#if question.imageUrl}
                <img src={question.imageUrl} alt="Question illustration" class="question-img" />
              {/if}
            </div>

            <!-- MCQ -->
            {#if question.type === 'mcq'}
              <div class="options-list">
                {#each question.options as opt, i}
                  {@const letter = String.fromCharCode(65 + i)}
                  {@const selected = answers[currentIndex] === opt.id}
                  <button
                    class="option-btn"
                    class:selected
                    onclick={() => saveAnswer(currentIndex, opt.id)}
                    tabindex="-1"
                  >
                    <span class="option-letter" class:selected>{letter}</span>
                    <span class="option-text">{opt.text}</span>
                    {#if selected}
                      <CheckCircle size={18} class="option-check" />
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}

            <!-- FITB -->
            {#if question.type === 'fill_in_the_blank'}
              <div class="fitb-wrap">
                <label class="fitb-label">Your answer</label>
                <input
                  type="text"
                  class="fitb-input"
                  placeholder="Type your answer here…"
                  value={answers[currentIndex] ?? ''}
                  oninput={(e) => saveAnswer(currentIndex, (e.currentTarget as HTMLInputElement).value)}
                />
              </div>
            {/if}

            <!-- Question nav footer -->
            <div class="question-footer">
              <button
                class="btn-nav btn-prev"
                disabled={currentIndex === 0 || questionLoading}
                onclick={goPrev}
                tabindex="-1"
              >
                <ChevronLeft size={18} /> Previous <kbd>P</kbd>
              </button>

              <div class="footer-center">
                {#if !isOnline}
                  <span class="offline-text">Offline — answers saved locally</span>
                {/if}
              </div>

              {#if currentIndex < totalQuestions - 1}
                <button
                  class="btn-nav btn-next"
                  disabled={questionLoading}
                  onclick={goNext}
                  tabindex="-1"
                >
                  Next <kbd>N</kbd> <ChevronRight size={18} />
                </button>
              {:else}
                <button
                  class="btn-nav btn-submit-footer"
                  disabled={isSubmitting}
                  onclick={() => showSubmitConfirm = true}
                  tabindex="-1"
                >
                  <Send size={16} /> Submit <kbd>S</kbd>
                </button>
              {/if}
            </div>
          </div>
        {/if}
      </main>
    </div>
  </KioskShell>

<!-- ═══ SUBMITTED ═══════════════════════════════════════════════════════════ -->
{:else if step === 'submitted'}
  <div class="terminal-screen">
    <div class="terminal-card">
      <CheckCircle size={56} class="done-icon" />
      <h1>Exam Submitted</h1>
      <p>Your answers have been recorded successfully.</p>
      <p class="terminal-sub">Results will be available once your exam is graded.</p>
      <p class="terminal-close">You may now close this window.</p>
    </div>
  </div>

<!-- ═══ FLAGGED ═════════════════════════════════════════════════════════════ -->
{:else if step === 'flagged'}
  <div class="terminal-screen warn">
    <div class="terminal-card">
      <AlertTriangle size={56} class="warn-icon" />
      <h1>Session Paused</h1>
      <p>Your exam has been paused pending invigilator review.</p>
      <p class="terminal-sub">Please wait — an invigilator will contact you shortly.</p>
      <p class="terminal-close">Do not close this window.</p>
    </div>
  </div>
{/if}

<style>
  :global(body) { margin: 0; overflow: hidden; background: var(--color-bg); user-select: none; }

  /* ── Splash ───────────────────────────────────────────────────────────── */
  .splash {
    height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1rem; color: var(--color-muted);
  }
  .splash p { font-size: 1rem; font-weight: 600; color: var(--color-text); }
  .splash-error {
    display: flex; align-items: center; gap: .5rem;
    font-size: .85rem; color: #dc2626;
    background: #fef2f2; border: 1px solid #fecaca;
    padding: .625rem 1rem; border-radius: .5rem;
  }
  .splash-error button {
    margin-left: .5rem; padding: .25rem .75rem;
    background: #dc2626; color: white; border: none; border-radius: .375rem;
    font-size: .78rem; font-weight: 700; cursor: pointer;
  }

  /* ── Kiosk layout ─────────────────────────────────────────────────────── */
  .kiosk-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    height: 100vh; overflow: hidden;
    position: relative; z-index: 2;
  }

  /* ── Left panel ───────────────────────────────────────────────────────── */
  .left-panel {
    display: flex; flex-direction: column; gap: .875rem;
    padding: 1rem;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    overflow-y: auto; overflow-x: hidden;
  }

  .student-card {
    display: flex; align-items: center; gap: .625rem;
    padding: .625rem;
    background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .75rem;
  }
  .student-photo {
    width: 38px; height: 38px; border-radius: 50%; object-fit: cover;
    border: 2px solid var(--student-accent, #10b981); flex-shrink: 0;
  }
  .student-photo-placeholder {
    width: 38px; height: 38px; border-radius: 50%;
    background: var(--color-bg); border: 2px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); flex-shrink: 0;
  }
  .student-info { display: flex; flex-direction: column; min-width: 0; }
  .student-name {
    font-size: .75rem; font-weight: 800; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .student-matric { font-size: .68rem; color: var(--color-muted); font-weight: 600; }

  .exam-info-block {
    display: flex; flex-direction: column; gap: .25rem;
    padding: .5rem .625rem;
    background: var(--student-accent-bg, rgba(16,185,129,.08));
    border: 1px solid var(--student-accent-border, rgba(16,185,129,.2));
    border-radius: .625rem;
  }
  .exam-code-pill {
    font-size: .65rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: .06em; color: var(--student-accent, #10b981);
  }
  .exam-title-text { font-size: .78rem; font-weight: 700; color: var(--color-text); line-height: 1.3; }

  /* Timer */
  .timer-block {
    padding: .75rem; background: var(--color-bg);
    border: 1.5px solid var(--color-border); border-radius: .75rem;
    transition: border-color .3s, background .3s;
  }
  .timer-block.warning  { border-color: #fcd34d; background: #fffbeb; }
  .timer-block.critical { border-color: #fca5a5; background: #fef2f2; animation: pulse-card 1s ease-in-out infinite; }
  @keyframes pulse-card {
    0%, 100% { box-shadow: none; }
    50%       { box-shadow: 0 0 0 4px rgba(220,38,38,.15); }
  }
  .timer-bar-track {
    height: 5px; background: var(--color-border); border-radius: 3px;
    overflow: hidden; margin-bottom: .625rem;
  }
  .timer-bar-fill {
    height: 100%; background: var(--student-accent, #10b981);
    border-radius: 3px; transition: width 1s linear, background .3s;
  }
  .timer-bar-fill.warning  { background: #f59e0b; }
  .timer-bar-fill.critical { background: #ef4444; }
  .timer-display { display: flex; align-items: center; gap: .5rem; color: var(--color-text); }
  .timer-digits {
    font-size: 1.6rem; font-weight: 900; font-variant-numeric: tabular-nums;
    letter-spacing: -.02em; line-height: 1;
  }
  .timer-block.warning  .timer-digits { color: #d97706; }
  .timer-block.critical .timer-digits { color: #dc2626; }
  .timer-hint {
    font-size: .68rem; font-weight: 700; margin-top: .375rem;
    padding: .2rem .5rem; border-radius: 4px; display: inline-block;
  }
  .timer-hint.warn { background: #fef9c3; color: #92400e; }
  .timer-hint.crit { background: #fef2f2; color: #991b1b; }

  /* Progress */
  .progress-block { display: flex; flex-direction: column; gap: .375rem; }
  .progress-row { display: flex; justify-content: space-between; align-items: center; }
  .progress-label { font-size: .7rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: .05em; }
  .progress-val   { font-size: .78rem; font-weight: 800; color: var(--color-text); }
  .progress-track { height: 5px; background: var(--color-border); border-radius: 3px; overflow: hidden; }
  .progress-fill  { height: 100%; background: var(--student-accent, #10b981); border-radius: 3px; transition: width .4s ease; }

  /* Navigator */
  .nav-section { display: flex; flex-direction: column; gap: .5rem; }
  .nav-legend {
    display: flex; align-items: center; gap: .5rem;
    font-size: .62rem; color: var(--color-muted); font-weight: 600; flex-wrap: wrap;
  }
  .legend-dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .legend-dot.answered   { background: var(--student-accent, #10b981); }
  .legend-dot.unanswered { background: var(--color-border); }
  .legend-dot.current    { background: #6366f1; }
  .nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: .3rem; }
  .nav-btn {
    aspect-ratio: 1; border-radius: 6px;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg); color: var(--color-muted);
    font-size: .68rem; font-weight: 700; cursor: pointer;
    transition: all .12s; display: flex; align-items: center; justify-content: center; padding: 0;
  }
  .nav-btn.answered {
    background: var(--student-accent-bg, rgba(16,185,129,.12));
    border-color: var(--student-accent, #10b981);
    color: var(--student-accent, #10b981);
  }
  .nav-btn.current {
    background: #6366f1; border-color: #6366f1; color: white;
    transform: scale(1.08); box-shadow: 0 2px 8px rgba(99,102,241,.35);
  }
  .nav-btn:hover:not(.current) { border-color: var(--student-accent, #10b981); }

  /* Status bars */
  .offline-bar, .syncing-bar {
    font-size: .7rem; font-weight: 700; text-align: center;
    padding: .4rem .75rem; border-radius: .5rem;
  }
  .offline-bar { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .syncing-bar { background: #eff6ff; color: #2563eb; border: 1px solid #93c5fd; }

  /* Violation counter */
  .violation-counter {
    display: flex; align-items: center; gap: .35rem;
    font-size: .72rem; font-weight: 700;
    padding: .35rem .75rem; border-radius: .5rem;
    background: #fffbeb; color: #92400e; border: 1px solid #fde68a;
  }
  .violation-counter.danger {
    background: #fef2f2; color: #991b1b; border-color: #fca5a5;
  }

  /* Submit side */
  .btn-submit-side {
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    width: 100%; padding: .75rem;
    background: #0f766e; color: white; border: none; border-radius: .75rem;
    font-size: .85rem; font-weight: 800; cursor: pointer; transition: all .2s; font-family: inherit;
  }
  .btn-submit-side:hover { background: #0d6560; transform: translateY(-1px); }
  .btn-submit-side kbd { font-size: .62rem; padding: .1rem .35rem; background: rgba(255,255,255,.2); border-radius: 3px; }

  /* Key hints */
  .key-hints {
    display: flex; flex-direction: column; gap: .3rem;
    padding: .625rem;
    background: var(--color-bg); border: 1px solid var(--color-border); border-radius: .625rem;
    margin-top: auto;
  }
  .key-row { font-size: .65rem; color: var(--color-muted); display: flex; align-items: center; gap: .25rem; flex-wrap: wrap; }
  .key-row kbd {
    font-size: .6rem; padding: .1rem .35rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 3px; color: var(--color-text); font-family: monospace; font-weight: 700;
  }

  /* ── Right panel ──────────────────────────────────────────────────────── */
  .right-panel {
    display: flex; flex-direction: column;
    height: 100vh; overflow: hidden;
    background: var(--color-bg);
  }

  .q-loading, .q-error {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1rem; color: var(--color-muted);
  }
  .q-error { color: #dc2626; }
  .q-error p { font-size: .95rem; font-weight: 600; margin: 0; }
  .btn-retry {
    display: inline-flex; align-items: center; gap: .5rem;
    padding: .625rem 1.25rem;
    background: var(--color-surface); color: var(--color-text);
    border: 1.5px solid var(--color-border); border-radius: .625rem;
    font-weight: 700; font-size: .875rem; cursor: pointer; font-family: inherit;
  }

  /* Question card */
  .question-card {
    flex: 1; display: flex; flex-direction: column;
    padding: 2rem 2.5rem; overflow-y: auto; gap: 1.5rem;
  }
  .question-header {
    display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
  }
  .q-meta-left { display: flex; align-items: baseline; gap: .5rem; }
  .q-number { font-size: 1rem; font-weight: 900; color: var(--color-text); letter-spacing: -.01em; }
  .q-of     { font-size: .8rem; color: var(--color-muted); font-weight: 600; }
  .q-meta-right { display: flex; align-items: center; gap: .75rem; }
  .q-marks {
    font-size: .78rem; font-weight: 700; padding: .25rem .65rem;
    background: var(--student-accent-bg, rgba(16,185,129,.1));
    color: var(--student-accent, #10b981); border-radius: 6px;
  }
  .q-answered-badge {
    display: flex; align-items: center; gap: .3rem;
    font-size: .72rem; font-weight: 700;
    color: var(--student-accent, #10b981);
    background: var(--student-accent-bg, rgba(16,185,129,.08));
    border: 1px solid var(--student-accent, #10b981);
    padding: .2rem .6rem; border-radius: 20px;
  }
  .question-body-wrap { flex-shrink: 0; }
  .question-text {
    font-size: 1.25rem; line-height: 1.75; color: var(--color-text);
    font-weight: 500; margin: 0; max-width: 72ch;
  }
  .question-img {
    max-width: 100%; max-height: 280px; object-fit: contain;
    border-radius: .75rem; margin-top: 1rem; border: 1px solid var(--color-border);
  }

  /* MCQ */
  .options-list { display: flex; flex-direction: column; gap: .75rem; flex-shrink: 0; }
  .option-btn {
    display: flex; align-items: center; gap: 1rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface); border: 1.5px solid var(--color-border);
    border-radius: .875rem; cursor: pointer; text-align: left;
    transition: all .15s; font-family: inherit; color: var(--color-text);
    max-width: 72ch;
  }
  .option-btn:hover:not(.selected) {
    border-color: var(--student-accent, #10b981);
    background: var(--student-accent-bg, rgba(16,185,129,.04));
    transform: translateX(2px);
  }
  .option-btn.selected {
    border-color: var(--student-accent, #10b981);
    background: var(--student-accent-bg, rgba(16,185,129,.1));
  }
  .option-letter {
    width: 36px; height: 36px; border-radius: 50%;
    border: 1.5px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    font-size: .88rem; font-weight: 900; flex-shrink: 0; color: var(--color-muted);
    transition: all .15s;
  }
  .option-letter.selected { background: var(--student-accent, #10b981); border-color: var(--student-accent, #10b981); color: white; }
  .option-text { flex: 1; font-size: 1rem; line-height: 1.5; }
  .option-btn :global(.option-check) { color: var(--student-accent, #10b981); flex-shrink: 0; }

  /* FITB */
  .fitb-wrap { display: flex; flex-direction: column; gap: .5rem; max-width: 60ch; flex-shrink: 0; }
  .fitb-label { font-size: .78rem; font-weight: 700; color: var(--color-muted); }
  .fitb-input {
    padding: 1rem 1.25rem; font-size: 1.1rem; font-family: inherit;
    color: var(--color-text); background: var(--color-surface);
    border: 1.5px solid var(--color-border); border-radius: .75rem;
    outline: none; transition: border-color .15s; user-select: text;
  }
  .fitb-input:focus { border-color: var(--student-accent, #10b981); }

  /* Nav footer */
  .question-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 1rem; border-top: 1px solid var(--color-border);
    flex-shrink: 0; margin-top: auto; gap: 1rem;
  }
  .footer-center { flex: 1; text-align: center; }
  .offline-text { font-size: .78rem; color: #dc2626; font-weight: 600; }
  .btn-nav {
    display: inline-flex; align-items: center; gap: .5rem;
    padding: .75rem 1.5rem; border-radius: .75rem;
    font-size: .9rem; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: all .2s;
    border: 1.5px solid var(--color-border);
    background: var(--color-surface); color: var(--color-text);
  }
  .btn-nav:disabled { opacity: .35; cursor: not-allowed; }
  .btn-nav kbd {
    font-size: .65rem; padding: .1rem .35rem;
    background: rgba(0,0,0,.06); border-radius: 3px; font-family: monospace;
  }
  .btn-prev:hover:not(:disabled) { border-color: var(--student-accent, #10b981); color: var(--student-accent, #10b981); }
  .btn-next { background: var(--student-accent, #10b981); color: white; border-color: var(--student-accent, #10b981); }
  .btn-next:hover:not(:disabled) { filter: brightness(.92); }
  .btn-next kbd { background: rgba(255,255,255,.2); }
  .btn-submit-footer { background: #0f766e; color: white; border-color: #0f766e; }
  .btn-submit-footer:hover:not(:disabled) { filter: brightness(.92); }
  .btn-submit-footer:disabled { opacity: .5; }
  .btn-submit-footer kbd { background: rgba(255,255,255,.2); }

  /* ── Submit confirm modal ─────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.6); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 1rem;
  }
  .confirm-modal {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 2rem;
    width: 100%; max-width: 440px;
    display: flex; flex-direction: column; gap: 1rem;
    box-shadow: 0 24px 64px rgba(0,0,0,.2);
  }
  .confirm-modal h2 { font-size: 1.15rem; font-weight: 900; margin: 0; color: var(--color-text); }
  .confirm-warn {
    display: flex; align-items: center; gap: .5rem;
    font-size: .875rem; color: #92400e;
    background: #fffbeb; border: 1px solid #fde68a;
    padding: .625rem .875rem; border-radius: .5rem; margin: 0;
  }
  .confirm-ok   { font-size: .875rem; color: var(--color-muted); margin: 0; }
  .submit-err   { font-size: .8rem; color: #dc2626; margin: 0; }
  .confirm-keys { font-size: .72rem; color: var(--color-muted); }
  .confirm-keys kbd {
    padding: .1rem .4rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 3px;
    font-family: monospace; font-size: .7rem;
  }
  .confirm-actions { display: flex; gap: .75rem; justify-content: flex-end; }
  .btn-cancel {
    display: inline-flex; align-items: center; gap: .35rem; padding: .7rem 1.25rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1.5px solid var(--color-border); border-radius: .625rem;
    font-weight: 700; font-size: .875rem; cursor: pointer; font-family: inherit;
  }
  .btn-cancel kbd {
    font-size: .65rem; padding: .1rem .3rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 3px; font-family: monospace;
  }
  .btn-cancel:disabled { opacity: .45; }
  .btn-submit-confirm {
    display: inline-flex; align-items: center; gap: .4rem; padding: .7rem 1.5rem;
    background: #0f766e; color: white; border: none; border-radius: .625rem;
    font-weight: 800; font-size: .875rem; cursor: pointer; font-family: inherit; transition: all .2s;
  }
  .btn-submit-confirm:hover:not(:disabled) { filter: brightness(.92); }
  .btn-submit-confirm:disabled { opacity: .5; cursor: not-allowed; }
  .btn-submit-confirm kbd { font-size: .65rem; padding: .1rem .3rem; background: rgba(255,255,255,.2); border-radius: 3px; font-family: monospace; }

  /* ── Terminal screens ─────────────────────────────────────────────────── */
  .terminal-screen {
    height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--color-bg); padding: 2rem;
  }
  .terminal-screen.warn { background: #fefce8; }
  .terminal-card {
    display: flex; flex-direction: column; align-items: center;
    gap: 1rem; text-align: center; max-width: 480px;
  }
  .terminal-card :global(.done-icon) { color: var(--student-accent, #10b981); }
  .terminal-card :global(.warn-icon) { color: #f59e0b; }
  .terminal-card h1 { font-size: 1.75rem; font-weight: 900; color: var(--color-text); margin: 0; }
  .terminal-card p  { font-size: .95rem; color: var(--color-muted); margin: 0; line-height: 1.6; }
  .terminal-sub { font-size: .85rem; }
  .terminal-close {
    font-size: .78rem; font-weight: 700; color: var(--color-muted);
    padding: .5rem 1rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .5rem; margin-top: .5rem;
  }

  /* ── Spin ─────────────────────────────────────────────────────────────── */
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>