<!-- src/routes/(lecturer)/exams/[examId]/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { ArrowLeft, TrendingUp, Users, Award, XCircle } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
  let search = $state('');

  const filtered = $derived(
    data.results.filter(r =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.matric_number?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const stats = $derived(() => {
    if (!data.results.length) return null;
    const scores = data.results.map(r => r.percentage);
    return {
      avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      highest: Math.max(...scores).toFixed(1),
      lowest: Math.min(...scores).toFixed(1),
      passed: data.results.filter(r => r.passed).length,
      failed: data.results.filter(r => !r.passed).length,
    };
  });

  function gradeColor(grade: string) {
    return { A: 'badge-green', B: 'badge-blue', C: 'badge-yellow', D: 'badge-yellow', E: 'badge-red', F: 'badge-red' }[grade] ?? 'badge-gray';
  }
</script>

<svelte:head><title>Results — {data.exam.course_code}</title></svelte:head>

<a href="/lecturer/exams" style="display:inline-flex; align-items:center; gap:0.4rem; font-size:0.8rem; color:var(--text-muted); text-decoration:none; margin-bottom:1rem;">
  <ArrowLeft size={13} /> Back to Exams
</a>

<h1 style="font-size:1.3rem; font-weight:800; color:var(--text); margin:0 0 0.2rem;">{data.exam.course_code} — Results</h1>
<p style="color:var(--text-muted); font-size:0.82rem; margin:0 0 1.5rem;">{data.exam.title} · {data.results.length} submissions</p>

{#if stats()}
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
    {#each [
      { label: 'Average', value: stats().avg + '%', icon: TrendingUp, color: '#3b82f6' },
      { label: 'Highest', value: stats().highest + '%', icon: Award, color: 'var(--success)' },
      { label: 'Passed', value: stats().passed, icon: Users, color: 'var(--success)' },
      { label: 'Failed', value: stats().failed, icon: XCircle, color: 'var(--danger)' },
    ] as s}
      <div class="card" style="padding:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); font-weight:600;">{s.label}</span>
          <s.icon size={15} color={s.color} />
        </div>
        <span style="font-size:1.6rem; font-weight:800; color:{s.color};">{s.value}</span>
      </div>
    {/each}
  </div>
{/if}

<div class="card" style="overflow:hidden;">
  <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border);">
    <input bind:value={search} type="search" placeholder="Search by name or matric..." class="input" style="max-width:300px;" />
  </div>

  <div style="overflow-x:auto;">
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Student</th>
          <th>Department</th>
          <th style="text-align:right;">Score</th>
          <th style="text-align:right;">%</th>
          <th style="text-align:center;">Grade</th>
          <th style="text-align:center;">Status</th>
          <th style="text-align:center;">Violations</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as r, i}
          <tr>
            <td style="color:var(--text-muted); font-size:0.78rem;">{i + 1}</td>
            <td>
              <div style="font-weight:600; color:var(--text); font-size:0.85rem;">{r.full_name}</div>
              <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">{r.matric_number}</div>
            </td>
            <td style="font-size:0.8rem; color:var(--text-muted);">{r.department}</td>
            <td style="text-align:right; font-weight:600; color:var(--text);">{r.score}/{data.exam.total_marks}</td>
            <td style="text-align:right; font-weight:700; color:{r.passed ? 'var(--success)' : 'var(--danger)'};">{r.percentage?.toFixed(1)}%</td>
            <td style="text-align:center;"><span class="badge {gradeColor(r.grade)}">{r.grade}</span></td>
            <td style="text-align:center;">
              <span class="badge {r.passed ? 'badge-green' : 'badge-red'}">{r.passed ? 'Passed' : 'Failed'}</span>
            </td>
            <td style="text-align:center; font-size:0.8rem; color:{r.violation_count > 0 ? 'var(--warning)' : 'var(--text-muted)'};">
              {r.violation_count || '—'}
            </td>
          </tr>
        {/each}
        {#if filtered.length === 0}
          <tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">No results found.</td></tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
