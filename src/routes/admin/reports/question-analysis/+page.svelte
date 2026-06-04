<!-- src/routes/admin/reports/question-analysis/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { BrainCircuit, Search, ArrowUpDown } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');

  const filtered = $derived(
    data.questions.filter(q =>
      q.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.exam.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function diffClass(d: string) {
    return { easy: 'diff-easy', medium: 'diff-medium', hard: 'diff-hard' }[d] ?? 'diff-medium';
  }
</script>

<svelte:head><title>Question Analysis — MOUAU eTest</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Question Analysis</h1>
    <p class="subtitle">Difficulty index, discrimination coefficient, and accuracy per question</p>
  </header>

  <div class="filters-bar">
    <div class="search-box">
      <Search size={15} />
      <input type="text" placeholder="Search questions or exam…" bind:value={searchQuery} />
    </div>
    <span class="count">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</span>
  </div>

  <div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th>Question <ArrowUpDown size={12} /></th>
          <th>Exam</th>
          <th>Type</th>
          <th>Attempts</th>
          <th>Accuracy</th>
          <th>Avg Time</th>
          <th>Difficulty</th>
          <th>Discrimination</th>
        </tr>
      </thead>
      <tbody>
        {#if filtered.length === 0}
          <tr>
            <td colspan="8" class="empty">No questions found.</td>
          </tr>
        {:else}
          {#each filtered as q}
            <tr>
              <td>
                <div class="q-cell">
                  <span class="q-icon"><BrainCircuit size={15} /></span>
                  <span class="q-body">{q.body}</span>
                </div>
              </td>
              <td class="mono">{q.exam}</td>
              <td>
                <span class="badge {q.type === 'mcq' ? 'badge-mcq' : 'badge-fitb'}">
                  {q.type === 'mcq' ? 'MCQ' : 'Fill-in'}
                </span>
              </td>
              <td>{q.attempts}</td>
              <td>
                <div class="bar-row">
                  <div class="bar-track">
                    <div class="bar-fill green" style="width:{q.accuracy}%"></div>
                  </div>
                  <span>{q.accuracy}%</span>
                </div>
              </td>
              <td>{q.avgTime}s</td>
              <td><span class="badge {diffClass(q.difficulty)}">{q.difficulty}</span></td>
              <td>
                <div class="bar-row">
                  <div class="bar-track">
                    <div class="bar-fill purple" style="width:{q.discrimination * 100}%"></div>
                  </div>
                  <span>{q.discrimination.toFixed(2)}</span>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
<style>
  .page { max-width: 1300px; padding: 1.75rem 2rem 4rem; margin: 0 auto; }

  .page-header { margin-bottom: 1.5rem; }
  .page-header h1 {
    font-size: 1.65rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.25rem;
  }
  .subtitle { color: var(--color-muted); font-size: 0.82rem; margin: 0; }

  .filters-bar {
    display: flex; align-items: center; gap: 0.875rem;
    margin-bottom: 1.125rem; flex-wrap: wrap;
  }
  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.6rem; padding: 0.525rem 0.875rem;
    flex: 1; min-width: 220px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search-box:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
  .search-box :global(svg) { color: var(--color-muted); flex-shrink: 0; }
  .search-box input {
    border: none; background: none; outline: none;
    color: var(--color-text); font-size: 0.875rem; width: 100%;
    font-family: inherit;
  }
  .count {
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    white-space: nowrap;
  }

  .table-wrap {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; overflow: hidden;
  }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.855rem; }
  .data-table th {
    text-align: left; padding: 0.8rem 1rem;
    color: var(--color-muted); font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg); white-space: nowrap;
  }
  .data-table th :global(svg) { display: inline; vertical-align: middle; margin-left: 0.2rem; opacity: 0.5; }
  .data-table td {
    padding: 0.875rem 1rem; border-bottom: 1px solid var(--color-border);
    color: var(--color-text); vertical-align: middle;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tbody tr:hover td { background: rgba(59,130,246,0.03); }

  .q-cell { display: flex; align-items: flex-start; gap: 0.6rem; max-width: 380px; }
  .q-icon {
    width: 28px; height: 28px; flex-shrink: 0;
    border-radius: 0.45rem;
    background: rgba(59,130,246,0.1); color: #3b82f6;
    display: flex; align-items: center; justify-content: center;
    margin-top: 1px;
  }
  .q-body {
    font-size: 0.855rem; line-height: 1.45;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }

  .mono { font-size: 0.78rem; font-weight: 700; color: #3b82f6; font-family: monospace; }

  .badge {
    display: inline-block; padding: 0.2rem 0.55rem;
    border-radius: 0.375rem; font-size: 0.7rem; font-weight: 700;
    text-transform: capitalize; letter-spacing: 0.02em;
  }
  .badge-mcq  { background: rgba(59,130,246,0.1); color: #1d4ed8; }
  .badge-fitb { background: rgba(245,158,11,0.1); color: #92400e; }
  .diff-easy   { background: rgba(22,163,74,0.1);  color: #15803d; }
  .diff-medium { background: rgba(245,158,11,0.1); color: #92400e; }
  .diff-hard   { background: rgba(239,68,68,0.1);  color: #dc2626; }

  .bar-row { display: flex; align-items: center; gap: 0.5rem; }
  .bar-track {
    width: 64px; height: 5px; border-radius: 999px;
    background: var(--color-border); flex-shrink: 0; overflow: hidden;
  }
  .bar-fill { height: 100%; border-radius: 999px; min-width: 3px; }
  .bar-fill.green  { background: #16a34a; }
  .bar-fill.blue   { background: #3b82f6; }
  .bar-row span { font-size: 0.78rem; font-weight: 600; min-width: 38px; }

  .empty {
    text-align: center; padding: 3rem;
    color: var(--color-muted); font-size: 0.875rem;
  }
</style>