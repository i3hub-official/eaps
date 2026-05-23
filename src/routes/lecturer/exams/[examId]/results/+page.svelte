<!-- src/routes/(lecturer)/exams/[examId]/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const { exam, results, stats, grades } = data;

  let search = $state('');
  const filtered = $derived(results.filter(r =>
    r.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (r.student.matricNumber ?? '').toLowerCase().includes(search.toLowerCase())
  ));

  const GRADE_COLORS: Record<string, string> = {
    A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#9333ea', E: '#dc2626', F: '#dc2626',
  };
</script>

<svelte:head><title>Results — {exam.title}</title></svelte:head>

<div class="page">
  <div class="page-header">
    <a href="/lecturer/dashboard" class="back">← Dashboard</a>
    <div>
      <h1>Exam Results</h1>
      <p class="sub">{exam.title} · {exam.course.code}</p>
    </div>
  </div>

  <!-- Stats cards -->
  {#if stats}
    <div class="stats-grid">
      <div class="stat-card">
        <span class="sv">{stats.total_students}</span>
        <span class="sl">Total Students</span>
      </div>
      <div class="stat-card">
        <span class="sv">{stats.submitted}</span>
        <span class="sl">Submitted</span>
      </div>
      <div class="stat-card green">
        <span class="sv">{stats.passed}</span>
        <span class="sl">Passed</span>
      </div>
      <div class="stat-card">
        <span class="sv">{stats.pass_rate}%</span>
        <span class="sl">Pass Rate</span>
      </div>
      <div class="stat-card">
        <span class="sv">{stats.avg_percentage}%</span>
        <span class="sl">Average Score</span>
      </div>
      <div class="stat-card">
        <span class="sv">{stats.highest}%</span>
        <span class="sl">Highest</span>
      </div>
      <div class="stat-card">
        <span class="sv">{stats.lowest}%</span>
        <span class="sl">Lowest</span>
      </div>
    </div>
  {/if}

  <!-- Grade distribution -->
  {#if grades.length > 0}
    <div class="grade-dist">
      <h2>Grade Distribution</h2>
      <div class="bars">
        {#each grades as g}
          <div class="bar-col">
            <span class="bar-count">{g.count}</span>
            <div class="bar" style="background:{GRADE_COLORS[g.grade] ?? '#6b7280'};
              height:{Math.max(8, (g.count / (stats?.submitted || 1)) * 120)}px">
            </div>
            <span class="bar-label">{g.grade}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Results table -->
  <div class="table-section">
    <div class="table-header">
      <h2>Student Results ({results.length})</h2>
      <input class="search" type="search" placeholder="Search by name or matric…" bind:value={search} />
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Matric No.</th>
            <th>Score</th>
            <th>Percentage</th>
            <th>Grade</th>
            <th>Status</th>
            <th>Violations</th>
          </tr>
        </thead>
        <tbody>
          {#if filtered.length === 0}
            <tr><td colspan="7" class="empty">No results found.</td></tr>
          {:else}
            {#each filtered as r}
              <tr>
                <td class="name">{r.student.fullName}</td>
                <td class="mono">{r.student.matricNumber ?? '—'}</td>
                <td class="mono">{Number(r.score ?? 0).toFixed(1)}/{exam.totalMarks}</td>
                <td class="mono">{Number(r.percentage ?? 0).toFixed(1)}%</td>
                <td>
                  <span class="grade-badge" style="color:{GRADE_COLORS[r.grade ?? 'F'] ?? '#6b7280'}">
                    {r.grade ?? '—'}
                  </span>
                </td>
                <td>
                  <span class="pass-badge" class:pass={r.passed} class:fail={!r.passed}>
                    {r.passed ? 'Pass' : 'Fail'}
                  </span>
                </td>
                <td class="mono">{r.violationCount}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .page { padding: 2rem; max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: flex-start; gap: 1rem; }
  .back { color: var(--color-primary); text-decoration: none; font-size: 0.875rem; margin-top: 0.25rem; }
  h1   { font-size: 1.3rem; font-weight: 700; margin: 0; }
  .sub { font-size: 0.85rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  .stats-grid {
    display: flex; gap: 1rem; flex-wrap: wrap;
  }
  .stat-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1rem 1.25rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.25rem; min-width: 100px;
  }
  .stat-card.green .sv { color: #16a34a; }
  .sv { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .sl { font-size: 0.7rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }

  .grade-dist {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1.25rem;
  }
  h2 { font-size: 1rem; font-weight: 700; margin: 0 0 1rem; }
  .bars { display: flex; align-items: flex-end; gap: 1.5rem; height: 160px; padding-bottom: 1.5rem; position: relative; }
  .bar-col { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; }
  .bar-count { font-size: 0.8rem; font-weight: 600; }
  .bar { width: 2.5rem; border-radius: 0.3rem 0.3rem 0 0; transition: height 0.3s; min-height: 8px; }
  .bar-label { font-size: 0.85rem; font-weight: 700; }

  .table-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden;
  }
  .table-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; gap: 0.75rem;
  }
  .search {
    padding: 0.4rem 0.875rem; border: 1px solid var(--color-border);
    border-radius: 0.5rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; outline: none; width: 220px;
  }
  .search:focus { border-color: var(--color-primary); }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  thead { background: var(--color-bg); }
  th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 0.75rem 1rem; border-top: 1px solid var(--color-border); }
  tr:hover td { background: var(--color-bg); }

  .name { font-weight: 500; }
  .mono { font-variant-numeric: tabular-nums; font-family: monospace; }

  .grade-badge { font-size: 1rem; font-weight: 800; }
  .pass-badge  { font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px; }
  .pass-badge.pass { background: #dcfce7; color: #16a34a; }
  .pass-badge.fail { background: #fee2e2; color: #dc2626; }

  .empty { text-align: center; color: var(--color-muted); padding: 2rem; }
</style>