<!-- src/routes/invigilator/monitor/[examId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { PageData } from './$types';
  import LiveStudentCard from '$lib/components/dashboard/LiveStudentCard.svelte';
  import ViolationDrawer from '$lib/components/dashboard/ViolationDrawer.svelte';
  import {
    Search, X, Users, Activity, CheckCircle,
    AlertTriangle, ShieldAlert, RefreshCw, Filter
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exam } = data;

  // ── State ─────────────────────────────────────────────────────────
  let sessions     = $state(data.sessions ?? []);
  let search       = $state('');
  let filterStatus = $state('all');
  let drawerOpen   = $state(false);
  let selected     = $state<string | null>(null);
  let violations   = $state<Record<string, any[]>>({});
  let ws: WebSocket | null = null;
  let wsConnected  = $state(false);
  let lastUpdated  = $state<Date>(new Date());

  // ── Derived ───────────────────────────────────────────────────────
  const filtered = $derived(sessions.filter((s: any) => {
    const q = search.toLowerCase();
    const matchSearch =
      (s.student_name ?? '').toLowerCase().includes(q) ||
      (s.matric_number ?? '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  }));

  const stats = $derived({
    total:      sessions.length,
    inProgress: sessions.filter((s: any) => s.status === 'in_progress').length,
    submitted:  sessions.filter((s: any) => s.status === 'submitted' || s.status === 'force_submitted').length,
    flagged:    sessions.filter((s: any) => s.status === 'flagged').length,
    notStarted: sessions.filter((s: any) => s.status === 'not_started').length,
    violations: sessions.reduce((sum: number, s: any) => sum + (s.violation_count ?? 0), 0),
  });

  const selectedSession = $derived(
    selected ? sessions.find((s: any) => s.session_id === selected) : null
  );

  const FILTERS = [
    { value: 'all',             label: 'All',         count: () => stats.total      },
    { value: 'in_progress',     label: 'Active',      count: () => stats.inProgress  },
    { value: 'flagged',         label: 'Paused',      count: () => stats.flagged     },
    { value: 'submitted',       label: 'Submitted',   count: () => stats.submitted   },
    { value: 'not_started',     label: 'Not Started', count: () => stats.notStarted  },
  ];

  // ── WebSocket ─────────────────────────────────────────────────────
  function connectWs() {
    try {
      ws = new WebSocket('ws://localhost:3001');

      ws.onopen = () => {
        wsConnected = true;
        ws!.send(JSON.stringify({ type: 'join_exam', exam_id: exam.id, role: 'invigilator' }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          lastUpdated = new Date();

          if (msg.type === 'violation') {
            sessions = sessions.map((s: any) =>
              s.session_id === msg.session_id
                ? { ...s, violation_count: msg.violation_count, total_flags: (s.total_flags ?? 0) + 1 }
                : s
            );
            if (selected === msg.session_id) {
              violations = {
                ...violations,
                [msg.session_id]: [
                  { id: crypto.randomUUID(), flagType: msg.flag_type, actionTaken: msg.action,
                    note: null, flaggedAt: new Date().toISOString() },
                  ...(violations[msg.session_id] ?? []),
                ],
              };
            }
          }

          if (msg.type === 'student_status') {
            sessions = sessions.map((s: any) =>
              s.session_id === msg.session_id ? { ...s, status: msg.status } : s
            );
          }
        } catch { /* malformed frame */ }
      };

      ws.onclose  = () => { wsConnected = false; setTimeout(connectWs, 3000); };
      ws.onerror  = () => { wsConnected = false; };
    } catch { /* WebSocket unavailable in SSR */ }
  }

  // ── Invigilator actions ───────────────────────────────────────────
  async function pauseSession(sessionId: string) {
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, action: 'pause' }),
    });
    sessions = sessions.map((s: any) =>
      s.session_id === sessionId ? { ...s, status: 'flagged' } : s
    );
  }

  async function resumeSession(sessionId: string) {
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, action: 'resume' }),
    });
    sessions = sessions.map((s: any) =>
      s.session_id === sessionId ? { ...s, status: 'in_progress' } : s
    );
  }

  async function forceSubmit(sessionId: string) {
    if (!confirm('Force submit this student\'s exam? This cannot be undone.')) return;
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, action: 'force_submit' }),
    });
    sessions = sessions.map((s: any) =>
      s.session_id === sessionId ? { ...s, status: 'force_submitted' } : s
    );
  }

  async function openDrawer(sessionId: string) {
    selected = sessionId;
    drawerOpen = true;

    if (!violations[sessionId]) {
      const res = await fetch(`/api/invigilator/session?session_id=${sessionId}&type=violations`);
      const json = await res.json();
      violations = { ...violations, [sessionId]: json.violations ?? [] };
    }
  }

  function closeDrawer() {
    drawerOpen = false;
    // Small delay so the drawer closes before clearing selected
    setTimeout(() => { selected = null; }, 250);
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  onMount(() => connectWs());
  onDestroy(() => ws?.close());
</script>

<svelte:head><title>Monitor — {exam.title}</title></svelte:head>

<div class="monitor-page">

  <!-- ── Header bar ───────────────────────────────────────────────── -->
  <header class="monitor-header">
    <div class="header-left">
      <div class="exam-info">
        <div class="exam-badge">{exam.course?.code ?? '—'}</div>
        <div>
          <h1 class="exam-title">{exam.title}</h1>
          <p class="exam-meta">
            Live Monitoring
            <span class="ws-pill" class:connected={wsConnected}>
              <span class="ws-dot"></span>
              {wsConnected ? 'Connected' : 'Reconnecting…'}
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="header-kpis">
      <div class="kpi">
        <div class="kpi-icon total"><Users size={14} /></div>
        <div class="kpi-body">
          <span class="kpi-val">{stats.total}</span>
          <span class="kpi-lbl">Total</span>
        </div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi">
        <div class="kpi-icon active"><Activity size={14} /></div>
        <div class="kpi-body">
          <span class="kpi-val green">{stats.inProgress}</span>
          <span class="kpi-lbl">Active</span>
        </div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi">
        <div class="kpi-icon done"><CheckCircle size={14} /></div>
        <div class="kpi-body">
          <span class="kpi-val blue">{stats.submitted}</span>
          <span class="kpi-lbl">Done</span>
        </div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi">
        <div class="kpi-icon paused"><AlertTriangle size={14} /></div>
        <div class="kpi-body">
          <span class="kpi-val amber">{stats.flagged}</span>
          <span class="kpi-lbl">Paused</span>
        </div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi">
        <div class="kpi-icon violations"><ShieldAlert size={14} /></div>
        <div class="kpi-body">
          <span class="kpi-val red">{stats.violations}</span>
          <span class="kpi-lbl">Violations</span>
        </div>
      </div>
    </div>
  </header>

  <!-- ── Filter bar ───────────────────────────────────────────────── -->
  <div class="filter-bar">
    <div class="search-wrap">
      <Search size={14} class="search-icon" />
      <input
        class="search-input"
        type="search"
        placeholder="Search name or matric…"
        bind:value={search}
      />
      {#if search}
        <button class="search-clear" onclick={() => search = ''} type="button">
          <X size={12} />
        </button>
      {/if}
    </div>

    <div class="filter-tabs" role="tablist">
      {#each FILTERS as f}
        {@const cnt = f.count()}
        <button
          class="filter-tab"
          class:active={filterStatus === f.value}
          onclick={() => filterStatus = f.value}
          role="tab"
          aria-selected={filterStatus === f.value}
          type="button"
        >
          {f.label}
          {#if cnt > 0}
            <span class="tab-count" class:live={f.value === 'in_progress' && cnt > 0}>{cnt}</span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="filter-right">
      <span class="result-count">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
      <span class="updated-at">Updated {formatTime(lastUpdated)}</span>
    </div>
  </div>

  <!-- ── Sessions grid ────────────────────────────────────────────── -->
  <div class="sessions-area">
    {#if filtered.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          {#if search}
            <Search size={28} strokeWidth={1.2} />
          {:else}
            <Users size={28} strokeWidth={1.2} />
          {/if}
        </div>
        <p class="empty-title">
          {search ? `No results for "${search}"` : 'No students in this category'}
        </p>
        {#if search}
          <button class="clear-btn" onclick={() => search = ''} type="button">Clear search</button>
        {/if}
      </div>
    {:else}
      <div class="sessions-grid">
        {#each filtered as s (s.session_id)}
          <LiveStudentCard
            sessionId={s.session_id}
            studentName={s.student_name}
            matricNumber={s.matric_number}
            department={s.department}
            status={s.status}
            violationCount={s.violation_count}
            totalFlags={s.total_flags}
            maxViolations={exam.maxViolations}
            timeRemainingSecs={s.time_remaining_secs}
            onPause={pauseSession}
            onResume={resumeSession}
            onForceSubmit={forceSubmit}
            onClick={openDrawer}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- ── Violation drawer ──────────────────────────────────────────── -->
{#if selected && selectedSession}
  <ViolationDrawer
    sessionId={selected}
    studentName={selectedSession.student_name}
    bind:open={drawerOpen}
  />
{/if}

<style>
  /* ── Page shell ───────────────────────────────────────────────── */
  .monitor-page {
    display: flex; flex-direction: column;
    height: calc(100vh - 52px);   /* subtract topbar */
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

  .header-left { min-width: 0; }

  .exam-info { display: flex; align-items: flex-start; gap: 0.75rem; }

  .exam-badge {
    padding: 0.25rem 0.6rem; border-radius: 0.45rem; flex-shrink: 0;
    background: rgba(217,119,6,0.1); color: #d97706;
    font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em;
    margin-top: 2px;
  }

  .exam-title {
    font-size: 1rem; font-weight: 800; color: var(--color-text);
    margin: 0 0 0.2rem; letter-spacing: -0.02em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 340px;
  }

  .exam-meta {
    display: flex; align-items: center; gap: 0.625rem;
    font-size: 0.75rem; color: var(--color-muted); margin: 0;
  }

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

  /* KPI strip */
  .header-kpis {
    display: flex; align-items: center; gap: 0;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden; flex-shrink: 0;
  }

  .kpi {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.6rem 1rem;
  }

  .kpi-icon {
    width: 28px; height: 28px; border-radius: 0.4rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .kpi-icon.total      { background: rgba(100,116,139,0.1); color: #64748b; }
  .kpi-icon.active     { background: rgba(34,197,94,0.1);   color: #16a34a; }
  .kpi-icon.done       { background: rgba(59,130,246,0.1);  color: #2563eb; }
  .kpi-icon.paused     { background: rgba(245,158,11,0.1);  color: #d97706; }
  .kpi-icon.violations { background: rgba(220,38,38,0.08);  color: #dc2626; }

  .kpi-body { display: flex; flex-direction: column; gap: 0; }
  .kpi-val  {
    font-size: 1.1rem; font-weight: 900; line-height: 1;
    color: var(--color-text); font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .kpi-val.green { color: #16a34a; }
  .kpi-val.blue  { color: #2563eb; }
  .kpi-val.amber { color: #d97706; }
  .kpi-val.red   { color: #dc2626; }
  .kpi-lbl {
    font-size: 0.6rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  .kpi-divider { width: 1px; height: 32px; background: var(--color-border); flex-shrink: 0; }

  /* ── Filter bar ───────────────────────────────────────────────── */
  .filter-bar {
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
    padding: 0.4rem 0.625rem 0.4rem 2rem;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.8rem; width: 220px; outline: none;
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: #d97706; }
  .search-clear {
    position: absolute; right: 0.5rem;
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: 0.15rem;
    border-radius: 0.25rem; display: flex; align-items: center;
  }
  .search-clear:hover { color: var(--color-text); }

  .filter-tabs { display: flex; gap: 0.3rem; flex-wrap: wrap; }

  .filter-tab {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--color-border); border-radius: 999px;
    background: none; color: var(--color-muted);
    font-size: 0.73rem; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: all 0.15s; white-space: nowrap;
  }
  .filter-tab:hover { border-color: #d97706; color: #d97706; }
  .filter-tab.active {
    background: #d97706; border-color: #d97706; color: white;
  }

  .tab-count {
    background: rgba(0,0,0,0.12); color: inherit;
    font-size: 0.6rem; font-weight: 800; padding: 0.05rem 0.35rem;
    border-radius: 999px; line-height: 1.5;
  }
  .filter-tab.active .tab-count { background: rgba(255,255,255,0.25); }
  .tab-count.live { background: rgba(34,197,94,0.2); color: #16a34a; animation: blink 1.5s step-end infinite; }
  @keyframes blink { 50% { opacity: 0.4; } }

  .filter-right {
    margin-left: auto; display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;
  }
  .result-count { font-size: 0.72rem; font-weight: 600; color: var(--color-muted); }
  .updated-at   { font-size: 0.68rem; color: var(--color-muted); opacity: 0.7; }

  /* ── Sessions area ────────────────────────────────────────────── */
  .sessions-area {
    flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem;
  }
  .sessions-area::-webkit-scrollbar { width: 5px; }
  .sessions-area::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }

  .sessions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
    align-content: start;
  }

  /* ── Empty state ──────────────────────────────────────────────── */
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
  .clear-btn:hover { border-color: #d97706; color: #d97706; }

  /* ── Responsive ───────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .header-kpis { display: none; }
    .monitor-header { flex-direction: column; align-items: flex-start; }
    .exam-title { max-width: 100%; }
    .filter-right { display: none; }
    .sessions-grid { grid-template-columns: 1fr; }
  }
</style>