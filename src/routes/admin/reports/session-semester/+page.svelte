<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';

  let { data }: { data: PageData } = $props();

  type Session = {
    session: string;
    semester: number;
    exams: number;
    students: number;
    avgScore: number;
    passRate: number;
    trend: 'up' | 'down' | 'stable';
  };

  let view = $state<'all' | 'sem1' | 'sem2'>('all');
  let sortKey = $state<keyof Session>('session');
  let sortDir = $state(1);
  let query = $state('');
  let chart: any = null;

  const sessions: Session[] = data.sessions;

  function filtered(): Session[] {
    let d = sessions;
    if (view === 'sem1') d = d.filter((x) => x.semester === 1);
    if (view === 'sem2') d = d.filter((x) => x.semester === 2);
    if (query) d = d.filter((x) => x.session.toLowerCase().includes(query.toLowerCase()));
    return [...d].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') return sortDir * (av as string).localeCompare(bv as string);
      return sortDir * ((av as number) - (bv as number));
    });
  }

  function sortCol(key: keyof Session) {
    if (sortKey === key) sortDir *= -1;
    else { sortKey = key; sortDir = 1; }
  }

  function metrics() {
    const d = filtered();
    if (!d.length) return null;
    return {
      totalStudents: d.reduce((a, x) => a + x.students, 0),
      totalExams: d.reduce((a, x) => a + x.exams, 0),
      avgScore: (d.reduce((a, x) => a + x.avgScore, 0) / d.length).toFixed(1),
      avgPass: (d.reduce((a, x) => a + x.passRate, 0) / d.length).toFixed(1),
      best: d.reduce((a, b) => (b.avgScore > a.avgScore ? b : a)),
      count: d.length,
    };
  }

  function passColor(rate: number) {
    if (rate >= 70) return '#639922';
    if (rate >= 50) return '#BA7517';
    return '#A32D2D';
  }

  async function renderChart() {
    if (typeof window === 'undefined') return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const canvas = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (chart) chart.destroy();

    const d = filtered();
    const labels = d.map((x) => `${x.session} S${x.semester}`);

    chart = new Chart(canvas, {
      data: {
        labels,
        datasets: [
          {
            type: 'line' as const,
            label: 'Avg score (%)',
            data: d.map((x) => x.avgScore),
            borderColor: '#378ADD',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#378ADD',
            tension: 0.35,
            yAxisID: 'y',
            borderWidth: 2,
            pointRadius: 4,
          },
          {
            type: 'line' as const,
            label: 'Pass rate (%)',
            data: d.map((x) => x.passRate),
            borderColor: '#639922',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#639922',
            tension: 0.35,
            yAxisID: 'y',
            borderDash: [5, 3],
            borderWidth: 2,
            pointRadius: 4,
          },
          {
            type: 'bar' as const,
            label: 'Students',
            data: d.map((x) => x.students),
            backgroundColor: 'rgba(186,117,23,0.15)',
            borderColor: 'rgba(186,117,23,0.4)',
            borderWidth: 1,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: {
            ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 30 },
            grid: { display: false },
          },
          y: {
            min: 0,
            max: 100,
            ticks: { font: { size: 11 }, callback: (v: any) => v + '%' },
            grid: { color: 'rgba(128,128,128,0.1)' },
          },
          y2: {
            position: 'right' as const,
            ticks: { font: { size: 11 }, callback: (v: any) => v.toLocaleString() },
            grid: { display: false },
          },
        },
      },
    });
  }

  $effect(() => {
    // re-run whenever view, sortKey, sortDir, or query change
    view; sortKey; sortDir; query;
    renderChart();
  });
</script>

<svelte:head><title>Session / Semester Trends — MOUAU eTest</title></svelte:head>

{#snippet trendIcon(trend: string)}
  {#if trend === 'up'}
    <span class="trend-up">↑ Up</span>
  {:else if trend === 'down'}
    <span class="trend-down">↓ Down</span>
  {:else}
    <span class="trend-stable">— Stable</span>
  {/if}
{/snippet}

<div class="dash">
  <!-- Top bar -->
  <div class="topbar">
    <div class="topbar-left">
      <h1>Session / Semester Trends</h1>
      <p>Longitudinal analysis across academic sessions and semesters</p>
    </div>
    <div class="controls">
      <div class="pill-group">
        <button class="pill" class:active={view === 'all'} onclick={() => (view = 'all')}>All</button>
        <button class="pill" class:active={view === 'sem1'} onclick={() => (view = 'sem1')}>Semester 1</button>
        <button class="pill" class:active={view === 'sem2'} onclick={() => (view = 'sem2')}>Semester 2</button>
      </div>
      <select bind:value={sortKey}>
        <option value="session">Sort: Session</option>
        <option value="avgScore">Sort: Avg Score</option>
        <option value="passRate">Sort: Pass Rate</option>
        <option value="students">Sort: Students</option>
      </select>
    </div>
  </div>

  <!-- Metric cards -->
  {#if metrics()}
    {@const m = metrics()!}
    <div class="metric-row">
      <div class="mcard">
        <div class="mcard-label">Total students sat</div>
        <div class="mcard-val">{m.totalStudents.toLocaleString()}</div>
        <div class="mcard-sub">{m.count} sessions shown</div>
      </div>
      <div class="mcard">
        <div class="mcard-label">Total exams</div>
        <div class="mcard-val">{m.totalExams}</div>
        <div class="mcard-sub">across all sessions</div>
      </div>
      <div class="mcard">
        <div class="mcard-label">Overall avg score</div>
        <div class="mcard-val">{m.avgScore}%</div>
        <div class="mcard-sub">mean across sessions</div>
      </div>
      <div class="mcard">
        <div class="mcard-label">Avg pass rate</div>
        <div class="mcard-val">{m.avgPass}%</div>
        <div class="mcard-sub">mean across sessions</div>
      </div>
      <div class="mcard">
        <div class="mcard-label">Best session</div>
        <div class="mcard-val mcard-val--sm">{m.best.session}</div>
        <div class="mcard-sub">Sem {m.best.semester} — {m.best.avgScore}% avg</div>
      </div>
    </div>
  {/if}

  <!-- Chart -->
  <div class="chart-card">
    <div class="chart-top">
      <span class="chart-title">Average score &amp; pass rate over time</span>
      <div class="chart-legend">
        <span class="legend-item"><span class="legend-dot" style="background:#378ADD"></span>Avg score</span>
        <span class="legend-item"><span class="legend-dot legend-dot--dashed" style="border-color:#639922"></span>Pass rate</span>
        <span class="legend-item"><span class="legend-dot" style="background:rgba(186,117,23,0.4)"></span>Students</span>
      </div>
    </div>
    <div class="chart-wrap">
      <canvas id="trendChart" role="img" aria-label="Line chart showing average score and pass rate across academic sessions"></canvas>
    </div>
  </div>

  <!-- Table -->
  <div class="table-card">
    <div class="table-header">
      <span>All sessions</span>
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Filter session…" bind:value={query} />
      </div>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            {#each [
              { key: 'session', label: 'Session' },
              { key: 'semester', label: 'Sem' },
              { key: 'exams', label: 'Exams' },
              { key: 'students', label: 'Students' },
              { key: 'avgScore', label: 'Avg score' },
              { key: 'passRate', label: 'Pass rate' },
            ] as col}
              <th
                onclick={() => sortCol(col.key as keyof Session)}
                class:sort-active={sortKey === col.key}
              >
                {col.label}
                <span class="sort-arrow">
                  {sortKey === col.key ? (sortDir === 1 ? '↓' : '↑') : '↕'}
                </span>
              </th>
            {/each}
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered() as row}
            <tr>
              <td><span class="badge badge-gray">{row.session}</span></td>
              <td><span class="badge {row.semester === 1 ? 'badge-blue' : 'badge-green'}">Sem {row.semester}</span></td>
              <td>{row.exams}</td>
              <td>{row.students.toLocaleString()}</td>
              <td><strong>{row.avgScore}%</strong></td>
              <td>
                <div class="pass-bar-wrap">
                  <div class="pass-bar">
                    <div class="pass-fill" style="width:{row.passRate}%; background:{passColor(row.passRate)}"></div>
                  </div>
                  <span class="pass-val" style="color:{passColor(row.passRate)}">{row.passRate}%</span>
                </div>
              </td>
              <td>{@render trendIcon(row.trend)}</td>
            </tr>
          {:else}
            <tr>
              <td colspan="7" class="empty-state">No data matches the current filter.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .dash { max-width: 1200px; padding-bottom: 2rem; }

  /* Top bar */
  .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .topbar-left h1 { font-size: 1.25rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .topbar-left p { color: var(--color-muted); font-size: 0.875rem; margin-top: 0.25rem; }
  .controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }

  .pill-group { display: flex; border: 1px solid var(--color-border); border-radius: 0.5rem; overflow: hidden; }
  .pill { padding: 0.375rem 0.875rem; font-size: 0.75rem; font-weight: 500; background: transparent; border: none; cursor: pointer; color: var(--color-muted); transition: background 0.15s, color 0.15s; }
  .pill.active { background: var(--color-surface); color: var(--color-text); }

  select { font-size: 0.75rem; padding: 0.375rem 0.625rem; border-radius: 0.5rem; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); }

  /* Metric cards */
  .metric-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
  .mcard { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; }
  .mcard-label { font-size: 0.7rem; color: var(--color-muted); margin-bottom: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .mcard-val { font-size: 1.375rem; font-weight: 700; color: var(--color-text); }
  .mcard-val--sm { font-size: 1rem; }
  .mcard-sub { font-size: 0.7rem; color: var(--color-muted); margin-top: 0.2rem; }

  /* Chart */
  .chart-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; }
  .chart-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
  .chart-title { font-size: 0.8rem; font-weight: 600; color: var(--color-text); }
  .chart-legend { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.7rem; color: var(--color-muted); }
  .legend-item { display: flex; align-items: center; gap: 0.3rem; }
  .legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
  .legend-dot--dashed { background: transparent; border: 2px dashed; border-radius: 0; }
  .chart-wrap { position: relative; height: 260px; }

  /* Table */
  .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .table-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border); }
  .table-header span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); }
  .search-wrap { position: relative; }
  .search-icon { position: absolute; left: 0.5rem; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--color-muted); }
  .search-wrap input { padding: 0.375rem 0.625rem 0.375rem 1.75rem; font-size: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text); width: 180px; }
  .table-scroll { overflow-x: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th { padding: 0.625rem 1.25rem; text-align: left; font-size: 0.7rem; font-weight: 600; color: var(--color-muted); border-bottom: 1px solid var(--color-border); background: var(--color-bg); cursor: pointer; user-select: none; white-space: nowrap; }
  th:hover { color: var(--color-text); }
  th.sort-active { color: var(--color-text); }
  .sort-arrow { opacity: 0.5; font-size: 0.65rem; margin-left: 2px; }
  th.sort-active .sort-arrow { opacity: 1; }
  td { padding: 0.625rem 1.25rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--color-bg); }

  /* Badges */
  .badge { display: inline-flex; align-items: center; font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 0.375rem; }
  .badge-gray { background: rgba(100,116,139,0.15); color: var(--color-muted); }
  .badge-blue { background: rgba(59,130,246,0.12); color: #2563eb; }
  .badge-green { background: rgba(22,163,74,0.12); color: #15803d; }

  /* Pass bar */
  .pass-bar-wrap { display: flex; align-items: center; gap: 0.5rem; }
  .pass-bar { flex: 1; height: 5px; background: var(--color-border); border-radius: 3px; overflow: hidden; min-width: 60px; }
  .pass-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
  .pass-val { font-size: 0.75rem; font-weight: 600; min-width: 36px; text-align: right; }

  /* Trend */
  .trend-up { color: #16a34a; font-size: 0.75rem; font-weight: 600; }
  .trend-down { color: #ef4444; font-size: 0.75rem; font-weight: 600; }
  .trend-stable { color: var(--color-muted); font-size: 0.75rem; }

  .empty-state { padding: 2rem; text-align: center; color: var(--color-muted); }
</style>