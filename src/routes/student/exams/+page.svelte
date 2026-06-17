<!-- src/routes/student/exams/+page.svelte -->
<!--
  Portal page — handles everything BEFORE the exam:
    enroll → verify → preview → rules → [launch kiosk window]

  The actual exam runs in /student/exams/kiosk?examId=xxx (new window).
  This page waits for the kiosk to post back 'exam_submitted' or 'exam_flagged'.
-->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto }          from '$app/navigation';
  import { onMount }       from 'svelte';
  import {
    User, Mail, Hash, Building, GraduationCap,
    BookOpen, Clock, AlertTriangle, CheckCircle,
    ChevronRight, Shield, Eye, Maximize2, ExternalLink
  } from '@lucide/svelte';

  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';
  import FaceVerifyModal     from '$lib/components/exam/FaceVerifyModal.svelte';

  let { data }: { data: PageData } = $props();

  // ─── Flow step ─────────────────────────────────────────────────────────
  type Step =
    | 'enroll'
    | 'verify'
    | 'preview'
    | 'rules'
    | 'lobby'       // waiting for scheduled exam
    | 'launching'   // kiosk window opening
    | 'kiosk_open'  // kiosk running in other window — this page is the monitor
    | 'submitted'
    | 'flagged'
    | 'blocked';

  function initialStep(): Step {
    const s = data.sessionStatus;
    if (s === 'submitted' || s === 'force_submitted') return 'submitted';
    if (s === 'flagged')                               return 'flagged';
    if (!data.faceEnrolled)                            return 'enroll';
    if (!data.faceVerified)                            return 'verify';
    // Already have an active session — re-launch kiosk directly
    if (s === 'in_progress' && data.sessionId)         return 'launching';
    return 'preview';
  }

  let step = $state<Step>(initialStep());

  // ─── Kiosk window handle ────────────────────────────────────────────────
  let kioskWindow: Window | null = null;
  let kioskCheckInterval: ReturnType<typeof setInterval> | null = null;

  function launchKiosk() {
    const url = `/student/exams/kiosk?examId=${data.examId}`;
    kioskWindow = window.open(url, 'etest_kiosk', [
      'width='  + screen.availWidth,
      'height=' + screen.availHeight,
      'left=0',
      'top=0',
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'scrollbars=no',
      'resizable=yes',
    ].join(','));

    if (!kioskWindow) {
      // Popup blocked — fall back to same-tab navigation
      goto(url);
      return;
    }

    step = 'kiosk_open';

    // Poll to detect if the kiosk window was closed
    kioskCheckInterval = setInterval(() => {
      if (kioskWindow && kioskWindow.closed) {
        clearInterval(kioskCheckInterval!);
        kioskCheckInterval = null;
        kioskWindow = null;
        // Refresh page data to check final session status
        window.location.reload();
      }
    }, 1000);
  }

  // ─── Message bus — kiosk posts back events ──────────────────────────────
  function handleKioskMessage(e: MessageEvent) {
    if (e.origin !== window.location.origin) return;
    if (e.data?.source !== 'etest_kiosk') return;

    switch (e.data.type) {
      case 'submitted':
        step = 'submitted';
        kioskWindow?.close();
        break;
      case 'flagged':
        step = 'flagged';
        break;
    }
  }

  // ─── Lobby ─────────────────────────────────────────────────────────────
  let lobbySecondsLeft = $state(0);
  let lobbyInterval: ReturnType<typeof setInterval> | null = null;

  function startLobbyCountdown() {
    const start = data.exam.scheduledStart
      ? new Date(data.exam.scheduledStart).getTime()
      : null;

    if (!start) { void launchKiosk(); return; }

    const update = () => {
      const diff = Math.max(0, Math.floor((start - Date.now()) / 1000));
      lobbySecondsLeft = diff;
      if (diff <= 0 && lobbyInterval) {
        clearInterval(lobbyInterval);
        lobbyInterval = null;
        void launchKiosk();
      }
    };
    update();
    lobbyInterval = setInterval(update, 1000);
  }

  // ─── Rules ─────────────────────────────────────────────────────────────
  let rulesAccepted = $state(false);
  let rulesScrolled = $state(false);

  function handleRulesScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) rulesScrolled = true;
  }

  async function acceptRules() {
    if (!rulesAccepted || !rulesScrolled) return;
    if (data.exam.status === 'active') {
      step = 'launching';
      launchKiosk();
    } else {
      step = 'lobby';
      startLobbyCountdown();
    }
  }

  // ─── Face events ────────────────────────────────────────────────────────
  function onEnrollComplete() { step = 'verify'; }

  function onVerifySuccess() {
    // Resume: active session already exists → launch kiosk immediately
    if (data.sessionStatus === 'in_progress' && data.sessionId) {
      step = 'launching';
      launchKiosk();
    } else {
      step = 'preview';
    }
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────
  onMount(() => {
    window.addEventListener('message', handleKioskMessage);

    // Auto-launch if we resumed an in-progress session
    if (step === 'launching') {
      launchKiosk();
    }

    return () => {
      window.removeEventListener('message', handleKioskMessage);
      if (lobbyInterval)      clearInterval(lobbyInterval);
      if (kioskCheckInterval) clearInterval(kioskCheckInterval);
    };
  });

  // ─── Helpers ────────────────────────────────────────────────────────────
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
</script>

<svelte:head>
  <title>{data.exam?.title ?? 'eTest'} — eTest</title>
</svelte:head>

<!-- ══ FACE ENROLLMENT ═══════════════════════════════════════════════════ -->
{#if step === 'enroll'}
  <FaceEnrollmentModal
    open={true}
    onClose={() => goto('/student')}
    onComplete={onEnrollComplete}
  />
{/if}

<!-- ══ FACE VERIFICATION ═════════════════════════════════════════════════ -->
{#if step === 'verify'}
  <FaceVerifyModal
    examId={data.examId}
    onSuccess={onVerifySuccess}
    onCancel={() => goto('/student')}
  />
{/if}

<!-- ══ IDENTITY PREVIEW ══════════════════════════════════════════════════ -->
{#if step === 'preview'}
  <div class="page-wrap">
    <div class="flow-card">
      <div class="card-header">
        <Shield size={20} class="header-icon" />
        <div>
          <h1>Confirm Your Identity</h1>
          <p>Verify the information below is yours before proceeding</p>
        </div>
      </div>

      <div class="exam-banner">
        <div class="exam-code">{data.exam.courseCode}</div>
        <div class="exam-banner-info">
          <span class="exam-banner-title">{data.exam.title}</span>
          <div class="exam-banner-meta">
            <span><Clock size={13} />{data.exam.durationMinutes} min</span>
            <span><BookOpen size={13} />{data.exam.totalQuestions} questions</span>
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

<!-- ══ RULES ══════════════════════════════════════════════════════════════ -->
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
          <li>The exam will open in a new window. Do not close the new window until you have submitted.</li>
        </ol>

        <h2>Violations & Consequences</h2>
        <ol>
          <li>Each detected violation increments your violation counter. You will be warned on screen.</li>
          <li>Reaching {data.exam.maxViolations} violations will result in automatic submission.</li>
          <li>Face mismatch or detecting multiple faces will immediately pause your session for invigilator review.</li>
          <li>Attempting to spoof the camera with a photo or video will result in immediate disqualification.</li>
        </ol>

        <h2>Submission</h2>
        <ol>
          <li>You may submit your exam at any time before the timer expires.</li>
          <li>When the timer reaches zero, your exam will be submitted automatically with all answers saved up to that point.</li>
          <li>Once submitted, you cannot re-enter the exam.</li>
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
          <ExternalLink size={16} /> Accept & Open Exam Window
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
      <h1 class="lobby-title">{data.exam.title}</h1>
      <p class="lobby-course">{data.exam.courseCode} — {data.exam.courseTitle}</p>

      <div class="lobby-countdown">
        <div class="countdown-label">Exam starts in</div>
        <div class="countdown-display">{formatTime(lobbySecondsLeft)}</div>
        <div class="countdown-sub">Scheduled: {formatScheduled(data.exam.scheduledStart)}</div>
      </div>

      <div class="lobby-info">
        <div class="lobby-info-item"><Clock size={16} />{data.exam.durationMinutes} minutes</div>
        <div class="lobby-info-item"><BookOpen size={16} />{data.exam.totalQuestions} questions</div>
      </div>

      <p class="lobby-hint">The exam window will open automatically when the timer reaches zero.</p>

      {#if lobbySecondsLeft === 0}
        <button class="btn-primary" onclick={launchKiosk}>
          <ExternalLink size={16} /> Open Exam Window
        </button>
      {/if}
    </div>
  </div>
{/if}

<!-- ══ LAUNCHING ══════════════════════════════════════════════════════════ -->
{#if step === 'launching'}
  <div class="page-wrap">
    <div class="status-card">
      <div class="spinner"></div>
      <h1>Opening exam…</h1>
      <p>The exam is opening in a new window. If nothing happens, check your popup blocker.</p>
      <button class="btn-secondary" onclick={launchKiosk}>
        <ExternalLink size={16} /> Open Manually
      </button>
    </div>
  </div>
{/if}

<!-- ══ KIOSK OPEN (monitor state) ════════════════════════════════════════ -->
{#if step === 'kiosk_open'}
  <div class="page-wrap">
    <div class="monitor-card">
      <div class="monitor-dot"></div>
      <h1>Exam in Progress</h1>
      <p>Your exam is running in the other window. <strong>Do not close that window</strong> until you have submitted.</p>

      <div class="monitor-exam-info">
        <div class="exam-code">{data.exam.courseCode}</div>
        <span>{data.exam.title}</span>
      </div>

      <div class="monitor-actions">
        <button class="btn-secondary" onclick={launchKiosk}>
          <ExternalLink size={15} /> Reopen Exam Window
        </button>
      </div>

      <p class="monitor-hint">
        This page will update automatically when you submit.
      </p>
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
      <button class="btn-primary" onclick={() => goto('/student/results')}>
        View Results
      </button>
    </div>
  </div>
{/if}

<!-- ══ FLAGGED ════════════════════════════════════════════════════════════ -->
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

<!-- ══ BLOCKED ════════════════════════════════════════════════════════════ -->
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
  /* ── Base ─────────────────────────────────────────────────────────────── */
  .page-wrap {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 1.5rem;
    background: var(--color-bg);
  }

  /* ── Flow card ────────────────────────────────────────────────────────── */
  .flow-card {
    width: 100%; max-width: 580px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1.25rem;
    overflow: hidden;
    box-shadow: 0 8px 32px rgb(0 0 0 / .06);
  }
  .center-card {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 1rem; padding: 3rem 2rem;
  }
  .warn-card { border-color: #fbbf24; }

  /* ── Card header ──────────────────────────────────────────────────────── */
  .card-header {
    display: flex; align-items: flex-start; gap: .875rem;
    padding: 1.5rem 1.5rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .card-header :global(.header-icon) {
    color: var(--student-accent, #10b981); margin-top: .1rem; flex-shrink: 0;
  }
  .card-header h1 { font-size: 1.1rem; font-weight: 800; margin: 0 0 .2rem; color: var(--color-text); }
  .card-header p  { font-size: .82rem; color: var(--color-muted); margin: 0; }

  /* ── Exam banner ──────────────────────────────────────────────────────── */
  .exam-banner {
    display: flex; align-items: center; gap: 1rem;
    padding: 1rem 1.5rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }
  .exam-code {
    font-size: .75rem; font-weight: 800;
    padding: .25rem .6rem;
    background: var(--student-accent-bg, rgba(16,185,129,.1));
    color: var(--student-accent, #10b981);
    border-radius: 6px; white-space: nowrap;
  }
  .exam-banner-title { font-size: .9rem; font-weight: 700; color: var(--color-text); display: block; }
  .exam-banner-meta  { display: flex; gap: .75rem; font-size: .78rem; color: var(--color-muted); margin-top: .2rem; }
  .exam-banner-meta span { display: flex; align-items: center; gap: .3rem; }

  /* ── Student preview ──────────────────────────────────────────────────── */
  .student-preview {
    display: flex; gap: 1.5rem; padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .preview-photo-col {
    display: flex; flex-direction: column; align-items: center; gap: .5rem; flex-shrink: 0;
  }
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
    padding: 1rem 1.5rem;
    background: #fefce8; border-bottom: 1px solid #fef08a;
  }
  .preview-question :global(.warn-icon) { color: #ca8a04; flex-shrink: 0; }
  .preview-question p { font-size: .88rem; font-weight: 600; color: #92400e; margin: 0; }
  .preview-actions { display: flex; gap: .75rem; padding: 1.25rem 1.5rem; justify-content: flex-end; }

  /* ── Rules ────────────────────────────────────────────────────────────── */
  .rules-card { max-width: 680px; }
  .rules-scroll {
    max-height: 380px; overflow-y: auto; padding: 1.5rem;
    border-bottom: 1px solid var(--color-border); scroll-behavior: smooth;
  }
  .rules-scroll h2 {
    font-size: .78rem; font-weight: 800; color: var(--color-text);
    margin: 1.25rem 0 .5rem; text-transform: uppercase; letter-spacing: .05em;
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
  .accept-label {
    display: flex; align-items: flex-start; gap: .625rem;
    cursor: pointer; font-size: .85rem; color: var(--color-text); line-height: 1.5;
  }
  .accept-label.disabled { opacity: .5; cursor: not-allowed; }
  .accept-label input[type="checkbox"] {
    margin-top: .15rem; accent-color: var(--student-accent, #10b981); flex-shrink: 0;
  }
  .scroll-hint { font-size: .75rem; color: var(--color-muted); margin: 0; font-style: italic; }

  /* ── Lobby ────────────────────────────────────────────────────────────── */
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

  /* ── Launching ────────────────────────────────────────────────────────── */
  .status-card {
    display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
    text-align: center; max-width: 420px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 3rem 2rem;
    box-shadow: 0 8px 32px rgb(0 0 0 / .06);
  }
  .status-card h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .status-card p  { font-size: .88rem; color: var(--color-muted); margin: 0; line-height: 1.6; }

  .spinner {
    width: 40px; height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--student-accent, #10b981);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Kiosk monitor ────────────────────────────────────────────────────── */
  .monitor-card {
    display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
    text-align: center; max-width: 480px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1.25rem; padding: 3rem 2rem;
    box-shadow: 0 8px 32px rgb(0 0 0 / .06);
  }
  .monitor-dot {
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--student-accent, #10b981);
    box-shadow: 0 0 0 5px var(--student-accent-bg, rgba(16,185,129,.2));
    animation: heartbeat 2s ease-in-out infinite;
  }
  @keyframes heartbeat {
    0%, 100% { box-shadow: 0 0 0 5px var(--student-accent-bg, rgba(16,185,129,.2)); }
    50%       { box-shadow: 0 0 0 10px transparent; }
  }
  .monitor-card h1 { font-size: 1.25rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .monitor-card p  { font-size: .88rem; color: var(--color-muted); margin: 0; line-height: 1.6; }

  .monitor-exam-info {
    display: flex; align-items: center; gap: .75rem;
    padding: .75rem 1.25rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: .75rem; width: 100%;
  }
  .monitor-exam-info span { font-size: .85rem; font-weight: 600; color: var(--color-text); }

  .monitor-actions { display: flex; gap: .75rem; }
  .monitor-hint { font-size: .75rem; color: var(--color-muted); margin: 0; }

  /* ── Buttons ──────────────────────────────────────────────────────────── */
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
  .btn-secondary:hover { background: var(--color-border); }

  .btn-danger {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .7rem 1.5rem;
    background: #fef2f2; color: #dc2626;
    border: 1.5px solid #fecaca; border-radius: .625rem;
    font-weight: 700; font-size: .9rem; cursor: pointer;
    transition: all .2s; font-family: inherit;
  }
  .btn-danger:hover { background: #fee2e2; }

  /* ── Terminal state icons ─────────────────────────────────────────────── */
  .center-card :global(.done-icon)    { color: var(--student-accent, #10b981); }
  .center-card :global(.warn-icon-lg) { color: #f59e0b; }
  .center-card h1 { font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .center-card p  { font-size: .9rem; color: var(--color-muted); max-width: 380px; line-height: 1.6; margin: 0; }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    .student-preview   { flex-direction: column; align-items: center; }
    .preview-details   { width: 100%; }
    .detail-label      { width: 80px; }
    .preview-actions   { flex-direction: column; }
    .btn-primary, .btn-danger, .btn-secondary { width: 100%; justify-content: center; }
    .lobby-card        { padding: 1.5rem 1.25rem; }
    .countdown-display { font-size: 2.5rem; }
  }
</style>