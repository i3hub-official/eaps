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

  const isReview  = $derived(mode === 'review');
  const isPreview = $derived(mode === 'preview');
  const blankCount = $derived((question.body.match(/_{2,}/g) || []).length);

  // Sync local input whenever the question or saved answer changes.
  // Using $derived keeps this reactive to both question navigation and
  // external answer updates (e.g. resumed session), without the
  // stale-state bug of a $state that only initialises once.
  const syncedValue = $derived(answer?.textAnswer ?? '');

  // Separate writable state for the live input — only updated by the student typing.
  // Seeded from syncedValue whenever the question changes.
  let inputValue = $state(syncedValue);

  $effect(() => {
    // When question.id changes (navigation) or the synced answer changes
    // (resume), reset the local input to match.
    // We key on both so that typing on the same question doesn't reset mid-edit.
    inputValue = answer?.textAnswer ?? '';
  });

  function submit() {
    if (isReview || isPreview) return;
    onAnswer({
      questionId:     question.id,
      selectedOption: null,
      textAnswer:     inputValue.trim(),
    });
  }
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
      oninput={submit}
      disabled={isReview || isPreview}
      placeholder={blankCount > 1
        ? `Enter ${blankCount} answers separated by commas`
        : 'Type your answer'}
      autocomplete="off"
      spellcheck="false"
    />
  </div>

  {#if isReview}
    <div class="review-note">
      {#if answer?.textAnswer}
        <strong>Your answer:</strong> {answer.textAnswer}
      {:else}
        <em>Not answered</em>
      {/if}
      <!-- fitbAnswers is intentionally empty during and after a live exam.
           Correct answers are never exposed to the client. -->
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
  .input-wrap label {
    font-size: 0.8rem; font-weight: 700;
    color: var(--color-muted, #6b7280);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
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