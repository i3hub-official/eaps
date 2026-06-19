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
    LayoutGrid, Eye, Sparkles, TrendingUp,
    Award, Shield, Zap, Users, Settings
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

  // Get exam status icon
  function getStatusIcon(exam: typeof allExams[number]) {
    if (exam.alreadySubmitted) return CheckCircle;
    if (exam.status === 'cancelled') return Ban;
    if (exam.isEligible === false) return XCircle;
    if (exam.status === 'active') return PlayCircle;
    if (exam.status === 'scheduled') return Clock;
    return Eye;
  }

  // Get exam status color
  function getStatusColor(exam: typeof allExams[number]) {
    if (exam.alreadySubmitted) return 'var(--g500)';
    if (exam.status === 'cancelled') return 'var(--color-muted)';
    if (exam.isEligible === false) return '#ef4444';
    if (exam.status === 'active') return '#10b981';
    if (exam.status === 'scheduled') return '#0ea5e9';
    return 'var(--color-muted)';
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

  <!-- Hero Header -->
  <div class="hero-header">
    <div class="hero-content">
      <div class="hero-left">
        <div class="hero-badge">
          <Sparkles size={14} />
          <span>Exam Dashboard</span>
        </div>
        <h1 class="hero-title">My Exams</h1>
        <p class="hero-subtitle">
          {#if !data.faceEnrolled}
            <span class="warn-text">⚠️ Face enrollment required before you can enter any exam</span>
          {:else if liveExams.length > 0}
            <span class="live-indicator">
              <span class="pulse-dot"></span>
              {liveExams.length} live exam{liveExams.length > 1 ? 's' : ''} available now
            </span>
          {:else if scheduledExams.length > 0}
            <span class="scheduled-indicator">
              <Clock size={14} />
              {scheduledExams.length} upcoming exam{scheduledExams.length > 1 ? 's' : ''}
            </span>
          {:else}
            No active exams right now
          {/if}
        </p>
      </div>

      <div class="hero-right">
        <!-- Quick Stats -->
        <div class="quick-stats">
          <div class="stat-item">
            <span class="stat-label">Total</span>
            <span class="stat-value">{allExams.length}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Passed</span>
            <span class="stat-value" style="color: var(--g500)">{completedExams.filter(e => e.passed).length}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Failed</span>
            <span class="stat-value" style="color: #ef4444">{completedExams.filter(e => !e.passed).length}</span>
          </div>
        </div>

        <!-- Face status chip -->
        <div class="action-group">
          {#if !data.faceEnrolled}
            <button class="action-btn primary" onclick={() => step = 'enroll'}>
              <Camera size={16} /> Enroll Face
            </button>
          {:else}
            <div class="face-status success">
              <CheckCircle size={14} />
              <span>Face Enrolled</span>
            </div>
          {/if}

          <!-- View toggle -->
          <div class="view-toggle">
            <button 
              class="view-btn" 
              class:active={viewMode === 'list'} 
              onclick={() => setView('list')}
              aria-label="List view"
            >
              <LayoutList size={16} />
            </button>
            <button 
              class="view-btn" 
              class:active={viewMode === 'grid'} 
              onclick={() => setView('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Enrollment banner — prominent when not enrolled -->
  {#if !data.faceEnrolled}
    <div class="enroll-banner">
      <div class="banner-icon"><Camera size={24} /></div>
      <div class="banner-content">
        <div class="banner-title">Set up face recognition</div>
        <div class="banner-desc">Your face is used to verify your identity before each exam. Takes about 30 seconds.</div>
      </div>
      <button class="banner-action" onclick={() => step = 'enroll'}>
        Get started <ChevronRight size={16} />
      </button>
    </div>
  {/if}

  <!-- Tabs -->
  <div class="tabs-container">
    <div class="tabs" role="tablist">
      {#each [
        { key: 'all',        label: 'All Exams', icon: BookOpen },
        { key: 'live',       label: 'Live', icon: Zap },
        { key: 'scheduled',  label: 'Scheduled', icon: Calendar },
        { key: 'completed',  label: 'Completed', icon: Award },
        { key: 'cancelled',  label: 'Cancelled', icon: Ban },
        { key: 'ineligible', label: 'Ineligible', icon: Shield },
      ] as t}
        {@const n = counts[t.key as keyof typeof counts]}
        {@const Icon = t.icon}
        <button
          role="tab"
          aria-selected={activeTab === t.key}
          class="tab"
          class:active={activeTab === t.key}
          class:disabled={n === 0}
          onclick={() => setTab(t.key as typeof activeTab)}
          disabled={n === 0}
        >
          <Icon size={14} />
          <span class="tab-label">{t.label}</span>
          <span class="tab-count" class:count-active={activeTab === t.key}>{n}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Exam grid -->
  {#if allExams.length === 0}
    <!-- Empty state (no exams at all) -->
    <div class="empty-state">
      <div class="empty-icon"><BookOpen size={40} strokeWidth={1.2} /></div>
      <h2>No exams this semester</h2>
      <p>You have no active, upcoming, or past exams for your registered courses.</p>
    </div>

  {:else}
    <div class="exam-grid" class:grid-view={viewMode === 'grid'}>

      {#each displayed() as exam (exam.id)}
        {@const resumable  = exam.sessionStatus === 'in_progress'}
        {@const submittable = canEnter(exam)}
        {@const cancelled  = exam.status === 'cancelled'}
        {@const ineligible = exam.isEligible === false && !exam.alreadySubmitted}
        {@const notReg     = exam.isRegistered === false}
        {@const faceBlocked = !data.faceEnrolled && exam.status === 'active'}
        {@const StatusIcon = getStatusIcon(exam)}
        {@const statusColor = getStatusColor(exam)}

        <div 
          class="exam-card"
          class:clickable={submittable}
          class:status-live={exam.status === 'active' && submittable}
          class:status-resume={resumable}
          class:status-scheduled={exam.status === 'scheduled'}
          class:status-completed={exam.alreadySubmitted}
          class:status-cancelled={cancelled}
          class:status-ineligible={ineligible && !cancelled}
          class:status-locked={faceBlocked}
          class:status-notreg={notReg}
          onclick={submittable ? () => selectExam(exam.id) : undefined}
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="card-course">
              <span class="course-code">{exam.course?.code ?? 'EXAM'}</span>
              <span class="course-title">{exam.course?.title}</span>
            </div>
            <div class="card-status">
              <StatusIcon size={14} style="color: {statusColor}" />
              <span class="status-label" style="color: {statusColor}">
                {#if resumable}
                  Resume
                {:else if exam.alreadySubmitted}
                  Completed
                {:else if cancelled}
                  Cancelled
                {:else if ineligible}
                  Ineligible
                {:else if faceBlocked}
                  Face Required
                {:else if notReg}
                  Not Registered
                {:else if exam.status === 'active'}
                  Live
                {:else if exam.status === 'scheduled'}
                  Upcoming
                {:else}
                  View
                {/if}
              </span>
            </div>
          </div>

          <!-- Card Body -->
          <div class="card-body">
            <h3 class="exam-title">{exam.title}</h3>
            
            <div class="exam-meta">
              <div class="meta-item">
                <Clock size={12} />
                <span>{fmtDuration(exam.durationMinutes)}</span>
              </div>
              <div class="meta-item">
                <BookOpen size={12} />
                <span>{qCount(exam)} questions</span>
              </div>
              {#if exam.scheduledStart && exam.status === 'scheduled'}
                <div class="meta-item">
                  <Calendar size={12} />
                  <span>{fmtDate(exam.scheduledStart)}</span>
                </div>
              {/if}
              {#if exam.alreadySubmitted && exam.percentage}
                <div class="meta-item score">
                  <TrendingUp size={12} />
                  <span class="score-value" style="color: {exam.passed ? 'var(--g500)' : '#ef4444'}">
                    {Math.round(exam.percentage)}%
                  </span>
                </div>
              {/if}
            </div>

            <!-- Ineligibility reasons -->
            {#if ineligible && exam.ineligibilityReasons?.length}
              <div class="reasons-list">
                {#each exam.ineligibilityReasons as r}
                  <div class="reason-item">
                    <svelte:component this={ineligIcon(r)} size={12} />
                    <span>{r}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Card Footer -->
          <div class="card-footer">
            {#if faceBlocked}
              <div class="footer-hint warn">
                <Camera size={12} />
                <button class="inline-link" onclick:stopPropagation={() => step = 'enroll'}>
                  Enroll your face
                </button>
                to enter this exam
              </div>
            {:else if notReg && !ineligible}
              <div class="footer-hint info">
                <FilePlus size={12} />
                Not registered for this course
              </div>
            {:else if cancelled}
              <div class="footer-hint muted">
                <Ban size={12} />
                This exam has been cancelled
              </div>
            {:else if ineligible}
              <div class="footer-hint danger">
                <XCircle size={12} />
                You are not eligible for this exam
              </div>
            {:else if submittable}
              <div class="footer-hint success">
                <PlayCircle size={12} />
                Click to {resumable ? 'resume' : 'start'} exam
              </div>
            {/if}

            {#if submittable}
              <div class="card-arrow">
                <ChevronRight size={18} />
              </div>
            {/if}
          </div>

          <!-- Progress bar for completed exams -->
          {#if exam.alreadySubmitted && exam.percentage !== undefined}
            <div class="exam-progress">
              <div class="progress-track">
                <div 
                  class="progress-fill" 
                  style="width: {Math.min(exam.percentage, 100)}%; background: {exam.passed ? 'var(--g500)' : '#ef4444'}"
                ></div>
              </div>
            </div>
          {/if}
        </div>
      {/each}

      <!-- Tab empty state -->
      {#if displayed().length === 0}
        <div class="tab-empty">
          <Eye size={32} strokeWidth={1.2} />
          <h4>No {activeTab} exams</h4>
          <p>There are no exams in this category right now.</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* ── Root ──────────────────────────────────────────────────────────────── */
  .root {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Hero Header ───────────────────────────────────────────────────────── */
  .hero-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 1.75rem 2rem;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .hero-header::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 300px;
    height: 100%;
    background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%);
    pointer-events: none;
  }

  .hero-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    position: relative;
    z-index: 1;
  }

  .hero-left {
    flex: 1;
    min-width: 0;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.75rem;
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .hero-title {
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 0.25rem;
    letter-spacing: -0.03em;
  }

  .hero-subtitle {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }

  .warn-text {
    color: #d97706;
    font-weight: 600;
  }

  .live-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: #10b981;
    font-weight: 600;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
    display: inline-block;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  .scheduled-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: #0ea5e9;
    font-weight: 600;
  }

  .hero-right {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-shrink: 0;
  }

  .quick-stats {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg);
    border-radius: 10px;
    border: 1px solid var(--color-border);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .stat-label {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  .stat-value {
    font-size: 1.1rem;
    font-weight: 900;
    color: var(--color-text);
  }

  .stat-divider {
    width: 1px;
    height: 30px;
    background: var(--color-border);
  }

  .action-group {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .action-btn.primary {
    background: #6366f1;
    color: white;
  }

  .action-btn.primary:hover {
    background: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .face-status {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .face-status.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .view-toggle {
    display: flex;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--color-bg);
  }

  .view-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 34px;
    background: transparent;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.12s;
    font-family: inherit;
  }

  .view-btn:hover {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .view-btn.active {
    background: var(--color-surface) !important;
    color: var(--color-text) !important;
  }

  /* ── Enrollment banner ─────────────────────────────────────────────────── */
  .enroll-banner {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 2px solid #fde68a;
    border-radius: 14px;
    position: relative;
    overflow: hidden;
  }

  .enroll-banner::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(251, 191, 36, 0.1), transparent 70%);
    pointer-events: none;
  }

  .banner-icon {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: #fef3c7;
    color: #d97706;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .banner-content {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .banner-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #92400e;
    margin-bottom: 0.1rem;
  }

  .banner-desc {
    font-size: 0.8rem;
    color: #92400e;
    opacity: 0.8;
  }

  .banner-action {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.25rem;
    background: #d97706;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s;
    position: relative;
    z-index: 1;
  }

  .banner-action:hover {
    background: #b45309;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
  }

  /* ── Tabs ──────────────────────────────────────────────────────────────── */
  .tabs-container {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.3rem;
  }

  .tabs {
    display: flex;
    gap: 0.15rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--color-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .tab:hover:not(:disabled) {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .tab.active {
    background: var(--color-bg) !important;
    color: var(--color-text) !important;
  }

  .tab.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tab-label {
    font-weight: 600;
  }

  .tab-count {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.05rem 0.4rem;
    min-width: 20px;
    text-align: center;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    color: var(--color-muted);
  }

  .tab.active .tab-count {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
  }

  .tab:not(.disabled):hover .tab-count {
    background: var(--color-border);
    color: var(--color-text);
  }

  /* ── Exam Grid ──────────────────────────────────────────────────────────── */
  .exam-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .exam-grid.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 0.875rem;
  }

  /* ── Exam Card ─────────────────────────────────────────────────────────── */
  .exam-card {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 14px;
    padding: 1.25rem;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .exam-card.clickable {
    cursor: pointer;
  }

  .exam-card.clickable:hover {
    transform: translateY(-2px);
    border-color: #6366f1;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  }

  .exam-card.status-live {
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.02);
  }

  .exam-card.status-live.clickable:hover {
    border-color: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.08);
  }

  .exam-card.status-resume {
    border-color: rgba(99, 102, 241, 0.3);
    background: rgba(99, 102, 241, 0.02);
  }

  .exam-card.status-resume.clickable:hover {
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
  }

  .exam-card.status-scheduled {
    border-color: rgba(14, 165, 233, 0.2);
  }

  .exam-card.status-completed {
    opacity: 0.8;
  }

  .exam-card.status-cancelled {
    opacity: 0.5;
  }

  .exam-card.status-ineligible {
    border-color: rgba(239, 68, 68, 0.2);
    background: rgba(239, 68, 68, 0.02);
  }

  .exam-card.status-locked {
    opacity: 0.7;
  }

  .exam-card.status-notreg {
    border-color: rgba(251, 191, 36, 0.2);
    background: rgba(251, 191, 36, 0.02);
  }

  /* Card Header */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .card-course {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .course-code {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    padding: 0.2rem 0.5rem;
    background: var(--color-bg);
    border-radius: 4px;
    border: 1px solid var(--color-border);
  }

  .course-title {
    font-size: 0.78rem;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .status-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Card Body */
  .card-body {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .exam-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .exam-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .meta-item.score {
    font-weight: 700;
  }

  .score-value {
    font-weight: 800;
  }

  .reasons-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-top: 0.25rem;
  }

  .reason-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #b91c1c;
    padding: 0.3rem 0.6rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
  }

  /* Card Footer */
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
  }

  .footer-hint {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    flex: 1;
  }

  .footer-hint.warn {
    color: #d97706;
  }

  .footer-hint.info {
    color: #0ea5e9;
  }

  .footer-hint.muted {
    color: var(--color-muted);
  }

  .footer-hint.danger {
    color: #ef4444;
  }

  .footer-hint.success {
    color: #10b981;
  }

  .inline-link {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 700;
    color: #d97706;
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.75rem;
  }

  .inline-link:hover {
    color: #b45309;
  }

  .card-arrow {
    color: var(--color-muted);
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .exam-card.clickable:hover .card-arrow {
    color: var(--color-text);
    transform: translateX(4px);
  }

  /* Progress Bar */
  .exam-progress {
    margin: -1.25rem -1.25rem 0 -1.25rem;
    border-radius: 0 0 14px 14px;
    overflow: hidden;
  }

  .progress-track {
    height: 4px;
    background: var(--color-bg);
  }

  .progress-fill {
    height: 100%;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Empty States ──────────────────────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 1rem;
    text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
  }

  .empty-icon {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
  }

  .empty-state h2 {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }

  .empty-state p {
    font-size: 0.85rem;
    color: var(--color-muted);
    max-width: 400px;
    line-height: 1.6;
    margin: 0;
  }

  .tab-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 3rem 1rem;
    color: var(--color-muted);
    text-align: center;
    grid-column: 1 / -1;
  }

  .tab-empty h4 {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }

  .tab-empty p {
    font-size: 0.82rem;
    margin: 0;
  }

  /* ── Responsive ────────────────────────────────────────────────────────── */
  @media (max-width: 1024px) {
    .exam-grid.grid-view {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
  }

  @media (max-width: 768px) {
    .root {
      padding: 1rem;
      gap: 1rem;
    }

    .hero-header {
      padding: 1.25rem;
    }

    .hero-content {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .hero-title {
      font-size: 1.4rem;
    }

    .hero-right {
      flex-direction: column;
      width: 100%;
      gap: 0.75rem;
    }

    .action-group {
      width: 100%;
      justify-content: space-between;
    }

    .quick-stats {
      width: 100%;
      justify-content: space-around;
    }

    .enroll-banner {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .banner-action {
      width: 100%;
      justify-content: center;
    }

    .tabs {
      gap: 0.1rem;
    }

    .tab {
      padding: 0.4rem 0.6rem;
      font-size: 0.7rem;
    }

    .tab-label {
      display: none;
    }

    .exam-grid.grid-view {
      grid-template-columns: 1fr;
    }

    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .exam-meta {
      gap: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .root {
      padding: 0.75rem;
    }

    .hero-header {
      padding: 1rem;
    }

    .hero-title {
      font-size: 1.2rem;
    }

    .quick-stats {
      padding: 0.4rem 0.6rem;
      gap: 0.5rem;
    }

    .stat-value {
      font-size: 0.9rem;
    }

    .action-group {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .action-btn {
      flex: 1;
      justify-content: center;
      font-size: 0.7rem;
      padding: 0.4rem 0.8rem;
    }

    .exam-card {
      padding: 1rem;
    }
  }
</style>