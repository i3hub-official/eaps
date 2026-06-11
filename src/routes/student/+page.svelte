<!-- src/routes/student/+page.svelte -->
<script lang="ts">
  import {
    LayoutDashboard, ClipboardList, BarChart3, BookOpen,
    Bell, Clock, Calendar, ArrowRight, Award, AlertCircle,
    TrendingUp, BookMarked, Zap, GraduationCap, Info,
    AlertTriangle, CreditCard, CheckCircle2, UserCheck, Shield
  } from 'lucide-svelte';
  import type { PageData } from './$types';
  import FaceEnrollmentModal from '$lib/components/exam/FaceEnrollmentModal.svelte';

  let { data }: { data: PageData } = $props();

  const { recentExams, recentResults, meta, student, academicSemester } = data;

  // Face enrollment state
  let showEnrollmentModal = $state(false);
  let showEnrollmentAlert = $state(!student.hasFaceEnrolled);
  let enrollmentInProgress = $state(false);

  function formatDate(d: Date | string | null) {
    if (!d) return 'TBD';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function daysUntil(d: Date | string | null) {
    if (!d) return null;
    const diff = new Date(d).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  function statusColor(status: string) {
    switch (status) {
      case 'active': return 'var(--green-600)';
      case 'scheduled': return 'var(--blue-500)';
      case 'completed': return 'var(--color-muted)';
      default: return 'var(--color-muted)';
    }
  }

  const creditColor = student.levelConfig.creditPercentage > 90 
    ? '#dc2626' 
    : student.levelConfig.creditPercentage > 75 
      ? '#f59e0b' 
      : 'var(--green-600)';

  function handleEnrollmentComplete() {
    showEnrollmentModal = false;
    showEnrollmentAlert = false;
    enrollmentInProgress = false;
    // Refresh the page to update the face enrollment status
    window.location.reload();
  }

  function handleEnrollmentClose() {
    showEnrollmentModal = false;
    enrollmentInProgress = false;
  }

  function startEnrollment() {
    enrollmentInProgress = true;
    showEnrollmentModal = true;
  }

  function dismissAlert() {
    showEnrollmentAlert = false;
  }
</script>

<div class="dashboard">
  <!-- Header -->
  <div class="dash-header">
    <div>
      <h1>Dashboard</h1>
      <p class="dash-sub">
        {student.level ? (student.level.name ?? `${student.level.level}L`) : 'Level not set'}  · {meta.session} · {meta.semesterLabel}
        {#if academicSemester?.startDate && academicSemester?.endDate}
          · {formatDate(academicSemester.startDate)} – {formatDate(academicSemester.endDate)}
        {/if}
      </p>
    </div>
    <div class="dash-meta">
      <span class="meta-pill"><BookMarked size={13} /> {meta.registeredCourses} Courses</span>
      {#if student.level}
        <span class="meta-pill"><GraduationCap size={13} /> {student.level.name}</span>
      {/if}
      {#if meta.unreadNotifications > 0}
        <span class="meta-pill alert"><Bell size={13} /> {meta.unreadNotifications} New</span>
      {/if}
    </div>
  </div>

  <!-- Face Enrollment Alert Banner -->
  {#if showEnrollmentAlert && !student.hasFaceEnrolled}
    <div class="enrollment-alert">
      <div class="alert-content">
        <div class="alert-icon">
          <Shield size={20} />
        </div>
        <div class="alert-text">
          <strong>Face Enrollment Required</strong>
          <p>To access and take exams, you need to enroll your face for identity verification. This process takes less than 2 minutes.</p>
        </div>
        <div class="alert-actions">
          <button class="btn-enroll" onclick={startEnrollment} disabled={enrollmentInProgress}>
            {#if enrollmentInProgress}
              <span class="spinner-small"></span>
              Loading...
            {:else}
              <UserCheck size={16} />
              Enroll Now
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Student info card with level and limits -->
  <div class="student-info-card">
    <div class="info-header">
      <div class="info-title">
        <GraduationCap size={18} />
        <h3>Academic Information</h3>
      </div>
      {#if academicSemester && !academicSemester.regOpen}
        <span class="reg-badge closed">Registration Closed</span>
      {:else if academicSemester && academicSemester.regOpen}
        <span class="reg-badge open">Registration Open</span>
      {/if}
    </div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Level</span>
        <span class="info-value">{student.level?.name ?? '—'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Session</span>
        <span class="info-value">{meta.session}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Semester</span>
        <span class="info-value">{meta.semester === 1 ? 'First' : 'Second'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Credit Limit</span>
        <span class="info-value">{student.levelConfig.maxCredits} CU</span>
      </div>
      <div class="info-item">
        <span class="info-label">Carry-Over Limit</span>
        <span class="info-value">{student.levelConfig.maxCarryOver} max</span>
      </div>
      <div class="info-item">
        <span class="info-label">Borrowed Limit</span>
        <span class="info-value">{student.levelConfig.maxBorrowed} max</span>
      </div>
    </div>
    
    <!-- Credit progress -->
    <div class="credit-section">
      <div class="credit-header">
        <CreditCard size={14} />
        <span>Credit Usage</span>
        <span class="credit-stats">{student.levelConfig.currentCredits} / {student.levelConfig.maxCredits} CU</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:{Math.min(student.levelConfig.creditPercentage, 100)}%; background:{creditColor}"></div>
      </div>
      {#if student.levelConfig.remainingCredits > 0}
        <span class="remaining-text">{student.levelConfig.remainingCredits} CU remaining</span>
      {:else}
        <span class="remaining-text warning">Credit limit reached</span>
      {/if}
    </div>

    <!-- Limit warnings -->
    <div class="limit-warnings">
      {#if student.levelConfig.hasReachedCarryOverLimit}
        <div class="warning-chip">
          <AlertTriangle size={12} />
          <span>Carry-over limit reached ({student.levelConfig.maxCarryOver})</span>
        </div>
      {/if}
      {#if student.levelConfig.hasReachedBorrowedLimit}
        <div class="warning-chip">
          <AlertTriangle size={12} />
          <span>Borrowed limit reached ({student.levelConfig.maxBorrowed})</span>
        </div>
      {/if}
      {#if student.levelConfig.hasReachedCreditLimit}
        <div class="warning-chip error">
          <AlertCircle size={12} />
          <span>Credit limit reached ({student.levelConfig.maxCredits} CU)</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Quick stats cards -->
  <div class="stat-cards">
    <a href="/student/exam" class="stat-card">
      <div class="stat-card-icon" style="background: var(--green-soft); color: var(--green-600);">
        <ClipboardList size={20} />
      </div>
      <div class="stat-card-info">
        <span class="stat-card-value">{recentExams.length}</span>
        <span class="stat-card-label">Upcoming Exams</span>
      </div>
      <ArrowRight size={14} class="stat-card-arrow" />
    </a>
    <a href="/student/results" class="stat-card">
      <div class="stat-card-icon" style="background: var(--blue-soft); color: var(--blue-500);">
        <BarChart3 size={20} />
      </div>
      <div class="stat-card-info">
        <span class="stat-card-value">{recentResults.length}</span>
        <span class="stat-card-label">Recent Results</span>
      </div>
      <ArrowRight size={14} class="stat-card-arrow" />
    </a>
    <a href="/student/courses" class="stat-card">
      <div class="stat-card-icon" style="background: var(--teal-soft); color: var(--teal-500);">
        <BookOpen size={20} />
      </div>
      <div class="stat-card-info">
        <span class="stat-card-value">{meta.registeredCourses}</span>
        <span class="stat-card-label">Registered</span>
      </div>
      <ArrowRight size={14} class="stat-card-arrow" />
    </a>
  </div>

  <!-- Main grid -->
  <div class="dash-grid">
    <!-- Upcoming exams -->
    <section class="dash-section">
      <div class="section-head">
        <ClipboardList size={16} />
        <h2>Upcoming Exams</h2>
        <a href="/student/exam" class="section-link">View all <ArrowRight size={12} /></a>
      </div>
      {#if recentExams.length === 0}
        <div class="empty-state">
          <AlertCircle size={28} strokeWidth={1.5} />
          <p>No upcoming exams for this semester.</p>
          <a href="/student/courses/register">Register courses →</a>
        </div>
      {:else}
        <div class="exam-list">
          {#each recentExams as exam}
            <div class="exam-row">
              <div class="exam-row-left">
                <div class="exam-dot" style="background: {statusColor(exam.status)}"></div>
                <div class="exam-row-info">
                  <span class="exam-row-title">{exam.title}</span>
                  <span class="exam-row-course">{exam.courseCode} — {exam.courseTitle}</span>
                </div>
              </div>
              <div class="exam-row-right">
                {#if exam.scheduledStart}
                  {@const days = daysUntil(exam.scheduledStart)}
                  {#if days !== null && days <= 7 && days > 0}
                    <span class="exam-countdown"><Zap size={11} /> {days}d left</span>
                  {:else}
                    <span class="exam-date"><Calendar size={11} /> {formatDate(exam.scheduledStart)}</span>
                  {/if}
                {/if}
                {#if !student.hasFaceEnrolled}
                  <button 
                    class="exam-btn disabled" 
                    disabled 
                    title="Face enrollment required to take exams"
                    onclick={startEnrollment}>
                    Enroll Face First
                  </button>
                {:else if exam.sessionStatus === 'active' || exam.sessionStatus === 'in_progress'}
                  <a href="/student/exam/{exam.sessionId}" class="exam-btn primary">Resume</a>
                {:else if exam.status === 'active'}
                  <a href="/student/exam/{exam.id}" class="exam-btn primary">Start</a>
                {:else}
                  <span class="exam-btn ghost">Scheduled</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Recent results -->
    <section class="dash-section">
      <div class="section-head">
        <Award size={16} />
        <h2>Recent Results</h2>
        <a href="/student/results" class="section-link">View all <ArrowRight size={12} /></a>
      </div>
      {#if recentResults.length === 0}
        <div class="empty-state">
          <TrendingUp size={28} strokeWidth={1.5} />
          <p>No results available yet.</p>
        </div>
      {:else}
        <div class="result-list">
          {#each recentResults as result}
            <div class="result-row">
              <div class="result-row-left">
                <div class="result-grade" class:pass={result.passed} class:fail={!result.passed}>
                  {result.grade ?? '—'}
                </div>
              <div class="result-row-info">
                  <span class="result-row-title">{result.examTitle}</span>
                  <span class="result-row-course">{result.courseCode ?? '—'}</span>
                </div>
              </div>
              <div class="result-row-right">
                <span class="result-score">{result.percentage ?? result.score ?? 0}%</span>
                <span class="result-date">{result.submittedAt ? formatDate(result.submittedAt) : '—'}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<!-- Face Enrollment Modal -->
<FaceEnrollmentModal
  open={showEnrollmentModal}
  onClose={handleEnrollmentClose}
  onComplete={handleEnrollmentComplete}
/>

<style>
  .dashboard { display: flex; flex-direction: column; gap: 1.5rem; }

  .dash-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .dash-header h1 { font-size: 1.35rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .dash-sub { font-size: 0.78rem; color: var(--color-muted); margin: 0.25rem 0 0; }
  .dash-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .meta-pill {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.35rem 0.7rem; border-radius: 999px;
    background: var(--color-bg); border: 1px solid var(--color-border);
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
  }
  .meta-pill.alert { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); color: #dc2626; }

  /* Face Enrollment Alert Banner */
  .enrollment-alert {
    background: linear-gradient(135deg, rgba(0, 201, 167, 0.08), rgba(0, 201, 167, 0.03));
    border: 0;
    border-radius: var(--radius-card);
    padding: 1rem;
    animation: slide-down 0.3s ease;
  }

  .alert-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .alert-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 201, 167, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #00c9a7;
    flex-shrink: 0;
  }

  .alert-text {
    flex: 1;
    min-width: 180px;
  }

  .alert-text strong {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.2rem;
  }

  .alert-text p {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .alert-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .btn-enroll {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #00c9a7, #00b894);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    max-width: 150px;
    width: 140px;
  }

  .btn-enroll:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 201, 167, 0.3);
  }

  .btn-enroll:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
  }

  /* Student info card */
  .student-info-card {
    background: linear-gradient(135deg, var(--color-surface), var(--color-bg));
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    padding: 1.125rem;
  }
  .info-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;
  }
  .info-title { display: flex; align-items: center; gap: 0.5rem; }
  .info-title h3 { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--color-text); }
  .reg-badge {
    font-size: 0.65rem; font-weight: 700; padding: 0.25rem 0.6rem;
    border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .reg-badge.open { background: var(--green-soft); color: var(--green-700); border: 1px solid var(--green-600); }
  .reg-badge.closed { background: rgba(220,38,38,0.1); color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }
  
  .info-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem; margin-bottom: 1rem;
  }
  .info-item { display: flex; flex-direction: column; gap: 0.2rem; }
  .info-label { font-size: 0.65rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .info-value { font-size: 0.85rem; font-weight: 700; color: var(--color-text); }

  .credit-section {
    padding-top: 0.75rem; border-top: 1px solid var(--color-border);
    margin-bottom: 0.75rem;
  }
  .credit-header {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
    margin-bottom: 0.5rem;
  }
  .credit-stats { margin-left: auto; font-weight: 700; color: var(--color-text); }
  .progress-bar {
    height: 5px; background: var(--color-border); border-radius: 3px;
    overflow: hidden; margin-bottom: 0.35rem;
  }
  .progress-fill {
    height: 100%; border-radius: 3px;
    transition: width 0.3s ease;
  }
  .remaining-text { font-size: 0.65rem; color: var(--color-muted); }
  .remaining-text.warning { color: #dc2626; font-weight: 600; }

  .limit-warnings {
    display: flex; flex-wrap: wrap; gap: 0.5rem;
    padding-top: 0.5rem;
  }
  .warning-chip {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.65rem; font-weight: 600;
    padding: 0.25rem 0.6rem; border-radius: 999px;
    background: rgba(245,158,11,0.1); color: #b45309;
  }
  .warning-chip.error { background: rgba(220,38,38,0.1); color: #dc2626; }

  .stat-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.875rem;
  }
  @media (max-width: 640px) {
    .stat-cards { grid-template-columns: 1fr; }
  }
  .stat-card {
    display: flex; align-items: center; gap: 0.875rem;
    padding: 1rem; border-radius: var(--radius-card);
    background: var(--color-surface); border: 1px solid var(--color-border);
    text-decoration: none; transition: all 0.15s;
  }
  .stat-card:hover { border-color: var(--green-600); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
  .stat-card-icon {
    width: 40px; height: 40px; border-radius: 0.625rem;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-card-info { flex: 1; min-width: 0; }
  .stat-card-value { display: block; font-size: 1.25rem; font-weight: 800; color: var(--color-text); }
  .stat-card-label { display: block; font-size: 0.72rem; color: var(--color-muted); margin-top: 2px; }
  .stat-card-arrow { color: var(--color-muted); flex-shrink: 0; transition: transform 0.15s; }
  .stat-card:hover .stat-card-arrow { transform: translateX(2px); color: var(--green-600); }

  .dash-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 900px) {
    .dash-grid { grid-template-columns: 1fr; }
  }

  .dash-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-card); overflow: hidden;
  }
  .section-head {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 1rem 1.125rem; border-bottom: 1px solid var(--color-border);
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
  }
  .section-link {
    margin-left: auto;
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.12s;
  }
  .section-link:hover { color: var(--green-600); }

  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 2.5rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p { margin: 0; font-size: 0.8rem; }
  .empty-state a { color: var(--green-600); font-weight: 600; text-decoration: none; font-size: 0.78rem; }
  .empty-state a:hover { text-decoration: underline; }

  .exam-list { display: flex; flex-direction: column; }
  .exam-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 0.875rem 1.125rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .exam-row:last-child { border-bottom: none; }
  .exam-row:hover { background: var(--color-bg); }
  .exam-row-left { display: flex; align-items: center; gap: 0.625rem; min-width: 0; flex: 1; }
  .exam-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .exam-row-info { display: flex; flex-direction: column; min-width: 0; }
  .exam-row-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .exam-row-course { font-size: 0.72rem; color: var(--color-muted); }
  .exam-row-right { display: flex; align-items: center; gap: 0.625rem; flex-shrink: 0; }
  .exam-date { font-size: 0.72rem; color: var(--color-muted); display: flex; align-items: center; gap: 0.25rem; }
  .exam-countdown { font-size: 0.68rem; font-weight: 700; color: #f59e0b; display: flex; align-items: center; gap: 0.25rem; }
  .exam-btn {
    padding: 0.35rem 0.75rem; border-radius: 0.4rem; font-size: 0.72rem; font-weight: 700;
    text-decoration: none; white-space: nowrap; transition: all 0.15s;
  }
  .exam-btn.primary { background: var(--green-600); color: white; }
  .exam-btn.primary:hover { background: var(--green-700); }
  .exam-btn.disabled {
    background: var(--color-border);
    color: var(--color-muted);
    cursor: not-allowed;
    opacity: 0.6;
  }
  .exam-btn.ghost { background: var(--color-bg); color: var(--color-muted); border: 1px solid var(--color-border); cursor: default; }

  .result-list { display: flex; flex-direction: column; }
  .result-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding: 0.875rem 1.125rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }
  .result-row:last-child { border-bottom: none; }
  .result-row:hover { background: var(--color-bg); }
  .result-row-left { display: flex; align-items: center; gap: 0.625rem; min-width: 0; flex: 1; }
  .result-grade {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 800; color: white;
    background: var(--color-border); color: var(--color-muted);
  }
  .result-grade.pass { background: var(--green-600); color: white; }
  .result-grade.fail { background: #dc2626; color: white; }
  .result-row-info { display: flex; flex-direction: column; min-width: 0; }
  .result-row-title { font-size: 0.82rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .result-row-course { font-size: 0.72rem; color: var(--color-muted); }
  .result-row-right { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
  .result-score { font-size: 0.9rem; font-weight: 800; color: var(--color-text); }
  .result-date { font-size: 0.68rem; color: var(--color-muted); }

  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>