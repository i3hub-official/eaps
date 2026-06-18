<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    Camera, Clock, BookOpen, Calendar, PlayCircle,
    Lock, LayoutList, LayoutGrid, AlertTriangle,
    ChevronRight, RotateCcw, CheckCircle, XCircle,
    Ban, GraduationCap, Building2, Layers, Eye,
    FilePlus,
  } from '@lucide/svelte';

  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';
  import FaceVerifyModal     from '$lib/components/exam/FaceVerifyModal.svelte';

  let { data }: { data: PageData } = $props();

  // ── Step machine ────────────────────────────────────────────────────────
  type Step = 'select' | 'enroll' | 'verify';
  let step           = $state<Step>('select');
  let selectedExamId = $state<string | null>(null);
  let viewMode       = $state<'list' | 'grid'>('list');
  let activeTab      = $state<'all' | 'live' | 'scheduled' | 'completed' | 'ineligible'>('all');

  onMount(() => {
    const savedView = localStorage.getItem('etest-exam-view');
    if (savedView === 'grid' || savedView === 'list') viewMode = savedView;

    const savedTab = localStorage.getItem('etest-exam-tab');
    if (savedTab === 'all' || savedTab === 'live' || savedTab === 'scheduled' || savedTab === 'completed' || savedTab === 'ineligible') {
      activeTab = savedTab;
    }
  });

  function setView(mode: 'list' | 'grid') {
    viewMode = mode;
    localStorage.setItem('etest-exam-view', mode);
  }

  function setTab(tab: typeof activeTab) {
    activeTab = tab;
    localStorage.setItem('etest-exam-tab', tab);
  }

  // ── Exam selection ───────────────────────────────────────────────────────
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

  function onVerifySuccess() {
    enterKiosk();
  }

  // ── Derived exam lists ───────────────────────────────────────────────────
  const allExams = $derived(data.availableExams ?? []);

  const eligibleLive = $derived(
    allExams.filter(e => e.status === 'active' && e.isEligible === true)
  );

  const eligibleScheduled = $derived(
    allExams.filter(e => e.status === 'scheduled' && e.isEligible === true)
  );

  const completedExams = $derived(
    allExams.filter(e => e.alreadySubmitted)
  );

  const ineligibleExams = $derived(
    allExams.filter(e => e.isEligible === false && !e.alreadySubmitted)
  );

  const unregisteredExams = $derived(
    allExams.filter(e => e.isRegistered === false && !e.isCarryOver)
  );

  const tabCounts = $derived({
    all: allExams.length,
    live: eligibleLive.length,
    scheduled: eligibleScheduled.length,
    completed: completedExams.length,
    ineligible: ineligibleExams.length,
  });

  const displayedExams = $derived(() => {
    switch (activeTab) {
      case 'live': return eligibleLive;
      case 'scheduled': return eligibleScheduled;
      case 'completed': return completedExams;
      case 'ineligible': return ineligibleExams;
      default: return allExams;
    }
  });

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

  function questionCount(exam: typeof allExams[number]): number {
    return exam.questionsToPresent || exam.questionCount;
  }

  function getIneligibilityIcon(reason: string): typeof XCircle {
    if (reason.includes('registered')) return FilePlus;
    if (reason.includes('level')) return GraduationCap;
    if (reason.includes('submitted')) return CheckCircle;
    if (reason.includes('ended')) return Clock;
    if (reason.includes('open') || reason.includes('scheduled')) return Calendar;
    if (reason.includes('face')) return Camera;
    if (reason.includes('department')) return Building2;
    if (reason.includes('prerequisite')) return Layers;
    if (reason.includes('carry')) return Ban;
    return XCircle;
  }
</script>

<svelte:head>
  <title>My Exams — eTest</title>
</svelte:head>

<!-- ══════════════════════════════════════════════════════════════════════
     FACE MODALS
     ══════════════════════════════════════════════════════════════════════ -->
{#if step === 'enroll'}
  <FaceEnrollmentModal
    open={true}
    onClose={() => step = 'select'}
    onComplete={onEnrollComplete}
  />
{/if}

{#if step === 'verify'}
  <FaceVerifyModal
    examId={data.examId}
    onSuccess={onVerifySuccess}
    onCancel={() => { step = 'select'; goto('/student/exams'); }}
  />
{/if}

<!-- ══════════════════════════════════════════════════════════════════════
     MAIN
     ══════════════════════════════════════════════════════════════════════ -->
<div class="exams-root">

  <!-- ── Page header ─────────────────────────────────────────────────── -->
  <div class="page-header">
    <div class="header-left">
      <h1 class="page-title">My Exams</h1>
      <p class="page-sub">
        {#if !data.faceEnrolled}
          <span class="sub-warn">Face enrollment required to enter exams</span>
        {:else if eligibleLive.length > 0}
          {eligibleLive.length} live exam{eligibleLive.length > 1 ? 's' : ''} available
        {:else if eligibleScheduled.length > 0}
          {eligibleScheduled.length} upcoming exam{eligibleScheduled.length > 1 ? 's' : ''}
        {:else if allExams.length === 0}
          No exams assigned this semester
        {:else}
          No active exams right now
        {/if}
      </p>
    </div>

    <div class="header-right">
      {#if !data.faceEnrolled}
        <button class="chip chip-warn" onclick={() => step = 'enroll'}>
          <Camera size={13} />
          Enroll Face
        </button>
      {:else}
        <span class="chip chip-ok">
          <CheckCircle size={13} />
          Face Ready
        </span>
      {/if}

      <div class="view-toggle">
        <button
          class="vt-btn"
          class:vt-active={viewMode === 'list'}
          onclick={() => setView('list')}
          aria-label="List view"
        >
          <LayoutList size={15} />
        </button>
        <button
          class="vt-btn"
          class:vt-active={viewMode === 'grid'}
          onclick={() => setView('grid')}
          aria-label="Grid view"
        >
          <LayoutGrid size={15} />
        </button>
      </div>
    </div>
  </div>

  <!-- ── Face enrollment banner ───────────────────────────────────────── -->
  {#if !data.faceEnrolled}
    <div class="enroll-banner">
      <div class="banner-icon">
        <Camera size={20} />
      </div>
      <div class="banner-text">
        <strong>Set up face recognition</strong>
        <span>Required to unlock and enter any exam. Takes about 30 seconds.</span>
      </div>
      <button class="banner-btn" onclick={() => step = 'enroll'}>
        Get started <ChevronRight size={14} />
      </button>
    </div>
  {/if}

  <!-- ── Tab navigation ───────────────────────────────────────────────── -->
  {#if allExams.length > 0}
    <nav class="tab-bar" aria-label="Exam categories">
      {#each [
        { key: 'all', label: 'All' },
        { key: 'live', label: 'Live' },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'completed', label: 'Completed' },
        { key: 'ineligible', label: 'Ineligible' },
      ] as tab}
        <button
          class="tab-btn"
          class:tab-active={activeTab === tab.key}
          class:tab-empty={tabCounts[tab.key] === 0}
          onclick={() => setTab(tab.key as typeof activeTab)}
          disabled={tabCounts[tab.key] === 0}
        >
          {tab.label}
          <span class="tab-count">{tabCounts[tab.key]}</span>
        </button>
      {/each}
    </nav>
  {/if}

  <!-- ── Empty state ──────────────────────────────────────────────────── -->
  {#if allExams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><BookOpen size={32} strokeWidth={1.3} /></div>
      <h2>No exams available</h2>
      <p>You have no active, upcoming, or past exams for your registered courses this semester.</p>
    </div>

  {:else}
    <!-- ══ EXAM GRID ═══════════════════════════════════════════════════ -->
    <div class="exam-grid" class:is-grid={viewMode === 'grid'}>

      {#if activeTab !== 'ineligible'}
        {#each displayedExams() as exam (exam.id)}
          {@const isResumable = exam.sessionStatus === 'in_progress'}
          {@const canEnter = data.faceEnrolled && exam.isEligible}
          {@const notRegistered = !exam.isRegistered && !exam.isCarryOver}

          {#if canEnter}
            <button
              class="exam-card"
              class:card-live={exam.status === 'active'}
              class:card-resume={isResumable}
              class:card-completed={exam.alreadySubmitted}
              class:card-scheduled={exam.status === 'scheduled'}
              onclick={() => selectExam(exam.id)}
            >
              <div class="card-top">
                <span class="course-pill" class:pill-live={exam.status === 'active'} class:pill-scheduled={exam.status === 'scheduled'} class:pill-completed={exam.alreadySubmitted}>
                  {exam.course?.code ?? 'EXAM'}
                </span>
                <span class="status-badge" class:badge-enter={!isResumable && !exam.alreadySubmitted} class:badge-resume={isResumable} class:badge-completed={exam.alreadySubmitted} class:badge-scheduled={exam.status === 'scheduled'}>
                  {#if isResumable}
                    <RotateCcw size={10} /> Resume
                  {:else if exam.alreadySubmitted}
                    <CheckCircle size={10} /> Completed
                  {:else if exam.status === 'active'}
                    <PlayCircle size={10} /> Enter
                  {:else}
                    <Clock size={10} /> Upcoming
                  {/if}
                </span>
              </div>

              <div class="card-title">{exam.title}</div>
              {#if exam.course?.title}
                <div class="card-sub">{exam.course.title}</div>
              {/if}

              <div class="card-meta">
                <span class="meta-item"><Clock size={11} />{formatDuration(exam.durationMinutes)}</span>
                <span class="meta-item"><BookOpen size={11} />{questionCount(exam)} questions</span>
                {#if exam.scheduledStart}
                  <span class="meta-item"><Calendar size={11} />{formatScheduled(exam.scheduledStart)}</span>
                {/if}
              </div>
            </button>
          {:else}
            <div
              class="exam-card"
              class:card-live={exam.status === 'active'}
              class:card-completed={exam.alreadySubmitted}
              class:card-scheduled={exam.status === 'scheduled'}
              class:card-unregistered={notRegistered}
            >
              <div class="card-top">
                <span class="course-pill" class:pill-live={exam.status === 'active'} class:pill-scheduled={exam.status === 'scheduled'} class:pill-completed={exam.alreadySubmitted} class:pill-unregistered={notRegistered}>
                  {exam.course?.code ?? 'EXAM'}
                </span>
                <span class="status-badge" class:badge-locked={!data.faceEnrolled || notRegistered} class:badge-completed={exam.alreadySubmitted} class:badge-scheduled={exam.status === 'scheduled'} class:badge-unregistered={notRegistered}>
                  {#if notRegistered}
                    <FilePlus size={10} /> Not Registered
                  {:else if !data.faceEnrolled}
                    <Lock size={10} /> Locked
                  {:else if exam.alreadySubmitted}
                    <CheckCircle size={10} /> Completed
                  {:else}
                    <Clock size={10} /> Upcoming
                  {/if}
                </span>
              </div>

              <div class="card-title">{exam.title}</div>
              {#if exam.course?.title}
                <div class="card-sub">{exam.course.title}</div>
              {/if}

              <div class="card-meta">
                <span class="meta-item"><Clock size={11} />{formatDuration(exam.durationMinutes)}</span>
                <span class="meta-item"><BookOpen size={11} />{questionCount(exam)} questions</span>
                {#if exam.scheduledStart}
                  <span class="meta-item"><Calendar size={11} />{formatScheduled(exam.scheduledStart)}</span>
                {/if}
              </div>

              {#if notRegistered}
                <div class="card-footer">
                  <span class="footer-hint footer-register">
                    <FilePlus size={10} />
                    You are not registered for this course. Register to take this exam.
                  </span>
                </div>
              {:else if !data.faceEnrolled && exam.status === 'active'}
                <div class="card-footer">
                  <span class="footer-hint">
                    <Lock size={10} />
                    Enroll your face to enter this exam
                  </span>
                </div>
              {/if}
            </div>
          {/if}
        {/each}

      <!-- INELIGIBLE TAB -->
      {:else}
        {#each ineligibleExams as exam (exam.id)}
          <div class="exam-card card-ineligible">
            <div class="card-top">
              <span class="course-pill pill-ineligible">{exam.course?.code ?? 'EXAM'}</span>
              <span class="status-badge badge-ineligible">
                <XCircle size={10} />
                Ineligible
              </span>
            </div>

            <div class="card-title">{exam.title}</div>
            {#if exam.course?.title}
              <div class="card-sub">{exam.course.title}</div>
            {/if}

            {#if exam.ineligibilityReasons && exam.ineligibilityReasons.length > 0}
              <div class="ineligible-reasons">
                {#each exam.ineligibilityReasons as reason}
                  <div class="reason-row">
                    <span class="reason-icon">
                      <svelte:component this={getIneligibilityIcon(reason)} size={12} />
                    </span>
                    <span class="reason-text">{reason}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="card-meta">
              <span class="meta-item"><Clock size={11} />{formatDuration(exam.durationMinutes)}</span>
              <span class="meta-item"><BookOpen size={11} />{questionCount(exam)} questions</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    {#if displayedExams().length === 0}
      <div class="tab-empty-state">
        <div class="empty-icon"><Eye size={28} strokeWidth={1.3} /></div>
        <p>No {activeTab} exams to show.</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .exams-root {
    max-width: 860px;
    margin: 0 auto;
    padding: 1.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Header ──────────────────────────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .header-left { min-width: 0; }
  .page-title {
    font-size: 1.4rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 .25rem;
    letter-spacing: -.02em;
  }
  .page-sub {
    font-size: .85rem;
    color: var(--color-muted);
    margin: 0;
  }
  .sub-warn { color: var(--color-warn, #d97706); font-weight: 600; }

  .header-right {
    display: flex;
    align-items: center;
    gap: .625rem;
    flex-shrink: 0;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: .4rem .85rem;
    border-radius: 999px;
    font-size: .78rem;
    font-weight: 700;
    border: none;
    font-family: inherit;
    cursor: default;
  }
  .chip-warn {
    background: var(--color-warn-bg, #fef3c7);
    color: var(--color-warn-text, #92400e);
    border: 1px solid var(--color-warn-border, #fde68a);
    cursor: pointer;
    transition: opacity .12s;
  }
  .chip-warn:hover { opacity: .85; }
  .chip-ok {
    background: var(--color-success-bg, #dcfce7);
    color: var(--color-success-text, #166534);
    border: 1px solid var(--color-success-border, #bbf7d0);
  }

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
    width: 34px;
    height: 32px;
    background: transparent;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    transition: all .12s;
    font-family: inherit;
  }
  .vt-btn:hover { background: var(--color-surface); color: var(--color-text); }
  .vt-active { background: var(--color-surface) !important; color: var(--color-text) !important; box-shadow: inset 0 0 0 1px var(--color-border); }

  /* ── Enrollment banner ───────────────────────────────────────────────── */
  .enroll-banner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: var(--color-warn-bg, #fffbeb);
    border: 1.5px solid var(--color-warn-border, #fde68a);
    border-radius: 12px;
  }
  .banner-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: var(--color-warn-bg, #fef3c7);
    color: var(--color-warn-text, #d97706);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .banner-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: .15rem;
    min-width: 0;
  }
  .banner-text strong {
    font-size: .9rem;
    font-weight: 800;
    color: var(--color-warn-text, #92400e);
  }
  .banner-text span {
    font-size: .8rem;
    color: var(--color-warn-text, #92400e);
    opacity: .8;
  }
  .banner-btn {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: .6rem 1.2rem;
    background: var(--color-primary, #d97706);
    color: var(--color-primary-contrast, white);
    border: none;
    border-radius: 8px;
    font-size: .82rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: opacity .15s;
    flex-shrink: 0;
  }
  .banner-btn:hover { opacity: .9; }

  /* ── Tabs ──────────────────────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    gap: .25rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: .25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tab-bar::-webkit-scrollbar { display: none; }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    padding: .5rem .9rem;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--color-muted);
    font-size: .82rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: all .12s;
  }
  .tab-btn:hover:not(:disabled) { background: var(--color-surface); color: var(--color-text); }
  .tab-active {
    background: var(--color-surface) !important;
    color: var(--color-text) !important;
    box-shadow: 0 1px 2px rgba(0,0,0,.04), inset 0 0 0 1px var(--color-border);
  }
  .tab-empty {
    opacity: .5;
    cursor: not-allowed;
  }
  .tab-count {
    font-size: .7rem;
    font-weight: 800;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    padding: .05rem .4rem;
    border-radius: 999px;
    min-width: 18px;
    text-align: center;
  }
  .tab-active .tab-count {
    background: var(--color-text);
    color: var(--color-surface);
    border-color: var(--color-text);
  }

  /* ── Grid ─────────────────────────────────────────────────────────────── */
  .exam-grid {
    display: flex;
    flex-direction: column;
    gap: .6rem;
  }
  .exam-grid.is-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: .75rem;
  }

  /* ── Exam card ────────────────────────────────────────────────────────── */
  .exam-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1rem 1.2rem;
    display: flex;
    flex-direction: column;
    gap: .5rem;
    text-align: left;
    font-family: inherit;
    transition: all .15s;
    position: relative;
  }

  button.exam-card {
    cursor: pointer;
    width: 100%;
  }

  .card-live {
    border-color: var(--color-success-border, #bbf7d0);
    background: var(--color-success-bg, #f0fdf4);
  }
  button.card-live:hover {
    border-color: var(--color-success, #22c55e);
    background: var(--color-success-bg-hover, #dcfce7);
    box-shadow: 0 0 0 3px var(--color-success-glow, rgba(34,197,94,.1));
  }

  .card-resume {
    border-color: var(--color-info-border, #c7d2fe);
    background: var(--color-info-bg, #eef2ff);
  }
  button.card-resume:hover {
    border-color: var(--color-info, #6366f1);
    background: var(--color-info-bg-hover, #e0e7ff);
    box-shadow: 0 0 0 3px var(--color-info-glow, rgba(99,102,241,.1));
  }

  .card-completed {
    border-color: var(--color-border);
    background: var(--color-bg);
    opacity: .8;
  }

  .card-scheduled {
    border-color: var(--color-info-border, #bae6fd);
    background: var(--color-info-bg, #f0f9ff);
  }

  .card-unregistered {
    border-color: var(--color-warn-border, #fde68a);
    background: var(--color-warn-bg, #fffbeb);
  }

  .card-ineligible {
    border-color: var(--color-error-border, #fecaca);
    background: var(--color-error-bg, #fef2f2);
  }

  /* ── Card anatomy ─────────────────────────────────────────────────────── */
  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .5rem;
  }

  .course-pill {
    font-size: .65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .06em;
    padding: .25rem .6rem;
    border-radius: 6px;
  }
  .pill-live      { background: var(--color-success-bg, #dcfce7); color: var(--color-success-text, #166534); }
  .pill-scheduled { background: var(--color-info-bg, #e0f2fe); color: var(--color-info-text, #075985); }
  .pill-completed { background: var(--color-bg); color: var(--color-muted); }
  .pill-unregistered { background: var(--color-warn-bg, #fef3c7); color: var(--color-warn-text, #92400e); }
  .pill-ineligible{ background: var(--color-error-bg, #fee2e2); color: var(--color-error-text, #991b1b); }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: .3rem;
    font-size: .7rem;
    font-weight: 700;
    padding: .25rem .65rem;
    border-radius: 6px;
    white-space: nowrap;
  }
  .badge-enter     { background: var(--color-success-bg, #dcfce7); color: var(--color-success-text, #166534); }
  .badge-resume    { background: var(--color-info-bg, #e0e7ff); color: var(--color-info-text, #3730a3); }
  .badge-locked    { background: var(--color-warn-bg, #fef3c7); color: var(--color-warn-text, #92400e); border: 1px solid var(--color-warn-border, #fde68a); }
  .badge-scheduled { background: var(--color-info-bg, #e0f2fe); color: var(--color-info-text, #075985); }
  .badge-completed { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }
  .badge-unregistered { background: var(--color-warn-bg, #fef3c7); color: var(--color-warn-text, #92400e); border: 1px solid var(--color-warn-border, #fde68a); }
  .badge-ineligible{ background: var(--color-error-bg, #fee2e2); color: var(--color-error-text, #991b1b); }

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
    font-size: .78rem;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: .75rem;
    flex-wrap: wrap;
    margin-top: .125rem;
  }
  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: .3rem;
    font-size: .72rem;
    color: var(--color-muted);
  }

  .card-footer {
    margin-top: .25rem;
    padding-top: .5rem;
    border-top: 1px dashed var(--color-border);
  }
  .footer-hint {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    font-size: .72rem;
    color: var(--color-warn-text, #d97706);
    font-weight: 600;
  }
  .footer-register {
    color: var(--color-warn-text, #92400e);
  }

  /* ── Ineligible reasons ───────────────────────────────────────────────── */
  .ineligible-reasons {
    display: flex;
    flex-direction: column;
    gap: .4rem;
    margin-top: .25rem;
  }
  .reason-row {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: .4rem .6rem;
    background: var(--color-surface);
    border: 1px solid var(--color-error-border, #fecaca);
    border-radius: 6px;
  }
  .reason-icon {
    color: var(--color-error, #dc2626);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .reason-text {
    font-size: .78rem;
    color: var(--color-error-text, #991b1b);
    font-weight: 600;
    line-height: 1.4;
  }

  /* ── Empty states ─────────────────────────────────────────────────────── */
  .empty-state, .tab-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .75rem;
    padding: 3.5rem 1rem;
    text-align: center;
  }
  .tab-empty-state { padding: 2.5rem 1rem; }
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
  .empty-state h2, .tab-empty-state p {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }
  .empty-state p {
    font-size: .85rem;
    color: var(--color-muted);
    max-width: 380px;
    line-height: 1.65;
    font-weight: 400;
  }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .exams-root { padding: 1rem; gap: 1.25rem; }
    .page-header { flex-direction: column; align-items: flex-start; }
    .header-right { width: 100%; justify-content: space-between; }
    .enroll-banner { flex-wrap: wrap; }
    .banner-btn { width: 100%; justify-content: center; margin-top: .5rem; }
    .tab-bar { border-radius: 8px; }
    .tab-btn { padding: .4rem .6rem; font-size: .75rem; }
    .exam-grid.is-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 400px) {
    .exam-grid.is-grid { grid-template-columns: 1fr; }
  }
</style>