<!-- src/routes/vc-dvc/reports/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { BarChart2, ArrowRight } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
</script>

<div class="page-header">
  <div class="page-header-text">
    <h1>Reports</h1>
    <p>University-level analytical reports. All data is read-only.</p>
  </div>
</div>

<div class="report-grid">
  {#each data.reports as r}
    <a href="/vc-dvc/reports/{r.type}" class="report-card">
      <div class="rc-icon"><BarChart2 size={18} /></div>
      <div class="rc-body">
        <div class="rc-label">{r.label}</div>
        {#if r.description}<div class="rc-desc">{r.description}</div>{/if}
      </div>
      <ArrowRight size={15} class="rc-arrow" />
    </a>
  {:else}
    <p class="empty">No reports available.</p>
  {/each}
</div>

<style>
  .report-grid{display:flex;flex-direction:column;gap:.625rem;}
  .report-card{display:flex;align-items:center;gap:1rem;padding:.875rem 1.125rem;background:var(--color-surface);border:1px solid var(--color-border);border-radius:.75rem;text-decoration:none;color:inherit;transition:border-color .15s,transform .15s;}
  .report-card:hover{border-color:var(--p-accent);transform:translateY(-1px);}
  .rc-icon{width:38px;height:38px;border-radius:.5rem;background:var(--p-accent-dim);color:var(--p-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .rc-body{flex:1;}
  .rc-label{font-size:.86rem;font-weight:700;color:var(--color-text);}
  .rc-desc{font-size:.76rem;color:var(--color-muted);margin-top:.15rem;}
  .report-card :global(.rc-arrow){color:var(--color-muted);transition:transform .15s,color .15s;}
  .report-card:hover :global(.rc-arrow){transform:translateX(3px);color:var(--p-accent);}
  .empty{color:var(--color-muted);font-size:.82rem;}
</style>
