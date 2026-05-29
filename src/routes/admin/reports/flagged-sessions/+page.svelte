<!-- src/routes/(admin)/security/flagged/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    EyeOff, Shield, AlertTriangle, UserX, CheckCircle2
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  const { sessions, summary } = data;

  function statusClass(s: string) {
    return (
      {
        force_submitted: 'status-force',
        flagged:         'status-flagged',
        submitted:       'status-submitted',
      }[s] ?? 'status-flagged'
    );
  }

  function flagClass(count: number) {
    if (count > 10) return 'flags-critical';
    if (count > 5)  return 'flags-high';
    return 'flags-medium';
  }

  function fmtStatus(s: string) {
    return s.replace(/_/g, ' ');
  }
</script>

<svelte:head><title>Flagged Sessions — MOUAU eTest</title></svelte:head>

<div class="page">

  <header class="page-header">
    <div>
      <h1>Flagged Sessions</h1>
      <p class="subtitle">Exam sessions with violations requiring review</p>
    </div>
  </header>

  <!-- Summary -->
  <div class="summary-row">
    <div class="stat-card">
      <div class="stat-icon orange"><EyeOff size={17} /></div>
      <div class="stat-body">
        <span class="stat-val">{summary.total}</span>
        <span class="stat-lbl">Flagged total</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red"><UserX size={17} /></div>
      <div class="stat-body">
        <span class="stat-val">{summary.forceSubmitted}</span>
        <span class="stat-lbl">Force submitted</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber"><AlertTriangle size={17} /></div>
      <div class="stat-body">
        <span class="stat-val">{summary.underReview}</span>
        <span class="stat-lbl">Under review</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><CheckCircle2 size={17} /></div>
      <div class="stat-body">
        <span class="stat-val">{summary.cleared}</span>
        <span class="stat-lbl">Cleared</span>
      </div>
    </div>
  </div>

  <!-- Table -->
  <div class="table-card">
    <div class="table-toolbar">
      <h2>
        Session Log
        <span class="count-badge">{sessions.length}</span>
      </h2>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Student</th>
            <th>Exam</th>
            <th>Flags</th>
            <th>Status</th>
            <th>Invigilator</th>
            <th>Duration</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {#if sessions.length === 0}
            <tr>
              <td colspan="8" class="empty-row">No flagged sessions.</td>
            </tr>
          {:else}
            {#each sessions as s}
              <tr>
                <td><code class="sid">{s.id}</code></td>

                <td>
                  <span class="student-name">{s.student}</span>
                  <span class="student-matric">{s.matric}</span>
                </td>

                <td class="exam-cell">{s.exam}</td>

                <td>
                  <span class="flag-chip {flagClass(s.flags)}">
                    <AlertTriangle size={11} />
                    {s.flags}
                  </span>
                </td>

                <td>
                  <span class="badge {statusClass(s.status)}">
                    {fmtStatus(s.status)}
                  </span>
                </td>

                <td class="muted-cell">{s.invigilator}</td>

                <td class="muted-cell">{s.duration}</td>

                <td>
                  {#if s.score !== null}
                    <span class="score" class:fail={s.score < 40}>
                      {s.score.toFixed(1)}%
                    </span>
                  {:else}
                    <span class="muted-cell">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

</div>

<style>
  .page {
    max-width: 1100px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Header ──────────────────────────────────────────── */
  h1 { font-size: 1.4rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--color-text); }
  .subtitle { font-size: 0.82rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  /* ── Summary ─────────────────────────────────────────── */
  .summary-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  @media (max-width: 640px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 0.875rem 1rem;
    display: flex; align-items: center; gap: 0.75rem;
  }

  .stat-icon {
    width: 36px; height: 36px; border-radius: 0.5rem;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-icon.red    { background: rgba(220,38,38,0.1);   color: #dc2626; }
  .stat-icon.orange { background: rgba(249,115,22,0.1);  color: #ea580c; }
  .stat-icon.amber  { background: rgba(245,158,11,0.1);  color: #d97706; }
  .stat-icon.green  { background: rgba(22,163,74,0.1);   color: #16a34a; }

  .stat-body { display: flex; flex-direction: column; gap: 0.1rem; }
  .stat-val  { font-size: 1.3rem; font-weight: 800; color: var(--color-text); font-variant-numeric: tabular-nums; line-height: 1.1; }
  .stat-lbl  { font-size: 0.7rem; color: var(--color-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

  /* ── Table card ──────────────────────────────────────── */
  .table-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
  }

  .table-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  h2 {
    font-size: 0.875rem; font-weight: 700; margin: 0;
    color: var(--color-text);
    display: flex; align-items: center; gap: 0.5rem;
  }

  .count-badge {
    font-size: 0.68rem; font-weight: 700;
    padding: 0.15rem 0.45rem;
    background: rgba(249,115,22,0.1); color: #ea580c;
    border-radius: 999px;
  }

  /* ── Table ───────────────────────────────────────────── */
  .table-scroll { overflow-x: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; white-space: nowrap; }

  thead { background: var(--color-bg); }

  th {
    padding: 0.625rem 1rem; text-align: left;
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--color-bg); }

  /* ── Cell content ────────────────────────────────────── */
  .sid {
    font-family: monospace; font-size: 0.72rem; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.15rem 0.4rem; border-radius: 0.3rem;
  }

  /* Student cell — flex column without a wrapper div */
  td:nth-child(2) {
    display: flex; flex-direction: column; gap: 0.1rem;
  }

  .student-name   { font-weight: 600; font-size: 0.82rem; color: var(--color-text); }
  .student-matric { font-size: 0.7rem; color: var(--color-muted); font-family: monospace; }

  .exam-cell {
    max-width: 200px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--color-muted); font-size: 0.78rem;
  }

  /* Flag chip */
  .flag-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.2rem 0.5rem; border-radius: 0.35rem;
    font-size: 0.72rem; font-weight: 700;
  }
  .flags-medium   { background: rgba(245,158,11,0.1);  color: #d97706; }
  .flags-high     { background: rgba(249,115,22,0.12); color: #ea580c; }
  .flags-critical { background: rgba(220,38,38,0.12);  color: #dc2626; }

  /* Status / generic badge */
  .badge {
    display: inline-flex; padding: 0.2rem 0.6rem;
    border-radius: 999px; font-size: 0.7rem; font-weight: 700;
    text-transform: capitalize; white-space: nowrap;
  }
  .status-force     { background: rgba(220,38,38,0.12);  color: #dc2626; }
  .status-flagged   { background: rgba(249,115,22,0.12); color: #ea580c; }
  .status-submitted { background: rgba(22,163,74,0.1);   color: #16a34a; }

  .muted-cell { color: var(--color-muted); font-size: 0.78rem; }

  .score      { font-weight: 700; font-size: 0.82rem; color: var(--color-text); font-variant-numeric: tabular-nums; }
  .score.fail { color: #dc2626; }

  /* ── Empty ───────────────────────────────────────────── */
  .empty-row {
    text-align: center; padding: 3rem 1rem !important;
    color: var(--color-muted); font-size: 0.875rem;
  }

  /* ── Dark mode ───────────────────────────────────────── */
  :global(.dark) .stat-icon.red    { background: rgba(220,38,38,0.15); }
  :global(.dark) .stat-icon.orange { background: rgba(249,115,22,0.15); }
  :global(.dark) .stat-icon.amber  { background: rgba(245,158,11,0.15); }
  :global(.dark) .stat-icon.green  { background: rgba(22,163,74,0.15); }
</style>