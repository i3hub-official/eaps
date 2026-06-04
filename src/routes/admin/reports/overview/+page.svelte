<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Users, GraduationCap, BookOpen, ShieldCheck, ClipboardList,
    AlertTriangle, TrendingUp, Award, Clock, Activity,
    ArrowUpRight, ArrowDownRight, Layers, Building2
  } from 'lucide-svelte';

  // Mock data — replace with actual API calls
  let stats = $state({});

  let recentActivity = $state([]);

  function getTrendIcon(value: number) {
    return value >= 0 ? ArrowUpRight : ArrowDownRight;
  }
</script>

<svelte:head>
  <title>Reports Overview — MOUAU eTest</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Reports Overview</h1>
    <p class="subtitle">Real-time insights across all modules</p>
  </header>

  <!-- Key Metrics Grid -->
  <section class="metrics-grid">
    <div class="metric-card">
      <div class="metric-icon users"><Users size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.totalUsers.toLocaleString()}</span>
        <span class="metric-label">Total Users</span>
      </div>
      <div class="metric-trend up">
        <ArrowUpRight size={14} />
        <span>+12%</span>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon students"><GraduationCap size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.totalStudents.toLocaleString()}</span>
        <span class="metric-label">Students</span>
      </div>
      <div class="metric-trend up">
        <ArrowUpRight size={14} />
        <span>+8%</span>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon exams"><ClipboardList size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.totalExams}</span>
        <span class="metric-label">Total Exams</span>
      </div>
      <div class="metric-trend up">
        <ArrowUpRight size={14} />
        <span>+5%</span>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon active"><Activity size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.activeExams}</span>
        <span class="metric-label">Active Now</span>
      </div>
      <div class="metric-trend neutral">
        <span>Live</span>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon score"><Award size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.avgScore}%</span>
        <span class="metric-label">Avg Score</span>
      </div>
      <div class="metric-trend up">
        <ArrowUpRight size={14} />
        <span>+3.2%</span>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon pass"><TrendingUp size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.passRate}%</span>
        <span class="metric-label">Pass Rate</span>
      </div>
      <div class="metric-trend up">
        <ArrowUpRight size={14} />
        <span>+2.1%</span>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-card alert">
        <div class="metric-icon violations"><AlertTriangle size={20} /></div>
        <div class="metric-content">
          <span class="metric-value">{stats.totalViolations}</span>
          <span class="metric-label">Violations</span>
        </div>
        <div class="metric-trend down">
          <ArrowDownRight size={14} />
          <span>-15%</span>
        </div>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon flagged"><ShieldCheck size={20} /></div>
      <div class="metric-content">
        <span class="metric-value">{stats.flaggedSessions}</span>
        <span class="metric-label">Flagged Sessions</span>
      </div>
      <div class="metric-trend down">
        <ArrowDownRight size={14} />
        <span>-8%</span>
      </div>
    </div>
  </section>

  <!-- Charts Row -->
  <section class="charts-row">
    <div class="chart-card wide">
      <h3>Exam Activity (Last 30 Days)</h3>
      <div class="chart-placeholder">
        <Activity size={48} opacity={0.3} />
        <p>Exam completion & scheduling chart</p>
      </div>
    </div>

    <div class="chart-card">
      <h3>User Distribution</h3>
      <div class="distribution-bars">
        <div class="dist-item">
          <span class="dist-label"><GraduationCap size={14} /> Students</span>
          <div class="dist-bar"><div class="dist-fill" style="width: 72%"></div></div>
          <span class="dist-value">72%</span>
        </div>
        <div class="dist-item">
          <span class="dist-label"><BookOpen size={14} /> Lecturers</span>
          <div class="dist-bar"><div class="dist-fill lecturers" style="width: 6%"></div></div>
          <span class="dist-value">6%</span>
        </div>
        <div class="dist-item">
          <span class="dist-label"><ShieldCheck size={14} /> Invigilators</span>
          <div class="dist-bar"><div class="dist-fill invigilators" style="width: 4%"></div></div>
          <span class="dist-value">4%</span>
        </div>
        <div class="dist-item">
          <span class="dist-label"><Users size={14} /> Admins</span>
          <div class="dist-bar"><div class="dist-fill admins" style="width: 3%"></div></div>
          <span class="dist-value">3%</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Recent Activity -->
  <section class="activity-section">
    <h3>Recent Activity</h3>
    <div class="activity-list">
      {#each recentActivity as activity}
        <div class="activity-item">
          <div class="activity-dot {activity.type}"></div>
          <span class="activity-text">{activity.action}</span>
          <span class="activity-time">{activity.time}</span>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .page { max-width: 1200px; }

  .page-header { margin-bottom: 2rem; }
  .page-header h1 { font-size: 1.75rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); margin-top: 0.25rem; font-size: 0.9rem; }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    transition: box-shadow 0.2s;
  }
  .metric-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

  .metric-icon {
    width: 40px; height: 40px; border-radius: 0.625rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .metric-icon.users { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .metric-icon.students { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .metric-icon.exams { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .metric-icon.active { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .metric-icon.score { background: rgba(16, 185, 129, 0.1); color: #10b981; }
  .metric-icon.pass { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
  .metric-icon.violations { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  .metric-icon.flagged { background: rgba(249, 115, 22, 0.1); color: #f97316; }

  .metric-content { flex: 1; display: flex; flex-direction: column; }
  .metric-value { font-size: 1.375rem; font-weight: 700; color: var(--color-text); }
  .metric-label { font-size: 0.75rem; color: var(--color-muted); margin-top: 0.125rem; }

  .metric-trend {
    display: flex; align-items: center; gap: 0.25rem;
    font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
  }
  .metric-trend.up { color: #16a34a; background: rgba(22, 163, 74, 0.1); }
  .metric-trend.down { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
  .metric-trend.neutral { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }

  .charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }

  .chart-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }
  .chart-card h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1rem 0; }

  .chart-placeholder {
    min-height: 200px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: var(--color-muted); gap: 0.75rem;
    border: 2px dashed var(--color-border); border-radius: 0.5rem;
  }

  .distribution-bars { display: flex; flex-direction: column; gap: 1rem; }
  .dist-item { display: flex; align-items: center; gap: 0.75rem; }
  .dist-label { display: flex; align-items: center; gap: 0.375rem; font-size: 0.8rem; color: var(--color-text); width: 110px; flex-shrink: 0; }
  .dist-bar { flex: 1; height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden; }
  .dist-fill { height: 100%; background: #3b82f6; border-radius: 4px; }
  .dist-fill.lecturers { background: #3b82f6; }
  .dist-fill.invigilators { background: #f97316; }
  .dist-fill.admins { background: #f59e0b; }
  .dist-value { font-size: 0.8rem; font-weight: 600; color: var(--color-text); width: 36px; text-align: right; }

  .activity-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.5rem; }
  .activity-section h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1rem 0; }

  .activity-list { display: flex; flex-direction: column; gap: 0.875rem; }
  .activity-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0; border-bottom: 1px solid var(--color-border); }
  .activity-item:last-child { border-bottom: none; }
  .activity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .activity-dot.exam { background: #3b82f6; }
  .activity-dot.security { background: #ef4444; }
  .activity-dot.user { background: #f59e0b; }
  .activity-text { flex: 1; font-size: 0.875rem; color: var(--color-text); }
  .activity-time { font-size: 0.75rem; color: var(--color-muted); }
</style>