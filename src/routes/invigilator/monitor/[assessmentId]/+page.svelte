<script lang="ts">
  // src/routes/invigilator/monitor/[assessmentId]/+page.svelte
  // Live invigilator monitor — WebSocket-powered grid of all active sessions.
  // Shows per-student: status, answered count, time remaining, violations, online status.

  import { onMount, onDestroy } from 'svelte'
  import { browser } from '$app/environment'

  let { data } = $props()

  const { assessment, staffToken } = data

  type SessionStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'TIMED_OUT' | 'DISQUALIFIED'

  interface LiveSession {
    sessionId: string
    studentId: string
    studentName: string
    matricNumber: string
    status: SessionStatus
    currentQuestion: number
    totalQuestions: number
    timeRemainingSeconds: number | null
    answeredCount: number
    violationCount: number
    lastViolationType: string | null
    isOnline: boolean
    faceVerifiedAt: string | null
    startedAt: string | null
  }

  // ─── State ─────────────────────────────────────────────────────────────────
  let sessions = $state<LiveSession[]>([])
  let wsStatus = $state<'connecting' | 'connected' | 'disconnected'>('connecting')
  let lastUpdate = $state<Date | null>(null)
  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let pingInterval: ReturnType<typeof setInterval> | null = null
  let selectedSession = $state<LiveSession | null>(null)
  let filterStatus = $state<string>('all')
  let sortBy = $state<'name' | 'time' | 'violations' | 'answered'>('name')
  let newViolations = $state<{ sessionId: string; type: string; at: number }[]>([])

  // ─── Derived ───────────────────────────────────────────────────────────────
  const filtered = $derived(() => {
    let list = [...sessions]

    if (filterStatus !== 'all') {
      list = list.filter(s => s.status === filterStatus)
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return a.studentName.localeCompare(b.studentName)
      if (sortBy === 'time') return (a.timeRemainingSeconds ?? 0) - (b.timeRemainingSeconds ?? 0)
      if (sortBy === 'violations') return b.violationCount - a.violationCount
      if (sortBy === 'answered') return b.answeredCount - a.answeredCount
      return 0
    })

    return list
  })

  const stats = $derived(() => ({
    total: sessions.length,
    inProgress: sessions.filter(s => s.status === 'IN_PROGRESS').length,
    submitted: sessions.filter(s => s.status === 'SUBMITTED').length,
    paused: sessions.filter(s => s.status === 'PAUSED').length,
    offline: sessions.filter(s => !s.isOnline && s.status === 'IN_PROGRESS').length,
    violations: sessions.reduce((sum, s) => sum + s.violationCount, 0),
  }))

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  onMount(() => {
    if (browser) connect()
  })

  onDestroy(() => {
    ws?.close()
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (pingInterval) clearInterval(pingInterval)
  })

  function connect() {
    wsStatus = 'connecting'
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${location.host}/ws/invigilator`)

    ws.onopen = () => {
      // Authenticate immediately
      ws!.send(JSON.stringify({
        type: 'auth',
        token: staffToken,
        assessmentId: assessment.id,
      }))

      wsStatus = 'connected'
      // Keepalive ping every 30s
      pingInterval = setInterval(() => {
        ws?.send(JSON.stringify({ type: 'ping' }))
      }, 30_000)
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'snapshot') {
        sessions = msg.sessions
        lastUpdate = new Date()
      }

      if (msg.type === 'update') {
        sessions = sessions.map(s =>
          s.sessionId === msg.session.sessionId ? { ...s, ...msg.session } : s
        )
        lastUpdate = new Date()
      }

      if (msg.type === 'violation') {
        // Flash the card
        newViolations = [
          ...newViolations,
          { sessionId: msg.sessionId, type: msg.violation.type, at: Date.now() },
        ]
        setTimeout(() => {
          newViolations = newViolations.filter(v => v.sessionId !== msg.sessionId)
        }, 3000)

        // Update violation count on the session
        sessions = sessions.map(s =>
          s.sessionId === msg.sessionId
            ? { ...s, violationCount: s.violationCount + 1, lastViolationType: msg.violation.type }
            : s
        )
      }
    }

    ws.onclose = () => {
      wsStatus = 'disconnected'
      if (pingInterval) clearInterval(pingInterval)
      // Reconnect after 5s
      reconnectTimeout = setTimeout(connect, 5000)
    }

    ws.onerror = () => ws?.close()
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function formatTime(seconds: number | null): string {
    if (seconds === null) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function isFlashing(sessionId: string): boolean {
    return newViolations.some(v => v.sessionId === sessionId)
  }

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'badge-gray',
    IN_PROGRESS: 'badge-green',
    PAUSED: 'badge-yellow',
    SUBMITTED: 'badge-blue',
    TIMED_OUT: 'badge-gray',
    DISQUALIFIED: 'badge-red',
  }

  const VIOLATION_LABELS: Record<string, string> = {
    FULLSCREEN_EXIT: 'Fullscreen exit',
    TAB_SWITCH: 'Tab switch',
    FACE_MISMATCH: 'Face mismatch',
    MULTIPLE_FACES: 'Multiple faces',
    DEVTOOLS_OPEN: 'DevTools',
    COPY_ATTEMPT: 'Copy attempt',
    FOCUS_LOSS: 'Focus loss',
    SCREEN_CAPTURE: 'Screen capture',
    IDLE_TIMEOUT: 'Idle timeout',
  }
</script>

<div class="monitor-layout">
  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <header class="monitor-header">
    <div class="header-left">
      <h1>{assessment.course.code} — {assessment.title}</h1>
      <div class="ws-indicator" class:connected={wsStatus === 'connected'} class:disconnected={wsStatus === 'disconnected'}>
        <span class="ws-dot"></span>
        {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Disconnected — reconnecting'}
        {#if lastUpdate}
          · updated {lastUpdate.toLocaleTimeString()}
        {/if}
      </div>
    </div>

    <div class="header-right">
      <a href="/invigilator" class="btn-ghost">← Back</a>
    </div>
  </header>

  <!-- ── Stats bar ───────────────────────────────────────────────────────── -->
  <div class="stats-bar">
    <div class="stat">
      <span class="stat-value">{stats().total}</span>
      <span class="stat-label">Total</span>
    </div>
    <div class="stat active">
      <span class="stat-value">{stats().inProgress}</span>
      <span class="stat-label">In Progress</span>
    </div>
    <div class="stat submitted">
      <span class="stat-value">{stats().submitted}</span>
      <span class="stat-label">Submitted</span>
    </div>
    <div class="stat warn">
      <span class="stat-value">{stats().paused}</span>
      <span class="stat-label">Paused</span>
    </div>
    <div class="stat offline">
      <span class="stat-value">{stats().offline}</span>
      <span class="stat-label">Offline</span>
    </div>
    <div class="stat danger" class:has-violations={stats().violations > 0}>
      <span class="stat-value">{stats().violations}</span>
      <span class="stat-label">Violations</span>
    </div>
  </div>

  <!-- ── Toolbar ─────────────────────────────────────────────────────────── -->
  <div class="toolbar">
    <div class="filter-group">
      <label class="sr-only">Filter by status</label>
      <select bind:value={filterStatus} class="select-sm">
        <option value="all">All statuses</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="PAUSED">Paused</option>
        <option value="SUBMITTED">Submitted</option>
        <option value="PENDING">Pending</option>
      </select>

      <label class="sr-only">Sort by</label>
      <select bind:value={sortBy} class="select-sm">
        <option value="name">Sort: Name</option>
        <option value="time">Sort: Time remaining</option>
        <option value="violations">Sort: Violations</option>
        <option value="answered">Sort: Answered</option>
      </select>
    </div>

    <span class="session-count">
      Showing {filtered().length} of {sessions.length} students
    </span>
  </div>

  <!-- ── Session grid ────────────────────────────────────────────────────── -->
  <div class="session-grid">
    {#each filtered() as session (session.sessionId)}
      <button
        class="session-card"
        class:flashing={isFlashing(session.sessionId)}
        class:offline={!session.isOnline && session.status === 'IN_PROGRESS'}
        class:selected={selectedSession?.sessionId === session.sessionId}
        onclick={() => selectedSession = selectedSession?.sessionId === session.sessionId ? null : session}
        aria-label="View {session.studentName}"
      >
        <!-- Card header -->
        <div class="card-header">
          <span class="student-name">{session.studentName}</span>
          <span class="badge {STATUS_COLORS[session.status] ?? 'badge-gray'}">
            {session.status.replace('_', ' ')}
          </span>
        </div>

        <span class="matric">{session.matricNumber}</span>

        <!-- Progress bar -->
        <div class="card-progress">
          <div
            class="progress-fill"
            style="width: {session.totalQuestions > 0 ? (session.answeredCount / session.totalQuestions) * 100 : 0}%"
          ></div>
        </div>

        <!-- Card stats -->
        <div class="card-stats">
          <span title="Answered">
            📝 {session.answeredCount}/{session.totalQuestions}
          </span>
          <span title="Time remaining" class:urgent={!!session.timeRemainingSeconds && session.timeRemainingSeconds < 300}>
            ⏱ {formatTime(session.timeRemainingSeconds)}
          </span>
          {#if session.violationCount > 0}
            <span class="violation-badge" title="Violations">
              ⚠ {session.violationCount}
            </span>
          {/if}
          {#if !session.isOnline && session.status === 'IN_PROGRESS'}
            <span class="offline-badge" title="Offline">📴</span>
          {/if}
          {#if !session.faceVerifiedAt}
            <span class="face-badge" title="Face not verified">👤?</span>
          {/if}
        </div>

        {#if session.lastViolationType}
          <div class="last-violation">
            ⚠ {VIOLATION_LABELS[session.lastViolationType] ?? session.lastViolationType}
          </div>
        {/if}
      </button>
    {/each}

    {#if sessions.length === 0 && wsStatus === 'connected'}
      <div class="empty-state">
        <p>No active sessions yet. Students will appear here once they start the exam.</p>
      </div>
    {/if}
  </div>

  <!-- ── Session detail drawer ───────────────────────────────────────────── -->
  {#if selectedSession}
    <div class="detail-drawer">
      <div class="drawer-header">
        <h3>{selectedSession.studentName}</h3>
        <button class="btn-ghost" onclick={() => selectedSession = null}>✕</button>
      </div>

      <div class="drawer-body">
        <div class="detail-row">
          <span>Matric</span>
          <strong>{selectedSession.matricNumber}</strong>
        </div>
        <div class="detail-row">
          <span>Status</span>
          <span class="badge {STATUS_COLORS[selectedSession.status]}">{selectedSession.status}</span>
        </div>
        <div class="detail-row">
          <span>Started</span>
          <strong>{selectedSession.startedAt ? new Date(selectedSession.startedAt).toLocaleTimeString() : '—'}</strong>
        </div>
        <div class="detail-row">
          <span>Time left</span>
          <strong class:urgent={!!selectedSession.timeRemainingSeconds && selectedSession.timeRemainingSeconds < 300}>
            {formatTime(selectedSession.timeRemainingSeconds)}
          </strong>
        </div>
        <div class="detail-row">
          <span>Answered</span>
          <strong>{selectedSession.answeredCount} / {selectedSession.totalQuestions}</strong>
        </div>
        <div class="detail-row">
          <span>Violations</span>
          <strong class:danger={selectedSession.violationCount > 0}>{selectedSession.violationCount}</strong>
        </div>
        <div class="detail-row">
          <span>Face verified</span>
          <strong>{selectedSession.faceVerifiedAt ? '✓ Yes' : '✗ No'}</strong>
        </div>
        <div class="detail-row">
          <span>Online</span>
          <strong>{selectedSession.isOnline ? '✓ Online' : '📴 Offline'}</strong>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .monitor-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--color-bg);
    overflow: hidden;
  }

  /* ── Header ─────────────────────────────────────────────────────────── */
  .monitor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .header-left h1 { font-size: 1rem; font-weight: 700; margin: 0 0 0.2rem; }

  .ws-indicator {
    font-size: 0.75rem;
    color: var(--color-muted);
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .ws-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--color-muted);
    flex-shrink: 0;
  }

  .ws-indicator.connected .ws-dot { background: var(--g500); animation: pulse-dot 2s infinite; }
  .ws-indicator.disconnected .ws-dot { background: var(--color-danger); }

  /* ── Stats bar ───────────────────────────────────────────────────────── */
  .stats-bar {
    display: flex;
    gap: 0;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.625rem;
    border-right: 1px solid var(--color-border);
    gap: 0.1rem;
  }

  .stat:last-child { border-right: none; }
  .stat-value { font-size: 1.25rem; font-weight: 700; line-height: 1; }
  .stat-label { font-size: 0.65rem; color: var(--color-muted); text-transform: uppercase; }

  .stat.active .stat-value { color: var(--g600); }
  .stat.submitted .stat-value { color: var(--iv600); }
  .stat.warn .stat-value { color: var(--color-warning); }
  .stat.offline .stat-value { color: var(--color-muted); }
  .stat.danger .stat-value { color: var(--color-muted); }
  .stat.danger.has-violations .stat-value { color: var(--color-danger); }

  /* ── Toolbar ─────────────────────────────────────────────────────────── */
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 1.25rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    gap: 1rem;
  }

  .filter-group { display: flex; gap: 0.5rem; }

  .select-sm {
    padding: 0.35rem 0.625rem;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.8rem;
    cursor: pointer;
  }

  .session-count { font-size: 0.8rem; color: var(--color-muted); }

  /* ── Session grid ────────────────────────────────────────────────────── */
  .session-grid {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.25rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.75rem;
    align-content: start;
  }

  .session-card {
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
    padding: 0.875rem;
    text-align: left;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: all 0.15s;
    position: relative;
  }

  .session-card:hover { border-color: var(--iv500); }
  .session-card.selected { border-color: var(--iv600); background: var(--iv50); }
  .session-card.offline { border-color: var(--color-muted); opacity: 0.8; }
  .session-card.flashing {
    border-color: var(--color-danger);
    animation: flash-card 0.5s ease-in-out 3;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .student-name { font-weight: 600; font-size: 0.875rem; line-height: 1.3; }
  .matric { font-size: 0.7rem; color: var(--color-muted); font-family: monospace; }

  .card-progress {
    height: 4px;
    background: var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--g500);
    border-radius: 999px;
    transition: width 0.5s;
  }

  .card-stats {
    display: flex;
    gap: 0.625rem;
    flex-wrap: wrap;
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .card-stats .urgent { color: var(--color-danger); font-weight: 600; }

  .violation-badge {
    color: var(--color-danger);
    font-weight: 700;
    background: #fef2f2;
    padding: 0.1rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
  }

  .offline-badge { color: var(--color-muted); }
  .face-badge { color: var(--color-warning); }

  .last-violation {
    font-size: 0.7rem;
    color: var(--color-danger);
    background: #fef2f2;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem;
    color: var(--color-muted);
    font-size: 0.875rem;
  }

  /* ── Detail drawer ───────────────────────────────────────────────────── */
  .detail-drawer {
    position: fixed;
    right: 0; top: 0; bottom: 0;
    width: 280px;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    z-index: 100;
    box-shadow: -4px 0 16px rgba(0,0,0,0.08);
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .drawer-header h3 { margin: 0; font-size: 0.95rem; }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    padding-bottom: 0.625rem;
    border-bottom: 1px solid var(--color-border);
  }

  .detail-row span:first-child { color: var(--color-muted); }
  .detail-row .urgent { color: var(--color-danger); }
  .detail-row .danger { color: var(--color-danger); }

  .btn-ghost {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .btn-ghost:hover { background: var(--color-surface-hover); color: var(--color-text); }

  /* ── Badges (reuse from app.css) ─────────────────────────────────────── */
  .badge {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  @keyframes flash-card {
    0%, 100% { border-color: var(--color-danger); background: var(--color-surface); }
    50% { background: #fef2f2; }
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>