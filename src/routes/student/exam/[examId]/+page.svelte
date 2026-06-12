<!-- src/routes/student/exam/[examId]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    Play, Clock, Calendar, Award, AlertTriangle, ShieldCheck,
    CheckCircle2, BookOpen, ArrowLeft, Timer, Info, Scan,
    UserCheck, FileText, Eye, EyeOff, ChevronRight, Lock
  } from 'lucide-svelte';
  import FaceVerifyModal from '$lib/components/exam/FaceVerifyModal.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let verified     = $state(data.faceVerified);
  let showVerify   = $state(false);
  let entering     = $state(false);
  let error        = $state('');

  // ── Pre-exam lobby steps ───────────────────────────────────────────────
  type LobbyStep = 'instructions' | 'identity' | 'rules' | 'confirm';
  let currentStep = $state<LobbyStep>('instructions');
  let rulesRead   = $state(false);
  let identityConfirmed = $state(false);
  let dataVerified = $state(false);
  let countdown   = $state(5);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Auto-open verify modal on mount if not yet verified
  onMount(() => {
    if (!verified) showVerify = true;
  });

  function onVerifySuccess() {
    verified   = true;
    showVerify = false;
  }

  function nextStep() {
    if (currentStep === 'instructions') currentStep = 'identity';
    else if (currentStep === 'identity') currentStep = 'rules';
    else if (currentStep === 'rules') {
      if (!rulesRead) {
        error = 'You must scroll through and read all rules before proceeding.';
        return;
      }
      currentStep = 'confirm';
      startCountdown();
    }
  }

  function prevStep() {
    if (currentStep === 'identity') currentStep = 'instructions';
    else if (currentStep === 'rules') currentStep = 'identity';
    else if (currentStep === 'confirm') {
      if (countdownInterval) clearInterval(countdownInterval);
      currentStep = 'rules';
    }
  }

  function startCountdown() {
    countdown = 5;
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(countdownInterval!);
        countdownInterval = null;
      }
    }, 1000);
  }

  function handleRulesScroll(e: Event) {
    const el = e.target as HTMLDivElement;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (nearBottom) rulesRead = true;
  }

  async function enterExam() {
    if (!verified || entering || countdown > 0) return;
    if (!identityConfirmed || !dataVerified) {
      error = 'You must confirm your identity and data before entering.';
      return;
    }
    entering = true;
    error    = '';
    try {
      const res = await fetch(`/api/exam/${data.exam.id}/start`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        error    = body.error ?? 'Could not start exam. Please try again.';
        entering = false;
        return;
      }
      // Open exam in NEW TAB — escapes the student layout completely
      const sessionUrl = `/student/exam/${data.exam.id}/session`;
      window.open(sessionUrl, '_blank', 'noopener,noreferrer');
      // Redirect current tab back to exams list
      await goto('/student/exam');
    } catch (e) {
      error    = 'Network error. Please check your connection.';
      entering = false;
    }
  }

  function formatDate(d: Date | string | null) {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function formatTime(d: Date | string | null) {
    if (!d) return 'TBD';
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  function formatDuration(mins: number) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  }

  const examRules = [
    { icon: Eye, title: 'No Tab Switching', desc: 'Switching browser tabs or windows will be detected and recorded as a violation.' },
    { icon: Lock, title: 'Fullscreen Required', desc: 'The exam runs in fullscreen mode. Exiting fullscreen will trigger a violation.' },
    { icon: ShieldCheck, title: 'Face Monitoring', desc: 'Your camera must remain on throughout the exam. No face or multiple faces detected will be flagged.' },
    { icon: FileText, title: 'No Copy/Paste', desc: 'Copying, pasting, screenshots, and right-click are disabled during the exam.' },
    { icon: EyeOff, title: 'No DevTools', desc: 'Opening browser developer tools or inspecting elements is prohibited.' },
    { icon: AlertTriangle, title: 'Auto-Submission', desc: '3 violations will result in automatic submission of your exam.' },
    { icon: UserCheck, title: 'Impersonation', desc: 'Your face is continuously verified against your enrolled photo. Mismatch = instant flag.' },
    { icon: Clock, title: 'Timer', desc: 'The timer runs continuously. Time expired = automatic submission.' },
  ];
</script>

<!-- FaceVerifyModal — prop names match FaceVerifyModal's Props interface exactly -->
<FaceVerifyModal
  open={showVerify}
  examId={data.exam.id}
  onVerified={onVerifySuccess}
  onClose={() => { showVerify = false; if (!verified) goto('/student/exam'); }}
/>

<div class="lobby">

  <!-- Back link -->
  <a href="/student/exam" class="back-link">
    <ArrowLeft size={13}/> Back to exams
  </a>

  <div class="lobby-card">

    <!-- Header -->
    <div class="lobby-head">
      <div class="course-pill">{data.exam.courseCode}</div>
      {#if data.registrationType !== 'normal'}
        <div class="reg-type-pill">{data.registrationType.replace('_', ' ')}</div>
      {/if}
    </div>

    <h1 class="exam-title">{data.exam.title}</h1>
    <p class="exam-course">{data.exam.courseTitle} · {data.exam.department}</p>

    <!-- Step indicator -->
    <div class="step-track">
      {#each ['instructions', 'identity', 'rules', 'confirm'] as step, i}
        {@const stepLabels = ['Instructions', 'Identity', 'Rules', 'Confirm']}
        {@const isActive = currentStep === step}
        {@const isDone = ['instructions', 'identity', 'rules', 'confirm'].indexOf(currentStep) > i}
        <div class="step-node" class:active={isActive} class:done={isDone}>
          <div class="step-dot">
            {#if isDone}
              <CheckCircle2 size={12} />
            {:else}
              {i + 1}
            {/if}
          </div>
          <span class="step-label">{stepLabels[i]}</span>
        </div>
        {#if i < 3}
          <div class="step-line" class:active={isDone}></div>
        {/if}
      {/each}
    </div>

    <!-- ── STEP 1: Instructions ─────────────────────────────────────────── -->
    {#if currentStep === 'instructions'}
      <div class="step-panel">
        <div class="details-grid">
          <div class="detail-block">
            <Clock size={14}/>
            <div><span class="d-label">Duration</span><span class="d-val">{formatDuration(data.exam.durationMinutes)}</span></div>
          </div>
          <div class="detail-block">
            <Calendar size={14}/>
            <div><span class="d-label">Date</span><span class="d-val">{formatDate(data.exam.scheduledStart)}</span></div>
          </div>
          <div class="detail-block">
            <Timer size={14}/>
            <div><span class="d-label">Start Time</span><span class="d-val">{formatTime(data.exam.scheduledStart)}</span></div>
          </div>
          <div class="detail-block">
            <Award size={14}/>
            <div><span class="d-label">Pass Mark</span><span class="d-val">{data.exam.passMark} / {data.exam.totalMarks}</span></div>
          </div>
          <div class="detail-block">
            <BookOpen size={14}/>
            <div><span class="d-label">Questions</span><span class="d-val">
              {data.exam.questionsToPresent > 0 ? `${data.exam.questionsToPresent} of ${data.exam.totalQuestions}` : data.exam.totalQuestions}
            </span></div>
          </div>
        </div>

        {#if data.exam.instructions}
          <div class="instructions-box">
            <div class="instructions-head"><Info size={13}/> Examination Instructions</div>
            <p>{data.exam.instructions}</p>
          </div>
        {/if}

        <div class="rules-summary">
          <AlertTriangle size={13}/>
          <span>This exam is strictly monitored. Tab switching, fullscreen exit, copy attempts, and face mismatches are recorded. <strong>3 violations = auto-submission.</strong></span>
        </div>

        <div class="step-actions">
          <button class="btn-primary" onclick={nextStep}>
            Proceed to Identity Verification <ChevronRight size={14}/>
          </button>
        </div>
      </div>
    {/if}

    <!-- ── STEP 2: Identity Verification ──────────────────────────────── -->
    {#if currentStep === 'identity'}
      <div class="step-panel">
        <div class="identity-card">
          <div class="identity-header">
            <UserCheck size={20} />
            <h3>Verify Your Identity</h3>
          </div>
          <p class="identity-sub">Confirm that the information below belongs to you. If anything is incorrect, contact your department before proceeding.</p>

          <div class="identity-grid">
            <div class="id-field">
              <span class="id-label">Full Name</span>
              <span class="id-value">{data.student?.fullName ?? '—'}</span>
            </div>
            <div class="id-field">
              <span class="id-label">Matric Number</span>
              <span class="id-value">{data.student?.matricNumber ?? '—'}</span>
            </div>
            <div class="id-field">
              <span class="id-label">Department</span>
              <span class="id-value">{data.exam.department}</span>
            </div>
            <div class="id-field">
              <span class="id-label">Course</span>
              <span class="id-value">{data.exam.courseCode} — {data.exam.courseTitle}</span>
            </div>
            <div class="id-field">
              <span class="id-label">Exam Title</span>
              <span class="id-value">{data.exam.title}</span>
            </div>
            <div class="id-field">
              <span class="id-label">Duration</span>
              <span class="id-value">{formatDuration(data.exam.durationMinutes)}</span>
            </div>
          </div>

          <label class="confirm-check">
            <input type="checkbox" bind:checked={dataVerified} />
            <span class="check-box">
              {#if dataVerified}<CheckCircle2 size={14} />{/if}
            </span>
            <span class="check-text">I confirm that all the data displayed above is correct and belongs to me.</span>
          </label>
        </div>

        <div class="verify-status-bar" class:verified>
          {#if verified}
            <CheckCircle2 size={16} color="#16a34a" />
            <span>Face identity verified</span>
          {:else}
            <Scan size={16} />
            <span>Face verification required before entry</span>
            <button class="btn-verify" onclick={() => showVerify = true}>Verify Now</button>
          {/if}
        </div>

        <div class="step-actions">
          <button class="btn-secondary" onclick={prevStep}>
            <ArrowLeft size={14}/> Back
          </button>
          <button class="btn-primary" disabled={!verified || !dataVerified} onclick={nextStep}>
            Proceed to Rules <ChevronRight size={14}/>
          </button>
        </div>
      </div>
    {/if}

    <!-- ── STEP 3: Rules & Regulations ────────────────────────────────── -->
    {#if currentStep === 'rules'}
      <div class="step-panel">
        <div class="rules-card">
          <div class="rules-header">
            <ShieldCheck size={20} />
            <h3>Examination Rules & Regulations</h3>
          </div>
          <p class="rules-sub">Read and understand all rules. You must scroll to the bottom to proceed.</p>

          <div class="rules-list" onscroll={handleRulesScroll}>
            {#each examRules as rule, i}
              <div class="rule-item">
                <div class="rule-num">{i + 1}</div>
                <div class="rule-icon"><svelte:component this={rule.icon} size={18} /></div>
                <div class="rule-content">
                  <h4>{rule.title}</h4>
                  <p>{rule.desc}</p>
                </div>
              </div>
            {/each}
          </div>

          {#if !rulesRead}
            <div class="scroll-hint">
              <ChevronRight size={14} class="bounce" />
              Scroll down to read all rules
            </div>
          {/if}

          <label class="confirm-check">
            <input type="checkbox" bind:checked={rulesRead} />
            <span class="check-box">
              {#if rulesRead}<CheckCircle2 size={14} />{/if}
            </span>
            <span class="check-text">I have read and understood all the examination rules and regulations.</span>
          </label>
        </div>

        <div class="step-actions">
          <button class="btn-secondary" onclick={prevStep}>
            <ArrowLeft size={14}/> Back
          </button>
          <button class="btn-primary" disabled={!rulesRead} onclick={nextStep}>
            Proceed to Confirmation <ChevronRight size={14}/>
          </button>
        </div>
      </div>
    {/if}

    <!-- ── STEP 4: Final Confirmation ─────────────────────────────────── -->
    {#if currentStep === 'confirm'}
      <div class="step-panel">
        <div class="confirm-card">
          <div class="confirm-header">
            <Lock size={20} />
            <h3>Final Confirmation</h3>
          </div>

          <div class="confirm-checklist">
            <div class="check-item" class:checked={verified}>
              <div class="check-icon">{verified ? '✓' : '○'}</div>
              <span>Face identity verified</span>
            </div>
            <div class="check-item" class:checked={dataVerified}>
              <div class="check-icon">{dataVerified ? '✓' : '○'}</div>
              <span>Personal data confirmed correct</span>
            </div>
            <div class="check-item" class:checked={rulesRead}>
              <div class="check-icon">{rulesRead ? '✓' : '○'}</div>
              <span>Rules & regulations read and understood</span>
            </div>
          </div>

          <label class="confirm-check final">
            <input type="checkbox" bind:checked={identityConfirmed} />
            <span class="check-box">
              {#if identityConfirmed}<CheckCircle2 size={14} />{/if}
            </span>
            <span class="check-text">
              I solemnly affirm that I am <strong>{data.student?.fullName ?? 'the registered student'}</strong>.
              I understand that impersonation is a serious academic offence punishable under university regulations.
            </span>
          </label>

          {#if error}
            <div class="error-notice"><AlertTriangle size={13}/> {error}</div>
          {/if}
        </div>

        <div class="step-actions">
          <button class="btn-secondary" onclick={prevStep}>
            <ArrowLeft size={14}/> Back
          </button>
          <button
            class="btn-enter"
            disabled={!verified || !identityConfirmed || !dataVerified || entering || countdown > 0}
            onclick={enterExam}
          >
            {#if entering}
              <span class="spinner"></span> Starting…
            {:else if countdown > 0}
              <Lock size={14}/> Wait {countdown}s…
            {:else}
              <Play size={15}/>
              {data.hasExistingSession ? 'Resume Exam' : 'Enter Exam'}
            {/if}
          </button>
        </div>
      </div>
    {/if}

  </div>
</div>

<style>
  .lobby { max-width: 680px; margin: 2rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .back-link { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; color: var(--color-muted); text-decoration: none; transition: color 0.15s; }
  .back-link:hover { color: var(--green-600); }

  .lobby-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 1rem; padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }

  .lobby-head { display: flex; align-items: center; gap: 0.4rem; }
  .course-pill { font-size: 0.7rem; font-weight: 800; font-family: monospace; padding: 0.2rem 0.5rem; border-radius: 0.3rem; background: var(--green-soft); color: var(--green-700); letter-spacing: 0.03em; }
  .reg-type-pill { font-size: 0.62rem; font-weight: 700; text-transform: capitalize; padding: 0.15rem 0.45rem; border-radius: 0.25rem; background: rgba(245,158,11,.12); color: #b45309; }

  .exam-title { margin: 0; font-size: 1.35rem; font-weight: 800; color: var(--color-text); line-height: 1.25; }
  .exam-course { margin: 0; font-size: 0.78rem; color: var(--color-muted); }

  /* Step track */
  .step-track { display: flex; align-items: center; justify-content: center; gap: 0; padding: 0.5rem 0; }
  .step-node { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
  .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: var(--color-bg); border: 2px solid var(--color-border); color: var(--color-muted); transition: all 0.3s; }
  .step-node.active .step-dot { background: var(--green-600); border-color: var(--green-600); color: #fff; box-shadow: 0 0 0 4px rgba(21,128,61,0.15); }
  .step-node.done .step-dot { background: var(--green-600); border-color: var(--green-600); color: #fff; }
  .step-label { font-size: 0.6rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .step-node.active .step-label { color: var(--green-600); font-weight: 700; }
  .step-line { width: 40px; height: 2px; background: var(--color-border); margin: 0 0.25rem; transition: background 0.3s; }
  .step-line.active { background: var(--green-600); }
  @media (max-width: 480px) { .step-line { width: 20px; } .step-label { display: none; } }

  /* Step panels */
  .step-panel { display: flex; flex-direction: column; gap: 1rem; animation: fade-up 0.3s ease; }

  /* Details grid */
  .details-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; padding: 1rem; border-radius: 0.625rem; background: var(--color-bg); border: 1px solid var(--color-border); }
  .detail-block { display: flex; align-items: flex-start; gap: 0.4rem; color: var(--color-muted); }
  .detail-block div { display: flex; flex-direction: column; gap: 0.1rem; }
  .d-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
  .d-val { font-size: 0.82rem; font-weight: 700; color: var(--color-text); }

  .instructions-box { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.875rem; }
  .instructions-head { display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.4rem; }
  .instructions-box p { margin: 0; font-size: 0.8rem; color: var(--color-text); line-height: 1.55; }

  .rules-summary { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.75rem; color: #92400e; line-height: 1.45; background: rgba(245,158,11,.07); border: 1px solid rgba(245,158,11,.25); border-radius: 0.5rem; padding: 0.7rem 0.875rem; }

  /* Identity */
  .identity-card { display: flex; flex-direction: column; gap: 0.875rem; }
  .identity-header { display: flex; align-items: center; gap: 0.5rem; color: var(--green-600); }
  .identity-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--color-text); }
  .identity-sub { margin: 0; font-size: 0.75rem; color: var(--color-muted); line-height: 1.5; }
  .identity-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .id-field { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.625rem; background: var(--color-bg); border-radius: 0.4rem; border: 1px solid var(--color-border); }
  .id-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); font-weight: 600; }
  .id-value { font-size: 0.8rem; font-weight: 700; color: var(--color-text); }
  @media (max-width: 480px) { .identity-grid { grid-template-columns: 1fr; } }

  /* Rules */
  .rules-card { display: flex; flex-direction: column; gap: 0.875rem; }
  .rules-header { display: flex; align-items: center; gap: 0.5rem; color: var(--green-600); }
  .rules-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--color-text); }
  .rules-sub { margin: 0; font-size: 0.75rem; color: var(--color-muted); }
  .rules-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 320px; overflow-y: auto; padding-right: 0.5rem; border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.75rem; background: var(--color-bg); }
  .rule-item { display: flex; align-items: flex-start; gap: 0.625rem; padding: 0.625rem; border-radius: 0.4rem; background: var(--color-surface); border: 1px solid var(--color-border); }
  .rule-num { width: 22px; height: 22px; border-radius: 50%; background: var(--green-soft); color: var(--green-700); font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rule-icon { color: var(--green-600); flex-shrink: 0; margin-top: 2px; }
  .rule-content h4 { margin: 0; font-size: 0.8rem; font-weight: 700; color: var(--color-text); }
  .rule-content p { margin: 0.15rem 0 0; font-size: 0.72rem; color: var(--color-muted); line-height: 1.4; }
  .scroll-hint { display: flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; color: var(--green-600); font-weight: 600; justify-content: center; }
  .scroll-hint :global(.bounce) { animation: bounce-x 1s ease-in-out infinite; }

  /* Confirm */
  .confirm-card { display: flex; flex-direction: column; gap: 0.875rem; }
  .confirm-header { display: flex; align-items: center; gap: 0.5rem; color: var(--green-600); }
  .confirm-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--color-text); }
  .confirm-checklist { display: flex; flex-direction: column; gap: 0.5rem; }
  .check-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 0.4rem; background: var(--color-bg); border: 1px solid var(--color-border); font-size: 0.8rem; color: var(--color-muted); transition: all 0.2s; }
  .check-item.checked { background: var(--green-soft); border-color: var(--green-600); color: var(--green-700); }
  .check-icon { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
  .check-item.checked .check-icon { background: var(--green-600); border-color: var(--green-600); color: #fff; }

  /* Checkbox */
  .confirm-check { display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--color-border); background: var(--color-bg); transition: all 0.2s; }
  .confirm-check:hover { border-color: var(--green-600); }
  .confirm-check input { position: absolute; opacity: 0; width: 0; height: 0; }
  .check-box { width: 20px; height: 20px; border-radius: 0.3rem; border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; color: #fff; }
  .confirm-check:has(input:checked) .check-box { background: var(--green-600); border-color: var(--green-600); }
  .check-text { font-size: 0.78rem; color: var(--color-text); line-height: 1.5; }
  .confirm-check.final { background: rgba(245,158,11,.05); border-color: rgba(245,158,11,.3); }
  .confirm-check.final:hover { border-color: #f59e0b; }

  /* Verify status */
  .verify-status-bar { display: flex; align-items: center; gap: 0.4rem; padding: 0.625rem 0.875rem; border-radius: 0.5rem; background: var(--color-bg); border: 1px solid var(--color-border); font-size: 0.78rem; font-weight: 600; color: var(--color-muted); }
  .verify-status-bar.verified { background: var(--green-soft); border-color: var(--green-600); color: var(--green-700); }
  .btn-verify { font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.625rem; border-radius: 0.35rem; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); cursor: pointer; transition: all 0.15s; font-family: inherit; margin-left: auto; }
  .btn-verify:hover { border-color: var(--green-600); color: var(--green-600); }

  /* Actions */
  .step-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--color-border); flex-wrap: wrap; }
  .btn-primary, .btn-secondary, .btn-enter {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.65rem 1.25rem; border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 700; cursor: pointer;
    transition: all 0.2s; border: none; font-family: inherit;
  }
  .btn-primary { background: var(--green-600); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: var(--green-700); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .btn-secondary { background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted); }
  .btn-secondary:hover { border-color: var(--green-600); color: var(--green-600); }
  .btn-enter { background: linear-gradient(135deg, var(--green-600), var(--green-700)); color: #fff; box-shadow: 0 4px 16px rgba(21,128,61,0.25); }
  .btn-enter:hover:not(:disabled) { background: linear-gradient(135deg, var(--green-700), #065f46); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(21,128,61,0.35); }
  .btn-enter:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

  .error-notice { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: #b91c1c; line-height: 1.45; background: rgba(220,38,38,.06); border: 1px solid rgba(220,38,38,.2); border-radius: 0.5rem; padding: 0.7rem 0.875rem; }

  .spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bounce-x { 0%,100% { transform: translateX(0); } 50% { transform: translateX(4px); } }

  @media (max-width: 480px) {
    .lobby { margin: 1rem auto; }
    .lobby-card { padding: 1.25rem; }
    .step-actions { flex-direction: column; align-items: stretch; }
    .btn-primary, .btn-secondary, .btn-enter { justify-content: center; }
    .details-grid { grid-template-columns: 1fr 1fr; }
  }
</style>