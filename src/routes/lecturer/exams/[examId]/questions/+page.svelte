<!-- src/routes/lecturer/exams/[examId]/questions/+page.svelte -->
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { flip } from 'svelte/animate';
  import { fly, fade, scale } from 'svelte/transition';
  import { cubicOut, quintOut } from 'svelte/easing';
  import {
    ChevronLeft, Plus, Trash2, Pencil, GripVertical,
    CheckCircle2, Circle, AlertCircle, X, Check,
    Upload, ChevronDown, BookOpen, Layers, ToggleLeft,
    List, Info
  } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // ── Reactive exam + question list ──────────────────────────────────────────
  let questions = $state(data.questions);
  let marksAllocated = $derived(questions.reduce((s, q) => s + q.marks, 0));

  // Keep in sync with server re-loads
  $effect(() => { questions = data.questions; });

  // ── UI state ───────────────────────────────────────────────────────────────
  type Modal = 'add_mcq' | 'add_tf' | 'edit' | 'delete' | 'bulk' | null;
  let openModal = $state<Modal>(null);
  let editingQuestion = $state<typeof questions[0] | null>(null);
  let deletingId = $state<string | null>(null);
  let toastMsg = $state<{ text: string; ok: boolean } | null>(null);
  let submitting = $state(false);

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(text: string, ok = true) {
    toastMsg = { text, ok };
    setTimeout(() => (toastMsg = null), 3000);
  }

  $effect(() => {
    if (form?.success) {
      const msgs: Record<string, string> = {
        add_mcq:        'MCQ question added',
        add_truefalse:  'True/False question added',
        edit_question:  'Question updated',
        delete_question:'Question deleted',
        reorder:        'Order saved',
        bulk_import:    `${(form as any).count ?? 'N'} questions imported`,
      };
      showToast(msgs[(form as any).action] ?? 'Saved');
      openModal = null;
    }
    if (form?.error) showToast(form.error as string, false);
  });

  // ── MCQ form state ─────────────────────────────────────────────────────────
  let mcqBody      = $state('');
  let mcqTopic     = $state('');
  let mcqMarks     = $state(1);
  let mcqOptions   = $state(['', '', '', '']);
  let mcqCorrect   = $state(0);

  function addOption()    { if (mcqOptions.length < 6) mcqOptions = [...mcqOptions, '']; }
  function removeOption(i: number) {
    if (mcqOptions.length <= 2) return;
    mcqOptions = mcqOptions.filter((_, idx) => idx !== i);
    if (mcqCorrect >= mcqOptions.length) mcqCorrect = mcqOptions.length - 1;
  }

  // ── True/False form state ──────────────────────────────────────────────────
  let tfBody       = $state('');
  let tfTopic      = $state('');
  let tfMarks      = $state(1);
  let tfCorrect    = $state<'true' | 'false'>('true');

  // ── Edit form state ────────────────────────────────────────────────────────
  let editBody     = $state('');
  let editTopic    = $state('');
  let editMarks    = $state(1);
  let editOptions  = $state<string[]>([]);
  let editCorrect  = $state(0);
  let editTFAnswer = $state<'true' | 'false'>('true');

  const editIsTF = $derived(
    editingQuestion !== null &&
    editingQuestion.options.length === 2 &&
    editingQuestion.options.some(o => o.optionText === 'True') &&
    editingQuestion.options.some(o => o.optionText === 'False')
  );

  function openEdit(q: typeof questions[0]) {
    editingQuestion = q;
    editBody  = q.body;
    editTopic = q.topic ?? '';
    editMarks = q.marks;
    if (
      q.options.length === 2 &&
      q.options.some(o => o.optionText === 'True') &&
      q.options.some(o => o.optionText === 'False')
    ) {
      const correct = q.options.find(o => o.isCorrect);
      editTFAnswer = (correct?.optionText?.toLowerCase() ?? 'true') as 'true' | 'false';
    } else {
      editOptions = q.options.map(o => o.optionText);
      editCorrect = q.options.findIndex(o => o.isCorrect);
      if (editCorrect < 0) editCorrect = 0;
    }
    openModal = 'edit';
  }

  function openDelete(id: string) {
    deletingId = id;
    openModal = 'delete';
  }

  function resetAdd() {
    mcqBody = ''; mcqTopic = ''; mcqMarks = 1;
    mcqOptions = ['', '', '', '']; mcqCorrect = 0;
  }

  function resetTF() {
    tfBody = ''; tfTopic = ''; tfMarks = 1; tfCorrect = 'true';
  }

  // ── Bulk import ────────────────────────────────────────────────────────────
  let bulkJson = $state('');
  const BULK_EXAMPLE = JSON.stringify([
    { type: 'mcq', body: 'What is photosynthesis?', topic: 'Biology', marks: 2,
      options: ['Energy from light', 'Cell division', 'Protein synthesis', 'Respiration'],
      correctIndex: 0 },
    { type: 'truefalse', body: 'The Earth is the 3rd planet from the Sun.', marks: 1, correctAnswer: 'true' }
  ], null, 2);

  // ── Drag-and-drop reorder ──────────────────────────────────────────────────
  let dragSrc = $state<number | null>(null);
  let dragOver = $state<number | null>(null);

  function onDragStart(i: number) { dragSrc = i; }
  function onDragEnter(i: number) { dragOver = i; }
  function onDragEnd()  { dragSrc = null; dragOver = null; }

  function onDrop(i: number) {
    if (dragSrc === null || dragSrc === i) return;
    const next = [...questions];
    const [moved] = next.splice(dragSrc, 1);
    next.splice(i, 0, moved);
    questions = next;
    dragSrc = null; dragOver = null;
    // Submit reorder silently — form submit programmatically
    reorderForm?.requestSubmit();
  }

  let reorderForm = $state<HTMLFormElement | null>(null);
  const reorderIds = $derived(questions.map(q => q.id).join(','));

  const editable = $derived(
    data.exam.status !== 'completed' && data.exam.status !== 'cancelled'
  );

  // Label helper
  function qLabel(q: typeof questions[0]) {
    const isTF =
      q.options.length === 2 &&
      q.options.some(o => o.optionText === 'True') &&
      q.options.some(o => o.optionText === 'False');
    return isTF ? 'T/F' : 'MCQ';
  }

  function correctText(q: typeof questions[0]) {
    return q.options.find(o => o.isCorrect)?.optionText ?? '—';
  }
</script>

<svelte:head><title>Question Builder — {data.exam.title}</title></svelte:head>

<!-- ── Toast ─────────────────────────────────────────────────────────────── -->
{#if toastMsg}
  <div
    class="toast"
    class:toast-ok={toastMsg.ok}
    class:toast-err={!toastMsg.ok}
    transition:fly={{ y: -20, duration: 280, easing: quintOut }}
  >
    {#if toastMsg.ok}
      <CheckCircle2 size={14} />
    {:else}
      <AlertCircle size={14} />
    {/if}
    {toastMsg.text}
  </div>
{/if}

<!-- ── Hidden reorder form ────────────────────────────────────────────────── -->
<form
  method="POST"
  action="?/reorder"
  use:enhance={() => { submitting = true; return async ({ update }) => { submitting = false; await update({ reset: false }); }; }}
  bind:this={reorderForm}
  style="display:none"
>
  <input type="hidden" name="order" value={reorderIds} />
</form>

<div class="page">

  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <header class="page-header">
    <div class="header-top">
      <a href="/lecturer/exams/{data.exam.id}" class="back-link">
        <ChevronLeft size={14} strokeWidth={2.5} /> Back to Exam
      </a>
    </div>
    <div class="header-main">
      <div class="header-info">
        <div class="exam-chip">
          <BookOpen size={13} />
          {data.exam.course?.code} — {data.exam.course?.title}
        </div>
        <h1>{data.exam.title}</h1>
        <div class="marks-bar">
          <span class="marks-label">
            <Layers size={12} />
            {questions.length} question{questions.length !== 1 ? 's' : ''} ·
            {marksAllocated} / {data.exam.totalMarks} marks allocated
          </span>
          {#if data.exam.questionsToPresent > 0}
            <span class="qtp-badge">
              {data.exam.questionsToPresent} shown per student
            </span>
          {/if}
        </div>
        <!-- Marks progress bar -->
        <div class="marks-track">
          <div
            class="marks-fill"
            class:marks-over={marksAllocated > data.exam.totalMarks}
            style="width: {Math.min(100, (marksAllocated / data.exam.totalMarks) * 100)}%"
          ></div>
        </div>
        {#if marksAllocated > data.exam.totalMarks}
          <p class="marks-warn">
            <AlertCircle size={12} />
            Marks allocated exceed total marks by {marksAllocated - data.exam.totalMarks}
          </p>
        {/if}
      </div>

      {#if editable}
        <div class="header-actions">
          <button class="btn ghost" onclick={() => openModal = 'bulk'}>
            <Upload size={14} /> Bulk import
          </button>
          <button class="btn secondary" onclick={() => { resetTF(); openModal = 'add_tf'; }}>
            <ToggleLeft size={14} /> True/False
          </button>
          <button class="btn primary" onclick={() => { resetAdd(); openModal = 'add_mcq'; }}>
            <Plus size={14} /> Add MCQ
          </button>
        </div>
      {/if}
    </div>
  </header>

  <!-- ── Empty state ─────────────────────────────────────────────────────── -->
  {#if questions.length === 0}
    <div class="empty" in:scale={{ duration: 280, easing: cubicOut, start: 0.96 }}>
      <div class="empty-icon"><List size={32} /></div>
      <p class="empty-title">No questions yet</p>
      <p class="empty-sub">Add your first MCQ or True/False question to get started.</p>
      {#if editable}
        <div class="empty-actions">
          <button class="btn secondary" onclick={() => { resetTF(); openModal = 'add_tf'; }}>
            <ToggleLeft size={14} /> True/False
          </button>
          <button class="btn primary" onclick={() => { resetAdd(); openModal = 'add_mcq'; }}>
            <Plus size={14} /> Add MCQ
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- ── Question list ─────────────────────────────────────────────────── -->
    <ol class="q-list">
      {#each questions as q, i (q.id)}
        <li
          class="q-card"
          class:drag-over={dragOver === i}
          animate:flip={{ duration: 260, easing: cubicOut }}
          in:fly={{ y: 6, duration: 200, delay: Math.min(i * 20, 160), easing: cubicOut }}
          draggable={editable}
          ondragstart={() => onDragStart(i)}
          ondragenter={() => onDragEnter(i)}
          ondragleave={() => { if (dragOver === i) dragOver = null; }}
          ondragover={(e) => e.preventDefault()}
          ondragend={onDragEnd}
          ondrop={() => onDrop(i)}
        >
          <div class="q-left">
            {#if editable}
              <div class="q-grip" title="Drag to reorder">
                <GripVertical size={14} strokeWidth={2} />
              </div>
            {/if}
            <span class="q-num">{i + 1}</span>
            <span class="q-type-badge" class:tf={qLabel(q) === 'T/F'}>
              {qLabel(q)}
            </span>
          </div>

          <div class="q-body">
            <p class="q-text">{q.body}</p>
            {#if q.topic}
              <span class="q-topic">{q.topic}</span>
            {/if}
            <div class="q-options">
              {#each q.options as opt}
                <span class="q-opt" class:correct={opt.isCorrect}>
                  {#if opt.isCorrect}
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                  {:else}
                    <Circle size={11} strokeWidth={1.5} />
                  {/if}
                  {opt.optionText}
                </span>
              {/each}
            </div>
          </div>

          <div class="q-right">
            <span class="q-marks">{q.marks} pt{q.marks !== 1 ? 's' : ''}</span>
            {#if editable}
              <div class="q-actions">
                <button class="icon-btn edit" onclick={() => openEdit(q)} title="Edit">
                  <Pencil size={13} strokeWidth={2} />
                </button>
                <button class="icon-btn del" onclick={() => openDelete(q.id)} title="Delete">
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            {/if}
          </div>
        </li>
      {/each}
    </ol>

    <!-- Drag hint -->
    {#if editable && questions.length > 1}
      <p class="drag-hint">
        <GripVertical size={12} /> Drag questions to reorder — saved automatically
      </p>
    {/if}
  {/if}
</div>

<!-- ══════════════════════════════════════════════════════════════════════════
     MODALS
══════════════════════════════════════════════════════════════════════════ -->

{#if openModal !== null}
  <!-- Backdrop -->
  <div
    class="backdrop"
    transition:fade={{ duration: 180 }}
    onclick={() => openModal = null}
    role="presentation"
  ></div>

  <!-- ── Add MCQ ─────────────────────────────────────────────────────────── -->
  {#if openModal === 'add_mcq'}
    <div class="modal" transition:fly={{ y: 24, duration: 260, easing: cubicOut }} role="dialog" aria-modal="true" aria-label="Add MCQ">
      <div class="modal-header">
        <h2><Plus size={16} /> Add MCQ Question</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <form
        method="POST"
        action="?/add_mcq"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => { submitting = false; await update({ reset: false }); };
        }}
        class="modal-body"
      >
        <div class="field">
          <label for="mcq-body">Question <span class="req">*</span></label>
          <textarea id="mcq-body" name="body" rows="3" bind:value={mcqBody} placeholder="Enter the question…" required></textarea>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="mcq-topic">Topic <span class="opt">optional</span></label>
            <input id="mcq-topic" name="topic" type="text" bind:value={mcqTopic} placeholder="e.g. Thermodynamics" />
          </div>
          <div class="field narrow">
            <label for="mcq-marks">Marks <span class="req">*</span></label>
            <input id="mcq-marks" name="marks" type="number" bind:value={mcqMarks} min="1" max="100" />
          </div>
        </div>

        <div class="options-section">
          <div class="options-header">
            <span class="options-label">Options <span class="req">*</span></span>
            <span class="options-hint">Click the radio to mark the correct answer</span>
          </div>
          {#each mcqOptions as opt, i (i)}
            <div class="option-row" in:fly={{ x: -8, duration: 160 }}>
              <button
                type="button"
                class="radio-btn"
                class:selected={mcqCorrect === i}
                onclick={() => mcqCorrect = i}
                title="Mark as correct"
              >
                {#if mcqCorrect === i}
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                {:else}
                  <Circle size={16} strokeWidth={1.5} />
                {/if}
              </button>
              <input
                type="text"
                name="option_{i}"
                bind:value={mcqOptions[i]}
                placeholder="Option {String.fromCharCode(65 + i)}"
                class:correct-opt={mcqCorrect === i}
                required
              />
              {#if mcqOptions.length > 2}
                <button type="button" class="opt-remove" onclick={() => removeOption(i)}>
                  <X size={12} strokeWidth={2.5} />
                </button>
              {/if}
            </div>
          {/each}

          {#if mcqOptions.length < 6}
            <button type="button" class="add-opt-btn" onclick={addOption}>
              <Plus size={13} /> Add option
            </button>
          {/if}
        </div>

        <!-- Hidden correct index -->
        <input type="hidden" name="correctOption" value={mcqCorrect} />

        {#if form?.error && openModal === 'add_mcq'}
          <p class="form-error"><AlertCircle size={13} /> {form.error}</p>
        {/if}

        <div class="modal-footer">
          <button type="button" class="btn ghost" onclick={() => openModal = null}>Cancel</button>
          <button type="submit" class="btn primary" disabled={submitting}>
            {#if submitting}<span class="spinner"></span>{/if}
            Add Question
          </button>
        </div>
      </form>
    </div>

  <!-- ── Add True/False ──────────────────────────────────────────────────── -->
  {:else if openModal === 'add_tf'}
    <div class="modal" transition:fly={{ y: 24, duration: 260, easing: cubicOut }} role="dialog" aria-modal="true" aria-label="Add True/False">
      <div class="modal-header">
        <h2><ToggleLeft size={16} /> Add True/False Question</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <form
        method="POST"
        action="?/add_truefalse"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => { submitting = false; await update({ reset: false }); };
        }}
        class="modal-body"
      >
        <div class="field">
          <label for="tf-body">Statement <span class="req">*</span></label>
          <textarea id="tf-body" name="body" rows="3" bind:value={tfBody} placeholder="Enter a true or false statement…" required></textarea>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="tf-topic">Topic <span class="opt">optional</span></label>
            <input id="tf-topic" name="topic" type="text" bind:value={tfTopic} placeholder="e.g. Biology" />
          </div>
          <div class="field narrow">
            <label for="tf-marks">Marks</label>
            <input id="tf-marks" name="marks" type="number" bind:value={tfMarks} min="1" max="100" />
          </div>
        </div>

        <div class="tf-choice">
          <span class="options-label">Correct Answer <span class="req">*</span></span>
          <div class="tf-buttons">
            <button
              type="button"
              class="tf-btn"
              class:selected={tfCorrect === 'true'}
              onclick={() => tfCorrect = 'true'}
            >
              <CheckCircle2 size={15} /> True
            </button>
            <button
              type="button"
              class="tf-btn tf-false"
              class:selected={tfCorrect === 'false'}
              onclick={() => tfCorrect = 'false'}
            >
              <X size={15} /> False
            </button>
          </div>
        </div>

        <input type="hidden" name="correctAnswer" value={tfCorrect} />

        {#if form?.error && openModal === 'add_tf'}
          <p class="form-error"><AlertCircle size={13} /> {form.error}</p>
        {/if}

        <div class="modal-footer">
          <button type="button" class="btn ghost" onclick={() => openModal = null}>Cancel</button>
          <button type="submit" class="btn primary" disabled={submitting}>
            {#if submitting}<span class="spinner"></span>{/if}
            Add Question
          </button>
        </div>
      </form>
    </div>

  <!-- ── Edit question ───────────────────────────────────────────────────── -->
  {:else if openModal === 'edit' && editingQuestion}
    <div class="modal" transition:fly={{ y: 24, duration: 260, easing: cubicOut }} role="dialog" aria-modal="true" aria-label="Edit question">
      <div class="modal-header">
        <h2><Pencil size={16} /> Edit {editIsTF ? 'True/False' : 'MCQ'} Question</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <form
        method="POST"
        action="?/edit_question"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => { submitting = false; await update({ reset: false }); };
        }}
        class="modal-body"
      >
        <input type="hidden" name="questionId" value={editingQuestion.id} />

        <div class="field">
          <label for="edit-body">{editIsTF ? 'Statement' : 'Question'} <span class="req">*</span></label>
          <textarea id="edit-body" name="body" rows="3" bind:value={editBody} required></textarea>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="edit-topic">Topic <span class="opt">optional</span></label>
            <input id="edit-topic" name="topic" type="text" bind:value={editTopic} />
          </div>
          <div class="field narrow">
            <label for="edit-marks">Marks</label>
            <input id="edit-marks" name="marks" type="number" bind:value={editMarks} min="1" max="100" />
          </div>
        </div>

        {#if editIsTF}
          <div class="tf-choice">
            <span class="options-label">Correct Answer <span class="req">*</span></span>
            <div class="tf-buttons">
              <button type="button" class="tf-btn" class:selected={editTFAnswer === 'true'} onclick={() => editTFAnswer = 'true'}>
                <CheckCircle2 size={15} /> True
              </button>
              <button type="button" class="tf-btn tf-false" class:selected={editTFAnswer === 'false'} onclick={() => editTFAnswer = 'false'}>
                <X size={15} /> False
              </button>
            </div>
          </div>
          <input type="hidden" name="correctAnswer" value={editTFAnswer} />
        {:else}
          <div class="options-section">
            <div class="options-header">
              <span class="options-label">Options <span class="req">*</span></span>
              <span class="options-hint">Click the radio to mark the correct answer</span>
            </div>
            {#each editOptions as opt, i (i)}
              <div class="option-row">
                <button
                  type="button"
                  class="radio-btn"
                  class:selected={editCorrect === i}
                  onclick={() => editCorrect = i}
                >
                  {#if editCorrect === i}
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                  {:else}
                    <Circle size={16} strokeWidth={1.5} />
                  {/if}
                </button>
                <input
                  type="text"
                  name="option_{i}"
                  bind:value={editOptions[i]}
                  class:correct-opt={editCorrect === i}
                  required
                />
                {#if editOptions.length > 2}
                  <button type="button" class="opt-remove" onclick={() => {
                    editOptions = editOptions.filter((_, idx) => idx !== i);
                    if (editCorrect >= editOptions.length) editCorrect = editOptions.length - 1;
                  }}>
                    <X size={12} strokeWidth={2.5} />
                  </button>
                {/if}
              </div>
            {/each}
            {#if editOptions.length < 6}
              <button type="button" class="add-opt-btn" onclick={() => editOptions = [...editOptions, '']}>
                <Plus size={13} /> Add option
              </button>
            {/if}
            <input type="hidden" name="correctOption" value={editCorrect} />
          </div>
        {/if}

        {#if form?.error && openModal === 'edit'}
          <p class="form-error"><AlertCircle size={13} /> {form.error}</p>
        {/if}

        <div class="modal-footer">
          <button type="button" class="btn ghost" onclick={() => openModal = null}>Cancel</button>
          <button type="submit" class="btn primary" disabled={submitting}>
            {#if submitting}<span class="spinner"></span>{/if}
            Save Changes
          </button>
        </div>
      </form>
    </div>

  <!-- ── Delete confirm ──────────────────────────────────────────────────── -->
  {:else if openModal === 'delete' && deletingId}
    <div class="modal modal-sm" transition:scale={{ duration: 200, easing: cubicOut, start: 0.95 }} role="dialog" aria-modal="true" aria-label="Confirm delete">
      <div class="modal-header">
        <h2><Trash2 size={16} /> Delete Question</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <div class="modal-body">
        <p class="delete-confirm-text">
          This will permanently remove the question and all its options.
          Any student answers linked to it will also be deleted. This cannot be undone.
        </p>
        <form
          method="POST"
          action="?/delete_question"
          use:enhance={() => {
            submitting = true;
            return async ({ update }) => { submitting = false; await update({ reset: false }); };
          }}
        >
          <input type="hidden" name="questionId" value={deletingId} />
          <div class="modal-footer">
            <button type="button" class="btn ghost" onclick={() => openModal = null}>Cancel</button>
            <button type="submit" class="btn danger" disabled={submitting}>
              {#if submitting}<span class="spinner"></span>{/if}
              Delete Question
            </button>
          </div>
        </form>
      </div>
    </div>

  <!-- ── Bulk import ─────────────────────────────────────────────────────── -->
  {:else if openModal === 'bulk'}
    <div class="modal modal-wide" transition:fly={{ y: 24, duration: 260, easing: cubicOut }} role="dialog" aria-modal="true" aria-label="Bulk import">
      <div class="modal-header">
        <h2><Upload size={16} /> Bulk Import Questions</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <form
        method="POST"
        action="?/bulk_import"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => { submitting = false; await update({ reset: false }); };
        }}
        class="modal-body"
      >
        <div class="bulk-info">
          <Info size={13} />
          <span>Paste a JSON array of question objects. Supported types: <code>mcq</code>, <code>truefalse</code>.</span>
        </div>

        <div class="field">
          <label for="bulk-json">JSON <span class="req">*</span></label>
          <textarea
            id="bulk-json"
            name="json"
            rows="14"
            bind:value={bulkJson}
            placeholder={BULK_EXAMPLE}
            class="code-area"
            required
            spellcheck="false"
          ></textarea>
        </div>

        <details class="bulk-schema">
          <summary>Schema reference</summary>
          <pre class="schema-pre">{`[
  // MCQ
  {
    "type": "mcq",
    "body": "Question text",       // required
    "topic": "Algebra",            // optional
    "marks": 2,                    // optional, default 1
    "options": ["A", "B", "C", "D"], // required, min 2
    "correctIndex": 0              // required, 0-based
  },
  // True/False
  {
    "type": "truefalse",
    "body": "Statement",           // required
    "topic": "Biology",            // optional
    "marks": 1,                    // optional, default 1
    "correctAnswer": "true"        // required: "true" | "false"
  }
]`}</pre>
        </details>

        {#if form?.error && openModal === 'bulk'}
          <p class="form-error"><AlertCircle size={13} /> {form.error}</p>
        {/if}

        <div class="modal-footer">
          <button type="button" class="btn ghost" onclick={() => openModal = null}>Cancel</button>
          <button type="submit" class="btn primary" disabled={submitting}>
            {#if submitting}<span class="spinner"></span>{/if}
            Import Questions
          </button>
        </div>
      </form>
    </div>
  {/if}
{/if}

<style>
  /* ── Page shell ─────────────────────────────────────────────────────────── */
  .page {
    max-width: 860px;
    margin: 0 auto;
    padding: 1.75rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  .toast {
    position: fixed;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    box-shadow: 0 4px 16px rgba(0,0,0,0.14);
    pointer-events: none;
  }
  .toast-ok  { background: var(--lc-600, #4f46e5); color: #fff; }
  .toast-err { background: #ef4444; color: #fff; }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--lc-600, #4f46e5);
    text-decoration: none;
    transition: gap 0.12s;
  }
  .back-link:hover { gap: 0.4rem; }

  .header-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
  }

  .exam-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.08));
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    margin-bottom: 0.4rem;
  }

  h1 {
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--color-text);
    margin: 0 0 0.5rem;
    line-height: 1.1;
  }

  .marks-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .marks-label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .qtp-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
  }

  .marks-track {
    height: 4px;
    background: var(--color-border);
    border-radius: 99px;
    overflow: hidden;
    width: 200px;
    max-width: 100%;
  }

  .marks-fill {
    height: 100%;
    background: var(--lc-600, #4f46e5);
    border-radius: 99px;
    transition: width 0.3s ease;
  }

  .marks-fill.marks-over { background: #ef4444; }

  .marks-warn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: #ef4444;
    font-weight: 600;
    margin: 0.25rem 0 0;
  }

  .header-actions {
    display: flex;
    gap: 0.625rem;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.55rem 1rem;
    border-radius: 0.6rem;
    font-size: 0.8rem;
    font-weight: 700;
    border: 1.5px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    font-family: inherit;
    text-decoration: none;
  }
  .btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
  .btn:active { transform: none; }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

  .btn.primary {
    background: var(--lc-600, #4f46e5);
    border-color: var(--lc-600, #4f46e5);
    color: #fff;
  }
  .btn.primary:hover { background: var(--lc-700, #4338ca); border-color: var(--lc-700, #4338ca); }

  .btn.secondary {
    border-color: var(--lc-600, #4f46e5);
    color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.06));
  }
  .btn.secondary:hover { background: var(--lc-soft, rgba(79,70,229,0.12)); }

  .btn.ghost { color: var(--color-muted); }
  .btn.ghost:hover { border-color: var(--color-text); color: var(--color-text); }

  .btn.danger {
    color: #ef4444;
    border-color: rgba(239,68,68,0.25);
    background: rgba(239,68,68,0.06);
  }
  .btn.danger:hover { background: rgba(239,68,68,0.12); }

  /* ── Empty state ─────────────────────────────────────────────────────────── */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 5rem 2rem;
    text-align: center;
    color: var(--color-muted);
    border: 2px dashed var(--color-border);
    border-radius: 1rem;
  }
  .empty-icon {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--color-surface);
    display: flex; align-items: center; justify-content: center;
    color: var(--lc-600, #4f46e5);
    margin-bottom: 0.25rem;
  }
  .empty-title { font-size: 1.1rem; font-weight: 800; color: var(--color-text); margin: 0; }
  .empty-sub   { font-size: 0.875rem; margin: 0; }
  .empty-actions { display: flex; gap: 0.625rem; margin-top: 0.25rem; }

  /* ── Question list ───────────────────────────────────────────────────────── */
  .q-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    counter-reset: q;
  }

  .q-card {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 1rem 1rem 1rem 0.75rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.875rem;
    background: var(--color-surface);
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    cursor: default;
  }

  .q-card[draggable=true] { cursor: grab; }
  .q-card[draggable=true]:active { cursor: grabbing; }

  .q-card:hover { border-color: var(--lc-600, #4f46e5); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .q-card.drag-over { border-color: var(--lc-600, #4f46e5); background: var(--lc-soft, rgba(79,70,229,0.05)); box-shadow: 0 0 0 3px var(--lc-soft, rgba(79,70,229,0.1)); }

  .q-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    padding-top: 0.1rem;
  }

  .q-grip {
    color: var(--color-muted);
    opacity: 0.4;
    transition: opacity 0.15s;
    display: flex;
  }
  .q-card:hover .q-grip { opacity: 0.9; }

  .q-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--color-muted);
    flex-shrink: 0;
  }

  .q-type-badge {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.45rem;
    border-radius: 0.3rem;
    background: var(--lc-soft, rgba(79,70,229,0.08));
    color: var(--lc-600, #4f46e5);
    white-space: nowrap;
  }

  .q-type-badge.tf {
    background: rgba(245,158,11,0.1);
    color: #d97706;
  }

  .q-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .q-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
    line-height: 1.5;
  }

  .q-topic {
    font-size: 0.7rem;
    color: var(--lc-600, #4f46e5);
    background: var(--lc-soft, rgba(79,70,229,0.06));
    padding: 0.1rem 0.45rem;
    border-radius: 0.3rem;
    width: fit-content;
    font-weight: 600;
  }

  .q-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.5rem;
    margin-top: 0.1rem;
  }

  .q-opt {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.775rem;
    color: var(--color-muted);
    padding: 0.15rem 0.5rem 0.15rem 0.35rem;
    border-radius: 0.375rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    transition: all 0.12s;
  }

  .q-opt.correct {
    border-color: rgba(22,163,74,0.35);
    background: rgba(22,163,74,0.07);
    color: #15803d;
    font-weight: 700;
  }

  .q-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .q-marks {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--lc-600, #4f46e5);
    white-space: nowrap;
  }

  .q-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .q-card:hover .q-actions { opacity: 1; }

  .icon-btn {
    width: 28px; height: 28px;
    border-radius: 0.375rem;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.15s;
    padding: 0;
  }
  .icon-btn:hover { transform: scale(1.05); }
  .icon-btn.edit:hover  { border-color: var(--lc-600, #4f46e5); color: var(--lc-600, #4f46e5); background: var(--lc-soft, rgba(79,70,229,0.06)); }
  .icon-btn.del:hover   { border-color: rgba(239,68,68,0.4); color: #ef4444; background: rgba(239,68,68,0.06); }

  .drag-hint {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: var(--color-muted);
    opacity: 0.7;
    margin: 0;
    padding: 0 0.25rem;
  }

  /* ── Backdrop + modal ────────────────────────────────────────────────────── */
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 200;
    backdrop-filter: blur(2px);
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 201;
    width: min(580px, calc(100vw - 2rem));
    max-height: calc(100vh - 3rem);
    overflow-y: auto;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: 1.25rem;
    box-shadow: 0 24px 60px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
  }

  .modal-sm  { width: min(420px, calc(100vw - 2rem)); }
  .modal-wide { width: min(720px, calc(100vw - 2rem)); }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1.5px solid var(--color-border);
    position: sticky;
    top: 0;
    background: var(--color-bg);
    z-index: 1;
    border-radius: 1.25rem 1.25rem 0 0;
  }

  .modal-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }

  .modal-close {
    width: 30px; height: 30px;
    border-radius: 0.5rem;
    border: 1.5px solid var(--color-border);
    background: var(--color-surface);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.15s;
    padding: 0;
  }
  .modal-close:hover { color: var(--color-text); border-color: var(--color-text); }

  .modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .modal-footer {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
    padding-top: 0.5rem;
  }

  /* ── Form fields ─────────────────────────────────────────────────────────── */
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
  }

  .field.narrow { max-width: 100px; flex: none; }

  .field label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .req  { color: #ef4444; }
  .opt  { font-size: 0.7rem; font-weight: 500; color: var(--color-muted); }

  .field input[type=text],
  .field input[type=number],
  .field textarea {
    padding: 0.575rem 0.875rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    resize: vertical;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .field input:focus,
  .field textarea:focus {
    border-color: var(--lc-600, #4f46e5);
    box-shadow: 0 0 0 3px var(--lc-soft, rgba(79,70,229,0.1));
  }

  .field-row { display: flex; gap: 0.75rem; align-items: flex-start; }

  /* ── Options builder ─────────────────────────────────────────────────────── */
  .options-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.875rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--color-surface);
  }

  .options-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .options-label { font-size: 0.8rem; font-weight: 700; color: var(--color-text); }
  .options-hint  { font-size: 0.72rem; color: var(--color-muted); }

  .option-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .option-row input[type=text] {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .option-row input.correct-opt {
    border-color: rgba(22,163,74,0.5);
    background: rgba(22,163,74,0.04);
  }

  .option-row input:focus { border-color: var(--lc-600, #4f46e5); }

  .radio-btn {
    width: 28px; height: 28px;
    border: none;
    background: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted);
    flex-shrink: 0;
    padding: 0;
    border-radius: 50%;
    transition: all 0.15s;
  }
  .radio-btn:hover { background: var(--lc-soft, rgba(79,70,229,0.08)); }
  .radio-btn.selected { color: #16a34a; }

  .opt-remove {
    width: 24px; height: 24px;
    border: 1.5px solid transparent;
    background: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-muted);
    border-radius: 0.375rem;
    padding: 0;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .opt-remove:hover { border-color: rgba(239,68,68,0.4); color: #ef4444; background: rgba(239,68,68,0.06); }

  .add-opt-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--lc-600, #4f46e5);
    background: none;
    border: 1.5px dashed var(--color-border);
    border-radius: 0.5rem;
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    align-self: flex-start;
    margin-top: 0.1rem;
  }
  .add-opt-btn:hover { border-color: var(--lc-600, #4f46e5); background: var(--lc-soft, rgba(79,70,229,0.05)); }

  /* ── True/False choice ───────────────────────────────────────────────────── */
  .tf-choice {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .tf-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .tf-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.75rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--color-surface);
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    color: var(--color-muted);
    font-family: inherit;
    transition: all 0.15s;
  }

  .tf-btn:hover { border-color: #16a34a; color: #16a34a; background: rgba(22,163,74,0.05); }
  .tf-btn.selected { border-color: #16a34a; color: #16a34a; background: rgba(22,163,74,0.08); }

  .tf-false:hover   { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.05); }
  .tf-false.selected { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.08); }

  /* ── Bulk import ─────────────────────────────────────────────────────────── */
  .bulk-info {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-muted);
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
    padding: 0.75rem 0.875rem;
    line-height: 1.5;
  }

  .bulk-info code {
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 0.8em;
    background: var(--color-border);
    padding: 0.05rem 0.3rem;
    border-radius: 0.25rem;
    color: var(--color-text);
  }

  .code-area {
    font-family: 'Menlo', 'Consolas', monospace !important;
    font-size: 0.78rem !important;
    line-height: 1.6;
  }

  .bulk-schema {
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
    overflow: hidden;
  }

  .bulk-schema summary {
    padding: 0.6rem 0.875rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-muted);
    cursor: pointer;
    background: var(--color-surface);
    list-style: none;
  }
  .bulk-schema summary::-webkit-details-marker { display: none; }
  .bulk-schema summary:hover { color: var(--color-text); }

  .schema-pre {
    padding: 0.875rem;
    margin: 0;
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 0.75rem;
    color: var(--color-text);
    background: var(--color-bg);
    overflow-x: auto;
    line-height: 1.7;
    border-top: 1.5px solid var(--color-border);
  }

  /* ── Delete confirm ──────────────────────────────────────────────────────── */
  .delete-confirm-text {
    font-size: 0.875rem;
    color: var(--color-muted);
    line-height: 1.6;
    margin: 0 0 0.25rem;
  }

  /* ── Error ───────────────────────────────────────────────────────────────── */
  .form-error {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #ef4444;
    background: rgba(239,68,68,0.07);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 0.5rem;
    padding: 0.625rem 0.875rem;
    margin: 0;
  }

  /* ── Spinner ─────────────────────────────────────────────────────────────── */
  .spinner {
    width: 13px; height: 13px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .page { padding: 1rem 1rem 3rem; }
    h1 { font-size: 1.25rem; }
    .header-actions { width: 100%; }
    .header-actions .btn { flex: 1; justify-content: center; }
    .q-card { gap: 0.625rem; padding: 0.875rem 0.75rem; }
    .q-actions { opacity: 1; }
    .field-row { flex-direction: column; }
    .field.narrow { max-width: 100%; }
    .modal-body { padding: 1.25rem; }
  }

  /* ── Dark mode support (structural only — colors come from global tokens) ── */
  @media (prefers-color-scheme: dark) {
    .backdrop { background: rgba(0,0,0,0.6); }
  }
</style>