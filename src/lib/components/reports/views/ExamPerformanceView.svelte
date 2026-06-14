<!-- src/lib/components/reports/views/ExamPerformanceView.svelte -->

<script lang="ts">
  import type { ExamPerformanceData, ReportMeta, ReportParams } from '$lib/types/reports.js';
  import { BookOpen, Users, CheckCircle, XCircle, ChevronRight, TrendingUp } from '@lucide/svelte';

  interface Props {
    meta: ReportMeta;
    params: ReportParams;
    data: Record<string, unknown>;
  }

  let { meta, data }: Props = $props();

  const exams        = $derived((data.exams as ExamPerformanceData['exams']) ?? []);
  const dailyActivity = $derived((data.dailyActivity as ExamPerformanceData['dailyActivity']) ?? []);

  // ── These were the invalid {@const} tags — now proper $derived ────────
  const totalStudents  = $derived(exams.reduce((a, e) => a + e.total, 0));
  const totalSubmitted = $derived(exams.reduce((a, e) => a + e.submitted, 0));
  const totalPassed    = $derived(exams.reduce((a, e) => a + e.passed, 0));
  const avgPassRate    = $derived(
    exams.length > 0
      ? Math.round(exams.reduce((a, e) => a + e.pass_rate, 0) / exams.length)
      : 0
  );

  let searchTerm = $state('');

  const filteredExams = $derived(
    exams.filter(e => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        e.exam_title.toLowerCase().includes(q) ||
        e.course_code.toLowerCase().includes(q) ||
        (e.lecturer_name ?? '').toLowerCase().includes(q)
      );
    })
  );

  const maxDay = $derived(Math.max(...dailyActivity.map(d => d.sessions), 1));

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
</script>

<div class="report-view">
  <!-- Summary Stats — {@const} lines removed, variables come from script -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon blue"><BookOpen size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{exams.length}</span>
        <span class="stat-label">Total Exams</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><Users size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{totalStudents.toLocaleString()}</span>
        <span class="stat-label">Total Students</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon teal"><CheckCircle size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{totalPassed.toLocaleString()}</span>
        <span class="stat-label">Passed</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber"><TrendingUp size={18} /></div>
      <div class="stat-info">
        <span class="stat-value">{avgPassRate}%</span>
        <span class="stat-label">Avg Pass Rate</span>
      </div>
    </div>
  </div>

  <!-- Daily Activity Chart -->
  {#if dailyActivity.length > 0}
    <div class="panel">
      <div class="panel-head">
        <h2>Daily Activity</h2>
        <span class="panel-sub">Sessions and submissions over time</span>
      </div>
      <div class="panel-body">
        <div class="bar-chart">
          {#each dailyActivity as d}
            <div class="day-col">
              <div class="bar-stack">
                <div class="bar sessions" style="height: {(d.sessions / maxDay) * 120}px"></div>
                <div class="bar submissions" style="height: {(d.submissions / maxDay) * 120}px"></div>
              </div>
              <span class="day-label">{formatDate(d.day)}</span>
              {#if d.avg_score > 0}
                <span class="day-score">{d.avg_score}%</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Exams Table -->
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title">
        <h2>Exam Performance</h2>
        <span class="panel-sub">{filteredExams.length} of {exams.length} exams</span>
      </div>
      <div class="search-box">
        <input type="text" placeholder="Search exams..." bind:value={searchTerm} />
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Course</th>
            <th>Exam Title</th>
            <th>Lecturer</th>
            <th class="num">Level</th>
            <th class="num">Students</th>
            <th class="num">Submitted</th>
            <th class="num">Not Sub.</th>
            <th class="num">Completion</th>
            <th class="num">Passed</th>
            <th class="num">Failed</th>
            <th class="num">Pass Rate</th>
            <th class="num">Avg Score</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredExams.length === 0}
            <tr><td colspan="12" class="empty">No exams match your search.</td></tr>
          {:else}
            {#each filteredExams as e}
              <tr>
                <td><span class="badge">{e.course_code}</span></td>
                <td class="title-cell">{e.exam_title}</td>
                <td>{e.lecturer_name ?? '—'}</td>
                <td class="num">{e.level}</td>
                <td class="num">{e.total}</td>
                <td class="num pass">{e.submitted}</td>
                <td class="num pending">{e.total - e.submitted}</td>
                <td class="num">
                  <div class="mini-bar-wrap">
                    <div class="mini-bar" style="width: {e.completion_rate}%"></div>
                  </div>
                  <span class="mini-label">{e.completion_rate}%</span>
                </td>
                <td class="num pass">{e.passed}</td>
                <td class="num fail">{e.failed}</td>
                <td class="num">
                  <span class="rate" class:good={e.pass_rate >= 50} class:bad={e.pass_rate < 40}>
                    {e.pass_rate}%
                  </span>
                </td>
                <td class="num">
                  <span class="rate" class:good={e.avg_pct >= 50} class:bad={e.avg_pct < 40}>
                    {e.avg_pct}%
                  </span>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
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
  .stat-icon.blue  { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .stat-icon.green { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .stat-icon.teal  { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
  .stat-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

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
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }
  .panel-head h2 { font-size: 0.85rem; font-weight: 700; color: var(--color-text, #111827); margin: 0; }
  .panel-sub { font-size: 0.75rem; color: var(--color-muted, #6b7280); }

  .panel-title { display: flex; align-items: center; gap: 0.5rem; }

  .search-box input {
    padding: 0.4rem 0.75rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    min-width: 200px;
    outline: none;
    color: var(--color-text, #111827);
  }
  .search-box input:focus { border-color: #3b82f6; }

  .panel-body { padding: 1.25rem; }

  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.5rem;
    height: 160px;
  }

  .day-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }

  .bar-stack {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 2px;
  }

  .bar {
    width: 10px;
    border-radius: 3px 3px 0 0;
    transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    min-height: 4px;
  }
  .bar.sessions { background: #16a34a; }
  .bar.submissions { background: #3b82f6; }

  .day-label { font-size: 0.62rem; color: var(--color-muted, #6b7280); font-weight: 600; }
  .day-score { font-size: 0.62rem; color: #f59e0b; font-weight: 700; }

  .table-wrap { overflow-x: auto; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  th {
    padding: 0.625rem 0.875rem;
    text-align: left;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #6b7280);
    background: var(--color-bg, #f9fafb);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    white-space: nowrap;
  }

  td {
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    white-space: nowrap;
  }

  tr:hover td { background: var(--color-bg, #f9fafb); }

  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .pass { color: #16a34a; }
  .fail { color: #ef4444; }
  .pending { color: #f59e0b; }

  .badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-radius: 999px;
    display: inline-block;
  }

  .title-cell { font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }

  .rate { font-weight: 700; }
  .rate.good { color: #16a34a; }
  .rate.bad { color: #ef4444; }

  .mini-bar-wrap {
    width: 50px;
    height: 5px;
    background: var(--color-border, #e5e7eb);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.15rem;
  }

  .mini-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 3px;
    transition: width 0.6s ease;
  }

  .mini-label { font-size: 0.65rem; color: var(--color-muted, #6b7280); font-weight: 600; }

  .empty { text-align: center; padding: 2.5rem; color: var(--color-muted, #6b7280); }
</style>
