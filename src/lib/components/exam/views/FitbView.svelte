<!-- src/lib/components/exam/views/FitbView.svelte -->
<script lang="ts">
  import type { Question, StudentAnswerInput } from '$lib/types/exam.js';

  interface Props {
    question: Question;
    answer: StudentAnswerInput | null;
    mode: 'exam' | 'review' | 'preview';
    onAnswer: (ans: StudentAnswerInput) => void;
  }

  let { question, answer, mode, onAnswer }: Props = $props();

  const isReview = $derived(mode === 'review');
  const isPreview = $derived(mode === 'preview');

  let inputValue = $state(answer?.textAnswer ?? '');

  function submit() {
    if (isReview || isPreview) return;
    onAnswer({ selectedOption: null, textAnswer: inputValue.trim() });
  }

  // Parse body to find blanks: "The capital of ___ is ___"
  // For now, simple single-blank or show body as-is with input below
  const blankCount = $derived((question.body.match(/_{2,}/g) || []).length);
</script>

<div class="fitb-view">
  <div class="question-body">
    {#if question.imageUrl}
      <img src={question.imageUrl} alt="Question" class="q-image" />
    {/if}
    <p class="body-text">{question.body}</p>
    {#if question.topic}
      <span class="topic-tag">{question.topic}</span>
    {/if}
  </div>

  <div class="input-wrap">
    <label for="fitb-input">Your answer</label>
    <input
      id="fitb-input"
      type="text"
      bind:value={inputValue}
      onchange={submit}
      disabled={isReview || isPreview}
      placeholder={blankCount > 1 ? `Enter ${blankCount} answers separated by commas` : 'Type your answer'}
      autocomplete="off"
      spellcheck="false"
    />
  </div>

  {#if isReview && answer?.textAnswer}
    <div class="review-note">
      <strong>Your answer:</strong> {answer.textAnswer}
      {#if question.fitbAnswers.length > 0}
        <br />
        <strong>Accepted:</strong> {question.fitbAnswers.map(f => f.acceptedAnswer).join(', ')}
      {/if}
    </div>
  {/if}
</div>

<style>
  .fitb-view { display: flex; flex-direction: column; gap: 1.25rem; }

  .question-body { display: flex; flex-direction: column; gap: 0.75rem; }
  .q-image { max-width: 100%; border-radius: 0.5rem; border: 1px solid var(--color-border, #e5e7eb); }
  .body-text { font-size: 1.05rem; line-height: 1.6; color: var(--color-text, #111827); white-space: pre-wrap; }
  .topic-tag {
    align-self: flex-start;
    padding: 0.25rem 0.625rem;
    background: var(--g50, #f0fdf4);
    color: var(--g700, #15803d);
    font-size: 0.72rem; font-weight: 700;
    border-radius: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em;
  }

  .input-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
  .input-wrap label { font-size: 0.8rem; font-weight: 700; color: var(--color-muted, #6b7280); text-transform: uppercase; letter-spacing: 0.05em; }
  .input-wrap input {
    padding: 0.875rem 1rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    font-size: 1rem;
    background: var(--color-surface, white);
    color: var(--color-text, #111827);
    transition: border-color 0.15s;
    width: 100%;
  }
  .input-wrap input:focus { outline: none; border-color: var(--g500, #22c55e); box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
  .input-wrap input:disabled { background: var(--color-bg, #f9fafb); color: var(--color-muted, #6b7280); cursor: not-allowed; }

  .review-note {
    padding: 0.75rem 1rem;
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    color: #92400e;
    line-height: 1.5;
  }
</style>