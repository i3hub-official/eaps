<!-- src/routes/(lecturer)/exams/[examId]/questions/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const { exam, questions } = data;

  let tab = $state<'mcq' | 'fitb'>('mcq');
  let optionCount = $state(4);
</script>

<svelte:head><title>Questions — {exam.title}</title></svelte:head>

<div class="page">
  <div class="page-header">
    <a href="/lecturer" class="back">← Dashboard</a>
    <div>
      <h1>Question Bank</h1>
      <p class="sub">{exam.title} · {questions.length} question{questions.length !== 1 ? 's' : ''}</p>
    </div>
    <a href="/lecturer/exams/{exam.id}" class="btn-outline">Exam Settings</a>
  </div>

  {#if form?.addError}
    <div class="alert error">{form.addError}</div>
  {/if}
  {#if form?.success}
    <div class="alert success">Question added successfully.</div>
  {/if}

  <div class="layout">
    <!-- ── Add question panel ── -->
    <div class="add-panel">
      <div class="tab-bar">
        <button class="tab" class:active={tab === 'mcq'}  onclick={() => { tab = 'mcq'; }}  type="button">MCQ</button>
        <button class="tab" class:active={tab === 'fitb'} onclick={() => { tab = 'fitb'; }} type="button">Fill in the Blank</button>
      </div>

      {#if tab === 'mcq'}
        <form method="POST" action="?/addMCQ" use:enhance class="q-form">
          <div class="field">
            <label for="mcq-body">Question *</label>
            <textarea id="mcq-body" name="body" rows="3" required placeholder="Type your question here…"></textarea>
          </div>
          <div class="field short">
            <label for="mcq-marks">Marks</label>
            <input id="mcq-marks" name="marks" type="number" value="1" min="1" max="20" />
          </div>

          <div class="options-header">
            <span>Options</span>
            <span class="hint">Check the correct answer(s)</span>
          </div>

          {#each Array(optionCount) as _, i}
            <div class="option-row">
              <input type="checkbox" name="correct_{i}" id="correct_{i}" />
              <input type="text" name="option_{i}" placeholder="Option {String.fromCharCode(65 + i)}" />
            </div>
          {/each}

          {#if optionCount < 6}
            <button type="button" class="add-option-btn" onclick={() => { optionCount++; }}>+ Add option</button>
          {/if}

          <button type="submit" class="btn-primary">Add MCQ Question</button>
        </form>

      {:else}
        <form method="POST" action="?/addFITB" use:enhance class="q-form">
          <div class="field">
            <label for="fitb-body">Question * <span class="hint">(use ___ for the blank)</span></label>
            <textarea id="fitb-body" name="body" rows="3" required placeholder="The capital of Nigeria is ___."></textarea>
          </div>
          <div class="field short">
            <label for="fitb-marks">Marks</label>
            <input id="fitb-marks" name="marks" type="number" value="2" min="1" max="20" />
          </div>

          <p class="field-label">Accepted Answers <span class="hint">(case-insensitive)</span></p>
          {#each Array(3) as _, i}
            <input class="answer-input" type="text" name="answer_{i}"
              placeholder={i === 0 ? 'Primary answer *' : `Alternative ${i}`} />
          {/each}

          <button type="submit" class="btn-primary">Add FITB Question</button>
        </form>
      {/if}
    </div>

    <!-- ── Question list ── -->
    <div class="q-list">
      {#if questions.length === 0}
        <div class="empty">No questions yet. Add your first question →</div>
      {:else}
        {#each questions as q, i}
          <div class="q-item">
            <div class="q-header">
              <span class="q-num">Q{i + 1}</span>
              <span class="q-type {q.type === 'mcq' ? 'mcq' : 'fitb'}">
                {q.type === 'mcq' ? 'MCQ' : 'FITB'}
              </span>
              <span class="q-marks">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              <form method="POST" action="?/deleteQuestion" use:enhance class="delete-form">
                <input type="hidden" name="id" value={q.id} />
                <button type="submit" class="delete-btn" onclick={(e) => { if (!confirm('Delete this question?')) e.preventDefault(); }}>✕</button>
              </form>
            </div>
            <p class="q-body">{q.body}</p>
            {#if q.type === 'mcq' && q.options.length}
              <ul class="q-options">
                {#each q.options as opt}
                  <li class:correct={opt.isCorrect}>
                    {#if opt.isCorrect}<span class="tick">✓</span>{/if}
                    {opt.optionText}
                  </li>
                {/each}
              </ul>
            {:else if q.fitbAnswers.length}
              <p class="fitb-ans">Answer: {q.fitbAnswers.map(a => a.acceptedAnswer).join(' / ')}</p>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .page { padding: 2rem; max-width: 1100px; margin: 0 auto; }
  .page-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .back { color: var(--color-primary); text-decoration: none; font-size: 0.875rem; margin-top: 0.25rem; }
  h1   { font-size: 1.3rem; font-weight: 700; margin: 0; }
  .sub { font-size: 0.85rem; color: var(--color-muted); margin: 0.2rem 0 0; }
  .btn-outline {
    margin-left: auto; padding: 0.5rem 1rem; border: 1px solid var(--color-border);
    border-radius: 0.5rem; color: var(--color-text); text-decoration: none; font-size: 0.85rem;
  }

  .alert { padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem; }
  .alert.error   { background: #fee2e2; color: #dc2626; }
  .alert.success { background: #dcfce7; color: #16a34a; }

  .layout { display: grid; grid-template-columns: 380px 1fr; gap: 1.5rem; align-items: start; }
  @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }

  /* ── Add panel ── */
  .add-panel {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden; position: sticky; top: 1rem;
  }

  .tab-bar { display: flex; border-bottom: 1px solid var(--color-border); }
  .tab {
    flex: 1; padding: 0.75rem; background: none; border: none;
    font-size: 0.875rem; font-weight: 600; cursor: pointer; color: var(--color-muted);
    border-bottom: 2px solid transparent; margin-bottom: -1px;
  }
  .tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

  .q-form { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.875rem; }
  .field  { display: flex; flex-direction: column; gap: 0.35rem; }
  .field.short { max-width: 120px; }
  .field label, .field-label { font-size: 0.82rem; font-weight: 500; }
  .hint { font-weight: 400; color: var(--color-muted); font-size: 0.78rem; }

  .field textarea, .field input[type=number], .answer-input {
    padding: 0.55rem 0.75rem; border: 1px solid var(--color-border);
    border-radius: 0.4rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; font-family: inherit; outline: none; resize: vertical;
  }
  .field textarea:focus, .field input:focus, .answer-input:focus { border-color: var(--color-primary); }
  .answer-input { width: 100%; box-sizing: border-box; margin-bottom: 0.35rem; }

  .options-header { display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 500; }
  .option-row { display: flex; align-items: center; gap: 0.5rem; }
  .option-row input[type=checkbox] { flex-shrink: 0; width: 1rem; height: 1rem; cursor: pointer; }
  .option-row input[type=text] {
    flex: 1; padding: 0.5rem 0.7rem; border: 1px solid var(--color-border);
    border-radius: 0.4rem; background: var(--color-bg); color: var(--color-text);
    font-size: 0.875rem; outline: none;
  }
  .option-row input[type=text]:focus { border-color: var(--color-primary); }

  .add-option-btn {
    background: none; border: 1px dashed var(--color-border); border-radius: 0.4rem;
    padding: 0.4rem; font-size: 0.8rem; color: var(--color-muted); cursor: pointer;
  }

  .btn-primary {
    padding: 0.65rem; background: var(--color-primary); color: #fff;
    border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem;
    cursor: pointer; margin-top: 0.25rem;
  }

  /* ── Question list ── */
  .q-list { display: flex; flex-direction: column; gap: 0.875rem; }

  .q-item {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem;
  }

  .q-header { display: flex; align-items: center; gap: 0.5rem; }
  .q-num    { font-size: 0.75rem; font-weight: 700; color: var(--color-muted); }
  .q-type   { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; }
  .q-type.mcq  { background: #dbeafe; color: #1d4ed8; }
  .q-type.fitb { background: #fef3c7; color: #92400e; }
  .q-marks  { font-size: 0.75rem; color: var(--color-muted); }

  .delete-form { margin-left: auto; }
  .delete-btn  {
    background: none; border: none; color: var(--color-muted);
    cursor: pointer; font-size: 0.9rem; padding: 0.2rem 0.4rem; border-radius: 0.3rem;
  }
  .delete-btn:hover { background: #fee2e2; color: #dc2626; }

  .q-body { font-size: 0.9rem; margin: 0; line-height: 1.5; }

  .q-options { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  .q-options li {
    font-size: 0.82rem; padding: 0.3rem 0.6rem; border-radius: 0.3rem;
    border: 1px solid var(--color-border); display: flex; align-items: center; gap: 0.4rem;
  }
  .q-options li.correct { border-color: #16a34a; background: #f0fdf4; color: #166534; }
  .tick { font-weight: 700; }

  .fitb-ans { font-size: 0.82rem; color: #16a34a; font-weight: 500; margin: 0; }
  .empty    { color: var(--color-muted); font-size: 0.9rem; text-align: center; padding: 2rem; }
</style>