<script lang="ts">
  import { BarChart2 } from 'lucide-svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Results — eTest</title></svelte:head>

<div class="page">
  <div class="page-header">
    <BarChart2 size={22} />
    <h1>Exam Results</h1>
  </div>

  {#if data.results.length === 0}
    <div class="empty">
      <BarChart2 size={36} />
      <p>No completed exams yet.</p>
    </div>
  {:else}
    <div class="table-section">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Exam</th>
              <th>Course</th>
              <th>Students</th>
              <th>Submitted</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Avg Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.results as r}
              <tr>
                <td class="name">{r.exam_title}</td>
                <td class="mono">{r.course_code}</td>
                <td class="mono">{r.total_students}</td>
                <td class="mono">{r.submitted}</td>
                <td class="mono pass">{r.passed}</td>
                <td class="mono fail">{r.failed}</td>
                <td class="mono">{r.avg_score != null ? `${r.avg_score}%` : '—'}</td>
                <td>
                  <a href="/lecturer/exams/{r.exam_id}/results" class="link">
                    View →
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .page { padding: 2rem; max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: center; gap: 0.75rem; }
  h1 { font-size: 1.3rem; font-weight: 700; margin: 0; }

  .table-section {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden;
  }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  thead { background: var(--color-bg); }
  th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600;
       color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 0.75rem 1rem; border-top: 1px solid var(--color-border); }
  tr:hover td { background: var(--color-bg); }

  .name { font-weight: 500; }
  .mono { font-variant-numeric: tabular-nums; }
  .pass { color: #16a34a; font-weight: 600; }
  .fail { color: #dc2626; font-weight: 600; }
  .link { color: var(--indigo-600); text-decoration: none; font-size: 0.8rem; font-weight: 500; }
  .link:hover { text-decoration: underline; }

  .empty { text-align: center; color: var(--color-muted); padding: 4rem 2rem;
           display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
</style>