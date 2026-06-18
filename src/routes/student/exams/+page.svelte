<!-- src/routes/student/exams/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    Camera, Clock, BookOpen, Calendar, PlayCircle,
    Lock, LayoutList, LayoutGrid, AlertTriangle,
    ChevronRight, RotateCcw, CheckCircle, XCircle,
    Info, AlertCircle, UserCheck, UserX
  } from '@lucide/svelte';

  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';
  import FaceVerifyModal     from '$lib/components/exam/FaceVerifyModal.svelte';

  let { data }: { data: PageData } = $props();

  // ── Step machine ────────────────────────────────────────────────────────
  type Step = 'select' | 'enroll' | 'verify';

  let step            = $state<Step>('select');
  let selectedExamId  = $state<string | null>(null);
  let viewMode        = $state<'list' | 'grid'>('list');
  let expandedSections = $state<Set<string>>(new Set(['eligible', 'scheduled']));

  onMount(() => {
    const saved = localStorage.getItem('etest-exam-view');
    if (saved === 'grid' || saved === 'list') viewMode = saved;
  });

  function setView(mode: 'list' | 'grid') {
    viewMode = mode;
    localStorage.setItem('etest-exam-view', mode);
  }

  function toggleSection(section: string) {
    if (expandedSections.has(section)) {
      expandedSections.delete(section);
    } else {
      expandedSections.add(section);
    }
    expandedSections = new Set(expandedSections);
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

  // ── Enrollment callbacks ─────────────────────────────────────────────────
  function onEnrollComplete() {
    window.location.href = selectedExamId
      ? `/student/exams?examId=${selectedExamId}`
      : '/student/exams';
  }

  // ── Verification callbacks ───────────────────────────────────────────────
  function onVerifySuccess() {
    enterKiosk();
  }

  // ── Derived exam lists ───────────────────────────────────────────────────
  const allExams = $derived(data.availableExams ?? []);
  
  // Categorize exams
  const eligibleExams = $derived(
    allExams.filter(e => 
      e.status === 'active' && 
      !e.alreadySubmitted &&
      e.isEligible !== false
    )
  );
  
  const ineligibleExams = $derived(
    allExams.filter(e => 
      e.status === 'active' && 
      !e.alreadySubmitted &&
      e.isEligible === false
    )
  );
  
  const scheduledExams = $derived(
    allExams.filter(e => e.status === 'scheduled' && !e.alreadySubmitted)
  );
  
  const submittedExams = $derived(
    allExams.filter(e => e.alreadySubmitted)
  );

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

  function getEligibilityReason(exam: typeof allExams[number]): string {
    if (exam.ineligibilityReasons && exam.ineligibilityReasons.length > 0) {
      return exam.ineligibilityReasons.join(', ');
    }
    return 'You are not eligible for this exam';
  }

  function getStatusIcon(status: string, isEligible?: boolean) {
    if (status === 'active' && isEligible !== false) return PlayCircle;
    if (status === 'active' && isEligible === false) return XCircle;
    if (status === 'scheduled') return Clock;
    return Lock;
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
          <AlertTriangle size={14} class="inline-icon" />
          Face enrollment required
        {:else if eligibleExams.length > 0}
          {eligibleExams.length} exam{eligibleExams.length > 1 ? 's' : ''} available
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

  <!-- ── Face enrollment banner ──────────────────────────────────────── -->
  {#if !data.faceEnrolled}
    <div class="enroll-banner">
      <div class="enroll-banner-icon">
        <Camera size={20} />
      </div>
      <div class="enroll-banner-text">
        <strong>Face recognition required</strong>
        <span>You need to enroll your face before you can start any exam.</span>
      </div>
      <button class="enroll-banner-btn" onclick={() => step = 'enroll'}>
        Enroll now <ChevronRight size={14} />
      </button>
    </div>
  {/if}

  <!-- ── Empty state ──────────────────────────────────────────────────── -->
  {#if allExams.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><BookOpen size={32} strokeWidth={1.3} /></div>
      <h2>No exams available</h2>
      <p>You have no active or upcoming exams for your registered courses right now. Check back later.</p>
    </div>

  {:else}

    <!-- ══ ELIGIBLE EXAMS ══════════════════════════════════════════════ -->
    {#if eligibleExams.length > 0}
      <section class="exam-section">
        <button 
          class="section-head interactive"
          onclick={() => toggleSection('eligible')}
          aria-expanded={expandedSections.has('eligible')}
        >
          <span class="section-label success">
            <CheckCircle size={14} />
            Available Now
          </span>
          <span class="section-count">{eligibleExams.length}</span>
          <ChevronRight 
            size={16} 
            class={"section-chevron " + (expandedSections.has('eligible') ? 'expanded' : '')}
          />
        </button>

        {#if expandedSections.has('eligible')}
          <div class="exam-grid" class:is-grid={viewMode === 'grid'}>
            {#each eligibleExams as exam}
              {@const canEnter = data.faceEnrolled}
              {@const isResumable = exam.sessionStatus === 'in_progress'}

              <button
                class="exam-card eligible-card"
                class:card-locked={!canEnter}
                class:card-resume={isResumable}
                onclick={() => canEnter ? selectExam(exam.id) : (step = 'enroll')}
                title={!canEnter ? 'Enroll your face to enter this exam' : undefined}
              >
                <!-- Course pill + status -->
                <div class="card-top">
                  <span class="course-pill eligible-pill">{exam.course?.code ?? 'EXAM'}</span>
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
                      <PlayCircle size={10} /> Start
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
                  {#if exam.scheduledStart}
                    <span class="meta-item">
                      <Calendar size={11} />{formatScheduled(exam.scheduledStart)}
                    </span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <!-- ══ INELIGIBLE EXAMS ════════════════════════════════════════════ -->
    {#if ineligibleExams.length > 0}
      <section class="exam-section">
        <button 
          class="section-head interactive"
          onclick={() => toggleSection('ineligible')}
          aria-expanded={expandedSections.has('ineligible')}
        >
          <span class="section-label danger">
            <XCircle size={14} />
            Ineligible
          </span>
          <span class="section-count">{ineligibleExams.length}</span>
          <ChevronRight 
            size={16} 
            class="section-chevron {expandedSections.has('ineligible') ? 'expanded' : ''}"
          />
        </button>

        {#if expandedSections.has('ineligible')}
          <div class="exam-grid" class:is-grid={viewMode === 'grid'}>
            {#each ineligibleExams as exam}
              <div class="exam-card ineligible-card">
                <div class="card-top">
                  <span class="course-pill ineligible-pill">{exam.course?.code ?? 'EXAM'}</span>
                  <span class="status-badge ineligible-badge">
                    <XCircle size={10} /> Not Eligible
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
                </div>

                <!-- Eligibility reason -->
                <div class="eligibility-reason">
                  <AlertCircle size={14} />
                  <span>{getEligibilityReason(exam)}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <!-- ══ SCHEDULED EXAMS ════════════════════════════════════════════ -->
    {#if scheduledExams.length > 0}
      <section class="exam-section">
        <button 
          class="section-head interactive"
          onclick={() => toggleSection('scheduled')}
          aria-expanded={expandedSections.has('scheduled')}
        >
          <span class="section-label">
            <Clock size={14} />
            Scheduled
          </span>
          <span class="section-count">{scheduledExams.length}</span>
          <ChevronRight 
            size={16} 
            class={`section-chevron ${expandedSections.has('scheduled') ? 'expanded' : ''}`}
          />
        </button>

        {#if expandedSections.has('scheduled')}
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
        {/if}
      </section>
    {/if}

    <!-- ══ SUBMITTED EXAMS ════════════════════════════════════════════ -->
    {#if submittedExams.length > 0}
      <section class="exam-section">
        <button 
          class="section-head interactive"
          onclick={() => toggleSection('submitted')}
          aria-expanded={expandedSections.has('submitted')}
        >
          <span class="section-label muted">
            <CheckCircle size={14} />
            Completed
          </span>
          <span class="section-count">{submittedExams.length}</span>
          <ChevronRight 
            size={16} 
            class="section-chevron {expandedSections.has('submitted') ? 'expanded' : ''}"
          />
        </button>

        {#if expandedSections.has('submitted')}
          <div class="exam-grid" class:is-grid={viewMode === 'grid'}>
            {#each submittedExams as exam}
              <div class="exam-card submitted-card">
                <div class="card-top">
                  <span class="course-pill submitted-pill">{exam.course?.code ?? 'EXAM'}</span>
                  <span class="status-badge submitted-badge">
                    <CheckCircle size={10} /> Submitted
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
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

  {/if}

  <!-- ── Legend ──────────────────────────────────────────────────────── -->
  <div class="legend">
    <span class="legend-item">
      <span class="legend-dot eligible-dot"></span> Available
    </span>
    <span class="legend-item">
      <span class="legend-dot ineligible-dot"></span> Ineligible
    </span>
    <span class="legend-item">
      <span class="legend-dot scheduled-dot"></span> Scheduled
    </span>
    <span class="legend-item">
      <span class="legend-dot submitted-dot"></span> Completed
    </span>
  </div>
</div>

<style>
  /* ── Root ─────────────────────────────────────────────────────────────── */
  .exams-root {
    max-width: 820px;
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
    display: flex;
    align-items: center;
    gap: .4rem;
  }
  .inline-icon { color: #f59e0b; }
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
    background: none;
    border: none;
    font-family: inherit;
    font-size: inherit;
    padding: 0;
    cursor: default;
    width: 100%;
    text-align: left;
  }
  .section-head.interactive {
    cursor: pointer;
    padding: .25rem 0;
  }
  .section-head.interactive:hover .section-label {
    opacity: .8;
  }

  .section-label {
    font-size: .7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--color-muted);
    display: flex;
    align-items: center;
    gap: .35rem;
  }
  .section-label.success { color: #059669; }
  .section-label.danger { color: #dc2626; }
  .section-label.muted { color: var(--color-muted); }

  .section-count {
    font-size: .65rem;
    font-weight: 700;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    padding: .05rem .5rem;
    border-radius: 999px;
  }

  .section-chevron {
    margin-left: auto;
    transition: transform .2s ease;
    color: var(--color-muted);
  }
  .section-chevron.expanded {
    transform: rotate(90deg);
  }

  /* ── Grid layout ──────────────────────────────────────────────────────── */
  .exam-grid {
    display: flex;
    flex-direction: column;
    gap: .5rem;
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
    padding: 1rem 1.125rem;
    display: flex;
    flex-direction: column;
    gap: .5rem;
    text-align: left;
    font-family: inherit;
    transition: border-color .15s, background .15s, box-shadow .15s;
    position: relative;
  }

  /* Eligible card — clickable */
  button.exam-card {
    cursor: pointer;
    width: 100%;
  }
  .eligible-card {
    border-color: rgba(16,185,129,.25);
    background: rgba(16,185,129,.02);
  }
  button.eligible-card:not(.card-locked):hover {
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
  }

  /* Ineligible */
  .ineligible-card {
    border-color: rgba(220,38,38,.2);
    background: rgba(220,38,38,.02);
    opacity: .7;
  }

  /* Scheduled */
  .scheduled-card {
    border-color: rgba(14,165,233,.15);
    background: rgba(14,165,233,.02);
    opacity: .85;
  }

  /* Submitted */
  .submitted-card {
    border-color: var(--color-border);
    background: var(--color-bg);
    opacity: .6;
  }

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
  .eligible-pill { background: rgba(16,185,129,.12); color: #065f46; }
  .ineligible-pill { background: rgba(220,38,38,.1); color: #991b1b; }
  .sched-pill { background: rgba(14,165,233,.1); color: #0c4a6e; }
  .submitted-pill { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); }

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
  .wait-badge   { background: rgba(14,165,233,.1); color: #0c4a6e; }
  .ineligible-badge { background: rgba(220,38,38,.1); color: #991b1b; }
  .submitted-badge { background: rgba(16,185,129,.08); color: #065f46; }

  .card-title {
    font-size: .9rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.35;
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

  .eligibility-reason {
    display: flex;
    align-items: flex-start;
    gap: .5rem;
    margin-top: .25rem;
    padding: .5rem .625rem;
    background: rgba(220,38,38,.05);
    border: 1px solid rgba(220,38,38,.15);
    border-radius: 6px;
    font-size: .72rem;
    color: #991b1b;
  }
  .eligibility-reason svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
  .eligibility-reason span {
    line-height: 1.4;
  }

  /* ── Legend ───────────────────────────────────────────────────────────── */
  .legend {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: .75rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    margin-top: .5rem;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: .4rem;
    font-size: .7rem;
    font-weight: 600;
    color: var(--color-muted);
  }
  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    display: inline-block;
  }
  .eligible-dot { background: #10b981; }
  .ineligible-dot { background: #dc2626; }
  .scheduled-dot { background: #0ea5e9; }
  .submitted-dot { background: var(--color-muted); }

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
    .legend { gap: .5rem; }
  }
  @media (max-width: 380px) {
    .exam-grid.is-grid { grid-template-columns: 1fr; }
  }
</style>
