<!-- src/routes/(admin)/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Users, GraduationCap, ShieldCheck, BookOpen,
    TrendingUp, AlertTriangle, Clock, Activity,
    ArrowUpRight, ArrowDownRight, MoreHorizontal,
    Zap, Database, Globe, Lock, FileText,
    BarChart3, PieChart, Download, RefreshCw,
    Shield, Server, Wifi, Fingerprint,
    Calendar, ChevronRight, Eye, CheckCircle,
    Sparkles, Target, Award, Coffee
  } from 'lucide-svelte';
  import { tick, onMount } from 'svelte';

  let { data }: { data: PageData } = $props();

  let isExporting = $state(false);
  let chartContainer: HTMLCanvasElement | null = $state(null);
  let pieContainer: HTMLCanvasElement | null = $state(null);

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
    { label: 'Students',     value: data.totalStudents ?? 0,  color: '#3b82f6', icon: GraduationCap, gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    { label: 'Lecturers',    value: data.totalLecturers ?? 0, color: '#22c55e', icon: BookOpen, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    { label: 'Invigilators', value: data.totalStaff ?? 0,     color: '#a78bfa', icon: ShieldCheck, gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' },
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

  // System health
  const health = $derived([
    { label: 'API',      status: 'ok',   latency: '24ms' },
    { label: 'Database', status: 'ok',   latency: '12ms' },
    { label: 'Auth',     status: 'ok',   latency: '38ms' },
    { label: 'Storage',  status: 'warn', latency: '156ms' },
  ]);

  // Weekly activity data for chart
  const weeklyData = $derived([
    { day: 'Mon', exams: 12, logins: 45 },
    { day: 'Tue', exams: 18, logins: 52 },
    { day: 'Wed', exams: 8,  logins: 38 },
    { day: 'Thu', exams: 24, logins: 61 },
    { day: 'Fri', exams: 15, logins: 49 },
    { day: 'Sat', exams: 6,  logins: 22 },
    { day: 'Sun', exams: 3,  logins: 15 },
  ]);

  // Quick stats
  const quickStats = $derived([
    { label: 'Avg. Response', value: '142ms', change: '-12%', trend: 'up', icon: Zap },
    { label: 'Uptime', value: '99.97%', change: '+0.02%', trend: 'up', icon: Activity },
    { label: 'Active Sessions', value: '847', change: '+23%', trend: 'up', icon: Users },
    { label: 'Storage Used', value: '42%', change: '+5%', trend: 'neutral', icon: Database },
  ]);

  // PDF Export
  async function exportToPDF() {
    isExporting = true;
    await tick();

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = document.getElementById('dashboard-export-container');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      let scaledHeight = imgHeight * ratio;
      let scaledWidth = imgWidth * ratio;

      // Header
      pdf.setFontSize(18);
      pdf.setTextColor(34, 197, 94);
      pdf.text('MOUAU eTest — Admin Dashboard', pdfWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pdfWidth / 2, 18, { align: 'center' });

      let position = 22;
      let heightLeft = scaledHeight - 22;

      pdf.addImage(imgData, 'PNG', imgX, position, scaledWidth, scaledHeight);
      heightLeft -= (pdfHeight - 22);

      while (heightLeft > 0) {
        position = heightLeft - scaledHeight + 22;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, scaledWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      isExporting = false;
    }
  }

  // Chart rendering using simple CSS bars
  let maxExams = $derived(Math.max(...weeklyData.map(d => d.exams)));
  let maxLogins = $derived(Math.max(...weeklyData.map(d => d.logins)));
</script>

<svelte:head><title>Admin Dashboard — MOUAU eTest</title></svelte:head>

<div class="dashboard">

  <!-- PAGE HEADER -->
  <header class="dash-header">
    <div class="dash-header-left">
      <div class="dash-eyebrow">
        <span class="dash-dot pulse"></span>
        <span>System Live</span>
        <span class="eyebrow-divider">•</span>
        <span>v2.4.0</span>
      </div>
      <h1 class="dash-title">
        Command Centre
        <Sparkles size={24} class="title-sparkle" />
      </h1>
      <p class="dash-subtitle">MOUAU eTest · Super Administrator</p>
    </div>
    <div class="dash-header-right">
      <div class="health-bar">
        {#each health as h}
          <div class="health-item" class:warn={h.status === 'warn'} title={`${h.label}: ${h.latency}`}>
            <span class="health-dot" class:warn={h.status === 'warn'}></span>
            <span class="health-label">{h.label}</span>
            <span class="health-latency">{h.latency}</span>
          </div>
        {/each}
      </div>
      <div class="header-actions">
        <button class="btn-outline" onclick={() => window.location.reload()}>
          <RefreshCw size={14} />
          Refresh
        </button>
        <button class="btn-primary" onclick={exportToPDF} disabled={isExporting}>
          {#if isExporting}
            <RefreshCw size={14} class="spin" />
            Exporting...
          {:else}
            <Download size={14} />
            Export Report
          {/if}
        </button>
      </div>
    </div>
  </header>

  <div id="dashboard-export-container">
    <!-- KPI STRIP -->
    <section class="kpi-strip">
      <div class="kpi-card kpi-blue">
        <div class="kpi-icon"><GraduationCap size={20} /></div>
        <div class="kpi-body">
          <span class="kpi-value">{data.totalStudents ?? 0}</span>
          <span class="kpi-label">Students</span>
        </div>
        <div class="kpi-trend up"><ArrowUpRight size={12} /> +4.2%</div>
      </div>

      <div class="kpi-card kpi-green">
        <div class="kpi-icon"><BookOpen size={20} /></div>
        <div class="kpi-body">
          <span class="kpi-value">{data.totalLecturers ?? 0}</span>
          <span class="kpi-label">Lecturers</span>
        </div>
        <div class="kpi-trend up"><ArrowUpRight size={12} /> +1.8%</div>
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

    <!-- Quick Stats Row -->
    <section class="quick-stats">
      {#each quickStats as stat}
        <div class="stat-card">
          <div class="stat-icon">
            <stat.icon size={16} />
          </div>
          <div class="stat-info">
            <span class="stat-value">{stat.value}</span>
            <span class="stat-label">{stat.label}</span>
          </div>
          <div class="stat-change" class:change-up={stat.trend === 'up'} class:change-neutral={stat.trend === 'neutral'}>
            {stat.change}
          </div>
        </div>
      {/each}
    </section>

    <!-- CHARTS ROW -->
    <section class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <BarChart3 size={16} color="#22c55e" />
            <h3>Weekly Activity</h3>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#22c55e"></span>Exams</span>
            <span class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span>Logins</span>
          </div>
        </div>
        <div class="chart-body">
          <div class="bar-chart">
            {#each weeklyData as day}
              <div class="bar-group">
                <div class="bar-stack">
                  <div class="bar exam-bar" style="height: {(day.exams / maxExams) * 100}%; background: #22c55e;"></div>
                  <div class="bar login-bar" style="height: {(day.logins / maxLogins) * 60}%; background: #3b82f6;"></div>
                </div>
                <span class="bar-label">{day.day}</span>
                <span class="bar-total">{day.exams + day.logins}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <PieChart size={16} color="#a78bfa" />
            <h3>User Distribution</h3>
          </div>
          <div class="chart-badge">
            <Target size={12} />
            <span>{totalUsers} Total</span>
          </div>
        </div>
        <div class="chart-body pie-body">
          <div class="pie-chart">
            <svg viewBox="0 0 100 100" class="pie-svg">
              {#each groups as g, i}
                {@const prevPct = groups.slice(0, i).reduce((a, b) => a + (totalUsers > 0 ? b.value / totalUsers : 0), 0)}
                {@const pct = totalUsers > 0 ? g.value / totalUsers : 0}
                {@const startAngle = prevPct * 360}
                {@const endAngle = (prevPct + pct) * 360}
                {@const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180)}
                {@const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180)}
                {@const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180)}
                {@const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180)}
                {@const largeArc = endAngle - startAngle > 180 ? 1 : 0}
                <path 
                  d="M 50 50 L {x1} {y1} A 40 40 0 {largeArc} 1 {x2} {y2} Z" 
                  fill={g.color}
                  opacity="0.85"
                  stroke="white"
                  stroke-width="2"
                />
              {/each}
              <circle cx="50" cy="50" r="20" fill="var(--color-surface, white)" />
              <text x="50" y="47" text-anchor="middle" font-size="12" font-weight="700" fill="var(--color-text, #1a1a1a)">{totalUsers}</text>
              <text x="50" y="58" text-anchor="middle" font-size="5" fill="var(--color-muted, #94a3b8)">Total</text>
            </svg>
          </div>
          <div class="pie-legend">
            {#each groups as g}
              {@const pct = totalUsers > 0 ? Math.round((g.value / totalUsers) * 100) : 0}
              <div class="pie-legend-item">
                <span class="pie-legend-dot" style="background: {g.color}"></span>
                <div class="pie-legend-info">
                  <span class="pie-legend-label">{g.label}</span>
                  <div class="pie-legend-stats">
                    <span class="pie-legend-value">{g.value}</span>
                    <div class="pie-legend-bar">
                      <div class="pie-legend-progress" style="width: {pct}%; background: {g.color}"></div>
                    </div>
                    <span class="pie-legend-percent">{pct}%</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- MAIN GRID -->
    <div class="main-grid">

      <!-- Activity feed -->
      <section class="panel panel-activity">
        <div class="panel-head">
          <div class="panel-title-wrap">
            <Activity size={15} />
            <h2>Recent Activity</h2>
          </div>
          <div class="panel-actions">
            <span class="panel-count">{data.recentActivity?.length ?? 0} events</span>
            <button class="panel-refresh" title="Refresh">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {#if !data.recentActivity?.length}
          <div class="empty-state">
            <Coffee size={28} />
            <p>No activity recorded yet.</p>
            <span class="empty-hint">Activities will appear here once users interact with the system</span>
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
        
        <div class="panel-footer">
          <a href="#" class="view-all-link">
            View all activity
            <ChevronRight size={12} />
          </a>
        </div>
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
            <div class="panel-badge">
              <Award size={12} />
              <span>{totalUsers} total</span>
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
                  <div class="comp-bar" style="width:{pct}%; background:{g.gradient}"></div>
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
            <div class="exam-legend">
              <span class="exam-legend-dot active"></span>
              <span class="exam-legend-text">Active</span>
              <span class="exam-legend-dot completed"></span>
              <span class="exam-legend-text">Completed</span>
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
                <div class="exam-progress">
                  <div class="exam-progress-bar" style="width: {data.totalExams ? ((data.totalExams - (data.activeExams ?? 0)) / data.totalExams) * 100 : 0}%"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Security Status -->
        <section class="panel panel-security">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <Shield size={15} />
              <h2>Security Status</h2>
            </div>
            <a href="/admin/security" class="panel-link">
              View Details <ChevronRight size={12} />
            </a>
          </div>
          <div class="security-list">
            <div class="security-item">
              <div class="security-icon green"><Lock size={14} /></div>
              <div class="security-info">
                <span class="security-name">Encryption</span>
                <span class="security-status">AES-256 Active</span>
              </div>
              <CheckCircle size={14} color="#22c55e" class="security-status-icon" />
            </div>
            <div class="security-item">
              <div class="security-icon green"><Fingerprint size={14} /></div>
              <div class="security-info">
                <span class="security-name">Face Recognition</span>
                <span class="security-status">Operational</span>
              </div>
              <CheckCircle size={14} color="#22c55e" class="security-status-icon" />
            </div>
            <div class="security-item">
              <div class="security-icon amber"><AlertTriangle size={14} /></div>
              <div class="security-info">
                <span class="security-name">Active Threats</span>
                <span class="security-status">{data.threatCount ?? 0} detected</span>
              </div>
              {#if (data.threatCount ?? 0) > 0}
                <AlertTriangle size={14} color="#f59e0b" class="security-status-icon" />
              {:else}
                <CheckCircle size={14} color="#22c55e" class="security-status-icon" />
              {/if}
            </div>
            <div class="security-item">
              <div class="security-icon blue"><Wifi size={14} /></div>
              <div class="security-info">
                <span class="security-name">WebSocket</span>
                <span class="security-status">Connected</span>
              </div>
              <CheckCircle size={14} color="#22c55e" class="security-status-icon" />
            </div>
          </div>
        </section>

        <!-- Quick Actions - Moved inside right column, will be hidden on desktop -->
        <section class="panel panel-actions desktop-hidden">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <TrendingUp size={15} />
              <h2>Quick Actions</h2>
            </div>
            <div class="keyboard-hint">
              <kbd>⌘K</kbd>
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

</div>

<style>
  /* Base - Enhanced spacing */
  .dashboard {
    padding: 2rem 2.5rem 3rem;
    max-width: 1600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: 'Inter', 'DM Sans', system-ui, sans-serif;
  }

  /* Header */
  .dash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--color-border);
    margin-bottom: 0.5rem;
  }
  
  .dash-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #22c55e;
    margin-bottom: 0.5rem;
  }
  
  .eyebrow-divider {
    color: var(--color-muted);
    opacity: 0.5;
  }
  
  .dash-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
  }
  
  .dash-dot.pulse {
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  }
  
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
    70%  { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }
  
  .dash-title {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--color-text);
    margin: 0 0 0.25rem;
    line-height: 1.1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .title-sparkle {
    color: #f59e0b;
    opacity: 0.8;
  }
  
  .dash-subtitle {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }
  
  .dash-header-right {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
  }
  
  /* Health Bar */
  .health-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 999px;
  }
  
  .health-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
  }
  
  .health-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
  }
  
  .health-dot.warn { background: #f59e0b; }
  .health-item.warn .health-label { color: #f59e0b; }
  
  .health-latency {
    font-size: 0.6rem;
    font-family: monospace;
    opacity: 0.7;
  }
  
  /* Buttons */
  .header-actions {
    display: flex;
    gap: 0.75rem;
  }
  
  .btn-outline, .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    text-decoration: none;
  }
  
  .btn-outline {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }
  
  .btn-outline:hover {
    border-color: #22c55e;
    color: #22c55e;
    transform: translateY(-1px);
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border: none;
    color: white;
  }
  
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }
  
  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* KPI Strip */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .kpi-card {
    position: relative;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    animation: fadeUp 0.4s ease both;
  }
  
  .kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
  
  .kpi-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
  }
  
  .kpi-blue .kpi-icon { color: #3b82f6; }
  .kpi-green .kpi-icon { color: #22c55e; }
  .kpi-violet .kpi-icon { color: #a78bfa; }
  .kpi-amber .kpi-icon { color: #f59e0b; }
  .kpi-slate .kpi-icon { color: #64748b; }
  .kpi-teal .kpi-icon { color: #14b8a6; }
  
  .kpi-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .kpi-value {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--color-text);
    line-height: 1;
  }
  
  .kpi-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
  }
  
  .kpi-trend {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted);
  }
  
  .kpi-trend.up { color: #22c55e; }
  .kpi-trend.down { color: #ef4444; }
  
  .kpi-live-badge {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.25);
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    width: fit-content;
    animation: blink 1.5s step-end infinite;
  }
  
  @keyframes blink {
    50% { opacity: 0.4; }
  }
  
  /* Quick Stats */
  .quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.2s ease;
  }
  
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }
  
  .stat-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  
  .stat-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .stat-value {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text);
  }
  
  .stat-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  
  .stat-change {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  
  .stat-change.change-neutral {
    background: rgba(100, 116, 139, 0.1);
    color: #64748b;
  }
  
  /* Charts Row */
  .charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  
  @media (max-width: 1024px) {
    .charts-row { grid-template-columns: 1fr; }
  }
  
  .chart-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: fadeUp 0.45s ease both;
    transition: all 0.2s ease;
  }
  
  .chart-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
  
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  
  .chart-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .chart-title-wrap h3 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }
  
  .chart-legend {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .chart-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 500;
  }
  
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
  
  .chart-body {
    padding: 1.25rem;
  }
  
  /* Bar Chart */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
    height: 180px;
    padding: 0 0.5rem;
  }
  
  .bar-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    height: 100%;
  }
  
  .bar-stack {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 3px;
  }
  
  .bar {
    width: 14px;
    border-radius: 4px 4px 0 0;
    transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-height: 4px;
  }
  
  .bar-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 600;
  }
  
  .bar-total {
    font-size: 0.6rem;
    color: var(--color-muted);
    font-weight: 600;
    background: var(--color-bg);
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
  }
  
  /* Pie Chart */
  .pie-body {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  
  .pie-chart {
    width: 140px;
    height: 140px;
    flex-shrink: 0;
  }
  
  .pie-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  
  .pie-legend {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .pie-legend-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .pie-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  
  .pie-legend-info {
    flex: 1;
  }
  
  .pie-legend-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.25rem;
    display: block;
  }
  
  .pie-legend-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .pie-legend-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    min-width: 35px;
  }
  
  .pie-legend-bar {
    flex: 1;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .pie-legend-progress {
    height: 100%;
    border-radius: 2px;
  }
  
  .pie-legend-percent {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-text);
    min-width: 35px;
    text-align: right;
  }
  
  /* Main Grid */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 1rem;
    align-items: start;
  }
  
  @media (max-width: 1024px) {
    .main-grid { grid-template-columns: 1fr; }
  }
  
  /* Panels */
  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    animation: fadeUp 0.45s ease both;
    transition: all 0.2s ease;
  }
  
  .panel:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
  
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  
  .panel-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-muted);
  }
  
  .panel-title-wrap h2 {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text);
    margin: 0;
  }
  
  .panel-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .panel-count {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-muted);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
  }
  
  .panel-refresh {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: all 0.15s;
  }
  
  .panel-refresh:hover {
    color: #22c55e;
    transform: rotate(180deg);
  }
  
  .panel-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
  }
  
  .panel-footer {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--color-border);
    text-align: center;
  }
  
  .view-all-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #22c55e;
    text-decoration: none;
    transition: gap 0.15s;
  }
  
  .view-all-link:hover {
    gap: 0.5rem;
  }
  
  /* Activity Feed */
  .activity-feed {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 480px;
    overflow-y: auto;
  }
  
  .activity-feed::-webkit-scrollbar {
    width: 4px;
  }
  .activity-feed::-webkit-scrollbar-track {
    background: transparent;
  }
  .activity-feed::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }
  
  .feed-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
    animation: fadeUp 0.35s ease both;
  }
  
  .feed-item:last-child {
    border-bottom: none;
  }
  
  .feed-item:hover {
    background: var(--color-bg);
  }
  
  .feed-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 0.35rem;
  }
  
  .feed-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .feed-top {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  
  .feed-action {
    font-size: 0.85rem;
    font-weight: 700;
  }
  
  .feed-entity {
    font-size: 0.85rem;
    color: var(--color-text);
    font-weight: 500;
  }
  
  .feed-who {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  
  .feed-time {
    font-size: 0.7rem;
    color: var(--color-muted);
    white-space: nowrap;
    margin-left: auto;
    padding-top: 0.1rem;
    font-variant-numeric: tabular-nums;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1.5rem;
    color: var(--color-muted);
    text-align: center;
  }
  
  .empty-state p {
    font-size: 0.875rem;
    margin: 0;
    font-weight: 600;
  }
  
  .empty-hint {
    font-size: 0.7rem;
    opacity: 0.7;
  }
  
  /* Right Column */
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  /* User Composition */
  .comp-rows {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .comp-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .comp-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 100px;
  }
  
  .comp-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }
  
  .comp-bar-wrap {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: var(--color-border);
    overflow: hidden;
  }
  
  .comp-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-width: 4px;
  }
  
  .comp-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 60px;
  }
  
  .comp-val {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1;
  }
  
  .comp-pct {
    font-size: 0.65rem;
    color: var(--color-muted);
  }
  
  /* Exam Overview */
  .exam-legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .exam-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  
  .exam-legend-dot.active {
    background: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
  }
  
  .exam-legend-dot.completed {
    background: #22c55e;
  }
  
  .exam-legend-text {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--color-muted);
  }
  
  .exam-split {
    padding: 1.25rem;
    display: flex;
    gap: 1rem;
    align-items: stretch;
  }
  
  .exam-big {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem 1rem;
    text-align: center;
    transition: all 0.2s;
  }
  
  .exam-big.has-live {
    border-color: rgba(245, 158, 11, 0.4);
    background: rgba(245, 158, 11, 0.04);
  }
  
  .exam-big-num {
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--color-text);
    line-height: 1;
  }
  
  .exam-big-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 600;
  }
  
  .live-pill {
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.3);
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    animation: blink 1.5s step-end infinite;
  }
  
  .exam-small-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    justify-content: center;
  }
  
  .exam-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    min-width: 80px;
    position: relative;
  }
  
  .exam-tile-num {
    font-size: 1.25rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: var(--color-text);
  }
  
  .exam-tile-label {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  
  .exam-progress {
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .exam-progress-bar {
    height: 100%;
    background: #22c55e;
    transition: width 0.3s ease;
  }
  
  /* Security Panel */
  .security-list {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
  }
  
  .security-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
  }
  
  .security-item:last-child {
    border-bottom: none;
  }
  
  .security-item:hover {
    background: var(--color-bg);
  }
  
  .security-icon {
    width: 34px;
    height: 34px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .security-icon.green {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  
  .security-icon.amber {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
  
  .security-icon.blue {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  .security-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .security-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-text);
  }
  
  .security-status {
    font-size: 0.7rem;
    color: var(--color-muted);
  }
  
  .security-status-icon {
    flex-shrink: 0;
  }
  
  /* Quick Actions */
  .desktop-hidden {
    display: block;
  }
  
  .keyboard-hint {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .keyboard-hint kbd {
    font-family: monospace;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.4rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    color: var(--color-muted);
  }
  
  .action-grid {
    padding: 1rem 1.25rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  
  .action-tile {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .action-tile:hover {
    border-color: #22c55e;
    background: var(--color-surface);
    transform: translateY(-2px);
  }
  
  .action-arrow {
    margin-left: auto;
    color: var(--color-muted);
    flex-shrink: 0;
    transition: transform 0.15s;
  }
  
  .action-tile:hover .action-arrow {
    transform: translateX(2px);
    color: #22c55e;
  }
  
  .action-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .action-icon.blue   { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .action-icon.green  { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
  .action-icon.violet { background: rgba(167, 139, 250, 0.1); color: #a78bfa; }
  .action-icon.amber  { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .action-icon.teal   { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
  .action-icon.red    { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  
  /* Mobile Styles */
  @media (max-width: 1024px) {
    .desktop-hidden {
      display: block;
    }
    
    .main-grid {
      gap: 1rem;
    }
    
    .right-col {
      gap: 1rem;
    }
  }
  
  /* Desktop Styles - Hide Quick Actions on wide screen */
  @media (min-width: 1025px) {
    .desktop-hidden {
      display: none;
    }
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .dashboard {
      padding: 1rem;
      gap: 1rem;
    }
    
    .dash-title {
      font-size: 1.75rem;
    }
    
    .kpi-strip {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    
    .quick-stats {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .dash-header-right {
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
    }
    
    .health-bar {
      width: 100%;
      justify-content: space-between;
    }
    
    .header-actions {
      width: 100%;
    }
    
    .btn-outline, .btn-primary {
      flex: 1;
      justify-content: center;
    }
    
    .main-grid {
      gap: 0.75rem;
    }
    
    .panel-head {
      padding: 0.875rem 1rem;
    }
    
    .comp-rows {
      padding: 0.875rem 1rem;
    }
    
    .action-grid {
      padding: 0.875rem 1rem;
      gap: 0.5rem;
    }
    
    .action-tile span {
      font-size: 0.75rem;
    }
    
    /* On mobile, show quick actions */
    .desktop-hidden {
      display: block;
    }
  }
  
  @media (max-width: 480px) {
    .kpi-strip {
      grid-template-columns: 1fr;
    }
    
    .quick-stats {
      grid-template-columns: 1fr;
    }
    
    .exam-split {
      flex-direction: column;
    }
    
    .exam-small-grid {
      flex-direction: row;
    }
    
    .exam-tile {
      flex: 1;
    }
    
    .action-grid {
      grid-template-columns: 1fr;
    }
  }
</style>