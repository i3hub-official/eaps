<!-- src/routes/admin/exams/[examId]/questions/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    ChevronLeft, Plus, Trash2, Check, X, Upload,
    FileText, AlignLeft, Hash, Tag, ChevronDown,
    ChevronUp, AlertCircle, Info, BookOpen, Loader2,
    Users, Building2, ClipboardList, ShieldCheck,
    ToggleLeft, CheckCircle2, Clock, Layers
  } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // ── Question builder state ────────────────────────────────────────────────
  type QType = 'mcq' | 'fill_in_the_blank';

  let activeTab = $state<QType>('mcq');
  let questionBody = $state('');
  let questionTopic = $state('');
  let questionMarks = $state(1);
  let submitting = $state(false);
  let deleting = $state<string | null>(null);

  // MCQ options
  interface Option { text: string; correct: boolean }
  let options = $state<Option[]>([
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false },
  ]);

  function addOption() { options = [...options, { text: '', correct: false }]; }
  function removeOption(i: number) {
    if (options.length <= 2) return;
    options = options.filter((_, idx) => idx !== i);
  }
  function toggleCorrect(i: number) {
    options = options.map((o, idx) => ({ ...o, correct: idx === i ? !o.correct : o.correct }));
  }

  // FITB answers
  let fitbPrimary = $state('');
  let fitbAlts = $state<string[]>(['']);

  function addAlt() { fitbAlts = [...fitbAlts, '']; }
  function removeAlt(i: number) { fitbAlts = fitbAlts.filter((_, idx) => idx !== i); }

  // ── Import state ──────────────────────────────────────────────────────────
  let showImport = $state(false);
  let importJson = $state('');
  let importError = $state('');

  function validateImportJson() {
    importError = '';
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) { importError = 'Must be a JSON array'; return false; }
      return true;
    } catch {
      importError = 'Invalid JSON syntax';
      return false;
    }
  }

  // ── Status update ─────────────────────────────────────────────────────────
  let statusOpen = $state(false);
  let updatingStatus = $state(false);

  const STATUS_OPTS = [
    { value: 'draft',     label: 'Draft',     color: '#6b7280' },
    { value: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
    { value: 'active',    label: 'Active',    color: '#16a34a' },
    { value: 'completed', label: 'Completed', color: '#9333ea' },
    { value: 'cancelled', label: 'Cancelled', color: '#dc2626' },
  ] as const;

  const currentStatus = $derived(
    STATUS_OPTS.find(s => s.value === data.exam.status) ?? STATUS_OPTS[0]
  );

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalMarks = $derived(data.exam.questions.reduce((s, q) => s + q.marks, 0));
  const mcqCount   = $derived(data.exam.questions.filter(q => q.type === 'mcq').length);
  const fitbCount  = $derived(data.exam.questions.filter(q => q.type === 'fill_in_the_blank').length);

  // ── Reset form after successful submission ────────────────────────────────
  $effect(() => {
    if (form?.success) {
      questionBody = '';
      questionTopic = '';
      questionMarks = 1;
      options = [
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
      ];
      fitbPrimary = '';
      fitbAlts = [''];
      importJson = '';
      showImport = false;
      submitting = false;
    }
  });
</script>

<svelte:head><title>Questions — {data.exam.course.code} | Admin</title></svelte:head>

<div class="page">

  <!-- ── Page header ─────────────────────────────────────────────────────── -->
  <div class="page-header">
    <a href="/admin/exams/{data.exam.id}" class="back-link">
      <ChevronLeft size={14} strokeWidth={2.5} /> Back to Exam
    </a>
    <div class="page-header-main">
      <div>
        <h1>
          Question Builder
          <span class="admin-badge">Admin</span>
        </h1>
        <p>{data.exam.course.code} — {data.exam.title}</p>
      </div>
      <div class="header-actions">
        <a href="/admin/exams/{data.exam.id}" class="btn ghost">View Exam</a>
        <a href="/admin/exams" class="btn ghost">All Exams</a>
      </div>
    </div>
  </div>

  <!-- ── Lecturer ownership banner ───────────────────────────────────────── -->
  <div class="owner-banner">
    <div class="owner-avatar">{data.exam.lecturer.fullName.split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase()}</div>
    <div class="owner-info">
      <span class="owner-label">Exam Owner</span>
      <span class="owner-name">{data.exam.lecturer.fullName}</span>
      {#if data.exam.lecturer.staffId}
        <span class="owner-meta">{data.exam.lecturer.staffId}</span>
      {/if}
      {#if data.exam.lecturer.department}
        <span class="owner-meta"><Building2 size={11} /> {data.exam.lecturer.department.name}</span>
      {/if}
    </div>
    <div class="owner-right">
      <!-- Status changer -->
      <div class="status-wrap">
        <button
          type="button"
          class="status-btn"
          style="--sc: {currentStatus.color}"
          onclick={() => statusOpen = !statusOpen}
        >
          <span class="status-dot"></span>
          {currentStatus.label}
          <ChevronDown size={13} />
        </button>
        {#if statusOpen}
          <div class="status-dropdown">
            {#each STATUS_OPTS as s}
              <form
                method="POST"
                action="?/updateStatus"
                use:enhance={() => {
                  updatingStatus = true;
                  statusOpen = false;
                  return async ({ update }) => { await update(); updatingStatus = false; };
                }}
              >
                <input type="hidden" name="status" value={s.value} />
                <button
                  type="submit"
                  class="status-opt"
                  class:current={s.value === data.exam.status}
                  style="--sc: {s.color}"
                >
                  <span class="status-dot"></span>
                  {s.label}
                  {#if s.value === data.exam.status}<Check size={12} />{/if}
                </button>
              </form>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="alert-error">
      <AlertCircle size={15} /> {form.error}
    </div>
  {/if}

  <div class="layout">

    <!-- ══ LEFT: Builder ══════════════════════════════════════════════════ -->
    <div class="builder-col">

      <!-- Tab switcher -->
      <div class="tab-bar">
        <button
          type="button"
          class="tab"
          class:active={activeTab === 'mcq'}
          onclick={() => activeTab = 'mcq'}
        >
          <ClipboardList size={14} /> Multiple Choice
        </button>
        <button
          type="button"
          class="tab"
          class:active={activeTab === 'fill_in_the_blank'}
          onclick={() => activeTab = 'fill_in_the_blank'}
        >
          <AlignLeft size={14} /> Fill in the Blank
        </button>
        <button
          type="button"
          class="tab tab-import"
          class:active={showImport}
          onclick={() => { showImport = !showImport; }}
        >
          <Upload size={14} /> Bulk Import
        </button>
      </div>

      <!-- ── Bulk import panel ───────────────────────────────────────────── -->
      {#if showImport}
        <div class="card">
          <div class="card-header">
            <span class="card-icon"><Upload size={16} /></span>
            <div>
              <h2>Bulk Import Questions</h2>
              <p>Paste a JSON array of question objects</p>
            </div>
          </div>
          <div class="card-body">
            <div class="import-format">
              <p class="format-title">Expected format:</p>
              <pre class="format-pre">[{`
  {
    "type": "mcq",
    "body": "What is...?",
    "topic": "Topic name",
    "marks": 2,
    "options": [
      { "text": "Option A", "correct": true },
      { "text": "Option B", "correct": false }
    ]
  },
  {
    "type": "fitb",
    "body": "The capital of Nigeria is ___",
    "marks": 1,
    "answers": ["Abuja", "abuja"]
  }
]`}</pre>
            </div>

            <form
              method="POST"
              action="?/bulkImport"
              use:enhance={() => {
                if (!validateImportJson()) return;
                submitting = true;
                return async ({ update }) => { await update(); submitting = false; };
              }}
            >
              <div class="field">
                <label for="import-json">JSON Payload</label>
                <textarea
                  id="import-json"
                  name="questions_json"
                  rows="10"
                  placeholder="Paste JSON array here…"
                  bind:value={importJson}
                  class:error-input={!!importError}
                ></textarea>
                {#if importError}
                  <p class="field-error">{importError}</p>
                {/if}
              </div>

              {#if form?.imported}
                <div class="import-success">
                  <CheckCircle2 size={14} /> {form.imported} questions imported successfully
                </div>
              {/if}

              <button type="submit" class="btn primary full" disabled={submitting || !importJson.trim()}>
                {#if submitting}
                  <Loader2 size={14} class="spin" /> Importing…
                {:else}
                  <Upload size={14} /> Import Questions
                {/if}
              </button>
            </form>
          </div>
        </div>

      <!-- ── Question builder form ────────────────────────────────────────── -->
      {:else}
        <div class="card">
          <div class="card-header">
            <span class="card-icon">
              {#if activeTab === 'mcq'}
                <ClipboardList size={16} />
              {:else}
                <AlignLeft size={16} />
              {/if}
            </span>
            <div>
              <h2>{activeTab === 'mcq' ? 'Multiple Choice Question' : 'Fill in the Blank'}</h2>
              <p>{activeTab === 'mcq' ? 'Add options and mark the correct answer(s)' : 'Define the accepted answer(s)'}</p>
            </div>
          </div>

          <form
            method="POST"
            action="?/addQuestion"
            use:enhance={() => {
              submitting = true;
              return async ({ update }) => { await update(); submitting = false; };
            }}
            class="card-body"
          >
            <input type="hidden" name="type" value={activeTab} />

            <!-- Question body -->
            <div class="field">
              <label for="q-body">Question <span class="req">*</span></label>
              <textarea
                id="q-body"
                name="body"
                rows="3"
                required
                placeholder={activeTab === 'mcq'
                  ? 'e.g. Which of the following is a primary colour?'
                  : 'e.g. The process by which plants make food is called ___'}
                bind:value={questionBody}
              ></textarea>
            </div>

            <!-- Topic + Marks -->
            <div class="two-col">
              <div class="field">
                <label for="q-topic">
                  <Tag size={12} /> Topic <span class="opt">Optional</span>
                </label>
                <input
                  id="q-topic"
                  name="topic"
                  type="text"
                  placeholder="e.g. Thermodynamics"
                  bind:value={questionTopic}
                />
              </div>
              <div class="field">
                <label for="q-marks">
                  <Hash size={12} /> Marks <span class="req">*</span>
                </label>
                <div class="score-input-wrap">
                  <input
                    id="q-marks"
                    name="marks"
                    type="number"
                    min="1"
                    max="100"
                    required
                    bind:value={questionMarks}
                  />
                  <span class="score-unit">pts</span>
                </div>
              </div>
            </div>

            <!-- MCQ Options -->
            {#if activeTab === 'mcq'}
              <div class="options-section">
                <div class="options-header">
                  <span class="options-label">Answer Options</span>
                  <span class="options-hint">Check all correct answers</span>
                </div>

                {#each options as opt, i}
                  <input type="hidden" name="option_text_{i}" value={opt.text} />
                  <input type="hidden" name="option_correct_{i}" value={opt.correct ? 'on' : 'off'} />
                  <div class="option-row" class:correct={opt.correct}>
                    <button
                      type="button"
                      class="correct-toggle"
                      class:active={opt.correct}
                      onclick={() => toggleCorrect(i)}
                      title="Mark as correct"
                      aria-label="Toggle correct"
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <input
                      type="text"
                      class="option-input"
                      placeholder="Option {String.fromCharCode(65 + i)}"
                      bind:value={opt.text}
                    />
                    <button
                      type="button"
                      class="remove-opt"
                      onclick={() => removeOption(i)}
                      disabled={options.length <= 2}
                      aria-label="Remove option"
                    >
                      <X size={13} />
                    </button>
                  </div>
                {/each}

                <button type="button" class="add-option-btn" onclick={addOption}>
                  <Plus size={13} /> Add Option
                </button>
              </div>
            {/if}

            <!-- FITB Answers -->
            {#if activeTab === 'fill_in_the_blank'}
              <div class="options-section">
                <div class="options-header">
                  <span class="options-label">Accepted Answers</span>
                  <span class="options-hint">First is primary; others are alternatives</span>
                </div>

                <div class="option-row correct">
                  <span class="primary-badge">Primary</span>
                  <input
                    type="text"
                    name="fitb_primary"
                    class="option-input"
                    placeholder="Primary accepted answer"
                    required
                    bind:value={fitbPrimary}
                  />
                </div>

                {#each fitbAlts as alt, i}
                  <input type="hidden" name="fitb_alt_{i}" value={alt} />
                  <div class="option-row">
                    <span class="alt-badge">Alt {i + 1}</span>
                    <input
                      type="text"
                      class="option-input"
                      placeholder="Alternative accepted answer"
                      bind:value={fitbAlts[i]}
                    />
                    <button
                      type="button"
                      class="remove-opt"
                      onclick={() => removeAlt(i)}
                      aria-label="Remove alternative"
                    >
                      <X size={13} />
                    </button>
                  </div>
                {/each}

                <button type="button" class="add-option-btn" onclick={addAlt}>
                  <Plus size={13} /> Add Alternative
                </button>
              </div>
            {/if}

            <button
              type="submit"
              class="btn primary full"
              disabled={submitting || !questionBody.trim()}
            >
              {#if submitting}
                <Loader2 size={14} class="spin" /> Adding…
              {:else}
                <Plus size={14} /> Add Question
              {/if}
            </button>
          </form>
        </div>
      {/if}

    </div>

    <!-- ══ RIGHT: Questions list + stats ════════════════════════════════════ -->
    <div class="list-col">

      <!-- Stats strip -->
      <div class="stats-strip">
        <div class="stat">
          <span class="stat-n">{data.exam.questions.length}</span>
          <span class="stat-l">Questions</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-n">{mcqCount}</span>
          <span class="stat-l">MCQ</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-n">{fitbCount}</span>
          <span class="stat-l">FITB</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-n">{totalMarks}</span>
          <span class="stat-l">Total Marks</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-n">{data.exam.totalMarks}</span>
          <span class="stat-l">Target</span>
        </div>
      </div>

      {#if totalMarks !== data.exam.totalMarks && data.exam.questions.length > 0}
        <div class="marks-warn">
          <AlertCircle size={14} />
          Question marks total ({totalMarks}) doesn't match exam total marks ({data.exam.totalMarks}). Update either the questions or the exam settings.
        </div>
      {/if}

      <!-- Question list -->
      {#if data.exam.questions.length === 0}
        <div class="empty">
          <div class="empty-icon">
            <FileText size={32} strokeWidth={1.2} />
          </div>
          <p class="empty-title">No questions yet</p>
          <p class="empty-sub">Use the builder on the left to add MCQ or fill-in-the-blank questions.</p>
        </div>
      {:else}
        <div class="question-list">
          {#each data.exam.questions as q, i}
            <div class="q-card" class:mcq={q.type === 'mcq'} class:fitb={q.type === 'fill_in_the_blank'}>
              <div class="q-card-header">
                <div class="q-meta">
                  <span class="q-num">Q{i + 1}</span>
                  <span class="q-type-badge" class:fitb-badge={q.type === 'fill_in_the_blank'}>
                    {q.type === 'mcq' ? 'MCQ' : 'FITB'}
                  </span>
                  {#if q.topic}
                    <span class="q-topic"><Tag size={10} /> {q.topic}</span>
                  {/if}
                </div>
                <div class="q-right">
                  <span class="q-marks">{q.marks} pt{q.marks !== 1 ? 's' : ''}</span>
                  <form
                    method="POST"
                    action="?/deleteQuestion"
                    use:enhance={() => {
                      deleting = q.id;
                      return async ({ update }) => { await update(); deleting = null; };
                    }}
                  >
                    <input type="hidden" name="questionId" value={q.id} />
                    <button
                      type="submit"
                      class="delete-btn"
                      aria-label="Delete question"
                      disabled={deleting === q.id}
                    >
                      {#if deleting === q.id}
                        <Loader2 size={13} class="spin" />
                      {:else}
                        <Trash2 size={13} />
                      {/if}
                    </button>
                  </form>
                </div>
              </div>

              <p class="q-body">{q.body}</p>

              {#if q.type === 'mcq'}
                <div class="q-options">
                  {#each q.options as opt}
                    <div class="q-opt" class:is-correct={opt.isCorrect}>
                      <span class="opt-indicator">
                        {#if opt.isCorrect}
                          <Check size={10} strokeWidth={3} />
                        {:else}
                          <span class="opt-dot"></span>
                        {/if}
                      </span>
                      <span class="opt-text">{opt.optionText}</span>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="fitb-answers">
                  {#each q.fitbAnswers as ans}
                    <span class="fitb-ans" class:primary={ans.isPrimary}>
                      {ans.isPrimary ? '✓' : '~'} {ans.acceptedAnswer}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

    </div>
  </div>
</div>

<style>
  .page {
    padding: 1.75rem 2rem 4rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .page-header {
    margin-bottom: 1.25rem;
    padding-bottom: 1.125rem;
    border-bottom: 1px solid var(--color-border);
  }
  .back-link {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.75rem; font-weight: 600; color: var(--lc-600);
    text-decoration: none; margin-bottom: 0.75rem;
    transition: gap 0.12s;
  }
  .back-link:hover { gap: 0.4rem; }
  .page-header-main {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .page-header-main h1 {
    font-size: 1.75rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.2rem; line-height: 1;
  }
  .admin-badge {
    display: inline-flex; align-items: center;
    font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.06em; padding: 0.15rem 0.5rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 0.3rem; vertical-align: middle; margin-left: 0.5rem;
  }
  .page-header-main > div > p {
    font-size: 0.82rem; color: var(--color-muted); margin: 0;
  }
  .header-actions { display: flex; gap: 0.5rem; }

  /* ── Owner banner ────────────────────────────────────────────────────────── */
  .owner-banner {
    display: flex; align-items: center; gap: 1rem;
    padding: 0.875rem 1.125rem; margin-bottom: 1.25rem;
    background: rgba(79, 70, 229, 0.06);
    border: 1px solid rgba(79, 70, 229, 0.18);
    border-radius: 0.875rem;
  }
  .owner-avatar {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--lc-700), var(--lc-600));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 800; color: white;
  }
  .owner-info {
    display: flex; align-items: center; gap: 0.625rem; flex: 1; flex-wrap: wrap;
  }
  .owner-label {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--lc-600);
    background: var(--lc-soft); padding: 0.12rem 0.45rem;
    border-radius: 0.3rem; flex-shrink: 0;
  }
  .owner-name {
    font-size: 0.875rem; font-weight: 700; color: var(--color-text);
  }
  .owner-meta {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.72rem; color: var(--color-muted);
  }
  .owner-right { margin-left: auto; flex-shrink: 0; }

  /* ── Status changer ──────────────────────────────────────────────────────── */
  .status-wrap { position: relative; }
  .status-btn {
    display: inline-flex; align-items: center; gap: 0.45rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--sc) 40%, transparent);
    background: color-mix(in srgb, var(--sc) 10%, transparent);
    border-radius: 999px;
    font-size: 0.75rem; font-weight: 700;
    color: var(--sc); cursor: pointer;
    transition: all 0.15s;
  }
  .status-btn:hover { background: color-mix(in srgb, var(--sc) 18%, transparent); }
  .status-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--sc); flex-shrink: 0;
  }
  .status-dropdown {
    position: absolute; top: calc(100% + 6px); right: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 100; overflow: hidden;
    min-width: 150px;
    animation: dd-in 0.15s ease;
  }
  @keyframes dd-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .status-opt {
    width: 100%; display: flex; align-items: center; gap: 0.5rem;
    padding: 0.55rem 0.875rem;
    background: none; border: none; cursor: pointer;
    font-size: 0.8rem; font-weight: 600; color: var(--sc);
    font-family: inherit; text-align: left;
    transition: background 0.1s;
  }
  .status-opt:hover { background: color-mix(in srgb, var(--sc) 8%, transparent); }
  .status-opt.current { background: color-mix(in srgb, var(--sc) 10%, transparent); }
  .status-opt :global(svg) { margin-left: auto; }

  /* ── Alert ───────────────────────────────────────────────────────────────── */
  .alert-error {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.875rem 1rem; margin-bottom: 1.25rem;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
    border-radius: 0.75rem; font-size: 0.875rem; color: #dc2626;
  }

  /* ── Two-column layout ───────────────────────────────────────────────────── */
  .layout {
    display: grid;
    grid-template-columns: 420px 1fr;
    gap: 1.5rem;
    align-items: start;
  }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }

  .builder-col { display: flex; flex-direction: column; gap: 0; position: sticky; top: 1rem; }
  .list-col { display: flex; flex-direction: column; gap: 1rem; }

  /* ── Tab bar ─────────────────────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem 0.875rem 0 0;
    border-bottom: none;
    overflow: hidden;
  }
  .tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.75rem 0.5rem;
    background: none; border: none; border-right: 1px solid var(--color-border);
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .tab:last-child { border-right: none; }
  .tab:hover { background: var(--color-bg); color: var(--color-text); }
  .tab.active {
    background: var(--lc-soft);
    color: var(--lc-600);
    border-bottom: 2px solid var(--lc-600);
  }
  .tab-import.active {
    background: rgba(234, 179, 8, 0.08);
    color: #92400e;
    border-bottom-color: #ca8a04;
  }

  /* ── Card ────────────────────────────────────────────────────────────────── */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0 0 1rem 1rem;
  }
  .card-header {
    display: flex; align-items: flex-start; gap: 0.75rem;
    padding: 1rem 1.25rem 0.875rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .card-icon {
    width: 32px; height: 32px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--lc-soft); border-radius: 0.5rem;
    color: var(--lc-600);
  }
  .card-header h2 {
    font-size: 0.85rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.15rem;
  }
  .card-header p { font-size: 0.73rem; color: var(--color-muted); margin: 0; }

  .card-body {
    padding: 1.125rem 1.25rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  }

  /* ── Fields ──────────────────────────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .field label {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
    display: flex; align-items: center; gap: 0.3rem;
  }
  .req { color: #ef4444; }
  .opt { font-size: 0.7rem; font-weight: 500; color: var(--color-muted); margin-left: 0.2rem; }
  .field-error { font-size: 0.72rem; color: #dc2626; margin: 0; }

  .field input[type=text],
  .field input[type=number],
  .field textarea {
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
    resize: vertical;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field input:focus,
  .field textarea:focus {
    border-color: var(--lc-600);
    box-shadow: 0 0 0 3px var(--lc-soft);
  }
  .error-input { border-color: #dc2626 !important; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

  .score-input-wrap { position: relative; }
  .score-input-wrap input {
    width: 100%; padding: 0.575rem 2.5rem 0.575rem 0.875rem;
    border: 1px solid var(--color-border); border-radius: 0.6rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 1rem; font-weight: 700;
    font-family: inherit; outline: none; box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .score-input-wrap input:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }
  .score-unit {
    position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
    font-size: 0.72rem; font-weight: 700; color: var(--color-muted); pointer-events: none;
  }

  /* ── Options ─────────────────────────────────────────────────────────────── */
  .options-section { display: flex; flex-direction: column; gap: 0.45rem; }
  .options-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.2rem;
  }
  .options-label { font-size: 0.8rem; font-weight: 600; color: var(--color-text); }
  .options-hint  { font-size: 0.7rem; color: var(--color-muted); }

  .option-row {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.55rem;
    background: var(--color-bg);
    transition: border-color 0.15s, background 0.15s;
  }
  .option-row.correct {
    border-color: #16a34a;
    background: rgba(34, 197, 94, 0.04);
  }

  .correct-toggle {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    border: 1.5px solid var(--color-border);
    background: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: transparent; transition: all 0.15s;
  }
  .correct-toggle.active {
    background: #16a34a; border-color: #16a34a; color: white;
  }
  .correct-toggle:hover:not(.active) { border-color: #16a34a; }

  .option-input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 0.83rem; color: var(--color-text); font-family: inherit;
    min-width: 0;
  }
  .option-input::placeholder { color: var(--color-muted); }

  .remove-opt {
    width: 22px; height: 22px; border-radius: 0.35rem; flex-shrink: 0;
    border: none; background: none; cursor: pointer;
    color: var(--color-muted); display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .remove-opt:hover:not(:disabled) { background: rgba(220,38,38,0.1); color: #dc2626; }
  .remove-opt:disabled { opacity: 0.3; cursor: not-allowed; }

  .add-option-btn {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.45rem 0.75rem; margin-top: 0.2rem;
    border: 1.5px dashed var(--color-border);
    border-radius: 0.5rem;
    background: none; color: var(--color-muted);
    font-size: 0.78rem; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: all 0.15s; align-self: flex-start;
  }
  .add-option-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }

  .primary-badge, .alt-badge {
    font-size: 0.6rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.04em; padding: 0.1rem 0.35rem;
    border-radius: 0.3rem; flex-shrink: 0; white-space: nowrap;
  }
  .primary-badge { background: #dcfce7; color: #16a34a; }
  .alt-badge     { background: var(--color-border); color: var(--color-muted); }

  /* ── Import ──────────────────────────────────────────────────────────────── */
  .import-format { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.625rem; overflow: hidden; }
  .format-title { font-size: 0.72rem; font-weight: 700; color: var(--color-muted); padding: 0.5rem 0.75rem; margin: 0; border-bottom: 1px solid var(--color-border); }
  .format-pre {
    font-size: 0.72rem; color: var(--color-muted); padding: 0.75rem;
    margin: 0; overflow-x: auto; font-family: 'SF Mono', 'Fira Code', monospace;
    line-height: 1.6; white-space: pre;
  }
  .import-success {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    background: #dcfce7; border-radius: 0.5rem;
    font-size: 0.8rem; font-weight: 600; color: #16a34a;
  }

  /* ── Stats strip ─────────────────────────────────────────────────────────── */
  .stats-strip {
    display: flex; align-items: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    padding: 0 0.5rem;
    overflow-x: auto;
  }
  .stat {
    display: flex; flex-direction: column; align-items: center;
    padding: 0.875rem 1.25rem; flex: 1; min-width: 60px;
  }
  .stat-n { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: var(--color-text); }
  .stat-l { font-size: 0.6rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.2rem; }
  .stat-sep { width: 1px; height: 28px; background: var(--color-border); flex-shrink: 0; }

  .marks-warn {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 0.625rem;
    font-size: 0.78rem; color: #92400e;
  }
  :global(.dark) .marks-warn { color: #fcd34d; }

  /* ── Empty state ─────────────────────────────────────────────────────────── */
  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 3rem 2rem; text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem; color: var(--color-muted);
  }
  .empty-icon {
    width: 60px; height: 60px; border-radius: 50%;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    opacity: 0.5;
  }
  .empty-title { font-size: 0.925rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .empty-sub { font-size: 0.8rem; max-width: 280px; line-height: 1.65; margin: 0; }

  /* ── Question cards ──────────────────────────────────────────────────────── */
  .question-list { display: flex; flex-direction: column; gap: 0.75rem; }

  .q-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.875rem;
    overflow: hidden;
    transition: box-shadow 0.15s;
  }
  .q-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .q-card.mcq { border-left: 3px solid var(--lc-600); }
  .q-card.fitb { border-left: 3px solid #16a34a; }

  .q-card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1rem 0.5rem;
    gap: 0.5rem;
  }
  .q-meta { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }

  .q-num {
    font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
  }
  .q-type-badge {
    font-size: 0.6rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.04em; padding: 0.1rem 0.4rem;
    background: var(--lc-soft); color: var(--lc-600);
    border-radius: 0.3rem;
  }
  .q-type-badge.fitb-badge { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
  .q-topic {
    display: inline-flex; align-items: center; gap: 0.2rem;
    font-size: 0.65rem; color: var(--color-muted);
    padding: 0.1rem 0.4rem;
    background: var(--color-bg); border-radius: 0.3rem;
    border: 1px solid var(--color-border);
  }

  .q-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  .q-marks {
    font-size: 0.72rem; font-weight: 700;
    padding: 0.15rem 0.5rem;
    background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 999px; color: var(--color-muted);
  }

  .delete-btn {
    width: 26px; height: 26px; border-radius: 0.4rem;
    border: 1px solid transparent; background: none;
    cursor: pointer; color: var(--color-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .delete-btn:hover:not(:disabled) { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.2); color: #dc2626; }
  .delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .q-body {
    padding: 0 1rem 0.75rem;
    font-size: 0.875rem; font-weight: 500; color: var(--color-text);
    line-height: 1.55; margin: 0;
  }

  .q-options { display: flex; flex-direction: column; gap: 0.3rem; padding: 0 1rem 0.875rem; }
  .q-opt {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.35rem 0.6rem;
    border-radius: 0.4rem;
    background: var(--color-bg);
    font-size: 0.8rem; color: var(--color-muted);
  }
  .q-opt.is-correct {
    background: rgba(34, 197, 94, 0.06);
    color: #15803d;
    font-weight: 600;
  }
  :global(.dark) .q-opt.is-correct { color: #4ade80; }

  .opt-indicator {
    width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-border);
  }
  .q-opt.is-correct .opt-indicator { background: #16a34a; color: white; }
  .opt-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-muted); }
  .opt-text { flex: 1; }

  .fitb-answers { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0 1rem 0.875rem; }
  .fitb-ans {
    display: inline-flex;
    font-size: 0.75rem; font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .fitb-ans.primary {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.3);
    color: #15803d;
  }
  :global(.dark) .fitb-ans.primary { color: #4ade80; }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 0.4rem; padding: 0.625rem 1.125rem;
    border-radius: 0.65rem;
    font-size: 0.83rem; font-weight: 700;
    cursor: pointer; transition: all 0.15s;
    text-decoration: none; font-family: inherit;
    white-space: nowrap;
  }
  .btn.primary {
    background: var(--lc-600); border: 1px solid var(--lc-600); color: white;
  }
  .btn.primary:hover { background: var(--lc-700); border-color: var(--lc-700); }
  .btn.primary:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn.ghost {
    background: transparent; border: 1px solid var(--color-border); color: var(--color-text);
  }
  .btn.ghost:hover { border-color: var(--lc-600); color: var(--lc-600); }
  .btn.full { width: 100%; }

  :global(.spin) { animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  :global(.dark) .q-card { box-shadow: none; }
  :global(.dark) .dd-panel { box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
</style>