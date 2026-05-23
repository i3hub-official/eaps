<!-- src/routes/(admin)/admin/reports/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const { examStats, topStudents, violationBreakdown, dailyActivity } = data;

  const FLAG_LABELS: Record<string, string> = {
    tab_switch: 'Tab Switch', window_blur: 'Focus Lost',
    fullscreen_exit: 'Fullscreen Exit', copy_attempt: 'Copy Attempt',
    devtools_open: 'DevTools', screenshot_attempt: 'Screenshot',
    multiple_faces: 'Multiple Faces', no_face_detected: 'No Face',
    invigilator_manual: 'Manual Flag',
  };

  const totalViolations = $derived(violationBreakdown.reduce((s: number, v: any) => s + v.count, 0));
  const maxDay = $derived(Math.max(...dailyActivity.map((d: any) => d.sessions), 1));
</script>

<svelte:head><title>Reports — Admin</title></svelte:head>

<div class="page">
  <h1>System Reports</h1>

  <!-- Exam summary table -->
  <section class="section">
    <h2>Exam Performance Summary</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Course</th><th>Exam</th><th>Students</th>
            <th>Submitted</th><th>Passed</th><th>Avg Score</th>
          </tr>
        </thead>
        <tbody>
          {#if examStats.length === 0}
            <tr><td colspan="6" class="empty">No exam data yet.</td></tr>
          {:else}
            {#each examStats as e}
              <tr>
                <td><span class="badge">{e.course_code}</span></td>
                <td class="title-cell">{e.exam_title}</td>
                <td class="num">{e.total}</td>
                <td class="num">{e.submitted}</td>
                <td class="num">{e.passed}</td>
                <td class="num">
                  <span class="score" class:good={e.avg_pct >= 50} class:bad={e.avg_pct < 40}>
                    {e.avg_pct}%
                  </span>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </section>

  <div class="two-col">
    <!-- Top students -->
    <section class="section">
      <h2>Top 10 Students</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Student</th><th>Matric</th><th>Exams</th><th>Avg</th></tr>
          </thead>
          <tbody>
            {#each topStudents as s, i}
              <tr>
                <td class="num rank">{i + 1}</td>
                <td class="name-cell">{s.student_name}</td>
                <td class="mono">{s.matric_number ?? '—'}</td>
                <td class="num">{s.exams_taken}</td>
                <td class="num"><span class="score good">{s.avg_pct}%</span></td>
              </tr>
            {/each}
            {#if topStudents.length === 0}
              <tr><td colspan="5" class="empty">No results yet.</td></tr>
            {/if}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Violation breakdown -->
    <section class="section">
      <h2>Violation Breakdown <span class="total-badge">{totalViolations} total</span></h2>
      <div class="violation-bars">
        {#each violationBreakdown as v}
          {@const pct = totalViolations > 0 ? (v.count / totalViolations) * 100 : 0}
          <div class="v-row">
            <span class="v-label">{FLAG_LABELS[v.flag_type] ?? v.flag_type}</span>
            <div class="v-bar-wrap">
              <div class="v-bar" style="width:{pct}%"></div>
            </div>
            <span class="v-count">{v.count}</span>
          </div>
        {/each}
        {#if violationBreakdown.length === 0}
          <p class="empty">No violations recorded.</p>
        {/if}
      </div>
    </section>
  </div>

  <!-- Daily activity chart -->
  <section class="section">
    <h2>Daily Activity (Last 14 Days)</h2>
    <div class="chart-wrap">
      {#if dailyActivity.length === 0}
        <p class="empty">No activity data.</p>
      {:else}
        <div class="chart">
          {#each dailyActivity as d}
            <div class="day-col">
              <div class="bar-group">
                <div class="bar sessions"
                  style="height:{(d.sessions / maxDay) * 120}px"
                  title="{d.sessions} sessions">
                </div>
                <div class="bar submissions"
                  style="height:{(d.submissions / maxDay) * 120}px"
                  title="{d.submissions} submitted">
                </div>
              </div>
              <span class="day-label">{new Date(d.day).toLocaleDateString([], { month:'short', day:'numeric' })}</span>
            </div>
          {/each}
        </div>
        <div class="legend">
          <span class="legend-item sessions">Sessions</span>
          <span class="legend-item submissions">Submissions</span>
        </div>
      {/if}
    </div>
  </section>
</div>

<style>
  .page { padding: 2rem; max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
  h1 { font-size: 1.4rem; font-weight: 700; margin: 0; }
  h2 { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem; }

  .section { display: flex; flex-direction: column; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

  .table-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { padding: 0.65rem 1rem; text-align: left; font-size: 0.72rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; background: var(--color-bg); }
  td { padding: 0.65rem 1rem; border-top: 1px solid var(--color-border); }
  tr:hover td { background: var(--color-bg); }

  .badge { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.5rem; background: var(--color-primary-subtle); color: var(--color-primary); border-radius: 999px; }
  .title-cell { font-weight: 500; max-width: 240px; }
  .num  { text-align: right; font-variant-numeric: tabular-nums; }
  .rank { color: var(--color-muted); font-weight: 700; }
  .mono { font-family: monospace; font-size: 0.82rem; }
  .name-cell { font-weight: 500; }
  .score     { font-weight: 700; }
  .score.good { color: #16a34a; }
  .score.bad  { color: #dc2626; }
  .empty { text-align: center; color: var(--color-muted); padding: 1.5rem; }

  .total-badge { font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; background: var(--color-border); color: var(--color-muted); border-radius: 999px; }

  /* Violation bars */
  .violation-bars {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
  }
  .v-row   { display: flex; align-items: center; gap: 0.75rem; }
  .v-label { font-size: 0.8rem; width: 130px; flex-shrink: 0; }
  .v-bar-wrap { flex: 1; height: 8px; background: var(--color-border); border-radius: 999px; overflow: hidden; }
  .v-bar  { height: 100%; background: var(--color-primary); border-radius: 999px; transition: width 0.4s ease; min-width: 2px; }
  .v-count { font-size: 0.8rem; font-weight: 600; width: 36px; text-align: right; color: var(--color-muted); }

  /* Chart */
  .chart-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; }
  .chart { display: flex; align-items: flex-end; gap: 0.5rem; height: 160px; padding-bottom: 1.75rem; position: relative; }
  .day-col { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; flex: 1; }
  .bar-group { display: flex; align-items: flex-end; gap: 2px; }
  .bar { width: 10px; border-radius: 2px 2px 0 0; min-height: 4px; transition: height 0.3s; }
  .bar.sessions    { background: var(--color-primary); }
  .bar.submissions { background: #16a34a; }
  .day-label { font-size: 0.62rem; color: var(--color-muted); white-space: nowrap; }
  .legend { display: flex; gap: 1.5rem; margin-top: 0.75rem; }
  .legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--color-muted); }
  .legend-item::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
  .legend-item.sessions::before    { background: var(--color-primary); }
  .legend-item.submissions::before { background: #16a34a; }
</style>