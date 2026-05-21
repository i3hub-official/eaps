<!-- src/routes/(invigilator)/monitor/[examId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import type { PageData } from './$types';
  import {
    Users, AlertTriangle, CheckCircle, Clock, ShieldAlert,
    Play, Pause, StopCircle, RefreshCw, Wifi, WifiOff
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  // ── Reactive state ──────────────────────────────────────
  type Session = {
    id: string;
    student_id: string;
    full_name: string;
    matric_number: string;
    department: string;
    status: string;
    violation_count: number;
    flag_count: number;
    started_at: string | null;
  };

  type ViolationEvent = {
    session_id: string;
    student_name: string;
    matric_number: string;
    flag_type: string;
    action: string;
    violation_count: number;
    time: string;
  };

  let sessions = $state<Session[]>(data.sessions ?? []);
  let recentFlags = $state<ViolationEvent[]>([]);
  let wsConnected = $state(false);
  let selectedSession = $state<Session | null>(null);
  let filterStatus = $state('all');
  let ws: WebSocket | null = null;

  // ── Derived stats ───────────────────────────────────────
  const stats = $derived({
    total: sessions.length,
    active: sessions.filter(s => s.status === 'in_progress').length,
    submitted: sessions.filter(s => s.status === 'submitted' || s.status === 'force_submitted').length,
    flagged: sessions.filter(s => s.violation_count > 0).length,
    notStarted: sessions.filter(s => s.status === 'not_started').length,
  });

  const filteredSessions = $derived(
    filterStatus === 'all'
      ? sessions
      : sessions.filter(s => {
          if (filterStatus === 'flagged') return s.violation_count > 0;
          return s.status === filterStatus;
        })
  );

  // ── WebSocket ───────────────────────────────────────────
  function connectWs() {
    const wsPort = 3001;
    ws = new WebSocket(`ws://localhost:${wsPort}`);

    ws.onopen = () => {
      wsConnected = true;
      ws?.send(JSON.stringify({ type: 'join_exam', exam_id: data.exam.id, role: 'invigilator' }));
    };

    ws.onclose = () => {
      wsConnected = false;
      setTimeout(connectWs, 3000); // auto-reconnect
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'violation') {
        // Update session violation count
        sessions = sessions.map(s =>
          s.id === msg.session_id
            ? { ...s, violation_count: msg.violation_count, flag_count: (s.flag_count || 0) + 1 }
            : s
        );
        // Add to recent flags feed
        recentFlags = [
          { ...msg, time: new Date().toLocaleTimeString() },
          ...recentFlags.slice(0, 49)
        ];
      }

      if (msg.type === 'student_status') {
        sessions = sessions.map(s =>
          s.id === msg.session_id ? { ...s, status: msg.status } : s
        );
      }
    };
  }

  // ── Invigilator actions ─────────────────────────────────
  async function pauseStudent(session_id: string) {
    await fetch(`/api/invigilator/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause', session_id })
    });
    sessions = sessions.map(s => s.id === session_id ? { ...s, status: 'flagged' } : s);
  }

  async function resumeStudent(session_id: string) {
    await fetch(`/api/invigilator/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume', session_id })
    });
    sessions = sessions.map(s => s.id === session_id ? { ...s, status: 'in_progress' } : s);
  }

  async function forceSubmit(session_id: string) {
    if (!confirm('Force-submit this student\'s exam?')) return;
    await fetch(`/api/invigilator/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'force_submit', session_id })
    });
    sessions = sessions.map(s => s.id === session_id ? { ...s, status: 'force_submitted' } : s);
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      not_started: 'badge badge-gray',
      in_progress: 'badge badge-blue',
      submitted: 'badge badge-green',
      force_submitted: 'badge badge-red',
      flagged: 'badge badge-yellow',
    };
    return map[status] ?? 'badge badge-gray';
  }

  function statusLabel(status: string) {
    return {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      submitted: 'Submitted',
      force_submitted: 'Force Submitted',
      flagged: 'Paused',
    }[status] ?? status;
  }

  function flagColor(flag_type: string) {
    if (['multiple_faces', 'no_face_detected'].includes(flag_type)) return 'var(--danger)';
    if (['tab_switch', 'window_blur', 'fullscreen_exit'].includes(flag_type)) return 'var(--warning)';
    return 'var(--text-muted)';
  }

  onMount(connectWs);
  onDestroy(() => ws?.close());
</script>

<svelte:head>
  <title>Monitor: {data.exam.course_code} — MOUAU eTest</title>
</svelte:head>

<!-- Header -->
<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
  <div>
    <h1 style="font-size:1.4rem; font-weight:800; color:var(--text); margin:0 0 0.2rem;">
      Live Monitor — {data.exam.course_code}
    </h1>
    <p style="color:var(--text-muted); font-size:0.85rem; margin:0;">{data.exam.title}</p>
  </div>
  <div style="display:flex; align-items:center; gap:0.75rem;">
    <span style="display:flex; align-items:center; gap:0.4rem; font-size:0.78rem; color:{wsConnected ? 'var(--success)' : 'var(--danger)'};">
      {#if wsConnected}<Wifi size={14} />{:else}<WifiOff size={14} />{/if}
      {wsConnected ? 'Live' : 'Reconnecting...'}
    </span>
    <button onclick={() => location.reload()} class="btn btn-ghost" style="padding:0.4rem 0.75rem;">
      <RefreshCw size={14} /> Refresh
    </button>
  </div>
</div>

<!-- Stats Row -->
<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
  {#each [
    { label: 'Total Students', value: stats.total, icon: Users, color: 'var(--text)' },
    { label: 'In Progress', value: stats.active, icon: Clock, color: '#3b82f6' },
    { label: 'Submitted', value: stats.submitted, icon: CheckCircle, color: 'var(--success)' },
    { label: 'Flagged', value: stats.flagged, icon: AlertTriangle, color: 'var(--warning)' },
    { label: 'Not Started', value: stats.notStarted, icon: ShieldAlert, color: 'var(--text-muted)' },
  ] as stat}
    <div class="card" style="padding:1rem; display:flex; flex-direction:column; gap:0.4rem;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); font-weight:600;">{stat.label}</span>
        <stat.icon size={16} color={stat.color} />
      </div>
      <span style="font-size:1.8rem; font-weight:800; color:{stat.color};">{stat.value}</span>
    </div>
  {/each}
</div>

<!-- Main content: sessions table + flag feed -->
<div style="display:grid; grid-template-columns:1fr 320px; gap:1.25rem; align-items:start;">

  <!-- Sessions Table -->
  <div class="card" style="overflow:hidden;">
    <!-- Filters -->
    <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
      <h2 style="font-size:0.95rem; font-weight:700; color:var(--text); margin:0;">Students ({filteredSessions.length})</h2>
      <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
        {#each ['all','in_progress','flagged','submitted','not_started'] as f}
          <button
            onclick={() => (filterStatus = f)}
            style="
              padding: 0.25rem 0.6rem; border-radius:9999px; font-size:0.72rem; font-weight:600;
              border: 1px solid {filterStatus === f ? 'var(--primary)' : 'var(--border)'};
              background: {filterStatus === f ? 'var(--primary)' : 'transparent'};
              color: {filterStatus === f ? 'var(--primary-fg)' : 'var(--text-muted)'};
              cursor:pointer;
            "
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        {/each}
      </div>
    </div>

    <div style="overflow-x:auto;">
      <table class="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Department</th>
            <th>Status</th>
            <th style="text-align:center;">Violations</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredSessions as s}
            <tr>
              <td>
                <div style="font-weight:600; color:var(--text); font-size:0.85rem;">{s.full_name}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">{s.matric_number}</div>
              </td>
              <td style="font-size:0.8rem; color:var(--text-muted);">{s.department}</td>
              <td><span class={statusBadge(s.status)}>{statusLabel(s.status)}</span></td>
              <td style="text-align:center;">
                {#if s.violation_count > 0}
                  <span style="
                    display:inline-flex; align-items:center; gap:0.3rem;
                    font-size:0.8rem; font-weight:700;
                    color:{s.violation_count >= data.exam.max_violations * 0.8 ? 'var(--danger)' : 'var(--warning)'};
                  ">
                    <AlertTriangle size={12} />
                    {s.violation_count}
                  </span>
                {:else}
                  <span style="color:var(--text-muted); font-size:0.8rem;">—</span>
                {/if}
              </td>
              <td>
                <div style="display:flex; gap:0.4rem;">
                  {#if s.status === 'in_progress'}
                    <button onclick={() => pauseStudent(s.id)} class="btn btn-ghost" style="padding:0.3rem 0.55rem; font-size:0.72rem;" title="Pause exam">
                      <Pause size={12} />
                    </button>
                  {/if}
                  {#if s.status === 'flagged'}
                    <button onclick={() => resumeStudent(s.id)} class="btn btn-ghost" style="padding:0.3rem 0.55rem; font-size:0.72rem;" title="Resume exam">
                      <Play size={12} />
                    </button>
                  {/if}
                  {#if s.status === 'in_progress' || s.status === 'flagged'}
                    <button onclick={() => forceSubmit(s.id)} class="btn btn-danger" style="padding:0.3rem 0.55rem; font-size:0.72rem;" title="Force submit">
                      <StopCircle size={12} />
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}

          {#if filteredSessions.length === 0}
            <tr>
              <td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem; font-size:0.85rem;">
                No students match this filter.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Live Flag Feed -->
  <div class="card" style="overflow:hidden; position:sticky; top:80px;">
    <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:0.5rem;">
      <AlertTriangle size={16} color="var(--warning)" />
      <h2 style="font-size:0.95rem; font-weight:700; color:var(--text); margin:0;">Live Flag Feed</h2>
      {#if wsConnected}
        <span style="width:7px; height:7px; border-radius:50%; background:var(--success); display:inline-block; animation: pulse 1.5s infinite;"></span>
      {/if}
    </div>
    <div style="max-height:520px; overflow-y:auto; padding:0.5rem;">
      {#if recentFlags.length === 0}
        <p style="text-align:center; color:var(--text-muted); padding:2rem; font-size:0.82rem;">
          No violations yet. Monitoring...
        </p>
      {:else}
        {#each recentFlags as flag}
          <div style="
            padding:0.65rem 0.75rem;
            border-radius:0.5rem;
            border-left: 3px solid {flagColor(flag.flag_type)};
            background: var(--bg);
            margin-bottom:0.4rem;
            font-size:0.78rem;
          ">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
              <span style="font-weight:700; color:var(--text);">{flag.student_name}</span>
              <span style="color:var(--text-muted); font-size:0.7rem;">{flag.time}</span>
            </div>
            <div style="color:var(--text-muted); font-family:monospace; font-size:0.7rem; margin-bottom:0.2rem;">{flag.matric_number}</div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:{flagColor(flag.flag_type)}; font-weight:600;">{flag.flag_type.replace(/_/g, ' ')}</span>
              <span style="color:var(--text-muted);">#{flag.violation_count}</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

</div>

<style>
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
