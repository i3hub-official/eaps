<script lang="ts">
  import { Target, TrendingUp, TrendingDown, Award, AlertTriangle, Building2, Layers, GraduationCap } from 'lucide-svelte';

  let analysisData = $state([
    { category: 'Overall', passed: 892, failed: 355, passRate: 71.5, trend: 'up' },
    { category: 'Computer Science', passed: 145, failed: 32, passRate: 81.9, trend: 'up' },
    { category: 'Mathematics', passed: 156, failed: 47, passRate: 76.8, trend: 'stable' },
    { category: 'Physics', passed: 128, failed: 50, passRate: 71.9, trend: 'down' },
    { category: 'Chemistry', passed: 98, failed: 36, passRate: 73.1, trend: 'up' },
    { category: 'Engineering', passed: 134, failed: 67, passRate: 66.7, trend: 'down' },
    { category: 'English', passed: 289, failed: 23, passRate: 92.6, trend: 'up' },
    { category: 'Biology', passed: 203, failed: 64, passRate: 76.0, trend: 'stable' },
  ]);

  let totalPassed = $derived(analysisData[0].passed);
  let totalFailed = $derived(analysisData[0].failed);
  let totalStudents = $derived(totalPassed + totalFailed);
</script>

<svelte:head><title>Pass / Fail Analysis — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Pass / Fail Analysis</h1>
    <p class="subtitle">Pass rates by department, course, and demographic breakdown</p>
  </header>

  <section class="summary-row">
    <div class="summary-card">
      <Award size={20} />
      <div>
        <span class="summary-value">{totalPassed.toLocaleString()}</span>
        <span class="summary-label">Passed</span>
      </div>
    </div>
    <div class="summary-card fail">
      <AlertTriangle size={20} />
      <div>
        <span class="summary-value">{totalFailed.toLocaleString()}</span>
        <span class="summary-label">Failed</span>
      </div>
    </div>
    <div class="summary-card">
      <Target size={20} />
      <div>
        <span class="summary-value">{((totalPassed / totalStudents) * 100).toFixed(1)}%</span>
        <span class="summary-label">Overall Pass Rate</span>
      </div>
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Department / Category</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Total</th>
          <th>Pass Rate</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        {#each analysisData as row}
          <tr class:highlight={row.category === 'Overall'}>
            <td>
              <div class="dept-cell">
                {#if row.category === 'Overall'}
                  <Target size={16} />
                {:else}
                  <Building2 size={16} />
                {/if}
                <span class="dept-name">{row.category}</span>
              </div>
            </td>
            <td><span class="count passed">{row.passed}</span></td>
            <td><span class="count failed">{row.failed}</span></td>
            <td>{row.passed + row.failed}</td>
            <td>
              <div class="pass-bar">
                <div class="pass-fill" style="width: {row.passRate}%"></div>
                <span>{row.passRate}%</span>
              </div>
            </td>
            <td>
              <span class="trend-icon" class:up={row.trend === 'up'} class:down={row.trend === 'down'} class:stable={row.trend === 'stable'}>
                {#if row.trend === 'up'}
                  <TrendingUp size={16} />
                {:else if row.trend === 'down'}
                  <TrendingDown size={16} />
                {:else}
                  <Target size={16} />
                {/if}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>

<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media (max-width: 768px) { .summary-row { grid-template-columns: 1fr; } }

  .summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; color: #16a34a; }
  .summary-card.fail { color: #ef4444; }
  .summary-card div { display: flex; flex-direction: column; }
  .summary-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
  .summary-label { font-size: 0.75rem; color: var(--color-muted); }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }
  .data-table tr.highlight td { background: rgba(22, 163, 74, 0.05); font-weight: 600; }

  .dept-cell { display: flex; align-items: center; gap: 0.75rem; }
  .dept-cell :global(svg) { color: var(--color-muted); }
  .dept-name { font-weight: 600; color: var(--color-text); }

  .count { font-weight: 700; }
  .count.passed { color: #16a34a; }
  .count.failed { color: #ef4444; }

  .pass-bar { display: flex; align-items: center; gap: 0.5rem; }
  .pass-fill { height: 8px; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 4px; min-width: 20px; }
  .pass-bar span { font-size: 0.8rem; font-weight: 700; color: var(--color-text); min-width: 40px; }

  .trend-icon { display: flex; align-items: center; justify-content: center; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; }
  .trend-icon.stable { color: var(--color-muted); }
</style>