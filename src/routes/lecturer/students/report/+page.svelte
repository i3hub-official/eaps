<!-- src/routes/lecturer/students/report/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { fly } from 'svelte/transition';
  import { 
    AlertTriangle, Send, User, Mail, 
    FileText, X, CheckCircle, LoaderCircle
  } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: any } = $props();

  let selectedStudent = $state<string>('');
  let reportType = $state<string>('violation');
  let isSubmitting = $state(false);
  let showSuccess = $state(false);

  $effect(() => {
    if (form?.success) {
      showSuccess = true;
      setTimeout(() => {
        showSuccess = false;
        selectedStudent = '';
        reportType = 'violation';
      }, 3000);
    }
  });

  function handleSubmit() {
    isSubmitting = true;
    setTimeout(() => { isSubmitting = false; }, 500);
  }
</script>

<div class="page">
  <div class="header">
    <h1>Report Student</h1>
    <p>Report academic misconduct or behavioral violations</p>
  </div>

  {#if showSuccess}
    <div class="success-banner" transition:fly={{ y: -10, duration: 300 }}>
      <CheckCircle size={18} />
      <span>Report submitted successfully!</span>
    </div>
  {/if}

  <div class="report-card">
    <form 
      method="POST" 
      action="?/submit"
      use:enhance={() => {
        handleSubmit();
        return async ({ update }) => { await update(); };
      }}
      class="report-form"
    >
      <!-- Student Selection -->
      <div class="field">
        <label for="studentId">Student <span class="req">*</span></label>
        <select 
          id="studentId" 
          name="studentId" 
          bind:value={selectedStudent}
          required
        >
          <option value="">Select a student...</option>
          {#each data.students as student}
            <option value={student.id}>
              {student.fullName} ({student.matricNumber || student.email})
            </option>
          {/each}
        </select>
      </div>

      <!-- Report Type -->
      <div class="field">
        <label>Report Type <span class="req">*</span></label>
        <div class="type-options">
          <button
            type="button"
            class="type-btn"
            class:active={reportType === 'violation'}
            onclick={() => reportType = 'violation'}
          >
            <AlertTriangle size={14} />
            Violation
          </button>
          <button
            type="button"
            class="type-btn"
            class:active={reportType === 'academic'}
            onclick={() => reportType = 'academic'}
          >
            <FileText size={14} />
            Academic Issue
          </button>
          <button
            type="button"
            class="type-btn"
            class:active={reportType === 'behavioral'}
            onclick={() => reportType = 'behavioral'}
          >
            <User size={14} />
            Behavioral
          </button>
        </div>
        <input type="hidden" name="reportType" value={reportType} />
      </div>

      <!-- Title -->
      <div class="field">
        <label for="title">Title <span class="req">*</span></label>
        <input 
          id="title" 
          name="title" 
          type="text" 
          placeholder="e.g. Exam misconduct during CSC301"
          required
        />
      </div>

      <!-- Description -->
      <div class="field">
        <label for="description">Description <span class="req">*</span></label>
        <textarea 
          id="description" 
          name="description" 
          rows="6"
          placeholder="Provide a detailed description of the incident..."
          required
        ></textarea>
      </div>

      <!-- Evidence -->
      <div class="field">
        <label for="evidence">Evidence <span class="opt">Optional</span></label>
        <textarea 
          id="evidence" 
          name="evidence" 
          rows="3"
          placeholder="Describe any evidence (screenshots, logs, etc.)..."
        ></textarea>
      </div>

      <!-- Exam Reference -->
      <div class="field">
        <label for="examId">Related Exam <span class="opt">Optional</span></label>
        <select id="examId" name="examId">
          <option value="">Select an exam...</option>
          {#each data.exams as exam}
            <option value={exam.id}>
              {exam.title} ({exam.courseCode})
            </option>
          {/each}
        </select>
      </div>

      {#if form?.error}
        <div class="error-banner">
          <AlertTriangle size={16} />
          {form.error}
        </div>
      {/if}

      <div class="form-actions">
        <a href="/lecturer/students" class="btn ghost">Cancel</a>
        <button type="submit" class="btn primary" disabled={isSubmitting || !selectedStudent}>
          {#if isSubmitting}
            <LoaderCircle size={14} class="spin" />
            Submitting...
          {:else}
            <Send size={14} />
            Submit Report
          {/if}
        </button>
      </div>
    </form>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h4>Quick Actions</h4>
      <div class="action-grid">
        <button class="action-btn" onclick={() => {
          reportType = 'violation';
          document.getElementById('title')?.focus();
        }}>
          <AlertTriangle size={14} />
          Report Violation
        </button>
        <button class="action-btn" onclick={() => {
          reportType = 'academic';
          document.getElementById('title')?.focus();
        }}>
          <FileText size={14} />
          Academic Issue
        </button>
        <button class="action-btn" onclick={() => {
          reportType = 'behavioral';
          document.getElementById('title')?.focus();
        }}>
          <User size={14} />
          Behavioral
        </button>
      </div>
      <p class="help-text">Select a report type to auto-fill the form, or fill it manually.</p>
    </div>
  </div>
</div>

<style>
  .page {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .header h1 {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--color-text);
    margin: 0 0 0.25rem;
    letter-spacing: -0.02em;
  }

  .header p {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0;
  }

  .success-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: rgba(6,95,70,0.08);
    border: 1px solid rgba(6,95,70,0.2);
    color: #065f46;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.2);
    color: #dc2626;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .report-card {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .report-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .req {
    color: #ef4444;
  }

  .opt {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--color-muted);
  }

  .field input[type="text"],
  .field textarea,
  .field select {
    padding: 0.575rem 0.875rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
  }

  .field input:focus,
  .field textarea:focus,
  .field select:focus {
    border-color: var(--lc-600, #4f46e5);
    box-shadow: 0 0 0 3px var(--lc-soft, rgba(79,70,229,0.1));
  }

  .field textarea {
    resize: vertical;
  }

  .type-options {
    display: flex;
    gap: 0.5rem;
  }

  .type-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem;
    border: 2px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-muted);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .type-btn:hover {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
  }

  .type-btn.active {
    border-color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1.25rem;
    border-radius: 0.6rem;
    font-size: 0.82rem;
    font-weight: 700;
    border: 1.5px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    text-decoration: none;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }

  .btn.primary {
    background: var(--lc-600, #4f46e5);
    border-color: var(--lc-600, #4f46e5);
    color: #fff;
  }

  .btn.primary:hover:not(:disabled) {
    background: var(--lc-700, #4338ca);
    border-color: var(--lc-700, #4338ca);
  }

  .btn.ghost {
    background: transparent;
    color: var(--color-muted);
  }

  .btn.ghost:hover {
    border-color: var(--color-text);
    color: var(--color-text);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .quick-actions {
    padding: 1rem;
    background: var(--color-bg);
    border-radius: 0.75rem;
    border: 1px solid var(--color-border);
  }

  .quick-actions h4 {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.75rem;
  }

  .action-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    width: 100%;
    text-align: left;
  }

  .action-btn:hover {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.04));
  }

  .help-text {
    font-size: 0.7rem;
    color: var(--color-muted);
    margin: 0.75rem 0 0;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .report-card {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .type-options {
      flex-direction: column;
    }

    .form-actions {
      flex-direction: column;
    }

    .form-actions .btn {
      justify-content: center;
    }
  }
</style>