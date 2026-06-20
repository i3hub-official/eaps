<!-- src/lib/components/exam/QuestionBuilder.svelte -->
<!--
  Shared question builder UI.
  Used by:
    /lecturer/exams/[examId]/questions/+page.svelte  (primary)
    /admin/exams/[examId]/questions/+page.svelte     (admin wrapper adds owner banner + status changer on top)

  Props:
    exam           — exam row with course, _count, questionsToPresent, totalMarks, status
    questions      — full question list with options + fitbAnswers
    marksAllocated — pre-computed sum (passed in so parent can $derive it too)
    backHref       — "← Back to Exam" link (differs per portal)
    editable       — whether add/edit/delete/reorder controls are shown
    form           — ActionData from the parent page
-->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { flip } from 'svelte/animate';
  import { fly, fade, scale } from 'svelte/transition';
  import { cubicOut, quintOut } from 'svelte/easing';
  import {
    ChevronLeft, Plus, Trash2, Pencil, GripVertical,
    CheckCircle2, Circle, AlertCircle, X, Check,
    Upload, BookOpen, Layers, ToggleLeft,
    List, FileSpreadsheet, FileJson, FileText
  } from '@lucide/svelte';
  import * as XLSX from 'xlsx';

  interface Question {
    id: string;
    body: string;
    topic: string | null;
    marks: number;
    type: string;
    options: { id: string; optionText: string; isCorrect: boolean; orderIndex: number | null }[];
    fitbAnswers: { id: string; acceptedAnswer: string; isPrimary: boolean }[];
  }

  interface Props {
    exam: {
      id: string;
      title: string;
      status: string;
      totalMarks: number;
      questionsToPresent: number;
      course: { code: string; title: string };
    };
    questions: Question[];
    marksAllocated: number;
    backHref: string;
    editable: boolean;
    form: any;
  }

  let { exam, questions: initialQuestions, marksAllocated: initialMarks, backHref, editable, form }: Props = $props();

  // ── Reactive question list ──────────────────────────────────────────────────
  let questions = $state(initialQuestions);
  let marksAllocated = $derived(questions.reduce((s, q) => s + q.marks, 0));
  $effect(() => { questions = initialQuestions; });

  // ── UI state ───────────────────────────────────────────────────────────────
  type Modal = 'add_mcq' | 'add_tf' | 'edit' | 'delete' | 'bulk' | null;
  let openModal      = $state<Modal>(null);
  let editingQuestion = $state<Question | null>(null);
  let deletingId     = $state<string | null>(null);
  let toastMsg       = $state<{ text: string; ok: boolean } | null>(null);
  let submitting     = $state(false);

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
        bulk_import:    `${form?.count ?? 'N'} questions imported`,
      };
      showToast(msgs[form?.action] ?? 'Saved');
      openModal = null;
    }
    if (form?.error) showToast(form.error as string, false);
  });

  // ── MCQ form ───────────────────────────────────────────────────────────────
  let mcqBody    = $state('');
  let mcqTopic   = $state('');
  let mcqMarks   = $state(1);
  let mcqOptions = $state(['', '', '', '']);
  let mcqCorrect = $state(0);

  function addOption()         { if (mcqOptions.length < 6) mcqOptions = [...mcqOptions, '']; }
  function removeOption(i: number) {
    if (mcqOptions.length <= 2) return;
    mcqOptions = mcqOptions.filter((_, idx) => idx !== i);
    if (mcqCorrect >= mcqOptions.length) mcqCorrect = mcqOptions.length - 1;
  }

  // ── True/False form ────────────────────────────────────────────────────────
  let tfBody    = $state('');
  let tfTopic   = $state('');
  let tfMarks   = $state(1);
  let tfCorrect = $state<'true' | 'false'>('true');

  // ── Edit form ──────────────────────────────────────────────────────────────
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

  function openEdit(q: Question) {
    editingQuestion = q;
    editBody  = q.body;
    editTopic = q.topic ?? '';
    editMarks = q.marks;
    if (editIsTF) {
      const correct = q.options.find(o => o.isCorrect);
      editTFAnswer = (correct?.optionText?.toLowerCase() ?? 'true') as 'true' | 'false';
    } else {
      editOptions = q.options.map(o => o.optionText);
      editCorrect = q.options.findIndex(o => o.isCorrect);
      if (editCorrect < 0) editCorrect = 0;
    }
    openModal = 'edit';
  }

  function openDelete(id: string) { deletingId = id; openModal = 'delete'; }

  function resetAdd() { mcqBody = ''; mcqTopic = ''; mcqMarks = 1; mcqOptions = ['', '', '', '']; mcqCorrect = 0; }
  function resetTF()  { tfBody = ''; tfTopic = ''; tfMarks = 1; tfCorrect = 'true'; }

  // ── Bulk import ────────────────────────────────────────────────────────────
  let bulkJson    = $state('');
  let fileInput   = $state<HTMLInputElement | null>(null);
  let fileName    = $state('');
  let isDragging  = $state(false);

  const BULK_EXAMPLE = JSON.stringify([
    { type: 'mcq', body: 'What is photosynthesis?', topic: 'Biology', marks: 2,
      options: ['Energy from light', 'Cell division', 'Protein synthesis', 'Respiration'],
      correctIndex: 0 },
    { type: 'truefalse', body: 'The Earth is the 3rd planet from the Sun.', marks: 1, correctAnswer: 'true' }
  ], null, 2);

  function parseExcelFile(data: any[]): any[] {
    const questions: any[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      const type = (row[0] || '').toString().toLowerCase().trim();
      const body = row[1]?.toString().trim();
      if (!body) continue;
      const topic = row[2]?.toString().trim() || undefined;
      const marks = parseInt(row[3]) || 1;
      if (type === 'mcq' || type === 'multiple choice' || type === 'multiple-choice') {
        const options: string[] = [];
        let correctIndex = 0;
        for (let j = 4; j < row.length; j++) {
          if (row[j]) {
            const t = row[j].toString().trim();
            if (t) options.push(t);
          }
        }
        if (options.length > 0) {
          const last = options[options.length - 1];
          if (last.startsWith('*') || last.startsWith('correct:')) {
            options[options.length - 1] = last.replace(/^\*|^correct:\s*/i, '').trim();
            correctIndex = options.length - 1;
          }
        }
        if (options.length >= 2) questions.push({ type: 'mcq', body, topic, marks, options, correctIndex });
      } else if (type === 'truefalse' || type === 'tf' || type === 'true/false') {
        const ca = (row[4]?.toString().toLowerCase().trim() || '');
        questions.push({ type: 'truefalse', body, topic, marks, correctAnswer: ca === 'true' || ca === 't' ? 'true' : 'false' });
      }
    }
    return questions;
  }

  function parseTxtFile(text: string): any[] {
    const lines = text.split('\n').filter(l => l.trim());
    const questions: any[] = [];
    for (const line of lines) {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 2) continue;
      const type = parts[0].toLowerCase();
      const body = parts[1];
      if (!body) continue;
      if (type === 'mcq') {
        const options = parts.slice(2, -1).filter(o => o);
        const correctIndex = parseInt(parts[parts.length - 1]) || 0;
        if (options.length >= 2) questions.push({ type: 'mcq', body, options, correctIndex: Math.min(correctIndex, options.length - 1) });
      } else if (type === 'tf' || type === 'truefalse') {
        const ca = parts[2]?.toLowerCase() || 'true';
        questions.push({ type: 'truefalse', body, correctAnswer: ca === 'true' || ca === 't' ? 'true' : 'false' });
      }
    }
    return questions;
  }

  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    fileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let qs: any[] = [];
        if (file.name.endsWith('.json')) {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) { qs = parsed; bulkJson = text; }
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb   = XLSX.read(data, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          qs = parseExcelFile(XLSX.utils.sheet_to_json(ws, { header: 1 }));
          bulkJson = JSON.stringify(qs, null, 2);
        } else if (file.name.endsWith('.txt')) {
          qs = parseTxtFile(e.target?.result as string);
          bulkJson = JSON.stringify(qs, null, 2);
        }
        qs.length === 0
          ? showToast('No valid questions found in file', false)
          : showToast(`Loaded ${qs.length} questions from file`);
      } catch (err) {
        showToast('Error parsing file: ' + (err as Error).message, false);
      }
    };
    file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      ? reader.readAsArrayBuffer(file)
      : reader.readAsText(file);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileUpload({ target: input } as any);
  }

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
  let dragSrc  = $state<number | null>(null);
  let dragOver = $state<number | null>(null);

  function onDragStart(i: number) { dragSrc = i; }
  function onDragEnter(i: number) { dragOver = i; }
  function onDragEnd()            { dragSrc = null; dragOver = null; }

  function onDrop(i: number) {
    if (dragSrc === null || dragSrc === i) return;
    const next = [...questions];
    const [moved] = next.splice(dragSrc, 1);
    next.splice(i, 0, moved);
    questions = next;
    dragSrc = null; dragOver = null;
    reorderForm?.requestSubmit();
  }

  let reorderForm = $state<HTMLFormElement | null>(null);
  const reorderIds = $derived(questions.map(q => q.id).join(','));

  // ── Helpers ────────────────────────────────────────────────────────────────
  function qLabel(q: Question) {
    const isTF = q.options.length === 2 && q.options.some(o => o.optionText === 'True') && q.options.some(o => o.optionText === 'False');
    return isTF ? 'T/F' : 'MCQ';
  }
</script>

<!-- Toast -->
{#if toastMsg}
  <div
    class="toast"
    class:toast-ok={toastMsg.ok}
    class:toast-err={!toastMsg.ok}
    transition:fly={{ y: -20, duration: 280, easing: quintOut }}
  >
    {#if toastMsg.ok}<CheckCircle2 size={14} />{:else}<AlertCircle size={14} />{/if}
    {toastMsg.text}
  </div>
{/if}

<!-- Hidden reorder form -->
<form
  method="POST"
  action="?/reorder"
  use:enhance={() => { submitting = true; return async ({ update }) => { submitting = false; await update({ reset: false }); }; }}
  bind:this={reorderForm}
  style="display:none"
>
  <input type="hidden" name="order" value={reorderIds} />
</form>

<div class="qb-page">
  <!-- Header -->
  <header class="qb-header">
    <div class="header-top">
      <a href={backHref} class="back-link"><ChevronLeft size={14} strokeWidth={2.5} /> Back to Exam</a>
    </div>
    <div class="header-main">
      <div class="header-info">
        <div class="exam-chip"><BookOpen size={13} />{exam.course?.code} — {exam.course?.title}</div>
        <h1>{exam.title}</h1>
        <div class="marks-bar">
          <span class="marks-label">
            <Layers size={12} />
            {questions.length} question{questions.length !== 1 ? 's' : ''} ·
            {marksAllocated} / {exam.totalMarks} marks allocated
          </span>
          {#if exam.questionsToPresent > 0}
            <span class="qtp-badge">{exam.questionsToPresent} shown per student</span>
          {/if}
        </div>
        <div class="marks-track">
          <div
            class="marks-fill"
            class:marks-over={marksAllocated > exam.totalMarks}
            style="width: {Math.min(100, (marksAllocated / exam.totalMarks) * 100)}%"
          ></div>
        </div>
        {#if marksAllocated > exam.totalMarks}
          <p class="marks-warn"><AlertCircle size={12} /> Marks allocated exceed total by {marksAllocated - exam.totalMarks}</p>
        {/if}
      </div>

      {#if editable}
        <div class="header-actions">
          <button class="btn ghost"      onclick={() => openModal = 'bulk'}><Upload size={14} /> Bulk import</button>
          <button class="btn secondary"  onclick={() => { resetTF(); openModal = 'add_tf'; }}><ToggleLeft size={14} /> True/False</button>
          <button class="btn primary"    onclick={() => { resetAdd(); openModal = 'add_mcq'; }}><Plus size={14} /> Add MCQ</button>
        </div>
      {/if}
    </div>
  </header>

  <!-- Empty state -->
  {#if questions.length === 0}
    <div class="empty" in:scale={{ duration: 280, easing: cubicOut, start: 0.96 }}>
      <div class="empty-icon"><List size={32} /></div>
      <p class="empty-title">No questions yet</p>
      <p class="empty-sub">Add your first MCQ or True/False question to get started.</p>
      {#if editable}
        <div class="empty-actions">
          <button class="btn secondary" onclick={() => { resetTF(); openModal = 'add_tf'; }}><ToggleLeft size={14} /> True/False</button>
          <button class="btn primary"   onclick={() => { resetAdd(); openModal = 'add_mcq'; }}><Plus size={14} /> Add MCQ</button>
        </div>
      {/if}
    </div>

  {:else}
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
            {#if editable}<div class="q-grip" title="Drag to reorder"><GripVertical size={14} strokeWidth={2} /></div>{/if}
            <span class="q-num">{i + 1}</span>
            <span class="q-type-badge" class:tf={qLabel(q) === 'T/F'}>{qLabel(q)}</span>
          </div>
          <div class="q-body-col">
            <p class="q-text">{q.body}</p>
            {#if q.topic}<span class="q-topic">{q.topic}</span>{/if}
            <div class="q-options">
              {#each q.options as opt}
                <span class="q-opt" class:correct={opt.isCorrect}>
                  {#if opt.isCorrect}<CheckCircle2 size={11} strokeWidth={2.5} />{:else}<Circle size={11} strokeWidth={1.5} />{/if}
                  {opt.optionText}
                </span>
              {/each}
            </div>
          </div>
          <div class="q-right">
            <span class="q-marks">{q.marks} pt{q.marks !== 1 ? 's' : ''}</span>
            {#if editable}
              <div class="q-actions">
                <button class="icon-btn edit" onclick={() => openEdit(q)} title="Edit"><Pencil size={13} strokeWidth={2} /></button>
                <button class="icon-btn del"  onclick={() => openDelete(q.id)} title="Delete"><Trash2 size={13} strokeWidth={2} /></button>
              </div>
            {/if}
          </div>
        </li>
      {/each}
    </ol>

    {#if editable && questions.length > 1}
      <p class="drag-hint"><GripVertical size={12} /> Drag questions to reorder — saved automatically</p>
    {/if}
  {/if}
</div>

<!-- ── Modals ────────────────────────────────────────────────────────────────── -->
{#if openModal !== null}
  <div class="backdrop" transition:fade={{ duration: 180 }} onclick={() => openModal = null} role="presentation"></div>

  <!-- Add MCQ -->
  {#if openModal === 'add_mcq'}
    <div class="modal" transition:fly={{ y: 24, duration: 260, easing: cubicOut }} role="dialog" aria-modal="true" aria-label="Add MCQ">
      <div class="modal-header">
        <h2><Plus size={16} /> Add MCQ Question</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <form method="POST" action="?/add_mcq"
        use:enhance={() => { submitting = true; return async ({ update }) => { submitting = false; await update({ reset: false }); }; }}
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
            <span class="options-hint">Click the radio to mark correct</span>
          </div>
          {#each mcqOptions as _, i (i)}
            <div class="option-row" in:fly={{ x: -8, duration: 160 }}>
              <button type="button" class="radio-btn" class:selected={mcqCorrect === i} onclick={() => mcqCorrect = i}>
                {#if mcqCorrect === i}<CheckCircle2 size={16} strokeWidth={2.5} />{:else}<Circle size={16} strokeWidth={1.5} />{/if}
              </button>
              <input type="text" name="option_{i}" bind:value={mcqOptions[i]} placeholder="Option {String.fromCharCode(65 + i)}" class:correct-opt={mcqCorrect === i} required />
              {#if mcqOptions.length > 2}
                <button type="button" class="opt-remove" onclick={() => removeOption(i)}><X size={12} strokeWidth={2.5} /></button>
              {/if}
            </div>
          {/each}
          {#if mcqOptions.length < 6}
            <button type="button" class="add-opt-btn" onclick={addOption}><Plus size={13} /> Add option</button>
          {/if}
        </div>
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

  <!-- Add True/False -->
  {:else if openModal === 'add_tf'}
    <div class="modal" transition:fly={{ y: 24, duration: 260, easing: cubicOut }} role="dialog" aria-modal="true" aria-label="Add True/False">
      <div class="modal-header">
        <h2><ToggleLeft size={16} /> Add True/False Question</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <form method="POST" action="?/add_truefalse"
        use:enhance={() => { submitting = true; return async ({ update }) => { submitting = false; await update({ reset: false }); }; }}
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
            <button type="button" class="tf-btn" class:selected={tfCorrect === 'true'} onclick={() => tfCorrect = 'true'}><CheckCircle2 size={15} /> True</button>
            <button type="button" class="tf-btn tf-false" class:selected={tfCorrect === 'false'} onclick={() => tfCorrect = 'false'}><X size={15} /> False</button>
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

  <!-- Edit -->
  {:else if openModal === 'edit' && editingQuestion}
    <div class="modal" transition:fly={{ y: 24, duration: 260, easing: cubicOut }} role="dialog" aria-modal="true" aria-label="Edit question">
      <div class="modal-header">
        <h2><Pencil size={16} /> Edit {editIsTF ? 'True/False' : 'MCQ'} Question</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <form method="POST" action="?/edit_question"
        use:enhance={() => { submitting = true; return async ({ update }) => { submitting = false; await update({ reset: false }); }; }}
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
              <button type="button" class="tf-btn" class:selected={editTFAnswer === 'true'} onclick={() => editTFAnswer = 'true'}><CheckCircle2 size={15} /> True</button>
              <button type="button" class="tf-btn tf-false" class:selected={editTFAnswer === 'false'} onclick={() => editTFAnswer = 'false'}><X size={15} /> False</button>
            </div>
          </div>
          <input type="hidden" name="correctAnswer" value={editTFAnswer} />
        {:else}
          <div class="options-section">
            <div class="options-header">
              <span class="options-label">Options <span class="req">*</span></span>
              <span class="options-hint">Click the radio to mark correct</span>
            </div>
            {#each editOptions as _, i (i)}
              <div class="option-row">
                <button type="button" class="radio-btn" class:selected={editCorrect === i} onclick={() => editCorrect = i}>
                  {#if editCorrect === i}<CheckCircle2 size={16} strokeWidth={2.5} />{:else}<Circle size={16} strokeWidth={1.5} />{/if}
                </button>
                <input type="text" name="option_{i}" bind:value={editOptions[i]} class:correct-opt={editCorrect === i} required />
                {#if editOptions.length > 2}
                  <button type="button" class="opt-remove" onclick={() => { editOptions = editOptions.filter((_, idx) => idx !== i); if (editCorrect >= editOptions.length) editCorrect = editOptions.length - 1; }}><X size={12} strokeWidth={2.5} /></button>
                {/if}
              </div>
            {/each}
            {#if editOptions.length < 6}
              <button type="button" class="add-opt-btn" onclick={() => editOptions = [...editOptions, '']}><Plus size={13} /> Add option</button>
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

  <!-- Delete confirm -->
  {:else if openModal === 'delete' && deletingId}
    <div class="modal modal-sm" transition:scale={{ duration: 200, easing: cubicOut, start: 0.95 }} role="dialog" aria-modal="true" aria-label="Confirm delete">
      <div class="modal-header">
        <h2><Trash2 size={16} /> Delete Question</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <div class="modal-body">
        <p class="delete-confirm-text">This will permanently remove the question and all its options. Student answers linked to it will also be deleted. This cannot be undone.</p>
        <form method="POST" action="?/delete_question"
          use:enhance={() => { submitting = true; return async ({ update }) => { submitting = false; await update({ reset: false }); }; }}
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

  <!-- Bulk import -->
  {:else if openModal === 'bulk'}
    <div class="modal modal-wide" transition:fly={{ y: 24, duration: 260, easing: cubicOut }} role="dialog" aria-modal="true" aria-label="Bulk import">
      <div class="modal-header">
        <h2><Upload size={16} /> Bulk Import Questions</h2>
        <button class="modal-close" onclick={() => openModal = null}><X size={16} /></button>
      </div>
      <form method="POST" action="?/bulk_import"
        use:enhance={() => { submitting = true; return async ({ update }) => { submitting = false; await update({ reset: false }); }; }}
        class="modal-body"
      >
        <div class="import-section">
          <div class="import-header">
            <span class="import-label">Import from file</span>
            <div class="format-badges">
              <span class="format-badge"><FileSpreadsheet size={12} /> Excel</span>
              <span class="format-badge"><FileJson size={12} /> JSON</span>
              <span class="format-badge"><FileText size={12} /> TXT</span>
            </div>
          </div>
          <input type="file" bind:this={fileInput} accept=".json,.xlsx,.xls,.txt" style="display:none" onchange={handleFileUpload} />
          <div
            class="drop-zone"
            class:dragging={isDragging}
            onclick={() => fileInput?.click()}
            ondragenter={(e) => { e.preventDefault(); isDragging = true; }}
            ondragover={(e) => { e.preventDefault(); isDragging = true; }}
            ondragleave={(e) => { e.preventDefault(); isDragging = false; }}
            ondrop={handleDrop}
          >
            {#if fileName}
              <div class="drop-content"><FileSpreadsheet size={32} /><span class="file-name">{fileName}</span><span class="file-hint">Click or drop to replace</span></div>
            {:else}
              <div class="drop-content"><Upload size={28} /><span class="drop-text">Drop file here or click to browse</span><span class="drop-hint">Supports .json, .xlsx, .xls, .txt</span></div>
            {/if}
          </div>
        </div>

        <div class="divider"><span>OR paste JSON directly</span></div>

        <div class="field">
          <label for="bulk-json">JSON <span class="opt">optional if file uploaded</span></label>
          <textarea id="bulk-json" name="json" rows="10" bind:value={bulkJson} placeholder={BULK_EXAMPLE} class="code-area" spellcheck="false"></textarea>
        </div>

        <details class="bulk-schema">
          <summary>📋 Schema reference</summary>
          <pre class="schema-pre">{`[
  { "type": "mcq",       "body": "Question",   "marks": 2, "options": ["A","B","C","D"], "correctIndex": 0 },
  { "type": "truefalse", "body": "Statement",  "marks": 1, "correctAnswer": "true" }
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
  /* All styles from lecturer/exams/[examId]/questions/+page.svelte
     minus the .page wrapper (handled by parent pages).
     Only changes: .page → .qb-page, .q-body → .q-body-col to avoid collision */

  .qb-page { max-width: 860px; margin: 0 auto; padding: 1.75rem 1.5rem 4rem; display: flex; flex-direction: column; gap: 1.5rem; }

  .toast { position:fixed; top:1.25rem; right:1.25rem; z-index:9999; display:flex; align-items:center; gap:.5rem; padding:.625rem 1rem; border-radius:.5rem; font-size:.8125rem; font-weight:600; box-shadow:0 4px 16px rgba(0,0,0,.14); pointer-events:none; }
  .toast-ok  { background: var(--lc-600, #4f46e5); color:#fff; }
  .toast-err { background: #ef4444; color:#fff; }

  .back-link { display:inline-flex; align-items:center; gap:.2rem; font-size:.75rem; font-weight:600; color:var(--lc-600,#4f46e5); text-decoration:none; transition:gap .12s; }
  .back-link:hover { gap:.4rem; }

  .header-main { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-top:.75rem; }
  .exam-chip { display:inline-flex; align-items:center; gap:.35rem; font-size:.72rem; font-weight:700; color:var(--lc-600,#4f46e5); background:var(--lc-soft,rgba(79,70,229,.08)); padding:.2rem .6rem; border-radius:999px; margin-bottom:.4rem; }
  h1 { font-size:1.6rem; font-weight:900; letter-spacing:-.04em; color:var(--color-text); margin:0 0 .5rem; line-height:1.1; }

  .marks-bar { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; margin-bottom:.5rem; }
  .marks-label { display:flex; align-items:center; gap:.3rem; font-size:.8rem; color:var(--color-muted); font-weight:500; }
  .qtp-badge { font-size:.68rem; font-weight:700; padding:.15rem .5rem; border-radius:999px; background:var(--lc-soft,rgba(79,70,229,.08)); color:var(--lc-600,#4f46e5); }
  .marks-track { height:4px; background:var(--color-border); border-radius:99px; overflow:hidden; width:200px; max-width:100%; }
  .marks-fill { height:100%; background:var(--lc-600,#4f46e5); border-radius:99px; transition:width .3s ease; }
  .marks-fill.marks-over { background:#ef4444; }
  .marks-warn { display:flex; align-items:center; gap:.3rem; font-size:.75rem; color:#ef4444; font-weight:600; margin:.25rem 0 0; }
  .header-actions { display:flex; gap:.625rem; flex-shrink:0; flex-wrap:wrap; }

  .btn { display:inline-flex; align-items:center; gap:.375rem; padding:.55rem 1rem; border-radius:.6rem; font-size:.8rem; font-weight:700; border:1.5px solid var(--color-border); background:var(--color-surface); color:var(--color-text); cursor:pointer; transition:all .15s; white-space:nowrap; font-family:inherit; text-decoration:none; }
  .btn:hover { transform:translateY(-1px); box-shadow:0 2px 6px rgba(0,0,0,.08); }
  .btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }
  .btn.primary { background:var(--lc-600,#4f46e5); border-color:var(--lc-600,#4f46e5); color:#fff; }
  .btn.primary:hover { background:var(--lc-700,#4338ca); border-color:var(--lc-700,#4338ca); }
  .btn.secondary { border-color:var(--lc-600,#4f46e5); color:var(--lc-600,#4f46e5); background:var(--lc-soft,rgba(79,70,229,.06)); }
  .btn.secondary:hover { background:var(--lc-soft,rgba(79,70,229,.12)); }
  .btn.ghost { color:var(--color-muted); }
  .btn.ghost:hover { border-color:var(--color-text); color:var(--color-text); }
  .btn.danger { color:#ef4444; border-color:rgba(239,68,68,.25); background:rgba(239,68,68,.06); }
  .btn.danger:hover { background:rgba(239,68,68,.12); }

  .empty { display:flex; flex-direction:column; align-items:center; gap:.75rem; padding:5rem 2rem; text-align:center; color:var(--color-muted); border:2px dashed var(--color-border); border-radius:1rem; }
  .empty-icon { width:64px; height:64px; border-radius:50%; background:var(--color-surface); display:flex; align-items:center; justify-content:center; color:var(--lc-600,#4f46e5); margin-bottom:.25rem; }
  .empty-title { font-size:1.1rem; font-weight:800; color:var(--color-text); margin:0; }
  .empty-sub   { font-size:.875rem; margin:0; }
  .empty-actions { display:flex; gap:.625rem; margin-top:.25rem; }

  .q-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.5rem; }
  .q-card { display:flex; align-items:flex-start; gap:.875rem; padding:1rem 1rem 1rem .75rem; border:1.5px solid var(--color-border); border-radius:.875rem; background:var(--color-surface); transition:border-color .15s,box-shadow .15s,background .15s; cursor:default; }
  .q-card[draggable=true] { cursor:grab; }
  .q-card:hover { border-color:var(--lc-600,#4f46e5); box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .q-card.drag-over { border-color:var(--lc-600,#4f46e5); background:var(--lc-soft,rgba(79,70,229,.05)); box-shadow:0 0 0 3px var(--lc-soft,rgba(79,70,229,.1)); }

  .q-left { display:flex; align-items:center; gap:.5rem; flex-shrink:0; padding-top:.1rem; }
  .q-grip { color:var(--color-muted); opacity:.4; transition:opacity .15s; display:flex; }
  .q-card:hover .q-grip { opacity:.9; }
  .q-num { width:22px; height:22px; border-radius:50%; background:var(--color-border); display:flex; align-items:center; justify-content:center; font-size:.65rem; font-weight:800; color:var(--color-muted); flex-shrink:0; }
  .q-type-badge { font-size:.62rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em; padding:.15rem .45rem; border-radius:.3rem; background:var(--lc-soft,rgba(79,70,229,.08)); color:var(--lc-600,#4f46e5); white-space:nowrap; }
  .q-type-badge.tf { background:rgba(245,158,11,.1); color:#d97706; }

  .q-body-col { flex:1; min-width:0; display:flex; flex-direction:column; gap:.35rem; }
  .q-text { font-size:.875rem; font-weight:600; color:var(--color-text); margin:0; line-height:1.5; }
  .q-topic { font-size:.7rem; color:var(--lc-600,#4f46e5); background:var(--lc-soft,rgba(79,70,229,.06)); padding:.1rem .45rem; border-radius:.3rem; width:fit-content; font-weight:600; }
  .q-options { display:flex; flex-wrap:wrap; gap:.3rem .5rem; margin-top:.1rem; }
  .q-opt { display:inline-flex; align-items:center; gap:.25rem; font-size:.775rem; color:var(--color-muted); padding:.15rem .5rem .15rem .35rem; border-radius:.375rem; border:1px solid var(--color-border); background:var(--color-bg); }
  .q-opt.correct { border-color:rgba(22,163,74,.35); background:rgba(22,163,74,.07); color:#15803d; font-weight:700; }

  .q-right { display:flex; flex-direction:column; align-items:flex-end; gap:.5rem; flex-shrink:0; }
  .q-marks { font-size:.75rem; font-weight:800; color:var(--lc-600,#4f46e5); white-space:nowrap; }
  .q-actions { display:flex; gap:.25rem; opacity:0; transition:opacity .15s; }
  .q-card:hover .q-actions { opacity:1; }

  .icon-btn { width:28px; height:28px; border-radius:.375rem; border:1.5px solid var(--color-border); background:var(--color-bg); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--color-muted); transition:all .15s; padding:0; }
  .icon-btn:hover { transform:scale(1.05); }
  .icon-btn.edit:hover { border-color:var(--lc-600,#4f46e5); color:var(--lc-600,#4f46e5); background:var(--lc-soft,rgba(79,70,229,.06)); }
  .icon-btn.del:hover  { border-color:rgba(239,68,68,.4); color:#ef4444; background:rgba(239,68,68,.06); }

  .drag-hint { display:flex; align-items:center; gap:.35rem; font-size:.72rem; color:var(--color-muted); opacity:.7; margin:0; padding:0 .25rem; }

  .backdrop { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:200; backdrop-filter:blur(2px); }
  .modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:201; width:min(580px,calc(100vw - 2rem)); max-height:calc(100vh - 3rem); overflow-y:auto; background:var(--color-bg); border:1.5px solid var(--color-border); border-radius:1.25rem; box-shadow:0 24px 60px rgba(0,0,0,.2); display:flex; flex-direction:column; }
  .modal-sm   { width:min(420px,calc(100vw - 2rem)); }
  .modal-wide { width:min(720px,calc(100vw - 2rem)); }
  .modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1.5px solid var(--color-border); position:sticky; top:0; background:var(--color-bg); z-index:1; border-radius:1.25rem 1.25rem 0 0; }
  .modal-header h2 { display:flex; align-items:center; gap:.5rem; font-size:.95rem; font-weight:800; color:var(--color-text); margin:0; }
  .modal-close { width:30px; height:30px; border-radius:.5rem; border:1.5px solid var(--color-border); background:var(--color-surface); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--color-muted); transition:all .15s; padding:0; }
  .modal-close:hover { color:var(--color-text); border-color:var(--color-text); }
  .modal-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
  .modal-footer { display:flex; gap:.625rem; justify-content:flex-end; padding-top:.5rem; }

  .field { display:flex; flex-direction:column; gap:.35rem; flex:1; }
  .field.narrow { max-width:100px; flex:none; }
  .field label { font-size:.8rem; font-weight:700; color:var(--color-text); }
  .req { color:#ef4444; }
  .opt { font-size:.7rem; font-weight:500; color:var(--color-muted); }
  .field input[type=text], .field input[type=number], .field textarea { padding:.575rem .875rem; border:1.5px solid var(--color-border); border-radius:.5rem; background:var(--color-surface); color:var(--color-text); font-size:.875rem; font-family:inherit; outline:none; resize:vertical; width:100%; box-sizing:border-box; transition:border-color .15s,box-shadow .15s; }
  .field input:focus, .field textarea:focus { border-color:var(--lc-600,#4f46e5); box-shadow:0 0 0 3px var(--lc-soft,rgba(79,70,229,.1)); }
  .field-row { display:flex; gap:.75rem; align-items:flex-start; }

  .options-section { display:flex; flex-direction:column; gap:.5rem; padding:.875rem; border:1.5px solid var(--color-border); border-radius:.75rem; background:var(--color-surface); }
  .options-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.25rem; }
  .options-label { font-size:.8rem; font-weight:700; color:var(--color-text); }
  .options-hint  { font-size:.72rem; color:var(--color-muted); }
  .option-row { display:flex; align-items:center; gap:.5rem; }
  .option-row input[type=text] { flex:1; padding:.5rem .75rem; border:1.5px solid var(--color-border); border-radius:.5rem; background:var(--color-bg); color:var(--color-text); font-size:.875rem; font-family:inherit; outline:none; transition:border-color .15s; }
  .option-row input.correct-opt { border-color:rgba(22,163,74,.5); background:rgba(22,163,74,.04); }
  .radio-btn { width:28px; height:28px; border:none; background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--color-muted); flex-shrink:0; padding:0; border-radius:50%; transition:all .15s; }
  .radio-btn:hover { background:var(--lc-soft,rgba(79,70,229,.08)); }
  .radio-btn.selected { color:#16a34a; }
  .opt-remove { width:24px; height:24px; border:1.5px solid transparent; background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--color-muted); border-radius:.375rem; padding:0; flex-shrink:0; transition:all .15s; }
  .opt-remove:hover { border-color:rgba(239,68,68,.4); color:#ef4444; background:rgba(239,68,68,.06); }
  .add-opt-btn { display:inline-flex; align-items:center; gap:.3rem; font-size:.78rem; font-weight:700; color:var(--lc-600,#4f46e5); background:none; border:1.5px dashed var(--color-border); border-radius:.5rem; padding:.4rem .75rem; cursor:pointer; transition:all .15s; font-family:inherit; align-self:flex-start; margin-top:.1rem; }
  .add-opt-btn:hover { border-color:var(--lc-600,#4f46e5); background:var(--lc-soft,rgba(79,70,229,.05)); }

  .tf-choice { display:flex; flex-direction:column; gap:.6rem; }
  .tf-buttons { display:flex; gap:.75rem; }
  .tf-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:.4rem; padding:.75rem 1rem; border:2px solid var(--color-border); border-radius:.75rem; background:var(--color-surface); font-size:.875rem; font-weight:700; cursor:pointer; color:var(--color-muted); font-family:inherit; transition:all .15s; }
  .tf-btn:hover      { border-color:#16a34a; color:#16a34a; background:rgba(22,163,74,.05); }
  .tf-btn.selected   { border-color:#16a34a; color:#16a34a; background:rgba(22,163,74,.08); }
  .tf-false:hover    { border-color:#ef4444; color:#ef4444; background:rgba(239,68,68,.05); }
  .tf-false.selected { border-color:#ef4444; color:#ef4444; background:rgba(239,68,68,.08); }

  .import-section { display:flex; flex-direction:column; gap:.75rem; }
  .import-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.5rem; }
  .import-label { font-size:.8rem; font-weight:700; color:var(--color-text); }
  .format-badges { display:flex; gap:.35rem; }
  .format-badge { display:flex; align-items:center; gap:.2rem; font-size:.65rem; font-weight:700; padding:.15rem .45rem; border-radius:.3rem; background:var(--color-surface); border:1px solid var(--color-border); color:var(--color-muted); }
  .drop-zone { border:2px dashed var(--color-border); border-radius:.75rem; padding:2rem; text-align:center; cursor:pointer; transition:all .2s; background:var(--color-surface); }
  .drop-zone:hover { border-color:var(--lc-600,#4f46e5); background:var(--lc-soft,rgba(79,70,229,.03)); }
  .drop-zone.dragging { border-color:var(--lc-600,#4f46e5); background:var(--lc-soft,rgba(79,70,229,.08)); transform:scale(1.01); }
  .drop-content { display:flex; flex-direction:column; align-items:center; gap:.5rem; color:var(--color-muted); }
  .drop-text { font-size:.9rem; font-weight:600; color:var(--color-text); }
  .drop-hint { font-size:.75rem; color:var(--color-muted); }
  .file-name { font-size:.9rem; font-weight:700; color:var(--lc-600,#4f46e5); }
  .file-hint { font-size:.7rem; color:var(--color-muted); }
  .divider { display:flex; align-items:center; gap:.75rem; color:var(--color-muted); font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; }
  .divider::before, .divider::after { content:''; flex:1; height:1px; background:var(--color-border); }
  .code-area { font-family:'Menlo','Consolas',monospace !important; font-size:.78rem !important; line-height:1.6; }
  .bulk-schema { border:1.5px solid var(--color-border); border-radius:.625rem; overflow:hidden; }
  .bulk-schema summary { padding:.6rem .875rem; font-size:.78rem; font-weight:700; color:var(--color-muted); cursor:pointer; background:var(--color-surface); list-style:none; }
  .bulk-schema summary:hover { color:var(--color-text); }
  .schema-pre { padding:.875rem; margin:0; font-family:'Menlo','Consolas',monospace; font-size:.75rem; color:var(--color-text); background:var(--color-bg); overflow-x:auto; line-height:1.7; border-top:1.5px solid var(--color-border); }

  .delete-confirm-text { font-size:.875rem; color:var(--color-muted); line-height:1.6; margin:0 0 .25rem; }

  .form-error { display:flex; align-items:center; gap:.4rem; font-size:.8rem; font-weight:600; color:#ef4444; background:rgba(239,68,68,.07); border:1px solid rgba(239,68,68,.2); border-radius:.5rem; padding:.625rem .875rem; margin:0; }

  .spinner { width:13px; height:13px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .6s linear infinite; display:inline-block; flex-shrink:0; }
  @keyframes spin { to { transform:rotate(360deg); } }

  @media (max-width:640px) {
    .qb-page { padding:1rem 1rem 3rem; }
    h1 { font-size:1.25rem; }
    .header-actions { width:100%; }
    .header-actions .btn { flex:1; justify-content:center; }
    .q-card { gap:.625rem; padding:.875rem .75rem; }
    .q-actions { opacity:1; }
    .field-row { flex-direction:column; }
    .field.narrow { max-width:100%; }
    .modal-body { padding:1.25rem; }
  }
</style>