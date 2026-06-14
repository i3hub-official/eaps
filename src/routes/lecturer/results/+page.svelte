<!-- src/routes/lecturer/results/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    BarChart2, TrendingUp, CheckCircle2, XCircle,
    Clock, Calendar, Users, AlertTriangle, Target,
    ChevronUp, ChevronDown, Search, Download
  } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  const results  = $derived(data.results  ?? []);
  const myExams  = $derived(data.myExams  ?? []);
  const summary  = $derived(data.summary  ?? {});
  const selExam  = $derived(data.selectedExamId ?? 'all');

  let search  = $state('');
  let sortKey = $state<'name' | 'score' | 'submitted'>('score');
  let sortAsc = $state(false);

  const filtered = $derived((() => {
    let r = results.filter(res => {
      if (!search) return true;
      const s = search.toLowerCase();
      return res.student?.fullName?.toLowerCase().includes(s)
          || res.student?.matricNumber?.toLowerCase().includes(s)
          || res.exam?.title?.toLowerCase().includes(s);
    });
    r = [...r].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'name')      { av = a.student?.fullName ?? ''; bv = b.student?.fullName ?? ''; }
      else if (sortKey === 'score'){ av = Number(a.percentage ?? 0); bv = Number(b.percentage ?? 0); }
      else                         { av = a.submittedAt ?? ''; bv = b.submittedAt ?? ''; }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return r;
  })());

  function setSort(key: typeof sortKey) {
    if (sortKey === key) sortAsc = !sortAsc;
    else { sortKey = key; sortAsc = false; }
  }

  function setExam(id: string) {
    const p = new URLSearchParams($page.url.searchParams);
    if (id === 'all') p.delete('examId'); else p.set('examId', id);
    goto(`?${p}`, { replaceState: true });
  }

  function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  }
  function formatTime(s: number | null | undefined) {
    if (!s) return '—';
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }
  function gradeColor(pct: number) {
    if (pct >= 70) return 'grade-a'; if (pct >= 60) return 'grade-b';
    if (pct >= 50) return 'grade-c'; if (pct >= 45) return 'grade-d';
    return 'grade-f';
  }

  function SortIcon(key: string) {
    if (sortKey !== key) return null;
    return sortAsc ? ChevronUp : ChevronDown;
  }
</script>

<div class="page">

  <div class="page-header">
    <div>
      <h1 class="page-title">Results</h1>
      <p class="page-sub">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  </div>

  <!-- Summary row -->
  {#if summary.total > 0}
    <div class="summary-row">
      <div class="sum-card"><div class="si avg"><BarChart2 size={15} /></div><div><span class="sv">{summary.avgPct}%</span><span class="sl">Average</span></div></div>
      <div class="sum-card"><div class="si best"><TrendingUp size={15} /></div><div><span class="sv good">{summary.bestPct}%</span><span class="sl">Best</span></div></div>
      <div class="sum-card"><div class="si pass"><CheckCircle2 size={15} /></div><div><span class="sv good">{summary.passed}</span><span class="sl">Passed</span></div></div>
      <div class="sum-card"><div class="si fail"><XCircle size={15} /></div><div><span class="sv" class:bad={summary.failed > 0}>{summary.failed}</span><span class="sl">Failed</span></div></div>
      <div class="sum-card"><div class="si rate"><Target size={15} /></div><div><span class="sv">{summary.passRate}%</span><span class="sl">Pass rate</span></div></div>
    </div>
  {/if}

  <!-- Filters -->
  <div class="controls">
    <select class="exam-select" onchange={e => setExam(e.currentTarget.value)} value={selExam}>
      <option value="all">All exams</option>
      {#each myExams as ex}
        <option value={ex.id}>{ex.course?.code} — {ex.title}</option>
      {/each}
    </select>
    <div class="search-wrap">
      <Search size={13} class="search-ico" />
      <input class="search-input" type="text" placeholder="Search student or exam…" bind:value={search} />
    </div>
  </div>

  <!-- Table -->
  {#if filtered.length === 0}
    <div class="empty">
      <BarChart2 size={36} strokeWidth={1.2} />
      <h3>No results yet</h3>
      <p>Results will appear here after students complete exams.</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="results-table">
        <thead>
          <tr>
            <th><button class="sort-btn" onclick={() => setSort('name')} type="button">Student {#if sortKey==='name'}{#if sortAsc}<ChevronUp size={11} />{:else}<ChevronDown size={11} />{/if}{/if}</button></th>
            <th>Exam</th>
            <th><button class="sort-btn" onclick={() => setSort('score')} type="button">Score {#if sortKey==='score'}{#if sortAsc}<ChevronUp size={11} />{:else}<ChevronDown size={11} />{/if}{/if}</button></th>
            <th>Grade</th>
            <th>Time</th>
            <th>Violations</th>
            <th><button class="sort-btn" onclick={() => setSort('submitted')} type="button">Submitted {#if sortKey==='submitted'}{#if sortAsc}<ChevronUp size={11} />{:else}<ChevronDown size={11} />{/if}{/if}</button></th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as r}
            {@const pct = Math.round(Number(r.percentage ?? 0))}
            <tr class:row-fail={!r.passed}>
              <td>
                <div class="student-cell">
                  <div class="student-avatar">{(r.student?.fullName?.[0] ?? '?').toUpperCase()}</div>
                  <div>
                    <div class="student-name">{r.student?.fullName}</div>
                    <div class="student-matric">{r.student?.matricNumber ?? '—'}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="exam-cell">
                  <span class="ec-code">{r.exam?.course?.code}</span>
                  <span class="ec-title">{r.exam?.title}</span>
                </div>
              </td>
              <td>
                <div class="score-cell">
                  <span class="score-num {gradeColor(pct)}">{pct}%</span>
                  <div class="score-bar"><div class="score-fill {gradeColor(pct)}-fill" style="width:{pct}%"></div></div>
                </div>
              </td>
              <td>
                <span class="grade-badge {gradeColor(pct)}">{r.grade ?? '?'}</span>
              </td>
              <td><span class="td-muted">{formatTime(r.timeTakenSecs)}</span></td>
              <td>
                {#if r.violationCount > 0}
                  <span class="violation-chip"><AlertTriangle size={10} />{r.violationCount}</span>
                {:else}
                  <span class="td-muted">—</span>
                {/if}
              </td>
              <td><span class="td-muted">{formatDate(r.submittedAt)}</span></td>
              <td>
                <span class="status-chip" class:chip-pass={r.passed} class:chip-fail={!r.passed}>
                  {r.passed ? 'Passed' : 'Failed'}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: flex-end; justify-content: space-between; }
  .page-title { font-size: 1.5rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.03em; margin: 0 0 0.2rem; }
  .page-sub   { font-size: 0.8rem; color: var(--color-muted); margin: 0; }

  .summary-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.625rem; }
  @media (max-width: 700px) { .summary-row { grid-template-columns: repeat(3, 1fr); } }
  .sum-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 12px; padding: 0.75rem; display: flex; align-items: center; gap: 0.625rem;
  }
  .si {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .avg  { background: rgba(99,102,241,0.1);  color: #6366f1; }
  .best { background: rgba(16,185,129,0.1);  color: #10b981; }
  .pass { background: rgba(22,163,74,0.1);   color: var(--lc600); }
  .fail { background: rgba(220,38,38,0.06);  color: #dc2626; }
  .rate { background: rgba(168,85,247,0.1);  color: #a855f7; }
  .sv { display: block; font-size: 1.25rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.04em; line-height: 1; }
  .sv.good { color: var(--lc600); }
  .sv.bad  { color: #dc2626; }
  .sl { display: block; font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin-top: 0.1rem; }

  .controls { display: flex; gap: 0.625rem; align-items: center; flex-wrap: wrap; }
  .exam-select {
    padding: 0.45rem 0.75rem; border: 1px solid var(--color-border); border-radius: 8px;
    background: var(--color-surface); color: var(--color-text); font-size: 0.8rem;
    font-family: inherit; cursor: pointer; min-width: 200px;
  }
  .exam-select:focus { outline: none; border-color: var(--lc600); }
  .search-wrap { position: relative; display: flex; align-items: center; }
  :global(.search-ico) { position: absolute; left: 0.6rem; color: var(--color-muted); pointer-events: none; }
  .search-input {
    padding: 0.45rem 0.75rem 0.45rem 2rem; width: 220px;
    border: 1px solid var(--color-border); border-radius: 8px;
    background: var(--color-surface); color: var(--color-text); font-size: 0.8rem; font-family: inherit;
  }
  .search-input:focus { outline: none; border-color: var(--lc600); }

  .table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid var(--color-border); }
  .results-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  .results-table thead tr { background: var(--color-bg); }
  .results-table th {
    padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted);
    border-bottom: 1px solid var(--color-border); white-space: nowrap;
  }
  .results-table td {
    padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .results-table tr:last-child td { border-bottom: none; }
  .results-table tr.row-fail td { background: rgba(220,38,38,0.015); }
  .results-table tbody tr:hover td { background: var(--color-bg); }

  .sort-btn {
    display: inline-flex; align-items: center; gap: 0.25rem;
    background: none; border: none; cursor: pointer; color: inherit;
    font: inherit; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0;
  }

  .student-cell { display: flex; align-items: center; gap: 0.625rem; }
  .student-avatar {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc700), var(--lc500));
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 800;
  }
  .student-name   { font-size: 0.8rem; font-weight: 600; color: var(--color-text); white-space: nowrap; }
  .student-matric { font-size: 0.65rem; color: var(--color-muted); }

  .exam-cell { display: flex; flex-direction: column; gap: 0.15rem; }
  .ec-code  { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; color: var(--lc700); }
  :global(.dark) .ec-code { color: var(--lc400); }
  .ec-title { font-size: 0.78rem; font-weight: 600; color: var(--color-text); white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }

  .score-cell { display: flex; flex-direction: column; gap: 0.25rem; min-width: 80px; }
  .score-num { font-size: 0.85rem; font-weight: 800; }
  .score-bar { height: 4px; background: var(--color-bg); border-radius: 2px; overflow: hidden; }
  .score-fill { height: 100%; border-radius: 2px; }
  .grade-a { color: #065f46; } .grade-a-fill { background: #22c55e; }
  .grade-b { color: #0369a1; } .grade-b-fill { background: #38bdf8; }
  .grade-c { color: #92400e; } .grade-c-fill { background: #f59e0b; }
  .grade-d { color: #9a3412; } .grade-d-fill { background: #f97316; }
  .grade-f { color: #991b1b; } .grade-f-fill { background: #ef4444; }
  :global(.dark) .grade-a { color: #4ade80; }
  :global(.dark) .grade-b { color: #38bdf8; }
  :global(.dark) .grade-f { color: #f87171; }

  .grade-badge {
    width: 28px; height: 28px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 900;
  }
  .grade-a { background: rgba(22,163,74,0.12); }
  .grade-b { background: rgba(14,165,233,0.12); }
  .grade-c { background: rgba(245,158,11,0.12); }
  .grade-d { background: rgba(249,115,22,0.12); }
  .grade-f { background: rgba(220,38,38,0.12); }

  .violation-chip {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.65rem; font-weight: 700; color: #f59e0b;
    background: rgba(245,158,11,0.1); padding: 0.15rem 0.45rem; border-radius: 6px;
  }
  .td-muted { font-size: 0.75rem; color: var(--color-muted); }

  .status-chip {
    font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0.2rem 0.55rem; border-radius: 20px;
    white-space: nowrap;
  }
  .chip-pass { background: rgba(22,163,74,0.12);  color: #065f46; }
  .chip-fail { background: rgba(220,38,38,0.1);   color: #991b1b; }
  :global(.dark) .chip-pass { color: #4ade80; }
  :global(.dark) .chip-fail { color: #f87171; }

  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 4rem 1rem; color: var(--color-muted); text-align: center;
  }
  .empty h3 { font-size: 1.05rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .empty p  { font-size: 0.8rem; margin: 0; }
</style>