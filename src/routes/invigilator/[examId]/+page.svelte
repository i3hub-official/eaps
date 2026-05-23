<!-- src/routes/(invigilator)/monitor/[examId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { PageData } from './$types';
  import LiveStudentCard from '$lib/components/dashboard/LiveStudentCard.svelte';
  import ViolationDrawer from '$lib/components/dashboard/ViolationDrawer.svelte';
  import FlagBadge from '$lib/components/dashboard/FlagBadge.svelte';

  let { data }: { data: PageData } = $props();
  const { exam } = data;

  // ── State ──────────────────────────────────────────────────────────────────
  let sessions     = $state(data.sessions);
  let search       = $state('');
  let filterStatus = $state('all');
  let selected     = $state<string | null>(null);
  let violations   = $state<Record<string, any[]>>({});
  let drawerStatus = $state('');
  let ws: WebSocket | null = null;

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = $derived(sessions.filter(s => {
    const matchSearch =
      s.student_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.matric_number ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  }));

  const stats = $derived({
    total:      sessions.length,
    inProgress: sessions.filter(s => s.status === 'in_progress').length,
    submitted:  sessions.filter(s => s.status === 'submitted' || s.status === 'force_submitted').length,
    flagged:    sessions.filter(s => s.status === 'flagged').length,
    violations: sessions.reduce((sum, s) => sum + s.violation_count, 0),
  });

  const selectedSession = $derived(sessions.find(s => s.session_id === selected));

  // ── WebSocket ──────────────────────────────────────────────────────────────
  function connectWs() {
    ws = new WebSocket('ws://localhost:3001');

    ws.onopen = () => {
      ws!.send(JSON.stringify({ type: 'join_exam', exam_id: exam.id, role: 'invigilator' }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'violation') {
          // Update violation count on the session card
          sessions = sessions.map(s =>
            s.session_id === msg.session_id
              ? { ...s, violation_count: msg.violation_count, total_flags: s.total_flags + 1 }
              : s
          );
          // Append to drawer if open
          if (selected === msg.session_id) {
            violations[msg.session_id] = [
              { id: crypto.randomUUID(), flagType: msg.flag_type, actionTaken: msg.action,
                note: null, flaggedAt: new Date().toISOString() },
              ...(violations[msg.session_id] ?? []),
            ];
          }
        }

        if (msg.type === 'student_status') {
          sessions = sessions.map(s =>
            s.session_id === msg.session_id ? { ...s, status: msg.status } : s
          );
          if (selected === msg.session_id) drawerStatus = msg.status;
        }
      } catch {}
    };

    ws.onclose = () => setTimeout(connectWs, 3000);
  }

  // ── Invigilator actions ────────────────────────────────────────────────────
  async function pauseSession(sessionId: string) {
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, action: 'pause' }),
    });
    sessions = sessions.map(s => s.session_id === sessionId ? { ...s, status: 'flagged' } : s);
  }

  async function resumeSession(sessionId: string) {
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, action: 'resume' }),
    });
    sessions = sessions.map(s => s.session_id === sessionId ? { ...s, status: 'in_progress' } : s);
  }

  async function forceSubmit(sessionId: string) {
    if (!confirm('Force submit this student\'s exam?')) return;
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, action: 'force_submit' }),
    });
    sessions = sessions.map(s =>
      s.session_id === sessionId ? { ...s, status: 'force_submitted' } : s
    );
  }

  async function openDrawer(sessionId: string) {
    selected = sessionId;
    drawerStatus = sessions.find(s => s.session_id === sessionId)?.status ?? '';

    if (!violations[sessionId]) {
      const res = await fetch(`/api/invigilator/session?session_id=${sessionId}&type=violations`);
      const data = await res.json();
      violations[sessionId] = data.violations ?? [];
    }
  }

  onMount(() => connectWs());
  onDestroy(() => ws?.close());
</script>

<svelte:head><title>Monitor — {exam.title}</title></svelte:head>

<div class="monitor-page">
  <!-- ── Header ── -->
  <header class="monitor-header">
    <div class="header-left">
      <h1 class="exam-title">{exam.title}</h1>
      <p class="exam-meta">{exam.course?.code} · Live Monitoring</p>
    </div>
    <div class="header-stats">
      <div class="hstat">
        <span class="hval">{stats.total}</span>
        <span class="hlbl">Total</span>
      </div>
      <div class="hstat green">
        <span class="hval">{stats.inProgress}</span>
        <span class="hlbl">Active</span>
      </div>
      <div class="hstat blue">
        <span class="hval">{stats.submitted}</span>
        <span class="hlbl">Done</span>
      </div>
      <div class="hstat orange">
        <span class="hval">{stats.flagged}</span>
        <span class="hlbl">Paused</span>
      </div>
      <div class="hstat red">
        <span class="hval">{stats.violations}</span>
        <span class="hlbl">Violations</span>
      </div>
    </div>
  </header>

  <!-- ── Filters ── -->
  <div class="filters">
    <input
      class="search"
      type="search"
      placeholder="Search by name or matric…"
      bind:value={search}
    />
    <div class="filter-tabs" role="tablist">
      {#each ['all','in_progress','flagged','submitted','force_submitted','not_started'] as s}
        <button
          class="tab"
          class:active={filterStatus === s}
          onclick={() => { filterStatus = s; }}
          role="tab"
          aria-selected={filterStatus === s}
          type="button"
        >
          {s === 'all' ? 'All' :
           s === 'in_progress' ? 'Active' :
           s === 'flagged' ? 'Paused' :
           s === 'submitted' ? 'Submitted' :
           s === 'force_submitted' ? 'Force Sub.' : 'Not Started'}
        </button>
      {/each}
    </div>
  </div>

  <!-- ── Grid ── -->
  <div class="sessions-grid">
    {#if filtered.length === 0}
      <div class="empty">No students match this filter.</div>
    {:else}
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
    {/if}
  </div>
</div>

<!-- ── Violation drawer ── -->
{#if selected && selectedSession}
  <ViolationDrawer
    studentName={selectedSession.student_name}
    matricNumber={selectedSession.matric_number}
    violations={violations[selected] ?? []}
    status={drawerStatus || selectedSession.status}
    onClose={() => { selected = null; }}
    onPause={() => pauseSession(selected!)}
    onResume={() => resumeSession(selected!)}
    onForceSubmit={() => forceSubmit(selected!)}
  />
{/if}

<style>
  .monitor-page {
    display: flex; flex-direction: column;
    height: 100vh; overflow: hidden;
    background: var(--color-bg);
  }

  /* ── Header ── */
  .monitor-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1rem 1.5rem; gap: 1rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .exam-title { font-size: 1.1rem; font-weight: 700; margin: 0; }
  .exam-meta  { font-size: 0.8rem; color: var(--color-muted); margin: 0.15rem 0 0; }

  .header-stats { display: flex; gap: 1.5rem; }
  .hstat  { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
  .hval   { font-size: 1.4rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .hlbl   { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
  .hstat.green  .hval { color: #16a34a; }
  .hstat.blue   .hval { color: #1d4ed8; }
  .hstat.orange .hval { color: #c2410c; }
  .hstat.red    .hval { color: #dc2626; }

  /* ── Filters ── */
  .filters {
    display: flex; align-items: center; gap: 1rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0; flex-wrap: wrap;
  }

  .search {
    padding: 0.45rem 0.9rem; border: 1px solid var(--color-border);
    border-radius: 0.5rem; background: var(--color-bg);
    color: var(--color-text); font-size: 0.875rem;
    width: 240px; outline: none;
  }
  .search:focus { border-color: var(--color-primary); }

  .filter-tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .tab {
    padding: 0.35rem 0.75rem; border: 1px solid var(--color-border);
    border-radius: 999px; background: none; color: var(--color-muted);
    font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
  }
  .tab:hover  { border-color: var(--color-primary); color: var(--color-primary); }
  .tab.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

  /* ── Grid ── */
  .sessions-grid {
    flex: 1; overflow-y: auto;
    padding: 1.25rem 1.5rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
    align-content: start;
  }

  .empty {
    grid-column: 1/-1; text-align: center;
    color: var(--color-muted); padding: 4rem 0;
  }
</style>