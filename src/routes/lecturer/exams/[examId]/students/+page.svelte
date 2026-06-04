<!-- src/routes/lecturer/exams/[examId]/students/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Users, GraduationCap, CheckCircle, Clock, AlertTriangle,
    XCircle, Search, ChevronRight, PlayCircle, Hash
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exam, students, counts } = data;

  let search = $state('');
  let filterStatus = $state<'all'|'not_started'|'in_progress'|'submitted'|'flagged'>('all');

  const filtered = $derived(students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || s.fullName.toLowerCase().includes(q)
      || (s.matricNumber ?? '').toLowerCase().includes(q);
    const status = s.session?.status ?? 'not_started';
    const matchStatus = filterStatus === 'all' || status === filterStatus
      || (filterStatus === 'submitted' && status === 'force_submitted');
    return matchSearch && matchStatus;
  }));

  function sessionStatus(s: typeof students[0]) {
    const st = s.session?.status;
    if (!st) return { label: 'Not started', cls: 'ss-none',    icon: Clock };
    if (st === 'in_progress')    return { label: 'In progress', cls: 'ss-active',  icon: PlayCircle };
    if (st === 'submitted')      return { label: 'Submitted',   cls: 'ss-done',    icon: CheckCircle };
    if (st === 'force_submitted')return { label: 'Force sub.',  cls: 'ss-force',   icon: AlertTriangle };
    if (st === 'flagged')        return { label: 'Flagged',     cls: 'ss-flagged', icon: AlertTriangle };
    return { label: st, cls: 'ss-none', icon: Clock };
  }

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="students-page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <div class="breadcrumb">
        <a href="/lecturer/exams">Exams</a> /
        <a href="/lecturer/exams/{exam.id}">{exam.course.code}</a> /
        Students
      </div>
      <h1>{exam.title}</h1>
      <p>{exam.session} · Semester {exam.semester} · {exam.course.code}</p>
    </div>
  </div>

  <!-- Status chips -->
  <div class="status-bar">
    {#each [
      { k: 'all',         l: `All (${counts.registered})`,    icon: Users,         color: '#6366f1' },
      { k: 'not_started', l: `Not started (${counts.notStarted})`, icon: Clock,    color: '#9ca3af' },
      { k: 'in_progress', l: `Active (${counts.started})`,   icon: PlayCircle,    color: '#16a34a' },
      { k: 'submitted',   l: `Submitted (${counts.submitted})`,icon: CheckCircle, color: '#0ea5e9' },
      { k: 'flagged',     l: `Flagged (${counts.flagged})`,   icon: AlertTriangle, color: '#dc2626' },
    ] as chip}
      <button
        class="status-chip"
        class:chip-active={filterStatus === chip.k}
        style:--chip-color={chip.color}
        onclick={() => filterStatus = chip.k as typeof filterStatus}
      >
        <chip.icon size={12} /> {chip.l}
      </button>
    {/each}
  </div>

  <!-- Search -->
  <div class="search-wrap">
    <Search size={13} />
    <input
      class="search-input"
      placeholder="Search by name or matric number…"
      bind:value={search}
    />
  </div>

  <!-- Table -->
  <div class="table-card">
    <table class="students-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Student</th>
          <th>Matric No.</th>
          <th>Level</th>
          <th>Department</th>
          <th>Status</th>
          <th>Score</th>
          <th>Grade</th>
          <th>Violations</th>
          <th>Submitted</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as s, i (s.id)}
          {@const st = sessionStatus(s)}
          <tr class="student-row">
            <td class="td-muted">{i + 1}</td>
            <td>
              <div class="student-info">
                {#if s.photoUrl}
                  <img src={s.photoUrl} alt={s.fullName} class="student-avatar" />
                {:else}
                  <div class="student-initials">{s.fullName.charAt(0).toUpperCase()}</div>
                {/if}
                <div>
                  <div class="student-name">
                    {[s.title, s.fullName].filter(Boolean).join(' ')}
                  </div>
                </div>
              </div>
            </td>
            <td class="td-mono">{s.matricNumber ?? '—'}</td>
            <td class="td-muted">{s.level ?? '—'}</td>
            <td class="td-muted">{s.department?.name ?? '—'}</td>
            <td>
              <span class="session-status {st.cls}">
                <st.icon size={11} /> {st.label}
              </span>
            </td>
            <td class="td-score">
              {#if s.session?.examResult}
                <span class:score-pass={s.session.examResult.passed} class:score-fail={!s.session.examResult.passed}>
                  {Number(s.session.examResult.percentage).toFixed(1)}%
                </span>
              {:else}
                <span class="td-muted">—</span>
              {/if}
            </td>
            <td>
              {#if s.session?.examResult?.grade}
                <span class="grade-badge">{s.session.examResult.grade}</span>
              {:else}
                <span class="td-muted">—</span>
              {/if}
            </td>
            <td class="td-muted" class:td-warn={s.session && s.session.violationCount > 0}>
              {s.session?.violationCount ?? '—'}
            </td>
            <td class="td-muted">{fmt(s.session?.submittedAt ?? null)}</td>
          </tr>
        {/each}
        {#if filtered.length === 0}
          <tr>
            <td colspan="10" class="empty-row">
              <GraduationCap size={28} />
              <p>No students match this filter.</p>
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>

</div>

<style>
  .students-page { display: flex; flex-direction: column; gap: 1.25rem; }

  .page-header h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  .page-header p  { font-size: .8rem; color: var(--color-muted); margin-top: .2rem; }
  .breadcrumb { font-size: .72rem; color: var(--color-muted); margin-bottom: .3rem; }
  .breadcrumb a { color: var(--lc-600); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }

  /* Status bar */
  .status-bar { display: flex; gap: .5rem; flex-wrap: wrap; }
  .status-chip {
    display: flex; align-items: center; gap: .375rem;
    padding: .4rem .875rem; border-radius: 2rem;
    border: 1.5px solid var(--color-border);
    font-size: .75rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    background: var(--color-surface); color: var(--color-muted);
    transition: all .15s;
  }
  .status-chip:hover  { color: var(--chip-color); border-color: var(--chip-color); }
  .chip-active { color: var(--chip-color) !important; border-color: var(--chip-color) !important; background: color-mix(in srgb, var(--chip-color) 10%, transparent) !important; }

  /* Search */
  .search-wrap {
    display: flex; align-items: center; gap: .5rem;
    padding: .5rem .875rem; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: .5rem;
    max-width: 400px;
  }
  .search-wrap :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .search-input { background: none; border: none; outline: none; font-size: .82rem; color: var(--color-text); width: 100%; font-family: inherit; }

  /* Table */
  .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .students-table { width: 100%; border-collapse: collapse; }
  .students-table th {
    padding: .7rem .875rem; background: var(--color-bg);
    font-size: .68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .05em; color: var(--color-muted);
    text-align: left; border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  .students-table td { padding: .75rem .875rem; border-bottom: 1px solid var(--color-border); font-size: .82rem; vertical-align: middle; }
  .student-row:last-child td { border-bottom: none; }
  .student-row:hover { background: var(--color-surface-hover); }

  .student-info { display: flex; align-items: center; gap: .625rem; }
  .student-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .student-initials {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg, var(--lc-500), var(--lc-700));
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: .75rem; color: white; flex-shrink: 0;
  }
  .student-name { font-weight: 600; color: var(--color-text); white-space: nowrap; }

  .td-muted { color: var(--color-muted); white-space: nowrap; }
  .td-mono  { font-family: monospace; font-size: .78rem; color: var(--color-muted); }
  .td-warn  { color: #dc2626 !important; font-weight: 700; }
  .td-score { font-weight: 700; }
  .score-pass { color: #16a34a; }
  .score-fail { color: #dc2626; }

  .session-status {
    display: inline-flex; align-items: center; gap: .3rem;
    font-size: .68rem; font-weight: 700; padding: .25rem .5rem;
    border-radius: 2rem; white-space: nowrap;
  }
  .ss-none    { background: rgba(156,163,175,.12); color: #9ca3af; }
  .ss-active  { background: rgba(22,163,74,.12);   color: #16a34a; }
  .ss-done    { background: rgba(14,165,233,.12);  color: #0ea5e9; }
  .ss-force   { background: var(--lc-soft);  color: var(--lc-600); }
  .ss-flagged { background: rgba(220,38,38,.12);   color: #dc2626; }

  .grade-badge {
    font-size: .78rem; font-weight: 800; padding: .2rem .5rem;
    border-radius: .375rem; background: var(--color-bg);
    border: 1px solid var(--color-border); color: var(--color-text);
  }

  .empty-row {
    text-align: center; color: var(--color-muted);
    padding: 3rem; display: flex; flex-direction: column;
    align-items: center; gap: .75rem;
  }
  .empty-row p { font-size: .85rem; }

  @media (max-width: 768px) {
    .students-table th:nth-child(n+5),
    .students-table td:nth-child(n+5) { display: none; }
  }
</style>