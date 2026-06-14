<!-- src/lib/components/reports/views/GradeDistributionView.svelte -->
<script lang="ts">
  import type { GradeDistributionData, ReportMeta, ReportParams } from '$lib/types/reports.js';
  import { TrendingUp, Users, Award, BarChart3 } from '@lucide/svelte';

  interface Props {
    meta: ReportMeta;
    params: ReportParams;
    data: Record<string, unknown>;
  }

  let { meta, data }: Props = $props();

  const gradeData = $derived(data.gradeData as GradeDistributionData['gradeData'] ?? {});
  const distribution = $derived(data.distribution as GradeDistributionData['distribution'] ?? []);
  const stats = $derived(data.overallStats as GradeDistributionData['overallStats'] ?? null);

  const gradeOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
  const gradeColors: Record<string, string> = {
    A: '#16a34a', B: '#22c55e', C: '#84cc16', D: '#eab308', E: '#f97316', F: '#ef4444'
  };

  const maxCount = $derived(
    Math.max(...Object.values(gradeData).map(g => g.count), 1)
  );
</script>

<div class="report-view">
  <!-- Stats Cards -->
  {#if stats}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon green"><Users size={18} /></div>
        <div class="stat-info">
          <span class="stat-value">{stats.totalStudents.toLocaleString()}</span>
          <span class="stat-label">Total Students</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><TrendingUp size={18} /></div>
        <div class="stat-info">
          <span class="stat-value">{stats.meanScore}%</span>
          <span class="stat-label">Mean Score</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber"><Award size={18} /></div>
        <div class="stat-info">
          <span class="stat-value">{stats.passRate}%</span>
          <span class="stat-label">Pass Rate</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple"><BarChart3 size={18} /></div>
        <div class="stat-info">
          <span class="stat-value">{stats.stdDeviation}</span>
          <span class="stat-label">Std Deviation</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Grade Distribution Chart -->
  <div class="panel">
    <div class="panel-head">
      <h2>Grade Distribution</h2>
      <span class="panel-sub">Score bands across all students</span>
    </div>
    <div class="panel-body">
      {#if Object.keys(gradeData).length === 0}
        <div class="empty">No grade data available.</div>
      {:else}
        <div class="chart-area">
          <div class="bar-chart">
            {#each gradeOrder as grade}
              {@const info = gradeData[grade]}
              {#if info}
                <div class="bar-col">
                  <div class="bar-wrap">
                    <div
                      class="bar"
                      style="height: {(info.count / maxCount) * 200}px; background: {gradeColors[grade]}"
                    ></div>
                  </div>
                  <span class="bar-count">{info.count}</span>
                  <span class="bar-grade" style="color: {gradeColors[grade]}">{grade}</span>
                  <span class="bar-pct">{info.percentage}%</span>
                  <span class="bar-range">{info.range}</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Grade</th>
                <th>Score Range</th>
                <th class="num">Count</th>
                <th class="num">Percentage</th>
                <th class="num">Cumulative %</th>
                <th>Visual</th>
              </tr>
            </thead>
            <tbody>
              {#each distribution as item}
                <tr>
                  <td>
                    <span class="grade-badge" style="background: {gradeColors[item.grade]}20; color: {gradeColors[item.grade]}">
                      {item.grade}
                    </span>
                  </td>
                  <td class="range-text">{gradeData[item.grade]?.range ?? '—'}</td>
                  <td class="num">{item.count.toLocaleString()}</td>
                  <td class="num">{item.percentage}%</td>
                  <td class="num">{item.cumulativePct}%</td>
                  <td>
                    <div class="mini-bar-wrap">
                      <div class="mini-bar" style="width: {item.percentage}%; background: {gradeColors[item.grade]}"></div>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .report-view { display: flex; flex-direction: column; gap: 1.5rem; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 1rem 1.25rem;
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.875rem;
  }

  .stat-icon {
    width: 40px; height: 40px; border-radius: 0.625rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .stat-icon.green { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .stat-icon.blue  { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .stat-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .stat-icon.purple{ background: rgba(99, 102, 241, 0.1); color: #6366f1; }

  .stat-info { display: flex; flex-direction: column; gap: 0.1rem; }
  .stat-value { font-size: 1.375rem; font-weight: 800; color: var(--color-text, #111827); line-height: 1; }
  .stat-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted, #6b7280); }

  .panel {
    background: var(--color-surface, white);
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 1rem;
    overflow: hidden;
  }

  .panel-head {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }
  .panel-head h2 { font-size: 0.9rem; font-weight: 700; color: var(--color-text, #111827); margin: 0; }
  .panel-sub { font-size: 0.75rem; color: var(--color-muted, #6b7280); }

  .panel-body { padding: 1.25rem; }

  .empty { text-align: center; padding: 3rem; color: var(--color-muted, #6b7280); font-size: 0.875rem; }

  .chart-area { margin-bottom: 1.5rem; }

  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 1.5rem;
    height: 260px;
    padding: 0 1rem;
  }

  .bar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    min-width: 60px;
  }

  .bar-wrap {
    width: 48px;
    height: 200px;
    display: flex;
    align-items: flex-end;
    background: var(--color-bg, #f9fafb);
    border-radius: 0.5rem 0.5rem 0 0;
    overflow: hidden;
  }

  .bar {
    width: 100%;
    border-radius: 0.5rem 0.5rem 0 0;
    transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-height: 4px;
  }

  .bar-count { font-size: 0.8rem; font-weight: 700; color: var(--color-text, #111827); }
  .bar-grade { font-size: 1rem; font-weight: 800; }
  .bar-pct { font-size: 0.7rem; color: var(--color-muted, #6b7280); font-weight: 600; }
  .bar-range { font-size: 0.65rem; color: var(--color-muted, #6b7280); }

  .table-wrap { overflow-x: auto; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  th {
    padding: 0.625rem 0.875rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #6b7280);
    background: var(--color-bg, #f9fafb);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  td {
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  tr:hover td { background: var(--color-bg, #f9fafb); }

  .num { text-align: right; font-variant-numeric: tabular-nums; }

  .grade-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 800;
  }

  .range-text { color: var(--color-muted, #6b7280); font-size: 0.8rem; }

  .mini-bar-wrap {
    width: 100px;
    height: 6px;
    background: var(--color-border, #e5e7eb);
    border-radius: 3px;
    overflow: hidden;
  }

  .mini-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
  }
</style>
