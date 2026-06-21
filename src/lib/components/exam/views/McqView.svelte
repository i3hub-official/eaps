<!-- src/lib/components/exam/views/McqView.svelte -->
<script lang="ts">
  import type { Question, StudentAnswerInput } from '$lib/types/exam.js';

  interface Props {
    question: Question;
    answer: StudentAnswerInput | null;
    mode: 'exam' | 'review' | 'preview';
    onAnswer: (ans: StudentAnswerInput) => void;
  }

  let { question, answer, mode, onAnswer }: Props = $props();

  const selected  = $derived(answer?.selectedOption ?? null);
  const isReview  = $derived(mode === 'review');
  const isPreview = $derived(mode === 'preview');

  function select(optId: string) {
    if (isReview || isPreview) return;
    onAnswer({
      questionId:     question.id,
      selectedOption: optId,
      textAnswer:     null,
    });
  }

  function getOptionClass(optId: string): string {
    // In exam or preview: only mark the currently selected option.
    // In review: mark what the student chose — NEVER reveal what was correct.
    if (selected === optId) return isReview ? 'chosen' : 'selected';
    return '';
  }
</script>

<div class="mcq-view">
  <div class="question-body">
    {#if question.imageUrl}
      <img src={question.imageUrl} alt="Question" class="q-image" />
    {/if}
    <p class="body-text">{question.body}</p>
    {#if question.topic}
      <span class="topic-tag">{question.topic}</span>
    {/if}
  </div>

  <div class="options-list" role="radiogroup" aria-label="Answer options">
    {#each question.options as opt, i (opt.id)}
      <button
        class="option {getOptionClass(opt.id)}"
        class:disabled={isReview || isPreview}
        onclick={() => select(opt.id)}
        role="radio"
        aria-checked={selected === opt.id}
        tabindex={isReview || isPreview ? -1 : 0}
      >
        <span class="opt-letter">{String.fromCharCode(65 + i)}</span>
        <span class="opt-text">{opt.optionText}</span>
        {#if selected === opt.id}
          <span class="check" aria-hidden="true">✓</span>
        {/if}
      </button>
    {/each}
  </div>

  {#if isReview}
    <div class="review-note">
      {#if selected}
        Your answer: <strong>{question.options.find(o => o.id === selected)?.optionText ?? '—'}</strong>
      {:else}
        <em>Not answered</em>
      {/if}
    </div>
  {/if}
</div>

<style>
  .mcq-view { display: flex; flex-direction: column; gap: 1.25rem; }

  .question-body { display: flex; flex-direction: column; gap: 0.75rem; }
  .q-image { max-width: 100%; border-radius: 0.5rem; border: 1px solid var(--color-border, #e5e7eb); }
  .body-text { font-size: 1.05rem; line-height: 1.6; color: var(--color-text, #111827); }
  .topic-tag {
    align-self: flex-start;
    padding: 0.25rem 0.625rem;
    background: var(--g50, #f0fdf4);
    color: var(--g700, #15803d);
    font-size: 0.72rem;
    font-weight: 700;
    border-radius: 0.375rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .options-list { display: flex; flex-direction: column; gap: 0.625rem; }

  .option {
    display: flex; align-items: center; gap: 0.875rem;
    padding: 0.875rem 1rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    background: var(--color-surface, white);
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    font-size: 0.95rem;
    width: 100%;
  }
  .option:hover:not(.disabled) { border-color: var(--g400, #4ade80); background: var(--g50, #f0fdf4); }

  /* Active exam — student's live selection */
  .option.selected {
    border-color: var(--g500, #22c55e);
    background: var(--g50, #f0fdf4);
    box-shadow: 0 0 0 3px rgba(34,197,94,0.15);
  }

  /* Review mode — what the student picked (no correct/incorrect colouring) */
  .option.chosen {
    border-color: #f59e0b;
    background: #fffbeb;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.15);
  }

  .option.disabled { cursor: default; }

  .opt-letter {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: var(--color-bg, #f9fafb);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 50%;
    font-size: 0.8rem; font-weight: 800; color: var(--color-muted, #6b7280);
    flex-shrink: 0;
  }
  .option.selected .opt-letter { background: var(--g500, #22c55e); color: white; border-color: var(--g500, #22c55e); }
  .option.chosen  .opt-letter  { background: #f59e0b; color: white; border-color: #f59e0b; }

  .opt-text { flex: 1; color: var(--color-text, #374151); }
  .check { color: var(--g500, #22c55e); font-weight: 800; font-size: 1.1rem; }
  .option.chosen .check { color: #f59e0b; }

  .review-note {
    padding: 0.75rem 1rem;
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    color: #92400e;
  }
</style>