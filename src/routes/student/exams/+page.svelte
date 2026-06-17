<!-- src/routes/student/exams/+page.svelte -->
<script lang="ts">
  import type { PageData }  from './$types';
  import { goto }           from '$app/navigation';
  import { onMount, tick }  from 'svelte';
  import {
    User, Mail, Hash, Building, GraduationCap,
    BookOpen, Clock, AlertTriangle, CheckCircle,
    ChevronRight, ChevronLeft, Shield, Eye, Maximize2,
    Wifi, WifiOff, Loader2, Send
  } from '@lucide/svelte';

  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';
  import FaceVerifyModal     from '$lib/components/exam/FaceVerifyModal.svelte';
  import FaceMonitor         from '$lib/components/exam/FaceMonitor.svelte';

  import {
    persistSession,
    loadSession,
    clearSession,
    mergeServerAnswers,
    pendingAnswers,
    type PersistedSession,
  } from '$lib/exam/session-store.js';

  let { data }: { data: PageData } = $props();

  // ─── Flow step ──────────────────────────────────────────────────────────
  type Step =
    | 'enroll'     // no face descriptor → enrollment
    | 'verify'     // descriptor exists, not verified this session
    | 'preview'    // identity confirmation
    | 'rules'      // rules scroll + checkbox
    | 'lobby'      // waiting for scheduled exam
    | 'exam'       // active exam
    | 'submitted'
    | 'flagged'
    | 'blocked';

  function initialStep(): Step {
    const s = data.sessionStatus;
    if (s === 'submitted' || s === 'force_submitted') return 'submitted';
    if (s === 'flagged')                               return 'flagged';
    if (!data.faceEnrolled)                            return 'enroll';
    if (!data.faceVerified)                            return 'verify';
    if (s === 'in_progress' && data.sessionId)         return 'exam';
    return 'preview';
  }

  let step = $state<Step>(initialStep());

  // ─── Session state (set after start API call) ───────────────────────────
  let sessionId      = $state<string | null>(data.sessionId);
  let totalQuestions = $state<number>(data.totalQuestions ?? 0);
  let timeRemaining  = $state<number>(data.timeRemaining ?? 0);
  let currentIndex   = $state<number>(0);

  // answers: displayIndex → selectedOptionId or text
  let answers = $state<Record<number, string>>({});

  // ─── Current question ───────────────────────────────────────────────────
  type ClientQuestion = {
    id:       string;
    type:     'mcq' | 'fill_in_the_blank';
    body:     string;
    imageUrl: string | null;
    marks:    number;
    options:  Array<{ id: string; text: string }>;
  };

  let question        = $state<ClientQuestion | null>(null);
  let questionLoading = $state(false);
  let questionError   = $state('');

  // ─── Network / sync ─────────────────────────────────────────────────────
  let isOnline        = $state(true);
  // Queue of { index, value } waiting to be synced to server
  let offlineQueue    = $state<Array<{ index: number; questionId: string; value: string }>>([]);
  let isSyncing       = $state(false);

  // ─── Submit ─────────────────────────────────────────────────────────────
  let isSubmitting    = $state(false);
  let submitError     = $state('');
  let submitRetryTimer: ReturnType<typeof setInterval> | null = null;

  // ─── Timer ──────────────────────────────────────────────────────────────
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (timeRemaining <= 0) {
        clearInterval(timerInterval!);
        timerInterval = null;
        handleAutoSubmit();
        return;
      }
      timeRemaining--;
      // Persist time offset every 10 seconds
      if (timeRemaining % 10 === 0 && sessionId) {
        persistSession(buildPersistedState());
      }
    }, 1000);
  }

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

  // ─── Lobby ───────────────────────────────────────────────────────────────
  let lobbySecondsLeft  = $state(0);
  let lobbyInterval: ReturnType<typeof setInterval> | null = null;

  function startLobbyCountdown() {
    const start = data.exam.scheduledStart
      ? new Date(data.exam.scheduledStart).getTime()
      : null;

    if (!start) { handleStartExam(); return; }

    const update = () => {
      const diff = Math.max(0, Math.floor((start - Date.now()) / 1000));
      lobbySecondsLeft = diff;
      if (diff <= 0 && lobbyInterval) {
        clearInterval(lobbyInterval);
        lobbyInterval = null;
        handleStartExam();
      }
    };
    update();
    lobbyInterval = setInterval(update, 1000);
  }

  // ─── Rules ───────────────────────────────────────────────────────────────
  let rulesAccepted = $state(false);
  let rulesScrolled = $state(false);

  function handleRulesScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) rulesScrolled = true;
  }

  async function acceptRules() {
    if (!rulesAccepted || !rulesScrolled) return;
    try { await document.documentElement.requestFullscreen(); } catch { /* ok */ }
    if (data.exam.status === 'active') {
      await handleStartExam();
    } else {
      step = 'lobby';
      startLobbyCountdown();
    }
  }

  // ─── Start exam ───────────────────────────────────────────────────────────
  let isStarting  = $state(false);
  let startError  = $state('');

  async function handleStartExam() {
    if (isStarting) return;
    isStarting = true;
    startError = '';
    try {
      const res  = await fetch(`/api/exam/${data.examId}/start`, { method: 'POST' });
      const json = await res.json();

      if (res.status === 409) { step = 'submitted'; return; }
      if (res.status === 423) { step = 'flagged';   return; }
      if (!res.ok) { startError = json.message ?? `Error ${res.status}`; return; }

      sessionId      = json.sessionId;
      totalQuestions = json.totalQuestions;
      timeRemaining  = json.timeRemaining;

      // Merge server-confirmed answers into local state
      const stored = loadSession(json.sessionId);
      if (stored) {
        answers = mergeServerAnswers(stored, json.serverAnswers).answers;
        currentIndex = stored.currentIndex;
      } else {
        answers = json.serverAnswers ?? {};
        currentIndex = json.currentIndex ?? 0;
      }

      // Sync any locally queued answers that server doesn't have
      const serverKnown = new Set(Object.keys(json.serverAnswers ?? {}).map(Number));
      if (stored) {
        const pending = pendingAnswers(stored, serverKnown);
        for (const item of pending) {
          // Re-queue — will flush via syncOfflineQueue
          // We need the questionId; fetch it from the order table via a lightweight call
          offlineQueue.push({ index: item.index, questionId: '', value: item.value });
        }
      }

      persistSession(buildPersistedState());
      step = 'exam';
      await tick();
      startTimer();
      await fetchQuestion(currentIndex);
    } catch (e: any) {
      startError = e.message ?? 'Network error';
    } finally {
      isStarting = false;
    }
  }

  // ─── Fetch single question ────────────────────────────────────────────────
  async function fetchQuestion(idx: number) {
    if (!sessionId) return;
    questionLoading = true;
    questionError   = '';
    question        = null;

    try {
      const res = await fetch(
        `/api/exam/${data.examId}/question?index=${idx}&sessionId=${sessionId}`
      );
      if (res.status === 409) { step = 'submitted'; return; }
      if (res.status === 423) { step = 'flagged';   return; }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        questionError = j.message ?? `Failed to load question ${idx + 1}`;
        return;
      }
      const payload = await res.json();
      question        = payload.question;
      totalQuestions  = payload.total; // keep in sync
      currentIndex    = idx;
      persistSession(buildPersistedState());
    } catch {
      questionError = 'Network error — tap Retry to reload this question';
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
      // Queue for later sync
      const existing = offlineQueue.findIndex(q => q.index === idx);
      if (existing >= 0) offlineQueue[existing] = { index: idx, questionId, value };
      else offlineQueue = [...offlineQueue, { index: idx, questionId, value }];
      return;
    }

    try {
      const res = await fetch(`/api/exam/${data.examId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId, answer: value }),
      });

      if (res.status === 409) { step = 'submitted'; return; }
      if (!res.ok) {
        // Push to offline queue to retry
        offlineQueue = [...offlineQueue, { index: idx, questionId, value }];
      }
    } catch {
      offlineQueue = [...offlineQueue, { index: idx, questionId, value }];
    }
  }

  // ─── Offline queue sync ───────────────────────────────────────────────────
  async function syncOfflineQueue() {
    if (isSyncing || offlineQueue.length === 0 || !isOnline || !sessionId) return;
    isSyncing = true;
    const batch = [...offlineQueue];
    const failed: typeof offlineQueue = [];

    for (const item of batch) {
      if (!item.questionId) continue; // can't sync without questionId
      try {
        const res = await fetch(`/api/exam/${data.examId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId: item.questionId,
            answer: item.value,
          }),
        });
        if (!res.ok && res.status !== 409) failed.push(item);
      } catch {
        failed.push(item);
      }
    }

    offlineQueue = failed;
    isSyncing = false;
  }

  // ─── Navigate questions ───────────────────────────────────────────────────
  async function goToQuestion(idx: number) {
    if (idx < 0 || idx >= totalQuestions) return;
    await fetchQuestion(idx);
  }

  async function goNext() { await goToQuestion(currentIndex + 1); }
  async function goPrev() { await goToQuestion(currentIndex - 1); }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function submitExam() {
    if (!sessionId || isSubmitting) return;
    isSubmitting = true;
    submitError  = '';
    if (submitRetryTimer) { clearInterval(submitRetryTimer); submitRetryTimer = null; }

    // Flush queue first
    await syncOfflineQueue();

    try {
      const res = await fetch(`/api/exam/${data.examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (res.status === 409 || res.ok) {
        clearSession(sessionId);
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        step = 'submitted';
        return;
      }

      // Network / server error — schedule retry every 5 s
      submitError = 'Submission failed — retrying…';
      submitRetryTimer = setInterval(submitExam, 5000);
    } catch {
      submitError = 'No connection — retrying…';
      submitRetryTimer = setInterval(submitExam, 5000);
    } finally {
      // Only set false if we didn't schedule a retry
      if (!submitRetryTimer) isSubmitting = false;
    }
  }

  async function handleAutoSubmit() {
    await submitExam();
  }

  // ─── sendBeacon on unload ─────────────────────────────────────────────────
  function setupBeacon() {
    window.addEventListener('beforeunload', () => {
      if (!sessionId || step !== 'exam') return;

      // Flush offline queue via beacon (best-effort)
      for (const item of offlineQueue) {
        if (!item.questionId) continue;
        navigator.sendBeacon(
          `/api/exam/${data.examId}/answer`,
          JSON.stringify({ sessionId, questionId: item.questionId, answer: item.value }),
        );
      }
    });
  }

  // ─── Online/offline detection ─────────────────────────────────────────────
  function setupNetworkListeners() {
    isOnline = navigator.onLine;
    window.addEventListener('online',  () => { isOnline = true;  syncOfflineQueue(); });
    window.addEventListener('offline', () => { isOnline = false; });
  }

  // ─── Transitions into exam step (resume) ─────────────────────────────────
  async function enterExamFromResume() {
    // sessionId already set from server load
    startTimer();
    await fetchQuestion(currentIndex);
  }

  // ─── Face events ─────────────────────────────────────────────────────────
  function onEnrollComplete() { step = 'verify'; }

  function onVerifySuccess() {
    if (data.sessionStatus === 'in_progress' && data.sessionId) {
      sessionId     = data.sessionId;
      timeRemaining = data.timeRemaining;
      // Restore local state if available
      const stored = loadSession(data.sessionId);
      if (stored) {
        answers      = stored.answers;
        currentIndex = stored.currentIndex;
      }
      void enterExamFromResume();
      step = 'exam';
    } else {
      step = 'preview';
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  onMount(() => {
    setupNetworkListeners();
    setupBeacon();

    // If we land directly in exam step (resume after hard refresh)
    if (step === 'exam' && sessionId) {
      void enterExamFromResume();
    }

    return () => {
      if (timerInterval)  clearInterval(timerInterval);
      if (lobbyInterval)  clearInterval(lobbyInterval);
      if (submitRetryTimer) clearInterval(submitRetryTimer);
    };
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function formatTime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function formatScheduled(d: string | null): string {
    if (!d) return 'TBD';
    return new Date(d).toLocaleString('en-NG', {
      weekday:'short', month:'short', day:'numeric',
      hour:'2-digit', minute:'2-digit',
    });
  }

  let answeredCount = $derived(Object.keys(answers).length);
  let timerWarning  = $derived(timeRemaining > 0 && timeRemaining <= 300);
  let timerCritical = $derived(timeRemaining > 0 && timeRemaining <= 60);

  // ─── Confirm submit dialog ────────────────────────────────────────────────
  let showSubmitConfirm = $state(false);
  const unanswered = $derived(totalQuestions - answeredCount);
</script>

<svelte:head>
  <title>{data.exam.title} — eTest</title>
</svelte:head>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- FACE ENROLLMENT                                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#if step === 'enroll'}
  <FaceEnrollmentModal
    open={true}
    onClose={() => goto('/student/exams')}
    onComplete={onEnrollComplete}
  />
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- FACE VERIFICATION                                                        -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#if step === 'verify'}
  <FaceVerifyModal
    examId={data.examId}
    onSuccess={onVerifySuccess}
    onCancel={() => goto('/student/exams')}
  />
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- IDENTITY PREVIEW                                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#if step === 'preview'}
  <div class="page-wrap">
    <div class="flow-card">
      <div class="card-header">
        <Shield size={20} class="header-icon" />
        <div>
          <h1>Confirm Your Identity</h1>
          <p>Verify that the information below is yours before proceeding</p>
        </div>
      </div>

      <div class="exam-banner">
        <div class="exam-banner-code">{data.exam.courseCode}</div>
        <div class="exam-banner-info">
          <span class="exam-banner-title">{data.exam.title}</span>
          <div class="exam-banner-meta">
            <span><Clock size={13} /> {data.exam.durationMinutes} min</span>
            <span><BookOpen size={13} /> {data.exam.totalQuestions} questions</span>
          </div>
        </div>
      </div>

      <div class="student-preview">
        <div class="preview-photo-col">
          {#if data.student.photoUrl}
            <img src={data.student.photoUrl} alt={data.student.name} class="preview-photo" />
          {:else}
            <div class="preview-photo-placeholder"><User size={40} /></div>
          {/if}
          <div class="preview-name">{data.student.name}</div>
        </div>

        <div class="preview-details">
          <div class="detail-row">
            <Hash size={15} />
            <span class="detail-label">Matric No.</span>
            <span class="detail-value">{data.student.matricNumber ?? 'N/A'}</span>
          </div>
          <div class="detail-row">
            <Mail size={15} />
            <span class="detail-label">Email</span>
            <span class="detail-value">{data.student.email}</span>
          </div>
          {#if data.student.department}
            <div class="detail-row">
              <Building size={15} />
              <span class="detail-label">Department</span>
              <span class="detail-value">{data.student.department}</span>
            </div>
          {/if}
          {#if data.student.level}
            <div class="detail-row">
              <GraduationCap size={15} />
              <span class="detail-label">Level</span>
              <span class="detail-value">{data.student.level}</span>
            </div>
          {/if}
          {#if data.student.programme}
            <div class="detail-row">
              <BookOpen size={15} />
              <span class="detail-label">Programme</span>
              <span class="detail-value">{data.student.programme}</span>
            </div>
          {/if}
        </div>
      </div>

      <div class="preview-question">
        <AlertTriangle size={18} class="warn-icon" />
        <p>Is all the information above correct and belongs to you?</p>
      </div>

      <div class="preview-actions">
        <button class="btn-danger" onclick={() => step = 'blocked'}>
          No, this is not me
        </button>
        <button class="btn-primary" onclick={() => step = 'rules'}>
          Yes, proceed <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- RULES                                                                    -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#if step === 'rules'}
  <div class="page-wrap">
    <div class="flow-card rules-card">
      <div class="card-header">
        <Eye size={20} class="header-icon" />
        <div>
          <h1>Exam Rules & Regulations</h1>
          <p>Read carefully — scroll to the bottom to continue</p>
        </div>
      </div>

      <div class="rules-scroll" onscroll={handleRulesScroll}>
        <h2>General Conduct</h2>
        <ol>
          <li>This exam is strictly individual. Collaboration or communication with others is prohibited.</li>
          <li>Remain in front of your camera at all times. Leaving the frame counts as a violation.</li>
          <li>Only one face must be visible — having another person present may trigger auto-submission.</li>
          <li>Switching tabs, minimising the window, or navigating away will be flagged.</li>
          <li>Screenshots, screen recordings, or photographs of exam content are prohibited.</li>
          <li>External devices (phones, printed materials) are not permitted during the exam.</li>
        </ol>

        <h2>Technical Requirements</h2>
        <ol>
          <li>The exam runs in fullscreen. Exiting fullscreen is a violation.</li>
          <li>Ensure a stable connection before starting. Network issues do not pause the timer.</li>
          <li>Your camera must remain active and unobstructed throughout.</li>
          <li>Auto-submission on time expiry or repeated violations is final.</li>
        </ol>

        <h2>Violations & Consequences</h2>
        <ol>
          <li>Each detected violation increments your counter and triggers an on-screen warning.</li>
          <li>Reaching {data.exam.maxViolations} violations causes automatic submission.</li>
          <li>Face mismatch or multiple faces detected will pause your session for review.</li>
          <li>Attempting to spoof the camera leads to immediate disqualification.</li>
        </ol>

        <h2>Submission</h2>
        <ol>
          <li>You may submit at any time before the timer expires.</li>
          <li>When the timer reaches zero, your exam is auto-submitted with all saved answers.</li>
          <li>Submission is final — you cannot re-enter.</li>
        </ol>

        <div class="rules-end-marker">
          <CheckCircle size={20} /> <span>End of rules</span>
        </div>
      </div>

      <div class="rules-footer">
        <label class="accept-label" class:disabled={!rulesScrolled}>
          <input
            type="checkbox"
            bind:checked={rulesAccepted}
            disabled={!rulesScrolled}
          />
          <span>I have read and understand all the rules above.</span>
        </label>

        {#if !rulesScrolled}
          <p class="scroll-hint">Scroll to the bottom to enable acceptance</p>
        {/if}

        <button
          class="btn-primary"
          disabled={!rulesAccepted || !rulesScrolled}
          onclick={acceptRules}
        >
          <Maximize2 size={16} /> Accept & Enter Fullscreen
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- LOBBY                                                                    -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#if step === 'lobby'}
  <div class="page-wrap lobby-bg">
    <div class="lobby-card">
      <div class="lobby-badge">Waiting Room</div>
      <h1 class="lobby-title">{data.exam.title}</h1>
      <p class="lobby-course">{data.exam.courseCode} — {data.exam.courseTitle}</p>

      <div class="lobby-countdown">
        <div class="countdown-label">Exam starts in</div>
        <div class="countdown-display">{formatTime(lobbySecondsLeft)}</div>
        <div class="countdown-sub">Scheduled: {formatScheduled(data.exam.scheduledStart)}</div>
      </div>

      <div class="lobby-info">
        <div class="lobby-info-item"><Clock size={16} /> {data.exam.durationMinutes} minutes</div>
        <div class="lobby-info-item"><BookOpen size={16} /> {data.exam.totalQuestions} questions</div>
      </div>

      {#if startError}
        <div class="lobby-error"><AlertTriangle size={16} /> {startError}</div>
      {/if}

      <p class="lobby-hint">The exam will start automatically when the timer reaches zero.</p>

      {#if lobbySecondsLeft === 0}
        <button class="btn-start" onclick={() => handleStartExam()} disabled={isStarting}>
          {isStarting ? 'Starting…' : 'Start Exam Now'}
        </button>
      {/if}
    </div>
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- EXAM INTERFACE                                                           -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#if step === 'exam' && sessionId}
  <!-- Face monitor runs silently in background -->
  <FaceMonitor
    sessionId={sessionId}
    examId={data.examId}
    enrolledDescriptor={data.faceDescriptor}
    maxViolations={data.exam.maxViolations}
    onAutoSubmit={submitExam}
    onFlagged={() => { step = 'flagged'; }}
  />

  <div class="exam-shell">
    <!-- ── Header bar ─────────────────────────────────────────────────────── -->
    <header class="exam-header">
      <div class="exam-header-left">
        <span class="exam-code-pill">{data.exam.courseCode}</span>
        <span class="exam-title-sm">{data.exam.title}</span>
      </div>
      <div class="exam-header-center">
        <div class="timer" class:warning={timerWarning} class:critical={timerCritical}>
          <Clock size={14} />
          {formatTime(timeRemaining)}
        </div>
      </div>
      <div class="exam-header-right">
        <!-- Offline indicator -->
        {#if !isOnline}
          <span class="offline-badge">
            <WifiOff size={13} /> Offline — {offlineQueue.length} queued
          </span>
        {:else if offlineQueue.length > 0 && isSyncing}
          <span class="syncing-badge">
            <Loader2 size={13} class="spin" /> Syncing…
          </span>
        {:else if offlineQueue.length > 0}
          <span class="pending-badge">
            <Wifi size={13} /> {offlineQueue.length} pending
          </span>
        {/if}

        <div class="progress-pill">{answeredCount}/{totalQuestions}</div>

        <button class="btn-submit-sm" onclick={() => showSubmitConfirm = true}>
          <Send size={14} /> Submit
        </button>
      </div>
    </header>

    <!-- ── Navigator ─────────────────────────────────────────────────────── -->
    <div class="question-navigator">
      {#each { length: totalQuestions } as _, i}
        <button
          class="nav-dot"
          class:answered={answers[i] !== undefined}
          class:active={i === currentIndex}
          onclick={() => goToQuestion(i)}
          title="Question {i + 1}"
        >{i + 1}</button>
      {/each}
    </div>

    <!-- ── Question area ──────────────────────────────────────────────────── -->
    <main class="question-area">
      {#if questionLoading}
        <div class="q-loading">
          <Loader2 size={32} class="spin" />
          <span>Loading question…</span>
        </div>
      {:else if questionError}
        <div class="q-error">
          <AlertTriangle size={24} />
          <p>{questionError}</p>
          <button class="btn-secondary" onclick={() => fetchQuestion(currentIndex)}>
            Retry
          </button>
        </div>
      {:else if question}
        <div class="question-card">
          <div class="question-meta">
            <span class="q-number">Question {currentIndex + 1} of {totalQuestions}</span>
            <span class="q-marks">{question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
          </div>

          <p class="question-body">{question.body}</p>

          {#if question.imageUrl}
            <img src={question.imageUrl} alt="Question illustration" class="question-img" />
          {/if}

          <!-- MCQ options -->
          {#if question.type === 'mcq'}
            <div class="options-list">
              {#each question.options as opt, i}
                {@const letter = String.fromCharCode(65 + i)}
                {@const selected = answers[currentIndex] === opt.id}
                <button
                  class="option-btn"
                  class:selected
                  onclick={() => saveAnswer(currentIndex, opt.id)}
                >
                  <span class="option-letter" class:selected>{letter}</span>
                  <span class="option-text">{opt.text}</span>
                  {#if selected}
                    <CheckCircle size={16} class="option-check" />
                  {/if}
                </button>
              {/each}
            </div>
          {/if}

          <!-- Fill in the blank -->
          {#if question.type === 'fill_in_the_blank'}
            <div class="fitb-wrap">
              <input
                type="text"
                class="fitb-input"
                placeholder="Type your answer here…"
                value={answers[currentIndex] ?? ''}
                oninput={(e) => saveAnswer(currentIndex, (e.currentTarget as HTMLInputElement).value)}
              />
            </div>
          {/if}
        </div>
      {/if}
    </main>

    <!-- ── Navigation ─────────────────────────────────────────────────────── -->
    <footer class="exam-footer">
      <button
        class="btn-nav"
        disabled={currentIndex === 0 || questionLoading}
        onclick={goPrev}
      >
        <ChevronLeft size={16} /> Previous
      </button>

      <span class="footer-center">
        {#if !isOnline}
          <span class="offline-text"><WifiOff size={13} /> Offline — answers saved locally</span>
        {/if}
      </span>

      {#if currentIndex < totalQuestions - 1}
        <button
          class="btn-nav btn-nav-next"
          disabled={questionLoading}
          onclick={goNext}
        >
          Next <ChevronRight size={16} />
        </button>
      {:else}
        <button
          class="btn-nav btn-nav-submit"
          disabled={isSubmitting}
          onclick={() => showSubmitConfirm = true}
        >
          <Send size={16} />
          {isSubmitting ? 'Submitting…' : 'Submit Exam'}
        </button>
      {/if}
    </footer>
  </div>

  <!-- ── Submit confirmation dialog ─────────────────────────────────────── -->
  {#if showSubmitConfirm}
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="confirm-modal">
        <h2>Submit Exam?</h2>
        {#if unanswered > 0}
          <p class="confirm-warn">
            <AlertTriangle size={16} />
            You have <strong>{unanswered}</strong> unanswered question{unanswered !== 1 ? 's' : ''}.
          </p>
        {:else}
          <p>You've answered all {totalQuestions} questions. Ready to submit?</p>
        {/if}
        {#if submitError}
          <p class="submit-error">{submitError}</p>
        {/if}
        <div class="confirm-actions">
          <button
            class="btn-secondary"
            onclick={() => showSubmitConfirm = false}
            disabled={isSubmitting}
          >
            Keep Working
          </button>
          <button
            class="btn-submit-confirm"
            onclick={submitExam}
            disabled={isSubmitting}
          >
            {#if isSubmitting}
              <Loader2 size={15} class="spin" /> Submitting…
            {:else}
              <Send size={15} /> Submit Now
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- TERMINAL STATES                                                          -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#if step === 'submitted'}
  <div class="page-wrap">
    <div class="flow-card center-card">
      <CheckCircle size={48} class="done-icon" />
      <h1>Exam Submitted</h1>
      <p>Your answers have been recorded. Results will be available once graded.</p>
      <button class="btn-primary" onclick={() => goto('/student/results')}>
        View Results
      </button>
    </div>
  </div>
{/if}

{#if step === 'flagged'}
  <div class="page-wrap">
    <div class="flow-card center-card warn-card">
      <AlertTriangle size={48} class="warn-icon-lg" />
      <h1>Session Paused</h1>
      <p>Your exam has been paused pending invigilator review. Please wait — an invigilator will contact you shortly.</p>
      <button class="btn-secondary" onclick={() => goto('/student')}>
        Return to Dashboard
      </button>
    </div>
  </div>
{/if}

{#if step === 'blocked'}
  <div class="page-wrap">
    <div class="flow-card center-card warn-card">
      <AlertTriangle size={48} class="warn-icon-lg" />
      <h1>Identity Mismatch Reported</h1>
      <p>
        You indicated the displayed information does not belong to you.
        Your response has been recorded. Contact the exams office or your
        invigilator immediately — you cannot proceed until this is resolved.
      </p>
      <button class="btn-secondary" onclick={() => goto('/student')}>
        Return to Dashboard
      </button>
    </div>
  </div>
{/if}

<style>
  /* ── Base ────────────────────────────────────────────────────────────── */
  .page-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: var(--color-bg);
  }

  /* ── Flow card ───────────────────────────────────────────────────────── */
  .flow-card {
    width: 100%;
    max-width: 580px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    overflow: hidden;
    box-shadow: 0 8px 32px rgb(0 0 0 / .06);
  }

  .center-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
    padding: 3rem 2rem;
  }

  .warn-card { border-color: #fbbf24; }

  /* ── Card header ─────────────────────────────────────────────────────── */
  .card-header {
    display: flex;
    align-items: flex-start;
    gap: .875rem;
    padding: 1.5rem 1.5rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .card-header :global(.header-icon) {
    color: var(--student-accent, #10b981);
    margin-top: .1rem;
    flex-shrink: 0;
  }
  .card-header h1 { font-size: 1.1rem; font-weight: 800; margin: 0 0 .2rem; color: var(--color-text); }
  .card-header p  { font-size: .82rem; color: var(--color-muted); margin: 0; }

  /* ── Exam banner ─────────────────────────────────────────────────────── */
  .exam-banner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }
  .exam-banner-code {
    font-size: .75rem;
    font-weight: 800;
    padding: .25rem .6rem;
    background: var(--student-accent-bg, rgba(16,185,129,.1));
    color: var(--student-accent, #10b981);
    border-radius: 6px;
    white-space: nowrap;
  }
  .exam-banner-title { font-size: .9rem; font-weight: 700; color: var(--color-text); display: block; }
  .exam-banner-meta  { display: flex; gap: .75rem; font-size: .78rem; color: var(--color-muted); margin-top: .2rem; }
  .exam-banner-meta span { display: flex; align-items: center; gap: .25rem; }

  /* ── Student preview ─────────────────────────────────────────────────── */
  .student-preview {
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .preview-photo-col { display: flex; flex-direction: column; align-items: center; gap: .5rem; flex-shrink: 0; }
  .preview-photo {
    width: 90px; height: 90px;
    border-radius: 50%; object-fit: cover;
    border: 3px solid var(--student-accent, #10b981);
    box-shadow: 0 0 0 6px var(--student-accent-bg, rgba(16,185,129,.1));
  }
  .preview-photo-placeholder {
    width: 90px; height: 90px;
    border-radius: 50%;
    background: var(--color-bg);
    border: 3px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted);
  }
  .preview-name { font-size: .8rem; font-weight: 700; color: var(--color-text); text-align: center; max-width: 90px; }
  .preview-details { flex: 1; display: flex; flex-direction: column; gap: .5rem; }
  .detail-row { display: flex; align-items: center; gap: .5rem; font-size: .85rem; }
  .detail-row :global(svg) { color: var(--color-muted); flex-shrink: 0; opacity: .7; }
  .detail-label { color: var(--color-muted); width: 90px; flex-shrink: 0; font-size: .78rem; }
  .detail-value { color: var(--color-text); font-weight: 600; }

  .preview-question {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: 1rem 1.5rem;
    background: #fefce8;
    border-bottom: 1px solid #fef08a;
  }
  .preview-question :global(.warn-icon) { color: #ca8a04; flex-shrink: 0; }
  .preview-question p { font-size: .88rem; font-weight: 600; color: #92400e; margin: 0; }

  .preview-actions { display: flex; gap: .75rem; padding: 1.25rem 1.5rem; justify-content: flex-end; }

  /* ── Rules ───────────────────────────────────────────────────────────── */
  .rules-card { max-width: 680px; }
  .rules-scroll {
    max-height: 380px;
    overflow-y: auto;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
    scroll-behavior: smooth;
  }
  .rules-scroll h2 {
    font-size: .78rem; font-weight: 800;
    color: var(--color-text);
    margin: 1.25rem 0 .5rem;
    text-transform: uppercase; letter-spacing: .05em;
  }
  .rules-scroll h2:first-child { margin-top: 0; }
  .rules-scroll ol  { padding-left: 1.25rem; margin: 0 0 .75rem; }
  .rules-scroll li  { font-size: .85rem; color: var(--color-text); line-height: 1.6; margin-bottom: .4rem; }
  .rules-end-marker {
    display: flex; align-items: center; gap: .5rem;
    color: var(--student-accent, #10b981); font-size: .8rem; font-weight: 600;
    margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed var(--color-border);
  }
  .rules-footer { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: .75rem; }
  .accept-label { display: flex; align-items: flex-start; gap: .625rem; cursor: pointer; font-size: .85rem; color: var(--color-text); line-height: 1.5; }
  .accept-label.disabled { opacity: .5; cursor: not-allowed; }
  .accept-label input[type="checkbox"] { margin-top: .15rem; accent-color: var(--student-accent, #10b981); flex-shrink: 0; }
  .scroll-hint { font-size: .75rem; color: var(--color-muted); margin: 0; font-style: italic; }

  /* ── Lobby ───────────────────────────────────────────────────────────── */
  .lobby-bg { background: var(--color-bg); }
  .lobby-card {
    width: 100%; max-width: 480px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.5rem;
    padding: 2.5rem 2rem;
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    text-align: center;
    box-shadow: 0 8px 32px rgb(0 0 0 / .06);
  }
  .lobby-badge {
    font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;
    padding: .25rem .75rem;
    background: var(--student-accent-bg, rgba(16,185,129,.1));
    color: var(--student-accent, #10b981);
    border-radius: 999px;
  }
  .lobby-title  { font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin: 0; line-height: 1.3; }
  .lobby-course { font-size: .875rem; color: var(--color-muted); margin: 0; }
  .lobby-countdown {
    width: 100%; padding: 1.5rem;
    background: var(--color-bg); border-radius: 1rem; border: 1px solid var(--color-border);
    margin: .5rem 0;
  }
  .countdown-label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); margin-bottom: .5rem; }
  .countdown-display { font-size: 3rem; font-weight: 800; color: var(--student-accent, #10b981); font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -.02em; }
  .countdown-sub { font-size: .75rem; color: var(--color-muted); margin-top: .5rem; }
  .lobby-info { display: flex; gap: 1.5rem; font-size: .85rem; color: var(--color-muted); }
  .lobby-info-item { display: flex; align-items: center; gap: .35rem; }
  .lobby-error { display: flex; align-items: center; gap: .5rem; font-size: .85rem; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; padding: .625rem 1rem; border-radius: .5rem; width: 100%; }
  .lobby-hint { font-size: .78rem; color: var(--color-muted); margin: 0; }

  /* ── Exam shell ──────────────────────────────────────────────────────── */
  .exam-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg);
  }

  /* ── Exam header ─────────────────────────────────────────────────────── */
  .exam-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .625rem 1.25rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    gap: 1rem;
  }
  .exam-header-left  { display: flex; align-items: center; gap: .625rem; min-width: 0; flex: 1; }
  .exam-header-center { display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
  .exam-header-right { display: flex; align-items: center; gap: .5rem; flex: 1; justify-content: flex-end; }

  .exam-code-pill {
    font-size: .72rem; font-weight: 800;
    padding: .2rem .55rem;
    background: var(--student-accent-bg, rgba(16,185,129,.1));
    color: var(--student-accent, #10b981);
    border-radius: 5px;
    white-space: nowrap; flex-shrink: 0;
  }
  .exam-title-sm { font-size: .82rem; font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .timer {
    display: flex; align-items: center; gap: .35rem;
    font-size: 1.1rem; font-weight: 800; font-variant-numeric: tabular-nums;
    color: var(--color-text);
    padding: .3rem .75rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: .5rem;
    transition: color .3s, border-color .3s, background .3s;
  }
  .timer.warning  { color: #d97706; border-color: #fcd34d; background: #fffbeb; }
  .timer.critical { color: #dc2626; border-color: #fca5a5; background: #fef2f2; animation: pulse 1s ease-in-out infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .7; }
  }

  .offline-badge {
    display: flex; align-items: center; gap: .3rem;
    font-size: .72rem; font-weight: 600;
    padding: .25rem .6rem;
    background: #fef2f2; color: #dc2626;
    border: 1px solid #fca5a5; border-radius: 999px;
  }
  .syncing-badge {
    display: flex; align-items: center; gap: .3rem;
    font-size: .72rem; font-weight: 600;
    padding: .25rem .6rem;
    background: #eff6ff; color: #2563eb;
    border: 1px solid #93c5fd; border-radius: 999px;
  }
  .pending-badge {
    display: flex; align-items: center; gap: .3rem;
    font-size: .72rem; font-weight: 600;
    padding: .25rem .6rem;
    background: #fefce8; color: #ca8a04;
    border: 1px solid #fde047; border-radius: 999px;
  }

  .progress-pill {
    font-size: .78rem; font-weight: 700;
    padding: .25rem .6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    color: var(--color-muted);
  }

  /* ── Question navigator ─────────────────────────────────────────────── */
  .question-navigator {
    display: flex;
    flex-wrap: wrap;
    gap: .35rem;
    padding: .625rem 1.25rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
    flex-shrink: 0;
  }
  .nav-dot {
    width: 30px; height: 30px;
    border-radius: 6px;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    font-size: .72rem; font-weight: 700;
    cursor: pointer;
    transition: all .15s;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .nav-dot.answered {
    background: var(--student-accent-bg, rgba(16,185,129,.12));
    border-color: var(--student-accent, #10b981);
    color: var(--student-accent, #10b981);
  }
  .nav-dot.active {
    background: var(--student-accent, #10b981);
    border-color: var(--student-accent, #10b981);
    color: white;
    transform: scale(1.1);
  }
  .nav-dot:hover:not(.active) { border-color: var(--student-accent, #10b981); }

  /* ── Question area ───────────────────────────────────────────────────── */
  .question-area {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .q-loading, .q-error {
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    padding: 3rem; color: var(--color-muted);
    font-size: .9rem;
  }
  .q-error { color: #dc2626; }

  .question-card {
    width: 100%; max-width: 720px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.75rem;
    box-shadow: 0 2px 12px rgb(0 0 0 / .04);
  }

  .question-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }
  .q-number { font-size: .78rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: .05em; }
  .q-marks  { font-size: .78rem; font-weight: 700; padding: .2rem .6rem; background: var(--student-accent-bg, rgba(16,185,129,.1)); color: var(--student-accent, #10b981); border-radius: 5px; }

  .question-body {
    font-size: 1rem;
    line-height: 1.7;
    color: var(--color-text);
    margin: 0 0 1.5rem;
    font-weight: 500;
  }

  .question-img {
    max-width: 100%; border-radius: .625rem;
    margin-bottom: 1.25rem;
    border: 1px solid var(--color-border);
  }

  /* ── MCQ options ─────────────────────────────────────────────────────── */
  .options-list { display: flex; flex-direction: column; gap: .625rem; }
  .option-btn {
    display: flex;
    align-items: center;
    gap: .875rem;
    padding: .875rem 1rem;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: .75rem;
    cursor: pointer;
    text-align: left;
    transition: all .15s;
    font-family: inherit;
    color: var(--color-text);
  }
  .option-btn:hover:not(.selected) { border-color: var(--student-accent, #10b981); background: var(--student-accent-bg, rgba(16,185,129,.05)); }
  .option-btn.selected { border-color: var(--student-accent, #10b981); background: var(--student-accent-bg, rgba(16,185,129,.1)); }

  .option-letter {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 1.5px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    font-size: .78rem; font-weight: 800;
    flex-shrink: 0;
    color: var(--color-muted);
    transition: all .15s;
  }
  .option-letter.selected { background: var(--student-accent, #10b981); border-color: var(--student-accent, #10b981); color: white; }
  .option-text { flex: 1; font-size: .9rem; line-height: 1.5; }
  .option-btn :global(.option-check) { color: var(--student-accent, #10b981); flex-shrink: 0; }

  /* ── FITB ────────────────────────────────────────────────────────────── */
  .fitb-wrap { margin-top: .5rem; }
  .fitb-input {
    width: 100%;
    padding: .875rem 1rem;
    font-size: .95rem;
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: .75rem;
    outline: none;
    transition: border-color .15s;
    box-sizing: border-box;
  }
  .fitb-input:focus { border-color: var(--student-accent, #10b981); }

  /* ── Exam footer ─────────────────────────────────────────────────────── */
  .exam-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .875rem 1.25rem;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
    gap: .75rem;
  }
  .footer-center { flex: 1; display: flex; align-items: center; justify-content: center; }
  .offline-text  { display: flex; align-items: center; gap: .35rem; font-size: .78rem; color: #dc2626; }

  /* ── Buttons ─────────────────────────────────────────────────────────── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .7rem 1.5rem;
    background: var(--student-accent, #10b981); color: white;
    border: none; border-radius: .625rem;
    font-weight: 700; font-size: .9rem; cursor: pointer;
    transition: all .2s; font-family: inherit;
  }
  .btn-primary:hover:not(:disabled) { filter: brightness(.92); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: .45; cursor: not-allowed; transform: none; }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .7rem 1.5rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1.5px solid var(--color-border); border-radius: .625rem;
    font-weight: 700; font-size: .9rem; cursor: pointer;
    transition: all .2s; font-family: inherit;
  }
  .btn-secondary:hover:not(:disabled) { background: var(--color-border); }
  .btn-secondary:disabled { opacity: .45; cursor: not-allowed; }

  .btn-danger {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .7rem 1.5rem;
    background: #fef2f2; color: #dc2626;
    border: 1.5px solid #fecaca; border-radius: .625rem;
    font-weight: 700; font-size: .9rem; cursor: pointer;
    transition: all .2s; font-family: inherit;
  }
  .btn-danger:hover { background: #fee2e2; }

  .btn-start {
    width: 100%; padding: .875rem;
    background: var(--student-accent, #10b981); color: white;
    border: none; border-radius: .75rem;
    font-weight: 800; font-size: 1rem; cursor: pointer;
    transition: all .2s; font-family: inherit;
  }
  .btn-start:hover:not(:disabled) { filter: brightness(.92); }
  .btn-start:disabled { opacity: .5; cursor: not-allowed; }

  .btn-submit-sm {
    display: inline-flex; align-items: center; gap: .35rem;
    padding: .4rem .875rem;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1.5px solid var(--color-border); border-radius: .5rem;
    font-size: .78rem; font-weight: 700; cursor: pointer;
    transition: all .15s; font-family: inherit;
  }
  .btn-submit-sm:hover { border-color: var(--student-accent, #10b981); color: var(--student-accent, #10b981); }

  .btn-nav {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .625rem 1.25rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1.5px solid var(--color-border); border-radius: .625rem;
    font-weight: 700; font-size: .875rem; cursor: pointer;
    transition: all .2s; font-family: inherit;
  }
  .btn-nav:hover:not(:disabled) { border-color: var(--student-accent, #10b981); color: var(--student-accent, #10b981); }
  .btn-nav:disabled { opacity: .35; cursor: not-allowed; }

  .btn-nav-next {
    background: var(--student-accent, #10b981);
    color: white; border-color: var(--student-accent, #10b981);
  }
  .btn-nav-next:hover:not(:disabled) { filter: brightness(.92); color: white; }

  .btn-nav-submit {
    background: #0f766e; color: white; border-color: #0f766e;
  }
  .btn-nav-submit:hover:not(:disabled) { filter: brightness(.92); color: white; }
  .btn-nav-submit:disabled { opacity: .5; }

  .btn-submit-confirm {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .7rem 1.5rem;
    background: #0f766e; color: white;
    border: none; border-radius: .625rem;
    font-weight: 700; font-size: .9rem; cursor: pointer;
    transition: all .2s; font-family: inherit;
  }
  .btn-submit-confirm:hover:not(:disabled) { filter: brightness(.92); }
  .btn-submit-confirm:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Confirm modal ───────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgb(0 0 0 / .5);
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
    padding: 1rem;
  }
  .confirm-modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem;
    width: 100%; max-width: 420px;
    display: flex; flex-direction: column; gap: 1rem;
    box-shadow: 0 20px 60px rgb(0 0 0 / .15);
  }
  .confirm-modal h2 { font-size: 1.1rem; font-weight: 800; margin: 0; color: var(--color-text); }
  .confirm-modal p  { font-size: .88rem; color: var(--color-muted); margin: 0; line-height: 1.6; }
  .confirm-warn {
    display: flex; align-items: center; gap: .5rem;
    font-size: .88rem; color: #92400e;
    background: #fffbeb; border: 1px solid #fde68a;
    padding: .625rem .875rem; border-radius: .5rem;
    margin: 0;
  }
  .submit-error { font-size: .82rem; color: #dc2626; margin: 0; }
  .confirm-actions { display: flex; gap: .75rem; justify-content: flex-end; }

  /* ── Terminal state icons ────────────────────────────────────────────── */
  .center-card :global(.done-icon)    { color: var(--student-accent, #10b981); }
  .center-card :global(.warn-icon-lg) { color: #f59e0b; }
  .center-card h1 { font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .center-card p  { font-size: .9rem; color: var(--color-muted); max-width: 380px; line-height: 1.6; margin: 0; }

  /* ── Spin animation ──────────────────────────────────────────────────── */
  :global(.spin) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ──────────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    .student-preview { flex-direction: column; align-items: center; }
    .preview-details { width: 100%; }
    .detail-label { width: 80px; }
    .preview-actions { flex-direction: column; }
    .btn-primary, .btn-danger, .btn-secondary { width: 100%; justify-content: center; }
    .lobby-card { padding: 1.5rem 1.25rem; }
    .countdown-display { font-size: 2.5rem; }
    .exam-title-sm { display: none; }
    .question-card { padding: 1.25rem; }
    .exam-header { padding: .5rem .75rem; }
    .question-area { padding: .875rem; }
    .exam-footer  { padding: .625rem .75rem; }
  }
</style>