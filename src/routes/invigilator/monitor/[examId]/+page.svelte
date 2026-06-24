<!-- src/routes/invigilator/exams/[examId]/monitor/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Search, X, Users, Activity, CheckCircle, Clock,
    AlertTriangle, ShieldAlert, Play, Pause, Eye, EyeOff,
    Building2, ArrowUpDown, Send, MessageSquare, Radio,
    TimerReset, LayoutGrid, List, Grid2x2, ChevronLeft,
    ChevronRight, UserX, UserCheck, Lock, Loader2, Maximize2,
    Minimize2
  } from '@lucide/svelte';

  let { data }: { data: any } = $props();
  const { exam } = data;

  // ── View + pagination state ───────────────────────────────────────────────
  type ViewMode = 'tile' | 'card' | 'list';
  let viewMode      = $state<ViewMode>('card');
  let tileSize      = $state(180);   // px — resizable for tile & card
  let page          = $state(1);
  const PAGE_SIZE   = 20;

  // ── Core state ────────────────────────────────────────────────────────────
  let students        = $state(data.students ?? []);
  let search          = $state('');
  let statusFilter    = $state<string>('all');
  let sortBy          = $state<'name' | 'matric' | 'status' | 'violations'>('name');
  let sortDir         = $state<'asc' | 'desc'>('asc');
  let isCompleted     = $state(exam.status === 'completed');

  // ── WebSocket (single connection on same host as app) ────────────────────
  let ws: WebSocket | null         = null;
  let wsConnected                  = $state(false);
  let lastUpdated                  = $state(new Date());
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout>  | null = null;

  // ── Camera feeds ─────────────────────────────────────────────────────────
  interface FeedEntry { frame: string; student_name: string; matric: string; status: string; violation_count: number; updated_at: number; }
  let cameraFeeds  = $state(new Map<string, FeedEntry>());
  let showCameras  = $state(false);
  let expandedFeed = $state<string | null>(null);

  // ── Announcements & chat ──────────────────────────────────────────────────
  let announcement = $state('');
  let announceSent = $state(false);
  interface ChatMsg { session_id: string; from: string; message: string; time: Date; }
  let chatMessages = $state<ChatMsg[]>([]);
  let chatTarget   = $state<string | null>(null);
  let chatInput    = $state('');
  let unreadChats  = $state<Set<string>>(new Set());

  // ── Derived: filter + sort + paginate ────────────────────────────────────
  const filtered = $derived.by(() => {
    let list = students;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s: any) =>
        (s.fullName ?? '').toLowerCase().includes(q) ||
        (s.matricNumber ?? '').toLowerCase().includes(q) ||
        (s.department?.name ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter((s: any) => s.status === statusFilter);
    list = [...list].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === 'name')       cmp = (a.fullName ?? '').localeCompare(b.fullName ?? '');
      if (sortBy === 'matric')     cmp = (a.matricNumber ?? '').localeCompare(b.matricNumber ?? '');
      if (sortBy === 'violations') cmp = (a.violationCount ?? 0) - (b.violationCount ?? 0);
      if (sortBy === 'status') {
        const o: Record<string, number> = { not_started: 0, in_progress: 1, flagged: 2, submitted: 3, force_submitted: 4 };
        cmp = (o[a.status] ?? 0) - (o[b.status] ?? 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  });

  const totalPages  = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paginated   = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

  // Reset page when filter changes
  $effect(() => { filtered; page = 1; });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = $derived.by(() => {
    const s       = students as any[];
    const total   = s.length;
    const inProg  = s.filter(x => x.status === 'in_progress').length;
    const subm    = s.filter(x => x.status === 'submitted' || x.status === 'force_submitted').length;
    const flagged = s.filter(x => x.status === 'flagged').length;
    const notSt   = s.filter(x => x.status === 'not_started').length;
    const viols   = s.reduce((sum: number, x: any) => sum + (x.violationCount ?? 0), 0);
    return { total, inProg, subm, flagged, notSt, viols };
  });

  // ── Status config ─────────────────────────────────────────────────────────
  const SC: Record<string, { label: string; color: string; bg: string }> = {
    not_started:     { label: 'Not Started',     color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    in_progress:     { label: 'In Progress',     color: '#16a34a', bg: 'rgba(22,163,74,0.1)'   },
    flagged:         { label: 'Paused',          color: '#d97706', bg: 'rgba(245,158,11,0.1)'  },
    submitted:       { label: 'Submitted',       color: '#2563eb', bg: 'rgba(37,99,235,0.1)'   },
    force_submitted: { label: 'Force Submitted', color: '#dc2626', bg: 'rgba(220,38,38,0.1)'   },
  };
  const sc = (s: string) => SC[s] ?? SC.not_started;

  // ── WebSocket ─────────────────────────────────────────────────────────────
  function connectWs() {
    if (isCompleted || ws?.readyState === WebSocket.OPEN) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/ws`);

    ws.onopen = () => {
      wsConnected = true;
      ws!.send(JSON.stringify({ type: 'join_exam', exam_id: exam.id, role: 'invigilator' }));
      heartbeatTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: 'heartbeat', role: 'invigilator' }));
      }, 30_000);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        lastUpdated = new Date();
        handleWsMsg(msg);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      wsConnected = false;
      if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
      if (!isCompleted) reconnectTimer = setTimeout(connectWs, 3_000);
    };

    ws.onerror = () => { wsConnected = false; };
  }

  function handleWsMsg(msg: any) {
    switch (msg.type) {
      case 'room_state':
        if (Array.isArray(msg.students)) {
          for (const s of msg.students) {
            students = (students as any[]).map((st: any) =>
              st.sessionId === s.session_id
                ? { ...st, status: s.status, violationCount: s.violation_count }
                : st
            );
          }
        }
        break;

      case 'student_joined':
        students = (students as any[]).map((s: any) =>
          s.studentId === msg.student_id || s.sessionId === msg.session_id
            ? { ...s, status: 'in_progress', sessionId: msg.session_id }
            : s
        );
        break;

      case 'student_status':
        students = (students as any[]).map((s: any) =>
          s.sessionId === msg.session_id || s.studentId === msg.student_id
            ? { ...s, status: msg.status }
            : s
        );
        break;

      case 'violation':
        students = (students as any[]).map((s: any) =>
          s.sessionId === msg.session_id || s.studentId === msg.student_id
            ? { ...s, violationCount: msg.violation_count }
            : s
        );
        break;

      case 'exam_submitted':
        students = (students as any[]).map((s: any) =>
          s.sessionId === msg.session_id || s.studentId === msg.student_id
            ? { ...s, status: msg.status ?? 'submitted' }
            : s
        );
        if (msg.session_id) {
          const next = new Map(cameraFeeds);
          next.delete(msg.session_id);
          cameraFeeds = next;
        }
        break;

      case 'camera_frame_broadcast':
        cameraFeeds = new Map(cameraFeeds).set(msg.session_id, {
          frame: msg.frame, student_name: msg.student_name, matric: msg.matric,
          status: msg.status, violation_count: msg.violation_count, updated_at: Date.now(),
        });
        break;

      case 'chat':
        chatMessages = [...chatMessages, { session_id: msg.session_id, from: msg.from, message: msg.message, time: new Date() }];
        if (msg.from === 'student' && chatTarget !== msg.session_id) {
          unreadChats = new Set([...unreadChats, msg.session_id]);
        }
        break;
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function wsSend(payload: object) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }

  async function pauseStudent(s: any) {
    if (isCompleted || !s.sessionId) return;
    // Tell the student via WS
    wsSend({ type: 'pause_session', session_id: s.sessionId });
    // Also persist via API
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s.studentId, examId: exam.id, action: 'pause' }),
    });
    students = (students as any[]).map((st: any) => st.studentId === s.studentId ? { ...st, status: 'flagged' } : st);
  }

  async function resumeStudent(s: any) {
    if (isCompleted || !s.sessionId) return;
    wsSend({ type: 'resume_session', session_id: s.sessionId });
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s.studentId, examId: exam.id, action: 'resume' }),
    });
    students = (students as any[]).map((st: any) => st.studentId === s.studentId ? { ...st, status: 'in_progress' } : st);
  }

  async function forceSubmitOne(s: any) {
    if (isCompleted) return;
    if (!confirm(`Force submit ${s.fullName}'s exam? This will grade them immediately.`)) return;
    if (s.sessionId) wsSend({ type: 'force_submit', session_id: s.sessionId });
    const res = await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s.studentId, examId: exam.id, action: 'force_submit' }),
    });
    if (res.ok) {
      students = (students as any[]).map((st: any) => st.studentId === s.studentId ? { ...st, status: 'force_submitted' } : st);
    }
  }

  async function forceSubmitAll() {
    if (isCompleted) return;
    const active = (students as any[]).filter(s => s.status === 'in_progress' || s.status === 'flagged');
    if (!active.length) return;
    if (!confirm(`Force submit ALL ${active.length} active student(s)? This will grade them all immediately.`)) return;
    for (const s of active) {
      if (s.sessionId) wsSend({ type: 'force_submit', session_id: s.sessionId });
      await fetch('/api/invigilator/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: s.studentId, examId: exam.id, action: 'force_submit' }),
      });
    }
    students = (students as any[]).map((st: any) =>
      st.status === 'in_progress' || st.status === 'flagged'
        ? { ...st, status: 'force_submitted' } : st
    );
  }

  function sendAnnouncement() {
    if (!announcement.trim()) return;
    wsSend({ type: 'announcement', exam_id: exam.id, message: announcement.trim() });
    announcement = ''; announceSent = true;
    setTimeout(() => announceSent = false, 2_000);
  }

  function sendChat() {
    if (!chatInput.trim() || !chatTarget) return;
    wsSend({ type: 'chat', session_id: chatTarget, from: 'invigilator', message: chatInput.trim() });
    chatMessages = [...chatMessages, { session_id: chatTarget, from: 'invigilator', message: chatInput.trim(), time: new Date() }];
    chatInput = '';
  }

  function giveTime(session_id: string, secs: number) {
    wsSend({ type: 'time_correction', session_id, add_secs: secs });
  }

  function openChat(session_id: string) {
    chatTarget  = session_id;
    unreadChats = new Set([...unreadChats].filter(id => id !== session_id));
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortBy = field; sortDir = 'asc'; }
  }

  function fmtTime(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function initials(name: string) {
    return (name ?? '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  onMount(() => { if (!isCompleted) connectWs(); });
  onDestroy(() => {
    ws?.close();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
  });
</script>

<svelte:head><title>Monitor — {exam.title}</title></svelte:head>

<!-- ══ EXPANDED CAMERA FEED OVERLAY ══ -->
{#if expandedFeed}
  {@const feed = cameraFeeds.get(expandedFeed)}
  {#if feed}
    <div class="overlay-bg" onclick={() => expandedFeed = null} role="presentation">
      <div class="overlay-feed" onclick={e => e.stopPropagation()}>
        <div class="overlay-header">
          <span class="overlay-name">{feed.student_name}</span>
          <span class="overlay-matric">{feed.matric}</span>
          {#if feed.violation_count > 0}
            <span class="overlay-viols">{feed.violation_count} ⚠</span>
          {/if}
          <button class="overlay-close" onclick={() => expandedFeed = null}><X size={16} /></button>
        </div>
        <img src={feed.frame} alt={feed.student_name} class="overlay-img" />
      </div>
    </div>
  {/if}
{/if}

<!-- ══ CHAT PANEL ══ -->
{#if chatTarget}
  {@const msgs    = chatMessages.filter(m => m.session_id === chatTarget)}
  {@const student = (students as any[]).find((s: any) => s.sessionId === chatTarget)}
  <div class="chat-panel">
    <div class="chat-header">
      <MessageSquare size={13} />
      <span>{student?.fullName ?? 'Student'}</span>
      <button class="chat-close" onclick={() => chatTarget = null}><X size={14} /></button>
    </div>
    <div class="chat-msgs">
      {#if msgs.length === 0}
        <p class="chat-empty">No messages yet.</p>
      {:else}
        {#each msgs as m}
          <div class="chat-msg" class:from-inv={m.from === 'invigilator'}>
            <span class="chat-bubble">{m.message}</span>
            <span class="chat-time">{m.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        {/each}
      {/if}
    </div>
    <div class="chat-input-row">
      <input
        class="chat-input" type="text" placeholder="Message…"
        bind:value={chatInput}
        onkeydown={e => e.key === 'Enter' && sendChat()}
      />
      <button class="chat-send" onclick={sendChat} disabled={!chatInput.trim()}>
        <Send size={13} />
      </button>
    </div>
  </div>
{/if}

<div class="monitor">

  <!-- ══ HEADER ══ -->
  <header class="mon-header">
    <div class="hdr-left">
      <div class="exam-badge">{exam.course?.code ?? '—'}</div>
      <div class="hdr-info">
        <h1 class="hdr-title">{exam.title}</h1>
        <div class="hdr-meta">
          <span><Clock size={11} /> {exam.durationMinutes} min</span>
          {#if isCompleted}
            <span class="ws-pill"><Lock size={10} /> Completed</span>
          {:else}
            <span class="ws-pill" class:live={wsConnected}>
              <span class="ws-dot"></span>
              {wsConnected ? 'Live' : 'Reconnecting…'}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Force submit all -->
    {#if !isCompleted}
      <button class="force-all-btn" onclick={forceSubmitAll} title="Force submit all active students">
        <ShieldAlert size={14} /> Force All
      </button>
    {/if}
  </header>

  <!-- ══ KPI ROW ══ -->
  <div class="kpi-row">
    <div class="kpi" onclick={() => statusFilter = statusFilter === 'all' ? 'all' : 'all'}>
      <span class="kpi-n">{stats.total}</span>
      <span class="kpi-l">Total</span>
    </div>
    <div class="kpi kpi-green" onclick={() => statusFilter = 'in_progress'}>
      <span class="kpi-n">{stats.inProg}</span>
      <span class="kpi-l">Active</span>
    </div>
    <div class="kpi kpi-blue" onclick={() => statusFilter = 'submitted'}>
      <span class="kpi-n">{stats.subm}</span>
      <span class="kpi-l">Done</span>
    </div>
    <div class="kpi kpi-amber" onclick={() => statusFilter = 'flagged'}>
      <span class="kpi-n">{stats.flagged}</span>
      <span class="kpi-l">Paused</span>
    </div>
    <div class="kpi kpi-slate" onclick={() => statusFilter = 'not_started'}>
      <span class="kpi-n">{stats.notSt}</span>
      <span class="kpi-l">Waiting</span>
    </div>
    <div class="kpi kpi-red">
      <span class="kpi-n">{stats.viols}</span>
      <span class="kpi-l">Violations</span>
    </div>
  </div>

  <!-- ══ FEED + ANNOUNCE BAR ══ -->
  {#if !isCompleted}
    <div class="feed-bar">
      <button class="feed-btn" onclick={() => showCameras = !showCameras}>
        {#if showCameras}<EyeOff size={13} />{:else}<Eye size={13} />{/if}
        Feeds
        {#if cameraFeeds.size > 0}<span class="feed-badge">{cameraFeeds.size}</span>{/if}
      </button>

      <div class="announce-row">
        <Radio size={13} class="announce-ico" />
        <input
          class="announce-input" type="text" placeholder="Announce to all…"
          bind:value={announcement}
          onkeydown={e => e.key === 'Enter' && sendAnnouncement()}
        />
        <button class="announce-btn" onclick={sendAnnouncement} disabled={!announcement.trim() || announceSent}>
          {announceSent ? '✓' : 'Send'}
        </button>
      </div>

      {#if unreadChats.size > 0}
        <span class="unread-pill"><MessageSquare size={12} /> {unreadChats.size}</span>
      {/if}
    </div>

    <!-- ══ CAMERA GRID ══ -->
    {#if showCameras}
      <div class="cam-grid">
        {#if cameraFeeds.size === 0}
          <div class="cam-empty">No feeds yet — students stream when they join.</div>
        {:else}
          {#each [...cameraFeeds.entries()] as [sid, feed]}
            {@const stale = Date.now() - feed.updated_at > 15_000}
            <div class="cam-tile" class:stale class:paused={feed.status === 'flagged'}>
              <img src={feed.frame} alt={feed.student_name} class="cam-img" />
              <div class="cam-overlay">
                <span class="cam-name">{feed.student_name}</span>
                <span class="cam-matric">{feed.matric}</span>
              </div>
              {#if feed.violation_count > 0}
                <span class="cam-viol">{feed.violation_count} ⚠</span>
              {/if}
              <div class="cam-actions">
                <button class="cam-btn" onclick={() => expandedFeed = sid} title="Expand"><Maximize2 size={11} /></button>
                <button class="cam-btn" onclick={() => openChat(sid)} title="Chat"><MessageSquare size={11} /></button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  {/if}

  <!-- ══ TOOLBAR ══ -->
  <div class="toolbar">
    <!-- Search -->
    <div class="search-wrap">
      <Search size={13} class="srch-ico" />
      <input class="search-input" type="search" placeholder="Name, matric, dept…" bind:value={search} />
      {#if search}<button class="srch-clear" onclick={() => search = ''}><X size={11} /></button>{/if}
    </div>

    <!-- Status filters -->
    <div class="filter-chips">
      {#each [
        ['all',         'All',       stats.total ],
        ['in_progress', 'Active',    stats.inProg],
        ['flagged',     'Paused',    stats.flagged],
        ['submitted',   'Submitted', stats.subm  ],
        ['not_started', 'Waiting',   stats.notSt ],
      ] as [val, label, count]}
        <button
          class="chip" class:active={statusFilter === val}
          onclick={() => statusFilter = val as string}
        >{label} <span class="chip-n">{count}</span></button>
      {/each}
    </div>

    <!-- View switcher + tile size -->
    <div class="view-controls">
      <div class="view-switcher">
        <button class="view-btn" class:active={viewMode === 'tile'} onclick={() => viewMode = 'tile'} title="Tile">
          <Grid2x2 size={14} />
        </button>
        <button class="view-btn" class:active={viewMode === 'card'} onclick={() => viewMode = 'card'} title="Card">
          <LayoutGrid size={14} />
        </button>
        <button class="view-btn" class:active={viewMode === 'list'} onclick={() => viewMode = 'list'} title="List">
          <List size={14} />
        </button>
      </div>
      {#if viewMode !== 'list'}
        <div class="size-slider" title="Resize tiles">
          <Minimize2 size={11} />
          <input type="range" min="120" max="300" step="10" bind:value={tileSize} />
          <Maximize2 size={11} />
        </div>
      {/if}
    </div>

    <span class="result-count">{filtered.length} / {stats.total}</span>
  </div>

  <!-- ══ CONTENT ══ -->
  <div class="content-area">

    <!-- ── TILE VIEW ──────────────────────────────────────────────────────── -->
    {#if viewMode === 'tile'}
      <div class="tile-grid" style="--tile-size: {tileSize}px">
        {#each paginated as s (s.studentId)}
          {@const cfg = sc(s.status)}
          {@const hasUnread = unreadChats.has(s.sessionId ?? '')}
          <div class="tile" style="width:{tileSize}px">
            <!-- Passport photo -->
            <div class="tile-photo">
              {#if s.photoUrl}
                <img src={s.photoUrl} alt={s.fullName} class="photo-img" />
              {:else}
                <div class="photo-fallback">{initials(s.fullName)}</div>
              {/if}
              <span class="tile-status-dot" style="background:{cfg.color}" title={cfg.label}></span>
            </div>

            <div class="tile-body">
              <p class="tile-name">{s.fullName}</p>
              <p class="tile-matric">{s.matricNumber ?? '—'}</p>
              <span class="tile-status" style="color:{cfg.color};background:{cfg.bg}">{cfg.label}</span>
              {#if (s.violationCount ?? 0) > 0}
                <span class="tile-viols">{s.violationCount} ⚠</span>
              {/if}
            </div>

            {#if !isCompleted}
              <div class="tile-actions">
                {#if s.sessionId}
                  <button class="ta-btn" onclick={() => openChat(s.sessionId)} class:unread={hasUnread} title="Chat">
                    <MessageSquare size={12} />
                  </button>
                  <button class="ta-btn" onclick={() => giveTime(s.sessionId, 300)} title="+5 min">
                    <TimerReset size={12} />
                  </button>
                {/if}
                {#if s.status === 'in_progress'}
                  <button class="ta-btn warn" onclick={() => pauseStudent(s)} title="Pause"><Pause size={12} /></button>
                  <button class="ta-btn danger" onclick={() => forceSubmitOne(s)} title="Force submit"><ShieldAlert size={12} /></button>
                {:else if s.status === 'flagged'}
                  <button class="ta-btn ok" onclick={() => resumeStudent(s)} title="Resume"><Play size={12} /></button>
                  <button class="ta-btn danger" onclick={() => forceSubmitOne(s)} title="Force submit"><ShieldAlert size={12} /></button>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>

    <!-- ── CARD VIEW ──────────────────────────────────────────────────────── -->
    {:else if viewMode === 'card'}
      <div class="card-grid" style="--card-size: {tileSize}px">
        {#each paginated as s (s.studentId)}
          {@const cfg = sc(s.status)}
          {@const hasUnread = unreadChats.has(s.sessionId ?? '')}
          <div class="card-item">
            <div class="card-top-row">
              <!-- Passport photo -->
              <div class="card-photo">
                {#if s.photoUrl}
                  <img src={s.photoUrl} alt={s.fullName} class="photo-img" />
                {:else}
                  <div class="photo-fallback photo-md">{initials(s.fullName)}</div>
                {/if}
              </div>
              <div class="card-info">
                <p class="card-name">{s.fullName}</p>
                <p class="card-matric">{s.matricNumber ?? '—'}</p>
                <p class="card-dept">{s.department?.name ?? '—'}</p>
              </div>
              <span class="card-status-dot" style="background:{cfg.color}"></span>
            </div>

            <div class="card-row">
              <span class="card-badge" style="color:{cfg.color};background:{cfg.bg}">{cfg.label}</span>
              {#if s.level}
                <span class="card-level">{s.level?.level ?? s.levelId}L</span>
              {/if}
              {#if (s.violationCount ?? 0) > 0}
                <span class="card-viols">{s.violationCount} ⚠</span>
              {/if}
            </div>

            {#if s.startedAt && s.status !== 'not_started'}
              <p class="card-time">
                {s.status === 'submitted' || s.status === 'force_submitted' ? 'Submitted' : 'Started'}
                {fmtTime(s.submittedAt ?? s.startedAt)}
              </p>
            {/if}

            {#if !isCompleted}
              <div class="card-actions">
                {#if s.sessionId}
                  <button class="ca-btn" onclick={() => openChat(s.sessionId)} class:unread={hasUnread} title="Chat">
                    <MessageSquare size={12} />
                    {#if hasUnread}<span class="unread-dot"></span>{/if}
                  </button>
                  <button class="ca-btn" onclick={() => giveTime(s.sessionId, 300)} title="+5 min">
                    <TimerReset size={12} />
                  </button>
                {/if}
                {#if s.status === 'in_progress'}
                  <button class="ca-btn warn" onclick={() => pauseStudent(s)} title="Pause"><Pause size={12} /></button>
                  <button class="ca-btn danger" onclick={() => forceSubmitOne(s)} title="Force"><ShieldAlert size={12} /></button>
                {:else if s.status === 'flagged'}
                  <button class="ca-btn ok" onclick={() => resumeStudent(s)} title="Resume"><Play size={12} /></button>
                  <button class="ca-btn danger" onclick={() => forceSubmitOne(s)} title="Force"><ShieldAlert size={12} /></button>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>

    <!-- ── LIST VIEW ──────────────────────────────────────────────────────── -->
    {:else}
      <div class="list-table-wrap">
        <table class="list-table">
          <thead>
            <tr>
              <th class="th-photo"></th>
              <th onclick={() => toggleSort('name')} class="sortable">
                Student <ArrowUpDown size={11} class={sortBy === 'name' ? 'sort-on' : ''} />
              </th>
              <th onclick={() => toggleSort('matric')} class="sortable">
                Matric <ArrowUpDown size={11} class={sortBy === 'matric' ? 'sort-on' : ''} />
              </th>
              <th class="hide-sm">Dept / Level</th>
              <th onclick={() => toggleSort('status')} class="sortable">
                Status <ArrowUpDown size={11} class={sortBy === 'status' ? 'sort-on' : ''} />
              </th>
              <th class="hide-md">Time</th>
              <th onclick={() => toggleSort('violations')} class="sortable">
                <ShieldAlert size={11} /> <ArrowUpDown size={11} class={sortBy === 'violations' ? 'sort-on' : ''} />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each paginated as s (s.studentId)}
              {@const cfg = sc(s.status)}
              {@const hasUnread = unreadChats.has(s.sessionId ?? '')}
              <tr class="list-row">
                <td class="td-photo">
                  {#if s.photoUrl}
                    <img src={s.photoUrl} alt={s.fullName} class="list-photo" />
                  {:else}
                    <div class="list-avatar">{initials(s.fullName)}</div>
                  {/if}
                </td>
                <td>
                  <span class="list-name">{s.fullName}</span>
                  <span class="list-email">{s.email ?? ''}</span>
                </td>
                <td><span class="mono-pill">{s.matricNumber ?? '—'}</span></td>
                <td class="hide-sm">
                  <span class="list-dept">{s.department?.name ?? '—'}</span>
                  {#if s.level}<span class="list-level">{s.level?.level ?? s.levelId}L</span>{/if}
                </td>
                <td>
                  <span class="list-badge" style="color:{cfg.color};background:{cfg.bg}">{cfg.label}</span>
                </td>
                <td class="hide-md">
                  {#if s.submittedAt}
                    <span class="time-txt">{fmtTime(s.submittedAt)}</span>
                  {:else if s.startedAt}
                    <span class="time-txt muted">{fmtTime(s.startedAt)}</span>
                  {:else}
                    <span class="muted">—</span>
                  {/if}
                </td>
                <td>
                  {#if (s.violationCount ?? 0) > 0}
                    <span class="viol-badge">{s.violationCount}</span>
                  {:else}
                    <span class="muted">0</span>
                  {/if}
                </td>
                <td>
                  <div class="list-actions">
                    {#if !isCompleted && s.sessionId}
                      <button class="la-btn" onclick={() => openChat(s.sessionId)} class:unread={hasUnread} title="Chat">
                        <MessageSquare size={12} />
                        {#if hasUnread}<span class="unread-dot"></span>{/if}
                      </button>
                      <button class="la-btn" onclick={() => giveTime(s.sessionId, 300)} title="+5 min">
                        <TimerReset size={12} />
                      </button>
                    {/if}
                    {#if !isCompleted}
                      {#if s.status === 'in_progress'}
                        <button class="la-btn warn" onclick={() => pauseStudent(s)} title="Pause"><Pause size={12} /></button>
                        <button class="la-btn danger" onclick={() => forceSubmitOne(s)} title="Force submit"><ShieldAlert size={12} /></button>
                      {:else if s.status === 'flagged'}
                        <button class="la-btn ok" onclick={() => resumeStudent(s)} title="Resume"><Play size={12} /></button>
                        <button class="la-btn danger" onclick={() => forceSubmitOne(s)} title="Force submit"><ShieldAlert size={12} /></button>
                      {/if}
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <!-- ── Empty state ──────────────────────────────────────────────────── -->
    {#if paginated.length === 0}
      <div class="empty">
        <div class="empty-ico"><Users size={28} strokeWidth={1.2} /></div>
        <p class="empty-title">{search ? `No results for "${search}"` : 'No students here'}</p>
        {#if search}<button class="clear-btn" onclick={() => search = ''}>Clear search</button>{/if}
      </div>
    {/if}
  </div>

  <!-- ══ PAGINATION ══ -->
  {#if totalPages > 1}
    <div class="pagination">
      <button class="pg-btn" onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}>
        <ChevronLeft size={14} />
      </button>
      {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
        {#if p === 1 || p === totalPages || Math.abs(p - page) <= 2}
          <button class="pg-btn" class:pg-active={p === page} onclick={() => page = p}>{p}</button>
        {:else if Math.abs(p - page) === 3}
          <span class="pg-ellipsis">…</span>
        {/if}
      {/each}
      <button class="pg-btn" onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}>
        <ChevronRight size={14} />
      </button>
      <span class="pg-info">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
    </div>
  {/if}

</div>

<style>
  /* ── Shell ───────────────────────────────────────────────────────────────── */
  .monitor {
    display: flex; flex-direction: column;
    height: 100dvh; overflow: hidden;
    background: var(--color-bg);
    font-size: 0.875rem;
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */
  .mon-header {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .hdr-left { display: flex; align-items: center; gap: 0.625rem; flex: 1; min-width: 0; }
  .exam-badge {
    padding: 0.3rem 0.6rem; border-radius: 0.45rem; flex-shrink: 0;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.04em;
  }
  .hdr-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .hdr-title {
    font-size: 0.95rem; font-weight: 800; color: var(--color-text); margin: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .hdr-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; color: var(--color-muted); }
  .hdr-meta span { display: inline-flex; align-items: center; gap: 0.25rem; }
  .ws-pill {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.62rem; font-weight: 700; padding: 0.1rem 0.4rem;
    border-radius: 999px; background: rgba(220,38,38,0.08); color: #dc2626;
    border: 1px solid rgba(220,38,38,0.2);
  }
  .ws-pill.live { background: rgba(22,163,74,0.08); color: #16a34a; border-color: rgba(22,163,74,0.2); }
  .ws-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  .ws-pill.live .ws-dot { animation: blink 2s ease-in-out infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .force-all-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.75rem; border-radius: 0.5rem; flex-shrink: 0;
    background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.25);
    color: #dc2626; font-size: 0.75rem; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .force-all-btn:hover { background: rgba(220,38,38,0.16); }

  /* ── KPI Row ─────────────────────────────────────────────────────────────── */
  .kpi-row {
    display: flex; gap: 0; flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
  }
  .kpi {
    flex: 1; min-width: 60px; display: flex; flex-direction: column; align-items: center;
    padding: 0.625rem 0.5rem; gap: 0.05rem; cursor: pointer;
    border-right: 1px solid var(--color-border); transition: background 0.12s;
  }
  .kpi:last-child { border-right: none; }
  .kpi:hover { background: var(--color-surface); }
  .kpi-n { font-size: 1.1rem; font-weight: 900; color: var(--color-text); line-height: 1; font-variant-numeric: tabular-nums; }
  .kpi-l { font-size: 0.55rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi-green .kpi-n { color: #16a34a; }
  .kpi-blue  .kpi-n { color: #2563eb; }
  .kpi-amber .kpi-n { color: #d97706; }
  .kpi-slate .kpi-n { color: #64748b; }
  .kpi-red   .kpi-n { color: #dc2626; }

  /* ── Feed bar ────────────────────────────────────────────────────────────── */
  .feed-bar {
    display: flex; align-items: center; gap: 0.625rem; flex-shrink: 0;
    padding: 0.5rem 1rem; border-bottom: 1px solid var(--color-border);
    background: var(--color-surface); flex-wrap: wrap;
  }
  .feed-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.375rem 0.75rem; border-radius: 0.45rem; flex-shrink: 0;
    border: 1px solid var(--color-border); background: var(--color-bg);
    font-size: 0.75rem; font-weight: 700; color: var(--color-text);
    cursor: pointer; font-family: inherit; transition: border-color 0.15s;
  }
  .feed-btn:hover { border-color: #4f46e5; color: #4f46e5; }
  .feed-badge {
    background: #4f46e5; color: white;
    font-size: 0.6rem; font-weight: 800;
    padding: 0.05rem 0.35rem; border-radius: 999px;
  }
  .announce-row {
    flex: 1; min-width: 180px; max-width: 400px;
    display: flex; align-items: center; gap: 0.375rem;
  }
  .announce-row :global(.announce-ico) { color: var(--color-muted); flex-shrink: 0; }
  .announce-input {
    flex: 1; padding: 0.375rem 0.625rem;
    border: 1px solid var(--color-border); border-radius: 0.4rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.78rem; font-family: inherit; outline: none;
  }
  .announce-input:focus { border-color: #4f46e5; }
  .announce-btn {
    padding: 0.375rem 0.75rem;
    background: #4f46e5; color: white; border: none; border-radius: 0.4rem;
    font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: filter 0.15s; white-space: nowrap;
  }
  .announce-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .announce-btn:not(:disabled):hover { filter: brightness(0.9); }
  .unread-pill {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem;
    background: rgba(220,38,38,0.08); color: #dc2626;
    border: 1px solid rgba(220,38,38,0.2); border-radius: 999px;
  }

  /* ── Camera grid ─────────────────────────────────────────────────────────── */
  .cam-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr));
    gap: 0.5rem; padding: 0.75rem 1rem;
    max-height: 280px; overflow-y: auto; flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
  }
  .cam-empty { grid-column: 1/-1; text-align: center; font-size: 0.78rem; color: var(--color-muted); padding: 1.5rem; }
  .cam-tile {
    position: relative; border-radius: 0.5rem; overflow: hidden;
    border: 2px solid var(--color-border); background: #111; aspect-ratio: 4/3;
    transition: border-color 0.15s;
  }
  .cam-tile:hover { border-color: #4f46e5; }
  .cam-tile.paused { border-color: #d97706; }
  .cam-tile.stale  { opacity: 0.5; }
  .cam-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cam-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.8));
    padding: 0.5rem 0.4rem 0.3rem;
  }
  .cam-name   { display: block; font-size: 0.68rem; font-weight: 700; color: white; }
  .cam-matric { display: block; font-size: 0.58rem; color: rgba(255,255,255,0.7); }
  .cam-viol {
    position: absolute; top: 0.3rem; right: 0.3rem;
    background: #dc2626; color: white;
    font-size: 0.58rem; font-weight: 800; padding: 0.1rem 0.3rem; border-radius: 999px;
  }
  .cam-actions {
    position: absolute; top: 0.3rem; left: 0.3rem;
    display: flex; gap: 0.2rem; opacity: 0; transition: opacity 0.15s;
  }
  .cam-tile:hover .cam-actions { opacity: 1; }
  .cam-btn {
    width: 22px; height: 22px; border-radius: 0.25rem; border: none;
    background: rgba(0,0,0,0.6); color: white; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  }

  /* ── Toolbar ─────────────────────────────────────────────────────────────── */
  .toolbar {
    display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap;
    padding: 0.5rem 1rem; flex-shrink: 0;
    background: var(--color-surface); border-bottom: 1px solid var(--color-border);
  }
  .search-wrap {
    position: relative; display: flex; align-items: center; min-width: 180px; flex: 1; max-width: 280px;
  }
  .search-wrap :global(.srch-ico) { position: absolute; left: 0.5rem; color: var(--color-muted); pointer-events: none; }
  .search-input {
    width: 100%; padding: 0.4rem 0.5rem 0.4rem 1.75rem;
    border: 1px solid var(--color-border); border-radius: 0.45rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.78rem; font-family: inherit; outline: none;
  }
  .search-input:focus { border-color: #4f46e5; }
  .srch-clear {
    position: absolute; right: 0.4rem; background: none; border: none;
    cursor: pointer; color: var(--color-muted); padding: 0;
    display: flex; align-items: center;
  }
  .filter-chips { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.3rem 0.625rem; border-radius: 999px;
    border: 1px solid var(--color-border); background: none;
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit; transition: all 0.12s; white-space: nowrap;
  }
  .chip:hover { border-color: #4f46e5; color: #4f46e5; }
  .chip.active { background: #4f46e5; border-color: #4f46e5; color: white; }
  .chip-n { font-size: 0.6rem; font-weight: 800; }
  .chip.active .chip-n { opacity: 0.8; }

  .view-controls { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; flex-shrink: 0; }
  .view-switcher { display: flex; border: 1px solid var(--color-border); border-radius: 0.45rem; overflow: hidden; }
  .view-btn {
    width: 32px; height: 32px; border: none; background: var(--color-bg);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--color-muted);
    border-right: 1px solid var(--color-border); transition: all 0.12s;
  }
  .view-btn:last-child { border-right: none; }
  .view-btn:hover { background: var(--color-surface); color: var(--color-text); }
  .view-btn.active { background: #4f46e5; color: white; }
  .size-slider {
    display: flex; align-items: center; gap: 0.35rem; color: var(--color-muted);
  }
  .size-slider input[type=range] { width: 80px; accent-color: #4f46e5; }

  .result-count { font-size: 0.7rem; font-weight: 600; color: var(--color-muted); white-space: nowrap; }

  /* ── Content area ────────────────────────────────────────────────────────── */
  .content-area { flex: 1; overflow-y: auto; padding: 1rem; overflow-x: hidden; }

  /* ── Tile view ───────────────────────────────────────────────────────────── */
  .tile-grid {
    display: flex; flex-wrap: wrap; gap: 0.625rem;
  }
  .tile {
    display: flex; flex-direction: column;
    border: 1.5px solid var(--color-border); border-radius: 0.75rem;
    background: var(--color-surface); overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tile:hover { border-color: #4f46e5; box-shadow: 0 2px 12px rgba(79,70,229,0.08); }
  .tile-photo {
    position: relative; width: 100%; aspect-ratio: 1;
    background: var(--color-bg); overflow: hidden;
  }
  .photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .photo-fallback {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: 800; color: #4f46e5;
    background: rgba(79,70,229,0.08);
  }
  .photo-md { font-size: 1.1rem; }
  .tile-status-dot {
    position: absolute; bottom: 6px; right: 6px;
    width: 10px; height: 10px; border-radius: 50%;
    border: 2px solid var(--color-surface);
  }
  .tile-body { padding: 0.5rem 0.625rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
  .tile-name   { font-size: 0.75rem; font-weight: 700; color: var(--color-text); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tile-matric { font-size: 0.65rem; color: var(--color-muted); margin: 0; font-family: monospace; }
  .tile-status {
    display: inline-block; font-size: 0.6rem; font-weight: 700;
    padding: 0.1rem 0.4rem; border-radius: 999px; width: fit-content;
  }
  .tile-viols {
    font-size: 0.62rem; font-weight: 700; color: #dc2626;
    background: rgba(220,38,38,0.08); padding: 0.1rem 0.4rem; border-radius: 999px; width: fit-content;
  }
  .tile-actions { display: flex; gap: 0.25rem; padding: 0.375rem 0.5rem; border-top: 1px solid var(--color-border); flex-wrap: wrap; }

  /* ── Card view ───────────────────────────────────────────────────────────── */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--card-size, 200px), 1fr));
    gap: 0.75rem;
  }
  .card-item {
    border: 1.5px solid var(--color-border); border-radius: 0.875rem;
    background: var(--color-surface); padding: 0.875rem;
    display: flex; flex-direction: column; gap: 0.5rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .card-item:hover { border-color: rgba(79,70,229,0.35); box-shadow: 0 2px 12px rgba(79,70,229,0.07); }
  .card-top-row { display: flex; align-items: flex-start; gap: 0.625rem; position: relative; }
  .card-photo {
    width: 44px; height: 44px; border-radius: 0.5rem; flex-shrink: 0; overflow: hidden;
    background: rgba(79,70,229,0.08);
  }
  .card-info { flex: 1; min-width: 0; }
  .card-name   { font-size: 0.82rem; font-weight: 700; color: var(--color-text); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-matric { font-size: 0.68rem; color: var(--color-muted); margin: 0.1rem 0 0; font-family: monospace; }
  .card-dept   { font-size: 0.65rem; color: var(--color-muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-status-dot {
    position: absolute; top: 0; right: 0;
    width: 8px; height: 8px; border-radius: 50%;
    border: 1.5px solid var(--color-surface);
  }
  .card-row { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
  .card-badge {
    font-size: 0.62rem; font-weight: 700; padding: 0.15rem 0.45rem;
    border-radius: 999px;
  }
  .card-level {
    font-size: 0.62rem; font-weight: 800; padding: 0.1rem 0.35rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.25rem; color: var(--color-muted);
  }
  .card-viols {
    font-size: 0.62rem; font-weight: 700; color: #dc2626;
    background: rgba(220,38,38,0.08); padding: 0.1rem 0.4rem;
    border-radius: 999px; margin-left: auto;
  }
  .card-time { font-size: 0.68rem; color: var(--color-muted); margin: 0; }
  .card-actions { display: flex; gap: 0.3rem; flex-wrap: wrap; padding-top: 0.25rem; border-top: 1px solid var(--color-border); margin-top: auto; }

  /* ── List view ───────────────────────────────────────────────────────────── */
  .list-table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: 0.75rem; }
  .list-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .list-table thead { background: var(--color-bg); position: sticky; top: 0; z-index: 5; }
  .list-table th {
    padding: 0.625rem 0.875rem; text-align: left;
    font-size: 0.68rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase;
    letter-spacing: 0.04em; border-bottom: 1.5px solid var(--color-border);
    white-space: nowrap;
  }
  .list-table th.sortable { cursor: pointer; user-select: none; }
  .list-table th.sortable:hover { color: var(--color-text); }
  .list-table th :global(.sort-on) { color: #4f46e5; }
  .th-photo { width: 44px; }
  .list-table td {
    padding: 0.75rem 0.875rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }
  .list-row:hover td { background: var(--color-surface); }
  .td-photo { width: 44px; padding-right: 0; }
  .list-photo { width: 36px; height: 36px; border-radius: 0.4rem; object-fit: cover; display: block; }
  .list-avatar {
    width: 36px; height: 36px; border-radius: 0.4rem;
    background: rgba(79,70,229,0.08); color: #4f46e5;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 800;
  }
  .list-name  { display: block; font-weight: 700; color: var(--color-text); }
  .list-email { display: block; font-size: 0.68rem; color: var(--color-muted); }
  .mono-pill {
    font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.75rem; font-weight: 700;
    padding: 0.15rem 0.4rem; background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.3rem;
  }
  .list-dept  { display: block; font-weight: 600; color: var(--color-text); }
  .list-level {
    display: inline-block; font-size: 0.65rem; font-weight: 800;
    padding: 0.1rem 0.35rem; background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.2rem; color: var(--color-muted); margin-left: 0.3rem;
  }
  .list-badge {
    display: inline-flex; font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem;
    border-radius: 0.35rem; white-space: nowrap;
  }
  .time-txt { font-size: 0.78rem; color: var(--color-text); }
  .muted { color: var(--color-muted); }
  .viol-badge {
    font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.45rem;
    background: rgba(220,38,38,0.08); color: #dc2626;
    border: 1px solid rgba(220,38,38,0.2); border-radius: 0.3rem;
  }
  .list-actions { display: flex; gap: 0.25rem; align-items: center; }
  .hide-sm { display: none; }
  .hide-md { display: none; }

  /* ── Action buttons shared ───────────────────────────────────────────────── */
  .ta-btn, .ca-btn, .la-btn {
    position: relative; width: 26px; height: 26px; border-radius: 0.35rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.12s; color: var(--color-muted); padding: 0;
  }
  .ta-btn:hover, .ca-btn:hover, .la-btn:hover { transform: scale(1.07); color: var(--color-text); border-color: var(--color-text); }
  .ta-btn.warn, .ca-btn.warn, .la-btn.warn { color: #d97706; border-color: rgba(245,158,11,0.3); }
  .ta-btn.warn:hover, .ca-btn.warn:hover, .la-btn.warn:hover { background: rgba(245,158,11,0.08); }
  .ta-btn.ok,   .ca-btn.ok,   .la-btn.ok   { color: #16a34a; border-color: rgba(22,163,74,0.3); }
  .ta-btn.ok:hover,   .ca-btn.ok:hover,   .la-btn.ok:hover   { background: rgba(22,163,74,0.08); }
  .ta-btn.danger, .ca-btn.danger, .la-btn.danger { color: #dc2626; border-color: rgba(220,38,38,0.3); }
  .ta-btn.danger:hover, .ca-btn.danger:hover, .la-btn.danger:hover { background: rgba(220,38,38,0.08); }
  .ta-btn.unread, .ca-btn.unread, .la-btn.unread { color: #4f46e5; border-color: rgba(79,70,229,0.3); }
  .unread-dot {
    position: absolute; top: 1px; right: 1px;
    width: 5px; height: 5px; border-radius: 50%; background: #dc2626;
  }

  /* ── Empty ───────────────────────────────────────────────────────────────── */
  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
    padding: 4rem 2rem; text-align: center; color: var(--color-muted);
  }
  .empty-ico {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--color-surface); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
  }
  .empty-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .clear-btn {
    padding: 0.4rem 0.875rem; border: 1px solid var(--color-border); border-radius: 0.45rem;
    background: none; font-size: 0.78rem; font-weight: 600; color: var(--color-text);
    cursor: pointer; font-family: inherit; transition: border-color 0.15s;
  }
  .clear-btn:hover { border-color: #4f46e5; color: #4f46e5; }

  /* ── Pagination ──────────────────────────────────────────────────────────── */
  .pagination {
    display: flex; align-items: center; gap: 0.3rem; justify-content: center;
    padding: 0.75rem 1rem; flex-shrink: 0;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .pg-btn {
    min-width: 32px; height: 32px; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.78rem; font-weight: 600; color: var(--color-text);
    cursor: pointer; font-family: inherit; transition: all 0.12s; padding: 0 0.5rem;
  }
  .pg-btn:hover:not(:disabled) { border-color: #4f46e5; color: #4f46e5; }
  .pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .pg-btn.pg-active { background: #4f46e5; border-color: #4f46e5; color: white; }
  .pg-ellipsis { font-size: 0.8rem; color: var(--color-muted); padding: 0 0.25rem; }
  .pg-info { font-size: 0.7rem; color: var(--color-muted); margin-left: 0.5rem; white-space: nowrap; }

  /* ── Chat panel ──────────────────────────────────────────────────────────── */
  .chat-panel {
    position: fixed; bottom: 1rem; right: 1rem; z-index: 400;
    width: min(320px, calc(100vw - 2rem));
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .chat-header {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.625rem 0.875rem;
    background: #4f46e5; color: white;
    font-size: 0.8rem; font-weight: 700;
  }
  .chat-close { margin-left: auto; background: none; border: none; color: white; cursor: pointer; display: flex; padding: 0; }
  .chat-msgs { flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; max-height: 240px; min-height: 80px; }
  .chat-empty { font-size: 0.75rem; color: var(--color-muted); text-align: center; margin: auto; }
  .chat-msg { display: flex; flex-direction: column; gap: 0.1rem; }
  .chat-msg.from-inv { align-items: flex-end; }
  .chat-bubble { font-size: 0.8rem; padding: 0.375rem 0.625rem; border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text); max-width: 85%; }
  .chat-msg.from-inv .chat-bubble { background: #4f46e5; color: white; }
  .chat-time { font-size: 0.58rem; color: var(--color-muted); }
  .chat-input-row { display: flex; gap: 0.375rem; padding: 0.5rem 0.75rem; border-top: 1px solid var(--color-border); }
  .chat-input {
    flex: 1; padding: 0.35rem 0.6rem; border: 1px solid var(--color-border); border-radius: 0.375rem;
    background: var(--color-bg); color: var(--color-text); font-size: 0.78rem; font-family: inherit; outline: none;
  }
  .chat-input:focus { border-color: #4f46e5; }
  .chat-send {
    width: 30px; height: 30px; flex-shrink: 0; border-radius: 0.35rem;
    background: #4f46e5; color: white; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: filter 0.15s;
  }
  .chat-send:disabled { opacity: 0.45; cursor: not-allowed; }
  .chat-send:not(:disabled):hover { filter: brightness(0.9); }

  /* ── Expanded camera overlay ─────────────────────────────────────────────── */
  .overlay-bg {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .overlay-feed {
    background: #111; border-radius: 0.875rem; overflow: hidden;
    max-width: 640px; width: 100%;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6);
  }
  .overlay-header {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.625rem 0.875rem; background: rgba(0,0,0,0.8);
  }
  .overlay-name   { font-size: 0.875rem; font-weight: 700; color: white; flex: 1; }
  .overlay-matric { font-size: 0.72rem; color: rgba(255,255,255,0.6); }
  .overlay-viols  { font-size: 0.72rem; font-weight: 700; color: #f87171; }
  .overlay-close {
    width: 28px; height: 28px; border-radius: 0.35rem; border: none;
    background: rgba(255,255,255,0.1); color: white; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .overlay-close:hover { background: rgba(255,255,255,0.2); }
  .overlay-img { width: 100%; display: block; max-height: 70vh; object-fit: contain; }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (min-width: 640px) {
    .hide-sm { display: table-cell; }
  }
  @media (min-width: 900px) {
    .hide-md { display: table-cell; }
  }
  @media (max-width: 480px) {
    .kpi-l { display: none; }
    .hdr-title { font-size: 0.85rem; }
    .content-area { padding: 0.5rem; }
    .cam-grid { grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); }
  }
</style>