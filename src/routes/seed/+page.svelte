<!-- src/routes/(admin)/seed/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let seeding  = $state(false);
  let resetting = $state(false);
</script>

<svelte:head><title>Database Seed — MOUAU eTest</title></svelte:head>

<div class="page">
  <div class="card">
    <h1>Database Seed</h1>
    <p class="sub">
      {data.isFirstRun
        ? 'No users found — safe to seed.'
        : 'Admin access required to re-seed or reset.'}
    </p>

    <!-- Current counts -->
    <div class="counts">
      {#each Object.entries(data.counts) as [key, val]}
        <div class="count-pill">
          <span class="count-val">{val}</span>
          <span class="count-key">{key}</span>
        </div>
      {/each}
    </div>

    <!-- Result -->
    {#if form?.success && form.results}
      <div class="result success">
        {#each form.results as line}
          <p>{line}</p>
        {/each}
      </div>
    {:else if form?.error}
      <div class="result error">{form.error}</div>
    {/if}

    <!-- Actions -->
    <div class="actions">
      <form method="POST" action="?/seed" use:enhance={() => {
        seeding = true;
        return async ({ update }) => { await update(); seeding = false; };
      }}>
        <button class="btn-primary" disabled={seeding}>
          {seeding ? 'Seeding…' : 'Seed Database'}
        </button>
      </form>

      {#if !data.isFirstRun}
        <form method="POST" action="?/reset" use:enhance={() => {
          if (!confirm('Delete ALL data? This cannot be undone.')) return () => {};
          resetting = true;
          return async ({ update }) => { await update(); resetting = false; };
        }}>
          <button class="btn-danger" disabled={resetting}>
            {resetting ? 'Resetting…' : 'Reset All Data'}
          </button>
        </form>
      {/if}
    </div>

    <p class="warn">⚠️ Remove or protect this route before going to production.</p>
  </div>
</div>

<style>
  .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; background: var(--color-bg); }
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 1.25rem; padding: 2rem; max-width: 480px; width: 100%; display: flex; flex-direction: column; gap: 1.25rem; }
  h1 { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .sub { font-size: 0.875rem; color: var(--color-muted); margin: 0; }
  .counts { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .count-pill { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 0.4rem 0.75rem; display: flex; flex-direction: column; align-items: center; min-width: 72px; }
  .count-val { font-size: 1.25rem; font-weight: 700; }
  .count-key { font-size: 0.7rem; color: var(--color-muted); text-transform: capitalize; }
  .result { padding: 0.875rem 1rem; border-radius: 0.5rem; font-size: 0.85rem; }
  .result p { margin: 0.2rem 0; }
  .result.success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .result.error   { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .btn-primary { padding: 0.7rem 1.5rem; background: var(--color-primary); color: #fff; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-danger  { padding: 0.7rem 1.5rem; background: #dc2626; color: #fff; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
  .btn-danger:disabled  { opacity: 0.6; cursor: not-allowed; }
  .warn { font-size: 0.78rem; color: #d97706; margin: 0; }
</style>