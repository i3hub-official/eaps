<!-- src/routes/student/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto }    from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    User, Mail, Hash, Building, GraduationCap,
    BookOpen, Clock, AlertTriangle, CheckCircle,
    ChevronRight, Shield, Eye, Maximize2,
    PlayCircle, Lock, Calendar, ClipboardList,
    ArrowLeft, Camera,
  } from '@lucide/svelte';

  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';
  import FaceVerifyModal     from '$lib/components/exam/FaceVerifyModal.svelte';

  let { data }: { data: PageData } = $props();

  // ─── Step machine ────────────────────────────────────────────────────────
  type Step =
    | 'select'    // exam list — always the landing step
    | 'enroll'    // student clicked an exam but has no face descriptor
    | 'verify'    // descriptor exists, not verified this session
    | 'preview'   // identity confirmation
    | 'rules'     // exam rules
    | 'lobby'     // waiting for scheduled exam
    | 'submitted'
    | 'flagged'
    | 'blocked';

  // We always start at 'select'. No other step is derived from server data
  // at init time — we advance the step only after explicit user actions.
  // The one exception: if the URL already has an examId AND a terminal status,
  // show that terminal state directly.
  function initialStep(): Step {
    if (data.examId) {
      const s = data.sessionStatus;
      if (s === 'submitted' || s === 'force_submitted') return 'submitted';
      if (s === 'flagged')                               return 'flagged';
    }
    return 'select';
  }

  let step = $state<Step>(initialStep());

  // The exam the student is currently trying to enter
  let selectedExamId = $state<string | null>(data.examId ?? null);

  // ─── Selecting an exam ───────────────────────────────────────────────────
  // Called when a student clicks a live exam card.
  // Gate: if face is not enrolled → go to enroll step (exam is locked).
  // Otherwise → go to verify (or skip verify if cookie is fresh).
  function selectExam(examId: string) {
    selectedExamId = examId;

    if (!data.faceEnrolled) {
      // Block — must enroll before anything else
      step = 'enroll';
      return;
    }

    if (!data.faceVerified) {
      // Enrolled but not verified this session → verify first
      // Navigate so server reloads exam data for this examId
      goto(`?examId=${examId}`, { replaceState: false });
      step = 'verify';
      return;
    }

    // Already verified and enrolled → load exam data then go to preview
    goto(`?examId=${examId}`, { replaceState: false });
    step = 'preview';
  }

  // When data refreshes after goto (examId now in URL), sync step
  // Only runs when we navigated via selectExam above.
  $effect(() => {
    if (!data.examId) return;

    const s = data.sessionStatus;
    if (s === 'submitted' || s === 'force_submitted') { step = 'submitted'; return; }
    if (s === 'flagged')                               { step = 'flagged';   return; }

    // Don't override if we're already in a post-verify step
    if (step === 'preview' || step === 'rules' || step === 'lobby') return;

    // If we somehow land here with verify step still set, keep it
    if (step === 'verify') return;

    // Resume: in-progress session + verified → go straight to kiosk
    if (s === 'in_progress' && data.faceVerified) {
      enterKiosk();
      return;
    }
  });

  // ─── Enter kiosk — same-tab navigation ──────────────────────────────────
  // Only called after face verification is confirmed.
  function enterKiosk() {
    goto(`/student/exams/kiosk?examId=${data.examId ?? selectedExamId}`);
  }

  // ─── Face enrollment ─────────────────────────────────────────────────────
  // After successful enrollment, move to verify.
  // We reload the page so faceEnrolled comes back true from the server.
  function onEnrollComplete() {
    // Reload with examId so server picks up the new enrollment state
    window.location.href = selectedExamId
      ? `/student/exams?examId=${selectedExamId}`
      : '/student/exams';
  }

  // ─── Face verification ────────────────────────────────────────────────────
  // THE only place enterKiosk() may be called from (besides resume in $effect).
  function onVerifySuccess() {
    const s = data.sessionStatus;
    if (s === 'in_progress' && data.sessionId) {
      enterKiosk();
    } else {
      step = 'preview';
    }
  }

  // ─── Rules ───────────────────────────────────────────────────────────────
  let rulesAccepted = $state(false);
  let rulesScrolled = $state(false);

  function handleRulesScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) rulesScrolled = true;
  }

  function acceptRules() {
    if (!rulesAccepted || !rulesScrolled) return;
    if (data.exam?.status === 'active') {
      enterKiosk();
    } else {
      step = 'lobby';
      startLobbyCountdown();
    }
  }

  // ─── Lobby ───────────────────────────────────────────────────────────────
  let lobbySecondsLeft = $state(0);
  let lobbyInterval: ReturnType<typeof setInterval> | null = null;

  function startLobbyCountdown() {
    const start = data.exam?.scheduledStart
      ? new Date(data.exam.scheduledStart).getTime()
      : null;

    if (!start) { enterKiosk(); return; }

    const update = () => {
      const diff = Math.max(0, Math.floor((start - Date.now()) / 1000));
      lobbySecondsLeft = diff;
      if (diff <= 0 && lobbyInterval) {
        clearInterval(lobbyInterval);
        lobbyInterval = null;
        enterKiosk();
      }
    };
    update();
    lobbyInterval = setInterval(update, 1000);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  onMount(() => () => { if (lobbyInterval) clearInterval(lobbyInterval); });

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
      weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit',
    });
  }

  function formatShortDate(d: string | null): string {
    if (!d) return '';
    return new Intl.DateTimeFormat('en-NG', {
      day:'numeric', month:'short', hour:'2-digit', minute:'2-digit',
    }).format(new Date(d));
  }

  const availableExams = $derived(data.availableExams ?? []);
  const liveExams      = $derived(availableExams.filter(e => e.status === 'active' && !e.alreadySubmitted));
  const scheduledExams = $derived(availableExams.filter(e => e.status === 'scheduled'));
  const doneExams      = $derived(availableExams.filter(e => e.alreadySubmitted));
</script>

<svelte:head>
  <title>{data.exam?.title ?? 'My Exams'} — eTest</title>
</svelte:head>

<!-- ══ EXAM SELECT LIST ══════════════════════════════════════════════════ -->
{#if step === 'select'}
  <div class="list-page">
    <div class="list-header">
      <ClipboardList size={20} class="list-header-icon" />
      <div>
        <h1>My Exams</h1>
        <p>Select an exam to begin. Face verification is required before entering.</p>
      </div>
    </div>

    <!-- Face enrollment warning banner — shown when not enrolled -->
    {#if !data.faceEnrolled}
      <div class="enroll-gate">
        <div class="enroll-gate-icon"><Camera size={22} /></div>
        <div class="enroll-gate-body">
          <strong>Face enrollment required</strong>
          <p>
            You must enroll your face before you can take any exam.
            Tap the button below to set it up — it only takes a minute.
          </p>
          <button class="btn-enroll" onclick={() => step = 'enroll'}>
            <Camera size={15} /> Enroll My Face
          </button>
        </div>
      </div>
    {/if}

    {#if availableExams.length === 0}
      <div class="empty-state">
        <ClipboardList size={40} strokeWidth={1.2} />
        <h2>No exams available</h2>
        <p>There are no active or scheduled exams for your registered courses right now.</p>
        <button class="btn-secondary" onclick={() => goto('/student')}>
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
      </div>

    {:else}
      <!-- Live exams -->
      {#if liveExams.length > 0}
        <div class="exam-section">
          <div class="section-label live-label">
            <span class="live-dot"></span> Live Now
          </div>
          <div class="exam-cards">
            {#each liveExams as exam}
              <button
                class="exam-card exam-card-live"
                class:exam-card-locked={!data.faceEnrolled}
                onclick={() => data.faceEnrolled ? selectExam(exam.id) : null}
                disabled={!data.faceEnrolled}
                title={!data.faceEnrolled ? 'Enroll your face first' : undefined}
              >
                <div class="ec-top">
                  <div class="ec-left">
                    <span class="ec-course">{exam.course?.code ?? ''}</span>
                    <span class="ec-title">{exam.title}</span>
                    <span class="ec-sub">{exam.course?.title ?? ''}</span>
                  </div>
                  <div class="ec-action">
                    {#if !data.faceEnrolled}
                      <span class="ec-locked-badge">
                        <Lock size={12} /> Face required
                      </span>
                    {:else}
                      <span class="ec-enter-btn">
                        <PlayCircle size={14} /> Enter
                      </span>
                    {/if}
                  </div>
                </div>
                <div class="ec-meta">
                  <span><Clock size={11} />{exam.durationMinutes} min</span>
                  <span><BookOpen size={11} />{exam.questionsToPresent || exam.questionCount} questions</span>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Scheduled exams -->
      {#if scheduledExams.length > 0}
        <div class="exam-section">
          <div class="section-label">Scheduled</div>
          <div class="exam-cards">
            {#each scheduledExams as exam}
              <div class="exam-card exam-card-scheduled">
                <div class="ec-top">
                  <div class="ec-left">
                    <span class="ec-course">{exam.course?.code ?? ''}</span>
                    <span class="ec-title">{exam.title}</span>
                    <span class="ec-sub">{exam.course?.title ?? ''}</span>
                  </div>
                  <div class="ec-action">
                    <span class="ec-waiting-badge">
                      <Lock size={12} /> Waiting
                    </span>
                  </div>
                </div>
                <div class="ec-meta">
                  <span><Clock size={11} />{exam.durationMinutes} min</span>
                  <span><BookOpen size={11} />{exam.questionsToPresent || exam.questionCount} questions</span>
                  {#if exam.scheduledStart}
                    <span><Calendar size={11} />{formatShortDate(exam.scheduledStart)}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Already submitted -->
      {#if doneExams.length > 0}
        <div class="exam-section">
          <div class="section-label muted-label">Submitted</div>
          <div class="exam-cards">
            {#each doneExams as exam}
              <div class="exam-card exam-card-done">
                <div class="ec-top">
                  <div class="ec-left">
                    <span class="ec-course">{exam.course?.code ?? ''}</span>
                    <span class="ec-title">{exam.title}</span>
                    <span class="ec-sub">{exam.course?.title ?? ''}</span>
                  </div>
                  <div class="ec-action">
                    <CheckCircle size={18} class="done-check" />
                  </div>
                </div>
                <div class="ec-meta">
                  <span><Clock size={11} />{exam.durationMinutes} min</span>
                  <span><BookOpen size={11} />{exam.questionsToPresent || exam.questionCount} questions</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<!-- ══ FACE ENROLLMENT ═══════════════════════════════════════════════════ -->
<!-- Triggered from select step — full-page modal, cancel returns to list -->
{#if step === 'enroll'}
  <FaceEnrollmentModal
    open={true}
    onClose={() => step = 'select'}
    onComplete={onEnrollComplete}
  />
{/if}

<!-- ══ FACE VERIFICATION ═════════════════════════════════════════════════ -->
<!-- Only reached when faceEnrolled === true -->
{#if step === 'verify'}
  <FaceVerifyModal
    examId={data.examId}
    onSuccess={onVerifySuccess}
    onCancel={() => step = 'select'}
  />
{/if}

<!-- ══ IDENTITY PREVIEW ══════════════════════════════════════════════════ -->
{#if step === 'preview'}
  <div class="page-wrap">
    <div class="flow-card">
      <div class="card-header">
        <button class="back-btn" onclick={() => step = 'select'} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <Shield size={20} class="header-icon" />
        <div>
          <h1>Confirm Your Identity</h1>
          <p>Verify the information below is yours before proceeding</p>
        </div>
      </div>

      <div class="exam-banner">
        <div class="exam-code">{data.exam?.courseCode}</div>
        <div class="exam-banner-info">
          <span class="exam-banner-title">{data.exam?.title}</span>
          <div class="exam-banner-meta">
            <span><Clock size={13} />{data.exam?.durationMinutes} min</span>
            <span><BookOpen size={13} />{data.exam?.totalQuestions} questions</span>
          </div>
        </div>
      </div>

      <div class="student-preview">
        <div class="preview-photo-col">
          {#if data.student?.photoUrl}
            <img src={data.student.photoUrl} alt={data.student.name} class="preview-photo" />
          {:else}
            <div class="preview-photo-placeholder"><User size={40} /></div>
          {/if}
          <div class="preview-name">{data.student?.name}</div>
        </div>
        <div class="preview-details">
          <div class="detail-row">
            <Hash size={15} />
            <span class="detail-label">Matric No.</span>
            <span class="detail-value">{data.student?.matricNumber ?? 'N/A'}</span>
          </div>
          <div class="detail-row">
            <Mail size={15} />
            <span class="detail-label">Email</span>
            <span class="detail-value">{data.student?.email}</span>
          </div>
          {#if data.student?.department}
            <div class="detail-row">
              <Building size={15} />
              <span class="detail-label">Department</span>
              <span class="detail-value">{data.student.department}</span>
            </div>
          {/if}
          {#if data.student?.level}
            <div class="detail-row">
              <GraduationCap size={15} />
              <span class="detail-label">Level</span>
              <span class="detail-value">{data.student.level}</span>
            </div>
          {/if}
          {#if data.student?.programme}
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
        <button class="btn-danger" onclick={() => step = 'blocked'}>No, this is not me</button>
        <button class="btn-primary" onclick={() => step = 'rules'}>
          Yes, proceed <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ══ RULES ══════════════════════════════════════════════════════════════ -->
{#if step === 'rules'}
  <div class="page-wrap">
    <div class="flow-card rules-card">
      <div class="card-header">
        <button class="back-btn" onclick={() => step = 'preview'} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <Eye size={20} class="header-icon" />
        <div>
          <h1>Exam Rules & Regulations</h1>
          <p>Read carefully — scroll to the bottom to continue</p>
        </div>
      </div>

      <div class="rules-scroll" onscroll={handleRulesScroll}>
        <h2>General Conduct</h2>
        <ol>
          <li>This exam is strictly individual. Any form of collaboration or communication with other candidates is prohibited.</li>
          <li>You must remain in front of your camera throughout the exam. Leaving the frame will be recorded as a violation.</li>
          <li>Only one face must be visible at all times. Having another person present may trigger automatic submission.</li>
          <li>Switching browser tabs, minimising the window, or navigating away from the exam will be flagged as a violation.</li>
          <li>Taking screenshots, screen recordings, or photographs of exam content is strictly prohibited.</li>
          <li>The use of external devices (phones, tablets, printed materials) during the exam is not permitted.</li>
        </ol>
        <h2>Technical Requirements</h2>
        <ol>
          <li>The exam must be taken in fullscreen mode. Exiting fullscreen is a violation.</li>
          <li>Ensure you have a stable internet connection before starting. Network interruptions do not pause the exam timer.</li>
          <li>Your camera must remain active and unobstructed throughout the exam duration.</li>
          <li>If the exam auto-submits due to time expiry or repeated violations, the submission is final.</li>
        </ol>
        <h2>Violations & Consequences</h2>
        <ol>
          <li>Each detected violation increments your violation counter. You will be warned on screen.</li>
          <li>Reaching {data.exam?.maxViolations ?? 5} violations will result in automatic submission.</li>
          <li>Face mismatch or detecting multiple faces will immediately pause your session for invigilator review.</li>
          <li>Attempting to spoof the camera with a photo or video will result in immediate disqualification.</li>
        </ol>
        <h2>Submission</h2>
        <ol>
          <li>You may submit your exam at any time before the timer expires.</li>
          <li>When the timer reaches zero, your exam will be submitted automatically.</li>
          <li>Once submitted, you cannot re-enter the exam.</li>
        </ol>
        <div class="rules-end-marker">
          <CheckCircle size={20} /> <span>End of rules</span>
        </div>
      </div>

      <div class="rules-footer">
        <label class="accept-label" class:disabled={!rulesScrolled}>
          <input type="checkbox" bind:checked={rulesAccepted} disabled={!rulesScrolled} />
          <span>I have read and understand all the rules above, and I accept them.</span>
        </label>
        {#if !rulesScrolled}
          <p class="scroll-hint">Scroll to the bottom to enable acceptance</p>
        {/if}
        <button
          class="btn-primary"
          disabled={!rulesAccepted || !rulesScrolled}
          onclick={acceptRules}
        >
          <Maximize2 size={16} /> Accept & Start Exam
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ══ LOBBY ══════════════════════════════════════════════════════════════ -->
{#if step === 'lobby'}
  <div class="page-wrap">
    <div class="lobby-card">
      <div class="lobby-badge">Waiting Room</div>
      <h1 class="lobby-title">{data.exam?.title}</h1>
      <p class="lobby-course">{data.exam?.courseCode}</p>
      <div class="lobby-countdown">
        <div class="countdown-label">Exam starts in</div>
        <div class="countdown-display">{formatTime(lobbySecondsLeft)}</div>
        <div class="countdown-sub">Scheduled: {formatScheduled(data.exam?.scheduledStart ?? null)}</div>
      </div>
      <div class="lobby-info">
        <div class="lobby-info-item"><Clock size={16} />{data.exam?.durationMinutes} minutes</div>
        <div class="lobby-info-item"><BookOpen size={16} />{data.exam?.totalQuestions} questions</div>
      </div>
      <p class="lobby-hint">The exam will start automatically when the timer reaches zero.</p>
      {#if lobbySecondsLeft === 0}
        <button class="btn-primary" onclick={enterKiosk}>Start Exam Now</button>
      {/if}
    </div>
  </div>
{/if}

<!-- ══ SUBMITTED ══════════════════════════════════════════════════════════ -->
{#if step === 'submitted'}
  <div class="page-wrap">
    <div class="flow-card center-card">
      <CheckCircle size={48} class="done-icon" />
      <h1>Exam Submitted</h1>
      <p>Your answers have been recorded. Results will be available once graded.</p>
      <div class="terminal-actions">
        <button class="btn-secondary" onclick={() => { step = 'select'; goto('/student/exams'); }}>
          <ArrowLeft size={15} /> Back to Exams
        </button>
        <button class="btn-primary" onclick={() => goto('/student/results')}>
          View Results
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ══ FLAGGED ════════════════════════════════════════════════════════════ -->
{#if step === 'flagged'}
  <div class="page-wrap">
    <div class="flow-card center-card warn-card">
      <AlertTriangle size={48} class="warn-icon-lg" />
      <h1>Session Paused</h1>
      <p>Your exam has been paused pending invigilator review. An invigilator will contact you shortly.</p>
      <button class="btn-secondary" onclick={() => goto('/student')}>Return to Dashboard</button>
    </div>
  </div>
{/if}

<!-- ══ BLOCKED ════════════════════════════════════════════════════════════ -->
{#if step === 'blocked'}
  <div class="page-wrap">
    <div class="flow-card center-card warn-card">
      <AlertTriangle size={48} class="warn-icon-lg" />
      <h1>Identity Mismatch Reported</h1>
      <p>
        You indicated the displayed information does not belong to you.
        Contact the exams office or your invigilator immediately.
      </p>
      <button class="btn-secondary" onclick={() => goto('/student')}>Return to Dashboard</button>
    </div>
  </div>
{/if}

<style>
  /* ── Exam list ────────────────────────────────────────────────────────── */
  .list-page {
    max-width: 720px; margin: 0 auto;
    padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;
  }

  .list-header {
    display: flex; align-items: flex-start; gap: .875rem;
  }
  .list-header :global(.list-header-icon) { color: var(--student-accent, #10b981); margin-top: .15rem; flex-shrink: 0; }
  .list-header h1 { font-size: 1.25rem; font-weight: 900; color: var(--color-text); margin: 0 0 .2rem; }
  .list-header p  { font-size: .82rem; color: var(--color-muted); margin: 0; }

  /* ── Enrollment gate banner ───────────────────────────────────────────── */
  .enroll-gate {
    display: flex; align-items: flex-start; gap: 1rem;
    padding: 1.25rem;
    background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px;
  }
  .enroll-gate-icon {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    background: #fef3c7;
    display: flex; align-items: center; justify-content: center;
    color: #d97706;
  }
  .enroll-gate-body { flex: 1; display: flex; flex-direction: column; gap: .5rem; }
  .enroll-gate-body strong { font-size: .9rem; font-weight: 800; color: #92400e; }
  .enroll-gate-body p {
    font-size: .82rem; color: #92400e; margin: 0; line-height: 1.6;
  }
  .btn-enroll {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .55rem 1.1rem; align-self: flex-start;
    background: #d97706; color: white; border: none; border-radius: 8px;
    font-size: .82rem; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: filter .15s;
  }
  .btn-enroll:hover { filter: brightness(.9); }

  /* ── Exam section ─────────────────────────────────────────────────────── */
  .exam-section { display: flex; flex-direction: column; gap: .625rem; }
  .section-label {
    font-size: .68rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: .06em; color: var(--color-muted);
    display: flex; align-items: center; gap: .4rem;
  }
  .live-label  { color: var(--student-accent, #10b981); }
  .muted-label { opacity: .6; }
  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--student-accent, #10b981);
    animation: livepulse 1.5s ease-in-out infinite;
  }
  @keyframes livepulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

  /* ── Exam card ────────────────────────────────────────────────────────── */
  .exam-cards { display: flex; flex-direction: column; gap: .5rem; }

  .exam-card {
    width: 100%; text-align: left;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 12px; padding: .875rem 1rem;
    display: flex; flex-direction: column; gap: .5rem;
    font-family: inherit; cursor: default;
    transition: border-color .15s, background .15s;
  }
  button.exam-card { cursor: pointer; }

  /* Live card */
  .exam-card-live { border-color: rgba(16,185,129,.3); background: rgba(16,185,129,.03); }
  button.exam-card-live:not(:disabled):hover {
    border-color: var(--student-accent, #10b981); background: rgba(16,185,129,.06);
  }

  /* Locked state — face not enrolled */
  .exam-card-locked {
    opacity: .6; cursor: not-allowed !important;
    border-color: var(--color-border) !important;
    background: var(--color-surface) !important;
  }

  .exam-card-done { opacity: .55; }

  .ec-top {
    display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem;
  }
  .ec-left { display: flex; flex-direction: column; gap: .2rem; min-width: 0; }
  .ec-course {
    font-size: .65rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: .05em; color: var(--student-accent, #10b981);
  }
  .exam-card-scheduled .ec-course { color: #0369a1; }
  .exam-card-done .ec-course { color: var(--color-muted); }
  .ec-title {
    font-size: .9rem; font-weight: 700; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ec-sub { font-size: .75rem; color: var(--color-muted); }

  .ec-action { flex-shrink: 0; }

  .ec-enter-btn {
    display: inline-flex; align-items: center; gap: .35rem;
    padding: .45rem .9rem;
    background: var(--student-accent, #10b981); color: white;
    border-radius: 8px; font-size: .78rem; font-weight: 800;
    pointer-events: none;
  }
  .ec-locked-badge {
    display: inline-flex; align-items: center; gap: .3rem;
    padding: .4rem .75rem;
    background: #fef3c7; color: #92400e;
    border: 1px solid #fde68a;
    border-radius: 8px; font-size: .75rem; font-weight: 700;
  }
  .ec-waiting-badge {
    display: inline-flex; align-items: center; gap: .3rem;
    padding: .4rem .75rem;
    background: var(--color-bg); color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 8px; font-size: .75rem; font-weight: 600;
  }
  :global(.done-check) { color: var(--student-accent, #10b981); }

  .ec-meta {
    display: flex; align-items: center; gap: .625rem; flex-wrap: wrap;
    font-size: .7rem; color: var(--color-muted);
  }
  .ec-meta span { display: flex; align-items: center; gap: .25rem; }

  /* ── Empty state ──────────────────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: .75rem;
    padding: 3rem 1rem; text-align: center; color: var(--color-muted);
  }
  .empty-state h2 { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-state p  { font-size: .85rem; max-width: 360px; line-height: 1.6; margin: 0; }

  /* ── Page wrap ────────────────────────────────────────────────────────── */
  .page-wrap {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; background: var(--color-bg);
  }

  /* ── Flow card ────────────────────────────────────────────────────────── */
  .flow-card {
    width: 100%; max-width: 580px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; overflow: hidden;
    box-shadow: 0 8px 32px rgb(0 0 0 / .06);
  }
  .center-card {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 1rem; padding: 3rem 2rem;
  }
  .warn-card { border-color: #fbbf24; }

  .card-header {
    display: flex; align-items: flex-start; gap: .875rem;
    padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border);
  }
  .card-header :global(.header-icon) { color: var(--student-accent, #10b981); margin-top: .1rem; flex-shrink: 0; }
  .card-header h1 { font-size: 1.1rem; font-weight: 800; margin: 0 0 .2rem; color: var(--color-text); }
  .card-header p  { font-size: .82rem; color: var(--color-muted); margin: 0; }

  .back-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted); cursor: pointer; font-family: inherit;
    transition: background .12s; margin-top: .05rem;
  }
  .back-btn:hover { background: var(--color-border); color: var(--color-text); }

  .exam-banner {
    display: flex; align-items: center; gap: 1rem;
    padding: 1rem 1.5rem;
    background: var(--color-bg); border-bottom: 1px solid var(--color-border);
  }
  .exam-code {
    font-size: .75rem; font-weight: 800; padding: .25rem .6rem;
    background: var(--student-accent-bg, rgba(16,185,129,.1));
    color: var(--student-accent, #10b981); border-radius: 6px; white-space: nowrap;
  }
  .exam-banner-title { font-size: .9rem; font-weight: 700; color: var(--color-text); display: block; }
  .exam-banner-meta  { display: flex; gap: .75rem; font-size: .78rem; color: var(--color-muted); margin-top: .2rem; }
  .exam-banner-meta span { display: flex; align-items: center; gap: .3rem; }

  .student-preview { display: flex; gap: 1.5rem; padding: 1.5rem; border-bottom: 1px solid var(--color-border); }
  .preview-photo-col { display: flex; flex-direction: column; align-items: center; gap: .5rem; flex-shrink: 0; }
  .preview-photo {
    width: 90px; height: 90px; border-radius: 50%; object-fit: cover;
    border: 3px solid var(--student-accent, #10b981);
    box-shadow: 0 0 0 6px var(--student-accent-bg, rgba(16,185,129,.1));
  }
  .preview-photo-placeholder {
    width: 90px; height: 90px; border-radius: 50%;
    background: var(--color-bg); border: 3px solid var(--color-border);
    display: flex; align-items: center; justify-content: center; color: var(--color-muted);
  }
  .preview-name { font-size: .8rem; font-weight: 700; color: var(--color-text); text-align: center; max-width: 90px; }
  .preview-details { flex: 1; display: flex; flex-direction: column; gap: .5rem; }
  .detail-row { display: flex; align-items: center; gap: .5rem; font-size: .85rem; }
  .detail-row :global(svg) { color: var(--color-muted); flex-shrink: 0; opacity: .7; }
  .detail-label { color: var(--color-muted); width: 90px; flex-shrink: 0; font-size: .78rem; }
  .detail-value { color: var(--color-text); font-weight: 600; }

  .preview-question {
    display: flex; align-items: center; gap: .75rem;
    padding: 1rem 1.5rem; background: #fefce8; border-bottom: 1px solid #fef08a;
  }
  .preview-question :global(.warn-icon) { color: #ca8a04; flex-shrink: 0; }
  .preview-question p { font-size: .88rem; font-weight: 600; color: #92400e; margin: 0; }
  .preview-actions { display: flex; gap: .75rem; padding: 1.25rem 1.5rem; justify-content: flex-end; }

  /* Rules */
  .rules-card { max-width: 680px; }
  .rules-scroll {
    max-height: 380px; overflow-y: auto; padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .rules-scroll h2 {
    font-size: .78rem; font-weight: 800; color: var(--color-text);
    margin: 1.25rem 0 .5rem; text-transform: uppercase; letter-spacing: .05em;
  }
  .rules-scroll h2:first-child { margin-top: 0; }
  .rules-scroll ol { padding-left: 1.25rem; margin: 0 0 .75rem; }
  .rules-scroll li { font-size: .85rem; color: var(--color-text); line-height: 1.6; margin-bottom: .4rem; }
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

  /* Lobby */
  .lobby-card {
    width: 100%; max-width: 480px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.5rem; padding: 2.5rem 2rem;
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    text-align: center; box-shadow: 0 8px 32px rgb(0 0 0 / .06);
  }
  .lobby-badge {
    font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;
    padding: .25rem .75rem;
    background: var(--student-accent-bg, rgba(16,185,129,.1));
    color: var(--student-accent, #10b981); border-radius: 999px;
  }
  .lobby-title  { font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .lobby-course { font-size: .875rem; color: var(--color-muted); margin: 0; }
  .lobby-countdown {
    width: 100%; padding: 1.5rem;
    background: var(--color-bg); border-radius: 1rem; border: 1px solid var(--color-border);
  }
  .countdown-label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--color-muted); margin-bottom: .5rem; }
  .countdown-display { font-size: 3rem; font-weight: 800; color: var(--student-accent, #10b981); font-variant-numeric: tabular-nums; line-height: 1; }
  .countdown-sub { font-size: .75rem; color: var(--color-muted); margin-top: .5rem; }
  .lobby-info { display: flex; gap: 1.5rem; font-size: .85rem; color: var(--color-muted); }
  .lobby-info-item { display: flex; align-items: center; gap: .35rem; }
  .lobby-hint { font-size: .78rem; color: var(--color-muted); margin: 0; }

  /* Terminal state icons */
  .center-card :global(.done-icon)    { color: var(--student-accent, #10b981); }
  .center-card :global(.warn-icon-lg) { color: #f59e0b; }
  .center-card h1 { font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .center-card p  { font-size: .9rem; color: var(--color-muted); max-width: 380px; line-height: 1.6; margin: 0; }
  .terminal-actions { display: flex; gap: .75rem; flex-wrap: wrap; justify-content: center; }

  /* Buttons */
  .btn-primary {
    display: inline-flex; align-items: center; gap: .4rem; padding: .7rem 1.5rem;
    background: var(--student-accent, #10b981); color: white; border: none;
    border-radius: .625rem; font-weight: 700; font-size: .9rem; cursor: pointer;
    transition: all .2s; font-family: inherit;
  }
  .btn-primary:hover:not(:disabled) { filter: brightness(.92); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: .45; cursor: not-allowed; transform: none; }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: .4rem; padding: .7rem 1.5rem;
    background: var(--color-bg); color: var(--color-text);
    border: 1.5px solid var(--color-border); border-radius: .625rem;
    font-weight: 700; font-size: .9rem; cursor: pointer; transition: all .2s; font-family: inherit;
  }
  .btn-secondary:hover { background: var(--color-border); }

  .btn-danger {
    display: inline-flex; align-items: center; gap: .4rem; padding: .7rem 1.5rem;
    background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; border-radius: .625rem;
    font-weight: 700; font-size: .9rem; cursor: pointer; transition: all .2s; font-family: inherit;
  }
  .btn-danger:hover { background: #fee2e2; }

  @media (max-width: 600px) {
    .list-page { padding: 1rem; }
    .student-preview { flex-direction: column; align-items: center; }
    .preview-details { width: 100%; }
    .detail-label { width: 80px; }
    .preview-actions { flex-direction: column; }
    .btn-primary, .btn-danger, .btn-secondary { width: 100%; justify-content: center; }
    .lobby-card { padding: 1.5rem 1.25rem; }
    .countdown-display { font-size: 2.5rem; }
  }
</style>