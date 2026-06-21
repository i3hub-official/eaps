<!-- src/routes/lecturer/results/export/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { FileSpreadsheet, FileText, Download, ArrowLeft } from '@lucide/svelte';

  let { data }: { data: PageData } = $props();

  let selectedCourse = $state<string>('all');
  let selectedExam = $state<string>('all');
  let exportFormat = $state<'excel' | 'pdf'>('excel');
  let isExporting = $state(false);

  async function handleExport() {
    isExporting = true;
    try {
      const params = new URLSearchParams();
      if (selectedCourse !== 'all') params.append('courseId', selectedCourse);
      if (selectedExam !== 'all') params.append('examId', selectedExam);
      params.append('format', exportFormat);
      
      window.location.href = `/api/export/results?${params.toString()}`;
    } finally {
      setTimeout(() => isExporting = false, 1000);
    }
  }
</script>

<div class="page">
  <div class="header">
    <a href="/lecturer/results" class="back-link">
      <ArrowLeft size={14} /> Back to Results
    </a>
    <h1>Export Results</h1>
    <p>Export examination results in Excel or PDF format</p>
  </div>

  <div class="export-card">
    <div class="export-section">
      <h3>Export Options</h3>
      
      <div class="field">
        <label>Course</label>
        <select bind:value={selectedCourse}>
          <option value="all">All Courses</option>
          {#each data.courses as course}
            <option value={course.id}>{course.code} - {course.title}</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <label>Exam</label>
        <select bind:value={selectedExam}>
          <option value="all">All Exams</option>
          {#each data.exams as exam}
            <option value={exam.id}>{exam.title} ({exam.courseCode})</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <label>Export Format</label>
        <div class="format-options">
          <button
            class="format-btn"
            class:active={exportFormat === 'excel'}
            onclick={() => exportFormat = 'excel'}
          >
            <FileSpreadsheet size={16} />
            Excel (.xlsx)
          </button>
          <button
            class="format-btn"
            class:active={exportFormat === 'pdf'}
            onclick={() => exportFormat = 'pdf'}
          >
            <FileText size={16} />
            PDF (.pdf)
          </button>
        </div>
      </div>

      <button 
        class="btn primary" 
        onclick={handleExport}
        disabled={isExporting}
      >
        {#if isExporting}
          <span class="spinner"></span>
          Exporting…
        {:else}
          <Download size={14} />
          Export {exportFormat === 'excel' ? 'Excel' : 'PDF'}
        {/if}
      </button>
    </div>

    <div class="info-section">
      <h3>What's included</h3>
      <ul>
        <li>Student names and matriculation numbers</li>
        <li>Scores and percentages</li>
        <li>Grades and pass/fail status</li>
        <li>Violation counts</li>
        <li>Exam and course details</li>
      </ul>
      <p class="hint">The export will include all filtered results based on your selections above.</p>
    </div>
  </div>
</div>

<style>
  .page {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted);
    text-decoration: none;
    transition: color 0.15s;
    width: fit-content;
  }

  .back-link:hover {
    color: var(--lc-600, #4f46e5);
  }

  .header h1 {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .header p {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0;
  }

  .export-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 1.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
  }

  .export-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .export-section h3,
  .info-section h3 {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .field select {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.82rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
  }

  .field select:focus {
    border-color: var(--lc-600, #4f46e5);
  }

  .format-options {
    display: flex;
    gap: 0.5rem;
  }

  .format-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.625rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-muted);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .format-btn:hover {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
  }

  .format-btn.active {
    border-color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.625rem 1.25rem;
    border-radius: 0.6rem;
    font-size: 0.85rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .btn.primary {
    background: var(--lc-600, #4f46e5);
    color: #fff;
  }

  .btn.primary:hover:not(:disabled) {
    background: var(--lc-700, #4338ca);
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: spin 0.6s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .info-section ul {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .info-section li {
    font-size: 0.8rem;
    color: var(--color-text);
    padding-left: 1.25rem;
    position: relative;
  }

  .info-section li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--lc-600, #4f46e5);
    font-weight: 800;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0.75rem 0 0;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .export-card {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .format-options {
      flex-direction: column;
    }
  }
</style>