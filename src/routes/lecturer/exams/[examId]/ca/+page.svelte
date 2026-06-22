<!-- src/routes/lecturer/exams/[examId]/ca/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import {
    ArrowLeft, Upload, Trash2, CheckCircle2,
    AlertCircle, Clock, BarChart2, Info,
    Download, RefreshCw
  } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let mounted   = $state(false);
  let loading   = $state(false);
  let showHelp  = $state(false);

  // Local CA score inputs — keyed by studentId
  let caInputs = $state<Record<string, string>>({});

  onMount(() => {
    requestAnimationFrame(() => { mounted = true; });
    // Pre-fill existing CA scores
    for (const row of data.roster ?? []) {
      if (row.caScore != null) caInputs[row.studentId] = String(row.caScore);
    }
  });

  // Stats
  const pctUploaded = $derived(
    data.totalStudents > 0
      ? Math.round((data.caUploaded / data.totalStudents) * 100)
      : 0
  );

  function fmt(d: Date | string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function gradeColor(grade: string | null) {
    if (!grade) return 'var(--color-muted)';
    return { A: '#16a34a', B: '#2563eb', C: '#7c3aed', D: '#d97706', E: '#ea580c', F: '#dc2626' }[grade] ?? 'var(--color-muted)';
  }

  // CSV export of CA results
  function exportCSV() {
    const rows = data.roster.map(r => [
      `"${r.fullName}"`,
      r.matricNumber ?? '',
      r.examScore.toFixed(1),
      r.examPercentage.toFixed(1) + '%',
      r.examGrade ?? '',
      r.caScore ?? '',
      r.caMaxScore ?? data.caWeight,
      r.finalScore?.toFixed(1) ?? 'pending',
      r.finalGrade ?? 'pending',
      r.finalPassed == null ? 'pending' : r.finalPassed ? 'Pass' : 'Fail',
    ].join(','));

    const header = 'Name,Matric,Exam Score,Exam %,Exam Grade,CA Score,CA Max,Final Score,Final Grade,Result';
    const csv    = [header, ...rows].join('\n');
    const blob   = new Blob([csv], { type: 'text/csv' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `${data.exam.course.code}-CA-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Fill all empty inputs with 0
  function fillZeros() {
    for (const row of data.roster) {
      if (!caInputs[row.studentId]) caInputs[row.studentId] = '0';
    }
  }
</script>

<div class="page" class:mounted>

  <!-- Header -->
  <div class="page-head">
    <a href="/lecturer/exams/{data.exam.id}" class="back">
      <ArrowLeft size={14} /> Back to Exam
    </a>
    <div class="title-row">
      <div>
        <h1>CA Upload — {data.exam.course.code}</h1>
        <p>{data.exam.title} · {data.exam.session} · Semester {data.exam.semester}</p>
      </div>
      <div class="head-actions">
        <button class="btn ghost" onclick={exportCSV}><Download size={14} /> Export CSV</button>
        <button class="btn ghost" onclick={() => showHelp = !showHelp}><Info size={14} /> Help</button>
      </div>
    </div>
  </div>

  <!-- Help panel -->
  {#if showHelp}
    <div class="help-panel">
      <h3>How CA upload works</h3>
      <p>
        This exam is worth <strong>{data.examWeight} marks</strong> out of 100.
        CA is worth the remaining <strong>{data.caWeight} marks</strong>.
      </p>
      <p>
        Enter each student's raw CA score (0–{data.caWeight}).
        The system will compute:
      </p>
      <ul>
        <li>Exam contribution = (Exam % / 100) × {data.examWeight}</li>
        <li>CA contribution = CA score (already in points out of {data.caWeight})</li>
        <li>Final score = Exam contribution + CA contribution (out of 100)</li>
      </ul>
      <p>Leave a field blank to skip that student — their existing CA is preserved.</p>
    </div>
  {/if}

  <!-- CA not applicable -->
  {#if data.caNotApplicable}
    <div class="warn-banner">
      <AlertCircle size={16} />
      <div>
        <strong>CA not applicable.</strong>
        This exam has <code>totalMarks = {data.exam.totalMarks}</code> which leaves
        no room for CA (CA weight = 0). To enable CA, set <code>totalMarks</code>
        to less than 100 when creating the exam.
      </div>
    </div>

  {:else}
    <!-- Progress strip -->
    <div class="progress-strip">
      <div class="prog-stat">
        <span class="prog-n">{data.totalStudents}</span>
        <span class="prog-l">Students</span>
      </div>
      <div class="prog-sep"></div>
      <div class="prog-stat">
        <span class="prog-n text-ok">{data.caUploaded}</span>
        <span class="prog-l">CA uploaded</span>
      </div>
      <div class="prog-sep"></div>
      <div class="prog-stat">
        <span class="prog-n text-warn">{data.caPending}</span>
        <span class="prog-l">CA pending</span>
      </div>
      <div class="prog-sep"></div>
      <div class="prog-stat">
        <span class="prog-n">{data.examWeight} / {data.caWeight}</span>
        <span class="prog-l">Exam / CA weight</span>
      </div>
      <div class="prog-bar-wrap">
        <div class="prog-bar">
          <div class="prog-fill" style="width:{pctUploaded}%"></div>
        </div>
        <span class="prog-pct">{pctUploaded}% uploaded</span>
      </div>
    </div>

    <!-- Feedback -->
    {#if form?.success}
      <div class="alert-ok">
        <CheckCircle2 size={14} />
        {form.applied} CA score{form.applied !== 1 ? 's' : ''} applied.
        {#if form.skipped > 0}
          {form.skipped} skipped.
        {/if}
        {#if form.errorCount > 0}
          {form.errorCount} error{form.errorCount !== 1 ? 's' : ''} — check below.
        {/if}
      </div>
    {/if}
    {#if form?.error}
      <div class="alert-err"><AlertCircle size={14} />{form.error}</div>
    {/if}

    <!-- Upload form -->
    <form
      method="POST"
      action="?/uploadCA"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => { loading = false; await update(); };
      }}
    >
      <div class="table-card">
        <div class="table-toolbar">
          <span class="table-title">
            <BarChart2 size={14} /> Result Roster
          </span>
          <div class="toolbar-actions">
            <button type="button" class="btn ghost small" onclick={fillZeros}>Fill missing with 0</button>
            <button
              type="submit"
              class="btn primary small"
              disabled={loading}
            >
              {#if loading}<RefreshCw size={13} class="spin" />{:else}<Upload size={13} />{/if}
              Save CA scores
            </button>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Matric</th>
                <th>Exam ({data.examWeight})</th>
                <th>Exam %</th>
                <th>Exam Grade</th>
                <th>CA Score (/{data.caWeight}) <span class="req">*</span></th>
                <th>Final Score</th>
                <th>Final Grade</th>
                <th>Result</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each data.roster as row, i}
                <tr class:ca-done={!row.caPending} class:ca-pending={row.caPending}>
                  <td class="n-col">{i + 1}</td>
                  <td class="name-col">
                    <span class="fw">{row.fullName}</span>
                    {#if row.caUploadedAt}
                      <span class="uploaded-at">Updated {fmt(row.caUploadedAt)}</span>
                    {/if}
                  </td>
                  <td>{row.matricNumber ?? '—'}</td>
                  <td>{row.examScore.toFixed(1)}</td>
                  <td>{row.examPercentage.toFixed(1)}%</td>
                  <td>
                    <span class="grade-chip" style="color:{gradeColor(row.examGrade)}">
                      {row.examGrade ?? '—'}
                    </span>
                  </td>

                  <!-- CA input -->
                  <td class="ca-input-cell">
                    <div class="ca-input-wrap">
                      <input
                        type="number"
                        name="ca_{row.studentId}"
                        min="0"
                        max={data.caWeight}
                        step="0.5"
                        placeholder="0–{data.caWeight}"
                        class="ca-input"
                        bind:value={caInputs[row.studentId]}
                      />
                      <span class="ca-max">/{data.caWeight}</span>
                    </div>
                  </td>

                  <!-- Final -->
                  <td>
                    {#if row.finalScore != null}
                      <span class="final-score">{row.finalScore.toFixed(1)}</span>
                    {:else}
                      <span class="pending-badge"><Clock size={11} /> Pending</span>
                    {/if}
                  </td>
                  <td>
                    {#if row.finalGrade}
                      <span class="grade-chip fw" style="color:{gradeColor(row.finalGrade)}">
                        {row.finalGrade}
                      </span>
                    {:else}
                      <span class="muted">—</span>
                    {/if}
                  </td>
                  <td>
                    {#if row.finalPassed != null}
                      <span class="result-badge" class:pass={row.finalPassed} class:fail={!row.finalPassed}>
                        {row.finalPassed ? 'Pass' : 'Fail'}
                      </span>
                    {:else}
                      <span class="muted">—</span>
                    {/if}
                  </td>

                  <!-- Remove CA -->
                  <td>
                    {#if !row.caPending}
                      <form method="POST" action="?/removeCA" use:enhance>
                        <input type="hidden" name="sessionId" value={row.sessionId} />
                        <button type="submit" class="rm-btn" title="Remove CA">
                          <Trash2 size={13} />
                        </button>
                      </form>
                    {/if}
                  </td>
                </tr>
              {:else}
                <tr><td colspan="11" class="empty-row">No submitted sessions found.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Footer action -->
        {#if data.roster.length > 0}
          <div class="table-foot">
            <button type="submit" class="btn primary" disabled={loading}>
              {#if loading}<RefreshCw size={13} class="spin" />{:else}<Upload size={13} />{/if}
              Save CA scores
            </button>
          </div>
        {/if}
      </div>
    </form>

    <!-- Upload errors detail -->
    {#if form?.uploadErrors?.length > 0}
      <div class="error-list">
        <h4><AlertCircle size={13} /> Upload errors</h4>
        {#each form.uploadErrors as e}
          <div class="error-row">
            <span class="err-id">{e.studentId}</span>
            <span class="err-msg">{e.error}</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .page { max-width: 1100px; display:flex; flex-direction:column; gap:1.25rem; opacity:0; transform:translateY(10px); transition:opacity .3s ease,transform .3s ease; }
  .page.mounted { opacity:1; transform:none; }

  /* Header */
  .back { display:inline-flex; align-items:center; gap:.3rem; font-size:.78rem; color:var(--color-muted); text-decoration:none; margin-bottom:.4rem; }
  .back:hover { color:var(--lc-600,#4f46e5); }
  .title-row { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  h1 { font-size:1.15rem; font-weight:800; color:var(--color-text); margin:0 0 .2rem; }
  p  { font-size:.8rem; color:var(--color-muted); margin:0; }
  .head-actions { display:flex; gap:.5rem; }

  /* Help */
  .help-panel { background:var(--color-surface); border:1px solid var(--color-border); border-radius:.875rem; padding:1.125rem 1.25rem; font-size:.82rem; color:var(--color-text); line-height:1.65; }
  .help-panel h3 { font-size:.88rem; font-weight:700; margin:0 0 .75rem; }
  .help-panel p  { margin:0 0 .5rem; }
  .help-panel ul { margin:.25rem 0 .5rem 1rem; padding:0; }
  .help-panel li { margin-bottom:.25rem; color:var(--color-muted); }
  .help-panel strong { color:var(--lc-600,#4f46e5); }

  /* Warn banner */
  .warn-banner { display:flex; align-items:flex-start; gap:.75rem; padding:.875rem 1.1rem; background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.3); border-radius:.75rem; font-size:.82rem; color:#92400e; line-height:1.5; }
  .warn-banner code { background:rgba(245,158,11,.15); padding:.1rem .35rem; border-radius:.3rem; font-size:.78rem; }

  /* Progress strip */
  .progress-strip { display:flex; align-items:center; gap:0; background:var(--color-surface); border:1px solid var(--color-border); border-radius:.875rem; padding:0 .5rem; flex-wrap:wrap; }
  .prog-stat { display:flex; flex-direction:column; align-items:center; padding:.875rem 1.25rem; min-width:80px; }
  .prog-n { font-size:1.3rem; font-weight:800; letter-spacing:-.04em; color:var(--color-text); line-height:1; }
  .prog-l { font-size:.62rem; font-weight:600; color:var(--color-muted); text-transform:uppercase; letter-spacing:.05em; margin-top:.2rem; }
  .prog-sep { width:1px; height:28px; background:var(--color-border); flex-shrink:0; }
  .text-ok   { color:#16a34a; }
  .text-warn { color:#d97706; }
  .prog-bar-wrap { display:flex; align-items:center; gap:.75rem; flex:1; padding:.875rem 1.25rem; min-width:200px; }
  .prog-bar  { flex:1; height:6px; background:var(--color-border); border-radius:999px; overflow:hidden; }
  .prog-fill { height:100%; background:linear-gradient(90deg,var(--lc-600,#4f46e5),#8b5cf6); border-radius:999px; transition:width .4s ease; }
  .prog-pct  { font-size:.75rem; font-weight:700; color:var(--color-muted); white-space:nowrap; }

  /* Alerts */
  .alert-ok  { display:flex; align-items:center; gap:.5rem; padding:.7rem 1rem; background:rgba(22,163,74,.07); border:1px solid rgba(22,163,74,.22); border-radius:.625rem; font-size:.82rem; color:#16a34a; font-weight:600; }
  .alert-err { display:flex; align-items:center; gap:.5rem; padding:.7rem 1rem; background:rgba(220,38,38,.07); border:1px solid rgba(220,38,38,.22); border-radius:.625rem; font-size:.82rem; color:#dc2626; }

  /* Table card */
  .table-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:.875rem; overflow:hidden; }
  .table-toolbar { display:flex; align-items:center; justify-content:space-between; padding:.875rem 1.25rem; border-bottom:1px solid var(--color-border); background:var(--color-bg); flex-wrap:wrap; gap:.5rem; }
  .table-title { display:flex; align-items:center; gap:.4rem; font-size:.84rem; font-weight:700; color:var(--color-text); }
  .toolbar-actions { display:flex; gap:.5rem; }
  .table-scroll { overflow-x:auto; }
  .table-foot { display:flex; justify-content:flex-end; padding:.875rem 1.25rem; border-top:1px solid var(--color-border); background:var(--color-bg); }

  /* Table */
  .data-table { width:100%; border-collapse:collapse; font-size:.82rem; }
  .data-table th { padding:.65rem .875rem; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--color-muted); text-align:left; border-bottom:1px solid var(--color-border); background:var(--color-bg); white-space:nowrap; }
  .data-table td { padding:.65rem .875rem; border-bottom:1px solid var(--color-border); vertical-align:middle; color:var(--color-text); }
  .data-table tr:last-child td { border-bottom:none; }
  .data-table tr.ca-done  { background:rgba(22,163,74,.02); }
  .data-table tr.ca-pending td:nth-child(8), .data-table tr.ca-pending td:nth-child(9), .data-table tr.ca-pending td:nth-child(10) { opacity:.4; }

  .n-col    { color:var(--color-muted); font-size:.72rem; width:32px; }
  .name-col { min-width:160px; }
  .fw       { font-weight:600; }
  .muted    { color:var(--color-muted); }
  .uploaded-at { display:block; font-size:.68rem; color:var(--color-muted); margin-top:.1rem; }

  .grade-chip { font-size:.8rem; font-weight:800; }
  .final-score { font-weight:700; color:var(--color-text); }

  .pending-badge { display:inline-flex; align-items:center; gap:.25rem; font-size:.68rem; font-weight:600; color:var(--color-muted); background:var(--color-bg); border:1px solid var(--color-border); padding:.15rem .5rem; border-radius:999px; }

  .result-badge { font-size:.7rem; font-weight:700; padding:.2rem .55rem; border-radius:2rem; }
  .result-badge.pass { background:rgba(22,163,74,.1); color:#16a34a; }
  .result-badge.fail { background:rgba(220,38,38,.08); color:#dc2626; }

  /* CA input */
  .ca-input-cell { min-width:130px; }
  .ca-input-wrap { display:flex; align-items:center; gap:.3rem; }
  .ca-input {
    width:80px; padding:.4rem .6rem;
    border:1.5px solid var(--color-border); border-radius:.5rem;
    background:var(--color-bg); color:var(--color-text);
    font-size:.82rem; font-family:inherit; outline:none;
    transition:border-color .15s,box-shadow .15s;
  }
  .ca-input:focus { border-color:var(--lc-600,#4f46e5); box-shadow:0 0 0 3px rgba(79,70,229,.1); }
  .ca-max { font-size:.72rem; color:var(--color-muted); font-weight:600; }

  .rm-btn { padding:.4rem; border:1px solid var(--color-border); border-radius:.4rem; background:none; color:var(--color-muted); cursor:pointer; transition:all .15s; display:flex; align-items:center; }
  .rm-btn:hover { border-color:rgba(220,38,38,.4); color:#dc2626; background:rgba(220,38,38,.06); }

  .empty-row { text-align:center; color:var(--color-muted); padding:2.5rem !important; }

  /* Buttons */
  .btn { display:inline-flex; align-items:center; gap:.4rem; padding:.55rem 1rem; border-radius:.6rem; font-size:.8rem; font-weight:700; border:1.5px solid var(--color-border); background:var(--color-surface); color:var(--color-text); cursor:pointer; font-family:inherit; transition:all .15s; text-decoration:none; }
  .btn.small { padding:.38rem .75rem; font-size:.76rem; }
  .btn.primary { background:var(--lc-600,#4f46e5); border-color:var(--lc-600,#4f46e5); color:white; }
  .btn.primary:hover:not(:disabled) { background:var(--lc-700,#4338ca); }
  .btn.primary:disabled { opacity:.55; cursor:not-allowed; }
  .btn.ghost { color:var(--color-muted); }
  .btn.ghost:hover { border-color:var(--color-text); color:var(--color-text); }
  .req { color:#dc2626; }

  /* Error list */
  .error-list { background:rgba(220,38,38,.05); border:1px solid rgba(220,38,38,.2); border-radius:.75rem; padding:1rem 1.25rem; }
  .error-list h4 { display:flex; align-items:center; gap:.4rem; font-size:.82rem; font-weight:700; color:#dc2626; margin:0 0 .625rem; }
  .error-row { display:flex; gap:.75rem; padding:.35rem 0; font-size:.78rem; border-bottom:1px solid rgba(220,38,38,.1); }
  .error-row:last-child { border-bottom:none; }
  .err-id  { font-family:monospace; font-size:.72rem; color:var(--color-muted); flex-shrink:0; }
  .err-msg { color:#dc2626; }

  .spin { animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  @media(max-width:768px) {
    .progress-strip { flex-direction:column; align-items:flex-start; }
    .prog-sep { width:100%; height:1px; }
  }
</style>