<!-- src/routes/invigilator/[examId]/summary/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ClipboardList, Users, CheckCircle, AlertTriangle, XCircle,
    Shield, Clock, PlayCircle, ChevronDown, BookOpen,
    TrendingUp, Activity, Flag
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exam, sessions, flaggedSessions, violationBreakdown, stats } = data;

  let expandedSession = $state<string | null>(null);
  let activeTab = $state<'overview'|'sessions'|'violations'>('overview');

  const FLAG_LABELS: Record<string, string> = {
    tab_switch:          'Tab switch',
    window_blur:         'Window blur',
    fullscreen_exit:     'Fullscreen exit',
    copy_attempt:        'Copy attempt',
    devtools_open:       'DevTools opened',
    screenshot_attempt:  'Screenshot attempt',
    multiple_faces:      'Multiple faces',
    no_face_detected:    'No face detected',
    invigilator_manual:  'Invigilator action',
  };

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });
  }

  function sessionStatusBadge(status: string) {
    if (status === 'submitted')       return { cls: 'sb-done',    label: 'Submitted' };
    if (status === 'force_submitted') return { cls: 'sb-force',   label: 'Force-submitted' };
    if (status === 'in_progress')     return { cls: 'sb-active',  label: 'In progress' };
    if (status === 'flagged')         return { cls: 'sb-flagged', label: 'Flagged' };
    if (status === 'not_started')     return { cls: 'sb-none',    label: 'Not started' };
    return { cls: 'sb-none', label: status };
  }
</script>

<div class="summary-page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <div class="breadcrumb">
        <a href="/invigilator/assignments">Assignments</a> /
        <a href="/invigilator/{exam.id}">{exam.course.code}</a> /
        Summary
      </div>
      <h1>{exam.title}</h1>
      <p>{exam.course.code} · {exam.session} · Sem {exam.semester}</p>
    </div>
  </div>

  <!-- Stats grid -->
  <div class="stats-grid">
    {#each [
      { icon: Users,         label: 'Total Students', val: stats.total,            color: '#6366f1' },
      { icon: CheckCircle,   label: 'Submitted',      val: stats.submitted,        color: '#16a34a' },
      { icon: AlertTriangle, label: 'Force-submitted', val: stats.forceSubmit,     color: '#f59e0b' },
      { icon: PlayCircle,    label: 'Still active',   val: stats.inProgress,       color: '#0ea5e9' },
      { icon: XCircle,       label: 'Not started',    val: stats.notStarted,       color: '#9ca3af' },
      { icon: Flag,          label: 'Violations',     val: stats.totalViolations,  color: '#dc2626' },
      { icon: TrendingUp,    label: 'Pass rate',      val: stats.passRate != null ? `${stats.passRate}%` : '—', color: '#10b981' },
      { icon: Clock,         label: 'Avg time',       val: stats.avgTime != null ? `${stats.avgTime}m` : '—', color: '#8b5cf6' },
    ] as s}
      <div class="stat-card">
        <div class="stat-icon" style="background:{s.color}1a;color:{s.color}"><s.icon size={15} /></div>
        <div>
          <div class="stat-val">{s.val}</div>
          <div class="stat-lbl">{s.label}</div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Tabs -->
  <div class="tabs">
    {#each [
      { k: 'overview',   l: 'Overview',  icon: Activity },
      { k: 'sessions',   l: `All Sessions (${stats.total})`, icon: Users },
      { k: 'violations', l: `Flagged (${flaggedSessions.length})`, icon: Shield },
    ] as tab}
      <button class="tab" class:tab-active={activeTab === tab.k} onclick={() => activeTab = tab.k as any}>
        <tab.icon size={13} /> {tab.l}
      </button>
    {/each}
  </div>

  <!-- Overview tab -->
  {#if activeTab === 'overview'}
    <div class="two-col">
      <!-- Submission breakdown -->
      <div class="card">
        <div class="card-head"><CheckCircle size={14} /> Submission Breakdown</div>
        <div class="breakdown-rows">
          {#each [
            { label: 'Submitted normally', val: stats.submitted - stats.forceSubmit, color: '#16a34a' },
            { label: 'Force-submitted',    val: stats.forceSubmit,                   color: '#f59e0b' },
            { label: 'Still in progress',  val: stats.inProgress,                    color: '#0ea5e9' },
            { label: 'Not started',        val: stats.notStarted,                    color: '#9ca3af' },
          ] as row}
            <div class="breakdown-row">
              <div class="br-dot" style="background:{row.color}"></div>
              <span class="br-label">{row.label}</span>
              <div class="br-bar-bg">
                <div class="br-bar" style="width:{stats.total > 0 ? Math.round((row.val / stats.total) * 100) : 0}%;background:{row.color}"></div>
              </div>
              <span class="br-count">{row.val}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Violation type breakdown -->
      <div class="card">
        <div class="card-head"><Flag size={14} /> Violation Types</div>
        {#if Object.keys(violationBreakdown).length === 0}
          <p class="card-empty">No violations recorded.</p>
        {:else}
          <div class="breakdown-rows">
            {#each Object.entries(violationBreakdown).sort((a,b) => b[1]-a[1]) as [type, count]}
              <div class="breakdown-row">
                <div class="br-dot" style="background:#dc2626"></div>
                <span class="br-label">{FLAG_LABELS[type] ?? type}</span>
                <div class="br-bar-bg">
                  <div class="br-bar br-bar-red" style="width:{Math.round((count / stats.totalViolations) * 100)}%"></div>
                </div>
                <span class="br-count">{count}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  <!-- Sessions tab -->
  {:else if activeTab === 'sessions'}
    <div class="table-card">
      <table class="sess-table">
        <thead>
          <tr><th>Student</th><th>Matric</th><th>Status</th><th>Score</th><th>Grade</th><th>Violations</th><th>Submitted</th></tr>
        </thead>
        <tbody>
          {#each sessions as s (s.id)}
            {@const sb = sessionStatusBadge(s.status)}
            <tr class="sess-row">
              <td>
                <div class="s-name">{[s.student.title, s.student.fullName].filter(Boolean).join(' ')}</div>
                <div class="s-dept">{s.student.department?.name ?? '—'}</div>
              </td>
              <td class="td-mono">{s.student.matricNumber ?? '—'}</td>
              <td><span class="sess-badge {sb.cls}">{sb.label}</span></td>
              <td class:score-pass={s.examResult?.passed} class:score-fail={s.examResult && !s.examResult.passed}>
                {s.examResult?.percentage != null ? `${Number(s.examResult.percentage).toFixed(1)}%` : '—'}
              </td>
              <td>{s.examResult?.grade ?? '—'}</td>
              <td class:td-warn={s.violations.length > 0}>{s.violations.length}</td>
              <td class="td-muted">{fmt(s.submittedAt)}</td>
            </tr>
          {/each}
          {#if sessions.length === 0}
            <tr><td colspan="7" class="empty-row">No sessions recorded.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>

  <!-- Violations tab -->
  {:else if activeTab === 'violations'}
    {#if flaggedSessions.length === 0}
      <div class="empty-state">
        <Shield size={36} />
        <p>No violations recorded for this exam.</p>
      </div>
    {:else}
      <div class="flagged-list">
        {#each flaggedSessions as s (s.id)}
          <div class="flagged-card">
            <button
              class="flagged-header"
              onclick={() => expandedSession = expandedSession === s.id ? null : s.id}
            >
              <div class="fh-left">
                <div class="fh-name">{[s.student.title, s.student.fullName].filter(Boolean).join(' ')}</div>
                <div class="fh-meta">{s.student.matricNumber ?? '—'} · {s.student.department?.name ?? '—'}</div>
              </div>
              <div class="fh-right">
                <span class="violation-count-badge">{s.violations.length} violation{s.violations.length !== 1 ? 's' : ''}</span>
                <span class="sess-badge {sessionStatusBadge(s.status).cls}">{sessionStatusBadge(s.status).label}</span>
                <ChevronDown
                  size={14}
                  style="color:var(--color-muted);transform:rotate({expandedSession === s.id ? '180deg':'0deg'});transition:transform .2s"
                />
              </div>
            </button>

            {#if expandedSession === s.id}
              <div class="violation-log">
                {#each s.violations as v}
                  <div class="vlog-row">
                    <div class="vlog-dot"></div>
                    <div class="vlog-content">
                      <span class="vlog-type">{FLAG_LABELS[v.flagType] ?? v.flagType}</span>
                      {#if v.actionTaken}<span class="vlog-action">→ {v.actionTaken.replace(/_/g,' ')}</span>{/if}
                      {#if v.note}<span class="vlog-note">"{v.note}"</span>{/if}
                    </div>
                    <span class="vlog-time">{fmt(v.flaggedAt)}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}

</div>

<style>
  .summary-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .page-header h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  .page-header p  { font-size: .8rem; color: var(--color-muted); margin-top: .2rem; }
  .breadcrumb { font-size: .72rem; color: var(--color-muted); margin-bottom: .3rem; }
  .breadcrumb a { color: #14b8a6; text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: .75rem; }
  .stat-card { display: flex; align-items: center; gap: .75rem; padding: .875rem 1rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .75rem; }
  .stat-icon { width: 34px; height: 34px; border-radius: .5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .stat-val  { font-size: 1.15rem; font-weight: 800; color: var(--color-text); }
  .stat-lbl  { font-size: .68rem; color: var(--color-muted); }

  /* Tabs */
  .tabs { display: flex; gap: .375rem; border-bottom: 2px solid var(--color-border); }
  .tab { display: flex; align-items: center; gap: .375rem; padding: .6rem 1rem; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; font-size: .82rem; font-weight: 600; color: var(--color-muted); cursor: pointer; font-family: inherit; }
  .tab:hover { color: var(--color-text); }
  .tab-active { color: #14b8a6; border-bottom-color: #14b8a6; }

  /* Two col */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head { display: flex; align-items: center; gap: .5rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); font-size: .85rem; font-weight: 700; color: var(--color-text); background: var(--color-bg); }
  .card-empty { padding: 1.5rem; font-size: .82rem; color: var(--color-muted); text-align: center; }

  /* Breakdown rows */
  .breakdown-rows { display: flex; flex-direction: column; gap: .625rem; padding: 1rem 1.25rem; }
  .breakdown-row { display: flex; align-items: center; gap: .75rem; }
  .br-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .br-label { font-size: .78rem; color: var(--color-text); min-width: 140px; }
  .br-bar-bg { flex: 1; height: 6px; background: var(--color-bg); border-radius: 3px; overflow: hidden; }
  .br-bar { height: 100%; border-radius: 3px; transition: width .3s; }
  .br-bar-red { background: #dc2626; }
  .br-count { font-size: .78rem; font-weight: 700; color: var(--color-text); min-width: 24px; text-align: right; }

  /* Table */
  .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .sess-table { width: 100%; border-collapse: collapse; }
  .sess-table th { padding: .7rem 1rem; background: var(--color-bg); font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); text-align: left; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
  .sess-table td { padding: .75rem 1rem; border-bottom: 1px solid var(--color-border); font-size: .82rem; vertical-align: middle; }
  .sess-row:last-child td { border-bottom: none; }
  .s-name { font-weight: 600; color: var(--color-text); }
  .s-dept { font-size: .7rem; color: var(--color-muted); }
  .td-mono { font-family: monospace; font-size: .78rem; color: var(--color-muted); }
  .td-muted { color: var(--color-muted); font-size: .8rem; }
  .td-warn  { color: #dc2626 !important; font-weight: 700; }
  .score-pass { color: #16a34a; font-weight: 700; }
  .score-fail { color: #dc2626; font-weight: 700; }
  .empty-row { text-align: center; color: var(--color-muted); padding: 2rem; }

  .sess-badge { font-size: .68rem; font-weight: 700; padding: .2rem .5rem; border-radius: 2rem; white-space: nowrap; }
  .sb-done    { background: rgba(14,165,233,.12);  color: #0ea5e9; }
  .sb-force   { background: rgba(245,158,11,.12);  color: #ca8a04; }
  .sb-active  { background: rgba(22,163,74,.12);   color: #16a34a; }
  .sb-flagged { background: rgba(220,38,38,.12);   color: #dc2626; }
  .sb-none    { background: rgba(156,163,175,.12); color: #9ca3af; }

  /* Flagged list */
  .flagged-list { display: flex; flex-direction: column; gap: .625rem; }
  .flagged-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .75rem; overflow: hidden; }
  .flagged-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem; width: 100%; background: none; border: none; cursor: pointer; font-family: inherit; text-align: left; transition: background .1s; }
  .flagged-header:hover { background: var(--color-surface-hover); }
  .fh-left { display: flex; flex-direction: column; gap: .2rem; }
  .fh-name { font-size: .88rem; font-weight: 700; color: var(--color-text); }
  .fh-meta { font-size: .72rem; color: var(--color-muted); }
  .fh-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
  .violation-count-badge { font-size: .7rem; font-weight: 800; padding: .2rem .5rem; border-radius: 2rem; background: rgba(220,38,38,.1); color: #dc2626; }

  /* Violation log */
  .violation-log { border-top: 1px solid var(--color-border); padding: .75rem 1.25rem; display: flex; flex-direction: column; gap: .5rem; background: var(--color-bg); }
  .vlog-row { display: flex; align-items: flex-start; gap: .75rem; }
  .vlog-dot { width: 6px; height: 6px; border-radius: 50%; background: #dc2626; flex-shrink: 0; margin-top: .35rem; }
  .vlog-content { flex: 1; display: flex; flex-wrap: wrap; gap: .375rem; align-items: center; }
  .vlog-type   { font-size: .8rem; font-weight: 700; color: var(--color-text); }
  .vlog-action { font-size: .75rem; color: #f59e0b; font-weight: 600; }
  .vlog-note   { font-size: .73rem; color: var(--color-muted); font-style: italic; }
  .vlog-time   { font-size: .7rem; color: var(--color-muted); white-space: nowrap; flex-shrink: 0; }

  /* Empty state */
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: .875rem; padding: 4rem; color: var(--color-muted); text-align: center; }
  .empty-state p { font-size: .9rem; }

  @media (max-width: 768px) {
    .two-col { grid-template-columns: 1fr; }
    .sess-table th:nth-child(n+5), .sess-table td:nth-child(n+5) { display: none; }
  }
</style>