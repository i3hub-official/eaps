<!-- src/routes/admin/reports/student-performance/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { TrendingUp, Search, AlertTriangle, ArrowUpDown } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { data }: { data: PageData } = $props();

  // ── Search + level filter are URL-driven (server does the filtering) ──
  let searchQuery = $state($page.url.searchParams.get('q')  ?? '');
  let levelFilter = $state($page.url.searchParams.get('level') ?? 'all');

  let debounce: ReturnType<typeof setTimeout> | null = null;

  function applyFilters() {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (levelFilter !== 'all') params.set('level', levelFilter);
    goto(`?${params.toString()}`, { replaceState: true, keepFocus: true });
  }

  function onSearch() {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(applyFilters, 350);
  }

  function onLevel() {
    applyFilters();
  }
</script>

<svelte:head>
  <title>Student Performance — MOUAU eTest</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>Student Performance</h1>
      <p class="subtitle">Individual analytics across all exams</p>
    </div>
    <span class="total-badge">{data.students.length} student{data.students.length !== 1 ? 's' : ''}</span>
  </header>

  <!-- Filters -->
  <div class="filters">
    <div class="search-box">
      <Search size={15} />
      <input
        type="text"
        placeholder="Search name or matric…"
        bind:value={searchQuery}
        oninput={onSearch}
      />
    </div>
    <select bind:value={levelFilter} onchange={onLevel} class="level-select">
      <option value="all">All Levels</option>
      <option value="100">100 Level</option>
      <option value="200">200 Level</option>
      <option value="300">300 Level</option>
      <option value="400">400 Level</option>
      <option value="500">500 Level</option>
    </select>
  </div>

  <!-- Table -->
  {#if data.students.length === 0}
    <div class="empty">
      <p class="empty-title">No students found</p>
      <p class="empty-sub">Try adjusting the search or level filter.</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Department</th>
            <th>Lvl</th>
            <th>Exams</th>
            <th>Avg</th>
            <th>High</th>
            <th>Low</th>
            <th>Pass rate</th>
            <th>Violations</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {#each data.students as s (s.id)}
            <tr>
              <!-- Student -->
              <td>
                <div class="student-cell">
                  <div class="avatar">{s.name.charAt(0)}</div>
                  <div>
                    <span class="s-name">{s.name}</span>
                    <span class="s-matric">{s.matric}</span>
                  </div>
                </div>
              </td>

              <!-- Dept -->
              <td class="td-muted">{s.dept}</td>

              <!-- Level -->
              <td class="td-muted">{s.level > 0 ? `${s.level}L` : '—'}</td>

              <!-- Exams taken -->
              <td class="td-center">{s.examsTaken}</td>

              <!-- Avg score -->
              <td>
                <span
                  class="score-tag"
                  class:score-high={s.avgScore >= 70}
                  class:score-mid={s.avgScore >= 50 && s.avgScore < 70}
                  class:score-low={s.avgScore < 50}
                >
                  {s.examsTaken > 0 ? `${s.avgScore}%` : '—'}
                </span>
              </td>

              <!-- Highest -->
              <td>
                <span class="num-green">
                  {s.examsTaken > 0 ? `${s.highest}%` : '—'}
                </span>
              </td>

              <!-- Lowest -->
              <td>
                <span class="num-red">
                  {s.examsTaken > 0 ? `${s.lowest}%` : '—'}
                </span>
              </td>

              <!-- Pass rate bar -->
              <td>
                {#if s.examsTaken > 0}
                  <div class="pass-bar">
                    <div class="pass-fill" style="width:{s.passRate}%"></div>
                    <span>{s.passRate}%</span>
                  </div>
                {:else}
                  <span class="td-muted">—</span>
                {/if}
              </td>

              <!-- Violations -->
              <td>
                <span class="viol" class:viol-alert={s.violations > 5}>
                  {#if s.violations > 5}<AlertTriangle size={12} />{/if}
                  {s.violations}
                </span>
              </td>

              <!-- Trend -->
              <td>
                {#if s.examsTaken > 0}
                  <span class="trend" class:trend-up={s.trend === 'up'} class:trend-down={s.trend === 'down'}>
                    <TrendingUp size={15} />
                  </span>
                {:else}
                  <span class="td-muted">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
<style>
  .page { max-width: 1200px; display: flex; flex-direction: column; gap: 1.25rem; }

  /* Header */
  .page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  h1 { font-size: 1.375rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { font-size: 0.825rem; color: var(--color-muted); margin-top: 0.2rem; }
  .total-badge {
    font-size: 0.72rem; font-weight: 600;
    padding: .25rem .75rem;
    background: var(--color-border); color: var(--color-muted);
    border-radius: 999px; white-space: nowrap; align-self: center;
  }

  /* Filters */
  .filters { display: flex; gap: .75rem; flex-wrap: wrap; }
  .search-box {
    display: flex; align-items: center; gap: .5rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .5rem; padding: .5rem .75rem;
    flex: 1; min-width: 200px;
    transition: border-color .15s;
  }
  .search-box:focus-within { border-color: #3b82f6; }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .search-box input {
    border: none; background: none; outline: none;
    color: var(--color-text); font-size: .875rem; width: 100%;
    font-family: inherit;
  }
  .level-select {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .5rem; padding: .5rem .75rem;
    color: var(--color-text); font-size: .875rem; cursor: pointer;
    font-family: inherit; transition: border-color .15s;
  }
  .level-select:focus { outline: none; border-color: #3b82f6; }

  /* Empty */
  .empty {
    padding: 3rem 2rem; text-align: center;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .75rem; color: var(--color-muted);
  }
  .empty-title { font-weight: 600; font-size: .925rem; }
  .empty-sub   { font-size: .8rem; margin-top: .375rem; }

  /* Table */
  .table-wrap {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: .75rem; overflow: hidden; overflow-x: auto;
  }
  .table {
    width: 100%; border-collapse: collapse;
    font-size: .8rem; white-space: nowrap;
  }
  .table th {
    text-align: left; padding: .75rem 1rem;
    font-size: .65rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .05em;
    color: var(--color-muted);
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }
  .table td {
    padding: .875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
    vertical-align: middle;
  }
  .table tr:last-child td { border-bottom: none; }
  .table tbody tr:hover td { background: color-mix(in srgb, var(--color-surface) 50%, var(--color-bg)); }

  /* Student cell */
  .student-cell { display: flex; align-items: center; gap: .625rem; }
  .avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: .75rem; color: white; flex-shrink: 0;
  }
  .s-name   { display: block; font-weight: 600; font-size: .825rem; }
  .s-matric { display: block; font-size: .7rem; color: var(--color-muted); }

  .td-muted  { color: var(--color-muted); }
  .td-center { text-align: center; }

  /* Score tags */
  .score-tag {
    padding: .2rem .5rem; border-radius: .375rem;
    font-size: .75rem; font-weight: 600;
  }
  .score-high { background: rgba(22,163,74,.1);  color: #16a34a; }
  .score-mid  { background: rgba(245,158,11,.1); color: #d97706; }
  .score-low  { background: rgba(239,68,68,.1);  color: #ef4444; }

  .num-green { font-weight: 600; color: #16a34a; }
  .num-red   { font-weight: 600; color: #ef4444; }

  /* Pass bar */
  .pass-bar {
    display: flex; align-items: center; gap: .5rem; min-width: 90px;
  }
  .pass-fill {
    flex: 1; height: 5px; background: #3b82f6;
    border-radius: 3px; min-width: 4px; max-width: 60px;
    transition: width .3s;
  }
  .pass-bar span { font-size: .75rem; font-weight: 600; min-width: 36px; }

  /* Violations */
  .viol {
    display: inline-flex; align-items: center; gap: .25rem;
    font-size: .75rem; font-weight: 600; color: var(--color-muted);
  }
  .viol-alert { color: #ef4444; }

  /* Trend */
  .trend { display: inline-flex; align-items: center; }
  .trend-up   { color: #16a34a; }
  .trend-down { color: #ef4444; transform: rotate(180deg); display: inline-flex; }
</style>