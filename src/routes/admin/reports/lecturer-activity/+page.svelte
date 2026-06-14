<script lang="ts">
  import type { PageData } from './$types';
  import { BookOpen, TrendingUp, TrendingDown, Minus } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');

  const filtered = $derived(
    data.lecturers.filter((l: any) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.dept.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
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
    {#if filtered.length === 0}
      <div class="empty">
        <BookOpen size={28} />
        <p>No lecturers found.</p>
      </div>
    {:else}
      <div class="table-wrap">
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
                <td class="muted">{lecturer.dept}</td>
                <td>{lecturer.examsCreated}</td>
                <td>{lecturer.totalStudents.toLocaleString()}</td>
                <td>
                  <div class="pass-bar">
                    <div class="pass-track">
                      <div class="pass-fill" style="width: {lecturer.avgPassRate}%"></div>
                    </div>
                    <span>{lecturer.avgPassRate}%</span>
                  </div>
                </td>
                <td>
                  <span
                    class="score-badge"
                    class:high={lecturer.avgScore >= 70}
                    class:medium={lecturer.avgScore >= 50 && lecturer.avgScore < 70}
                    class:low={lecturer.avgScore < 50}
                  >
                    {lecturer.avgScore}%
                  </span>
                </td>
                <td class="muted">{lecturer.totalHours}h</td>
                <td>
                  {#if lecturer.trend === 'up'}
                    <span class="trend up"><TrendingUp size={15} /></span>
                  {:else if lecturer.trend === 'down'}
                    <span class="trend down"><TrendingDown size={15} /></span>
                  {:else}
                    <span class="trend stable"><Minus size={15} /></span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>
<style>
  .page { max-width: 1200px; }
  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem; }

  .filters-bar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.5rem; padding: 0.5rem 0.75rem;
    flex: 1; min-width: 200px;
  }
  .search-box input {
    border: none; background: none; outline: none;
    color: var(--color-text); font-size: 0.875rem; width: 100%;
  }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }

  .table-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden;
  }
  .table-wrap { overflow-x: auto; }

  .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .data-table th {
    text-align: left; padding: 0.875rem 1rem;
    color: var(--color-muted); font-size: 0.75rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg); white-space: nowrap;
  }
  .data-table td {
    padding: 0.875rem 1rem; border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--color-bg); }

  .muted { color: var(--color-muted); font-size: 0.825rem; }

  .lecturer-cell { display: flex; align-items: center; gap: 0.65rem; }
  .lecturer-avatar {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.75rem; color: #fff;
  }
  .lecturer-name { font-weight: 600; color: var(--color-text); }

  .pass-bar { display: flex; align-items: center; gap: 0.5rem; }
  .pass-track {
    width: 64px; height: 6px; background: var(--color-bg);
    border: 1px solid var(--color-border); border-radius: 3px; overflow: hidden; flex-shrink: 0;
  }
  .pass-fill { height: 100%; background: #3b82f6; border-radius: 3px; transition: width 0.4s ease; }
  .pass-bar span { font-size: 0.78rem; font-weight: 600; color: var(--color-text); min-width: 36px; }

  .score-badge {
    padding: 0.2rem 0.5rem; border-radius: 0.375rem;
    font-size: 0.78rem; font-weight: 700;
    background: var(--color-bg); color: var(--color-muted);
  }
  .score-badge.high   { background: rgba(22,163,74,0.1);  color: #16a34a; }
  .score-badge.medium { background: rgba(245,158,11,0.1); color: #f59e0b; }
  .score-badge.low    { background: rgba(239,68,68,0.1);  color: #ef4444; }

  .trend { display: inline-flex; align-items: center; }
  .trend.up     { color: #16a34a; }
  .trend.down   { color: #ef4444; }
  .trend.stable { color: var(--color-muted); }

  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3rem 2rem; color: var(--color-muted); text-align: center;
  }
  .empty p { margin: 0; font-size: 0.875rem; }
</style>