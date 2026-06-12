<!-- src/routes/student/exam/[examId]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    Play, Clock, Calendar, Award, AlertTriangle,
    CheckCircle2, ShieldCheck, BookOpen, ArrowLeft,
    Timer, Info, Scan
  } from 'lucide-svelte';
  import FaceVerifyModal from '$lib/components/exam/FaceVerifyModal.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let verified    = $state(data.faceVerified);
  let showVerify  = $state(false);
  let entering    = $state(false);
  let error       = $state('');

  // Auto-open the verify modal on mount if not yet verified
  onMount(() => {
    if (!verified) showVerify = true;
  });

  function onVerifySuccess() {
    verified   = true;
    showVerify = false;
  }

  async function enterExam() {
    if (!verified || entering) return;
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
      await goto(`/student/exam/${data.exam.id}/session`);
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

    <!-- Details grid -->
    <div class="details-grid">
      <div class="detail-block">
        <Clock size={14}/>
        <div>
          <span class="d-label">Duration</span>
          <span class="d-val">{formatDuration(data.exam.durationMinutes)}</span>
        </div>
      </div>
      <div class="detail-block">
        <Calendar size={14}/>
        <div>
          <span class="d-label">Date</span>
          <span class="d-val">{formatDate(data.exam.scheduledStart)}</span>
        </div>
      </div>
      <div class="detail-block">
        <Timer size={14}/>
        <div>
          <span class="d-label">Start Time</span>
          <span class="d-val">{formatTime(data.exam.scheduledStart)}</span>
        </div>
      </div>
      <div class="detail-block">
        <Award size={14}/>
        <div>
          <span class="d-label">Pass Mark</span>
          <span class="d-val">{data.exam.passMark} / {data.exam.totalMarks}</span>
        </div>
      </div>
      <div class="detail-block">
        <BookOpen size={14}/>
        <div>
          <span class="d-label">Questions</span>
          <span class="d-val">
            {data.exam.questionsToPresent > 0
              ? `${data.exam.questionsToPresent} of ${data.exam.totalQuestions}`
              : data.exam.totalQuestions}
          </span>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    {#if data.exam.instructions}
      <div class="instructions">
        <div class="instructions-head"><Info size={13}/> Instructions</div>
        <p>{data.exam.instructions}</p>
      </div>
    {/if}

    <!-- Rules notice -->
    <div class="rules-notice">
      <AlertTriangle size={13}/>
      <span>Do not switch tabs, exit fullscreen, or open devtools. Violations will be recorded and may result in automatic submission.</span>
    </div>

    <!-- Error -->
    {#if error}
      <div class="error-notice"><AlertTriangle size={13}/> {error}</div>
    {/if}

    <!-- Action footer -->
    <div class="lobby-footer">

      <div class="verify-status" class:verified>
        {#if verified}
          <CheckCircle2 size={14}/>
          <span>Identity verified</span>
        {:else}
          <Scan size={14}/>
          <span>Face verification required</span>
          <button class="btn-verify" onclick={() => showVerify = true}>
            Verify Now
          </button>
        {/if}
      </div>

      <button
        class="btn-enter"
        disabled={!verified || entering}
        onclick={enterExam}
      >
        {#if entering}
          <span class="spinner"></span> Starting…
        {:else}
          <Play size={15}/>
          {data.hasExistingSession ? 'Resume Exam' : 'Enter Exam'}
        {/if}
      </button>

    </div>
  </div>
</div>

<style>
  .lobby {
    max-width: 640px; margin: 2rem auto; padding: 0 1rem;
    display: flex; flex-direction: column; gap: 1rem;
  }

  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.72rem; color: var(--color-muted); text-decoration: none;
    transition: color 0.15s;
  }
  .back-link:hover { color: var(--green-600); }

  .lobby-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.75rem;
    display: flex; flex-direction: column; gap: 1rem;
  }

  .lobby-head { display: flex; align-items: center; gap: 0.4rem; }
  .course-pill {
    font-size: 0.7rem; font-weight: 800; font-family: monospace;
    padding: 0.2rem 0.5rem; border-radius: 0.3rem;
    background: var(--green-soft); color: var(--green-700); letter-spacing: 0.03em;
  }
  .reg-type-pill {
    font-size: 0.62rem; font-weight: 700; text-transform: capitalize;
    padding: 0.15rem 0.45rem; border-radius: 0.25rem;
    background: rgba(245,158,11,.12); color: #b45309;
  }

  .exam-title { margin: 0; font-size: 1.35rem; font-weight: 800; color: var(--color-text); line-height: 1.25; }
  .exam-course { margin: 0; font-size: 0.78rem; color: var(--color-muted); }

  .details-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
    padding: 1rem; border-radius: 0.625rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
  }
  .detail-block {
    display: flex; align-items: flex-start; gap: 0.4rem;
    color: var(--color-muted);
  }
  .detail-block div { display: flex; flex-direction: column; gap: 0.1rem; }
  .d-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
  .d-val   { font-size: 0.82rem; font-weight: 700; color: var(--color-text); }

  .instructions {
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.875rem;
  }
  .instructions-head {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.4rem;
  }
  .instructions p { margin: 0; font-size: 0.8rem; color: var(--color-text); line-height: 1.55; }

  .rules-notice {
    display: flex; align-items: flex-start; gap: 0.5rem;
    font-size: 0.75rem; color: #92400e; line-height: 1.45;
    background: rgba(245,158,11,.07); border: 1px solid rgba(245,158,11,.25);
    border-radius: 0.5rem; padding: 0.7rem 0.875rem;
  }

  .error-notice {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.78rem; color: #b91c1c; line-height: 1.45;
    background: rgba(220,38,38,.06); border: 1px solid rgba(220,38,38,.2);
    border-radius: 0.5rem; padding: 0.7rem 0.875rem;
  }

  .lobby-footer {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding-top: 0.5rem;
    border-top: 1px solid var(--color-border); flex-wrap: wrap;
  }

  .verify-status {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.75rem; font-weight: 600;
    color: var(--color-muted);
  }
  .verify-status.verified { color: var(--green-700); }

  .btn-verify {
    font-size: 0.7rem; font-weight: 700;
    padding: 0.25rem 0.625rem; border-radius: 0.35rem;
    border: 1px solid var(--color-border); background: var(--color-surface);
    color: var(--color-text); cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .btn-verify:hover { border-color: var(--green-600); color: var(--green-600); }

  .btn-enter {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.7rem 1.5rem; border-radius: 0.5rem; border: none;
    background: var(--green-600); color: #fff;
    font-size: 0.875rem; font-weight: 700; cursor: pointer;
    transition: background 0.15s; font-family: inherit;
  }
  .btn-enter:hover:not(:disabled) { background: var(--green-700); }
  .btn-enter:disabled { opacity: 0.45; cursor: not-allowed; }

  .spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    animation: spin 0.7s linear infinite; flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 480px) {
    .lobby { margin: 1rem auto; }
    .lobby-card { padding: 1.25rem; }
    .lobby-footer { flex-direction: column; align-items: stretch; }
    .btn-enter { justify-content: center; }
    .details-grid { grid-template-columns: 1fr 1fr; }
  }
</style>