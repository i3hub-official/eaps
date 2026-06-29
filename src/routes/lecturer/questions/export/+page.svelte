<!-- src/routes/lecturer/questions/export/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import {
    Download, FileText, FileSpreadsheet, FileJson,
    ChevronLeft, CheckCircle, AlertCircle,
    HelpCircle, Filter, Search, X,
    BookOpen, Clock, BarChart2
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data }: { data: PageData } = $props();
  const { questions, exams, totalQuestions } = data;

  // ── State ──────────────────────────────────────────────────────────────────
  let exportFormat = $state('csv');
  let selectedExam = $state('all');
  let selectedType = $state('all');
  let searchQuery = $state('');
  let isExporting = $state(false);

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── Filtered Questions ────────────────────────────────────────────────────
  const filteredQuestions = $derived(() => {
    let result = [...questions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q =>
        q.body.toLowerCase().includes(query) ||
        q.topic?.toLowerCase().includes(query) ||
        q.courseCode?.toLowerCase().includes(query)
      );
    }

    if (selectedExam !== 'all') {
      result = result.filter(q => q.examId === selectedExam);
    }

    if (selectedType !== 'all') {
      result = result.filter(q => q.type === selectedType);
    }

    return result;
  });

  const filteredData = $derived(filteredQuestions());

  // ── Export functions ──────────────────────────────────────────────────────
  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      mcq: 'MCQ',
      true_false: 'True/False',
      fill_in_the_blank: 'Fill in the Blank',
      essay: 'Essay'
    };
    return labels[type] || type;
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function exportCSV() {
    isExporting = true;
    const data = filteredData.map(q => ({
      body: q.body,
      type: q.type,
      examCode: q.courseCode,
      examTitle: q.examTitle,
      marks: q.marks,
      topic: q.topic || '',
      options: q.options || '',
      fitbAnswers: q.fitbAnswers || '',
      createdAt: formatDate(q.createdAt)
    }));

    if (data.length === 0) {
      showToast('No questions to export', 'warn');
      isExporting = false;
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${(row[h as keyof typeof row] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${data.length} questions as CSV`, 'success');
    isExporting = false;
  }

  function exportJSON() {
    isExporting = true;
    const data = filteredData.map(q => ({
      body: q.body,
      type: q.type,
      examCode: q.courseCode,
      examTitle: q.examTitle,
      marks: q.marks,
      topic: q.topic || '',
      options: q.options ? q.options.split('|') : [],
      fitbAnswers: q.fitbAnswers ? q.fitbAnswers.split('|') : [],
      createdAt: q.createdAt
    }));

    if (data.length === 0) {
      showToast('No questions to export', 'warn');
      isExporting = false;
      return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${data.length} questions as JSON`, 'success');
    isExporting = false;
  }

  function handleExport() {
    if (exportFormat === 'csv') {
      exportCSV();
    } else if (exportFormat === 'json') {
      exportJSON();
    }
  }

  // ── Get type counts ──────────────────────────────────────────────────────
  const typeCounts = $derived(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(q => {
      counts[q.type] = (counts[q.type] || 0) + 1;
    });
    return counts;
  });
</script>

<svelte:head><title>Export Questions — MOUAU eTest</title></svelte:head>

<!-- ── Toast stack ─────────────────────────────────────────────────────────── -->
<div class="toast-stack" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast toast-{t.type}"
      in:fly={{ y: 10, duration: 200 }}
      out:fly={{ y: -6, duration: 160 }}>
      {#if t.type === 'warn'}<AlertCircle size={13} />
      {:else if t.type === 'success'}<CheckCircle size={13} />
      {:else}<HelpCircle size={13} />{/if}
      {t.message}
    </div>
  {/each}
</div>

<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-top">
      <a href="/lecturer/questions" class="back-link">
        <ChevronLeft size={14} /> Back to Question Bank
      </a>
    </div>
    <div class="header-main">
      <div>
        <div class="header-badge">
          <Download size={16} />
          <span>Export Questions</span>
        </div>
        <h1>Export Questions</h1>
        <p class="subtitle">{totalQuestions} questions available for export</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <div class="controls-left">
      <div class="search-wrap">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search questions..."
          bind:value={searchQuery}
        />
        {#if searchQuery}
          <button class="clear-btn" onclick={() => searchQuery = ''}>
            <X size={14} />
          </button>
        {/if}
      </div>

      <div class="filter-group">
        <Filter size={14} />
        <select bind:value={selectedExam}>
          <option value="all">All Exams</option>
          {#each exams as exam}
            <option value={exam.id}>
              {exam.course?.code} - {exam.title}
            </option>
          {/each}
        </select>
      </div>

      <div class="filter-group">
        <select bind:value={selectedType}>
          <option value="all">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="true_false">True/False</option>
          <option value="fill_in_the_blank">Fill in the Blank</option>
          <option value="essay">Essay</option>
        </select>
      </div>
    </div>

    <div class="controls-right">
      <span class="results-count">{filteredData.length} questions</span>
    </div>
  </div>

  <!-- Type Distribution -->
  <div class="type-distribution">
    <span class="type-label">Selected:</span>
    {#each Object.entries(typeCounts()) as [type, count]}
      <span class="type-badge">
        {getTypeLabel(type)}: {count}
      </span>
    {/each}
  </div>

  <!-- Export Options -->
  <div class="export-section">
    <div class="export-options">
      <div class="option-group">
        <label>Export Format</label>
        <div class="format-selector">
          <button 
            type="button"
            class="format-btn"
            class:active={exportFormat === 'csv'}
            onclick={() => exportFormat = 'csv'}
          >
            <FileText size={16} />
            CSV
          </button>
          <button 
            type="button"
            class="format-btn"
            class:active={exportFormat === 'json'}
            onclick={() => exportFormat = 'json'}
          >
            <FileJson size={16} />
            JSON
          </button>
        </div>
      </div>
    </div>

    <button 
      class="export-btn" 
      onclick={handleExport}
      disabled={filteredData.length === 0 || isExporting}
    >
      {#if isExporting}
        <div class="spinner"></div> Exporting...
      {:else}
        <Download size={18} /> Export {filteredData.length} Questions
      {/if}
    </button>
  </div>

  <!-- Preview -->
  <div class="preview-section">
    <div class="preview-header">
      <h3>Preview</h3>
      <span class="preview-count">{filteredData.length} questions</span>
    </div>
    <div class="table-wrap">
      <table class="preview-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Question</th>
            <th>Type</th>
            <th>Exam</th>
            <th>Marks</th>
            <th>Topic</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredData.length === 0}
            <tr>
              <td colspan="7" class="empty-row">No questions match your filters</td>
            </tr>
          {:else}
            {#each filteredData.slice(0, 20) as q, i}
              <tr>
                <td>{i + 1}</td>
                <td class="question-cell">{q.body.slice(0, 80)}{q.body.length > 80 ? '...' : ''}</td>
                <td><span class="type-tag">{getTypeLabel(q.type)}</span></td>
                <td>{q.courseCode}</td>
                <td class="center">{q.marks}</td>
                <td>{q.topic || '—'}</td>
                <td>{formatDate(q.createdAt)}</td>
              </tr>
            {/each}
            {#if filteredData.length > 20}
              <tr>
                <td colspan="7" class="more-row">... and {filteredData.length - 20} more</td>
              </tr>
            {/if}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .toast-stack {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    z-index: 9999; display: flex; flex-direction: column; gap: .35rem;
    pointer-events: none;
  }
  .toast {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .5rem .9rem; border-radius: .55rem;
    font-size: .79rem; font-weight: 600; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(0,0,0,.1); max-width: 300px;
    pointer-events: auto;
  }
  .toast-info { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
  .toast-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .toast-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

  .page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.75rem;
  }

  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.8rem; font-weight: 600; color: var(--color-muted);
    text-decoration: none; transition: color 0.15s;
  }
  .back-link:hover { color: var(--color-text); }

  .header-badge {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    padding: 0.2rem 0.6rem;
    background: var(--color-bg); border-radius: 999px;
    margin-bottom: 0.5rem;
  }

  .header-main h1 {
    font-size: 1.5rem; font-weight: 800; color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    font-size: 0.8rem; color: var(--color-muted); margin: 0.2rem 0 0;
  }

  .controls {
    display: flex; justify-content: space-between; align-items: center;
    gap: 1rem; flex-wrap: wrap;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
  }

  .controls-left {
    display: flex; align-items: center; gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
  }

  .search-wrap {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    flex: 1; min-width: 200px;
    color: var(--color-muted);
  }
  .search-wrap input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 0.8rem; color: var(--color-text); font-family: inherit;
  }
  .clear-btn {
    background: none; border: none; cursor: pointer;
    color: var(--color-muted); padding: 0.1rem;
  }
  .clear-btn:hover { color: var(--color-text); }

  .filter-group {
    display: flex; align-items: center; gap: 0.4rem;
    color: var(--color-muted);
  }
  .filter-group select {
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.78rem;
    font-family: inherit;
    outline: none;
    cursor: pointer;
  }
  .filter-group select:focus {
    border-color: var(--lc-600);
    box-shadow: 0 0 0 3px var(--lc-soft);
  }

  .controls-right {
    display: flex; align-items: center; gap: 0.5rem;
  }

  .results-count {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
  }

  .type-distribution {
    display: flex; align-items: center; gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.5rem 1rem;
    background: var(--color-bg);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }
  .type-label {
    font-size: 0.7rem; font-weight: 600; color: var(--color-muted);
  }
  .type-badge {
    font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.5rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .export-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
    display: flex; flex-direction: column; gap: 1rem;
  }

  .export-options {
    display: flex; gap: 2rem; flex-wrap: wrap;
  }

  .option-group {
    display: flex; flex-direction: column; gap: 0.3rem;
  }
  .option-group label {
    font-size: 0.75rem; font-weight: 600; color: var(--color-text);
  }

  .format-selector {
    display: flex; gap: 0.5rem;
  }

  .format-btn {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 0.875rem;
    border: 2px solid var(--color-border);
    border-radius: 0.6rem;
    background: var(--color-bg);
    color: var(--color-muted);
    font-size: 0.8rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .format-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .format-btn.active {
    border-color: var(--lc-600);
    background: var(--lc-soft);
    color: var(--lc-600);
  }

  .export-btn {
    padding: 0.75rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.9rem; font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }
  .export-btn:hover:not(:disabled) { background: var(--lc-700); transform: translateY(-1px); }
  .export-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .spinner {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: spin 0.7s linear infinite;
  }

  .preview-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
  }

  .preview-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }
  .preview-header h3 {
    font-size: 0.8rem; font-weight: 700; color: var(--color-text);
    margin: 0;
  }
  .preview-count {
    font-size: 0.7rem; color: var(--color-muted);
  }

  .table-wrap {
    overflow: auto;
    max-height: 400px;
  }

  .preview-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.78rem;
  }
  .preview-table th {
    padding: 0.4rem 0.6rem;
    text-align: left;
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--color-muted);
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    position: sticky; top: 0;
    z-index: 1;
  }
  .preview-table td {
    padding: 0.3rem 0.6rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }
  .preview-table tr:hover td { background: var(--lc-soft); }

  .center { text-align: center; }

  .question-cell {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .type-tag {
    font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 999px;
  }

  .empty-row {
    text-align: center; padding: 2rem; color: var(--color-muted);
  }
  .more-row {
    text-align: center; padding: 0.5rem; color: var(--color-muted);
    font-style: italic;
  }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .controls { flex-direction: column; align-items: stretch; }
    .controls-left { flex-direction: column; }
    .search-wrap { min-width: 100%; }
    .export-options { flex-direction: column; gap: 1rem; }
    .format-selector { flex-direction: column; }
    .preview-table { font-size: 0.7rem; }
    .question-cell { max-width: 150px; }
  }
</style>