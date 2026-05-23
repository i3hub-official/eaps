<!-- src/routes/(student)/exam/[examId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import KioskShell from '$lib/components/exam/KioskShell.svelte';
  import ExamTimer from '$lib/components/exam/ExamTimer.svelte';
  import QuestionMCQ from '$lib/components/exam/QuestionMCQ.svelte';
  import QuestionFITB from '$lib/components/exam/QuestionFITB.svelte';
  import ViolationWarning from '$lib/components/exam/ViolationWarning.svelte';
  import Watermark from '$lib/components/exam/Watermark.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { exam, session, questions, savedAnswers } = data;

  let currentIndex = $state(0);
  let answers = $state<Record<string, { option?: string; text?: string }>>(
    Object.fromEntries(savedAnswers.map((a: any) => [
      a.questionId,
      { option: a.selectedOption ?? undefined, text: a.textAnswer ?? undefined }
    ]))
  );
  let violation = $state<{ count: number; max: number; action: string; flagType: string } | null>(null);
  let submitting = $state(false);
  let paused     = $state(session.status === 'flagged');

  const currentQ      = $derived(questions[currentIndex]);
  const answered      = $derived(Object.keys(answers).length);
  const watermarkText = `${data.user?.matricNumber ?? ''} — ${data.user?.fullName ?? ''}`;

  let ws: WebSocket | null = null;

  function connectWs() {
    ws = new WebSocket('ws://localhost:3001');
    ws.onopen = () => ws!.send(JSON.stringify({
      type: 'join_exam', exam_id: exam.id, role: 'student', session_id: session.id,
    }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'pause_session')  paused = true;
        if (msg.type === 'resume_session') paused = false;
        if (msg.type === 'force_submit')   handleSubmit('force_submitted');
      } catch {}
    };
    ws.onclose = () => setTimeout(connectWs, 3000);
  }

  async function startSession() {
    await fetch(`/api/exam/${exam.id}/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    });
  }

  function saveAnswer(questionId: string, value: string, type: 'option' | 'text') {
    if (type === 'option') answers[questionId] = { option: value };
    else answers[questionId] = { ...answers[questionId], text: value };

    fetch(`/api/exam/${exam.id}/answer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id, question_id: questionId,
        selected_option: type === 'option' ? value : null,
        text_answer:     type === 'text'   ? value : null,
      }),
    });
  }

  let violationCooldown = false;
  async function handleViolation(flagType: string) {
    if (violationCooldown || submitting) return;
    violationCooldown = true;
    setTimeout(() => { violationCooldown = false; }, 3000);

    const res  = await fetch(`/api/exam/${exam.id}/violation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, flag_type: flagType }),
    });
    const json = await res.json();
    violation = { count: json.violation_count, max: exam.maxViolations, action: json.action, flagType };
    if (json.action === 'exam_paused')    paused = true;
    if (json.action === 'auto_submitted') goto(`/exam/${exam.id}/complete`);
  }

  async function handleSubmit(_type = 'submitted') {
    if (submitting) return;
    submitting = true;
    await fetch(`/api/exam/${exam.id}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    });
    goto(`/exam/${exam.id}/complete`);
  }

  function confirmSubmit() {
    if (confirm(`Submit exam? ${answered} of ${questions.length} questions answered.`)) handleSubmit();
  }

  function onTick(remaining: number) {
    if (remaining % 30 === 0) {
      fetch(`/api/exam/${exam.id}/answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'time_sync', session_id: session.id, remaining }),
      });
    }
  }

  onMount(() => { startSession(); connectWs(); });
  onDestroy(() => ws?.close());
</script>

<svelte:head><title>{exam.title} — MOUAU eTest</title></svelte:head>

<KioskShell onViolation={handleViolation}>
  <Watermark text={watermarkText} />

  {#if paused}
    <div class="overlay-block">
      <div class="overlay-card">
        <span aria-hidden="true">⏸</span>
        <h2>Exam Paused</h2>
        <p>Your exam has been paused by the invigilator. Please wait.</p>
      </div>
    </div>
  {/if}

  {#if violation}
    <ViolationWarning
      count={violation.count} max={violation.max}
      action={violation.action} flagType={violation.flagType}
      onDismiss={() => { violation = null; }}
    />
  {/if}

  <div class="shell">
    <header class="exam-header">
      <div class="exam-info">
        <h1>{exam.title}</h1>
        <span class="progress">{answered}/{questions.length} answered</span>
      </div>
      <div class="header-right">
        <ExamTimer
          totalSecs={session.timeRemainingSecs ?? exam.durationMinutes * 60}
          onExpire={() => handleSubmit()}
          {onTick}
        />
        <button class="submit-btn" onclick={confirmSubmit} disabled={submitting} type="button">
          {submitting ? 'Submitting…' : 'Submit Exam'}
        </button>
      </div>
    </header>

    <div class="body">
      <nav class="q-nav" aria-label="Question navigator">
        {#each questions as q, i}
          <button
            class="q-dot" class:active={i === currentIndex} class:answered={!!answers[q.id]}
            onclick={() => { currentIndex = i; }} type="button" aria-label="Question {i + 1}"
          >{i + 1}</button>
        {/each}
      </nav>

      <main class="q-panel">
        {#if currentQ}
          {#if currentQ.type === 'mcq'}
            <QuestionMCQ
              questionId={currentQ.id} body={currentQ.body} imageUrl={currentQ.imageUrl}
              options={currentQ.options} selected={answers[currentQ.id]?.option ?? null}
              displayIndex={currentIndex} total={questions.length}
              onAnswer={(qId, optId) => saveAnswer(qId, optId, 'option')}
            />
          {:else}
            <QuestionFITB
              questionId={currentQ.id} body={currentQ.body} imageUrl={currentQ.imageUrl}
              textAnswer={answers[currentQ.id]?.text ?? ''}
              displayIndex={currentIndex} total={questions.length}
              onAnswer={(qId, text) => saveAnswer(qId, text, 'text')}
            />
          {/if}

          <div class="nav-btns">
            <button onclick={() => { currentIndex = Math.max(0, currentIndex - 1); }}
              disabled={currentIndex === 0} type="button">← Previous</button>
            <button onclick={() => { currentIndex = Math.min(questions.length - 1, currentIndex + 1); }}
              disabled={currentIndex === questions.length - 1} type="button">Next →</button>
          </div>
        {/if}
      </main>
    </div>
  </div>
</KioskShell>

<style>
  .shell  { display: flex; flex-direction: column; height: 100vh; overflow: hidden; position: relative; z-index: 2; }
  .exam-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.5rem; background: var(--color-surface); border-bottom: 1px solid var(--color-border); gap: 1rem; flex-shrink: 0; }
  .exam-info   { display: flex; flex-direction: column; gap: 0.15rem; }
  .exam-info h1 { font-size: 1rem; font-weight: 700; margin: 0; }
  .progress    { font-size: 0.8rem; color: var(--color-muted); }
  .header-right { display: flex; align-items: center; gap: 1rem; }
  .submit-btn  { padding: 0.5rem 1.25rem; background: #ef4444; color: #fff; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .body   { display: flex; flex: 1; overflow: hidden; }
  .q-nav  { width: 5rem; background: var(--color-surface); border-right: 1px solid var(--color-border); padding: 1rem 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; overflow-y: auto; flex-shrink: 0; }
  .q-dot  { width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; border: 2px solid var(--color-border); background: var(--color-bg); color: var(--color-text); font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .q-dot.answered { background: var(--color-primary-subtle); border-color: var(--color-primary); color: var(--color-primary); }
  .q-dot.active   { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
  .q-panel { flex: 1; padding: 2rem; overflow-y: auto; display: flex; flex-direction: column; gap: 2rem; max-width: 720px; margin: 0 auto; width: 100%; }
  .nav-btns { display: flex; justify-content: space-between; padding-top: 1rem; border-top: 1px solid var(--color-border); margin-top: auto; }
  .nav-btns button { padding: 0.6rem 1.25rem; border: 1px solid var(--color-border); border-radius: 0.5rem; background: var(--color-surface); color: var(--color-text); font-size: 0.9rem; font-weight: 500; cursor: pointer; }
  .nav-btns button:disabled { opacity: 0.4; cursor: not-allowed; }
  .overlay-block { position: fixed; inset: 0; z-index: 9998; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; }
  .overlay-card  { background: var(--color-surface); border-radius: 1rem; padding: 2.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .overlay-card span { font-size: 3rem; }
  .overlay-card h2   { font-size: 1.3rem; font-weight: 700; margin: 0; }
  .overlay-card p    { color: var(--color-muted); margin: 0; }
</style>