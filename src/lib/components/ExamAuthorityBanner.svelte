<!-- src/lib/components/ExamAuthorityBanner.svelte -->
<script lang="ts">
  import { ShieldAlert, ShieldCheck } from '@lucide/svelte';

  let { gate }: { gate: { allowed: boolean; scope: string; activeHolderName: string | null } } = $props();

  const scopeLabel = { lecturer: 'lecturers', department_coordinator: 'the department HOD', college_coordinator: 'the college exam officer' }[gate.scope] ?? 'lecturers';
</script>

{#if !gate.allowed}
  <div class="gate-banner gate-blocked">
    <ShieldAlert size={16} />
    <span>
      Question submission for this course is currently assigned to <strong>{gate.activeHolderName ?? scopeLabel}</strong>, set by the Dean.
      You cannot submit questions for this offering right now.
    </span>
  </div>
{:else}
  <div class="gate-banner gate-active">
    <ShieldCheck size={16} />
    <span>You are the active question submitter for this course.</span>
  </div>
{/if}

<style>
  .gate-banner {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.75rem 1rem; border-radius: 0.5rem;
    font-size: 0.85rem; margin-bottom: 1rem;
  }
  .gate-blocked { background: #fee2e2; color: #991b1b; }
  .gate-active { background: #dcfce7; color: #166534; }
  :global([data-theme='dark']) .gate-blocked { background: #451a1a; color: #fca5a5; }
  :global([data-theme='dark']) .gate-active { background: #14432a; color: #86efac; }
</style>