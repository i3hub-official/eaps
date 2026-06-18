<!-- src/routes/student/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    Camera, Clock, BookOpen, Calendar, PlayCircle,
    Lock, LayoutList, LayoutGrid, AlertTriangle,
    ChevronRight, RotateCcw, CheckCircle,
  } from '@lucide/svelte';

  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';
  import FaceVerifyModal     from '$lib/components/exam/FaceVerifyModal.svelte';

  let { data }: { data: PageData } = $props();

  // ── Step machine ────────────────────────────────────────────────────────
  // Minimal steps: exam list → optional enroll modal → optional verify modal → kiosk
  type Step = 'select' | 'enroll' | 'verify';

  let step            = $state<Step>('select');
  let selectedExamId  = $state<string | null>(null);
  let viewMode        = $state<'list' | 'grid'>('list');

  onMount(() => {
    const saved = localStorage.getItem('etest-exam-view');
    if (saved === 'grid' || saved === 'list') viewMode = saved;
  });

  function setView(mode: 'list' | 'grid') {
    viewMode = mode;
    localStorage.setItem('etest-exam-view', mode);
  }

  // ── Exam selection ───────────────────────────────────────────────────────
  function selectExam(examId: string) {
    selectedExamId = examId;

    if (!data.faceEnrolled) {
      // Must enroll first; after enrollment they come back and try again
      step = 'enroll';
      return;
    }

    if (!data.faceVerified) {
      // Enrolled but not verified this session → verify, then kiosk
      goto(`?examId=${examId}`, { replaceState: false });
      step = 'verify';
      return;
    }

    // Enrolled + already verified this session → straight to kiosk
    enterKiosk(examId);
  }

  function enterKiosk(examId?: string) {
    goto(`/student/exams/kiosk?examId=${examId ?? selectedExamId ?? data.examId}`);
  }

  // ── Enrollment callbacks ─────────────────────────────────────────────────
  function onEnrollComplete() {
    // Hard reload so server re-checks faceEnrolled
    window.location.href = selectedExamId
      ? `/student/exams?examId=${selectedExamId}`
      : '/student/exams';
  }

  // ── Verification callbacks ───────────────────────────────────────────────
  function onVerifySuccess() {
    // After verify, go directly into kiosk
    enterKiosk();
  }

  // ── Derived exam lists ───────────────────────────────────────────────────
  const availableExams = $derived(data.availableExams ?? []);

  // An exam is "resumable" if this student has an in_progress session for it.
  // The server includes alreadySubmitted; we need to handle in_progress separately.
  // We pass it through the exam's sessionStatus field (see server shape below).
  const liveExams      = $derived(availableExams.filter(e => e.status === 'active' && !e.alreadySubmitted));
  const scheduledExams = $derived(availableExams.filter(e => e.status === 'scheduled' && !e.alreadySubmitted));

  // ── Helpers ─────────────────────────────────────────────────────────────
  function formatDuration(mins: number): string {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function formatScheduled(d: string | null): string {
    if (!d) return 'TBD';
    return new Date(d).toLocaleString('en-NG', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function questionCount(exam: typeof availableExams[number]): number {
    return exam.questionsToPresent || exam.questionCount;
  }
</script>

<svelte:head>
  <title>My Exams — eTest</title>
</svelte:head>

<!-- ══════════════════════════════════════════════════════════════════════
     FACE ENROLLMENT MODAL
     ══════════════════════════════════════════════════════════════════════ -->
{#if step === 'enroll'}
  <FaceEnrollmentModal
    open={true}
    onClose={() => step = 'select'}
    onComplete={onEnrollComplete}
  />
{/if}

<!-- ══════════════════════════════════════════════════════════════════════
     FACE VERIFY MODAL
     ══════════════════════════════════════════════════════════════════════ -->
{#if step === 'verify'}
  <FaceVerifyModal
    examId={data.examId}
    onSuccess={onVerifySuccess}
    onCancel={() => { step = 'select'; goto('/student/exams'); }}
  />
{/if}

<!-- ══════════════════════════════════════════════════════════════════════
     MAIN EXAM LIST
     ══════════════════════════════════════════════════════════════════════ -->
<div class="exams-root">

  <!-- ── Page header ─────────────────────────────────────────────────── -->
  <div class="page-header">
    <div class="page-header-left">
      <h1 class="page-title">My Exams</h1>
      <p class="page-sub">
        {#if !data.faceEnrolled}
          Face enrollment required before you can enter any exam.
        {:else if liveExams.length > 0}
          {liveExams.length} exam{liveExams.length > 1 ? 's' : ''} live now
        {:else if scheduledExams.length > 0}
          {scheduledExams.length} upcoming exam{scheduledExams.length > 1 ? 's' : ''}
        {:else}
          No active exams right now
        {/if}
      </p>
    </div>

    <div class="page-header-right">
      <!-- Face enrollment chip -->
      {#if !data.faceEnrolled}
        <button class="chip chip-warn" onclick={() => step = 'enroll'}>
          <Camera size={13} />
          Enroll Face
        </button>
      {:else}
        <span class="chip chip-ok">
          <CheckCircle size={13} />
          Face enrolled
        </span>
      {/if}

      <!-- View toggle -->
      <div class="view-toggle">
        <button
          class="vt-btn"
          class:vt-active={viewMode === 'list'}
          onclick={() => setView('list')}
          aria-label="List view"
          title="List view"
        >
          <LayoutList size={15} />
        </button>
        <button
          class="vt-btn"
          class:vt-active={viewMode === 'grid'}
          onclick={() => setView('grid')}
          aria-label="Grid view"
          title="Grid view"
        >
          <LayoutGrid size={15} />
        </button>
      </div>
    </div>
  </div>

  <!-- ── Face enrollment banner (prominent, only when not enrolled) ──── -->
  {#if !data.faceEnrolled}
    <div class="enroll-banner">
      <div class="enroll-banner-icon">
        <Camera size={20} />
      </div>
      <div class="enroll-banner-text">
        <strong>Set up face recognition</strong>
        <span>Required to unlock and enter any exam. Takes about 30 seconds.</span>
      </div>
      <button class="enroll-banner-btn" onclick={() => step = 'enroll'}>
        Get started <ChevronRight size={14} />
      </button>
    </div>
  {/if}

  <!-- ── Empty state ──────────────────────────────────────────────────── -->
  {#if availableExams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><BookOpen size={32} strokeWidth={1.3} /></div>
      <h2>No exams available</h2>
      <p>You have no active or upcoming exams for your registered courses right now. Check back later.</p>
    </div>

  {:else}

    <!-- ══ LIVE EXAMS ══════════════════════════════════════════════════ -->
    {#if liveExams.length > 0}
      <section class="exam-section">
        <div class="section-head">
          <span class="section-label live">
            <span class="live-dot" aria-hidden="true"></span>
            Live now
          </span>
          <span class="section-count">{liveExams.length}</span>
        </div>

        <div class="exam-grid" class:is-grid={viewMode === 'grid'}>
          {#each liveExams as exam}
            {@const canEnter    = data.faceEnrolled}
            {@const isResumable = exam.sessionStatus === 'in_progress'}

            <button
              class="exam-card live-card"
              class:card-locked={!canEnter}
              class:card-resume={isResumable}
              onclick={() => canEnter ? selectExam(exam.id) : (step = 'enroll')}
              title={!canEnter ? 'Enroll your face to enter this exam' : undefined}
            >
              <!-- Course pill + status -->
              <div class="card-top">
                <span class="course-pill live-pill">{exam.course?.code ?? 'EXAM'}</span>
                {#if isResumable}
                  <span class="status-badge resume-badge">
                    <RotateCcw size={10} /> Resume
                  </span>
                {:else if !canEnter}
                  <span class="status-badge lock-badge">
                    <Lock size={10} /> Locked
                  </span>
                {:else}
                  <span class="status-badge enter-badge">
                    <PlayCircle size={10} /> Enter
                  </span>
                {/if}
              </div>

              <!-- Title -->
              <div class="card-title">{exam.title}</div>
              {#if exam.course?.title}
                <div class="card-sub">{exam.course.title}</div>
              {/if}

              <!-- Meta row -->
              <div class="card-meta">
                <span class="meta-item">
                  <Clock size={11} />{formatDuration(exam.durationMinutes)}
                </span>
                <span class="meta-item">
                  <BookOpen size={11} />{questionCount(exam)} questions
                </span>
              </div>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ══ SCHEDULED EXAMS ════════════════════════════════════════════ -->
    {#if scheduledExams.length > 0}
      <section class="exam-section">
        <div class="section-head">
          <span class="section-label">Scheduled</span>
          <span class="section-count">{scheduledExams.length}</span>
        </div>

        <div class="exam-grid" class:is-grid={viewMode === 'grid'}>
          {#each scheduledExams as exam}
            <div class="exam-card scheduled-card">
              <div class="card-top">
                <span class="course-pill sched-pill">{exam.course?.code ?? 'EXAM'}</span>
                <span class="status-badge wait-badge">
                  <Clock size={10} /> Upcoming
                </span>
              </div>

              <div class="card-title">{exam.title}</div>
              {#if exam.course?.title}
                <div class="card-sub">{exam.course.title}</div>
              {/if}

              <div class="card-meta">
                <span class="meta-item">
                  <Clock size={11} />{formatDuration(exam.durationMinutes)}
                </span>
                <span class="meta-item">
                  <BookOpen size={11} />{questionCount(exam)} questions
                </span>
                {#if exam.scheduledStart}
                  <span class="meta-item">
                    <Calendar size={11} />{formatScheduled(exam.scheduledStart)}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

  {/if}
</div>

<style>
  /* ── Root ─────────────────────────────────────────────────────────────── */
  .exams-root {
    max-width: 780px;
    margin: 0 auto;
    padding: 1.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  /* ── Page header ──────────────────────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .page-title {
    font-size: 1.35rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 .2rem;
    letter-spacing: -.02em;
  }
  .page-sub {
    font-size: .82rem;
    color: var(--color-muted);
    margin: 0;
  }
  .page-header-right {
    display: flex;
    align-items: center;
    gap: .625rem;
    flex-shrink: 0;
  }

  /* ── Chips ────────────────────────────────────────────────────────────── */
  .chip {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: .35rem .75rem;
    border-radius: 999px;
    font-size: .75rem;
    font-weight: 700;
    border: none;
    font-family: inherit;
    cursor: default;
  }
  .chip-warn {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    cursor: pointer;
    transition: background .12s;
  }
  .chip-warn:hover { background: #fde68a; }
  .chip-ok {
    background: rgba(16,185,129,.1);
    color: #065f46;
    border: 1px solid rgba(16,185,129,.2);
  }

  /* ── View toggle ──────────────────────────────────────────────────────── */
  .view-toggle {
    display: flex;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
  }
  .vt-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 30px;
    background: transparent;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    transition: background .12s, color .12s;
    font-family: inherit;
  }
  .vt-btn:hover { background: var(--color-surface); color: var(--color-text); }
  .vt-active { background: var(--color-surface) !important; color: var(--color-text) !important; }

  /* ── Enrollment banner ────────────────────────────────────────────────── */
  .enroll-banner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: #fffbeb;
    border: 1.5px solid #fde68a;
    border-radius: 12px;
  }
  .enroll-banner-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #fef3c7;
    color: #d97706;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .enroll-banner-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: .2rem;
    min-width: 0;
  }
  .enroll-banner-text strong {
    font-size: .88rem;
    font-weight: 800;
    color: #92400e;
  }
  .enroll-banner-text span {
    font-size: .79rem;
    color: #92400e;
    opacity: .8;
  }
  .enroll-banner-btn {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: .55rem 1.1rem;
    background: #d97706;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: .8rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: filter .15s;
    flex-shrink: 0;
  }
  .enroll-banner-btn:hover { filter: brightness(.9); }

  /* ── Section ──────────────────────────────────────────────────────────── */
  .exam-section { display: flex; flex-direction: column; gap: .75rem; }

  .section-head {
    display: flex;
    align-items: center;
    gap: .5rem;
  }
  .section-label {
    font-size: .67rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--color-muted);
  }
  .section-label.live { color: #059669; }
  .section-count {
    font-size: .67rem;
    font-weight: 700;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    padding: .05rem .45rem;
    border-radius: 999px;
  }
  .live-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #059669;
    margin-right: 3px;
    animation: livepulse 1.6s ease-in-out infinite;
  }
  @keyframes livepulse { 0%,100% { opacity: 1; } 50% { opacity: .25; } }

  /* ── Grid layout ──────────────────────────────────────────────────────── */
  .exam-grid {
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .exam-grid.is-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: .75rem;
  }

  /* ── Exam card ────────────────────────────────────────────────────────── */
  .exam-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1rem 1.125rem;
    display: flex;
    flex-direction: column;
    gap: .5rem;
    text-align: left;
    font-family: inherit;
    transition: border-color .15s, background .15s, box-shadow .15s;
    position: relative;
  }

  /* Live card — clickable */
  button.exam-card {
    cursor: pointer;
    width: 100%;
  }
  .live-card {
    border-color: rgba(16,185,129,.25);
    background: rgba(16,185,129,.02);
  }
  button.live-card:not(.card-locked):hover {
    border-color: #10b981;
    background: rgba(16,185,129,.05);
    box-shadow: 0 0 0 3px rgba(16,185,129,.08);
  }

  /* Resume highlight */
  .card-resume {
    border-color: rgba(99,102,241,.35) !important;
    background: rgba(99,102,241,.03) !important;
  }
  button.card-resume:hover {
    border-color: #6366f1 !important;
    background: rgba(99,102,241,.06) !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,.08) !important;
  }

  /* Locked */
  .card-locked {
    opacity: .65;
  }
  .card-locked:hover {
    border-color: rgba(16,185,129,.25) !important;
    box-shadow: none !important;
    cursor: pointer; /* still pointer — opens enrollment */
  }

  /* Scheduled */
  .scheduled-card { opacity: .75; }

  /* ── Card anatomy ─────────────────────────────────────────────────────── */
  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .5rem;
  }

  .course-pill {
    font-size: .63rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .06em;
    padding: .2rem .55rem;
    border-radius: 6px;
  }
  .live-pill  { background: rgba(16,185,129,.12); color: #065f46; }
  .sched-pill { background: rgba(14,165,233,.1); color: #0c4a6e; }

  /* Status badges */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: .3rem;
    font-size: .68rem;
    font-weight: 700;
    padding: .22rem .6rem;
    border-radius: 6px;
    white-space: nowrap;
  }
  .enter-badge  { background: rgba(16,185,129,.12); color: #065f46; }
  .resume-badge { background: rgba(99,102,241,.12); color: #3730a3; }
  .lock-badge   { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .wait-badge   { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }

  .card-title {
    font-size: .9rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.35;
    /* truncate to 2 lines */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-sub {
    font-size: .75rem;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: .625rem;
    flex-wrap: wrap;
    margin-top: .125rem;
  }
  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: .25rem;
    font-size: .7rem;
    color: var(--color-muted);
  }

  /* ── Empty state ──────────────────────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .75rem;
    padding: 3.5rem 1rem;
    text-align: center;
  }
  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
  }
  .empty-state h2 {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }
  .empty-state p {
    font-size: .84rem;
    color: var(--color-muted);
    max-width: 380px;
    line-height: 1.65;
    margin: 0;
  }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 560px) {
    .exams-root { padding: 1rem; gap: 1.25rem; }
    .page-header { flex-direction: column; align-items: flex-start; gap: .75rem; }
    .page-header-right { width: 100%; justify-content: space-between; }
    .enroll-banner { flex-wrap: wrap; }
    .enroll-banner-btn { width: 100%; justify-content: center; }
    .exam-grid.is-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 380px) {
    .exam-grid.is-grid { grid-template-columns: 1fr; }
  }
</style>