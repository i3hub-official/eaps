<!-- src/routes/invigilator/monitor/[examId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { PageData } from './$types';
  import {
    Search, X, Users, Activity, CheckCircle, Clock,
    AlertTriangle, ShieldAlert, RefreshCw, Filter,
    Play, Pause, Eye, GraduationCap, Building2,
    ArrowUpDown, ChevronDown, UserX, UserCheck,
    Timer, BarChart3, TrendingUp, Award
  } from 'lucide-svelte';
  import { fly, slide } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { exam } = data;

  // ── State ─────────────────────────────────────────────────────────
  let students     = $state(data.students ?? []);
  let search       = $state('');
  let statusFilter = $state<'all' | 'not_started' | 'in_progress' | 'submitted' | 'force_submitted' | 'flagged'>('all');
  let sortBy       = $state<'name' | 'matric' | 'status' | 'score' | 'violations'>('name');
  let sortDir      = $state<'asc' | 'desc'>('asc');
  let selectedStudent = $state<string | null>(null);
  let ws: WebSocket | null = null;
  let wsConnected  = $state(false);
  let lastUpdated  = $state<Date>(new Date());

  // ── Derived filtering & sorting ───────────────────────────────────
  const filtered = $derived(() => {
    let list = students;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.fullName ?? '').toLowerCase().includes(q) ||
        (s.matricNumber ?? '').toLowerCase().includes(q) ||
        (s.department?.name ?? '').toLowerCase().includes(q) ||
        (s.department?.code ?? '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(s => s.status === statusFilter);
    }

    // Sorting
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = (a.fullName ?? '').localeCompare(b.fullName ?? '');
          break;
        case 'matric':
          cmp = (a.matricNumber ?? '').localeCompare(b.matricNumber ?? '');
          break;
        case 'status': {
          const order = { not_started: 0, in_progress: 1, flagged: 2, submitted: 3, force_submitted: 4 };
          cmp = (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0);
          break;
        }
        case 'score':
          cmp = (a.percentage ?? 0) - (b.percentage ?? 0);
          break;
        case 'violations':
          cmp = (a.violationCount ?? 0) - (b.violationCount ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  });

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = $derived(() => {
    const total = students.length;
    const notStarted = students.filter(s => s.status === 'not_started').length;
    const inProgress = students.filter(s => s.status === 'in_progress').length;
    const submitted = students.filter(s => s.status === 'submitted' || s.status === 'force_submitted').length;
    const flagged = students.filter(s => s.status === 'flagged').length;
    const tookExam = students.filter(s => s.status !== 'not_started').length;
    const didntTake = notStarted;
    const avgScore = students.filter(s => s.percentage != null).reduce((sum, s) => sum + (s.percentage ?? 0), 0) / (submitted || 1);
    const totalViolations = students.reduce((sum, s) => sum + (s.violationCount ?? 0), 0);

    return { total, notStarted, inProgress, submitted, flagged, tookExam, didntTake, avgScore, totalViolations };
  });

  // ── Status helpers ──────────────────────────────────────────────
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    not_started:     { label: 'Not Started',     color: '#64748b', bg: 'rgba(100,116,139,0.08)',  icon: Clock },
    in_progress:     { label: 'In Progress',     color: '#16a34a', bg: 'rgba(22,163,74,0.08)',    icon: Play },
    flagged:         { label: 'Paused',          color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   icon: Pause },
    submitted:       { label: 'Submitted',       color: '#2563eb', bg: 'rgba(37,99,235,0.08)',    icon: CheckCircle },
    force_submitted: { label: 'Force Submitted', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',    icon: ShieldAlert },
  };

  function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
  }

  // ── WebSocket ─────────────────────────────────────────────────────
  function connectWs() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        wsConnected = true;
        ws?.send(JSON.stringify({ type: 'join_exam', examId: exam.id, role: 'invigilator' }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          lastUpdated = new Date();

          if (msg.type === 'student_status') {
            students = students.map(s =>
              s.studentId === msg.studentId ? { ...s, status: msg.status } : s
            );
          }

          if (msg.type === 'violation') {
            students = students.map(s =>
              s.studentId === msg.studentId
                ? { ...s, violationCount: msg.violationCount }
                : s
            );
          }

          if (msg.type === 'exam_submitted') {
            students = students.map(s =>
              s.studentId === msg.studentId
                ? { ...s, status: 'submitted', submittedAt: msg.submittedAt, score: msg.score, percentage: msg.percentage }
                : s
            );
          }
        } catch { /* malformed frame */ }
      };

      ws.onclose = () => { wsConnected = false; setTimeout(connectWs, 3000); };
      ws.onerror = () => { wsConnected = false; };
    } catch { /* WebSocket unavailable */ }
  }

  // ── Invigilator actions ───────────────────────────────────────────
  async function pauseStudent(studentId: string) {
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, examId: exam.id, action: 'pause' }),
    });
    students = students.map(s => s.studentId === studentId ? { ...s, status: 'flagged' } : s);
  }

  async function resumeStudent(studentId: string) {
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, examId: exam.id, action: 'resume' }),
    });
    students = students.map(s => s.studentId === studentId ? { ...s, status: 'in_progress' } : s);
  }

  async function forceSubmitStudent(studentId: string) {
    if (!confirm('Force submit this student\'s exam? This cannot be undone.')) return;
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, examId: exam.id, action: 'force_submit' }),
    });
    students = students.map(s => s.studentId === studentId ? { ...s, status: 'force_submitted' } : s);
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortDir = 'asc';
    }
  }

  function formatDuration(secs: number | null) {
    if (secs == null) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  function formatTime(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  onMount(() => connectWs());
  onDestroy(() => ws?.close());
</script>

<svelte:head><title>Monitor — {exam.title}</title></svelte:head>

<div class="monitor-page">

  <!-- ══ HEADER ════════════════════════════════════════════════════ -->
  <header class="monitor-header">
    <div class="header-left">
      <div class="exam-badge">{exam.course?.code ?? '—'}</div>
      <div>
        <h1 class="exam-title">{exam.title}</h1>
        <p class="exam-meta">
          <span class="meta-item"><Building2 size={12} /> {exam.course?.title ?? '—'}</span>
          <span class="meta-item"><Clock size={12} /> {exam.durationMinutes} min</span>
          <span class="ws-pill" class:connected={wsConnected}>
            <span class="ws-dot"></span>
            {wsConnected ? 'Live' : 'Reconnecting…'}
          </span>
        </p>
      </div>
    </div>
  </header>

  <!-- ══ KPI CARDS ═══════════════════════════════════════════════════ -->
  <div class="kpi-section">
    <div class="kpi-card total">
      <div class="kpi-icon"><Users size={18} /></div>
      <div class="kpi-body">
        <span class="kpi-val">{stats().total}</span>
        <span class="kpi-lbl">Total Registered</span>
      </div>
    </div>
    <div class="kpi-card active">
      <div class="kpi-icon"><Activity size={18} /></div>
      <div class="kpi-body">
        <span class="kpi-val">{stats().inProgress}</span>
        <span class="kpi-lbl">In Progress</span>
      </div>
    </div>
    <div class="kpi-card done">
      <div class="kpi-icon"><CheckCircle size={18} /></div>
      <div class="kpi-body">
        <span class="kpi-val">{stats().submitted}</span>
        <span class="kpi-lbl">Submitted</span>
      </div>
    </div>
    <div class="kpi-card paused">
      <div class="kpi-icon"><AlertTriangle size={18} /></div>
      <div class="kpi-body">
        <span class="kpi-val">{stats().flagged}</span>
        <span class="kpi-lbl">Paused</span>
      </div>
    </div>
    <div class="kpi-card not-started">
      <div class="kpi-icon"><Clock size={18} /></div>
      <div class="kpi-body">
        <span class="kpi-val">{stats().notStarted}</span>
        <span class="kpi-lbl">Not Started</span>
      </div>
    </div>
    <div class="kpi-card violations">
      <div class="kpi-icon"><ShieldAlert size={18} /></div>
      <div class="kpi-body">
        <span class="kpi-val">{stats().totalViolations}</span>
        <span class="kpi-lbl">Violations</span>
      </div>
    </div>
    <div class="kpi-card avg">
      <div class="kpi-icon"><TrendingUp size={18} /></div>
      <div class="kpi-body">
        <span class="kpi-val">{stats().avgScore.toFixed(1)}%</span>
        <span class="kpi-lbl">Avg Score</span>
      </div>
    </div>
  </div>

  <!-- ══ TOOLBAR ═══════════════════════════════════════════════════ -->
  <div class="toolbar">
    <div class="search-wrap">
      <Search size={14} class="search-icon" />
      <input
        class="search-input"
        type="search"
        placeholder="Search name, matric, or department…"
        bind:value={search}
      />
      {#if search}
        <button class="search-clear" onclick={() => search = ''} type="button">
          <X size={12} />
        </button>
      {/if}
    </div>

    <div class="filter-chips">
      <button
        class="filter-chip"
        class:active={statusFilter === 'all'}
        onclick={() => statusFilter = 'all'}
      >
        All <span class="chip-count">{stats().total}</span>
      </button>
      <button
        class="filter-chip"
        class:active={statusFilter === 'not_started'}
        onclick={() => statusFilter = 'not_started'}
      >
        <Clock size={12} /> Not Started <span class="chip-count">{stats().notStarted}</span>
      </button>
      <button
        class="filter-chip"
        class:active={statusFilter === 'in_progress'}
        onclick={() => statusFilter = 'in_progress'}
      >
        <Play size={12} /> In Progress <span class="chip-count">{stats().inProgress}</span>
      </button>
      <button
        class="filter-chip"
        class:active={statusFilter === 'flagged'}
        onclick={() => statusFilter = 'flagged'}
      >
        <Pause size={12} /> Paused <span class="chip-count">{stats().flagged}</span>
      </button>
      <button
        class="filter-chip"
        class:active={statusFilter === 'submitted'}
        onclick={() => statusFilter = 'submitted'}
      >
        <CheckCircle size={12} /> Submitted <span class="chip-count">{stats().submitted}</span>
      </button>
    </div>

    <div class="toolbar-right">
      <span class="result-count">{filtered().length} of {stats().total} students</span>
      <span class="updated-at">Updated {formatTime(lastUpdated)}</span>
    </div>
  </div>

  <!-- ══ SUMMARY BAR ═══════════════════════════════════════════════ -->
  <div class="summary-bar">
    <div class="summary-item">
      <UserCheck size={14} class="summary-icon ok" />
      <span class="summary-val">{stats().tookExam}</span>
      <span class="summary-lbl">Took exam</span>
    </div>
    <div class="summary-divider"></div>
    <div class="summary-item">
      <UserX size={14} class="summary-icon bad" />
      <span class="summary-val">{stats().didntTake}</span>
      <span class="summary-lbl">Did not take</span>
    </div>
    <div class="summary-divider"></div>
    <div class="summary-item">
      <Award size={14} class="summary-icon" />
      <span class="summary-val">{stats().avgScore.toFixed(1)}%</span>
      <span class="summary-lbl">Average</span>
    </div>
  </div>

  <!-- ══ STUDENTS TABLE ══════════════════════════════════════════════ -->
  <div class="table-container">
    <table class="students-table">
      <thead>
        <tr>
          <th class="th-student" onclick={() => toggleSort('name')}>
            Student <ArrowUpDown size={12} class={sortBy === 'name' ? 'sort-active' : ''} />
          </th>
          <th class="th-matric" onclick={() => toggleSort('matric')}>
            Matric <ArrowUpDown size={12} class={sortBy === 'matric' ? 'sort-active' : ''} />
          </th>
          <th class="th-dept">Department</th>
          <th class="th-level">Level</th>
          <th class="th-status" onclick={() => toggleSort('status')}>
            Status <ArrowUpDown size={12} class={sortBy === 'status' ? 'sort-active' : ''} />
          </th>
          <th class="th-time">Time</th>
          <th class="th-score" onclick={() => toggleSort('score')}>
            Score <ArrowUpDown size={12} class={sortBy === 'score' ? 'sort-active' : ''} />
          </th>
          <th class="th-violations" onclick={() => toggleSort('violations')}>
            <ShieldAlert size={12} /> <ArrowUpDown size={12} class={sortBy === 'violations' ? 'sort-active' : ''} />
          </th>
          <th class="th-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered() as student (student.studentId)}
          {@const status = getStatusConfig(student.status)}
          {@const StatusIcon = status.icon}
          <tr class="student-row" class:selected={selectedStudent === student.studentId}>
            <td class="td-student">
              <div class="student-cell">
                <div class="avatar">
                  {#if student.photoUrl}
                    <img src={student.photoUrl} alt="" />
                  {:else}
                    <span class="avatar-fallback">{(student.fullName ?? '?').charAt(0)}</span>
                  {/if}
                </div>
                <div class="student-info">
                  <span class="student-name">{student.fullName ?? '—'}</span>
                  <span class="student-email">{student.email ?? '—'}</span>
                </div>
              </div>
            </td>
            <td class="td-matric">
              <span class="matric-pill">{student.matricNumber ?? '—'}</span>
            </td>
            <td class="td-dept">
              <span class="dept-text">{student.department?.name ?? '—'}</span>
              <span class="dept-code">{student.department?.code ?? ''}</span>
            </td>
            <td class="td-level">
              <span class="level-pill">{student.level?.level ?? '—'}L</span>
            </td>
            <td class="td-status">
              <span class="status-badge" style="color:{status.color};background:{status.bg}">
                <StatusIcon size={12} />
                {status.label}
              </span>
            </td>
            <td class="td-time">
              {#if student.status === 'in_progress' && student.timeRemainingSecs != null}
                <span class="time-remaining">{formatDuration(student.timeRemainingSecs)} left</span>
              {:else if student.submittedAt}
                <span class="time-submitted">{formatTime(student.submittedAt)}</span>
              {:else if student.startedAt}
                <span class="time-started">Started {formatTime(student.startedAt)}</span>
              {:else}
                <span class="time-none">—</span>
              {/if}
            </td>
            <td class="td-score">
              {#if student.percentage != null}
                <div class="score-cell">
                  <span class="score-val" class:pass={student.passed} class:fail={student.passed === false}>
                    {student.percentage}%
                  </span>
                  <span class="score-grade">{student.grade ?? ''}</span>
                </div>
              {:else}
                <span class="score-none">—</span>
              {/if}
            </td>
            <td class="td-violations">
              {#if (student.violationCount ?? 0) > 0}
                <span class="violation-badge">{student.violationCount}</span>
              {:else}
                <span class="violation-zero">0</span>
              {/if}
            </td>
            <td class="td-actions">
              <div class="action-btns">
                {#if student.status === 'in_progress'}
                  <button class="action-btn pause" onclick={() => pauseStudent(student.studentId)} title="Pause">
                    <Pause size={13} />
                  </button>
                  <button class="action-btn force" onclick={() => forceSubmitStudent(student.studentId)} title="Force Submit">
                    <ShieldAlert size={13} />
                  </button>
                {:else if student.status === 'flagged'}
                  <button class="action-btn resume" onclick={() => resumeStudent(student.studentId)} title="Resume">
                    <Play size={13} />
                  </button>
                  <button class="action-btn force" onclick={() => forceSubmitStudent(student.studentId)} title="Force Submit">
                    <ShieldAlert size={13} />
                  </button>
                {:else if student.status === 'not_started'}
                  <span class="action-none">—</span>
                {:else}
                  <button class="action-btn view" onclick={() => selectedStudent = student.studentId} title="View Details">
                    <Eye size={13} />
                  </button>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if filtered().length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <Search size={32} strokeWidth={1.2} />
        </div>
        <p class="empty-title">
          {search ? `No results for "${search}"` : 'No students in this category'}
        </p>
        {#if search}
          <button class="clear-btn" onclick={() => search = ''} type="button">Clear search</button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .monitor-page {
    display: flex; flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg);
  }

  /* ── Header ───────────────────────────────────────────────────── */
  .monitor-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1.5rem; flex-wrap: wrap;
    padding: 0.875rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .header-left { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }

  .exam-badge {
    padding: 0.35rem 0.75rem; border-radius: 0.5rem; flex-shrink: 0;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em;
  }

  .exam-title {
    font-size: 1.1rem; font-weight: 800; color: var(--color-text);
    margin: 0 0 0.15rem; letter-spacing: -0.02em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .exam-meta {
    display: flex; align-items: center; gap: 0.75rem;
    font-size: 0.75rem; color: var(--color-muted); margin: 0;
  }

  .meta-item { display: inline-flex; align-items: center; gap: 0.3rem; }

  .ws-pill {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.65rem; font-weight: 700;
    padding: 0.12rem 0.5rem; border-radius: 999px;
    background: rgba(220,38,38,0.08); color: #dc2626;
    border: 1px solid rgba(220,38,38,0.2);
    transition: all 0.3s;
  }
  .ws-pill.connected {
    background: rgba(34,197,94,0.08); color: #16a34a;
    border-color: rgba(34,197,94,0.25);
  }
  .ws-dot {
    width: 5px; height: 5px; border-radius: 50%; background: currentColor;
  }
  .ws-pill.connected .ws-dot { animation: ws-blink 2s ease-in-out infinite; }
  @keyframes ws-blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }

  /* ── KPI Cards ────────────────────────────────────────────────── */
  .kpi-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.75rem;
    padding: 0.875rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .kpi-card {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    transition: all 0.15s;
  }
  .kpi-card:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }

  .kpi-icon {
    width: 36px; height: 36px; border-radius: 0.5rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .kpi-card.total .kpi-icon       { background: rgba(100,116,139,0.1); color: #64748b; }
  .kpi-card.active .kpi-icon      { background: rgba(22,163,74,0.1); color: #16a34a; }
  .kpi-card.done .kpi-icon        { background: rgba(37,99,235,0.1); color: #2563eb; }
  .kpi-card.paused .kpi-icon      { background: rgba(245,158,11,0.1); color: #d97706; }
  .kpi-card.not-started .kpi-icon { background: rgba(148,163,184,0.1); color: #64748b; }
  .kpi-card.violations .kpi-icon  { background: rgba(220,38,38,0.08); color: #dc2626; }
  .kpi-card.avg .kpi-icon         { background: rgba(139,92,246,0.1); color: #7c3aed; }

  .kpi-body { display: flex; flex-direction: column; gap: 0.05rem; }
  .kpi-val  { font-size: 1.25rem; font-weight: 900; line-height: 1; color: var(--color-text); font-variant-numeric: tabular-nums; }
  .kpi-lbl { font-size: 0.65rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }

  /* ── Toolbar ──────────────────────────────────────────────────── */
  .toolbar {
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    padding: 0.625rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .search-wrap {
    position: relative; display: flex; align-items: center; flex-shrink: 0;
  }
  .search-wrap :global(.search-icon) {
    position: absolute; left: 0.625rem; color: var(--color-muted); pointer-events: none;
  }
  .search-input {
    padding: 0.45rem 0.625rem 0.45rem 2rem;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.8rem; width: 260px; outline: none;
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: #4f46e5; }
  .search-clear {
    position: absolute; right: 0.5rem;
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: 0.15rem;
    border-radius: 0.25rem; display: flex; align-items: center;
  }
  .search-clear:hover { color: var(--color-text); }

  .filter-chips { display: flex; gap: 0.4rem; flex-wrap: wrap; }

  .filter-chip {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--color-border); border-radius: 999px;
    background: none; color: var(--color-muted);
    font-size: 0.75rem; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: all 0.15s; white-space: nowrap;
  }
  .filter-chip:hover { border-color: #4f46e5; color: #4f46e5; }
  .filter-chip.active {
    background: #4f46e5; border-color: #4f46e5; color: white;
  }
  .chip-count {
    background: rgba(0,0,0,0.12); color: inherit;
    font-size: 0.65rem; font-weight: 800; padding: 0.05rem 0.35rem;
    border-radius: 999px; line-height: 1.5;
  }
  .filter-chip.active .chip-count { background: rgba(255,255,255,0.25); }

  .toolbar-right {
    margin-left: auto; display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;
  }
  .result-count { font-size: 0.72rem; font-weight: 600; color: var(--color-muted); }
  .updated-at   { font-size: 0.68rem; color: var(--color-muted); opacity: 0.7; }

  /* ── Summary Bar ──────────────────────────────────────────────── */
  .summary-bar {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.5rem 1.5rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .summary-item {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.78rem; color: var(--color-muted);
  }
  .summary-val { font-weight: 700; color: var(--color-text); }
  .summary-lbl { font-weight: 500; }
  .summary-icon.ok { color: #16a34a; }
  .summary-icon.bad { color: #dc2626; }
  .summary-divider { width: 1px; height: 16px; background: var(--color-border); }

  /* ── Table ────────────────────────────────────────────────────── */
  .table-container {
    flex: 1; overflow: auto;
    padding: 0 1.5rem 1.5rem;
  }
  .table-container::-webkit-scrollbar { width: 6px; height: 6px; }
  .table-container::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }

  .students-table {
    width: 100%; border-collapse: separate; border-spacing: 0;
    font-size: 0.85rem;
  }

  .students-table thead {
    position: sticky; top: 0; z-index: 10;
    background: var(--color-surface);
  }

  .students-table th {
    padding: 0.75rem 1rem;
    text-align: left; font-weight: 700; font-size: 0.72rem;
    color: var(--color-muted); text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 2px solid var(--color-border);
    cursor: pointer; user-select: none;
    transition: color 0.15s;
    white-space: nowrap;
  }
  .students-table th:hover { color: var(--color-text); }
  .students-table th :global(.sort-active) { color: #4f46e5; }

  .students-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .student-row { transition: background 0.1s; }
  .student-row:hover { background: var(--color-surface); }
  .student-row.selected { background: rgba(79,70,229,0.04); }

  /* Student cell */
  .student-cell { display: flex; align-items: center; gap: 0.75rem; }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    overflow: hidden; background: var(--color-border);
    display: flex; align-items: center; justify-content: center;
  }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-fallback {
    font-size: 0.875rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase;
  }
  .student-info { display: flex; flex-direction: column; gap: 0.1rem; }
  .student-name { font-weight: 700; color: var(--color-text); }
  .student-email { font-size: 0.72rem; color: var(--color-muted); }

  /* Matric */
  .matric-pill {
    font-family: monospace; font-size: 0.78rem; font-weight: 700;
    padding: 0.2rem 0.5rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 0.3rem;
    color: var(--color-text);
  }

  /* Dept */
  .dept-text { display: block; font-weight: 600; color: var(--color-text); }
  .dept-code { font-size: 0.72rem; color: var(--color-muted); }

  /* Level */
  .level-pill {
    font-size: 0.72rem; font-weight: 800;
    padding: 0.15rem 0.4rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 0.25rem;
    color: var(--color-muted);
  }

  /* Status */
  .status-badge {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.75rem; font-weight: 700;
    padding: 0.3rem 0.65rem; border-radius: 0.4rem;
    white-space: nowrap;
  }

  /* Time */
  .time-remaining { font-size: 0.78rem; font-weight: 600; color: #16a34a; }
  .time-submitted { font-size: 0.78rem; color: #2563eb; }
  .time-started { font-size: 0.78rem; color: var(--color-muted); }
  .time-none { font-size: 0.78rem; color: var(--color-muted); }

  /* Score */
  .score-cell { display: flex; align-items: center; gap: 0.4rem; }
  .score-val { font-size: 0.875rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .score-val.pass { color: #16a34a; }
  .score-val.fail { color: #dc2626; }
  .score-grade {
    font-size: 0.7rem; font-weight: 800;
    padding: 0.1rem 0.35rem; border-radius: 0.2rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .score-none { font-size: 0.78rem; color: var(--color-muted); }

  /* Violations */
  .violation-badge {
    font-size: 0.75rem; font-weight: 800;
    padding: 0.2rem 0.5rem; border-radius: 0.3rem;
    background: rgba(220,38,38,0.08); color: #dc2626;
    border: 1px solid rgba(220,38,38,0.2);
  }
  .violation-zero { font-size: 0.78rem; color: var(--color-muted); }

  /* Actions */
  .action-btns { display: flex; gap: 0.3rem; }
  .action-btn {
    width: 28px; height: 28px; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; color: var(--color-muted);
  }
  .action-btn:hover { transform: scale(1.05); }
  .action-btn.pause { color: #f59e0b; border-color: rgba(245,158,11,0.3); }
  .action-btn.pause:hover { background: rgba(245,158,11,0.08); }
  .action-btn.resume { color: #16a34a; border-color: rgba(22,163,74,0.3); }
  .action-btn.resume:hover { background: rgba(22,163,74,0.08); }
  .action-btn.force { color: #dc2626; border-color: rgba(220,38,38,0.3); }
  .action-btn.force:hover { background: rgba(220,38,38,0.08); }
  .action-btn.view { color: #4f46e5; border-color: rgba(79,70,229,0.3); }
  .action-btn.view:hover { background: rgba(79,70,229,0.08); }
  .action-none { font-size: 0.78rem; color: var(--color-muted); padding: 0.3rem; }

  /* Empty state */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.75rem; padding: 4rem 2rem; text-align: center;
  }
  .empty-icon {
    width: 60px; height: 60px; border-radius: 1rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted); margin-bottom: 0.25rem;
  }
  .empty-title { font-size: 0.9rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .clear-btn {
    padding: 0.4rem 0.875rem; background: none;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    font-size: 0.78rem; font-weight: 600; color: var(--color-text);
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .clear-btn:hover { border-color: #4f46e5; color: #4f46e5; }

  /* Responsive */
  @media (max-width: 1024px) {
    .kpi-section { grid-template-columns: repeat(4, 1fr); }
    .students-table { font-size: 0.8rem; }
    .students-table th, .students-table td { padding: 0.625rem 0.75rem; }
  }

  @media (max-width: 768px) {
    .monitor-header { flex-direction: column; align-items: flex-start; }
    .exam-title { max-width: 100%; }
    .kpi-section { grid-template-columns: repeat(2, 1fr); }
    .toolbar { flex-direction: column; align-items: stretch; }
    .search-input { width: 100%; }
    .toolbar-right { margin-left: 0; }
    .summary-bar { flex-wrap: wrap; }
    .students-table { display: block; overflow-x: auto; }
    .students-table thead { display: none; }
    .students-table tbody tr { display: block; margin-bottom: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.75rem; }
    .students-table td { display: flex; justify-content: space-between; padding: 0.4rem 0; border: none; }
    .students-table td::before { content: attr(data-label); font-weight: 700; color: var(--color-muted); font-size: 0.72rem; }
  }
</style>