<!-- src/routes/(admin)/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Users, GraduationCap, ShieldCheck, BookOpen,
    TrendingUp, AlertTriangle, Clock, Activity,
    ArrowUpRight, ArrowDownRight, MoreHorizontal,
    Zap, Database, Globe, Lock,
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  function fmtTime(d: Date) {
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function fmtTimeShort(d: Date) {
    const now = Date.now();
    const diff = now - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // Derived totals
  const totalUsers = $derived(
    (data.totalStudents ?? 0) + (data.totalLecturers ?? 0) + (data.totalStaff ?? 0)
  );

  const groups = $derived([
    { label: 'Students',     value: data.totalStudents ?? 0,  color: '#3b82f6', icon: GraduationCap },
    { label: 'Lecturers',    value: data.totalLecturers ?? 0, color: '#22c55e', icon: BookOpen },
    { label: 'Invigilators', value: data.totalStaff ?? 0,     color: '#a78bfa', icon: ShieldCheck },
  ]);

  // Action colour mapping for activity log
  const actionColor: Record<string, string> = {
    created: '#22c55e',
    updated: '#3b82f6',
    deleted: '#ef4444',
    login:   '#a78bfa',
    started: '#f59e0b',
    ended:   '#64748b',
  };
  function getActionColor(action: string) {
    const key = Object.keys(actionColor).find(k => action.toLowerCase().includes(k));
    return key ? actionColor[key] : '#94a3b8';
  }

  // System health mock (static — replace with real server data as needed)
  const health = [
    { label: 'API',      status: 'ok'   },
    { label: 'Database', status: 'ok'   },
    { label: 'Auth',     status: 'ok'   },
    { label: 'Storage',  status: 'warn' },
  ];
</script>

<svelte:head><title>Admin Dashboard — MOUAU eTest</title></svelte:head>

<div class="dashboard">

  <!-- ══ PAGE HEADER ══════════════════════════════════════════ -->
  <header class="dash-header">
    <div class="dash-header-left">
      <div class="dash-eyebrow">
        <span class="dash-dot pulse"></span>
        System Live
      </div>
      <h1 class="dash-title">Command Centre</h1>
      <p class="dash-subtitle">MOUAU eTest · Super Administrator</p>
    </div>
    <div class="dash-header-right">
      <div class="health-bar">
        {#each health as h}
          <div class="health-item" class:warn={h.status === 'warn'} title={h.label}>
            <span class="health-dot" class:warn={h.status === 'warn'}></span>
            <span class="health-label">{h.label}</span>
          </div>
        {/each}
      </div>
      <a href="/admin/reports" class="dash-cta">
        View Reports <ArrowUpRight size={14} />
      </a>
    </div>
  </header>

  <!-- ══ KPI STRIP ════════════════════════════════════════════ -->
  <section class="kpi-strip">
    <div class="kpi-card kpi-blue">
      <div class="kpi-icon"><GraduationCap size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{data.totalStudents ?? 0}</span>
        <span class="kpi-label">Students</span>
      </div>
      <div class="kpi-trend up"><ArrowUpRight size={12} /> 4.2%</div>
    </div>

    <div class="kpi-card kpi-green">
      <div class="kpi-icon"><BookOpen size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{data.totalLecturers ?? 0}</span>
        <span class="kpi-label">Lecturers</span>
      </div>
      <div class="kpi-trend up"><ArrowUpRight size={12} /> 1.8%</div>
    </div>

    <div class="kpi-card kpi-violet">
      <div class="kpi-icon"><ShieldCheck size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{data.totalStaff ?? 0}</span>
        <span class="kpi-label">Invigilators</span>
      </div>
      <div class="kpi-trend neutral">—</div>
    </div>

    <div class="kpi-card kpi-amber">
      <div class="kpi-icon"><Zap size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{data.activeExams ?? 0}</span>
        <span class="kpi-label">Active Exams</span>
      </div>
      {#if (data.activeExams ?? 0) > 0}
        <div class="kpi-live-badge">LIVE</div>
      {/if}
    </div>

    <div class="kpi-card kpi-slate">
      <div class="kpi-icon"><Database size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{data.totalExams ?? 0}</span>
        <span class="kpi-label">Total Exams</span>
      </div>
      <div class="kpi-trend neutral">all time</div>
    </div>

    <div class="kpi-card kpi-teal">
      <div class="kpi-icon"><Users size={20} /></div>
      <div class="kpi-body">
        <span class="kpi-value">{totalUsers}</span>
        <span class="kpi-label">Total Users</span>
      </div>
      <div class="kpi-trend up"><ArrowUpRight size={12} /> overall</div>
    </div>
  </section>

  <!-- ══ MAIN GRID ═════════════════════════════════════════════ -->
  <div class="main-grid">

    <!-- Activity feed -->
    <section class="panel panel-activity">
      <div class="panel-head">
        <div class="panel-title-wrap">
          <Activity size={15} />
          <h2>Recent Activity</h2>
        </div>
        <span class="panel-count">{data.recentActivity?.length ?? 0} events</span>
      </div>

      {#if !data.recentActivity?.length}
        <div class="empty-state">
          <Clock size={28} />
          <p>No activity recorded yet.</p>
        </div>
      {:else}
        <ul class="activity-feed">
          {#each data.recentActivity as log, i}
            <li class="feed-item" style="animation-delay:{i * 40}ms">
              <div class="feed-dot" style="background:{getActionColor(log.action)}"></div>
              <div class="feed-body">
                <div class="feed-top">
                  <span class="feed-action" style="color:{getActionColor(log.action)}">{log.action}</span>
                  {#if log.entity}<span class="feed-entity">· {log.entity}</span>{/if}
                </div>
                {#if log.user_name}
                  <span class="feed-who">{log.user_name}</span>
                {/if}
              </div>
              <time class="feed-time" datetime={String(log.created_at)}>
                {fmtTimeShort(log.created_at)}
              </time>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Right column -->
    <div class="right-col">

      <!-- User composition -->
      <section class="panel panel-composition">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <Users size={15} />
            <h2>User Composition</h2>
          </div>
        </div>
        <div class="comp-rows">
          {#each groups as g}
            {@const pct = totalUsers > 0 ? Math.round((g.value / totalUsers) * 100) : 0}
            <div class="comp-row">
              <div class="comp-left">
                <svelte:component this={g.icon} size={13} color={g.color} />
                <span class="comp-label">{g.label}</span>
              </div>
              <div class="comp-bar-wrap">
                <div class="comp-bar" style="width:{pct}%; background:{g.color}"></div>
              </div>
              <div class="comp-right">
                <span class="comp-val">{g.value}</span>
                <span class="comp-pct">{pct}%</span>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Exam overview -->
      <section class="panel panel-exams">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <BookOpen size={15} />
            <h2>Exam Overview</h2>
          </div>
        </div>
        <div class="exam-split">
          <div class="exam-big" class:has-live={(data.activeExams ?? 0) > 0}>
            <span class="exam-big-num">{data.activeExams ?? 0}</span>
            <span class="exam-big-label">
              {(data.activeExams ?? 0) === 1 ? 'Exam' : 'Exams'} running now
            </span>
            {#if (data.activeExams ?? 0) > 0}
              <span class="live-pill">● LIVE</span>
            {/if}
          </div>
          <div class="exam-small-grid">
            <div class="exam-tile">
              <span class="exam-tile-num">{data.totalExams ?? 0}</span>
              <span class="exam-tile-label">Total</span>
            </div>
            <div class="exam-tile">
              <span class="exam-tile-num">{(data.totalExams ?? 0) - (data.activeExams ?? 0)}</span>
              <span class="exam-tile-label">Completed</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick actions -->
      <section class="panel panel-actions">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <TrendingUp size={15} />
            <h2>Quick Actions</h2>
          </div>
        </div>
        <div class="action-grid">
          <a href="/admin/users" class="action-tile">
            <div class="action-icon blue"><Users size={16} /></div>
            <span>Manage Users</span>
            <ArrowUpRight size={12} class="action-arrow" />
          </a>
          <a href="/admin/reports" class="action-tile">
            <div class="action-icon green"><TrendingUp size={16} /></div>
            <span>Reports</span>
            <ArrowUpRight size={12} class="action-arrow" />
          </a>
          <a href="/admin/users?role=student" class="action-tile">
            <div class="action-icon violet"><GraduationCap size={16} /></div>
            <span>Students</span>
            <ArrowUpRight size={12} class="action-arrow" />
          </a>
          <a href="/admin/users?role=lecturer" class="action-tile">
            <div class="action-icon amber"><BookOpen size={16} /></div>
            <span>Lecturers</span>
            <ArrowUpRight size={12} class="action-arrow" />
          </a>
          <a href="/admin/users?role=staff" class="action-tile">
            <div class="action-icon teal"><ShieldCheck size={16} /></div>
            <span>Invigilators</span>
            <ArrowUpRight size={12} class="action-arrow" />
          </a>
          <a href="/admin/security" class="action-tile">
            <div class="action-icon red"><Lock size={16} /></div>
            <span>Security</span>
            <ArrowUpRight size={12} class="action-arrow" />
          </a>
        </div>
      </section>

    </div>
  </div>

</div>

<style>
  /* ── Base ─────────────────────────────────────────────── */
  .dashboard {
    padding: 2rem 2.5rem 3rem;
    max-width: 1280px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 2rem;
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  /* ── Header ──────────────────────────────────────────── */
  .dash-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-wrap: wrap; gap: 1rem;
  }
  .dash-eyebrow {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #22c55e; margin-bottom: 0.3rem;
  }
  .dash-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e;
  }
  .dash-dot.pulse {
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 0 0 rgba(34,197,94,0.5);
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,.5); }
    70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  .dash-title {
    font-size: 2.25rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.2rem; line-height: 1;
  }
  .dash-subtitle {
    font-size: 0.82rem; color: var(--color-muted); margin: 0;
  }
  .dash-header-right {
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  }
  .health-bar {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.5rem 0.875rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 999px;
  }
  .health-item {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.68rem; font-weight: 600; color: var(--color-muted);
  }
  .health-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
    flex-shrink: 0;
  }
  .health-dot.warn { background: #f59e0b; }
  .health-item.warn .health-label { color: #f59e0b; }

  .dash-cta {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.55rem 1.1rem;
    background: var(--color-text); color: var(--color-bg);
    border-radius: 0.5rem; font-size: 0.8rem; font-weight: 700;
    text-decoration: none; transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .dash-cta:hover { opacity: 0.85; transform: translateY(-1px); }

  /* ── KPI Strip ───────────────────────────────────────── */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }
  .kpi-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    position: relative; overflow: hidden;
    transition: transform 0.15s, box-shadow 0.15s;
    animation: fadeUp 0.4s ease both;
  }
  .kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .kpi-card::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    border-radius: 1rem 1rem 0 0;
  }
  .kpi-blue::before   { background: #3b82f6; }
  .kpi-green::before  { background: #22c55e; }
  .kpi-violet::before { background: #a78bfa; }
  .kpi-amber::before  { background: #f59e0b; }
  .kpi-slate::before  { background: #64748b; }
  .kpi-teal::before   { background: #14b8a6; }

  .kpi-icon {
    width: 36px; height: 36px; border-radius: 0.6rem;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg);
  }
  .kpi-blue   .kpi-icon { color: #3b82f6; }
  .kpi-green  .kpi-icon { color: #22c55e; }
  .kpi-violet .kpi-icon { color: #a78bfa; }
  .kpi-amber  .kpi-icon { color: #f59e0b; }
  .kpi-slate  .kpi-icon { color: #64748b; }
  .kpi-teal   .kpi-icon { color: #14b8a6; }

  .kpi-body { display: flex; flex-direction: column; gap: 0.1rem; }
  .kpi-value {
    font-size: 1.9rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); line-height: 1;
  }
  .kpi-label {
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-muted);
  }
  .kpi-trend {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.68rem; font-weight: 700;
    color: var(--color-muted);
  }
  .kpi-trend.up { color: #22c55e; }
  .kpi-trend.down { color: #ef4444; }
  .kpi-live-badge {
    font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em;
    color: #f59e0b; background: rgba(245,158,11,0.12);
    border: 1px solid rgba(245,158,11,0.25);
    padding: 0.1rem 0.4rem; border-radius: 999px;
    width: fit-content;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0.4; } }

  /* ── Main Grid ───────────────────────────────────────── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .main-grid { grid-template-columns: 1fr; }
  }

  /* ── Panels ──────────────────────────────────────────── */
  .panel {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; overflow: hidden;
    animation: fadeUp 0.45s ease both;
  }
  .panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);
  }
  .panel-title-wrap {
    display: flex; align-items: center; gap: 0.5rem;
    color: var(--color-muted);
  }
  .panel-title-wrap h2 {
    font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--color-text); margin: 0;
  }
  .panel-count {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.15rem 0.5rem; border-radius: 999px;
  }

  /* ── Activity feed ───────────────────────────────────── */
  .activity-feed {
    list-style: none; padding: 0; margin: 0;
    max-height: 480px; overflow-y: auto;
  }
  .activity-feed::-webkit-scrollbar { width: 4px; }
  .activity-feed::-webkit-scrollbar-track { background: transparent; }
  .activity-feed::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

  .feed-item {
    display: flex; align-items: flex-start; gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
    animation: fadeUp 0.35s ease both;
  }
  .feed-item:last-child { border-bottom: none; }
  .feed-item:hover { background: var(--color-bg); }

  .feed-dot {
    width: 8px; height: 8px; border-radius: 50%;
    flex-shrink: 0; margin-top: 0.35rem;
  }
  .feed-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
  .feed-top  { display: flex; align-items: baseline; gap: 0.4rem; flex-wrap: wrap; }
  .feed-action { font-size: 0.82rem; font-weight: 700; }
  .feed-entity { font-size: 0.82rem; color: var(--color-text); font-weight: 500; }
  .feed-who    { font-size: 0.75rem; color: var(--color-muted); }
  .feed-time   { font-size: 0.7rem; color: var(--color-muted); white-space: nowrap; margin-left: auto; padding-top: 0.1rem; font-variant-numeric: tabular-nums; }

  .empty-state {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3rem 1.5rem; color: var(--color-muted); text-align: center;
  }
  .empty-state p { font-size: 0.875rem; margin: 0; }

  /* ── Right column ────────────────────────────────────── */
  .right-col { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── User composition ────────────────────────────────── */
  .comp-rows { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  .comp-row  { display: flex; align-items: center; gap: 0.75rem; }
  .comp-left { display: flex; align-items: center; gap: 0.4rem; min-width: 90px; }
  .comp-label { font-size: 0.75rem; font-weight: 600; color: var(--color-text); }
  .comp-bar-wrap {
    flex: 1; height: 6px; border-radius: 3px;
    background: var(--color-border); overflow: hidden;
  }
  .comp-bar {
    height: 100%; border-radius: 3px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-width: 4px;
  }
  .comp-right { display: flex; flex-direction: column; align-items: flex-end; min-width: 52px; }
  .comp-val   { font-size: 0.82rem; font-weight: 700; color: var(--color-text); line-height: 1; }
  .comp-pct   { font-size: 0.65rem; color: var(--color-muted); }

  /* ── Exam overview ───────────────────────────────────── */
  .exam-split { padding: 1.25rem; display: flex; gap: 1rem; align-items: stretch; }
  .exam-big {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 0.3rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.25rem 1rem; text-align: center;
    transition: border-color 0.2s;
  }
  .exam-big.has-live {
    border-color: rgba(245,158,11,0.4);
    background: rgba(245,158,11,0.04);
  }
  .exam-big-num {
    font-size: 2.75rem; font-weight: 900; letter-spacing: -0.05em;
    color: var(--color-text); line-height: 1;
  }
  .exam-big-label { font-size: 0.72rem; color: var(--color-muted); font-weight: 600; }
  .live-pill {
    font-size: 0.6rem; font-weight: 800; letter-spacing: 0.12em;
    color: #f59e0b; background: rgba(245,158,11,0.12);
    border: 1px solid rgba(245,158,11,0.3);
    padding: 0.15rem 0.5rem; border-radius: 999px;
    animation: blink 1.5s step-end infinite;
  }
  .exam-small-grid { display: flex; flex-direction: column; gap: 0.75rem; justify-content: center; }
  .exam-tile {
    display: flex; flex-direction: column; align-items: center;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.6rem; padding: 0.6rem 1rem; min-width: 80px;
  }
  .exam-tile-num   { font-size: 1.3rem; font-weight: 900; letter-spacing: -0.03em; color: var(--color-text); }
  .exam-tile-label { font-size: 0.62rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; }

  /* ── Quick actions ───────────────────────────────────── */
  .action-grid {
    padding: 1rem 1.25rem;
    display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;
  }
  .action-tile {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.7rem 0.875rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.6rem; text-decoration: none;
    font-size: 0.78rem; font-weight: 600; color: var(--color-text);
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
    position: relative;
  }
  .action-tile:hover {
    border-color: var(--color-primary);
    background: var(--color-surface);
    transform: translateY(-1px);
  }
  .action-tile :global(.action-arrow) {
    margin-left: auto; color: var(--color-muted); flex-shrink: 0;
  }
  .action-icon {
    width: 28px; height: 28px; border-radius: 0.4rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .action-icon.blue   { background: rgba(59,130,246,.1);  color: #3b82f6; }
  .action-icon.green  { background: rgba(34,197,94,.1);   color: #22c55e; }
  .action-icon.violet { background: rgba(167,139,250,.1); color: #a78bfa; }
  .action-icon.amber  { background: rgba(245,158,11,.1);  color: #f59e0b; }
  .action-icon.teal   { background: rgba(20,184,166,.1);  color: #14b8a6; }
  .action-icon.red    { background: rgba(239,68,68,.1);   color: #ef4444; }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 768px) {
    .dashboard { padding: 1.25rem 1rem; gap: 1.25rem; }
    .dash-title { font-size: 1.75rem; }
    .kpi-strip  { grid-template-columns: repeat(2, 1fr); }
    .dash-header-right { display: none; }
  }
  @media (max-width: 480px) {
    .kpi-strip { grid-template-columns: 1fr 1fr; }
  }
</style>