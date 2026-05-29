<script lang="ts">
  import { BookOpen, ClipboardList, Users, Clock, TrendingUp, Award, BarChart3 } from 'lucide-svelte';

  let lecturers = $state([]);

  let searchQuery = $state('');
  let filtered = $derived(lecturers.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.dept.toLowerCase().includes(searchQuery.toLowerCase())));
</script>

<svelte:head><title>Lecturer Activity — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Lecturer Activity</h1>
    <p class="subtitle">Exam creation, student reach, and performance metrics by lecturer</p>
  </header>

  <section class="filters-bar">
    <div class="search-box">
      <BookOpen size={16} />
      <input type="text" placeholder="Search lecturers..." bind:value={searchQuery} />
    </div>
  </section>

  <section class="table-section">
    <table class="data-table">
      <thead>
        <tr>
          <th>Lecturer</th>
          <th>Department</th>
          <th>Exams</th>
          <th>Students</th>
          <th>Avg Pass Rate</th>
          <th>Avg Score</th>
          <th>Hours</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as lecturer}
          <tr>
            <td>
              <div class="lecturer-cell">
                <div class="lecturer-avatar">{lecturer.name.charAt(0)}</div>
                <span class="lecturer-name">{lecturer.name}</span>
              </div>
            </td>
            <td>{lecturer.dept}</td>
            <td>{lecturer.examsCreated}</td>
            <td>{lecturer.totalStudents.toLocaleString()}</td>
            <td>
              <div class="pass-bar">
                <div class="pass-fill" style="width: {lecturer.avgPassRate}%"></div>
                <span>{lecturer.avgPassRate}%</span>
              </div>
            </td>
            <td>
              <span class="score-badge" class:high={lecturer.avgScore >= 70} class:medium={lecturer.avgScore >= 50 && lecturer.avgScore < 70}>
                {lecturer.avgScore}%
              </span>
            </td>
            <td>{lecturer.totalHours}h</td>
            <td>
              <span class="trend-icon" class:up={lecturer.trend === 'up'} class:down={lecturer.trend === 'down'} class:stable={lecturer.trend === 'stable'}>
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

  .lecturer-cell { display: flex; align-items: center; gap: 0.75rem; }
  .lecturer-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #8b5cf6, #a78bfa); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; flex-shrink: 0; }
  .lecturer-name { font-weight: 600; color: var(--color-text); }

  .pass-bar { display: flex; align-items: center; gap: 0.5rem; }
  .pass-fill { height: 6px; background: #16a34a; border-radius: 3px; min-width: 20px; }
  .pass-bar span { font-size: 0.8rem; font-weight: 600; color: var(--color-text); min-width: 40px; }

  .score-badge { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; }
  .score-badge.high { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
  .score-badge.medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

  .trend-icon { display: flex; align-items: center; justify-content: center; }
  .trend-icon.up { color: #16a34a; }
  .trend-icon.down { color: #ef4444; transform: rotate(180deg); }
  .trend-icon.stable { color: var(--color-muted); }
</style>