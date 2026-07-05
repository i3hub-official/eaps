<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { ShieldCheck } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let reasonDrafts = $state<Record<string, string>>({});
  let scopeDrafts = $state<Record<string, string>>({});
  let officerDrafts = $state<Record<string, string>>({});

  function scopeLabel(s: string | undefined) {
    return { lecturer: 'Lecturer', department_coordinator: 'Department HOD', college_coordinator: 'College Exam Officer' }[s ?? 'lecturer'] ?? 'Lecturer';
  }
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>Exam Authority</h1>
    <p>Choose who submits questions for each course in your college. Only one option is active at a time.</p>
  </div>
</div>

{#if form?.error}
  <div class="alert-error">{form.error}</div>
{/if}

<div class="table-card">
  {#each data.offerings as o}
    {@const scope = scopeDrafts[o.id] ?? o.authority?.scope ?? 'lecturer'}
    <div class="authority-row">
      <div class="authority-info">
        <span class="code-chip">{o.course.code}</span>
        <strong>{o.course.title}</strong>
        <span class="dept-list">{o.departments.map((d) => d.department.name).join(', ')}</span>
        <span class="current-badge"><ShieldCheck size={12} /> Currently: {scopeLabel(o.authority?.scope)}</span>
      </div>

      <form method="POST" action="?/setAuthority" use:enhance>
        <input type="hidden" name="offeringId" value={o.id} />

        <select name="scope" bind:value={scopeDrafts[o.id]}>
          <option value="lecturer" selected={scope === 'lecturer'}>Each lecturer submits</option>
          <option value="department_coordinator" selected={scope === 'department_coordinator'}>Department HOD submits</option>
          <option value="college_coordinator" selected={scope === 'college_coordinator'}>College exam officer submits</option>
        </select>

        {#if scope === 'college_coordinator'}
          <select name="assignedUserId" bind:value={officerDrafts[o.id]} required>
            <option value="" disabled selected>Select exam officer</option>
            {#each data.examOfficers as officer}
              <option value={officer.id}>{officer.fullName}</option>
            {/each}
          </select>
        {/if}

        <input
          type="text"
          name="reason"
          placeholder="Reason (e.g. agreed at college meeting)"
          bind:value={reasonDrafts[o.id]}
        />

        <button type="submit" class="btn btn-primary">Apply</button>
      </form>
    </div>
  {:else}
    <p class="empty-row">No open course offerings found for your college.</p>
  {/each}
</div>

<style>
  @import '$lib/styles/portals.css';
  .authority-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }
  .authority-row:last-child { border-bottom: none; }
  .authority-info { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
  .dept-list { font-size: 0.75rem; color: var(--color-muted); }
  .current-badge {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.72rem; font-weight: 600; color: var(--p-accent);
    background: var(--p-accent-dim); padding: 0.15rem 0.5rem; border-radius: 1rem;
  }
  form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  select, input[type='text'] {
    padding: 0.4rem 0.6rem; border: 1px solid var(--color-border);
    border-radius: 0.375rem; background: var(--surface-1); color: var(--color-text);
    font-size: 0.8rem; font-family: inherit;
  }
  input[type='text'] { flex: 1; min-width: 200px; }
  .alert-error {
    background: #fee2e2; color: #991b1b; padding: 0.75rem 1rem;
    border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.85rem;
  }
  :global([data-theme='dark']) .alert-error { background: #451a1a; color: #fca5a5; }
</style>