<!-- src/routes/(lecturer)/exams/[examId]/questions/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { exam, questions } = data;

  // ── Tab state ────────────────────────────────────────────────────────────────
  type Tab = 'mcq' | 'fitb' | 'import';
  let tab = $state<Tab>('mcq');
  let optionCount = $state(4);

  // ── Import state ─────────────────────────────────────────────────────────────
  let importFile = $state<File | null>(null);
  let importFormat = $state<'json' | 'txt' | 'excel'>('json');
  let importPreview = $state<ImportQuestion[]>([]);
  let importError = $state('');
  let importLoading = $state(false);
  let fileInput: HTMLInputElement;

  interface ImportOption  { text: string; correct: boolean; }
  interface ImportQuestion {
    type: 'mcq' | 'fitb';
    body: string;
    marks: number;
    options?: ImportOption[];
    answers?: string[];
    error?: string;
  }

  // ── Parse helpers ─────────────────────────────────────────────────────────────
  async function parseFile(file: File): Promise<ImportQuestion[]> {
    const name = file.name.toLowerCase();

    if (name.endsWith('.json')) {
      return parseJSON(await file.text());
    } else if (name.endsWith('.txt')) {
      return parseTXT(await file.text());
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return parseExcel(await file.arrayBuffer());
    }
    throw new Error('Unsupported file type. Use .json, .txt, or .xlsx');
  }

  function parseJSON(text: string): ImportQuestion[] {
    const raw = JSON.parse(text);
    const arr = Array.isArray(raw) ? raw : raw.questions ?? [];
    return arr.map((q: any, i: number) => {
      if (!q.body && !q.question) return { type: 'mcq', body: '', marks: 1, error: `Row ${i+1}: missing body` };
      const body = (q.body ?? q.question ?? '').trim();
      const marks = Number(q.marks ?? q.mark ?? 1);
      if (q.type === 'fitb' || q.answers) {
        const answers = (q.answers ?? q.acceptedAnswers ?? []).map((a: any) => String(a).trim()).filter(Boolean);
        if (!answers.length) return { type: 'fitb' as const, body, marks, error: 'No answers provided' };
        return { type: 'fitb' as const, body, marks, answers };
      }
      const options = (q.options ?? []).map((o: any) => ({
        text: (typeof o === 'string' ? o : o.text ?? o.optionText ?? '').trim(),
        correct: typeof o === 'object' ? !!(o.correct ?? o.isCorrect) : false,
      })).filter((o: ImportOption) => o.text);
      if (options.length < 2) return { type: 'mcq' as const, body, marks, error: 'Need ≥2 options' };
      if (!options.some((o: ImportOption) => o.correct)) return { type: 'mcq' as const, body, marks, error: 'No correct answer marked' };
      return { type: 'mcq' as const, body, marks, options };
    });
  }

  function parseTXT(text: string): ImportQuestion[] {
    /*
      TXT format (one question per block, blank line between):

      MCQ:
      Q: What is 2+2?
      A) 3
      B) 4 *
      C) 5
      D) 6
      MARKS: 1

      FITB:
      Q: The capital of Nigeria is ___.
      ANS: Abuja, Lagos
      MARKS: 2
    */
    const blocks = text.trim().split(/\n\s*\n/).filter(Boolean);
    return blocks.map((block, i) => {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const qLine = lines.find(l => /^Q:/i.test(l));
      if (!qLine) return { type: 'mcq' as const, body: '', marks: 1, error: `Block ${i+1}: missing Q:` };
      const body = qLine.replace(/^Q:\s*/i, '').trim();
      const marksLine = lines.find(l => /^MARKS?:/i.test(l));
      const marks = marksLine ? Number(marksLine.replace(/^MARKS?:\s*/i, '')) || 1 : 1;
      const ansLine = lines.find(l => /^ANS:/i.test(l));
      if (ansLine) {
        const answers = ansLine.replace(/^ANS:\s*/i, '').split(',').map(a => a.trim()).filter(Boolean);
        if (!answers.length) return { type: 'fitb' as const, body, marks, error: 'No ANS provided' };
        return { type: 'fitb' as const, body, marks, answers };
      }
      // MCQ: lines like "A) Option text *" — asterisk marks correct
      const optLines = lines.filter(l => /^[A-F][.)]/i.test(l));
      const options = optLines.map(l => ({
        text: l.replace(/^[A-F][.)]\s*/i, '').replace(/\s*\*\s*$/, '').trim(),
        correct: l.trim().endsWith('*'),
      })).filter(o => o.text);
      if (options.length < 2) return { type: 'mcq' as const, body, marks, error: 'Need ≥2 A)/B)/... options' };
      if (!options.some(o => o.correct)) return { type: 'mcq' as const, body, marks, error: 'Mark correct with *' };
      return { type: 'mcq' as const, body, marks, options };
    });
  }

  async function parseExcel(buffer: ArrayBuffer): Promise<ImportQuestion[]> {
    // Dynamically import SheetJS from CDN
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    /*
      Expected columns: type, body/question, marks, option_a, option_b, option_c, option_d,
      correct (comma-sep letters like "B" or "A,C"), answers (for FITB, comma-sep)
    */
    return rows.map((row: any, i: number) => {
      const body = String(row.body ?? row.question ?? row.Question ?? '').trim();
      if (!body) return { type: 'mcq' as const, body: '', marks: 1, error: `Row ${i+2}: missing body` };
      const marks = Number(row.marks ?? row.Marks ?? 1) || 1;
      const type = String(row.type ?? row.Type ?? 'mcq').toLowerCase().trim();
      if (type === 'fitb') {
        const answers = String(row.answers ?? row.Answers ?? '').split(',').map((a: string) => a.trim()).filter(Boolean);
        if (!answers.length) return { type: 'fitb' as const, body, marks, error: 'No answers column' };
        return { type: 'fitb' as const, body, marks, answers };
      }
      const correct = String(row.correct ?? row.Correct ?? '').toUpperCase().split(',').map((s: string) => s.trim());
      const letters = ['A','B','C','D','E','F'];
      const options = letters.map(l => {
        const text = String(row[`option_${l.toLowerCase()}`] ?? row[`Option ${l}`] ?? '').trim();
        return { text, correct: correct.includes(l) };
      }).filter(o => o.text);
      if (options.length < 2) return { type: 'mcq' as const, body, marks, error: 'Need option_a, option_b…' };
      if (!options.some(o => o.correct)) return { type: 'mcq' as const, body, marks, error: 'No correct column' };
      return { type: 'mcq' as const, body, marks, options };
    });
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    importFile = file;
    importError = '';
    importPreview = [];
    importLoading = true;
    try {
      importPreview = await parseFile(file);
    } catch (err: any) {
      importError = err.message ?? 'Failed to parse file';
    } finally {
      importLoading = false;
    }
  }

  const validImports = $derived(importPreview.filter(q => !q.error));
  const invalidImports = $derived(importPreview.filter(q => q.error));

  // Serialise valid questions for server submission
  const importPayload = $derived(JSON.stringify(validImports));

  // ── Total marks derived ───────────────────────────────────────────────────────
  const totalMarks = $derived(questions.reduce((s, q) => s + q.marks, 0));

  // ── Reset MCQ form after success ─────────────────────────────────────────────
  $effect(() => {
    if (form?.success) optionCount = 4;
  });
</script>

<svelte:head><title>Questions — {exam.title}</title></svelte:head>

<div class="page">

  <!-- ── Page header ─────────────────────────────────────────────────────────── -->
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
          <span class="meta-chip">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          <span class="meta-chip">{totalMarks} total marks</span>
        </div>
      </div>
      <a href="/lecturer/exams/{exam.id}" class="btn ghost">Exam Settings</a>
    </div>
  </header>

  <!-- ── Alerts ───────────────────────────────────────────────────────────────── -->
  {#if form?.addError}
    <div class="alert error">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {form.addError}
    </div>
  {/if}
  {#if form?.success}
    <div class="alert success">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Question added successfully.
    </div>
  {/if}
  {#if form?.importSuccess}
    <div class="alert success">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      {form.importSuccess} question{form.importSuccess !== 1 ? 's' : ''} imported successfully.
    </div>
  {/if}

  <div class="layout">

    <!-- ══ LEFT: Add / Import panel ════════════════════════════════════════════ -->
    <aside class="panel">

      <!-- Tab bar -->
      <div class="tab-bar">
        <button type="button" class="tab" class:active={tab === 'mcq'}    onclick={() => tab = 'mcq'}>MCQ</button>
        <button type="button" class="tab" class:active={tab === 'fitb'}   onclick={() => tab = 'fitb'}>Fill-in-Blank</button>
        <button type="button" class="tab import-tab" class:active={tab === 'import'} onclick={() => tab = 'import'}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import
        </button>
      </div>

      <!-- ── MCQ form ───────────────────────────────────────────────────────── -->
      {#if tab === 'mcq'}
        <form method="POST" action="?/addMCQ" use:enhance class="q-form">
          <div class="field">
            <label for="mcq-body">Question <span class="req">*</span></label>
            <textarea id="mcq-body" name="body" rows="3" required placeholder="Type your question here…"></textarea>
          </div>

          <div class="field narrow">
            <label for="mcq-marks">Marks</label>
            <div class="num-wrap">
              <input id="mcq-marks" name="marks" type="number" value="1" min="1" max="20" />
              <span class="num-unit">pts</span>
            </div>
          </div>

          <div class="options-head">
            <span class="options-label">Answer Options</span>
            <span class="hint">✓ = correct answer</span>
          </div>

          {#each Array(optionCount) as _, i}
            <div class="option-row">
              <label class="opt-check-wrap" title="Mark as correct">
                <input type="checkbox" name="correct_{i}" id="correct_{i}" class="opt-cb" />
                <span class="opt-check-box"></span>
              </label>
              <span class="opt-letter">{String.fromCharCode(65 + i)}</span>
              <input type="text" name="option_{i}" placeholder="Option {String.fromCharCode(65 + i)}" class="opt-text" />
            </div>
          {/each}

          {#if optionCount < 6}
            <button type="button" class="add-opt-btn" onclick={() => optionCount++}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add option
            </button>
          {/if}

          <button type="submit" class="btn primary submit-btn">Add MCQ Question</button>
        </form>

      <!-- ── FITB form ──────────────────────────────────────────────────────── -->
      {:else if tab === 'fitb'}
        <form method="POST" action="?/addFITB" use:enhance class="q-form">
          <div class="field">
            <label for="fitb-body">
              Question <span class="req">*</span>
              <span class="hint">use ___ for the blank</span>
            </label>
            <textarea id="fitb-body" name="body" rows="3" required placeholder="The capital of Nigeria is ___."></textarea>
          </div>

          <div class="field narrow">
            <label for="fitb-marks">Marks</label>
            <div class="num-wrap">
              <input id="fitb-marks" name="marks" type="number" value="2" min="1" max="20" />
              <span class="num-unit">pts</span>
            </div>
          </div>

          <div class="options-head">
            <span class="options-label">Accepted Answers</span>
            <span class="hint">case-insensitive</span>
          </div>

          {#each Array(3) as _, i}
            <div class="ans-row">
              {#if i === 0}
                <span class="ans-badge primary">Primary</span>
              {:else}
                <span class="ans-badge alt">Alt {i}</span>
              {/if}
              <input
                type="text"
                name="answer_{i}"
                class="ans-input"
                placeholder={i === 0 ? 'Required answer…' : 'Alternative spelling…'}
              />
            </div>
          {/each}

          <button type="submit" class="btn primary submit-btn">Add FITB Question</button>
        </form>

      <!-- ── Import form ────────────────────────────────────────────────────── -->
      {:else}
        <div class="import-panel">

          <!-- Format guide -->
          <div class="format-guide">
            <p class="guide-title">Supported formats</p>
            <div class="format-cards">
              <div class="format-card">
                <span class="fmt-badge json">JSON</span>
                <code class="fmt-example">[{"{"}"type":"mcq","body":"Q?","marks":1,"options":[{"{"}"text":"A","correct":false{"}"},{"{"}"text":"B","correct":true{"}"}]{"}"}]</code>
              </div>
              <div class="format-card">
                <span class="fmt-badge txt">TXT</span>
                <code class="fmt-example">Q: Question text?{"\n"}A) Option A{"\n"}B) Option B *{"\n"}MARKS: 1</code>
              </div>
              <div class="format-card">
                <span class="fmt-badge excel">XLSX</span>
                <code class="fmt-example">Columns: type, body, marks, option_a…option_d, correct (e.g. "B"), answers</code>
              </div>
            </div>
          </div>

          <!-- Drop zone -->
          <label
            class="drop-zone"
            class:has-file={!!importFile}
            onclick={() => fileInput.click()}
            onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
            role="button"
            tabindex="0"
          >
            <input
              bind:this={fileInput}
              type="file"
              accept=".json,.txt,.xlsx,.xls"
              onchange={handleFileChange}
              class="file-input-hidden"
            />
            {#if importFile}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span class="drop-filename">{importFile.name}</span>
              <span class="drop-sub">Click to change</span>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span class="drop-title">Choose file to import</span>
              <span class="drop-sub">.json · .txt · .xlsx</span>
            {/if}
          </label>

          {#if importLoading}
            <div class="import-loading">
              <span class="spinner"></span> Parsing file…
            </div>
          {/if}

          {#if importError}
            <div class="alert error">{importError}</div>
          {/if}

          {#if importPreview.length > 0}
            <div class="import-summary">
              <span class="sum-ok">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {validImports.length} ready
              </span>
              {#if invalidImports.length > 0}
                <span class="sum-err">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {invalidImports.length} skipped
                </span>
              {/if}
            </div>

            <!-- Preview list -->
            <div class="preview-list">
              {#each importPreview as q, i}
                <div class="preview-item" class:preview-error={!!q.error}>
                  <div class="preview-head">
                    <span class="q-num">Q{i+1}</span>
                    <span class="q-type {q.type}">{q.type.toUpperCase()}</span>
                    <span class="q-marks">{q.marks}pt</span>
                    {#if q.error}
                      <span class="preview-err-msg">{q.error}</span>
                    {/if}
                  </div>
                  {#if !q.error}
                    <p class="preview-body">{q.body}</p>
                  {/if}
                </div>
              {/each}
            </div>

            {#if validImports.length > 0}
              <form method="POST" action="?/importQuestions" use:enhance>
                <input type="hidden" name="questions" value={importPayload} />
                <button type="submit" class="btn primary submit-btn">
                  Import {validImports.length} Question{validImports.length !== 1 ? 's' : ''}
                </button>
              </form>
            {/if}
          {/if}
        </div>
      {/if}
    </aside>

    <!-- ══ RIGHT: Question list ═════════════════════════════════════════════════ -->
    <div class="q-list">
      {#if questions.length === 0}
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <p class="empty-title">No questions yet</p>
          <p class="empty-sub">Add your first question using the panel, or import a batch from a file.</p>
        </div>
      {:else}
        {#each questions as q, i}
          <div class="q-card">
            <div class="q-card-header">
              <span class="q-num">Q{i + 1}</span>
              <span class="q-type {q.type}">{q.type === 'mcq' ? 'MCQ' : 'Fill-in-Blank'}</span>
              <span class="q-marks-badge">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              <form method="POST" action="?/deleteQuestion" use:enhance class="delete-form">
                <input type="hidden" name="id" value={q.id} />
                <button
                  type="submit"
                  class="delete-btn"
                  aria-label="Delete question"
                  onclick={(e) => { if (!confirm('Delete this question?')) e.preventDefault(); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </button>
              </form>
            </div>

            <p class="q-body">{q.body}</p>

            {#if q.type === 'mcq' && q.options.length}
              <ul class="q-options">
                {#each q.options as opt}
                  <li class:correct={opt.isCorrect}>
                    <span class="opt-indicator" class:correct={opt.isCorrect}>
                      {#if opt.isCorrect}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      {:else}
                        <span class="opt-dot"></span>
                      {/if}
                    </span>
                    {opt.optionText}
                  </li>
                {/each}
              </ul>
            {:else if q.fitbAnswers?.length}
              <div class="fitb-answers">
                {#each q.fitbAnswers as a, ai}
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
  /* ── Root ─────────────────────────────────────────────────────────────────── */
  .page {
    padding: 1.75rem 2rem 4rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* ── Page header ──────────────────────────────────────────────────────────── */
  .page-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1.125rem;
    border-bottom: 1px solid var(--color-border);
  }
  .back-link {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; font-weight: 600; color: var(--lc-600);
    text-decoration: none; margin-bottom: 0.75rem; transition: gap 0.12s;
  }
  .back-link:hover { gap: 0.5rem; }
  .header-main {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .header-text h1 {
    font-size: 1.65rem; font-weight: 900; letter-spacing: -0.04em;
    color: var(--color-text); margin: 0 0 0.5rem; line-height: 1;
  }
  .header-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .meta-chip {
    font-size: 0.72rem; font-weight: 600;
    padding: 0.2rem 0.6rem; border-radius: 999px;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .meta-chip.course {
    background: var(--lc-soft);
    border-color: rgba(79, 70, 229, 0.2);
    color: var(--lc-600);
  }

  /* ── Alerts ───────────────────────────────────────────────────────────────── */
  .alert {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1rem; border-radius: 0.65rem;
    margin-bottom: 1rem; font-size: 0.83rem;
  }
  .alert.error   { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #dc2626; }
  .alert.success { background: rgba(79, 70, 229, 0.08); border: 1px solid rgba(79, 70, 229, 0.2); color: var(--lc-700); }

  /* ── Layout ───────────────────────────────────────────────────────────────── */
  .layout {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 1.5rem;
    align-items: start;
  }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }

  /* ── Left panel ───────────────────────────────────────────────────────────── */
  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    overflow: hidden;
    position: sticky;
    top: 1.25rem;
  }

  /* ── Tab bar ──────────────────────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .tab {
    flex: 1; padding: 0.75rem 0.5rem;
    background: none; border: none;
    font-size: 0.78rem; font-weight: 700; font-family: inherit;
    cursor: pointer; color: var(--color-muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    text-transform: uppercase; letter-spacing: 0.04em;
    transition: color 0.15s, border-color 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 0.35rem;
  }
  .tab:hover { color: var(--lc-600); }
  .tab.active { color: var(--lc-600); border-bottom-color: var(--lc-600); }
  .import-tab { flex: 0 0 auto; padding-inline: 1rem; }

  /* ── Form shared ──────────────────────────────────────────────────────────── */
  .q-form {
    padding: 1.125rem;
    display: flex; flex-direction: column; gap: 0.875rem;
  }
  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .field.narrow { max-width: 130px; }
  .field label {
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
    display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;
  }
  .req { color: #ef4444; }
  .hint { font-size: 0.72rem; font-weight: 400; color: var(--color-muted); }

  .field textarea {
    padding: 0.575rem 0.75rem;
    border: 1px solid var(--color-border); border-radius: 0.55rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; font-family: inherit;
    outline: none; resize: vertical;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field textarea:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }

  .num-wrap { position: relative; }
  .num-wrap input {
    width: 100%; padding: 0.55rem 2.25rem 0.55rem 0.75rem;
    border: 1px solid var(--color-border); border-radius: 0.55rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.9rem; font-weight: 700; font-family: inherit;
    outline: none; box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .num-wrap input:focus { border-color: var(--lc-600); box-shadow: 0 0 0 3px var(--lc-soft); }
  .num-unit {
    position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%);
    font-size: 0.7rem; font-weight: 700; color: var(--color-muted); pointer-events: none;
  }

  /* ── MCQ options ──────────────────────────────────────────────────────────── */
  .options-head {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.8rem; font-weight: 600; color: var(--color-text);
  }
  .options-label { font-size: 0.8rem; font-weight: 600; }

  .option-row {
    display: flex; align-items: center; gap: 0.5rem;
  }
  .opt-check-wrap { position: relative; flex-shrink: 0; cursor: pointer; }
  .opt-cb { position: absolute; opacity: 0; width: 0; height: 0; }
  .opt-check-box {
    display: block; width: 18px; height: 18px;
    border: 2px solid var(--color-border); border-radius: 4px;
    background: var(--color-bg);
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }
  .opt-cb:checked + .opt-check-box {
    background: var(--lc-600); border-color: var(--lc-600);
  }
  .opt-cb:checked + .opt-check-box::after {
    content: '';
    position: absolute; left: 4px; top: 1px;
    width: 5px; height: 9px;
    border: 2px solid white; border-top: none; border-left: none;
    transform: rotate(45deg);
  }

  .opt-letter {
    flex-shrink: 0; width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 800; color: var(--color-muted);
  }
  .opt-text {
    flex: 1; padding: 0.5rem 0.65rem;
    border: 1px solid var(--color-border); border-radius: 0.45rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.83rem; font-family: inherit; outline: none;
    transition: border-color 0.15s;
  }
  .opt-text:focus { border-color: var(--lc-600); }

  .add-opt-btn {
    display: flex; align-items: center; gap: 0.35rem;
    background: none; border: 1.5px dashed var(--color-border);
    border-radius: 0.45rem; padding: 0.45rem 0.75rem;
    font-size: 0.78rem; font-weight: 600; color: var(--color-muted);
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .add-opt-btn:hover { border-color: var(--lc-600); color: var(--lc-600); }

  /* ── FITB answers ─────────────────────────────────────────────────────────── */
  .ans-row { display: flex; align-items: center; gap: 0.5rem; }
  .ans-badge {
    flex-shrink: 0;
    font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 0.15rem 0.45rem; border-radius: 0.3rem;
  }
  .ans-badge.primary { background: var(--lc-soft); color: var(--lc-700); }
  .ans-badge.alt     { background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-muted); }
  .ans-input {
    flex: 1; padding: 0.5rem 0.65rem;
    border: 1px solid var(--color-border); border-radius: 0.45rem;
    background: var(--color-bg); color: var(--color-text);
    font-size: 0.83rem; font-family: inherit; outline: none;
    transition: border-color 0.15s;
  }
  .ans-input:focus { border-color: var(--lc-600); }

  /* ── Submit button ────────────────────────────────────────────────────────── */
  .submit-btn { margin-top: 0.25rem; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.65rem 1rem; border-radius: 0.65rem;
    font-size: 0.85rem; font-weight: 700; font-family: inherit;
    cursor: pointer; transition: all 0.15s; text-decoration: none;
  }
  .btn.primary {
    width: 100%; background: var(--lc-600); border: 1px solid var(--lc-600); color: white;
  }
  .btn.primary:hover { background: var(--lc-700); border-color: var(--lc-700); }
  .btn.ghost {
    background: transparent; border: 1px solid var(--color-border); color: var(--color-text);
  }
  .btn.ghost:hover { border-color: var(--lc-600); color: var(--lc-600); }

  /* ── Import panel ─────────────────────────────────────────────────────────── */
  .import-panel { padding: 1.125rem; display: flex; flex-direction: column; gap: 0.875rem; }

  .format-guide { }
  .guide-title { font-size: 0.78rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .format-cards { display: flex; flex-direction: column; gap: 0.4rem; }
  .format-card {
    display: flex; align-items: flex-start; gap: 0.5rem;
    padding: 0.5rem 0.65rem;
    background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.5rem;
  }
  .fmt-badge {
    flex-shrink: 0; font-size: 0.65rem; font-weight: 800;
    padding: 0.15rem 0.4rem; border-radius: 0.25rem; margin-top: 0.1rem;
    text-transform: uppercase;
  }
  .fmt-badge.json  { background: rgba(59,130,246,0.12); color: #1d4ed8; }
  .fmt-badge.txt   { background: rgba(245,158,11,0.12); color: #92400e; }
  .fmt-badge.excel { background: rgba(79, 70, 229, 0.12); color: var(--lc-700); }
  .fmt-example {
    font-size: 0.65rem; color: var(--color-muted); line-height: 1.5;
    white-space: pre-wrap; word-break: break-all; font-family: monospace;
  }

  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.4rem; padding: 1.25rem;
    border: 2px dashed var(--color-border); border-radius: 0.75rem;
    cursor: pointer; text-align: center;
    transition: border-color 0.15s, background 0.15s;
    background: var(--color-bg);
  }
  .drop-zone:hover,
  .drop-zone.has-file { border-color: var(--lc-600); background: var(--lc-soft); }
  .file-input-hidden { display: none; }
  .drop-title { font-size: 0.83rem; font-weight: 600; color: var(--color-text); }
  .drop-filename { font-size: 0.83rem; font-weight: 700; color: var(--lc-600); }
  .drop-sub { font-size: 0.72rem; color: var(--color-muted); }

  .import-loading {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.8rem; color: var(--color-muted); padding: 0.25rem 0;
  }
  .spinner {
    width: 14px; height: 14px;
    border: 2px solid var(--color-border);
    border-top-color: var(--lc-600);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .import-summary { display: flex; align-items: center; gap: 0.75rem; }
  .sum-ok, .sum-err {
    display: flex; align-items: center; gap: 0.3rem;
    font-size: 0.78rem; font-weight: 700;
  }
  .sum-ok  { color: var(--lc-600); }
  .sum-err { color: #dc2626; }

  .preview-list { display: flex; flex-direction: column; gap: 0.35rem; max-height: 220px; overflow-y: auto; }
  .preview-list::-webkit-scrollbar { width: 3px; }
  .preview-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
  .preview-item {
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--color-border); border-radius: 0.45rem;
    background: var(--color-bg);
  }
  .preview-item.preview-error { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.04); }
  .preview-head { display: flex; align-items: center; gap: 0.4rem; }
  .preview-body { font-size: 0.78rem; color: var(--color-muted); margin: 0.3rem 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .preview-err-msg { font-size: 0.72rem; color: #dc2626; margin-left: auto; }

  /* ── Question list (right) ────────────────────────────────────────────────── */
  .q-list { display: flex; flex-direction: column; gap: 0.875rem; }

  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 3.5rem 2rem; text-align: center;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 1rem; gap: 0.5rem;
  }
  .empty-icon {
    width: 52px; height: 52px; border-radius: 50%;
    background: var(--lc-soft);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 0.5rem;
  }
  .empty-title { font-size: 0.95rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .empty-sub   { font-size: 0.82rem; color: var(--color-muted); margin: 0; max-width: 280px; line-height: 1.5; }

  .q-card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.875rem; padding: 1rem;
    display: flex; flex-direction: column; gap: 0.625rem;
    transition: border-color 0.15s;
  }
  .q-card:hover { border-color: rgba(79, 70, 229, 0.3); }

  .q-card-header { display: flex; align-items: center; gap: 0.5rem; }
  .q-num {
    font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--color-muted);
    background: var(--color-bg); border: 1px solid var(--color-border);
    padding: 0.15rem 0.45rem; border-radius: 0.3rem;
  }
  .q-type {
    font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.04em; padding: 0.15rem 0.5rem; border-radius: 999px;
  }
  .q-type.mcq  { background: rgba(59,130,246,0.1); color: #1d4ed8; }
  .q-type.fill_in_the_blank,
  .q-type.fitb { background: rgba(245,158,11,0.1); color: #92400e; }
  .q-marks-badge {
    font-size: 0.72rem; font-weight: 600; color: var(--color-muted);
  }

  .delete-form { margin-left: auto; }
  .delete-btn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px;
    background: none; border: 1px solid var(--color-border); border-radius: 0.4rem;
    cursor: pointer; color: var(--color-muted);
    transition: all 0.15s;
  }
  .delete-btn:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); color: #dc2626; }

  .q-body { font-size: 0.9rem; margin: 0; line-height: 1.55; color: var(--color-text); }

  .q-options {
    list-style: none; padding: 0; margin: 0;
    display: flex; flex-direction: column; gap: 0.3rem;
  }
  .q-options li {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.82rem; padding: 0.35rem 0.65rem;
    border-radius: 0.45rem;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    background: var(--color-bg);
  }
  .q-options li.correct {
    border-color: rgba(79, 70, 229, 0.35);
    background: rgba(79, 70, 229, 0.06);
    color: var(--lc-700);
  }
  .opt-indicator {
    width: 16px; height: 16px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    border: 1.5px solid var(--color-border);
  }
  .opt-indicator.correct {
    background: var(--lc-600); border-color: var(--lc-600); color: white;
  }
  .opt-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--color-muted);
  }

  .fitb-answers { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .ans-chip {
    display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.75rem; font-weight: 600;
    padding: 0.2rem 0.55rem; border-radius: 999px;
    background: var(--color-bg); border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .ans-chip.primary-ans {
    background: var(--lc-soft);
    border-color: rgba(79, 70, 229, 0.25);
    color: var(--lc-700);
  }

  /* ── Dark mode ────────────────────────────────────────────────────────────── */
  :global(.dark) .q-options li.correct { background: rgba(79, 70, 229, 0.1); color: var(--lc-400); }
  :global(.dark) .ans-chip.primary-ans { color: var(--lc-400); }
</style>