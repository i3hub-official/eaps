<!-- src/routes/vc-dvc/reports/[reportType]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ReportRenderer from '$lib/components/reports/ReportRenderer.svelte';
  import { ArrowLeft, Printer } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();
</script>

<div class="page-header">
  <div class="page-header-text">
    <a href="/vc-dvc/reports" class="back"><ArrowLeft size={13} /> All reports</a>
    <h1>{data.meta.label}</h1>
  </div>
  <button class="btn btn-outline" onclick={() => window.print()}>
    <Printer size={14} /> Print
  </button>
</div>

<ReportRenderer meta={data.meta} params={data.params} data={data.data} />

<style>
  @import '$lib/styles/portals.css';
  .back { display: inline-flex; align-items: center; gap: .35rem; font-size: .76rem; color: var(--color-muted); text-decoration: none; margin-bottom: .4rem; }
  .back:hover { color: var(--color-text); }
  @media print { .btn { display: none; } }
</style>