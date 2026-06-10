<!-- src/routes/(student)/student/courses/+page.svelte -->
<script lang="ts">
  import {
    BookMarked, BookOpen, GraduationCap, Calendar,
    ArrowRight, Clock, AlertCircle, Search,
    Plus, Lock, ShieldAlert, RefreshCw,
    CreditCard, CheckCircle2
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let search = $state('');

  const registrations = data?.registrations ?? [];
  const meta          = data?.meta ?? { session: '—', semester: 0, totalCredits: 0 };

  // ── Phase derived from registrations ──────────────────────────────────
  // The server doesn't pass phase here, so we derive a display hint from
  // the registration statuses and whether any pending ones exist.
  // The real phase lives on the register page; this page just shows context.
  const hasAny       = registrations.length > 0;
  const hasPending   = registrations.some(r => r.status === 'pending');
  const hasRejected  = registrations.some(r => r.status === 'rejected');

  const filtered = $derived(
    !search.trim()
      ? registrations
      : registrations.filter(r => {
          const q = search.toLowerCase();
          return (
            r.courseCode.toLowerCase().includes(q) ||
            r.courseTitle.toLowerCase().includes(q) ||
            r.department.toLowerCase().includes(q)
          );
        })
  );

  // Group by registration type for the summary strip
  const normalCount    = registrations.filter(r => r.registrationType === 'normal').length;
  const carryOverCount = registrations.filter(r => r.registrationType === 'carry_over').length;
  const borrowedCount  = registrations.filter(r => r.registrationType === 'borrowed').length;

  function typeColor(t: string) {
    return t === 'carry_over' ? '#f59e0b' : t === 'borrowed' ? '#6366f1' : 'var(--green-600)';
  }
  function typeBg(t: string) {
    return t === 'carry_over' ? 'rgba(245,158,11,.12)' : t === 'borrowed' ? 'rgba(99,102,241,.1)' : 'var(--green-soft)';
  }
  function typeLabel(t: string) {
    return t === 'carry_over' ? 'Carry-Over' : t === 'borrowed' ? 'Borrowed' : 'Normal';
  }

  function examStatusColor(s: string) {
    switch (s) {
      case 'active':    return { color: 'var(--green-700)', bg: 'var(--green-soft)' };
      case 'scheduled': return { color: '#2563eb',          bg: 'rgba(37,99,235,.1)' };
      case 'completed': return { color: 'var(--color-muted)', bg: 'var(--color-bg)' };
      default:          return { color: 'var(--color-muted)', bg: 'var(--color-bg)' };
    }
  }

  function regStatusStyle(status: string) {
    switch (status) {
      case 'approved': return { text: 'Approved', color: 'var(--green-700)', bg: 'var(--green-soft)' };
      case 'pending':  return { text: 'Pending',  color: '#d97706',          bg: 'rgba(245,158,11,.12)' };
      case 'rejected': return { text: 'Rejected', color: '#dc2626',          bg: 'rgba(220,38,38,.1)' };
      default:         return { text: status,     color: 'var(--color-muted)', bg: 'var(--color-bg)' };
    }
  }

  function fmtDate(d: Date | string | null) {
    if (!d) return 'TBD';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch { return '—'; }
  }
</script>

<div class="page">

  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <div class="page-header">
    <div class="header-left">
      <h1>My Courses</h1>
      <p class="page-sub">
        {meta.session} · Semester {meta.semester}
      </p>
    </div>

    <a href="/student/courses/register" class="btn-register">
      <Plus size={14}/> Register Courses
    </a>
  </div>

  <!-- ── Summary strip ──────────────────────────────────────────────────── -->
  {#if hasAny}
    <div class="summary-strip">
      <div class="stat-card">
        <CreditCard size={13} style="color:var(--green-600)"/>
        <div>
          <span class="stat-val">{meta.totalCredits}</span>
          <span class="stat-label">Credit Units</span>
        </div>
      </div>

      <div class="stat-divider"></div>

      <div class="stat-card">
        <CheckCircle2 size={13} style="color:var(--green-600)"/>
        <div>
          <span class="stat-val">{registrations.length}</span>
          <span class="stat-label">Courses</span>
        </div>
      </div>

      {#if normalCount > 0}
        <div class="type-stat" style="color:var(--green-600); background:var(--green-soft)">
          <span class="t-dot" style="background:var(--green-600)"></span>
          {normalCount} Normal
        </div>
      {/if}
      {#if carryOverCount > 0}
        <div class="type-stat" style="color:#d97706; background:rgba(245,158,11,.12)">
          <span class="t-dot" style="background:#f59e0b"></span>
          {carryOverCount} Carry-Over
        </div>
      {/if}
      {#if borrowedCount > 0}
        <div class="type-stat" style="color:#4f46e5; background:rgba(99,102,241,.1)">
          <span class="t-dot" style="background:#6366f1"></span>
          {borrowedCount} Borrowed
        </div>
      {/if}
    </div>

    <!-- Pending / rejected notice -->
    {#if hasRejected}
      <div class="notice notice-red">
        <AlertCircle size={14}/>
        <div>
          Some carry-over courses were <strong>rejected</strong>. Visit <a href="/student/courses/register">course registration</a> to review and make changes.
        </div>
      </div>
    {:else if hasPending}
      <div class="notice notice-amber">
        <ShieldAlert size={14}/>
        <div>
          Some carry-over courses are <strong>pending approval</strong> from your academic office.
        </div>
      </div>
    {/if}
  {/if}

  <!-- ── Search ─────────────────────────────────────────────────────────── -->
  {#if hasAny}
    <div class="search-wrap">
      <Search size={13} class="search-icon"/>
      <input
        type="text"
        placeholder="Search by code, title or department…"
        bind:value={search}
      />
      {#if search}
        <button class="clear-btn" onclick={() => (search = '')}>×</button>
      {/if}
    </div>
  {/if}

  <!-- ── Course list ─────────────────────────────────────────────────────── -->
  {#if filtered.length === 0}
    <div class="empty-state">
      <BookOpen size={36} strokeWidth={1.4}/>
      <p>{search ? 'No courses match your search.' : 'No courses registered for this semester.'}</p>
      {#if !search}
        <a href="/student/courses/register" class="empty-cta">
          <Plus size={13}/> Register your first course
        </a>
      {/if}
    </div>
  {:else}
    <div class="course-list">
      {#each filtered as reg (reg.id)}
        {@const tColor = typeColor(reg.registrationType)}
        {@const tBg    = typeBg(reg.registrationType)}
        {@const rs     = regStatusStyle(reg.status)}

        <div class="course-card" style="--accent:{tColor}; --accent-bg:{tBg}">

          <!-- Left accent stripe -->
          <div class="card-stripe" style="background:{tColor}"></div>

          <!-- Card body -->
          <div class="card-body">

            <!-- Top row: code + title + status -->
            <div class="card-top">
              <div class="card-id">
                <span class="course-code" style="color:{tColor}">{reg.courseCode}</span>
                <span class="course-cu">{reg.creditUnits} CU</span>
              </div>
              <h3 class="course-title">{reg.courseTitle}</h3>
            </div>

            <!-- Chips row -->
            <div class="card-chips">
              <span class="chip"><GraduationCap size={10}/> {reg.level} Level</span>
              <span class="chip"><Calendar size={10}/> {reg.department}</span>
              <!-- Type badge -->
              <span class="chip type-chip" style="color:{tColor}; background:{tBg}">
                <span class="t-dot" style="background:{tColor}"></span>
                {typeLabel(reg.registrationType)}
              </span>
              <!-- Registration status -->
              <span class="chip status-chip" style="color:{rs.color}; background:{rs.bg}">
                {rs.text}
              </span>
            </div>

            <!-- Exams ───────────────────────────────────────────────── -->
            {#if reg.exams.length > 0}
              <div class="exams-block">
                {#each reg.exams as exam}
                  {@const es = examStatusColor(exam.status)}
                  <div class="exam-row">
                    <span class="exam-dot" style="background:{es.color}"></span>
                    <span class="exam-title">{exam.title}</span>
                    {#if exam.scheduledStart}
                      <span class="exam-date"><Clock size={9}/> {fmtDate(exam.scheduledStart)}</span>
                    {/if}
                    <span class="exam-status" style="color:{es.color}; background:{es.bg}">{exam.status}</span>
                    {#if exam.status === 'active'}
                      <a href="/student/exam/{exam.id}" class="exam-go">
                        Start <ArrowRight size={9}/>
                      </a>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <p class="no-exam"><AlertCircle size={10}/> No exam scheduled</p>
            {/if}

          </div>
        </div>
      {/each}
    </div>
  {/if}

</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1rem; }

  /* ── Header ───────────────────────────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .header-left h1 { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  .page-sub { margin: 0.1rem 0 0; font-size: 0.73rem; color: var(--color-muted); }

  .btn-register {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: 0.5rem;
    background: var(--green-600);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .btn-register:hover { background: var(--green-700); }

  /* ── Summary strip ────────────────────────────────────────────────────── */
  .summary-strip {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
  }
  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .stat-card div { display: flex; flex-direction: column; line-height: 1.1; }
  .stat-val   { font-size: 0.95rem; font-weight: 800; color: var(--color-text); }
  .stat-label { font-size: 0.6rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .stat-divider {
    width: 1px;
    height: 24px;
    background: var(--color-border);
    flex-shrink: 0;
  }
  .type-stat {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.67rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
  }
  .t-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  /* ── Notices ──────────────────────────────────────────────────────────── */
  .notice {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.7rem 0.875rem;
    border-radius: 0.6rem;
    border: 1px solid;
    font-size: 0.78rem;
    line-height: 1.45;
  }
  .notice a { font-weight: 700; color: inherit; }
  .notice strong { font-weight: 700; }
  .notice-amber { background: rgba(245,158,11,.07); border-color: rgba(245,158,11,.3); color: #92400e; }
  .notice-red   { background: rgba(220,38,38,.06);  border-color: rgba(220,38,38,.25); color: #991b1b; }

  /* ── Search ───────────────────────────────────────────────────────────── */
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    max-width: 360px;
    color: var(--color-muted);
  }
  .search-wrap input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 0.8rem;
    color: var(--color-text);
    font-family: inherit;
  }
  .search-wrap input::placeholder { color: var(--color-muted); }
  .clear-btn {
    width: 17px; height: 17px; border-radius: 50%;
    border: none; background: var(--color-border); color: var(--color-muted);
    font-size: 0.65rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Empty state ──────────────────────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3.5rem 1rem;
    color: var(--color-muted);
    text-align: center;
  }
  .empty-state p { margin: 0; font-size: 0.82rem; }
  .empty-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.55rem 1rem;
    border-radius: 0.5rem;
    background: var(--green-600);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s;
  }
  .empty-cta:hover { background: var(--green-700); }

  /* ── Course list ──────────────────────────────────────────────────────── */
  .course-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  /* Course card */
  .course-card {
    display: flex;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .course-card:hover {
    border-color: var(--accent);
    box-shadow: 0 3px 12px rgba(0,0,0,0.06);
  }

  /* Left stripe */
  .card-stripe {
    width: 4px;
    flex-shrink: 0;
    border-radius: 0.75rem 0 0 0.75rem;
  }

  /* Card body */
  .card-body {
    flex: 1;
    min-width: 0;
    padding: 0.875rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Top row */
  .card-top { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; }
  .card-id  { display: flex; align-items: baseline; gap: 0.4rem; flex-shrink: 0; }
  .course-code {
    font-size: 0.75rem;
    font-weight: 800;
    font-family: monospace;
    letter-spacing: 0.02em;
  }
  .course-cu {
    font-size: 0.63rem;
    font-weight: 700;
    color: var(--color-muted);
  }
  .course-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.3;
    flex: 1;
  }

  /* Chips */
  .card-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.62rem;
    color: var(--color-muted);
    padding: 0.12rem 0.38rem;
    border-radius: 0.25rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
  }
  .type-chip {
    font-weight: 700;
    border-color: transparent !important;
  }
  .status-chip {
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 0.58rem;
    border-color: transparent !important;
  }

  /* Exams block */
  .exams-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-top: 0.25rem;
    border-top: 1px solid var(--color-border);
  }
  .exam-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.71rem;
    padding: 0.3rem 0.5rem;
    border-radius: 0.35rem;
    background: var(--color-bg);
  }
  .exam-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .exam-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: var(--color-text);
  }
  .exam-date {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    color: var(--color-muted);
    white-space: nowrap;
    font-size: 0.65rem;
  }
  .exam-status {
    font-size: 0.58rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.08rem 0.3rem;
    border-radius: 0.2rem;
    white-space: nowrap;
  }
  .exam-go {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.15rem 0.45rem;
    border-radius: 0.25rem;
    background: var(--green-600);
    color: #fff;
    font-size: 0.63rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .exam-go:hover { background: var(--green-700); }

  .no-exam {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.67rem;
    color: var(--color-muted);
    padding-top: 0.125rem;
  }

  /* ── Mobile ───────────────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    .summary-strip { gap: 0.5rem; }
    .stat-divider  { display: none; }
    .card-top      { flex-direction: column; gap: 0.25rem; }
  }
</style>