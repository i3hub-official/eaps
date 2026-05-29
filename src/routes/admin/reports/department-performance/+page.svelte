<script lang="ts">
  import { Layers, Award, Users, TrendingUp, TrendingDown, Target, Building2 } from 'lucide-svelte';

  let departments = $state([]);

  let searchQuery = $state('');
  let filtered = $derived(departments.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.college.toLowerCase().includes(searchQuery.toLowerCase())));
</script>

<svelte:head><title>Department Performance — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Department Performance</h1>
    <p class="subtitle">Department-level analytics: scores, pass rates, and student outcomes</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <Layers size={16} />
      <input type="text" placeholder="Search departments..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Department</th>
          <th>College</th>
          <th>Students</th>
          <th>Exams</th>
          <th>Avg Score</th>
          <th>Pass Rate</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as dept}
          <tr>
            <td>
              <div class="dept-cell">
                <div class="dept-icon"><Layers size={16} /></div>
                <span class="dept-name">{dept.name}</span>
              </div>
            </td>
            <td><span class="college-badge">{dept.college}</span></td>
            <td>{dept.students}</td>
            <td>{dept.exams}</td>
            <td>
              <span class="score-badge" class:high={dept.avgScore >= 70} class:medium={dept.avgScore >= 50 && dept.avgScore < 70} class:low={dept.avgScore < 50}>
                {dept.avgScore}%
              </span>
            </td>
            <td>
              <div class="pass-bar">
                <div class="pass-fill" style="width: {dept.passRate}%"></div>
                <span>{dept.passRate}%</span>
              </div>
            </td>
            <td>
              <span class="trend-icon" class:up={dept.trend === 'up'} class:down={dept.trend === 'down'} class:stable={dept.trend === 'stable'}>
                <TrendingUp size={16} />
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

  .filters-bar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .search-box { display: flex; align-items: center; gap: 0.5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.5rem 0.75rem; flex: 1; min-width: 200px; }
  .search-box input { border: none; background: none; outline: none; color: var(--color-text); font-size: 0.875rem; width: 100%; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }

  .table-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th { text-align: left; padding: 0.875rem 1rem; color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-border); background: var(--color-bg); white-space: nowrap; }
  .data-table td { padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-surface-hover); }

  .dept-cell { display: flex; align-items: center; gap: 0.75rem; }
  .dept-icon { width: 32px; height: 32px; border-radius: 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .dept-name { font-weight: 600; color: var(--color-text); }

  .college-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

  .score-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; }
  .score-badge.high { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .score-badge.medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .score-badge.low { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  .pass-bar { display: flex; align-items: center; gap: 0.5rem; }
  .pass-fill { height: 6px; background: #16a34a; border-radius: 3px; min-width: 20px; }
  .pass-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 40px; }

  .trend-icon { display: flex; align-items: center; justify-content: center; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; transform: rotate(180deg); }
  .trend-icon.stable { color: var(--color-muted); }
</style>