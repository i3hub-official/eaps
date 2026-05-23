<!-- src/lib/components/dashboard/LiveStudentCard.svelte -->
<script lang="ts">
  import type { SessionStatus } from '@prisma/client';

  interface Props {
    sessionId: string;
    studentName: string;
    matricNumber: string | null;
    department: string;
    status: SessionStatus;
    violationCount: number;
    totalFlags: number;
    maxViolations: number;
    timeRemainingSecs: number | null;
    onPause: (sessionId: string) => void;
    onResume: (sessionId: string) => void;
    onForceSubmit: (sessionId: string) => void;
    onClick: (sessionId: string) => void;
  }

  let {
    sessionId, studentName, matricNumber, department,
    status, violationCount, totalFlags, maxViolations,
    timeRemainingSecs, onPause, onResume, onForceSubmit, onClick,
  }: Props = $props();

  const STATUS_LABEL: Record<string, string> = {
    not_started:     'Not Started',
    in_progress:     'In Progress',
    submitted:       'Submitted',
    flagged:         'Paused',
    force_submitted: 'Force Submitted',
  };

  const STATUS_COLOR: Record<string, string> = {
    not_started:     'gray',
    in_progress:     'green',
    submitted:       'blue',
    flagged:         'orange',
    force_submitted: 'red',
  };

  const fmt = (n: number) => {
    const m = Math.floor(n / 60);
    const s = n % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const riskLevel = $derived(
    violationCount === 0 ? 'none' :
    violationCount >= maxViolations * 0.6 ? 'high' :
    violationCount >= maxViolations * 0.3 ? 'medium' : 'low'
  );

  const done = $derived(status === 'submitted' || status === 'force_submitted');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="card risk-{riskLevel}"
  class:done
  onclick={() => onClick(sessionId)}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && onClick(sessionId)}
>
  <div class="card-header">
    <div class="student-info">
      <span class="name">{studentName}</span>
      <span class="meta">{matricNumber ?? '—'} · {department}</span>
    </div>
    <span class="status-badge {STATUS_COLOR[status]}">
      {STATUS_LABEL[status] ?? status}
    </span>
  </div>

  <div class="card-body">
    <div class="stat">
      <span class="stat-val" class:danger={violationCount >= maxViolations * 0.6}>
        {violationCount}/{maxViolations}
      </span>
      <span class="stat-lbl">Violations</span>
    </div>
    <div class="stat">
      <span class="stat-val">{totalFlags}</span>
      <span class="stat-lbl">Flags</span>
    </div>
    <div class="stat">
      <span class="stat-val">
        {timeRemainingSecs != null ? fmt(timeRemainingSecs) : '—'}
      </span>
      <span class="stat-lbl">Remaining</span>
    </div>
  </div>

  {#if !done}
    <div class="card-actions" role="group" aria-label="Session actions">
      {#if status === 'in_progress'}
        <button
          class="action-btn pause"
          onclick={(e) => { e.stopPropagation(); onPause(sessionId); }}
          type="button"
        >⏸ Pause</button>
      {/if}
      {#if status === 'flagged'}
        <button
          class="action-btn resume"
          onclick={(e) => { e.stopPropagation(); onResume(sessionId); }}
          type="button"
        >▶ Resume</button>
      {/if}
      <button
        class="action-btn force"
        onclick={(e) => { e.stopPropagation(); onForceSubmit(sessionId); }}
        type="button"
      >⏹ Force Submit</button>
    </div>
  {/if}
</div>

<style>
  .card {
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .card.done  { opacity: 0.6; }

  .card.risk-low    { border-color: #f59e0b; }
  .card.risk-medium { border-color: #f97316; }
  .card.risk-high   { border-color: #ef4444; animation: risk-pulse 2s infinite; }

  @keyframes risk-pulse {
    0%, 100% { border-color: #ef4444; }
    50%       { border-color: #fca5a5; }
  }

  .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
  .student-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .name  { font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta  { font-size: 0.75rem; color: var(--color-muted); }

  .status-badge {
    font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
    border-radius: 999px; white-space: nowrap; flex-shrink: 0;
  }
  .status-badge.green  { background: #dcfce7; color: #16a34a; }
  .status-badge.blue   { background: #dbeafe; color: #1d4ed8; }
  .status-badge.orange { background: #ffedd5; color: #c2410c; }
  .status-badge.red    { background: #fee2e2; color: #dc2626; }
  .status-badge.gray   { background: var(--color-border); color: var(--color-muted); }

  .card-body { display: flex; gap: 1rem; }
  .stat      { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; flex: 1; }
  .stat-val  { font-size: 1.1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .stat-val.danger { color: #ef4444; }
  .stat-lbl  { font-size: 0.7rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }

  .card-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .action-btn {
    padding: 0.35rem 0.75rem; border: none; border-radius: 0.4rem;
    font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
  }
  .action-btn:hover { opacity: 0.85; }
  .action-btn.pause  { background: #fef3c7; color: #92400e; }
  .action-btn.resume { background: #dcfce7; color: #166534; }
  .action-btn.force  { background: #fee2e2; color: #991b1b; }
</style>