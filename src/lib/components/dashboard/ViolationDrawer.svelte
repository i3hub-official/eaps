<!-- src/lib/components/dashboard/ViolationDrawer.svelte -->
<script lang="ts">
  import FlagBadge from './FlagBadge.svelte';

  interface Violation {
    id: string;
    flagType: string;
    actionTaken: string | null;
    note: string | null;
    flaggedAt: string;
  }

  interface Props {
    studentName: string;
    matricNumber: string | null;
    violations: Violation[];
    onClose: () => void;
    onPause: () => void;
    onResume: () => void;
    onForceSubmit: () => void;
    status: string;
  }

  let { studentName, matricNumber, violations, onClose, onPause, onResume, onForceSubmit, status }: Props = $props();

  const done = $derived(status === 'submitted' || status === 'force_submitted');

  function fmtTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="overlay" role="dialog" aria-modal="true" aria-label="Violation log">
  <div class="drawer">
    <div class="drawer-header">
      <div>
        <h2>{studentName}</h2>
        <p class="meta">{matricNumber ?? '—'} · {violations.length} violation{violations.length !== 1 ? 's' : ''}</p>
      </div>
      <button class="close-btn" onclick={onClose} type="button" aria-label="Close">✕</button>
    </div>

    {#if !done}
      <div class="actions">
        {#if status === 'in_progress'}
          <button class="action-btn pause" onclick={onPause} type="button">⏸ Pause Exam</button>
        {/if}
        {#if status === 'flagged'}
          <button class="action-btn resume" onclick={onResume} type="button">▶ Resume Exam</button>
        {/if}
        <button class="action-btn force" onclick={onForceSubmit} type="button">⏹ Force Submit</button>
      </div>
    {/if}

    <div class="violation-list">
      {#if violations.length === 0}
        <p class="empty">No violations recorded.</p>
      {:else}
        {#each violations as v}
          <div class="violation-item">
            <div class="vrow">
              <FlagBadge flagType={v.flagType} />
              <span class="time">{fmtTime(v.flaggedAt)}</span>
            </div>
            {#if v.actionTaken}
              <span class="action-taken">Action: {v.actionTaken.replace('_', ' ')}</span>
            {/if}
            {#if v.note}
              <span class="note">"{v.note}"</span>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.4);
    display: flex; justify-content: flex-end;
  }

  .drawer {
    width: 360px; max-width: 100%;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    height: 100%; overflow-y: auto;
    display: flex; flex-direction: column;
    animation: slide-in 0.2s ease;
  }

  @keyframes slide-in {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }

  .drawer-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 1.25rem 1.25rem 1rem;
    border-bottom: 1px solid var(--color-border);
    position: sticky; top: 0;
    background: var(--color-surface);
  }
  h2   { font-size: 1rem; font-weight: 700; margin: 0; }
  .meta { font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0; }

  .close-btn {
    background: none; border: none; font-size: 1.1rem;
    cursor: pointer; color: var(--color-muted); padding: 0.25rem;
    line-height: 1;
  }

  .actions {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .action-btn {
    padding: 0.4rem 0.9rem; border: none; border-radius: 0.4rem;
    font-size: 0.8rem; font-weight: 600; cursor: pointer;
  }
  .action-btn.pause  { background: #fef3c7; color: #92400e; }
  .action-btn.resume { background: #dcfce7; color: #166534; }
  .action-btn.force  { background: #fee2e2; color: #991b1b; }

  .violation-list { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }

  .violation-item {
    padding: 0.75rem; border: 1px solid var(--color-border);
    border-radius: 0.5rem; display: flex; flex-direction: column; gap: 0.3rem;
  }
  .vrow { display: flex; justify-content: space-between; align-items: center; }
  .time { font-size: 0.75rem; color: var(--color-muted); font-variant-numeric: tabular-nums; }
  .action-taken { font-size: 0.75rem; color: #f59e0b; font-weight: 500; }
  .note  { font-size: 0.75rem; color: var(--color-muted); font-style: italic; }
  .empty { color: var(--color-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0; }
</style>