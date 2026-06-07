<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { exam, questions, invigilators, assignments, conflicts, existingBodies } = data;

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  type Tab = 'mcq' | 'fitb' | 'import' | 'bank' | 'invigilators' | 'settings';
  let tab = $state<Tab>('mcq');
  let optionCount = $state(4);

  // ── Loading states ────────────────────────────────────────────────────────────
  let submitting    = $state(false);
  let importing     = $state(false);
  let assigning     = $state(false);
  let activating    = $state(false);
  let savingSettings= $state(false);

  // ── Confirm modal ─────────────────────────────────────────────────────────────
  let showActivateModal = $state(false);
  let showDeleteModal   = $state<string | null>(null); // question id
  let showRemoveInvModal= $state<string | null>(null); // invigilator id

  // ── Import state ──────────────────────────────────────────────────────────────
  let importFile     = $state<File | null>(null);
  let importPreview  = $state<ImportQuestion[]>([]);
  let importError    = $state('');
  let importLoading  = $state(false);
  let importProgress = $state(0);
  let fileInput: HTMLInputElement;

  // ── Settings state ────────────────────────────────────────────────────────────
  let settingsQTP   = $state(exam.questionsToPresent ?? 0);
  let settingsRandQ = $state(exam.randomizeQuestions);
  let settingsRandO = $state(exam.randomizeOptions);
  let settingsShow  = $state(exam.showResultAfter);
  let settingsMaxV  = $state(exam.maxViolations ?? 5);

  // ── Invigilator ───────────────────────────────────────────────────────────────
  let selectedInvId = $state('');

  // ── Bank search ───────────────────────────────────────────────────────────────
  let bankSearch = $state('');
  let bankFilter = $state<'all' | 'mcq' | 'fitb'>('all');
  const filteredBank = $derived(questions.filter(q => {
    const matchType = bankFilter === 'all' || q.type === bankFilter ||
      (bankFilter === 'fitb' && q.type === 'fill_in_the_blank');
    const matchSearch = !bankSearch || q.body.toLowerCase().includes(bankSearch.toLowerCase());
    return matchType && matchSearch;
  }));

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalMarks = $derived(questions.reduce((s, q) => s + q.marks, 0));
  const mcqCount   = $derived(questions.filter(q => q.type === 'mcq').length);
  const fitbCount  = $derived(questions.filter(q => q.type !== 'mcq').length);

  // ── QTP validation ────────────────────────────────────────────────────────────
  const qtpWarning = $derived(
    settingsQTP > 0 && settingsQTP > questions.length
      ? `Exceeds question pool (${questions.length})`
      : settingsQTP > 0 && settingsQTP < 5
        ? 'Very few questions per student'
        : ''
  );

  // ── Assigned IDs set ──────────────────────────────────────────────────────────
  const assignedIds = $derived(new Set(assignments.map((a: any) => a.invigilatorId)));

  interface ImportOption  { text: string; correct: boolean; }
  interface ImportQuestion {
    type: 'mcq' | 'fitb';
    body: string;
    marks: number;
    topic?: string;
    options?: ImportOption[];
    answers?: string[];
    error?: string;
    duplicate?: boolean;
  }

  // ── Parsers ───────────────────────────────────────────────────────────────────
  async function parseFile(file: File): Promise<ImportQuestion[]> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.json'))              return parseJSON(await file.text());
    if (name.endsWith('.txt'))               return parseTXT(await file.text());
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcel(await file.arrayBuffer());
    throw new Error('Unsupported file type. Use .json, .txt, or .xlsx');
  }

  function markDuplicates(qs: ImportQuestion[]): ImportQuestion[] {
    const existingSet = new Set(existingBodies);
    return qs.map(q => ({
      ...q,
      duplicate: !q.error && existingSet.has(q.body?.trim().toLowerCase() ?? ''),
    }));
  }

  function parseJSON(text: string): ImportQuestion[] {
    const raw = JSON.parse(text);
    const arr = Array.isArray(raw) ? raw : raw.questions ?? [];
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('JSON must be an array of question objects');
    return arr.map((q: any, i: number) => {
      const body = (q.body ?? q.question ?? '').trim();
      if (!body) return { type: 'mcq' as const, body: '', marks: 1, error: `Row ${i+1}: missing body/question field` };
      const marks = Number(q.marks ?? q.mark ?? 1) || 1;
      const topic = q.topic ?? q.category ?? undefined;
      if (q.type === 'fitb' || q.answers) {
        const answers = (q.answers ?? q.acceptedAnswers ?? []).map((a: any) => String(a).trim()).filter(Boolean);
        if (!answers.length) return { type: 'fitb' as const, body, marks, topic, error: 'No answers provided' };
        return { type: 'fitb' as const, body, marks, topic, answers };
      }
      const options = (q.options ?? []).map((o: any) => ({
        text: (typeof o === 'string' ? o : o.text ?? o.optionText ?? '').trim(),
        correct: typeof o === 'object' ? !!(o.correct ?? o.isCorrect) : false,
      })).filter((o: ImportOption) => o.text);
      if (options.length < 2) return { type: 'mcq' as const, body, marks, topic, error: 'Need ≥2 options' };
      if (!options.some((o: ImportOption) => o.correct)) return { type: 'mcq' as const, body, marks, topic, error: 'No correct answer marked' };
      return { type: 'mcq' as const, body, marks, topic, options };
    });
  }

  function parseTXT(text: string): ImportQuestion[] {
    const blocks = text.trim().split(/\n\s*\n/).filter(Boolean);
    if (blocks.length === 0) throw new Error('No question blocks found. Separate questions with a blank line.');
    return blocks.map((block, i) => {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const qLine = lines.find(l => /^Q:/i.test(l));
      if (!qLine) return { type: 'mcq' as const, body: '', marks: 1, error: `Block ${i+1}: missing Q: line` };
      const body = qLine.replace(/^Q:\s*/i, '').trim();
      const marksLine = lines.find(l => /^MARKS?:/i.test(l));
      const marks = marksLine ? Number(marksLine.replace(/^MARKS?:\s*/i, '')) || 1 : 1;
      const topicLine = lines.find(l => /^TOPIC:/i.test(l));
      const topic = topicLine ? topicLine.replace(/^TOPIC:\s*/i, '').trim() : undefined;
      const ansLine = lines.find(l => /^ANS:/i.test(l));
      if (ansLine) {
        const answers = ansLine.replace(/^ANS:\s*/i, '').split(',').map(a => a.trim()).filter(Boolean);
        if (!answers.length) return { type: 'fitb' as const, body, marks, topic, error: 'No ANS provided' };
        return { type: 'fitb' as const, body, marks, topic, answers };
      }
      const optLines = lines.filter(l => /^[A-F][.)]/i.test(l));
      const options = optLines.map(l => ({
        text: l.replace(/^[A-F][.)]\s*/i, '').replace(/\s*\*\s*$/, '').trim(),
        correct: l.trim().endsWith('*'),
      })).filter(o => o.text);
      if (options.length < 2) return { type: 'mcq' as const, body, marks, topic, error: 'Need ≥2 options (A) B)...)' };
      if (!options.some(o => o.correct)) return { type: 'mcq' as const, body, marks, topic, error: 'Mark correct with *' };
      return { type: 'mcq' as const, body, marks, topic, options };
    });
  }

  async function parseExcel(buffer: ArrayBuffer): Promise<ImportQuestion[]> {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm' as any);
    const wb   = XLSX.read(buffer, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (rows.length === 0) throw new Error('Spreadsheet is empty or has no data rows');
    return rows.map((row: any, i: number) => {
      const body = String(row.body ?? row.question ?? row.Question ?? '').trim();
      if (!body) return { type: 'mcq' as const, body: '', marks: 1, error: `Row ${i+2}: missing body column` };
      const marks = Number(row.marks ?? row.Marks ?? 1) || 1;
      const topic = String(row.topic ?? row.Topic ?? '').trim() || undefined;
      const type  = String(row.type ?? row.Type ?? 'mcq').toLowerCase().trim();
      if (type === 'fitb') {
        const answers = String(row.answers ?? row.Answers ?? '').split(',').map((a: string) => a.trim()).filter(Boolean);
        if (!answers.length) return { type: 'fitb' as const, body, marks, topic, error: 'No answers column' };
        return { type: 'fitb' as const, body, marks, topic, answers };
      }
      const correct = String(row.correct ?? row.Correct ?? '').toUpperCase().split(',').map((s: string) => s.trim());
      const letters = ['A','B','C','D','E','F'];
      const options = letters.map(l => ({
        text:    String(row[`option_${l.toLowerCase()}`] ?? row[`Option ${l}`] ?? '').trim(),
        correct: correct.includes(l),
      })).filter(o => o.text);
      if (options.length < 2) return { type: 'mcq' as const, body, marks, topic, error: 'Need option_a, option_b…' };
      if (!options.some(o => o.correct)) return { type: 'mcq' as const, body, marks, topic, error: 'No correct column' };
      return { type: 'mcq' as const, body, marks, topic, options };
    });
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Validation
    const name = file.name.toLowerCase();
    if (!name.endsWith('.json') && !name.endsWith('.txt') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      importError   = 'Invalid file type. Please use .json, .txt, or .xlsx';
      importFile    = null;
      importPreview = [];
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      importError   = 'File too large. Maximum 5 MB.';
      importFile    = null;
      importPreview = [];
      return;
    }

    importFile    = file;
    importError   = '';
    importPreview = [];
    importLoading = true;
    importProgress = 0;

    // Simulate progress while parsing
    const progressInterval = setInterval(() => {
      if (importProgress < 85) importProgress += 15;
    }, 120);

    try {
      const parsed  = await parseFile(file);
      importPreview = markDuplicates(parsed);
      importProgress = 100;
    } catch (err: any) {
      importError = err.message ?? 'Failed to parse file';
    } finally {
      clearInterval(progressInterval);
      importLoading = false;
    }
  }

  const validImports  = $derived(importPreview.filter(q => !q.error && !q.duplicate));
  const dupImports    = $derived(importPreview.filter(q => q.duplicate));
  const invalidImports= $derived(importPreview.filter(q => !!q.error));
  const importPayload = $derived(JSON.stringify(validImports));

  // ── Download templates ────────────────────────────────────────────────────────
  function downloadTemplate(format: 'json' | 'txt' | 'xlsx') {
    if (format === 'json') {
      const sample = [
        { type: 'mcq', body: 'What does CPU stand for?', marks: 1, topic: 'Hardware',
          options: [
            { text: 'Central Processing Unit', correct: true },
            { text: 'Central Program Unit',    correct: false },
            { text: 'Core Processing Unit',    correct: false },
            { text: 'Central Processor Unit',  correct: false },
          ]
        },
        { type: 'fitb', body: 'The binary representation of 10 in decimal is ___.', marks: 2, topic: 'Number Systems',
          answers: ['1010', '0b1010']
        },
      ];
      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
      dl(blob, 'questions-template.json');
    } else if (format === 'txt') {
      const content = [
        'Q: What does CPU stand for?',
        'A) Central Processing Unit *',
        'B) Central Program Unit',
        'C) Core Processing Unit',
        'D) Central Processor Unit',
        'MARKS: 1',
        'TOPIC: Hardware',
        '',
        'Q: The binary representation of 10 in decimal is ___.',
        'ANS: 1010, 0b1010',
        'MARKS: 2',
        'TOPIC: Number Systems',
      ].join('\n');
      dl(new Blob([content], { type: 'text/plain' }), 'questions-template.txt');
    } else {
      // XLSX — build CSV-like content as XLSX is complex without the lib on server
      const rows = [
        ['type','body','marks','topic','option_a','option_b','option_c','option_d','correct','answers'],
        ['mcq','What does CPU stand for?',1,'Hardware','Central Processing Unit','Central Program Unit','Core Processing Unit','Central Processor Unit','A',''],
        ['fitb','The binary representation of 10 in decimal is ___.', 2,'Number Systems','','','','','','1010, 0b1010'],
      ];
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      dl(new Blob([csv], { type: 'text/csv' }), 'questions-template.csv');
    }
  }
  function dl(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Reset form after success ──────────────────────────────────────────────────
  $effect(() => {
    if (form?.success)        optionCount = 4;
    if (form?.importSuccess) { importFile = null; importPreview = []; importProgress = 0; }
    if (form?.assignSuccess)  selectedInvId = '';
    submitting    = false;
    importing     = false;
    assigning     = false;
    activating    = false;
    savingSettings= false;
  });
</script>

<svelte:head><title>Questions — {exam.title}</title></svelte:head>

<!-- ── Activate Confirm Modal ──────────────────────────────────────────────────── -->
{#if showActivateModal}
  <div class="modal-backdrop" role="dialog" aria-modal="true">
    <div class="modal-card">
      <div class="modal-icon activate">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>
      <h2 class="modal-title">Activate Exam?</h2>
      <p class="modal-desc">
        This will make the exam <strong>live</strong> immediately.
        Students matching the scope criteria can start taking it.
        {#if exam.scheduledStart}<br/>Scheduled for {new Date(exam.scheduledStart).toLocaleString('en-GB')}.{/if}
      </p>
      <div class="modal-checks">
        <div class="check-row" class:ok={questions.length > 0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {questions.length} question{questions.length !== 1 ? 's' : ''} in bank
        </div>
        <div class="check-row" class:ok={assignments.length > 0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {assignments.length} invigilator{assignments.length !== 1 ? 's' : ''} assigned
        </div>
        <div class="check-row ok">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {exam.durationMinutes}min · {exam.totalMarks} marks · pass {exam.passMark}
        </div>
      </div>
      {#if form?.activateError}
        <div class="modal-error">{form.activateError}</div>
      {/if}
      <div class="modal-actions">
        <button class="btn ghost" onclick={() => showActivateModal = false}>Cancel</button>
        <form method="POST" action="?/activateExam" use:enhance={() => {
          activating = true;
          return async ({ update }) => { await update(); activating = false; if (!form?.activateError) showActivateModal = false; };
        }}>
          <button type="submit" class="btn activate-btn" disabled={activating || questions.length === 0}>
            {#if activating}<span class="spinner-sm"></span>{/if}
            {activating ? 'Activating…' : 'Yes, Go Live'}
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- ── Delete Question Confirm ──────────────────────────────────────────────────── -->
{#if showDeleteModal}
  <div class="modal-backdrop" role="dialog" aria-modal="true">
    <div class="modal-card small">
      <h2 class="modal-title">Delete Question?</h2>
      <p class="modal-desc">This cannot be undone.</p>
      <div class="modal-actions">
        <button class="btn ghost" onclick={() => showDeleteModal = null}>Cancel</button>
        <form method="POST" action="?/deleteQuestion" use:enhance={() => {
          return async ({ update }) => { await update(); showDeleteModal = null; };
        }}>
          <input type="hidden" name="id" value={showDeleteModal} />
          <button type="submit" class="btn danger-btn">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- ── Remove Invigilator Confirm ───────────────────────────────────────────────── -->
{#if showRemoveInvModal}
  <div class="modal-backdrop" role="dialog" aria-modal="true">
    <div class="modal-card small">
      <h2 class="modal-title">Remove Invigilator?</h2>
      <p class="modal-desc">They will no longer be assigned to this exam.</p>
      <div class="modal-actions">
        <button class="btn ghost" onclick={() => showRemoveInvModal = null}>Cancel</button>
        <form method="POST" action="?/removeInvigilator" use:enhance={() => {
          return async ({ update }) => { await update(); showRemoveInvModal = null; };
        }}>
          <input type="hidden" name="invigilator_id" value={showRemoveInvModal} />
          <button type="submit" class="btn danger-btn">Remove</button>
        </form>
      </div>
    </div>
  </div>
{/if}

<div class="page">

  <!-- ── Header ───────────────────────────────────────────────────────────────── -->
  <header class="page-header">
    <a href="/lecturer" class="back-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Dashboard
    </a>
    <div class="header-main">
      <div class="header-text">
        <h1>{exam.title}</h1>
        <div class="header-meta">
          <span class="meta-chip course">{exam.course?.code ?? ''}</span>
          <span class="meta-chip">{questions.length} Qs</span>
          <span class="meta-chip">{totalMarks} marks</span>
          <span class="meta-chip">{mcqCount} MCQ · {fitbCount} FITB</span>
          {#if exam.questionsToPresent > 0}
            <span class="meta-chip accent">{exam.questionsToPresent} per student</span>
          {/if}
          <span class="status-pill status-{exam.status}">{exam.status}</span>
        </div>
      </div>
      <div class="header-actions">
        <a href="/lecturer/exams/{exam.id}" class="btn ghost">Settings</a>
        {#if exam.status === 'draft' || exam.status === 'scheduled'}
          <button class="btn activate-btn" onclick={() => showActivateModal = true}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Go Live
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- ── Alerts ────────────────────────────────────────────────────────────────── -->
  {#if form?.addError}
    <div class="alert error"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{form.addError}</div>
  {/if}
  {#if form?.success}
    <div class="alert success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Question added.</div>
  {/if}
  {#if form?.importSuccess}
    <div class="alert success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      {form.importSuccess} imported{form.importSkipped ? `, ${form.importSkipped} skipped (duplicates)` : ''}.
    </div>
  {/if}
  {#if form?.invigilatorError}
    <div class="alert error"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>{form.invigilatorError}</div>
  {/if}
  {#if form?.assignSuccess}
    <div class="alert success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Invigilator assigned.</div>
  {/if}
  {#if form?.settingsError}
    <div class="alert error"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>{form.settingsError}</div>
  {/if}
  {#if form?.settingsSuccess}
    <div class="alert success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Settings saved.</div>
  {/if}

  <div class="layout">

    <!-- ══ LEFT PANEL ═════════════════════════════════════════════════════════ -->
    <aside class="panel">

      <!-- Tab bar -->
      <div class="tab-bar">
        <button class="tab" class:active={tab==='mcq'}          onclick={() => tab='mcq'}>MCQ</button>
        <button class="tab" class:active={tab==='fitb'}         onclick={() => tab='fitb'}>FITB</button>
        <button class="tab" class:active={tab==='import'}       onclick={() => tab='import'}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import
        </button>
        <button class="tab" class:active={tab==='bank'}         onclick={() => tab='bank'}>Bank</button>
        <button class="tab" class:active={tab==='invigilators'} onclick={() => tab='invigilators'}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          Invig.
        </button>
        <button class="tab" class:active={tab==='settings'}     onclick={() => tab='settings'}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          Options
        </button>
      </div>

      <!-- ── MCQ ──────────────────────────────────────────────────────────────── -->
      {#if tab === 'mcq'}
        <form method="POST" action="?/addMCQ" use:enhance={() => { submitting = true; return async ({update}) => { await update(); submitting = false; }; }} class="q-form">
          <div class="field">
            <label for="mcq-body">Question <span class="req">*</span></label>
            <textarea id="mcq-body" name="body" rows="3" required placeholder="Type your question here…"></textarea>
          </div>
          <div class="two-col">
            <div class="field">
              <label for="mcq-marks">Marks</label>
              <div class="num-wrap"><input id="mcq-marks" name="marks" type="number" value="1" min="1" max="20"/><span class="num-unit">pts</span></div>
            </div>
            <div class="field">
              <label for="mcq-topic">Topic <span class="opt">Optional</span></label>
              <input id="mcq-topic" name="topic" type="text" placeholder="e.g. Algebra"/>
            </div>
          </div>
          <div class="options-head">
            <span>Answer Options</span>
            <span class="hint">✓ = correct</span>
          </div>
          {#each Array(optionCount) as _, i}
            <div class="option-row">
              <label class="opt-check-wrap" title="Mark as correct">
                <input type="checkbox" name="correct_{i}" class="opt-cb"/>
                <span class="opt-check-box"></span>
              </label>
              <span class="opt-letter">{String.fromCharCode(65+i)}</span>
              <input type="text" name="option_{i}" placeholder="Option {String.fromCharCode(65+i)}" class="opt-text"/>
            </div>
          {/each}
          {#if optionCount < 6}
            <button type="button" class="add-opt-btn" onclick={() => optionCount++}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add option
            </button>
          {/if}
          <button type="submit" class="btn primary submit-btn" disabled={submitting}>
            {#if submitting}<span class="spinner-sm"></span>{/if}
            {submitting ? 'Adding…' : 'Add MCQ Question'}
          </button>
        </form>

      <!-- ── FITB ─────────────────────────────────────────────────────────────── -->
      {:else if tab === 'fitb'}
        <form method="POST" action="?/addFITB" use:enhance={() => { submitting = true; return async ({update}) => { await update(); submitting = false; }; }} class="q-form">
          <div class="field">
            <label for="fitb-body">Question <span class="req">*</span> <span class="hint">use ___ for blank</span></label>
            <textarea id="fitb-body" name="body" rows="3" required placeholder="The capital of Nigeria is ___."></textarea>
          </div>
          <div class="two-col">
            <div class="field">
              <label for="fitb-marks">Marks</label>
              <div class="num-wrap"><input id="fitb-marks" name="marks" type="number" value="2" min="1" max="20"/><span class="num-unit">pts</span></div>
            </div>
            <div class="field">
              <label for="fitb-topic">Topic <span class="opt">Optional</span></label>
              <input id="fitb-topic" name="topic" type="text" placeholder="e.g. Geography"/>
            </div>
          </div>
          <div class="options-head"><span>Accepted Answers</span><span class="hint">case-insensitive</span></div>
          {#each Array(3) as _, i}
            <div class="ans-row">
              <span class="ans-badge {i===0?'primary':'alt'}">{i===0?'Primary':`Alt ${i}`}</span>
              <input type="text" name="answer_{i}" class="ans-input" placeholder={i===0?'Required answer…':'Alternative spelling…'}/>
            </div>
          {/each}
          <button type="submit" class="btn primary submit-btn" disabled={submitting}>
            {#if submitting}<span class="spinner-sm"></span>{/if}
            {submitting ? 'Adding…' : 'Add FITB Question'}
          </button>
        </form>

      <!-- ── IMPORT ───────────────────────────────────────────────────────────── -->
      {:else if tab === 'import'}
        <div class="import-panel">
          <div class="template-row">
            <span class="guide-title">Download template:</span>
            <div class="template-btns">
              <button type="button" class="tmpl-btn" onclick={() => downloadTemplate('json')}>JSON</button>
              <button type="button" class="tmpl-btn" onclick={() => downloadTemplate('txt')}>TXT</button>
              <button type="button" class="tmpl-btn" onclick={() => downloadTemplate('xlsx')}>CSV/XLSX</button>
            </div>
          </div>

          <div class="format-cards">
            <div class="format-card"><span class="fmt-badge json">JSON</span><code class="fmt-example">Array of {"{"}"type","body","marks","options"[…]{"}"}</code></div>
            <div class="format-card"><span class="fmt-badge txt">TXT</span><code class="fmt-example">Q: Question?{"\n"}A) Option A{"\n"}B) Correct * {"\n"}MARKS: 1</code></div>
            <div class="format-card"><span class="fmt-badge excel">XLSX/CSV</span><code class="fmt-example">Cols: type, body, marks, option_a…d, correct, answers</code></div>
          </div>

          <label class="drop-zone" class:has-file={!!importFile} onclick={() => fileInput.click()} onkeydown={(e)=>e.key==='Enter'&&fileInput.click()} role="button" tabindex="0">
            <input bind:this={fileInput} type="file" accept=".json,.txt,.xlsx,.xls,.csv" onchange={handleFileChange} class="file-input-hidden"/>
            {#if importFile}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span class="drop-filename">{importFile.name}</span>
              <span class="drop-sub">Click to change</span>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span class="drop-title">Choose file</span>
              <span class="drop-sub">.json · .txt · .xlsx · .csv · max 5MB</span>
            {/if}
          </label>

          {#if importLoading}
            <div class="progress-wrap">
              <div class="progress-bar" style="width:{importProgress}%"></div>
            </div>
            <p class="import-loading-text">Parsing… {importProgress}%</p>
          {/if}

          {#if importError}
            <div class="alert error">{importError}</div>
          {/if}

          {#if importPreview.length > 0}
            <div class="import-summary">
              <span class="sum-ok">{validImports.length} ready</span>
              {#if dupImports.length > 0}<span class="sum-dup">{dupImports.length} duplicate{dupImports.length!==1?'s':''}</span>{/if}
              {#if invalidImports.length > 0}<span class="sum-err">{invalidImports.length} error{invalidImports.length!==1?'s':''}</span>{/if}
            </div>
            <div class="preview-list">
              {#each importPreview as q, i}
                <div class="preview-item" class:preview-error={!!q.error} class:preview-dup={q.duplicate}>
                  <div class="preview-head">
                    <span class="q-num">Q{i+1}</span>
                    <span class="q-type {q.type}">{q.type.toUpperCase()}</span>
                    <span class="q-marks">{q.marks}pt</span>
                    {#if q.duplicate}<span class="dup-badge">DUPLICATE — skip</span>{/if}
                    {#if q.error}<span class="preview-err-msg">{q.error}</span>{/if}
                  </div>
                  {#if !q.error}<p class="preview-body">{q.body.slice(0,80)}{q.body.length>80?'…':''}</p>{/if}
                </div>
              {/each}
            </div>
            {#if validImports.length > 0}
              <form method="POST" action="?/importQuestions" use:enhance={() => { importing = true; return async ({update}) => { await update(); importing = false; }; }}>
                <input type="hidden" name="questions" value={importPayload}/>
                <button type="submit" class="btn primary submit-btn" disabled={importing}>
                  {#if importing}<span class="spinner-sm"></span>{/if}
                  {importing ? 'Importing…' : `Import ${validImports.length} Question${validImports.length!==1?'s':''}`}
                </button>
              </form>
            {/if}
          {/if}
        </div>

      <!-- ── BANK ─────────────────────────────────────────────────────────────── -->
      {:else if tab === 'bank'}
        <div class="bank-panel">
          <div class="bank-search-row">
            <div class="bank-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" bind:value={bankSearch} placeholder="Search questions…"/>
            </div>
            <div class="filter-btns">
              <button class="filter-btn" class:active={bankFilter==='all'}  onclick={() => bankFilter='all'}>All</button>
              <button class="filter-btn" class:active={bankFilter==='mcq'}  onclick={() => bankFilter='mcq'}>MCQ</button>
              <button class="filter-btn" class:active={bankFilter==='fitb'} onclick={() => bankFilter='fitb'}>FITB</button>
            </div>
          </div>
          <p class="bank-count">{filteredBank.length} of {questions.length} question{questions.length!==1?'s':''}</p>
          <div class="bank-list">
            {#if filteredBank.length === 0}
              <p class="bank-empty">No questions match.</p>
            {:else}
              {#each filteredBank as q, i}
                <div class="bank-item">
                  <div class="bank-item-head">
                    <span class="q-num">#{i+1}</span>
                    <span class="q-type {q.type}">{q.type==='mcq'?'MCQ':'FITB'}</span>
                    <span class="q-marks">{q.marks}pt</span>
                    {#if q.topic}<span class="topic-chip">{q.topic}</span>{/if}
                    <button type="button" class="delete-btn" onclick={() => showDeleteModal = q.id} aria-label="Delete">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                  <p class="bank-body">{q.body}</p>
                  {#if q.type === 'mcq' && q.options?.length}
                    <div class="bank-opts">
                      {#each q.options as opt}
                        <span class="opt-pill" class:correct={opt.isCorrect}>{opt.optionText}</span>
                      {/each}
                    </div>
                  {:else if q.fitbAnswers?.length}
                    <div class="bank-opts">
                      {#each q.fitbAnswers as a}
                        <span class="opt-pill" class:correct={a.isPrimary}>{a.acceptedAnswer}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        </div>

      <!-- ── INVIGILATORS ─────────────────────────────────────────────────────── -->
      {:else if tab === 'invigilators'}
        <div class="inv-panel">
          <h3 class="section-lbl">Assigned ({assignments.length})</h3>
          {#if assignments.length === 0}
            <p class="inv-empty">No invigilators assigned yet.</p>
          {:else}
            <div class="inv-list">
              {#each assignments as a}
                <div class="inv-row">
                  <div class="inv-avatar">{a.invigilator.fullName.charAt(0)}</div>
                  <div class="inv-info">
                    <span class="inv-name">{a.invigilator.fullName}</span>
                    <span class="inv-id">{a.invigilator.staffId ?? '—'}</span>
                  </div>
                  <button type="button" class="delete-btn" onclick={() => showRemoveInvModal = a.invigilatorId}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              {/each}
            </div>
          {/if}

          <div class="divider"></div>
          <h3 class="section-lbl">Assign Invigilator</h3>

          {#if !exam.scheduledStart}
            <div class="inv-notice">Set a scheduled time on the exam to enable conflict detection.</div>
          {/if}

          <form method="POST" action="?/assignInvigilator" use:enhance={() => { assigning = true; return async ({update}) => { await update(); assigning = false; }; }} class="inv-form">
            <select bind:value={selectedInvId} name="invigilator_id" class="inv-select">
              <option value="">Select invigilator…</option>
              {#each invigilators as inv}
                {@const alreadyAssigned = assignedIds.has(inv.id)}
                {@const hasConflict = !!conflicts[inv.id]}
                <option value={inv.id} disabled={alreadyAssigned || hasConflict}>
                  {inv.fullName}{alreadyAssigned?' (assigned)':''}{hasConflict?` ⚠ conflict: ${conflicts[inv.id][0]}`:''}
                </option>
              {/each}
            </select>

            {#if selectedInvId && conflicts[selectedInvId]}
              <div class="alert error" style="margin:0">
                ⚠ Time conflict: assigned to "{conflicts[selectedInvId].join(', ')}"
              </div>
            {/if}

            <button type="submit" class="btn primary submit-btn" disabled={assigning || !selectedInvId}>
              {#if assigning}<span class="spinner-sm"></span>{/if}
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </form>
        </div>

      <!-- ── SETTINGS ─────────────────────────────────────────────────────────── -->
      {:else if tab === 'settings'}
        <form method="POST" action="?/updateSettings"
          use:enhance={() => { savingSettings = true; return async ({update}) => { await update(); savingSettings = false; }; }}
          class="q-form settings-form">

          <div class="settings-field">
            <div class="settings-label-group">
              <span class="settings-label">Questions per Student</span>
              <span class="opt-badge">Optional</span>
            </div>
            <div class="qtp-row">
              <div class="num-wrap qtp-input">
                <input name="questions_to_present" type="number" min="0" max="999"
                  bind:value={settingsQTP} placeholder="0"/>
                <span class="num-unit">Qs</span>
              </div>
              <div class="qtp-bubble" class:active={settingsQTP > 0} class:warn={!!qtpWarning}>
                {#if qtpWarning}
                  ⚠ {qtpWarning}
                {:else if settingsQTP > 0}
                  Each student gets <strong>{settingsQTP}</strong> random questions
                {:else}
                  <span class="muted-txt">0 = all questions</span>
                {/if}
              </div>
            </div>
          </div>

          <div class="settings-field">
            <span class="settings-label">Max Violations</span>
            <div class="num-wrap" style="width:100px">
              <input name="max_violations" type="number" min="1" max="20" bind:value={settingsMaxV}/>
              <span class="num-unit">×</span>
            </div>
          </div>

          <div class="toggles">
            <label class="toggle-row">
              <div>
                <span class="toggle-label">Randomize Questions</span>
                <span class="toggle-desc">Shuffle order per student</span>
              </div>
              <div class="toggle-track">
                <input type="checkbox" name="randomize_questions" bind:checked={settingsRandQ} class="toggle-cb"/>
                <span class="toggle-knob"></span>
              </div>
            </label>
            <label class="toggle-row">
              <div>
                <span class="toggle-label">Randomize Options</span>
                <span class="toggle-desc">Shuffle MCQ choices per student</span>
              </div>
              <div class="toggle-track">
                <input type="checkbox" name="randomize_options" bind:checked={settingsRandO} class="toggle-cb"/>
                <span class="toggle-knob"></span>
              </div>
            </label>
            <label class="toggle-row">
              <div>
                <span class="toggle-label">Show Result After Submission</span>
                <span class="toggle-desc">Display score immediately</span>
              </div>
              <div class="toggle-track">
                <input type="checkbox" name="show_result_after" bind:checked={settingsShow} class="toggle-cb"/>
                <span class="toggle-knob"></span>
              </div>
            </label>
          </div>

          <!-- Live preview -->
          <div class="settings-preview">
            <p class="preview-title">Preview</p>
            <div class="preview-rows">
              <div class="prev-row"><span>Pool size</span><strong>{questions.length} questions</strong></div>
              <div class="prev-row"><span>Per student</span><strong>{settingsQTP > 0 ? settingsQTP + ' random' : 'All'}</strong></div>
              <div class="prev-row"><span>Max violations</span><strong>{settingsMaxV}</strong></div>
              <div class="prev-row"><span>Randomize Qs</span><strong>{settingsRandQ ? 'Yes' : 'No'}</strong></div>
              <div class="prev-row"><span>Randomize opts</span><strong>{settingsRandO ? 'Yes' : 'No'}</strong></div>
              <div class="prev-row"><span>Show result</span><strong>{settingsShow ? 'Yes' : 'No'}</strong></div>
            </div>
          </div>

          <button type="submit" class="btn primary submit-btn" disabled={savingSettings || !!qtpWarning}>
            {#if savingSettings}<span class="spinner-sm"></span>{/if}
            {savingSettings ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      {/if}
    </aside>

    <!-- ══ RIGHT: Question list ════════════════════════════════════════════════ -->
    <div class="q-list">
      {#if questions.length === 0}
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <p class="empty-title">No questions yet</p>
          <p class="empty-sub">Add questions using the panel or import a batch file.</p>
        </div>
      {:else}
        {#each questions as q, i}
          <div class="q-card">
            <div class="q-card-header">
              <span class="q-num">Q{i+1}</span>
              <span class="q-type {q.type}">{q.type==='mcq'?'MCQ':'FITB'}</span>
              <span class="q-marks-badge">{q.marks} mark{q.marks!==1?'s':''}</span>
              {#if q.topic}<span class="topic-chip">{q.topic}</span>{/if}
              <button type="button" class="delete-btn" onclick={() => showDeleteModal = q.id} aria-label="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              </button>
            </div>
            <p class="q-body">{q.body}</p>
            {#if q.type === 'mcq' && q.options?.length}
              <ul class="q-options">
                {#each q.options as opt}
                  <li class:correct={opt.isCorrect}>
                    <span class="opt-indicator" class:correct={opt.isCorrect}>
                      {#if opt.isCorrect}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      {:else}<span class="opt-dot"></span>{/if}
                    </span>
                    {opt.optionText}
                  </li>
                {/each}
              </ul>
            {:else if q.fitbAnswers?.length}
              <div class="fitb-answers">
                {#each q.fitbAnswers as a}
                  <span class="ans-chip" class:primary-ans={a.isPrimary}>
                    {#if a.isPrimary}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>{/if}
                    {a.acceptedAnswer}
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

  </div>
</div>

<style>
  :root { --lc-soft:rgba(79,70,229,.08); --lc-600:#4f46e5; --lc-700:#4338ca; }

  .page { padding:1.75rem 2rem 4rem; max-width:1200px; margin:0 auto; }

  /* ── Header ── */
  .page-header { margin-bottom:1.5rem; padding-bottom:1.125rem; border-bottom:1px solid var(--color-border); }
  .back-link { display:inline-flex; align-items:center; gap:.3rem; font-size:.75rem; font-weight:600; color:var(--lc-600); text-decoration:none; margin-bottom:.75rem; }
  .header-main { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .header-text h1 { font-size:1.5rem; font-weight:900; letter-spacing:-.04em; color:var(--color-text); margin:0 0 .5rem; line-height:1; }
  .header-meta { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }
  .header-actions { display:flex; gap:.5rem; }
  .meta-chip { font-size:.72rem; font-weight:600; padding:.2rem .6rem; border-radius:999px; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-muted); }
  .meta-chip.course { background:var(--lc-soft); border-color:rgba(79,70,229,.2); color:var(--lc-600); }
  .meta-chip.accent { background:rgba(22,163,74,.1); border-color:rgba(22,163,74,.2); color:#16a34a; }
  .status-pill { font-size:.68rem; font-weight:700; padding:.2rem .6rem; border-radius:999px; text-transform:capitalize; }
  .status-draft     { background:rgba(100,116,139,.1); color:#64748b; }
  .status-scheduled { background:rgba(37,99,235,.1); color:#2563eb; }
  .status-active    { background:rgba(22,163,74,.1); color:#16a34a; }
  .status-completed { background:rgba(124,58,237,.1); color:#7c3aed; }
  .status-cancelled { background:rgba(220,38,38,.1); color:#dc2626; }

  /* ── Alerts ── */
  .alert { display:flex; align-items:center; gap:.5rem; padding:.75rem 1rem; border-radius:.65rem; margin-bottom:1rem; font-size:.83rem; }
  .alert.error   { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:#dc2626; }
  .alert.success { background:rgba(79,70,229,.08); border:1px solid rgba(79,70,229,.2); color:var(--lc-700); }

  /* ── Layout ── */
  .layout { display:grid; grid-template-columns:380px 1fr; gap:1.5rem; align-items:start; }
  @media(max-width:860px){ .layout { grid-template-columns:1fr; } }

  /* ── Panel ── */
  .panel { background:var(--color-surface); border:1px solid var(--color-border); border-radius:1rem; overflow:hidden; position:sticky; top:1.25rem; max-height:calc(100vh - 2.5rem); overflow-y:auto; }

  /* ── Tab bar ── */
  .tab-bar { display:flex; border-bottom:1px solid var(--color-border); background:var(--color-bg); overflow-x:auto; }
  .tab { flex-shrink:0; padding:.65rem .5rem; background:none; border:none; font-size:.7rem; font-weight:700; font-family:inherit; cursor:pointer; color:var(--color-muted); border-bottom:2px solid transparent; margin-bottom:-1px; text-transform:uppercase; letter-spacing:.04em; transition:color .15s,border-color .15s; display:flex; align-items:center; justify-content:center; gap:.3rem; white-space:nowrap; }
  .tab:hover { color:var(--lc-600); }
  .tab.active { color:var(--lc-600); border-bottom-color:var(--lc-600); }

  /* ── Forms ── */
  .q-form { padding:1.125rem; display:flex; flex-direction:column; gap:.875rem; }
  .field { display:flex; flex-direction:column; gap:.35rem; }
  .field label { font-size:.8rem; font-weight:600; color:var(--color-text); display:flex; align-items:center; gap:.35rem; flex-wrap:wrap; }
  .req { color:#ef4444; }
  .opt { font-size:.7rem; font-weight:400; color:var(--color-muted); }
  .hint { font-size:.72rem; font-weight:400; color:var(--color-muted); }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
  .field textarea, .field input[type=text] { padding:.575rem .75rem; border:1px solid var(--color-border); border-radius:.55rem; background:var(--color-bg); color:var(--color-text); font-size:.875rem; font-family:inherit; outline:none; resize:vertical; transition:border-color .15s,box-shadow .15s; width:100%; box-sizing:border-box; }
  .field textarea:focus, .field input[type=text]:focus { border-color:var(--lc-600); box-shadow:0 0 0 3px var(--lc-soft); }
  .num-wrap { position:relative; }
  .num-wrap input { width:100%; padding:.55rem 2.25rem .55rem .75rem; border:1px solid var(--color-border); border-radius:.55rem; background:var(--color-bg); color:var(--color-text); font-size:.9rem; font-weight:700; font-family:inherit; outline:none; box-sizing:border-box; transition:border-color .15s; }
  .num-wrap input:focus { border-color:var(--lc-600); }
  .num-unit { position:absolute; right:.65rem; top:50%; transform:translateY(-50%); font-size:.7rem; font-weight:700; color:var(--color-muted); pointer-events:none; }
  .options-head { display:flex; align-items:center; justify-content:space-between; font-size:.8rem; font-weight:600; color:var(--color-text); }
  .option-row { display:flex; align-items:center; gap:.5rem; }
  .opt-check-wrap { position:relative; flex-shrink:0; cursor:pointer; }
  .opt-cb { position:absolute; opacity:0; width:0; height:0; }
  .opt-check-box { display:block; width:18px; height:18px; border:2px solid var(--color-border); border-radius:4px; background:var(--color-bg); transition:border-color .15s,background .15s; position:relative; }
  .opt-cb:checked + .opt-check-box { background:var(--lc-600); border-color:var(--lc-600); }
  .opt-cb:checked + .opt-check-box::after { content:''; position:absolute; left:4px; top:1px; width:5px; height:9px; border:2px solid white; border-top:none; border-left:none; transform:rotate(45deg); }
  .opt-letter { flex-shrink:0; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:800; color:var(--color-muted); }
  .opt-text { flex:1; padding:.5rem .65rem; border:1px solid var(--color-border); border-radius:.45rem; background:var(--color-bg); color:var(--color-text); font-size:.83rem; font-family:inherit; outline:none; transition:border-color .15s; }
  .opt-text:focus { border-color:var(--lc-600); }
  .add-opt-btn { display:flex; align-items:center; gap:.35rem; background:none; border:1.5px dashed var(--color-border); border-radius:.45rem; padding:.45rem .75rem; font-size:.78rem; font-weight:600; color:var(--color-muted); cursor:pointer; transition:all .15s; font-family:inherit; }
  .add-opt-btn:hover { border-color:var(--lc-600); color:var(--lc-600); }
  .ans-row { display:flex; align-items:center; gap:.5rem; }
  .ans-badge { flex-shrink:0; font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em; padding:.15rem .45rem; border-radius:.3rem; }
  .ans-badge.primary { background:var(--lc-soft); color:var(--lc-700); }
  .ans-badge.alt { background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-muted); }
  .ans-input { flex:1; padding:.5rem .65rem; border:1px solid var(--color-border); border-radius:.45rem; background:var(--color-bg); color:var(--color-text); font-size:.83rem; font-family:inherit; outline:none; transition:border-color .15s; }
  .ans-input:focus { border-color:var(--lc-600); }

  /* ── Buttons ── */
  .submit-btn { margin-top:.25rem; }
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:.4rem; padding:.625rem 1rem; border-radius:.65rem; font-size:.83rem; font-weight:700; font-family:inherit; cursor:pointer; transition:all .15s; text-decoration:none; }
  .btn:disabled { opacity:.55; cursor:not-allowed; }
  .btn.primary { width:100%; background:var(--lc-600); border:1px solid var(--lc-600); color:white; }
  .btn.primary:hover:not(:disabled) { background:var(--lc-700); border-color:var(--lc-700); }
  .btn.ghost { background:transparent; border:1px solid var(--color-border); color:var(--color-text); }
  .btn.ghost:hover { border-color:var(--lc-600); color:var(--lc-600); }
  .activate-btn { display:inline-flex; align-items:center; gap:.4rem; padding:.55rem 1rem; background:#16a34a; border:1px solid #16a34a; border-radius:.65rem; color:white; font-size:.83rem; font-weight:700; cursor:pointer; transition:all .15s; }
  .activate-btn:hover:not(:disabled) { background:#15803d; }
  .activate-btn:disabled { opacity:.55; cursor:not-allowed; }
  .danger-btn { padding:.625rem 1rem; background:#dc2626; border:1px solid #dc2626; border-radius:.65rem; color:white; font-size:.83rem; font-weight:700; cursor:pointer; }
  .danger-btn:hover { background:#b91c1c; }
  .spinner-sm { width:14px; height:14px; border:2px solid rgba(255,255,255,.4); border-top-color:white; border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* ── Import ── */
  .import-panel { padding:1.125rem; display:flex; flex-direction:column; gap:.875rem; }
  .template-row { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; }
  .guide-title { font-size:.75rem; font-weight:700; color:var(--color-text); white-space:nowrap; }
  .template-btns { display:flex; gap:.35rem; }
  .tmpl-btn { padding:.25rem .6rem; border:1px solid var(--color-border); border-radius:.4rem; background:var(--color-bg); font-size:.72rem; font-weight:700; color:var(--lc-600); cursor:pointer; transition:all .15s; }
  .tmpl-btn:hover { border-color:var(--lc-600); background:var(--lc-soft); }
  .format-cards { display:flex; flex-direction:column; gap:.35rem; }
  .format-card { display:flex; align-items:flex-start; gap:.5rem; padding:.45rem .65rem; background:var(--color-bg); border:1px solid var(--color-border); border-radius:.5rem; }
  .fmt-badge { flex-shrink:0; font-size:.65rem; font-weight:800; padding:.15rem .4rem; border-radius:.25rem; margin-top:.1rem; text-transform:uppercase; }
  .fmt-badge.json { background:rgba(59,130,246,.12); color:#1d4ed8; }
  .fmt-badge.txt  { background:rgba(245,158,11,.12); color:#92400e; }
  .fmt-badge.excel { background:var(--lc-soft); color:var(--lc-700); }
  .fmt-example { font-size:.63rem; color:var(--color-muted); line-height:1.5; white-space:pre-wrap; word-break:break-all; font-family:monospace; }
  .drop-zone { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.4rem; padding:1.25rem; border:2px dashed var(--color-border); border-radius:.75rem; cursor:pointer; text-align:center; transition:border-color .15s,background .15s; background:var(--color-bg); }
  .drop-zone:hover, .drop-zone.has-file { border-color:var(--lc-600); background:var(--lc-soft); }
  .file-input-hidden { display:none; }
  .drop-title { font-size:.83rem; font-weight:600; color:var(--color-text); }
  .drop-filename { font-size:.83rem; font-weight:700; color:var(--lc-600); }
  .drop-sub { font-size:.72rem; color:var(--color-muted); }
  .progress-wrap { height:4px; background:var(--color-border); border-radius:2px; overflow:hidden; }
  .progress-bar { height:100%; background:var(--lc-600); border-radius:2px; transition:width .2s; }
  .import-loading-text { font-size:.75rem; color:var(--color-muted); margin:0; }
  .import-summary { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; }
  .sum-ok  { font-size:.78rem; font-weight:700; color:#16a34a; }
  .sum-err { font-size:.78rem; font-weight:700; color:#dc2626; }
  .sum-dup { font-size:.78rem; font-weight:700; color:#f59e0b; }
  .preview-list { display:flex; flex-direction:column; gap:.3rem; max-height:200px; overflow-y:auto; }
  .preview-item { padding:.45rem .65rem; border:1px solid var(--color-border); border-radius:.45rem; background:var(--color-bg); }
  .preview-item.preview-error { border-color:rgba(239,68,68,.3); background:rgba(239,68,68,.04); }
  .preview-item.preview-dup { opacity:.55; border-style:dashed; }
  .preview-head { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
  .preview-body { font-size:.75rem; color:var(--color-muted); margin:.25rem 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .preview-err-msg { font-size:.7rem; color:#dc2626; }
  .dup-badge { font-size:.65rem; font-weight:700; padding:.1rem .4rem; background:rgba(245,158,11,.15); color:#d97706; border-radius:.25rem; }

  /* ── Bank ── */
  .bank-panel { padding:1.125rem; display:flex; flex-direction:column; gap:.75rem; }
  .bank-search-row { display:flex; gap:.5rem; align-items:center; }
  .bank-search { display:flex; align-items:center; gap:.4rem; flex:1; padding:.45rem .65rem; background:var(--color-bg); border:1px solid var(--color-border); border-radius:.5rem; color:var(--color-muted); }
  .bank-search input { background:none; border:none; outline:none; font-size:.83rem; color:var(--color-text); flex:1; }
  .filter-btns { display:flex; gap:.25rem; }
  .filter-btn { padding:.25rem .55rem; border:1px solid var(--color-border); border-radius:.375rem; background:none; font-size:.72rem; font-weight:600; color:var(--color-muted); cursor:pointer; transition:all .15s; }
  .filter-btn.active { background:var(--lc-soft); border-color:var(--lc-600); color:var(--lc-600); }
  .bank-count { font-size:.75rem; color:var(--color-muted); margin:0; }
  .bank-list { display:flex; flex-direction:column; gap:.5rem; max-height:500px; overflow-y:auto; }
  .bank-empty { font-size:.83rem; color:var(--color-muted); text-align:center; padding:1rem; }
  .bank-item { padding:.75rem; background:var(--color-bg); border:1px solid var(--color-border); border-radius:.625rem; }
  .bank-item-head { display:flex; align-items:center; gap:.4rem; margin-bottom:.35rem; }
  .bank-body { font-size:.83rem; color:var(--color-text); margin:0 0 .35rem; line-height:1.5; }
  .bank-opts { display:flex; flex-wrap:wrap; gap:.25rem; }
  .opt-pill { font-size:.72rem; padding:.2rem .5rem; border-radius:999px; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-muted); }
  .opt-pill.correct { background:rgba(79,70,229,.1); border-color:rgba(79,70,229,.3); color:var(--lc-700); }
  .topic-chip { font-size:.65rem; font-weight:600; padding:.15rem .45rem; background:rgba(245,158,11,.1); border-radius:.25rem; color:#92400e; }

  /* ── Invigilators ── */
  .inv-panel { padding:1.125rem; display:flex; flex-direction:column; gap:.75rem; }
  .section-lbl { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--color-muted); margin:0; }
  .inv-empty { font-size:.8rem; color:var(--color-muted); margin:0; }
  .inv-list { display:flex; flex-direction:column; gap:.4rem; }
  .inv-row { display:flex; align-items:center; gap:.65rem; padding:.55rem .65rem; background:var(--color-bg); border:1px solid var(--color-border); border-radius:.5rem; }
  .inv-avatar { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#16a34a,#15803d); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.8rem; color:white; flex-shrink:0; }
  .inv-info { flex:1; display:flex; flex-direction:column; }
  .inv-name { font-size:.82rem; font-weight:600; color:var(--color-text); }
  .inv-id { font-size:.72rem; color:var(--color-muted); }
  .inv-notice { font-size:.75rem; color:#f59e0b; background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.25); border-radius:.5rem; padding:.5rem .75rem; }
  .inv-form { display:flex; flex-direction:column; gap:.5rem; }
  .inv-select { width:100%; padding:.575rem .75rem; border:1px solid var(--color-border); border-radius:.55rem; background:var(--color-bg); color:var(--color-text); font-size:.875rem; font-family:inherit; outline:none; }
  .inv-select:focus { border-color:var(--lc-600); }
  .divider { height:1px; background:var(--color-border); }

  /* ── Settings ── */
  .settings-form { }
  .settings-field { display:flex; flex-direction:column; gap:.5rem; }
  .settings-label-group { display:flex; align-items:center; justify-content:space-between; }
  .settings-label { font-size:.8rem; font-weight:600; color:var(--color-text); }
  .opt-badge { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--color-muted); background:var(--color-border); padding:.12rem .45rem; border-radius:999px; }
  .qtp-row { display:flex; align-items:center; gap:.75rem; }
  .qtp-input { width:100px; flex-shrink:0; }
  .qtp-bubble { flex:1; font-size:.75rem; padding:.45rem .65rem; background:var(--color-bg); border:1px solid var(--color-border); border-radius:.5rem; transition:all .2s; }
  .qtp-bubble.active { color:var(--lc-600); background:var(--lc-soft); border-color:rgba(79,70,229,.25); }
  .qtp-bubble.warn { color:#d97706; background:rgba(245,158,11,.08); border-color:rgba(245,158,11,.3); }
  .muted-txt { color:var(--color-muted); }
  .toggles { display:flex; flex-direction:column; border:1px solid var(--color-border); border-radius:.65rem; overflow:hidden; }
  .toggle-row { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.75rem 1rem; cursor:pointer; border-bottom:1px solid var(--color-border); transition:background .12s; }
  .toggle-row:last-child { border-bottom:none; }
  .toggle-row:hover { background:var(--lc-soft); }
  .toggle-label { display:block; font-size:.8rem; font-weight:600; color:var(--color-text); margin-bottom:.1rem; }
  .toggle-desc { display:block; font-size:.72rem; color:var(--color-muted); }
  .toggle-track { position:relative; width:38px; height:21px; flex-shrink:0; }
  .toggle-cb { position:absolute; opacity:0; width:0; height:0; }
  .toggle-knob { position:absolute; inset:0; background:var(--color-border); border-radius:999px; transition:background .2s; cursor:pointer; }
  .toggle-knob::after { content:''; position:absolute; width:15px; height:15px; top:3px; left:3px; background:white; border-radius:50%; transition:transform .2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
  .toggle-cb:checked + .toggle-knob { background:var(--lc-600); }
  .toggle-cb:checked + .toggle-knob::after { transform:translateX(17px); }
  .settings-preview { background:var(--color-bg); border:1px solid var(--color-border); border-radius:.65rem; overflow:hidden; }
  .preview-title { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--color-muted); padding:.5rem .75rem; margin:0; border-bottom:1px solid var(--color-border); }
  .preview-rows { padding:.35rem; }
  .prev-row { display:flex; justify-content:space-between; align-items:center; padding:.35rem .5rem; border-radius:.35rem; font-size:.78rem; }
  .prev-row:hover { background:var(--lc-soft); }
  .prev-row span { color:var(--color-muted); }
  .prev-row strong { color:var(--color-text); font-weight:700; }

  /* ── Question list ── */
  .q-list { display:flex; flex-direction:column; gap:.875rem; }
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3.5rem 2rem; text-align:center; background:var(--color-surface); border:1px solid var(--color-border); border-radius:1rem; gap:.5rem; }
  .empty-icon { width:52px; height:52px; border-radius:50%; background:var(--lc-soft); display:flex; align-items:center; justify-content:center; margin-bottom:.5rem; }
  .empty-title { font-size:.95rem; font-weight:700; color:var(--color-text); margin:0; }
  .empty-sub { font-size:.82rem; color:var(--color-muted); margin:0; max-width:280px; line-height:1.5; }
  .q-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:.875rem; padding:1rem; display:flex; flex-direction:column; gap:.625rem; transition:border-color .15s; }
  .q-card:hover { border-color:rgba(79,70,229,.3); }
  .q-card-header { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
  .q-num { font-size:.72rem; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--color-muted); background:var(--color-bg); border:1px solid var(--color-border); padding:.15rem .45rem; border-radius:.3rem; }
  .q-type { font-size:.68rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em; padding:.15rem .5rem; border-radius:999px; }
  .q-type.mcq { background:rgba(59,130,246,.1); color:#1d4ed8; }
  .q-type.fill_in_the_blank, .q-type.fitb { background:rgba(245,158,11,.1); color:#92400e; }
  .q-marks-badge { font-size:.72rem; font-weight:600; color:var(--color-muted); }
  .delete-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; background:none; border:1px solid var(--color-border); border-radius:.4rem; cursor:pointer; color:var(--color-muted); transition:all .15s; margin-left:auto; }
  .delete-btn:hover { background:rgba(239,68,68,.08); border-color:rgba(239,68,68,.3); color:#dc2626; }
  .q-body { font-size:.9rem; margin:0; line-height:1.55; color:var(--color-text); }
  .q-options { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:.3rem; }
  .q-options li { display:flex; align-items:center; gap:.5rem; font-size:.82rem; padding:.35rem .65rem; border-radius:.45rem; border:1px solid var(--color-border); color:var(--color-text); background:var(--color-bg); }
  .q-options li.correct { border-color:rgba(79,70,229,.35); background:rgba(79,70,229,.06); color:var(--lc-700); }
  .opt-indicator { width:16px; height:16px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1.5px solid var(--color-border); }
  .opt-indicator.correct { background:var(--lc-600); border-color:var(--lc-600); color:white; }
  .opt-dot { width:5px; height:5px; border-radius:50%; background:var(--color-muted); }
  .fitb-answers { display:flex; flex-wrap:wrap; gap:.35rem; }
  .ans-chip { display:inline-flex; align-items:center; gap:.25rem; font-size:.75rem; font-weight:600; padding:.2rem .55rem; border-radius:999px; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-muted); }
  .ans-chip.primary-ans { background:var(--lc-soft); border-color:rgba(79,70,229,.25); color:var(--lc-700); }

  /* ── Modals ── */
  .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.55); backdrop-filter:blur(4px); z-index:200; display:flex; align-items:center; justify-content:center; padding:1rem; }
  .modal-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:1rem; padding:2rem 1.75rem 1.5rem; width:100%; max-width:420px; display:flex; flex-direction:column; align-items:center; gap:.75rem; box-shadow:0 20px 60px rgba(0,0,0,.25); }
  .modal-card.small { max-width:320px; }
  .modal-icon { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .modal-icon.activate { background:rgba(22,163,74,.1); color:#16a34a; }
  .modal-title { font-size:1.1rem; font-weight:700; color:var(--color-text); margin:0; text-align:center; }
  .modal-desc { font-size:.82rem; color:var(--color-muted); text-align:center; margin:0; line-height:1.55; }
  .modal-checks { width:100%; display:flex; flex-direction:column; gap:.4rem; }
  .check-row { display:flex; align-items:center; gap:.5rem; font-size:.8rem; padding:.4rem .65rem; border-radius:.45rem; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-muted); }
  .check-row.ok { border-color:rgba(22,163,74,.3); background:rgba(22,163,74,.05); color:#16a34a; }
  .modal-error { width:100%; font-size:.8rem; color:#dc2626; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); padding:.5rem .75rem; border-radius:.45rem; }
  .modal-actions { display:flex; gap:.75rem; width:100%; margin-top:.5rem; }
  .modal-actions .btn { flex:1; }
  .modal-actions form { flex:1; display:flex; }
  .modal-actions form button { width:100%; }
</style>