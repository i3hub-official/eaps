<!-- src/routes/lecturer/questions/create/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ChevronLeft, HelpCircle, PlusCircle, X,
    CheckCircle, AlertCircle, List, FileText,
    BookOpen, ChevronDown, Eye, Sparkles
  } from '@lucide/svelte';
  import { fly } from 'svelte/transition';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { exams } = data;

  let questionType = $state('mcq');
  let showPreview = $state(false);
  let previewBody = $state('');

  // ── Toast system ──────────────────────────────────────────────────────────
  type Toast = { id: number; message: string; type: 'info' | 'warn' | 'success' };
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  function showToast(message: string, type: Toast['type'] = 'info', duration = 2600) {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, duration);
  }

  // ── Handle form response ──────────────────────────────────────────────────
  $effect(() => {
    if (form) {
      if (form.success) {
        showToast(form.message || 'Question created successfully!', 'success');
        setTimeout(() => {
          window.location.href = `/lecturer/questions/${form.questionId}`;
        }, 1500);
      } else if (form.error) {
        showToast(form.error, 'warn');
      }
    }
  });

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      mcq: 'Multiple Choice',
      true_false: 'True/False',
      fill_in_the_blank: 'Fill in the Blank'
    };
    return labels[type] || type;
  }

  function previewQuestion(event: Event) {
    const form = event.target as HTMLFormElement;
    const body = (form.querySelector('[name="body"]') as HTMLTextAreaElement)?.value || '';
    previewBody = body;
    showPreview = true;
    setTimeout(() => showPreview = false, 3000);
  }
</script>

<svelte:head><title>Create Question — MOUAU eTest</title></svelte:head>

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
          <PlusCircle size={16} />
          <span>Create Question</span>
        </div>
        <h1>New Question</h1>
        <p class="subtitle">Add a question to one of your exams</p>
      </div>
    </div>
  </div>

  <!-- Form -->
  <form method="POST" action="?/create" use:enhance>
    <div class="form-grid">
      <div class="form-col main-col">
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><HelpCircle size={16} /></span>
            <div><h2>Question Details</h2><p>Fill in the question content and settings</p></div>
          </div>
          <div class="card-body">
            <!-- Exam Selection -->
            <div class="field">
              <label for="examId">Exam <span class="req">*</span></label>
              <select id="examId" name="examId" required>
                <option value="">Select an exam...</option>
                {#each exams as exam}
                  <option value={exam.id}>
                    {exam.course?.code} - {exam.title}
                  </option>
                {/each}
              </select>
              {#if exams.length === 0}
                <p class="field-hint error">
                  <AlertCircle size={12} />
                  No exams found. <a href="/lecturer/exams/create">Create an exam</a> first.
                </p>
              {/if}
            </div>

            <!-- Question Type -->
            <div class="field">
              <label>Question Type <span class="req">*</span></label>
              <div class="type-selector">
                <button 
                  type="button"
                  class="type-btn"
                  class:active={questionType === 'mcq'}
                  onclick={() => questionType = 'mcq'}
                >
                  <List size={14} />
                  MCQ
                </button>
                <button 
                  type="button"
                  class="type-btn"
                  class:active={questionType === 'true_false'}
                  onclick={() => questionType = 'true_false'}
                >
                  <CheckCircle size={14} />
                  True/False
                </button>
                <button 
                  type="button"
                  class="type-btn"
                  class:active={questionType === 'fill_in_the_blank'}
                  onclick={() => questionType = 'fill_in_the_blank'}
                >
                  <FileText size={14} />
                  Fill in the Blank
                </button>
              </div>
              <input type="hidden" name="type" value={questionType} />
            </div>

            <!-- Question Body -->
            <div class="field">
              <label for="body">Question <span class="req">*</span></label>
              <textarea 
                id="body" 
                name="body" 
                rows="4" 
                placeholder="Enter your question here..."
                required
              ></textarea>
            </div>

            <!-- Topic & Marks -->
            <div class="two-col">
              <div class="field">
                <label for="topic">Topic <span class="opt">Optional</span></label>
                <input id="topic" name="topic" type="text" placeholder="e.g. Object-Oriented Programming" />
              </div>
              <div class="field">
                <label for="marks">Marks <span class="req">*</span></label>
                <input id="marks" name="marks" type="number" value="1" min="1" max="10" required />
              </div>
            </div>
          </div>
        </div>

        <!-- Type-specific fields -->
        {#if questionType === 'mcq'}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"><List size={16} /></span>
              <div><h2>Options</h2><p>Add answer choices for your MCQ</p></div>
            </div>
            <div class="card-body">
              <div class="field">
                <label>Option 1 <span class="req">*</span></label>
                <input name="option1" type="text" placeholder="Enter option 1" required />
              </div>
              <div class="field">
                <label>Option 2 <span class="req">*</span></label>
                <input name="option2" type="text" placeholder="Enter option 2" required />
              </div>
              <div class="field">
                <label>Option 3 <span class="opt">Optional</span></label>
                <input name="option3" type="text" placeholder="Enter option 3" />
              </div>
              <div class="field">
                <label>Option 4 <span class="opt">Optional</span></label>
                <input name="option4" type="text" placeholder="Enter option 4" />
              </div>
              <div class="field">
                <label>Correct Answer <span class="req">*</span></label>
                <select name="correctIndex" required>
                  <option value="0">Option 1</option>
                  <option value="1">Option 2</option>
                  <option value="2">Option 3</option>
                  <option value="3">Option 4</option>
                </select>
              </div>
            </div>
          </div>
        {:else if questionType === 'true_false'}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"><CheckCircle size={16} /></span>
              <div><h2>True/False</h2><p>Set the correct answer</p></div>
            </div>
            <div class="card-body">
              <div class="field">
                <label>Correct Answer <span class="req">*</span></label>
                <div class="truefalse-selector">
                  <button type="button" class="tf-btn" onclick={() => document.querySelector('[name="correctAnswer"]')?.setAttribute('value', 'true')}>
                    <CheckCircle size={14} /> True
                  </button>
                  <button type="button" class="tf-btn" onclick={() => document.querySelector('[name="correctAnswer"]')?.setAttribute('value', 'false')}>
                    <X size={14} /> False
                  </button>
                </div>
                <input type="hidden" name="correctAnswer" value="true" />
              </div>
            </div>
          </div>
        {:else if questionType === 'fill_in_the_blank'}
          <div class="card">
            <div class="card-header">
              <span class="card-icon"><FileText size={16} /></span>
              <div><h2>Accepted Answers</h2><p>List all acceptable answers (comma separated)</p></div>
            </div>
            <div class="card-body">
              <div class="field">
                <label for="acceptedAnswers">Accepted Answers <span class="req">*</span></label>
                <input 
                  id="acceptedAnswers" 
                  name="acceptedAnswers" 
                  type="text" 
                  placeholder="e.g. 42, forty-two, forty two"
                  required 
                />
                <p class="field-hint">Separate multiple answers with commas</p>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="form-col side-col">
        <!-- Preview -->
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><Eye size={16} /></span>
            <div><h2>Preview</h2></div>
          </div>
          <div class="card-body preview-body">
            {#if showPreview}
              <div class="preview-content" in:fly={{ y: 10, duration: 200 }}>
                <p>{previewBody || 'Question preview will appear here...'}</p>
                <span class="preview-type">{getTypeLabel(questionType)}</span>
              </div>
            {:else}
              <p class="preview-placeholder">Fill in the question to see a preview</p>
            {/if}
          </div>
        </div>

        <!-- Quick Tips -->
        <div class="card tips-card">
          <div class="card-header">
            <span class="card-icon"><Sparkles size={16} /></span>
            <div><h2>Quick Tips</h2></div>
          </div>
          <div class="card-body">
            <ul class="tips-list">
              <li>Keep questions clear and concise</li>
              <li>Avoid ambiguous wording</li>
              <li>For MCQ, ensure only one correct answer</li>
              <li>Use specific topics for better organization</li>
              <li>Preview your question before saving</li>
            </ul>
          </div>
        </div>

        <!-- Submit -->
        <button type="submit" class="submit-btn">
          <PlusCircle size={18} /> Create Question
        </button>
      </div>
    </div>
  </form>
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

  .form-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
  }

  .form-col {
    display: flex; flex-direction: column; gap: 1.5rem;
  }

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: visible;
  }

  .card-header {
    display: flex; align-items: flex-start; gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    border-radius: 1rem 1rem 0 0;
  }

  .card-icon {
    width: 32px; height: 32px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--lc-soft); border-radius: 0.5rem;
    color: var(--lc-600);
  }

  .card-header h2 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text);
    margin: 0 0 0.15rem;
  }
  .card-header p {
    font-size: 0.73rem; color: var(--color-muted); margin: 0;
  }

  .card-body {
    padding: 1.125rem 1.25rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  }

  .field {
    display: flex; flex-direction: column; gap: 0.35rem;
  }

  .field label {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
  }

  .req { color: #ef4444; }
  .opt { font-size: 0.7rem; font-weight: 500; color: var(--color-muted); margin-left: 0.2rem; }

  .field input, .field select, .field textarea {
    padding: 0.575rem 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 0.6rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .field input:focus, .field select:focus, .field textarea:focus {
    border-color: var(--lc-600);
    box-shadow: 0 0 0 3px var(--lc-soft);
  }

  .field-hint {
    font-size: 0.72rem; color: var(--color-muted);
    margin: 0;
  }
  .field-hint.error { color: #dc2626; }
  .field-hint a { color: var(--lc-600); text-decoration: none; }
  .field-hint a:hover { text-decoration: underline; }

  .two-col {
    display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
  }

  .type-selector {
    display: flex; gap: 0.5rem; flex-wrap: wrap;
  }

  .type-btn {
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
  .type-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .type-btn.active {
    border-color: var(--lc-600);
    background: var(--lc-soft);
    color: var(--lc-600);
  }

  .truefalse-selector {
    display: flex; gap: 0.5rem;
  }
  .tf-btn {
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
  .tf-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }

  .preview-body {
    min-height: 120px;
  }

  .preview-content {
    padding: 1rem;
    background: var(--color-bg);
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }
  .preview-content p {
    margin: 0 0 0.5rem;
    font-size: 0.85rem; color: var(--color-text);
  }
  .preview-type {
    font-size: 0.65rem; font-weight: 700; color: var(--color-muted);
    background: var(--color-surface);
    padding: 0.15rem 0.4rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
  }

  .preview-placeholder {
    color: var(--color-muted);
    font-size: 0.82rem;
    text-align: center;
    padding: 1rem 0;
  }

  .tips-list {
    margin: 0; padding-left: 1.25rem;
    font-size: 0.78rem; color: var(--color-muted);
    line-height: 1.8;
  }

  .submit-btn {
    width: 100%; padding: 0.75rem;
    background: var(--lc-600); color: white;
    border: none; border-radius: 0.6rem;
    font-size: 0.9rem; font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }
  .submit-btn:hover { background: var(--lc-700); transform: translateY(-1px); }

  @media (max-width: 1024px) {
    .form-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    .page { padding: 1rem; }
    .header-top { flex-direction: column; gap: 0.5rem; align-items: stretch; }
    .two-col { grid-template-columns: 1fr; }
    .type-selector { flex-direction: column; }
    .truefalse-selector { flex-direction: column; }
  }
</style>