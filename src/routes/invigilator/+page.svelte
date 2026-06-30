<!-- src/routes/invigilator/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    ShieldCheck, Clock, Calendar, Activity,
    ArrowUpRight, PlayCircle, CheckCircle,
    AlertCircle, Eye, RefreshCw, Zap,
    Monitor, Users, BookOpen, ChevronRight,
    BarChart3, Timer, TrendingUp
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  function fmtDate(d: Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function fmtTimeShort(d: Date | null) {
    if (!d) return '';
    const now = Date.now();
    const diff = new Date(d).getTime() - now;
    if (diff < 0) return 'started';
    const m = Math.floor(diff / 60000);
    if (m < 60) return `in ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `in ${h}h`;
    return `in ${Math.floor(h / 24)}d`;
  }

  // KPI counts
  const totalAssigned = $derived(data.exams.length);
  const activeExams   = $derived(data.exams.filter(e => e.status === 'active').length);
  const upcoming      = $derived(data.exams.filter(e => e.status === 'scheduled').length);
  const completed     = $derived(data.exams.filter(e => e.status === 'completed').length);

  const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
    draft:     { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
    scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
    active:    { label: 'Live',      color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    completed: { label: 'Done',      color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  };

  // Tab filtering
  let activeTab = $state<'all' | 'active' | 'scheduled' | 'completed'>('all');
  const filteredExams = $derived(
    activeTab === 'all' ? data.exams : data.exams.filter(e => e.status === activeTab)
  );

  // Progress ring for summary
  function getProgress(value: number, total: number) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (pct / 100) * circumference;
    return { pct: Math.round(pct), offset, circumference };
  }
</script>

<svelte:head><title>Invigilator — MOUAU eTest</title></svelte:head>

<div class="dashboard">

  <!-- ══ TOP BAR ════════════════════════════════════════════ -->
  <header class="top-bar">
    <div class="top-bar-left">
      <div class="brand-mark">
        <ShieldCheck size={22} />
      </div>
      <div>
        <div class="top-bar-eyebrow">
          <span class="pulse-dot"></span>
          Invigilator Portal
        </div>
        <h1 class="top-bar-title">Exam Monitor</h1>
      </div>
    </div>
    <div class="top-bar-right">
      <div class="time-badge">
        <Clock size={13} />
        {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
      <button class="btn-ghost" onclick={() => window.location.reload()}>
        <RefreshCw size={14} />
        Refresh
      </button>
    </div>
  </header>

  <!-- ══ HERO KPI CARDS ═══════════════════════════════════ -->
  <section class="kpi-hero">
    <div class="kpi-card kpi-primary" style="--kpi-accent: var(--iv-500);">
      <div class="kpi-card-bg">
        <ShieldCheck size={80} opacity="0.04" />
      </div>
      <div class="kpi-card-content">
        <div class="kpi-card-top">
          <span class="kpi-card-label">Total Assigned</span>
          <div class="kpi-card-icon">
            <BookOpen size={18} />
          </div>
        </div>
        <span class="kpi-card-value">{totalAssigned}</span>
        <div class="kpi-card-footer">
          <span class="kpi-card-sub">All your exams</span>
        </div>
      </div>
    </div>

    <div class="kpi-card kpi-live" style="--kpi-accent: #22c55e;">
      <div class="kpi-card-bg">
        <Zap size={80} opacity="0.04" />
      </div>
      <div class="kpi-card-content">
        <div class="kpi-card-top">
          <span class="kpi-card-label">Active Now</span>
          <div class="kpi-card-icon" class:pulsing={activeExams > 0}>
            <Monitor size={18} />
          </div>
        </div>
        <span class="kpi-card-value">{activeExams}</span>
        <div class="kpi-card-footer">
          {#if activeExams > 0}
            <span class="live-pill">
              <span class="live-pill-dot"></span>
              LIVE
            </span>
          {:else}
            <span class="kpi-card-sub">No active exams</span>
          {/if}
        </div>
      </div>
    </div>

    <div class="kpi-card" style="--kpi-accent: #3b82f6;">
      <div class="kpi-card-bg">
        <Calendar size={80} opacity="0.04" />
      </div>
      <div class="kpi-card-content">
        <div class="kpi-card-top">
          <span class="kpi-card-label">Upcoming</span>
          <div class="kpi-card-icon">
            <Timer size={18} />
          </div>
        </div>
        <span class="kpi-card-value">{upcoming}</span>
        <div class="kpi-card-footer">
          <span class="kpi-card-sub">Scheduled exams</span>
          {#if upcoming > 0}
            <TrendingUp size={12} color="#3b82f6" />
          {/if}
        </div>
      </div>
    </div>

    <div class="kpi-card" style="--kpi-accent: #a78bfa;">
      <div class="kpi-card-bg">
        <CheckCircle size={80} opacity="0.04" />
      </div>
      <div class="kpi-card-content">
        <div class="kpi-card-top">
          <span class="kpi-card-label">Completed</span>
          <div class="kpi-card-icon">
            <CheckCircle size={18} />
          </div>
        </div>
        <span class="kpi-card-value">{completed}</span>
        <div class="kpi-card-footer">
          <span class="kpi-card-sub">Finished exams</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ══ MAIN LAYOUT ══════════════════════════════════════ -->
  <div class="main-layout">

    <!-- Left: Exam List -->
    <section class="main-panel">
      <div class="panel-header">
        <div class="panel-header-left">
          <div class="panel-icon">
            <Activity size={16} />
          </div>
          <div>
            <h2 class="panel-title">Assigned Exams</h2>
            <p class="panel-subtitle">{filteredExams.length} of {totalAssigned} exams</p>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
          {#each [
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Live' },
            { key: 'scheduled', label: 'Upcoming' },
            { key: 'completed', label: 'Done' }
          ] as tab}
            <button
              class="filter-tab"
              class:active={activeTab === tab.key}
              onclick={() => activeTab = tab.key as typeof activeTab}
            >
              {tab.label}
              {#if tab.key === 'all'}
                <span class="tab-count">{totalAssigned}</span>
              {:else if tab.key === 'active'}
                <span class="tab-count">{activeExams}</span>
              {:else if tab.key === 'scheduled'}
                <span class="tab-count">{upcoming}</span>
              {:else}
                <span class="tab-count">{completed}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      {#if filteredExams.length === 0}
        <div class="empty-state">
          <div class="empty-icon">
            <ShieldCheck size={36} />
          </div>
          <p class="empty-title">No exams found</p>
          <p class="empty-sub">Try switching tabs or check back later.</p>
        </div>
      {:else}
        <div class="exam-grid">
          {#each filteredExams as exam, i (exam.id)}
            {@const meta = STATUS_META[exam.status ?? 'draft'] ?? STATUS_META.draft}
            <div class="exam-card" style="animation-delay:{i * 50}ms">
              <!-- Status stripe -->
              <div class="exam-stripe" style="background: {meta.color};"></div>

              <div class="exam-card-body">
                <div class="exam-card-header">
                  <div class="exam-badges">
                    <span class="course-badge">{exam.course.code}</span>
                    <span class="status-badge" style="color:{meta.color}; background:{meta.bg}; border-color:{meta.border};">
                      {#if exam.status === 'active'}
                        <span class="status-dot" style="background:{meta.color};"></span>
                      {/if}
                      {meta.label}
                    </span>
                  </div>

                  {#if exam.status === 'active'}
                    <a href="/invigilator/{exam.id}" class="action-btn action-live">
                      <Monitor size={14} />
                      Monitor
                      <ChevronRight size={13} />
                    </a>
                  {:else}
                    <a href="/invigilator/{exam.id}" class="action-btn">
                      <Eye size={14} />
                      View
                      <ChevronRight size={13} />
                    </a>
                  {/if}
                </div>

                <h3 class="exam-card-title">{exam.title}</h3>

                <div class="exam-card-meta">
                  <div class="meta-group">
                    <Clock size={12} />
                    <span>{fmtDate(exam.scheduledStart)}</span>
                  </div>
                  {#if exam.status === 'scheduled' && exam.scheduledStart}
                    <div class="meta-group countdown">
                      <Timer size={12} />
                      <span>{fmtTimeShort(exam.scheduledStart)}</span>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Right: Sidebar -->
    <aside class="sidebar">

      <!-- Live Now Panel -->
      {#if activeExams > 0}
        <div class="sidebar-card sidebar-live">
          <div class="sidebar-card-header">
            <div class="sidebar-card-title">
              <Zap size={15} color="#f59e0b" />
              <span>Live Right Now</span>
            </div>
            <span class="live-indicator">● LIVE</span>
          </div>
          <div class="sidebar-card-body">
            {#each data.exams.filter(e => e.status === 'active') as exam}
              <div class="live-item">
                <div class="live-item-header">
                  <span class="live-item-course">{exam.course.code}</span>
                  <span class="live-item-time">Now</span>
                </div>
                <p class="live-item-title">{exam.title}</p>
                <a href="/invigilator/{exam.id}" class="live-item-btn">
                  <Monitor size={13} />
                  Open Monitor
                  <ChevronRight size={12} />
                </a>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Upcoming Panel -->
      {#if upcoming > 0}
        <div class="sidebar-card">
          <div class="sidebar-card-header">
            <div class="sidebar-card-title">
              <Calendar size={15} />
              <span>Upcoming</span>
            </div>
            <span class="sidebar-count">{upcoming}</span>
          </div>
          <div class="sidebar-card-body compact">
            {#each data.exams.filter(e => e.status === 'scheduled').slice(0, 5) as exam}
              <div class="upcoming-item">
                <div class="upcoming-dot"></div>
                <div class="upcoming-info">
                  <span class="upcoming-course">{exam.course.code}</span>
                  <span class="upcoming-title">{exam.title}</span>
                </div>
                <span class="upcoming-countdown">{fmtTimeShort(exam.scheduledStart)}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Summary Donuts -->
      <div class="sidebar-card">
        <div class="sidebar-card-header">
          <div class="sidebar-card-title">
            <BarChart3 size={15} />
            <span>Distribution</span>
          </div>
        </div>
        <div class="sidebar-card-body">
          <div class="donut-grid">
            {#each [
              { label: 'Active', value: activeExams, color: '#22c55e' },
              { label: 'Upcoming', value: upcoming, color: '#3b82f6' },
              { label: 'Done', value: completed, color: '#a78bfa' }
            ] as item}
              {@const prog = getProgress(item.value, totalAssigned)}
              <div class="donut-item">
                <div class="donut-ring">
                  <svg viewBox="0 0 44 44" width="52" height="52">
                    <circle
                      cx="22" cy="22" r="18"
                      fill="none"
                      stroke="var(--color-border)"
                      stroke-width="4"
                    />
                    <circle
                      cx="22" cy="22" r="18"
                      fill="none"
                      stroke={item.color}
                      stroke-width="4"
                      stroke-linecap="round"
                      stroke-dasharray="{prog.circumference}"
                      stroke-dashoffset="{prog.offset}"
                      transform="rotate(-90 22 22)"
                      style="transition: stroke-dashoffset 0.8s ease;"
                    />
                  </svg>
                  <span class="donut-value" style="color:{item.color}">{item.value}</span>
                </div>
                <span class="donut-label">{item.label}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Quick Stats Bars -->
      <div class="sidebar-card">
        <div class="sidebar-card-header">
          <div class="sidebar-card-title">
            <TrendingUp size={15} />
            <span>Quick Stats</span>
          </div>
        </div>
        <div class="sidebar-card-body compact">
          {#each [
            { label: 'Total Assigned', value: totalAssigned, color: '#64748b' },
            { label: 'Active Now', value: activeExams, color: '#22c55e' },
            { label: 'Upcoming', value: upcoming, color: '#3b82f6' },
            { label: 'Completed', value: completed, color: '#a78bfa' }
          ] as row}
            <div class="stat-row">
              <div class="stat-row-left">
                <span class="stat-dot" style="background:{row.color}"></span>
                <span class="stat-label">{row.label}</span>
              </div>
              <div class="stat-bar-track">
                <div
                  class="stat-bar-fill"
                  style="width:{totalAssigned > 0 ? Math.round((row.value / totalAssigned) * 100) : 0}%; background:{row.color};"
                ></div>
              </div>
              <span class="stat-value" style="color:{row.color}">{row.value}</span>
            </div>
          {/each}
        </div>
      </div>

    </aside>
  </div>

</div>

<style>
  /* ═══════════════════════════════════════════════════════
     TOKENS (assumed from your app, kept intact)
     --color-bg, --color-surface, --color-border
     --color-text, --color-muted
     --iv-500 (brand orange), --iv-soft
     ═══════════════════════════════════════════════════════ */

  .dashboard {
    padding: 1.75rem 2rem 3rem;
    max-width: 1440px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
    background: var(--color-bg);
    min-height: 100vh;
  }

  /* ── Top Bar ────────────────────────────────────────── */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .top-bar-left {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }
  .brand-mark {
    width: 42px;
    height: 42px;
    border-radius: 0.75rem;
    background: var(--iv-soft);
    color: var(--iv-500);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(249,115,22,0.15);
  }
  .top-bar-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--iv-500);
    margin-bottom: 0.15rem;
  }
  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--iv-500);
    animation: pulse-dot-anim 2s ease-in-out infinite;
  }
  @keyframes pulse-dot-anim {
    0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
    50% { box-shadow: 0 0 0 5px rgba(249,115,22,0); }
  }
  .top-bar-title {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--color-text);
    margin: 0;
    line-height: 1.1;
  }
  .top-bar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .time-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.85rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
  }
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.9rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-ghost:hover {
    border-color: var(--iv-500);
    color: var(--iv-500);
    background: var(--iv-soft);
  }

  /* ── KPI Hero Cards ─────────────────────────────────── */
  .kpi-hero {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  @media (max-width: 1100px) {
    .kpi-hero { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .kpi-hero { grid-template-columns: 1fr; }
  }

  .kpi-card {
    position: relative;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.25rem;
    overflow: hidden;
    animation: slideUp 0.4s ease both;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .kpi-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.08);
  }
  .kpi-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--kpi-accent);
    border-radius: 1rem 1rem 0 0;
  }
  .kpi-card-bg {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: var(--color-text);
    opacity: 0.5;
    pointer-events: none;
  }
  .kpi-card-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .kpi-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .kpi-card-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-muted);
  }
  .kpi-card-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    color: var(--kpi-accent);
    border: 1px solid var(--color-border);
    transition: all 0.2s ease;
  }
  .kpi-card-icon.pulsing {
    animation: icon-pulse 2s ease-in-out infinite;
  }
  @keyframes icon-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); }
    50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
  }
  .kpi-card-value {
    font-size: 2.2rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--color-text);
    line-height: 1;
  }
  .kpi-card-footer {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }
  .kpi-card-sub {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-muted);
  }
  .live-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.15rem 0.5rem;
    background: rgba(34,197,94,0.1);
    border: 1px solid rgba(34,197,94,0.25);
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #22c55e;
  }
  .live-pill-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #22c55e;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0.3; } }

  /* ── Main Layout ────────────────────────────────────── */
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .main-layout { grid-template-columns: 1fr; }
    .sidebar { order: -1; }
  }

  /* ── Main Panel ─────────────────────────────────────── */
  .main-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: slideUp 0.45s ease both;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .panel-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .panel-icon {
    width: 34px;
    height: 34px;
    border-radius: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--iv-soft);
    color: var(--iv-500);
  }
  .panel-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
    line-height: 1.2;
  }
  .panel-subtitle {
    font-size: 0.72rem;
    color: var(--color-muted);
    margin: 0.1rem 0 0;
  }

  /* Filter Tabs */
  .filter-tabs {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--color-bg);
    padding: 0.25rem;
    border-radius: 0.6rem;
    border: 1px solid var(--color-border);
  }
  .filter-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    border: none;
    border-radius: 0.45rem;
    background: transparent;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .filter-tab:hover {
    color: var(--color-text);
    background: rgba(0,0,0,0.03);
  }
  .filter-tab.active {
    background: var(--color-surface);
    color: var(--iv-500);
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    border: 1px solid var(--color-border);
  }
  .tab-count {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.05rem 0.35rem;
    background: var(--color-bg);
    border-radius: 999px;
    color: var(--color-muted);
  }
  .filter-tab.active .tab-count {
    background: var(--iv-soft);
    color: var(--iv-500);
  }

  /* ── Exam Grid ──────────────────────────────────────── */
  .exam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0;
    padding: 0.5rem;
  }
  @media (max-width: 640px) {
    .exam-grid { grid-template-columns: 1fr; padding: 0.25rem; }
  }

  .exam-card {
    position: relative;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    margin: 0.5rem;
    overflow: hidden;
    animation: slideUp 0.35s ease both;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .exam-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  }
  .exam-stripe {
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
  }
  .exam-card-body {
    padding: 1rem 1.1rem 1rem 1.3rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .exam-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .exam-badges {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .course-badge {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    background: var(--iv-soft);
    color: var(--iv-500);
    border-radius: 999px;
    white-space: nowrap;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid;
    white-space: nowrap;
  }
  .status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    animation: blink 1.5s step-end infinite;
  }
  .exam-card-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .exam-card-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .meta-group {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--color-muted);
  }
  .meta-group.countdown {
    color: #3b82f6;
    font-weight: 700;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.45rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-decoration: none;
    color: var(--color-text);
    transition: all 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .action-btn:hover {
    border-color: var(--iv-500);
    color: var(--iv-500);
    background: var(--iv-soft);
  }
  .action-btn.action-live {
    background: #22c55e;
    border-color: #22c55e;
    color: white;
  }
  .action-btn.action-live:hover {
    background: #16a34a;
    border-color: #16a34a;
    color: white;
  }

  /* ── Sidebar ────────────────────────────────────────── */
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .sidebar-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: slideUp 0.45s ease both;
  }
  .sidebar-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 1.1rem;
    border-bottom: 1px solid var(--color-border);
  }
  .sidebar-card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .sidebar-count {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.1rem 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    color: var(--color-muted);
  }
  .live-indicator {
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--iv-500);
    animation: blink 1.5s step-end infinite;
  }
  .sidebar-card-body {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sidebar-card-body.compact {
    padding: 0.5rem 0.75rem;
    gap: 0;
  }

  /* Live Items */
  .live-item {
    padding: 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .live-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .live-item-course {
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--iv-500);
  }
  .live-item-time {
    font-size: 0.65rem;
    font-weight: 700;
    color: #22c55e;
    background: rgba(34,197,94,0.1);
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
  }
  .live-item-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
    line-height: 1.3;
  }
  .live-item-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    margin-top: 0.4rem;
    padding: 0.5rem;
    background: #22c55e;
    border: 1px solid #22c55e;
    border-radius: 0.45rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-decoration: none;
    color: white;
    transition: all 0.15s ease;
  }
  .live-item-btn:hover {
    background: #16a34a;
    border-color: #16a34a;
  }

  /* Upcoming Items */
  .upcoming-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s ease;
  }
  .upcoming-item:last-child {
    border-bottom: none;
  }
  .upcoming-item:hover {
    background: var(--color-bg);
    margin: 0 -0.75rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    border-radius: 0.4rem;
  }
  .upcoming-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3b82f6;
    flex-shrink: 0;
  }
  .upcoming-info {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    flex: 1;
    min-width: 0;
  }
  .upcoming-course {
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--iv-500);
  }
  .upcoming-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .upcoming-countdown {
    font-size: 0.68rem;
    font-weight: 700;
    color: #3b82f6;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Donut Grid */
  .donut-grid {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.5rem 0;
  }
  .donut-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }
  .donut-ring {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .donut-value {
    position: absolute;
    font-size: 0.9rem;
    font-weight: 800;
  }
  .donut-label {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Stat Rows */
  .stat-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0;
  }
  .stat-row-left {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 100px;
    flex-shrink: 0;
  }
  .stat-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .stat-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text);
  }
  .stat-bar-track {
    flex: 1;
    height: 5px;
    border-radius: 3px;
    background: var(--color-border);
    overflow: hidden;
  }
  .stat-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    min-width: 3px;
  }
  .stat-value {
    font-size: 0.78rem;
    font-weight: 800;
    min-width: 20px;
    text-align: right;
    flex-shrink: 0;
  }

  /* ── Empty State ─────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 1.5rem;
    text-align: center;
  }
  .empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .empty-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }
  .empty-sub {
    font-size: 0.78rem;
    color: var(--color-muted);
    margin: 0;
  }

  /* ── Animations ──────────────────────────────────────── */
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 768px) {
    .dashboard { padding: 1rem 1rem 2rem; gap: 1.25rem; }
    .top-bar-title { font-size: 1.35rem; }
    .panel-header { flex-direction: column; align-items: flex-start; }
    .filter-tabs { width: 100%; overflow-x: auto; }
    .exam-grid { grid-template-columns: 1fr; }
  }
</style>