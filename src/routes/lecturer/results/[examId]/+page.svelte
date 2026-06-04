<!-- src/routes/lecturer/results/[examId]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    BarChart3, Users, CheckCircle, XCircle, TrendingUp,
    TrendingDown, Award, AlertTriangle, ChevronDown,
    ChevronRight, Clock, Shield, BookOpen, Target
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const { exam, results, studentBreakdowns, stats, gradeDist, weakTopics, strongTopics, topicStats } = data;

  let expandedStudent = $state<string | null>(null);
  let sortBy = $state<'percentage'|'name'|'violations'>('percentage');
  let sortDir = $state<'asc'|'desc'>('desc');
  let filterPass = $state<'all'|'passed'|'failed'>('all');

  const GRADE_COLORS: Record<string,string> = {
    'A': '#16a34a', 'B': '#0ea5e9', 'C': '#f59e0b',
    'D': '#f97316', 'E': '#ef4444', 'F': '#dc2626', 'N/A': '#9ca3af',
  };

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function duration(start: Date | string | null, end: Date | string | null) {
    if (!start || !end) return '—';
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${mins}m`;
  }

  const sorted = $derived(() => {
    let rows = [...results].filter(r => {
      if (filterPass === 'passed') return r.passed;
      if (filterPass === 'failed') return !r.passed;
      return true;
    });
    rows.sort((a, b) => {
      let va: any, vb: any;
      if (sortBy === 'percentage') { va = Number(a.percentage ?? 0); vb = Number(b.percentage ?? 0); }
      else if (sortBy === 'name')  { va = a.student.fullName; vb = b.student.fullName; }
      else                         { va = a.violationCount; vb = b.violationCount; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return rows;
  });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortBy = col; sortDir = 'desc'; }
  }

  function breakdown(studentId: string) {
    return studentBreakdowns.find(b => b.studentId === studentId);
  }

  const totalMarks = $derived(exam.questions.reduce((s, q) => s + q.marks, 0));
</script>

<div class="results-page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <div class="breadcrumb"><a href="/lecturer/results">Results</a> / {exam.course.code}</div>
      <h1>{exam.title}</h1>
      <p>{exam.course.code} — {exam.course.title} · {exam.session} · Sem {exam.semester}</p>
    </div>
  </div>

  <!-- Summary stats -->
  <div class="stats-grid">
    {#each [
      { icon: Users,       label: 'Students',   val: stats.totalStudents,                    color: '#6366f1' },
      { icon: CheckCircle, label: 'Passed',      val: stats.passed,                           color: '#16a34a' },
      { icon: XCircle,     label: 'Failed',      val: stats.failed,                           color: '#dc2626' },
      { icon: Target,      label: 'Pass Rate',   val: `${stats.passRate}%`,                   color: '#0ea5e9' },
      { icon: BarChart3,   label: 'Avg Score',   val: `${stats.avgPercentage.toFixed(1)}%`,   color: '#f59e0b' },
      { icon: TrendingUp,  label: 'Highest',     val: `${stats.highestScore.toFixed(1)}%`,    color: '#10b981' },
      { icon: TrendingDown,label: 'Lowest',      val: `${stats.lowestScore.toFixed(1)}%`,     color: '#f97316' },
      { icon: Award,       label: 'Total Marks', val: totalMarks,                             color: '#8b5cf6' },
    ] as s}
      <div class="stat-card">
        <div class="stat-icon" style="background:{s.color}1a;color:{s.color}"><s.icon size={16} /></div>
        <div>
          <div class="stat-val">{s.val}</div>
          <div class="stat-lbl">{s.label}</div>
        </div>
      </div>
    {/each}
  </div>

  <div class="two-col">
    <!-- Grade distribution -->
    <div class="card">
      <div class="card-head"><Award size={14} /> Grade Distribution</div>
      <div class="grade-dist">
        {#each Object.entries(gradeDist).sort() as [grade, count]}
          <div class="grade-row">
            <span class="grade-label" style="color:{GRADE_COLORS[grade] ?? '#9ca3af'}">{grade}</span>
            <div class="grade-bar-wrap">
              <div
                class="grade-bar"
                style="width:{Math.round((count / stats.totalStudents) * 100)}%;background:{GRADE_COLORS[grade] ?? '#9ca3af'}"
              ></div>
            </div>
            <span class="grade-count">{count}</span>
          </div>
        {/each}
        {#if Object.keys(gradeDist).length === 0}
          <p class="empty-text">No graded results yet.</p>
        {/if}
      </div>
    </div>

    <!-- Topic analysis -->
    <div class="card">
      <div class="card-head"><BookOpen size={14} /> Topic Analysis</div>
      <div class="topic-panels">
        <div class="topic-panel topic-weak">
          <div class="tp-head"><TrendingDown size={13} /> Weakest Topics</div>
          {#each weakTopics as t}
            <div class="tp-row">
              <span class="tp-name">{t.topic}</span>
              <div class="tp-bar-wrap">
                <div class="tp-bar tp-bar-weak" style="width:{t.correctRate}%"></div>
              </div>
              <span class="tp-pct">{t.correctRate}%</span>
            </div>
          {/each}
          {#if weakTopics.length === 0}<p class="empty-text">No topic data — add topics to questions.</p>{/if}
        </div>
        <div class="topic-panel topic-strong">
          <div class="tp-head"><TrendingUp size={13} /> Strongest Topics</div>
          {#each strongTopics as t}
            <div class="tp-row">
              <span class="tp-name">{t.topic}</span>
              <div class="tp-bar-wrap">
                <div class="tp-bar tp-bar-strong" style="width:{t.correctRate}%"></div>
              </div>
              <span class="tp-pct">{t.correctRate}%</span>
            </div>
          {/each}
          {#if strongTopics.length === 0}<p class="empty-text">No topic data yet.</p>{/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Student results table -->
  <div class="table-card">
    <div class="table-toolbar">
      <h3 class="toolbar-title"><Users size={15} /> Student Results</h3>
      <div class="toolbar-right">
        <div class="filter-tabs">
          {#each [
            { k:'all',    l:`All (${results.length})` },
            { k:'passed', l:`Passed (${stats.passed})` },
            { k:'failed', l:`Failed (${stats.failed})` },
          ] as tab}
            <button
              class="filter-tab"
              class:active={filterPass === tab.k}
              onclick={() => filterPass = tab.k as typeof filterPass}
            >{tab.l}</button>
          {/each}
        </div>
      </div>
    </div>

    <table class="results-table">
      <thead>
        <tr>
          <th></th>
          <th>
            <button class="sort-btn" onclick={() => toggleSort('name')}>
              Student {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
          </th>
          <th>Matric</th>
          <th>
            <button class="sort-btn" onclick={() => toggleSort('percentage')}>
              Score {sortBy === 'percentage' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
          </th>
          <th>Grade</th>
          <th>Status</th>
          <th>
            <button class="sort-btn" onclick={() => toggleSort('violations')}>
              Violations {sortBy === 'violations' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
          </th>
          <th>Duration</th>
          <th>Weakness</th>
          <th>Strength</th>
        </tr>
      </thead>
      <tbody>
        {#each sorted() as r (r.id)}
          {@const bd = breakdown(r.studentId)}
          <tr
            class="result-row"
            class:row-pass={r.passed}
            class:row-fail={!r.passed}
            onclick={() => expandedStudent = expandedStudent === r.studentId ? null : r.studentId}
          >
            <td class="td-expand">
              <ChevronDown
                size={13}
                style="transform:rotate({expandedStudent === r.studentId ? '180deg':'0deg'});transition:transform .2s;color:var(--color-muted)"
              />
            </td>
            <td>
              <div class="student-name">
                {[r.student.title, r.student.fullName].filter(Boolean).join(' ')}
              </div>
              <div class="student-dept">{r.student.department?.name ?? '—'}</div>
            </td>
            <td class="td-muted">{r.student.matricNumber ?? '—'}</td>
            <td>
              <div class="score-wrap">
                <span class="score-val">{Number(r.percentage ?? 0).toFixed(1)}%</span>
                <div class="score-bar-bg">
                  <div
                    class="score-bar-fill"
                    style="width:{Number(r.percentage ?? 0)}%;background:{r.passed ? '#16a34a' : '#dc2626'}"
                  ></div>
                </div>
              </div>
            </td>
            <td>
              <span class="grade-chip" style="color:{GRADE_COLORS[r.grade ?? 'N/A']};background:{GRADE_COLORS[r.grade ?? 'N/A']}1a">
                {r.grade ?? '—'}
              </span>
            </td>
            <td>
              {#if r.session.status === 'force_submitted'}
                <span class="status-chip status-force">Force submitted</span>
              {:else if r.passed}
                <span class="status-chip status-pass">Passed</span>
              {:else}
                <span class="status-chip status-fail">Failed</span>
              {/if}
            </td>
            <td class="td-muted" class:td-warn={r.violationCount > 0}>{r.violationCount}</td>
            <td class="td-muted">{duration(r.session.startedAt, r.session.submittedAt)}</td>
            <td class="td-topic td-weak">{bd?.weakestTopic ?? '—'}</td>
            <td class="td-topic td-strong">{bd?.strongestTopic ?? '—'}</td>
          </tr>

          <!-- Expanded topic detail -->
          {#if expandedStudent === r.studentId && bd}
            <tr class="expanded-row">
              <td colspan="10">
                <div class="expanded-content">
                  <div class="exp-title">Topic breakdown for {r.student.fullName}</div>
                  <div class="exp-topics">
                    {#each Object.entries(bd.byTopic) as [topic, counts]}
                      {@const pct = Math.round((counts.correct / counts.total) * 100)}
                      <div class="exp-topic-row">
                        <span class="exp-topic-name">{topic}</span>
                        <div class="exp-bar-bg">
                          <div
                            class="exp-bar-fill"
                            style="width:{pct}%;background:{pct >= 60 ? '#16a34a' : pct >= 40 ? '#f59e0b' : '#dc2626'}"
                          ></div>
                        </div>
                        <span class="exp-pct">{counts.correct}/{counts.total} · {pct}%</span>
                      </div>
                    {/each}
                  </div>
                </div>
              </td>
            </tr>
          {/if}
        {/each}

        {#if sorted().length === 0}
          <tr><td colspan="10" class="empty-row">No results match the current filter.</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

</div>

<style>
  .results-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .breadcrumb { font-size: .72rem; color: var(--color-muted); margin-bottom: .25rem; }
  .breadcrumb a { color: var(--indigo-600); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); }
  p  { font-size: .8rem; color: var(--color-muted); margin-top: .2rem; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: .75rem; }
  .stat-card { display: flex; align-items: center; gap: .75rem; padding: .875rem 1rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .75rem; }
  .stat-icon { width: 34px; height: 34px; border-radius: .5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .stat-val { font-size: 1.15rem; font-weight: 800; color: var(--color-text); }
  .stat-lbl { font-size: .68rem; color: var(--color-muted); }

  /* Two col */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

  /* Card */
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .card-head { display: flex; align-items: center; gap: .5rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); font-size: .85rem; font-weight: 700; color: var(--color-text); background: var(--color-bg); }

  /* Grade dist */
  .grade-dist { display: flex; flex-direction: column; gap: .625rem; padding: 1rem 1.25rem; }
  .grade-row { display: flex; align-items: center; gap: .75rem; }
  .grade-label { font-weight: 800; font-size: .85rem; min-width: 28px; }
  .grade-bar-wrap { flex: 1; height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden; }
  .grade-bar { height: 100%; border-radius: 4px; transition: width .3s; }
  .grade-count { font-size: .78rem; color: var(--color-muted); min-width: 24px; text-align: right; }

  /* Topic panels */
  .topic-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .topic-panel { padding: 1rem 1.25rem; }
  .topic-weak { border-right: 1px solid var(--color-border); }
  .tp-head { display: flex; align-items: center; gap: .375rem; font-size: .75rem; font-weight: 700; color: var(--color-muted); margin-bottom: .75rem; text-transform: uppercase; letter-spacing: .04em; }
  .tp-row { display: flex; align-items: center; gap: .625rem; margin-bottom: .5rem; }
  .tp-name { font-size: .75rem; color: var(--color-text); min-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
  .tp-bar-wrap { flex: 1; height: 6px; background: var(--color-bg); border-radius: 3px; overflow: hidden; }
  .tp-bar { height: 100%; border-radius: 3px; }
  .tp-bar-weak   { background: #dc2626; }
  .tp-bar-strong { background: #16a34a; }
  .tp-pct { font-size: .72rem; color: var(--color-muted); min-width: 32px; text-align: right; }

  /* Table */
  .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .875rem; overflow: hidden; }
  .table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .875rem 1.25rem; border-bottom: 1px solid var(--color-border); background: var(--color-bg); flex-wrap: wrap; }
  .toolbar-title { display: flex; align-items: center; gap: .5rem; font-size: .85rem; font-weight: 700; color: var(--color-text); }
  .filter-tabs { display: flex; gap: .25rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: .375rem; padding: .2rem; }
  .filter-tab { padding: .3rem .75rem; border-radius: .25rem; border: none; background: none; font-size: .73rem; font-weight: 500; color: var(--color-muted); cursor: pointer; font-family: inherit; }
  .filter-tab.active { background: var(--color-bg); color: var(--color-text); font-weight: 700; }
  .results-table { width: 100%; border-collapse: collapse; }
  .results-table th { padding: .625rem .875rem; background: var(--color-bg); font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); text-align: left; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
  .results-table td { padding: .75rem .875rem; border-bottom: 1px solid var(--color-border); font-size: .82rem; vertical-align: middle; }
  .result-row { cursor: pointer; transition: background .1s; }
  .result-row:hover { background: var(--color-surface-hover); }
  .result-row:last-child td { border-bottom: none; }
  .sort-btn { background: none; border: none; cursor: pointer; font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); font-family: inherit; padding: 0; }
  .sort-btn:hover { color: var(--color-text); }

  .student-name { font-weight: 600; color: var(--color-text); }
  .student-dept { font-size: .7rem; color: var(--color-muted); }
  .td-muted { color: var(--color-muted); white-space: nowrap; }
  .td-warn  { color: #dc2626 !important; font-weight: 600; }
  .td-expand { width: 28px; }

  .score-wrap { display: flex; flex-direction: column; gap: .25rem; min-width: 80px; }
  .score-val  { font-weight: 700; font-size: .82rem; color: var(--color-text); }
  .score-bar-bg { height: 4px; background: var(--color-bg); border-radius: 2px; overflow: hidden; }
  .score-bar-fill { height: 100%; border-radius: 2px; transition: width .3s; }

  .grade-chip { font-size: .75rem; font-weight: 800; padding: .2rem .5rem; border-radius: .375rem; }
  .status-chip { font-size: .68rem; font-weight: 700; padding: .2rem .5rem; border-radius: 2rem; white-space: nowrap; }
  .status-pass  { background: rgba(22,163,74,.1);  color: #16a34a; }
  .status-fail  { background: rgba(220,38,38,.1);  color: #dc2626; }
  .status-force { background: var(--indigo-soft); color: var(--indigo-600); }

  .td-topic { font-size: .75rem; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .td-weak   { color: #dc2626; }
  .td-strong { color: #16a34a; }

  /* Expanded row */
  .expanded-row td { background: var(--color-bg); padding: 0; border-bottom: 1px solid var(--color-border); }
  .expanded-content { padding: 1rem 1.5rem; }
  .exp-title { font-size: .78rem; font-weight: 700; color: var(--color-muted); margin-bottom: .75rem; text-transform: uppercase; letter-spacing: .04em; }
  .exp-topics { display: flex; flex-direction: column; gap: .5rem; }
  .exp-topic-row { display: flex; align-items: center; gap: .75rem; }
  .exp-topic-name { font-size: .8rem; color: var(--color-text); min-width: 120px; }
  .exp-bar-bg { flex: 1; height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden; }
  .exp-bar-fill { height: 100%; border-radius: 3px; transition: width .3s; }
  .exp-pct { font-size: .72rem; color: var(--color-muted); min-width: 80px; text-align: right; }

  .empty-row, .empty-text { text-align: center; color: var(--color-muted); padding: 2rem; font-size: .82rem; }

  @media (max-width: 900px) {
    .two-col { grid-template-columns: 1fr; }
    .results-table th:nth-child(n+9), .results-table td:nth-child(n+9) { display: none; }
  }
</style>
