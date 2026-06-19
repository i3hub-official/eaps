<!-- src/routes/student/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    Camera, Clock, BookOpen, Calendar, PlayCircle,
    Lock, AlertTriangle, ChevronRight, RotateCcw,
    CheckCircle, XCircle, Ban, GraduationCap,
    Building2, Layers, FilePlus, LayoutList,
    LayoutGrid, Eye,
  } from '@lucide/svelte';

  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';
  import FaceVerifyModal     from '$lib/components/exam/FaceVerifyModal.svelte';

  let { data }: { data: PageData } = $props();

  // ── Step machine ─────────────────────────────────────────────────────────
  type Step = 'select' | 'enroll' | 'verify';
  let step           = $state<Step>('select');
  let selectedExamId = $state<string | null>(null);
  let viewMode       = $state<'list' | 'grid'>('list');
  let activeTab      = $state<'all' | 'live' | 'scheduled' | 'completed' | 'cancelled' | 'ineligible'>('all');

  onMount(() => {
    const v = localStorage.getItem('etest-exam-view');
    if (v === 'grid' || v === 'list') viewMode = v;
    const t = localStorage.getItem('etest-exam-tab');
    if (t && ['all','live','scheduled','completed','cancelled','ineligible'].includes(t)) {
      activeTab = t as typeof activeTab;
    }
  });

  function setView(m: 'list' | 'grid') {
    viewMode = m;
    localStorage.setItem('etest-exam-view', m);
  }

  function setTab(t: typeof activeTab) {
    activeTab = t;
    localStorage.setItem('etest-exam-tab', t);
  }

  // ── Exam selection ────────────────────────────────────────────────────────
  function selectExam(examId: string) {
    selectedExamId = examId;

    if (!data.faceEnrolled) {
      step = 'enroll';
      return;
    }

    if (!data.faceVerified) {
      goto(`?examId=${examId}`, { replaceState: false });
      step = 'verify';
      return;
    }

    enterKiosk(examId);
  }

  function enterKiosk(examId?: string) {
    goto(`/student/exams/kiosk?examId=${examId ?? selectedExamId ?? data.examId}`);
  }

  function onEnrollComplete() {
    window.location.href = selectedExamId
      ? `/student/exams?examId=${selectedExamId}`
      : '/student/exams';
  }

  function onVerifySuccess() { enterKiosk(); }

  // ── Derived exam lists ────────────────────────────────────────────────────
  const allExams = $derived(data.availableExams ?? []);

  const liveExams = $derived(
    allExams.filter(e => e.status === 'active' && !e.alreadySubmitted && e.isEligible !== false)
  );
  const scheduledExams = $derived(
    allExams.filter(e => e.status === 'scheduled' && e.isEligible !== false)
  );
  const completedExams = $derived(
    allExams.filter(e => e.alreadySubmitted)
  );
  const cancelledExams = $derived(
    allExams.filter(e => e.status === 'cancelled')
  );
  const ineligibleExams = $derived(
    allExams.filter(e => e.isEligible === false && !e.alreadySubmitted && e.status !== 'cancelled')
  );

  const counts = $derived({
    all:        allExams.length,
    live:       liveExams.length,
    scheduled:  scheduledExams.length,
    completed:  completedExams.length,
    cancelled:  cancelledExams.length,
    ineligible: ineligibleExams.length,
  });

  const displayed = $derived((): typeof allExams => {
    switch (activeTab) {
      case 'live':       return liveExams;
      case 'scheduled':  return scheduledExams;
      case 'completed':  return completedExams;
      case 'cancelled':  return cancelledExams;
      case 'ineligible': return ineligibleExams;
      default:           return allExams;
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function fmtDuration(mins: number): string {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function fmtDate(d: string | null): string {
    if (!d) return 'TBD';
    return new Date(d).toLocaleString('en-NG', {
      weekday:'short', month:'short', day:'numeric',
      hour:'2-digit', minute:'2-digit',
    });
  }

  function qCount(e: typeof allExams[number]): number {
    return e.questionsToPresent || e.questionCount;
  }

  function ineligIcon(reason: string): typeof XCircle {
    if (reason.includes('registered')) return FilePlus;
    if (reason.includes('level'))      return GraduationCap;
    if (reason.includes('ended'))      return Clock;
    if (reason.includes('open') || reason.includes('scheduled')) return Calendar;
    if (reason.includes('face'))       return Camera;
    if (reason.includes('department')) return Building2;
    if (reason.includes('prerequisite') || reason.includes('carry')) return Layers;
    if (reason.includes('banned') || reason.includes('suspend')) return Ban;
    return XCircle;
  }

  // Whether a card should be clickable
  function canEnter(e: typeof allExams[number]): boolean {
    return (
      data.faceEnrolled &&
      e.isEligible !== false &&
      !e.alreadySubmitted &&
      e.status === 'active'
    );
  }
</script>

<svelte:head>
  <title>My Exams — eTest</title>
</svelte:head>

<!-- ── Face modals ─────────────────────────────────────────────────────── -->
{#if step === 'enroll'}
  <FaceEnrollmentModal open={true} onClose={() => step = 'select'} onComplete={onEnrollComplete} />
{/if}

{#if step === 'verify'}
  <FaceVerifyModal
    examId={data.examId}
    onSuccess={onVerifySuccess}
    onCancel={() => { step = 'select'; goto('/student/exams'); }}
  />
{/if}

<!-- ── Page ────────────────────────────────────────────────────────────── -->
<div class="root">

  <!-- Header -->
  <div class="page-head">
    <div class="head-left">
      <h1>My Exams</h1>
      <p class="subtitle">
        {#if !data.faceEnrolled}
          <span class="warn-text">Face enrollment required before you can enter any exam</span>
        {:else if liveExams.length > 0}
          {liveExams.length} live exam{liveExams.length > 1 ? 's' : ''} available now
        {:else if scheduledExams.length > 0}
          {scheduledExams.length} upcoming
        {:else}
          No active exams right now
        {/if}
      </p>
    </div>

    <div class="head-right">
      <!-- Face status chip -->
      {#if !data.faceEnrolled}
        <button class="face-chip face-chip-warn" onclick={() => step = 'enroll'}>
          <Camera size={13} /> Enroll face
        </button>
      {:else}
        <span class="face-chip face-chip-ok">
          <CheckCircle size={13} /> Face enrolled
        </span>
      {/if}

      <!-- View toggle -->
      <div class="view-toggle">
        <button class="vt" class:vt-on={viewMode === 'list'} onclick={() => setView('list')} aria-label="List view">
          <LayoutList size={15} />
        </button>
        <button class="vt" class:vt-on={viewMode === 'grid'} onclick={() => setView('grid')} aria-label="Grid view">
          <LayoutGrid size={15} />
        </button>
      </div>
    </div>
  </div>

  <!-- Enrollment banner — prominent when not enrolled -->
  {#if !data.faceEnrolled}
    <div class="enroll-banner">
      <div class="eb-icon"><Camera size={22} /></div>
      <div class="eb-body">
        <strong>Set up face recognition to unlock exams</strong>
        <span>Your face is used to verify your identity before each exam. Takes about 30 seconds.</span>
      </div>
      <button class="eb-btn" onclick={() => step = 'enroll'}>
        Get started <ChevronRight size={15} />
      </button>
    </div>
  {/if}

  <!-- Tabs -->
  {#if allExams.length > 0}
    <div class="tabs" role="tablist">
      {#each [
        { key: 'all',        label: 'All' },
        { key: 'live',       label: 'Live' },
        { key: 'scheduled',  label: 'Scheduled' },
        { key: 'completed',  label: 'Completed' },
        { key: 'cancelled',  label: 'Cancelled' },
        { key: 'ineligible', label: 'Ineligible' },
      ] as t}
        {@const n = counts[t.key as keyof typeof counts]}
        <button
          role="tab"
          aria-selected={activeTab === t.key}
          class="tab"
          class:tab-on={activeTab === t.key}
          class:tab-dim={n === 0}
          onclick={() => setTab(t.key as typeof activeTab)}
          disabled={n === 0}
        >
          {t.label}
          <span class="tab-n">{n}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Empty state (no exams at all) -->
  {#if allExams.length === 0}
    <div class="empty">
      <div class="empty-icon"><BookOpen size={30} strokeWidth={1.3} /></div>
      <h2>No exams this semester</h2>
      <p>You have no active, upcoming, or past exams for your registered courses.</p>
    </div>

  {:else}
    <!-- Exam grid -->
    <div class="grid" class:grid-2={viewMode === 'grid'}>

      {#each displayed() as exam (exam.id)}
        {@const resumable  = exam.sessionStatus === 'in_progress'}
        {@const submittable = canEnter(exam)}
        {@const cancelled  = exam.status === 'cancelled'}
        {@const ineligible = exam.isEligible === false && !exam.alreadySubmitted}
        {@const notReg     = exam.isRegistered === false}
        {@const faceBlocked = !data.faceEnrolled && exam.status === 'active'}

        <svelte:element
          this={submittable ? 'button' : 'div'}
          class="card"
          class:card-live={exam.status === 'active' && submittable}
          class:card-resume={resumable}
          class:card-scheduled={exam.status === 'scheduled'}
          class:card-done={exam.alreadySubmitted}
          class:card-cancelled={cancelled}
          class:card-ineligible={ineligible && !cancelled}
          class:card-locked={faceBlocked}
          onclick={submittable ? () => selectExam(exam.id) : undefined}
        >
          <!-- Left accent bar -->
          <span class="accent-bar
            {exam.status === 'active' && submittable ? 'bar-live' : ''}
            {resumable ? 'bar-resume' : ''}
            {exam.status === 'scheduled' ? 'bar-scheduled' : ''}
            {exam.alreadySubmitted ? 'bar-done' : ''}
            {cancelled ? 'bar-cancelled' : ''}
            {ineligible && !cancelled ? 'bar-ineligible' : ''}
            {faceBlocked ? 'bar-locked' : ''}
          "></span>

          <!-- Card body -->
          <div class="card-body">
            <!-- Top row: course pill + status badge -->
            <div class="card-top">
              <span class="course-code">{exam.course?.code ?? 'EXAM'}</span>

              <span class="badge
                {resumable ? 'badge-resume' : ''}
                {!resumable && exam.status === 'active' && submittable ? 'badge-live' : ''}
                {exam.status === 'scheduled' && !ineligible ? 'badge-scheduled' : ''}
                {exam.alreadySubmitted ? 'badge-done' : ''}
                {cancelled ? 'badge-cancelled' : ''}
                {ineligible && !cancelled ? 'badge-ineligible' : ''}
                {faceBlocked ? 'badge-locked' : ''}
                {notReg ? 'badge-noreg' : ''}
              ">
                {#if resumable}
                  <RotateCcw size={10} /> Resume
                {:else if exam.alreadySubmitted}
                  <CheckCircle size={10} /> Completed
                {:else if cancelled}
                  <Ban size={10} /> Cancelled
                {:else if ineligible}
                  <XCircle size={10} /> Ineligible
                {:else if faceBlocked}
                  <Lock size={10} /> Face required
                {:else if notReg}
                  <FilePlus size={10} /> Not registered
                {:else if exam.status === 'active'}
                  <PlayCircle size={10} /> Enter
                {:else if exam.status === 'scheduled'}
                  <Clock size={10} /> Upcoming
                {:else}
                  <Eye size={10} /> View
                {/if}
              </span>
            </div>

            <!-- Title + subtitle -->
            <div class="card-title">{exam.title}</div>
            {#if exam.course?.title}
              <div class="card-sub">{exam.course.title}</div>
            {/if}

            <!-- Meta row -->
            <div class="card-meta">
              <span><Clock size={11} />{fmtDuration(exam.durationMinutes)}</span>
              <span><BookOpen size={11} />{qCount(exam)} questions</span>
              {#if exam.scheduledStart && exam.status === 'scheduled'}
                <span><Calendar size={11} />{fmtDate(exam.scheduledStart)}</span>
              {/if}
            </div>

            <!-- Ineligibility reasons -->
            {#if ineligible && exam.ineligibilityReasons?.length}
              <div class="reasons">
                {#each exam.ineligibilityReasons as r}
                  <div class="reason">
                    <svelte:component this={ineligIcon(r)} size={11} />
                    {r}
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Footer hints -->
            {#if faceBlocked}
              <div class="card-hint hint-warn">
                <Camera size={11} />
                <button class="inline-link" onclick:stopPropagation={() => step = 'enroll'}>
                  Enroll your face
                </button>
                to enter this exam
              </div>
            {:else if notReg && !ineligible}
              <div class="card-hint hint-reg">
                <FilePlus size={11} />
                Not registered for this course
              </div>
            {:else if cancelled}
              <div class="card-hint hint-muted">
                <Ban size={11} /> This exam has been cancelled
              </div>
            {/if}
          </div>

          <!-- Chevron caret — only on actionable cards -->
          {#if submittable}
            <span class="card-caret"><ChevronRight size={16} /></span>
          {/if}
        </svelte:element>
      {/each}

      <!-- Tab empty state -->
      {#if displayed().length === 0}
        <div class="tab-empty">
          <Eye size={24} strokeWidth={1.3} />
          <p>No {activeTab} exams to show</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* ── Root ──────────────────────────────────────────────────────────────── */
  .root {
    max-width: 820px;
    margin: 0 auto;
    padding: 1.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Page header ───────────────────────────────────────────────────────── */
  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .head-left h1 {
    font-size: 1.35rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 .25rem;
    letter-spacing: -.02em;
  }
  .subtitle {
    font-size: .82rem;
    color: var(--color-muted);
    margin: 0;
  }
  .warn-text { color: #d97706; font-weight: 600; }

  .head-right {
    display: flex;
    align-items: center;
    gap: .625rem;
    flex-shrink: 0;
  }

  /* ── Face chip ─────────────────────────────────────────────────────────── */
  .face-chip {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: .4rem .85rem;
    border-radius: 999px;
    font-size: .78rem;
    font-weight: 700;
    border: none;
    font-family: inherit;
    white-space: nowrap;
  }
  .face-chip-warn {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    cursor: pointer;
  }
  .face-chip-warn:hover { background: #fde68a; }
  .face-chip-ok {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  /* ── View toggle ───────────────────────────────────────────────────────── */
  .view-toggle {
    display: flex;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--color-bg);
  }
  .vt {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px; height: 32px;
    background: transparent;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    transition: all .12s;
    font-family: inherit;
  }
  .vt:hover { background: var(--color-surface); color: var(--color-text); }
  .vt-on { background: var(--color-surface) !important; color: var(--color-text) !important; }

  /* ── Enrollment banner ─────────────────────────────────────────────────── */
  .enroll-banner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: #fffbeb;
    border: 1.5px solid #fde68a;
    border-radius: 12px;
  }
  .eb-icon {
    width: 44px; height: 44px;
    border-radius: 10px;
    background: #fef3c7;
    color: #d97706;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .eb-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: .2rem;
    min-width: 0;
  }
  .eb-body strong { font-size: .88rem; font-weight: 800; color: #92400e; }
  .eb-body span   { font-size: .78rem; color: #92400e; opacity: .8; }
  .eb-btn {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: .6rem 1.1rem;
    background: #d97706;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: .82rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
    transition: filter .15s;
  }
  .eb-btn:hover { filter: brightness(.9); }

  /* ── Tabs ──────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex;
    gap: .2rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: .25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    padding: .45rem .875rem;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--color-muted);
    font-size: .8rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: all .12s;
    flex-shrink: 0;
  }
  .tab:hover:not(:disabled) { background: var(--color-surface); color: var(--color-text); }
  .tab-on {
    background: var(--color-surface) !important;
    color: var(--color-text) !important;
    box-shadow: 0 1px 3px rgba(0,0,0,.06), inset 0 0 0 1px var(--color-border);
  }
  .tab-dim { opacity: .4; cursor: not-allowed; }

  .tab-n {
    font-size: .68rem;
    font-weight: 800;
    padding: .05rem .4rem;
    min-width: 18px;
    text-align: center;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    border-radius: 999px;
  }
  .tab-on .tab-n {
    background: var(--color-text);
    color: var(--color-surface);
    border-color: var(--color-text);
  }

  /* ── Grid ──────────────────────────────────────────────────────────────── */
  .grid {
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: .625rem;
  }

  /* ── Card ──────────────────────────────────────────────────────────────── */
  .card {
    display: flex;
    align-items: stretch;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    overflow: hidden;
    font-family: inherit;
    text-align: left;
    transition: border-color .15s, box-shadow .15s;
    position: relative;
  }
  button.card { cursor: pointer; width: 100%; }
  button.card:hover {
    box-shadow: 0 2px 12px rgba(0,0,0,.06);
  }

  /* Card states */
  .card-live     { border-color: rgba(16,185,129,.35); background: rgba(16,185,129,.03); }
  .card-resume   { border-color: rgba(99,102,241,.35); background: rgba(99,102,241,.03); }
  .card-scheduled{ border-color: rgba(14,165,233,.25); background: rgba(14,165,233,.02); }
  .card-done     { border-color: var(--color-border); background: var(--color-bg); opacity: .75; }
  .card-cancelled{ border-color: var(--color-border); background: var(--color-bg); opacity: .55; }
  .card-ineligible{ border-color: rgba(239,68,68,.25); background: rgba(239,68,68,.02); }
  .card-locked   { opacity: .7; }

  button.card-live:hover   { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
  button.card-resume:hover { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }

  /* Accent bar */
  .accent-bar {
    width: 4px;
    flex-shrink: 0;
    border-radius: 0;
    background: var(--color-border);
  }
  .bar-live      { background: #10b981; }
  .bar-resume    { background: #6366f1; }
  .bar-scheduled { background: #0ea5e9; }
  .bar-done      { background: #94a3b8; }
  .bar-cancelled { background: #cbd5e1; }
  .bar-ineligible{ background: #ef4444; }
  .bar-locked    { background: #f59e0b; }

  /* Card body */
  .card-body {
    flex: 1;
    padding: .875rem 1rem;
    display: flex;
    flex-direction: column;
    gap: .4rem;
    min-width: 0;
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .5rem;
  }

  .course-code {
    font-size: .65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--color-muted);
  }
  .card-live .course-code     { color: #059669; }
  .card-resume .course-code   { color: #4f46e5; }
  .card-scheduled .course-code{ color: #0284c7; }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: .3rem;
    font-size: .68rem;
    font-weight: 700;
    padding: .2rem .55rem;
    border-radius: 5px;
    white-space: nowrap;
    background: var(--color-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }
  .badge-live      { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .badge-resume    { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
  .badge-scheduled { background: #e0f2fe; color: #075985; border-color: #bae6fd; }
  .badge-done      { background: var(--color-bg); color: var(--color-muted); border-color: var(--color-border); }
  .badge-cancelled { background: var(--color-bg); color: var(--color-muted); border-color: var(--color-border); }
  .badge-ineligible{ background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .badge-locked    { background: #fef3c7; color: #92400e; border-color: #fde68a; }
  .badge-noreg     { background: #fef3c7; color: #92400e; border-color: #fde68a; }

  .card-title {
    font-size: .92rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-sub {
    font-size: .76rem;
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
  .card-meta span {
    display: inline-flex;
    align-items: center;
    gap: .3rem;
    font-size: .72rem;
    color: var(--color-muted);
  }

  /* Ineligibility reasons */
  .reasons {
    display: flex;
    flex-direction: column;
    gap: .3rem;
    margin-top: .25rem;
  }
  .reason {
    display: flex;
    align-items: center;
    gap: .4rem;
    font-size: .74rem;
    font-weight: 600;
    color: #b91c1c;
    padding: .3rem .55rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
  }

  /* Footer hints */
  .card-hint {
    display: flex;
    align-items: center;
    gap: .35rem;
    font-size: .72rem;
    font-weight: 600;
    margin-top: .25rem;
    padding-top: .5rem;
    border-top: 1px dashed var(--color-border);
  }
  .hint-warn  { color: #d97706; }
  .hint-reg   { color: #92400e; }
  .hint-muted { color: var(--color-muted); }

  .inline-link {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 700;
    color: #d97706;
    cursor: pointer;
    text-decoration: underline;
    font-size: .72rem;
  }

  /* Caret on actionable cards */
  .card-caret {
    display: flex;
    align-items: center;
    padding: 0 .75rem;
    color: var(--color-muted);
    flex-shrink: 0;
    transition: color .12s;
  }
  button.card:hover .card-caret { color: var(--color-text); }

  /* ── Empty states ──────────────────────────────────────────────────────── */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .75rem;
    padding: 4rem 1rem;
    text-align: center;
  }
  .empty-icon {
    width: 64px; height: 64px;
    border-radius: 16px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted);
  }
  .empty h2 { font-size: 1rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .empty p  { font-size: .85rem; color: var(--color-muted); max-width: 360px; line-height: 1.65; margin: 0; }

  .tab-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .625rem;
    padding: 2.5rem;
    color: var(--color-muted);
    font-size: .85rem;
    font-weight: 600;
    grid-column: 1 / -1;
  }
  .tab-empty p { margin: 0; }

  /* ── Responsive ────────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .root { padding: 1rem; gap: 1rem; }
    .page-head { flex-direction: column; align-items: flex-start; }
    .head-right { width: 100%; justify-content: space-between; }
    .enroll-banner { flex-wrap: wrap; }
    .eb-btn { width: 100%; justify-content: center; margin-top: .5rem; }
    .grid-2 { grid-template-columns: 1fr; }
  }
</style>