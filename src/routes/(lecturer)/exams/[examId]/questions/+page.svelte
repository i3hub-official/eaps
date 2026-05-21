<!-- src/routes/(lecturer)/exams/[examId]/questions/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { PlusCircle, Trash2, CheckCircle, Type, List, Play, ArrowLeft } from '@lucide/svelte';
  import type { Question } from '$lib/types/exam.js';

  let { data }: { data: PageData } = $props();

  let questions = $state<Question[]>(data.questions ?? []);
  let qType = $state<'mcq' | 'fill_in_the_blank'>('mcq');
  let qBody = $state('');
  let qMarks = $state(1);
  let qOptions = $state([
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);
  let fitbAnswers = $state([{ accepted_answer: '', is_primary: true }]);
  let saving = $state(false);
  let saveError = $state('');
  let activating = $state(false);

  function resetForm() {
    qBody = '';
    qMarks = 1;
    qOptions = [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ];
    fitbAnswers = [{ accepted_answer: '', is_primary: true }];
  }

  function setCorrect(index: number) {
    qOptions = qOptions.map((o, i) => ({ ...o, is_correct: i === index }));
  }

  async function addQuestion() {
    saveError = '';
    if (!qBody.trim()) { saveError = 'Question body is required.'; return; }
    if (qType === 'mcq') {
      const filled = qOptions.filter(o => o.option_text.trim());
      if (filled.length < 2) { saveError = 'Add at least 2 options.'; return; }
      if (!qOptions.some(o => o.is_correct)) { saveError = 'Mark one option as correct.'; return; }
    }
    if (qType === 'fill_in_the_blank' && !fitbAnswers[0].accepted_answer.trim()) {
      saveError = 'Add at least one accepted answer.';
      return;
    }

    saving = true;
    const res = await fetch('/api/lecturer/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam_id: data.exam.id,
        type: qType,
        body: qBody,
        marks: qMarks,
        order_index: questions.length,
        options: qType === 'mcq' ? qOptions.filter(o => o.option_text.trim()) : undefined,
        fitb_answers: qType === 'fill_in_the_blank' ? fitbAnswers.filter(a => a.accepted_answer.trim()) : undefined,
      })
    });
    const json = await res.json();
    if (!res.ok) { saveError = json.error; saving = false; return; }

    questions = [...questions, { ...json, options: qType === 'mcq' ? qOptions.filter(o => o.option_text.trim()) : [] }];
    resetForm();
    saving = false;
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/lecturer/questions?id=${id}`, { method: 'DELETE' });
    questions = questions.filter(q => q.id !== id);
  }

  async function activateExam() {
    activating = true;
    await fetch('/api/lecturer/exams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: data.exam.id, status: 'scheduled' })
    });
    location.href = '/lecturer/exams';
  }

  const totalMarks = $derived(questions.reduce((s, q) => s + q.marks, 0));
</script>

<svelte:head><title>Questions — {data.exam.course_code}</title></svelte:head>

<!-- Top bar -->
<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
  <div>
    <a href="/lecturer/exams" style="display:inline-flex; align-items:center; gap:0.4rem; font-size:0.8rem; color:var(--text-muted); text-decoration:none; margin-bottom:0.5rem;">
      <ArrowLeft size={13} /> Back to Exams
    </a>
    <h1 style="font-size:1.3rem; font-weight:800; color:var(--text); margin:0 0 0.2rem;">
      {data.exam.course_code} — Question Builder
    </h1>
    <p style="color:var(--text-muted); font-size:0.82rem; margin:0;">
      {questions.length} questions · {totalMarks}/{data.exam.total_marks} marks assigned
    </p>
  </div>

  {#if questions.length > 0}
    <button onclick={activateExam} disabled={activating} class="btn btn-primary">
      <Play size={15} /> {activating ? 'Activating...' : 'Schedule Exam'}
    </button>
  {/if}
</div>

<div style="display:grid; grid-template-columns:1fr 360px; gap:1.25rem; align-items:start;">

  <!-- Questions list -->
  <div style="display:flex; flex-direction:column; gap:0.75rem;">
    {#if questions.length === 0}
      <div class="card" style="padding:2.5rem; text-align:center;">
        <List size={36} color="var(--text-muted)" style="margin:0 auto 0.75rem;" />
        <p style="color:var(--text-muted); font-size:0.85rem;">No questions yet. Add your first question →</p>
      </div>
    {/if}

    {#each questions as q, i}
      <div class="card" style="padding:1rem;">
        <div style="display:flex; align-items:start; justify-content:space-between; gap:0.75rem;">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
              <span style="background:var(--primary); color:var(--primary-fg); font-size:0.7rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:9999px;">Q{i+1}</span>
              <span style="font-size:0.7rem; padding:0.15rem 0.5rem; border-radius:9999px; background:var(--bg); border:1px solid var(--border); color:var(--text-muted);">
                {q.type === 'mcq' ? 'MCQ' : 'Fill in Blank'}
              </span>
              <span style="font-size:0.72rem; color:var(--text-muted);">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
            </div>
            <p style="color:var(--text); font-size:0.875rem; margin:0 0 0.5rem; font-weight:500;">{q.body}</p>

            {#if q.type === 'mcq' && q.options?.length}
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.3rem;">
                {#each q.options as opt}
                  <div style="
                    display:flex; align-items:center; gap:0.35rem;
                    font-size:0.77rem; padding:0.25rem 0.5rem; border-radius:0.35rem;
                    background: {opt.is_correct ? '#dcfce7' : 'var(--bg)'};
                    color: {opt.is_correct ? '#15803d' : 'var(--text-muted)'};
                    border: 1px solid {opt.is_correct ? '#86efac' : 'var(--border)'};
                  ">
                    {#if opt.is_correct}<CheckCircle size={11} />{/if}
                    {opt.option_text}
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <button onclick={() => deleteQuestion(q.id)} class="btn btn-ghost" style="padding:0.35rem; color:var(--danger); border-color:transparent; flex-shrink:0;">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    {/each}
  </div>

  <!-- Add Question Form -->
  <div class="card" style="padding:1.25rem; position:sticky; top:80px;">
    <h2 style="font-size:0.95rem; font-weight:700; color:var(--text); margin:0 0 1rem; display:flex; align-items:center; gap:0.5rem;">
      <PlusCircle size={16} color="var(--primary)" /> Add Question
    </h2>

    {#if saveError}
      <div class="alert alert-error">{saveError}</div>
    {/if}

    <!-- Type selector -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:1rem;">
      {#each [['mcq', 'Multiple Choice', List], ['fill_in_the_blank', 'Fill in Blank', Type]] as [val, label, Icon]}
        <button
          onclick={() => (qType = val as any)}
          style="
            display:flex; flex-direction:column; align-items:center; gap:0.3rem;
            padding:0.6rem; border-radius:0.5rem; border:2px solid {qType === val ? 'var(--primary)' : 'var(--border)'};
            background:{qType === val ? 'var(--primary)' : 'transparent'};
            color:{qType === val ? 'var(--primary-fg)' : 'var(--text-muted)'};
            cursor:pointer; font-size:0.72rem; font-weight:600; transition:all 0.15s;
          "
        >
          <Icon size={16} />{label}
        </button>
      {/each}
    </div>

    <div class="form-group">
      <label class="label">Question</label>
      <textarea
        bind:value={qBody}
        rows="3"
        placeholder="Type your question here..."
        class="input" style="resize:vertical;"
      ></textarea>
    </div>

    <div class="form-group">
      <label class="label">Marks</label>
      <input type="number" bind:value={qMarks} min="1" max="20" class="input" />
    </div>

    <!-- MCQ Options -->
    {#if qType === 'mcq'}
      <div class="form-group">
        <label class="label">Options <span style="color:var(--text-muted); font-weight:400; text-transform:none;">(click ✓ to mark correct)</span></label>
        {#each qOptions as opt, i}
          <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;">
            <button
              type="button"
              onclick={() => setCorrect(i)}
              style="
                flex-shrink:0; width:26px; height:26px; border-radius:50%;
                border:2px solid {opt.is_correct ? 'var(--success)' : 'var(--border)'};
                background:{opt.is_correct ? 'var(--success)' : 'transparent'};
                color:{opt.is_correct ? '#fff' : 'var(--border)'};
                cursor:pointer; display:flex; align-items:center; justify-content:center;
              "
            >
              <CheckCircle size={13} />
            </button>
            <input
              type="text"
              bind:value={opt.option_text}
              placeholder="Option {String.fromCharCode(65+i)}"
              class="input" style="flex:1;"
            />
          </div>
        {/each}
      </div>
    {/if}

    <!-- FITB Answers -->
    {#if qType === 'fill_in_the_blank'}
      <div class="form-group">
        <label class="label">Accepted Answers</label>
        {#each fitbAnswers as ans, i}
          <div style="display:flex; gap:0.4rem; margin-bottom:0.4rem;">
            <input type="text" bind:value={ans.accepted_answer} placeholder="Accepted answer {i+1}" class="input" />
            {#if i > 0}
              <button onclick={() => fitbAnswers = fitbAnswers.filter((_, fi) => fi !== i)} class="btn btn-ghost" style="padding:0.4rem; flex-shrink:0;">
                <Trash2 size={13} />
              </button>
            {/if}
          </div>
        {/each}
        <button onclick={() => fitbAnswers = [...fitbAnswers, { accepted_answer: '', is_primary: false }]} class="btn btn-ghost" style="font-size:0.75rem; padding:0.35rem 0.65rem;">
          + Add alternate answer
        </button>
      </div>
    {/if}

    <button onclick={addQuestion} disabled={saving} class="btn btn-primary" style="width:100%; justify-content:center; margin-top:0.5rem;">
      {saving ? 'Saving...' : 'Add Question'}
    </button>
  </div>
</div>
