<script lang="ts">
  // src/routes/student/+page.svelte

  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  const {
    student, session, assessments, results,
    notifications, cgpa, totalCourses,
  } = $derived(data as any)

  const TYPE_COLORS: Record<string, string> = {
    EXAMINATION: 'badge-red',
    TEST:        'badge-yellow',
    ASSIGNMENT:  'badge-blue',
    PRACTICE:    'badge-green',
  }

  const TYPE_LABELS: Record<string, string> = {
    EXAMINATION: 'Exam',
    TEST:        'Test',
    ASSIGNMENT:  'Assignment',
    PRACTICE:    'Practice',
  }

  function timeUntil(iso: string | null): string {
    if (!iso) return 'Open now'
    const diff = new Date(iso).getTime() - Date.now()
    if (diff <= 0) return 'Started'
    const h = Math.floor(diff / 3_600_000)
    const d = Math.floor(h / 24)
    if (d > 0) return `in ${d}d ${h % 24}h`
    if (h > 0) return `in ${h}h`
    return `in ${Math.floor(diff / 60_000)}m`
  }

  function gradeColor(grade: string) {
    return { A: '#059669', B: '#3b82f6', C: '#f59e0b', D: '#f97316', E: '#ef4444', F: '#dc2626' }[grade] ?? '#64748b'
  }
</script>

<div class="dashboard">

  <!-- ── Welcome ────────────────────────────────────────────────────────── -->
  <div class="welcome-row">
    <div>
      <h1 class="welcome-title">Good day, {student.firstName} 👋</h1>
      {#if session}
        <p class="welcome-sub">
          {session.name} · {session.semester === 'FIRST' ? 'First' : session.semester === 'SECOND' ? 'Second' : 'Summer'} Semester
        </p>
      {/if}
    </div>
    {#if !student.faceEnrolledAt}
      <a href="/student/enroll" class="enroll-cta">
        ⚠ Enroll face to take exams →
      </a>
    {/if}
  </div>

  <!-- ── Stats ──────────────────────────────────────────────────────────── -->
  <div class="stats-row">
    <div class="stat-card">
      <span class="stat-val">{totalCourses}</span>
      <span class="stat-lbl">Courses registered</span>
    </div>
    <div class="stat-card">
      <span class="stat-val">{assessments.length}</span>
      <span class="stat-lbl">Active assessments</span>
    </div>
    <div class="stat-card">
      <span class="stat-val" style="color:#059669">{cgpa.toFixed(2)}</span>
      <span class="stat-lbl">CGPA</span>
    </div>
    <div class="stat-card">
      <span class="stat-val" style="color:{student.faceEnrolledAt ? '#059669' : '#ef4444'}">
        {student.faceEnrolledAt ? '✓' : '✗'}
      </span>
      <span class="stat-lbl">Face enrolled</span>
    </div>
  </div>

  <div class="grid-2">

    <!-- ── Active Assessments ─────────────────────────────────────────── -->
    <section class="card">
      <div class="card-header">
        <h2>Active &amp; Upcoming</h2>
        <a href="/student/exams" class="see-all">See all →</a>
      </div>

      {#if assessments.length === 0}
        <div class="empty">No active assessments right now.</div>
      {:else}
        <div class="list">
          {#each assessments as a}
            <a href="/student/exams/{a.id}" class="list-item">
              <div class="list-item-left">
                <span class="badge {TYPE_COLORS[a.type]}">{TYPE_LABELS[a.type]}</span>
                <div>
                  <p class="item-title">{a.course.code} — {a.title}</p>
                  <p class="item-sub">{a.totalMarks} marks · {timeUntil(a.startTime)}</p>
                </div>
              </div>
              <span class="arrow">→</span>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <!-- ── Recent Results ─────────────────────────────────────────────── -->
    <section class="card">
      <div class="card-header">
        <h2>Recent Results</h2>
        <a href="/student/results" class="see-all">See all →</a>
      </div>

      {#if results.length === 0}
        <div class="empty">No released results yet.</div>
      {:else}
        <div class="list">
          {#each results as r}
            <div class="list-item">
              <div class="list-item-left">
                <span class="grade-circle" style="color:{gradeColor(r.grade)};border-color:{gradeColor(r.grade)}">
                  {r.grade}
                </span>
                <div>
                  <p class="item-title">{r.assessment.course.code} · {TYPE_LABELS[r.assessment.type]}</p>
                  <p class="item-sub">{r.marksObtained}/{r.totalMarks} marks · {r.percentage.toFixed(1)}%</p>
                </div>
              </div>
              <span class="passed-badge" class:pass={r.passed} class:fail={!r.passed}>
                {r.passed ? 'Pass' : 'Fail'}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- ── Notifications ──────────────────────────────────────────────── -->
    <section class="card">
      <div class="card-header">
        <h2>Notifications</h2>
        <a href="/student/notifications" class="see-all">See all →</a>
      </div>

      {#if notifications.length === 0}
        <div class="empty">You're all caught up.</div>
      {:else}
        <div class="list">
          {#each notifications as n}
            <div class="notif-item" class:unread={!n.isRead}>
              <p class="item-title">{n.title}</p>
              <p class="item-sub">{n.body}</p>
            </div>
          {/each}
        </div>
      {/if}
    </section>

  </div>
</div>

<style>
  .dashboard { display: flex; flex-direction: column; gap: 1.5rem; max-width: 1100px; }

  /* Welcome */
  .welcome-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
  .welcome-title { font-size: 1.5rem; font-weight: 800; margin: 0; color: var(--color-text); letter-spacing: -0.02em; }
  .welcome-sub   { margin: 0.25rem 0 0; color: var(--color-muted); font-size: 0.875rem; }

  .enroll-cta {
    background: #fef9c3;
    border: 1px solid #fde047;
    color: #92400e;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .enroll-cta:hover { background: #fef08a; }

  /* Stats */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-val { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
  .stat-lbl { font-size: 0.75rem; color: var(--color-muted); font-weight: 500; }

  /* Grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

  /* Card */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .card-header h2 { margin: 0; font-size: 0.9rem; font-weight: 700; }
  .see-all { font-size: 0.775rem; color: var(--color-primary); text-decoration: none; font-weight: 500; }
  .see-all:hover { text-decoration: underline; }

  .empty { padding: 2rem 1.25rem; text-align: center; color: var(--color-muted); font-size: 0.875rem; }

  .list { display: flex; flex-direction: column; }

  .list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    text-decoration: none;
    color: inherit;
    transition: background 0.1s;
    gap: 0.75rem;
  }
  .list-item:last-child  { border-bottom: none; }
  a.list-item:hover      { background: var(--color-surface-hover); }

  .list-item-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }

  .item-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 0.1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item-sub { font-size: 0.75rem; color: var(--color-muted); margin: 0; }

  .arrow { color: var(--color-muted); font-size: 0.875rem; flex-shrink: 0; }

  /* Badge */
  .badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .badge-red    { background: #fee2e2; color: #b91c1c; }
  .badge-yellow { background: #fef9c3; color: #92400e; }
  .badge-blue   { background: #dbeafe; color: #1e40af; }
  .badge-green  { background: #dcfce7; color: #15803d; }

  /* Grade circle */
  .grade-circle {
    width: 36px; height: 36px;
    border-radius: 50%;
    border: 2px solid;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.875rem;
    font-weight: 800;
    flex-shrink: 0;
  }

  /* Pass/fail badge */
  .passed-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .passed-badge.pass { background: #dcfce7; color: #15803d; }
  .passed-badge.fail { background: #fee2e2; color: #b91c1c; }

  /* Notifications */
  .notif-item {
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .notif-item:last-child { border-bottom: none; }
  .notif-item.unread { background: rgba(5,150,105,0.04); border-left: 3px solid #059669; }

  /* Responsive */
  @media (max-width: 900px) {
    .stats-row { grid-template-columns: 1fr 1fr; }
    .grid-2    { grid-template-columns: 1fr; }
  }

  @media (max-width: 480px) {
    .stats-row { grid-template-columns: 1fr 1fr; }
  }
</style>