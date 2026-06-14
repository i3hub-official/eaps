<!-- src/lib/components/reports/ui/ExportBar.svelte
 -->

 <script lang="ts">
  import { Download, FileSpreadsheet, FileText, Printer } from '@lucide/svelte';
  import { exportCSV, exportXLSX, exportPDF } from '$lib/utils/exportReport.js';

  interface Props {
    rows:      unknown[];
    filename:  string;
    sheetName?: string;
  }

  let { rows, filename, sheetName = 'Report' }: Props = $props();

  let exporting = $state<'csv' | 'xlsx' | 'pdf' | null>(null);

  async function doExport(type: 'csv' | 'xlsx' | 'pdf') {
    exporting = type;
    try {
      if (type === 'csv')  exportCSV(rows, filename);
      if (type === 'xlsx') await exportXLSX(rows, filename, sheetName);
      if (type === 'pdf')  exportPDF();
    } finally {
      exporting = null;
    }
  }
</script>

<div class="export-bar">
  <span class="export-label">
    <Download size={13} />
    Export
  </span>

  <button
    class="exp-btn"
    onclick={() => doExport('csv')}
    disabled={!!exporting || rows.length === 0}
    title="Export as CSV"
  >
    {#if exporting === 'csv'}
      <span class="spin-sm">⟳</span>
    {:else}
      <FileText size={13} />
    {/if}
    CSV
  </button>

  <button
    class="exp-btn"
    onclick={() => doExport('xlsx')}
    disabled={!!exporting || rows.length === 0}
    title="Export as Excel"
  >
    {#if exporting === 'xlsx'}
      <span class="spin-sm">⟳</span>
    {:else}
      <FileSpreadsheet size={13} />
    {/if}
    Excel
  </button>

  <button
    class="exp-btn"
    onclick={() => doExport('pdf')}
    disabled={!!exporting}
    title="Print / Save as PDF"
  >
    {#if exporting === 'pdf'}
      <span class="spin-sm">⟳</span>
    {:else}
      <Printer size={13} />
    {/if}
    PDF
  </button>
</div>

<style>
  .export-bar {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .export-label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted, #6b7280);
    padding-right: 0.25rem;
  }

  .exp-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border: 1.5px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    background: var(--color-surface, white);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text, #374151);
    cursor: pointer;
    transition: all 0.15s;
  }

  .exp-btn:hover:not(:disabled) {
    border-color: var(--g600, #16a34a);
    color: var(--g600, #16a34a);
  }

  .exp-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .spin-sm {
    display: inline-block;
    animation: spin 0.8s linear infinite;
    font-size: 14px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
</style>