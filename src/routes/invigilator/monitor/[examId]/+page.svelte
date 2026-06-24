<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { PageData } from './$types';
  import {
    Search, X, Users, Activity, CheckCircle, Clock,
    AlertTriangle, ShieldAlert, Filter,
    Play, Pause, Eye, Building2,
    ArrowUpDown, UserX, UserCheck,
    TrendingUp, Award, Lock, Send,
    MessageSquare, Radio, TimerReset,
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  const { exam } = data;

  // ── State ─────────────────────────────────────────────────────────────────
  let students        = $state(data.students ?? []);
  let search          = $state('');
  let statusFilter    = $state<'all' | 'not_started' | 'in_progress' | 'submitted' | 'force_submitted' | 'flagged'>('all');
  let sortBy          = $state<'name' | 'matric' | 'status' | 'score' | 'violations'>('name');
  let sortDir         = $state<'asc' | 'desc'>('asc');
  let ws: WebSocket | null = null;
  let wsConnected     = $state(false);
  let lastUpdated     = $state<Date>(new Date());
  let isCompleted     = $state(exam.status === 'completed');

  // Camera feeds
  interface FeedEntry {
    frame:           string;
    student_name:    string;
    matric:          string;
    status:          string;
    violation_count: number;
    updated_at:      number;
  }
  let cameraFeeds  = $state(new Map<string, FeedEntry>());
  let showCameras  = $state(false);

  // Announcement
  let announcement = $state('');
  let announceSent = $state(false);

  // Chat
  interface ChatMsg { session_id: string; from: string; message: string; time: Date; }
  let chatMessages = $state<ChatMsg[]>([]);
  let chatTarget   = $state<string | null>(null);
  let chatInput    = $state('');
  let unreadChats  = $state<Set<string>>(new Set());

    
  // ── Filtering / sorting ────────────────────────────────────────────────────
  const filteredStudents = $derived.by(() => {
    let list = students;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.fullName      ?? '').toLowerCase().includes(q) ||
        (s.matricNumber  ?? '').toLowerCase().includes(q) ||
        (s.department?.name ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':       cmp = (a.fullName ?? '').localeCompare(b.fullName ?? ''); break;
        case 'matric':     cmp = (a.matricNumber ?? '').localeCompare(b.matricNumber ?? ''); break;
        case 'status': {
          const o = { not_started:0, in_progress:1, flagged:2, submitted:3, force_submitted:4 };
          cmp = (o[a.status as keyof typeof o] ?? 0) - (o[b.status as keyof typeof o] ?? 0);
          break;
        }
        case 'score':      cmp = (a.percentage ?? 0) - (b.percentage ?? 0); break;
        case 'violations': cmp = (a.violationCount ?? 0) - (b.violationCount ?? 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = $derived.by(() => {
    const total          = students.length;
    const notStarted     = students.filter(s => s.status === 'not_started').length;
    const inProgress     = students.filter(s => s.status === 'in_progress').length;
    const submitted      = students.filter(s => s.status === 'submitted' || s.status === 'force_submitted').length;
    const flagged        = students.filter(s => s.status === 'flagged').length;
    const tookExam       = students.filter(s => s.status !== 'not_started').length;
    const totalViolations = students.reduce((sum, s) => sum + (s.violationCount ?? 0), 0);
    const gradedStudents = students.filter(s => s.percentage != null);
    const avgScore       = gradedStudents.length > 0
      ? gradedStudents.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / gradedStudents.length
      : 0;
    return { total, notStarted, inProgress, submitted, flagged, tookExam, didntTake: notStarted, avgScore, totalViolations };
  });

  
  // ── Status config ──────────────────────────────────────────────────────────
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    not_started:     { label: 'Not Started',     color: '#64748b', bg: 'rgba(100,116,139,0.08)', icon: Clock       },
    in_progress:     { label: 'In Progress',     color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   icon: Play        },
    flagged:         { label: 'Paused',          color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: Pause       },
    submitted:       { label: 'Submitted',       color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   icon: CheckCircle },
    force_submitted: { label: 'Force Submitted', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   icon: ShieldAlert },
  };
  function getStatusConfig(status: string) { return STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started; }

  // ── WebSocket ──────────────────────────────────────────────────────────────
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  function connectWs() {
    if (isCompleted) return;
    try {
      // FIX: Use the same WebSocket endpoint as the working version
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        wsConnected = true;
        // FIX: Match the message format expected by the server
        ws!.send(JSON.stringify({ type: 'join_exam', examId: exam.id, role: 'invigilator' }));

        heartbeatTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat', role: 'invigilator' }));
          }
        }, 30_000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          lastUpdated = new Date();

          switch (msg.type) {
            case 'room_state':
              // FIX: Handle the data format from the server
              if (msg.students) {
                for (const s of msg.students) {
                  students = students.map(st =>
                    st.sessionId === s.session_id
                      ? { ...st, status: s.status, violationCount: s.violation_count }
                      : st
                  );
                }
              }
              break;

            case 'student_status':
              // FIX: Handle student status updates
              students = students.map(s =>
                s.studentId === msg.studentId || s.sessionId === msg.session_id
                  ? { ...s, status: msg.status }
                  : s
              );
              break;

            case 'student_joined':
              students = students.map(s =>
                s.studentId === msg.student_id || s.sessionId === msg.session_id
                  ? { ...s, status: 'in_progress' }
                  : s
              );
              break;

            case 'student_left':
              // keep existing status
              break;

            case 'violation':
              students = students.map(s =>
                s.sessionId === msg.session_id || s.studentId === msg.studentId
                  ? { ...s, violationCount: msg.violation_count || msg.violationCount }
                  : s
              );
              break;

            case 'exam_submitted':
              students = students.map(s =>
                s.sessionId === msg.session_id || s.studentId === msg.studentId
                  ? { ...s, status: 'submitted', score: msg.score, percentage: msg.percentage }
                  : s
              );
              // Remove feed if session_id exists
              if (msg.session_id) {
                cameraFeeds = new Map([...cameraFeeds].filter(([k]) => k !== msg.session_id));
              }
              break;

            case 'camera_frame_broadcast':
              cameraFeeds = new Map(cameraFeeds.set(msg.session_id, {
                frame:           msg.frame,
                student_name:    msg.student_name,
                matric:          msg.matric,
                status:          msg.status,
                violation_count: msg.violation_count,
                updated_at:      Date.now(),
              }));
              break;

            case 'chat':
              chatMessages = [...chatMessages, {
                session_id: msg.session_id,
                from:       msg.from,
                message:    msg.message,
                time:       new Date(),
              }];
              if (msg.from === 'student' && chatTarget !== msg.session_id) {
                unreadChats = new Set([...unreadChats, msg.session_id]);
              }
              break;
          }
        } catch (err) { 
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onclose = () => {
        wsConnected = false;
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
        if (!isCompleted) setTimeout(connectWs, 3_000);
      };

      ws.onerror = (err) => { 
        wsConnected = false;
        console.error('WebSocket error:', err);
      };
    } catch (err) { 
      console.error('WebSocket connection error:', err);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function pauseStudent(studentId: string) {
    if (isCompleted) return;
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, examId: exam.id, action: 'pause' }),
    });
    students = students.map(s => s.studentId === studentId ? { ...s, status: 'flagged' } : s);
  }

  async function resumeStudent(studentId: string) {
    if (isCompleted) return;
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, examId: exam.id, action: 'resume' }),
    });
    students = students.map(s => s.studentId === studentId ? { ...s, status: 'in_progress' } : s);
  }

  async function forceSubmitStudent(studentId: string) {
    if (isCompleted) return;
    if (!confirm('Force submit this student\'s exam? This cannot be undone.')) return;
    await fetch('/api/invigilator/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, examId: exam.id, action: 'force_submit' }),
    });
    students = students.map(s => s.studentId === studentId ? { ...s, status: 'force_submitted' } : s);
  }

  function sendAnnouncement() {
    if (!announcement.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'announcement', exam_id: exam.id, message: announcement.trim() }));
    announcement = '';
    announceSent = true;
    setTimeout(() => announceSent = false, 2_000);
  }

  function sendChat() {
    if (!chatInput.trim() || !chatTarget || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'chat', session_id: chatTarget, from: 'invigilator', message: chatInput.trim() }));
    chatMessages = [...chatMessages, { session_id: chatTarget, from: 'invigilator', message: chatInput.trim(), time: new Date() }];
    chatInput = '';
  }

  function giveTime(session_id: string, secs: number) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'time_correction', session_id, add_secs: secs }));
  }

  function openChat(session_id: string) {
    chatTarget  = session_id;
    unreadChats = new Set([...unreadChats].filter(id => id !== session_id));
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortBy = field; sortDir = 'asc'; }
  }

  function formatDuration(secs: number | null) {
    if (secs == null) return '—';
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}m ${s}s`;
  }

  function formatTime(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function sessionIdForStudent(studentId: string): string | null {
    return students.find(s => s.studentId === studentId)?.sessionId ?? null;
  }

  onMount(() => { if (!isCompleted) connectWs(); });
  onDestroy(() => {
    ws?.close();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  });
</script>

<svelte:head><title>Monitor — {exam.title}</title></svelte:head>

<div class="monitor-page">

  <!-- ══ HEADER ═══════════════════════════════════════════════════════════════ -->
  <header class="monitor-header">
    <div class="header-left">
      <div class="exam-badge">{exam.course?.code ?? '—'}</div>
      <div>
        <h1 class="exam-title">{exam.title}</h1>
        <p class="exam-meta">
          <span class="meta-item"><Building2 size={12} /> {exam.course?.title ?? '—'}</span>
          <span class="meta-item"><Clock size={12} /> {exam.durationMinutes} min</span>
          {#if isCompleted}
            <span class="status-badge completed"><Lock size={11} /> Completed</span>
          {:else}
            <span class="ws-pill" class:connected={wsConnected}>
              <span class="ws-dot"></span>
              {wsConnected ? 'Live' : 'Reconnecting…'}
            </span>
          {/if}
        </p>
      </div>
    </div>
  </header>

  <!-- ══ KPI CARDS ══════════════════════════════════════════════════════════ -->
  <div class="kpi-section">
    <div class="kpi-card total">
      <div class="kpi-icon"><Users size={18} /></div>
      <div class="kpi-body"><span class="kpi-val">{stats.total}</span><span class="kpi-lbl">Registered</span></div>
    </div>
    <div class="kpi-card active">
      <div class="kpi-icon"><Activity size={18} /></div>
      <div class="kpi-body"><span class="kpi-val">{stats.inProgress}</span><span class="kpi-lbl">In Progress</span></div>
    </div>
    <div class="kpi-card done">
      <div class="kpi-icon"><CheckCircle size={18} /></div>
      <div class="kpi-body"><span class="kpi-val">{stats.submitted}</span><span class="kpi-lbl">Submitted</span></div>
    </div>
    <div class="kpi-card paused">
      <div class="kpi-icon"><AlertTriangle size={18} /></div>
      <div class="kpi-body"><span class="kpi-val">{stats.flagged}</span><span class="kpi-lbl">Paused</span></div>
    </div>
    <div class="kpi-card not-started">
      <div class="kpi-icon"><Clock size={18} /></div>
      <div class="kpi-body"><span class="kpi-val">{stats.notStarted}</span><span class="kpi-lbl">Not Started</span></div>
    </div>
    <div class="kpi-card violations">
      <div class="kpi-icon"><ShieldAlert size={18} /></div>
      <div class="kpi-body"><span class="kpi-val">{stats.totalViolations}</span><span class="kpi-lbl">Violations</span></div>
    </div>
    <div class="kpi-card avg">
      <div class="kpi-icon"><TrendingUp size={18} /></div>
      <div class="kpi-body"><span class="kpi-val">{stats.avgScore.toFixed(1)}%</span><span class="kpi-lbl">Avg Score</span></div>
    </div>
  </div>

  <!-- ══ FEED BAR ═══════════════════════════════════════════════════════════ -->
  {#if !isCompleted}
    <div class="feed-bar">
      <button class="feed-toggle" onclick={() => showCameras = !showCameras}>
        <Eye size={14} />
        {showCameras ? 'Hide' : 'Show'} Camera Feeds
        {#if cameraFeeds.size > 0}
          <span class="feed-count">{cameraFeeds.size} live</span>
        {/if}
      </button>

      <div class="announcement-wrap">
        <Radio size={14} class="announce-icon" />
        <input
          class="announcement-input"
          type="text"
          placeholder="Announce to all students…"
          bind:value={announcement}
          onkeydown={(e) => e.key === 'Enter' && sendAnnouncement()}
        />
        <button
          class="announcement-btn"
          onclick={sendAnnouncement}
          disabled={!announcement.trim() || announceSent}
        >
          {announceSent ? 'Sent ✓' : 'Send'}
        </button>
      </div>

      {#if unreadChats.size > 0}
        <div class="unread-badge">
          <MessageSquare size={13} /> {unreadChats.size} unread
        </div>
      {/if}
    </div>

    <!-- ══ CAMERA GRID ══════════════════════════════════════════════════════ -->
    {#if showCameras}
      <div class="camera-grid">
        {#if cameraFeeds.size === 0}
          <div class="camera-empty">
            No feeds yet — students connect their cameras when they start the exam.
          </div>
        {:else}
          {#each [...cameraFeeds.entries()] as [session_id, feed]}
            {@const stale   = Date.now() - feed.updated_at > 15_000}
            {@const flagged = feed.status === 'flagged'}
            {@const student = students.find(s => s.sessionId === session_id)}
            <div class="camera-tile" class:stale class:cam-flagged={flagged}>
              <img src={feed.frame} alt={feed.student_name} class="camera-img" loading="lazy" />

              <div class="camera-overlay">
                <span class="camera-name">{feed.student_name}</span>
                <span class="camera-matric">{feed.matric}</span>
              </div>

              {#if feed.violation_count > 0}
                <span class="camera-violations">{feed.violation_count} ⚠</span>
              {/if}

              {#if stale}
                <div class="camera-stale">Feed lost</div>
              {/if}

              <div class="camera-actions">
                <button
                  class="cam-btn"
                  onclick={() => openChat(session_id)}
                  title="Chat with student"
                >
                  <MessageSquare size={11} />
                </button>
                {#if feed.status === 'in_progress' && student}
                  <button
                    class="cam-btn warn"
                    onclick={() => pauseStudent(student.studentId)}
                    title="Pause"
                  >
                    <Pause size={11} />
                  </button>
                {:else if feed.status === 'flagged' && student}
                  <button
                    class="cam-btn ok"
                    onclick={() => resumeStudent(student.studentId)}
                    title="Resume"
                  >
                    <Play size={11} />
                  </button>
                {/if}
                <button
                  class="cam-btn time"
                  onclick={() => giveTime(session_id, 300)}
                  title="Give +5 minutes"
                >
                  <TimerReset size={11} />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  {/if}

  <!-- ══ TOOLBAR ════════════════════════════════════════════════════════════ -->
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
        <button class="search-clear" onclick={() => search = ''} type="button"><X size={12} /></button>
      {/if}
    </div>

    <div class="filter-chips">
      {#each [
        ['all',            'All',           stats.total      ],
        ['not_started',    'Not Started',   stats.notStarted ],
        ['in_progress',    'In Progress',   stats.inProgress ],
        ['flagged',        'Paused',        stats.flagged    ],
        ['submitted',      'Submitted',     stats.submitted  ],
      ] as [val, label, count]}
        <button
          class="filter-chip"
          class:active={statusFilter === val}
          onclick={() => statusFilter = val as any}
        >{label} <span class="chip-count">{count}</span></button>
      {/each}
    </div>

    <div class="toolbar-right">
      <span class="result-count">{filteredStudents.length} of {stats.total}</span>
      {#if !isCompleted}
        <span class="updated-at">Updated {formatTime(lastUpdated)}</span>
      {/if}
    </div>
  </div>

  <!-- ══ SUMMARY BAR ════════════════════════════════════════════════════════ -->
  <div class="summary-bar">
    <div class="summary-item">
      <UserCheck size={14} class="summary-icon ok" />
      <span class="summary-val">{stats.tookExam}</span>
      <span class="summary-lbl">Took exam</span>
    </div>
    <div class="summary-divider"></div>
    <div class="summary-item">
      <UserX size={14} class="summary-icon bad" />
      <span class="summary-val">{stats.didntTake}</span>
      <span class="summary-lbl">Did not take</span>
    </div>
    <div class="summary-divider"></div>
    <div class="summary-item">
      <Award size={14} class="summary-icon" />
      <span class="summary-val">{stats.avgScore.toFixed(1)}%</span>
      <span class="summary-lbl">Average</span>
    </div>
  </div>

  <!-- ══ TABLE ══════════════════════════════════════════════════════════════ -->
  <div class="table-container">
    <table class="students-table">
      <thead>
        <tr>
          <th onclick={() => toggleSort('name')}>
            Student <ArrowUpDown size={12} class={sortBy === 'name' ? 'sort-active' : ''} />
          </th>
          <th onclick={() => toggleSort('matric')}>
            Matric <ArrowUpDown size={12} class={sortBy === 'matric' ? 'sort-active' : ''} />
          </th>
          <th>Department</th>
          <th>Level</th>
          <th onclick={() => toggleSort('status')}>
            Status <ArrowUpDown size={12} class={sortBy === 'status' ? 'sort-active' : ''} />
          </th>
          <th>Time</th>
          <th onclick={() => toggleSort('score')}>
            Score <ArrowUpDown size={12} class={sortBy === 'score' ? 'sort-active' : ''} />
          </th>
          <th onclick={() => toggleSort('violations')}>
            <ShieldAlert size={12} /> <ArrowUpDown size={12} class={sortBy === 'violations' ? 'sort-active' : ''} />
          </th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredStudents as student (student.studentId)}
          {@const cfg = getStatusConfig(student.status)}
          {@const StatusIcon = cfg.icon}
          {@const hasUnread  = unreadChats.has(student.sessionId ?? '')}
          <tr class="student-row">
            <td>
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
            <td><span class="matric-pill">{student.matricNumber ?? '—'}</span></td>
            <td>
              <span class="dept-text">{student.department?.name ?? '—'}</span>
              <span class="dept-code">{student.department?.code ?? ''}</span>
            </td>
            <td><span class="level-pill">{student.level?.level ?? '—'}L</span></td>
            <td>
              <span class="status-badge" style="color:{cfg.color};background:{cfg.bg}">
                <StatusIcon size={12} /> {cfg.label}
              </span>
            </td>
            <td>
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
            <td>
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
            <td>
              {#if (student.violationCount ?? 0) > 0}
                <span class="violation-badge">{student.violationCount}</span>
              {:else}
                <span class="violation-zero">0</span>
              {/if}
            </td>
            <td>
              <div class="action-btns">
                {#if !isCompleted && student.sessionId}
                  <!-- Chat -->
                  <button
                    class="action-btn view"
                    class:unread={hasUnread}
                    onclick={() => openChat(student.sessionId!)}
                    title="Chat"
                  >
                    <MessageSquare size={13} />
                    {#if hasUnread}<span class="unread-dot"></span>{/if}
                  </button>
                  <!-- Give time -->
                  <button
                    class="action-btn time-btn"
                    onclick={() => giveTime(student.sessionId!, 300)}
                    title="Give +5 minutes"
                  >
                    <TimerReset size={13} />
                  </button>
                {/if}
                {#if isCompleted}
                  <span class="action-none">—</span>
                {:else if student.status === 'in_progress'}
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
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if filteredStudents.length === 0}
      <div class="empty-state">
        <div class="empty-icon"><Search size={32} strokeWidth={1.2} /></div>
        <p class="empty-title">
          {search ? `No results for "${search}"` : 'No students in this category'}
        </p>
        {#if search}
          <button class="clear-btn" onclick={() => search = ''}>Clear search</button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- ══ CHAT PANEL ════════════════════════════════════════════════════════ -->
  {#if chatTarget}
    {@const msgs    = chatMessages.filter(m => m.session_id === chatTarget)}
    {@const student = students.find(s => s.sessionId === chatTarget)}
    <div class="chat-panel">
      <div class="chat-header">
        <span><MessageSquare size={13} /> {student?.fullName ?? 'Student'}</span>
        <button onclick={() => chatTarget = null}>✕</button>
      </div>
      <div class="chat-messages" id="chat-scroll">
        {#if msgs.length === 0}
          <p class="chat-empty">No messages yet. Send the first one.</p>
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
          class="chat-input"
          type="text"
          placeholder="Message…"
          bind:value={chatInput}
          onkeydown={(e) => e.key === 'Enter' && sendChat()}
        />
        <button class="chat-send" onclick={sendChat} disabled={!chatInput.trim()}>
          <Send size={13} />
        </button>
      </div>
    </div>
  {/if}

</div>

<style>
  .monitor-page {
    display: flex; flex-direction: column;
    height: 100vh; overflow: hidden;
    background: var(--color-bg);
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
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
    color: white; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em;
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
    border: 1px solid rgba(220,38,38,0.2); transition: all 0.3s;
  }
  .ws-pill.connected { background: rgba(34,197,94,0.08); color: #16a34a; border-color: rgba(34,197,94,0.25); }
  .ws-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  .ws-pill.connected .ws-dot { animation: ws-blink 2s ease-in-out infinite; }
  @keyframes ws-blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
  .status-badge.completed {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.65rem; font-weight: 700; padding: 0.12rem 0.5rem;
    border-radius: 999px; background: rgba(100,116,139,0.08);
    color: #64748b; border: 1px solid rgba(100,116,139,0.2);
  }

  /* ── KPI Cards ───────────────────────────────────────────────────────────── */
  .kpi-section {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.75rem; padding: 0.875rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  }
  .kpi-card {
    display: flex; align-items: center; gap: 0.625rem;
    padding: 0.75rem 1rem; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 0.625rem; transition: all 0.15s;
  }
  .kpi-card:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .kpi-icon { width: 36px; height: 36px; border-radius: 0.5rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .kpi-card.total .kpi-icon       { background: rgba(100,116,139,0.1); color: #64748b; }
  .kpi-card.active .kpi-icon      { background: rgba(22,163,74,0.1);   color: #16a34a; }
  .kpi-card.done .kpi-icon        { background: rgba(37,99,235,0.1);   color: #2563eb; }
  .kpi-card.paused .kpi-icon      { background: rgba(245,158,11,0.1);  color: #d97706; }
  .kpi-card.not-started .kpi-icon { background: rgba(148,163,184,0.1); color: #64748b; }
  .kpi-card.violations .kpi-icon  { background: rgba(220,38,38,0.08);  color: #dc2626; }
  .kpi-card.avg .kpi-icon         { background: rgba(139,92,246,0.1);  color: #7c3aed; }
  .kpi-body { display: flex; flex-direction: column; gap: 0.05rem; }
  .kpi-val  { font-size: 1.25rem; font-weight: 900; line-height: 1; color: var(--color-text); font-variant-numeric: tabular-nums; }
  .kpi-lbl  { font-size: 0.65rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }

  /* ── Feed bar ────────────────────────────────────────────────────────────── */
  .feed-bar {
    display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap;
    padding: 0.5rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  }
  .feed-toggle {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.875rem; border-radius: 0.5rem;
    border: 1px solid var(--color-border); background: var(--color-bg);
    font-size: 0.78rem; font-weight: 700; color: var(--color-text);
    cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap;
  }
  .feed-toggle:hover { border-color: #4f46e5; color: #4f46e5; }
  .feed-count {
    background: #4f46e5; color: white;
    font-size: 0.65rem; font-weight: 800; padding: 0.1rem 0.4rem; border-radius: 999px;
  }
  .announcement-wrap {
    display: flex; align-items: center; gap: 0.5rem; flex: 1; max-width: 480px;
  }
  .announcement-wrap :global(.announce-icon) { color: var(--color-muted); flex-shrink: 0; }
  .announcement-input {
    flex: 1; padding: 0.4rem 0.75rem;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.8rem; font-family: inherit; outline: none;
  }
  .announcement-input:focus { border-color: #4f46e5; }
  .announcement-btn {
    padding: 0.4rem 1rem; background: #4f46e5; color: white;
    border: none; border-radius: 0.5rem;
    font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: inherit;
    white-space: nowrap; transition: filter 0.15s;
  }
  .announcement-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .announcement-btn:not(:disabled):hover { filter: brightness(0.9); }
  .unread-badge {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.6rem;
    background: rgba(220,38,38,0.08); color: #dc2626;
    border: 1px solid rgba(220,38,38,0.2); border-radius: 999px;
  }

  /* ── Camera grid ─────────────────────────────────────────────────────────── */
  .camera-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem; padding: 0.875rem 1.5rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    max-height: 300px; overflow-y: auto; flex-shrink: 0;
  }
  .camera-empty {
    grid-column: 1/-1; text-align: center;
    font-size: 0.8rem; color: var(--color-muted); padding: 2rem;
  }
  .camera-tile {
    position: relative; border-radius: 0.625rem; overflow: hidden;
    border: 2px solid var(--color-border); background: #111;
    aspect-ratio: 4/3; transition: border-color 0.2s;
  }
  .camera-tile:hover { border-color: #4f46e5; }
  .camera-tile.stale      { border-color: #6b7280; opacity: 0.6; }
  .camera-tile.cam-flagged { border-color: #f59e0b; }
  .camera-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.75));
    padding: 0.5rem 0.5rem 0.4rem;
    display: flex; flex-direction: column; gap: 0.1rem;
  }
  .camera-name   { font-size: 0.72rem; font-weight: 700; color: white; }
  .camera-matric { font-size: 0.62rem; color: rgba(255,255,255,0.7); }
  .camera-violations {
    position: absolute; top: 0.3rem; right: 0.3rem;
    background: #dc2626; color: white;
    font-size: 0.62rem; font-weight: 800;
    padding: 0.1rem 0.35rem; border-radius: 999px;
  }
  .camera-stale {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; background: rgba(0,0,0,0.55);
    color: white; font-size: 0.72rem; font-weight: 700;
  }
  .camera-actions {
    position: absolute; top: 0.3rem; left: 0.3rem;
    display: flex; gap: 0.25rem; opacity: 0; transition: opacity 0.15s;
  }
  .camera-tile:hover .camera-actions { opacity: 1; }
  .cam-btn {
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border-radius: 0.25rem; border: none;
    background: rgba(0,0,0,0.65); color: white; cursor: pointer;
    backdrop-filter: blur(4px); transition: background 0.15s;
  }
  .cam-btn.warn { background: rgba(245,158,11,0.85); }
  .cam-btn.ok   { background: rgba(22,163,74,0.85); }
  .cam-btn.time { background: rgba(37,99,235,0.85); }

  /* ── Toolbar ─────────────────────────────────────────────────────────────── */
  .toolbar {
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    padding: 0.625rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  }
  .search-wrap { position: relative; display: flex; align-items: center; flex-shrink: 0; }
  .search-wrap :global(.search-icon) { position: absolute; left: 0.625rem; color: var(--color-muted); pointer-events: none; }
  .search-input {
    padding: 0.45rem 0.625rem 0.45rem 2rem;
    border: 1px solid var(--color-border); border-radius: 0.5rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.8rem; width: 260px; outline: none; transition: border-color 0.15s;
  }
  .search-input:focus { border-color: #4f46e5; }
  .search-clear {
    position: absolute; right: 0.5rem; background: none; border: none;
    cursor: pointer; color: var(--color-muted); padding: 0.15rem;
    border-radius: 0.25rem; display: flex; align-items: center;
  }
  .search-clear:hover { color: var(--color-text); }
  .filter-chips { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .filter-chip {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.75rem; border: 1px solid var(--color-border);
    border-radius: 999px; background: none; color: var(--color-muted);
    font-size: 0.75rem; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: all 0.15s; white-space: nowrap;
  }
  .filter-chip:hover { border-color: #4f46e5; color: #4f46e5; }
  .filter-chip.active { background: #4f46e5; border-color: #4f46e5; color: white; }
  .chip-count {
    background: rgba(0,0,0,0.12); color: inherit;
    font-size: 0.65rem; font-weight: 800;
    padding: 0.05rem 0.35rem; border-radius: 999px; line-height: 1.5;
  }
  .filter-chip.active .chip-count { background: rgba(255,255,255,0.25); }
  .toolbar-right { margin-left: auto; display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
  .result-count { font-size: 0.72rem; font-weight: 600; color: var(--color-muted); }
  .updated-at   { font-size: 0.68rem; color: var(--color-muted); opacity: 0.7; }

  /* ── Summary bar ─────────────────────────────────────────────────────────── */
  .summary-bar {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.5rem 1.5rem; background: var(--color-bg);
    border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  }
  .summary-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--color-muted); }
  .summary-val  { font-weight: 700; color: var(--color-text); }
  .summary-icon.ok  { color: #16a34a; }
  .summary-icon.bad { color: #dc2626; }
  .summary-divider  { width: 1px; height: 16px; background: var(--color-border); }

  /* ── Table ───────────────────────────────────────────────────────────────── */
  .table-container { flex: 1; overflow: auto; padding: 0 1.5rem 1.5rem; }
  .table-container::-webkit-scrollbar { width: 6px; height: 6px; }
  .table-container::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
  .students-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.85rem; }
  .students-table thead { position: sticky; top: 0; z-index: 10; background: var(--color-surface); }
  .students-table th {
    padding: 0.75rem 1rem; text-align: left; font-weight: 700; font-size: 0.72rem;
    color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 2px solid var(--color-border); cursor: pointer; user-select: none;
    transition: color 0.15s; white-space: nowrap;
  }
  .students-table th:hover { color: var(--color-text); }
  .students-table th :global(.sort-active) { color: #4f46e5; }
  .students-table td { padding: 0.875rem 1rem; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
  .student-row { transition: background 0.1s; }
  .student-row:hover { background: var(--color-surface); }

  .student-cell { display: flex; align-items: center; gap: 0.75rem; }
  .avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; overflow: hidden; background: var(--color-border); display: flex; align-items: center; justify-content: center; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-fallback { font-size: 0.875rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; }
  .student-info { display: flex; flex-direction: column; gap: 0.1rem; }
  .student-name  { font-weight: 700; color: var(--color-text); }
  .student-email { font-size: 0.72rem; color: var(--color-muted); }
  .matric-pill { font-family: monospace; font-size: 0.78rem; font-weight: 700; padding: 0.2rem 0.5rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.3rem; }
  .dept-text { display: block; font-weight: 600; color: var(--color-text); }
  .dept-code { font-size: 0.72rem; color: var(--color-muted); }
  .level-pill { font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.4rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.25rem; color: var(--color-muted); }
  .status-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 700; padding: 0.3rem 0.65rem; border-radius: 0.4rem; white-space: nowrap; }
  .time-remaining { font-size: 0.78rem; font-weight: 600; color: #16a34a; }
  .time-submitted { font-size: 0.78rem; color: #2563eb; }
  .time-started   { font-size: 0.78rem; color: var(--color-muted); }
  .time-none      { font-size: 0.78rem; color: var(--color-muted); }
  .score-cell { display: flex; align-items: center; gap: 0.4rem; }
  .score-val  { font-size: 0.875rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .score-val.pass { color: #16a34a; }
  .score-val.fail { color: #dc2626; }
  .score-grade { font-size: 0.7rem; font-weight: 800; padding: 0.1rem 0.35rem; border-radius: 0.2rem; background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted); }
  .score-none { font-size: 0.78rem; color: var(--color-muted); }
  .violation-badge { font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 0.3rem; background: rgba(220,38,38,0.08); color: #dc2626; border: 1px solid rgba(220,38,38,0.2); }
  .violation-zero  { font-size: 0.78rem; color: var(--color-muted); }

  .action-btns { display: flex; gap: 0.3rem; align-items: center; }
  .action-btn {
    position: relative; width: 28px; height: 28px; border-radius: 0.4rem;
    border: 1px solid var(--color-border); background: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; color: var(--color-muted);
  }
  .action-btn:hover { transform: scale(1.05); }
  .action-btn.pause    { color: #f59e0b; border-color: rgba(245,158,11,0.3); }
  .action-btn.pause:hover { background: rgba(245,158,11,0.08); }
  .action-btn.resume   { color: #16a34a; border-color: rgba(22,163,74,0.3); }
  .action-btn.resume:hover { background: rgba(22,163,74,0.08); }
  .action-btn.force    { color: #dc2626; border-color: rgba(220,38,38,0.3); }
  .action-btn.force:hover  { background: rgba(220,38,38,0.08); }
  .action-btn.view     { color: #4f46e5; border-color: rgba(79,70,229,0.3); }
  .action-btn.view:hover   { background: rgba(79,70,229,0.08); }
  .action-btn.time-btn { color: #2563eb; border-color: rgba(37,99,235,0.3); }
  .action-btn.time-btn:hover { background: rgba(37,99,235,0.08); }
  .action-btn.unread   { border-color: #dc2626; color: #dc2626; }
  .unread-dot {
    position: absolute; top: 2px; right: 2px;
    width: 6px; height: 6px; border-radius: 50%; background: #dc2626;
    border: 1px solid var(--color-surface);
  }
  .action-none { font-size: 0.78rem; color: var(--color-muted); padding: 0.3rem; }

  /* ── Empty state ─────────────────────────────────────────────────────────── */
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 4rem 2rem; text-align: center; }
  .empty-icon { width: 60px; height: 60px; border-radius: 1rem; background: var(--color-surface); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; color: var(--color-muted); }
  .empty-title { font-size: 0.9rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .clear-btn { padding: 0.4rem 0.875rem; background: none; border: 1px solid var(--color-border); border-radius: 0.5rem; font-size: 0.78rem; font-weight: 600; color: var(--color-text); cursor: pointer; font-family: inherit; transition: all 0.15s; }
  .clear-btn:hover { border-color: #4f46e5; color: #4f46e5; }

  /* ── Chat panel ──────────────────────────────────────────────────────────── */
  .chat-panel {
    position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 300;
    width: 320px; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: 0.875rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .chat-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.625rem 0.875rem;
    background: #4f46e5; color: white;
    font-size: 0.8rem; font-weight: 700;
  }
  .chat-header button { background: none; border: none; color: white; cursor: pointer; font-size: 1rem; padding: 0; line-height: 1; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; max-height: 260px; min-height: 80px; }
  .chat-empty { font-size: 0.75rem; color: var(--color-muted); text-align: center; margin: auto; }
  .chat-msg { display: flex; flex-direction: column; gap: 0.15rem; }
  .chat-msg.from-inv { align-items: flex-end; }
  .chat-bubble { font-size: 0.8rem; padding: 0.4rem 0.65rem; border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text); max-width: 85%; }
  .chat-msg.from-inv .chat-bubble { background: #4f46e5; color: white; }
  .chat-time { font-size: 0.6rem; color: var(--color-muted); }
  .chat-input-row { display: flex; gap: 0.4rem; padding: 0.5rem 0.75rem; border-top: 1px solid var(--color-border); }
  .chat-input { flex: 1; padding: 0.375rem 0.6rem; border: 1px solid var(--color-border); border-radius: 0.375rem; background: var(--color-bg); color: var(--color-text); font-size: 0.78rem; font-family: inherit; outline: none; }
  .chat-input:focus { border-color: #4f46e5; }
  .chat-send { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #4f46e5; color: white; border: none; border-radius: 0.375rem; cursor: pointer; transition: filter 0.15s; flex-shrink: 0; }
  .chat-send:disabled { opacity: 0.45; cursor: not-allowed; }
  .chat-send:not(:disabled):hover { filter: brightness(0.9); }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (max-width: 1024px) {
    .kpi-section { grid-template-columns: repeat(4,1fr); }
    .students-table th, .students-table td { padding: 0.625rem 0.75rem; }
  }
  @media (max-width: 768px) {
    .monitor-header { flex-direction: column; align-items: flex-start; }
    .kpi-section { grid-template-columns: repeat(2,1fr); }
    .toolbar { flex-direction: column; align-items: stretch; }
    .search-input { width: 100%; }
    .toolbar-right { margin-left: 0; }
    .camera-grid { grid-template-columns: repeat(auto-fill, minmax(140px,1fr)); }
    .chat-panel { width: calc(100vw - 2rem); right: 1rem; bottom: 1rem; }
  }
</style>